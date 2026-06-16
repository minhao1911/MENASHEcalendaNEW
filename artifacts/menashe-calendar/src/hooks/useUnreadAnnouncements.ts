import { useState, useEffect, useCallback, useRef } from "react";
import { fetchAnnouncements } from "../lib/announcementsApi";

const SEEN_KEY = "menashe-seen-announcements";
const POLL_INTERVAL_MS = 5 * 60 * 1000;

function loadSeenIds(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch {}
  return new Set();
}

function saveSeenIds(ids: Set<string>) {
  try { localStorage.setItem(SEEN_KEY, JSON.stringify([...ids])); } catch {}
}

export function useUnreadAnnouncements() {
  const [sentIds, setSentIds] = useState<string[]>([]);
  const [seenIds, setSeenIds] = useState<Set<string>>(loadSeenIds);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = useCallback(async () => {
    try {
      const list = await fetchAnnouncements();
      const sent = list.filter(a => a.status === "sent").map(a => a.id);
      setSentIds(sent);
    } catch {}
  }, []);

  useEffect(() => {
    poll();
    pollRef.current = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [poll]);

  const unreadCount = sentIds.filter(id => !seenIds.has(id)).length;

  const markAllRead = useCallback(() => {
    setSeenIds(prev => {
      const next = new Set([...prev, ...sentIds]);
      saveSeenIds(next);
      return next;
    });
  }, [sentIds]);

  return { unreadCount, markAllRead };
}
