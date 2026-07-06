// ── Census shared types & API helpers ────────────────────────────────────────

export type AliyahStatus = "in_israel" | "awaiting" | "unknown";
export const ALIYAH_STATUSES: readonly AliyahStatus[] = [
  "in_israel",
  "awaiting",
  "unknown",
] as const;

export type MaritalStatus =
  | "single"
  | "married"
  | "divorced"
  | "widowed"
  | "";
export const MARITAL_STATUSES: readonly MaritalStatus[] = [
  "single",
  "married",
  "divorced",
  "widowed",
] as const;

export type Sex = "M" | "F";
export const SEXES: readonly Sex[] = ["M", "F"] as const;

export interface CensusRow {
  surname?:               string;
  namePerPassport?:       string;
  hebrewName?:            string;
  maritalStatus?:         MaritalStatus;
  sex?:                   Sex;
  dob?:                   string;
  fatherName?:            string;
  motherName?:            string;
  dateOfJudaismPractice?: string;
  passportNo?:            string;
  passportIssueDate?:     string;
  passportExpiryDate?:    string;
}

export interface CensusMember {
  id:          string;
  name:        string;
  censusRow?:  CensusRow;
}

export interface CensusFamily {
  id:          string;
  headName:    string;
  headAliyah:  AliyahStatus;
  headCensus?: CensusRow;
  members:     CensusMember[];
}

export interface CensusBranch {
  id:       string;
  name:     string;
  cityId:   string;
  cityName: string;
  families: CensusFamily[];
}

// ── API helpers ───────────────────────────────────────────────────────────────

export async function saveBranch(
  branch: CensusBranch,
  options: { baseUrl: string },
): Promise<void> {
  const res = await fetch(`${options.baseUrl}/census/branches`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(branch),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`saveBranch failed (${res.status}): ${text}`);
  }
}

export async function submitBranch(
  branch: CensusBranch,
  options: { baseUrl: string },
): Promise<void> {
  const res = await fetch(`${options.baseUrl}/census/branches/submit`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(branch),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`submitBranch failed (${res.status}): ${text}`);
  }
}
