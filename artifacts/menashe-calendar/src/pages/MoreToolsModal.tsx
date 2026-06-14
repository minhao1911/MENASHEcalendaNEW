interface MoreToolsModalProps {
  onClose: () => void;
  onTahara: () => void;
  onYartzeit: () => void;
  onCommunity: () => void;
  onCensus: () => void;
  onSettings: () => void;
  onDafYomi: () => void;
  onBirthday: () => void;
  onOmer: () => void;
  onPrayers: () => void;
  onSefariaSearch: () => void;
  onHebrewDate: () => void;
  onLuach: () => void;
  onMussar: () => void;
  onAnnouncements: () => void;
  onEvents: () => void;
  onMembers: () => void;
  isPremium: boolean;
  candleEnabled: boolean;
  onToggleCandle: () => void;
  onShowPremium: () => void;
}

export default function MoreToolsModal({
  onClose, onTahara, onYartzeit, onCommunity, onCensus, onSettings, onDafYomi, onBirthday, onOmer, onPrayers, onSefariaSearch, onHebrewDate, onLuach, onMussar, onAnnouncements, onEvents, onMembers,
  isPremium, candleEnabled, onToggleCandle, onShowPremium,
}: MoreToolsModalProps) {
  const TOOLS = [
    { emoji: "🕍", bg: "rgba(99,102,241,0.15)",  label: "Prayer Times",         sub: "Shacharit, Mincha & Maariv windows",      action: onPrayers },
    { emoji: "🌾", bg: "rgba(212,168,67,0.15)",  label: "Sefirat HaOmer",      sub: "Daily Omer count & sefirot",              action: onOmer },
    { emoji: "📿", bg: "rgba(124,58,237,0.15)",  label: "Mussar — 48 Ways",    sub: "Daily character-refinement program",       action: onMussar },
    { emoji: "💧", bg: "rgba(59,130,246,0.15)",  label: "Tahara Calculator",   sub: "Purity & Mikveh timing",                  action: onTahara },
    { emoji: "🕯", bg: "rgba(212,168,67,0.15)",  label: "Yahrzeit Calculator", sub: "Anniversary of passing",                  action: onYartzeit },
    { emoji: "🎂", bg: "rgba(255,99,31,0.15)",   label: "Hebrew Birthday",     sub: "Find your Jewish birthday",               action: onBirthday },
    { emoji: "📚", bg: "rgba(139,92,246,0.15)",  label: "Daf Yomi",            sub: "Today's daily Talmud page",               action: onDafYomi },
    { emoji: "🔍", bg: "rgba(212,168,67,0.15)",  label: "Torah Search",        sub: "Search Sefaria — Torah, Talmud & more",   action: onSefariaSearch },
    { emoji: "📅", bg: "rgba(99,102,241,0.15)",  label: "Hebrew Date",         sub: "Convert any date to the Jewish calendar", action: onHebrewDate },
    { emoji: "🗓", bg: "rgba(74,222,128,0.12)",  label: "Luach",               sub: "Full year Jewish calendar & holidays",    action: onLuach },
    { emoji: "🤝", bg: "rgba(255,99,31,0.15)",   label: "Community",           sub: "Connect with Bnei Menashe",               action: onCommunity },
    { emoji: "📢", bg: "rgba(212,168,67,0.15)",  label: "Announcements",       sub: "Community notices & admin broadcasts",     action: onAnnouncements },
    { emoji: "🗓", bg: "rgba(99,102,241,0.15)",  label: "Community Events",    sub: "Shabbat dinners, classes & gatherings",    action: onEvents },
    { emoji: "👥", bg: "rgba(59,130,246,0.15)",  label: "Member Directory",    sub: "Find Bnei Menashe members worldwide",      action: onMembers },
    { emoji: "📊", bg: "rgba(22,163,74,0.15)",   label: "Community Census",    sub: "Demographics & statistics",               action: onCensus },
    { emoji: "⚙️", bg: "rgba(100,116,139,0.15)", label: "Settings",            sub: "App preferences & account",               action: onSettings },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-sheet"
        onClick={e => e.stopPropagation()}
        style={{ maxHeight: "84vh", overflowY: "auto" }}
      >
        <div className="modal-handle" />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)" }}>More Tools</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>All features at a glance</div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {TOOLS.map((tool, i) => (
            <div
              key={i}
              className="tools-item"
              onClick={() => { tool.action(); }}
            >
              <div className="tools-icon" style={{ background: tool.bg }}>
                {tool.emoji}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{tool.label}</div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{tool.sub}</div>
              </div>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          ))}
        </div>

        {/* ── Widget Settings ── */}
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-muted)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
            Home Widgets
          </div>
          <div style={{
            background: "rgba(255,255,255,0.04)", borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.07)", overflow: "hidden",
          }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "14px 14px",
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                background: "rgba(212,168,67,0.13)", border: "1px solid rgba(212,168,67,0.22)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19,
              }}>🕯</div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>Live Candle Countdown</span>
                  <span style={{
                    fontSize: 9, fontWeight: 900, color: "#b8860b", letterSpacing: "0.1em",
                    background: "rgba(212,168,67,0.15)", border: "1px solid rgba(212,168,67,0.3)",
                    borderRadius: 4, padding: "2px 5px",
                  }}>👑 PREMIUM</span>
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>Shabbat & candle lighting timer on home</div>
              </div>
              {isPremium ? (
                <button
                  onClick={onToggleCandle}
                  style={{
                    width: 46, height: 26, borderRadius: 13, border: "none", cursor: "pointer",
                    background: candleEnabled
                      ? "linear-gradient(90deg, #b8860b, #d4a843)"
                      : "rgba(255,255,255,0.1)",
                    position: "relative", flexShrink: 0,
                    transition: "background 0.25s",
                  }}
                  aria-label={candleEnabled ? "Disable countdown" : "Enable countdown"}
                >
                  <span style={{
                    position: "absolute", top: 3,
                    left: candleEnabled ? 23 : 3,
                    width: 20, height: 20, borderRadius: "50%",
                    background: "white", transition: "left 0.2s",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
                  }} />
                </button>
              ) : (
                <button
                  onClick={onShowPremium}
                  style={{
                    fontSize: 11, fontWeight: 700, color: "#d4a843",
                    background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.3)",
                    borderRadius: 8, padding: "5px 10px", cursor: "pointer", flexShrink: 0,
                  }}
                >
                  Unlock
                </button>
              )}
            </div>
          </div>
        </div>

        <button onClick={onClose} className="btn-close-full" style={{ marginTop: 16 }}>
          Close
        </button>
      </div>
    </div>
  );
}
