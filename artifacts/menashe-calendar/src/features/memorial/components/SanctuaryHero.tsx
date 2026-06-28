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
  { top: "6%",  left: "8%",   r: 1.2, o: 0.85 },
  { top: "12%", left: "19%",  r: 0.9, o: 0.65 },
  { top: "4%",  left: "33%",  r: 1.6, o: 0.9  },
  { top: "18%", left: "47%",  r: 0.8, o: 0.55 },
  { top: "7%",  left: "61%",  r: 1.3, o: 0.8  },
  { top: "14%", left: "74%",  r: 1,   o: 0.7  },
  { top: "3%",  left: "88%",  r: 1.5, o: 0.9  },
  { top: "22%", left: "15%",  r: 0.8, o: 0.5  },
  { top: "9%",  left: "42%",  r: 1,   o: 0.6  },
  { top: "16%", left: "55%",  r: 1.2, o: 0.75 },
  { top: "20%", left: "82%",  r: 0.9, o: 0.6  },
  { top: "5%",  left: "96%",  r: 1.1, o: 0.8  },
  { top: "25%", left: "68%",  r: 0.8, o: 0.45 },
  { top: "10%", left: "26%",  r: 1.4, o: 0.7  },
  { top: "19%", left: "92%",  r: 1,   o: 0.65 },
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

      {/* ── Cinematic landscape hero ── */}
      {!minimised && (
        <div
          style={{
            position: "relative",
            height: 230,
            overflow: "hidden",
            background: "linear-gradient(180deg, #020810 0%, #04111f 40%, #061624 70%, #091c20 100%)",
          }}
        >
          {/* Stars */}
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
                boxShadow: `0 0 ${s.r * 2}px rgba(255,255,255,${s.o * 0.6})`,
              }}
            />
          ))}

          {/* Moon glow */}
          <div
            style={{
              position: "absolute",
              top: -20,
              right: "22%",
              width: 90,
              height: 90,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(232,213,163,0.14) 0%, transparent 70%)",
              filter: "blur(14px)",
            }}
          />

          {/* Far mountain ridge */}
          <svg
            viewBox="0 0 400 100"
            preserveAspectRatio="none"
            style={{ position: "absolute", bottom: 52, left: 0, width: "100%", height: 80 }}
          >
            <polygon
              points="0,100 50,38 100,62 160,20 220,50 280,26 340,46 400,32 400,100"
              fill="#0b1f12"
              opacity="0.9"
            />
          </svg>

          {/* Near mountain ridge */}
          <svg
            viewBox="0 0 400 100"
            preserveAspectRatio="none"
            style={{ position: "absolute", bottom: 28, left: 0, width: "100%", height: 65 }}
          >
            <polygon
              points="0,100 35,55 80,70 140,42 200,64 255,38 310,58 370,44 400,52 400,100"
              fill="#071409"
            />
          </svg>

          {/* Ground */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: 32,
              background: "#060f08",
            }}
          />

          {/* Candle glow bloom */}
          <div
            style={{
              position: "absolute",
              bottom: 20,
              left: "50%",
              transform: "translateX(-50%)",
              width: 160,
              height: 60,
              background: "radial-gradient(ellipse at 50% 100%, rgba(212,168,67,0.28) 0%, transparent 70%)",
              filter: "blur(8px)",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: 22,
              left: "50%",
              transform: "translateX(-50%)",
              width: 80,
              height: 40,
              background: "radial-gradient(ellipse at 50% 100%, rgba(245,200,100,0.32) 0%, transparent 65%)",
              filter: "blur(5px)",
            }}
          />

          {/* Bottom gradient fade */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(to top, rgba(8,14,26,0.82) 0%, transparent 55%)",
            }}
          />

          {/* Title overlay */}
          <div
            style={{
              position: "absolute",
              bottom: 18,
              left: 18,
              right: 60,
            }}
          >
            <div
              style={{
                fontSize: 20,
                fontWeight: 900,
                color: "#e8d5a3",
                letterSpacing: "0.04em",
                lineHeight: 1.2,
                textShadow: "0 2px 16px rgba(0,0,0,0.9), 0 1px 4px rgba(0,0,0,0.8)",
                marginBottom: 4,
              }}
            >
              {title}
            </div>
            <div
              style={{
                fontSize: 12,
                color: "rgba(212,168,67,0.6)",
                letterSpacing: "0.06em",
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
              background: "rgba(0,0,0,0.42)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.65)",
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
              : "0 4px 24px rgba(0,0,0,0.55), 0 0 0 1px rgba(212,168,67,0.14)",
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
