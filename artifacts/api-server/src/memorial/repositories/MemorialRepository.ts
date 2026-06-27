import { db } from "@workspace/db";
import {
  memorialsTable,
  memorialPersonsTable,
  memorialPrivacyTable,
  type Memorial,
  type MemorialPerson,
  type MemorialPrivacy,
  type MemorialWithPerson,
  type InsertMemorial,
  type InsertMemorialPerson,
} from "@workspace/db";
import { eq, and, isNull, ilike, or, sql } from "drizzle-orm";

export class MemorialRepository {
  async findById(id: string): Promise<MemorialWithPerson | null> {
    const [memorial] = await db
      .select()
      .from(memorialsTable)
      .where(and(eq(memorialsTable.id, id), isNull(memorialsTable.deletedAt)));

    if (!memorial) return null;
    return this._hydrate(memorial);
  }

  async findBySlug(slug: string): Promise<MemorialWithPerson | null> {
    const [memorial] = await db
      .select()
      .from(memorialsTable)
      .where(
        and(eq(memorialsTable.slug, slug), isNull(memorialsTable.deletedAt)),
      );

    if (!memorial) return null;
    return this._hydrate(memorial);
  }

  async findByFamily(familyId: string): Promise<MemorialWithPerson[]> {
    const rows = await db
      .select()
      .from(memorialsTable)
      .where(
        and(
          eq(memorialsTable.familyId, familyId),
          isNull(memorialsTable.deletedAt),
        ),
      );

    return Promise.all(rows.map((r) => this._hydrate(r)));
  }

  async search(query: string): Promise<MemorialWithPerson[]> {
    const pattern = `%${query.trim().slice(0, 100)}%`;

    const persons = await db
      .select()
      .from(memorialPersonsTable)
      .where(
        and(
          or(
            ilike(memorialPersonsTable.fullName, pattern),
            ilike(memorialPersonsTable.hebrewName, pattern),
          ),
          isNull(memorialPersonsTable.deletedAt),
        ),
      )
      .limit(30);

    if (persons.length === 0) return [];

    const personIds = persons.map((p) => p.id);

    const memorials = await db
      .select()
      .from(memorialsTable)
      .where(
        and(
          eq(memorialsTable.status, "published"),
          isNull(memorialsTable.deletedAt),
        ),
      );

    const matched = memorials.filter((m) => personIds.includes(m.personId));
    return Promise.all(matched.map((m) => this._hydrate(m)));
  }

  async create(
    personData: InsertMemorialPerson,
    memorialData: InsertMemorial,
    slug: string,
    createdBy: string,
    familyId: string,
  ): Promise<MemorialWithPerson> {
    return db.transaction(async (tx) => {
      const [person] = await tx
        .insert(memorialPersonsTable)
        .values(personData)
        .returning();

      const [memorial] = await tx
        .insert(memorialsTable)
        .values({
          slug,
          personId: person!.id,
          familyId,
          createdBy,
          status: "draft",
        })
        .returning();

      await tx.insert(memorialPrivacyTable).values({
        memorialId: memorial!.id,
      });

      return {
        ...memorial!,
        person: person!,
        privacy: {
          id: "",
          memorialId: memorial!.id,
          visibilityLevel: "family",
          canLightCandles: "community",
          canLeaveTributes: "family",
          canViewPhotos: "family",
          requireModeration: true,
          allowGuestInteraction: false,
          updatedAt: new Date(),
        },
      };
    });
  }

  async update(
    id: string,
    data: Partial<Pick<Memorial, "status">>,
  ): Promise<Memorial | null> {
    const [updated] = await db
      .update(memorialsTable)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(memorialsTable.id, id), isNull(memorialsTable.deletedAt)))
      .returning();

    return updated ?? null;
  }

  async softDelete(id: string): Promise<void> {
    await db
      .update(memorialsTable)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(memorialsTable.id, id));
  }

  async incrementCounter(
    id: string,
    field: "candleCount" | "tributeCount" | "prayerCount" | "viewCount",
    by = 1,
  ): Promise<void> {
    await db
      .update(memorialsTable)
      .set({
        [field]: sql`${memorialsTable[field]} + ${by}`,
        lastActivityAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(memorialsTable.id, id));
  }

  private async _hydrate(memorial: Memorial): Promise<MemorialWithPerson> {
    const [person] = await db
      .select()
      .from(memorialPersonsTable)
      .where(eq(memorialPersonsTable.id, memorial.personId));

    const [privacy] = await db
      .select()
      .from(memorialPrivacyTable)
      .where(eq(memorialPrivacyTable.memorialId, memorial.id));

    return {
      ...memorial,
      person: person!,
      privacy: privacy!,
    };
  }
}

export const memorialRepository = new MemorialRepository();
