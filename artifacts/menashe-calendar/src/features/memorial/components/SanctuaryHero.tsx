import { useState } from "react";
import { GOLD } from "../../../lib/theme";

interface SanctuaryHeroProps {
  title: string;
  subtitle: string;
  searchValue: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;
  isOffline?: boolean;
  offlineMessage?: string;
}

const STARS = [
  { top: "4%",  left: "4%",   r: 1.0, o: 0.82 },
  { top: "9%",  left: "14%",  r: 0.7, o: 0.55 },
  { top: "2%",  left: "27%",  r: 1.5, o: 0.92 },
  { top: "14%", left: "38%",  r: 0.8, o: 0.48 },
  { top: "6%",  left: "52%",  r: 1.2, o: 0.78 },
  { top: "11%", left: "64%",  r: 0.9, o: 0.62 },
  { top: "3%",  left: "78%",  r: 1.4, o: 0.88 },
  { top: "16%", left: "88%",  r: 0.7, o: 0.44 },
  { top: "7%",  left: "43%",  r: 0.8, o: 0.60 },
  { top: "12%", left: "22%",  r: 1.1, o: 0.70 },
  { top: "18%", left: "58%",  r: 0.7, o: 0.40 },
  { top: "5%",  left: "91%",  r: 1.0, o: 0.75 },
  { top: "21%", left: "72%",  r: 0.8, o: 0.38 },
  { top: "8%",  left: "33%",  r: 1.3, o: 0.68 },
  { top: "15%", left: "81%",  r: 0.9, o: 0.58 },
  { top: "1%",  left: "68%",  r: 1.2, o: 0.84 },
  { top: "20%", left: "46%",  r: 0.7, o: 0.36 },
  { top: "10%", left: "7%",   r: 0.9, o: 0.52 },
  { top: "13%", left: "96%",  r: 1.1, o: 0.66 },
  { top: "22%", left: "17%",  r: 0.8, o: 0.42 },
];

export function SanctuaryHero({
  title,
  subtitle,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search for a loved one…",
  isOffline,
  offlineMessage = "You are offline",
}: SanctuaryHeroProps) {
  const [minimised, setMinimised] = useState(false);

  return (
    <div>
      {/* ── Minimised bar ── */}
      {minimised && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "11px 16px",
            background: "linear-gradient(90deg, rgba(4,10,22,0.97) 0%, rgba(8,16,28,0.97) 100%)",
            borderBottom: `1px solid rgba(212,168,67,0.13)`,
          }}
        >
          <span style={{ fontSize: 18, filter: "drop-shadow(0 0 4px rgba(212,168,67,0.6))" }}>
            🕯
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 800,
                color: GOLD,
                letterSpacing: "0.05em",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {title}
            </div>
          </div>
          <button
            onClick={() => setMinimised(false)}
            aria-label="Expand welcome"
            title="Expand"
            style={{
              flexShrink: 0,
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "rgba(212,168,67,0.1)",
              border: "1px solid rgba(212,168,67,0.22)",
              color: GOLD,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="18 15 12 9 6 15" />
            </svg>
          </button>
        </div>
      )}

      {/* ── Cinematic ground-level immersive hero ── */}
      {!minimised && (
        <div
          style={{
            position: "relative",
            height: 272,
            overflow: "hidden",
            background: "linear-gradient(180deg, #010509 0%, #020c18 28%, #041522 55%, #061a1c 78%, #071510 100%)",
          }}
        >
          {/* ── LAYER 1: Night sky stars ── */}
          {STARS.map((s, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                top: s.top,
                left: s.left,
                width: s.r * 2,
                height: s.r * 2,
                borderRadius: "50%",
                background: "#fff",
                opacity: s.o,
                boxShadow: `0 0 ${s.r * 3}px rgba(200,220,255,${s.o * 0.55})`,
              }}
            />
          ))}

          {/* ── LAYER 2: Moon glow (upper right) ── */}
          <div
            style={{
              position: "absolute",
              top: -8,
              right: "18%",
              width: 68,
              height: 68,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(225,210,165,0.22) 0%, rgba(200,190,150,0.08) 45%, transparent 70%)",
              filter: "blur(10px)",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: 6,
              right: "21%",
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(235,220,180,0.85) 30%, rgba(220,205,165,0.4) 65%, transparent 100%)",
              boxShadow: "0 0 12px rgba(235,220,180,0.4)",
            }}
          />

          {/* ── LAYER 3: Distant mountain ridge (very faint, deep blue) ── */}
          <svg
            viewBox="0 0 400 60"
            preserveAspectRatio="none"
            style={{ position: "absolute", bottom: 122, left: 0, width: "100%", height: 58 }}
          >
            <polygon
              points="0,60 40,24 80,38 130,12 180,32 230,10 285,26 330,14 370,22 400,16 400,60"
              fill="#071320"
              opacity="0.85"
            />
          </svg>

          {/* ── LAYER 4: Closer hill ridge (darker green-black) ── */}
          <svg
            viewBox="0 0 400 70"
            preserveAspectRatio="none"
            style={{ position: "absolute", bottom: 100, left: 0, width: "100%", height: 68 }}
          >
            <polygon
              points="0,70 25,42 65,52 110,28 155,46 200,22 248,38 295,18 340,34 380,24 400,30 400,70"
              fill="#061109"
              opacity="0.92"
            />
          </svg>

          {/* ── LAYER 5: Cypress tree silhouettes — left cluster ── */}
          <svg
            viewBox="0 0 120 200"
            preserveAspectRatio="none"
            style={{ position: "absolute", bottom: 90, left: -4, width: 120, height: 190, opacity: 0.95 }}
          >
            {/* Far left tree (shorter) */}
            <polygon points="18,200 6,90 30,90" fill="#040e06" />
            <polygon points="18,130 8,105 28,105" fill="#050f07" />
            {/* Mid-left tree (tallest) */}
            <polygon points="52,200 36,40 68,40" fill="#030c05" />
            <polygon points="52,120 38,80 66,80" fill="#040e06" />
            <polygon points="52,80 40,60 64,60" fill="#040e06" />
            {/* Near-left tree */}
            <polygon points="90,200 76,75 104,75" fill="#040e06" />
            <polygon points="90,140 78,100 102,100" fill="#050f07" />
          </svg>

          {/* ── LAYER 5: Cypress tree silhouettes — right cluster ── */}
          <svg
            viewBox="0 0 120 200"
            preserveAspectRatio="none"
            style={{ position: "absolute", bottom: 90, right: -4, width: 120, height: 190, opacity: 0.95 }}
          >
            {/* Far right tree */}
            <polygon points="102,200 90,85 114,85" fill="#040e06" />
            <polygon points="102,130 92,108 112,108" fill="#050f07" />
            {/* Mid-right tree (tallest) */}
            <polygon points="68,200 52,38 84,38" fill="#030c05" />
            <polygon points="68,115 54,75 82,75" fill="#040e06" />
            <polygon points="68,78 56,55 80,55" fill="#040e06" />
            {/* Near-right tree */}
            <polygon points="30,200 16,72 44,72" fill="#040e06" />
            <polygon points="30,136 18,96 42,96" fill="#050f07" />
          </svg>

          {/* ── LAYER 6: Mid-ground candle row ── */}
          {/* Wide amber glow behind candle row */}
          <div
            style={{
              position: "absolute",
              bottom: 112,
              left: "50%",
              transform: "translateX(-50%)",
              width: 220,
              height: 40,
              background: "radial-gradient(ellipse 60% 100% at 50% 100%, rgba(212,160,50,0.30) 0%, transparent 100%)",
              filter: "blur(6px)",
            }}
          />
          {/* Individual candle flame glows */}
          {[-58, -34, -12, 12, 34, 58].map((xOff, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                bottom: 112 + (i % 2) * 2,
                left: `calc(50% + ${xOff}px)`,
                width: 10,
                height: 16,
                background: "radial-gradient(ellipse at 50% 80%, rgba(255,200,80,0.95) 0%, rgba(255,140,30,0.6) 40%, transparent 80%)",
                filter: "blur(2px)",
                transform: "translateX(-50%)",
                animation: `candleFlicker ${1.4 + i * 0.18}s ease-in-out infinite alternate`,
              }}
            />
          ))}

          {/* ── LAYER 7: Ground mist band ── */}
          <div
            style={{
              position: "absolute",
              bottom: 88,
              left: 0,
              right: 0,
              height: 40,
              background: "linear-gradient(180deg, transparent 0%, rgba(140,165,185,0.10) 40%, rgba(155,175,195,0.14) 65%, transparent 100%)",
              filter: "blur(4px)",
            }}
          />

          {/* ── LAYER 8: Stone path (perspective trapezoid) ── */}
          <svg
            viewBox="0 0 400 100"
            preserveAspectRatio="none"
            style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: 100 }}
          >
            {/* Dark earth ground */}
            <rect x="0" y="30" width="400" height="70" fill="#050d07" />
            {/* Stone path — narrower at top (distance), wider at bottom (foreground) */}
            <polygon points="170,30 230,30 320,100 80,100" fill="#0e1a10" />
            {/* Path centre seam highlight */}
            <line x1="200" y1="30" x2="200" y2="100" stroke="rgba(180,160,100,0.06)" strokeWidth="1" />
            {/* Stone crack lines */}
            <line x1="140" y1="65" x2="175" y2="62" stroke="rgba(100,80,40,0.08)" strokeWidth="0.8" />
            <line x1="225" y1="72" x2="265" y2="70" stroke="rgba(100,80,40,0.08)" strokeWidth="0.8" />
            <line x1="160" y1="82" x2="200" y2="80" stroke="rgba(100,80,40,0.06)" strokeWidth="0.7" />
            <line x1="200" y1="88" x2="240" y2="85" stroke="rgba(100,80,40,0.06)" strokeWidth="0.7" />
          </svg>

          {/* ── LAYER 9: Foreground dark ground overlay ── */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 28,
              background: "#040b06",
            }}
          />

          {/* ── LAYER 10: Vignette — heavy sides + top for PUBG cinematic look ── */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(90deg, rgba(0,0,0,0.70) 0%, transparent 24%, transparent 76%, rgba(0,0,0,0.70) 100%)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(to bottom, rgba(0,0,0,0.40) 0%, transparent 35%, transparent 55%, rgba(4,10,8,0.88) 100%)",
              pointerEvents: "none",
            }}
          />

          {/* ── Title overlay ── */}
          <div
            style={{
              position: "absolute",
              bottom: 22,
              left: 20,
              right: 56,
            }}
          >
            <div
              style={{
                fontSize: 21,
                fontWeight: 900,
                color: "#edd9a3",
                letterSpacing: "0.04em",
                lineHeight: 1.2,
                textShadow: "0 2px 18px rgba(0,0,0,0.95), 0 1px 4px rgba(0,0,0,0.9)",
                marginBottom: 5,
              }}
            >
              {title}
            </div>
            <div
              style={{
                fontSize: 11.5,
                color: "rgba(212,168,67,0.58)",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                textShadow: "0 1px 8px rgba(0,0,0,0.9)",
              }}
            >
              {subtitle}
            </div>
          </div>

          {/* ── Minimise button ── */}
          <button
            onClick={() => setMinimised(true)}
            aria-label="Minimise welcome"
            title="Minimise"
            style={{
              position: "absolute",
              top: 12,
              right: 12,
              width: 30,
              height: 30,
              borderRadius: 8,
              background: "rgba(0,0,0,0.48)",
              border: "1px solid rgba(255,255,255,0.11)",
              color: "rgba(255,255,255,0.60)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
              zIndex: 4,
              transition: "background 0.15s, color 0.15s",
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {/* ── Candle flicker keyframe (injected once) ── */}
          <style>{`
            @keyframes candleFlicker {
              0%   { opacity: 0.75; transform: translateX(-50%) scaleY(1.0);   }
              33%  { opacity: 0.95; transform: translateX(-52%) scaleY(1.08);  }
              66%  { opacity: 0.80; transform: translateX(-48%) scaleY(0.94);  }
              100% { opacity: 0.90; transform: translateX(-50%) scaleY(1.04);  }
            }
          `}</style>
        </div>
      )}

      {/* ── Floating search bar ── */}
      <div
        style={{
          padding: "0 16px",
          marginTop: minimised ? 14 : -22,
          position: "relative",
          zIndex: 2,
        }}
      >
        {isOffline && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "9px 14px",
              borderRadius: 10,
              background: "rgba(239,68,68,0.07)",
              border: "1px solid rgba(239,68,68,0.18)",
              marginBottom: 10,
            }}
          >
            <span style={{ fontSize: 14 }}>📵</span>
            <span style={{ fontSize: 13, color: "rgba(239,68,68,0.85)" }}>{offlineMessage}</span>
          </div>
        )}

        <div
          style={{
            position: "relative",
            borderRadius: 16,
            overflow: "hidden",
            boxShadow: minimised
              ? "none"
              : "0 4px 24px rgba(0,0,0,0.60), 0 0 0 1px rgba(212,168,67,0.14)",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 16,
              top: "50%",
              transform: "translateY(-50%)",
              pointerEvents: "none",
              zIndex: 1,
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke={GOLD}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ opacity: 0.55 }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </div>
          <input
            type="search"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            autoComplete="off"
            disabled={isOffline}
            style={{
              width: "100%",
              padding: "15px 44px 15px 44px",
              background: "rgba(10,18,32,0.96)",
              border: `1px solid ${searchValue ? "rgba(212,168,67,0.4)" : "rgba(212,168,67,0.12)"}`,
              borderRadius: 16,
              color: "rgba(255,255,255,0.92)",
              fontSize: 15,
              outline: "none",
              boxSizing: "border-box",
              transition: "border-color 0.2s",
              lineHeight: 1.4,
            }}
          />
          {searchValue && (
            <button
              onClick={() => onSearchChange("")}
              aria-label="Clear search"
              style={{
                position: "absolute",
                right: 12,
                top: "50%",
                transform: "translateY(-50%)",
                background: "rgba(255,255,255,0.08)",
                border: "none",
                color: "rgba(255,255,255,0.5)",
                width: 26,
                height: 26,
                borderRadius: "50%",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                zIndex: 1,
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
