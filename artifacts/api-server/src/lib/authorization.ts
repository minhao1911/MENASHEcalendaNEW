import type { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { auditLog } from "./auditLog";

const ADMIN_USER_ID = process.env["ADMIN_USER_ID"];

if (!ADMIN_USER_ID) {
  console.warn("[authorization] WARNING: ADMIN_USER_ID env var is not set. Admin routes will reject all requests.");
}

/**
 * isAdminUser — returns true if the given userId matches the configured ADMIN_USER_ID.
 * Use this for inline read-path branching (e.g. filtering data differently for admin vs. public).
 */
export function isAdminUser(userId: string | null | undefined): boolean {
  if (!userId || !ADMIN_USER_ID) return false;
  return userId === ADMIN_USER_ID;
}

/**
 * requireAuth — Express middleware.
 * Requires a valid Clerk session. Sets req.userId.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    auditLog.record({ event: "admin.permission_denied", actorId: "anonymous", metadata: { path: req.path } }).catch(() => {});
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  (req as any).userId = userId;
  next();
}

/**
 * requireAdmin — Express middleware.
 * Requires a valid Clerk session AND the user must match ADMIN_USER_ID.
 * Sets req.userId.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const auth = getAuth(req);
  const userId = auth?.userId;

  if (!userId) {
    auditLog.record({ event: "admin.permission_denied", actorId: "anonymous", metadata: { path: req.path } }).catch(() => {});
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (!isAdminUser(userId)) {
    auditLog.record({ event: "admin.permission_denied", actorId: userId, metadata: { path: req.path } }).catch(() => {});
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  auditLog.record({ event: "admin.role_verified", actorId: userId, metadata: { path: req.path } }).catch(() => {});
  (req as any).userId = userId;
  next();
}

/**
 * requireModerator — Placeholder for future moderator role support.
 * Currently delegates to requireAdmin until moderator roles are implemented in Clerk.
 */
export const requireModerator = requireAdmin;

/**
 * requireCommunityAdmin — Placeholder for future community administrator role support.
 * Currently delegates to requireAuth (any authenticated user).
 * Future sprint: check a "community_admin" claim in the Clerk session token.
 */
export const requireCommunityAdmin = requireAuth;
