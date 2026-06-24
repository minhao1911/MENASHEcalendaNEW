import { useState, useRef, useEffect, useCallback } from "react";
import { HDate } from "@hebcal/core";
import {
  fetchCommunityYahrzeit,
  createCommunityYahrzeit,
  type CommunityYahrzeitEntry,
} from "../lib/userApi";

/* ═══════════════════════════════════════════════════════════════════════════════
   WORLD GEOMETRY
═══════════════════════════════════════════════════════════════════════════════ */
const COLS = 20;
const ROWS = 20;
const TW = 76;
const TH = 38;
const TD = 16;

function gridToSVG(col: number, row: number) {
  return { x: (col - row) * TW / 2, y: (col + row) * TH / 2 };
}
function topFace(x: number, y: number) {
  return `${x},${y} ${x + TW/2},${y + TH/2} ${x},${y + TH} ${x - TW/2},${y + TH/2}`;
}
function leftFace(x: number, y: number) {
  return `${x - TW/2},${y + TH/2} ${x},${y + TH} ${x},${y + TH + TD} ${x - TW/2},${y + TH/2 + TD}`;
}
function rightFace(x: number, y: number) {
  return `${x},${y + TH} ${x + TW/2},${y + TH/2} ${x + TW/2},${y + TH/2 + TD} ${x},${y + TH + TD}`;
}

/* ═══════════════════════════════════════════════════════════════════════════════
   ZONES
═══════════════════════════════════════════════════════════════════════════════ */
type ZoneId = "garden" | "valley" | "grove" | "court" | "outlook" | "waters" | "path" | "stone";

const ZONE_META: Record<ZoneId, { name: string; top: string; left: string; right: string }> = {
  garden:  { name: "Memorial Garden",      top: "#4a7850", left: "#2c4e30", right: "#3a6440" },
  valley:  { name: "Valley of Peace",      top: "#82a870", left: "#527248", right: "#649858" },
  grove:   { name: "Tree of Life Grove",   top: "#3a6e38", left: "#1e4020", right: "#2c5830" },
  court:   { name: "Eternal Light Court",  top: "#c0a060", left: "#8a6c3a", right: "#a07c48" },
  outlook: { name: "Jerusalem Outlook",    top: "#c4b088", left: "#8a7450", right: "#a08460" },
  waters:  { name: "Living Waters Path",   top: "#4090b0", left: "#286890", right: "#3480a0" },
  path:    { name: "",                     top: "#9a8868", left: "#6a5e48", right: "#7a6e58" },
  stone:   { name: "",                     top: "#38382e", left: "#20201a", right: "#2c2c24" },
};

function getTileZone(col: number, row: number): ZoneId {
  if (col <= 0 || col >= COLS - 1 || row <= 0 || row >= ROWS - 1) return "stone";
  if (col >= 8 && col <= 11 && row >= 2 && row <= 5) return "court";
  if (col >= 12 && col <= 17 && row >= 1 && row <= 5) return "outlook";
  if (col >= 1 && col <= 7 && row >= 1 && row <= 8) return "grove";
  if (col >= 6 && col <= 12 && row >= 6 && row <= 12) return "garden";
  if (col >= 12 && col <= 18 && row >= 5 && row <= 13) return "valley";
  if (col >= 2 && col <= 16 && row >= 13 && row <= 18) return "waters";
  if ((col === 7 || col === 8) && row >= 5 && row <= 7) return "path";
  if ((row === 6 || row === 7) && col >= 9 && col <= 13) return "path";
  return "stone";
}

const SORTED_TILES = (() => {
  const tiles: { col: number; row: number; zone: ZoneId; x: number; y: number }[] = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const { x, y } = gridToSVG(col, row);
      tiles.push({ col, row, zone: getTileZone(col, row), x, y });
    }
  }
  return tiles.sort((a, b) => a.col + a.row - (b.col + b.row));
})();

/* ═══════════════════════════════════════════════════════════════════════════════
   DECORATION POSITIONS
═══════════════════════════════════════════════════════════════════════════════ */
const TREES = [
  {col:2,row:2},{col:2,row:4},{col:3,row:3},{col:4,row:2},{col:3,row:5},
  {col:5,row:3},{col:1,row:5},{col:2,row:6},{col:4,row:6},{col:5,row:5},
  {col:1,row:7},{col:3,row:7},{col:5,row:7},{col:6,row:3},{col:6,row:5},
  {col:4,row:4},{col:1,row:3},{col:6,row:2},{col:2,row:8},{col:4,row:8},
];

const MEMORIAL_STONES = [
  {col:7,row:8},{col:9,row:7},{col:11,row:8},{col:8,row:10},
  {col:10,row:10},{col:7,row:11},{col:11,row:11},
];

const CANDLE_SPOTS = [
  {col:9,row:8},{col:10,row:8},{col:8,row:9},{col:10,row:9},
  {col:9,row:10},{col:7,row:9},{col:11,row:9},{col:8,row:8},
  {col:10,row:7},{col:9,row:11},{col:11,row:10},{col:8,row:11},
  {col:9,row:3},{col:10,row:3},{col:9,row:4},{col:10,row:4},
  {col:8,row:4},{col:11,row:4},{col:9,row:5},{col:10,row:5},
  {col:8,row:5},{col:11,row:5},{col:8,row:3},{col:11,row:3},
];

/* ═══════════════════════════════════════════════════════════════════════════════
   CLOUD DATA
═══════════════════════════════════════════════════════════════════════════════ */
const CLOUDS = [
  {x:"8%", y:"7%", w:90, h:36, speed:"50s", delay:"0s", opacity:0.55},
  {x:"38%",y:"3%", w:70, h:28, speed:"65s", delay:"18s", opacity:0.4},
  {x:"62%",y:"9%", w:110,h:44, speed:"55s", delay:"8s",  opacity:0.5},
  {x:"82%",y:"5%", w:75, h:30, speed:"45s", delay:"30s", opacity:0.35},
];

/* ═══════════════════════════════════════════════════════════════════════════════
   HELPER RENDERERS
═══════════════════════════════════════════════════════════════════════════════ */
function Tree({ col, row }: { col: number; row: number }) {
  const { x, y } = gridToSVG(col, row);
  const cx = x, cy = y + TH / 2 + 2;
  return (
    <g>
      <rect x={cx - 2.5} y={cy - 22} width={5} height={22} fill="#5a3a18" />
      <ellipse cx={cx + 2} cy={cy - 28} rx={14} ry={7} fill="#254520" opacity={0.85} />
      <ellipse cx={cx} cy={cy - 32} rx={13} ry={7} fill="#3a6030" />
      <ellipse cx={cx - 1} cy={cy - 37} rx={10} ry={6} fill="#4a7038" />
      <ellipse cx={cx} cy={cy - 41} rx={7} ry={5} fill="#5a8040" />
      <ellipse cx={cx - 2} cy={cy - 34} rx={5} ry={3} fill="rgba(160,210,120,0.3)" />
    </g>
  );
}

function MemorialStone({ col, row }: { col: number; row: number }) {
  const { x, y } = gridToSVG(col, row);
  const cx = x, cy = y + TH / 2;
  return (
    <g>
      <ellipse cx={cx} cy={cy + 10} rx={10} ry={5} fill="#303028" opacity={0.6} />
      <rect x={cx - 7} y={cy - 18} width={14} height={27} rx={4} fill="#8a7a60" />
      <rect x={cx - 9} y={cy + 6} width={18} height={5} rx={2} fill="#7a6a50" />
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="9" fill="rgba(212,175,55,0.65)" fontFamily="'Noto Serif Hebrew', serif">✦</text>
    </g>
  );
}

function EternalFlame({ col, row }: { col: number; row: number }) {
  const { x, y } = gridToSVG(col, row);
  const cx = x, cy = y + TH / 2 - 8;
  return (
    <g filter="url(#flame-glow)">
      <rect x={cx - 16} y={cy - 2} width={32} height={34} rx={5} fill="#b09070" />
      <rect x={cx - 20} y={cy + 28} width={40} height={8} rx={3} fill="#907050" />
      <ellipse cx={cx} cy={cy - 3} rx={16} ry={7} fill="#8a6040" />
      <ellipse cx={cx} cy={cy - 14} rx={28} ry={16} fill="rgba(255,160,40,0.07)">
        <animate attributeName="rx" values="28;36;24;28" dur="3s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.07;0.14;0.05;0.07" dur="3.5s" repeatCount="indefinite" />
      </ellipse>
      <ellipse cx={cx} cy={cy - 18} rx={10} ry={16} fill="rgba(255,90,20,0.88)">
        <animate attributeName="rx" values="10;12;8;11;10" dur="2s" repeatCount="indefinite" />
        <animate attributeName="cy" values={`${cy-18};${cy-21};${cy-15};${cy-18}`} dur="2.5s" repeatCount="indefinite" />
      </ellipse>
      <ellipse cx={cx} cy={cy - 24} rx={6} ry={12} fill="rgba(255,190,70,0.9)">
        <animate attributeName="rx" values="6;7;4;6" dur="1.8s" repeatCount="indefinite" />
        <animate attributeName="cy" values={`${cy-24};${cy-27};${cy-21};${cy-24}`} dur="2s" repeatCount="indefinite" />
      </ellipse>
      <ellipse cx={cx} cy={cy - 32} rx={3} ry={5} fill="rgba(255,245,220,0.95)">
        <animate attributeName="cy" values={`${cy-32};${cy-36};${cy-29};${cy-32}`} dur="1.3s" repeatCount="indefinite" />
      </ellipse>
      <text x={cx} y={cy - 50} textAnchor="middle" fontSize="8" fill="rgba(212,175,55,0.95)" fontFamily="'Noto Serif Hebrew', serif" letterSpacing="1">נֵר תָּמִיד</text>
      <text x={cx} y={cy + 48} textAnchor="middle" fontSize="6" fill="rgba(255,255,255,0.45)" fontFamily="sans-serif" letterSpacing="2">ETERNAL LIGHT</text>
    </g>
  );
}

function Candle({ col, row, name, animOffset }: { col: number; row: number; name: string; animOffset: number }) {
  const { x, y } = gridToSVG(col, row);
  const cx = x, cy = y + TH / 2 - 2;
  const d = animOffset;
  return (
    <g filter="url(#candle-glow)" style={{ cursor: "pointer" }}>
      <ellipse cx={cx} cy={cy + 16} rx={10} ry={4} fill="rgba(255,160,40,0.18)" />
      <rect x={cx - 3.5} y={cy - 12} width={7} height={17} rx={1.5} fill="#f5eed8" />
      <rect x={cx - 4.5} y={cy + 3} width={9} height={4} rx={1.5} fill="#e8e0c8" opacity={0.9} />
      <line x1={cx} y1={cx - 12} x2={cx} y2={cy - 16} stroke="#2a2a2a" strokeWidth="0.8" />
      <ellipse cx={cx} cy={cy - 17} rx={3} ry={2.5} fill="rgba(255,110,30,0.85)">
        <animate attributeName="rx" values={`3;3.8;2.2;3.5;3`} dur={`${1.1 + d * 0.3}s`} repeatCount="indefinite" />
        <animate attributeName="ry" values={`2.5;3;1.8;2.8;2.5`} dur={`${1.4 + d * 0.2}s`} repeatCount="indefinite" />
      </ellipse>
      <ellipse cx={cx} cy={cy - 21} rx={1.8} ry={3.5} fill="rgba(255,210,90,0.92)">
        <animate attributeName="cy" values={`${cy-21};${cy-24};${cy-19};${cy-21}`} dur={`${1.2 + d * 0.25}s`} repeatCount="indefinite" />
      </ellipse>
      <text x={cx} y={cy - 30} textAnchor="middle" fontSize="6.5" fill="rgba(255,220,120,0.8)" fontFamily="serif">
        {name.length > 12 ? name.slice(0, 11) + "…" : name}
      </text>
    </g>
  );
}

function WaterShimmer({ x, y }: { x: number; y: number }) {
  const cx = x, cy = y + TH / 2;
  return (
    <g opacity={0.45}>
      <line x1={cx - 12} y1={cy - 2} x2={cx + 12} y2={cy - 2} stroke="rgba(200,240,255,0.6)" strokeWidth="1">
        <animate attributeName="opacity" values="0.6;1;0.4;0.6" dur="2.5s" repeatCount="indefinite" />
      </line>
      <line x1={cx - 8} y1={cy + 3} x2={cx + 8} y2={cy + 3} stroke="rgba(200,240,255,0.4)" strokeWidth="0.8">
        <animate attributeName="opacity" values="0.4;0.8;0.2;0.4" dur="3s" repeatCount="indefinite" />
      </line>
    </g>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   PROPS & COMPONENT
═══════════════════════════════════════════════════════════════════════════════ */
interface Props {
  onClose: () => void;
  userName?: string | null;
  initialEntries?: CommunityYahrzeitEntry[];
}

export default function MemorialSanctuaryModal({ onClose, userName, initialEntries = [] }: Props) {
  /* ── data ── */
  const [entries, setEntries] = useState<CommunityYahrzeitEntry[]>(initialEntries);

  /* ── form ── */
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", hebrewName: "", message: "", date: "" });
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  /* ── zone info ── */
  const [zoneLabel, setZoneLabel] = useState<string | null>(null);
  const zoneLabelTimer = useRef<number>(0);

  /* ── camera ── */
  const panX = useRef(195);
  const panY = useRef(190);
  const zoom = useRef(0.5);
  const worldRef = useRef<SVGGElement>(null);

  /* ── drag / pinch ── */
  const drag = useRef<{ startX: number; startY: number; px: number; py: number } | null>(null);
  const pinch = useRef<{ dist: number; startZoom: number } | null>(null);
  const moved = useRef(false);

  /* ── load entries ── */
  const load = useCallback(async () => {
    const data = await fetchCommunityYahrzeit();
    setEntries(data);
  }, []);

  useEffect(() => { if (initialEntries.length === 0) load(); }, []);

  /* ── update camera ── */
  function applyCamera() {
    if (!worldRef.current) return;
    worldRef.current.setAttribute("transform", `translate(${panX.current},${panY.current}) scale(${zoom.current})`);
  }

  function clamp(val: number, min: number, max: number) { return Math.max(min, Math.min(max, val)); }

  /* ── mouse handlers ── */
  function onMouseDown(e: React.MouseEvent) {
    drag.current = { startX: e.clientX, startY: e.clientY, px: panX.current, py: panY.current };
    moved.current = false;
  }
  function onMouseMove(e: React.MouseEvent) {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.startX;
    const dy = e.clientY - drag.current.startY;
    if (Math.abs(dx) + Math.abs(dy) > 4) moved.current = true;
    panX.current = clamp(drag.current.px + dx, -400, 800);
    panY.current = clamp(drag.current.py + dy, -300, 700);
    applyCamera();
  }
  function onMouseUp() { drag.current = null; }

  /* ── touch handlers ── */
  function onTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 1) {
      drag.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY, px: panX.current, py: panY.current };
      moved.current = false;
    } else if (e.touches.length === 2) {
      drag.current = null;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinch.current = { dist: Math.sqrt(dx * dx + dy * dy), startZoom: zoom.current };
    }
  }
  function onTouchMove(e: React.TouchEvent) {
    e.preventDefault();
    if (e.touches.length === 1 && drag.current) {
      const dx = e.touches[0].clientX - drag.current.startX;
      const dy = e.touches[0].clientY - drag.current.startY;
      if (Math.abs(dx) + Math.abs(dy) > 4) moved.current = true;
      panX.current = clamp(drag.current.px + dx, -400, 800);
      panY.current = clamp(drag.current.py + dy, -300, 700);
      applyCamera();
    } else if (e.touches.length === 2 && pinch.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const d = Math.sqrt(dx * dx + dy * dy);
      zoom.current = clamp(pinch.current.startZoom * (d / pinch.current.dist), 0.32, 1.6);
      applyCamera();
    }
  }
  function onTouchEnd() { drag.current = null; pinch.current = null; }

  /* ── tile click (zone info) ── */
  function onTileClick(zone: ZoneId) {
    if (moved.current || !ZONE_META[zone].name) return;
    const name = ZONE_META[zone].name;
    setZoneLabel(name);
    clearTimeout(zoneLabelTimer.current);
    zoneLabelTimer.current = window.setTimeout(() => setZoneLabel(null), 2500);
  }

  /* ── submit candle ── */
  async function handleSubmit() {
    if (!form.name.trim() || !form.date) return;
    setSaving(true);
    try {
      const d = new Date(form.date + "T12:00:00");
      const hd = new HDate(d);
      await createCommunityYahrzeit({
        id: `cy-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        deceasedName: form.hebrewName.trim() ? `${form.name.trim()} · ${form.hebrewName.trim()}` : form.name.trim(),
        hebrewDay: hd.getDate(),
        hebrewMonth: hd.getMonth(),
        displayDate: d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
        passingYear: d.getFullYear(),
        message: form.message.trim(),
        donorDisplayName: userName ?? "Community Member",
      });
      setSuccess(true);
      await load();
      setTimeout(() => {
        setSuccess(false);
        setShowForm(false);
        setForm({ name: "", hebrewName: "", message: "", date: "" });
      }, 3000);
    } finally {
      setSaving(false);
    }
  }

  /* ── water tiles (every 3rd for perf) ── */
  const waterTiles = SORTED_TILES.filter(t => t.zone === "waters").filter((_, i) => i % 3 === 0);

  /* ══════════════════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════════════════ */
  return (
    <div onClick={e => e.stopPropagation()} style={{ position: "fixed", inset: 0, zIndex: 9999, overflow: "hidden", userSelect: "none" }}>

      {/* ── Animations ── */}
      <style>{`
        @keyframes ms-cloud-drift {
          from { transform: translateX(0); }
          to   { transform: translateX(120vw); }
        }
        @keyframes ms-particle-rise {
          0%   { opacity: 0; transform: translateY(0) scale(0.8); }
          30%  { opacity: 0.7; }
          100% { opacity: 0; transform: translateY(-80px) scale(1.3); }
        }
        @keyframes ms-ray-sweep {
          0%,100% { opacity: 0; transform: rotate(-18deg) scaleY(0.5); }
          50%      { opacity: 0.07; transform: rotate(18deg) scaleY(1.6); }
        }
        @keyframes ms-form-slide {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        @keyframes ms-success-appear {
          0%   { opacity: 0; transform: scale(0.6) translateY(20px); }
          60%  { opacity: 1; transform: scale(1.1) translateY(-4px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes ms-badge-pulse {
          0%,100% { opacity: 0.6; }
          50%     { opacity: 1; }
        }
        @keyframes ms-btn-glow {
          0%,100% { box-shadow: 0 0 20px rgba(212,175,55,0.4), 0 6px 20px rgba(0,0,0,0.5); }
          50%     { box-shadow: 0 0 40px rgba(212,175,55,0.7), 0 6px 20px rgba(0,0,0,0.5), 0 0 60px rgba(212,175,55,0.2); }
        }
        @keyframes ms-shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
      `}</style>

      {/* ── Sky background ── */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(175deg, #c06828 0%, #e89840 15%, #f0c060 32%, #e8d898 48%, #c0d8a0 64%, #98b888 78%, #7aaa80 100%)",
      }} />

      {/* Sun */}
      <div style={{
        position: "absolute", top: "6%", left: "58%",
        width: 180, height: 180, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(255,230,120,0.75) 0%, rgba(255,200,80,0.25) 45%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Light rays */}
      {[0, 1, 2, 3].map(i => (
        <div key={i} style={{
          position: "absolute", top: 0, left: `${20 + i * 22}%`,
          width: 1, height: "65%",
          background: "linear-gradient(to bottom, rgba(255,220,100,0.14) 0%, transparent 100%)",
          transformOrigin: "top center",
          animation: `ms-ray-sweep ${6 + i * 1.5}s ease-in-out infinite`,
          animationDelay: `${i * 2}s`,
          pointerEvents: "none",
        }} />
      ))}

      {/* Mountain silhouettes */}
      <svg style={{ position: "absolute", bottom: "28%", width: "100%", height: 140, pointerEvents: "none" }}>
        <path d="M0,140 L0,60 Q80,10 160,50 Q240,90 320,30 Q400,0 480,40 Q560,80 640,20 Q720,0 760,50 L760,140 Z"
          fill="rgba(40,60,40,0.22)" />
        <path d="M0,140 L0,90 Q100,55 200,80 Q300,100 400,65 Q500,40 600,75 Q700,95 760,70 L760,140 Z"
          fill="rgba(55,75,50,0.18)" />
      </svg>

      {/* Clouds */}
      {CLOUDS.map((c, i) => (
        <div key={i} style={{
          position: "absolute", top: c.y, left: c.x,
          width: c.w, height: c.h, pointerEvents: "none",
          animation: `ms-cloud-drift ${c.speed} linear infinite`,
          animationDelay: c.delay,
        }}>
          <svg width={c.w} height={c.h} viewBox={`0 0 ${c.w} ${c.h}`}>
            <g opacity={c.opacity}>
              <ellipse cx={c.w * 0.3} cy={c.h * 0.6} rx={c.w * 0.3} ry={c.h * 0.45} fill="white" />
              <ellipse cx={c.w * 0.5} cy={c.h * 0.45} rx={c.w * 0.28} ry={c.h * 0.5} fill="white" />
              <ellipse cx={c.w * 0.7} cy={c.h * 0.6} rx={c.w * 0.25} ry={c.h * 0.42} fill="white" />
            </g>
          </svg>
        </div>
      ))}

      {/* Ambient particles */}
      {Array.from({ length: 14 }, (_, i) => (
        <div key={i} style={{
          position: "absolute",
          left: `${8 + (i * 17 + 3) % 85}%`,
          top: `${20 + (i * 23 + 5) % 65}%`,
          width: 2 + (i % 3),
          height: 2 + (i % 3),
          borderRadius: "50%",
          background: `rgba(212,175,55,${0.15 + (i % 4) * 0.07})`,
          animation: `ms-particle-rise ${4 + (i % 5)}s ease-in-out infinite`,
          animationDelay: `${(i * 0.7) % 5}s`,
          pointerEvents: "none",
        }} />
      ))}

      {/* ═══════════════════════════════════════════════════
          ISOMETRIC WORLD SVG
      ═══════════════════════════════════════════════════ */}
      <svg
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", touchAction: "none", cursor: "grab" }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <defs>
          <filter id="candle-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="flame-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <radialGradient id="garden-vignette" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(212,175,55,0.05)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
        </defs>

        <g ref={worldRef} transform={`translate(${panX.current},${panY.current}) scale(${zoom.current})`}>

          {/* Tiles — sorted back-to-front */}
          {SORTED_TILES.map(t => {
            const z = ZONE_META[t.zone];
            return (
              <g key={`${t.col}-${t.row}`} onClick={() => onTileClick(t.zone)} style={{ cursor: "pointer" }}>
                <polygon points={topFace(t.x, t.y)}   fill={z.top}   stroke="rgba(0,0,0,0.12)" strokeWidth={0.4} />
                <polygon points={leftFace(t.x, t.y)}  fill={z.left}  stroke="rgba(0,0,0,0.12)" strokeWidth={0.4} />
                <polygon points={rightFace(t.x, t.y)} fill={z.right} stroke="rgba(0,0,0,0.12)" strokeWidth={0.4} />
              </g>
            );
          })}

          {/* Water shimmer */}
          {waterTiles.map(t => <WaterShimmer key={`ws-${t.col}-${t.row}`} x={t.x} y={t.y} />)}

          {/* Trees */}
          {TREES.map((t, i) => <Tree key={`tr-${i}`} col={t.col} row={t.row} />)}

          {/* Memorial stones */}
          {MEMORIAL_STONES.map((s, i) => <MemorialStone key={`st-${i}`} col={s.col} row={s.row} />)}

          {/* Eternal flame */}
          <EternalFlame col={9} row={3} />

          {/* Lit candles */}
          {entries.slice(0, CANDLE_SPOTS.length).map((e, i) => (
            <Candle
              key={`c-${e.id}`}
              col={CANDLE_SPOTS[i].col}
              row={CANDLE_SPOTS[i].row}
              name={e.deceasedName.split("·")[0].trim()}
              animOffset={(i % 5) * 0.18}
            />
          ))}

        </g>
      </svg>

      {/* ═══════════════════════════════════════════════════
          HEADER BAR
      ═══════════════════════════════════════════════════ */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        height: 64,
        background: "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, transparent 100%)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 16px", pointerEvents: "none",
      }}>
        <button
          onClick={onClose}
          style={{
            pointerEvents: "all",
            width: 36, height: 36, borderRadius: "50%",
            background: "rgba(0,0,0,0.5)", border: "1px solid rgba(255,255,255,0.2)",
            backdropFilter: "blur(8px)",
            color: "rgba(255,255,255,0.85)", fontSize: 14, fontWeight: 700,
            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >✕</button>

        <div style={{ textAlign: "center" }}>
          <div style={{
            fontSize: 11, fontWeight: 900, letterSpacing: "0.2em",
            color: "rgba(212,175,55,0.9)", textTransform: "uppercase",
            textShadow: "0 1px 6px rgba(0,0,0,0.8)",
          }}>Community Memorial</div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.55)", letterSpacing: "0.1em", marginTop: 1 }}>
            {entries.length} candle{entries.length !== 1 ? "s" : ""} lit
          </div>
        </div>

        {/* Hint */}
        <div style={{
          fontSize: 9, color: "rgba(255,255,255,0.45)", letterSpacing: "0.06em",
          textAlign: "right", lineHeight: 1.4,
          textShadow: "0 1px 4px rgba(0,0,0,0.8)",
        }}>
          Pan &amp;<br />Explore
        </div>
      </div>

      {/* Zone label tooltip */}
      {zoneLabel && (
        <div style={{
          position: "absolute", top: 72, left: "50%", transform: "translateX(-50%)",
          padding: "6px 18px", borderRadius: 20,
          background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)",
          border: "1px solid rgba(212,175,55,0.35)",
          fontSize: 11, fontWeight: 700, color: "rgba(212,175,55,0.95)",
          letterSpacing: "0.1em", textTransform: "uppercase",
          pointerEvents: "none",
          textShadow: "0 0 10px rgba(212,175,55,0.5)",
        }}>
          {zoneLabel}
        </div>
      )}

      {/* Zone guide pills */}
      <div style={{
        position: "absolute", bottom: 100, left: 0, right: 0,
        display: "flex", justifyContent: "center", gap: 6,
        padding: "0 12px", flexWrap: "wrap", pointerEvents: "none",
      }}>
        {(["garden", "court", "grove", "waters", "valley", "outlook"] as ZoneId[]).map(z => (
          <div key={z} style={{
            padding: "3px 10px", borderRadius: 12,
            background: `${ZONE_META[z].top}40`,
            border: `1px solid ${ZONE_META[z].top}80`,
            fontSize: 8, fontWeight: 700, color: "rgba(255,255,255,0.7)",
            letterSpacing: "0.06em", textTransform: "uppercase",
            backdropFilter: "blur(4px)",
          }}>
            {ZONE_META[z].name.split(" ").slice(0, 2).join(" ")}
          </div>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════
          LIGHT CANDLE CTA BUTTON
      ═══════════════════════════════════════════════════ */}
      {!showForm && !success && (
        <div style={{ position: "absolute", bottom: 32, left: "50%", transform: "translateX(-50%)" }}>
          <button
            onClick={() => setShowForm(true)}
            style={{
              padding: "15px 30px",
              background: "linear-gradient(135deg, #D4AF37 0%, #c9a227 40%, #e8c84a 100%)",
              border: "none", borderRadius: 18,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
              animation: "ms-btn-glow 3s ease-in-out infinite",
              position: "relative", overflow: "hidden",
              whiteSpace: "nowrap",
            }}
          >
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.25) 50%, transparent 70%)",
              backgroundSize: "200% 100%",
              animation: "ms-shimmer 3s linear infinite",
              pointerEvents: "none",
            }} />
            <span style={{ fontSize: 20, position: "relative" }}>🕯</span>
            <span style={{ fontSize: 14, fontWeight: 900, color: "#1a0f00", letterSpacing: "0.04em", position: "relative" }}>
              Light Memorial Candle
            </span>
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          LIGHT CANDLE FORM (bottom sheet)
      ═══════════════════════════════════════════════════ */}
      {showForm && !success && (
        <div
          style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            borderRadius: "24px 24px 0 0",
            background: "rgba(8,6,18,0.97)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(212,175,55,0.2)",
            borderBottom: "none",
            padding: "0 20px 36px",
            animation: "ms-form-slide 0.35s cubic-bezier(0.34,1.56,0.64,1) both",
            maxHeight: "80dvh", overflowY: "auto",
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Handle */}
          <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 8px" }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)" }} />
          </div>

          {/* Sheet header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div>
              <div style={{ fontSize: 17, fontWeight: 900, color: "#fff" }}>🕯 Light a Memorial Candle</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 3 }}>
                Place a candle in the sanctuary — יהי זכרם ברוך
              </div>
            </div>
            <button
              onClick={() => setShowForm(false)}
              style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 13 }}
            >✕</button>
          </div>

          {/* Fields */}
          {[
            { label: "NAME OF BELOVED *", key: "name", placeholder: "Full name", type: "text" },
            { label: "HEBREW NAME (optional)", key: "hebrewName", placeholder: "שם", type: "text" },
          ].map(f => (
            <div key={f.key} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", color: "rgba(212,175,55,0.7)", marginBottom: 6 }}>{f.label}</div>
              <input
                type={f.type}
                value={(form as any)[f.key]}
                onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                style={{
                  width: "100%", padding: "12px 14px", boxSizing: "border-box",
                  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(212,175,55,0.22)",
                  borderRadius: 12, color: "#fff", fontSize: 14, outline: "none", fontFamily: "inherit",
                }}
              />
            </div>
          ))}

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", color: "rgba(212,175,55,0.7)", marginBottom: 6 }}>DATE OF PASSING *</div>
            <input
              type="date"
              value={form.date}
              onChange={e => setForm(prev => ({ ...prev, date: e.target.value }))}
              style={{
                width: "100%", padding: "12px 14px", boxSizing: "border-box",
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(212,175,55,0.22)",
                borderRadius: 12, color: "#fff", fontSize: 14, outline: "none", fontFamily: "inherit",
              }}
            />
          </div>

          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", color: "rgba(212,175,55,0.7)", marginBottom: 6 }}>MEMORIAL MESSAGE (optional)</div>
            <textarea
              value={form.message}
              onChange={e => setForm(prev => ({ ...prev, message: e.target.value }))}
              placeholder="Share a memory, prayer, or tribute…"
              rows={3}
              style={{
                width: "100%", padding: "12px 14px", boxSizing: "border-box",
                background: "rgba(255,255,255,0.05)", border: "1px solid rgba(212,175,55,0.22)",
                borderRadius: 12, color: "#fff", fontSize: 13, outline: "none",
                fontFamily: "inherit", resize: "none",
              }}
            />
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={saving || !form.name.trim() || !form.date}
            style={{
              width: "100%", padding: "15px 0",
              background: saving || !form.name.trim() || !form.date
                ? "rgba(212,175,55,0.25)"
                : "linear-gradient(135deg, #D4AF37 0%, #c9a227 40%, #e8c84a 100%)",
              border: "none", borderRadius: 14,
              fontSize: 15, fontWeight: 900, color: "#1a0f00",
              cursor: saving || !form.name.trim() || !form.date ? "default" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              opacity: saving ? 0.7 : 1, transition: "opacity 0.2s",
            }}
          >
            {saving ? (
              <>
                <div style={{ width: 16, height: 16, border: "2px solid rgba(0,0,0,0.3)", borderTop: "2px solid #1a0f00", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                Lighting candle…
              </>
            ) : (
              <>🕯 Light Candle in the Sanctuary</>
            )}
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          SUCCESS OVERLAY
      ═══════════════════════════════════════════════════ */}
      {success && (
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "rgba(0,0,0,0.72)", backdropFilter: "blur(8px)",
          pointerEvents: "none",
        }}>
          <div style={{
            textAlign: "center",
            animation: "ms-success-appear 0.6s cubic-bezier(0.34,1.56,0.64,1) both",
          }}>
            <div style={{ fontSize: 64, marginBottom: 16, filter: "drop-shadow(0 0 20px rgba(255,165,40,0.7))" }}>🕯</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#F5D982", marginBottom: 8,
              textShadow: "0 0 20px rgba(212,175,55,0.6)" }}>
              Candle Lit
            </div>
            <div style={{ fontFamily: "'Noto Serif Hebrew', serif", fontSize: 20, color: "#D4AF37", marginBottom: 10 }}>
              יהי זכרם ברוך
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", fontStyle: "italic" }}>
              May their memory be a blessing
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
