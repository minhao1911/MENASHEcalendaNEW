import { GOLD } from "../../../lib/theme";

interface SanctuaryWorldPreviewProps {
  onEnter: () => void;
  enterLabel?: string;
  enterSub?: string;
}

export function SanctuaryWorldPreview({ onEnter, enterLabel = "Enter the 3D Sanctuary", enterSub = "Walk among the memorial lights" }: SanctuaryWorldPreviewProps) {
  return (
    <div
      style={{
        position: "relative",
        borderRadius: 20,
        overflow: "hidden",
        border: "1px solid rgba(212,168,67,0.2)",
        marginBottom: 28,
      }}
    >
      {/* Decorative viewport — suggests the 3D landscape */}
      <div
        style={{
          height: 160,
          background: "linear-gradient(180deg, #040b1a 0%, #0c1a2e 45%, #1a2a1a 100%)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Stars layer */}
        {[
          { top: "8%",  left: "12%",  size: 1.5, opacity: 0.9 },
          { top: "15%", left: "28%",  size: 1,   opacity: 0.7 },
          { top: "6%",  left: "44%",  size: 2,   opacity: 0.8 },
          { top: "20%", left: "58%",  size: 1,   opacity: 0.6 },
          { top: "10%", left: "72%",  size: 1.5, opacity: 0.9 },
          { top: "25%", left: "82%",  size: 1,   opacity: 0.7 },
          { top: "5%",  left: "90%",  size: 2,   opacity: 0.8 },
          { top: "30%", left: "18%",  size: 1,   opacity: 0.5 },
          { top: "18%", left: "36%",  size: 1.5, opacity: 0.6 },
          { top: "12%", left: "64%",  size: 1,   opacity: 0.7 },
          { top: "22%", left: "96%",  size: 1.5, opacity: 0.6 },
        ].map((s, i) => (
          <div key={i} style={{
            position: "absolute",
            top: s.top,
            left: s.left,
            width: s.size,
            height: s.size,
            borderRadius: "50%",
            background: "#fff",
            opacity: s.opacity,
          }} />
        ))}

        {/* Moonlight glow */}
        <div style={{
          position: "absolute",
          top: -30,
          right: "20%",
          width: 80,
          height: 80,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(212,168,67,0.18) 0%, transparent 70%)",
          filter: "blur(12px)",
        }} />

        {/* Mountain silhouettes */}
        <svg
          viewBox="0 0 400 80"
          preserveAspectRatio="none"
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "100%",
            height: 80,
          }}
        >
          {/* Far mountains */}
          <polygon points="0,80 60,28 120,55 180,18 240,48 300,22 360,44 400,30 400,80" fill="#0d1f0d" opacity="0.85" />
          {/* Near mountains */}
          <polygon points="0,80 40,50 100,68 160,38 220,60 280,34 340,56 400,40 400,80" fill="#0a160a" />
        </svg>

        {/* Candle glow from below */}
        <div style={{
          position: "absolute",
          bottom: 0,
          left: "50%",
          transform: "translateX(-50%)",
          width: 120,
          height: 50,
          background: "radial-gradient(ellipse at 50% 100%, rgba(212,168,67,0.22) 0%, transparent 70%)",
          filter: "blur(6px)",
        }} />

        {/* Overlay gradient for text readability */}
        <div style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(to top, rgba(8,14,26,0.75) 0%, transparent 60%)",
        }} />
      </div>

      {/* Content overlay on bottom portion */}
      <div style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        padding: "14px 18px 18px",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: 12,
      }}>
        <div>
          <div style={{
            fontSize: 15,
            fontWeight: 800,
            color: GOLD,
            marginBottom: 2,
            letterSpacing: "0.01em",
            textShadow: "0 1px 8px rgba(0,0,0,0.8)",
          }}>
            {enterLabel}
          </div>
          <div style={{
            fontSize: 12,
            color: "rgba(212,168,67,0.55)",
            textShadow: "0 1px 6px rgba(0,0,0,0.9)",
          }}>
            {enterSub}
          </div>
        </div>
        <button
          onClick={onEnter}
          style={{
            flexShrink: 0,
            padding: "10px 18px",
            borderRadius: 12,
            background: "linear-gradient(135deg, rgba(212,168,67,0.28) 0%, rgba(212,168,67,0.14) 100%)",
            border: "1px solid rgba(212,168,67,0.45)",
            color: GOLD,
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            letterSpacing: "0.02em",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
          }}
        >
          Enter →
        </button>
      </div>
    </div>
  );
}
