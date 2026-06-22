import { useState, useEffect, useRef } from "react";
import { useUser } from "@clerk/react";
import { HebrewCalendar, HDate, flags } from "@hebcal/core";
import { getOmerDay, buildHebrewText } from "../modals/OmerModal";
import RoshChodeshBanner from "../components/RoshChodeshBanner";
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

const API_BASE = "/api";

const HOLIDAY_EMOJI: Record<string, string> = {
  "Rosh Hashana": "🍎", "Yom Kippur": "📖", "Sukkot": "🌿",
  "Shemini Atzeret": "✡", "Simchat Torah": "📜", "Chanukah": "🕎",
  "Tu BiShvat": "🌳", "Purim": "🎭", "Pesach": "🍷",
  "Yom HaShoah": "🕯", "Yom HaZikaron": "🪖", "Yom HaAtzmaut": "🇮🇱",
  "Lag BaOmer": "🔥", "Shavuot": "📜", "Tisha B'Av": "😢",
};

function getHolidayEmoji(name: string): string {
  for (const [key, emoji] of Object.entries(HOLIDAY_EMOJI)) {
    if (name.includes(key)) return emoji;
  }
  return "✡";
}

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

const TORAH_THOUGHTS: Array<{ quote: string; source: string }> = [
  { quote: "Who is wise? One who learns from every person.", source: "Pirkei Avot 4:1" },
  { quote: "In a place where there are no men, strive to be a man.", source: "Pirkei Avot 2:5" },
  { quote: "Make for yourself a teacher, acquire for yourself a friend.", source: "Pirkei Avot 1:6" },
  { quote: "The world stands on three things: Torah, service, and acts of loving kindness.", source: "Pirkei Avot 1:2" },
  { quote: "Do not judge your fellow until you have reached his place.", source: "Pirkei Avot 2:4" },
  { quote: "A good name is better than precious oil.", source: "Kohelet 7:1" },
  { quote: "Wherever you go, go with all your heart.", source: "Talmud, Bavli" },
  { quote: "A person does not see his own faults, as it is written.", source: "Talmud, Shabbat 119a" },
  { quote: "The seal of the Holy One, Blessed be He, is truth.", source: "Talmud, Shabbat 55a" },
  { quote: "Repentance, prayer and charity avert the evil decree.", source: "Unetanneh Tokef" },
  { quote: "Guard your tongue from evil and your lips from speaking deceit.", source: "Psalms 34:14" },
  { quote: "The beginning of wisdom is the fear of God.", source: "Psalms 111:10" },
  { quote: "Beloved is man, for he was created in the image of God.", source: "Pirkei Avot 3:14" },
  { quote: "Receive every person with a pleasant countenance.", source: "Pirkei Avot 1:15" },
  { quote: "If I am not for myself, who will be for me? And if not now, when?", source: "Pirkei Avot 1:14" },
  { quote: "Do not trust in yourself until the day of your death.", source: "Pirkei Avot 2:4" },
  { quote: "Love peace and pursue peace.", source: "Pirkei Avot 1:12" },
  { quote: "Better one hour of repentance in this world than all of the World to Come.", source: "Pirkei Avot 4:17" },
  { quote: "Envy, lust, and honor remove a person from the world.", source: "Pirkei Avot 4:21" },
  { quote: "Know from where you came, and to where you are going.", source: "Pirkei Avot 3:1" },
  { quote: "Everything is foreseen, yet free will is given.", source: "Pirkei Avot 3:15" },
  { quote: "The reward for a mitzvah is a mitzvah.", source: "Pirkei Avot 4:2" },
  { quote: "Be bold as a leopard, light as an eagle, swift as a deer, and mighty as a lion.", source: "Pirkei Avot 5:20" },
  { quote: "Do not say 'I will study when I have time' — lest you never have time.", source: "Pirkei Avot 2:4" },
  { quote: "A good heart encompasses all good things.", source: "Pirkei Avot 2:9" },
  { quote: "Say little and do much.", source: "Pirkei Avot 1:15" },
  { quote: "Whoever saves a single soul, Scripture accounts it as if he saved an entire world.", source: "Talmud, Sanhedrin 37a" },
  { quote: "God is close to all who call upon Him, to all who call upon Him sincerely.", source: "Psalms 145:18" },
  { quote: "Cast your burden upon God and He will sustain you.", source: "Psalms 55:23" },
  { quote: "This is the day God has made; let us rejoice and be glad in it.", source: "Psalms 118:24" },
  { quote: "A wise man hears one word and understands two.", source: "Yiddish Proverb" },
  { quote: "The candle of God is the soul of man.", source: "Proverbs 20:27" },
  { quote: "Teach a child in the way he should go, and when he is old he will not depart from it.", source: "Proverbs 22:6" },
  { quote: "Three things sustain the world: truth, justice, and peace.", source: "Pirkei Avot 1:18" },
  { quote: "Who is rich? One who is satisfied with his portion.", source: "Pirkei Avot 4:1" },
  { quote: "Love your neighbor as yourself — this is the great principle of the Torah.", source: "Vayikra 19:18" },
  { quote: "Shema Yisrael — Hear O Israel, the Lord our God, the Lord is One.", source: "Devarim 6:4" },
  { quote: "Be very careful with the truth, for truth leads to trust.", source: "Talmud, Makkot 24a" },
  { quote: "Honor your father and your mother.", source: "Shemot 20:12" },
  { quote: "You shall love the Lord your God with all your heart.", source: "Devarim 6:5" },
  { quote: "One who speaks falsehood shall not stand before My eyes.", source: "Psalms 101:7" },
  { quote: "The path of the righteous is like a shining light.", source: "Proverbs 4:18" },
  { quote: "Choose life, so that you and your descendants may live.", source: "Devarim 30:19" },
  { quote: "Be holy, for I the Lord your God am holy.", source: "Vayikra 19:2" },
  { quote: "A good deed done in secret is better than charity done openly.", source: "Talmud, Sukkah 49b" },
  { quote: "Turn it and turn it, for everything is in it.", source: "Pirkei Avot 5:22" },
  { quote: "The Torah is a tree of life to those who grasp it.", source: "Proverbs 3:18" },
  { quote: "One who is brazen-faced is destined for Gehinnom; one who is shamefaced, for Gan Eden.", source: "Pirkei Avot 5:20" },
  { quote: "Despise no person and consider nothing impossible.", source: "Pirkei Avot 4:3" },
];

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
    try { return localStorage.getItem("menashe-candle-collapsed") === "true"; } catch { return false; }
  });

  function toggleCollapse(e: React.MouseEvent) {
    e.stopPropagation();
    const next = !collapsed;
    setCollapsed(next);
    try { localStorage.setItem("menashe-candle-collapsed", String(next)); } catch {}
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
const MEMBER_DIR_KEY = "menashe-member-directory";

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
  today, hdate, zmanim, location, showCandleLighting, onNavigate,
}: {
  today: Date;
  hdate: import("@hebcal/core").HDate;
  zmanim: ReturnType<typeof calculateZmanim>;
  location: Location;
  showCandleLighting: boolean;
  onNavigate: (page: string) => void;
}) {
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);

  const hebrewDay   = hebrewDayNumeral(hdate.getDate());
  const hebrewMonth = getHebrewMonthName(hdate);
  const hebrewYear  = hdate.getFullYear();
  const dayName     = getDayOfWeek(today);
  const monthStr    = today.toLocaleDateString("en-US", { month: "long" });
  const yearStr     = today.getFullYear();

  return (
    <div style={{
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
  onShowMussar: () => void;
  onShowPrayerBoard: () => void;
  onShowTorahTracker: () => void;
  unreadAnnouncements?: ServerAnnouncement[];
  profileName?: string | null;
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

          {/* Right side: upgrade button OR candle time */}
          {canAccess ? (
            <div style={{ flexShrink: 0, textAlign: "right" }}>
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
          ) : (
            <button
              onClick={onShowPremium}
              style={{
                flexShrink: 0, padding: "6px 10px", borderRadius: 10, border: "none",
                background: "linear-gradient(90deg, #6b4800, #d4a843)",
                color: "#1a0900", fontSize: 10, fontWeight: 900, cursor: "pointer",
                letterSpacing: ".04em",
              }}
            >
              {t.shabbatBarUpgradeBtn}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Announcement Strip ───────────────────────────────────────────────────────
const ANN_STRIP_DISMISSED_KEY = "menashe-ann-strip-dismissed";

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
  onShowAnnouncements, onShowEvents, onShowCommunityYahrzeit, onShowMussar, onShowPrayerBoard, onShowTorahTracker,
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

        {/* ── Shabbat Countdown Bar ── */}
        <ShabbatCountdownBar isPremium={isPremium} location={location} onShowPremium={onShowPremium} />

        {/* ── Date + Zmanim Card (collapsible) ── */}
        <DateZmanimCard
          today={today} hdate={hdate} zmanim={zmanim}
          location={location} showCandleLighting={showCandleLighting}
          onNavigate={onNavigate}
        />

        {/* ── Today at a Glance — Zmanim Timeline ── */}
        <ZmanimTimeline zmanim={zmanim} location={location} onNavigate={onNavigate} />

        {/* ── Daily Spiritual Briefing ── */}
        <DailyBriefingCard today={today} hdate={hdate} omerDay={omerDay} onShowOmer={onShowOmer} />

        {/* ── Rosh Chodesh banner ── */}
        <RoshChodeshBanner hdate={hdate} />

        {/* ── Today's Holiday ── */}
        {todayHolidays.map(name => (
          <TodayHolidayCard key={name} name={name} />
        ))}

        {/* ── Omer Counter (during the 49 days) ── */}
        {omerDay !== null && (
          <div
            className="card card-interactive"
            onClick={onShowOmer}
            style={{ padding: 14, marginBottom: 12, display: "flex", alignItems: "center", gap: 14 }}
          >
            {/* Mini progress ring */}
            <div style={{ position: "relative", flexShrink: 0 }}>
              <svg width="52" height="52" viewBox="0 0 52 52">
                <circle cx="26" cy="26" r="21" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
                <circle cx="26" cy="26" r="21" fill="none" stroke="#d4a843" strokeWidth="5"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 21}
                  strokeDashoffset={2 * Math.PI * 21 - (omerDay / 49) * 2 * Math.PI * 21}
                  transform="rotate(-90 26 26)"
                />
              </svg>
              <div style={{
                position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ fontSize: 13, fontWeight: 900, color: "var(--text-primary)", lineHeight: 1 }}>{omerDay}</span>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <span className="tag tag-gold" style={{ fontSize: 10 }}>{t.homeOmer}</span>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {t.omerDayCount.replace("{day}", String(omerDay))}
                </span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 3 }}>
                {t.omerSefiratTitle}
              </div>
              <div style={{
                fontFamily: "'Noto Serif Hebrew', serif",
                fontSize: 13, color: "var(--gold)", marginBottom: 4,
                lineHeight: 1.4, direction: "rtl",
              }}>
                {buildHebrewText(omerDay!)}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {(49 - omerDay! === 1 ? t.omerDayLeft : t.omerDaysLeft).replace("{days}", String(49 - omerDay!))}
              </div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
          </div>
        )}


        {/* ── Parasha Card ── */}
        {parasha && (
          <div className="card card-interactive" style={{ padding: 16, marginBottom: 12 }} onClick={onShowParashah}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 800, letterSpacing: "0.1em" }}>THIS WEEK'S PARASHA</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              {/* Icon */}
              <div style={{
                width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                background: "linear-gradient(135deg, rgba(212,168,67,0.2), rgba(212,168,67,0.08))",
                border: "1px solid rgba(212,168,67,0.25)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{ fontFamily: "'Noto Serif Hebrew', serif", fontSize: 26, color: "var(--gold)", lineHeight: 1 }}>פ</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  Parashat {parasha.name}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>{parasha.book} · {parasha.verses}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span className="tag tag-blue" style={{ fontSize: 10 }}>SHABBAT</span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {nextShabbat.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </div>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" style={{ flexShrink: 0 }}><polyline points="9 18 15 12 9 6" /></svg>
            </div>
          </div>
        )}

        {/* ── Upcoming Holiday ── */}
        {holidays.length > 0 && (
          <div className="card card-interactive" style={{ padding: 14, marginBottom: 12, display: "flex", alignItems: "center", gap: 14 }} onClick={onShowHolidays}>
            <div className="icon-circle" style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.2)", fontSize: 22 }}>
              🌙
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                <span className="tag tag-green" style={{ fontSize: 10 }}>UPCOMING</span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 1 }}>{holidays[0].name}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {holidays[0].date.toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric" })}
              </div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" style={{ flexShrink: 0 }}><polyline points="9 18 15 12 9 6" /></svg>
          </div>
        )}

        {/* ── Siddur Library ── */}
        <div
          onClick={onOpenSiddur}
          className="card-interactive"
          style={{
            marginBottom: 12, borderRadius: 14, overflow: "hidden", cursor: "pointer",
            background: "linear-gradient(140deg, #1a2a4a 0%, #0f1e38 55%, #1a1a30 100%)",
            border: "1px solid rgba(212,168,67,0.28)",
            boxShadow: "0 4px 20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          <div style={{ padding: "16px 16px 12px", display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 50, height: 66, borderRadius: 8, flexShrink: 0,
              background: "linear-gradient(160deg, #203560, #0f1e38)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26,
              border: "1px solid rgba(212,168,67,0.22)",
              boxShadow: "3px 4px 12px rgba(0,0,0,0.5)",
            }}>📚</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 800, color: "#d4a843", letterSpacing: "0.12em", marginBottom: 4 }}>SIDDUR LIBRARY</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "white", marginBottom: 3 }}>Sacred Texts & Prayers</div>
              <div style={{ fontSize: 12, color: "#7a90b0" }}>Siddurim, Tehillim, Torah & more</div>
            </div>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(212,168,67,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d4a843" strokeWidth="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            </div>
          </div>
          <div style={{ display: "flex", borderTop: "1px solid rgba(212,168,67,0.1)", padding: "8px 16px", gap: 0 }}>
            {["Siddur", "Tehillim", "Torah", "Kuki Books"].map((cat, i, arr) => (
              <div key={cat} style={{ flex: 1, fontSize: 10, color: "#64748b", fontWeight: 700, letterSpacing: "0.06em", textAlign: "center", borderRight: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>{cat}</div>
            ))}
          </div>
        </div>

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
        announcementCount={announcementCount}
      />

    </div>
  );
}

function CommunityFAB({
  onShowAnnouncements, onShowEvents, onShowCommunityYahrzeit,
  onShowMussar, onShowPrayerBoard, onShowTorahTracker, announcementCount,
}: {
  onShowAnnouncements: () => void;
  onShowEvents: () => void;
  onShowCommunityYahrzeit: () => void;
  onShowMussar: () => void;
  onShowPrayerBoard: () => void;
  onShowTorahTracker: () => void;
  announcementCount: number;
}) {
  const [open, setOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { t } = useLanguage();

  function triggerClose() {
    setIsClosing(true);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    // 6 items × 70ms stagger + 400ms animation = 820ms; wait 850ms
    closeTimer.current = setTimeout(() => {
      setOpen(false);
      setIsClosing(false);
    }, 850);
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
          style={{
            position: "fixed", inset: 0, zIndex: 998,
          }}
        />
      )}
      <div style={{ position: "fixed", bottom: 88, right: 20, zIndex: 999, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
        {(open || isClosing) && items.map((item, i) => (
          <button
            key={item.label}
            onClick={() => { if (!isClosing) handleItem(item.action); }}
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
        <div style={{ position: "relative", width: 72, height: 100 }}>
          <button
            onClick={() => { if (open && !isClosing) triggerClose(); else if (!isClosing) setOpen(true); }}
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
