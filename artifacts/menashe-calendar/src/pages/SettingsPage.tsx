import { useState } from "react";
import { Location } from "../lib/locations";
import { NotificationPrefs, LeadTime, LEAD_TIME_OPTIONS } from "../hooks/useNotifications";
import { useLanguage } from "../context/LanguageContext";
import TranslationEditorModal from "../modals/TranslationEditorModal";

interface SettingsPageProps {
  theme: string;
  location: Location;
  onToggleTheme: () => void;
  onLocationClick: () => void;
  onPremium: () => void;
  onTahara: () => void;
  onYartzeit: () => void;
  onBirthday: () => void;
  onCommunity: () => void;
  onCensus: () => void;
  notifPermission: NotificationPermission;
  notifPrefs: NotificationPrefs;
  leadTime: LeadTime;
  onUpdateNotifPref: (key: keyof NotificationPrefs, value: boolean) => Promise<boolean>;
  onUpdateLeadTime: (mins: LeadTime) => void;
  pushSubscribed: boolean;
  pushSupported: boolean;
  pushLoading: boolean;
  pushError: string | null;
  onSubscribePush: () => Promise<boolean>;
  onUnsubscribePush: () => void;
  onTestPush: () => Promise<boolean>;
}

export default function SettingsPage({
  theme, location,
  onToggleTheme, onLocationClick, onPremium, onTahara, onYartzeit, onBirthday, onCommunity, onCensus,
  notifPermission, notifPrefs, leadTime, onUpdateNotifPref, onUpdateLeadTime,
  pushSubscribed, pushSupported, pushLoading, pushError, onSubscribePush, onUnsubscribePush, onTestPush,
}: SettingsPageProps) {
  const { lang, setLang, t } = useLanguage();
  const [showHebrew, setShowHebrew] = useState(true);
  const [pendingKey, setPendingKey] = useState<keyof NotificationPrefs | null>(null);
  const [showTxEditor, setShowTxEditor] = useState(false);
  const [testSent, setTestSent] = useState(false);
  const isLight = theme === "light";
  const notifBlocked = notifPermission === "denied";
  const notifUnsupported = typeof Notification === "undefined";

  function Toggle({ on, onToggle, disabled }: { on: boolean; onToggle: () => void; disabled?: boolean }) {
    return (
      <div
        onClick={disabled ? undefined : onToggle}
        style={{
          width: 44, height: 26, borderRadius: 13,
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

  function Row({ label, sub, right, onClick }: { label: string; sub?: string; right: React.ReactNode; onClick?: () => void }) {
    return (
      <div
        onClick={onClick}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", cursor: onClick ? "pointer" : "default" }}
      >
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>{label}</div>
          {sub && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{sub}</div>}
        </div>
        {right}
      </div>
    );
  }

  async function handleNotifToggle(key: keyof NotificationPrefs, value: boolean) {
    if (notifBlocked || notifUnsupported) return;
    setPendingKey(key);
    await onUpdateNotifPref(key, value);
    setPendingKey(null);
  }

  function notifSubtitle(key: keyof NotificationPrefs, defaultText: string): string {
    if (notifUnsupported) return "Not supported in this browser";
    if (notifBlocked) return "Blocked — enable in browser settings";
    if (notifPrefs[key] && notifPermission === "granted") return `${defaultText} · Active`;
    return defaultText;
  }

  const anyActive = notifPrefs.shabbat || notifPrefs.havdalah || notifPrefs.holiday || notifPrefs.omer || notifPrefs.prayers || notifPrefs.parasha || notifPrefs.shema;

  return (
    <div style={{ padding: "0 0 4px" }}>
      <div className="app-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="app-icon">✡</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>Menashe</div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.1em", fontWeight: 600 }}>CALENDAR</div>
          </div>
        </div>
      </div>

      <div style={{ padding: "16px 16px 0" }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", marginBottom: 20 }}>{t.settingsTitle}</h1>

        {/* Location */}
        <div className="section-header">{t.settingsLocation}</div>
        <div className="card" style={{ marginBottom: 16, overflow: "hidden" }}>
          <Row
            label={t.settingsCity}
            sub={t.settingsCityHint}
            right={<div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 14, color: "var(--text-secondary)" }}>{location.name}</span><span style={{ color: "var(--text-muted)" }}>›</span></div>}
            onClick={onLocationClick}
          />
          <div style={{ height: 1, background: "var(--border)" }} />
          <Row label={t.settingsTimezone} right={<span style={{ fontSize: 13, color: "var(--text-muted)" }}>{location.tz}</span>} />
        </div>

        {/* Appearance */}
        <div className="section-header">{t.settingsAppearance}</div>
        <div className="card" style={{ marginBottom: 16, overflow: "hidden" }}>
          <Row
            label={t.settingsDarkMode}
            sub={isLight ? t.settingsDarkOff : t.settingsDarkOn}
            right={<Toggle on={!isLight} onToggle={onToggleTheme} />}
          />
          <div style={{ height: 1, background: "var(--border)" }} />
          <Row
            label={t.settingsShowHebrew}
            right={<Toggle on={showHebrew} onToggle={() => setShowHebrew(v => !v)} />}
          />
          <div style={{ height: 1, background: "var(--border)" }} />
          <Row
            label={t.settingsLanguage}
            sub={t.settingsLanguageHint}
            right={
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>EN</span>
                <Toggle on={lang === "tk"} onToggle={() => setLang(lang === "tk" ? "en" : "tk")} />
                <span style={{ fontSize: 11, color: lang === "tk" ? "var(--gold)" : "var(--text-muted)", fontWeight: 600 }}>TK</span>
              </div>
            }
          />
          <div style={{ height: 1, background: "var(--border)" }} />
          <button
            onClick={() => setShowTxEditor(true)}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 12,
              background: "none", border: "none", cursor: "pointer", padding: "13px 16px",
              textAlign: "left",
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{t.settingsEditTranslations}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{t.settingsEditTranslationsHint}</div>
            </div>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>

        {showTxEditor && <TranslationEditorModal onClose={() => setShowTxEditor(false)} />}

        {/* Notifications */}
        <div className="section-header">{t.settingsNotifications}</div>

        {notifBlocked && (
          <div style={{
            marginBottom: 10, padding: "10px 14px", borderRadius: 10,
            background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{ fontSize: 16 }}>🔕</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#ef4444" }}>{t.settingsNotifBlocked}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{t.settingsNotifBlockedSub}</div>
            </div>
          </div>
        )}

        {notifPermission === "granted" && anyActive && (
          <div style={{
            marginBottom: 10, padding: "10px 14px", borderRadius: 10,
            background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.25)",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{ fontSize: 16 }}>🔔</span>
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              {[
                (notifPrefs.shabbat || notifPrefs.havdalah) && `Shabbat reminders scheduled for ${location.name}`,
                notifPrefs.shema && `Latest Shema alerts — ${leadTime} min warning daily`,
                notifPrefs.holiday && "Holiday alerts active — morning before each holiday",
                notifPrefs.parasha && "Weekly Parasha — every Friday morning",
                notifPrefs.omer && "Omer reminders at nightfall during the 49 days",
                notifPrefs.prayers && `Prayer reminders (${leadTime} min warning) for ${location.name}`,
              ].filter(Boolean).join(" · ")}
            </div>
          </div>
        )}

        {/* Lead time picker */}
        <div className="card" style={{ marginBottom: 12, padding: "14px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>{t.settingsLeadTime}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{t.settingsLeadTimeHint}</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {LEAD_TIME_OPTIONS.map((mins) => (
                <button
                  key={mins}
                  onClick={() => onUpdateLeadTime(mins)}
                  style={{
                    width: 38, height: 32, borderRadius: 8, border: "1px solid",
                    borderColor: leadTime === mins ? "#d4a843" : "var(--border)",
                    background: leadTime === mins ? "rgba(212,168,67,0.15)" : "var(--elevated)",
                    color: leadTime === mins ? "#d4a843" : "var(--text-muted)",
                    fontSize: 12, fontWeight: leadTime === mins ? 700 : 500,
                    cursor: "pointer", transition: "all 0.15s",
                  }}
                >
                  {mins}m
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 16, overflow: "hidden" }}>
          <Row
            label={t.settingsCandleLighting}
            sub={notifSubtitle("shabbat", `${18} min before Shabbat`)}
            right={
              <Toggle
                on={notifPrefs.shabbat}
                onToggle={() => handleNotifToggle("shabbat", !notifPrefs.shabbat)}
                disabled={notifBlocked || notifUnsupported || pendingKey === "shabbat"}
              />
            }
          />
          <div style={{ height: 1, background: "var(--border)" }} />
          <Row
            label={t.settingsHavdalah}
            sub={notifSubtitle("havdalah", "When Shabbat ends")}
            right={
              <Toggle
                on={notifPrefs.havdalah}
                onToggle={() => handleNotifToggle("havdalah", !notifPrefs.havdalah)}
                disabled={notifBlocked || notifUnsupported || pendingKey === "havdalah"}
              />
            }
          />
          <div style={{ height: 1, background: "var(--border)" }} />
          <Row
            label={t.settingsShema}
            sub={notifSubtitle("shema", `${leadTime} min warning — daily deadline`)}
            right={
              <Toggle
                on={notifPrefs.shema}
                onToggle={() => handleNotifToggle("shema", !notifPrefs.shema)}
                disabled={notifBlocked || notifUnsupported || pendingKey === "shema"}
              />
            }
          />
          <div style={{ height: 1, background: "var(--border)" }} />
          <Row
            label={t.settingsPrayers}
            sub={notifSubtitle("prayers", `Shacharit, Mincha & Maariv — ${leadTime} min warning`)}
            right={
              <Toggle
                on={notifPrefs.prayers}
                onToggle={() => handleNotifToggle("prayers", !notifPrefs.prayers)}
                disabled={notifBlocked || notifUnsupported || pendingKey === "prayers"}
              />
            }
          />
          <div style={{ height: 1, background: "var(--border)" }} />
          <Row
            label={t.settingsHolidays}
            sub={notifSubtitle("holiday", "Day before holidays")}
            right={
              <Toggle
                on={notifPrefs.holiday}
                onToggle={() => handleNotifToggle("holiday", !notifPrefs.holiday)}
                disabled={notifBlocked || notifUnsupported || pendingKey === "holiday"}
              />
            }
          />
          <div style={{ height: 1, background: "var(--border)" }} />
          <Row
            label={t.settingsParasha}
            sub={notifSubtitle("parasha", "Friday morning · this Shabbat's Torah portion")}
            right={
              <Toggle
                on={notifPrefs.parasha}
                onToggle={() => handleNotifToggle("parasha", !notifPrefs.parasha)}
                disabled={notifBlocked || notifUnsupported || pendingKey === "parasha"}
              />
            }
          />
          <div style={{ height: 1, background: "var(--border)" }} />
          <Row
            label={t.settingsOmer}
            sub={notifSubtitle("omer", "At nightfall during the 49 days")}
            right={
              <Toggle
                on={notifPrefs.omer}
                onToggle={() => handleNotifToggle("omer", !notifPrefs.omer)}
                disabled={notifBlocked || notifUnsupported || pendingKey === "omer"}
              />
            }
          />
          <div style={{ height: 1, background: "var(--border)" }} />
          <Row
            label={t.settingsShabbatDigest}
            sub={notifSubtitle("shabbatDigest", "Friday 8 AM · Parasha, candle lighting & week's holidays")}
            right={
              <Toggle
                on={notifPrefs.shabbatDigest}
                onToggle={() => handleNotifToggle("shabbatDigest", !notifPrefs.shabbatDigest)}
                disabled={notifBlocked || notifUnsupported || pendingKey === "shabbatDigest"}
              />
            }
          />
          <div style={{ height: 1, background: "var(--border)" }} />
          <Row
            label={t.settingsYahrtzeit}
            sub={notifSubtitle("yahrzeit", "7 AM on each Yahrtzeit day")}
            right={
              <Toggle
                on={notifPrefs.yahrzeit}
                onToggle={() => handleNotifToggle("yahrzeit", !notifPrefs.yahrzeit)}
                disabled={notifBlocked || notifUnsupported || pendingKey === "yahrzeit"}
              />
            }
          />
        </div>

        {/* Background Push Notifications */}
        <div className="section-header">{t.settingsBgPush}</div>
        <div className="card" style={{ marginBottom: 16, padding: "16px" }}>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 12, lineHeight: 1.5 }}>
            {pushSupported ? t.settingsBgPushDesc : t.settingsBgPushDescUnsupported}
          </div>
          {pushError && (
            <div style={{ marginBottom: 10, padding: "8px 12px", borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", fontSize: 12, color: "#ef4444" }}>
              {pushError}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {!pushSubscribed ? (
              <button
                onClick={onSubscribePush}
                disabled={!pushSupported || pushLoading}
                style={{
                  flex: 1, padding: "10px 16px", borderRadius: 10, border: "1px solid rgba(212,168,67,0.4)",
                  background: "rgba(212,168,67,0.12)", color: "#d4a843", fontWeight: 700, fontSize: 14,
                  cursor: pushSupported && !pushLoading ? "pointer" : "not-allowed",
                  opacity: pushSupported && !pushLoading ? 1 : 0.5, transition: "all 0.15s",
                }}
              >
                {pushLoading ? t.settingsEnablingPush : t.settingsEnablePush}
              </button>
            ) : (
              <>
                <button
                  onClick={async () => { const ok = await onTestPush(); if (ok) { setTestSent(true); setTimeout(() => setTestSent(false), 3000); } }}
                  disabled={pushLoading}
                  style={{
                    flex: 1, padding: "10px 16px", borderRadius: 10, border: "1px solid rgba(212,168,67,0.4)",
                    background: "rgba(212,168,67,0.12)", color: "#d4a843", fontWeight: 700, fontSize: 13,
                    cursor: "pointer", transition: "all 0.15s",
                  }}
                >
                  {testSent ? t.settingsTestSent : t.settingsTestPush}
                </button>
                <button
                  onClick={onUnsubscribePush}
                  disabled={pushLoading}
                  style={{
                    padding: "10px 16px", borderRadius: 10, border: "1px solid rgba(239,68,68,0.3)",
                    background: "rgba(239,68,68,0.08)", color: "#ef4444", fontWeight: 600, fontSize: 13,
                    cursor: "pointer", transition: "all 0.15s",
                  }}
                >
                  {pushLoading ? "…" : t.settingsDisablePush}
                </button>
              </>
            )}
          </div>
          {pushSubscribed && (
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }} />
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{t.settingsPushActive} {location.name}</span>
            </div>
          )}
        </div>

        {/* Tools */}
        <div className="section-header">{t.settingsTools}</div>
        <div className="card" style={{ marginBottom: 16, overflow: "hidden" }}>
          {[
            { label: t.settingsTahara, sub: t.settingsTaharaSub, action: onTahara },
            { label: t.settingsYartzeitCalc, sub: t.settingsYartzeitSub, action: onYartzeit },
            { label: t.settingsBirthday, sub: t.settingsBirthdaySub, action: onBirthday },
          ].map((item, i, arr) => (
            <div key={i}>
              <Row label={item.label} sub={item.sub} right={<span style={{ color: "var(--text-muted)" }}>›</span>} onClick={item.action} />
              {i < arr.length - 1 && <div style={{ height: 1, background: "var(--border)" }} />}
            </div>
          ))}
        </div>

        {/* Community */}
        <div className="section-header">COMMUNITY</div>
        <div className="card" style={{ marginBottom: 16, overflow: "hidden" }}>
          <Row label={t.settingsCommunity} sub={t.settingsCommunitySub} right={<span style={{ color: "var(--text-muted)" }}>›</span>} onClick={onCommunity} />
          <div style={{ height: 1, background: "var(--border)" }} />
          <Row label={t.settingsCensus} sub={t.settingsCensusSub} right={<span style={{ color: "var(--text-muted)" }}>›</span>} onClick={onCensus} />
        </div>

        {/* Premium */}
        <div
          onClick={onPremium}
          style={{ padding: 16, borderRadius: 14, marginBottom: 16, background: "linear-gradient(135deg, #1a2540, #0f1e38)", border: "1px solid rgba(212,168,67,0.3)", cursor: "pointer", display: "flex", alignItems: "center", gap: 14 }}
        >
          <span style={{ fontSize: 28 }}>⭐</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "white" }}>{t.settingsUpgrade}</div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>{t.settingsUpgradeSub}</div>
          </div>
          <span style={{ color: "#d4a843", fontSize: 18 }}>›</span>
        </div>

        {/* Account */}
        <div className="section-header">{t.settingsAccount}</div>
        <div className="card" style={{ marginBottom: 16, overflow: "hidden" }}>
          <div style={{ padding: "14px 16px" }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#ef4444", cursor: "pointer" }}>{t.settingsSignOut}</div>
          </div>
        </div>

        {/* Version */}
        <div style={{ textAlign: "center", padding: "8px 0 16px", opacity: 0.4 }}>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{t.settingsVersion} · v1.0.0</div>
          <div style={{ fontFamily: "'Noto Serif Hebrew', serif", fontSize: 14, color: "var(--gold)", marginTop: 4 }}>ברוך הבא</div>
        </div>
      </div>
    </div>
  );
}
