import { Router } from "express";
import { pool } from "@workspace/db";
import { requireAuth } from "../lib/requireAuth";
import { requireAdmin } from "../lib/requireAdmin";
import { logger } from "../lib/logger";

const router = Router();

function rowToBranch(row: any) {
  return {
    id: row.id,
    name: row.name,
    cityId: row.city_id,
    cityName: row.city_name,
    adminName: row.admin_name ?? undefined,
    established: row.established ?? undefined,
    families: Array.isArray(row.families) ? row.families : [],
  };
}

function rowToSubmission(row: any) {
  return {
    id: row.id,
    branch: rowToBranch(row.branch_data),
    submittedAt: row.submitted_at,
    status: row.status,
    reviewNote: row.review_note ?? undefined,
    reviewedAt: row.reviewed_at ?? undefined,
  };
}

function rowToMemberSub(row: any) {
  return {
    id: row.id,
    branchId: row.branch_id,
    branchName: row.branch_name,
    submitterName: row.submitter_name,
    submitterNote: row.submitter_note ?? undefined,
    headCensus: row.head_census ?? {},
    members: Array.isArray(row.members) ? row.members : [],
    status: row.status,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at ?? undefined,
    reviewNote: row.review_note ?? undefined,
  };
}

/* ── Branch (Local Admin) ─────────────────────────────────────────────────── */

router.get("/census/branch", requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  try {
    const { rows } = await pool.query(
      "SELECT * FROM census_branches WHERE owner_user_id = $1",
      [userId]
    );
    if (rows.length === 0) { res.json(null); return; }
    res.json(rowToBranch(rows[0]));
  } catch (err) {
    logger.error({ err }, "census/branch GET failed");
    res.status(500).json({ error: "Failed to load branch" });
  }
});

router.put("/census/branch", requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const { id, name, cityId, cityName, adminName, established, families } = req.body;
  if (!name) { res.status(400).json({ error: "Missing name" }); return; }
  const branchId = id || `br_${Date.now()}`;
  try {
    await pool.query(
      `INSERT INTO census_branches (id, owner_user_id, name, city_id, city_name, admin_name, established, families, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, NOW())
       ON CONFLICT (owner_user_id) DO UPDATE
         SET id = EXCLUDED.id,
             name = EXCLUDED.name,
             city_id = EXCLUDED.city_id,
             city_name = EXCLUDED.city_name,
             admin_name = EXCLUDED.admin_name,
             established = EXCLUDED.established,
             families = EXCLUDED.families,
             updated_at = NOW()`,
      [branchId, userId, name, cityId || "", cityName || "", adminName || null, established || null, JSON.stringify(families ?? [])]
    );
    res.json({ ok: true, id: branchId });
  } catch (err) {
    logger.error({ err }, "census/branch PUT failed");
    res.status(500).json({ error: "Failed to save branch" });
  }
});

/* ── Submissions (Global Admin review) ───────────────────────────────────── */

router.get("/census/submissions", requireAdmin, async (_req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM census_submissions ORDER BY submitted_at DESC"
    );
    res.json(rows.map(rowToSubmission));
  } catch (err) {
    logger.error({ err }, "census/submissions GET failed");
    res.status(500).json({ error: "Failed to load submissions" });
  }
});

router.post("/census/submissions", requireAuth, async (req, res) => {
  const userId = (req as any).userId;
  const { branch } = req.body;
  if (!branch) { res.status(400).json({ error: "Missing branch" }); return; }
  try {
    const existing = await pool.query(
      "SELECT id FROM census_submissions WHERE owner_user_id = $1",
      [userId]
    );
    if (existing.rows.length > 0) {
      const id = existing.rows[0].id;
      await pool.query(
        `UPDATE census_submissions
           SET branch_data = $2::jsonb, status = 'pending', submitted_at = NOW(), reviewed_at = NULL, review_note = NULL
           WHERE id = $1`,
        [id, JSON.stringify(branch)]
      );
      const { rows } = await pool.query("SELECT * FROM census_submissions WHERE id = $1", [id]);
      res.json(rowToSubmission(rows[0]));
    } else {
      const id = `csub_${Date.now()}`;
      await pool.query(
        `INSERT INTO census_submissions (id, owner_user_id, branch_data, status)
         VALUES ($1, $2, $3::jsonb, 'pending')`,
        [id, userId, JSON.stringify(branch)]
      );
      const { rows } = await pool.query("SELECT * FROM census_submissions WHERE id = $1", [id]);
      res.json(rowToSubmission(rows[0]));
    }
  } catch (err) {
    logger.error({ err }, "census/submissions POST failed");
    res.status(500).json({ error: "Failed to create submission" });
  }
});

router.patch("/census/submissions/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status, reviewNote } = req.body as { status: "approved" | "rejected"; reviewNote?: string };
  if (!["approved", "rejected"].includes(status)) {
    res.status(400).json({ error: "Invalid status" }); return;
  }
  try {
    await pool.query(
      `UPDATE census_submissions
         SET status = $2, review_note = $3, reviewed_at = NOW()
         WHERE id = $1`,
      [id, status, reviewNote || null]
    );
    const { rows } = await pool.query("SELECT * FROM census_submissions WHERE id = $1", [id]);
    if (rows.length === 0) { res.status(404).json({ error: "Not found" }); return; }
    res.json(rowToSubmission(rows[0]));
  } catch (err) {
    logger.error({ err }, "census/submissions PATCH failed");
    res.status(500).json({ error: "Failed to update submission" });
  }
});

/* ── Member submissions ───────────────────────────────────────────────────── */

router.get("/census/member-submissions", requireAdmin, async (_req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM census_member_submissions ORDER BY submitted_at DESC"
    );
    res.json(rows.map(rowToMemberSub));
  } catch (err) {
    logger.error({ err }, "census/member-submissions GET failed");
    res.status(500).json({ error: "Failed to load member submissions" });
  }
});

/* POST /census/member-submissions — intentionally public (no auth required):
   Community members submit their household census without needing to sign in. */
router.post("/census/member-submissions", async (req, res) => {
  const { branchId, branchName, submitterName, submitterNote, headCensus, members } = req.body;
  if (!submitterName) { res.status(400).json({ error: "Missing submitterName" }); return; }
  const id = `msub_${Date.now()}`;
  try {
    await pool.query(
      `INSERT INTO census_member_submissions
         (id, branch_id, branch_name, submitter_name, submitter_note, head_census, members, status)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, 'pending')`,
      [id, branchId || "", branchName || "", submitterName, submitterNote || null,
       JSON.stringify(headCensus ?? {}), JSON.stringify(members ?? [])]
    );
    const { rows } = await pool.query("SELECT * FROM census_member_submissions WHERE id = $1", [id]);
    res.json(rowToMemberSub(rows[0]));
  } catch (err) {
    logger.error({ err }, "census/member-submissions POST failed");
    res.status(500).json({ error: "Failed to submit" });
  }
});

router.patch("/census/member-submissions/:id", requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { status, reviewNote } = req.body as { status: "approved" | "rejected" | "pending"; reviewNote?: string };
  if (!["approved", "rejected", "pending"].includes(status)) {
    res.status(400).json({ error: "Invalid status" }); return;
  }
  try {
    await pool.query(
      `UPDATE census_member_submissions
         SET status = $2, review_note = $3, reviewed_at = CASE WHEN $2 = 'pending' THEN NULL ELSE NOW() END
         WHERE id = $1`,
      [id, status, reviewNote || null]
    );
    const { rows } = await pool.query("SELECT * FROM census_member_submissions WHERE id = $1", [id]);
    if (rows.length === 0) { res.status(404).json({ error: "Not found" }); return; }
    res.json(rowToMemberSub(rows[0]));
  } catch (err) {
    logger.error({ err }, "census/member-submissions PATCH failed");
    res.status(500).json({ error: "Failed to update" });
  }
});

export default router;
