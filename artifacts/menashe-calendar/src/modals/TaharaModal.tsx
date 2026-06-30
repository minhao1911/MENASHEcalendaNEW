import { useState } from "react";
import { HDate } from "@hebcal/core";
import { useLanguage } from "../context/LanguageContext";

interface Props { onClose: () => void; }

export default function TaharaModal({ onClose }: Props) {
  const { t } = useLanguage();
  const [lastDate, setLastDate] = useState("");
  const [result, setResult] = useState<{ mikveh: string; hefsek: string; count: number } | null>(null);

  function calculate() {
    if (!lastDate) return;
    const d = new Date(lastDate);
    const hefsekDate = new Date(d.getTime() + 5 * 86400000);
    const mikvehDate = new Date(hefsekDate.getTime() + 7 * 86400000);
    const hefsekHDate = new HDate(hefsekDate);
    const mikvehHDate = new HDate(mikvehDate);

    setResult({
      hefsek: `${hefsekDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} (${hefsekHDate.render("en")})`,
      mikveh: `${mikvehDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })} (${mikvehHDate.render("en")})`,
      count: 12,
    });
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)" }}>{t.taharaTitle}</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{t.taharaSub}</div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="card" style={{ padding: 16, marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>{t.taharaPeriodLabel}</div>
          <input
            type="date"
            value={lastDate}
            onChange={e => setLastDate(e.target.value)}
            style={{
              width: "100%", padding: "12px 14px", borderRadius: 10,
              background: "var(--elevated)", border: "1px solid var(--border)",
              color: "var(--text-primary)", fontSize: 15, outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        <button
          className="btn-gold"
          style={{ width: "100%", padding: "13px", marginBottom: 14, fontSize: 15, fontWeight: 700 }}
          onClick={calculate}
          disabled={!lastDate}
        >
          {t.taharaCalculate}
        </button>

        {result && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div className="card" style={{ padding: 14, border: "1px solid rgba(59,130,246,0.3)", background: "rgba(59,130,246,0.05)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#60a5fa", letterSpacing: "0.08em", marginBottom: 4 }}>{t.taharaHefsek}</div>
              <div style={{ fontSize: 14, color: "var(--text-primary)", fontWeight: 600 }}>{result.hefsek}</div>
            </div>
            <div className="card" style={{ padding: 14, border: "1px solid rgba(212,168,67,0.3)", background: "rgba(212,168,67,0.05)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#d4a843", letterSpacing: "0.08em", marginBottom: 4 }}>{t.taharaMikveh}</div>
              <div style={{ fontSize: 14, color: "var(--text-primary)", fontWeight: 600 }}>{result.mikveh}</div>
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", lineHeight: 1.5 }}>
              {t.taharaPosekNote}
            </div>
          </div>
        )}

        {/* My Mikveh Calendar button */}
        <button
          style={{
            width: "100%",
            marginTop: 16,
            padding: "15px 20px",
            borderRadius: 16,
            border: "none",
            cursor: "pointer",
            background: "linear-gradient(135deg, #1a1040 0%, #2d1b69 40%, #1e3a5f 100%)",
            boxShadow: "0 4px 20px rgba(100,60,200,0.35), inset 0 1px 0 rgba(255,255,255,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            position: "relative",
            overflow: "hidden",
          }}
          onClick={() => {}}
        >
          {/* Shimmer overlay */}
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.05) 50%, transparent 60%)",
            pointerEvents: "none",
          }} />

          {/* Left: icon + labels */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12,
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 22, flexShrink: 0,
            }}>
              🌙
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", letterSpacing: "0.01em" }}>
                {t.taharaMikvehCalendar}
              </div>
              <div style={{ fontSize: 11, color: "rgba(180,160,255,0.8)", marginTop: 2 }}>
                {t.taharaMikvehCalendarSub}
              </div>
            </div>
          </div>

          {/* Right: arrow badge */}
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#c4b5fd", fontSize: 14, fontWeight: 700, flexShrink: 0,
          }}>
            →
          </div>
        </button>

        <button onClick={onClose} className="btn-close-full" style={{ marginTop: 12 }}>{t.taharaClose}</button>
      </div>
    </div>
  );
}
