import { Router } from "express";
import OpenAI from "openai";
import { requireAuth } from "../lib/requireAuth";

const router = Router();

function getOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
  return new OpenAI({ apiKey });
}

interface HolidayInsight {
  holidayName: string;
  hebrewName: string;
  overview: string;
  observances: string;
  mussarLesson: string;
  spiritualTheme: string;
  bneiManasheConnection: string;
}

const cache = new Map<string, HolidayInsight>();

router.post("/holiday-insights", requireAuth, async (req, res) => {
  const { holidayName, hebrewName, timing } = req.body as {
    holidayName: string;
    hebrewName?: string;
    timing?: string;
  };

  if (!holidayName || typeof holidayName !== "string") {
    return res.status(400).json({ error: "holidayName is required" });
  }

  const cacheKey = holidayName.toLowerCase().trim();
  if (cache.has(cacheKey)) {
    return res.json(cache.get(cacheKey));
  }

  let openai: OpenAI;
  try {
    openai = getOpenAI();
  } catch {
    return res.status(503).json({ error: "AI service not configured" });
  }

  const prompt = `You are a knowledgeable Jewish Mussar teacher and scholar providing holiday insights tailored for the Bnei Menashe community — the Jewish community from Northeast India (Manipur and Mizoram), descendants of the lost tribe of Menashe, who have made aliyah to Israel.

Provide deep Mussar-focused insights for: ${holidayName}${hebrewName ? ` (${hebrewName})` : ""}${timing ? `, observed on ${timing}` : ""}.

Respond with a JSON object with exactly these fields:
- overview: A 3-4 sentence description of the holiday's origins, significance, and place in the Jewish calendar
- observances: The main mitzvot, customs, and rituals observed (2-3 sentences)
- mussarLesson: The central Mussar (character refinement) teaching of this holiday — which middah (character trait) it develops, what personal work it demands, and how Mussar masters (Ramchal, Rav Salanter, Vilna Gaon) understood its ethical message. (3-4 sentences, richly detailed)
- spiritualTheme: The central spiritual message or lesson this holiday conveys (2-3 sentences)
- bneiManasheConnection: How this holiday's themes uniquely resonate with the Bnei Menashe experience — their journey of return, tribal identity, aliyah, or life in Israel (2-3 sentences)

Return only valid JSON, no markdown fences.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.choices[0]?.message?.content ?? "{}";
    const jsonMatch =
      content.match(/```json\s*([\s\S]*?)```/) ??
      content.match(/```\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1] : content;

    const parsed = JSON.parse(jsonStr) as Omit<HolidayInsight, "holidayName" | "hebrewName">;

    const result: HolidayInsight = {
      holidayName,
      hebrewName: hebrewName ?? "",
      overview: parsed.overview ?? "",
      observances: parsed.observances ?? "",
      mussarLesson: parsed.mussarLesson ?? "",
      spiritualTheme: parsed.spiritualTheme ?? "",
      bneiManasheConnection: parsed.bneiManasheConnection ?? "",
    };

    cache.set(cacheKey, result);
    return res.json(result);
  } catch (err: any) {
    req.log.error(err);
    return res.status(500).json({ error: "Failed to generate holiday insights. Please try again." });
  }
});

export default router;
