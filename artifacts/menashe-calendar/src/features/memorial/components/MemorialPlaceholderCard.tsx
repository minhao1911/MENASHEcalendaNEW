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
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: 14,
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: "rgba(255,255,255,0.06)",
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1 }}>
          <div
            style={{
              height: 13,
              width: "60%",
              background: "rgba(255,255,255,0.06)",
              borderRadius: 6,
              marginBottom: 8,
            }}
          />
          <div
            style={{
              height: 10,
              width: "40%",
              background: "rgba(255,255,255,0.04)",
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
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 14,
        padding: "14px 16px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        cursor: onClick ? "pointer" : "default",
        transition: "background 0.15s, border-color 0.15s",
      }}
    >
      {/* Flame avatar */}
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: "linear-gradient(135deg, rgba(212,168,67,0.18) 0%, rgba(212,168,67,0.07) 100%)",
          border: "1px solid rgba(212,168,67,0.25)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 20,
          flexShrink: 0,
        }}
      >
        🕯
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "rgba(255,255,255,0.9)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            marginBottom: 2,
          }}
        >
          {name ?? "In Loving Memory"}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {hebrewName && (
            <span
              style={{
                fontSize: 11,
                color: "rgba(212,168,67,0.7)",
                fontFamily: "Georgia, serif",
              }}
            >
              {hebrewName}
            </span>
          )}
          {deathDate && (
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
              {deathDate}
            </span>
          )}
        </div>
      </div>

      {typeof candleCount === "number" && (
        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
          <span style={{ fontSize: 12 }}>🕯</span>
          <span style={{ fontSize: 11, color: GOLD, fontWeight: 700 }}>{candleCount}</span>
        </div>
      )}

      {onClick && (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(255,255,255,0.3)"
          strokeWidth="2"
          style={{ flexShrink: 0 }}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      )}
    </div>
  );
}
