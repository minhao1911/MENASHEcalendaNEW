import { useState, useMemo } from "react";
import { useLanguage } from "../context/LanguageContext";
import { Translations, en as enBase, tk as tkBase } from "../lib/translations";

type Group = { label: string; keys: (keyof Translations)[] };

const GROUPS: Group[] = [
  {
    label: "landing",
    keys: [
      "landingBadge","landingHero","landingSubtitle","landingSignIn","landingFree",
      "landingScroll","landingFeaturesEyebrow","landingFeaturesHeading",
      "featureZmanimTitle","featureZmanimDesc","featureTorahTitle","featureTorahDesc",
      "featureCommunityTitle","featureCommunityDesc","statsParashot","statsHolidays",
      "statsCommunities","ctaHeading","ctaSubtitle",
    ],
  },
  {
    label: "nav",
    keys: ["navHome","navCalendar","navZmanim","navSiddur","navSettings"],
  },
  {
    label: "settings",
    keys: [
      "settingsTitle","settingsLocation","settingsCity","settingsCityHint","settingsTimezone",
      "settingsAppearance","settingsDarkMode","settingsDarkOn","settingsDarkOff",
      "settingsShowHebrew","settingsLanguage","settingsLanguageHint",
      "settingsEditTranslations","settingsEditTranslationsHint",
      "settingsNotifications","settingsCandleLighting","settingsHavdalah",
      "settingsShema","settingsPrayers","settingsHolidays","settingsParasha",
      "settingsOmer","settingsShabbatDigest","settingsYahrtzeit",
      "settingsLeadTime","settingsLeadTimeHint",
      "settingsEnablePush","settingsEnablingPush","settingsTestPush","settingsTestSent",
      "settingsDisablePush","settingsPushActive",
      "settingsTools","settingsTahara","settingsTaharaSub","settingsYartzeitCalc",
      "settingsYartzeitSub","settingsBirthday","settingsBirthdaySub",
      "settingsCommunity","settingsCommunitySub","settingsCensus","settingsCensusSub",
      "settingsUpgrade","settingsUpgradeSub","settingsAccount","settingsSignOut",
      "settingsVersion","settingsNotifBlocked","settingsNotifBlockedSub","settingsNotifActive",
    ],
  },
  {
    label: "home",
    keys: [
      "homeToday","homeHebrewDate","homeGregorian","homeHebrewYear",
      "homeZmanim","homeViewAll","homeSunrise","homeSunset",
      "homeCandleLighting","homeHavdalahTonight","homeShabbatShalom",
      "homeShabbatInProgress","homeHavdalahAt","homeShavuaTov",
      "homeDailyTorah","homeReadMore","homeShowLess","homeShare",
      "homeTodayHoliday","homeChagSameach","homeCommunityTitle","homeCommunityDesc",
      "homeCensusTitle","homeCensusDesc","homeUpcomingHolidays","homeNoHolidays",
      "homeParashah","homeDafYomi","homeMoreTools","homeOmer",
    ],
  },
];

const GROUP_LABELS: Record<string, { en: string; key: keyof Translations }> = {
  landing: { en: "Landing Page", key: "txEditorGroupLanding" },
  nav:     { en: "Navigation",   key: "txEditorGroupNav" },
  settings:{ en: "Settings",     key: "txEditorGroupSettings" },
  home:    { en: "Home Page",    key: "txEditorGroupHome" },
};

interface Props { onClose: () => void }

export default function TranslationEditorModal({ onClose }: Props) {
  const { t, tkOverrides, saveTkOverrides, resetTkOverrides } = useLanguage();

  const [edits, setEdits] = useState<Partial<Translations>>(() => {
    const merged: Partial<Translations> = {};
    (Object.keys(tkBase) as (keyof Translations)[]).forEach(k => {
      merged[k] = (tkOverrides[k] ?? tkBase[k]) as any;
    });
    return merged;
  });

  const [search, setSearch] = useState("");
  const [saved, setSaved] = useState(false);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  const filteredGroups = useMemo(() => {
    const q = search.toLowerCase();
    return GROUPS.map(g => ({
      ...g,
      keys: g.keys.filter(k => {
        if (activeGroup && g.label !== activeGroup) return false;
        if (!q) return true;
        const enVal = enBase[k]?.toLowerCase() ?? "";
        const tkVal = (edits[k] as string | undefined)?.toLowerCase() ?? "";
        const keyName = k.toLowerCase();
        return enVal.includes(q) || tkVal.includes(q) || keyName.includes(q);
      }),
    })).filter(g => g.keys.length > 0);
  }, [search, activeGroup, edits]);

  function handleChange(key: keyof Translations, value: string) {
    setEdits(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function handleSave() {
    saveTkOverrides(edits as Partial<Translations>);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleReset() {
    if (!window.confirm(t.txEditorResetConfirm)) return;
    resetTkOverrides();
    const reset: Partial<Translations> = {};
    (Object.keys(tkBase) as (keyof Translations)[]).forEach(k => { reset[k] = tkBase[k] as any; });
    setEdits(reset);
    setSaved(false);
  }

  const totalKeys = GROUPS.reduce((sum, g) => sum + g.keys.length, 0);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 9000,
      background: "var(--bg)", display: "flex", flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "14px 16px", borderBottom: "1px solid var(--border)",
        flexShrink: 0,
      }}>
        <button
          onClick={onClose}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 22, padding: "2px 6px", lineHeight: 1 }}
        >←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: "var(--text-primary)" }}>{t.txEditorTitle}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{totalKeys} labels</div>
        </div>
        <button
          onClick={handleSave}
          style={{
            padding: "9px 18px", borderRadius: 10,
            background: saved ? "rgba(34,197,94,0.15)" : "rgba(212,168,67,0.15)",
            border: `1px solid ${saved ? "rgba(34,197,94,0.4)" : "rgba(212,168,67,0.4)"}`,
            color: saved ? "#22c55e" : "#d4a843", fontWeight: 700, fontSize: 13, cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          {saved ? t.txEditorSaved : t.txEditorSave}
        </button>
      </div>

      {/* Note bar */}
      <div style={{
        padding: "8px 16px", background: "rgba(212,168,67,0.06)",
        borderBottom: "1px solid var(--border)", flexShrink: 0,
      }}>
        <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>{t.txEditorNote}</div>
      </div>

      {/* Toolbar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 8, padding: "10px 16px",
        borderBottom: "1px solid var(--border)", flexShrink: 0, flexWrap: "wrap",
      }}>
        {/* Search */}
        <div style={{ flex: 1, minWidth: 160, position: "relative" }}>
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "var(--text-muted)" }}>🔍</span>
          <input
            type="text"
            placeholder={t.txEditorSearch}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: "100%", padding: "8px 10px 8px 32px", borderRadius: 8,
              background: "var(--elevated)", border: "1px solid var(--border)",
              color: "var(--text-primary)", fontSize: 13, outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>
        {/* Group filter */}
        <div style={{ display: "flex", gap: 4 }}>
          {[null, ...GROUPS.map(g => g.label)].map(g => (
            <button
              key={g ?? "all"}
              onClick={() => setActiveGroup(g)}
              style={{
                padding: "6px 10px", borderRadius: 7, fontSize: 11, fontWeight: 700,
                border: "1px solid",
                borderColor: activeGroup === g ? "#d4a843" : "var(--border)",
                background: activeGroup === g ? "rgba(212,168,67,0.12)" : "var(--elevated)",
                color: activeGroup === g ? "#d4a843" : "var(--text-muted)",
                cursor: "pointer", whiteSpace: "nowrap",
              }}
            >
              {g === null ? "All" : (GROUP_LABELS[g]?.en ?? g)}
            </button>
          ))}
        </div>
      </div>

      {/* Table header */}
      <div style={{
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0,
        padding: "6px 16px", background: "var(--elevated)",
        borderBottom: "1px solid var(--border)", flexShrink: 0,
      }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: "var(--text-muted)" }}>🇬🇧 {t.txEditorEnglish}</div>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: "#d4a843" }}>✏️ {t.txEditorThadou}</div>
      </div>

      {/* Rows */}
      <div style={{ flex: 1, overflowY: "auto", padding: "0 0 80px" }}>
        {filteredGroups.map(group => (
          <div key={group.label}>
            <div style={{
              padding: "10px 16px 6px", fontSize: 10, fontWeight: 800,
              letterSpacing: "0.12em", color: "#d4a843",
              background: "rgba(212,168,67,0.04)", borderBottom: "1px solid var(--border)",
              position: "sticky", top: 0, zIndex: 2,
            }}>
              {GROUP_LABELS[group.label]?.en ?? group.label}
            </div>
            {group.keys.map((k, i) => {
              const enVal = enBase[k] as string;
              const tkVal = (edits[k] as string | undefined) ?? tkBase[k] as string;
              const isOverridden = tkOverrides[k] !== undefined;
              return (
                <div
                  key={k}
                  style={{
                    display: "grid", gridTemplateColumns: "1fr 1fr",
                    borderBottom: "1px solid var(--border)",
                    background: isOverridden ? "rgba(212,168,67,0.03)" : "transparent",
                  }}
                >
                  {/* English (read-only) */}
                  <div style={{ padding: "10px 12px 10px 16px", borderRight: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 3 }}>
                      {k}
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.4 }}>
                      {enVal}
                    </div>
                  </div>
                  {/* TK (editable) */}
                  <div style={{ padding: "8px 12px 8px 12px", display: "flex", alignItems: "stretch" }}>
                    <textarea
                      value={tkVal}
                      onChange={e => handleChange(k, e.target.value)}
                      rows={Math.min(4, Math.ceil(tkVal.length / 30) + 1)}
                      style={{
                        flex: 1, resize: "none", fontSize: 13, lineHeight: 1.4,
                        background: "var(--elevated)", color: "var(--text-primary)",
                        border: "1px solid",
                        borderColor: isOverridden ? "rgba(212,168,67,0.35)" : "var(--border)",
                        borderRadius: 7, padding: "6px 8px", outline: "none",
                        fontFamily: "inherit",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ))}
        {filteredGroups.length === 0 && (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
            No labels match "{search}"
          </div>
        )}
      </div>

      {/* Bottom action bar */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        padding: "12px 16px", background: "var(--bg)",
        borderTop: "1px solid var(--border)", display: "flex", gap: 10,
      }}>
        <button
          onClick={handleSave}
          style={{
            flex: 1, padding: "12px", borderRadius: 12,
            background: saved ? "rgba(34,197,94,0.15)" : "rgba(212,168,67,0.15)",
            border: `1px solid ${saved ? "rgba(34,197,94,0.4)" : "rgba(212,168,67,0.4)"}`,
            color: saved ? "#22c55e" : "#d4a843", fontWeight: 700, fontSize: 15, cursor: "pointer",
          }}
        >
          {saved ? t.txEditorSaved : t.txEditorSave}
        </button>
        <button
          onClick={handleReset}
          style={{
            padding: "12px 16px", borderRadius: 12,
            background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)",
            color: "#ef4444", fontWeight: 600, fontSize: 13, cursor: "pointer",
          }}
        >
          {t.txEditorReset}
        </button>
      </div>
    </div>
  );
}
