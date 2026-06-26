import { Router } from "express";
import crypto from "crypto";
import Razorpay from "razorpay";
import { pool } from "@workspace/db";
import { requireAuth, requireAdmin } from "../lib/authorization";

const router = Router();

const PRICES: Record<string, number> = {
  monthly: 19900,
  annual: 99900,
};

function getRazorpay() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) return null;
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

/* ── GET /api/payment/config ────────────────────────────────────────────────
   Returns public key + enabled status (no auth required — used by frontend) */
router.get("/payment/config", (_req, res) => {
  res.json({
    razorpay: {
      enabled: !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
      keyId: process.env.RAZORPAY_KEY_ID ?? null,
    },
  });
});

/* ── POST /api/payment/razorpay/order ───────────────────────────────────────
   Creates a Razorpay order. Requires auth.
   Body: { plan: "monthly" | "annual" } */
router.post("/payment/razorpay/order", requireAuth, async (req, res) => {
  const rz = getRazorpay();
  if (!rz) return res.status(503).json({ error: "Razorpay not configured" });

  const userId = (req as any).userId;
  const { plan } = req.body as { plan: string };

  if (!plan || !PRICES[plan]) {
    return res.status(400).json({ error: "Invalid plan. Must be 'monthly' or 'annual'." });
  }

  try {
    const order = await rz.orders.create({
      amount: PRICES[plan],
      currency: "INR",
      receipt: `menashe_${userId.slice(0, 16)}_${Date.now()}`,
      notes: { userId, plan, product: "Menashe Calendar Premium" },
    });

    return res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (err: any) {
    console.error("Razorpay order creation failed:", err);
    return res.status(500).json({ error: err.message ?? "Order creation failed" });
  }
});

/* ── POST /api/payment/razorpay/verify ──────────────────────────────────────
   Verifies Razorpay signature, grants premium, records payment. Requires auth.
   Body: { orderId, paymentId, signature, plan } */
router.post("/payment/razorpay/verify", requireAuth, async (req, res) => {
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keySecret) return res.status(503).json({ error: "Razorpay not configured" });

  const userId = (req as any).userId;
  const { orderId, paymentId, signature, plan } = req.body as {
    orderId: string;
    paymentId: string;
    signature: string;
    plan: string;
  };

  if (!orderId || !paymentId || !signature) {
    return res.status(400).json({ error: "Missing payment verification fields." });
  }

  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  if (expected !== signature) {
    return res.status(400).json({ verified: false, error: "Signature mismatch — payment not verified." });
  }

  const client = await pool.connect();
  try {
    await client.query(
      `INSERT INTO user_profiles (user_id, is_premium, theme, candle_enabled, language, updated_at)
       VALUES ($1, true, 'dark', true, 'en', NOW())
       ON CONFLICT (user_id) DO UPDATE SET is_premium = true, updated_at = NOW()`,
      [userId],
    );

    await client.query(
      `INSERT INTO payment_records (user_id, order_id, payment_id, plan, amount, status, created_at)
       VALUES ($1, $2, $3, $4, $5, 'captured', NOW())
       ON CONFLICT (payment_id) DO NOTHING`,
      [userId, orderId, paymentId, plan ?? "unknown", PRICES[plan] ?? 0],
    );

    return res.json({ verified: true, isPremium: true });
  } catch (err: any) {
    console.error("Failed to activate premium after payment:", err);
    return res.status(500).json({ error: "Payment verified but failed to activate premium." });
  } finally {
    client.release();
  }
});

/* ── GET /api/admin/payments ─────────────────────────────────────────────────
   Returns all Razorpay payment records with user display names. Admin only. */
router.get("/admin/payments", requireAdmin, async (req, res) => {

  const client = await pool.connect();
  try {
    const { rows } = await client.query(`
      SELECT
        pr.id,
        pr.user_id,
        pr.order_id,
        pr.payment_id,
        pr.plan,
        pr.amount,
        pr.status,
        pr.created_at,
        pp.display_name,
        pp.avatar_emoji,
        pp.congregation,
        pp.city,
        pp.country
      FROM payment_records pr
      LEFT JOIN user_public_profiles pp ON pp.user_id = pr.user_id
      ORDER BY pr.created_at DESC
    `);
    return res.json(rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      orderId: r.order_id,
      paymentId: r.payment_id,
      plan: r.plan,
      amount: r.amount,
      status: r.status,
      createdAt: r.created_at,
      displayName: r.display_name ?? null,
      avatarEmoji: r.avatar_emoji ?? "👤",
      congregation: r.congregation ?? null,
      city: r.city ?? null,
      country: r.country ?? null,
    })));
  } finally {
    client.release();
  }
});

export default router;
