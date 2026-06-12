import { useState, useEffect } from "react";
import { HebrewCalendar, HDate, flags } from "@hebcal/core";
import { getOmerDay } from "../modals/OmerModal";
import { getHebrewDate, getDayOfWeek, getHebrewMonthName, hebrewDayNumeral } from "../lib/hebrewCalendar";
import { calculateZmanim, formatTime } from "../lib/zmanim";
import { getCurrentParasha, getUpcomingHolidays } from "../lib/parasha";
import { Location } from "../lib/locations";

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
            }}>TODAY'S HOLIDAY</span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "white", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {name}
          </div>
          <div style={{ fontSize: 11, color: "#86efac", marginTop: 1 }}>Chag Sameach! 🎉</div>
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
                Read more ↓
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
                  Show less ↑
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
                ↑ Share
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
          📖 DAILY TORAH THOUGHT
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
}

export default function Home({
  location, theme,
  onNavigate, onMoreTools, onShowHolidays, onShowParashah, onShowPremium, onShowDafYomi, onShowOmer,
  onLocationClick, onToggleTheme, onOpenSiddur,
}: HomeProps) {
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

  const nextShabbat = new Date(today.getFullYear(), today.getMonth(), today.getDate() + (6 - today.getDay()));
  const dayName = getDayOfWeek(today);
  const monthStr = today.toLocaleDateString("en-US", { month: "long" });
  const yearStr = today.getFullYear();

  return (
    <div style={{ padding: "0 0 4px" }}>
      {/* App Header */}
      <div className="app-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="app-icon">✡</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1 }}>Menashe</div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.1em", fontWeight: 600 }}>CALENDAR</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            onClick={onLocationClick}
            style={{ display: "flex", alignItems: "center", gap: 4, background: "var(--elevated)", border: "1px solid var(--border)", borderRadius: 99, padding: "5px 12px", cursor: "pointer" }}
          >
            <span style={{ fontSize: 12 }}>📍</span>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{location.name}</span>
          </button>
          <button
            onClick={onToggleTheme}
            style={{ width: 34, height: 34, borderRadius: "50%", background: "var(--elevated)", border: "1px solid var(--border)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}
          >
            {isLight ? "🌙" : "☀️"}
          </button>
        </div>
      </div>

      <div style={{ padding: "14px 16px 0" }}>

        {/* ── Date Card ── */}
        <div className="card" style={{
          marginBottom: 12, overflow: "hidden",
          borderTop: "2.5px solid var(--gold)",
        }}>
          <div style={{ padding: "14px 16px 16px" }}>
            {/* Eyebrow row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", color: "var(--text-muted)", textTransform: "uppercase" }}>{dayName}</span>
                <span style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--text-muted)", display: "inline-block" }} />
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "var(--gold)" }}>TODAY</span>
              </div>
              <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>{yearStr}</span>
            </div>

            {/* Main date row */}
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 64, fontWeight: 900, color: "var(--text-primary)", lineHeight: 0.9, letterSpacing: "-2px" }}>
                  {today.getDate()}
                </div>
                <div style={{ fontSize: 18, fontWeight: 600, color: "var(--text-secondary)", marginTop: 6 }}>{monthStr}</div>
              </div>

              {/* Hebrew date block */}
              <div style={{
                textAlign: "right", padding: "10px 14px", borderRadius: 12,
                background: "rgba(212,168,67,0.08)", border: "1px solid rgba(212,168,67,0.18)",
              }}>
                <div style={{ fontFamily: "'Noto Serif Hebrew', serif", fontSize: 22, color: "var(--gold)", lineHeight: 1, direction: "rtl", marginBottom: 4 }}>
                  {hebrewDay} {hebrewMonth}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.04em" }}>
                  {hebrewYear}
                </div>
              </div>
            </div>
          </div>
        </div>

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
                <span className="tag tag-gold" style={{ fontSize: 10 }}>OMER</span>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Day {omerDay} of 49</span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 1 }}>Sefirat HaOmer</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{49 - omerDay} day{49 - omerDay !== 1 ? "s" : ""} until Shavuot</div>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
          </div>
        )}

        {/* ── Zmanim + Premium row ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, marginBottom: 12 }}>
          {/* Zmanim card */}
          <div className="card card-interactive" style={{ padding: 14 }} onClick={() => onNavigate("zmanim")}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 800, letterSpacing: "0.1em" }}>ZMANIM</span>
              <span style={{ fontSize: 10, color: "var(--gold)", fontWeight: 700, letterSpacing: "0.06em" }}>VIEW ALL »</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {/* Sunrise */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 7, background: "rgba(251,191,36,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>🌅</div>
                  <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700 }}>SUNRISE</span>
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.5px" }}>{formatTime(zmanim.sunrise, location.tz)}</div>
              </div>
              {/* Sunset */}
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 7, background: "rgba(249,115,22,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>🌇</div>
                  <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700 }}>SUNSET</span>
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.5px" }}>{formatTime(zmanim.sunset, location.tz)}</div>
              </div>
            </div>
            {showCandleLighting && (
              <div style={{ marginTop: 10, padding: "7px 10px", background: "rgba(212,168,67,0.1)", borderRadius: 8, border: "1px solid rgba(212,168,67,0.22)", display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 14 }}>🕯</span>
                <div>
                  <div style={{ fontSize: 9, color: "var(--gold)", fontWeight: 700, letterSpacing: "0.08em" }}>CANDLE LIGHTING</div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: "var(--gold)", letterSpacing: "-0.5px" }}>{formatTime(zmanim.candleLighting, location.tz)}</div>
                </div>
              </div>
            )}
          </div>

          {/* Premium card */}
          <div
            onClick={onShowPremium}
            style={{
              background: "linear-gradient(160deg, #1c2d50 0%, #0f1e38 60%, #161228 100%)",
              border: "1px solid rgba(212,168,67,0.3)",
              borderRadius: 12,
              padding: 12,
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between",
              minWidth: 108, cursor: "pointer",
              boxShadow: "0 2px 12px rgba(0,0,0,0.4)",
              transition: "transform 0.1s, box-shadow 0.15s",
            }}
          >
            <div className="premium-badge">⭐ Premium</div>
            <div style={{ textAlign: "center", margin: "10px 0" }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>👑</div>
              <div style={{ fontSize: 10, color: "#94a3b8", lineHeight: 1.5 }}>Full Zmanim</div>
              <div style={{ fontSize: 10, color: "#94a3b8", lineHeight: 1.5 }}>Torah Library</div>
            </div>
            <button className="btn-gold" style={{ fontSize: 11, padding: "7px 10px", width: "100%", borderRadius: 8, textAlign: "center" }}>UPGRADE ↑</button>
          </div>
        </div>

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

        {/* ── Daf Yomi ── */}
        <div className="card card-interactive" style={{ padding: 14, marginBottom: 12, display: "flex", alignItems: "center", gap: 14 }} onClick={onShowDafYomi}>
          <div className="icon-circle" style={{ background: "rgba(20,184,166,0.15)", border: "1px solid rgba(20,184,166,0.2)", fontSize: 22 }}>
            📖
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 2 }}>Daf Yomi</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Today's daily Talmud page</div>
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2"><polyline points="9 18 15 12 9 6" /></svg>
        </div>

        {/* ── Quick Actions ── */}
        <div className="quick-action-grid" style={{ marginBottom: 4 }}>
          <div className="quick-action" onClick={onShowHolidays}>
            <div className="quick-action-icon" style={{ background: "rgba(59,130,246,0.13)", border: "1px solid rgba(59,130,246,0.18)", borderRadius: 12 }}>📅</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", lineHeight: 1.3 }}>Holidays {hebrewYear}</div>
          </div>
          <div className="quick-action" onClick={onShowParashah}>
            <div className="quick-action-icon" style={{ background: "rgba(212,168,67,0.13)", border: "1px solid rgba(212,168,67,0.18)", borderRadius: 12 }}>📜</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", lineHeight: 1.3 }}>Parashah Schedule</div>
          </div>
          <div className="quick-action" onClick={onMoreTools}>
            <div className="quick-action-icon" style={{ background: "rgba(168,85,247,0.13)", border: "1px solid rgba(168,85,247,0.18)", borderRadius: 12 }}>🔧</div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", lineHeight: 1.3 }}>More Tools</div>
          </div>
        </div>

      </div>
    </div>
  );
}
