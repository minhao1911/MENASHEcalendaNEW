import { Router } from "express";
import { pool } from "@workspace/db";
import { requireAuth } from "../lib/requireAuth";

const router = Router();

/* ── GET /community/yahrzeit — public, returns all lit candles with active learners ── */
router.get("/community/yahrzeit", async (req, res) => {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(`
      SELECT
        cy.id, cy.user_id, cy.deceased_name, cy.hebrew_day, cy.hebrew_month,
        cy.display_date, cy.passing_year, cy.message,
        cy.candle_lit, cy.candle_lit_by, cy.candle_lit_at,
        cy.donor_display_name, cy.created_at,
        COALESCE(
          json_agg(
            json_build_object(
              'id', cyl.id,
              'learnerName', cyl.learner_name,
              'studySubject', cyl.study_subject
            )
          ) FILTER (WHERE cyl.id IS NOT NULL AND cyl.active_until > NOW()),
          '[]'
        ) AS learners
      FROM community_yahrzeit cy
      LEFT JOIN community_yahrzeit_learners cyl
        ON cyl.entry_id = cy.id AND cyl.active_until > NOW()
      WHERE cy.candle_lit = true
      GROUP BY cy.id
      ORDER BY cy.candle_lit_at DESC
      LIMIT 50
    `);

    return res.json(rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      deceasedName: r.deceased_name,
      hebrewDay: r.hebrew_day,
      hebrewMonth: r.hebrew_month,
      displayDate: r.display_date,
      passingYear: r.passing_year,
      message: r.message,
      candleLit: r.candle_lit,
      candleLitAt: r.candle_lit_at,
      donorDisplayName: r.donor_display_name,
      createdAt: r.created_at,
      learners: r.learners,
    })));
  } finally {
    client.release();
  }
});

/* ── POST /community/yahrzeit — create + immediately light a candle (auth) ── */
router.post("/community/yahrzeit", requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const { id, deceasedName, hebrewDay, hebrewMonth, displayDate, passingYear, message, donorDisplayName, donationAmount } = req.body;

  if (!id || !deceasedName || hebrewDay == null || hebrewMonth == null) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const client = await pool.connect();
  try {
    await client.query(
      `INSERT INTO community_yahrzeit
         (id, user_id, deceased_name, hebrew_day, hebrew_month, display_date, passing_year, message, candle_lit, candle_lit_by, candle_lit_at, donor_display_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,true,$2,NOW(),$9)
       ON CONFLICT (id) DO NOTHING`,
      [id, userId, deceasedName, hebrewDay, hebrewMonth, displayDate ?? "", passingYear ?? null, message ?? "", donorDisplayName ?? ""]
    );
    return res.json({ ok: true });
  } finally {
    client.release();
  }
});

/* ── POST /community/yahrzeit/:id/light — light a candle (auth) ── */
router.post("/community/yahrzeit/:id/light", requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const { id } = req.params;
  const { donorDisplayName, donationAmount } = req.body;

  const client = await pool.connect();
  try {
    await client.query(
      `UPDATE community_yahrzeit
       SET candle_lit = true, candle_lit_by = $2, candle_lit_at = NOW(), donor_display_name = $3
       WHERE id = $1`,
      [id, userId, donorDisplayName ?? ""]
    );
    return res.json({ ok: true });
  } finally {
    client.release();
  }
});

/* ── DELETE /community/yahrzeit/:id — delete own entry (auth) ── */
router.delete("/community/yahrzeit/:id", requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const { id } = req.params;

  const client = await pool.connect();
  try {
    await client.query(
      "DELETE FROM community_yahrzeit WHERE id = $1 AND user_id = $2",
      [id, userId]
    );
    return res.json({ ok: true });
  } finally {
    client.release();
  }
});

/* ── POST /community/yahrzeit/:id/dedicate — dedicate current learning to a candle (auth) ── */
router.post("/community/yahrzeit/:id/dedicate", requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const { id } = req.params;
  const { learnerName, studySubject } = req.body;

  if (!learnerName) return res.status(400).json({ error: "learnerName required" });

  const dedicationId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const activeUntil = new Date(Date.now() + 5 * 60 * 1000).toISOString();

  const client = await pool.connect();
  try {
    // Remove old dedications by same user for same entry
    await client.query(
      "DELETE FROM community_yahrzeit_learners WHERE entry_id = $1 AND user_id = $2",
      [id, userId]
    );
    await client.query(
      `INSERT INTO community_yahrzeit_learners (id, entry_id, user_id, learner_name, study_subject, active_until)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [dedicationId, id, userId, learnerName, studySubject ?? "Torah", activeUntil]
    );
    return res.json({ ok: true });
  } finally {
    client.release();
  }
});

export default router;
