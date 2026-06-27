import { GOLD } from "../../../lib/theme";

interface MemorialPlaceholderCardProps {
  name?: string;
  hebrewName?: string | null;
  deathDate?: string;
  candleCount?: number;
  slug?: string;
  onClick?: () => void;
  shimmer?: boolean;
}

export function MemorialPlaceholderCard({
  name,
  hebrewName,
  deathDate,
  candleCount,
  onClick,
  shimmer = false,
}: MemorialPlaceholderCardProps) {
  if (shimmer) {
    return (
      <div
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.05)",
          borderRadius: 16,
          padding: "16px 18px",
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: "rgba(255,255,255,0.05)",
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1 }}>
          <div
            style={{
              height: 14,
              width: "58%",
              background: "rgba(255,255,255,0.05)",
              borderRadius: 7,
              marginBottom: 9,
            }}
          />
          <div
            style={{
              height: 11,
              width: "38%",
              background: "rgba(255,255,255,0.035)",
              borderRadius: 5,
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") onClick(); } : undefined}
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: 16,
        padding: "16px 18px",
        display: "flex",
        alignItems: "center",
        gap: 14,
        cursor: onClick ? "pointer" : "default",
        transition: "background 0.15s, border-color 0.15s, transform 0.1s",
        minHeight: 44,
      }}
    >
      {/* Flame avatar */}
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          background: "linear-gradient(135deg, rgba(212,168,67,0.18) 0%, rgba(212,168,67,0.07) 100%)",
          border: "1px solid rgba(212,168,67,0.22)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 22,
          flexShrink: 0,
        }}
      >
        🕯
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: "rgba(255,255,255,0.92)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            marginBottom: 3,
            lineHeight: 1.3,
          }}
        >
          {name ?? "In Loving Memory"}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {hebrewName && (
            <span
              style={{
                fontSize: 12,
                color: "rgba(212,168,67,0.72)",
                fontFamily: "Georgia, serif",
                lineHeight: 1.4,
              }}
            >
              {hebrewName}
            </span>
          )}
          {deathDate && (
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.32)", lineHeight: 1.4 }}>
              {deathDate}
            </span>
          )}
        </div>
      </div>

      {typeof candleCount === "number" && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          <span style={{ fontSize: 13 }}>🕯</span>
          <span style={{ fontSize: 12, color: GOLD, fontWeight: 700 }}>{candleCount}</span>
        </div>
      )}

      {onClick && (
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="2.5"
          style={{ flexShrink: 0 }}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      )}
    </div>
  );
}
