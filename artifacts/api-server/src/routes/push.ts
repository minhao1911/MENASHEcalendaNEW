import { Router } from "express";
import webpush from "web-push";
import { requireAuth } from "../lib/requireAuth";
import fs from "fs";
import path from "path";

const router = Router();

const VAPID_PUBLIC = process.env["VAPID_PUBLIC_KEY"] ?? "";
const VAPID_PRIVATE = process.env["VAPID_PRIVATE_KEY"] ?? "";
const VAPID_SUBJECT = process.env["VAPID_SUBJECT"] ?? "mailto:admin@menashecalendar.app";

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

const SUBS_FILE = path.resolve("/tmp/menashe-push-subscriptions.json");

export type ScheduleItem = {
  fireAt: number;
  title: string;
  body: string;
  tag: string;
  icon?: string;
};

type StoredSub = {
  id: string;
  subscription: webpush.PushSubscription;
  schedule: ScheduleItem[];
  addedAt: number;
};

let store: Map<string, StoredSub> = new Map();

function loadStore() {
  try {
    if (fs.existsSync(SUBS_FILE)) {
      const raw = fs.readFileSync(SUBS_FILE, "utf-8");
      const arr: StoredSub[] = JSON.parse(raw);
      store = new Map(arr.map((s) => [s.id, s]));
    }
  } catch {}
}

function saveStore() {
  try {
    fs.writeFileSync(SUBS_FILE, JSON.stringify([...store.values()]), "utf-8");
  } catch {}
}

loadStore();

export function startPushScheduler() {
  setInterval(async () => {
    const now = Date.now();
    for (const [id, sub] of store) {
      const due = sub.schedule.filter((s) => s.fireAt <= now);
      if (due.length === 0) continue;
      sub.schedule = sub.schedule.filter((s) => s.fireAt > now);
      store.set(id, sub);
      saveStore();
      for (const item of due) {
        try {
          await webpush.sendNotification(
            sub.subscription,
            JSON.stringify({
              title: item.title,
              body: item.body,
              tag: item.tag,
              icon: item.icon ?? "/favicon.svg",
            })
          );
        } catch (err: any) {
          if (err?.statusCode === 410 || err?.statusCode === 404) {
            store.delete(id);
            saveStore();
            break;
          }
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

router.post("/push/subscribe", (req, res) => {
  const { subscription, schedule } = req.body as {
    subscription: webpush.PushSubscription;
    schedule: ScheduleItem[];
  };
  if (!subscription?.endpoint) {
    res.status(400).json({ error: "Missing subscription" });
    return;
  }
  const id = Buffer.from(subscription.endpoint).toString("base64").slice(0, 40);
  store.set(id, { id, subscription, schedule: schedule ?? [], addedAt: Date.now() });
  saveStore();
  res.json({ ok: true, id });
});

router.delete("/push/unsubscribe", (req, res) => {
  const { endpoint } = req.body as { endpoint: string };
  if (!endpoint) { res.status(400).json({ error: "Missing endpoint" }); return; }
  const id = Buffer.from(endpoint).toString("base64").slice(0, 40);
  store.delete(id);
  saveStore();
  res.json({ ok: true });
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
