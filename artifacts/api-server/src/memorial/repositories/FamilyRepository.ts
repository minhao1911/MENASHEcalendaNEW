import { db } from "@workspace/db";
import {
  memorialFamiliesTable,
  memorialFamilyMembersTable,
  type MemorialFamily,
  type MemorialFamilyMember,
} from "@workspace/db";
import { eq, and, isNull } from "drizzle-orm";

export class FamilyRepository {
  async findById(id: string): Promise<MemorialFamily | null> {
    const [row] = await db
      .select()
      .from(memorialFamiliesTable)
      .where(
        and(
          eq(memorialFamiliesTable.id, id),
          isNull(memorialFamiliesTable.deletedAt),
        ),
      );
    return row ?? null;
  }

  async findByUser(userId: string): Promise<MemorialFamily[]> {
    const memberships = await db
      .select({ familyId: memorialFamilyMembersTable.familyId })
      .from(memorialFamilyMembersTable)
      .where(eq(memorialFamilyMembersTable.userId, userId));

    if (memberships.length === 0) return [];

    const familyIds = memberships.map((m) => m.familyId);
    const rows = await db
      .select()
      .from(memorialFamiliesTable)
      .where(isNull(memorialFamiliesTable.deletedAt));

    return rows.filter((f) => familyIds.includes(f.id));
  }

  async create(
    name: string,
    primaryContactId: string,
  ): Promise<MemorialFamily> {
    const [family] = await db
      .insert(memorialFamiliesTable)
      .values({ name, primaryContactId })
      .returning();
    return family!;
  }

  async addMember(
    familyId: string,
    userId: string,
    role: "admin" | "member" | "viewer" = "member",
    invitedBy?: string,
  ): Promise<MemorialFamilyMember> {
    const existing = await db
      .select()
      .from(memorialFamilyMembersTable)
      .where(
        and(
          eq(memorialFamilyMembersTable.familyId, familyId),
          eq(memorialFamilyMembersTable.userId, userId),
        ),
      );

    if (existing.length > 0) return existing[0]!;

    const [member] = await db
      .insert(memorialFamilyMembersTable)
      .values({ familyId, userId, role, invitedBy: invitedBy ?? null })
      .returning();

    await db
      .update(memorialFamiliesTable)
      .set({
        memberCount: sql`(SELECT COUNT(*) FROM ${memorialFamilyMembersTable} WHERE family_id = ${familyId})`,
        updatedAt: new Date(),
      })
      .where(eq(memorialFamiliesTable.id, familyId));

    return member!;
  }

  async removeMember(familyId: string, userId: string): Promise<void> {
    await db
      .delete(memorialFamilyMembersTable)
      .where(
        and(
          eq(memorialFamilyMembersTable.familyId, familyId),
          eq(memorialFamilyMembersTable.userId, userId),
        ),
      );
  }

  async getMembers(familyId: string): Promise<MemorialFamilyMember[]> {
    return db
      .select()
      .from(memorialFamilyMembersTable)
      .where(eq(memorialFamilyMembersTable.familyId, familyId));
  }

  async isMember(familyId: string, userId: string): Promise<boolean> {
    const [row] = await db
      .select({ id: memorialFamilyMembersTable.id })
      .from(memorialFamilyMembersTable)
      .where(
        and(
          eq(memorialFamilyMembersTable.familyId, familyId),
          eq(memorialFamilyMembersTable.userId, userId),
        ),
      );
    return !!row;
  }

  async isAdmin(familyId: string, userId: string): Promise<boolean> {
    const [row] = await db
      .select({ role: memorialFamilyMembersTable.role })
      .from(memorialFamilyMembersTable)
      .where(
        and(
          eq(memorialFamilyMembersTable.familyId, familyId),
          eq(memorialFamilyMembersTable.userId, userId),
          eq(memorialFamilyMembersTable.role, "admin"),
        ),
      );
    return !!row;
  }
}

export const familyRepository = new FamilyRepository();
