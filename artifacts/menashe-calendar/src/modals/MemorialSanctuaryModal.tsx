import { useState, useCallback, useEffect, lazy, Suspense } from "react";
import { HDate } from "@hebcal/core";
import {
  fetchCommunityYahrzeit,
  createCommunityYahrzeit,
  dedicateLearning,
  type CommunityYahrzeitEntry,
} from "../lib/userApi";

const MemorialValley3D = lazy(() => import("../components/MemorialValley3D"));

/* ═══════════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════════ */
interface Props {
  onClose: () => void;
  userName?: string | null;
  initialEntries?: CommunityYahrzeitEntry[];
}

interface PlacedCandle {
  pos: [number, number, number];
  name: string;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   ZONE GUIDE META
═══════════════════════════════════════════════════════════════════════════════ */
const ZONE_PILLS = [
  { name: "Eternal Court",   color: "#c4b080" },
  { name: "Tree of Life",    color: "#4a7838" },
  { name: "Valley of Peace", color: "#3a7060" },
  { name: "Memorial Garden", color: "#5a6040" },
  { name: "Jerusalem Outlook", color: "#a08060" },
];

/* ═══════════════════════════════════════════════════════════════════════════════
   LOADING SCREEN (shown while 3D loads)
═══════════════════════════════════════════════════════════════════════════════ */
function ValleyLoading() {
  return (
    <div style={{
      position: "absolute", inset: 0,
      background: "linear-gradient(175deg, #c06828 0%, #e89840 18%, #f0c060 35%, #e8d898 52%, #c0d8a0 68%, #7aaa80 100%)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18,
    }}>
      <div style={{ fontSize: 52, filter: "drop-shadow(0 0 18px rgba(255,180,40,0.7))" }}>🕯</div>
      <div style={{
        fontSize: 13, fontWeight: 700, letterSpacing: "0.18em",
        color: "rgba(40,20,0,0.75)", textTransform: "uppercase",
      }}>
        Preparing the Sanctuary…
      </div>
      <div style={{
        width: 120, height: 3, borderRadius: 2,
        background: "rgba(212,175,55,0.25)",
        overflow: "hidden",
      }}>
        <div style={{
          width: "60%", height: "100%", borderRadius: 2,
          background: "linear-gradient(90deg, #D4AF37, #f5d982)",
          animation: "ms3d-load 1.4s ease-in-out infinite alternate",
        }} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════════ */
export default function MemorialSanctuaryModal({ onClose, userName, initialEntries = [] }: Props) {
  /* ── data ── */
  const [entries, setEntries] = useState<CommunityYahrzeitEntry[]>(initialEntries);
  const [placedCandles, setPlacedCandles] = useState<PlacedCandle[]>([]);

  /* ── UI state ── */
  const [showForm, setShowForm]         = useState(false);
  const [selectedCandle, setSelectedCandle] = useState<CommunityYahrzeitEntry | null>(null);
  const [pendingPos, setPendingPos]     = useState<[number, number, number] | null>(null);
  const [showDedicate, setShowDedicate] = useState(false);
  const [zoneToast, setZoneToast]       = useState<string | null>(null);
  const [success, setSuccess]           = useState(false);

  /* ── form fields ── */
  const [form, setForm] = useState({ name: "", hebrewName: "", message: "", date: "" });
  const [saving, setSaving]   = useState(false);

  /* ── dedicate form ── */
  const [dedicateForm, setDedicateForm] = useState({ learnerName: "", studySubject: "" });
  const [dedicateSaving, setDedicateSaving] = useState(false);
  const [dedicateSuccess, setDedicateSuccess] = useState(false);

  /* ── data loading ── */
  const load = useCallback(async () => {
    const data = await fetchCommunityYahrzeit();
    setEntries(data);
  }, []);

  useEffect(() => { if (initialEntries.length === 0) load(); }, []);
  useEffect(() => { const iv = setInterval(load, 25000); return () => clearInterval(iv); }, [load]);

  /* ── candle click from 3D scene ── */
  const handleCandleClick = useCallback((entry: CommunityYahrzeitEntry) => {
    setSelectedCandle(entry);
    setShowForm(false);
    setShowDedicate(false);
    setDedicateForm({ learnerName: "", studySubject: "" });
    setDedicateSuccess(false);
  }, []);

  /* ── ground click → prompt to light candle ── */
  const handleGroundClick = useCallback((pos: [number, number, number]) => {
    if (showForm || selectedCandle) return;
    setPendingPos(pos);
    setShowForm(true);
    const zone = pos[0] < -6 ? "Tree of Life Grove" : pos[0] > 6 ? "Valley of Peace" : pos[2] < -6 ? "Memorial Garden" : pos[2] > 6 ? "Jerusalem Outlook" : "Eternal Light Court";
    setZoneToast(zone);
    setTimeout(() => setZoneToast(null), 2200);
  }, [showForm, selectedCandle]);

  /* ── submit candle ── */
  async function handleSubmit() {
    if (!form.name.trim() || !form.date) return;
    setSaving(true);
    try {
      const d = new Date(form.date + "T12:00:00");
      const hd = new HDate(d);
      await createCommunityYahrzeit({
        id: `cy-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        deceasedName: form.hebrewName.trim()
          ? `${form.name.trim()} · ${form.hebrewName.trim()}`
          : form.name.trim(),
        hebrewDay: hd.getDate(),
        hebrewMonth: hd.getMonth(),
        displayDate: d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
        passingYear: d.getFullYear(),
        message: form.message.trim(),
        donorDisplayName: userName ?? "Community Member",
      });

      /* also place a local candle at the clicked spot */
      if (pendingPos) {
        setPlacedCandles(prev => [...prev, { pos: pendingPos, name: form.name.trim() }]);
      }

      setSuccess(true);
      await load();
      setTimeout(() => {
        setSuccess(false);
        setShowForm(false);
        setPendingPos(null);
        setForm({ name: "", hebrewName: "", message: "", date: "" });
      }, 3000);
    } finally {
      setSaving(false);
    }
  }

  /* ── dedicate learning ── */
  async function handleDedicate() {
    if (!selectedCandle || !dedicateForm.learnerName.trim() || !dedicateForm.studySubject.trim()) return;
    setDedicateSaving(true);
    try {
      await dedicateLearning(selectedCandle.id, dedicateForm.learnerName.trim(), dedicateForm.studySubject.trim());
      setDedicateSuccess(true);
      await load();
      setTimeout(() => {
        setDedicateSuccess(false);
        setShowDedicate(false);
        setDedicateForm({ learnerName: "", studySubject: "" });
      }, 2500);
    } finally {
      setDedicateSaving(false);
    }
  }

  /* ══════════════════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════════════════ */
  return (
    <div
      onClick={e => e.stopPropagation()}
      style={{ position: "fixed", inset: 0, zIndex: 9999, overflow: "hidden", userSelect: "none" }}
    >
      {/* ── Global animations ── */}
      <style>{`
        @keyframes ms3d-load {
          from { width: 25%; }
          to   { width: 90%; }
        }
        @keyframes ms3d-form-up {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }
        @keyframes ms3d-panel-up {
          from { transform: translateY(80px); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }
        @keyframes ms3d-toast-in {
          0%   { opacity: 0; transform: translateX(-50%) translateY(12px); }
          20%  { opacity: 1; transform: translateX(-50%) translateY(0); }
          80%  { opacity: 1; }
          100% { opacity: 0; transform: translateX(-50%) translateY(-8px); }
        }
        @keyframes ms3d-success {
          0%   { opacity: 0; transform: translateX(-50%) scale(0.75); }
          60%  { opacity: 1; transform: translateX(-50%) scale(1.06); }
          100% { opacity: 1; transform: translateX(-50%) scale(1); }
        }
        @keyframes ms3d-btn-glow {
          0%,100% { box-shadow: 0 0 18px rgba(212,175,55,0.45), 0 6px 20px rgba(0,0,0,0.5); }
          50%     { box-shadow: 0 0 38px rgba(212,175,55,0.75), 0 6px 22px rgba(0,0,0,0.5), 0 0 55px rgba(212,175,55,0.25); }
        }
        @keyframes ms3d-shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes ms3d-spin {
          to { transform: rotate(360deg); }
        }
        .ms3d-input {
          width: 100%; padding: 12px 14px; box-sizing: border-box;
          background: rgba(15,10,30,0.75); border: 1px solid rgba(212,175,55,0.25);
          border-radius: 12px; color: #fff; font-size: 14px; outline: none;
          font-family: inherit; transition: border-color 0.2s;
          backdrop-filter: blur(6px);
        }
        .ms3d-input:focus { border-color: rgba(212,175,55,0.6); }
        .ms3d-input::placeholder { color: rgba(255,255,255,0.28); }
        input[type="date"].ms3d-input::-webkit-calendar-picker-indicator {
          filter: invert(0.7) sepia(1) saturate(2) hue-rotate(5deg);
        }
      `}</style>

      {/* ══════════════════════════════════════════════
          3D VALLEY CANVAS (fills entire screen)
      ══════════════════════════════════════════════ */}
      <div style={{ position: "absolute", inset: 0 }}>
        <Suspense fallback={<ValleyLoading />}>
          <MemorialValley3D
            entries={entries}
            placedCandles={placedCandles}
            onCandleClick={handleCandleClick}
            onGroundClick={handleGroundClick}
          />
        </Suspense>
      </div>

      {/* ══════════════════════════════════════════════
          HEADER BAR
      ══════════════════════════════════════════════ */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        padding: "16px 16px 24px",
        background: "linear-gradient(to bottom, rgba(0,0,0,0.62) 0%, transparent 100%)",
        display: "flex", alignItems: "flex-start", justifyContent: "space-between",
        pointerEvents: "none", zIndex: 10,
      }}>
        <button
          onClick={onClose}
          style={{
            pointerEvents: "all",
            width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
            background: "rgba(0,0,0,0.55)", border: "1px solid rgba(255,255,255,0.18)",
            backdropFilter: "blur(10px)",
            color: "rgba(255,255,255,0.88)", fontSize: 14, fontWeight: 800,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >✕</button>

        <div style={{ textAlign: "center", flex: 1, padding: "0 12px" }}>
          <div style={{
            fontSize: 9, fontWeight: 900, letterSpacing: "0.24em", textTransform: "uppercase",
            color: "rgba(212,175,55,0.92)", textShadow: "0 1px 8px rgba(0,0,0,0.8)", marginBottom: 4,
          }}>
            Community Memorial
          </div>
          <div style={{
            fontFamily: "'Noto Serif Hebrew', serif",
            fontSize: 18, fontWeight: 700, color: "#F5D982",
            textShadow: "0 0 20px rgba(212,175,55,0.7), 0 2px 10px rgba(0,0,0,0.9)",
          }}>
            יהי זכרם ברוך
          </div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.48)", marginTop: 3, letterSpacing: "0.06em" }}>
            {entries.length} candle{entries.length !== 1 ? "s" : ""} burning · Tap ground to light one
          </div>
        </div>

        {/* Stats pill */}
        <div style={{
          pointerEvents: "none", flexShrink: 0,
          background: "rgba(0,0,0,0.52)", backdropFilter: "blur(8px)",
          border: "1px solid rgba(212,175,55,0.2)", borderRadius: 12,
          padding: "6px 10px", textAlign: "center",
        }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: "#D4AF37", lineHeight: 1 }}>
            {entries.length}
          </div>
          <div style={{ fontSize: 7, color: "rgba(255,255,255,0.45)", letterSpacing: "0.08em", marginTop: 2 }}>
            SOULS
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════
          ZONE TOAST (pops on ground click or drag)
      ══════════════════════════════════════════════ */}
      {zoneToast && (
        <div style={{
          position: "absolute", top: 88, left: "50%",
          padding: "7px 20px", borderRadius: 20, zIndex: 20,
          background: "rgba(0,0,0,0.7)", backdropFilter: "blur(10px)",
          border: "1px solid rgba(212,175,55,0.4)",
          fontSize: 11, fontWeight: 800, color: "rgba(212,175,55,0.95)",
          letterSpacing: "0.12em", textTransform: "uppercase",
          pointerEvents: "none",
          animation: "ms3d-toast-in 2.2s ease forwards",
        }}>
          📍 {zoneToast}
        </div>
      )}

      {/* ══════════════════════════════════════════════
          SUCCESS TOAST
      ══════════════════════════════════════════════ */}
      {success && (
        <div style={{
          position: "absolute", top: "42%", left: "50%",
          padding: "20px 28px", borderRadius: 22, zIndex: 20,
          background: "rgba(4,2,14,0.9)", backdropFilter: "blur(20px)",
          border: "1px solid rgba(212,175,55,0.45)",
          textAlign: "center",
          animation: "ms3d-success 0.5s cubic-bezier(0.34,1.56,0.64,1) both",
          pointerEvents: "none",
        }}>
          <div style={{ fontSize: 42, marginBottom: 10, filter: "drop-shadow(0 0 14px rgba(255,160,40,0.8))" }}>🕯</div>
          <div style={{ fontSize: 16, fontWeight: 900, color: "#F5D982", marginBottom: 5 }}>
            Candle Lit
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", fontStyle: "italic" }}>
            יהי זכרם ברוך
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          ZONE GUIDE PILLS (bottom left)
      ══════════════════════════════════════════════ */}
      {!showForm && !selectedCandle && !success && (
        <div style={{
          position: "absolute", bottom: 100, left: 0, right: 0, zIndex: 10,
          display: "flex", justifyContent: "center", gap: 5,
          padding: "0 12px", flexWrap: "wrap", pointerEvents: "none",
        }}>
          {ZONE_PILLS.map((z, i) => (
            <div key={i} style={{
              padding: "4px 11px", borderRadius: 14,
              background: `${z.color}38`,
              border: `1px solid ${z.color}70`,
              fontSize: 8, fontWeight: 700, color: "rgba(255,255,255,0.72)",
              letterSpacing: "0.06em", textTransform: "uppercase",
              backdropFilter: "blur(5px)",
            }}>
              {z.name}
            </div>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════
          LIGHT CANDLE CTA (bottom center)
      ══════════════════════════════════════════════ */}
      {!showForm && !selectedCandle && !success && (
        <div style={{
          position: "absolute", bottom: 30, left: "50%", transform: "translateX(-50%)", zIndex: 10,
        }}>
          <button
            onClick={() => { setShowForm(true); setPendingPos(null); }}
            style={{
              padding: "15px 32px",
              background: "linear-gradient(135deg, #D4AF37 0%, #c9a227 42%, #e8c84a 100%)",
              border: "none", borderRadius: 20,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
              animation: "ms3d-btn-glow 3s ease-in-out infinite",
              position: "relative", overflow: "hidden", whiteSpace: "nowrap",
            }}
          >
            <div style={{
              position: "absolute", inset: 0, pointerEvents: "none",
              background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.28) 50%, transparent 70%)",
              backgroundSize: "200% 100%",
              animation: "ms3d-shimmer 2.8s linear infinite",
            }} />
            <span style={{ fontSize: 20, position: "relative" }}>🕯</span>
            <span style={{ fontSize: 14, fontWeight: 900, color: "#1a0f00", letterSpacing: "0.04em", position: "relative" }}>
              Light Memorial Candle
            </span>
          </button>
          <div style={{
            textAlign: "center", marginTop: 8,
            fontSize: 9, color: "rgba(255,255,255,0.45)", letterSpacing: "0.06em",
            textShadow: "0 1px 4px rgba(0,0,0,0.8)",
          }}>
            or tap anywhere in the valley to place
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          CANDLE FORM BOTTOM SHEET
      ══════════════════════════════════════════════ */}
      {showForm && !success && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 20,
            borderRadius: "24px 24px 0 0",
            background: "rgba(6,3,18,0.96)",
            backdropFilter: "blur(24px)",
            border: "1px solid rgba(212,175,55,0.22)",
            borderBottom: "none",
            padding: "0 20px 40px",
            animation: "ms3d-form-up 0.38s cubic-bezier(0.34,1.56,0.64,1) both",
            maxHeight: "82dvh", overflowY: "auto",
          }}
        >
          {/* Handle */}
          <div style={{ display: "flex", justifyContent: "center", padding: "14px 0 10px" }}>
            <div style={{ width: 38, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.14)" }} />
          </div>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 900, color: "#fff" }}>🕯 Light a Memorial Candle</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.42)", marginTop: 4 }}>
                {pendingPos ? "Candle will appear at your chosen spot" : "Place a candle in the sanctuary"}
                {" "}— יהי זכרם ברוך
              </div>
            </div>
            <button
              onClick={() => { setShowForm(false); setPendingPos(null); }}
              style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0, background: "rgba(255,255,255,0.08)", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 14 }}
            >✕</button>
          </div>

          {/* Name fields */}
          {[
            { label: "NAME OF BELOVED *", key: "name", placeholder: "Full name", type: "text" },
            { label: "HEBREW NAME (optional)", key: "hebrewName", placeholder: "שם עברי", type: "text" },
          ].map(f => (
            <div key={f.key} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", color: "rgba(212,175,55,0.72)", marginBottom: 6 }}>{f.label}</div>
              <input
                type={f.type}
                value={(form as any)[f.key]}
                onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                className="ms3d-input"
              />
            </div>
          ))}

          {/* Date */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", color: "rgba(212,175,55,0.72)", marginBottom: 6 }}>DATE OF PASSING *</div>
            <input
              type="date"
              value={form.date}
              onChange={e => setForm(prev => ({ ...prev, date: e.target.value }))}
              className="ms3d-input"
            />
          </div>

          {/* Message */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", color: "rgba(212,175,55,0.72)", marginBottom: 6 }}>MEMORIAL MESSAGE (optional)</div>
            <textarea
              value={form.message}
              onChange={e => setForm(prev => ({ ...prev, message: e.target.value }))}
              placeholder="Share a memory, prayer, or tribute…"
              rows={3}
              className="ms3d-input"
              style={{ resize: "none", lineHeight: 1.55 }}
            />
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={saving || !form.name.trim() || !form.date}
            style={{
              width: "100%", padding: "16px 0",
              background: saving || !form.name.trim() || !form.date
                ? "rgba(212,175,55,0.22)"
                : "linear-gradient(135deg, #D4AF37 0%, #c9a227 42%, #e8c84a 100%)",
              border: "none", borderRadius: 16,
              fontSize: 15, fontWeight: 900, color: "#1a0f00",
              cursor: saving || !form.name.trim() || !form.date ? "default" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              opacity: saving ? 0.7 : 1, transition: "opacity 0.2s",
              position: "relative", overflow: "hidden",
            }}
          >
            {!saving && (
              <div style={{
                position: "absolute", inset: 0, pointerEvents: "none",
                background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.22) 50%, transparent 70%)",
                backgroundSize: "200% 100%",
                animation: "ms3d-shimmer 2.8s linear infinite",
              }} />
            )}
            {saving ? (
              <><div style={{ width: 16, height: 16, border: "2px solid rgba(0,0,0,0.25)", borderTop: "2px solid #1a0f00", borderRadius: "50%", animation: "ms3d-spin 0.8s linear infinite" }} />Lighting candle…</>
            ) : (
              <>🕯 Light Candle in the Valley</>
            )}
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════
          CANDLE DETAIL PANEL
      ══════════════════════════════════════════════ */}
      {selectedCandle && !showForm && !success && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 20,
            borderRadius: "24px 24px 0 0",
            background: "rgba(4,2,14,0.97)",
            backdropFilter: "blur(28px)",
            border: "1px solid rgba(212,175,55,0.28)",
            borderBottom: "none",
            animation: "ms3d-panel-up 0.3s cubic-bezier(0.34,1.56,0.64,1) both",
            maxHeight: "74dvh", overflowY: "auto",
          }}
        >
          {/* Handle */}
          <div style={{ display: "flex", justifyContent: "center", padding: "14px 0 6px" }}>
            <div style={{ width: 38, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.12)" }} />
          </div>

          <div style={{ padding: "8px 20px 36px" }}>
            {/* Panel header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14, flexShrink: 0,
                  background: "rgba(212,175,55,0.1)", border: "1px solid rgba(212,175,55,0.28)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 24, filter: "drop-shadow(0 0 8px rgba(255,165,40,0.55))",
                }}>🕯</div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: "#fff", lineHeight: 1.2 }}>
                    {selectedCandle.deceasedName.split("·")[0].trim()}
                  </div>
                  {selectedCandle.deceasedName.includes("·") && (
                    <div style={{ fontSize: 14, fontFamily: "'Noto Serif Hebrew', serif", color: "rgba(212,175,55,0.82)", marginTop: 2 }}>
                      {selectedCandle.deceasedName.split("·")[1]?.trim()}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => { setSelectedCandle(null); setShowDedicate(false); }}
                style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0, background: "rgba(255,255,255,0.07)", border: "none", color: "rgba(255,255,255,0.55)", cursor: "pointer", fontSize: 14 }}
              >✕</button>
            </div>

            {/* Date + donor badges */}
            <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
              {selectedCandle.displayDate && (
                <div style={{ padding: "4px 12px", borderRadius: 20, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", fontSize: 11, color: "rgba(255,255,255,0.6)" }}>
                  📅 {selectedCandle.displayDate}
                </div>
              )}
              {selectedCandle.donorDisplayName && (
                <div style={{ padding: "4px 12px", borderRadius: 20, background: "rgba(212,175,55,0.09)", border: "1px solid rgba(212,175,55,0.22)", fontSize: 11, color: "rgba(212,175,55,0.72)" }}>
                  🕯 Lit by {selectedCandle.donorDisplayName}
                </div>
              )}
            </div>

            {/* Message */}
            {selectedCandle.message && (
              <div style={{ padding: "12px 14px", marginBottom: 16, background: "rgba(255,255,255,0.03)", borderRadius: 12, border: "1px solid rgba(255,255,255,0.07)", fontSize: 13, color: "rgba(255,255,255,0.62)", fontStyle: "italic", lineHeight: 1.65 }}>
                "{selectedCandle.message}"
              </div>
            )}

            {/* Learners */}
            {selectedCandle.learners && selectedCandle.learners.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", color: "rgba(167,139,250,0.75)", marginBottom: 8 }}>ACTIVE DEDICATIONS</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {selectedCandle.learners.map((l: any, i: number) => (
                    <div key={i} style={{ padding: "5px 11px", borderRadius: 14, background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.2)", fontSize: 11, color: "rgba(167,139,250,0.85)" }}>
                      📖 {l.learnerName} · {l.studySubject}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dedicate learning */}
            <button
              onClick={() => setShowDedicate(!showDedicate)}
              style={{
                width: "100%", padding: "12px 0", marginBottom: showDedicate ? 16 : 0,
                background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.3)",
                borderRadius: 14, fontSize: 13, fontWeight: 700, color: "rgba(167,139,250,0.9)",
                cursor: "pointer",
              }}
            >
              📖 Dedicate Learning in their Memory
            </button>

            {showDedicate && !dedicateSuccess && (
              <div style={{ animation: "ms3d-panel-up 0.25s ease both" }}>
                {[
                  { label: "YOUR NAME *", key: "learnerName", placeholder: "Your name" },
                  { label: "SUBJECT OF STUDY *", key: "studySubject", placeholder: "e.g. Mishnah, Tehillim, Talmud…" },
                ].map(f => (
                  <div key={f.key} style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", color: "rgba(212,175,55,0.7)", marginBottom: 6 }}>{f.label}</div>
                    <input
                      type="text"
                      value={(dedicateForm as any)[f.key]}
                      onChange={e => setDedicateForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="ms3d-input"
                    />
                  </div>
                ))}
                <button
                  onClick={handleDedicate}
                  disabled={dedicateSaving || !dedicateForm.learnerName.trim() || !dedicateForm.studySubject.trim()}
                  style={{
                    width: "100%", padding: "13px 0",
                    background: dedicateSaving ? "rgba(167,139,250,0.25)" : "linear-gradient(135deg, #a78bfa, #7c3aed)",
                    border: "none", borderRadius: 14,
                    fontSize: 14, fontWeight: 800, color: "#fff",
                    cursor: dedicateSaving ? "default" : "pointer",
                    opacity: dedicateSaving ? 0.7 : 1,
                  }}
                >
                  {dedicateSaving ? "Dedicating…" : "📖 Dedicate"}
                </button>
              </div>
            )}

            {dedicateSuccess && (
              <div style={{ textAlign: "center", padding: "12px 0", fontSize: 14, color: "rgba(167,139,250,0.9)", fontWeight: 700 }}>
                ✓ Dedication recorded — may it be for a blessing
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
