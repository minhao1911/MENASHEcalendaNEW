import { Router } from "express";
import OpenAI from "openai";
import { requireAuth } from "../lib/requireAuth";

const router = Router();

function getOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
  return new OpenAI({ apiKey });
}

export interface ParshaInsight {
  parshaName: string;
  hebrewName: string;
  bookName: string;
  chaptersRange: string;
  keyTheme: string;
  didYouKnow: string;
  bneiManasheConnection: string;
  mainSources: string;
  classicalCommentary: string;
  practicalLesson: string;
  discussionQuestion: string;
  hebrewQuote: { hebrew: string; translation: string; reference: string };
  sourceReferences: string;
}

const cache = new Map<string, ParshaInsight>();

router.post("/parsha-insights", requireAuth, async (req, res) => {
  const { parshaName, hebrewName, bookName, chaptersRange } = req.body as {
    parshaName: string;
    hebrewName?: string;
    bookName?: string;
    chaptersRange?: string;
  };

  if (!parshaName || typeof parshaName !== "string") {
    return res.status(400).json({ error: "parshaName is required" });
  }

  const cacheKey = parshaName.toLowerCase().trim();
  if (cache.has(cacheKey)) {
    return res.json(cache.get(cacheKey));
  }

  let openai: OpenAI;
  try {
    openai = getOpenAI();
  } catch {
    return res.status(503).json({ error: "AI service not configured" });
  }

  const prompt = `You are a knowledgeable Jewish scholar providing Torah insights specifically relevant to the Bnei Menashe community — the Jewish community from Northeast India (Manipur and Mizoram) who are descendants of the lost tribe of Menashe and have made aliyah to Israel.

Provide insights for Parashat ${parshaName}${hebrewName ? ` (${hebrewName})` : ""}${bookName && chaptersRange ? `, ${bookName} ${chaptersRange}` : ""}.

Respond with a JSON object with exactly these fields:
- keyTheme: One central spiritual or ethical lesson from this parsha (2-3 sentences)
- didYouKnow: An interesting or lesser-known fact about this parsha (1-2 sentences)
- bneiManasheConnection: How this parsha's themes resonate with the Bnei Menashe journey (2-3 sentences)
- mainSources: The primary Torah sections and key references (1-2 sentences)
- classicalCommentary: What Rashi, Ramban, or other classical commentators say about this parsha's central theme (2-3 sentences)
- practicalLesson: A concrete, actionable lesson from this parsha for modern Jewish life (2-3 sentences)
- discussionQuestion: A thought-provoking question for Shabbat table discussion (1-2 sentences)
- hebrewQuote: An object with three fields — "hebrew" (a key verse in Hebrew), "translation" (English translation), "reference" (e.g. "Genesis 12:1")
- sourceReferences: A comma-separated list of key classical sources

Return only valid JSON, no markdown fences.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    const jsonMatch =
      content.match(/```json\s*([\s\S]*?)```/) ??
      content.match(/```\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : content;

    const parsed = JSON.parse(jsonStr) as Omit<ParshaInsight, "parshaName" | "hebrewName" | "bookName" | "chaptersRange">;

    const result: ParshaInsight = {
      parshaName,
      hebrewName: hebrewName ?? "",
      bookName: bookName ?? "",
      chaptersRange: chaptersRange ?? "",
      keyTheme: parsed.keyTheme ?? "",
      didYouKnow: parsed.didYouKnow ?? "",
      bneiManasheConnection: parsed.bneiManasheConnection ?? "",
      mainSources: parsed.mainSources ?? "",
      classicalCommentary: parsed.classicalCommentary ?? "",
      practicalLesson: parsed.practicalLesson ?? "",
      discussionQuestion: parsed.discussionQuestion ?? "",
      hebrewQuote: parsed.hebrewQuote ?? { hebrew: "", translation: "", reference: "" },
      sourceReferences: parsed.sourceReferences ?? "",
    };

    cache.set(cacheKey, result);
    return res.json(result);
  } catch (err: any) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to generate Torah insights. Please try again." });
  }
});

export default router;
