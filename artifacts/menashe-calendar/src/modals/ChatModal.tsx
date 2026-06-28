import { useState, useRef, useEffect } from "react";
import { useLanguage } from "../context/LanguageContext";

interface Message {
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

interface Props {
  onClose: () => void;
}

const API_BASE = "/api";

async function getAuthToken(): Promise<string | null> {
  return (await (window as any).Clerk?.session?.getToken()) ?? null;
}

type AiProvider = "gemini" | "grok" | null;

const PROVIDER_LABEL: Record<NonNullable<AiProvider>, string> = {
  gemini: "Gemini",
  grok:   "Grok",
};

export default function ChatModal({ onClose }: Props) {
  const { t } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState<AiProvider>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    const userMsg: Message = { role: "user", content: text.trim() };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setProvider(null);

    const assistantMsg: Message = { role: "assistant", content: "", streaming: true };
    setMessages([...nextMessages, assistantMsg]);

    const token = await getAuthToken();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        signal: controller.signal,
        body: JSON.stringify({
          messages: nextMessages.map(({ role, content }) => ({ role, content })),
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") break;
          try {
            const parsed = JSON.parse(payload);
            if (parsed.provider) {
              setProvider(parsed.provider as AiProvider);
            } else if (parsed.error) {
              accumulated = parsed.error;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: accumulated, streaming: true };
                return updated;
              });
            } else if (parsed.text) {
              accumulated += parsed.text;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: "assistant", content: accumulated, streaming: true };
                return updated;
              });
            }
          } catch {}
        }
      }

      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: accumulated || t.chatError,
          streaming: false,
        };
        return updated;
      });
    } catch (err: any) {
      if (err.name === "AbortError") return;
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: "assistant", content: t.chatError, streaming: false };
        return updated;
      });
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  function handleStop() {
    abortRef.current?.abort();
    setLoading(false);
    setMessages((prev) => {
      const updated = [...prev];
      const last = updated[updated.length - 1];
      if (last?.streaming) updated[updated.length - 1] = { ...last, streaming: false };
      return updated;
    });
  }

  const isEmpty = messages.length === 0;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        zIndex: 1000,
        padding: "0",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 560,
          height: "90dvh",
          background: "linear-gradient(180deg,#0F1829 0%,#0a1020 100%)",
          borderRadius: "20px 20px 0 0",
          border: "1px solid rgba(212,175,55,0.25)",
          borderBottom: "none",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "16px 20px 14px",
            borderBottom: "1px solid rgba(212,175,55,0.15)",
            background: "rgba(212,175,55,0.04)",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <img
            src="/rav-menashe-ai.png"
            alt="Rav Menashe AI"
            style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0, border: "1px solid rgba(212,175,55,0.45)" }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ color: "#D4AF37", fontWeight: 700, fontSize: 16 }}>
              {t.chatTitle}
            </div>
            <div style={{ color: "#8A7A5A", fontSize: 11, marginTop: 1 }}>
              {t.chatSubtitle}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 8,
              color: "#A89070",
              width: 32, height: 32,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", fontSize: 16, flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* Messages */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {isEmpty && (
            <div style={{ textAlign: "center", marginTop: 12 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🕍</div>
              <div style={{ color: "#D4AF37", fontWeight: 700, fontSize: 17, marginBottom: 6 }}>
                {t.chatWelcomeTitle}
              </div>
              <div style={{ color: "#8A7A5A", fontSize: 13, lineHeight: 1.6, marginBottom: 20, maxWidth: 340, margin: "0 auto 20px" }}>
                {t.chatWelcomeDesc}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                {t.chatSuggestedQuestions.map((q) => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    style={{
                      background: "rgba(212,175,55,0.08)",
                      border: "1px solid rgba(212,175,55,0.2)",
                      borderRadius: 20,
                      padding: "7px 14px",
                      color: "#C8A84B",
                      fontSize: 12,
                      cursor: "pointer",
                      transition: "background 0.15s",
                    }}
                    onMouseOver={(e) => ((e.target as HTMLElement).style.background = "rgba(212,175,55,0.16)")}
                    onMouseOut={(e)  => ((e.target as HTMLElement).style.background = "rgba(212,175,55,0.08)")}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                alignItems: "flex-end",
                gap: 8,
              }}
            >
              {msg.role === "assistant" && (
                <div
                  style={{
                    width: 30, height: 30,
                    borderRadius: "50%",
                    background: "linear-gradient(135deg,#D4AF37,#A0821A)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, flexShrink: 0, marginBottom: 2,
                  }}
                >
                  ✡
                </div>
              )}
              <div
                style={{
                  maxWidth: "78%",
                  padding: "10px 14px",
                  borderRadius: msg.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  background: msg.role === "user"
                    ? "linear-gradient(135deg,#D4AF37,#A0821A)"
                    : "rgba(255,255,255,0.06)",
                  border: msg.role === "user" ? "none" : "1px solid rgba(212,175,55,0.12)",
                  color: msg.role === "user" ? "#0F1829" : "#E8DCC8",
                  fontSize: 14,
                  lineHeight: 1.65,
                  fontWeight: msg.role === "user" ? 600 : 400,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {msg.content}
                {msg.streaming && (
                  <span
                    style={{
                      display: "inline-block",
                      width: 8, height: 14,
                      background: "#D4AF37",
                      marginLeft: 3,
                      borderRadius: 2,
                      animation: "blink 1s step-start infinite",
                    }}
                  />
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div
          style={{
            padding: "12px 16px 16px",
            borderTop: "1px solid rgba(212,175,55,0.12)",
            background: "rgba(0,0,0,0.2)",
            flexShrink: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "flex-end",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(212,175,55,0.2)",
              borderRadius: 16,
              padding: "10px 12px",
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t.chatPlaceholder}
              rows={1}
              disabled={loading}
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#F5F0E8",
                fontSize: 14,
                lineHeight: 1.5,
                resize: "none",
                maxHeight: 100,
                overflowY: "auto",
                fontFamily: "inherit",
              }}
              onInput={(e) => {
                const el = e.target as HTMLTextAreaElement;
                el.style.height = "auto";
                el.style.height = Math.min(el.scrollHeight, 100) + "px";
              }}
            />
            {loading ? (
              <button
                onClick={handleStop}
                style={{
                  width: 36, height: 36,
                  borderRadius: "50%",
                  background: "rgba(220,60,60,0.2)",
                  border: "1px solid rgba(220,60,60,0.4)",
                  color: "#E05555",
                  cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, flexShrink: 0,
                }}
              >
                ◼
              </button>
            ) : (
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim()}
                style={{
                  width: 36, height: 36,
                  borderRadius: "50%",
                  background: input.trim()
                    ? "linear-gradient(135deg,#D4AF37,#A0821A)"
                    : "rgba(212,175,55,0.1)",
                  border: "none",
                  color: input.trim() ? "#0F1829" : "#5A4A2A",
                  cursor: input.trim() ? "pointer" : "default",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16, flexShrink: 0,
                  transition: "background 0.15s",
                }}
              >
                ↑
              </button>
            )}
          </div>
          {/* Footer: disclaimer + provider badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              marginTop: 8,
            }}
          >
            <div style={{ color: "#4A3A2A", fontSize: 10 }}>{t.chatDisclaimer}</div>
            {provider && !loading && (
              <div
                style={{
                  fontSize: 9,
                  color: "#5A6A8A",
                  background: "rgba(90,106,138,0.12)",
                  border: "1px solid rgba(90,106,138,0.22)",
                  borderRadius: 8,
                  padding: "2px 7px",
                  whiteSpace: "nowrap",
                }}
              >
                via {PROVIDER_LABEL[provider]}
              </div>
            )}
          </div>
        </div>

        <style>{`
          @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0; }
          }
        `}</style>
      </div>
    </div>
  );
}
