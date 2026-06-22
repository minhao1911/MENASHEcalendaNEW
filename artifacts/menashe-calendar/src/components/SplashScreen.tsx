import { useEffect, useState } from "react";

interface SplashScreenProps {
  onFinished: () => void;
}

export default function SplashScreen({ onFinished }: SplashScreenProps) {
  const [phase, setPhase] = useState<"visible" | "fading" | "done">("visible");

  useEffect(() => {
    const fadeTimer = setTimeout(() => setPhase("fading"), 2200);
    const doneTimer = setTimeout(() => {
      setPhase("done");
      onFinished();
    }, 2900);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [onFinished]);

  if (phase === "done") return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "#080e1a",
        transition: "opacity 0.7s ease",
        opacity: phase === "fading" ? 0 : 1,
        pointerEvents: phase === "fading" ? "none" : "all",
      }}
    >
      {/* Radial gold glow behind logo */}
      <div
        style={{
          position: "absolute",
          width: 340,
          height: 340,
          borderRadius: "50%",
          background:
            "radial-gradient(ellipse at center, rgba(212,175,55,0.13) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Star of David subtle watermark */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Cpolygon points='30,4 56,50 4,50' fill='none' stroke='rgba(212,175,55,0.04)' stroke-width='1'/%3E%3Cpolygon points='30,56 4,10 56,10' fill='none' stroke='rgba(212,175,55,0.04)' stroke-width='1'/%3E%3C/svg%3E")`,
          backgroundSize: "60px 60px",
          pointerEvents: "none",
        }}
      />

      {/* Logo badge */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 0,
        }}
      >
        {/* Logo with animated pulse ring */}
        <div style={{ position: "relative", marginBottom: 28 }}>
          <div
            style={{
              position: "absolute",
              inset: -10,
              borderRadius: "28px",
              border: "1.5px solid rgba(212,175,55,0.35)",
              animation: "splashRing 2s ease-in-out infinite",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: -20,
              borderRadius: "36px",
              border: "1px solid rgba(212,175,55,0.15)",
              animation: "splashRing 2s ease-in-out 0.4s infinite",
            }}
          />
          <img
            src="/logo.jpeg"
            alt="Menashe Calendar"
            style={{
              width: 100,
              height: 100,
              borderRadius: "24px",
              objectFit: "cover",
              boxShadow: [
                "0 0 0 2px rgba(212,175,55,0.5)",
                "0 8px 32px rgba(0,0,0,0.9)",
                "0 0 60px rgba(212,175,55,0.15)",
              ].join(", "),
            }}
          />
        </div>

        {/* Hebrew title */}
        <div
          style={{
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontSize: 36,
            fontWeight: 700,
            color: "#D4AF37",
            letterSpacing: "0.04em",
            textShadow: "0 0 40px rgba(212,175,55,0.4), 0 2px 8px rgba(0,0,0,0.8)",
            lineHeight: 1,
            marginBottom: 10,
            direction: "rtl",
          }}
        >
          לוּחַ הַשָּׁנָה
        </div>

        {/* English brand name */}
        <div
          style={{
            fontFamily: "Georgia, serif",
            fontSize: 15,
            fontWeight: 600,
            color: "rgba(245,240,232,0.9)",
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            marginBottom: 6,
          }}
        >
          BNEI MENASHE
        </div>

        {/* Gold rule */}
        <div
          style={{
            width: 120,
            height: 1,
            background:
              "linear-gradient(90deg, transparent, rgba(212,175,55,0.8) 35%, rgba(255,235,120,1) 50%, rgba(212,175,55,0.8) 65%, transparent)",
            margin: "18px auto 20px",
          }}
        />

        {/* Animated loading dots */}
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "#D4AF37",
                animation: `splashDot 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes splashDot {
          0%, 80%, 100% { opacity: 0.25; transform: scale(0.7); }
          40% { opacity: 1; transform: scale(1); }
        }
        @keyframes splashRing {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.04); }
        }
      `}</style>
    </div>
  );
}
