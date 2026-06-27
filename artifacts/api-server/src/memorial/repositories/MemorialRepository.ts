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
import { eq, and, isNull, ilike, or, sql, desc } from "drizzle-orm";

export type CollectionSort =
  | "recent_activity"
  | "most_visited"
  | "recently_lit"
  | "upcoming_yahrzeit"
  | "community_picks";

export interface SearchOptions {
  query?: string;
  sort?: CollectionSort;
  limit?: number;
  page?: number;
}

export interface PaginatedMemorials {
  data: MemorialWithPerson[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

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

  async search(options: SearchOptions): Promise<PaginatedMemorials> {
    const { query = "", sort, limit = 20, page = 1 } = options;
    const offset = (page - 1) * limit;

    const baseCondition = and(
      eq(memorialsTable.status, "published"),
      isNull(memorialsTable.deletedAt),
    );

    if (query.trim().length >= 2) {
      const pattern = `%${query.trim().slice(0, 100)}%`;

      const persons = await db
        .select({ id: memorialPersonsTable.id })
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
        .limit(200);

      if (persons.length === 0) {
        return { data: [], total: 0, page, limit, hasMore: false };
      }

      const personIds = persons.map((p) => p.id);

      const allMemorials = await db
        .select()
        .from(memorialsTable)
        .where(baseCondition);

      const matched = allMemorials.filter((m) => personIds.includes(m.personId));
      const total = matched.length;
      const sorted = this._applySortInMemory(matched, sort);
      const sliced = sorted.slice(offset, offset + limit);
      const data = await Promise.all(sliced.map((m) => this._hydrate(m)));

      return { data, total, page, limit, hasMore: offset + sliced.length < total };
    }

    const allMemorials = await db
      .select()
      .from(memorialsTable)
      .where(baseCondition);

    const total = allMemorials.length;
    const sorted = this._applySortInMemory(allMemorials, sort);
    const sliced = sorted.slice(offset, offset + limit);
    const data = await Promise.all(sliced.map((m) => this._hydrate(m)));

    return { data, total, page, limit, hasMore: offset + sliced.length < total };
  }

  private _applySortInMemory(memorials: Memorial[], sort?: CollectionSort): Memorial[] {
    switch (sort) {
      case "most_visited":
        return [...memorials].sort((a, b) => b.viewCount - a.viewCount);
      case "recently_lit":
        return [...memorials].sort(
          (a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime(),
        );
      case "upcoming_yahrzeit":
        return this._sortByUpcomingYahrzeit(memorials);
      case "community_picks":
        return [...memorials].sort(
          (a, b) => (b.candleCount + b.tributeCount) - (a.candleCount + a.tributeCount),
        );
      case "recent_activity":
      default:
        return [...memorials].sort(
          (a, b) => new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime(),
        );
    }
  }

  private _sortByUpcomingYahrzeit(memorials: Memorial[]): Memorial[] {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayMs = today.getTime();
    const msPerDay = 86400000;

    return [...memorials].sort((a, b) => {
      const aNext = this._daysUntilAnniversary(a.createdAt, todayMs, msPerDay);
      const bNext = this._daysUntilAnniversary(b.createdAt, todayMs, msPerDay);
      return aNext - bNext;
    });
  }

  private _daysUntilAnniversary(dateStr: string, todayMs: number, msPerDay: number): number {
    try {
      const d = new Date(dateStr);
      const thisYear = new Date(todayMs).getFullYear();
      let candidate = new Date(thisYear, d.getMonth(), d.getDate()).getTime();
      if (candidate < todayMs) candidate += 365 * msPerDay;
      return Math.round((candidate - todayMs) / msPerDay);
    } catch {
      return 9999;
    }
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
