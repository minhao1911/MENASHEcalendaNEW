import { db } from "@workspace/db";
import {
  memorialTributesTable,
  type MemorialTribute,
  type InsertTribute,
} from "@workspace/db";
import { eq, and, isNull, sql } from "drizzle-orm";

export class TributeRepository {
  async findByMemorial(
    memorialId: string,
    status: "approved" | "pending" | "all" = "approved",
    limit = 10,
  ): Promise<MemorialTribute[]> {
    const conditions = [
      eq(memorialTributesTable.memorialId, memorialId),
      isNull(memorialTributesTable.deletedAt),
    ];

    if (status !== "all") {
      conditions.push(eq(memorialTributesTable.status, status));
    }

    return db
      .select()
      .from(memorialTributesTable)
      .where(and(...conditions))
      .orderBy(sql`${memorialTributesTable.createdAt} DESC`)
      .limit(limit);
  }

  async findById(id: string): Promise<MemorialTribute | null> {
    const [row] = await db
      .select()
      .from(memorialTributesTable)
      .where(
        and(
          eq(memorialTributesTable.id, id),
          isNull(memorialTributesTable.deletedAt),
        ),
      );
    return row ?? null;
  }

  async findPending(limit = 50): Promise<MemorialTribute[]> {
    return db
      .select()
      .from(memorialTributesTable)
      .where(
        and(
          eq(memorialTributesTable.status, "pending"),
          isNull(memorialTributesTable.deletedAt),
        ),
      )
      .orderBy(sql`${memorialTributesTable.createdAt} ASC`)
      .limit(limit);
  }

  async create(
    memorialId: string,
    input: InsertTribute,
    userId: string | null,
  ): Promise<MemorialTribute> {
    const [tribute] = await db
      .insert(memorialTributesTable)
      .values({
        memorialId,
        userId,
        guestName: input.guestName ?? null,
        guestEmail: input.guestEmail ?? null,
        title: input.title ?? null,
        body: input.body,
        language: input.language ?? "en",
        isAnonymous: input.isAnonymous ?? false,
        status: "pending",
      })
      .returning();

    return tribute!;
  }

  async approve(id: string, moderatorId: string): Promise<MemorialTribute | null> {
    const [row] = await db
      .update(memorialTributesTable)
      .set({
        status: "approved",
        moderatedBy: moderatorId,
        moderatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(memorialTributesTable.id, id),
          isNull(memorialTributesTable.deletedAt),
        ),
      )
      .returning();

    return row ?? null;
  }

  async reject(
    id: string,
    moderatorId: string,
    reason?: string,
  ): Promise<MemorialTribute | null> {
    const [row] = await db
      .update(memorialTributesTable)
      .set({
        status: "rejected",
        moderatedBy: moderatorId,
        moderatedAt: new Date(),
        rejectionReason: reason ?? null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(memorialTributesTable.id, id),
          isNull(memorialTributesTable.deletedAt),
        ),
      )
      .returning();

    return row ?? null;
  }

  async softDelete(id: string): Promise<void> {
    await db
      .update(memorialTributesTable)
      .set({ deletedAt: new Date(), status: "removed", updatedAt: new Date() })
      .where(eq(memorialTributesTable.id, id));
  }
}

export const tributeRepository = new TributeRepository();
