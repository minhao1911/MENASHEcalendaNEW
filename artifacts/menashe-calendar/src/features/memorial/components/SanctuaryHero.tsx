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
        padding: "28px 20px 24px",
        background: "linear-gradient(180deg, rgba(212,168,67,0.06) 0%, transparent 100%)",
        borderBottom: "1px solid rgba(212,168,67,0.08)",
      }}
    >
      {/* Flame icon */}
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 16,
          background: "linear-gradient(135deg, rgba(212,168,67,0.2) 0%, rgba(212,168,67,0.08) 100%)",
          border: "1px solid rgba(212,168,67,0.3)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 24,
          marginBottom: 16,
        }}
      >
        🕯
      </div>

      <div
        style={{
          fontSize: 22,
          fontWeight: 900,
          color: GOLD,
          letterSpacing: "0.02em",
          lineHeight: 1.2,
          marginBottom: 6,
        }}
      >
        {title}
      </div>

      <div
        style={{
          fontSize: 13,
          color: "rgba(255,255,255,0.5)",
          lineHeight: 1.5,
          marginBottom: 20,
        }}
      >
        {subtitle}
      </div>

      {isOffline && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            borderRadius: 10,
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.2)",
            marginBottom: 14,
          }}
        >
          <span style={{ fontSize: 14 }}>📵</span>
          <span style={{ fontSize: 12, color: "rgba(239,68,68,0.9)" }}>{offlineMessage}</span>
        </div>
      )}

      {/* Search input */}
      <div style={{ position: "relative" }}>
        <div
          style={{
            position: "absolute",
            left: 14,
            top: "50%",
            transform: "translateY(-50%)",
            pointerEvents: "none",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={GOLD} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}>
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
            padding: "13px 40px 13px 42px",
            borderRadius: 14,
            background: "rgba(255,255,255,0.06)",
            border: `1px solid ${searchValue ? "rgba(212,168,67,0.45)" : "rgba(255,255,255,0.1)"}`,
            color: "rgba(255,255,255,0.9)",
            fontSize: 15,
            outline: "none",
            boxSizing: "border-box",
            transition: "border-color 0.2s",
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
              background: "rgba(255,255,255,0.1)",
              border: "none",
              color: "rgba(255,255,255,0.5)",
              width: 22,
              height: 22,
              borderRadius: "50%",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
            }}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
