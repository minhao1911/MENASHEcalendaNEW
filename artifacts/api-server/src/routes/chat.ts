import { Router } from "express";
import OpenAI from "openai";
import { requireAuth } from "../lib/requireAuth";

const router = Router();

function getOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");
  return new OpenAI({ apiKey });
}

const SYSTEM_PROMPT = `You are Rav Menashe, a warm, knowledgeable AI spiritual companion for the Bnei Menashe Jewish community — descendants of the lost tribe of Menashe from Northeast India (Manipur and Mizoram), many of whom have made aliyah to Israel.

You specialize in:
- Jewish law (Halacha), customs, and daily practice
- Hebrew calendar: Jewish dates, holidays, fasts, Rosh Chodesh
- Zmanim (prayer times): Shacharit, Mincha, Maariv, Shema, candle lighting, Havdalah
- Parasha of the week and Torah study
- Daf Yomi and Talmud study
- Mussar (Jewish character refinement) and spiritual growth
- Bnei Menashe history, traditions, and their unique journey of return
- Jewish lifecycle events: bar/bat mitzvah, marriage, mourning, Yahrzeit
- Tahara (family purity laws) — answered with appropriate sensitivity
- Siddur, prayer, and synagogue practice
- Hebrew language basics

Tone: Warm, encouraging, scholarly yet accessible. Use "dear friend" occasionally. When quoting Torah or Talmud, provide the reference. Keep answers concise (2-4 paragraphs max) unless the user asks for detail. Always be respectful of the Bnei Menashe community's unique background.

If asked about something outside your expertise, gently redirect to Jewish topics or suggest consulting a local rabbi for practical halachic decisions.`;

router.post("/chat", requireAuth, async (req, res) => {
  const { messages } = req.body as {
    messages: Array<{ role: "user" | "assistant"; content: string }>;
  };

  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "messages array is required" });
  }

  let openai: OpenAI;
  try {
    openai = getOpenAI();
  } catch {
    return res.status(503).json({ error: "AI service not configured" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 800,
      stream: true,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages.slice(-10),
      ],
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        res.write(`data: ${JSON.stringify({ text: delta })}\n\n`);
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err: any) {
    req.log.error(err);
    res.write(`data: ${JSON.stringify({ error: "Failed to generate response. Please try again." })}\n\n`);
    res.end();
  }
});

export default router;
