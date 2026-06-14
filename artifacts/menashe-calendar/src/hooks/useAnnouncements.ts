import { useState, useEffect, useRef, useCallback } from "react";
import { sendNotification, isNotifSupported } from "./useNotifications";

export type AnnouncementStatus = "draft" | "scheduled" | "sent";

export interface Announcement {
  id: string;
  emoji: string;
  title: string;
  body: string;
  scheduledAt: string | null; // ISO string — null means "immediate"
  sentAt: string | null;      // ISO string — set when delivered
  status: AnnouncementStatus;
  pinned: boolean;
}

const STORAGE_KEY = "menashe-announcements";

export function loadAnnouncements(): Announcement[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Announcement[];
  } catch {}
  return [];
}

export function saveAnnouncements(list: Announcement[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch {}
}

export function useAnnouncements() {
  const [announcements, setAnnouncements] = useState<Announcement[]>(loadAnnouncements);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const persist = useCallback((list: Announcement[]) => {
    setAnnouncements(list);
    saveAnnouncements(list);
  }, []);

  // Schedule browser notification for a pending announcement
  const scheduleOne = useCallback((ann: Announcement) => {
    if (ann.status !== "scheduled" || !ann.scheduledAt) return;
    const ms = new Date(ann.scheduledAt).getTime() - Date.now();
    if (ms <= 0) return;

    // Clear any previous timer for this id
    const existing = timersRef.current.get(ann.id);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      if (isNotifSupported() && Notification.permission === "granted") {
        sendNotification(
          `${ann.emoji} ${ann.title}`,
          ann.body,
          `announcement-${ann.id}`
        );
      }
      // Mark as sent
      setAnnouncements(prev => {
        const updated = prev.map(a =>
          a.id === ann.id
            ? { ...a, status: "sent" as AnnouncementStatus, sentAt: new Date().toISOString() }
            : a
        );
        saveAnnouncements(updated);
        return updated;
      });
      timersRef.current.delete(ann.id);
    }, ms);

    timersRef.current.set(ann.id, timer);
  }, []);

  // On mount and whenever list changes, reschedule all pending
  useEffect(() => {
    const current = loadAnnouncements();
    setAnnouncements(current);
    current.forEach(ann => scheduleOne(ann));
    return () => {
      timersRef.current.forEach(t => clearTimeout(t));
      timersRef.current.clear();
    };
  }, []); // run once on mount

  // Send immediately
  const sendNow = useCallback((ann: Announcement) => {
    if (isNotifSupported() && Notification.permission === "granted") {
      sendNotification(`${ann.emoji} ${ann.title}`, ann.body, `announcement-${ann.id}`);
    }
    setAnnouncements(prev => {
      const updated = prev.map(a =>
        a.id === ann.id
          ? { ...a, status: "sent" as AnnouncementStatus, sentAt: new Date().toISOString(), scheduledAt: null }
          : a
      );
      saveAnnouncements(updated);
      return updated;
    });
  }, []);

  // Add new announcement
  const addAnnouncement = useCallback((data: Omit<Announcement, "id" | "sentAt">) => {
    const ann: Announcement = { ...data, id: `ann-${Date.now()}`, sentAt: null };
    setAnnouncements(prev => {
      const updated = [ann, ...prev];
      saveAnnouncements(updated);
      return updated;
    });
    if (ann.status === "scheduled") scheduleOne(ann);
    return ann;
  }, [scheduleOne]);

  // Update existing
  const updateAnnouncement = useCallback((id: string, patch: Partial<Announcement>) => {
    setAnnouncements(prev => {
      const updated = prev.map(a => a.id === id ? { ...a, ...patch } : a);
      saveAnnouncements(updated);
      const fresh = updated.find(a => a.id === id);
      if (fresh && fresh.status === "scheduled") {
        const existing = timersRef.current.get(id);
        if (existing) clearTimeout(existing);
        scheduleOne(fresh);
      }
      return updated;
    });
  }, [scheduleOne]);

  // Delete
  const deleteAnnouncement = useCallback((id: string) => {
    const t = timersRef.current.get(id);
    if (t) { clearTimeout(t); timersRef.current.delete(id); }
    setAnnouncements(prev => {
      const updated = prev.filter(a => a.id !== id);
      saveAnnouncements(updated);
      return updated;
    });
  }, []);

  const unreadCount = announcements.filter(a => a.status === "sent").length;

  return { announcements, addAnnouncement, updateAnnouncement, deleteAnnouncement, sendNow, unreadCount };
}
