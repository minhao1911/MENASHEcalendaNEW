import { Router } from "express";
import webpush from "web-push";
import { requireAuth } from "../lib/requireAuth";
import { pool } from "@workspace/db";
import { logger } from "../lib/logger";

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

export default router;
