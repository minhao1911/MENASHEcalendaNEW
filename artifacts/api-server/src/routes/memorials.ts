import { Router } from "express";
import { z } from "zod";
import { getAuth } from "@clerk/express";
import { requireAuth } from "../lib/requireAuth";
import { apiError } from "../lib/apiError";
import { memorialService } from "../memorial/services/MemorialService";
import { candleService } from "../memorial/services/CandleService";
import { tributeService } from "../memorial/services/TributeService";
import { photoRepository } from "../memorial/repositories/PhotoRepository";
import { memorialRepository } from "../memorial/repositories/MemorialRepository";
import { familyRepository } from "../memorial/repositories/FamilyRepository";
import {
  insertCandleSchema,
  insertTributeSchema,
  insertPhotoSchema,
  insertMemorialPersonSchema,
} from "@workspace/db";

const router = Router();

// ── Validation schemas ────────────────────────────────────────────────────────

const createMemorialSchema = z.object({
  person: insertMemorialPersonSchema,
  familyId: z.string().uuid().optional(),
  familyName: z.string().min(1).max(200).optional(),
});

const updateMemorialSchema = z.object({
  status: z.enum(["draft", "published", "archived"]).optional(),
});

const searchSchema = z.object({
  q: z.string().min(2).max(100),
});

// ── POST /memorials ───────────────────────────────────────────────────────────

router.post("/memorials", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;

  const parsed = createMemorialSchema.safeParse(req.body);
  if (!parsed.success) {
    return apiError.badRequest(res, "Invalid data", parsed.error.issues);
  }

  try {
    const memorial = await memorialService.create(parsed.data, userId);
    return res.status(201).json(memorial);
  } catch (err: any) {
    req.log.error(err);
    if (err.message === "Family not found") return apiError.notFound(res, "Family not found");
    if (err.message === "Not a member of this family")
      return apiError.forbidden(res, err.message);
    return apiError.internal(res, "Failed to create memorial");
  }
});

// ── GET /memorials/search ─────────────────────────────────────────────────────

router.get("/memorials/search", async (req, res) => {
  const parsed = searchSchema.safeParse(req.query);
  if (!parsed.success) {
    return apiError.badRequest(res, "Query parameter 'q' is required (min 2 chars)");
  }

  try {
    const auth = getAuth(req);
    const results = await memorialService.search(
      parsed.data.q,
      auth?.userId ?? null,
    );
    return res.json(results);
  } catch (err) {
    req.log.error(err);
    return apiError.internal(res, "Search failed");
  }
});

// ── GET /memorials/:id ────────────────────────────────────────────────────────

router.get("/memorials/:id", async (req, res) => {
  const id = String(req.params.id);
  const auth = getAuth(req);
  const viewerUserId = auth?.userId ?? null;

  try {
    const isUuid = /^[0-9a-f-]{36}$/i.test(id);
    const memorial = isUuid
      ? await memorialService.getById(id, viewerUserId)
      : await memorialService.getBySlug(id, viewerUserId);

    if (!memorial) return apiError.notFound(res);
    return res.json(memorial);
  } catch (err) {
    req.log.error(err);
    return apiError.internal(res, "Failed to fetch memorial");
  }
});

// ── PATCH /memorials/:id ──────────────────────────────────────────────────────

router.patch("/memorials/:id", requireAuth, async (req, res) => {
  const id = String(req.params.id);
  const userId = (req as any).userId as string;

  const parsed = updateMemorialSchema.safeParse(req.body);
  if (!parsed.success) {
    return apiError.badRequest(res, "Invalid data", parsed.error.issues);
  }

  try {
    const updated = await memorialService.update(id, parsed.data, userId);
    if (!updated) return apiError.notFound(res);
    return res.json(updated);
  } catch (err: any) {
    req.log.error(err);
    if (err.message === "Memorial not found") return apiError.notFound(res);
    if (err.message?.includes("admin")) return apiError.forbidden(res, err.message);
    return apiError.internal(res, "Failed to update memorial");
  }
});

// ── POST /memorials/:id/candles ───────────────────────────────────────────────

router.post("/memorials/:id/candles", async (req, res) => {
  const memorialId = String(req.params.id);
  const auth = getAuth(req);
  const userId = auth?.userId ?? null;

  const parsed = insertCandleSchema.safeParse(req.body);
  if (!parsed.success) {
    return apiError.badRequest(res, "Invalid candle data", parsed.error.issues);
  }

  const ipAddress =
    String(req.headers["x-forwarded-for"] ?? req.socket.remoteAddress ?? "");

  try {
    const candle = await candleService.lightCandle(
      memorialId,
      parsed.data,
      userId,
      ipAddress,
    );
    return res.status(201).json(candle);
  } catch (err: any) {
    req.log.error(err);
    if (err.message === "Memorial not found") return apiError.notFound(res);
    if (err.message?.includes("not published"))
      return apiError.badRequest(res, err.message);
    if (err.message?.includes("permission"))
      return apiError.forbidden(res, err.message);
    if (err.message?.includes("already lit"))
      return apiError.tooManyRequests(res, err.message);
    if (err.message?.includes("Guest name"))
      return apiError.badRequest(res, err.message);
    return apiError.internal(res, "Failed to light candle");
  }
});

// ── POST /memorials/:id/tributes ──────────────────────────────────────────────

router.post("/memorials/:id/tributes", async (req, res) => {
  const memorialId = String(req.params.id);
  const auth = getAuth(req);
  const userId = auth?.userId ?? null;

  const parsed = insertTributeSchema.safeParse(req.body);
  if (!parsed.success) {
    return apiError.badRequest(res, "Invalid tribute data", parsed.error.issues);
  }

  try {
    const tribute = await tributeService.submit(memorialId, parsed.data, userId);
    return res.status(201).json(tribute);
  } catch (err: any) {
    req.log.error(err);
    if (err.message === "Memorial not found") return apiError.notFound(res);
    if (err.message?.includes("not published"))
      return apiError.badRequest(res, err.message);
    if (
      err.message?.includes("permission") ||
      err.message?.includes("family members") ||
      err.message?.includes("signed in")
    )
      return apiError.forbidden(res, err.message);
    if (err.message?.includes("not allowed"))
      return apiError.forbidden(res, err.message);
    if (err.message?.includes("Guest name"))
      return apiError.badRequest(res, err.message);
    return apiError.internal(res, "Failed to submit tribute");
  }
});

// ── POST /memorials/:id/photos ────────────────────────────────────────────────

router.post("/memorials/:id/photos", requireAuth, async (req, res) => {
  const memorialId = String(req.params.id);
  const userId = (req as any).userId as string;

  const parsed = insertPhotoSchema.safeParse(req.body);
  if (!parsed.success) {
    return apiError.badRequest(res, "Invalid photo data", parsed.error.issues);
  }

  try {
    const memorial = await memorialRepository.findById(memorialId);
    if (!memorial) return apiError.notFound(res, "Memorial not found");

    const isFamilyMember = await familyRepository.isMember(
      memorial.familyId,
      userId,
    );

    const autoApprove = isFamilyMember;

    const photo = await photoRepository.create(
      memorialId,
      parsed.data,
      userId,
      autoApprove,
    );

    return res.status(201).json(photo);
  } catch (err: any) {
    req.log.error(err);
    return apiError.internal(res, "Failed to upload photo");
  }
});

export default router;
