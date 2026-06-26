import type { Request, Response, NextFunction } from "express";
import { getAuth } from "@clerk/express";

const ADMIN_USER_ID = process.env["ADMIN_USER_ID"];

if (!ADMIN_USER_ID) {
  console.warn("[requireAdmin] WARNING: ADMIN_USER_ID env var is not set. Admin routes will reject all requests.");
}

/**
 * requireAdmin — Express middleware.
 *
 * Requires:
 *   1. A valid Clerk session (authenticated user).
 *   2. The authenticated user's ID matches the ADMIN_USER_ID environment variable.
 *
 * Sets req.userId on the request object (same convention as requireAuth).
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const auth = getAuth(req);
  const userId = auth?.userId;

  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (!ADMIN_USER_ID || userId !== ADMIN_USER_ID) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  (req as any).userId = userId;
  next();
}
