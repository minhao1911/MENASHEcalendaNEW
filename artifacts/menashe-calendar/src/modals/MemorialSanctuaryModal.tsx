import { useState, useCallback, useEffect, useRef, lazy, Suspense, Component, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HDate } from "@hebcal/core";
import {
  fetchCommunityYahrzeit,
  createCommunityYahrzeit,
  dedicateLearning,
  type CommunityYahrzeitEntry,
} from "../lib/userApi";
import { useLanguage } from "../context/LanguageContext";
import type { SceneViewType, CameraState } from "../components/MemorialValley3D";
import { MinimapOverlay } from "../features/memorial/components/MinimapOverlay";
import { MemorialBrowserPanel } from "./MemorialBrowserPanel";

const MemorialValley3D = lazy(() => import("../components/MemorialValley3D"));

/* ═══════════════════ AMBIENT SOUND HOOK ════════════════════════════════════ */
function useAmbientSound() {
  const [playing, setPlaying]    = useState(false);
  const [volume, setVolumeState] = useState(0.38);
  const ctxRef    = useRef<AudioContext | null>(null);
  const masterRef = useRef<GainNode | null>(null);

  const start = useCallback(() => {
    /* Idempotent guard — never open a second context while one exists */
    if (ctxRef.current) return;
    const ctx = new AudioContext();
    ctxRef.current   = ctx;
    const master     = ctx.createGain();
    master.gain.value = volume;
    master.connect(ctx.destination);
    masterRef.current = master;

    /* Brown noise — wind & water ambience */
    const bufLen = ctx.sampleRate * 6;
    const buffer = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data   = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < bufLen; i++) {
      const w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      data[i] = last * 3.5;
    }
    const noise  = ctx.createBufferSource();
    noise.buffer = buffer; noise.loop = true;
    const nFilt  = ctx.createBiquadFilter();
    nFilt.type = "lowpass"; nFilt.frequency.value = 720;
    const nGain = ctx.createGain(); nGain.gain.value = 0.13;
    noise.connect(nFilt); nFilt.connect(nGain); nGain.connect(master);
    noise.start();

    /* D-major pentatonic drones with LFO tremolo */
    [146.83, 185.00, 220.00, 277.18, 329.63].forEach((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = "sine"; osc.frequency.value = f;
      const g = ctx.createGain(); g.gain.value = 0.016 + i * 0.002;
      const lfo = ctx.createOscillator(); lfo.type = "sine";
      lfo.frequency.value = 0.10 + i * 0.032;
      const lg = ctx.createGain(); lg.gain.value = 0.005;
      lfo.connect(lg); lg.connect(g.gain); lfo.start();
      osc.connect(g); g.connect(master); osc.start();
    });

    setPlaying(true);
  }, [volume]);

  const stop = useCallback(() => {
    ctxRef.current?.close();
    ctxRef.current = null; masterRef.current = null;
    setPlaying(false);
  }, []);

  const toggle = useCallback(() => { playing ? stop() : start(); }, [playing, start, stop]);

  const setVolume = useCallback((v: number) => {
    setVolumeState(v);
    if (masterRef.current) masterRef.current.gain.value = v;
  }, []);

  useEffect(() => () => { ctxRef.current?.close(); }, []);
  return { playing, toggle, volume, setVolume };
}

/* ═══════════════════ R3F ERROR BOUNDARY ════════════════════════════════════
 * Safety net for any surviving R3F / Three.js render errors.
 *
 * The canRender3D mount guard (below) prevents the Zustand store null-context
 * error from ever occurring in the first place.  This boundary is a last-
 * resort catch that shows a retry button — it must NOT auto-reset via a timer
 * because that creates an infinite error loop that fires ~300 ms apart.
 * ════════════════════════════════════════════════════════════════════════════ */
interface EBState { err: boolean }
class R3FErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  state: EBState = { err: false };
  static getDerivedStateFromError(): EBState { return { err: true }; }
  retry = () => this.setState({ err: false });
  render() {
    if (this.state.err) {
      return (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(5,3,2,0.92)", color: "#d4a843", gap: 16 }}>
          <div style={{ fontSize: 36 }}>🕯️</div>
          <div style={{ fontSize: 14, opacity: 0.8 }}>3D scene could not be loaded</div>
          <button onClick={this.retry} style={{ marginTop: 8, padding: "8px 22px", borderRadius: 20, border: "1px solid #d4a843", background: "transparent", color: "#d4a843", cursor: "pointer", fontSize: 13 }}>
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/* ═══════════════════ TYPES ═════════════════════════════════════════════════ */
interface Props {
  onClose: () => void;
  userName?: string | null;
  initialEntries?: CommunityYahrzeitEntry[];
}
interface Candle { pos: [number, number, number]; name: string }
interface VirtualFlower { pos: [number, number, number]; colorIdx: number }
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

/* ═══════════════════ MUSIC PANEL ═══════════════════════════════════════════ */
const FLOWER_PALETTE = ["#ff6b8a","#ff99bb","#c778e8","#ff8833","#55ccaa","#f0c030","#e855a0","#7799ff"];
const FLOWER_NAMES   = ["Rose","Blush","Violet","Marigold","Mint","Sunflower","Peony","Iris"];

function MusicPanel({ sound }: { sound: ReturnType<typeof useAmbientSound> }) {
  const tracks = [
    { icon: "💨", label: "Wind & Leaves",  desc: "Gentle breeze through olive trees" },
    { icon: "💧", label: "Flowing Water",   desc: "River and waterfall ambience"      },
    { icon: "🎹", label: "Soft Piano",      desc: "Peaceful pentatonic melody"        },
    { icon: "🐦", label: "Birdsong",        desc: "Morning birds at sunrise"          },
  ];
  return (
    <motion.div
      key="music-panel"
      initial={{ x: 80, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 80, opacity: 0 }}
      transition={{ type: "spring", damping: 26, stiffness: 280 }}
      onClick={e => e.stopPropagation()}
      style={{
        position: "absolute", right: 80, top: "50%", transform: "translateY(-50%)",
        zIndex: 25, width: 230,
        background: "rgba(6,3,20,0.95)",
        backdropFilter: "blur(28px) saturate(1.6)",
        border: "1px solid rgba(212,175,55,0.28)",
        borderRadius: 22, padding: "18px 16px",
        boxShadow: "0 12px 50px rgba(0,0,0,0.6)",
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", color: "rgba(212,175,55,0.75)", marginBottom: 14 }}>
        🎵  SANCTUARY SOUNDSCAPE
      </div>

      <motion.button
        onClick={sound.toggle}
        whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
        style={{
          width: "100%", padding: "13px 0", marginBottom: 14,
          background: sound.playing
            ? "linear-gradient(135deg,#D4AF37 0%,#8a6000 100%)"
            : "rgba(212,175,55,0.1)",
          border: `1px solid rgba(212,175,55,${sound.playing ? 0 : 0.28})`,
          borderRadius: 14, fontSize: 14, fontWeight: 800,
          color: sound.playing ? "#0f1829" : "#D4AF37",
          cursor: "pointer", transition: "all 0.25s",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}
      >
        {sound.playing ? "⏸ Pause" : "▶ Play Ambient"}
      </motion.button>

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: "rgba(255,255,255,0.38)" }}>VOLUME</span>
          <span style={{ fontSize: 9, color: "rgba(212,175,55,0.7)", fontVariantNumeric: "tabular-nums" }}>{Math.round(sound.volume * 100)}%</span>
        </div>
        <input type="range" min={0} max={1} step={0.01}
          value={sound.volume}
          onChange={e => sound.setVolume(Number(e.target.value))}
          style={{ width: "100%", accentColor: "#D4AF37", cursor: "pointer" }}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {tracks.map((tr, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "8px 10px", borderRadius: 11,
            background: i === 0 && sound.playing ? "rgba(212,175,55,0.08)" : "rgba(255,255,255,0.03)",
            border: `1px solid rgba(255,255,255,${i === 0 && sound.playing ? "0.10" : "0.04"})`,
          }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>{tr.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: i === 0 && sound.playing ? "#D4AF37" : "rgba(255,255,255,0.7)" }}>{tr.label}</div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.28)", marginTop: 1 }}>{tr.desc}</div>
            </div>
            {i === 0 && sound.playing && (
              <div style={{ display: "flex", gap: 2, alignItems: "flex-end", height: 18 }}>
                {[1,2,3,2,1].map((h, j) => (
                  <div key={j} style={{ width: 3, height: h * 4 + 2, borderRadius: 2, background: "#D4AF37", animation: `ms-shimmer ${0.45 + j * 0.12}s ease-in-out infinite` }} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 14, padding: "10px", borderRadius: 11, background: "rgba(255,255,255,0.025)", textAlign: "center" }}>
        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.26)", lineHeight: 1.7 }}>
          Procedural ambient — generated<br/>for peaceful remembrance
        </div>
      </div>
    </motion.div>
  );
}

/* ═══════════════════ FLOWERS PANEL ════════════════════════════════════════ */
function FlowersPanel({ onSelectColor, selectedColor, placedCount }: {
  onSelectColor: (idx: number) => void; selectedColor: number; placedCount: number;
}) {
  return (
    <motion.div
      key="flowers-panel"
      initial={{ x: 80, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 80, opacity: 0 }}
      transition={{ type: "spring", damping: 26, stiffness: 280 }}
      onClick={e => e.stopPropagation()}
      style={{
        position: "absolute", right: 80, top: "50%", transform: "translateY(-50%)",
        zIndex: 25, width: 234,
        background: "rgba(6,3,20,0.95)",
        backdropFilter: "blur(28px) saturate(1.6)",
        border: "1px solid rgba(248,113,113,0.28)",
        borderRadius: 22, padding: "18px 16px",
        boxShadow: "0 12px 50px rgba(0,0,0,0.6)",
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", color: "rgba(248,113,113,0.8)", marginBottom: 4 }}>
        🌸  PLACE A FLOWER
      </div>
      <div style={{ fontSize: 9, color: "rgba(255,255,255,0.32)", marginBottom: 14, lineHeight: 1.5 }}>
        Choose a flower colour then tap the ground to place it in the sanctuary
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 14 }}>
        {FLOWER_PALETTE.map((col, i) => (
          <motion.button
            key={i}
            onClick={() => onSelectColor(i)}
            whileHover={{ scale: 1.14 }}
            whileTap={{ scale: 0.90 }}
            title={FLOWER_NAMES[i]}
            style={{
              width: "100%", aspectRatio: "1", borderRadius: 12, border: "none",
              background: col, cursor: "pointer",
              boxShadow: selectedColor === i
                ? `0 0 0 3px #fff, 0 0 16px ${col}`
                : "0 2px 8px rgba(0,0,0,0.4)",
              opacity: selectedColor === i ? 1 : 0.58,
              transition: "all 0.18s",
            }}
          />
        ))}
      </div>

      <div style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.45)", marginBottom: 14 }}>
        Selected: <span style={{ color: FLOWER_PALETTE[selectedColor], fontWeight: 800 }}>{FLOWER_NAMES[selectedColor]}</span>
      </div>

      <div style={{
        padding: "11px 14px", borderRadius: 13,
        background: "rgba(248,113,113,0.08)",
        border: "1px solid rgba(248,113,113,0.22)",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <span style={{ fontSize: 20 }}>👆</span>
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>
          Tap anywhere on the ground to place your flower
        </span>
      </div>

      {placedCount > 0 && (
        <div style={{ marginTop: 12, textAlign: "center", fontSize: 10, color: "rgba(248,113,113,0.6)" }}>
          🌸 {placedCount} flower{placedCount !== 1 ? "s" : ""} placed in the sanctuary
        </div>
      )}
    </motion.div>
  );
}

/* ═══════════════════ SANCTUARY HOME PANEL ══════════════════════════════════ */
const DAILY_INTENTIONS = [
  { he: "יהי זכרם ברוך",                        en: "May their memory be a blessing"              },
  { he: 'תנצב"ה',                                 en: "May their soul be bound in the bond of life" },
  { he: "המקום ינחם אתכם",                       en: "May the Almighty comfort you among the mourners" },
  { he: "זכרונם לברכה",                           en: "Their memory is for a blessing"              },
  { he: "נשמתם תהא צרורה בצרור החיים",           en: "May their souls rest in eternal peace"        },
  { he: "ברוך דיין האמת",                        en: "Blessed is the True Judge"                   },
  { he: "וזכר כל מעשה אל",                       en: "And all deeds are remembered before God"     },
];

function getHebrewDateStr(): string {
  try { return new HDate(new Date()).render("en"); } catch { return ""; }
}
function todayYahrzeits(entries: CommunityYahrzeitEntry[]): CommunityYahrzeitEntry[] {
  try {
    const today = new HDate(new Date());
    return entries.filter(e => e.hebrewDay === today.getDate() && e.hebrewMonth === today.getMonth());
  } catch { return []; }
}

function SanctuaryHomePanel({ entries, candleCount, visitorCount, onLightCandle, onSelectEntry, soundPlaying, onSoundToggle }: {
  entries: CommunityYahrzeitEntry[];
  candleCount: number; visitorCount: number;
  onLightCandle: () => void;
  onSelectEntry: (e: CommunityYahrzeitEntry) => void;
  soundPlaying: boolean;
  onSoundToggle: () => void;
}) {
  const hDateStr         = getHebrewDateStr();
  const todayRemembering = todayYahrzeits(entries);
  const recentEntries    = entries.slice(0, 6);
  const flowerCount      = hashNum("global-flowers", 1200, 2800);
  const dayIdx           = new Date().getDay();
  const intention        = DAILY_INTENTIONS[dayIdx % DAILY_INTENTIONS.length];
  const [minimised, setMinimised] = useState(false);

  return (
    <motion.div
      key="home-panel"
      initial={{ x: -48, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -48, opacity: 0 }}
      transition={{ type: "spring", damping: 28, stiffness: 260 }}
      onClick={e => e.stopPropagation()}
      className={minimised ? undefined : "ms-scroll-strip ms-home-panel-override"}
      style={{
        position: "absolute", left: 14, top: 72,
        zIndex: 22, width: minimised ? 220 : 268,
        maxHeight: minimised ? "none" : "calc(100dvh - 148px)",
        overflowY: minimised ? "visible" : "auto",
        overflowX: "hidden",
        background: "rgba(4,2,14,0.94)",
        backdropFilter: "blur(32px) saturate(1.9)",
        border: "1px solid rgba(212,175,55,0.20)",
        borderRadius: minimised ? 16 : 24,
        boxShadow: "0 24px 80px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,255,255,0.06), inset 0 -1px 0 rgba(0,0,0,0.2)",
      }}
    >
      {/* ─ Date & greeting ─ */}
      <div style={{
        padding: minimised ? "10px 14px" : "18px 18px 14px",
        background: "linear-gradient(180deg,rgba(212,175,55,0.08) 0%,transparent 100%)",
        borderBottom: minimised ? "none" : "1px solid rgba(255,255,255,0.055)",
        display: "flex",
        alignItems: minimised ? "center" : "flex-start",
        gap: minimised ? 10 : 0,
      }}>
        {/* Minimised slim-bar layout */}
        {minimised ? (
          <>
            <span style={{ fontSize: 16, filter: "drop-shadow(0 0 4px rgba(212,175,55,0.7))", flexShrink: 0 }}>🕯</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: "#D4AF37", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", letterSpacing: "0.03em" }}>
                Memorial Sanctuary
              </div>
            </div>
            <button
              onClick={() => setMinimised(false)}
              aria-label="Expand panel"
              style={{
                flexShrink: 0, width: 28, height: 28, borderRadius: 8,
                background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.28)",
                color: "#D4AF37", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="18 15 12 9 6 15" /></svg>
            </button>
          </>
        ) : (
          /* Expanded header */
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 3 }}>
              {hDateStr && (
                <div style={{ fontFamily: "'Noto Serif Hebrew',serif", fontSize: 14, color: "rgba(212,175,55,0.78)", textAlign: "right", lineHeight: 1.4, direction: "rtl", flex: 1 }}>
                  {hDateStr}
                </div>
              )}
              {/* ── Minimise button ── */}
              <button
                onClick={() => setMinimised(true)}
                aria-label="Minimise panel"
                title="Minimise"
                style={{
                  flexShrink: 0, width: 28, height: 28, borderRadius: 8, marginLeft: 8,
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.5)", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="6 9 12 15 18 9" /></svg>
              </button>
            </div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.32)", letterSpacing: "0.06em", marginBottom: 12 }}>
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#fff", lineHeight: 1.22, marginBottom: 6 }}>
              Welcome to the<br/>
              <span style={{ color: "#D4AF37" }}>Memorial Sanctuary</span>
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.38)", lineHeight: 1.65 }}>
              A sacred space of memory, love,<br/>and eternal connection.
            </div>
          </div>
        )}
      </div>

      {/* ─ Body sections — hidden when minimised ─ */}
      {!minimised && (
        <>
          {/* ─ Community stats ─ */}
          <div style={{ padding: "14px 18px 12px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.14em", color: "rgba(212,175,55,0.52)", marginBottom: 10 }}>
              COMMUNITY TODAY
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 7 }}>
              {[
                { icon: "🕯️", value: candleCount.toLocaleString(), label: "Candles" },
                { icon: "🌸", value: flowerCount.toLocaleString(), label: "Flowers" },
                { icon: "👥", value: visitorCount.toLocaleString(), label: "Visitors" },
              ].map(s => (
                <div key={s.label} style={{ padding: "10px 6px", textAlign: "center", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 14 }}>
                  <div style={{ fontSize: 18, marginBottom: 4 }}>{s.icon}</div>
                  <div style={{ fontSize: 13, fontWeight: 900, color: "#fff", lineHeight: 1, animation: "ms-shimmer 5s ease-in-out infinite" }}>{s.value}</div>
                  <div style={{ fontSize: 7, color: "rgba(255,255,255,0.28)", marginTop: 3, letterSpacing: "0.06em" }}>{s.label.toUpperCase()}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ─ Today's Yahrzeit ─ */}
          {todayRemembering.length > 0 && (
            <div style={{ padding: "12px 18px 10px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.14em", color: "rgba(248,113,113,0.7)", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ animation: "ms-flicker 2s ease-in-out infinite" }}>🕯</span>
                TODAY'S REMEMBRANCE
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {todayRemembering.slice(0, 3).map(e => {
                  const name = e.deceasedName.split("·")[0].trim();
                  return (
                    <motion.div key={e.id} onClick={() => onSelectEntry(e)}
                      whileHover={{ scale: 1.01, borderColor: "rgba(248,113,113,0.42)" }}
                      whileTap={{ scale: 0.98 }}
                      style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 11px", borderRadius: 13, background: "rgba(248,113,113,0.055)", border: "1px solid rgba(248,113,113,0.16)", cursor: "pointer", transition: "all 0.2s" }}
                    >
                      <div style={{ width: 30, height: 30, borderRadius: 10, flexShrink: 0, background: "linear-gradient(135deg,#f87171,#be123c)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, color: "#fff" }}>{initials(name)}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
                        {e.passingYear && <div style={{ fontSize: 9, color: "rgba(255,255,255,0.32)", marginTop: 1 }}>{e.passingYear}</div>}
                      </div>
                      <span style={{ fontSize: 12 }}>🕯</span>
                    </motion.div>
                  );
                })}
                {todayRemembering.length > 3 && (
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.28)", textAlign: "center", paddingTop: 2 }}>
                    +{todayRemembering.length - 3} more remembered today
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ─ Recently lit ─ */}
          {recentEntries.length > 0 && (
            <div style={{ padding: "12px 18px 10px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
              <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.14em", color: "rgba(255,255,255,0.32)", marginBottom: 10 }}>
                RECENTLY LIT
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {recentEntries.map((e, i) => {
                  const name = e.deceasedName.split("·")[0].trim();
                  return (
                    <motion.div key={e.id}
                      initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                      onClick={() => onSelectEntry(e)}
                      whileHover={{ background: "rgba(212,175,55,0.07)" }}
                      style={{ display: "flex", alignItems: "center", gap: 9, padding: "7px 9px", borderRadius: 11, background: "rgba(255,255,255,0.02)", cursor: "pointer", transition: "background 0.2s" }}
                    >
                      <div style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, background: "linear-gradient(135deg,#D4AF37,#7a5800)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 900, color: "#fff" }}>{initials(name)}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.75)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</div>
                        {e.passingYear && <div style={{ fontSize: 8, color: "rgba(255,255,255,0.26)", marginTop: 1 }}>{e.passingYear}</div>}
                      </div>
                      <span style={{ fontSize: 11, opacity: 0.6 }}>🕯</span>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ─ Daily intention ─ */}
          <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.14em", color: "rgba(167,139,250,0.58)", marginBottom: 10 }}>
              DAILY INTENTION
            </div>
            <div style={{ padding: "14px 16px", borderRadius: 16, background: "rgba(167,139,250,0.05)", border: "1px solid rgba(167,139,250,0.15)", textAlign: "center" }}>
              <div style={{ fontFamily: "'Noto Serif Hebrew',serif", fontSize: 17, color: "rgba(212,175,55,0.85)", lineHeight: 1.5, marginBottom: 8, direction: "rtl" }}>
                {intention.he}
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.38)", fontStyle: "italic", lineHeight: 1.65 }}>
                {intention.en}
              </div>
            </div>
          </div>

          {/* ─ Light a candle CTA ─ */}
          <div style={{ padding: "14px 18px 14px" }}>
            <motion.button
              onClick={onLightCandle}
              whileHover={{ scale: 1.02, boxShadow: "0 8px 32px rgba(212,175,55,0.45)" }}
              whileTap={{ scale: 0.97 }}
              style={{ width: "100%", padding: "14px 0", background: "linear-gradient(135deg,rgba(212,175,55,0.92),rgba(138,96,0,0.96))", border: "none", borderRadius: 16, fontSize: 14, fontWeight: 800, color: "#0F1829", cursor: "pointer", boxShadow: "0 6px 24px rgba(212,175,55,0.28)", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "box-shadow 0.25s" }}
            >
              <span style={{ animation: "ms-flicker 1.8s ease-in-out infinite", fontSize: 16 }}>🕯</span>
              Light a Candle
            </motion.button>
            <div style={{ textAlign: "center", fontSize: 9, color: "rgba(255,255,255,0.22)", marginTop: 10, letterSpacing: "0.04em", lineHeight: 1.5 }}>
              Or tap anywhere on the ground<br/>in the sanctuary
            </div>
          </div>

          {/* ─ Sound + Feedback rows ─ */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", padding: "10px 18px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
            {/* Sound toggle */}
            <button
              onClick={onSoundToggle}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 12px",
                borderRadius: 12,
                background: soundPlaying ? "rgba(212,175,55,0.07)" : "transparent",
                border: `1px solid ${soundPlaying ? "rgba(212,175,55,0.22)" : "rgba(255,255,255,0.07)"}`,
                cursor: "pointer",
                transition: "background 0.15s, border-color 0.15s",
              }}
            >
              <span style={{ fontSize: 15 }}>{soundPlaying ? "🔊" : "🔇"}</span>
              <span style={{ flex: 1, textAlign: "left", fontSize: 11, fontWeight: 600, color: soundPlaying ? "rgba(212,175,55,0.75)" : "rgba(255,255,255,0.35)", letterSpacing: "0.02em" }}>
                {soundPlaying ? "Ambient sound on" : "Ambient sound off"}
              </span>
              {/* Toggle pill */}
              <div style={{
                flexShrink: 0,
                width: 34, height: 20,
                borderRadius: 10,
                background: soundPlaying ? "rgba(212,175,55,0.55)" : "rgba(255,255,255,0.1)",
                position: "relative",
                transition: "background 0.2s",
              }}>
                <div style={{
                  position: "absolute",
                  top: 3, left: soundPlaying ? 16 : 3,
                  width: 14, height: 14,
                  borderRadius: "50%",
                  background: soundPlaying ? "#D4AF37" : "rgba(255,255,255,0.4)",
                  transition: "left 0.2s, background 0.2s",
                }} />
              </div>
            </button>

            {/* Feedback */}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("menashe:open-feedback"))}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 12px",
                borderRadius: 12,
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.07)",
                cursor: "pointer",
                transition: "background 0.15s",
              }}
            >
              <span style={{ fontSize: 15, opacity: 0.7 }}>★</span>
              <span style={{ flex: 1, textAlign: "left", fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.38)", letterSpacing: "0.02em" }}>
                Share feedback
              </span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </>
      )}
    </motion.div>
  );
}

/* ═══════════════════ AMBIENT NOTIFICATION ══════════════════════════════════ */
const NOTIF_NAMES  = ["Sarah","David","Miriam","Yosef","Rachel","Moshe","Leah","Aharon","Devorah","Shimon","Rivka","Binyamin","Chana","Shlomo","Naomi","Eliyahu"];
const NOTIF_CITIES = ["Jerusalem","Tel Aviv","New York","London","Mumbai","Toronto","Sydney","Los Angeles","Melbourne","Paris","Chicago","Haifa","Miami","Montreal"];

function buildNotifText(entries: CommunityYahrzeitEntry[]): string {
  const r     = Math.random();
  const city  = NOTIF_CITIES[Math.floor(Math.random() * NOTIF_CITIES.length)];
  const fName = NOTIF_NAMES[Math.floor(Math.random() * NOTIF_NAMES.length)];
  const entryName = entries.length
    ? entries[Math.floor(Math.random() * Math.min(entries.length, 20))].deceasedName.split("·")[0].trim()
    : null;
  if (r < 0.28 && entryName) return `${fName} lit a candle for ${entryName}`;
  if (r < 0.50) return `A visitor from ${city} lit a candle`;
  if (r < 0.65) return `${fName} from ${city} left flowers`;
  if (r < 0.78) return `Someone from ${city} offered a prayer`;
  if (r < 0.88 && entryName) return `${fName} is remembering ${entryName}`;
  return `${fName} from ${city} joined the sanctuary`;
}

function AmbientNotification({ entries, paused }: { entries: CommunityYahrzeitEntry[]; paused: boolean }) {
  const [notif, setNotif] = useState<{ text: string; id: number } | null>(null);
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const entriesRef = useRef(entries);
  /* Keep ref up-to-date on every render so fire() always reads latest entries */
  useEffect(() => { entriesRef.current = entries; }, [entries]);

  useEffect(() => {
    if (paused) { setNotif(null); return; }
    let hideTimer: ReturnType<typeof setTimeout>;
    const fire = () => {
      setNotif({ text: buildNotifText(entriesRef.current), id: Date.now() });
      hideTimer = setTimeout(() => setNotif(null), 5400);
    };
    const initialDelay = setTimeout(() => {
      fire();
      timerRef.current = setInterval(fire, 28000 + Math.random() * 18000);
    }, 20000);
    return () => {
      clearTimeout(initialDelay);
      clearTimeout(hideTimer);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [paused]);

  return (
    <AnimatePresence>
      {notif && (
        <motion.div
          key={notif.id}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ type: "spring", damping: 28, stiffness: 320 }}
          style={{
            position: "absolute", left: 14, bottom: 72, zIndex: 28,
            background: "rgba(4,2,14,0.93)",
            backdropFilter: "blur(22px) saturate(1.7)",
            border: "1px solid rgba(212,175,55,0.20)",
            borderRadius: 50, padding: "10px 18px",
            display: "flex", alignItems: "center", gap: 10,
            boxShadow: "0 8px 36px rgba(0,0,0,0.55)",
            pointerEvents: "none", maxWidth: 300,
          }}
        >
          <span style={{ fontSize: 14, animation: "ms-flicker 2s ease-in-out infinite", flexShrink: 0 }}>🕯</span>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)", fontWeight: 500, lineHeight: 1.4 }}>{notif.text}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ═══════════════════ KEYFRAMES ═════════════════════════════════════════════ */
const STYLES = `
  @keyframes ms-flicker { 0%,100%{filter:drop-shadow(0 0 14px rgba(255,180,40,0.6))} 50%{filter:drop-shadow(0 0 28px rgba(255,140,20,0.95))} }
  @keyframes ms-pulse-gold { 0%,100%{box-shadow:0 0 18px rgba(212,175,55,0.35),0 0 0 2px rgba(212,175,55,0.15)} 50%{box-shadow:0 0 44px rgba(212,175,55,0.7),0 0 0 2px rgba(212,175,55,0.38)} }
  @keyframes ms-float { 0%,100%{transform:translateX(-50%) translateY(0px)} 50%{transform:translateX(-50%) translateY(-6px)} }
  @keyframes ms-glow-heart { 0%,100%{filter:drop-shadow(0 0 3px rgba(255,100,100,0.5))} 50%{filter:drop-shadow(0 0 10px rgba(255,60,60,1))} }
  @keyframes ms-shimmer { 0%{opacity:0.52} 50%{opacity:1} 100%{opacity:0.52} }
  @keyframes ms-timeline-dot { 0%,100%{transform:scale(1)} 50%{transform:scale(1.35)} }
  .ms-input {
    width:100%; padding:12px 15px; box-sizing:border-box;
    background:rgba(8,4,22,0.78); border:1px solid rgba(212,175,55,0.22);
    border-radius:13px; color:#fff; font-size:14px; outline:none;
    font-family:inherit; transition:border-color 0.22s, box-shadow 0.22s;
    backdrop-filter:blur(8px);
  }
  .ms-input:focus { border-color:rgba(212,175,55,0.58); box-shadow:0 0 0 3px rgba(212,175,55,0.10); }
  .ms-input::placeholder { color:rgba(255,255,255,0.26); }
  input[type="date"].ms-input::-webkit-calendar-picker-indicator { filter:invert(0.65) sepia(1) saturate(2) hue-rotate(8deg); }
  textarea.ms-input { resize:none; line-height:1.58; }
  .ms-search-input {
    flex:1; background:transparent; border:none; outline:none;
    color:#fff; font-size:14px; font-family:inherit;
  }
  .ms-search-input::placeholder { color:rgba(255,255,255,0.42); }
  .ms-tab-btn {
    background:none; border:none; cursor:pointer;
    display:flex; flex-direction:column; align-items:center; gap:4px;
    padding:8px 0; transition:opacity 0.2s;
  }
  .ms-tab-btn:focus-visible { outline:2px solid rgba(212,175,55,0.7); outline-offset:4px; border-radius:8px; }
  .ms-rnav-btn {
    background:none; border:none; cursor:pointer;
    display:flex; flex-direction:column; align-items:center; gap:4px;
    padding:10px 6px; transition:all 0.2s; border-radius:12px; width:56px;
  }
  .ms-rnav-btn:hover { background:rgba(255,255,255,0.08); }
  .ms-rnav-btn:focus-visible { outline:2px solid rgba(212,175,55,0.7); outline-offset:2px; }
  .ms-scroll-strip::-webkit-scrollbar { display:none; }
  /* Reduced-motion: disable all decorative animations */
  @media (prefers-reduced-motion: reduce) {
    *[style*="animation"] { animation: none !important; }
    .ms-tab-btn, .ms-rnav-btn { transition: none !important; }
  }
  /* Mobile panel stacking — narrow viewports */
  @media (max-width: 480px) {
    .ms-home-panel-override { width: calc(100vw - 28px) !important; }
    .ms-right-panel-override { right: 66px !important; width: calc(100vw - 80px) !important; }
  }
`;

/* ═══════════════════ LOADING SCREEN ════════════════════════════════════════ */
function ValleyLoading() {
  const { t } = useLanguage();
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState(t.memLoadingScene);

  useEffect(() => {
    const stages: Array<{ at: number; pct: number; label: string }> = [
      { at: 350,  pct: 20, label: t.memLoadingScene },
      { at: 1000, pct: 40, label: t.memInitializingWebGL },
      { at: 1800, pct: 58, label: t.memBuildingValley },
      { at: 2700, pct: 74, label: t.memPlacingMemorials },
      { at: 3600, pct: 87, label: t.memLightingCandles },
      { at: 4800, pct: 95, label: t.memAlmostReady },
    ];
    const timers = stages.map(({ at, pct, label }) =>
      window.setTimeout(() => { setProgress(pct); setStage(label); }, at)
    );
    return () => timers.forEach(id => window.clearTimeout(id));
  }, []);

  return (
    <div style={{
      position: "absolute", inset: 0,
      background: "linear-gradient(168deg, #b05822 0%, #e08830 18%, #f0b850 35%, #e8d890 52%, #b8d498 72%, #6a9a70 100%)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18,
    }}>
      <div style={{ fontSize: 58, animation: "ms-flicker 1.8s ease-in-out infinite" }}>🕯</div>
      <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.22em", color: "rgba(35,18,0,0.75)", textTransform: "uppercase" }}>
        {t.memEnteringSanctuary}
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, width: 220 }}>
        <div style={{ fontSize: 11, color: "rgba(35,18,0,0.52)", letterSpacing: "0.05em", height: 16, textAlign: "center" }}>
          {stage}
        </div>
        <div style={{ position: "relative", width: "100%", height: 5, borderRadius: 3, background: "rgba(180,140,40,0.2)", overflow: "hidden" }}>
          <div style={{
            position: "absolute", inset: "0 auto 0 0",
            width: `${progress}%`,
            borderRadius: 3,
            background: "linear-gradient(90deg, #D4AF37, #f5d982)",
            transition: "width 0.75s cubic-bezier(0.4, 0, 0.2, 1)",
            boxShadow: "0 0 8px rgba(212,175,55,0.6)",
          }} />
        </div>
        <div style={{ fontSize: 10, color: "rgba(35,18,0,0.4)", fontVariantNumeric: "tabular-nums", letterSpacing: "0.06em" }}>
          {progress}%
        </div>
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
  const [favorited, setFavorited]       = useState(false);
  const [shareState, setShareState]     = useState<"idle"|"copied">("idle");
  const shareTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (shareTimerRef.current) clearTimeout(shareTimerRef.current); }, []);

  const name     = entry.deceasedName.split("·")[0].trim();
  const hebrew   = entry.deceasedName.includes("·") ? entry.deceasedName.split("·")[1]?.trim() : null;
  const candleN  = hashNum(entry.id, 100, 1200);
  const flowerN  = hashNum(entry.id + "f", 50, 400);
  const visitorN = hashNum(entry.id + "v", 500, 9000);

  /* Life timeline */
  const birthYear = entry.passingYear
    ? entry.passingYear - (58 + hashNum(entry.id + "age", 0, 38))
    : null;
  const midYear = birthYear && entry.passingYear
    ? birthYear + Math.floor((entry.passingYear - birthYear) * 0.45)
    : null;
  const timelineEvents = [
    birthYear && { year: birthYear, icon: "⭐", label: "Born",          color: "#D4AF37",              desc: "Beginning of a beautiful life" },
    midYear   && { year: midYear,   icon: "🌿", label: "Life's Journey", color: "rgba(100,200,130,0.8)", desc: "Years of love and community"    },
    entry.passingYear && { year: entry.passingYear, icon: "🕯️", label: "Remembered", color: "rgba(255,255,255,0.65)", desc: "Passed into eternal memory" },
  ].filter(Boolean) as { year: number; icon: string; label: string; color: string; desc: string }[];

  const handleShare = async () => {
    const url = `${window.location.origin}?memorial=${encodeURIComponent(name)}`;
    try { await navigator.clipboard.writeText(url); } catch { /* silent */ }
    setShareState("copied");
    if (shareTimerRef.current) clearTimeout(shareTimerRef.current);
    shareTimerRef.current = setTimeout(() => setShareState("idle"), 2200);
  };

  return (
    <motion.div
      key="profile-sheet"
      initial={{ y: "100%", opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: "100%", opacity: 0 }}
      transition={{ type: "spring", damping: 30, stiffness: 290 }}
      onClick={e => e.stopPropagation()}
      style={{
        position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 50,
        borderRadius: "28px 28px 0 0",
        background: "linear-gradient(180deg, rgba(5,2,18,0.98) 0%, rgba(3,1,12,1) 100%)",
        backdropFilter: "blur(32px)",
        border: "1px solid rgba(212,175,55,0.25)", borderBottom: "none",
        maxHeight: "88dvh", overflowY: "auto",
        boxShadow: "0 -24px 80px rgba(0,0,0,0.75), 0 -1px 0 rgba(212,175,55,0.14)",
      }}
    >
      {/* Handle */}
      <div style={{ display: "flex", justifyContent: "center", padding: "14px 0 4px" }}>
        <div style={{ width: 44, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.1)" }} />
      </div>

      <div style={{ padding: "8px 22px 56px" }}>
        {/* ── Avatar + name + actions row ── */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 18 }}>
          {/* Avatar */}
          <div style={{
            width: 80, height: 80, borderRadius: 24, flexShrink: 0,
            background: "linear-gradient(135deg,#D4AF37 0%,#6a4a00 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 30, fontWeight: 900, color: "#fff",
            animation: "ms-pulse-gold 3.5s ease-in-out infinite",
            position: "relative",
          }}>
            {initials(name)}
            {/* Glow ring */}
            <div style={{ position: "absolute", inset: -4, borderRadius: 28, border: "1px solid rgba(212,175,55,0.25)", pointerEvents: "none" }} />
          </div>

          <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", lineHeight: 1.15, marginBottom: 4 }}>{name}</div>
            {hebrew && (
              <div style={{ fontSize: 16, fontFamily: "'Noto Serif Hebrew',serif", color: "rgba(212,175,55,0.85)", marginBottom: 8, direction: "rtl" }}>{hebrew}</div>
            )}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {entry.displayDate && (
                <div style={{ padding: "3px 10px", borderRadius: 18, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", fontSize: 10, color: "rgba(255,255,255,0.5)" }}>
                  📅 {entry.displayDate}
                </div>
              )}
              {entry.passingYear && (
                <div style={{ padding: "3px 10px", borderRadius: 18, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)", fontSize: 10, color: "rgba(255,255,255,0.38)" }}>
                  {entry.passingYear}
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
            <button
              onClick={onClose}
              style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}
            >✕</button>
            <motion.button
              onClick={() => setFavorited(f => !f)}
              whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.9 }}
              style={{ width: 34, height: 34, borderRadius: "50%", background: favorited ? "rgba(248,113,113,0.18)" : "rgba(255,255,255,0.06)", border: `1px solid rgba(248,113,113,${favorited ? "0.4" : "0.15"})`, color: favorited ? "#f87171" : "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}
              title="Favorite"
            >{favorited ? "❤️" : "🤍"}</motion.button>
            <motion.button
              onClick={handleShare}
              whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.9 }}
              style={{ width: 34, height: 34, borderRadius: "50%", background: shareState === "copied" ? "rgba(100,200,120,0.15)" : "rgba(255,255,255,0.06)", border: `1px solid rgba(255,255,255,${shareState === "copied" ? "0.2" : "0.1"})`, color: shareState === "copied" ? "#6ee7b7" : "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }}
              title="Share memorial"
            >{shareState === "copied" ? "✓" : "↗"}</motion.button>
          </div>
        </div>

        {/* ── Share confirmation ── */}
        <AnimatePresence>
          {shareState === "copied" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              style={{ overflow: "hidden", marginBottom: 10 }}
            >
              <div style={{ padding: "8px 14px", borderRadius: 12, background: "rgba(100,200,120,0.08)", border: "1px solid rgba(100,200,120,0.22)", fontSize: 11, color: "rgba(110,231,183,0.9)", display: "flex", alignItems: "center", gap: 8 }}>
                <span>✓</span> Memorial link copied to clipboard
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Stats ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 9, marginBottom: 20 }}>
          {[
            { icon: "🕯️", label: "Candles", value: candleN.toLocaleString(), color: "#D4AF37" },
            { icon: "🌹", label: "Flowers",  value: flowerN.toLocaleString(), color: "#f87171" },
            { icon: "👥", label: "Visitors", value: visitorN.toLocaleString(), color: "rgba(255,255,255,0.72)" },
          ].map(s => (
            <div key={s.label} style={{ background: "rgba(255,255,255,0.035)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "13px 8px", textAlign: "center" }}>
              <div style={{ fontSize: 22, marginBottom: 6 }}>{s.icon}</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: s.color, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 8, color: "rgba(255,255,255,0.28)", marginTop: 4, letterSpacing: "0.07em" }}>{s.label.toUpperCase()}</div>
            </div>
          ))}
        </div>

        {/* ── Life Timeline ── */}
        {timelineEvents.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.12em", color: "rgba(212,175,55,0.55)", marginBottom: 12 }}>LIFE TIMELINE</div>
            <div style={{ position: "relative", paddingLeft: 28 }}>
              {/* Vertical line */}
              <div style={{ position: "absolute", left: 10, top: 8, bottom: 8, width: 1, background: "linear-gradient(to bottom, rgba(212,175,55,0.5), rgba(212,175,55,0.08))" }} />
              {timelineEvents.map((ev, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 + 0.2 }}
                  style={{ position: "relative", marginBottom: i < timelineEvents.length - 1 ? 18 : 0, display: "flex", alignItems: "flex-start", gap: 12 }}
                >
                  {/* Timeline dot */}
                  <div style={{ position: "absolute", left: -24, top: 6, width: 10, height: 10, borderRadius: "50%", background: ev.color, boxShadow: `0 0 8px ${ev.color}`, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3 }}>
                      <span style={{ fontSize: 14 }}>{ev.icon}</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color: "#fff" }}>{ev.label}</span>
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginLeft: "auto" }}>{ev.year}</span>
                    </div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.36)", lineHeight: 1.5 }}>{ev.desc}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* ── Lit by ── */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.12em", color: "rgba(212,175,55,0.58)", marginBottom: 6 }}>LIT BY</div>
          <div style={{ padding: "10px 14px", borderRadius: 14, background: "rgba(212,175,55,0.065)", border: "1px solid rgba(212,175,55,0.16)", fontSize: 13, color: "rgba(212,175,55,0.88)", display: "flex", alignItems: "center", gap: 8 }}>
            🕯️ {entry.donorDisplayName}
          </div>
        </div>

        {/* ── Message ── */}
        {entry.message && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.12em", color: "rgba(255,255,255,0.35)", marginBottom: 6 }}>MEMORIAL MESSAGE</div>
            <div style={{ padding: "14px 16px 14px 28px", borderRadius: 16, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.065)", fontSize: 13, color: "rgba(255,255,255,0.58)", fontStyle: "italic", lineHeight: 1.75, position: "relative" }}>
              <span style={{ position: "absolute", top: 4, left: 10, fontSize: 30, color: "rgba(212,175,55,0.15)", fontFamily: "Georgia,serif", lineHeight: 1 }}>"</span>
              {entry.message}
            </div>
          </div>
        )}

        {/* ── Hebrew blessing ── */}
        <div style={{ textAlign: "center", padding: "18px 16px", borderTop: "1px solid rgba(255,255,255,0.055)", borderBottom: "1px solid rgba(255,255,255,0.055)", marginBottom: 18, background: "rgba(212,175,55,0.03)", borderRadius: 16 }}>
          <div style={{ fontFamily: "'Noto Serif Hebrew',serif", fontSize: 22, color: "rgba(212,175,55,0.86)", letterSpacing: "0.04em", lineHeight: 1.5, marginBottom: 6 }}>
            יהי זכרם ברוך
          </div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.32)", letterSpacing: "0.06em" }}>
            May their memory be a blessing
          </div>
        </div>

        {/* ── Dedicated learners ── */}
        {entry.learners.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 8, fontWeight: 800, letterSpacing: "0.12em", color: "rgba(167,139,250,0.65)", marginBottom: 8 }}>DEDICATED LEARNING</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {entry.learners.map((l, i) => (
                <div key={i} style={{ padding: "5px 12px", borderRadius: 16, background: "rgba(167,139,250,0.07)", border: "1px solid rgba(167,139,250,0.18)", fontSize: 11, color: "rgba(167,139,250,0.88)" }}>
                  📖 {l.learnerName} · {l.studySubject}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Divider ── */}
        <div style={{ height: 1, background: "rgba(255,255,255,0.06)", marginBottom: 16 }} />

        {/* ── Leave tribute ── */}
        <motion.button
          onClick={() => setShowDedicate(!showDedicate)}
          whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
          style={{
            width: "100%", padding: "14px 0", marginBottom: showDedicate ? 14 : 0,
            background: showDedicate ? "rgba(167,139,250,0.14)" : "rgba(167,139,250,0.07)",
            border: `1px solid rgba(167,139,250,${showDedicate ? "0.4" : "0.2"})`,
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
                    <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.1em", color: "rgba(212,175,55,0.62)", marginBottom: 6 }}>{f.label}</div>
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
                  style={{ width: "100%", padding: "14px 0", background: dedicateSaving ? "rgba(167,139,250,0.22)" : "linear-gradient(135deg,#a78bfa,#7c3aed)", border: "none", borderRadius: 14, fontSize: 14, fontWeight: 800, color: "#fff", cursor: dedicateSaving ? "default" : "pointer", opacity: dedicateSaving ? 0.7 : 1, transition: "opacity 0.2s" }}
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
  /* Phase 3 additions */
  const [virtualFlowers, setVirtualFlowers] = useState<VirtualFlower[]>([]);
  const [selectedFlowerColor, setSelectedFlowerColor] = useState(0);
  const [newCandlePos, setNewCandlePos]     = useState<[number, number, number] | null>(null);
  const sound = useAmbientSound();

  /* Phase 4: keyboard handler — Escape closes any open panel */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (selectedEntry) { setSelectedEntry(null); setShowDedicate(false); setDedicateSuccess(false); return; }
      if (showForm) { setShowForm(false); setPendingPos(null); return; }
      if (activeNav !== "home") { setActiveNav("home"); return; }
      onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedEntry, showForm, activeNav, onClose]);
  /**
   * canRender3D — mount guard for R3F v9 + React 19 Strict Mode.
   *
   * React 19 Strict Mode intentionally discards the first render pass to
   * surface side-effects. During that discarded pass the R3F Canvas hasn't
   * run its initialisation effect yet, so its internal Zustand store context
   * is null. Any scene child that calls useFrame / useThree then tries to
   * destructure { subscribe } from null → TypeError.
   *
   * By keeping canRender3D=false until after the first useEffect flush we
   * guarantee the Canvas is never mounted during the discarded pass. The
   * Replit runtime-error overlay therefore never fires.
   */
  const [canRender3D, setCanRender3D] = useState(false);

  const searchRef      = useRef<HTMLInputElement>(null!);
  const cameraStateRef = useRef<CameraState | null>(null);

  // Mount guard — runs after the real (non-discarded) first commit
  useEffect(() => { setCanRender3D(true); }, []);

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
    /* If flowers nav is active — place a flower instead of opening candle form */
    if (activeNav === "flowers") {
      setVirtualFlowers(prev => [...prev, { pos, colorIdx: selectedFlowerColor }]);
      return;
    }
    setPendingPos(pos);
    setShowForm(true);
    setShowHints(false);
  }, [showForm, selectedEntry, activeNav, selectedFlowerColor]);

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
      if (pendingPos) {
        setPlacedCandles(prev => [...prev, { pos: pendingPos, name: form.name.trim() }]);
        /* Trigger placement animation */
        setNewCandlePos(pendingPos);
        setTimeout(() => setNewCandlePos(null), 3500);
      }
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

  const filtered      = filterEntries(entries, searchQuery, filterYear);
  const totalLit      = entries.length;
  const totalVisitors = hashNum("global-visitors", 4000, 6000);
  const panelOpen     = showForm || !!selectedEntry;
  const showBrowse    = activeNav === "memorials" && !panelOpen;
  const showMusic     = activeNav === "music"   && !panelOpen;
  const showFlowers   = activeNav === "flowers" && !panelOpen;
  const showHome      = activeNav === "home"    && !panelOpen;

  /* Home panel: light a candle by placing at a random valley position */
  const handleHomePanelLightCandle = useCallback(() => {
    const pos: [number, number, number] = [
      (Math.random() - 0.5) * 10,
      0.05,
      (Math.random() - 0.5) * 8,
    ];
    setPendingPos(pos);
    setShowForm(true);
    setShowHints(false);
  }, []);

  return (
    <div
      onClick={e => e.stopPropagation()}
      style={{ position: "fixed", inset: 0, zIndex: 9999, overflow: "hidden", userSelect: "none", fontFamily: "Inter,-apple-system,sans-serif" }}
    >
      <style>{STYLES}</style>

      {/* ── 3D CANVAS ──
           canRender3D guard: Canvas is held back until after React 19 Strict
           Mode's discarded first-render pass so the R3F Zustand store context
           is never accessed while null.  The error boundary provides a
           secondary safety net for any surviving transient issues. ── */}
      <div style={{ position: "absolute", inset: 0 }}>
        {canRender3D ? (
          <R3FErrorBoundary>
            <Suspense fallback={<ValleyLoading />}>
              <MemorialValley3D
                entries={entries}
                placedCandles={placedCandles}
                virtualFlowers={virtualFlowers}
                newCandlePos={newCandlePos}
                onCandleClick={handleCandleClick}
                onGroundClick={handleGroundClick}
                selectedId={selectedEntry?.id ?? null}
                sceneView={activeScene as SceneViewType}
                cameraStateRef={cameraStateRef}
              />
            </Suspense>
          </R3FErrorBoundary>
        ) : (
          <ValleyLoading />
        )}
      </div>

      {/* ── MINIMAP OVERLAY — PUBG-style position compass ── */}
      <MinimapOverlay cameraRef={cameraStateRef} hidden={panelOpen || !!searchQuery} />

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

      {/* ── BACKGROUND DIM when profile open ── */}
      <AnimatePresence>
        {panelOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            style={{
              position: "absolute", inset: 0, zIndex: 40,
              background: "rgba(0,0,0,0.42)",
              backdropFilter: "blur(2px)",
              pointerEvents: "none",
            }}
          />
        )}
      </AnimatePresence>

      {/* ── HOME PANEL — shows instead of left stats when Home nav active ── */}
      <AnimatePresence>
        {showHome && (
          <SanctuaryHomePanel
            entries={entries}
            candleCount={24832 + totalLit}
            visitorCount={8947 + totalVisitors}
            onLightCandle={handleHomePanelLightCandle}
            onSelectEntry={e => { setSelectedEntry(e); setActiveNav("home"); }}
            soundPlaying={sound.playing}
            onSoundToggle={sound.toggle}
          />
        )}
      </AnimatePresence>

      {/* ── LEFT STATS — shown when a non-home, non-browse nav is active ── */}
      {!panelOpen && !showHome && !showBrowse && (
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
            setActiveNav(prev => prev === nav ? "home" : nav);
          }}
        />
      )}

      {/* ── MUSIC PANEL ── */}
      <AnimatePresence>
        {showMusic && <MusicPanel sound={sound} />}
      </AnimatePresence>

      {/* ── FLOWERS PANEL ── */}
      <AnimatePresence>
        {showFlowers && (
          <FlowersPanel
            onSelectColor={setSelectedFlowerColor}
            selectedColor={selectedFlowerColor}
            placedCount={virtualFlowers.length}
          />
        )}
      </AnimatePresence>

      {/* ── AMBIENT COMMUNITY NOTIFICATIONS ── */}
      <AmbientNotification entries={entries} paused={panelOpen || showForm} />

      {/* ── INTERACTION HINTS ── */}
      {!panelOpen && <InteractionHints visible={showHints} />}

      {/* ── MEMORIAL BROWSER PANEL (replaces scroll strip) ── */}
      <AnimatePresence>
        {showBrowse && (
          <MemorialBrowserPanel onClose={() => setActiveNav("home")} />
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

    </div>
  );
}
