import { Router } from "express";
import webpush from "web-push";
import { Expo, type ExpoPushMessage } from "expo-server-sdk";
import { requireAuth } from "../lib/requireAuth";
import { pool } from "@workspace/db";
import { logger } from "../lib/logger";
import { HebrewCalendar, flags } from "@hebcal/core";

const expo = new Expo();

const router = Router();

const VAPID_PUBLIC = process.env["VAPID_PUBLIC_KEY"] ?? "";
const VAPID_PRIVATE = process.env["VAPID_PRIVATE_KEY"] ?? "";
const VAPID_SUBJECT = process.env["VAPID_SUBJECT"] ?? "mailto:admin@menashecalendar.app";

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

export type ScheduleItem = {
  fireAt: number;
  title: string;
  body: string;
  tag: string;
  icon?: string;
};

function subId(endpoint: string): string {
  return Buffer.from(endpoint).toString("base64").slice(0, 40);
}

async function dbUpsert(
  id: string,
  subscription: webpush.PushSubscription,
  schedule: ScheduleItem[],
  userId?: string | null,
): Promise<void> {
  const keys = subscription.keys as { p256dh: string; auth: string };
  await pool.query(
    `INSERT INTO push_subscriptions (id, endpoint, p256dh, auth, schedule, user_id, updated_at)
     VALUES ($1, $2, $3, $4, $5::jsonb, $6, NOW())
     ON CONFLICT (id) DO UPDATE
       SET endpoint   = EXCLUDED.endpoint,
           p256dh     = EXCLUDED.p256dh,
           auth       = EXCLUDED.auth,
           schedule   = EXCLUDED.schedule,
           user_id    = COALESCE(EXCLUDED.user_id, push_subscriptions.user_id),
           updated_at = NOW()`,
    [id, subscription.endpoint, keys.p256dh, keys.auth, JSON.stringify(schedule), userId ?? null]
  );
}

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; tag: string; icon?: string },
): Promise<void> {
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return;
  let rows: Array<{ endpoint: string; p256dh: string; auth: string }>;
  try {
    const result = await pool.query(
      "SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1",
      [userId],
    );
    rows = result.rows;
  } catch { return; }
  for (const row of rows) {
    try {
      await webpush.sendNotification(
        { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
        JSON.stringify({ ...payload, icon: payload.icon ?? "/favicon.svg" }),
      );
    } catch (err: any) {
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        await pool.query("DELETE FROM push_subscriptions WHERE endpoint = $1", [row.endpoint]).catch(() => {});
      }
    }
  }
}

async function dbRemove(id: string): Promise<void> {
  await pool.query("DELETE FROM push_subscriptions WHERE id = $1", [id]);
}

async function dbPruneFired(id: string, remainingSchedule: ScheduleItem[]): Promise<void> {
  await pool.query(
    "UPDATE push_subscriptions SET schedule = $2::jsonb, updated_at = NOW() WHERE id = $1",
    [id, JSON.stringify(remainingSchedule)]
  );
}

async function fireBroadcastNow(bc: { id: number; emoji: string; title: string; body: string }) {
  const fullTitle = `${bc.emoji} ${bc.title}`;
  const tag = `broadcast-${bc.id}`;
  const icon = "/favicon.svg";

  // Web push
  if (VAPID_PUBLIC && VAPID_PRIVATE) {
    let webRows: Array<{ id: string; endpoint: string; p256dh: string; auth: string }> = [];
    try {
      const r = await pool.query<{ id: string; endpoint: string; p256dh: string; auth: string }>(
        "SELECT id, endpoint, p256dh, auth FROM push_subscriptions"
      );
      webRows = r.rows;
    } catch {}
    for (const row of webRows) {
      try {
        await webpush.sendNotification(
          { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
          JSON.stringify({ title: fullTitle, body: bc.body, tag, icon })
        );
      } catch (err: any) {
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          await pool.query("DELETE FROM push_subscriptions WHERE id = $1", [row.id]).catch(() => {});
        }
      }
    }
  }

  // Expo push
  let expoRows: Array<{ token: string }> = [];
  try {
    const r = await pool.query<{ token: string }>("SELECT token FROM expo_push_tokens");
    expoRows = r.rows;
  } catch {}
  const msgs: import("expo-server-sdk").ExpoPushMessage[] = expoRows
    .filter((r) => Expo.isExpoPushToken(r.token))
    .map((r) => ({ to: r.token, title: fullTitle, body: bc.body, sound: "default" as const, data: { tag } }));
  if (msgs.length > 0) {
    try {
      const chunks = expo.chunkPushNotifications(msgs);
      for (const chunk of chunks) await expo.sendPushNotificationsAsync(chunk);
    } catch (err) {
      logger.error({ err }, "scheduled-broadcast: expo send failed");
    }
  }

  // Mark as sent
  await pool.query("UPDATE scheduled_broadcasts SET sent_at = NOW() WHERE id = $1", [bc.id]).catch(() => {});
  logger.info({ id: bc.id, title: bc.title }, "scheduled-broadcast: fired");
}

export function startPushScheduler() {
  setInterval(async () => {
    if (!VAPID_PUBLIC || !VAPID_PRIVATE) return;
    const now = Date.now();
    let rows: Array<{ id: string; endpoint: string; p256dh: string; auth: string; schedule: ScheduleItem[] }>;
    try {
      const result = await pool.query<{ id: string; endpoint: string; p256dh: string; auth: string; schedule: ScheduleItem[] }>(
        "SELECT id, endpoint, p256dh, auth, schedule FROM push_subscriptions"
      );
      rows = result.rows;
    } catch (err) {
      logger.error({ err }, "push-scheduler: failed to load subscriptions");
      return;
    }

    for (const row of rows) {
      const schedule: ScheduleItem[] = Array.isArray(row.schedule) ? row.schedule : [];
      const due = schedule.filter((s) => s.fireAt <= now);
      if (due.length === 0) continue;

      const remaining = schedule.filter((s) => s.fireAt > now);
      await dbPruneFired(row.id, remaining);

      const subscription: webpush.PushSubscription = {
        endpoint: row.endpoint,
        keys: { p256dh: row.p256dh, auth: row.auth },
      };

      for (const item of due) {
        try {
          await webpush.sendNotification(
            subscription,
            JSON.stringify({
              title: item.title,
              body: item.body,
              tag: item.tag,
              icon: item.icon ?? "/favicon.svg",
            })
          );
        } catch (err: any) {
          if (err?.statusCode === 410 || err?.statusCode === 404) {
            await dbRemove(row.id);
            logger.info({ id: row.id }, "push-scheduler: removed expired subscription");
            break;
          }
          logger.warn({ err, id: row.id }, "push-scheduler: send failed");
        }
      }
    }

    // Fire any due scheduled broadcasts
    try {
      const r = await pool.query<{ id: number; emoji: string; title: string; body: string }>(
        "SELECT id, emoji, title, body FROM scheduled_broadcasts WHERE fire_at <= NOW() AND sent_at IS NULL"
      );
      for (const bc of r.rows) {
        await fireBroadcastNow(bc);
      }
    } catch (err) {
      logger.error({ err }, "push-scheduler: failed to check scheduled broadcasts");
    }
  }, 30_000);
}

router.get("/push/vapid-public-key", (_req, res) => {
  if (!VAPID_PUBLIC) {
    res.status(503).json({ error: "Push notifications not configured" });
    return;
  }
  res.json({ publicKey: VAPID_PUBLIC });
});

router.post("/push/subscribe", async (req, res) => {
  const { subscription, schedule, userId } = req.body as {
    subscription: webpush.PushSubscription;
    schedule: ScheduleItem[];
    userId?: string;
  };
  if (!subscription?.endpoint) {
    res.status(400).json({ error: "Missing subscription" });
    return;
  }
  const id = subId(subscription.endpoint);
  try {
    await dbUpsert(id, subscription, schedule ?? [], userId ?? null);
    res.json({ ok: true, id });
  } catch (err) {
    logger.error({ err }, "push/subscribe: db error");
    res.status(500).json({ error: "Failed to save subscription" });
  }
});

router.delete("/push/unsubscribe", async (req, res) => {
  const { endpoint } = req.body as { endpoint: string };
  if (!endpoint) { res.status(400).json({ error: "Missing endpoint" }); return; }
  const id = subId(endpoint);
  try {
    await dbRemove(id);
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "push/unsubscribe: db error");
    res.status(500).json({ error: "Failed to remove subscription" });
  }
});

router.get("/push/subscriber-count", async (req, res) => {
  const pin = req.headers["x-admin-pin"];
  if (!process.env["ADMIN_PIN"] || pin !== process.env["ADMIN_PIN"]) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  try {
    const webResult = await pool.query("SELECT COUNT(*) FROM push_subscriptions");
    const expoResult = await pool.query("SELECT COUNT(*) FROM expo_push_tokens");
    res.json({
      web: parseInt(webResult.rows[0].count, 10),
      expo: parseInt(expoResult.rows[0].count, 10),
    });
  } catch (err) {
    logger.error({ err }, "subscriber-count: db error");
    res.status(500).json({ error: "Failed to get count" });
  }
});

router.post("/push/broadcast", async (req, res) => {
  const pin = req.headers["x-admin-pin"];
  if (!process.env["ADMIN_PIN"] || pin !== process.env["ADMIN_PIN"]) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const { title, body, emoji } = req.body as { title: string; body: string; emoji?: string };
  if (!title?.trim() || !body?.trim()) {
    res.status(400).json({ error: "title and body are required" });
    return;
  }

  const icon = "/favicon.svg";
  const tag = `broadcast-${Date.now()}`;
  const fullTitle = emoji ? `${emoji} ${title}` : title;

  let webSent = 0, webFailed = 0, expoSent = 0, expoFailed = 0;

  // — Web push —
  if (VAPID_PUBLIC && VAPID_PRIVATE) {
    let webRows: Array<{ id: string; endpoint: string; p256dh: string; auth: string }> = [];
    try {
      const r = await pool.query<{ id: string; endpoint: string; p256dh: string; auth: string }>(
        "SELECT id, endpoint, p256dh, auth FROM push_subscriptions"
      );
      webRows = r.rows;
    } catch (err) {
      logger.error({ err }, "broadcast: failed to load web subscriptions");
    }
    for (const row of webRows) {
      try {
        await webpush.sendNotification(
          { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
          JSON.stringify({ title: fullTitle, body, tag, icon })
        );
        webSent++;
      } catch (err: any) {
        if (err?.statusCode === 410 || err?.statusCode === 404) {
          await pool.query("DELETE FROM push_subscriptions WHERE id = $1", [row.id]).catch(() => {});
        }
        webFailed++;
      }
    }
  }

  // — Expo push —
  let expoRows: Array<{ token: string }> = [];
  try {
    const r = await pool.query<{ token: string }>("SELECT token FROM expo_push_tokens");
    expoRows = r.rows;
  } catch (err) {
    logger.error({ err }, "broadcast: failed to load expo tokens");
  }
  const expoMessages: import("expo-server-sdk").ExpoPushMessage[] = expoRows
    .filter((r) => Expo.isExpoPushToken(r.token))
    .map((r) => ({ to: r.token, title: fullTitle, body, sound: "default" as const, data: { tag } }));
  if (expoMessages.length > 0) {
    try {
      const chunks = expo.chunkPushNotifications(expoMessages);
      for (const chunk of chunks) {
        const receipts = await expo.sendPushNotificationsAsync(chunk);
        for (const receipt of receipts) {
          if (receipt.status === "ok") expoSent++;
          else expoFailed++;
        }
      }
    } catch (err) {
      logger.error({ err }, "broadcast: expo send failed");
      expoFailed += expoMessages.length;
    }
  }

  logger.info({ webSent, webFailed, expoSent, expoFailed }, "broadcast: complete");
  res.json({ ok: true, webSent, webFailed, expoSent, expoFailed });
});

// ── Scheduled Broadcast endpoints ────────────────────────────────────────────

function checkAdminPin(req: import("express").Request, res: import("express").Response): boolean {
  const pin = req.headers["x-admin-pin"];
  if (!process.env["ADMIN_PIN"] || pin !== process.env["ADMIN_PIN"]) {
    res.status(403).json({ error: "Forbidden" });
    return false;
  }
  return true;
}

router.get("/push/broadcast/scheduled", async (req, res) => {
  if (!checkAdminPin(req, res)) return;
  try {
    const r = await pool.query<{ id: number; emoji: string; title: string; body: string; fire_at: string; sent_at: string | null; created_at: string }>(
      "SELECT id, emoji, title, body, fire_at, sent_at, created_at FROM scheduled_broadcasts ORDER BY fire_at ASC"
    );
    res.json(r.rows);
  } catch (err) {
    logger.error({ err }, "broadcast/scheduled GET: db error");
    res.status(500).json({ error: "DB error" });
  }
});

router.post("/push/broadcast/scheduled", async (req, res) => {
  if (!checkAdminPin(req, res)) return;
  const { emoji, title, body, fireAt } = req.body as { emoji?: string; title: string; body: string; fireAt: string };
  if (!title?.trim() || !body?.trim() || !fireAt) {
    res.status(400).json({ error: "emoji, title, body, fireAt are required" });
    return;
  }
  const fireDate = new Date(fireAt);
  if (isNaN(fireDate.getTime()) || fireDate <= new Date()) {
    res.status(400).json({ error: "fireAt must be a future date" });
    return;
  }
  try {
    const r = await pool.query<{ id: number }>(
      "INSERT INTO scheduled_broadcasts (emoji, title, body, fire_at) VALUES ($1,$2,$3,$4) RETURNING id",
      [emoji ?? "📢", title.trim(), body.trim(), fireDate.toISOString()]
    );
    res.json({ ok: true, id: r.rows[0].id });
  } catch (err) {
    logger.error({ err }, "broadcast/scheduled POST: db error");
    res.status(500).json({ error: "DB error" });
  }
});

router.delete("/push/broadcast/scheduled/:id", async (req, res) => {
  if (!checkAdminPin(req, res)) return;
  const id = parseInt(req.params["id"] ?? "", 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    await pool.query("DELETE FROM scheduled_broadcasts WHERE id = $1 AND sent_at IS NULL", [id]);
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "broadcast/scheduled DELETE: db error");
    res.status(500).json({ error: "DB error" });
  }
});

router.post("/push/send-test", requireAuth, async (req, res) => {
  const { subscription } = req.body as { subscription: webpush.PushSubscription };
  if (!subscription?.endpoint) { res.status(400).json({ error: "Missing subscription" }); return; }
  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title: "✡ Menashe Calendar",
        body: "Background push notifications are working! Shabbat Shalom.",
        tag: "push-test",
        icon: "/favicon.svg",
      })
    );
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Send failed" });
  }
});


// ── Expo Push Token endpoints ────────────────────────────────────────────────

router.post("/push/expo-token", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const { token, location, notifPrefs, leadMins } = req.body as {
    token: string;
    location?: object;
    notifPrefs?: object;
    leadMins?: number;
  };
  if (!token || !Expo.isExpoPushToken(token)) {
    res.status(400).json({ error: "Invalid Expo push token" });
    return;
  }
  const id = Buffer.from(token).toString("base64").slice(0, 64);
  try {
    await pool.query(
      `INSERT INTO expo_push_tokens (id, user_id, token, location, notif_prefs, lead_mins, updated_at)
       VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, NOW())
       ON CONFLICT (token) DO UPDATE
         SET user_id     = EXCLUDED.user_id,
             location    = COALESCE(EXCLUDED.location, expo_push_tokens.location),
             notif_prefs = COALESCE(EXCLUDED.notif_prefs, expo_push_tokens.notif_prefs),
             lead_mins   = EXCLUDED.lead_mins,
             updated_at  = NOW()`,
      [id, userId, token, location ? JSON.stringify(location) : null,
       notifPrefs ? JSON.stringify(notifPrefs) : null, leadMins ?? 15],
    );
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "expo-token: db error");
    res.status(500).json({ error: "Failed to save token" });
  }
});

router.delete("/push/expo-token", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  const { token } = req.body as { token: string };
  if (!token) { res.status(400).json({ error: "Missing token" }); return; }
  try {
    await pool.query(
      "DELETE FROM expo_push_tokens WHERE token = $1 AND user_id = $2",
      [token, userId],
    );
    res.json({ ok: true });
  } catch (err) {
    logger.error({ err }, "expo-token delete: db error");
    res.status(500).json({ error: "Failed to remove token" });
  }
});

router.post("/push/expo-send-test", requireAuth, async (req, res) => {
  const userId = (req as any).userId as string;
  let rows: { token: string }[];
  try {
    const r = await pool.query<{ token: string }>(
      "SELECT token FROM expo_push_tokens WHERE user_id = $1",
      [userId],
    );
    rows = r.rows;
  } catch (err) {
    logger.error({ err }, "expo-send-test: db error");
    res.status(500).json({ error: "Failed to load tokens" });
    return;
  }
  if (rows.length === 0) {
    res.status(404).json({ error: "No registered Expo push tokens for this user" });
    return;
  }
  const messages: ExpoPushMessage[] = rows
    .filter((r) => Expo.isExpoPushToken(r.token))
    .map((r) => ({
      to: r.token,
      title: "✡ Menashe Calendar",
      body: "Server push notifications are working! Shabbat Shalom.",
      sound: "default" as const,
      data: { tag: "push-test" },
    }));
  try {
    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) await expo.sendPushNotificationsAsync(chunk);
    res.json({ ok: true, sent: messages.length });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Send failed" });
  }
});

// ── Holiday Web Push Scheduler ───────────────────────────────────────────────
// Fires at 9am every day and sends a web push to ALL subscribers the day before a holiday.

let _holidayPushLastFiredDate = "";

export function startHolidayWebPushScheduler() {
  setInterval(async () => {
    if (!VAPID_PUBLIC || !VAPID_PRIVATE) return;

    const now = new Date();
    if (now.getHours() !== 9 || now.getMinutes() >= 5) return;

    const dateKey = now.toDateString();
    if (_holidayPushLastFiredDate === dateKey) return;
    _holidayPushLastFiredDate = dateKey;

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const tomorrowEnd = new Date(tomorrow);
    tomorrowEnd.setHours(23, 59, 59, 999);

    const events = HebrewCalendar.calendar({
      start: tomorrow,
      end: tomorrowEnd,
      il: true,
      isHebrewYear: false,
      mask: flags.CHAG | flags.MODERN_HOLIDAY | flags.ROSH_CHODESH | flags.MINOR_FAST | flags.MAJOR_FAST,
    });

    if (events.length === 0) return;

    let webRows: Array<{ id: string; endpoint: string; p256dh: string; auth: string }> = [];
    try {
      const r = await pool.query<{ id: string; endpoint: string; p256dh: string; auth: string }>(
        "SELECT id, endpoint, p256dh, auth FROM push_subscriptions"
      );
      webRows = r.rows;
    } catch (err) {
      logger.error({ err }, "holiday-web-push: failed to load subscriptions");
      return;
    }

    if (webRows.length === 0) return;

    for (const ev of events) {
      const name = ev.render("en");
      const dateStr = tomorrow.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
      const payload = JSON.stringify({
        title: `✡ ${name} Begins Tomorrow`,
        body: `${name} starts tomorrow, ${dateStr}. Chag Sameach from Bnei Menashe!`,
        tag: `holiday-web-${name.replace(/\s+/g, "-").toLowerCase()}-${dateKey}`,
        icon: "/favicon.svg",
      });

      for (const row of webRows) {
        try {
          await webpush.sendNotification(
            { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
            payload,
          );
        } catch (err: any) {
          if (err?.statusCode === 410 || err?.statusCode === 404) {
            await pool.query("DELETE FROM push_subscriptions WHERE id = $1", [row.id]).catch(() => {});
          }
        }
      }
      logger.info({ name, subscribers: webRows.length }, "holiday-web-push: sent");
    }
  }, 60_000); // check every minute
}

// ── Yahrzeit Push Scheduler ──────────────────────────────────────────────────

let _yahrzeitPushLastFiredDate = "";

export function startYahrzeitPushScheduler() {
  setInterval(async () => {
    if (!VAPID_PUBLIC || !VAPID_PRIVATE) return;

    const now = new Date();
    if (now.getHours() !== 8 || now.getMinutes() >= 5) return;

    const dateKey = now.toDateString();
    if (_yahrzeitPushLastFiredDate === dateKey) return;
    _yahrzeitPushLastFiredDate = dateKey;

    const hToday = new HDate(now);
    const hDay = hToday.getDate();
    const hMonth = hToday.getMonth();

    let entries: Array<{ user_id: string; name: string }> = [];
    try {
      const r = await pool.query<{ user_id: string; name: string }>(
        "SELECT user_id, name FROM yahrzeit_entries WHERE hebrew_day = $1 AND hebrew_month = $2",
        [hDay, hMonth],
      );
      entries = r.rows;
    } catch (err) {
      logger.error({ err }, "yahrzeit-push: failed to query entries");
      return;
    }

    if (entries.length === 0) return;

    for (const entry of entries) {
      try {
        await sendPushToUser(entry.user_id, {
          title: `🕯 Yahrzeit Today: ${entry.name}`,
          body: `Today is the Yahrzeit of ${entry.name}. May their memory be a blessing. Light a candle and recite Kaddish.`,
          tag: `yahrzeit-${entry.user_id}-${dateKey}`,
          icon: "/favicon.svg",
        });
      } catch (err) {
        logger.error({ err, name: entry.name }, "yahrzeit-push: failed to send notification");
      }
    }

    logger.info({ count: entries.length, hDay, hMonth }, "yahrzeit-push: sent reminders");
  }, 60_000);
}

// ── Expo Push Scheduler ──────────────────────────────────────────────────────

function nextShabbatCandles(from: Date = new Date()): Date {
  const d = new Date(from);
  const daysUntilFriday = (5 - d.getDay() + 7) % 7 || 7;
  d.setDate(d.getDate() + daysUntilFriday);
  d.setHours(18, 0, 0, 0);
  return d;
}

export function startExpoScheduler() {
  async function tick() {
    let rows: { user_id: string; token: string; notif_prefs: any; location: any; lead_mins: number }[];
    try {
      const r = await pool.query<{ user_id: string; token: string; notif_prefs: any; location: any; lead_mins: number }>(
        "SELECT user_id, token, notif_prefs, location, lead_mins FROM expo_push_tokens",
      );
      rows = r.rows;
    } catch (err) {
      logger.error({ err }, "expo-scheduler: failed to load tokens");
      return;
    }

    const now = new Date();
    const messages: ExpoPushMessage[] = [];

    for (const row of rows) {
      if (!Expo.isExpoPushToken(row.token)) continue;
      const prefs = row.notif_prefs ?? {};

      // Shabbat candle lighting reminder — fire at 18:00 on Fridays
      if (prefs.shabbat !== false) {
        const friday = nextShabbatCandles(now);
        const reminderHour = friday.getHours() - 1;
        if (now.getDay() === 5 && now.getHours() === reminderHour && now.getMinutes() < 5) {
          const tz = row.location?.tz ?? "UTC";
          const localTime = friday.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: tz });
          messages.push({
            to: row.token,
            title: "🕯️ Shabbat Candle Lighting",
            body: `Candle lighting is in about 1 hour at ${localTime}. Shabbat Shalom!`,
            sound: "default",
            data: { tag: "shabbat" },
          });
        }
      }

      // Holiday alerts — fire at 09:00 the day before
      if (prefs.holiday !== false) {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        if (now.getHours() === 9 && now.getMinutes() < 5) {
          const events = HebrewCalendar.calendar({
            start: tomorrow, end: tomorrow, il: true, isHebrewYear: false,
            mask: flags.CHAG | flags.MODERN_HOLIDAY,
          });
          for (const ev of events) {
            const name = ev.render("en");
            const dateStr = tomorrow.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
            messages.push({
              to: row.token,
              title: `✡ ${name} Begins Tomorrow`,
              body: `${name} starts tomorrow, ${dateStr}. Chag Sameach from Bnei Menashe!`,
              sound: "default",
              data: { tag: `holiday-${name.replace(/\s+/g, "-").toLowerCase()}` },
            });
          }
        }
      }

      // Parasha reminder — Friday morning at 08:00
      if (prefs.parasha !== false) {
        if (now.getDay() === 5 && now.getHours() === 8 && now.getMinutes() < 5) {
          const events = HebrewCalendar.calendar({
            start: now, end: now, il: true, isHebrewYear: false,
            mask: flags.PARSHA_HASHAVUA,
          });
          if (events.length > 0) {
            const name = events[0].render("en");
            messages.push({
              to: row.token,
              title: `📖 Parashat ${name}`,
              body: `This Shabbat's Torah portion is Parashat ${name}. Shabbat Shalom from Bnei Menashe!`,
              sound: "default",
              data: { tag: "parasha" },
            });
          }
        }
      }
    }

    if (messages.length === 0) return;
    try {
      const chunks = expo.chunkPushNotifications(messages);
      for (const chunk of chunks) {
        const receipts = await expo.sendPushNotificationsAsync(chunk);
        for (const receipt of receipts) {
          if (receipt.status === "error") {
            if (receipt.details?.error === "DeviceNotRegistered") {
              const badToken = messages.find((m) =>
                chunk.some((c) => c.to === m.to),
              )?.to;
              if (badToken) {
                await pool.query("DELETE FROM expo_push_tokens WHERE token = $1", [badToken]).catch(() => {});
              }
            }
          }
        }
      }
      logger.info({ count: messages.length }, "expo-scheduler: sent push notifications");
    } catch (err) {
      logger.error({ err }, "expo-scheduler: send failed");
    }
  }

  setInterval(tick, 5 * 60 * 1000);
}

export default router;
