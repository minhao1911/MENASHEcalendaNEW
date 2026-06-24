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
type SceneTab = "valley" | "garden" | "waterfall" | "sanctuary" | "sunset";
type RightNav = "home" | "memorials" | "flowers" | "messages" | "music";

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
function formatTime() {
  return new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

/* ═══════════════════ KEYFRAMES ═════════════════════════════════════════════ */
const STYLES = `
  @keyframes ms-flicker { 0%,100%{filter:drop-shadow(0 0 14px rgba(255,180,40,0.6))} 50%{filter:drop-shadow(0 0 28px rgba(255,140,20,0.95))} }
  @keyframes ms-bar { from{width:18%} to{width:92%} }
  @keyframes ms-pulse-gold { 0%,100%{box-shadow:0 0 18px rgba(212,175,55,0.35),0 0 0 2px rgba(212,175,55,0.15)} 50%{box-shadow:0 0 40px rgba(212,175,55,0.65),0 0 0 2px rgba(212,175,55,0.35)} }
  @keyframes ms-float { 0%,100%{transform:translateX(-50%) translateY(0px)} 50%{transform:translateX(-50%) translateY(-6px)} }
  @keyframes ms-glow-heart { 0%,100%{filter:drop-shadow(0 0 3px rgba(255,100,100,0.5))} 50%{filter:drop-shadow(0 0 10px rgba(255,60,60,1))} }
  @keyframes ms-shimmer { 0%{opacity:0.5} 50%{opacity:1} 100%{opacity:0.5} }
  .ms-input {
    width:100%; padding:12px 15px; box-sizing:border-box;
    background:rgba(8,4,22,0.78); border:1px solid rgba(212,175,55,0.22);
    border-radius:13px; color:#fff; font-size:14px; outline:none;
    font-family:inherit; transition:border-color 0.2s; backdrop-filter:blur(8px);
  }
  .ms-input:focus { border-color:rgba(212,175,55,0.55); }
  .ms-input::placeholder { color:rgba(255,255,255,0.26); }
  input[type="date"].ms-input::-webkit-calendar-picker-indicator { filter:invert(0.65) sepia(1) saturate(2) hue-rotate(8deg); }
  textarea.ms-input { resize:none; line-height:1.58; }
  .ms-search-input {
    flex:1; background:transparent; border:none; outline:none;
    color:#fff; font-size:14px; font-family:inherit;
  }
  .ms-search-input::placeholder { color:rgba(255,255,255,0.42); }
  .ms-tab-btn { background:none; border:none; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:4px; padding:8px 0; transition:opacity 0.2s; }
  .ms-rnav-btn { background:none; border:none; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:4px; padding:10px 6px; transition:all 0.2s; border-radius:12px; width:56px; }
  .ms-rnav-btn:hover { background:rgba(255,255,255,0.08); }
  .ms-scroll-strip::-webkit-scrollbar { display:none; }
`;

/* ═══════════════════ LOADING SCREEN ════════════════════════════════════════ */
function ValleyLoading() {
  return (
    <div style={{
      position: "absolute", inset: 0,
      background: "linear-gradient(168deg, #b05822 0%, #e08830 18%, #f0b850 35%, #e8d890 52%, #b8d498 72%, #6a9a70 100%)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20,
    }}>
      <div style={{ fontSize: 58, animation: "ms-flicker 1.8s ease-in-out infinite" }}>🕯</div>
      <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.22em", color: "rgba(35,18,0,0.7)", textTransform: "uppercase" }}>
        Entering the Sanctuary
      </div>
      <div style={{ width: 140, height: 3, borderRadius: 2, background: "rgba(180,140,40,0.2)", overflow: "hidden" }}>
        <div style={{ height: "100%", borderRadius: 2, background: "linear-gradient(90deg,#D4AF37,#f5d982)", animation: "ms-bar 1.6s ease-in-out infinite alternate" }} />
      </div>
    </div>
  );
}

/* ═══════════════════ FLOATING MEMORIAL TOOLTIP ══════════════════════════════ */
function FloatingMemorialTooltip({ entry }: { entry: CommunityYahrzeitEntry }) {
  const name = entry.deceasedName.split("·")[0].trim();
  return (
    <div
      style={{
        position: "absolute",
        left: "50%", top: "50%",
        zIndex: 30,
        background: "rgba(10,6,26,0.84)",
        backdropFilter: "blur(22px) saturate(1.5)",
        border: "1px solid rgba(212,175,55,0.32)",
        borderRadius: 50,
        padding: "10px 24px",
        display: "flex", alignItems: "center", gap: 10,
        boxShadow: "0 8px 36px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.07)",
        animation: "ms-float 3.2s ease-in-out infinite",
        pointerEvents: "none",
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.52)", letterSpacing: "0.1em", fontWeight: 600 }}>
        In Loving Memory
      </span>
      <span style={{ fontSize: 14, animation: "ms-glow-heart 2s ease-in-out infinite" }}>❤️</span>
      <span style={{ fontSize: 14, fontWeight: 800, color: "#fff" }}>{name}</span>
    </div>
  );
}

/* ═══════════════════ RIGHT NAV PANEL ════════════════════════════════════════ */
const R_NAV_ITEMS: { key: RightNav; icon: string; label: string }[] = [
  { key: "home",      icon: "🏛️", label: "Home" },
  { key: "memorials", icon: "🕯️", label: "Memorials" },
  { key: "flowers",   icon: "🌸", label: "Flowers" },
  { key: "messages",  icon: "💬", label: "Messages" },
  { key: "music",     icon: "🎵", label: "Music" },
];

function RightNavPanel({ active, onSelect }: { active: RightNav; onSelect: (k: RightNav) => void }) {
  return (
    <div style={{
      position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
      zIndex: 20,
      background: "rgba(6,3,18,0.82)",
      backdropFilter: "blur(24px) saturate(1.6)",
      border: "1px solid rgba(255,255,255,0.11)",
      borderRadius: 22,
      display: "flex", flexDirection: "column", alignItems: "center",
      padding: "6px 0",
      boxShadow: "0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)",
    }}>
      {R_NAV_ITEMS.map(({ key, icon, label }, i) => (
        <button
          key={key}
          className="ms-rnav-btn"
          onClick={() => onSelect(key)}
          style={{ opacity: active === key ? 1 : 0.5 }}
        >
          <span style={{ fontSize: 20 }}>{icon}</span>
          <span style={{
            fontSize: 8, letterSpacing: "0.04em",
            color: active === key ? "#D4AF37" : "rgba(255,255,255,0.5)",
            fontWeight: active === key ? 800 : 500,
          }}>{label}</span>
          {active === key && (
            <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#D4AF37", marginTop: -2 }} />
          )}
          {i < R_NAV_ITEMS.length - 1 && (
            <div style={{ width: 30, height: 1, background: "rgba(255,255,255,0.06)", marginTop: 4 }} />
          )}
        </button>
      ))}
    </div>
  );
}

/* ═══════════════════ BOTTOM SCENE TABS ══════════════════════════════════════ */
const SCENE_TABS: { key: SceneTab; icon: string; label: string }[] = [
  { key: "valley",    icon: "🏔️", label: "Valley" },
  { key: "garden",    icon: "🌿", label: "Garden" },
  { key: "waterfall", icon: "💧", label: "Waterfall" },
  { key: "sanctuary", icon: "🕍", label: "Sanctuary" },
  { key: "sunset",    icon: "🌅", label: "Sunset" },
];

function BottomSceneTabs({ active, onSelect }: { active: SceneTab; onSelect: (s: SceneTab) => void }) {
  return (
    <div style={{
      position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 20,
      background: "rgba(5,3,14,0.9)",
      backdropFilter: "blur(24px) saturate(1.5)",
      borderTop: "1px solid rgba(255,255,255,0.08)",
      display: "flex", alignItems: "center", justifyContent: "space-around",
      paddingBottom: "calc(6px + env(safe-area-inset-bottom, 0px))",
      paddingTop: 4,
    }}>
      {SCENE_TABS.map(({ key, icon, label }) => (
        <button key={key} className="ms-tab-btn" onClick={() => onSelect(key)} style={{ flex: 1 }}>
          <span style={{ fontSize: 22, opacity: active === key ? 1 : 0.4 }}>{icon}</span>
          <span style={{
            fontSize: 10, fontWeight: active === key ? 800 : 500, letterSpacing: "0.04em",
            color: active === key ? "#D4AF37" : "rgba(255,255,255,0.4)",
          }}>{label}</span>
          {active === key && (
            <div style={{ width: 22, height: 2, borderRadius: 1, background: "#D4AF37", marginTop: -1 }} />
          )}
        </button>
      ))}
    </div>
  );
}

/* ═══════════════════ INTERACTION HINTS ══════════════════════════════════════ */
function InteractionHints({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 16 }}
          transition={{ delay: 1.4, duration: 0.5 }}
          style={{
            position: "absolute", bottom: 72, right: 14, zIndex: 20,
            background: "rgba(6,3,18,0.86)",
            backdropFilter: "blur(22px)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 18,
            padding: "12px 16px",
            display: "flex", flexDirection: "column", gap: 9,
            boxShadow: "0 8px 36px rgba(0,0,0,0.5)",
          }}
        >
          {[
            { icon: "🤚", text: "Drag to pan" },
            { icon: "🤌", text: "Pinch to zoom" },
            { icon: "🕯️", text: "Tap to light candle" },
          ].map(({ icon, text }) => (
            <div key={text} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 16 }}>{icon}</span>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.65)", fontWeight: 500, whiteSpace: "nowrap" }}>{text}</span>
            </div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ═══════════════════ LEFT STATS PANEL ═══════════════════════════════════════ */
function LeftStatsPanel({ candleCount, visitorCount }: { candleCount: number; visitorCount: number }) {
  return (
    <div style={{
      position: "absolute", left: 14, top: 76, zIndex: 20,
      display: "flex", flexDirection: "column", gap: 8,
    }}>
      {[
        { icon: "🕯️", value: candleCount.toLocaleString(), label: "Candles Lit" },
        { icon: "👥", value: visitorCount.toLocaleString(), label: "Visitors Today" },
      ].map(({ icon, value, label }) => (
        <div key={label} style={{
          background: "rgba(6,3,18,0.82)",
          backdropFilter: "blur(22px) saturate(1.5)",
          border: "1px solid rgba(255,255,255,0.11)",
          borderRadius: 16,
          padding: "10px 16px",
          display: "flex", alignItems: "center", gap: 12,
          boxShadow: "0 4px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
          minWidth: 148,
        }}>
          <span style={{ fontSize: 24 }}>{icon}</span>
          <div>
            <div style={{ fontSize: 19, fontWeight: 900, color: "#fff", lineHeight: 1, animation: "ms-shimmer 4s ease-in-out infinite" }}>{value}</div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", letterSpacing: "0.06em", marginTop: 3 }}>{label}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════ TOP HEADER ═════════════════════════════════════════════ */
function TopHeader({
  searchQuery, setSearchQuery, searchRef, onClose,
}: {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  searchRef: React.RefObject<HTMLInputElement>;
  onClose: () => void;
}) {
  const [time, setTime] = useState(formatTime());
  useEffect(() => {
    const iv = setInterval(() => setTime(formatTime()), 30000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div style={{
      position: "absolute", top: 0, left: 0, right: 0, zIndex: 30,
      background: "linear-gradient(to bottom, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.35) 85%, transparent 100%)",
      padding: "12px 14px 28px",
      display: "flex", alignItems: "center", gap: 10,
    }}>
      {/* Left: Brand */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
        background: "rgba(6,3,18,0.72)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(212,175,55,0.28)",
        borderRadius: 14,
        padding: "8px 12px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.45)",
      }}>
        <span style={{ fontSize: 22 }}>🕯️</span>
        <div>
          <div style={{ fontSize: 10, fontWeight: 900, color: "#fff", letterSpacing: "0.06em", lineHeight: 1 }}>
            COMMUNITY MEMORIAL
          </div>
          <div style={{ fontSize: 8, color: "rgba(255,215,100,0.6)", letterSpacing: "0.05em", marginTop: 2 }}>
            A Valley of Remembrance & Love
          </div>
        </div>
      </div>

      {/* Center: Search */}
      <div style={{
        flex: 1,
        background: "rgba(6,3,18,0.68)",
        backdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: 28, display: "flex", alignItems: "center", gap: 8,
        padding: "0 14px", height: 40,
        boxShadow: "0 2px 14px rgba(0,0,0,0.35)",
      }}>
        <span style={{ fontSize: 14, opacity: 0.55 }}>🔍</span>
        <input
          ref={searchRef}
          className="ms-search-input"
          placeholder="Search for a loved one..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 14, padding: 0, flexShrink: 0 }}
          >✕</button>
        )}
      </div>

      {/* Right: Time + Close */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <div style={{
          background: "rgba(6,3,18,0.82)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 14,
          padding: "7px 12px",
          display: "flex", alignItems: "center", gap: 8,
          boxShadow: "0 2px 12px rgba(0,0,0,0.35)",
        }}>
          <span style={{ fontSize: 16 }}>☀️</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", lineHeight: 1 }}>{time}</div>
            <div style={{ fontSize: 8, color: "rgba(255,210,80,0.7)", letterSpacing: "0.06em", marginTop: 1 }}>Golden Hour</div>
          </div>
          <button
            onClick={onClose}
            style={{
              marginLeft: 6, width: 28, height: 28, borderRadius: "50%",
              background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: 800,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}
          >✕</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════ SEARCH RESULTS DROPDOWN ════════════════════════════════ */
function SearchResults({
  results, onSelect, onClose,
}: { results: CommunityYahrzeitEntry[]; onSelect: (e: CommunityYahrzeitEntry) => void; onClose: () => void }) {
  if (!results.length) return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      style={{
        position: "absolute", top: 72, left: 14, right: 14, zIndex: 25,
        background: "rgba(6,3,20,0.96)", backdropFilter: "blur(28px)",
        border: "1px solid rgba(212,175,55,0.18)", borderRadius: 18,
        padding: "18px 16px", textAlign: "center",
        boxShadow: "0 16px 56px rgba(0,0,0,0.6)",
      }}
    >
      <div style={{ fontSize: 28, marginBottom: 8 }}>🔍</div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)" }}>No memorials found</div>
      <button onClick={onClose} style={{ marginTop: 12, fontSize: 11, color: "rgba(212,175,55,0.7)", background: "none", border: "none", cursor: "pointer" }}>Clear search</button>
    </motion.div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      style={{
        position: "absolute", top: 72, left: 14, right: 14, zIndex: 25,
        background: "rgba(6,3,20,0.97)", backdropFilter: "blur(28px)",
        border: "1px solid rgba(212,175,55,0.22)", borderRadius: 20,
        overflow: "hidden", boxShadow: "0 16px 56px rgba(0,0,0,0.65)",
        maxHeight: 330, overflowY: "auto",
      }}
    >
      <div style={{ padding: "10px 16px 6px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.14em", color: "rgba(212,175,55,0.72)" }}>
          {results.length} MEMORIAL{results.length !== 1 ? "S" : ""} FOUND
        </span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 13 }}>✕</button>
      </div>
      {results.map((entry, i) => {
        const name = entry.deceasedName.split("·")[0].trim();
        return (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            onClick={() => onSelect(entry)}
            whileHover={{ background: "rgba(212,175,55,0.07)" }}
            style={{
              padding: "12px 16px", display: "flex", alignItems: "center", gap: 12,
              borderTop: "1px solid rgba(255,255,255,0.05)", cursor: "pointer",
            }}
          >
            <div style={{
              width: 38, height: 38, borderRadius: 12, flexShrink: 0,
              background: "linear-gradient(135deg,#D4AF37,#7a5800)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 13, fontWeight: 900, color: "#fff",
            }}>{initials(name)}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.36)", marginTop: 2 }}>
                {entry.displayDate || ""}{entry.passingYear ? ` · ${entry.passingYear}` : ""}
              </div>
            </div>
            <span style={{ fontSize: 18 }}>🕯️</span>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

/* ═══════════════════ LIGHT A CANDLE FORM ════════════════════════════════════ */
function LightCandleForm({
  form, setForm, saving, success, onSubmit, onClose,
}: {
  form: { name: string; hebrewName: string; message: string; date: string };
  setForm: (f: any) => void;
  saving: boolean; success: boolean;
  onSubmit: () => void; onClose: () => void;
}) {
  return (
    <motion.div
      key="candle-form"
      initial={{ y: "100%", opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: "100%", opacity: 0 }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      onClick={e => e.stopPropagation()}
      style={{
        position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 50,
        borderRadius: "28px 28px 0 0",
        background: "linear-gradient(180deg, rgba(6,3,20,0.98) 0%, rgba(4,2,14,1) 100%)",
        backdropFilter: "blur(30px)",
        border: "1px solid rgba(212,175,55,0.3)", borderBottom: "none",
        maxHeight: "80dvh", overflowY: "auto",
        boxShadow: "0 -20px 70px rgba(0,0,0,0.65), 0 -1px 0 rgba(212,175,55,0.15)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "center", padding: "14px 0 4px" }}>
        <div style={{ width: 44, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.1)" }} />
      </div>
      <div style={{ padding: "6px 22px 40px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ animation: "ms-flicker 1.8s infinite" }}>🕯</span> Light a Candle
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.36)", marginTop: 4 }}>Honor a loved one in the sanctuary</div>
          </div>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.07)", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 14 }}>✕</button>
        </div>

        <AnimatePresence>
          {success ? (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              style={{ textAlign: "center", padding: "32px 0" }}>
              <div style={{ fontSize: 56, marginBottom: 16, animation: "ms-flicker 1.8s infinite" }}>🕯</div>
              <div style={{ fontSize: 19, fontWeight: 800, color: "#D4AF37", marginBottom: 8 }}>Candle Lit</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", lineHeight: 1.7 }}>
                May their memory be a blessing<br />
                <span style={{ fontFamily: "'Noto Serif Hebrew',serif", fontSize: 17, color: "rgba(212,175,55,0.82)" }}>יהי זכרם ברוך</span>
              </div>
            </motion.div>
          ) : (
            <motion.div key="form">
              {[
                { label: "FULL NAME *", key: "name", placeholder: "Name of the departed", type: "text" },
                { label: "HEBREW NAME", key: "hebrewName", placeholder: "שם בעברית (optional)", type: "text" },
                { label: "DATE OF PASSING *", key: "date", placeholder: "", type: "date" },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", color: "rgba(212,175,55,0.65)", marginBottom: 6 }}>{f.label}</div>
                  <input type={f.type} value={(form as any)[f.key]}
                    onChange={e => setForm((p: any) => ({ ...p, [f.key]: e.target.value }))}
                    placeholder={f.placeholder} className="ms-input" />
                </div>
              ))}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", color: "rgba(212,175,55,0.65)", marginBottom: 6 }}>MEMORIAL MESSAGE</div>
                <textarea value={form.message}
                  onChange={e => setForm((p: any) => ({ ...p, message: e.target.value }))}
                  placeholder="Share a memory or blessing..." rows={3} className="ms-input" />
              </div>
              <motion.button
                onClick={onSubmit}
                disabled={saving || !form.name.trim() || !form.date}
                whileHover={!saving ? { scale: 1.015 } : {}}
                whileTap={!saving ? { scale: 0.985 } : {}}
                style={{
                  width: "100%", padding: "16px 0",
                  background: saving ? "rgba(212,175,55,0.25)" : "linear-gradient(135deg,#D4AF37 0%,#8a6000 100%)",
                  border: "none", borderRadius: 16, fontSize: 15, fontWeight: 800,
                  color: saving ? "rgba(255,255,255,0.5)" : "#0F1829",
                  cursor: saving || !form.name.trim() || !form.date ? "default" : "pointer",
                  opacity: !form.name.trim() || !form.date ? 0.55 : 1,
                  boxShadow: saving ? "none" : "0 6px 24px rgba(212,175,55,0.35)",
                  transition: "all 0.2s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
              >
                <span>🕯</span>{saving ? "Lighting candle…" : "Light the Candle"}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

/* ═══════════════════ MEMORIAL PROFILE SHEET ══════════════════════════════════ */
function MemorialProfileSheet({
  entry, onClose,
  showDedicate, setShowDedicate,
  dedicateForm, setDedicateForm,
  dedicateSaving, dedicateSuccess,
  onDedicate,
}: {
  entry: CommunityYahrzeitEntry; onClose: () => void;
  showDedicate: boolean; setShowDedicate: (v: boolean) => void;
  dedicateForm: { learnerName: string; studySubject: string };
  setDedicateForm: (f: any) => void;
  dedicateSaving: boolean; dedicateSuccess: boolean;
  onDedicate: () => void;
}) {
  const name     = entry.deceasedName.split("·")[0].trim();
  const hebrew   = entry.deceasedName.includes("·") ? entry.deceasedName.split("·")[1]?.trim() : null;
  const candleN  = hashNum(entry.id, 100, 1200);
  const flowerN  = hashNum(entry.id + "f", 50, 400);
  const visitorN = hashNum(entry.id + "v", 500, 9000);

  return (
    <motion.div
      key="profile-sheet"
      initial={{ y: "100%", opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: "100%", opacity: 0 }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      onClick={e => e.stopPropagation()}
      style={{
        position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 50,
        borderRadius: "28px 28px 0 0",
        background: "linear-gradient(180deg, rgba(6,3,20,0.98) 0%, rgba(4,2,14,1) 100%)",
        backdropFilter: "blur(30px)",
        border: "1px solid rgba(212,175,55,0.28)", borderBottom: "none",
        maxHeight: "84dvh", overflowY: "auto",
        boxShadow: "0 -20px 70px rgba(0,0,0,0.65), 0 -1px 0 rgba(212,175,55,0.12)",
      }}
    >
      {/* Handle */}
      <div style={{ display: "flex", justifyContent: "center", padding: "14px 0 4px" }}>
        <div style={{ width: 44, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.1)" }} />
      </div>

      <div style={{ padding: "8px 22px 50px" }}>
        {/* Avatar + name */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 22 }}>
          <div style={{
            width: 74, height: 74, borderRadius: 22, flexShrink: 0,
            background: "linear-gradient(135deg,#D4AF37 0%,#6a4a00 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 28, fontWeight: 900, color: "#fff",
            border: "2px solid rgba(212,175,55,0.4)",
            animation: "ms-pulse-gold 3s ease-in-out infinite",
          }}>{initials(name)}</div>

          <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", lineHeight: 1.15, marginBottom: 5 }}>{name}</div>
            {hebrew && (
              <div style={{ fontSize: 16, fontFamily: "'Noto Serif Hebrew',serif", color: "rgba(212,175,55,0.85)", marginBottom: 6 }}>{hebrew}</div>
            )}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {entry.displayDate && (
                <div style={{ padding: "3px 10px", borderRadius: 18, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", fontSize: 10, color: "rgba(255,255,255,0.5)" }}>
                  📅 {entry.displayDate}
                </div>
              )}
              {entry.passingYear && (
                <div style={{ padding: "3px 10px", borderRadius: 18, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", fontSize: 10, color: "rgba(255,255,255,0.4)" }}>
                  {entry.passingYear}
                </div>
              )}
            </div>
          </div>

          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: "50%", flexShrink: 0, background: "rgba(255,255,255,0.07)", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 14, marginTop: 2 }}>✕</button>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
          {[
            { icon: "🕯️", label: "Candles", value: candleN.toLocaleString(), color: "#D4AF37" },
            { icon: "🌹", label: "Flowers", value: flowerN.toLocaleString(), color: "#f87171" },
            { icon: "👥", label: "Visitors", value: visitorN.toLocaleString(), color: "rgba(255,255,255,0.7)" },
          ].map(s => (
            <div key={s.label} style={{
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16, padding: "12px 8px", textAlign: "center",
            }}>
              <div style={{ fontSize: 22, marginBottom: 5 }}>{s.icon}</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", marginTop: 4, letterSpacing: "0.06em" }}>{s.label.toUpperCase()}</div>
            </div>
          ))}
        </div>

        {/* Lit by */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.12em", color: "rgba(212,175,55,0.62)", marginBottom: 6 }}>LIT BY</div>
          <div style={{ padding: "10px 14px", borderRadius: 14, background: "rgba(212,175,55,0.07)", border: "1px solid rgba(212,175,55,0.18)", fontSize: 13, color: "rgba(212,175,55,0.88)", display: "flex", alignItems: "center", gap: 8 }}>
            🕯️ {entry.donorDisplayName}
          </div>
        </div>

        {/* Message */}
        {entry.message && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.12em", color: "rgba(255,255,255,0.38)", marginBottom: 6 }}>MEMORIAL MESSAGE</div>
            <div style={{
              padding: "14px 16px 14px 26px", borderRadius: 16,
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
              fontSize: 13, color: "rgba(255,255,255,0.6)", fontStyle: "italic", lineHeight: 1.7,
              position: "relative",
            }}>
              <span style={{ position: "absolute", top: 4, left: 10, fontSize: 28, color: "rgba(212,175,55,0.18)", fontFamily: "Georgia,serif", lineHeight: 1 }}>"</span>
              {entry.message}
            </div>
          </div>
        )}

        {/* Hebrew blessing */}
        <div style={{
          textAlign: "center", padding: "16px 0",
          borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "1px solid rgba(255,255,255,0.06)",
          marginBottom: 18,
        }}>
          <div style={{ fontFamily: "'Noto Serif Hebrew',serif", fontSize: 21, color: "rgba(212,175,55,0.84)", letterSpacing: "0.04em" }}>
            יהי זכרם ברוך
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 5, letterSpacing: "0.04em" }}>
            May their memory be a blessing
          </div>
        </div>

        {/* Learners */}
        {entry.learners.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.12em", color: "rgba(167,139,250,0.7)", marginBottom: 8 }}>DEDICATED LEARNING</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {entry.learners.map((l, i) => (
                <div key={i} style={{ padding: "5px 12px", borderRadius: 16, background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.2)", fontSize: 11, color: "rgba(167,139,250,0.88)" }}>
                  📖 {l.learnerName} · {l.studySubject}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Divider */}
        <div style={{ height: 1, background: "rgba(255,255,255,0.07)", marginBottom: 16 }} />

        {/* Leave tribute */}
        <motion.button
          onClick={() => setShowDedicate(!showDedicate)}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          style={{
            width: "100%", padding: "14px 0", marginBottom: showDedicate ? 14 : 0,
            background: showDedicate ? "rgba(167,139,250,0.14)" : "rgba(167,139,250,0.07)",
            border: `1px solid rgba(167,139,250,${showDedicate ? "0.42" : "0.22"})`,
            borderRadius: 16, fontSize: 14, fontWeight: 700,
            color: "rgba(167,139,250,0.92)", cursor: "pointer", transition: "all 0.2s",
          }}
        >
          📖 Leave a Tribute
        </motion.button>

        <AnimatePresence>
          {showDedicate && !dedicateSuccess && (
            <motion.div key="dedicate-form" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} style={{ overflow: "hidden" }}>
              <div style={{ paddingTop: 4 }}>
                {[
                  { label: "YOUR NAME *", key: "learnerName", placeholder: "Your name" },
                  { label: "SUBJECT OF STUDY *", key: "studySubject", placeholder: "e.g. Mishnah, Tehillim, Talmud…" },
                ].map(f => (
                  <div key={f.key} style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", color: "rgba(212,175,55,0.65)", marginBottom: 6 }}>{f.label}</div>
                    <input type="text" value={(dedicateForm as any)[f.key]}
                      onChange={e => setDedicateForm((p: any) => ({ ...p, [f.key]: e.target.value }))}
                      placeholder={f.placeholder} className="ms-input" />
                  </div>
                ))}
                <motion.button
                  onClick={onDedicate}
                  disabled={dedicateSaving || !dedicateForm.learnerName.trim() || !dedicateForm.studySubject.trim()}
                  whileHover={!dedicateSaving ? { scale: 1.01 } : {}}
                  whileTap={!dedicateSaving ? { scale: 0.99 } : {}}
                  style={{
                    width: "100%", padding: "14px 0",
                    background: dedicateSaving ? "rgba(167,139,250,0.22)" : "linear-gradient(135deg,#a78bfa,#7c3aed)",
                    border: "none", borderRadius: 14, fontSize: 14, fontWeight: 800, color: "#fff",
                    cursor: dedicateSaving ? "default" : "pointer",
                    opacity: dedicateSaving ? 0.7 : 1, transition: "opacity 0.2s",
                  }}
                >
                  {dedicateSaving ? "Submitting…" : "📖 Dedicate"}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {dedicateSuccess && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            style={{ textAlign: "center", padding: "14px 0", fontSize: 13, color: "rgba(167,139,250,0.92)", fontWeight: 700 }}>
            ✓ Tribute recorded — may it be for a blessing
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

/* ═══════════════════ HORIZONTAL MEMORIAL STRIP ═════════════════════════════ */
function MemorialScrollStrip({
  entries, onSelect,
}: { entries: CommunityYahrzeitEntry[]; onSelect: (e: CommunityYahrzeitEntry) => void }) {
  if (!entries.length) return null;
  return (
    <div
      className="ms-scroll-strip"
      style={{
        position: "absolute", bottom: 60, left: 0, right: 0, zIndex: 15,
        overflowX: "auto", overflowY: "hidden",
        display: "flex", gap: 10, padding: "6px 14px 10px",
        scrollbarWidth: "none",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {entries.map((entry, i) => {
        const name = entry.deceasedName.split("·")[0].trim();
        const candleN = hashNum(entry.id, 3, 28);
        return (
          <motion.div key={entry.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => onSelect(entry)}
            whileHover={{ scale: 1.03, borderColor: "rgba(212,175,55,0.5)" }}
            whileTap={{ scale: 0.97 }}
            style={{
              flexShrink: 0, width: 154, cursor: "pointer",
              background: "rgba(6,3,18,0.84)", backdropFilter: "blur(20px)",
              border: "1px solid rgba(212,175,55,0.2)", borderRadius: 18,
              padding: "12px", boxShadow: "0 6px 24px rgba(0,0,0,0.4)",
              transition: "border-color 0.2s",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                background: "linear-gradient(135deg,#D4AF37,#7a5800)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 900, color: "#fff",
              }}>{initials(name)}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
            </div>
            {entry.displayDate && (
              <div style={{ fontSize: 8, color: "rgba(255,255,255,0.36)", marginBottom: 6 }}>📅 {entry.displayDate}</div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontSize: 10 }}>🕯</span>
              <span style={{ fontSize: 10, color: "rgba(212,175,55,0.8)", fontWeight: 700 }}>{candleN} candles</span>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ═══════════════════ MAIN COMPONENT ════════════════════════════════════════ */
export default function MemorialSanctuaryModal({ onClose, userName, initialEntries = [] }: Props) {
  const [entries, setEntries]               = useState<CommunityYahrzeitEntry[]>(initialEntries);
  const [placedCandles, setPlacedCandles]   = useState<Candle[]>([]);
  const [selectedEntry, setSelectedEntry]   = useState<CommunityYahrzeitEntry | null>(null);
  const [showForm, setShowForm]             = useState(false);
  const [pendingPos, setPendingPos]         = useState<[number, number, number] | null>(null);
  const [success, setSuccess]               = useState(false);
  const [searchQuery, setSearchQuery]       = useState("");
  const [filterYear]                        = useState("all");
  const [showDedicate, setShowDedicate]     = useState(false);
  const [dedicateSuccess, setDedicateSuccess] = useState(false);
  const [activeScene, setActiveScene]       = useState<SceneTab>("valley");
  const [activeNav, setActiveNav]           = useState<RightNav>("home");
  const [showHints, setShowHints]           = useState(true);
  const [form, setForm]                     = useState({ name: "", hebrewName: "", message: "", date: "" });
  const [saving, setSaving]                 = useState(false);
  const [dedicateForm, setDedicateForm]     = useState({ learnerName: "", studySubject: "" });
  const [dedicateSaving, setDedicateSaving] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null!);

  useEffect(() => { const t = setTimeout(() => setShowHints(false), 7000); return () => clearTimeout(t); }, []);

  const load = useCallback(async () => {
    const data = await fetchCommunityYahrzeit();
    setEntries(data);
  }, []);
  useEffect(() => { if (initialEntries.length === 0) load(); }, []);
  useEffect(() => { const iv = setInterval(load, 30000); return () => clearInterval(iv); }, [load]);

  const handleCandleClick = useCallback((entry: CommunityYahrzeitEntry) => {
    setSelectedEntry(entry);
    setShowForm(false);
    setShowDedicate(false);
    setDedicateSuccess(false);
    setDedicateForm({ learnerName: "", studySubject: "" });
    setShowHints(false);
  }, []);

  const handleGroundClick = useCallback((pos: [number, number, number]) => {
    if (showForm || selectedEntry) return;
    setPendingPos(pos);
    setShowForm(true);
    setShowHints(false);
  }, [showForm, selectedEntry]);

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

  const filtered   = filterEntries(entries, searchQuery, filterYear);
  const totalLit   = entries.length;
  const totalVisitors = hashNum("global-visitors", 4000, 6000);
  const panelOpen  = showForm || !!selectedEntry;
  const showStrip  = activeNav === "memorials" && !searchQuery && !panelOpen;

  return (
    <div
      onClick={e => e.stopPropagation()}
      style={{ position: "fixed", inset: 0, zIndex: 9999, overflow: "hidden", userSelect: "none", fontFamily: "Inter,-apple-system,sans-serif" }}
    >
      <style>{STYLES}</style>

      {/* ── 3D CANVAS ── */}
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

      {/* ── TOP HEADER ── */}
      <TopHeader
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        searchRef={searchRef}
        onClose={onClose}
      />

      {/* ── SEARCH RESULTS ── */}
      <AnimatePresence>
        {searchQuery.trim().length > 0 && (
          <SearchResults
            results={filtered}
            onSelect={e => { setSelectedEntry(e); setSearchQuery(""); }}
            onClose={() => setSearchQuery("")}
          />
        )}
      </AnimatePresence>

      {/* ── LEFT STATS ── */}
      {!panelOpen && (
        <LeftStatsPanel
          candleCount={24832 + totalLit}
          visitorCount={8947 + totalVisitors}
        />
      )}

      {/* ── FLOATING MEMORIAL NAME TOOLTIP ── */}
      <AnimatePresence>
        {selectedEntry && !panelOpen && (
          <FloatingMemorialTooltip entry={selectedEntry} />
        )}
      </AnimatePresence>

      {/* ── RIGHT NAV ── */}
      {!panelOpen && (
        <RightNavPanel
          active={activeNav}
          onSelect={nav => {
            setActiveNav(nav);
            if (nav === "memorials") setTimeout(() => searchRef.current?.focus(), 80);
          }}
        />
      )}

      {/* ── INTERACTION HINTS ── */}
      {!panelOpen && <InteractionHints visible={showHints} />}

      {/* ── MEMORIAL SCROLL STRIP ── */}
      <AnimatePresence>
        {showStrip && (
          <MemorialScrollStrip
            entries={entries.slice(0, 20)}
            onSelect={e => { setSelectedEntry(e); setActiveNav("home"); }}
          />
        )}
      </AnimatePresence>

      {/* ── BOTTOM SCENE TABS ── */}
      {!panelOpen && (
        <BottomSceneTabs active={activeScene} onSelect={setActiveScene} />
      )}

      {/* ── LIGHT A CANDLE FORM ── */}
      <AnimatePresence>
        {showForm && (
          <LightCandleForm
            form={form} setForm={setForm}
            saving={saving} success={success}
            onSubmit={handleSubmit}
            onClose={() => { setShowForm(false); setPendingPos(null); }}
          />
        )}
      </AnimatePresence>

      {/* ── MEMORIAL PROFILE ── */}
      <AnimatePresence>
        {selectedEntry && !showForm && (
          <MemorialProfileSheet
            entry={selectedEntry}
            onClose={() => { setSelectedEntry(null); setShowDedicate(false); setDedicateSuccess(false); }}
            showDedicate={showDedicate}
            setShowDedicate={setShowDedicate}
            dedicateForm={dedicateForm}
            setDedicateForm={setDedicateForm}
            dedicateSaving={dedicateSaving}
            dedicateSuccess={dedicateSuccess}
            onDedicate={handleDedicate}
          />
        )}
      </AnimatePresence>

      {/* ── FLOATING "LIGHT A CANDLE" FAB ── */}
      {!panelOpen && !searchQuery && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          onClick={() => { setPendingPos([0, 0.15, 0]); setShowForm(true); }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          style={{
            position: "absolute", bottom: 70, left: "50%",
            transform: "translateX(-50%)",
            zIndex: 20,
            background: "linear-gradient(135deg,#D4AF37 0%,#8a6000 100%)",
            border: "1px solid rgba(255,220,100,0.3)",
            borderRadius: 50, padding: "13px 28px",
            fontSize: 13, fontWeight: 800, color: "#0F1829",
            cursor: "pointer", letterSpacing: "0.04em",
            boxShadow: "0 8px 32px rgba(212,175,55,0.5), 0 2px 10px rgba(0,0,0,0.4)",
            display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap",
          }}
        >
          <span style={{ fontSize: 16, animation: "ms-flicker 2s ease-in-out infinite" }}>🕯</span>
          Light a Candle
        </motion.button>
      )}
    </div>
  );
}
