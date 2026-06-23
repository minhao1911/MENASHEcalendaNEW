import { useState, useEffect, useRef } from "react";

export interface CompassCardProps {
  gradient: string;
  accentColor: string;
  category: string;
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  badge?: React.ReactNode;
  previewContent?: React.ReactNode;
  onTap?: () => void;
  expandedTitle?: string;
  expandedSubtitle?: string;
  children?: React.ReactNode;
  minHeight?: number;
  style?: React.CSSProperties;
  shimmerColor?: string;
}

export default function CompassCard({
  gradient,
  accentColor,
  category,
  icon,
  title,
  subtitle,
  badge,
  previewContent,
  onTap,
  expandedTitle,
  expandedSubtitle,
  children,
  minHeight = 200,
  style,
  shimmerColor,
}: CompassCardProps) {
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [pressed, setPressed] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  function handleTap() {
    if (onTap) { onTap(); return; }
    if (children) setOpen(true);
  }

  function handleClose() {
    setClosing(true);
    setTimeout(() => { setOpen(false); setClosing(false); }, 320);
  }

  useEffect(() => {
    if (open) { document.body.style.overflow = "hidden"; }
    else { document.body.style.overflow = ""; }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const shimmer = shimmerColor ?? accentColor;

  return (
    <>
      <style>{`
        @keyframes cc-shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes cc-overlay-in {
          from { opacity: 0; transform: translateY(100%); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes cc-overlay-out {
          from { opacity: 1; transform: translateY(0); }
          to   { opacity: 0; transform: translateY(100%); }
        }
        @keyframes cc-backdrop-in {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes cc-backdrop-out {
          from { opacity: 1; }
          to   { opacity: 0; }
        }
        @keyframes cc-explore-pulse {
          0%, 100% { opacity: 0.5; transform: translateX(0); }
          50%  { opacity: 1;   transform: translateX(3px); }
        }
        .compass-card-root {
          position: relative;
          border-radius: 22px;
          overflow: hidden;
          margin-bottom: 14px;
          cursor: pointer;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
          transition: transform 0.18s cubic-bezier(0.34,1.56,0.64,1),
                      box-shadow 0.18s ease;
          will-change: transform;
        }
        .compass-card-root:active {
          transform: scale(0.973);
        }
        .compass-card-root.pressed {
          transform: scale(0.973);
          box-shadow: 0 2px 10px rgba(0,0,0,0.5) !important;
        }
        .compass-card-explore {
          animation: cc-explore-pulse 1.8s ease-in-out infinite;
        }
      `}</style>

      {/* ── Collapsed Card ── */}
      <div
        className={`compass-card-root${pressed ? " pressed" : ""}`}
        style={{
          background: gradient,
          boxShadow: "0 6px 28px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06)",
          border: `1px solid ${accentColor}33`,
          minHeight,
          ...style,
        }}
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => { setPressed(false); handleTap(); }}
        onPointerLeave={() => setPressed(false)}
        onPointerCancel={() => setPressed(false)}
      >
        {/* Shimmer overlay */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
          background: `linear-gradient(105deg, transparent 30%, ${shimmer}18 50%, transparent 70%)`,
          backgroundSize: "200% 100%",
          animation: "cc-shimmer 5s linear infinite",
          borderRadius: 22,
        }} />

        {/* Gradient fade at bottom */}
        <div style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 80,
          background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 100%)",
          pointerEvents: "none", zIndex: 1,
        }} />

        {/* Content */}
        <div style={{ position: "relative", zIndex: 2 }}>
          {/* Category + badge row */}
          <div style={{ padding: "18px 18px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{
              fontSize: 9.5, fontWeight: 900, letterSpacing: "0.14em",
              color: accentColor, textTransform: "uppercase",
              background: `${accentColor}20`, border: `1px solid ${accentColor}40`,
              padding: "3px 9px", borderRadius: 20,
            }}>{category}</span>
            {badge && <div>{badge}</div>}
          </div>

          {/* Icon + Title */}
          <div style={{ padding: "12px 18px 0" }}>
            <div style={{ fontSize: 38, lineHeight: 1, marginBottom: 8, filter: "drop-shadow(0 2px 12px rgba(0,0,0,0.5))" }}>
              {icon}
            </div>
            <div style={{
              fontSize: 22, fontWeight: 900, color: "white", lineHeight: 1.15,
              letterSpacing: "-0.02em", marginBottom: subtitle ? 4 : 0,
              textShadow: "0 1px 8px rgba(0,0,0,0.6)",
            }}>{title}</div>
            {subtitle && (
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.58)", fontWeight: 500, lineHeight: 1.4 }}>{subtitle}</div>
            )}
          </div>

          {/* Preview content */}
          {previewContent && (
            <div style={{ padding: "10px 18px 0" }}>{previewContent}</div>
          )}

          {/* Explore chevron */}
          <div style={{
            padding: "12px 18px 16px",
            display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 4,
          }}>
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: "rgba(255,255,255,0.4)", textTransform: "uppercase" }}>
              {onTap ? "Open" : "Explore"}
            </span>
            <div className="compass-card-explore">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* ── Full-Screen Expanded Overlay ── */}
      {open && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 9800,
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            animation: closing ? "cc-backdrop-out 0.32s ease forwards" : "cc-backdrop-in 0.25s ease",
          }}
          onClick={handleClose}
        >
          <div
            ref={bodyRef}
            onClick={e => e.stopPropagation()}
            style={{
              position: "absolute", left: 0, right: 0, bottom: 0,
              maxHeight: "92vh",
              borderRadius: "24px 24px 0 0",
              background: "linear-gradient(180deg, #0d1020 0%, #080b14 100%)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderBottom: "none",
              boxShadow: "0 -8px 60px rgba(0,0,0,0.7)",
              display: "flex", flexDirection: "column",
              animation: closing ? "cc-overlay-out 0.32s cubic-bezier(0.4,0,1,1) forwards" : "cc-overlay-in 0.38s cubic-bezier(0.34,1.3,0.64,1)",
            }}
          >
            {/* Expanded Header */}
            <div style={{
              background: gradient,
              borderRadius: "24px 24px 0 0",
              padding: "22px 20px 18px",
              flexShrink: 0,
              position: "relative",
              overflow: "hidden",
            }}>
              {/* Shimmer */}
              <div style={{
                position: "absolute", inset: 0, pointerEvents: "none",
                background: `linear-gradient(105deg, transparent 30%, ${shimmer}18 50%, transparent 70%)`,
                backgroundSize: "200% 100%",
                animation: "cc-shimmer 5s linear infinite",
              }} />

              {/* Pull handle */}
              <div style={{
                position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)",
                width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.25)",
              }} />

              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", position: "relative", zIndex: 1 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{
                    fontSize: 9, fontWeight: 900, letterSpacing: "0.14em", color: accentColor,
                    textTransform: "uppercase",
                    background: `${accentColor}20`, border: `1px solid ${accentColor}40`,
                    padding: "3px 9px", borderRadius: 20, display: "inline-block", marginBottom: 8,
                  }}>{category}</span>
                  <div style={{
                    fontSize: 24, fontWeight: 900, color: "white", lineHeight: 1.1,
                    letterSpacing: "-0.02em", marginBottom: expandedSubtitle ? 4 : 0,
                  }}>{expandedTitle ?? title}</div>
                  {expandedSubtitle && (
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>{expandedSubtitle}</div>
                  )}
                </div>
                <button
                  onClick={handleClose}
                  style={{
                    flexShrink: 0, width: 34, height: 34, borderRadius: "50%",
                    background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.15)",
                    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 16, color: "rgba(255,255,255,0.8)", marginLeft: 12,
                  }}
                >✕</button>
              </div>
            </div>

            {/* Scrollable body */}
            <div style={{ overflowY: "auto", flex: 1, padding: "0 0 40px" }}>
              {children}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
