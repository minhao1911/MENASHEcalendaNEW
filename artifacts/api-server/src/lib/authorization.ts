import type { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";
import { auditLog } from "./auditLog";

/**
 * isAdminUser — returns true if the Clerk session carries org:admin role.
 * orgRole is populated automatically by Clerk when the user is an org member.
 */
export function isAdminUser(userId: string | null | undefined, orgRole?: string | null): boolean {
  if (!userId) return false;
  return orgRole === "org:admin";
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
 * Requires a valid Clerk session AND the user must have org:admin role in the Clerk Organization.
 * Sets req.userId.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const auth = getAuth(req);
  const userId = auth?.userId;
  const orgRole = (auth as any)?.orgRole as string | null | undefined;

  if (!userId) {
    auditLog.record({ event: "admin.permission_denied", actorId: "anonymous", metadata: { path: req.path } }).catch(() => {});
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (orgRole !== "org:admin") {
    auditLog.record({ event: "admin.permission_denied", actorId: userId, metadata: { path: req.path, orgRole: orgRole ?? "none" } }).catch(() => {});
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  auditLog.record({ event: "admin.role_verified", actorId: userId, metadata: { path: req.path } }).catch(() => {});
  (req as any).userId = userId;
  next();
}

/**
 * requireModerator — delegates to requireAdmin until moderator roles are added.
 */
export const requireModerator = requireAdmin;

/**
 * requireCommunityAdmin — any authenticated user for now.
 */
export const requireCommunityAdmin = requireAuth;
