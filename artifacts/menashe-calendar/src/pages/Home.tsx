import { useState, useEffect, useRef } from "react";
import { HebrewCalendar, HDate, flags } from "@hebcal/core";
import { getOmerDay } from "../modals/OmerModal";
import { getHebrewDate, getDayOfWeek, getHebrewMonthName, hebrewDayNumeral } from "../lib/hebrewCalendar";
import { calculateZmanim, formatTime } from "../lib/zmanim";
import { getCurrentParasha, getUpcomingHolidays } from "../lib/parasha";
import { Location } from "../lib/locations";
import { sendNotification, isNotifSupported } from "../hooks/useNotifications";
import { useLanguage } from "../context/LanguageContext";
import { fetchCommunityYahrzeit } from "../lib/userApi";

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
              Omer {omerDay}/49
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

function CommunityCard({ onShowCommunity, onShowCensus }: { onShowCommunity: () => void; onShowCensus: () => void }) {
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
          {/* Community Button */}
          <button
            onClick={(e) => { e.stopPropagation(); onShowCommunity(); }}
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
            }}>🏛</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "white", marginBottom: 2 }}>{t.homeCommunityTitle}</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.42)", lineHeight: 1.4 }}>
                {t.homeCommunityDesc}
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
  onNotifBell: () => void;
  notifActive: boolean;
  announcementCount: number;
  onShowAnnouncements: () => void;
  onShowEvents: () => void;
  onShowCommunityYahrzeit: () => void;
  onShowMussar: () => void;
  onShowPrayerBoard: () => void;
  onShowTorahTracker: () => void;
}

export default function Home({
  location, theme, isPremium, candleEnabled,
  onNavigate, onMoreTools, onShowHolidays, onShowParashah, onShowPremium, onShowDafYomi, onShowOmer,
  onLocationClick, onToggleTheme, onOpenSiddur, onShowCommunity, onShowCensus,
  onNotifBell, notifActive, announcementCount,
  onShowAnnouncements, onShowEvents, onShowCommunityYahrzeit, onShowMussar, onShowPrayerBoard, onShowTorahTracker,
}: HomeProps) {
  const { t } = useLanguage();
  const today = new Date();
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
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/logo.jpeg" alt="Bnei Menashe" style={{ width: 38, height: 38, borderRadius: 10, objectFit: "cover", border: "1px solid rgba(212,175,55,0.35)", display: "block" }} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1 }}>Menashe</div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.1em", fontWeight: 600 }}>CALENDAR</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <button
            onClick={onLocationClick}
            style={{ display: "flex", alignItems: "center", gap: 4, background: "var(--elevated)", border: "1px solid var(--border)", borderRadius: 99, padding: "5px 12px", cursor: "pointer" }}
          >
            <span style={{ fontSize: 12 }}>📍</span>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{location.name}</span>
          </button>

          {/* Premium Crown Button */}
          <button
            onClick={onShowPremium}
            style={{
              display: "flex", alignItems: "center", gap: 5,
              background: "linear-gradient(90deg, #6b4800 0%, #b8860b 20%, #f0c050 50%, #b8860b 80%, #6b4800 100%)",
              backgroundSize: "300% auto",
              animation: "goldShimmer 4s linear infinite, goldGlow 2.5s ease-in-out infinite",
              border: "none",
              borderRadius: 99, padding: "6px 12px 6px 8px",
              cursor: "pointer", flexShrink: 0,
            }}
          >
            <span style={{
              fontSize: 14, lineHeight: 1, display: "inline-block",
              animation: "crownFloat 3s ease-in-out infinite",
            }}>👑</span>
            {isPremium && candleEnabled && candleCountdown ? (
              <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 0 }}>
                <span style={{ fontSize: 8, fontWeight: 900, color: "#1a0900", letterSpacing: "0.07em", lineHeight: 1 }}>PREMIUM</span>
                <span style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 1 }}>
                  <span style={{ fontSize: 9 }}>🕯</span>
                  <span style={{ fontSize: 10, fontWeight: 900, color: "#1a0900", letterSpacing: "0.04em", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>{candleCountdown}</span>
                </span>
              </span>
            ) : (
              <span style={{ fontSize: 10, fontWeight: 900, color: "#1a0900", letterSpacing: "0.07em" }}>PREMIUM</span>
            )}
          </button>

          {/* Notification Bell */}
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
                background: "#ef4444",
                border: "1.5px solid var(--surface)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 9, fontWeight: 800, color: "white",
                padding: "0 3px", lineHeight: 1,
              }}>
                {announcementCount > 9 ? "9+" : announcementCount}
              </div>
            ) : notifActive ? (
              <div style={{
                position: "absolute", top: 5, right: 5,
                width: 7, height: 7, borderRadius: "50%",
                background: "#d4a843",
                border: "1.5px solid var(--surface)",
              }} />
            ) : null}
          </button>

          <button
            onClick={onToggleTheme}
            style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--elevated)", border: "1px solid var(--border)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}
          >
            {isLight ? "🌙" : "☀️"}
          </button>
        </div>
      </div>

      <div style={{ padding: "14px 16px 0" }}>

        {/* ── Date + Zmanim Card (collapsible) ── */}
        <DateZmanimCard
          today={today} hdate={hdate} zmanim={zmanim}
          location={location} showCandleLighting={showCandleLighting}
          onNavigate={onNavigate}
        />

        {/* ── Daily Spiritual Briefing ── */}
        <DailyBriefingCard today={today} hdate={hdate} omerDay={omerDay} onShowOmer={onShowOmer} />

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
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                <span className="tag tag-gold" style={{ fontSize: 10 }}>{t.homeOmer}</span>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Day {omerDay} of 49</span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 1 }}>Sefirat HaOmer</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{49 - omerDay} day{49 - omerDay !== 1 ? "s" : ""} until Shavuot</div>
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

        {/* ── Community Card (collapsible) ── */}
        <CommunityCard onShowCommunity={onShowCommunity} onShowCensus={onShowCensus} />

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
  const { t } = useLanguage();

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
    setOpen(false);
    action();
  }

  return (
    <>
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 998,
          }}
        />
      )}
      <div style={{ position: "fixed", bottom: 88, right: 20, zIndex: 999, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
        {open && items.map((item, i) => (
          <button
            key={item.label}
            onClick={() => handleItem(item.action)}
            style={{
              display: "flex", alignItems: "center", gap: 10,
              background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
              border: "1px solid rgba(212,175,55,0.35)",
              borderRadius: 14,
              padding: "10px 16px",
              color: "#e8d5a3",
              fontWeight: 600,
              fontSize: 13.5,
              cursor: "pointer",
              boxShadow: "0 4px 18px rgba(0,0,0,0.55)",
              whiteSpace: "nowrap",
              animation: `fabItemIn 0.18s ease both`,
              animationDelay: `${i * 0.04}s`,
              minWidth: 210,
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
        <div style={{ position: "relative", width: 58, height: 58 }}>
          <button
            onClick={() => setOpen(v => !v)}
            title={t.fabTitle}
            style={{
              width: 58, height: 58,
              borderRadius: "50%",
              border: "none",
              padding: 0,
              overflow: "hidden",
              boxShadow: open
                ? "0 2px 12px rgba(212,175,55,0.5), 0 0 0 3px #d4af37"
                : "0 4px 20px rgba(0,0,0,0.55), 0 0 0 2.5px rgba(212,175,55,0.7)",
              cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "box-shadow 0.2s ease, transform 0.2s ease",
              transform: open ? "scale(0.92)" : "scale(1)",
              background: "#0a0a0a",
            }}
          >
            <img
              src="/saipikhup.jpg"
              alt="Community Hub"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "center 78%",
                borderRadius: "50%",
                display: "block",
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
          from { opacity: 0; transform: translateY(8px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
      `}</style>
    </>
  );
}
