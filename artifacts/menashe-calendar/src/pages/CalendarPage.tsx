import { useState, useMemo } from "react";
import { HebrewCalendar, flags } from "@hebcal/core";
import { getMonthCalendar, hebrewDayNumeral, getHebrewMonthsBetween } from "../lib/hebrewCalendar";
import { Location } from "../lib/locations";
import { calculateZmanim, formatTime } from "../lib/zmanim";
import { getUpcomingParashiyot } from "../lib/parasha";
import { getOmerDay } from "../modals/OmerModal";

interface CalendarPageProps {
  location: Location;
  onNavigate: (page: string) => void;
  onDayClick: (day: number, month: number, year: number) => void;
  onLocationClick: () => void;
}

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

const DAY_HEADERS: { en: string; he: string }[] = [
  { en: "Sun", he: "ראשון" },
  { en: "Mon", he: "שני" },
  { en: "Tue", he: "שלישי" },
  { en: "Wed", he: "רביעי" },
  { en: "Thu", he: "חמישי" },
  { en: "Fri", he: "שישי" },
  { en: "Sat", he: "שבת" },
];

export default function CalendarPage({ location, onNavigate, onDayClick, onLocationClick }: CalendarPageProps) {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const days = getMonthCalendar(year, month);
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const hebrewMonths = getHebrewMonthsBetween(new Date(year, month, 1), new Date(year, month + 1, 0));

  // Month-level summary: shabbatot, holidays, parashiyot
  const monthStats = useMemo(() => {
    const shabbatot = days.filter(d => d.isShabbat).length;
    const holidays = days.filter(d =>
      d.events.some(e => !e.toLowerCase().includes("rosh chodesh") && !e.toLowerCase().includes("parashat"))
    ).length;
    // Parashiyot that fall inside this month
    const firstOfMonth = new Date(year, month, 1);
    const upcoming = getUpcomingParashiyot(firstOfMonth, 6);
    const monthParashiyot = upcoming.filter(p => {
      const shabbat = new Date(p.date);
      return shabbat.getFullYear() === year && shabbat.getMonth() === month;
    });
    return { shabbatot, holidays, parashiyot: monthParashiyot };
  }, [year, month, days]);

  // Pre-compute candle-lighting times for every Friday in the month
  const candleLightingMap = useMemo(() => {
    const map: Record<number, string> = {};
    for (const day of days) {
      if (day.date.getDay() === 5) {
        const z = calculateZmanim(day.date, location.lat, location.lng);
        if (z.candleLighting) map[day.gregorianDay] = formatTime(z.candleLighting, location.tz);
      }
    }
    return map;
  }, [year, month, location]);

  const fastMap = useMemo(() => {
    const set = new Set<number>();
    try {
      const events = HebrewCalendar.calendar({
        start: new Date(year, month, 1),
        end: new Date(year, month + 1, 0),
        il: true, isHebrewYear: false,
        mask: flags.MINOR_FAST | flags.MAJOR_FAST,
      });
      for (const ev of events) {
        const d = ev.getDate().greg();
        if (d.getMonth() === month && d.getFullYear() === year) set.add(d.getDate());
      }
    } catch {}
    return set;
  }, [year, month]);

  const omerMap = useMemo(() => {
    const map: Record<number, number> = {};
    for (const d of days) {
      const o = getOmerDay(d.date);
      if (o !== null) map[d.gregorianDay] = o;
    }
    return map;
  }, [days]);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setSelectedDay(null);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setSelectedDay(null);
  }

  function handleDayClick(gregorianDay: number) {
    if (selectedDay === gregorianDay) {
      onDayClick(gregorianDay, month, year);
    } else {
      setSelectedDay(gregorianDay);
    }
  }

  const selectedDayData = selectedDay !== null ? days.find(d => d.gregorianDay === selectedDay) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>

      {/* ── App Header ── */}
      <div className="app-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="app-icon" style={{ color: "var(--gold)", fontSize: 18 }}>✡</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>Menashe</div>
            <div style={{ fontSize: 9, color: "var(--gold)", letterSpacing: "0.15em", fontWeight: 700 }}>CALENDAR</div>
          </div>
        </div>
        <button
          onClick={onLocationClick}
          style={{
            display: "flex", alignItems: "center", gap: 5,
            background: "var(--elevated)", border: "1px solid var(--border)",
            borderRadius: 99, padding: "5px 12px", cursor: "pointer",
          }}
        >
          <span style={{ fontSize: 11 }}>📍</span>
          <span style={{ fontSize: 11, color: "var(--text-secondary)", fontWeight: 500 }}>{location.name}</span>
        </button>
      </div>

      {/* ── Calendar Card ── */}
      <div style={{ padding: "10px 10px 0", flex: 1, overflowY: "auto" }}>
        <div style={{
          background: "linear-gradient(160deg, #0e1a30 0%, #0b1525 100%)",
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.09)",
          overflow: "hidden",
          marginBottom: 10,
          boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
        }}>

          {/* ── Month Header + Navigation ── */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 14px 12px",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
          }}>
            <button
              onClick={prevMonth}
              style={{
                width: 36, height: 36, borderRadius: 10,
                background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
                cursor: "pointer", color: "#94a3b8",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, lineHeight: 1,
              }}
            >‹</button>

            <div style={{ textAlign: "center", flex: 1 }}>
              <div style={{ fontSize: 18, fontWeight: 900, color: "#f1f5f9", letterSpacing: "0.04em", lineHeight: 1.1 }}>
                {MONTHS[month].toUpperCase()} {year}
              </div>
              <div style={{
                fontSize: 12, color: "#d4a843", marginTop: 3,
                letterSpacing: "0.03em", fontWeight: 600,
                fontFamily: "'Noto Serif Hebrew', serif",
              }}>
                {hebrewMonths}
              </div>
            </div>

            <button
              onClick={nextMonth}
              style={{
                width: 36, height: 36, borderRadius: 10,
                background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
                cursor: "pointer", color: "#94a3b8",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, lineHeight: 1,
              }}
            >›</button>
          </div>

          {/* ── Month Summary Strip ── */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1px 1fr 1px 1fr",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            background: "rgba(0,0,0,0.18)",
          }}>
            <div style={{ padding: "10px 0", textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#fca5a5", lineHeight: 1 }}>
                {monthStats.shabbatot}
              </div>
              <div style={{ fontSize: 9, color: "#64748b", fontWeight: 700, letterSpacing: "0.07em", marginTop: 4, textTransform: "uppercase" }}>
                Shabbatot
              </div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.07)", margin: "8px 0" }} />
            <div style={{ padding: "10px 6px", textAlign: "center" }}>
              {monthStats.parashiyot.length > 0 ? (
                <>
                  <div style={{
                    fontSize: 10, fontWeight: 800, color: "#d4a843", lineHeight: 1.2,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {monthStats.parashiyot[0].name}
                  </div>
                  {monthStats.parashiyot.length > 1 && (
                    <div style={{
                      fontSize: 9, color: "#b8860b", opacity: 0.8, marginTop: 2,
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>
                      +{monthStats.parashiyot.length - 1} more
                    </div>
                  )}
                </>
              ) : (
                <div style={{ fontSize: 10, color: "#475569" }}>—</div>
              )}
              <div style={{ fontSize: 9, color: "#64748b", fontWeight: 700, letterSpacing: "0.07em", marginTop: 4, textTransform: "uppercase" }}>
                📖 Parasha
              </div>
            </div>
            <div style={{ background: "rgba(255,255,255,0.07)", margin: "8px 0" }} />
            <div style={{ padding: "10px 0", textAlign: "center" }}>
              <div style={{
                fontSize: 22, fontWeight: 900, lineHeight: 1,
                color: monthStats.holidays > 0 ? "#f87171" : "#334155",
              }}>
                {monthStats.holidays}
              </div>
              <div style={{ fontSize: 9, color: "#64748b", fontWeight: 700, letterSpacing: "0.07em", marginTop: 4, textTransform: "uppercase" }}>
                Holidays
              </div>
            </div>
          </div>

          {/* ── Day Headers ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
            {DAY_HEADERS.map((h, idx) => {
              const isSat = idx === 6;
              const isFri = idx === 5;
              return (
                <div
                  key={h.en}
                  style={{
                    textAlign: "center",
                    padding: "9px 2px 7px",
                    background: isSat
                      ? "rgba(127,29,29,0.3)"
                      : isFri ? "rgba(212,168,67,0.05)" : "transparent",
                    borderBottom: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <div style={{
                    fontSize: 12, fontWeight: 800,
                    color: isSat ? "#fca5a5" : isFri ? "#d4a843" : "#cbd5e1",
                    letterSpacing: "0.04em",
                  }}>
                    {h.en}
                  </div>
                  <div style={{
                    fontSize: 9,
                    color: isSat ? "#f87171" : "#475569",
                    fontFamily: "'Noto Serif Hebrew', serif",
                    marginTop: 2, lineHeight: 1,
                  }}>
                    {h.he}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Calendar Grid ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)" }}>
            {/* Empty leading cells */}
            {Array.from({ length: firstDayOfWeek }).map((_, i) => (
              <div
                key={`empty-${i}`}
                style={{
                  minHeight: 72,
                  borderRight: i < 6 ? "1px solid rgba(255,255,255,0.06)" : "none",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                  background: i === 6 ? "rgba(127,29,29,0.07)" : "transparent",
                }}
              />
            ))}

            {/* Day cells */}
            {days.map((day, i) => {
              const colIndex = (firstDayOfWeek + i) % 7;
              const isSatCol = colIndex === 6;
              const isFriCol = colIndex === 5;
              const isLastInRow = colIndex === 6;
              const isSelected = selectedDay === day.gregorianDay;
              const isFast = fastMap.has(day.gregorianDay);

              const nonRoshEvents = day.events.filter(e => !e.toLowerCase().includes("rosh chodesh"));
              const rawEvent = nonRoshEvents[0];
              const eventLabel = rawEvent
                ? rawEvent.replace(/^Parashat\s+/, "").replace(/\s+\d+$/, "").split(" ").slice(0, 2).join(" ")
                : null;

              let cellBg = "transparent";
              if (day.isToday)       cellBg = "#c49a1a";
              else if (isSelected)   cellBg = "rgba(212,168,67,0.12)";
              else if (isFast)       cellBg = "rgba(148,163,184,0.06)";
              else if (isSatCol)     cellBg = "rgba(127,29,29,0.10)";
              else if (isFriCol)     cellBg = "rgba(212,168,67,0.04)";

              const dayNumColor = day.isToday ? "#0b1525" : day.isShabbat ? "#fca5a5" : "#f1f5f9";
              const hebrewColor  = day.isToday ? "rgba(11,21,37,0.65)" : isSatCol ? "#7f5a5a" : "#4a5568";

              return (
                <div
                  key={i}
                  onClick={() => handleDayClick(day.gregorianDay)}
                  style={{
                    minHeight: 72,
                    padding: "5px 4px 4px",
                    borderRight: !isLastInRow ? "1px solid rgba(255,255,255,0.06)" : "none",
                    borderBottom: "1px solid rgba(255,255,255,0.06)",
                    background: cellBg,
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    position: "relative",
                    outline: isSelected && !day.isToday ? "1.5px solid rgba(212,168,67,0.45)" : "none",
                    outlineOffset: "-1.5px",
                    transition: "background 0.12s",
                  }}
                >
                  {/* Candle icon + time for Fridays */}
                  {isFriCol && candleLightingMap[day.gregorianDay] && (
                    <div style={{
                      position: "absolute", top: 3, right: 3,
                      display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 0,
                    }}>
                      <span style={{ fontSize: 9, lineHeight: 1 }}>🕯️</span>
                      <span style={{
                        fontSize: 7, lineHeight: 1.3,
                        color: day.isToday ? "rgba(11,21,37,0.7)" : "#d4a843",
                        fontWeight: 700, whiteSpace: "nowrap", marginTop: 1,
                      }}>
                        {candleLightingMap[day.gregorianDay]}
                      </span>
                    </div>
                  )}

                  {/* Omer count — subtle top-left dot */}
                  {omerMap[day.gregorianDay] !== undefined && (
                    <div style={{
                      position: "absolute", top: 4, left: 4,
                      width: 14, height: 14, borderRadius: "50%",
                      background: day.isToday ? "rgba(11,21,37,0.25)" : "rgba(212,168,67,0.18)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 7, fontWeight: 900,
                      color: day.isToday ? "rgba(11,21,37,0.8)" : "#c49a1a",
                    }}>
                      {omerMap[day.gregorianDay]}
                    </div>
                  )}

                  {/* Gregorian day number */}
                  <div style={{
                    fontSize: 17, fontWeight: day.isToday ? 900 : 600,
                    color: dayNumColor,
                    lineHeight: 1,
                    marginTop: 4,
                    width: 30, height: 30,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    borderRadius: "50%",
                  }}>
                    {day.gregorianDay}
                  </div>

                  {/* Hebrew date */}
                  <div style={{
                    fontSize: 10,
                    color: hebrewColor,
                    fontFamily: "'Noto Serif Hebrew', serif",
                    lineHeight: 1,
                    marginTop: 3,
                    fontWeight: 500,
                  }}>
                    {hebrewDayNumeral(day.hebrewDay)}
                  </div>

                  {/* Rosh Chodesh */}
                  {day.roshChodesh && (
                    <div style={{
                      fontSize: 8, color: "#4ade80",
                      background: "rgba(74,222,128,0.12)",
                      border: "1px solid rgba(74,222,128,0.25)",
                      padding: "1px 4px", borderRadius: 4,
                      marginTop: "auto", fontWeight: 800,
                      letterSpacing: "0.03em", lineHeight: 1.4,
                    }}>
                      🌙 R.Ch
                    </div>
                  )}

                  {/* Holiday / Parasha label */}
                  {eventLabel && !day.roshChodesh && !isFast && (
                    <div style={{
                      fontSize: 8, color: "#fca5a5",
                      background: "rgba(239,68,68,0.12)",
                      border: "1px solid rgba(239,68,68,0.2)",
                      padding: "1px 4px", borderRadius: 4,
                      marginTop: "auto", fontWeight: 800,
                      letterSpacing: "0.02em", lineHeight: 1.4,
                      maxWidth: "calc(100% - 4px)", overflow: "hidden",
                      textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {eventLabel}
                    </div>
                  )}

                  {/* Fast label */}
                  {isFast && (
                    <div style={{
                      fontSize: 8, color: "#94a3b8",
                      background: "rgba(148,163,184,0.13)",
                      border: "1px solid rgba(148,163,184,0.2)",
                      padding: "1px 4px", borderRadius: 4,
                      marginTop: "auto", fontWeight: 800,
                      letterSpacing: "0.03em", lineHeight: 1.4,
                    }}>
                      💧 Fast
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Footer: Legend + Today button ── */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 14px",
            borderTop: "1px solid rgba(255,255,255,0.07)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {[
                { color: "#c49a1a", label: "Today" },
                { color: "rgba(127,29,29,0.45)", label: "Shabbat", border: "1px solid rgba(239,68,68,0.2)" },
                { color: "rgba(148,163,184,0.1)", label: "Fast", border: "1px solid rgba(148,163,184,0.2)" },
              ].map(({ color, label, border }) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{
                    width: 11, height: 11, borderRadius: 4,
                    background: color, border: (border as string | undefined) ?? "none", flexShrink: 0,
                  }} />
                  <span style={{ fontSize: 10, color: "#64748b", fontWeight: 600 }}>{label}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => { setMonth(today.getMonth()); setYear(today.getFullYear()); setSelectedDay(null); }}
              style={{
                padding: "5px 12px", borderRadius: 99,
                background: "rgba(212,168,67,0.12)", border: "1px solid rgba(212,168,67,0.3)",
                cursor: "pointer", color: "#d4a843",
                fontSize: 10, fontWeight: 800, letterSpacing: "0.07em",
              }}
            >TODAY</button>
          </div>
        </div>

        {/* ── Selected Day Detail Card ── */}
        {selectedDayData && (
          <div
            className="card fade-in"
            style={{ padding: "14px 16px", marginBottom: 8 }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 4 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 2 }}>
                  {selectedDayData.date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                </div>
                <div style={{
                  fontSize: 13, fontWeight: 600, color: "#d4a843",
                  fontFamily: "'Noto Serif Hebrew', serif",
                }}>
                  {hebrewDayNumeral(selectedDayData.hebrewDay)}{" "}{selectedDayData.hebrewMonth}{" "}{selectedDayData.hebrewYear}
                </div>
              </div>
              <button
                onClick={() => onDayClick(selectedDayData.gregorianDay, month, year)}
                style={{
                  padding: "7px 14px",
                  background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.28)",
                  borderRadius: 10, color: "#d4a843",
                  fontSize: 12, cursor: "pointer", fontWeight: 700,
                  whiteSpace: "nowrap",
                }}
              >
                Details →
              </button>
            </div>

            {/* Candle lighting */}
            {candleLightingMap[selectedDayData.gregorianDay] && (
              <div style={{
                display: "flex", alignItems: "center", gap: 12,
                background: "rgba(212,168,67,0.08)", border: "1px solid rgba(212,168,67,0.22)",
                borderRadius: 12, padding: "10px 14px", marginTop: 10,
              }}>
                <span style={{ fontSize: 22 }}>🕯️</span>
                <div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 800, letterSpacing: "0.09em" }}>
                    CANDLE LIGHTING
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#d4a843", lineHeight: 1.1, marginTop: 1 }}>
                    {candleLightingMap[selectedDayData.gregorianDay]}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                    {location.candleLightingMinutes} min before sunset · {location.name}
                  </div>
                </div>
              </div>
            )}

            {/* Events */}
            {selectedDayData.events.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
                {selectedDayData.events.map((ev, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 12px", borderRadius: 10,
                    background: "rgba(212,168,67,0.06)", border: "1px solid rgba(212,168,67,0.14)",
                  }}>
                    <span style={{ fontSize: 14, color: "#d4a843" }}>✦</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>{ev}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
