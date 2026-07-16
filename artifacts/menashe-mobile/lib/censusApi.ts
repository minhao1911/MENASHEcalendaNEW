/**
 * Census API client for the mobile app.
 * Mirrors the web's userApi census helpers using the same API_BASE pattern.
 */

const API_BASE = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;

type GetToken = () => Promise<string | null>;

async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json();
}

async function authFetch(path: string, getToken: GetToken, options: RequestInit = {}) {
  const token = await getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json();
}

/* ── Types ──────────────────────────────────────────────────────────────── */

export interface BranchData {
  id: string;
  name: string;
  cityId: string;
  cityName: string;
  adminName?: string;
  established?: string;
  logoUrl?: string;
  synagogueImageUrl?: string;
  families: Array<{
    id: string;
    headName: string;
    headAliyah: string;
    members: Array<{ aliyahStatus: string }>;
  }>;
}

export interface CensusSubmission {
  id: string;
  branch: BranchData;
  submittedAt: string;
  status: "pending" | "approved" | "rejected";
  reviewNote?: string;
  reviewedAt?: string;
}

export interface MemberSubmission {
  id: string;
  branchId: string;
  branchName: string;
  submittedAt: string;
  status: "pending" | "approved" | "rejected";
  reviewNote?: string;
  submitterName: string;
  members: Array<{ aliyahStatus?: string }>;
  headCensus: Record<string, string>;
}

/* ── Public fetches (no auth) ────────────────────────────────────────────── */

/** Fetches all branch submissions (admin-only route). */
export async function fetchCensusSubmissions(getToken: GetToken): Promise<CensusSubmission[]> {
  try {
    return await authFetch("/census/submissions", getToken);
  } catch {
    return [];
  }
}

/** Fetches all family census submissions (admin-only). */
export async function fetchCensusMemberSubmissions(getToken: GetToken): Promise<MemberSubmission[]> {
  try {
    return await authFetch("/census/member-submissions", getToken);
  } catch {
    return [];
  }
}

/** Fetch the current user's own branch (local admin). */
export async function fetchMyBranch(getToken: GetToken): Promise<BranchData | null> {
  try {
    return await authFetch("/census/branch", getToken);
  } catch {
    return null;
  }
}

/** Approve or reject a branch/member census submission. */
export async function reviewSubmission(
  id: string,
  type: "branch" | "member",
  status: "approved" | "rejected",
  note: string | undefined,
  getToken: GetToken,
): Promise<void> {
  const path = type === "branch"
    ? `/census/submissions/${id}`
    : `/census/member-submissions/${id}`;
  await authFetch(path, getToken, {
    method: "PATCH",
    body: JSON.stringify({ status, reviewNote: note }),
  });
}
