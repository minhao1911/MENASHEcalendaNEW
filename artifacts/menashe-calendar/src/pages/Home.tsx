import { useState, useEffect, useRef } from "react";
import { useUser } from "@clerk/react";
import { HebrewCalendar, HDate, flags } from "@hebcal/core";
import { getOmerDay, buildHebrewText } from "../modals/OmerModal";
import RoshChodeshBanner from "../components/RoshChodeshBanner";
import CompassCard from "../components/CompassCard";
import TimeAwareBackground from "../components/TimeAwareBackground";
import ShabbatMode from "../components/ShabbatMode";
import torahScrollWatermark from "@assets/afc3e4a8-094b-4933-9d08-f8fb899140c9_1782276994801.png";
import dailyWisdomBg from "@assets/ChatGPT_Image_Jun_24,_2026,_12_01_34_PM_1782300946792.png";
import { getHebrewDate, getDayOfWeek, getHebrewMonthName, hebrewDayNumeral } from "../lib/hebrewCalendar";
import { calculateZmanim, formatTime } from "../lib/zmanim";
import type { ZmanimTimes } from "../lib/zmanim";
import { getCurrentParasha, getUpcomingHolidays } from "../lib/parasha";
import { Location } from "../lib/locations";
import { sendNotification, isNotifSupported } from "../hooks/useNotifications";
import { useLanguage } from "../context/LanguageContext";
import { fetchCommunityYahrzeit } from "../lib/userApi";
import type { ServerAnnouncement } from "../lib/announcementsApi";
import { useTrialStatus } from "../hooks/useTrialStatus";
import { getYahrzeitEntries, getNextYahrzeit, hebrewDayLabel } from "../lib/yahrzeit";
import type { YartzeitEntry } from "../lib/yahrzeit";
import { getParashaAnniversaries } from "../lib/parashaAnniversaries";
import type { ParashaAnniversary } from "../lib/parashaAnniversaries";
import {
  API_BASE,
  MEMBER_DIR_KEY, ANN_STRIP_DISMISSED_KEY,
  CANDLE_COLLAPSED_KEY, YAHRZEIT_CARD_MINIMIZED_KEY, HOLIDAY_CARD_MINIMIZED_KEY,
  SHABBAT_BAR_MINIMIZED_KEY, AI_CHAT_HISTORY_KEY, AI_CHAT_MINIMIZED_KEY,
  FAB_POS_KEY, FAB_HINT_KEY,
  HOLIDAY_EMOJI, getHolidayEmoji,
  HOLIDAY_THEMES,
  TORAH_THOUGHTS,
  AI_SUGGESTED, AI_FOLLOWUPS_EN, AI_FOLLOWUPS_TK,
} from "./home/data";

interface HolidayInsight {
  overview: string;
  spiritualTheme: string;
  bneiManasheConnection: string;
}

function TodayHolidayCard({ name }: { name: string }) {
  const { t } = useLanguage();
  const [insight, setInsight] = useState<HolidayInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const emoji = getHolidayEmoji(name);

  useEffect(() => {
    fetch(`${API_BASE}/holiday-insights`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ holidayName: name }),
    })
      .then(r => r.ok ? r.json() : null)
      .then((data: HolidayInsight | null) => { if (data) setInsight(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [name]);

  function share() {
    if (!insight) return;
    const text = [
      `${emoji} ${name} — Today's Holiday`,
      ``,
      insight.overview,
      ``,
      `✡ Bnei Menashe Connection`,
      insight.bneiManasheConnection,
      ``,
      `— Sacred Calendar of Bnei Menashe`,
    ].join("\n");
    if (navigator.share) {
      navigator.share({ title: name, text }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(text).catch(() => {});
    }
  }

  return (
    <div style={{
      marginBottom: 12, borderRadius: 16, overflow: "hidden",
      background: "linear-gradient(135deg, #1a2e1a 0%, #0d1e0d 60%, #1a1a2e 100%)",
      border: "1px solid rgba(74,222,128,0.25)",
      boxShadow: "0 4px 20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(74,222,128,0.08)",
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{ padding: "14px 16px 0", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14, flexShrink: 0,
          background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.2)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24,
        }}>
          {emoji}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
            <span style={{
              fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", color: "#4ade80",
              background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.2)",
              padding: "2px 7px", borderRadius: 5,
            }}>{t.homeTodayHoliday}</span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "white", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {name}
          </div>
          <div style={{ fontSize: 11, color: "#86efac", marginTop: 1 }}>{t.homeChagSameach}</div>
        </div>
      </div>

      {/* Insight body */}
      <div style={{ padding: "12px 16px" }}>
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 14, height: 14, borderRadius: "50%", flexShrink: 0,
              border: "2px solid rgba(74,222,128,0.3)", borderTopColor: "#4ade80",
              animation: "spin 0.8s linear infinite",
            }} />
            <span style={{ fontSize: 12, color: "#86efac" }}>Loading holiday insight…</span>
          </div>
        )}

        {!loading && insight && (
          <>
            <p style={{
              fontSize: 13, color: "#d1fae5", lineHeight: 1.7, marginBottom: 10,
              display: "-webkit-box", WebkitLineClamp: expanded ? undefined : 3,
              WebkitBoxOrient: "vertical", overflow: expanded ? "visible" : "hidden",
            }}>
              {insight.overview}
            </p>

            {!expanded && (
              <button
                onClick={() => setExpanded(true)}
                style={{ fontSize: 12, color: "#4ade80", background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 700, marginBottom: 10 }}
              >
                {t.homeReadMore}
              </button>
            )}

            {expanded && (
              <>
                <div style={{ marginBottom: 10, padding: "10px 12px", borderRadius: 10, background: "rgba(74,222,128,0.07)", border: "1px solid rgba(74,222,128,0.15)" }}>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: "#4ade80", marginBottom: 5 }}>🌟 SPIRITUAL THEME</div>
                  <p style={{ fontSize: 13, color: "#d1fae5", lineHeight: 1.7, margin: 0 }}>{insight.spiritualTheme}</p>
                </div>
                <div style={{ marginBottom: 10, padding: "10px 12px", borderRadius: 10, background: "rgba(212,168,67,0.07)", border: "1px solid rgba(212,168,67,0.18)" }}>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", color: "#d4a843", marginBottom: 5 }}>✡ BNEI MENASHE CONNECTION</div>
                  <p style={{ fontSize: 13, color: "#fef3c7", lineHeight: 1.7, margin: 0 }}>{insight.bneiManasheConnection}</p>
                </div>
              </>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              {expanded && (
                <button
                  onClick={() => setExpanded(false)}
                  style={{
                    flex: 1, padding: "9px 0",
                    background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: 10, color: "#94a3b8", fontSize: 12, fontWeight: 700, cursor: "pointer",
                  }}
                >
                  {t.homeShowLess}
                </button>
              )}
              <button
                onClick={share}
                style={{
                  flex: 1, padding: "9px 0",
                  background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.2)",
                  borderRadius: 10, color: "#4ade80", fontSize: 12, fontWeight: 700, cursor: "pointer",
                }}
              >
                {t.homeShare}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}


function getTodaySpecialStatus(today: Date): { label: string; emoji: string; type: string } | null {
  try {
    const fastEvents = HebrewCalendar.calendar({
      start: today, end: today, il: true, isHebrewYear: false,
      mask: flags.MINOR_FAST | flags.MAJOR_FAST,
    });
    if (fastEvents.length > 0) {
      return { type: "fast", label: fastEvents[0].render("en"), emoji: "📿" };
    }
    const rcEvents = HebrewCalendar.calendar({
      start: today, end: today, il: true, isHebrewYear: false,
      mask: flags.ROSH_CHODESH,
    });
    if (rcEvents.length > 0) {
      return { type: "roshChodesh", label: rcEvents[0].render("en"), emoji: "🌙" };
    }
    const specialShabbat = HebrewCalendar.calendar({
      start: today, end: today, il: true, isHebrewYear: false,
      mask: flags.SPECIAL_SHABBAT,
    });
    if (specialShabbat.length > 0) {
      return { type: "specialShabbat", label: specialShabbat[0].render("en"), emoji: "✨" };
    }
  } catch {}
  return null;
}

function DailyBriefingCard({ today, hdate, omerDay, onShowOmer }: {
  today: Date;
  hdate: HDate;
  omerDay: number | null;
  onShowOmer: () => void;
}) {
  const { t } = useLanguage();
  const dayIndex = Math.abs(hdate.abs()) % TORAH_THOUGHTS.length;
  const thought = TORAH_THOUGHTS[dayIndex];
  const specialStatus = getTodaySpecialStatus(today);
  const isShabbat = today.getDay() === 6;

  const dayOfWeekHebrew = [
    "Yom Rishon", "Yom Sheni", "Yom Shlishi", "Yom Revi'i",
    "Yom Chamishi", "Yom Shishi", "Shabbat Kodesh",
  ][today.getDay()];

  const statusColor =
    specialStatus?.type === "fast" ? "#94a3b8" :
    specialStatus?.type === "roshChodesh" ? "#818cf8" :
    specialStatus?.type === "specialShabbat" ? "#d4a843" :
    isShabbat ? "#d4a843" : "var(--text-muted)";

  const statusBg =
    specialStatus?.type === "fast" ? "rgba(148,163,184,0.08)" :
    specialStatus?.type === "roshChodesh" ? "rgba(129,140,248,0.08)" :
    specialStatus?.type === "specialShabbat" ? "rgba(212,168,67,0.08)" :
    isShabbat ? "rgba(212,168,67,0.08)" : "rgba(255,255,255,0.04)";

  const statusBorder =
    specialStatus?.type === "fast" ? "rgba(148,163,184,0.2)" :
    specialStatus?.type === "roshChodesh" ? "rgba(129,140,248,0.22)" :
    specialStatus?.type === "specialShabbat" ? "rgba(212,168,67,0.22)" :
    isShabbat ? "rgba(212,168,67,0.2)" : "var(--border)";

  return (
    <div className="card" style={{ marginBottom: 12, padding: 0, overflow: "hidden" }}>
      {/* Status bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 14px 8px",
        background: statusBg,
        borderBottom: `1px solid ${statusBorder}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 14 }}>
            {specialStatus ? specialStatus.emoji : isShabbat ? "✡" : "☀️"}
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: statusColor, letterSpacing: "0.03em" }}>
            {specialStatus ? specialStatus.label : dayOfWeekHebrew}
          </span>
        </div>
        {omerDay !== null && (
          <button
            onClick={onShowOmer}
            style={{
              display: "flex", alignItems: "center", gap: 5, cursor: "pointer",
              background: "rgba(212,168,67,0.12)", border: "1px solid rgba(212,168,67,0.25)",
              borderRadius: 99, padding: "3px 10px 3px 6px",
            }}
          >
            <svg width="24" height="24" viewBox="0 0 52 52" style={{ flexShrink: 0 }}>
              <circle cx="26" cy="26" r="20" fill="none" stroke="rgba(212,168,67,0.2)" strokeWidth="5" />
              <circle cx="26" cy="26" r="20" fill="none" stroke="#d4a843" strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 20}
                strokeDashoffset={2 * Math.PI * 20 - (omerDay / 49) * 2 * Math.PI * 20}
                transform="rotate(-90 26 26)"
              />
            </svg>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#d4a843", whiteSpace: "nowrap" }}>
              {t.homeOmer} {omerDay}/49
            </span>
          </button>
        )}
      </div>

      {/* Torah thought */}
      <div style={{ padding: "12px 14px 14px" }}>
        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", color: "var(--text-muted)", marginBottom: 8 }}>
          {t.homeDailyTorah}
        </div>
        <blockquote style={{
          margin: 0, padding: "10px 12px",
          background: "rgba(212,168,67,0.05)", borderRadius: 10,
          borderLeft: "3px solid rgba(212,168,67,0.4)",
        }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.6, margin: "0 0 6px" }}>
            "{thought.quote}"
          </p>
          <p style={{ fontSize: 11, color: "#d4a843", fontWeight: 700, margin: 0 }}>
            — {thought.source}
          </p>
        </blockquote>
      </div>
    </div>
  );
}

function CandleLightingCountdown({ location, onNavigate }: { location: Location; onNavigate: (page: string) => void }) {
  const { t } = useLanguage();
  const [now, setNow] = useState(() => new Date());
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(CANDLE_COLLAPSED_KEY) === "true"; } catch { return false; }
  });

  function toggleCollapse(e: React.MouseEvent) {
    e.stopPropagation();
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem(CANDLE_COLLAPSED_KEY, String(next)); } catch {}
  }

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const todayDay = now.getDay();
  const isFriday = todayDay === 5;
  const isShabbat = todayDay === 6;

  type Mode = "candle" | "shabbat_begun" | "havdalah" | "shavua_tov";
  let mode: Mode = "candle";
  let targetTime: Date | null = null;
  let headerLabel = t.homeCandleLighting;
  let subLabel = "";
  let timeStr = "";

  if (isShabbat) {
    const z = calculateZmanim(now, location.lat, location.lng, location.candleLightingMinutes);
    if (z.havdalah && now < z.havdalah) {
      mode = "havdalah";
      targetTime = z.havdalah;
      headerLabel = t.homeHavdalahTonight;
      timeStr = formatTime(z.havdalah, location.tz);
      subLabel = t.homeShabbatShalom;
    } else {
      mode = "shavua_tov";
    }
  } else if (isFriday) {
    const z = calculateZmanim(now, location.lat, location.lng, location.candleLightingMinutes);
    if (z.candleLighting && now < z.candleLighting) {
      mode = "candle";
      targetTime = z.candleLighting;
      subLabel = "Today";
      timeStr = formatTime(z.candleLighting, location.tz);
    } else {
      mode = "shabbat_begun";
      if (z.havdalah) timeStr = formatTime(z.havdalah, location.tz);
    }
  } else {
    const daysUntil = ((5 - todayDay) + 7) % 7 || 7;
    const nextFri = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntil, 12, 0, 0, 0);
    const z = calculateZmanim(nextFri, location.lat, location.lng, location.candleLightingMinutes);
    targetTime = z.candleLighting;
    timeStr = formatTime(z.candleLighting, location.tz);
    subLabel = daysUntil === 1
      ? "Tomorrow"
      : nextFri.toLocaleDateString(t.homeToday === "NIZAN" ? "en-US" : "en-US", { weekday: "short", month: "short", day: "numeric" });
  }

  const diff = targetTime ? Math.max(0, targetTime.getTime() - now.getTime()) : 0;
  const totalSec = Math.floor(diff / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const progress = Math.min(100, Math.max(2, (1 - diff / (7 * 86400 * 1000)) * 100));

  const pad = (n: number) => String(n).padStart(2, "0");

  /* ── Collapse chevron button ── */
  const CollapseBtn = ({ light }: { light?: boolean }) => (
    <button
      onClick={toggleCollapse}
      aria-label="Minimize"
      style={{
        background: "none", border: "none", cursor: "pointer", padding: "4px 6px",
        color: light ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.35)",
        fontSize: 14, lineHeight: 1, borderRadius: 6,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >▲</button>
  );

  /* ── Collapsed compact row ── */
  if (collapsed) {
    const compactEmoji = mode === "havdalah" ? "✨" : mode === "shavua_tov" ? "🌟" : "🕯";
    const compactColor = (mode === "havdalah" || mode === "shavua_tov") ? "#a78bfa" : "#d4a843";
    const compactText =
      mode === "shabbat_begun" ? "שַׁבָּת שָׁלוֹם · Shabbat in progress" :
      mode === "shavua_tov"    ? "שָׁבוּעַ טוֹב · Shavua Tov!" :
      mode === "havdalah"      ? `Havdalah · ${timeStr}` :
      `Candle Lighting · ${subLabel}${timeStr ? ` · ${timeStr}` : ""}`;
    return (
      <div
        onClick={() => onNavigate("zmanim")}
        style={{
          marginBottom: 12, borderRadius: 12, cursor: "pointer",
          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
          display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
        }}
      >
        <span style={{ fontSize: 18, flexShrink: 0 }}>{compactEmoji}</span>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: compactColor, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {compactText}
        </span>
        <button
          onClick={toggleCollapse}
          aria-label="Expand"
          style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 6px", color: "rgba(255,255,255,0.4)", fontSize: 14 }}
        >▼</button>
      </div>
    );
  }

  /* ── Shabbat has begun ── */
  if (mode === "shabbat_begun") {
    return (
      <div style={{
        marginBottom: 12, borderRadius: 16, overflow: "hidden",
        background: "linear-gradient(135deg, #0c1a0c 0%, #0a1a10 60%, #0d160d 100%)",
        border: "1px solid rgba(74,222,128,0.25)",
        padding: "16px 16px",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
      }}>
        <div>
          <div style={{ fontFamily: "'Noto Serif Hebrew', serif", fontSize: 22, color: "#4ade80", direction: "rtl", lineHeight: 1.1, marginBottom: 4 }}>שַׁבָּת שָׁלוֹם</div>
          <div style={{ fontSize: 13, color: "rgba(74,222,128,0.7)", fontWeight: 600 }}>{t.homeShabbatInProgress}</div>
          {timeStr && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 4 }}>{t.homeHavdalahAt} {timeStr}</div>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <div style={{ fontSize: 36 }}>✨</div>
          <CollapseBtn />
        </div>
      </div>
    );
  }

  /* ── Shavua Tov ── */
  if (mode === "shavua_tov") {
    return (
      <div style={{
        marginBottom: 12, borderRadius: 16, overflow: "hidden",
        background: "linear-gradient(135deg, #0a0a1a 0%, #100a20 100%)",
        border: "1px solid rgba(167,139,250,0.25)",
        padding: "16px 16px",
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
      }}>
        <div>
          <div style={{ fontFamily: "'Noto Serif Hebrew', serif", fontSize: 22, color: "#a78bfa", direction: "rtl", lineHeight: 1.1, marginBottom: 4 }}>שָׁבוּעַ טוֹב</div>
          <div style={{ fontSize: 13, color: "rgba(167,139,250,0.7)", fontWeight: 600 }}>{t.homeShavuaTov}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <div style={{ fontSize: 36 }}>🌟</div>
          <CollapseBtn />
        </div>
      </div>
    );
  }

  /* ── Countdown (candle or havdalah) ── */
  const isHavdalah = mode === "havdalah";
  const accentColor = isHavdalah ? "#a78bfa" : "#d4a843";
  const borderColor = isHavdalah ? "rgba(167,139,250,0.3)" : "rgba(212,168,67,0.3)";
  const bgGrad = isHavdalah
    ? "linear-gradient(135deg, #0a0812 0%, #0f0820 60%, #120b1a 100%)"
    : "linear-gradient(135deg, #100d00 0%, #0d1020 60%, #0a0d00 100%)";
  const barGrad = isHavdalah
    ? "linear-gradient(90deg, #4c1d95, #a78bfa, #c4b5fd)"
    : "linear-gradient(90deg, #6b4800, #d4a843, #f0c050)";

  return (
    <div
      onClick={() => onNavigate("zmanim")}
      style={{
        marginBottom: 12, borderRadius: 16, overflow: "hidden",
        background: bgGrad, border: `1px solid ${borderColor}`,
        cursor: "pointer",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px 6px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10, flexShrink: 0,
            background: `rgba(${isHavdalah ? "167,139,250" : "212,168,67"},0.12)`,
            border: `1px solid rgba(${isHavdalah ? "167,139,250" : "212,168,67"},0.25)`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
          }}>
            {isHavdalah ? "✨" : "🕯"}
          </div>
          <div>
            <div style={{ fontSize: 9, fontWeight: 900, color: accentColor, letterSpacing: "0.12em" }}>{headerLabel}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 1 }}>{subLabel}</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{location.name}</div>
            <div style={{ fontSize: 14, fontWeight: 800, color: accentColor, letterSpacing: "-0.5px" }}>{timeStr}</div>
          </div>
          <CollapseBtn />
        </div>
      </div>

      {/* Big countdown digits */}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 2, padding: "8px 14px 12px" }}>
        {d > 0 && (
          <>
            <div style={{ textAlign: "center", minWidth: 52 }}>
              <div style={{ fontSize: 42, fontWeight: 900, color: "white", lineHeight: 1, letterSpacing: "-2px", fontVariantNumeric: "tabular-nums" }}>{pad(d)}</div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontWeight: 700, letterSpacing: "0.1em", marginTop: 2 }}>DAYS</div>
            </div>
            <div style={{ fontSize: 34, fontWeight: 900, color: "rgba(255,255,255,0.2)", paddingBottom: 12, marginBottom: 2 }}>:</div>
          </>
        )}
        <div style={{ textAlign: "center", minWidth: 52 }}>
          <div style={{ fontSize: 42, fontWeight: 900, color: "white", lineHeight: 1, letterSpacing: "-2px", fontVariantNumeric: "tabular-nums" }}>{pad(h)}</div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontWeight: 700, letterSpacing: "0.1em", marginTop: 2 }}>HRS</div>
        </div>
        <div style={{ fontSize: 34, fontWeight: 900, color: "rgba(255,255,255,0.2)", paddingBottom: 12, marginBottom: 2 }}>:</div>
        <div style={{ textAlign: "center", minWidth: 52 }}>
          <div style={{ fontSize: 42, fontWeight: 900, color: "white", lineHeight: 1, letterSpacing: "-2px", fontVariantNumeric: "tabular-nums" }}>{pad(m)}</div>
          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontWeight: 700, letterSpacing: "0.1em", marginTop: 2 }}>MIN</div>
        </div>
        {d === 0 && (
          <>
            <div style={{ fontSize: 34, fontWeight: 900, color: "rgba(255,255,255,0.2)", paddingBottom: 12, marginBottom: 2 }}>:</div>
            <div style={{ textAlign: "center", minWidth: 52 }}>
              <div style={{ fontSize: 42, fontWeight: 900, color: accentColor, lineHeight: 1, letterSpacing: "-2px", fontVariantNumeric: "tabular-nums" }}>{pad(s)}</div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontWeight: 700, letterSpacing: "0.1em", marginTop: 2 }}>SEC</div>
            </div>
          </>
        )}
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: "rgba(255,255,255,0.06)" }}>
        <div style={{
          width: `${progress}%`, height: "100%",
          background: barGrad,
          borderRadius: "0 2px 2px 0",
          transition: "width 1s linear",
        }} />
      </div>
    </div>
  );
}

// ── Upcoming Celebrations (Birthday / Aliyah Anniversary) ──────────────────

function daysUntilAnniversary(dateStr: string): number {
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date(); today.setHours(0, 0, 0, 0);
  let ann = new Date(today.getFullYear(), d.getMonth(), d.getDate());
  if (ann < today) ann = new Date(today.getFullYear() + 1, d.getMonth(), d.getDate());
  return Math.round((ann.getTime() - today.getTime()) / 86400000);
}

interface CelebEntry {
  id: string; name: string; role: string; country: string;
  whatsapp?: string; email?: string; phone?: string;
  type: "birthday" | "aliyah"; days: number;
}

function CountdownChip({ days, t }: { days: number; t: { celebToday: string; celebTomorrow: string; celebInDays: string } }) {
  if (days === 0) return (
    <span style={{
      fontSize: 10, fontWeight: 900, padding: "4px 10px", borderRadius: 99,
      background: "linear-gradient(90deg, rgba(74,222,128,0.25), rgba(74,222,128,0.12))",
      border: "1px solid rgba(74,222,128,0.4)", color: "#4ade80",
      letterSpacing: ".04em", whiteSpace: "nowrap",
      animation: "celebPulse 1.8s ease-in-out infinite",
    }}>{t.celebToday}</span>
  );
  if (days === 1) return (
    <span style={{
      fontSize: 10, fontWeight: 900, padding: "4px 10px", borderRadius: 99,
      background: "rgba(251,191,36,0.13)", border: "1px solid rgba(251,191,36,0.35)",
      color: "#fbbf24", letterSpacing: ".04em", whiteSpace: "nowrap",
    }}>{t.celebTomorrow}</span>
  );
  return (
    <span style={{
      fontSize: 10, fontWeight: 800, padding: "4px 10px", borderRadius: 99,
      background: "rgba(148,163,184,0.1)", border: "1px solid rgba(148,163,184,0.2)",
      color: "var(--text-muted)", letterSpacing: ".04em", whiteSpace: "nowrap",
    }}>{t.celebInDays.replace("{n}", String(days))}</span>
  );
}

function UpcomingCelebrations({ onShowMembers }: { onShowMembers: () => void }) {
  const { t } = useLanguage();
  const [celebs, setCelebs] = useState<CelebEntry[]>([]);

  useEffect(() => {
    function load() {
      try {
        const raw = localStorage.getItem(MEMBER_DIR_KEY);
        const members = raw ? JSON.parse(raw) : [];
        const found: CelebEntry[] = [];
        for (const m of members) {
          if (m.status !== "approved") continue;
          if (m.birthday) {
            const days = daysUntilAnniversary(m.birthday);
            if (days >= 0 && days <= 7) found.push({ id: m.id, name: m.name, role: m.role, country: m.country, whatsapp: m.whatsapp, email: m.email, phone: m.phone, type: "birthday", days });
          }
          if (m.aliyahDate) {
            const days = daysUntilAnniversary(m.aliyahDate);
            if (days >= 0 && days <= 7) found.push({ id: m.id + "-al", name: m.name, role: m.role, country: m.country, whatsapp: m.whatsapp, email: m.email, phone: m.phone, type: "aliyah", days });
          }
        }
        found.sort((a, b) => a.days - b.days);
        setCelebs(found);
      } catch {}
    }
    load();
    window.addEventListener("storage", load);
    return () => window.removeEventListener("storage", load);
  }, []);

  if (celebs.length === 0) return null;

  return (
    <div style={{
      marginBottom: 14, borderRadius: 16, overflow: "hidden",
      border: "1px solid rgba(212,168,67,0.22)",
      background: "linear-gradient(135deg, rgba(26,16,0,0.88), rgba(10,10,20,0.94))",
    }}>
      <style>{`
        @keyframes celebPulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(74,222,128,0); }
          50%      { box-shadow: 0 0 0 4px rgba(74,222,128,0.15); }
        }
        @keyframes celebRowIn {
          from { opacity: 0; transform: translateX(-8px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "11px 14px 9px",
        borderBottom: "1px solid rgba(212,168,67,0.1)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <span style={{ fontSize: 15 }}>🎉</span>
          <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: ".09em", color: "#d4a843", textTransform: "uppercase" }}>
            {t.celebTitle}
          </span>
          <span style={{
            fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 99,
            background: "rgba(212,168,67,0.15)", color: "#d4a843", border: "1px solid rgba(212,168,67,0.25)",
          }}>{celebs.length}</span>
        </div>
        <button
          onClick={onShowMembers}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "rgba(212,168,67,0.5)", fontWeight: 700 }}
        >
          {t.celebDirLink}
        </button>
      </div>

      {/* Celebration rows */}
      <div style={{ padding: "8px 12px 10px", display: "flex", flexDirection: "column", gap: 7 }}>
        {celebs.map((c, idx) => {
          const isBday = c.type === "birthday";
          const firstName = c.name.split(" ")[0];
          const msg = isBday
            ? `🎂 Happy Birthday ${c.name}! May Hashem bless you with a year of Torah, joy, and shalom! מזל טוב from your Bnei Menashe family! 🕍`
            : `✈️ Happy Aliyah Anniversary ${c.name}! Celebrating your sacred journey to Eretz Yisrael! May Hashem bless this year even more! 🇮🇱`;
          const waLink = c.whatsapp
            ? `https://wa.me/${c.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`
            : null;
          const mailLink = c.email
            ? `mailto:${c.email}?subject=${encodeURIComponent(isBday ? `Happy Birthday ${firstName}! 🎂` : `Happy Aliyah Anniversary ${firstName}! ✈️`)}&body=${encodeURIComponent(msg)}`
            : null;
          const accentColor = isBday ? "#d4a843" : "#60a5fa";
          const accentBg = isBday ? "rgba(212,168,67,0.09)" : "rgba(59,130,246,0.09)";
          const accentBorder = isBday ? "rgba(212,168,67,0.2)" : "rgba(59,130,246,0.2)";

          return (
            <div
              key={c.id}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 10px", borderRadius: 12,
                background: accentBg, border: `1px solid ${accentBorder}`,
                animation: `celebRowIn 0.3s ${idx * 0.06}s cubic-bezier(0.34,1.2,0.64,1) both`,
              }}
            >
              {/* Icon */}
              <div style={{
                width: 38, height: 38, borderRadius: 11, flexShrink: 0,
                background: isBday ? "rgba(212,168,67,0.14)" : "rgba(59,130,246,0.14)",
                border: `1px solid ${accentBorder}`,
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 19,
              }}>
                {isBday ? "🎂" : "✈️"}
              </div>

              {/* Name + type */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 12, fontWeight: 800, color: "var(--text-primary)",
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginBottom: 3,
                }}>
                  {c.name}
                </div>
                <div style={{ fontSize: 10, fontWeight: 700, color: accentColor, letterSpacing: ".03em" }}>
                  {isBday ? t.celebTypeBirthday : t.celebTypeAliyah}
                </div>
              </div>

              {/* Countdown chip */}
              <CountdownChip days={c.days} t={t} />

              {/* Action buttons */}
              <div style={{ display: "flex", gap: 5, flexShrink: 0, marginLeft: 2 }}>
                {waLink && (
                  <a href={waLink} target="_blank" rel="noreferrer" title="Send WhatsApp greeting"
                    style={{
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      width: 32, height: 32, borderRadius: 9,
                      background: "rgba(37,211,102,0.13)", border: "1px solid rgba(37,211,102,0.28)",
                      fontSize: 16, textDecoration: "none",
                    }}>
                    📱
                  </a>
                )}
                {mailLink && (
                  <a href={mailLink} title="Send email greeting"
                    style={{
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      width: 32, height: 32, borderRadius: 9,
                      background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.22)",
                      fontSize: 15, textDecoration: "none",
                    }}>
                    ✉️
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CommunityCard({ onShowCommunity, onShowCensus, onShowMembers }: { onShowCommunity: () => void; onShowCensus: () => void; onShowMembers: () => void }) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      marginBottom: 4, borderRadius: 18, overflow: "hidden",
      background: "linear-gradient(140deg, #0b1628 0%, #091320 55%, #0e1520 100%)",
      border: `1px solid ${expanded ? "rgba(99,179,237,0.35)" : "rgba(99,179,237,0.18)"}`,
      boxShadow: expanded
        ? "0 6px 28px rgba(0,0,0,0.55), inset 0 1px 0 rgba(99,179,237,0.08)"
        : "0 3px 16px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.03)",
      transition: "border-color 0.25s, box-shadow 0.25s",
    }}>
      <style>{`
        @keyframes communitySlideDown {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── Collapsed / Header row (always visible, tappable) ── */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: "100%", background: "none", border: "none", cursor: "pointer",
          padding: "14px 16px", display: "flex", alignItems: "center", gap: 13,
          textAlign: "left",
        }}
      >
        {/* Icon */}
        <div style={{
          width: 42, height: 42, borderRadius: 12, flexShrink: 0,
          background: "linear-gradient(135deg, rgba(99,179,237,0.22), rgba(59,130,246,0.1))",
          border: "1px solid rgba(99,179,237,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
          boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
        }}>🤝</div>

        {/* Label */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", color: "#63b3ed", marginBottom: 2 }}>
            BNEI MENASHE
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: "white", lineHeight: 1.1 }}>Community</div>
        </div>

        {/* Badge count + chevron */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <div style={{
            display: "flex", gap: 5,
          }}>
            <div style={{
              fontSize: 9, fontWeight: 800, letterSpacing: "0.06em",
              padding: "3px 8px", borderRadius: 99,
              background: "rgba(99,179,237,0.12)", border: "1px solid rgba(99,179,237,0.22)",
              color: "#93c5fd",
            }}>2 SERVICES</div>
          </div>
          <svg
            width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="rgba(99,179,237,0.7)" strokeWidth="2.5" strokeLinecap="round"
            style={{ transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)", transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {/* Divider (only when expanded) */}
      {expanded && (
        <div style={{ height: 1, background: "rgba(99,179,237,0.12)", margin: "0 16px" }} />
      )}

      {/* ── Expanded content ── */}
      {expanded && (
        <div style={{
          padding: "12px 14px 16px",
          animation: "communitySlideDown 0.22s cubic-bezier(0.4,0,0.2,1)",
        }}>
          {/* Member Directory Button */}
          <button
            onClick={(e) => { e.stopPropagation(); onShowMembers(); }}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 14, marginBottom: 10,
              background: "rgba(99,179,237,0.07)", border: "1px solid rgba(99,179,237,0.2)",
              borderRadius: 13, padding: "13px 15px", cursor: "pointer", textAlign: "left",
            }}
          >
            <div style={{
              width: 38, height: 38, borderRadius: 11, flexShrink: 0,
              background: "rgba(99,179,237,0.14)", border: "1px solid rgba(99,179,237,0.25)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
            }}>👥</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "white", marginBottom: 2 }}>{t.homeMembersTitle}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.42)", lineHeight: 1.4 }}>
                {t.homeMembersDesc}
              </div>
            </div>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(99,179,237,0.55)" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>

          {/* Census & Demographics Button */}
          <button
            onClick={(e) => { e.stopPropagation(); onShowCensus(); }}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 14,
              background: "rgba(212,168,67,0.07)", border: "1px solid rgba(212,168,67,0.2)",
              borderRadius: 13, padding: "13px 15px", cursor: "pointer", textAlign: "left",
            }}
          >
            <div style={{
              width: 38, height: 38, borderRadius: 11, flexShrink: 0,
              background: "rgba(212,168,67,0.12)", border: "1px solid rgba(212,168,67,0.22)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
            }}>📊</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "white", marginBottom: 2 }}>{t.homeCensusTitle}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.42)", lineHeight: 1.4 }}>
                {t.homeCensusDesc}
              </div>
            </div>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(212,168,67,0.55)" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

function DateZmanimCard({
  today, hdate, zmanim, location, showCandleLighting, onNavigate, forceExpand, cardRef,
}: {
  today: Date;
  hdate: import("@hebcal/core").HDate;
  zmanim: ReturnType<typeof calculateZmanim>;
  location: Location;
  showCandleLighting: boolean;
  onNavigate: (page: string) => void;
  forceExpand?: boolean;
  cardRef?: React.RefObject<HTMLDivElement>;
}) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (forceExpand) {
      setExpanded(true);
      setTimeout(() => {
        cardRef?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    }
  }, [forceExpand]);

  // ── Nearby Synagogues state ──
  interface Synagogue {
    id: number;
    name: string;
    lat: number;
    lng: number;
    distKm: number;
  }
  const [synMap, setSynMap] = useState<{ lat: number; lng: number }>({ lat: location.lat, lng: location.lng });
  const [synSelected, setSynSelected] = useState<Synagogue | null>(null);
  const [synagogues, setSynagogues] = useState<Synagogue[]>([]);
  const [synLoading, setSynLoading] = useState(false);
  const [synError, setSynError] = useState(false);
  const synFetchedRef = useRef<string>("");

  useEffect(() => {
    if (!expanded) return;
    const key = `${location.lat.toFixed(4)},${location.lng.toFixed(4)}`;
    if (synFetchedRef.current === key) return;
    synFetchedRef.current = key;
    setSynLoading(true);
    setSynError(false);
    setSynagogues([]);
    setSynSelected(null);
    setSynMap({ lat: location.lat, lng: location.lng });

    const query = `[out:json][timeout:15];(node["amenity"="place_of_worship"]["religion"="jewish"](around:10000,${location.lat},${location.lng});way["amenity"="place_of_worship"]["religion"="jewish"](around:10000,${location.lat},${location.lng}););out center 12;`;
    fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`)
      .then(r => r.json())
      .then(data => {
        const toRad = (d: number) => (d * Math.PI) / 180;
        const distKm = (lat2: number, lng2: number) => {
          const R = 6371;
          const dLat = toRad(lat2 - location.lat);
          const dLng = toRad(lng2 - location.lng);
          const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(location.lat)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
          return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        };
        const results: Synagogue[] = (data.elements ?? []).map((el: any) => ({
          id: el.id,
          name: el.tags?.name || el.tags?.["name:en"] || "Synagogue",
          lat: el.lat ?? el.center?.lat,
          lng: el.lon ?? el.center?.lon,
          distKm: distKm(el.lat ?? el.center?.lat, el.lon ?? el.center?.lon),
        })).filter((s: Synagogue) => s.lat && s.lng)
          .sort((a: Synagogue, b: Synagogue) => a.distKm - b.distKm)
          .slice(0, 8);
        setSynagogues(results);
        setSynLoading(false);
      })
      .catch(() => { setSynError(true); setSynLoading(false); });
  }, [expanded, location.lat, location.lng]);

  const mapSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${synMap.lng - 0.06},${synMap.lat - 0.06},${synMap.lng + 0.06},${synMap.lat + 0.06}&layer=mapnik&marker=${synMap.lat},${synMap.lng}`;

  // Bearing from current location to Jerusalem (31.7767°N, 35.2345°E)
  const bearingToJerusalem = (() => {
    const toRad = (d: number) => d * Math.PI / 180;
    const lat1 = toRad(location.lat);
    const lat2 = toRad(31.7767);
    const dLng = toRad(35.2345 - location.lng);
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  })();

  const hebrewDay   = hebrewDayNumeral(hdate.getDate());
  const hebrewMonth = getHebrewMonthName(hdate);
  const hebrewYear  = hdate.getFullYear();
  const dayName     = getDayOfWeek(today);
  const monthStr    = today.toLocaleDateString("en-US", { month: "long" });
  const yearStr     = today.getFullYear();

  return (
    <div ref={cardRef} style={{
      marginBottom: 12, borderRadius: 18, overflow: "hidden",
      background: "linear-gradient(160deg, #0e1020 0%, #0a0e1a 50%, #10090a 100%)",
      border: `1px solid ${expanded ? "rgba(212,168,67,0.4)" : "rgba(212,168,67,0.22)"}`,
      boxShadow: expanded
        ? "0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(212,168,67,0.1)"
        : "0 3px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(212,168,67,0.05)",
      transition: "border-color 0.25s, box-shadow 0.25s",
    }}>
      <style>{`
        @keyframes dateZmanimSlide {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── Header / Collapsed row ── */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: "100%", background: "none", border: "none", cursor: "pointer",
          padding: "16px 16px 14px", display: "flex", alignItems: "center", gap: 14,
          textAlign: "left",
        }}
      >
        {/* Hebrew date block */}
        <div style={{
          flexShrink: 0, textAlign: "center",
          padding: "10px 14px", borderRadius: 13,
          background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.22)",
          minWidth: 68,
        }}>
          <div style={{
            fontFamily: "'Noto Serif Hebrew', serif",
            fontSize: 22, fontWeight: 800, color: "#f0c050",
            lineHeight: 1.1, direction: "rtl", marginBottom: 3,
          }}>
            {hebrewDay}
          </div>
          <div style={{
            fontFamily: "'Noto Serif Hebrew', serif",
            fontSize: 11, color: "#d4a843", fontWeight: 700,
            direction: "rtl", lineHeight: 1.2,
          }}>
            {hebrewMonth}
          </div>
        </div>

        {/* Center text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", color: "rgba(212,168,67,0.6)", marginBottom: 3 }}>
            {dayName.toUpperCase()} · {t.homeToday}
          </div>
          <div style={{ fontSize: 20, fontWeight: 900, color: "white", lineHeight: 1, letterSpacing: "-0.5px" }}>
            {today.getDate()} {monthStr}
          </div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 4, fontWeight: 600, letterSpacing: "0.04em" }}>
            Hebrew Year {hebrewYear}
          </div>
        </div>

        {/* Chevron */}
        <svg
          width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="rgba(212,168,67,0.6)" strokeWidth="2.5" strokeLinecap="round"
          style={{
            flexShrink: 0,
            transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* ── Expanded content ── */}
      {expanded && (
        <div style={{ animation: "dateZmanimSlide 0.22s cubic-bezier(0.4,0,0.2,1)" }}>

          {/* Full Hebrew date strip */}
          <div style={{
            margin: "0 14px 14px",
            padding: "12px 16px",
            borderRadius: 13,
            background: "rgba(212,168,67,0.06)",
            border: "1px solid rgba(212,168,67,0.18)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", color: "rgba(212,168,67,0.6)", marginBottom: 5 }}>
                {t.homeHebrewDate}
              </div>
              <div style={{
                fontFamily: "'Noto Serif Hebrew', serif",
                fontSize: 26, color: "#f0c050", direction: "rtl", lineHeight: 1, fontWeight: 700,
              }}>
                {hebrewDay} {hebrewMonth} {hebrewYear}
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", color: "rgba(255,255,255,0.3)", marginBottom: 5 }}>
                {t.homeGregorian}
              </div>
              <div style={{ fontSize: 26, fontWeight: 900, color: "white", lineHeight: 1, letterSpacing: "-1px" }}>
                {today.getDate()}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>
                {monthStr} {yearStr}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: "rgba(212,168,67,0.1)", margin: "0 14px 14px" }} />

          {/* Zmanim section */}
          <div style={{ padding: "0 14px 16px" }}>
            <div
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, cursor: "pointer" }}
              onClick={() => onNavigate("zmanim")}
            >
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontWeight: 800, letterSpacing: "0.1em" }}>{t.homeZmanim}</span>
              <span style={{ fontSize: 10, color: "#d4a843", fontWeight: 700, letterSpacing: "0.06em" }}>{t.homeViewAll}</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{
                padding: "10px 12px", borderRadius: 11,
                background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.14)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                  <span style={{ fontSize: 14 }}>🌅</span>
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", fontWeight: 800, letterSpacing: "0.1em" }}>{t.homeSunrise}</span>
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "white", letterSpacing: "-0.5px" }}>
                  {formatTime(zmanim.sunrise, location.tz)}
                </div>
              </div>
              <div style={{
                padding: "10px 12px", borderRadius: 11,
                background: "rgba(249,115,22,0.07)", border: "1px solid rgba(249,115,22,0.14)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
                  <span style={{ fontSize: 14 }}>🌇</span>
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", fontWeight: 800, letterSpacing: "0.1em" }}>{t.homeSunset}</span>
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "white", letterSpacing: "-0.5px" }}>
                  {formatTime(zmanim.sunset, location.tz)}
                </div>
              </div>
            </div>

            {showCandleLighting && (
              <div
                onClick={() => onNavigate("zmanim")}
                style={{
                  marginTop: 10, padding: "9px 12px",
                  background: "rgba(212,168,67,0.1)", borderRadius: 11,
                  border: "1px solid rgba(212,168,67,0.22)",
                  display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
                }}
              >
                <span style={{ fontSize: 18 }}>🕯</span>
                <div>
                  <div style={{ fontSize: 9, color: "#d4a843", fontWeight: 800, letterSpacing: "0.1em" }}>{t.homeCandleLighting}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#f0c050", letterSpacing: "-0.5px" }}>
                    {formatTime(zmanim.candleLighting, location.tz)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Live Location Map + Nearby Synagogues ── */}
          <div style={{ margin: "0 14px 16px" }}>

            {/* Header row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 11 }}>🗺️</span>
                <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", color: "rgba(212,168,67,0.6)" }}>
                  LOCATION MAP
                </span>
              </div>
              {synSelected && (
                <button
                  onClick={() => { setSynSelected(null); setSynMap({ lat: location.lat, lng: location.lng }); }}
                  style={{
                    background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.25)",
                    borderRadius: 6, padding: "3px 8px", color: "#d4a843", fontSize: 9,
                    fontWeight: 700, cursor: "pointer", letterSpacing: "0.06em",
                  }}
                >
                  ← MY LOCATION
                </button>
              )}
            </div>

            {/* Map iframe */}
            <div style={{
              borderRadius: 13, overflow: "hidden",
              border: `1px solid ${synSelected ? "rgba(212,168,67,0.35)" : "rgba(212,168,67,0.2)"}`,
              boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
              position: "relative",
              transition: "border-color 0.2s",
            }}>
              <iframe
                key={mapSrc}
                title={synSelected ? synSelected.name : `Map of ${location.name}`}
                src={mapSrc}
                style={{
                  width: "100%", height: 170, border: "none", display: "block",
                  filter: "brightness(0.88) saturate(0.85) hue-rotate(185deg)",
                }}
                loading="lazy"
                referrerPolicy="no-referrer"
              />
              <div style={{
                position: "absolute", inset: 0, background: "rgba(10,14,28,0.15)",
                pointerEvents: "none", borderRadius: 13,
              }} />

              {/* Jerusalem Compass — top-left overlay */}
              <div style={{
                position: "absolute", top: 8, left: 8,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                pointerEvents: "none",
              }}>
                {/* Compass disc */}
                <div style={{
                  width: 50, height: 50,
                  background: "rgba(8,11,24,0.88)",
                  border: "1.5px solid rgba(212,168,67,0.55)",
                  borderRadius: "50%",
                  backdropFilter: "blur(8px)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  position: "relative",
                  boxShadow: "0 2px 14px rgba(0,0,0,0.6), inset 0 1px 0 rgba(212,168,67,0.1)",
                }}>
                  {/* Cardinal tick marks */}
                  <svg width="50" height="50" style={{ position: "absolute", top: 0, left: 0, overflow: "visible" }}>
                    {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => {
                      const rad = (angle - 90) * Math.PI / 180;
                      const major = angle % 90 === 0;
                      const r1 = major ? 19 : 20, r2 = 23;
                      return (
                        <line key={angle}
                          x1={25 + r1 * Math.cos(rad)} y1={25 + r1 * Math.sin(rad)}
                          x2={25 + r2 * Math.cos(rad)} y2={25 + r2 * Math.sin(rad)}
                          stroke={major ? "rgba(212,168,67,0.55)" : "rgba(212,168,67,0.2)"}
                          strokeWidth={major ? 1.5 : 0.8}
                        />
                      );
                    })}
                  </svg>
                  {/* Rotating needle */}
                  <div style={{
                    width: "100%", height: "100%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transform: `rotate(${bearingToJerusalem}deg)`,
                    position: "absolute",
                  }}>
                    <svg width="34" height="34" viewBox="0 0 34 34">
                      {/* Gold north tip (points to Jerusalem) */}
                      <polygon points="17,3 20.5,17 17,15 13.5,17" fill="#f0c050" />
                      {/* Dim south tip */}
                      <polygon points="17,31 20.5,17 17,19 13.5,17" fill="rgba(255,255,255,0.18)" />
                      {/* Centre pivot */}
                      <circle cx="17" cy="17" r="2.5" fill="#d4a843" stroke="rgba(10,14,28,0.8)" strokeWidth="1" />
                    </svg>
                  </div>
                  {/* ✡ watermark */}
                  <span style={{
                    position: "absolute", fontSize: 7,
                    color: "rgba(212,168,67,0.25)", userSelect: "none",
                  }}>✡</span>
                </div>
                {/* Label */}
                <div style={{
                  background: "rgba(8,11,24,0.88)",
                  border: "1px solid rgba(212,168,67,0.35)",
                  borderRadius: 5, padding: "2px 7px",
                  backdropFilter: "blur(6px)",
                }}>
                  <span style={{
                    fontSize: 8, color: "#d4a843",
                    fontWeight: 800, letterSpacing: "0.1em",
                  }}>
                    {t.compassJerusalem.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Pin label */}
              <div style={{
                position: "absolute", bottom: 8, left: 8,
                background: "rgba(10,14,28,0.85)", border: "1px solid rgba(212,168,67,0.3)",
                borderRadius: 8, padding: "4px 9px",
                display: "flex", alignItems: "center", gap: 5,
                backdropFilter: "blur(6px)",
              }}>
                <span style={{ fontSize: 10 }}>{synSelected ? "🕍" : "📍"}</span>
                <span style={{ fontSize: 10, color: "#d4a843", fontWeight: 700, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {synSelected ? synSelected.name : location.name}
                </span>
              </div>
              {/* Synagogue badge */}
              {synSelected && (
                <div style={{
                  position: "absolute", top: 8, right: 8,
                  background: "rgba(212,168,67,0.18)", border: "1px solid rgba(212,168,67,0.4)",
                  borderRadius: 8, padding: "3px 8px",
                  fontSize: 9, color: "#f0c050", fontWeight: 800, letterSpacing: "0.08em",
                  backdropFilter: "blur(6px)",
                }}>
                  {synSelected.distKm < 1
                    ? `${Math.round(synSelected.distKm * 1000)}m away`
                    : `${synSelected.distKm.toFixed(1)} km away`}
                </div>
              )}
            </div>

            {/* Nearby Synagogues section */}
            <div style={{ marginTop: 12 }}>
              <div style={{
                display: "flex", alignItems: "center", gap: 6, marginBottom: 8,
              }}>
                <span style={{ fontSize: 11 }}>🕍</span>
                <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", color: "rgba(212,168,67,0.6)" }}>
                  NEARBY SYNAGOGUES
                </span>
                {!synLoading && synagogues.length > 0 && (
                  <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontWeight: 600, marginLeft: 2 }}>
                    within 10 km
                  </span>
                )}
              </div>

              {synLoading && (
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  gap: 8, padding: "16px 0",
                }}>
                  <div style={{
                    width: 16, height: 16, border: "2px solid rgba(212,168,67,0.2)",
                    borderTop: "2px solid #d4a843", borderRadius: "50%",
                    animation: "spin 0.8s linear infinite",
                  }} />
                  <span style={{ fontSize: 11, color: "rgba(212,168,67,0.5)" }}>Searching nearby…</span>
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
              )}

              {synError && (
                <div style={{
                  padding: "10px 12px", borderRadius: 10,
                  background: "rgba(255,100,100,0.06)", border: "1px solid rgba(255,100,100,0.15)",
                  fontSize: 11, color: "rgba(255,150,150,0.7)", textAlign: "center",
                }}>
                  Could not load nearby synagogues. Check your connection.
                </div>
              )}

              {!synLoading && !synError && synagogues.length === 0 && synFetchedRef.current && (
                <div style={{
                  padding: "10px 12px", borderRadius: 10,
                  background: "rgba(212,168,67,0.04)", border: "1px solid rgba(212,168,67,0.1)",
                  fontSize: 11, color: "rgba(255,255,255,0.35)", textAlign: "center",
                }}>
                  No synagogues found within 10 km of {location.name}.
                </div>
              )}

              {!synLoading && synagogues.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {synagogues.map(syn => {
                    const isActive = synSelected?.id === syn.id;
                    return (
                      <button
                        key={syn.id}
                        onClick={() => {
                          setSynSelected(isActive ? null : syn);
                          setSynMap(isActive ? { lat: location.lat, lng: location.lng } : { lat: syn.lat, lng: syn.lng });
                        }}
                        style={{
                          display: "flex", alignItems: "center", gap: 10,
                          padding: "9px 12px", borderRadius: 11,
                          background: isActive ? "rgba(212,168,67,0.13)" : "rgba(255,255,255,0.04)",
                          border: `1px solid ${isActive ? "rgba(212,168,67,0.4)" : "rgba(255,255,255,0.07)"}`,
                          cursor: "pointer", textAlign: "left",
                          transition: "background 0.15s, border-color 0.15s",
                          width: "100%",
                        }}
                      >
                        <div style={{
                          width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                          background: isActive ? "rgba(212,168,67,0.2)" : "rgba(255,255,255,0.06)",
                          border: `1px solid ${isActive ? "rgba(212,168,67,0.4)" : "rgba(255,255,255,0.1)"}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 14,
                        }}>
                          🕍
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{
                            fontSize: 12, fontWeight: 700,
                            color: isActive ? "#f0c050" : "rgba(255,255,255,0.85)",
                            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                          }}>
                            {syn.name}
                          </div>
                          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 1, fontWeight: 600 }}>
                            {syn.distKm < 1
                              ? `${Math.round(syn.distKm * 1000)} m away`
                              : `${syn.distKm.toFixed(1)} km away`}
                          </div>
                        </div>
                        {isActive && (
                          <div style={{
                            fontSize: 9, color: "#d4a843", fontWeight: 800,
                            letterSpacing: "0.08em", background: "rgba(212,168,67,0.1)",
                            border: "1px solid rgba(212,168,67,0.25)", borderRadius: 5,
                            padding: "2px 6px", flexShrink: 0,
                          }}>
                            ON MAP
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PremiumCandleCard({
  isPremium, candleEnabled, location, onNavigate, onShowPremium,
}: {
  isPremium: boolean;
  candleEnabled: boolean;
  location: Location;
  onNavigate: (page: string) => void;
  onShowPremium: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div style={{
      marginBottom: 12, borderRadius: 18, overflow: "hidden",
      background: "linear-gradient(140deg, #130d00 0%, #1a1000 55%, #0e0b00 100%)",
      border: `1px solid ${expanded ? "rgba(212,168,67,0.5)" : "rgba(212,168,67,0.28)"}`,
      boxShadow: expanded
        ? "0 8px 32px rgba(0,0,0,0.6), inset 0 1px 0 rgba(212,168,67,0.12)"
        : "0 3px 16px rgba(0,0,0,0.4), inset 0 1px 0 rgba(212,168,67,0.06)",
      transition: "border-color 0.25s, box-shadow 0.25s",
    }}>
      <style>{`
        @keyframes premiumSlide {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes candleFlicker {
          0%, 100% { transform: scaleY(1) rotate(-1deg); opacity: 1; }
          25% { transform: scaleY(1.06) rotate(1.5deg); opacity: 0.9; }
          75% { transform: scaleY(0.96) rotate(-1.5deg); opacity: 0.95; }
        }
      `}</style>

      {/* ── Header row (always visible) ── */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: "100%", background: "none", border: "none", cursor: "pointer",
          padding: "14px 16px", display: "flex", alignItems: "center", gap: 13,
          textAlign: "left",
        }}
      >
        {/* Candle icon with flicker */}
        <div style={{
          width: 42, height: 42, borderRadius: 12, flexShrink: 0,
          background: "linear-gradient(135deg, rgba(212,168,67,0.2), rgba(240,192,80,0.08))",
          border: "1px solid rgba(212,168,67,0.35)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22, boxShadow: "0 2px 10px rgba(212,168,67,0.2)",
        }}>
          <span style={{ display: "inline-block", animation: "candleFlicker 2.5s ease-in-out infinite" }}>🕯</span>
        </div>

        {/* Labels */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <span style={{
              fontSize: 9, fontWeight: 900, letterSpacing: "0.1em",
              padding: "2px 7px", borderRadius: 99,
              background: "linear-gradient(90deg, #6b4800, #d4a843)",
              color: "#1a0900",
            }}>👑 PREMIUM</span>
            {isPremium && (
              <span style={{
                fontSize: 9, fontWeight: 800, letterSpacing: "0.08em",
                padding: "2px 7px", borderRadius: 99,
                background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.25)",
                color: "#4ade80",
              }}>● LIVE</span>
            )}
          </div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#f0c050", lineHeight: 1.1 }}>
            Candle Lighting Countdown
          </div>
        </div>

        {/* Chevron */}
        <svg
          width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke="rgba(212,168,67,0.65)" strokeWidth="2.5" strokeLinecap="round"
          style={{
            flexShrink: 0,
            transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* ── Expanded content ── */}
      {expanded && (
        <div style={{ animation: "premiumSlide 0.22s cubic-bezier(0.4,0,0.2,1)" }}>
          <div style={{ height: 1, background: "rgba(212,168,67,0.12)", margin: "0 16px 14px" }} />

          {isPremium && candleEnabled ? (
            <div style={{ padding: "0 14px 16px" }}>
              <CandleLightingCountdown location={location} onNavigate={onNavigate} />
            </div>
          ) : (
            <div style={{ padding: "0 16px 18px", textAlign: "center" }}>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", marginBottom: 14, lineHeight: 1.6 }}>
                Unlock the live Shabbat candle lighting countdown with real-time alerts for your location.
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onShowPremium(); }}
                style={{
                  padding: "10px 28px", borderRadius: 99, cursor: "pointer",
                  background: "linear-gradient(90deg, #6b4800, #d4a843, #f0c050, #d4a843, #6b4800)",
                  backgroundSize: "200% auto",
                  border: "none", fontSize: 13, fontWeight: 900, color: "#1a0900",
                  letterSpacing: "0.05em",
                }}
              >
                👑 Upgrade to Premium
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getTodayHolidays(): string[] {
  const today = new Date();
  const events = HebrewCalendar.calendar({
    start: today,
    end: today,
    il: true,
    isHebrewYear: false,
    mask: flags.CHAG | flags.MODERN_HOLIDAY,
  });
  return events.map(ev => ev.render("en"));
}

interface HomeProps {
  location: Location;
  theme: string;
  isPremium: boolean;
  candleEnabled: boolean;
  onNavigate: (page: string) => void;
  onMoreTools: () => void;
  onShowHolidays: () => void;
  onShowParashah: () => void;
  onShowPremium: () => void;
  onShowDafYomi: () => void;
  onShowOmer: () => void;
  onLocationClick: () => void;
  onToggleTheme: () => void;
  onOpenSiddur: () => void;
  onShowCommunity: () => void;
  onShowCensus: () => void;
  onShowMembers: () => void;
  onNotifBell: () => void;
  notifActive: boolean;
  announcementCount: number;
  onShowAnnouncements: () => void;
  onShowEvents: () => void;
  onShowCommunityYahrzeit: () => void;
  onShowYartzeit: () => void;
  onShowMussar: () => void;
  onShowPrayerBoard: () => void;
  onShowTorahTracker: () => void;
  unreadAnnouncements?: ServerAnnouncement[];
  profileName?: string | null;
}

// ── Week Strip (mini 7-day overview) ─────────────────────────────────────────
function WeekStrip({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { t } = useLanguage();

  const today = new Date();
  // Sunday of the current week
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - today.getDay());

  const dayLabels = [
    t.weekStripDaySun, t.weekStripDayMon, t.weekStripDayTue, t.weekStripDayWed,
    t.weekStripDayThu, t.weekStripDayFri, t.weekStripDaySat,
  ];

  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(sunday);
    date.setDate(sunday.getDate() + i);
    const hd = new HDate(date);
    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();
    const isShabbat = date.getDay() === 6;

    // Lightweight holiday check — only flags that matter visually
    const events = HebrewCalendar.calendar({
      start: date,
      end: date,
      il: true,
      isHebrewYear: false,
      mask: flags.ROSH_CHODESH | flags.CHAG | flags.MODERN_HOLIDAY,
    });

    return { date, hd, isToday, isShabbat, hasEvent: events.length > 0 };
  });

  return (
    <div className="card" style={{ marginBottom: 12, padding: "12px 14px 14px" }}>
      <style>{`
        @keyframes todayPop {
          from { transform: scale(0.88); opacity: 0; }
          to   { transform: scale(1);    opacity: 1; }
        }
      `}</style>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 13 }}>📅</span>
          <span style={{
            fontSize: 10, fontWeight: 800, letterSpacing: "0.12em",
            color: "var(--text-muted)", textTransform: "uppercase",
          }}>
            {t.weekStripTitle}
          </span>
        </div>
        <button
          onClick={() => onNavigate("calendar")}
          style={{
            background: "none", border: "none", padding: 0, cursor: "pointer",
            fontSize: 10, fontWeight: 700, color: "#d4a843", letterSpacing: "0.04em",
          }}
        >
          {t.weekStripViewCal}
        </button>
      </div>

      {/* ── Day cells ── */}
      <div style={{ display: "flex", gap: 3 }}>
        {days.map(({ date, hd, isToday, isShabbat, hasEvent }, i) => (
          <button
            key={i}
            onClick={() => onNavigate("calendar")}
            style={{
              flex: 1, minWidth: 0, border: "none", cursor: "pointer",
              background: isToday
                ? "linear-gradient(160deg, rgba(212,168,67,0.22) 0%, rgba(212,168,67,0.08) 100%)"
                : isShabbat
                ? "rgba(110,70,220,0.07)"
                : "transparent",
              borderRadius: 10,
              padding: "7px 2px 6px",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
              outline: isToday
                ? "1px solid rgba(212,168,67,0.48)"
                : isShabbat
                ? "1px solid rgba(110,70,220,0.14)"
                : "1px solid transparent",
              boxShadow: isToday ? "0 0 12px rgba(212,168,67,0.15), inset 0 1px 0 rgba(212,168,67,0.12)" : "none",
              animation: isToday ? "todayPop 0.35s cubic-bezier(0.34,1.56,0.64,1) both" : "none",
              transition: "background 0.15s, outline-color 0.15s",
            }}
          >
            {/* Day abbrev */}
            <div style={{
              fontSize: 7.5, fontWeight: 800, letterSpacing: "0.06em", lineHeight: 1,
              color: isToday ? "#d4a843" : isShabbat ? "rgba(160,130,240,0.85)" : "var(--text-muted)",
            }}>
              {dayLabels[i]}
            </div>

            {/* Gregorian number */}
            <div style={{
              fontSize: 16, fontWeight: isToday ? 900 : 700, lineHeight: 1,
              color: isToday ? "#f0c050" : isShabbat ? "rgba(190,165,255,0.9)" : "var(--text-primary)",
            }}>
              {date.getDate()}
            </div>

            {/* Hebrew numeral */}
            <div style={{
              fontFamily: "'Noto Serif Hebrew', serif",
              fontSize: 10, fontWeight: 600, lineHeight: 1, direction: "rtl",
              color: isToday ? "rgba(240,192,80,0.8)" : isShabbat ? "rgba(160,130,240,0.65)" : "var(--text-muted)",
            }}>
              {hebrewDayNumeral(hd.getDate())}
            </div>

            {/* Holiday / event dot */}
            {hasEvent && (
              <div style={{
                width: 4, height: 4, borderRadius: "50%", marginTop: 1,
                background: isToday ? "#f0c050" : "#d4a843",
                boxShadow: isToday ? "0 0 4px rgba(240,192,80,0.7)" : "none",
              }} />
            )}

            {/* Today underline bar */}
            {isToday && (
              <div style={{
                width: "60%", height: 2.5, borderRadius: 99, marginTop: 1,
                background: "linear-gradient(90deg, #d4a843, #f0c050)",
                boxShadow: "0 0 6px rgba(212,168,67,0.5)",
              }} />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Zmanim Timeline ─────────────────────────────────────────────────────────
function ZmanimTimeline({
  zmanim,
  location,
  onNavigate,
}: {
  zmanim: ZmanimTimes;
  location: Location;
  onNavigate: (page: string) => void;
}) {
  const { t } = useLanguage();
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  const start = zmanim.alotHaShachar;
  const end = zmanim.tzais;
  if (!start || !end) return null;

  const startMs = start.getTime();
  const totalMs = end.getTime() - startMs;

  const pct = (d: Date | null): number => {
    if (!d) return -1;
    return Math.max(0, Math.min(100, ((d.getTime() - startMs) / totalMs) * 100));
  };
  const isPast = (d: Date | null) => !!d && d.getTime() < now.getTime();

  const nowPct = pct(now);

  type Marker = { key: string; label: string; time: Date | null; emoji: string; above: boolean };
  const markers: Marker[] = [
    { key: "sunrise",  label: t.zmanimTimelineSunrise, time: zmanim.sunrise,       emoji: "🌅", above: true  },
    { key: "shema",    label: t.zmanimTimelineShema,   time: zmanim.latestShema,   emoji: "📖", above: false },
    { key: "midday",   label: t.zmanimTimelineMidday,  time: zmanim.chatzot,       emoji: "☀️", above: true  },
    { key: "mincha",   label: t.zmanimTimelineMincha,  time: zmanim.minchaKetana,  emoji: "🙏", above: false },
    { key: "sunset",   label: t.zmanimTimelineSunset,  time: zmanim.sunset,        emoji: "🌇", above: true  },
  ].filter(m => m.time !== null) as Marker[];

  return (
    <div
      className="card card-interactive"
      onClick={() => onNavigate("zmanim")}
      style={{ marginBottom: 12, padding: "12px 14px 14px", overflow: "hidden" }}
    >
      <style>{`
        @keyframes nowPulse {
          0%,100% { box-shadow: 0 0 0 3px rgba(240,192,80,0.30), 0 0 14px rgba(240,192,80,0.55); }
          50%      { box-shadow: 0 0 0 5px rgba(240,192,80,0.15), 0 0 22px rgba(240,192,80,0.35); }
        }
      `}</style>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 13 }}>🕐</span>
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", color: "var(--text-muted)", textTransform: "uppercase" }}>
            {t.zmanimTimelineTitle}
          </span>
        </div>
        <span style={{ fontSize: 10, fontWeight: 700, color: "#d4a843", letterSpacing: "0.04em" }}>
          {t.zmanimTimelineTap}
        </span>
      </div>

      {/* ── Track area ── */}
      <div style={{ position: "relative", paddingTop: 26, paddingBottom: 26 }}>

        {/* ABOVE labels */}
        {markers.filter(m => m.above).map(m => (
          <div key={m.key} style={{
            position: "absolute",
            left: `${pct(m.time)}%`,
            top: 0,
            transform: "translateX(-50%)",
            textAlign: "center",
            opacity: isPast(m.time) ? 0.38 : 1,
            transition: "opacity 0.4s",
          }}>
            <div style={{ fontSize: 8, fontWeight: 700, color: isPast(m.time) ? "var(--text-muted)" : "#d4a843", whiteSpace: "nowrap", marginBottom: 2, letterSpacing: "0.04em" }}>
              {m.emoji} {formatTime(m.time, location.tz)}
            </div>
            <div style={{ width: 1, height: 7, background: isPast(m.time) ? "rgba(255,255,255,0.08)" : "rgba(212,168,67,0.35)", margin: "0 auto" }} />
          </div>
        ))}

        {/* ── Track bar ── */}
        <div style={{
          position: "relative",
          height: 9,
          borderRadius: 5,
          background: "linear-gradient(90deg, #12103a 0%, #1c2f6e 12%, #2a6080 26%, #d4a843 44%, #fbbf24 54%, #f97316 70%, #7f1d1d 88%, #120820 100%)",
          boxShadow: "inset 0 1px 3px rgba(0,0,0,0.5), inset 0 -1px 0 rgba(255,255,255,0.04)",
        }}>
          {/* Past dimmer */}
          {nowPct > 0 && nowPct < 100 && (
            <div style={{
              position: "absolute", left: 0, top: 0, bottom: 0,
              width: `${nowPct}%`,
              background: "rgba(0,0,0,0.52)",
              borderRadius: "5px 0 0 5px",
              pointerEvents: "none",
            }} />
          )}

          {/* Zman dots */}
          {markers.map(m => (
            <div key={m.key} style={{
              position: "absolute",
              left: `${pct(m.time)}%`,
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: 11, height: 11,
              borderRadius: "50%",
              background: isPast(m.time) ? "rgba(80,90,110,0.7)" : "#fff",
              border: `2.5px solid ${isPast(m.time) ? "rgba(100,110,130,0.4)" : "#d4a843"}`,
              boxShadow: isPast(m.time) ? "none" : "0 0 8px rgba(212,168,67,0.55)",
              zIndex: 1,
              transition: "background 0.4s, border-color 0.4s, box-shadow 0.4s",
            }} />
          ))}

          {/* Now needle */}
          {nowPct >= 0 && nowPct <= 100 && (
            <div style={{
              position: "absolute",
              left: `${nowPct}%`,
              top: "50%",
              transform: "translate(-50%, -50%)",
              width: 15, height: 15,
              borderRadius: "50%",
              background: "radial-gradient(circle at 35% 35%, #fff9c4, #f0c050)",
              border: "2.5px solid #fff",
              animation: "nowPulse 2.4s ease-in-out infinite",
              zIndex: 3,
            }} />
          )}
        </div>

        {/* BELOW labels */}
        {markers.filter(m => !m.above).map(m => (
          <div key={m.key} style={{
            position: "absolute",
            left: `${pct(m.time)}%`,
            bottom: 0,
            transform: "translateX(-50%)",
            textAlign: "center",
            opacity: isPast(m.time) ? 0.38 : 1,
            transition: "opacity 0.4s",
          }}>
            <div style={{ width: 1, height: 7, background: isPast(m.time) ? "rgba(255,255,255,0.08)" : "rgba(148,163,184,0.4)", margin: "0 auto 2px" }} />
            <div style={{ fontSize: 8, fontWeight: 700, color: isPast(m.time) ? "var(--text-muted)" : "var(--text-secondary)", whiteSpace: "nowrap", letterSpacing: "0.04em" }}>
              {m.emoji} {formatTime(m.time, location.tz)}
            </div>
          </div>
        ))}
      </div>

      {/* ── Footer: dawn / now / nightfall ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 4 }}>
        <div style={{ fontSize: 8, color: "var(--text-muted)", fontWeight: 700, display: "flex", alignItems: "center", gap: 3 }}>
          🌌 <span>{t.zmanimTimelineDawn}</span>
          <span style={{ opacity: 0.6 }}>{formatTime(zmanim.alotHaShachar, location.tz)}</span>
        </div>

        {/* Now indicator label */}
        <div style={{ fontSize: 9, fontWeight: 800, color: "#f0c050", letterSpacing: "0.06em", display: "flex", alignItems: "center", gap: 3 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#f0c050", boxShadow: "0 0 6px rgba(240,192,80,0.7)" }} />
          {t.zmanimTimelineNow} · {formatTime(now, location.tz)}
        </div>

        <div style={{ fontSize: 8, color: "var(--text-muted)", fontWeight: 700, display: "flex", alignItems: "center", gap: 3 }}>
          <span style={{ opacity: 0.6 }}>{formatTime(zmanim.tzais, location.tz)}</span>
          <span>{t.zmanimTimelineNightfall}</span> ⭐
        </div>
      </div>
    </div>
  );
}

// ── Next Holiday Countdown Card ───────────────────────────────────────────────

interface HolidayHalacha {
  source: string;
  preparations: string[];
}

// ── Yahrzeit Reminder Card ────────────────────────────────────────────────────
function YahrzeitReminderCard({ onShowYartzeit }: { onShowYartzeit: () => void }) {
  const { t } = useLanguage();
  const [entries, setEntries] = useState<YartzeitEntry[]>(() => getYahrzeitEntries());
  const [minimized, setMinimized] = useState<boolean>(() => {
    try { return localStorage.getItem(YAHRZEIT_CARD_MINIMIZED_KEY) === "true"; } catch { return false; }
  });
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  useEffect(() => {
    function onUpdate() { setEntries(getYahrzeitEntries()); }
    window.addEventListener("menashe-yahrzeit-updated", onUpdate);
    return () => window.removeEventListener("menashe-yahrzeit-updated", onUpdate);
  }, []);

  function toggleMinimized() {
    setMinimized(prev => {
      const next = !prev;
      try { localStorage.setItem(YAHRZEIT_CARD_MINIMIZED_KEY, String(next)); } catch {}
      return next;
    });
  }

  async function togglePush() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    setPushLoading(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setPushLoading(false); return; }
      const reg = await navigator.serviceWorker.ready;
      const keyRes = await fetch(`${API_BASE}/push/vapid-public-key`);
      if (!keyRes.ok) { setPushLoading(false); return; }
      const { publicKey } = await keyRes.json() as { publicKey: string };
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: publicKey });
      await fetch(`${API_BASE}/push/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub, schedule: [] }),
      });
      setPushEnabled(true);
    } catch { /* silently ignore */ }
    setPushLoading(false);
  }

  // Find the soonest upcoming Yahrzeit
  const withNext = entries
    .map(e => ({ entry: e, next: getNextYahrzeit(e.hebrewDay, e.hebrewMonth) }))
    .filter(x => x.next !== null)
    .sort((a, b) => (a.next!.daysAway) - (b.next!.daysAway));

  const todayEntries = withNext.filter(x => x.next!.isToday);
  const nearest = withNext[0] ?? null;

  // Minimized pill
  if (minimized) {
    return (
      <button
        onClick={toggleMinimized}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "linear-gradient(135deg, rgba(212,168,67,0.07) 0%, rgba(212,168,67,0.03) 100%)",
          border: "1px solid rgba(212,168,67,0.18)", borderRadius: 12, padding: "9px 14px",
          cursor: "pointer", marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 15 }}>🕯</span>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: "#d4a843", letterSpacing: "0.05em" }}>
            {t.yartzeitCardTitle}
          </span>
          {nearest && (
            <span style={{
              fontSize: 10.5, fontWeight: 800,
              color: nearest.next!.isToday ? "#ef4444" : "#d4a843",
              background: nearest.next!.isToday ? "rgba(220,38,38,0.14)" : "rgba(212,168,67,0.12)",
              border: `1px solid ${nearest.next!.isToday ? "rgba(220,38,38,0.32)" : "rgba(212,168,67,0.28)"}`,
              borderRadius: 10, padding: "1px 7px",
            }}>
              {nearest.next!.isToday ? t.yartzeitCardToday : `${nearest.next!.daysAway} ${t.yartzeitCardDays}`}
            </span>
          )}
        </div>
        <span style={{ fontSize: 16, color: "#d4a843", lineHeight: 1 }}>＋</span>
      </button>
    );
  }

  return (
    <div className="card" style={{ marginBottom: 12, padding: "13px 15px", position: "relative", overflow: "hidden" }}>
      {/* Gold accent */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse at 8% 20%, rgba(212,168,67,0.07) 0%, transparent 55%)",
      }} />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 11 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 13 }}>🕯</span>
          <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: "0.13em", color: "var(--text-muted)", textTransform: "uppercase" }}>
            {t.yartzeitCardTitle}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {entries.length > 0 && (
            <button
              onClick={togglePush}
              disabled={pushLoading || pushEnabled}
              title={pushEnabled ? t.yartzeitCardPushOn : t.yartzeitCardPushOff}
              style={{
                background: pushEnabled ? "rgba(212,168,67,0.15)" : "rgba(255,255,255,0.04)",
                border: `1px solid ${pushEnabled ? "rgba(212,168,67,0.4)" : "rgba(255,255,255,0.08)"}`,
                borderRadius: 8, padding: "3px 8px", cursor: pushEnabled ? "default" : "pointer",
                display: "flex", alignItems: "center", gap: 4,
                fontSize: 10, color: pushEnabled ? "#d4a843" : "var(--text-muted)",
                opacity: pushLoading ? 0.6 : 1, transition: "all 0.2s",
              }}
            >
              <span style={{ fontSize: 13 }}>{pushEnabled ? "🔔" : "🔕"}</span>
              {pushEnabled ? t.yartzeitCardPushOn : t.yartzeitCardPushOff}
            </button>
          )}
          <button
            onClick={toggleMinimized}
            style={{
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8, padding: "3px 9px", cursor: "pointer",
              display: "flex", alignItems: "center", gap: 4,
              fontSize: 10.5, fontWeight: 700, color: "var(--text-muted)",
            }}
          >
            <span style={{ fontSize: 12, lineHeight: 1 }}>－</span>
          </button>
        </div>
      </div>

      {/* Empty state */}
      {entries.length === 0 && (
        <button
          onClick={onShowYartzeit}
          style={{
            width: "100%", padding: "14px 16px",
            background: "rgba(212,168,67,0.06)", border: "1.5px dashed rgba(212,168,67,0.25)",
            borderRadius: 11, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          }}
        >
          <span style={{ fontSize: 20 }}>🕯</span>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: "#d4a843" }}>{t.yartzeitCardSetup}</span>
        </button>
      )}

      {/* TODAY entries */}
      {todayEntries.map(({ entry }) => (
        <div key={entry.id} style={{
          marginBottom: 10, borderRadius: 12, padding: "11px 13px",
          background: "linear-gradient(135deg, rgba(212,168,67,0.18) 0%, rgba(212,168,67,0.06) 100%)",
          border: "1.5px solid rgba(212,168,67,0.5)",
          boxShadow: "0 0 24px rgba(212,168,67,0.12)",
        }}>
          <div style={{
            display: "inline-flex", gap: 4, alignItems: "center",
            background: "rgba(212,168,67,0.18)", borderRadius: 99, padding: "2px 10px", marginBottom: 7,
          }}>
            <span style={{ fontSize: 9, fontWeight: 900, color: "#f0c050", letterSpacing: "0.12em" }}>✦ {t.yartzeitCardToday.toUpperCase()}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 900, color: "var(--text-primary)", marginBottom: 2 }}>{entry.name}</div>
              <div style={{ fontFamily: "'Noto Serif Hebrew', serif", fontSize: 13, color: "#d4a843" }}>
                {hebrewDayLabel(entry.hebrewDay, entry.hebrewMonth)}
              </div>
            </div>
            <span style={{ fontSize: 30, flexShrink: 0 }}>🕯</span>
          </div>
          <div style={{
            marginTop: 9, padding: "8px 10px", borderRadius: 9,
            background: "rgba(212,168,67,0.08)", border: "1px solid rgba(212,168,67,0.2)",
          }}>
            <div style={{ fontSize: 11, color: "#d4a843", fontWeight: 700, marginBottom: 3 }}>{t.yartzeitCardObservances}</div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.7 }}>{t.yartzeitCardObservanceText}</div>
          </div>
        </div>
      ))}

      {/* Upcoming (non-today nearest entries, up to 2) */}
      {withNext.filter(x => !x.next!.isToday).slice(0, 2).map(({ entry, next }) => (
        <div key={entry.id} style={{
          marginBottom: 8, borderRadius: 11, padding: "10px 12px",
          background: "var(--elevated)", border: "1px solid var(--border)",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10,
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 9.5, fontWeight: 800, color: "var(--text-muted)", letterSpacing: "0.1em", marginBottom: 3, textTransform: "uppercase" }}>
              {t.yartzeitCardUpcoming}
            </div>
            <div style={{ fontSize: 14.5, fontWeight: 800, color: "var(--text-primary)", marginBottom: 2 }}>{entry.name}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span style={{ fontFamily: "'Noto Serif Hebrew', serif", fontSize: 12, color: "#d4a843" }}>
                {hebrewDayLabel(entry.hebrewDay, entry.hebrewMonth)}
              </span>
              <span style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--text-muted)", display: "inline-block" }} />
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                {next!.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            </div>
          </div>
          <div style={{
            flexShrink: 0, textAlign: "center",
            background: "rgba(212,168,67,0.08)", border: "1px solid rgba(212,168,67,0.18)",
            borderRadius: 9, padding: "5px 10px", minWidth: 44,
          }}>
            <div style={{ fontSize: 16, fontWeight: 900, color: "#d4a843", lineHeight: 1 }}>{next!.daysAway}</div>
            <div style={{ fontSize: 8, color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.06em", marginTop: 1 }}>
              {next!.daysAway === 1 ? t.yartzeitCardDay.toUpperCase() : t.yartzeitCardDays.toUpperCase()}
            </div>
          </div>
        </div>
      ))}

      {/* Manage button */}
      {entries.length > 0 && (
        <button
          onClick={onShowYartzeit}
          style={{
            width: "100%", marginTop: 6, padding: "8px 12px",
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 9, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            fontSize: 11.5, fontWeight: 700, color: "var(--text-muted)",
          }}
        >
          <span style={{ fontSize: 13 }}>⚙️</span>
          {t.yartzeitCardManage}
        </button>
      )}
    </div>
  );
}

function NextHolidayCard({ holidays }: { holidays: Array<{ name: string; date: Date }> }) {
  const { t } = useLanguage();
  const [minimized, setMinimized] = useState<boolean>(() => {
    try { return localStorage.getItem(HOLIDAY_CARD_MINIMIZED_KEY) === "true"; }
    catch { return false; }
  });
  const [halacha, setHalacha] = useState<HolidayHalacha | null>(null);
  const [halachaLoading, setHalachaLoading] = useState(false);
  const [halachaError, setHalachaError] = useState(false);
  const [showHalacha, setShowHalacha] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [countdown, setCountdown] = useState<string>("");
  const halachaFetchedFor = useRef<string>("");

  const next0 = holidays[0];
  useEffect(() => {
    if (!next0) return;
    const target = new Date(next0.date);
    target.setHours(0, 0, 0, 0);
    function tick() {
      const now = new Date();
      const diff = target.getTime() - now.getTime();
      if (diff <= 0) { setCountdown("00:00:00"); return; }
      if (diff > 86400000) { setCountdown(""); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(
        `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      );
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [next0?.date.getTime()]);

  const checklistKey = `menashe-checklist-${holidays[0]?.name ?? ""}-${holidays[0]?.date.getFullYear() ?? 0}`;
  const [checklist, setChecklist] = useState<Record<number, boolean>>(() => {
    try {
      const raw = localStorage.getItem(checklistKey);
      return raw ? (JSON.parse(raw) as Record<number, boolean>) : {};
    } catch { return {}; }
  });

  function toggleCheck(i: number) {
    setChecklist(prev => {
      const updated = { ...prev, [i]: !prev[i] };
      try { localStorage.setItem(checklistKey, JSON.stringify(updated)); } catch {}
      return updated;
    });
  }

  function resetChecklist() {
    setChecklist({});
    try { localStorage.removeItem(checklistKey); } catch {}
  }

  const [showShareCard, setShowShareCard] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  function buildShareText(preparations: string[], total: number, checkedCount: number) {
    const dateStr = next
      ? next.date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
      : "";
    const lines: string[] = [
      `✡ My ${next?.name ?? "Holiday"} Preparation (${dateStr})`,
      `📋 ${checkedCount} / ${total} steps complete`,
      "",
    ];
    preparations.forEach((prep, i) => {
      lines.push(`${checklist[i] ? "✅" : "⬜"} ${prep}`);
    });
    lines.push("", "— Bnei Menashe Calendar");
    return lines.join("\n");
  }

  async function handleShare(preparations: string[], total: number, checkedCount: number) {
    const text = buildShareText(preparations, total, checkedCount);
    if (navigator.share) {
      try {
        await navigator.share({ title: `${next?.name ?? "Holiday"} Preparation`, text });
        return;
      } catch { /* fall through to clipboard */ }
    }
    try {
      await navigator.clipboard.writeText(text);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2500);
    } catch { /* ignore */ }
  }

  function toggle() {
    setMinimized(prev => {
      const next = !prev;
      try { localStorage.setItem(HOLIDAY_CARD_MINIMIZED_KEY, String(next)); } catch {}
      return next;
    });
  }

  const next = holidays[0];
  if (!next) return null;

  const todayMidnight = new Date();
  todayMidnight.setHours(0, 0, 0, 0);
  const holidayMidnight = new Date(next.date);
  holidayMidnight.setHours(0, 0, 0, 0);
  const diffDays = Math.round((holidayMidnight.getTime() - todayMidnight.getTime()) / 86400000);

  const countdownLabel =
    diffDays === 0 ? t.nextHolidayToday
    : diffDays === 1 ? t.nextHolidayTomorrow
    : `${diffDays} ${diffDays === 1 ? t.nextHolidayDaysSingle : t.nextHolidayDaysPlural}`;

  const themeKey = Object.keys(HOLIDAY_THEMES).find(k => next.name.includes(k)) ?? "";
  const themeInfo = HOLIDAY_THEMES[themeKey] ?? { emoji: "✡️", theme: "A sacred day of observance" };

  const urgentColor = diffDays === 0 ? "#ef4444" : diffDays <= 7 ? "#f0c050" : "#d4a843";
  const urgentBg   = diffDays === 0 ? "rgba(220,38,38,0.14)" : "rgba(212,168,67,0.12)";
  const urgentBdr  = diffDays === 0 ? "rgba(220,38,38,0.32)" : "rgba(212,168,67,0.28)";

  function fetchHalacha() {
    if (halachaFetchedFor.current === next.name) return;
    halachaFetchedFor.current = next.name;
    setHalachaLoading(true);
    setHalachaError(false);
    fetch(`${API_BASE}/holiday-halacha?name=${encodeURIComponent(next.name)}`)
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then((data: HolidayHalacha) => { setHalacha(data); setHalachaLoading(false); })
      .catch(() => { setHalachaError(true); setHalachaLoading(false); });
  }

  function toggleHalacha() {
    const next_ = !showHalacha;
    setShowHalacha(next_);
    if (next_) fetchHalacha();
  }

  async function togglePush() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    setPushLoading(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") { setPushLoading(false); return; }
      const reg = await navigator.serviceWorker.ready;
      const keyRes = await fetch(`${API_BASE}/push/vapid-public-key`);
      if (!keyRes.ok) { setPushLoading(false); return; }
      const { publicKey } = await keyRes.json() as { publicKey: string };
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKey,
      });
      await fetch(`${API_BASE}/push/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub, schedule: [] }),
      });
      setPushEnabled(true);
    } catch {
      // silently ignore
    }
    setPushLoading(false);
  }

  if (minimized) {
    return (
      <button
        onClick={toggle}
        style={{
          width: "100%", display: "flex", alignItems: "center",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, rgba(212,168,67,0.07) 0%, rgba(212,168,67,0.03) 100%)",
          border: "1px solid rgba(212,168,67,0.18)",
          borderRadius: 12, padding: "9px 14px",
          cursor: "pointer", marginBottom: 12,
          transition: "border-color 0.2s, background 0.2s",
        }}
      >

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 15 }}>{themeInfo.emoji}</span>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: "#d4a843", letterSpacing: "0.05em" }}>
            {t.nextHolidayShow}
          </span>
          <span style={{ fontSize: 10.5, color: "var(--text-muted)", fontWeight: 500 }}>
            · {next.name}
          </span>
          <span style={{
            fontSize: 10.5, fontWeight: 800, color: urgentColor,
            background: urgentBg, border: `1px solid ${urgentBdr}`,
            borderRadius: 10, padding: "1px 7px",
          }}>
            {countdownLabel}
          </span>
        </div>
        <span style={{ fontSize: 16, color: "#d4a843", lineHeight: 1 }}>＋</span>
      </button>
    );
  }

  return (
    <>
    <div
      className="card"
      style={{ marginBottom: 12, padding: "13px 15px", position: "relative", overflow: "hidden" }}
    >
      {/* Radial gold accent */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse at 92% 18%, rgba(212,168,67,0.08) 0%, transparent 58%)",
      }} />

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 11 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12 }}>🗓️</span>
          <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: "0.13em", color: "var(--text-muted)", textTransform: "uppercase" }}>
            {t.nextHolidayTitle}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {/* Push bell */}
          <button
            onClick={togglePush}
            disabled={pushLoading || pushEnabled}
            title={pushEnabled ? "Reminders on (1 day + 1 hour before)" : "Remind me 1 day & 1 hour before"}
            style={{
              background: pushEnabled ? "rgba(212,168,67,0.15)" : "rgba(255,255,255,0.04)",
              border: `1px solid ${pushEnabled ? "rgba(212,168,67,0.4)" : "rgba(255,255,255,0.08)"}`,
              borderRadius: 8, padding: "3px 8px", cursor: pushEnabled ? "default" : "pointer",
              display: "flex", alignItems: "center", gap: 4,
              fontSize: 11, color: pushEnabled ? "#d4a843" : "var(--text-muted)",
              opacity: pushLoading ? 0.6 : 1, transition: "all 0.2s",
            }}
          >
            <span style={{ fontSize: 13 }}>{pushEnabled ? "🔔" : "🔕"}</span>
          </button>
          <button
            onClick={toggle}
            style={{
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8, padding: "3px 9px",
              cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
              fontSize: 10.5, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.04em",
            }}
          >
            <span style={{ fontSize: 12, lineHeight: 1 }}>－</span>
            {t.nextHolidayHide}
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
        {/* Emoji badge */}
        <div style={{
          width: 54, height: 54, borderRadius: 15, flexShrink: 0,
          background: "linear-gradient(135deg, rgba(212,168,67,0.16) 0%, rgba(212,168,67,0.05) 100%)",
          border: "1px solid rgba(212,168,67,0.22)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 28,
          boxShadow: "0 0 20px rgba(212,168,67,0.10)",
        }}>
          {themeInfo.emoji}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15.5, fontWeight: 800, color: "var(--text-primary)", marginBottom: 2, lineHeight: 1.2 }}>
            {next.name}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", fontStyle: "italic", marginBottom: 8, lineHeight: 1.4 }}>
            {themeInfo.theme}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{
              display: "inline-flex", alignItems: "center",
              background: urgentBg, border: `1px solid ${urgentBdr}`,
              borderRadius: 20, padding: "4px 11px",
              fontSize: 12.5, fontWeight: 800, color: urgentColor, letterSpacing: "0.02em",
            }}>
              {countdownLabel}
            </span>
            <span style={{ fontSize: 10.5, color: "var(--text-muted)", fontWeight: 500 }}>
              {next.date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </span>
            {countdown && (
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: 20, padding: "4px 11px",
                fontSize: 13, fontWeight: 900, color: "#ef4444",
                fontVariantNumeric: "tabular-nums", letterSpacing: "0.06em",
                fontFamily: "monospace",
              }}>
                ⏱ {countdown}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Halacha Toggle ── */}
      <button
        onClick={toggleHalacha}
        style={{
          width: "100%", marginTop: 12,
          background: showHalacha ? "rgba(212,168,67,0.10)" : "rgba(255,255,255,0.03)",
          border: `1px solid ${showHalacha ? "rgba(212,168,67,0.28)" : "rgba(255,255,255,0.07)"}`,
          borderRadius: 10, padding: "8px 12px",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between",
          transition: "all 0.2s",
        }}
      >
        <span style={{ fontSize: 11.5, fontWeight: 700, color: showHalacha ? "#d4a843" : "var(--text-muted)", letterSpacing: "0.04em" }}>
          {t.nextHolidayHalachaTitle}
        </span>
        <span style={{ fontSize: 13, color: "#d4a843", lineHeight: 1, transform: showHalacha ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
          ▾
        </span>
      </button>

      {/* ── Halacha Content ── */}
      {showHalacha && (
        <div style={{
          marginTop: 10, padding: "12px 13px",
          background: "linear-gradient(135deg, rgba(212,168,67,0.05) 0%, rgba(212,168,67,0.02) 100%)",
          border: "1px solid rgba(212,168,67,0.14)",
          borderRadius: 10,
        }}>
          {halachaLoading && (
            <div style={{ fontSize: 11.5, color: "var(--text-muted)", textAlign: "center", padding: "8px 0" }}>
              {t.nextHolidayHalachaLoading}
            </div>
          )}
          {halachaError && (
            <div style={{ fontSize: 11.5, color: "var(--text-muted)", textAlign: "center", padding: "8px 0" }}>
              {t.nextHolidayHalachaError}
            </div>
          )}
          {halacha && (() => {
            const total = halacha.preparations.length;
            const checked = Object.values(checklist).filter(Boolean).length;
            const allDone = checked === total && total > 0;
            return (
              <>
                {/* Source + progress row */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 6 }}>
                  <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: "0.1em", color: "rgba(212,168,67,0.6)", textTransform: "uppercase" }}>
                    {t.nextHolidayHalachaSource}: {halacha.source}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {checked > 0 && (
                      <>
                        <button
                          onClick={() => setShowShareCard(true)}
                          style={{
                            background: "rgba(212,168,67,0.10)", border: "1px solid rgba(212,168,67,0.28)",
                            borderRadius: 6, padding: "2px 9px",
                            cursor: "pointer", fontSize: 10, fontWeight: 700,
                            color: "#d4a843", display: "flex", alignItems: "center", gap: 4,
                          }}
                        >
                          <span style={{ fontSize: 11 }}>📤</span>
                          {t.nextHolidayShareBtn}
                        </button>
                        <button
                          onClick={resetChecklist}
                          style={{
                            background: "none", border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: 6, padding: "2px 7px",
                            cursor: "pointer", fontSize: 9.5, color: "var(--text-muted)",
                          }}
                        >
                          {t.nextHolidayChecklistReset}
                        </button>
                      </>
                    )}
                    <div style={{
                      fontSize: 10, fontWeight: 700,
                      color: allDone ? "#4ade80" : "#d4a843",
                      background: allDone ? "rgba(74,222,128,0.12)" : "rgba(212,168,67,0.12)",
                      border: `1px solid ${allDone ? "rgba(74,222,128,0.3)" : "rgba(212,168,67,0.25)"}`,
                      borderRadius: 10, padding: "2px 8px",
                    }}>
                      {checked} / {total} {t.nextHolidayChecklistProgress}
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ height: 3, borderRadius: 2, background: "rgba(255,255,255,0.07)", marginBottom: 12, overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: 2,
                    background: allDone ? "#4ade80" : "linear-gradient(90deg, #d4a843, #f0c050)",
                    width: `${total > 0 ? (checked / total) * 100 : 0}%`,
                    transition: "width 0.35s ease, background 0.3s",
                  }} />
                </div>

                {/* All-done banner */}
                {allDone && (
                  <div style={{
                    marginBottom: 10, padding: "7px 11px",
                    background: "rgba(74,222,128,0.10)", border: "1px solid rgba(74,222,128,0.25)",
                    borderRadius: 8, fontSize: 11.5, fontWeight: 700,
                    color: "#4ade80", textAlign: "center",
                  }}>
                    {t.nextHolidayChecklistAllDone}
                  </div>
                )}

                {/* Steps */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {halacha.preparations.map((prep, i) => {
                    const done = !!checklist[i];
                    return (
                      <button
                        key={i}
                        onClick={() => toggleCheck(i)}
                        style={{
                          display: "flex", gap: 9, alignItems: "flex-start",
                          background: done ? "rgba(74,222,128,0.07)" : "transparent",
                          border: `1px solid ${done ? "rgba(74,222,128,0.20)" : "transparent"}`,
                          borderRadius: 8, padding: "5px 7px",
                          cursor: "pointer", textAlign: "left", width: "100%",
                          transition: "background 0.2s, border-color 0.2s",
                        }}
                      >
                        {/* Checkbox circle */}
                        <div style={{
                          flexShrink: 0, width: 20, height: 20, borderRadius: "50%",
                          background: done ? "rgba(74,222,128,0.20)" : "rgba(212,168,67,0.10)",
                          border: `1.5px solid ${done ? "rgba(74,222,128,0.55)" : "rgba(212,168,67,0.30)"}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 11, fontWeight: 800,
                          color: done ? "#4ade80" : "#d4a843",
                          marginTop: 1, transition: "all 0.2s",
                        }}>
                          {done ? "✓" : i + 1}
                        </div>
                        <p style={{
                          margin: 0, fontSize: 11.5, lineHeight: 1.6, flex: 1,
                          color: done ? "var(--text-muted)" : "var(--text-secondary)",
                          textDecoration: done ? "line-through" : "none",
                          transition: "color 0.2s",
                        }}>
                          {prep}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>

    {/* ── Share Card Overlay ── */}
    {showShareCard && halacha && (() => {
      const total = halacha.preparations.length;
      const checkedCount = Object.values(checklist).filter(Boolean).length;
      const allDone = checkedCount === total && total > 0;
      const dateStr = next.date.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
      return (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 9000,
            background: "rgba(0,0,0,0.82)", backdropFilter: "blur(6px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "20px 16px",
          }}
          onClick={() => setShowShareCard(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: "100%", maxWidth: 400,
              background: "linear-gradient(160deg, #0f0c1a 0%, #12091e 60%, #0a0814 100%)",
              border: "1px solid rgba(212,168,67,0.3)",
              borderRadius: 20, overflow: "hidden",
              boxShadow: "0 0 60px rgba(212,168,67,0.15), 0 24px 60px rgba(0,0,0,0.7)",
            }}
          >
            {/* Card header */}
            <div style={{
              background: "linear-gradient(135deg, rgba(212,168,67,0.18) 0%, rgba(212,168,67,0.06) 100%)",
              borderBottom: "1px solid rgba(212,168,67,0.18)",
              padding: "18px 20px 16px",
              textAlign: "center",
            }}>
              <div style={{ fontSize: 36, marginBottom: 6 }}>{themeInfo.emoji}</div>
              <div style={{ fontSize: 18, fontWeight: 900, color: "#f0c050", letterSpacing: "0.02em", marginBottom: 3 }}>
                {next.name}
              </div>
              <div style={{ fontSize: 11, color: "rgba(212,168,67,0.65)", fontWeight: 600 }}>
                {dateStr}
              </div>
              <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 4, fontStyle: "italic" }}>
                {t.nextHolidayShareCardTitle}
              </div>
            </div>

            {/* Progress section */}
            <div style={{ padding: "14px 20px 10px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
                <span style={{ fontSize: 10.5, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {t.nextHolidayShareCardProgress}
                </span>
                <span style={{
                  fontSize: 11, fontWeight: 800,
                  color: allDone ? "#4ade80" : "#d4a843",
                  background: allDone ? "rgba(74,222,128,0.12)" : "rgba(212,168,67,0.12)",
                  border: `1px solid ${allDone ? "rgba(74,222,128,0.3)" : "rgba(212,168,67,0.28)"}`,
                  borderRadius: 10, padding: "2px 9px",
                }}>
                  {checkedCount} {t.nextHolidayShareCardOf} {total}
                </span>
              </div>
              {/* Progress bar */}
              <div style={{ height: 5, borderRadius: 3, background: "rgba(255,255,255,0.07)", overflow: "hidden", marginBottom: 14 }}>
                <div style={{
                  height: "100%", borderRadius: 3,
                  background: allDone ? "#4ade80" : "linear-gradient(90deg, #d4a843, #f0c050)",
                  width: `${total > 0 ? (checkedCount / total) * 100 : 0}%`,
                }} />
              </div>

              {/* Checked steps */}
              {halacha.preparations.some((_, i) => checklist[i]) && (
                <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 8 }}>
                  {halacha.preparations.map((prep, i) => checklist[i] ? (
                    <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <span style={{ flexShrink: 0, fontSize: 13, lineHeight: "1.5", color: "#4ade80" }}>✅</span>
                      <p style={{ margin: 0, fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.5, flex: 1 }}>
                        {prep}
                      </p>
                    </div>
                  ) : null)}
                </div>
              )}

              {/* Unchecked steps */}
              {halacha.preparations.some((_, i) => !checklist[i]) && (
                <>
                  <div style={{ fontSize: 9.5, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 5 }}>
                    {t.nextHolidayShareCardUnchecked}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5, marginBottom: 8 }}>
                    {halacha.preparations.map((prep, i) => !checklist[i] ? (
                      <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", opacity: 0.5 }}>
                        <span style={{ flexShrink: 0, fontSize: 13, lineHeight: "1.5" }}>⬜</span>
                        <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5, flex: 1 }}>
                          {prep}
                        </p>
                      </div>
                    ) : null)}
                  </div>
                </>
              )}
            </div>

            {/* Branding footer */}
            <div style={{
              borderTop: "1px solid rgba(212,168,67,0.12)",
              padding: "10px 20px",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}>
              <span style={{ fontSize: 14 }}>✡</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(212,168,67,0.55)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                {t.nextHolidayShareCardBrand}
              </span>
            </div>

            {/* Action buttons */}
            <div style={{ display: "flex", gap: 8, padding: "0 20px 18px" }}>
              <button
                onClick={() => handleShare(halacha.preparations, total, checkedCount)}
                style={{
                  flex: 1, padding: "10px 0",
                  background: "linear-gradient(135deg, #d4a843 0%, #f0c050 100%)",
                  border: "none", borderRadius: 10,
                  cursor: "pointer", fontSize: 12.5, fontWeight: 800,
                  color: "#0a0814", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  transition: "opacity 0.2s",
                }}
              >
                <span style={{ fontSize: 14 }}>📤</span>
                {shareCopied ? t.nextHolidayShareCopied : t.nextHolidayShareAction}
              </button>
              <button
                onClick={() => setShowShareCard(false)}
                style={{
                  flex: 1, padding: "10px 0",
                  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)",
                  borderRadius: 10, cursor: "pointer", fontSize: 12.5, fontWeight: 700,
                  color: "var(--text-secondary)",
                }}
              >
                {t.nextHolidayShareClose}
              </button>
            </div>
          </div>
        </div>
      );
    })()}
    </>
  );
}

// ── Shabbat Countdown Bar ────────────────────────────────────────────────────
function ShabbatCountdownBar({
  isPremium, location, onShowPremium,
}: {
  isPremium: boolean;
  location: Location;
  onShowPremium: () => void;
}) {
  const { t } = useLanguage();
  const trial = useTrialStatus();
  const canAccess = isPremium || trial.isInTrial;

  const [countdown, setCountdown] = useState("");
  const [isTonight, setIsTonight] = useState(false);
  const [minimised, setMinimised] = useState(() => {
    try { return localStorage.getItem(SHABBAT_BAR_MINIMIZED_KEY) === "true"; } catch { return false; }
  });

  function toggleMinimise(e: React.MouseEvent) {
    e.stopPropagation();
    const next = !minimised;
    setMinimised(next);
    try { localStorage.setItem(SHABBAT_BAR_MINIMIZED_KEY, String(next)); } catch {}
  }

  useEffect(() => {
    function getNextCandleLighting(): Date | null {
      const now = new Date();
      let daysUntilFriday = (5 - now.getDay() + 7) % 7;
      if (daysUntilFriday === 0) {
        const todayZmanim = calculateZmanim(now, location.lat, location.lng, location.candleLightingMinutes);
        if (todayZmanim.candleLighting && now >= todayZmanim.candleLighting) {
          daysUntilFriday = 7;
        }
      }
      const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilFriday);
      const z = calculateZmanim(targetDate, location.lat, location.lng, location.candleLightingMinutes);
      return z.candleLighting;
    }

    function tick() {
      if (!canAccess) { setCountdown(""); return; }
      const target = getNextCandleLighting();
      if (!target) { setCountdown(""); return; }
      const now = new Date();
      const diff = target.getTime() - now.getTime();
      if (diff <= 0) { setIsTonight(true); setCountdown(t.shabbatBarTonightLabel); return; }
      setIsTonight(false);
      const totalSecs = Math.floor(diff / 1000);
      const d = Math.floor(totalSecs / 86400);
      const h = Math.floor((totalSecs % 86400) / 3600);
      const m = Math.floor((totalSecs % 3600) / 60);
      const s = totalSecs % 60;
      if (d > 1) {
        setCountdown(`${d}d ${h}h ${String(m).padStart(2, "0")}m`);
      } else if (d === 1) {
        setCountdown(`1d ${h}h ${String(m).padStart(2, "0")}m`);
      } else if (h > 0) {
        setCountdown(`${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`);
      } else {
        setCountdown(`${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
      }
    }

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [canAccess, location, t.shabbatBarTonightLabel]);

  /* ── Minimised compact strip ── */
  if (minimised) {
    const compactText = canAccess && countdown ? `🕯 ${t.shabbatBarTitle} · ${countdown}` : `🕯 ${t.shabbatBarTitle}`;
    return (
      <div style={{ marginBottom: 14 }}>
        <div style={{
          borderRadius: 12, display: "flex", alignItems: "center", gap: 10,
          padding: "9px 12px",
          background: canAccess
            ? "rgba(212,168,67,0.07)"
            : "rgba(100,100,100,0.07)",
          border: canAccess
            ? "1px solid rgba(212,168,67,0.22)"
            : "1px solid rgba(120,120,120,0.15)",
        }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>🕯</span>
          <span style={{
            flex: 1, fontSize: 13, fontWeight: 600,
            color: canAccess ? "#d4a843" : "var(--text-muted)",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {compactText}
          </span>
          <button
            onClick={toggleMinimise}
            aria-label="Expand candle lighting bar"
            style={{
              background: "none", border: "none", cursor: "pointer",
              padding: "4px 6px", color: "rgba(255,255,255,0.4)",
              fontSize: 13, lineHeight: 1, flexShrink: 0,
            }}
          >▼</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 14 }}>
      <style>{`
        @keyframes shabbatBarIn {
          from { opacity: 0; transform: translateY(-5px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes candleFlick {
          0%,100% { transform: scaleY(1) rotate(-1deg); }
          50%      { transform: scaleY(1.08) rotate(1.5deg); }
        }
        @keyframes trialPulse {
          0%,100% { opacity: 1; }
          50%      { opacity: 0.65; }
        }
        @keyframes countdownTick {
          0%   { opacity: 1; }
          10%  { opacity: 0.7; }
          20%  { opacity: 1; }
        }
      `}</style>

      <div
        style={{
          borderRadius: 14,
          background: canAccess
            ? "linear-gradient(90deg, rgba(212,168,67,0.18) 0%, rgba(212,168,67,0.07) 100%)"
            : "linear-gradient(90deg, rgba(100,100,100,0.12) 0%, rgba(80,80,80,0.05) 100%)",
          border: canAccess
            ? "1px solid rgba(212,168,67,0.32)"
            : "1px solid rgba(120,120,120,0.2)",
          overflow: "hidden",
          animation: "shabbatBarIn 0.4s cubic-bezier(0.34,1.2,0.64,1) both",
        }}
      >
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "9px 12px 9px 12px",
        }}>

          {/* Candle icon */}
          <div style={{
            width: 34, height: 34, borderRadius: 10, flexShrink: 0,
            background: canAccess ? "rgba(212,168,67,0.14)" : "rgba(120,120,120,0.1)",
            border: canAccess ? "1px solid rgba(212,168,67,0.28)" : "1px solid rgba(120,120,120,0.18)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17,
          }}>
            <span style={{ display: "inline-block", animation: canAccess ? "candleFlick 2.5s ease-in-out infinite" : "none" }}>
              {canAccess ? "🕯" : "🔒"}
            </span>
          </div>

          {/* Labels */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
              <span style={{
                fontSize: 9, fontWeight: 900, letterSpacing: ".08em", textTransform: "uppercase",
                color: canAccess ? "#d4a843" : "var(--text-muted)",
              }}>
                {t.shabbatBarTitle}
              </span>

              {/* Badge */}
              {isPremium && (
                <span style={{
                  fontSize: 8, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase",
                  padding: "1px 5px", borderRadius: 99,
                  background: "linear-gradient(90deg, #5b3700, #d4a843)",
                  color: "#1a0900",
                }}>👑 {t.shabbatBarPremiumBadge}</span>
              )}
              {!isPremium && trial.isInTrial && (
                <span style={{
                  fontSize: 8, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase",
                  padding: "1px 5px", borderRadius: 99,
                  background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.25)",
                  color: "#4ade80",
                  animation: trial.daysLeft <= 5 ? "trialPulse 1.5s ease-in-out infinite" : "none",
                }}>
                  {t.shabbatBarTrialBadge.replace("{n}", String(trial.daysLeft))}
                </span>
              )}
              {trial.trialExpired && !isPremium && (
                <span style={{
                  fontSize: 8, fontWeight: 800, letterSpacing: ".06em", textTransform: "uppercase",
                  padding: "1px 5px", borderRadius: 99,
                  background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)",
                  color: "#ef4444",
                }}>
                  {t.shabbatBarTrialEnd}
                </span>
              )}
            </div>

            {/* Countdown or upsell */}
            {canAccess ? (
              <div style={{
                fontSize: 17, fontWeight: 900, color: isTonight ? "#4ade80" : "#f0c050",
                fontVariantNumeric: "tabular-nums", letterSpacing: isTonight ? "0" : ".02em",
                animation: "countdownTick 1s ease-out",
              }}>
                {countdown || "—"}
              </div>
            ) : (
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)" }}>
                {t.shabbatBarTrialEnd}
              </div>
            )}
          </div>

          {/* Right side: upgrade button OR candle time + minimise */}
          {canAccess ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 8, fontWeight: 700, color: "rgba(212,168,67,0.5)", letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 2 }}>
                  {t.shabbatCandleLighting}
                </div>
                <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-secondary)", fontVariantNumeric: "tabular-nums" }}>
                  {(() => {
                    const now = new Date();
                    const daysUntilFriday = (5 - now.getDay() + 7) % 7;
                    const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilFriday);
                    const z = calculateZmanim(targetDate, location.lat, location.lng, location.candleLightingMinutes);
                    return z.candleLighting ? formatTime(z.candleLighting) : "—";
                  })()}
                </div>
              </div>
              <button
                onClick={toggleMinimise}
                aria-label="Minimise candle lighting bar"
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  padding: "6px", color: "rgba(255,255,255,0.35)",
                  fontSize: 13, lineHeight: 1, borderRadius: 6,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >▲</button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <button
                onClick={onShowPremium}
                style={{
                  padding: "6px 10px", borderRadius: 10, border: "none",
                  background: "linear-gradient(90deg, #6b4800, #d4a843)",
                  color: "#1a0900", fontSize: 10, fontWeight: 900, cursor: "pointer",
                  letterSpacing: ".04em",
                }}
              >
                {t.shabbatBarUpgradeBtn}
              </button>
              <button
                onClick={toggleMinimise}
                aria-label="Minimise candle lighting bar"
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  padding: "6px", color: "rgba(255,255,255,0.3)",
                  fontSize: 13, lineHeight: 1, borderRadius: 6,
                }}
              >▲</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Announcement Strip ───────────────────────────────────────────────────────
function loadStripDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(ANN_STRIP_DISMISSED_KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch {}
  return new Set();
}

function AnnouncementStrip({ announcements, onOpen }: { announcements: ServerAnnouncement[]; onOpen: () => void }) {
  const { t } = useLanguage();
  const [dismissed, setDismissed] = useState<Set<string>>(loadStripDismissed);

  // Pinned first, then most recent — skip any already dismissed by ID
  const sorted = [...announcements].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.sentAt ?? b.createdAt).getTime() - new Date(a.sentAt ?? a.createdAt).getTime();
  });
  const visible = sorted.find(a => !dismissed.has(a.id));
  if (!visible) return null;

  const unreadCount = announcements.filter(a => !dismissed.has(a.id)).length;

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissed(prev => {
      const next = new Set([...prev, visible.id]);
      try { localStorage.setItem(ANN_STRIP_DISMISSED_KEY, JSON.stringify([...next])); } catch {}
      return next;
    });
  };

  return (
    <div
      onClick={onOpen}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "9px 10px 9px 12px", marginBottom: 14, borderRadius: 14,
        background: "linear-gradient(90deg, rgba(212,168,67,0.16) 0%, rgba(212,168,67,0.06) 100%)",
        border: "1px solid rgba(212,168,67,0.32)",
        cursor: "pointer",
        animation: "annStripIn 0.4s cubic-bezier(0.34,1.2,0.64,1) both",
      }}
    >
      <style>{`
        @keyframes annStripIn {
          from { transform: translateY(-6px); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes annDot {
          0%,100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.5; transform: scale(0.85); }
        }
      `}</style>

      {/* Live dot */}
      <div style={{
        width: 7, height: 7, borderRadius: "50%", background: "#ef4444", flexShrink: 0,
        animation: "annDot 1.8s ease-in-out infinite",
      }} />

      {/* Emoji */}
      <span style={{ fontSize: 17, flexShrink: 0, lineHeight: 1 }}>{visible.emoji}</span>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 1 }}>
          <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: ".08em", color: "#d4a843", textTransform: "uppercase" }}>
            {unreadCount > 1 ? t.annStripNews.replace("{n}", String(unreadCount)) : t.annStripNew}
          </span>
          {visible.pinned && (
            <span style={{ fontSize: 9, fontWeight: 800, color: "rgba(212,168,67,0.6)", letterSpacing: ".05em", textTransform: "uppercase" }}>
              · 📌
            </span>
          )}
        </div>
        <div style={{
          fontSize: 12, fontWeight: 800, color: "var(--text-primary)",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {visible.title}
        </div>
        {visible.body && (
          <div style={{
            fontSize: 10.5, color: "var(--text-muted)", marginTop: 1,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}>
            {visible.body}
          </div>
        )}
      </div>

      {/* Read label */}
      <span style={{
        fontSize: 9, fontWeight: 800, color: "rgba(212,168,67,0.65)", flexShrink: 0,
        textTransform: "uppercase", letterSpacing: ".07em",
      }}>
        {t.annStripRead}
      </span>

      {/* Dismiss */}
      <button
        onClick={handleDismiss}
        title="Dismiss"
        style={{
          background: "none", border: "none", cursor: "pointer",
          fontSize: 12, color: "rgba(212,168,67,0.35)", lineHeight: 1,
          padding: "3px 2px 3px 6px", flexShrink: 0,
          transition: "color 0.15s",
        }}
        onMouseEnter={e => (e.currentTarget.style.color = "rgba(212,168,67,0.75)")}
        onMouseLeave={e => (e.currentTarget.style.color = "rgba(212,168,67,0.35)")}
      >✕</button>
    </div>
  );
}

export default function Home({
  location, theme, isPremium, candleEnabled,
  onNavigate, onMoreTools, onShowHolidays, onShowParashah, onShowPremium, onShowDafYomi, onShowOmer,
  onLocationClick, onToggleTheme, onOpenSiddur, onShowCommunity, onShowCensus, onShowMembers,
  onNotifBell, notifActive, announcementCount,
  onShowAnnouncements, onShowEvents, onShowCommunityYahrzeit, onShowYartzeit, onShowMussar, onShowPrayerBoard, onShowTorahTracker,
  unreadAnnouncements = [],
  profileName,
}: HomeProps) {
  const { t } = useLanguage();
  const { user } = useUser();
  const today = new Date();
  const hour = today.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : hour < 21 ? "Good evening" : "Good night";
  const displayName = profileName?.trim() || user?.firstName || user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] || null;
  const firstName = displayName;
  const hdate = getHebrewDate(today);
  const zmanim = calculateZmanim(today, location.lat, location.lng, location.candleLightingMinutes);
  const parasha = getCurrentParasha(today);
  const holidays = getUpcomingHolidays(today, 3);

  const hebrewDay = hebrewDayNumeral(hdate.getDate());
  const hebrewMonth = getHebrewMonthName(hdate);
  const hebrewYear = hdate.getFullYear();

  const isFriday = today.getDay() === 5;
  const isShabbat = today.getDay() === 6;
  const showCandleLighting = isFriday || isShabbat;
  const isLight = theme === "light";
  const todayHolidays = getTodayHolidays();
  const omerDay = getOmerDay(today);

  const mapCardRef = useRef<HTMLDivElement>(null);
  const [mapForceExpand, setMapForceExpand] = useState(false);
  const [showCompassCard, setShowCompassCard] = useState(false);

  function onShowMap() {
    setMapForceExpand(true);
    setTimeout(() => setMapForceExpand(false), 200);
  }

  function onShowCompass() { setShowCompassCard(true); }

  const [candleCountdown, setCandleCountdown] = useState("");
  const [showShabbatBanner, setShowShabbatBanner] = useState(false);
  const candleNotifFiredRef = useRef<string>("");

  useEffect(() => {
    if (!isPremium || !candleEnabled) return;

    // Request notification permission silently for premium users
    if (isNotifSupported() && Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }

    function getNextCandleLighting(): Date | null {
      const now = new Date();
      let daysUntilFriday = (5 - now.getDay() + 7) % 7;
      if (daysUntilFriday === 0 && zmanim.candleLighting && now >= zmanim.candleLighting) {
        daysUntilFriday = 7;
      }
      const fridayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilFriday);
      const fridayZmanim = calculateZmanim(fridayDate, location.lat, location.lng, location.candleLightingMinutes);
      return fridayZmanim.candleLighting;
    }

    function tick() {
      const target = getNextCandleLighting();
      if (!target) { setCandleCountdown(""); return; }
      const now = new Date();
      const diff = target.getTime() - now.getTime();
      if (diff <= 0) {
        setCandleCountdown("Now!");
        // Fire once per candle lighting time
        const key = target.toISOString();
        if (candleNotifFiredRef.current !== key) {
          candleNotifFiredRef.current = key;
          // In-app banner (always)
          setShowShabbatBanner(true);
          // Push notification (if permission granted)
          sendNotification(
            "🕯 Shabbat Candle Lighting",
            `It's time to light candles in ${location.name}! Shabbat Shalom — שַׁבָּת שָׁלוֹם`,
            "candle-lighting-premium"
          );
        }
        return;
      }
      const totalSecs = Math.floor(diff / 1000);
      const d = Math.floor(totalSecs / 86400);
      const h = Math.floor((totalSecs % 86400) / 3600);
      const m = Math.floor((totalSecs % 3600) / 60);
      const s = totalSecs % 60;
      if (d > 0) {
        setCandleCountdown(`${d}d ${h}h`);
      } else if (h > 0) {
        setCandleCountdown(`${h}h ${m}m`);
      } else {
        setCandleCountdown(`${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`);
      }
    }

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [isPremium, candleEnabled, location]);

  const nextShabbat = new Date(today.getFullYear(), today.getMonth(), today.getDate() + (6 - today.getDay()));
  const dayName = getDayOfWeek(today);
  const monthStr = today.toLocaleDateString("en-US", { month: "long" });
  const yearStr = today.getFullYear();

  return (
    <div style={{ padding: "0 0 4px" }}>
      {/* ── Shabbat Mode overlay ── */}
      <ShabbatMode
        isFriday={isFriday}
        isShabbat={isShabbat}
        candleLighting={zmanim.candleLighting}
        havdalah={zmanim.havdalah}
        watermarkSrc={torahScrollWatermark}
      />
      {/* App Header */}
      <style>{`
        @keyframes goldShimmer {
          0% { background-position: -300% center; }
          100% { background-position: 300% center; }
        }
        @keyframes goldGlow {
          0%, 100% { box-shadow: 0 0 5px rgba(212,168,67,0.25), 0 0 0 1px rgba(212,168,67,0.35); }
          50% { box-shadow: 0 0 14px rgba(212,168,67,0.55), 0 0 0 1px rgba(212,168,67,0.7); }
        }
        @keyframes crownFloat {
          0%, 100% { transform: translateY(0px) rotate(-4deg); }
          50% { transform: translateY(-2px) rotate(4deg); }
        }
        @keyframes shabbatBannerIn {
          from { opacity: 0; transform: translateY(-20px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes candleFlicker {
          0%, 100% { transform: scaleY(1) rotate(-2deg); opacity: 1; }
          25%       { transform: scaleY(1.08) rotate(2deg); opacity: 0.9; }
          50%       { transform: scaleY(0.95) rotate(-1deg); opacity: 1; }
          75%       { transform: scaleY(1.05) rotate(1deg); opacity: 0.95; }
        }
      `}</style>

      {/* ── Shabbat Shalom Banner ── */}
      {showShabbatBanner && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999,
          padding: "0 12px 12px",
          animation: "shabbatBannerIn 0.45s cubic-bezier(0.34,1.56,0.64,1) both",
        }}>
          <div style={{
            borderRadius: "0 0 20px 20px",
            background: "linear-gradient(135deg, #0d0a00 0%, #1a1000 40%, #100d00 100%)",
            border: "1px solid rgba(212,168,67,0.5)",
            borderTop: "none",
            boxShadow: "0 8px 40px rgba(212,168,67,0.25), 0 2px 0 rgba(212,168,67,0.4) inset",
            padding: "18px 20px 16px",
            display: "flex", alignItems: "center", gap: 16,
          }}>
            {/* Candles */}
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              {[0, 1].map(i => (
                <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
                  <div style={{
                    width: 6, height: 14, borderRadius: "50% 50% 0 0 / 60% 60% 0 0",
                    background: "linear-gradient(180deg, #fff9c4, #fbbf24)",
                    animation: `candleFlicker ${1.2 + i * 0.3}s ease-in-out infinite`,
                    transformOrigin: "bottom center",
                    boxShadow: "0 0 8px 4px rgba(251,191,36,0.45)",
                  }} />
                  <div style={{ width: 8, height: 28, borderRadius: "2px 2px 4px 4px", background: "linear-gradient(180deg, #e8d5a0, #c8a855)" }} />
                </div>
              ))}
            </div>

            {/* Text */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.14em", color: "rgba(212,168,67,0.65)", marginBottom: 3 }}>
                🕯 CANDLE LIGHTING · {location.name.toUpperCase()}
              </div>
              <div style={{ fontFamily: "'Noto Serif Hebrew', serif", fontSize: 22, color: "#f0c050", direction: "rtl", lineHeight: 1.1, marginBottom: 4 }}>
                שַׁבָּת שָׁלוֹם
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.75)" }}>
                Shabbat Shalom! Time to light candles.
              </div>
            </div>

            {/* Dismiss */}
            <button
              onClick={() => setShowShabbatBanner(false)}
              style={{
                flexShrink: 0, width: 30, height: 30, borderRadius: "50%",
                background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.25)",
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 14, color: "rgba(212,168,67,0.8)",
              }}
            >✕</button>
          </div>
        </div>
      )}
      <div className="app-header">
        {/* ── Left: avatar + brand + location ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
          <button
            onClick={() => onNavigate("settings")}
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer", flexShrink: 0 }}
          >
            {user?.imageUrl ? (
              <img
                src={user.imageUrl} alt={user.firstName ?? "Profile"}
                style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: "2px solid rgba(212,175,55,0.45)", display: "block" }}
              />
            ) : (
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: "linear-gradient(135deg, #b8860b 0%, #f0c050 100%)",
                border: "2px solid rgba(212,175,55,0.45)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 15, fontWeight: 800, color: "#1a0900",
              }}>
                {(displayName?.[0] ?? user?.emailAddresses?.[0]?.emailAddress?.[0] ?? "M").toUpperCase()}
              </div>
            )}
          </button>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.15, letterSpacing: "-0.01em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 170 }}>
              {greeting}{firstName ? `, ${firstName}` : ""} 👋
            </div>
            <button
              onClick={onLocationClick}
              style={{
                display: "flex", alignItems: "center", gap: 3,
                background: "none", border: "none", padding: 0, cursor: "pointer", marginTop: 2,
              }}
            >
              <span style={{ fontSize: 10 }}>📍</span>
              <span style={{
                fontSize: 11, color: "var(--text-muted)", fontWeight: 600,
                maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{location.name}</span>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="6 9 12 15 18 9"/>
              </svg>
            </button>
          </div>
        </div>

        {/* ── Right: 3 icon-only circles ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>

          {/* Premium crown */}
          <button
            onClick={onShowPremium}
            title={isPremium && candleEnabled && candleCountdown ? `🕯 ${candleCountdown}` : "Premium"}
            style={{
              position: "relative",
              width: 34, height: 34, borderRadius: "50%",
              background: "linear-gradient(135deg, #b8860b 0%, #f0c050 50%, #b8860b 100%)",
              backgroundSize: "200% auto",
              animation: "goldShimmer 4s linear infinite",
              border: "none",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 16, lineHeight: 1, animation: "crownFloat 3s ease-in-out infinite", display: "inline-block" }}>👑</span>
            {isPremium && candleEnabled && candleCountdown && (
              <div style={{
                position: "absolute", bottom: -2, right: -2,
                background: "var(--surface)", borderRadius: 8, padding: "1px 4px",
                fontSize: 8, fontWeight: 800, color: "#d4a843",
                border: "1px solid rgba(212,168,67,0.3)", lineHeight: 1.4,
                fontVariantNumeric: "tabular-nums",
              }}>🕯</div>
            )}
          </button>

          {/* Notification bell */}
          <button
            onClick={onNotifBell}
            style={{
              position: "relative",
              width: 34, height: 34, borderRadius: "50%",
              background: (notifActive || announcementCount > 0) ? "rgba(212,168,67,0.13)" : "var(--elevated)",
              border: `1px solid ${(notifActive || announcementCount > 0) ? "rgba(212,168,67,0.4)" : "var(--border)"}`,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, transition: "all 0.2s",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke={(notifActive || announcementCount > 0) ? "#d4a843" : "var(--text-muted)"} strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {announcementCount > 0 ? (
              <div style={{
                position: "absolute", top: -3, right: -3,
                minWidth: 16, height: 16, borderRadius: 8,
                background: "#ef4444", border: "1.5px solid var(--surface)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 9, fontWeight: 800, color: "white", padding: "0 3px", lineHeight: 1,
              }}>
                {announcementCount > 9 ? "9+" : announcementCount}
              </div>
            ) : notifActive ? (
              <div style={{
                position: "absolute", top: 5, right: 5,
                width: 7, height: 7, borderRadius: "50%",
                background: "#d4a843", border: "1.5px solid var(--surface)",
              }} />
            ) : null}
          </button>

          {/* Theme toggle */}
          <button
            onClick={onToggleTheme}
            style={{
              width: 34, height: 34, borderRadius: "50%",
              background: "var(--elevated)", border: "1px solid var(--border)",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 16, flexShrink: 0,
            }}
          >
            {isLight ? "🌙" : "☀️"}
          </button>
        </div>
      </div>

      <div style={{ padding: "14px 16px 0" }}>

        {/* ── Community Announcement Strip ── */}
        <AnnouncementStrip announcements={unreadAnnouncements} onOpen={onShowAnnouncements} />

        {/* ══════════════════════════════════════════
            TODAY CARD — Hebrew Date + Zmanim
        ══════════════════════════════════════════ */}
        <CompassCard
          gradient="linear-gradient(160deg, #0d0c1a 0%, #08070f 55%, #0f0e1c 100%)"
          accentColor="#c9a227"
          shimmerColor="#e8c84a"
          category="TODAY"
          backgroundLayer={<TimeAwareBackground sunrise={zmanim.sunrise} sunset={zmanim.sunset} />}
          icon={
            <span style={{ fontFamily: "'Noto Serif Hebrew', serif", fontSize: 40, color: "#c9a227", lineHeight: 1, display: "block", filter: "drop-shadow(0 0 10px rgba(201,162,39,0.5))" }}>
              {hebrewDay}
            </span>
          }
          title={`${hebrewMonth} ${hebrewYear}`}
          subtitle={`${dayName} · ${monthStr} ${today.getDate()}, ${yearStr} · ${location.name}`}
          previewContent={
            <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
              {[
                { label: "SUNRISE", time: zmanim.sunrise },
                { label: "MIDDAY", time: zmanim.chatzot },
                { label: showCandleLighting && zmanim.candleLighting ? "CANDLES" : "SUNSET", time: showCandleLighting && zmanim.candleLighting ? zmanim.candleLighting : zmanim.sunset },
              ].map(({ label, time }) => (
                <div key={label} style={{
                  flex: 1, textAlign: "center",
                  background: "rgba(201,162,39,0.07)", borderRadius: 10,
                  padding: "7px 4px",
                  border: "1px solid rgba(201,162,39,0.18)",
                }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: "rgba(201,162,39,0.75)", letterSpacing: "0.1em", marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "white" }}>{time ? formatTime(time) : "—"}</div>
                </div>
              ))}
            </div>
          }
          expandedTitle="Today's Calendar"
          expandedSubtitle={`${dayName} · ${monthStr} ${today.getDate()}, ${yearStr}`}
          watermarkSrc={torahScrollWatermark}
        >
          <div style={{ padding: "16px 16px 0" }}>
            <ShabbatCountdownBar isPremium={isPremium} location={location} onShowPremium={onShowPremium} />
            <DateZmanimCard
              today={today} hdate={hdate} zmanim={zmanim}
              location={location} showCandleLighting={showCandleLighting}
              onNavigate={onNavigate}
              forceExpand={mapForceExpand}
            />
            <WeekStrip onNavigate={onNavigate} />
            <ZmanimTimeline zmanim={zmanim} location={location} onNavigate={onNavigate} />
          </div>
        </CompassCard>

        {/* ── Rosh Chodesh banner ── */}
        <RoshChodeshBanner hdate={hdate} />

        {/* ── Today's Holiday ── */}
        {todayHolidays.map(name => (
          <TodayHolidayCard key={name} name={name} />
        ))}

        {/* ── Next Holiday Countdown ── */}
        <NextHolidayCard holidays={holidays} />

        {/* ── Yahrzeit Reminders ── */}
        <YahrzeitReminderCard onShowYartzeit={onShowYartzeit} />

        {/* ══════════════════════════════════════════
            PARASHA CARD — Weekly Torah Portion
        ══════════════════════════════════════════ */}
        {parasha && (
          <CompassCard
            gradient="linear-gradient(160deg, #0d0c1a 0%, #08070f 55%, #0f0e1c 100%)"
            accentColor="#c9a227"
            shimmerColor="#e8c84a"
            category="THIS WEEK'S PARASHA"
            icon={
              <span style={{ fontFamily: "'Noto Serif Hebrew', serif", fontSize: 42, color: "#c9a227", lineHeight: 1, display: "block", filter: "drop-shadow(0 0 14px rgba(201,162,39,0.55))" }}>
                פ
              </span>
            }
            title={`Parashat ${parasha.name}`}
            subtitle={`${parasha.book} · ${parasha.verses}`}
            badge={
              <span style={{
                fontSize: 10, fontWeight: 800, color: "#c9a227", letterSpacing: "0.08em",
                background: "rgba(201,162,39,0.12)", border: "1px solid rgba(201,162,39,0.32)",
                padding: "3px 9px", borderRadius: 20,
              }}>
                SHABBAT {nextShabbat.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase()}
              </span>
            }
            onTap={onShowParashah}
            minHeight={180}
            watermarkSrc={torahScrollWatermark}
          />
        )}


        {/* ══════════════════════════════════════════
            OMER COUNTER (during 49-day period)
        ══════════════════════════════════════════ */}
        {omerDay !== null && (
          <CompassCard
            gradient="linear-gradient(160deg, #0d0c1a 0%, #08070f 55%, #0f0e1c 100%)"
            accentColor="#c9a227"
            shimmerColor="#e8c84a"
            category="SEFIRAT HA-OMER"
            icon={
              <div style={{ position: "relative", display: "inline-block", width: 48, height: 48 }}>
                <svg width="48" height="48" viewBox="0 0 52 52">
                  <circle cx="26" cy="26" r="21" fill="none" stroke="rgba(201,162,39,0.15)" strokeWidth="5" />
                  <circle cx="26" cy="26" r="21" fill="none" stroke="#c9a227" strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 21}
                    strokeDashoffset={2 * Math.PI * 21 - (omerDay / 49) * 2 * Math.PI * 21}
                    transform="rotate(-90 26 26)"
                  />
                </svg>
                <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <span style={{ fontSize: 14, fontWeight: 900, color: "#c9a227" }}>{omerDay}</span>
                </div>
              </div>
            }
            title={t.omerSefiratTitle}
            subtitle={`${t.omerDayCount.replace("{day}", String(omerDay))} · ${(49 - omerDay === 1 ? t.omerDayLeft : t.omerDaysLeft).replace("{days}", String(49 - omerDay))}`}
            onTap={onShowOmer}
            minHeight={170}
            watermarkSrc={torahScrollWatermark}
          />
        )}

        {/* ══════════════════════════════════════════
            DAILY WISDOM CARD — Torah Thought
        ══════════════════════════════════════════ */}
        {(() => {
          const dayIdx = Math.abs(hdate.abs()) % TORAH_THOUGHTS.length;
          const thought = TORAH_THOUGHTS[dayIdx];
          return (
            <CompassCard
              gradient="linear-gradient(160deg, #0d0c1a 0%, #08070f 55%, #0f0e1c 100%)"
              accentColor="#c9a227"
              shimmerColor="#e8c84a"
              category="DAILY WISDOM"
              icon={<span style={{ fontSize: 38, filter: "drop-shadow(0 0 8px rgba(201,162,39,0.4))" }}>✡</span>}
              title={`"${thought.quote.length > 60 ? thought.quote.slice(0, 60) + "…" : thought.quote}"`}
              subtitle={thought.source}
              expandedTitle="Daily Wisdom"
              expandedSubtitle="Sacred teachings for today"
              watermarkSrc={dailyWisdomBg}
            >
              <div style={{ padding: "20px 20px 0" }}>
                <DailyBriefingCard today={today} hdate={hdate} omerDay={omerDay} onShowOmer={onShowOmer} />
              </div>
            </CompassCard>
          );
        })()}

        {/* ══════════════════════════════════════════
            SIDDUR LIBRARY CARD
        ══════════════════════════════════════════ */}
        <CompassCard
          gradient="linear-gradient(160deg, #0d0c1a 0%, #08070f 55%, #0f0e1c 100%)"
          accentColor="#c9a227"
          shimmerColor="#e8c84a"
          category="SIDDUR LIBRARY"
          icon={<span style={{ fontSize: 42, filter: "drop-shadow(0 0 8px rgba(201,162,39,0.4))" }}>📚</span>}
          title="Sacred Texts & Prayers"
          subtitle="Siddurim, Tehillim, Torah & Kuki Books"
          previewContent={
            <div style={{ display: "flex", gap: 6, marginTop: 2 }}>
              {["Siddur", "Tehillim", "Torah", "Kuki Books"].map(cat => (
                <div key={cat} style={{
                  flex: 1, textAlign: "center",
                  background: "rgba(201,162,39,0.07)",
                  border: "1px solid rgba(201,162,39,0.2)",
                  borderRadius: 8, padding: "5px 2px",
                  fontSize: 9, fontWeight: 700, color: "rgba(201,162,39,0.75)",
                  letterSpacing: "0.05em",
                }}>{cat}</div>
              ))}
            </div>
          }
          onTap={onOpenSiddur}
          minHeight={200}
          watermarkSrc={torahScrollWatermark}
        />

        {/* ── Quick Actions ── */}
        <div className="quick-action-grid" style={{ marginBottom: 12 }}>
          <div className="quick-action" onClick={onShowHolidays}>
            <div className="quick-action-icon" style={{ background: "rgba(59,130,246,0.13)", border: "1px solid rgba(59,130,246,0.18)", borderRadius: 12 }}>📅</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", lineHeight: 1.3 }}>Holidays {hebrewYear}</div>
          </div>
          <div className="quick-action" onClick={isPremium ? onShowDafYomi : onShowPremium} style={{ position: "relative" }}>
            <div style={{ position: "relative", display: "inline-block" }}>
              <div className="quick-action-icon" style={{ background: isPremium ? "rgba(20,184,166,0.13)" : "rgba(212,168,67,0.1)", border: `1px solid ${isPremium ? "rgba(20,184,166,0.18)" : "rgba(212,168,67,0.25)"}`, borderRadius: 12 }}>📖</div>
              {!isPremium && (
                <div style={{
                  position: "absolute", top: -4, right: -4,
                  width: 16, height: 16, borderRadius: "50%",
                  background: "linear-gradient(135deg, #b8860b, #d4a843)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.5)",
                }}>
                  <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#1a0900" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
              )}
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: isPremium ? "var(--text-secondary)" : "#d4a843", lineHeight: 1.3 }}>
              Daf Yomi{!isPremium && " 👑"}
            </div>
          </div>
          <div className="quick-action" onClick={onMoreTools}>
            <div className="quick-action-icon" style={{ background: "rgba(168,85,247,0.13)", border: "1px solid rgba(168,85,247,0.18)", borderRadius: 12 }}>🔧</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", lineHeight: 1.3 }}>{t.homeMoreTools}</div>
          </div>
        </div>

        {/* ── Celebrations + Community ── */}
        <UpcomingCelebrations onShowMembers={onShowMembers} />
        <CommunityCard onShowCommunity={onShowCommunity} onShowCensus={onShowCensus} onShowMembers={onShowMembers} />

      </div>

      {/* ── Community Hub Floating Button ── */}
      <CommunityFAB
        onShowAnnouncements={onShowAnnouncements}
        onShowEvents={onShowEvents}
        onShowCommunityYahrzeit={onShowCommunityYahrzeit}
        onShowMussar={onShowMussar}
        onShowPrayerBoard={onShowPrayerBoard}
        onShowTorahTracker={onShowTorahTracker}
        onShowMap={onShowMap}
        onShowCompass={onShowCompass}
        announcementCount={announcementCount}
      />

      {/* ── AI Chat Floating Widget ── */}
      <AiChatFAB />

      {/* ── Jerusalem Compass Card overlay ── */}
      {showCompassCard && (() => {
        const toRad = (d: number) => d * Math.PI / 180;
        const lat1 = toRad(location.lat);
        const lat2 = toRad(31.7767);
        const dLng = toRad(35.2345 - location.lng);
        const y = Math.sin(dLng) * Math.cos(lat2);
        const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
        const bearing = (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;

        // Great-circle distance to Jerusalem
        const R = 6371;
        const dLat2 = toRad(31.7767 - location.lat);
        const dLng2 = toRad(35.2345 - location.lng);
        const a = Math.sin(dLat2 / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng2 / 2) ** 2;
        const distKm = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));

        return (
          <div
            onClick={() => setShowCompassCard(false)}
            style={{
              position: "fixed", inset: 0, zIndex: 9000,
              background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)",
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "0 24px",
            }}
          >
            <div
              onClick={e => e.stopPropagation()}
              style={{
                width: "100%", maxWidth: 340,
                background: "linear-gradient(160deg, #0e1020 0%, #0a0e1a 55%, #10090a 100%)",
                border: "1.5px solid rgba(212,168,67,0.45)",
                borderRadius: 24,
                padding: "28px 24px 24px",
                boxShadow: "0 24px 80px rgba(0,0,0,0.8), inset 0 1px 0 rgba(212,168,67,0.1)",
                display: "flex", flexDirection: "column", alignItems: "center", gap: 0,
                position: "relative",
              }}
            >
              {/* Close */}
              <button
                onClick={() => setShowCompassCard(false)}
                style={{
                  position: "absolute", top: 14, right: 14,
                  background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "50%", width: 30, height: 30, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "rgba(255,255,255,0.6)", fontSize: 14, fontWeight: 700,
                }}
              >✕</button>

              {/* Title */}
              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.16em", color: "rgba(212,168,67,0.6)", marginBottom: 20 }}>
                🧭 {t.fabCompass.toUpperCase()}
              </div>

              {/* Large compass disc */}
              <div style={{
                width: 200, height: 200, borderRadius: "50%", position: "relative",
                background: "radial-gradient(circle at 40% 35%, rgba(212,168,67,0.08) 0%, rgba(8,11,24,0.95) 65%)",
                border: "2px solid rgba(212,168,67,0.45)",
                boxShadow: "0 0 40px rgba(212,168,67,0.12), inset 0 0 30px rgba(0,0,0,0.5)",
                marginBottom: 20,
              }}>
                <style>{`
                  @keyframes compassPulse {
                    0%, 100% { box-shadow: 0 0 40px rgba(212,168,67,0.12), inset 0 0 30px rgba(0,0,0,0.5); }
                    50% { box-shadow: 0 0 60px rgba(212,168,67,0.22), inset 0 0 30px rgba(0,0,0,0.5); }
                  }
                `}</style>

                {/* Degree ring */}
                <svg width="200" height="200" style={{ position: "absolute", top: 0, left: 0 }}>
                  {/* Cardinal labels */}
                  {[{ a: 0, l: "N" }, { a: 90, l: "E" }, { a: 180, l: "S" }, { a: 270, l: "W" }].map(({ a, l }) => {
                    const rad = (a - 90) * Math.PI / 180;
                    const r = 82;
                    return (
                      <text key={l}
                        x={100 + r * Math.cos(rad)} y={100 + r * Math.sin(rad)}
                        textAnchor="middle" dominantBaseline="central"
                        fill="rgba(212,168,67,0.5)" fontSize="11" fontWeight="800"
                        fontFamily="system-ui, sans-serif" letterSpacing="0.05em"
                      >{l}</text>
                    );
                  })}
                  {/* Tick marks every 30° */}
                  {Array.from({ length: 12 }, (_, i) => i * 30).map(angle => {
                    const rad = (angle - 90) * Math.PI / 180;
                    const major = angle % 90 === 0;
                    const r1 = major ? 68 : 71, r2 = 76;
                    return (
                      <line key={angle}
                        x1={100 + r1 * Math.cos(rad)} y1={100 + r1 * Math.sin(rad)}
                        x2={100 + r2 * Math.cos(rad)} y2={100 + r2 * Math.sin(rad)}
                        stroke={major ? "rgba(212,168,67,0.55)" : "rgba(212,168,67,0.22)"}
                        strokeWidth={major ? 2 : 1}
                      />
                    );
                  })}
                  {/* Inner ring */}
                  <circle cx="100" cy="100" r="63" fill="none" stroke="rgba(212,168,67,0.1)" strokeWidth="1" />
                </svg>

                {/* Rotating needle */}
                <div style={{
                  position: "absolute", inset: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transform: `rotate(${bearing}deg)`,
                  transition: "transform 0.6s cubic-bezier(0.34,1.56,0.64,1)",
                }}>
                  <svg width="120" height="120" viewBox="0 0 120 120">
                    {/* Gold north tip → Jerusalem */}
                    <polygon points="60,10 67,58 60,52 53,58"
                      fill="url(#goldNeedle)" />
                    <defs>
                      <linearGradient id="goldNeedle" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ffe066" />
                        <stop offset="100%" stopColor="#c8860a" />
                      </linearGradient>
                    </defs>
                    {/* Dim south tail */}
                    <polygon points="60,110 67,62 60,68 53,62"
                      fill="rgba(255,255,255,0.15)" />
                    {/* Centre ring */}
                    <circle cx="60" cy="60" r="7" fill="#0a0e1a" stroke="#d4a843" strokeWidth="2" />
                    <circle cx="60" cy="60" r="3" fill="#f0c050" />
                  </svg>
                </div>

                {/* ✡ centre watermark */}
                <div style={{
                  position: "absolute", inset: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  pointerEvents: "none",
                }}>
                  <span style={{ fontSize: 13, color: "rgba(212,168,67,0.18)", userSelect: "none" }}>✡</span>
                </div>
              </div>

              {/* JERUSALEM label */}
              <div style={{
                fontSize: 22, fontWeight: 900, color: "#f0c050",
                letterSpacing: "0.1em", marginBottom: 6,
                fontFamily: "'Noto Serif Hebrew', serif",
              }}>
                {t.compassJerusalem.toUpperCase()}
              </div>

              {/* Stats row */}
              <div style={{ display: "flex", gap: 20, marginBottom: 16 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: "rgba(212,168,67,0.5)", fontWeight: 800, letterSpacing: "0.1em", marginBottom: 2 }}>
                    {t.compassBearing.toUpperCase()}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: "white" }}>
                    {Math.round(bearing)}°
                  </div>
                </div>
                <div style={{ width: 1, background: "rgba(212,168,67,0.15)" }} />
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: "rgba(212,168,67,0.5)", fontWeight: 800, letterSpacing: "0.1em", marginBottom: 2 }}>
                    {t.compassDistKm.toUpperCase()}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: "white" }}>
                    {distKm.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* From city */}
              <div style={{
                fontSize: 11, color: "rgba(255,255,255,0.3)", fontWeight: 600,
                letterSpacing: "0.05em",
              }}>
                {t.compassFromCity} {location.name}
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────
   AI Chat Floating Widget
───────────────────────────────────────────────────────────────────── */

async function getAiToken(): Promise<string | null> {
  return (await (window as any).Clerk?.session?.getToken()) ?? null;
}

interface AiMessage { role: "user" | "assistant"; content: string; streaming?: boolean; }

function AiChatFAB() {
  const { t, lang } = useLanguage();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<AiMessage[]>(() => {
    try {
      const saved = localStorage.getItem(AI_CHAT_HISTORY_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved) as AiMessage[];
      return Array.isArray(parsed) ? parsed.filter(m => !m.streaming) : [];
    } catch { return []; }
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [minimized, setMinimized] = useState<boolean>(() => {
    try { return localStorage.getItem(AI_CHAT_MINIMIZED_KEY) === "1"; } catch { return false; }
  });
  const [fabHovered, setFabHovered] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const recognitionRef = useRef<any>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  async function shareMessage(content: string, idx: number) {
    const text = `✡ Rav Menashe AI\n\n${content}\n\n— Bnei Menashe Calendar`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Rav Menashe AI", text });
        return;
      } catch {}
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    } catch {}
  }

  const voiceSupported = typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  function toggleVoice() {
    if (!voiceSupported) {
      setVoiceError(t.chatVoiceUnsupported);
      setTimeout(() => setVoiceError(null), 3000);
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }
    setVoiceError(null);
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    recognitionRef.current = rec;

    let finalTranscript = "";

    rec.onstart = () => setIsListening(true);
    rec.onend = () => {
      setIsListening(false);
      if (finalTranscript.trim()) {
        setInput(prev => {
          const joined = prev.trim() ? prev.trim() + " " + finalTranscript.trim() : finalTranscript.trim();
          return joined;
        });
        setTimeout(() => inputRef.current?.focus(), 80);
      }
    };
    rec.onerror = (e: any) => {
      setIsListening(false);
      if (e.error !== "aborted" && e.error !== "no-speech") {
        setVoiceError(t.chatVoiceUnsupported);
        setTimeout(() => setVoiceError(null), 3000);
      }
    };
    rec.onresult = (e: any) => {
      let interim = "";
      finalTranscript = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalTranscript += e.results[i][0].transcript;
        else interim += e.results[i][0].transcript;
      }
      setInput(interim || finalTranscript);
    };
    rec.start();
  }

  useEffect(() => {
    try { localStorage.setItem(AI_CHAT_MINIMIZED_KEY, minimized ? "1" : "0"); } catch {}
  }, [minimized]);

  useEffect(() => {
    try {
      const toSave = messages.filter(m => !m.streaming).slice(-60);
      localStorage.setItem(AI_CHAT_HISTORY_KEY, JSON.stringify(toSave));
    } catch {}
  }, [messages]);

  function minimize() {
    setOpen(false);
    setMinimized(true);
  }

  function restore() {
    setMinimized(false);
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 120);
  }, [open]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    const userMsg: AiMessage = { role: "user", content: text.trim() };
    const nextMsgs = [...messages, userMsg];
    setMessages(nextMsgs);
    setInput("");
    setLoading(true);

    const assistant: AiMessage = { role: "assistant", content: "", streaming: true };
    setMessages([...nextMsgs, assistant]);

    const token = await getAiToken();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        signal: ctrl.signal,
        body: JSON.stringify({ messages: nextMsgs.map(({ role, content }) => ({ role, content })) }),
      });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let acc = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of dec.decode(value, { stream: true }).split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") break;
          try {
            const p = JSON.parse(payload);
            if (p.error) acc = p.error;
            else if (p.text) acc += p.text;
            setMessages(prev => {
              const u = [...prev];
              u[u.length - 1] = { role: "assistant", content: acc, streaming: true };
              return u;
            });
          } catch {}
        }
      }
      setMessages(prev => {
        const u = [...prev];
        u[u.length - 1] = { role: "assistant", content: acc || t.chatError, streaming: false };
        return u;
      });
    } catch (err: any) {
      if (err.name === "AbortError") return;
      setMessages(prev => {
        const u = [...prev];
        u[u.length - 1] = { role: "assistant", content: t.chatError, streaming: false };
        return u;
      });
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }

  function handleStop() {
    abortRef.current?.abort();
    setLoading(false);
    setMessages(prev => {
      const u = [...prev];
      const last = u[u.length - 1];
      if (last?.streaming) u[u.length - 1] = { ...last, streaming: false };
      return u;
    });
  }

  /* ── Minimized: tiny pill ── */
  if (minimized) {
    return (
      <div
        onClick={restore}
        title="Restore AI chat"
        style={{
          position: "fixed",
          bottom: 24,
          left: 16,
          display: "flex",
          alignItems: "center",
          gap: 6,
          background: "linear-gradient(135deg,rgba(20,16,8,0.95),rgba(30,24,10,0.98))",
          border: "1px solid rgba(212,175,55,0.35)",
          borderRadius: 20,
          padding: "6px 12px 6px 8px",
          cursor: "pointer",
          zIndex: 451,
          boxShadow: "0 2px 12px rgba(0,0,0,0.5)",
          animation: "aiChatPillIn 0.25s cubic-bezier(0.34,1.56,0.64,1)",
          transition: "box-shadow 0.15s, border-color 0.15s",
        }}
        onMouseOver={e => {
          (e.currentTarget as HTMLElement).style.borderColor = "rgba(212,175,55,0.65)";
          (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.6), 0 0 12px rgba(212,175,55,0.2)";
        }}
        onMouseOut={e => {
          (e.currentTarget as HTMLElement).style.borderColor = "rgba(212,175,55,0.35)";
          (e.currentTarget as HTMLElement).style.boxShadow = "0 2px 12px rgba(0,0,0,0.5)";
        }}
      >
        <div style={{
          width: 22, height: 22, borderRadius: "50%",
          background: "linear-gradient(135deg,#D4AF37,#A0821A)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, flexShrink: 0,
        }}>✡</div>
        <span style={{ color: "#C8A84B", fontSize: 11, fontWeight: 600, letterSpacing: 0.3, whiteSpace: "nowrap" }}>
          {t.chatTitle}
        </span>
        {messages.filter(m => m.role === "assistant").length > 0 && (
          <span style={{
            background: "#6B46C1", color: "#fff",
            borderRadius: 10, minWidth: 16, height: 16,
            fontSize: 9, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "0 3px",
          }}>{messages.filter(m => m.role === "assistant").length}</span>
        )}
        <style>{`
          @keyframes aiChatPillIn {
            from { opacity: 0; transform: translateX(-12px) scale(0.9); }
            to   { opacity: 1; transform: translateX(0) scale(1); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <>
      {/* Floating Chat Panel */}
      {open && (
        <div
          style={{
            position: "fixed",
            bottom: 96,
            left: 16,
            width: "min(360px, calc(100vw - 32px))",
            height: "min(520px, calc(100dvh - 130px))",
            background: "linear-gradient(180deg,#0F1829 0%,#0a1020 100%)",
            borderRadius: 20,
            border: "1px solid rgba(212,175,55,0.3)",
            boxShadow: "0 8px 40px rgba(0,0,0,0.7), 0 0 30px rgba(212,175,55,0.08)",
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            zIndex: 450,
            animation: "aiChatSlideIn 0.25s cubic-bezier(0.34,1.56,0.64,1)",
          }}
        >
          {/* Header */}
          <div style={{
            padding: "12px 14px 10px",
            borderBottom: "1px solid rgba(212,175,55,0.15)",
            background: "rgba(212,175,55,0.04)",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "linear-gradient(135deg,#D4AF37,#A0821A)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, flexShrink: 0,
            }}>✡</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: "#D4AF37", fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>
                {t.chatTitle}
              </div>
              <div style={{ color: "#6A5A3A", fontSize: 10, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {t.chatSubtitle}
              </div>
            </div>
            {messages.length > 0 && (
              <button
                onClick={() => { setMessages([]); try { localStorage.removeItem(AI_CHAT_HISTORY_KEY); } catch {} }}
                title="Clear chat"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 6, color: "#6A5A3A",
                  width: 28, height: 28,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", fontSize: 11, flexShrink: 0,
                }}
              >🗑</button>
            )}
            <button
              onClick={() => setOpen(false)}
              title="Close"
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8, color: "#A89070",
                width: 28, height: 28,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", fontSize: 14, flexShrink: 0,
              }}
            >✕</button>
            <button
              onClick={minimize}
              title="Minimize AI chat"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 8, color: "#6A5A3A",
                width: 28, height: 28,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", fontSize: 16, flexShrink: 0,
                lineHeight: 1,
              }}
              onMouseOver={e => (e.currentTarget.style.color = "#E05555")}
              onMouseOut={e => (e.currentTarget.style.color = "#6A5A3A")}
            >—</button>
          </div>

          {/* Messages */}
          <div style={{
            flex: 1, overflowY: "auto",
            padding: "12px 12px 8px",
            display: "flex", flexDirection: "column", gap: 10,
          }}>
            {messages.length === 0 && (
              <div style={{ textAlign: "center", padding: "10px 4px 0" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🕍</div>
                <div style={{ color: "#D4AF37", fontWeight: 700, fontSize: 14, marginBottom: 4 }}>
                  {t.chatWelcomeTitle}
                </div>
                <div style={{ color: "#7A6A4A", fontSize: 11, lineHeight: 1.55, marginBottom: 14 }}>
                  {t.chatWelcomeDesc}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {AI_SUGGESTED.map(q => (
                    <button
                      key={q}
                      onClick={() => sendMessage(q)}
                      style={{
                        background: "rgba(212,175,55,0.07)",
                        border: "1px solid rgba(212,175,55,0.18)",
                        borderRadius: 10,
                        padding: "7px 12px",
                        color: "#C8A84B",
                        fontSize: 11,
                        cursor: "pointer",
                        textAlign: "left",
                        lineHeight: 1.4,
                        transition: "background 0.15s",
                      }}
                      onMouseOver={e => (e.currentTarget.style.background = "rgba(212,175,55,0.14)")}
                      onMouseOut={e => (e.currentTarget.style.background = "rgba(212,175,55,0.07)")}
                    >{q}</button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} style={{
                display: "flex",
                flexDirection: "column",
                alignItems: msg.role === "user" ? "flex-end" : "flex-start",
                gap: 4,
              }}>
                <div style={{
                  display: "flex",
                  justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                  alignItems: "flex-end",
                  gap: 6,
                  width: "100%",
                }}>
                  {msg.role === "assistant" && (
                    <div style={{
                      width: 24, height: 24, borderRadius: "50%",
                      background: "linear-gradient(135deg,#D4AF37,#A0821A)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 11, flexShrink: 0, marginBottom: 2,
                    }}>✡</div>
                  )}
                  <div style={{
                    maxWidth: "80%",
                    padding: "8px 12px",
                    borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                    background: msg.role === "user"
                      ? "linear-gradient(135deg,#D4AF37,#A0821A)"
                      : "rgba(255,255,255,0.06)",
                    border: msg.role === "user" ? "none" : "1px solid rgba(212,175,55,0.12)",
                    color: msg.role === "user" ? "#0F1829" : "#E8DCC8",
                    fontSize: 12,
                    lineHeight: 1.6,
                    fontWeight: msg.role === "user" ? 600 : 400,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}>
                    {msg.content}
                    {msg.streaming && (
                      <span style={{
                        display: "inline-block", width: 6, height: 12,
                        background: "#D4AF37", marginLeft: 2,
                        borderRadius: 2, animation: "aiChatBlink 1s step-start infinite",
                      }} />
                    )}
                  </div>
                </div>
                {/* Share button — assistant only, after streaming finishes */}
                {msg.role === "assistant" && !msg.streaming && msg.content && (
                  <div style={{ paddingLeft: 30 }}>
                    <button
                      onClick={() => shareMessage(msg.content, i)}
                      title={copiedIdx === i ? t.chatCopied : t.chatShare}
                      style={{
                        display: "flex", alignItems: "center", gap: 4,
                        background: copiedIdx === i ? "rgba(100,200,100,0.12)" : "transparent",
                        border: copiedIdx === i ? "1px solid rgba(100,200,100,0.3)" : "1px solid rgba(212,175,55,0.12)",
                        borderRadius: 8,
                        padding: "3px 8px",
                        color: copiedIdx === i ? "#6DCF6D" : "#5A4A2A",
                        fontSize: 10,
                        cursor: "pointer",
                        transition: "all 0.2s",
                        fontWeight: 500,
                        letterSpacing: 0.2,
                      }}
                      onMouseOver={e => {
                        if (copiedIdx !== i) {
                          (e.currentTarget as HTMLElement).style.borderColor = "rgba(212,175,55,0.3)";
                          (e.currentTarget as HTMLElement).style.color = "#C8A84B";
                          (e.currentTarget as HTMLElement).style.background = "rgba(212,175,55,0.07)";
                        }
                      }}
                      onMouseOut={e => {
                        if (copiedIdx !== i) {
                          (e.currentTarget as HTMLElement).style.borderColor = "rgba(212,175,55,0.12)";
                          (e.currentTarget as HTMLElement).style.color = "#5A4A2A";
                          (e.currentTarget as HTMLElement).style.background = "transparent";
                        }
                      }}
                    >
                      <span style={{ fontSize: 11 }}>{copiedIdx === i ? "✓" : "↗"}</span>
                      {copiedIdx === i ? t.chatCopied : t.chatShare}
                    </button>
                  </div>
                )}

                {/* Follow-up suggestions — only after the last completed assistant message */}
                {msg.role === "assistant" && !msg.streaming && msg.content && i === messages.length - 1 && (() => {
                  const pool = lang === "tk" ? AI_FOLLOWUPS_TK : AI_FOLLOWUPS_EN;
                  const offset = Math.floor(i / 2) % (pool.length - 2);
                  const picks = pool.slice(offset, offset + 3);
                  return (
                    <div style={{ paddingLeft: 30, marginTop: 4 }}>
                      <div style={{ fontSize: 9, color: "#5A4A2A", marginBottom: 4, letterSpacing: 0.5, textTransform: "uppercase" }}>
                        {t.chatSuggestLabel}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {picks.map((q, qi) => (
                          <button
                            key={qi}
                            onClick={() => { if (!loading) sendMessage(q); }}
                            style={{
                              background: "rgba(212,175,55,0.06)",
                              border: "1px solid rgba(212,175,55,0.15)",
                              borderRadius: 10,
                              padding: "5px 10px",
                              color: "#B89A3A",
                              fontSize: 10.5,
                              cursor: loading ? "default" : "pointer",
                              textAlign: "left",
                              lineHeight: 1.4,
                              opacity: loading ? 0.5 : 1,
                              transition: "all 0.15s",
                            }}
                            onMouseOver={e => { if (!loading) { (e.currentTarget as HTMLElement).style.background = "rgba(212,175,55,0.13)"; (e.currentTarget as HTMLElement).style.color = "#D4AF37"; } }}
                            onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = "rgba(212,175,55,0.06)"; (e.currentTarget as HTMLElement).style.color = "#B89A3A"; }}
                          >
                            ↩ {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: "8px 10px 10px",
            borderTop: "1px solid rgba(212,175,55,0.12)",
            background: "rgba(0,0,0,0.2)",
            flexShrink: 0,
          }}>
            {/* Listening banner */}
            {isListening && (
              <div style={{
                display: "flex", alignItems: "center", gap: 6,
                background: "rgba(220,60,60,0.08)",
                border: "1px solid rgba(220,60,60,0.25)",
                borderRadius: 8, padding: "5px 10px",
                marginBottom: 6,
              }}>
                <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#E05555", flexShrink: 0, animation: "aiVoiceDot 1s ease-in-out infinite" }} />
                <span style={{ color: "#E08080", fontSize: 10, flex: 1 }}>{t.chatVoiceStop}</span>
                <button onClick={toggleVoice} style={{ background: "none", border: "none", color: "#E05555", cursor: "pointer", fontSize: 11, padding: 0 }}>✕</button>
              </div>
            )}
            {/* Voice error */}
            {voiceError && (
              <div style={{ color: "#E08080", fontSize: 10, marginBottom: 5, padding: "3px 4px" }}>{voiceError}</div>
            )}
            <div style={{
              display: "flex", gap: 6, alignItems: "flex-end",
              background: isListening ? "rgba(220,60,60,0.06)" : "rgba(255,255,255,0.05)",
              border: isListening ? "1px solid rgba(220,60,60,0.3)" : "1px solid rgba(212,175,55,0.2)",
              borderRadius: 14, padding: "8px 10px",
              transition: "border-color 0.2s, background 0.2s",
            }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
                placeholder={isListening ? t.chatVoiceStop : t.chatPlaceholder}
                rows={1}
                disabled={loading}
                style={{
                  flex: 1, background: "transparent", border: "none", outline: "none",
                  color: isListening ? "#F0C0C0" : "#F5F0E8",
                  fontSize: 13, lineHeight: 1.5,
                  resize: "none", maxHeight: 80, overflowY: "auto", fontFamily: "inherit",
                  transition: "color 0.2s",
                }}
                onInput={e => {
                  const el = e.target as HTMLTextAreaElement;
                  el.style.height = "auto";
                  el.style.height = Math.min(el.scrollHeight, 80) + "px";
                }}
              />
              {/* Mic button */}
              <button
                onClick={toggleVoice}
                title={isListening ? t.chatVoiceStop : t.chatVoiceStart}
                disabled={loading}
                style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: isListening
                    ? "rgba(220,60,60,0.25)"
                    : "rgba(255,255,255,0.06)",
                  border: isListening
                    ? "1px solid rgba(220,60,60,0.5)"
                    : "1px solid rgba(255,255,255,0.1)",
                  color: isListening ? "#E05555" : "#7A6A4A",
                  cursor: loading ? "default" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 15, flexShrink: 0,
                  animation: isListening ? "aiVoicePulse 1.2s ease-in-out infinite" : "none",
                  transition: "background 0.2s, border-color 0.2s, color 0.2s",
                }}
              >🎙</button>
              {/* Send / Stop */}
              {loading ? (
                <button onClick={handleStop} style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: "rgba(220,60,60,0.2)", border: "1px solid rgba(220,60,60,0.4)",
                  color: "#E05555", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, flexShrink: 0,
                }}>◼</button>
              ) : (
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim()}
                  style={{
                    width: 32, height: 32, borderRadius: "50%",
                    background: input.trim() ? "linear-gradient(135deg,#D4AF37,#A0821A)" : "rgba(212,175,55,0.1)",
                    border: "none",
                    color: input.trim() ? "#0F1829" : "#5A4A2A",
                    cursor: input.trim() ? "pointer" : "default",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 15, flexShrink: 0, transition: "background 0.15s",
                  }}
                >↑</button>
              )}
            </div>
            <div style={{ textAlign: "center", color: "#3A2A1A", fontSize: 9, marginTop: 6 }}>
              {t.chatDisclaimer}
            </div>
          </div>
        </div>
      )}

      {/* FAB wrapper — hover reveals minimize button */}
      <div
        style={{ position: "fixed", bottom: 24, left: 24, zIndex: 451 }}
        onMouseEnter={() => setFabHovered(true)}
        onMouseLeave={() => setFabHovered(false)}
      >
        {/* Minimize (hide) button — appears above FAB on hover */}
        <div
          onClick={minimize}
          title="Minimize AI chat"
          style={{
            position: "absolute",
            bottom: 64,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(10,8,4,0.92)",
            border: "1px solid rgba(212,175,55,0.3)",
            borderRadius: 10,
            padding: "4px 10px",
            color: "#8A7A5A",
            fontSize: 10,
            fontWeight: 600,
            whiteSpace: "nowrap",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
            opacity: fabHovered && !open ? 1 : 0,
            pointerEvents: fabHovered && !open ? "auto" : "none",
            transition: "opacity 0.18s ease",
            boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
            letterSpacing: 0.2,
          }}
          onMouseOver={e => { (e.currentTarget as HTMLElement).style.color = "#E05555"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(220,60,60,0.4)"; }}
          onMouseOut={e => { (e.currentTarget as HTMLElement).style.color = "#8A7A5A"; (e.currentTarget as HTMLElement).style.borderColor = "rgba(212,175,55,0.3)"; }}
        >
          <span style={{ fontSize: 11 }}>—</span> Hide AI Chat
        </div>

        {/* Main FAB */}
        <div
          onClick={() => setOpen(o => !o)}
          title={t.chatFabLabel}
          style={{
            width: 56,
            height: 56,
            borderRadius: "50%",
            background: open
              ? "linear-gradient(135deg,#A0821A,#D4AF37)"
              : "linear-gradient(135deg,#D4AF37,#A0821A)",
            boxShadow: open
              ? "0 4px 20px rgba(212,175,55,0.5), 0 0 0 4px rgba(212,175,55,0.15)"
              : "0 4px 18px rgba(0,0,0,0.5), 0 0 0 0px rgba(212,175,55,0)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            position: "relative",
            transition: "box-shadow 0.2s, background 0.2s, transform 0.15s",
            animation: open ? "none" : "aiChatFabPulse 3s ease-in-out infinite",
            transform: fabHovered && !open ? "scale(1.1)" : open ? "scale(1.05)" : "scale(1)",
          }}
        >
          <span style={{ fontSize: 24, lineHeight: 1, userSelect: "none", transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
            {open ? "✕" : "✡"}
          </span>
          {!open && messages.length > 0 && (
            <span style={{
              position: "absolute", top: -2, right: -2,
              background: "#6B46C1", color: "#fff",
              borderRadius: "50%", minWidth: 18, height: 18,
              fontSize: 10, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center",
              border: "2px solid #0d1117",
              padding: "0 3px",
            }}>{messages.filter(m => m.role === "assistant").length}</span>
          )}
        </div>
      </div>

      <style>{`
        @keyframes aiChatSlideIn {
          from { opacity: 0; transform: translateY(20px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
        @keyframes aiChatBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes aiChatFabPulse {
          0%,100% { box-shadow: 0 4px 18px rgba(0,0,0,0.5), 0 0 0px rgba(212,175,55,0); }
          50%     { box-shadow: 0 6px 24px rgba(0,0,0,0.55), 0 0 20px rgba(212,175,55,0.35); }
        }
        @keyframes aiVoiceDot {
          0%,100% { opacity: 1; transform: scale(1); }
          50%     { opacity: 0.4; transform: scale(0.7); }
        }
        @keyframes aiVoicePulse {
          0%,100% { box-shadow: 0 0 0 0px rgba(220,60,60,0.35); }
          50%     { box-shadow: 0 0 0 5px rgba(220,60,60,0); }
        }
      `}</style>
    </>
  );
}

function CommunityFAB({
  onShowAnnouncements, onShowEvents, onShowCommunityYahrzeit,
  onShowMussar, onShowPrayerBoard, onShowTorahTracker, onShowMap, onShowCompass, announcementCount,
}: {
  onShowAnnouncements: () => void;
  onShowEvents: () => void;
  onShowCommunityYahrzeit: () => void;
  onShowMussar: () => void;
  onShowPrayerBoard: () => void;
  onShowTorahTracker: () => void;
  onShowMap: () => void;
  onShowCompass: () => void;
  announcementCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { t } = useLanguage();

  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    try {
      const s = localStorage.getItem(FAB_POS_KEY);
      if (s) { const p = JSON.parse(s); if (typeof p.x === "number" && typeof p.y === "number") return p; }
    } catch {}
    return { x: window.innerWidth - 92, y: window.innerHeight - 188 };
  });
  const drag = useRef({ active: false, startX: 0, startY: 0, initX: 0, initY: 0, moved: false });

  const [showHint, setShowHint] = useState(() => {
    try { return !localStorage.getItem(FAB_HINT_KEY); } catch { return false; }
  });
  useEffect(() => {
    if (!showHint) return;
    const t = setTimeout(() => setShowHint(false), 3500);
    return () => clearTimeout(t);
  }, [showHint]);

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (open) return;
    drag.current = { active: true, startX: e.clientX, startY: e.clientY, initX: pos.x, initY: pos.y, moved: false };
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!drag.current.active) return;
    const dx = e.clientX - drag.current.startX;
    const dy = e.clientY - drag.current.startY;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) drag.current.moved = true;
    if (!drag.current.moved) return;
    if (showHint) { setShowHint(false); try { localStorage.setItem(FAB_HINT_KEY, "1"); } catch {} }
    setPos({
      x: Math.max(0, Math.min(window.innerWidth - 80, drag.current.initX + dx)),
      y: Math.max(0, Math.min(window.innerHeight - 110, drag.current.initY + dy)),
    });
  }
  function onPointerUp() {
    if (!drag.current.active) return;
    drag.current.active = false;
    if (drag.current.moved) {
      try { localStorage.setItem(FAB_HINT_KEY, "1"); } catch {}
      setPos(p => { try { localStorage.setItem(FAB_POS_KEY, JSON.stringify(p)); } catch {} return p; });
    }
  }
  function handleMainClick() {
    if (drag.current.moved) return;
    if (open && !isClosing) triggerClose();
    else if (!isClosing) setOpen(true);
  }

  function triggerClose() {
    setIsClosing(true);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    // 8 items × 70ms stagger + 400ms animation = 960ms; wait 990ms
    closeTimer.current = setTimeout(() => {
      setOpen(false);
      setIsClosing(false);
    }, 990);
  }

  const [upcomingEventCount, setUpcomingEventCount] = useState(0);
  const [upcomingYahrzeitCount, setUpcomingYahrzeitCount] = useState(0);

  useEffect(() => {
    fetchCommunityYahrzeit().then(entries => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const in30 = new Date(today);
      in30.setDate(in30.getDate() + 30);
      const curHYear = new HDate(today).getFullYear();

      let count = 0;
      for (const e of entries) {
        for (const yr of [curHYear, curHYear + 1]) {
          try {
            const greg = new HDate(e.hebrewDay, e.hebrewMonth, yr).greg();
            greg.setHours(0, 0, 0, 0);
            if (greg >= today && greg <= in30) { count++; break; }
            if (greg > in30) break;
          } catch { /* skip invalid hebrew dates */ }
        }
      }
      setUpcomingYahrzeitCount(count);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    function countUpcoming() {
      try {
        const raw = localStorage.getItem("menashe-community-events");
        const events: Array<{ date: string }> = raw ? JSON.parse(raw) : [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const count = events.filter(e => {
          const d = new Date(e.date + "T00:00:00");
          return d >= today;
        }).length;
        setUpcomingEventCount(count);
      } catch {
        setUpcomingEventCount(0);
      }
    }
    countUpcoming();
    window.addEventListener("storage", countUpcoming);
    return () => window.removeEventListener("storage", countUpcoming);
  }, []);

  const items = [
    { label: t.fabAnnouncements, icon: "📢", action: onShowAnnouncements, count: announcementCount },
    { label: t.fabCommunityEvents, icon: "📅", action: onShowEvents, count: upcomingEventCount },
    { label: t.fabCommunityMemorial, icon: "🕯", action: onShowCommunityYahrzeit, count: upcomingYahrzeitCount },
    { label: t.fabTorahWisdom, icon: "📖", action: onShowMussar },
    { label: t.fabPrayerBoard, icon: "🙏", action: onShowPrayerBoard },
    { label: t.fabTorahTracker, icon: "✡", action: onShowTorahTracker },
    { label: t.fabLocationMap, icon: "🗺️", action: onShowMap },
    { label: t.fabCompass, icon: "🧭", action: onShowCompass },
  ];

  function handleItem(action: () => void) {
    triggerClose();
    action();
  }

  return (
    <>
      {(open || isClosing) && (
        <div
          onClick={() => { if (!isClosing) triggerClose(); }}
          style={{ position: "fixed", inset: 0, zIndex: 998 }}
        />
      )}
      <div
        style={{ position: "fixed", left: pos.x, top: pos.y, zIndex: 999, touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {/* ── Menu items — float above the button ── */}
        {(open || isClosing) && (
          <div style={{ position: "absolute", bottom: "100%", right: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10, paddingBottom: 10 }}>
            {items.map((item, i) => (
              <button
                key={item.label}
                onClick={(e) => { e.stopPropagation(); if (!isClosing) handleItem(item.action); }}
                className="fab-item-active"
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  background: "linear-gradient(135deg, #1e2040 0%, #191d38 100%)",
                  border: "1px solid rgba(255,255,255,0.18)",
                  borderRadius: 14,
                  padding: "10px 16px",
                  color: "#f0ece0",
                  fontWeight: 600,
                  fontSize: 13.5,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  animation: isClosing
                    ? `fabItemOut 0.4s ease-in both, fabItemShimmer 2.8s ease-in-out infinite`
                    : `fabItemIn 0.5s ease-out both, fabItemShimmer 2.8s ease-in-out infinite`,
                  animationDelay: isClosing
                    ? `${(items.length - 1 - i) * 0.07}s, ${i * 0.18}s`
                    : `${i * 0.07}s, ${i * 0.18}s`,
                  minWidth: 210,
                  transform: "scale(1)",
                  transformOrigin: "right center",
                }}
              >
                <span style={{ fontSize: 18, lineHeight: 1 }}>{item.icon}</span>
                <span style={{ flex: 1 }}>{item.label}</span>
                {"count" in item && (item as { count: number }).count > 0 && (
                  <span style={{
                    background: "#e53e3e",
                    color: "#fff",
                    borderRadius: 10,
                    minWidth: 20, height: 20,
                    fontSize: 11, fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "0 5px",
                    lineHeight: 1,
                    flexShrink: 0,
                  }}>
                    {(item as { count: number }).count > 99 ? "99+" : (item as { count: number }).count}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* ── Main draggable button ── */}
        <div style={{
          position: "relative", width: 72, height: 100,
          animation: announcementCount > 0 && !open ? "fabBounce 2.8s ease-in-out infinite" : undefined,
          cursor: "grab",
        }}>
          {/* ── Drag hint tooltip ── */}
          {showHint && (
            <div className="fab-drag-hint" style={{
              position: "absolute",
              bottom: "108%",
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(20,22,42,0.94)",
              border: "1px solid rgba(212,175,55,0.45)",
              borderRadius: 10,
              padding: "6px 11px",
              whiteSpace: "nowrap",
              pointerEvents: "none",
              display: "flex",
              alignItems: "center",
              gap: 6,
              boxShadow: "0 4px 18px rgba(0,0,0,0.45)",
              animation: "fabHintIn 0.5s ease-out both",
            }}>
              {/* Grip dots */}
              <span style={{ display: "grid", gridTemplateColumns: "repeat(2,5px)", gap: 3, opacity: 0.75 }}>
                {[...Array(6)].map((_, i) => (
                  <span key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: "#d4af37", display: "block" }} />
                ))}
              </span>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#f0ece0", letterSpacing: "0.02em" }}>
                drag to move
              </span>
              {/* Downward arrow */}
              <span style={{
                position: "absolute",
                bottom: -6,
                left: "50%",
                transform: "translateX(-50%)",
                width: 0, height: 0,
                borderLeft: "6px solid transparent",
                borderRight: "6px solid transparent",
                borderTop: "6px solid rgba(20,22,42,0.94)",
              }} />
            </div>
          )}
          <button
            onClick={handleMainClick}
            title={t.fabTitle}
            className={`shawl-sway${open ? " shawl-open" : ""}`}
            style={{
              width: 72, height: 100,
              border: "none",
              padding: 0,
              background: "transparent",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transformOrigin: "top center",
              transform: open ? "scale(1.18) translateY(-4px)" : undefined,
              transition: "transform 0.4s cubic-bezier(0.34,1.56,0.64,1)",
            }}
          >
            <img
              src="/saipikhup-sticker.png"
              alt="Community Hub"
              className={open ? "shawl-active" : "shawl-weave"}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                display: "block",
                filter: open
                  ? "drop-shadow(0 0 6px rgba(212,175,55,0.9)) drop-shadow(0 0 18px rgba(212,175,55,0.55)) drop-shadow(0 0 32px rgba(212,175,55,0.25)) brightness(1.15) saturate(1.4)"
                  : "drop-shadow(0 4px 12px rgba(0,0,0,0.7))",
                transition: "filter 0.4s ease",
              }}
            />
          </button>

          {/* ── Star of David overlay ── */}
          <div
            className="star-david-wrap"
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -54%)",
              width: 28,
              height: 28,
              pointerEvents: "none",
              zIndex: 10,
            }}
          >
            {/* Outer halo ring 1 */}
            <div style={{
              position: "absolute",
              inset: -6,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(240,192,80,0.35) 0%, rgba(212,168,67,0.12) 45%, transparent 72%)",
              animation: "starHaloA 2.6s ease-in-out infinite",
            }} />
            {/* Outer halo ring 2 — offset phase */}
            <div style={{
              position: "absolute",
              inset: -11,
              borderRadius: "50%",
              background: "radial-gradient(circle, transparent 30%, rgba(212,168,67,0.10) 52%, rgba(212,168,67,0.04) 70%, transparent 86%)",
              animation: "starHaloB 2.6s ease-in-out 1.3s infinite",
            }} />

            {/* Star SVG */}
            <svg
              viewBox="0 0 40 40"
              className="star-david-svg"
              style={{ width: "100%", height: "100%", animation: "starRotateSlow 18s linear infinite" }}
            >
              <defs>
                <filter id="starGlowFilter" x="-60%" y="-60%" width="220%" height="220%">
                  <feGaussianBlur stdDeviation="1.5" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <linearGradient id="starGrad" x1="20%" y1="0%" x2="80%" y2="100%">
                  <stop offset="0%" stopColor="#fff9c4" />
                  <stop offset="40%" stopColor="#f0c050" />
                  <stop offset="100%" stopColor="#c8860a" />
                </linearGradient>
              </defs>

              {/* Sparkle rays — 6 short lines at 60° intervals */}
              <g className="star-rays" style={{ animation: "starRaysPulse 2.6s ease-in-out infinite" }}>
                {[0, 60, 120, 180, 240, 300].map(deg => {
                  const rad = (deg * Math.PI) / 180;
                  const x1 = 20 + Math.cos(rad) * 17;
                  const y1 = 20 + Math.sin(rad) * 17;
                  const x2 = 20 + Math.cos(rad) * 21;
                  const y2 = 20 + Math.sin(rad) * 21;
                  return (
                    <line
                      key={deg}
                      x1={x1} y1={y1} x2={x2} y2={y2}
                      stroke="url(#starGrad)"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                      opacity="0.75"
                    />
                  );
                })}
              </g>

              {/* Upward triangle */}
              <polygon
                points="20,3.5 33.8,27 6.2,27"
                fill="url(#starGrad)"
                filter="url(#starGlowFilter)"
                style={{ animation: "starShine 2.6s ease-in-out infinite" }}
              />
              {/* Downward triangle */}
              <polygon
                points="20,36.5 6.2,13 33.8,13"
                fill="url(#starGrad)"
                filter="url(#starGlowFilter)"
                style={{ animation: "starShine 2.6s ease-in-out infinite" }}
              />

              {/* Center hex highlight */}
              <polygon
                points="20,13.5 26.2,17.7 26.2,22.3 20,26.5 13.8,22.3 13.8,17.7"
                fill="rgba(255,249,196,0.22)"
                style={{ animation: "starCenterFlash 2.6s ease-in-out infinite" }}
              />
            </svg>
          </div>

          {announcementCount > 0 && !open && (
            <span style={{
              position: "absolute", top: -3, right: -3,
              background: "#e53e3e",
              color: "#fff",
              borderRadius: "50%",
              minWidth: 20, height: 20,
              fontSize: 11, fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center",
              padding: "0 4px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
              border: "2px solid #0d1117",
              lineHeight: 1,
              pointerEvents: "none",
            }}>
              {announcementCount > 99 ? "99+" : announcementCount}
            </span>
          )}
        </div>
      </div>
      <style>{`
        @keyframes fabItemIn {
          0%   { clip-path: inset(0 0 0 100%); opacity: 0.6; }
          55%  { clip-path: inset(0 0 0 0%);   opacity: 1;   }
          72%  { clip-path: inset(0 -3% 0 0%); }
          86%  { clip-path: inset(0 1% 0 0%);  }
          100% { clip-path: inset(0 0 0 0);    opacity: 1;   }
        }
        @keyframes fabItemOut {
          0%   { clip-path: inset(0 0 0 0);     opacity: 1;   }
          30%  { clip-path: inset(0 -2% 0 0%);  opacity: 1;   }
          100% { clip-path: inset(0 0 0 100%);  opacity: 0.4; }
        }
        @keyframes fabItemShimmer {
          0%   { box-shadow: 0 4px 18px rgba(0,0,0,0.5),  0 0 0px  rgba(255,255,255,0);    border-color: rgba(255,255,255,0.14); }
          40%  { box-shadow: 0 6px 24px rgba(0,0,0,0.55), 0 0 14px rgba(255,255,255,0.12), 0 0 32px rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.32); }
          60%  { box-shadow: 0 8px 28px rgba(0,0,0,0.6),  0 0 20px rgba(255,255,255,0.18), 0 0 44px rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.42); transform: scale(1.025); }
          80%  { box-shadow: 0 6px 24px rgba(0,0,0,0.55), 0 0 14px rgba(255,255,255,0.12), 0 0 32px rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.28); transform: scale(1.012); }
          100% { box-shadow: 0 4px 18px rgba(0,0,0,0.5),  0 0 0px  rgba(255,255,255,0);    border-color: rgba(255,255,255,0.14); transform: scale(1); }
        }
        .fab-item-active {
          transform-origin: right center;
        }
        .fab-item-active:hover {
          background: linear-gradient(135deg, #252848 0%, #1e2240 100%) !important;
          border-color: rgba(255,255,255,0.5) !important;
          transform: scale(1.03);
          transition: background 0.15s ease, transform 0.15s ease;
        }
        @keyframes fabHintIn {
          0%   { opacity: 0; transform: translateX(-50%) translateY(6px); }
          100% { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .fab-drag-hint {
          animation: fabHintIn 0.5s ease-out both;
          transition: opacity 0.4s ease;
        }
        @keyframes fabBounce {
          0%, 55%, 100% { transform: translateY(0); }
          20%           { transform: translateY(-8px); }
          38%           { transform: translateY(-3px); }
          48%           { transform: translateY(-6px); }
        }
        @keyframes starHaloA {
          0%,100% { transform: scale(1);    opacity: 1;    }
          50%     { transform: scale(1.35); opacity: 0.3;  }
        }
        @keyframes starHaloB {
          0%,100% { transform: scale(1);    opacity: 0.6;  }
          50%     { transform: scale(1.5);  opacity: 0.1;  }
        }
        @keyframes starRotateSlow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes starShine {
          0%,100% { opacity: 0.88; filter: drop-shadow(0 0 3px rgba(240,192,80,0.7))  drop-shadow(0 0 8px  rgba(212,168,67,0.5)); }
          50%     { opacity: 1;    filter: drop-shadow(0 0 7px rgba(255,240,120,1))   drop-shadow(0 0 18px rgba(240,192,80,0.85)) drop-shadow(0 0 32px rgba(212,168,67,0.55)); }
        }
        @keyframes starRaysPulse {
          0%,100% { opacity: 0.45; transform: scale(0.92); }
          50%     { opacity: 1;    transform: scale(1.12);  }
        }
        @keyframes starCenterFlash {
          0%,100% { opacity: 0.15; }
          50%     { opacity: 0.55; }
        }
        @keyframes shawlWeave {
          0%   { transform: scaleX(1)    scaleY(1);    }
          20%  { transform: scaleX(1.02) scaleY(0.99); }
          50%  { transform: scaleX(0.99) scaleY(1.01); }
          80%  { transform: scaleX(1.02) scaleY(0.99); }
          100% { transform: scaleX(1)    scaleY(1);    }
        }
        .shawl-weave {
          animation: shawlWeave 7s ease-in-out infinite;
          transform-origin: center top;
        }
        @keyframes shawlSway {
          0%   { transform: rotate(-2.2deg); }
          25%  { transform: rotate(0deg);    }
          50%  { transform: rotate(2.2deg);  }
          75%  { transform: rotate(0deg);    }
          100% { transform: rotate(-2.2deg); }
        }
        .shawl-sway {
          animation: shawlSway 5s ease-in-out infinite;
          transform-origin: top center;
        }
        .shawl-open {
          animation: none;
        }
        @keyframes shawlGoldPulse {
          0%   { filter: drop-shadow(0 0 6px rgba(212,175,55,0.9)) drop-shadow(0 0 18px rgba(212,175,55,0.55)) drop-shadow(0 0 32px rgba(212,175,55,0.25)) brightness(1.15) saturate(1.4); }
          50%  { filter: drop-shadow(0 0 10px rgba(212,175,55,1))  drop-shadow(0 0 28px rgba(212,175,55,0.75)) drop-shadow(0 0 48px rgba(212,175,55,0.4))  brightness(1.25) saturate(1.6); }
          100% { filter: drop-shadow(0 0 6px rgba(212,175,55,0.9)) drop-shadow(0 0 18px rgba(212,175,55,0.55)) drop-shadow(0 0 32px rgba(212,175,55,0.25)) brightness(1.15) saturate(1.4); }
        }
        .shawl-active {
          animation: shawlGoldPulse 2s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}
