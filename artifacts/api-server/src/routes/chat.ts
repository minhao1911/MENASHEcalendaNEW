import { Router } from "express";
import { GoogleGenAI } from "@google/genai";
import { requireAuth } from "../lib/requireAuth";

const router = Router();

function getGenAI(): GoogleGenAI {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_API_KEY is not configured");
  return new GoogleGenAI({ apiKey });
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

  let genai: GoogleGenAI;
  try {
    genai = getGenAI();
  } catch {
    return res.status(503).json({ error: "AI service not configured" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  try {
    const history = messages.slice(-10);
    const lastMessage = history[history.length - 1];
    const priorMessages = history.slice(0, -1);

    const contents = priorMessages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const chat = genai.chats.create({
      model: "gemini-2.5-flash",
      config: { systemInstruction: SYSTEM_PROMPT },
      history: contents,
    });

    const stream = await chat.sendMessageStream({ message: lastMessage.content });

    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
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
