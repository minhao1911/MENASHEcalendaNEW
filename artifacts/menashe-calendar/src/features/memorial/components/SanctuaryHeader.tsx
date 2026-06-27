import { GOLD } from "../../../lib/theme";

interface SanctuaryHeaderProps {
  onBack: () => void;
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export function SanctuaryHeader({
  onBack,
  title = "Memorial Sanctuary",
  subtitle,
  action,
}: SanctuaryHeaderProps) {
  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "12px 16px 12px",
        background: "rgba(8,14,26,0.94)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(212,168,67,0.10)",
      }}
    >
      {/* Back button — 44px tap target for WCAG */}
      <button
        onClick={onBack}
        aria-label="Back"
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,0.08)",
          background: "rgba(255,255,255,0.04)",
          color: "rgba(255,255,255,0.75)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          transition: "background 0.15s",
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 17,
            fontWeight: 800,
            color: GOLD,
            letterSpacing: "0.02em",
            lineHeight: 1.2,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.38)", marginTop: 2, letterSpacing: "0.01em" }}>
            {subtitle}
          </div>
        )}
      </div>

      {action && <div style={{ flexShrink: 0 }}>{action}</div>}
    </div>
  );
}
