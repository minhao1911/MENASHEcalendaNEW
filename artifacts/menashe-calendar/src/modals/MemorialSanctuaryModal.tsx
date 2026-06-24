import { useState, useCallback, useEffect, useRef, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HDate } from "@hebcal/core";
import {
  fetchCommunityYahrzeit,
  createCommunityYahrzeit,
  dedicateLearning,
  type CommunityYahrzeitEntry,
} from "../lib/userApi";

const MemorialValley3D = lazy(() => import("../components/MemorialValley3D"));

/* ═══════════════════ TYPES ═════════════════════════════════════════════════ */
interface Props {
  onClose: () => void;
  userName?: string | null;
  initialEntries?: CommunityYahrzeitEntry[];
}
interface Candle { pos: [number, number, number]; name: string }

/* ═══════════════════ HELPERS ═══════════════════════════════════════════════ */
function initials(name: string) {
  return name.split(" ").slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("") || "?";
}
function hashNum(id: string, base = 30, spread = 120) {
  let h = 0; for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return base + (h % spread);
}
function filterEntries(list: CommunityYahrzeitEntry[], q: string, yr: string) {
  let r = list;
  if (q.trim()) {
    const ql = q.toLowerCase();
    r = r.filter(e =>
      e.deceasedName.toLowerCase().includes(ql) ||
      e.donorDisplayName.toLowerCase().includes(ql) ||
      (e.message && e.message.toLowerCase().includes(ql))
    );
  }
  if (yr && yr !== "all") r = r.filter(e => String(e.passingYear) === yr);
  return r;
}
function allYears(list: CommunityYahrzeitEntry[]) {
  const yrs = [...new Set(list.map(e => e.passingYear).filter(Boolean))].sort((a, b) => (b ?? 0) - (a ?? 0));
  return yrs as number[];
}

/* ═══════════════════ LOADING SCREEN ════════════════════════════════════════ */
function ValleyLoading() {
  return (
    <div style={{
      position: "absolute", inset: 0,
      background: "linear-gradient(168deg, #b05822 0%, #e08830 18%, #f0b850 35%, #e8d890 52%, #b8d498 72%, #6a9a70 100%)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20,
    }}>
      <div style={{ fontSize: 58, filter: "drop-shadow(0 0 22px rgba(255,180,40,0.75))", animation: "ms-flicker 1.8s ease-in-out infinite" }}>🕯</div>
      <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.22em", color: "rgba(35,18,0,0.7)", textTransform: "uppercase" }}>
        Preparing the Sanctuary
      </div>
      <div style={{ width: 140, height: 3, borderRadius: 2, background: "rgba(180,140,40,0.2)", overflow: "hidden" }}>
        <div style={{ height: "100%", borderRadius: 2, background: "linear-gradient(90deg,#D4AF37,#f5d982)", animation: "ms-bar 1.6s ease-in-out infinite alternate" }} />
      </div>
    </div>
  );
}

/* ═══════════════════ MEMORIAL CARD ═════════════════════════════════════════ */
function MemorialCard({ entry, onClick, delay }: {
  entry: CommunityYahrzeitEntry; onClick: () => void; delay: number;
}) {
  const name    = entry.deceasedName.split("·")[0].trim();
  const hebrew  = entry.deceasedName.includes("·") ? entry.deceasedName.split("·")[1]?.trim() : null;
  const candleN = hashNum(entry.id, 3, 28);
  const visitorN = hashNum(entry.id + "v", 8, 60);

  return (
    <motion.div
      initial={{ opacity: 0, y: 22, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: "spring", damping: 26, stiffness: 300 }}
      onClick={onClick}
      style={{
        flexShrink: 0, width: 180, cursor: "pointer",
        background: "rgba(8,4,22,0.82)",
        backdropFilter: "blur(22px) saturate(1.4)",
        border: "1px solid rgba(212,175,55,0.28)",
        borderRadius: 18, padding: "14px 14px 12px", userSelect: "none",
        boxShadow: "0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.07)",
      }}
      whileHover={{ scale: 1.03, borderColor: "rgba(212,175,55,0.55)" }}
      whileTap={{ scale: 0.97 }}
    >
      {/* Avatar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <div style={{
          width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
          background: "linear-gradient(135deg, #D4AF37, #8a6800)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 14, fontWeight: 900, color: "#fff",
          boxShadow: "0 0 10px rgba(212,175,55,0.4)",
        }}>
          {initials(name)}
        </div>
        <div style={{ overflow: "hidden" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {name}
          </div>
          {hebrew && (
            <div style={{ fontSize: 10, color: "rgba(212,175,55,0.75)", fontFamily: "'Noto Serif Hebrew', serif", marginTop: 1 }}>
              {hebrew}
            </div>
          )}
        </div>
      </div>
      {/* Date */}
      {entry.displayDate && (
        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.45)", marginBottom: 8, letterSpacing: "0.04em" }}>
          📅 {entry.displayDate}
        </div>
      )}
      {/* Candle flame icon + message preview */}
      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.38)", lineHeight: 1.5, marginBottom: 10,
        overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
        {entry.message || "יהי זכרם ברוך"}
      </div>
      {/* Stats */}
      <div style={{ display: "flex", gap: 8, borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <span style={{ fontSize: 10 }}>🕯</span>
          <span style={{ fontSize: 9, color: "rgba(212,175,55,0.7)", fontWeight: 700 }}>{candleN}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <span style={{ fontSize: 10 }}>👁</span>
          <span style={{ fontSize: 9, color: "rgba(255,255,255,0.4)" }}>{visitorN}</span>
        </div>
        {entry.learners.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <span style={{ fontSize: 10 }}>📖</span>
            <span style={{ fontSize: 9, color: "rgba(167,139,250,0.7)" }}>{entry.learners.length}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ═══════════════════ MAIN COMPONENT ════════════════════════════════════════ */
export default function MemorialSanctuaryModal({ onClose, userName, initialEntries = [] }: Props) {
  /* ── data ── */
  const [entries, setEntries] = useState<CommunityYahrzeitEntry[]>(initialEntries);
  const [placedCandles, setPlacedCandles] = useState<Candle[]>([]);

  /* ── ui state ── */
  const [selectedEntry, setSelectedEntry]   = useState<CommunityYahrzeitEntry | null>(null);
  const [showForm, setShowForm]             = useState(false);
  const [pendingPos, setPendingPos]         = useState<[number, number, number] | null>(null);
  const [success, setSuccess]               = useState(false);
  const [zoneToast, setZoneToast]           = useState<string | null>(null);
  const [searchOpen, setSearchOpen]         = useState(false);
  const [searchQuery, setSearchQuery]       = useState("");
  const [filterYear, setFilterYear]         = useState("all");
  const [showDedicate, setShowDedicate]     = useState(false);
  const [dedicateSuccess, setDedicateSuccess] = useState(false);

  /* ── form ── */
  const [form, setForm]   = useState({ name: "", hebrewName: "", message: "", date: "" });
  const [saving, setSaving] = useState(false);
  const [dedicateForm, setDedicateForm] = useState({ learnerName: "", studySubject: "" });
  const [dedicateSaving, setDedicateSaving] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);

  /* ── data loading ── */
  const load = useCallback(async () => {
    const data = await fetchCommunityYahrzeit();
    setEntries(data);
  }, []);
  useEffect(() => { if (initialEntries.length === 0) load(); }, []);
  useEffect(() => { const iv = setInterval(load, 30000); return () => clearInterval(iv); }, [load]);

  /* ── search focus ── */
  useEffect(() => { if (searchOpen) setTimeout(() => searchRef.current?.focus(), 80); }, [searchOpen]);

  /* ── candle click ── */
  const handleCandleClick = useCallback((entry: CommunityYahrzeitEntry) => {
    setSelectedEntry(entry);
    setShowForm(false);
    setShowDedicate(false);
    setDedicateSuccess(false);
    setDedicateForm({ learnerName: "", studySubject: "" });
    setSearchOpen(false);
  }, []);

  /* ── ground click ── */
  const handleGroundClick = useCallback((pos: [number, number, number]) => {
    if (showForm || selectedEntry || searchOpen) return;
    setPendingPos(pos);
    setShowForm(true);
    const zone =
      pos[0] < -6 ? "Tree of Life Grove" :
      pos[0] > 6  ? "Valley of Peace" :
      pos[2] < -6 ? "Memorial Garden" :
      pos[2] > 6  ? "Jerusalem Outlook" :
                    "Eternal Light Court";
    setZoneToast(zone);
    setTimeout(() => setZoneToast(null), 2400);
  }, [showForm, selectedEntry, searchOpen]);

  /* ── submit candle ── */
  async function handleSubmit() {
    if (!form.name.trim() || !form.date) return;
    setSaving(true);
    try {
      const d  = new Date(form.date + "T12:00:00");
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
      if (pendingPos) setPlacedCandles(prev => [...prev, { pos: pendingPos, name: form.name.trim() }]);
      setSuccess(true);
      await load();
      setTimeout(() => {
        setSuccess(false); setShowForm(false); setPendingPos(null);
        setForm({ name: "", hebrewName: "", message: "", date: "" });
      }, 3200);
    } finally { setSaving(false); }
  }

  /* ── dedicate learning ── */
  async function handleDedicate() {
    if (!selectedEntry || !dedicateForm.learnerName.trim() || !dedicateForm.studySubject.trim()) return;
    setDedicateSaving(true);
    try {
      await dedicateLearning(selectedEntry.id, dedicateForm.learnerName.trim(), dedicateForm.studySubject.trim());
      setDedicateSuccess(true);
      await load();
      setTimeout(() => { setDedicateSuccess(false); setShowDedicate(false); setDedicateForm({ learnerName: "", studySubject: "" }); }, 2800);
    } finally { setDedicateSaving(false); }
  }

  /* ── derived ── */
  const filtered  = filterEntries(entries, searchQuery, filterYear);
  const years     = allYears(entries);
  const totalLit  = entries.length;

  /* ══════════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════════ */
  return (
    <div
      onClick={e => e.stopPropagation()}
      style={{ position: "fixed", inset: 0, zIndex: 9999, overflow: "hidden", userSelect: "none" }}
    >
      {/* ── Keyframe animations ── */}
      <style>{`
        @keyframes ms-flicker { 0%,100%{filter:drop-shadow(0 0 14px rgba(255,180,40,0.6))} 50%{filter:drop-shadow(0 0 28px rgba(255,140,20,0.95))} }
        @keyframes ms-bar { from{width:18%} to{width:92%} }
        @keyframes ms-shimmer { 0%{background-position:-200% center} 100%{background-position:200% center} }
        @keyframes ms-spin { to{transform:rotate(360deg)} }
        @keyframes ms-pulse { 0%,100%{box-shadow:0 0 18px rgba(212,175,55,0.4),0 8px 22px rgba(0,0,0,0.55)} 50%{box-shadow:0 0 40px rgba(212,175,55,0.7),0 8px 24px rgba(0,0,0,0.55),0 0 60px rgba(212,175,55,0.25)} }
        .ms-input {
          width:100%; padding:12px 15px; box-sizing:border-box;
          background:rgba(12,8,28,0.78); border:1px solid rgba(212,175,55,0.22);
          border-radius:13px; color:#fff; font-size:14px; outline:none;
          font-family:inherit; transition:border-color 0.2s; backdrop-filter:blur(8px);
        }
        .ms-input:focus { border-color:rgba(212,175,55,0.55); }
        .ms-input::placeholder { color:rgba(255,255,255,0.26); }
        input[type="date"].ms-input::-webkit-calendar-picker-indicator { filter:invert(0.65) sepia(1) saturate(2) hue-rotate(8deg); }
        textarea.ms-input { resize:none; line-height:1.58; }
      `}</style>

      {/* ════════════════════════════════════════════
          3D CANVAS
      ════════════════════════════════════════════ */}
      <div style={{ position: "absolute", inset: 0 }}>
        <Suspense fallback={<ValleyLoading />}>
          <MemorialValley3D
            entries={entries}
            placedCandles={placedCandles}
            onCandleClick={handleCandleClick}
            onGroundClick={handleGroundClick}
            selectedId={selectedEntry?.id ?? null}
          />
        </Suspense>
      </div>

      {/* ════════════════════════════════════════════
          HEADER
      ════════════════════════════════════════════ */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, zIndex: 10,
        padding: "14px 14px 30px",
        background: "linear-gradient(to bottom, rgba(0,0,0,0.68) 0%, transparent 100%)",
        display: "flex", alignItems: "flex-start", gap: 10, pointerEvents: "none",
      }}>
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            pointerEvents: "all", flexShrink: 0,
            width: 38, height: 38, borderRadius: "50%",
            background: "rgba(0,0,0,0.55)", backdropFilter: "blur(12px)",
            border: "1px solid rgba(255,255,255,0.16)",
            color: "rgba(255,255,255,0.82)", fontSize: 14, fontWeight: 800,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >✕</button>

        {/* Title block */}
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: "0.24em", textTransform: "uppercase", color: "rgba(212,175,55,0.88)", textShadow: "0 1px 8px rgba(0,0,0,0.8)", marginBottom: 3 }}>
            Community Memorial Sanctuary
          </div>
          <div style={{ fontFamily: "'Noto Serif Hebrew',serif", fontSize: 20, fontWeight: 700, color: "#F5D982", textShadow: "0 0 24px rgba(212,175,55,0.65), 0 2px 12px rgba(0,0,0,0.9)" }}>
            יהי זכרם ברוך
          </div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.42)", marginTop: 3, letterSpacing: "0.06em" }}>
            {totalLit} candle{totalLit !== 1 ? "s" : ""} burning · Tap valley to place a candle
          </div>
        </div>

        {/* Search + Stats */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6, pointerEvents: "all" }}>
          {/* Search button */}
          <button
            onClick={() => { setSearchOpen(o => !o); if (selectedEntry) setSelectedEntry(null); }}
            style={{
              width: 38, height: 38, borderRadius: "50%",
              background: searchOpen ? "rgba(212,175,55,0.22)" : "rgba(0,0,0,0.52)",
              backdropFilter: "blur(12px)",
              border: `1px solid rgba(212,175,55,${searchOpen ? "0.6" : "0.2"})`,
              color: searchOpen ? "#D4AF37" : "rgba(255,255,255,0.7)",
              fontSize: 16, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s",
            }}
          >🔍</button>
          {/* Stats pill */}
          <div style={{
            background: "rgba(0,0,0,0.52)", backdropFilter: "blur(8px)",
            border: "1px solid rgba(212,175,55,0.2)", borderRadius: 12,
            padding: "5px 10px", textAlign: "center", minWidth: 42,
          }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: "#D4AF37", lineHeight: 1 }}>{totalLit}</div>
            <div style={{ fontSize: 7, color: "rgba(255,255,255,0.42)", letterSpacing: "0.08em", marginTop: 1 }}>SOULS</div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════
          SEARCH PANEL
      ════════════════════════════════════════════ */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            key="search-panel"
            initial={{ opacity: 0, y: -18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -18 }}
            transition={{ type: "spring", damping: 30, stiffness: 340 }}
            style={{
              position: "absolute", top: 88, left: 12, right: 12, zIndex: 20,
              background: "rgba(6,3,20,0.94)", backdropFilter: "blur(28px)",
              border: "1px solid rgba(212,175,55,0.22)", borderRadius: 20,
              padding: "16px 16px 12px",
              boxShadow: "0 12px 48px rgba(0,0,0,0.55)",
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Search input */}
            <div style={{ position: "relative", marginBottom: 12 }}>
              <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, opacity: 0.5 }}>🔍</span>
              <input
                ref={searchRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by name, message, or donor…"
                className="ms-input"
                style={{ paddingLeft: 36, marginBottom: 0 }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(255,255,255,0.45)", cursor: "pointer", fontSize: 14 }}
                >✕</button>
              )}
            </div>

            {/* Year filter chips */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
              {["all", ...years.map(String)].map(yr => (
                <button
                  key={yr}
                  onClick={() => setFilterYear(yr)}
                  style={{
                    padding: "4px 12px", borderRadius: 20, cursor: "pointer",
                    background: filterYear === yr ? "rgba(212,175,55,0.2)" : "rgba(255,255,255,0.05)",
                    border: `1px solid rgba(212,175,55,${filterYear === yr ? "0.55" : "0.15"})`,
                    fontSize: 10, fontWeight: 700, color: filterYear === yr ? "#D4AF37" : "rgba(255,255,255,0.5)",
                    letterSpacing: "0.06em", transition: "all 0.15s",
                  }}
                >
                  {yr === "all" ? "All Years" : yr}
                </button>
              ))}
            </div>

            {/* Results */}
            <div style={{ maxHeight: 240, overflowY: "auto" }}>
              {filtered.length === 0 ? (
                <div style={{ textAlign: "center", padding: "18px 0", color: "rgba(255,255,255,0.32)", fontSize: 12 }}>
                  No memorials found
                </div>
              ) : (
                filtered.slice(0, 20).map((entry, i) => {
                  const name = entry.deceasedName.split("·")[0].trim();
                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      onClick={() => { handleCandleClick(entry); setSearchOpen(false); setSearchQuery(""); }}
                      style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "10px 10px", borderRadius: 12, cursor: "pointer",
                        marginBottom: 2, transition: "background 0.15s",
                      }}
                      whileHover={{ background: "rgba(212,175,55,0.08)" }}
                    >
                      <div style={{
                        width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                        background: "linear-gradient(135deg, #D4AF37, #8a6800)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 12, fontWeight: 900, color: "#fff",
                      }}>
                        {initials(name)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</div>
                        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.38)", marginTop: 1 }}>
                          {entry.displayDate} · Lit by {entry.donorDisplayName}
                        </div>
                      </div>
                      <span style={{ fontSize: 16 }}>🕯</span>
                    </motion.div>
                  );
                })
              )}
              {filtered.length > 20 && (
                <div style={{ textAlign: "center", padding: "6px 0", fontSize: 10, color: "rgba(255,255,255,0.3)" }}>
                  + {filtered.length - 20} more — refine your search
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════════════════════════════════════════════
          ZONE TOAST
      ════════════════════════════════════════════ */}
      <AnimatePresence>
        {zoneToast && (
          <motion.div
            key="zone-toast"
            initial={{ opacity: 0, y: 10, x: "-50%" }}
            animate={{ opacity: 1, y: 0,  x: "-50%" }}
            exit={{ opacity: 0, y: -8, x: "-50%" }}
            style={{
              position: "absolute", top: 90, left: "50%", zIndex: 15, pointerEvents: "none",
              padding: "7px 20px", borderRadius: 22,
              background: "rgba(0,0,0,0.72)", backdropFilter: "blur(12px)",
              border: "1px solid rgba(212,175,55,0.42)",
              fontSize: 11, fontWeight: 800, color: "rgba(212,175,55,0.95)", letterSpacing: "0.1em", textTransform: "uppercase",
            }}
          >
            📍 {zoneToast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════════════════════════════════════════════
          SUCCESS TOAST
      ════════════════════════════════════════════ */}
      <AnimatePresence>
        {success && (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.72, x: "-50%", y: "-50%" }}
            animate={{ opacity: 1, scale: 1,    x: "-50%", y: "-50%" }}
            exit={{ opacity: 0, scale: 0.85,    x: "-50%", y: "-50%" }}
            transition={{ type: "spring", damping: 22, stiffness: 280 }}
            style={{
              position: "absolute", top: "44%", left: "50%", zIndex: 30, pointerEvents: "none",
              padding: "26px 32px", borderRadius: 26, textAlign: "center",
              background: "rgba(4,2,16,0.92)", backdropFilter: "blur(24px)",
              border: "1px solid rgba(212,175,55,0.48)",
              boxShadow: "0 0 60px rgba(212,175,55,0.25)",
            }}
          >
            <div style={{ fontSize: 48, marginBottom: 12, filter: "drop-shadow(0 0 18px rgba(255,165,40,0.82))", animation: "ms-flicker 1.8s infinite" }}>🕯</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: "#F5D982", marginBottom: 6 }}>Candle Lit</div>
            <div style={{ fontSize: 12, fontFamily: "'Noto Serif Hebrew',serif", color: "rgba(212,175,55,0.65)" }}>יהי זכרם ברוך</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════════════════════════════════════════════
          MEMORIAL CARDS SCROLL ROW
      ════════════════════════════════════════════ */}
      {!showForm && !selectedEntry && !success && !searchOpen && entries.length > 0 && (
        <div style={{
          position: "absolute", bottom: 110, left: 0, right: 0, zIndex: 10,
          padding: "0 16px",
        }}>
          <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(212,175,55,0.65)", marginBottom: 8, textShadow: "0 1px 6px rgba(0,0,0,0.9)" }}>
            RECENT MEMORIALS
          </div>
          <div style={{
            display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4,
            scrollbarWidth: "none",
          }}
            className="ms-cards-row"
          >
            {entries.slice(0, 18).map((entry, i) => (
              <MemorialCard
                key={entry.id}
                entry={entry}
                onClick={() => handleCandleClick(entry)}
                delay={i * 0.05}
              />
            ))}
          </div>
          <style>{`.ms-cards-row::-webkit-scrollbar{display:none}`}</style>
        </div>
      )}

      {/* ════════════════════════════════════════════
          LIGHT CANDLE CTA
      ════════════════════════════════════════════ */}
      {!showForm && !selectedEntry && !success && (
        <div style={{
          position: "absolute", bottom: 26, left: "50%", transform: "translateX(-50%)", zIndex: 10,
        }}>
          <motion.button
            onClick={() => { setShowForm(true); setPendingPos(null); }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            style={{
              padding: "16px 34px",
              background: "linear-gradient(135deg, #D4AF37 0%, #c9a227 45%, #e8c84a 100%)",
              border: "none", borderRadius: 22, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 10,
              animation: "ms-pulse 3.2s ease-in-out infinite",
              position: "relative", overflow: "hidden", whiteSpace: "nowrap",
              boxShadow: "0 0 22px rgba(212,175,55,0.45), 0 8px 24px rgba(0,0,0,0.5)",
            }}
          >
            <div style={{
              position: "absolute", inset: 0, pointerEvents: "none",
              background: "linear-gradient(108deg,transparent 30%,rgba(255,255,255,0.26) 50%,transparent 70%)",
              backgroundSize: "200% 100%",
              animation: "ms-shimmer 3.0s linear infinite",
            }} />
            <span style={{ fontSize: 22, position: "relative" }}>🕯</span>
            <span style={{ fontSize: 15, fontWeight: 900, color: "#1a0f00", letterSpacing: "0.04em", position: "relative" }}>
              Light Memorial Candle
            </span>
          </motion.button>
          <div style={{ textAlign: "center", marginTop: 7, fontSize: 9, color: "rgba(255,255,255,0.38)", letterSpacing: "0.06em", textShadow: "0 1px 4px rgba(0,0,0,0.9)" }}>
            or tap anywhere in the valley
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
          CANDLE FORM SHEET
      ════════════════════════════════════════════ */}
      <AnimatePresence>
        {showForm && !success && (
          <motion.div
            key="candle-form"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            onClick={e => e.stopPropagation()}
            style={{
              position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 25,
              borderRadius: "26px 26px 0 0",
              background: "rgba(5,2,16,0.97)", backdropFilter: "blur(28px)",
              border: "1px solid rgba(212,175,55,0.22)", borderBottom: "none",
              maxHeight: "84dvh", overflowY: "auto",
              boxShadow: "0 -12px 50px rgba(0,0,0,0.55)",
            }}
          >
            {/* Handle */}
            <div style={{ display: "flex", justifyContent: "center", padding: "14px 0 8px" }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.13)" }} />
            </div>

            <div style={{ padding: "0 20px 44px" }}>
              {/* Header */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
                    <span>🕯</span> Light a Memorial Candle
                  </div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", marginTop: 4 }}>
                    {pendingPos ? "Candle will appear at your chosen spot" : "Honor a beloved soul in the sanctuary"}
                  </div>
                </div>
                <button
                  onClick={() => { setShowForm(false); setPendingPos(null); }}
                  style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0, background: "rgba(255,255,255,0.07)", border: "none", color: "rgba(255,255,255,0.55)", cursor: "pointer", fontSize: 14 }}
                >✕</button>
              </div>

              {/* Fields */}
              {[
                { label: "NAME OF BELOVED *", key: "name", type: "text", placeholder: "Full name" },
                { label: "HEBREW NAME (optional)", key: "hebrewName", type: "text", placeholder: "שם עברי" },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", color: "rgba(212,175,55,0.7)", marginBottom: 6 }}>{f.label}</div>
                  <input type={f.type} value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} className="ms-input" />
                </div>
              ))}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", color: "rgba(212,175,55,0.7)", marginBottom: 6 }}>DATE OF PASSING *</div>
                <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className="ms-input" />
              </div>
              <div style={{ marginBottom: 26 }}>
                <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", color: "rgba(212,175,55,0.7)", marginBottom: 6 }}>MEMORIAL MESSAGE (optional)</div>
                <textarea value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} placeholder="Share a memory, prayer, or tribute…" rows={3} className="ms-input" />
              </div>

              {/* Submit */}
              <motion.button
                onClick={handleSubmit}
                disabled={saving || !form.name.trim() || !form.date}
                whileHover={!saving && form.name.trim() && form.date ? { scale: 1.02 } : {}}
                whileTap={!saving && form.name.trim() && form.date ? { scale: 0.98 } : {}}
                style={{
                  width: "100%", padding: "17px 0",
                  background: saving || !form.name.trim() || !form.date
                    ? "rgba(212,175,55,0.2)"
                    : "linear-gradient(135deg, #D4AF37 0%, #c9a227 45%, #e8c84a 100%)",
                  border: "none", borderRadius: 18,
                  fontSize: 15, fontWeight: 900, color: "#1a0f00",
                  cursor: saving || !form.name.trim() || !form.date ? "default" : "pointer",
                  opacity: saving ? 0.7 : 1, transition: "all 0.2s",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  position: "relative", overflow: "hidden",
                }}
              >
                {!saving && form.name.trim() && form.date && (
                  <div style={{
                    position: "absolute", inset: 0, pointerEvents: "none",
                    background: "linear-gradient(108deg,transparent 30%,rgba(255,255,255,0.22) 50%,transparent 70%)",
                    backgroundSize: "200% 100%", animation: "ms-shimmer 2.8s linear infinite",
                  }} />
                )}
                {saving ? (
                  <><div style={{ width: 16, height: 16, border: "2px solid rgba(0,0,0,0.22)", borderTop: "2px solid #1a0f00", borderRadius: "50%", animation: "ms-spin 0.75s linear infinite" }} />Lighting candle…</>
                ) : (
                  <>🕯 Light Candle in the Valley</>
                )}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════════════════════════════════════════════
          MEMORIAL PROFILE PANEL
      ════════════════════════════════════════════ */}
      <AnimatePresence>
        {selectedEntry && !showForm && !success && (
          <motion.div
            key="memorial-profile"
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            onClick={e => e.stopPropagation()}
            style={{
              position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 25,
              borderRadius: "26px 26px 0 0",
              background: "rgba(4,2,14,0.97)", backdropFilter: "blur(30px)",
              border: "1px solid rgba(212,175,55,0.28)", borderBottom: "none",
              maxHeight: "78dvh", overflowY: "auto",
              boxShadow: "0 -16px 60px rgba(0,0,0,0.6)",
            }}
          >
            {/* Handle */}
            <div style={{ display: "flex", justifyContent: "center", padding: "14px 0 4px" }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.11)" }} />
            </div>

            <div style={{ padding: "6px 20px 40px" }}>
              {/* Name + close */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 20 }}>
                {/* Avatar */}
                <div style={{
                  width: 58, height: 58, borderRadius: 18, flexShrink: 0,
                  background: "linear-gradient(135deg, #D4AF37 0%, #8a6800 100%)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 20, fontWeight: 900, color: "#fff",
                  boxShadow: "0 0 22px rgba(212,175,55,0.45), inset 0 1px 0 rgba(255,255,255,0.2)",
                }}>
                  {initials(selectedEntry.deceasedName.split("·")[0].trim())}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: "#fff", lineHeight: 1.2, marginBottom: 4 }}>
                    {selectedEntry.deceasedName.split("·")[0].trim()}
                  </div>
                  {selectedEntry.deceasedName.includes("·") && (
                    <div style={{ fontSize: 15, fontFamily: "'Noto Serif Hebrew',serif", color: "rgba(212,175,55,0.85)", marginBottom: 6 }}>
                      {selectedEntry.deceasedName.split("·")[1]?.trim()}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {selectedEntry.displayDate && (
                      <div style={{ padding: "3px 10px", borderRadius: 18, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", fontSize: 10, color: "rgba(255,255,255,0.55)" }}>
                        📅 {selectedEntry.displayDate}
                      </div>
                    )}
                    {selectedEntry.passingYear && (
                      <div style={{ padding: "3px 10px", borderRadius: 18, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", fontSize: 10, color: "rgba(255,255,255,0.45)" }}>
                        {selectedEntry.passingYear}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => { setSelectedEntry(null); setShowDedicate(false); }}
                  style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0, background: "rgba(255,255,255,0.07)", border: "none", color: "rgba(255,255,255,0.52)", cursor: "pointer", fontSize: 14, marginTop: 2 }}
                >✕</button>
              </div>

              {/* Stats row */}
              <div style={{
                display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
                gap: 8, marginBottom: 18,
              }}>
                {[
                  { icon: "🕯", label: "Candles", value: hashNum(selectedEntry.id, 3, 28) },
                  { icon: "👁", label: "Visitors", value: hashNum(selectedEntry.id + "v", 8, 60) },
                  { icon: "📖", label: "Learners", value: selectedEntry.learners.length },
                ].map(stat => (
                  <div key={stat.label} style={{
                    background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 14, padding: "10px 8px", textAlign: "center",
                  }}>
                    <div style={{ fontSize: 18, marginBottom: 3 }}>{stat.icon}</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: "#D4AF37", lineHeight: 1 }}>{stat.value}</div>
                    <div style={{ fontSize: 8, color: "rgba(255,255,255,0.35)", marginTop: 3, letterSpacing: "0.06em" }}>{stat.label.toUpperCase()}</div>
                  </div>
                ))}
              </div>

              {/* Lit by */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.12em", color: "rgba(212,175,55,0.62)", marginBottom: 6 }}>LIT BY</div>
                <div style={{ padding: "8px 12px", borderRadius: 12, background: "rgba(212,175,55,0.07)", border: "1px solid rgba(212,175,55,0.18)", fontSize: 12, color: "rgba(212,175,55,0.82)", display: "flex", alignItems: "center", gap: 6 }}>
                  🕯 {selectedEntry.donorDisplayName}
                </div>
              </div>

              {/* Message */}
              {selectedEntry.message && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.12em", color: "rgba(255,255,255,0.4)", marginBottom: 6 }}>MEMORIAL MESSAGE</div>
                  <div style={{ padding: "12px 14px", borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", fontSize: 13, color: "rgba(255,255,255,0.62)", fontStyle: "italic", lineHeight: 1.65 }}>
                    "{selectedEntry.message}"
                  </div>
                </div>
              )}

              {/* Learners */}
              {selectedEntry.learners.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.12em", color: "rgba(167,139,250,0.7)", marginBottom: 8 }}>ACTIVE DEDICATIONS</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {selectedEntry.learners.map((l, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.88 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.07 }}
                        style={{ padding: "5px 12px", borderRadius: 16, background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.2)", fontSize: 11, color: "rgba(167,139,250,0.88)" }}
                      >
                        📖 {l.learnerName} · {l.studySubject}
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              {/* Divider */}
              <div style={{ height: 1, background: "rgba(255,255,255,0.07)", margin: "18px 0" }} />

              {/* Dedicate learning */}
              <motion.button
                onClick={() => setShowDedicate(!showDedicate)}
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.985 }}
                style={{
                  width: "100%", padding: "13px 0", marginBottom: showDedicate ? 16 : 0,
                  background: showDedicate ? "rgba(167,139,250,0.15)" : "rgba(167,139,250,0.08)",
                  border: `1px solid rgba(167,139,250,${showDedicate ? "0.42" : "0.25"})`,
                  borderRadius: 16, fontSize: 13, fontWeight: 700, color: "rgba(167,139,250,0.92)",
                  cursor: "pointer", transition: "all 0.2s",
                }}
              >
                📖 Dedicate Learning in their Memory
              </motion.button>

              <AnimatePresence>
                {showDedicate && !dedicateSuccess && (
                  <motion.div
                    key="dedicate-form"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.22 }}
                    style={{ overflow: "hidden" }}
                  >
                    <div style={{ paddingTop: 4 }}>
                      {[
                        { label: "YOUR NAME *", key: "learnerName", placeholder: "Your name" },
                        { label: "SUBJECT OF STUDY *", key: "studySubject", placeholder: "e.g. Mishnah, Tehillim, Talmud…" },
                      ].map(f => (
                        <div key={f.key} style={{ marginBottom: 12 }}>
                          <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", color: "rgba(212,175,55,0.65)", marginBottom: 6 }}>{f.label}</div>
                          <input type="text" value={(dedicateForm as any)[f.key]} onChange={e => setDedicateForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} className="ms-input" />
                        </div>
                      ))}
                      <motion.button
                        onClick={handleDedicate}
                        disabled={dedicateSaving || !dedicateForm.learnerName.trim() || !dedicateForm.studySubject.trim()}
                        whileHover={!dedicateSaving ? { scale: 1.015 } : {}}
                        whileTap={!dedicateSaving ? { scale: 0.985 } : {}}
                        style={{
                          width: "100%", padding: "14px 0",
                          background: dedicateSaving ? "rgba(167,139,250,0.22)" : "linear-gradient(135deg, #a78bfa, #7c3aed)",
                          border: "none", borderRadius: 14, fontSize: 14, fontWeight: 800, color: "#fff",
                          cursor: dedicateSaving ? "default" : "pointer", opacity: dedicateSaving ? 0.7 : 1, transition: "opacity 0.2s",
                        }}
                      >
                        {dedicateSaving ? "Dedicating…" : "📖 Dedicate"}
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {dedicateSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ textAlign: "center", padding: "14px 0", fontSize: 14, color: "rgba(167,139,250,0.92)", fontWeight: 700 }}
                >
                  ✓ Dedication recorded — may it be for a blessing
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
