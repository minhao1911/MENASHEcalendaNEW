import { useLanguage } from "../context/LanguageContext";

interface Props { onClose: () => void; }

export const APP_VERSION = "1.2";
export const VERSION_KEY = "menashe-version-seen";

interface Release {
  version: string;
  labelEn: string;
  labelTk: string;
  items: { icon: string; en: string; tk: string }[];
}

const RELEASES: Release[] = [
  {
    version: "1.2",
    labelEn: "Latest update",
    labelTk: "Thar ber update",
    items: [
      { icon: "📲", en: "Install App banner — add Menashe Calendar to your home screen", tk: "App install — Menashe Calendar home screen-ah chhuang theih ta" },
      { icon: "📴", en: "Offline mode — core features work without internet", tk: "Internet boh nge'n app hman theih ta" },
      { icon: "🔔", en: "What's New screen — see highlights every time the app updates", tk: "Thar zawng zawng en — app update zawng zawng ah" },
    ],
  },
  {
    version: "1.1",
    labelEn: "Community & Torah tools",
    labelTk: "Mipil leh Torah thil",
    items: [
      { icon: "🙏", en: "Prayer Board — share and upvote prayer requests with the community", tk: "Thu Dawt Hmang — mipil thu dawt pe leh en theih" },
      { icon: "📖", en: "Torah Tracker — log your personal Torah study progress", tk: "Torah Chhiar — na chhiar zawng zawng chhuang rawh" },
      { icon: "👥", en: "Member Directory — browse community members", tk: "Mipil Lehkhabu — mipil member zawng zawng en theih" },
      { icon: "🕯️", en: "Community Yahrzeit Board — light a candle together", tk: "Mipil Thi Ni Hmang — mipil nena kerhi khawng rawh" },
      { icon: "📅", en: "Hebrew Date Converter — find any Hebrew date instantly", tk: "Hebrew Ni Sawi — Hebrew ni dang tak zawng in zawn rawh" },
      { icon: "🌙", en: "Luach viewer — full year calendar at a glance", tk: "Luach en — kum zawng zawng ni sawi en theih" },
      { icon: "⚖️", en: "Mussar module — daily character refinement wisdom", tk: "Mussar — nitin character siam tha na dan" },
      { icon: "⏰", en: "Zmanim info — detailed explanations of every prayer time", tk: "Zmanim sawi — thupha hun sawi zawng zawng explain" },
    ],
  },
  {
    version: "1.0",
    labelEn: "First release",
    labelTk: "Thoklang release",
    items: [
      { icon: "📆", en: "Hebrew calendar with Parasha, Daf Yomi & holidays", tk: "Hebrew calendar — Parasha, Daf Yomi leh holiday" },
      { icon: "🌅", en: "Zmanim — precise prayer times for your location", tk: "Zmanim — na hmunah thupha hun man tak tak" },
      { icon: "📚", en: "Siddur library — sacred texts for the Bnei Menashe community", tk: "Siddur lehkhabu — Bnei Menashe mipil thu thianghlim" },
      { icon: "🌐", en: "Bilingual UI — English and Thadou Kuki throughout", tk: "Bilingual — English leh Thadou Kuki" },
    ],
  },
];

export default function WhatsNewModal({ onClose }: Props) {
  const { t, lang } = useLanguage();

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9200,
        background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        padding: "0 0 0 0",
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 520,
          maxHeight: "85dvh",
          borderRadius: "24px 24px 0 0",
          background: "linear-gradient(180deg, #111827 0%, #0d1320 100%)",
          border: "1.5px solid rgba(212,175,55,0.35)",
          borderBottom: "none",
          boxShadow: "0 -12px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(212,175,55,0.08)",
          display: "flex", flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Gold accent bar */}
        <div style={{ height: 3, background: "linear-gradient(90deg, transparent, rgba(212,175,55,0.9) 30%, rgba(255,235,120,1) 50%, rgba(212,175,55,0.9) 70%, transparent)" }} />

        {/* Header */}
        <div style={{ padding: "20px 22px 14px", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: "linear-gradient(135deg, #1a2a10, #0f1e12)",
            border: "1.5px solid rgba(212,175,55,0.4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22,
          }}>✨</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 19, fontWeight: 800, color: "#F5D982", lineHeight: 1.2 }}>
              {t.whatsNewTitle}
            </div>
            <div style={{ fontSize: 12, color: "rgba(245,240,232,0.5)", marginTop: 2 }}>
              {t.whatsNewSubtitle}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.07)", border: "none",
              color: "rgba(245,240,232,0.5)", fontSize: 18, lineHeight: 1,
              borderRadius: 8, padding: "6px 9px", cursor: "pointer", flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* Scrollable list of releases */}
        <div style={{ overflowY: "auto", padding: "0 22px 28px", display: "flex", flexDirection: "column", gap: 22 }}>
          {RELEASES.map((release, ri) => (
            <div key={release.version}>
              {/* Version badge */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
                  padding: "3px 9px", borderRadius: 20,
                  background: ri === 0 ? "linear-gradient(135deg, #b8860b, #d4a843)" : "rgba(255,255,255,0.07)",
                  color: ri === 0 ? "#1a0f00" : "rgba(245,240,232,0.45)",
                }}>
                  v{release.version}
                </span>
                <span style={{ fontSize: 12, color: ri === 0 ? "rgba(212,175,55,0.9)" : "rgba(245,240,232,0.35)", fontWeight: 600 }}>
                  {lang === "tk" ? release.labelTk : release.labelEn}
                </span>
                {ri > 0 && (
                  <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
                )}
              </div>

              {/* Feature items */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {release.items.map((item, ii) => (
                  <div key={ii} style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
                    <span style={{
                      fontSize: 17, lineHeight: 1,
                      width: 28, flexShrink: 0, textAlign: "center",
                      marginTop: 1,
                      filter: ri > 0 ? "grayscale(0.4) opacity(0.65)" : "none",
                    }}>
                      {item.icon}
                    </span>
                    <span style={{
                      fontSize: 13, lineHeight: 1.5,
                      color: ri === 0 ? "rgba(245,240,232,0.88)" : "rgba(245,240,232,0.45)",
                    }}>
                      {lang === "tk" ? item.tk : item.en}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ padding: "0 22px 28px" }}>
          <button
            onClick={onClose}
            style={{
              width: "100%", padding: "14px", borderRadius: 14, border: "none",
              background: "linear-gradient(135deg, #b8860b, #d4a843, #f0c96a)",
              color: "#1a0f00", fontSize: 15, fontWeight: 800, cursor: "pointer",
              boxShadow: "0 4px 20px rgba(212,168,67,0.35)",
            }}
          >
            {t.whatsNewGotIt}
          </button>
        </div>
      </div>
    </div>
  );
}
