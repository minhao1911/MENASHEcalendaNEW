import { useState } from "react";
import { NotificationPrefs, LeadTime, LEAD_TIME_OPTIONS } from "../hooks/useNotifications";

interface NotificationDrawerProps {
  onClose: () => void;
  notifPermission: NotificationPermission;
  notifPrefs: NotificationPrefs;
  leadTime: LeadTime;
  onUpdateNotifPref: (key: keyof NotificationPrefs, value: boolean) => Promise<boolean>;
  onUpdateLeadTime: (mins: LeadTime) => void;
}

export default function NotificationDrawer({
  onClose,
  notifPermission,
  notifPrefs,
  leadTime,
  onUpdateNotifPref,
  onUpdateLeadTime,
}: NotificationDrawerProps) {
  const [pendingKey, setPendingKey] = useState<keyof NotificationPrefs | null>(null);

  const notifBlocked = notifPermission === "denied";
  const notifUnsupported = typeof Notification === "undefined";
  const anyActive = Object.values(notifPrefs).some(Boolean);

  async function handleToggle(key: keyof NotificationPrefs, value: boolean) {
    if (notifBlocked || notifUnsupported) return;
    setPendingKey(key);
    await onUpdateNotifPref(key, value);
    setPendingKey(null);
  }

  function subtitle(key: keyof NotificationPrefs, text: string): string {
    if (notifUnsupported) return "Not supported in this browser";
    if (notifBlocked) return "Blocked — enable in browser settings";
    if (notifPrefs[key] && notifPermission === "granted") return `${text} · Active`;
    return text;
  }

  function Toggle({ on, onToggle, disabled }: { on: boolean; onToggle: () => void; disabled?: boolean }) {
    return (
      <div
        onClick={disabled ? undefined : onToggle}
        style={{
          width: 44, height: 26, borderRadius: 13, flexShrink: 0,
          background: disabled ? "var(--elevated)" : on ? "var(--gold)" : "var(--elevated)",
          position: "relative", cursor: disabled ? "not-allowed" : "pointer",
          transition: "background 0.2s", border: "1px solid var(--border)",
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <div style={{
          position: "absolute", top: 3, left: on ? 21 : 3, width: 18, height: 18,
          borderRadius: "50%",
          background: disabled ? "var(--text-muted)" : on ? "#1a0f00" : "var(--text-muted)",
          transition: "left 0.2s",
        }} />
      </div>
    );
  }

  function Row({ label, sub, right }: { label: string; sub?: string; right: React.ReactNode }) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 16px" }}>
        <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{label}</div>
          {sub && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{sub}</div>}
        </div>
        {right}
      </div>
    );
  }

  const ROWS: { key: keyof NotificationPrefs; label: string; sub: string }[] = [
    { key: "shabbat",       label: "🕯 Candle Lighting",    sub: `18 min before Shabbat` },
    { key: "havdalah",      label: "✨ Havdalah",           sub: "When Shabbat ends" },
    { key: "shema",         label: "📖 Latest Shema",       sub: `${leadTime} min warning — daily deadline` },
    { key: "prayers",       label: "🙏 Prayer Times",       sub: `Shacharit, Mincha & Maariv — ${leadTime} min warning` },
    { key: "holiday",       label: "✡ Holidays",            sub: "Day before each holiday" },
    { key: "parasha",       label: "📜 Weekly Parasha",     sub: "Friday morning · this Shabbat's Torah portion" },
    { key: "omer",          label: "🌾 Omer Count",         sub: "At nightfall during the 49 days" },
    { key: "shabbatDigest", label: "📋 Shabbat Digest",     sub: "Friday 8 AM · Parasha, candle lighting & week's holidays" },
    { key: "yahrzeit",      label: "🕯 Yahrtzeit",          sub: "7 AM on each Yahrtzeit day" },
  ];

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, zIndex: 8000,
          background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
        }}
      />

      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 8001,
        background: "var(--surface)",
        borderRadius: "22px 22px 0 0",
        border: "1px solid var(--border)",
        borderBottom: "none",
        maxHeight: "82dvh",
        display: "flex",
        flexDirection: "column",
        animation: "drawerSlideUp 0.28s cubic-bezier(0.34,1.2,0.64,1) both",
      }}>
        <style>{`
          @keyframes drawerSlideUp {
            from { transform: translateY(100%); opacity: 0; }
            to   { transform: translateY(0);    opacity: 1; }
          }
        `}</style>

        {/* Handle + header */}
        <div style={{ padding: "10px 16px 0", flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--border)", margin: "0 auto 14px" }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: anyActive ? "rgba(212,168,67,0.15)" : "var(--elevated)",
                border: `1px solid ${anyActive ? "rgba(212,168,67,0.4)" : "var(--border)"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke={anyActive ? "#d4a843" : "var(--text-muted)"} strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>Notifications</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {anyActive ? "Reminders are active" : "All reminders off"}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 30, height: 30, borderRadius: "50%",
                background: "var(--elevated)", border: "1px solid var(--border)",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--text-muted)", fontSize: 14,
              }}
            >✕</button>
          </div>

          {notifBlocked && (
            <div style={{
              marginBottom: 10, padding: "9px 13px", borderRadius: 10,
              background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.28)",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              <span style={{ fontSize: 15 }}>🔕</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#ef4444" }}>Notifications blocked</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Enable in your browser settings to receive reminders</div>
              </div>
            </div>
          )}
        </div>

        {/* Scrollable content */}
        <div style={{ overflowY: "auto", flex: 1, paddingBottom: 32 }}>
          {/* Lead time picker */}
          <div style={{ padding: "4px 16px 10px" }}>
            <div style={{
              borderRadius: 14, border: "1px solid var(--border)",
              background: "var(--elevated)", padding: "12px 16px",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>Reminder lead time</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Minutes warning before each event</div>
                </div>
                <div style={{ display: "flex", gap: 5 }}>
                  {LEAD_TIME_OPTIONS.map((mins) => (
                    <button
                      key={mins}
                      onClick={() => onUpdateLeadTime(mins)}
                      style={{
                        width: 36, height: 30, borderRadius: 8, border: "1px solid",
                        borderColor: leadTime === mins ? "#d4a843" : "var(--border)",
                        background: leadTime === mins ? "rgba(212,168,67,0.15)" : "var(--elevated)",
                        color: leadTime === mins ? "#d4a843" : "var(--text-muted)",
                        fontSize: 11, fontWeight: leadTime === mins ? 700 : 500,
                        cursor: "pointer", transition: "all 0.15s",
                      }}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Toggle rows */}
          <div style={{ margin: "0 16px", borderRadius: 14, border: "1px solid var(--border)", overflow: "hidden" }}>
            {ROWS.map(({ key, label, sub }, i) => (
              <div key={key}>
                {i > 0 && <div style={{ height: 1, background: "var(--border)" }} />}
                <Row
                  label={label}
                  sub={subtitle(key, sub)}
                  right={
                    <Toggle
                      on={notifPrefs[key]}
                      onToggle={() => handleToggle(key, !notifPrefs[key])}
                      disabled={notifBlocked || notifUnsupported || pendingKey === key}
                    />
                  }
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
