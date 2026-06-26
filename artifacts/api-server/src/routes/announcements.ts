import { Router } from "express";
import { Expo, type ExpoPushMessage } from "expo-server-sdk";
import webpush from "web-push";
import { pool } from "@workspace/db";
import { logger } from "../lib/logger";
import { requireAdmin } from "../lib/requireAdmin";
import { getAuth } from "@clerk/express";
import { isAdminUser } from "../lib/authorization";

const router = Router();
const expo = new Expo();

const VAPID_PUBLIC = process.env["VAPID_PUBLIC_KEY"] ?? "";
const VAPID_PRIVATE = process.env["VAPID_PRIVATE_KEY"] ?? "";
const VAPID_SUBJECT = process.env["VAPID_SUBJECT"] ?? "mailto:admin@menashecalendar.app";

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  try { webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE); } catch {}
}

export interface CommunityAnnouncement {
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

function rowToAnn(row: any): CommunityAnnouncement {
  return {
    id: row.id,
    emoji: row.emoji,
    title: row.title,
    body: row.body,
    status: row.status,
    pinned: row.pinned,
    scheduledAt: row.scheduled_at ? new Date(row.scheduled_at).toISOString() : null,
    sentAt: row.sent_at ? new Date(row.sent_at).toISOString() : null,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

async function broadcastToAll(ann: CommunityAnnouncement) {
  const title = `${ann.emoji} ${ann.title}`;
  const body = ann.body || ann.title;

  // ── Expo push (mobile) ──────────────────────────────────────────
  let expoTokenRows: { token: string }[] = [];
  try {
    const r = await pool.query<{ token: string }>("SELECT token FROM expo_push_tokens");
    expoTokenRows = r.rows;
  } catch (err) {
    logger.error({ err }, "announcements broadcast: failed to load expo tokens");
  }

  const expoMessages: ExpoPushMessage[] = expoTokenRows
    .filter((r) => Expo.isExpoPushToken(r.token))
    .map((r) => ({
      to: r.token,
      title,
      body,
      sound: "default" as const,
      data: { tag: `announcement-${ann.id}`, announcementId: ann.id },
    }));

  if (expoMessages.length > 0) {
    try {
      const chunks = expo.chunkPushNotifications(expoMessages);
      for (const chunk of chunks) {
        const receipts = await expo.sendPushNotificationsAsync(chunk);
        for (const receipt of receipts) {
          if (receipt.status === "error" && receipt.details?.error === "DeviceNotRegistered") {
            const badToken = chunk.find((_, i) => receipts[i] === receipt)?.to;
            if (badToken) await pool.query("DELETE FROM expo_push_tokens WHERE token = $1", [badToken]).catch(() => {});
          }
        }
      }
      logger.info({ count: expoMessages.length }, "announcements: sent expo push");
    } catch (err) {
      logger.error({ err }, "announcements: expo push failed");
    }
  }

  // ── Web push (browser) ─────────────────────────────────────────
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return;
  let webRows: { id: string; endpoint: string; p256dh: string; auth: string }[] = [];
  try {
    const r = await pool.query<{ id: string; endpoint: string; p256dh: string; auth: string }>(
      "SELECT id, endpoint, p256dh, auth FROM push_subscriptions",
    );
    webRows = r.rows;
  } catch (err) {
    logger.error({ err }, "announcements broadcast: failed to load web push subs");
  }

  const payload = JSON.stringify({ title, body, tag: `announcement-${ann.id}`, icon: "/favicon.svg" });
  for (const row of webRows) {
    try {
      await webpush.sendNotification({ endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } }, payload);
    } catch (err: any) {
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        await pool.query("DELETE FROM push_subscriptions WHERE id = $1", [row.id]).catch(() => {});
      }
    }
  }
  logger.info({ count: webRows.length }, "announcements: sent web push");
}

// GET /announcements — public feed (sent); admin sees all
router.get("/announcements", async (req, res) => {
  const auth = getAuth(req);
  const isAdmin = isAdminUser(auth?.userId);
  try {
    const r = await pool.query(
      isAdmin
        ? `SELECT * FROM community_announcements ORDER BY COALESCE(sent_at, scheduled_at, created_at) DESC LIMIT 100`
        : `SELECT * FROM community_announcements WHERE status = 'sent' ORDER BY pinned DESC, sent_at DESC LIMIT 50`,
    );
    res.json({ announcements: r.rows.map(rowToAnn) });
  } catch (err) {
    logger.error({ err }, "GET /announcements: db error");
    res.status(500).json({ error: "Failed to load announcements" });
  }
});

// POST /announcements/broadcast — admin creates + sends + pushes
router.post("/announcements/broadcast", requireAdmin, async (req, res) => {
  const { emoji, title, body, scheduledAt, pinned } = req.body as {
    emoji?: string;
    title: string;
    body?: string;
    scheduledAt?: string | null;
    pinned?: boolean;
  };

  if (!title?.trim()) {
    res.status(400).json({ error: "Title is required" });
    return;
  }

  const id = `ann-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const isScheduled = !!scheduledAt;
  const status = isScheduled ? "scheduled" : "sent";
  const sentAt = isScheduled ? null : new Date().toISOString();

  try {
    await pool.query(
      `INSERT INTO community_announcements (id, emoji, title, body, status, pinned, scheduled_at, sent_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, emoji ?? "📢", title.trim(), body ?? "", status, pinned ?? false,
       scheduledAt ? new Date(scheduledAt) : null, sentAt ? new Date(sentAt) : null],
    );
  } catch (err) {
    logger.error({ err }, "POST /announcements/broadcast: db error");
    res.status(500).json({ error: "Failed to save announcement" });
    return;
  }

  const ann: CommunityAnnouncement = {
    id, emoji: emoji ?? "📢", title: title.trim(), body: body ?? "", status,
    pinned: pinned ?? false,
    scheduledAt: scheduledAt ? new Date(scheduledAt).toISOString() : null,
    sentAt,
    createdAt: new Date().toISOString(),
  };

  res.json({ ok: true, announcement: ann });

  if (status === "sent") {
    broadcastToAll(ann).catch((err) => logger.error({ err }, "broadcastToAll failed"));
  }
});

// PATCH /announcements/:id — admin update / send draft
router.patch("/announcements/:id", requireAdmin, async (req, res) => {
  const { emoji, title, body, pinned, sendNow } = req.body as {
    emoji?: string;
    title?: string;
    body?: string;
    pinned?: boolean;
    sendNow?: boolean;
  };

  const { id } = req.params;
  try {
    const existing = await pool.query("SELECT * FROM community_announcements WHERE id = $1", [id]);
    if (existing.rows.length === 0) { res.status(404).json({ error: "Not found" }); return; }

    const row = existing.rows[0];
    const newEmoji = emoji ?? row.emoji;
    const newTitle = title ?? row.title;
    const newBody = body ?? row.body;
    const newPinned = pinned ?? row.pinned;
    const newStatus = sendNow ? "sent" : row.status;
    const newSentAt = sendNow ? new Date() : row.sent_at;

    await pool.query(
      `UPDATE community_announcements SET emoji=$1, title=$2, body=$3, pinned=$4, status=$5, sent_at=$6, updated_at=NOW() WHERE id=$7`,
      [newEmoji, newTitle, newBody, newPinned, newStatus, newSentAt, id],
    );

    const ann: CommunityAnnouncement = {
      id, emoji: newEmoji, title: newTitle, body: newBody, status: newStatus,
      pinned: newPinned,
      scheduledAt: row.scheduled_at ? new Date(row.scheduled_at).toISOString() : null,
      sentAt: newSentAt ? new Date(newSentAt).toISOString() : null,
      createdAt: new Date(row.created_at).toISOString(),
    };
    res.json({ ok: true, announcement: ann });

    if (sendNow) {
      broadcastToAll(ann).catch((err) => logger.error({ err }, "broadcastToAll on patch failed"));
    }
  } catch (err) {
    logger.error({ err }, "PATCH /announcements/:id: db error");
    res.status(500).json({ error: "Failed to update announcement" });
  }
});

// DELETE /announcements/:id — admin delete
router.delete("/announcements/:id", requireAdmin, async (req, res) => {
  try {
    await pool.query("DELETE FROM community_announcements WHERE id = $1", [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "DELETE /announcements/:id: db error");
    res.status(500).json({ error: "Failed to delete announcement" });
  }
});

export default router;
