import { Router } from "express";
import { db } from "@workspace/db";
import { booksTable, insertBookSchema, updateBookSchema } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { z } from "zod/v4";

const router = Router();

const ADMIN_PIN = process.env.ADMIN_PIN ?? "1948";

function checkAdmin(req: any, res: any): boolean {
  const pin = req.headers["x-admin-pin"] ?? req.body?.adminPin;
  if (pin !== ADMIN_PIN) {
    res.status(401).json({ error: "Unauthorized" });
    return false;
  }
  return true;
}

router.get("/books", async (req, res) => {
  try {
    const { category, admin } = req.query;
    const isAdmin = req.headers["x-admin-pin"] === ADMIN_PIN;

    let rows = await db
      .select()
      .from(booksTable)
      .orderBy(asc(booksTable.sortOrder), asc(booksTable.createdAt));

    if (!isAdmin) {
      rows = rows.filter(b => b.published);
    }
    if (category && typeof category === "string") {
      rows = rows.filter(b => b.category === category);
    }

    res.json(rows);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch books" });
  }
});

router.get("/books/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

    const [book] = await db.select().from(booksTable).where(eq(booksTable.id, id));
    if (!book) return res.status(404).json({ error: "Not found" });

    return res.json(book);
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to fetch book" });
  }
});

router.post("/books", async (req, res) => {
  if (!checkAdmin(req, res)) return;
  try {
    const parsed = insertBookSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid data", details: parsed.error.issues });
    }
    const [book] = await db.insert(booksTable).values(parsed.data).returning();
    return res.status(201).json(book);
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to create book" });
  }
});

router.put("/books/:id", async (req, res) => {
  if (!checkAdmin(req, res)) return;
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

    const parsed = updateBookSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid data", details: parsed.error.issues });
    }
    const [book] = await db
      .update(booksTable)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(booksTable.id, id))
      .returning();

    if (!book) return res.status(404).json({ error: "Not found" });
    return res.json(book);
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to update book" });
  }
});

router.delete("/books/:id", async (req, res) => {
  if (!checkAdmin(req, res)) return;
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: "Invalid id" });

    const [book] = await db.delete(booksTable).where(eq(booksTable.id, id)).returning();
    if (!book) return res.status(404).json({ error: "Not found" });
    return res.json({ success: true });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to delete book" });
  }
});

router.post("/books/seed", async (req, res) => {
  if (!checkAdmin(req, res)) return;
  try {
    const count = await db.$count(booksTable);
    if (count > 0) return res.json({ skipped: true, message: "Already seeded" });

    const seed = [
      { title: "Siddur Ashkenaz", language: "Hebrew / English", category: "Siddur", description: "The complete Ashkenazic prayer book for weekdays, Shabbat, and holidays with Hebrew text and English translation.", coverEmoji: "🕍", coverColor: "#1a3050", fileUrl: "https://www.sefaria.org/sheets/print", isPremium: false, published: true, sortOrder: 1 },
      { title: "Tehillim — Psalms", language: "Hebrew / English", category: "Tehillim", description: "The complete Book of Psalms (Tehillim) with Hebrew text, transliteration, and English translation. Essential daily reading.", coverEmoji: "📜", coverColor: "#2a1a40", fileUrl: null, isPremium: false, published: true, sortOrder: 2 },
      { title: "Parashat HaShavua", language: "Hebrew / English", category: "Torah Portions", description: "Complete weekly Torah portions with commentary and Haftarah readings for the entire year.", coverEmoji: "📖", coverColor: "#1a2a20", fileUrl: null, isPremium: false, published: true, sortOrder: 3 },
      { title: "Siddur Sefard", language: "Hebrew", category: "Siddur", description: "The Sefardic prayer rite, used by many Bnei Menashe communities and Mizrachi congregations.", coverEmoji: "🌟", coverColor: "#30200a", fileUrl: null, isPremium: true, published: true, sortOrder: 4 },
      { title: "Mishna Yomit", language: "Hebrew / English", category: "Daily Study", description: "One Mishna per day — complete Shisha Sidrei Mishna cycle with commentary.", coverEmoji: "📚", coverColor: "#1a1a30", fileUrl: null, isPremium: true, published: true, sortOrder: 5 },
      { title: "Hebrew Alef-Bet Primer", language: "English", category: "Hebrew Learning", description: "Beginner guide to reading and writing Hebrew — letters, vowels, and basic words for Bnei Menashe newcomers.", coverEmoji: "🔤", coverColor: "#0a2030", fileUrl: null, isPremium: false, published: true, sortOrder: 6 },
      { title: "Bnei Menashe Prayer Guide", language: "Kuki / Hebrew", category: "Kuki Christian Books", description: "Traditional prayers and liturgy adapted for Bnei Menashe communities transitioning to Jewish observance.", coverEmoji: "🙏", coverColor: "#2a1030", fileUrl: null, isPremium: false, published: true, sortOrder: 7 },
      { title: "Shabbat Table Songs", language: "Hebrew / Transliteration", category: "Prayer Books", description: "Complete Zemirot for Friday night and Shabbat day — songs, melodies, and traditions of Bnei Menashe.", coverEmoji: "🎵", coverColor: "#1a2a10", fileUrl: null, isPremium: false, published: true, sortOrder: 8 },
    ];

    const inserted = await db.insert(booksTable).values(seed).returning();
    return res.json({ seeded: inserted.length });
  } catch (err) {
    req.log.error(err);
    return res.status(500).json({ error: "Seed failed" });
  }
});

export default router;
