const API_BASE = "/api";

async function apiFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`API ${path} failed: ${res.status}`);
  return res.json();
}

export interface ServerAnnouncement {
  id: string;
  emoji: string;
  title: string;
  body: string;
  status: "sent" | "scheduled" | "draft";
  pinned: boolean;
  scheduledAt: string | null;
  sentAt: string | null;
  createdAt: string;
}

export async function broadcastAnnouncement(
  adminPin: string,
  data: {
    emoji: string;
    title: string;
    body: string;
    scheduledAt?: string | null;
    pinned?: boolean;
  },
): Promise<ServerAnnouncement | null> {
  try {
    const res = await apiFetch("/announcements/broadcast", {
      method: "POST",
      body: JSON.stringify({ adminPin, ...data }),
    });
    return res.announcement ?? null;
  } catch (err) {
    console.warn("broadcastAnnouncement failed (non-fatal):", err);
    return null;
  }
}

export async function fetchAnnouncements(adminPin?: string): Promise<ServerAnnouncement[]> {
  try {
    const url = adminPin ? `/announcements?adminPin=${encodeURIComponent(adminPin)}` : "/announcements";
    const res = await apiFetch(url);
    return res.announcements ?? [];
  } catch {
    return [];
  }
}

export async function patchAnnouncement(
  id: string,
  adminPin: string,
  patch: { sendNow?: boolean; pinned?: boolean; title?: string; body?: string; emoji?: string },
): Promise<void> {
  await apiFetch(`/announcements/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ adminPin, ...patch }),
  });
}

export async function deleteAnnouncementServer(id: string, adminPin: string): Promise<void> {
  await apiFetch(`/announcements/${id}`, {
    method: "DELETE",
    body: JSON.stringify({ adminPin }),
  });
}
