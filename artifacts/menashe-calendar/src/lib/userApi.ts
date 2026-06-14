const API_BASE = "/api";

async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    credentials: "include",
  });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json();
}

// ── User profile ──────────────────────────────────────────────────────────────

export interface UserProfile {
  theme: "dark" | "light";
  location: any | null;
  isPremium: boolean;
  candleEnabled: boolean;
  language: string;
  notifPrefs: any | null;
  leadTime: number;
}

export async function fetchUserProfile(): Promise<UserProfile | null> {
  try {
    return await apiFetch("/user/profile");
  } catch {
    return null;
  }
}

export async function saveUserProfile(profile: Partial<UserProfile>): Promise<void> {
  try {
    await apiFetch("/user/profile", { method: "PUT", body: JSON.stringify(profile) });
  } catch {}
}

// ── Yahrzeit entries ──────────────────────────────────────────────────────────

export interface YartzeitEntryApi {
  id: string;
  name: string;
  hebrewDay: number;
  hebrewMonth: number;
  displayDate: string;
  wasAfterSunset: boolean;
}

export async function fetchYahrzeitEntries(): Promise<YartzeitEntryApi[]> {
  try {
    return await apiFetch("/user/yahrzeit");
  } catch {
    return [];
  }
}

export async function saveYahrzeitEntry(entry: YartzeitEntryApi): Promise<void> {
  await apiFetch("/user/yahrzeit", { method: "POST", body: JSON.stringify(entry) });
}

export async function deleteYahrzeitEntry(id: string): Promise<void> {
  await apiFetch(`/user/yahrzeit/${id}`, { method: "DELETE" });
}

// ── Torah tracker ─────────────────────────────────────────────────────────────

export interface StudyEntryApi {
  id: string;
  date: string;
  subject: string;
  description: string;
  duration: number;
  notes: string;
}

export async function fetchTorahTrackerEntries(): Promise<StudyEntryApi[]> {
  try {
    return await apiFetch("/user/torah-tracker");
  } catch {
    return [];
  }
}

export async function saveTorahTrackerEntry(entry: StudyEntryApi): Promise<void> {
  await apiFetch("/user/torah-tracker", { method: "POST", body: JSON.stringify(entry) });
}

export async function deleteTorahTrackerEntry(id: string): Promise<void> {
  await apiFetch(`/user/torah-tracker/${id}`, { method: "DELETE" });
}

export async function fetchTorahTrackerGoal(): Promise<number> {
  try {
    const data = await apiFetch("/user/torah-tracker/goal");
    return data.goalMins ?? 0;
  } catch {
    return 0;
  }
}

export async function saveTorahTrackerGoal(goalMins: number): Promise<void> {
  await apiFetch("/user/torah-tracker/goal", { method: "PUT", body: JSON.stringify({ goalMins }) });
}
