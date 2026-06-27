import { memorialRepository } from "../repositories/MemorialRepository";
import { familyRepository } from "../repositories/FamilyRepository";
import type { InsertMemorialPerson } from "@workspace/db";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

async function uniqueSlug(base: string): Promise<string> {
  let candidate = base;
  let attempt = 0;

  while (true) {
    const existing = await memorialRepository.findBySlug(candidate);
    if (!existing) return candidate;
    attempt++;
    candidate = `${base}-${attempt}`;
  }
}

export interface CreateMemorialInput {
  person: InsertMemorialPerson;
  familyId?: string;
  familyName?: string;
}

export class MemorialService {
  async create(input: CreateMemorialInput, createdBy: string) {
    let familyId: string;

    if (input.familyId) {
      const family = await familyRepository.findById(input.familyId);
      if (!family) throw new Error("Family not found");

      const isMember = await familyRepository.isMember(
        input.familyId,
        createdBy,
      );
      if (!isMember) throw new Error("Not a member of this family");

      familyId = input.familyId;
    } else {
      const name = input.familyName?.trim() || `${input.person.fullName} Family`;
      const family = await familyRepository.create(name, createdBy);
      await familyRepository.addMember(family.id, createdBy, "admin");
      familyId = family.id;
    }

    const base = slugify(input.person.fullName);
    const slug = await uniqueSlug(base);

    const memorial = await memorialRepository.create(
      input.person,
      {},
      slug,
      createdBy,
      familyId,
    );

    return memorial;
  }

  async getById(id: string, viewerUserId: string | null) {
    const memorial = await memorialRepository.findById(id);
    if (!memorial) return null;

    const canView = await this._checkVisibility(
      memorial.familyId,
      memorial.privacy?.visibilityLevel ?? "family",
      viewerUserId,
    );

    if (!canView) return null;
    return memorial;
  }

  async getBySlug(slug: string, viewerUserId: string | null) {
    const memorial = await memorialRepository.findBySlug(slug);
    if (!memorial) return null;

    const canView = await this._checkVisibility(
      memorial.familyId,
      memorial.privacy?.visibilityLevel ?? "family",
      viewerUserId,
    );

    if (!canView) return null;
    return memorial;
  }

  async update(
    id: string,
    data: { status?: "draft" | "published" | "archived" },
    actorId: string,
  ) {
    const memorial = await memorialRepository.findById(id);
    if (!memorial) throw new Error("Memorial not found");

    const isAdmin = await familyRepository.isAdmin(memorial.familyId, actorId);
    if (!isAdmin) throw new Error("Only a family admin can update this memorial");

    return memorialRepository.update(id, data);
  }

  async search(query: string, viewerUserId: string | null) {
    if (!query || query.trim().length < 2) return [];
    const results = await memorialRepository.search(query);
    return results.filter((m) =>
      ["public", "community"].includes(m.privacy?.visibilityLevel ?? "private"),
    );
  }

  private async _checkVisibility(
    familyId: string,
    level: string,
    viewerUserId: string | null,
  ): Promise<boolean> {
    if (level === "public") return true;
    if (!viewerUserId) return false;
    if (level === "community") return true;
    if (level === "family" || level === "private") {
      return familyRepository.isMember(familyId, viewerUserId);
    }
    return false;
  }
}

export const memorialService = new MemorialService();
