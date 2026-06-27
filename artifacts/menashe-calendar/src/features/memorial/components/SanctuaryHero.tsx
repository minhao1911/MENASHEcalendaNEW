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

export function SanctuaryHero({
  title,
  subtitle,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search for a loved one…",
  isOffline,
  offlineMessage = "You are offline",
}: SanctuaryHeroProps) {
  return (
    <div
      style={{
        padding: "32px 20px 28px",
        background: "linear-gradient(180deg, rgba(212,168,67,0.07) 0%, rgba(212,168,67,0.01) 100%)",
        borderBottom: "1px solid rgba(212,168,67,0.07)",
      }}
    >
      {/* Flame icon + title row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, marginBottom: 20 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 18,
            background: "linear-gradient(135deg, rgba(212,168,67,0.22) 0%, rgba(212,168,67,0.08) 100%)",
            border: "1px solid rgba(212,168,67,0.28)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 26,
            flexShrink: 0,
          }}
        >
          🕯
        </div>
        <div style={{ paddingTop: 4 }}>
          <div
            style={{
              fontSize: 24,
              fontWeight: 900,
              color: GOLD,
              letterSpacing: "0.01em",
              lineHeight: 1.2,
              marginBottom: 6,
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 14,
              color: "rgba(255,255,255,0.48)",
              lineHeight: 1.55,
            }}
          >
            {subtitle}
          </div>
        </div>
      </div>

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
            marginBottom: 16,
          }}
        >
          <span style={{ fontSize: 14 }}>📵</span>
          <span style={{ fontSize: 13, color: "rgba(239,68,68,0.85)" }}>{offlineMessage}</span>
        </div>
      )}

      {/* Search input */}
      <div style={{ position: "relative" }}>
        <div
          style={{
            position: "absolute",
            left: 16,
            top: "50%",
            transform: "translateY(-50%)",
            pointerEvents: "none",
          }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        <input
          type="search"
          value={searchValue}
          onChange={e => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          autoComplete="off"
          disabled={isOffline}
          style={{
            width: "100%",
            padding: "14px 44px 14px 46px",
            borderRadius: 14,
            background: "rgba(255,255,255,0.055)",
            border: `1.5px solid ${searchValue ? "rgba(212,168,67,0.5)" : "rgba(255,255,255,0.09)"}`,
            color: "rgba(255,255,255,0.92)",
            fontSize: 16,
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
              background: "rgba(255,255,255,0.09)",
              border: "none",
              color: "rgba(255,255,255,0.55)",
              width: 26,
              height: 26,
              borderRadius: "50%",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
            }}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
