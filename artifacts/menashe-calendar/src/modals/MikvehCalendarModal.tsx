import { useState, useEffect } from "react";
import { HDate } from "@hebcal/core";
import { useLanguage } from "../context/LanguageContext";

interface Props { onClose: () => void; }

export interface MikvehEntry {
  id: string;
  lastPeriodDate: string;
  hefsekDate: string;
  mikvehDate: string;
  hebrewMikvehDate: string;
  hebrewHefsekDate: string;
  note: string;
  completed: boolean;
  createdAt: string;
}

const STORAGE_KEY = "mikveh_calendar_entries";

export function loadMikvehEntries(): MikvehEntry[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
  } catch { return []; }
}

export function saveMikvehEntry(entry: MikvehEntry) {
  const entries = loadMikvehEntries();
  const idx = entries.findIndex(e => e.id === entry.id);
  if (idx >= 0) entries[idx] = entry; else entries.push(entry);
  entries.sort((a, b) => a.mikvehDate.localeCompare(b.mikvehDate));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function daysUntil(dateStr: string): number {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr); d.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - today.getTime()) / 86400000);
}

function formatGreg(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

/* ── Mini calendar ──────────────────────────────────────────────── */
function MiniCalendar({ entries }: { entries: MikvehEntry[] }) {
  const [viewDate, setViewDate] = useState(() => {
    const now = new Date();
    return { month: now.getMonth(), year: now.getFullYear() };
  });

  const { month, year } = viewDate;
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const mikvehDays = new Set(
    entries.map(e => {
      const d = new Date(e.mikvehDate);
      if (d.getMonth() === month && d.getFullYear() === year) return d.getDate();
      return null;
    }).filter(Boolean)
  );
  const hefsekDays = new Set(
    entries.map(e => {
      const d = new Date(e.hefsekDate);
      if (d.getMonth() === month && d.getFullYear() === year) return d.getDate();
      return null;
    }).filter(Boolean)
  );

  const monthLabel = new Date(year, month).toLocaleDateString("en-US", { month: "long", year: "numeric" });
  const dow = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  return (
    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "14px 12px", marginBottom: 16 }}>
      {/* Month nav */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <button onClick={() => setViewDate(v => {
          const d = new Date(v.year, v.month - 1); return { month: d.getMonth(), year: d.getFullYear() };
        })} style={{ background: "none", border: "none", color: "rgba(196,181,253,0.8)", fontSize: 18, cursor: "pointer", lineHeight: 1 }}>‹</button>
        <div style={{ fontSize: 13, fontWeight: 700, color: "#e2d9ff" }}>{monthLabel}</div>
        <button onClick={() => setViewDate(v => {
          const d = new Date(v.year, v.month + 1); return { month: d.getMonth(), year: d.getFullYear() };
        })} style={{ background: "none", border: "none", color: "rgba(196,181,253,0.8)", fontSize: 18, cursor: "pointer", lineHeight: 1 }}>›</button>
      </div>

      {/* Day-of-week headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
        {dow.map(d => (
          <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: "rgba(196,181,253,0.5)", padding: "2px 0" }}>{d}</div>
        ))}
      </div>

      {/* Days grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;
          const isMikveh = mikvehDays.has(day);
          const isHefsek = hefsekDays.has(day);
          return (
            <div key={day} style={{
              position: "relative", textAlign: "center", padding: "5px 2px", borderRadius: 8,
              background: isMikveh ? "rgba(212,168,67,0.2)" : isHefsek ? "rgba(96,165,250,0.15)" : isToday ? "rgba(255,255,255,0.06)" : "transparent",
              border: isToday ? "1px solid rgba(255,255,255,0.15)" : "1px solid transparent",
            }}>
              <span style={{ fontSize: 12, fontWeight: isMikveh || isHefsek ? 800 : 400, color: isMikveh ? "#d4a843" : isHefsek ? "#60a5fa" : "rgba(255,255,255,0.7)" }}>{day}</span>
              {isMikveh && <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#d4a843", margin: "1px auto 0" }} />}
              {isHefsek && !isMikveh && <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#60a5fa", margin: "1px auto 0" }} />}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 14, marginTop: 10, justifyContent: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#60a5fa" }} />
          <span style={{ fontSize: 10, color: "rgba(196,181,253,0.7)" }}>Hefsek Tahara</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#d4a843" }} />
          <span style={{ fontSize: 10, color: "rgba(196,181,253,0.7)" }}>Mikveh Night</span>
        </div>
      </div>
    </div>
  );
}

/* ── Entry card ─────────────────────────────────────────────────── */
function EntryCard({ entry, onToggle, onDelete }: {
  entry: MikvehEntry;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const { t } = useLanguage();
  const days = daysUntil(entry.mikvehDate);
  const isPast = days < 0;

  return (
    <div style={{
      borderRadius: 16,
      background: entry.completed
        ? "rgba(74,222,128,0.05)"
        : isPast ? "rgba(255,255,255,0.03)" : "rgba(212,168,67,0.06)",
      border: `1px solid ${entry.completed ? "rgba(74,222,128,0.2)" : isPast ? "rgba(255,255,255,0.06)" : "rgba(212,168,67,0.2)"}`,
      padding: "14px 16px",
      opacity: entry.completed ? 0.7 : 1,
    }}>
      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: entry.completed ? "rgba(74,222,128,0.15)" : isPast ? "rgba(255,255,255,0.06)" : "rgba(212,168,67,0.15)",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0,
          }}>
            {entry.completed ? "✅" : isPast ? "🕯️" : "🌙"}
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#e2d9ff" }}>{t.mikvehCalMikvehNight}</div>
            <div style={{ fontSize: 11, color: "rgba(196,181,253,0.6)", fontFamily: "'Noto Serif Hebrew', serif" }}>{entry.hebrewMikvehDate}</div>
          </div>
        </div>
        {/* Countdown badge */}
        <div style={{
          padding: "4px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700,
          background: entry.completed ? "rgba(74,222,128,0.15)" : isPast ? "rgba(255,255,255,0.07)" : days === 0 ? "rgba(212,168,67,0.3)" : "rgba(212,168,67,0.12)",
          color: entry.completed ? "#4ade80" : isPast ? "rgba(255,255,255,0.4)" : days === 0 ? "#d4a843" : "#d4a843",
          border: `1px solid ${entry.completed ? "rgba(74,222,128,0.3)" : "rgba(212,168,67,0.2)"}`,
        }}>
          {entry.completed ? t.mikvehCalDone : days === 0 ? t.mikvehCalTonight : isPast ? `${Math.abs(days)}d ago` : `${t.mikvehCalIn} ${days}d`}
        </div>
      </div>

      {/* Date rows */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 10px", borderRadius: 8, background: "rgba(96,165,250,0.08)", border: "1px solid rgba(96,165,250,0.12)" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#60a5fa", letterSpacing: "0.06em" }}>{t.mikvehCalHefsek}</span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.75)" }}>{formatGreg(entry.hefsekDate)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 10px", borderRadius: 8, background: "rgba(212,168,67,0.08)", border: "1px solid rgba(212,168,67,0.12)" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#d4a843", letterSpacing: "0.06em" }}>{t.mikvehCalMikveh}</span>
          <span style={{ fontSize: 11, color: "rgba(255,255,255,0.75)" }}>{formatGreg(entry.mikvehDate)}</span>
        </div>
      </div>

      {/* Note */}
      {entry.note && (
        <div style={{ fontSize: 12, color: "rgba(196,181,253,0.6)", marginBottom: 10, fontStyle: "italic" }}>"{entry.note}"</div>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => onToggle(entry.id)}
          style={{
            flex: 1, padding: "8px", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700,
            background: entry.completed ? "rgba(255,255,255,0.06)" : "rgba(74,222,128,0.12)",
            color: entry.completed ? "rgba(255,255,255,0.4)" : "#4ade80",
          }}
        >
          {entry.completed ? t.mikvehCalMarkPending : t.mikvehCalMarkDone}
        </button>
        <button
          onClick={() => onDelete(entry.id)}
          style={{
            padding: "8px 14px", borderRadius: 10, border: "1px solid rgba(239,68,68,0.2)",
            cursor: "pointer", fontSize: 12, fontWeight: 700,
            background: "rgba(239,68,68,0.07)", color: "#f87171",
          }}
        >
          {t.mikvehCalDelete}
        </button>
      </div>
    </div>
  );
}

/* ── Main modal ─────────────────────────────────────────────────── */
export default function MikvehCalendarModal({ onClose }: Props) {
  const { t } = useLanguage();
  const [entries, setEntries] = useState<MikvehEntry[]>([]);
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("upcoming");
  const [noteModal, setNoteModal] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");

  useEffect(() => { setEntries(loadMikvehEntries()); }, []);

  function toggleDone(id: string) {
    const updated = entries.map(e => e.id === id ? { ...e, completed: !e.completed } : e);
    setEntries(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  function deleteEntry(id: string) {
    const updated = entries.filter(e => e.id !== id);
    setEntries(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  function saveNote(id: string) {
    const updated = entries.map(e => e.id === id ? { ...e, note: noteText } : e);
    setEntries(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setNoteModal(null);
    setNoteText("");
  }

  const filtered = entries.filter(e => {
    const days = daysUntil(e.mikvehDate);
    if (filter === "upcoming") return days >= 0 && !e.completed;
    if (filter === "past") return days < 0 || e.completed;
    return true;
  });

  const upcomingCount = entries.filter(e => daysUntil(e.mikvehDate) >= 0 && !e.completed).length;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 300,
      background: "linear-gradient(160deg, #0d0820 0%, #12102a 50%, #0a1628 100%)",
      display: "flex", flexDirection: "column",
    }}>
      {/* Header */}
      <div style={{
        padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)",
        display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0,
        background: "rgba(255,255,255,0.02)",
      }}>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "rgba(196,181,253,0.8)", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, fontWeight: 600 }}>
          ← {t.back ?? "Back"}
        </button>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#e2d9ff" }}>{t.mikvehCalTitle}</div>
          {upcomingCount > 0 && (
            <div style={{ fontSize: 11, color: "#d4a843", fontWeight: 600 }}>
              {upcomingCount} {t.mikvehCalUpcomingLabel}
            </div>
          )}
        </div>
        <div style={{ width: 56 }} />
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>

        {/* Mini calendar */}
        {entries.length > 0 && <MiniCalendar entries={entries} />}

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
          {(["upcoming", "past", "all"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              flex: 1, padding: "8px 0", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700,
              background: filter === f ? "rgba(212,168,67,0.15)" : "rgba(255,255,255,0.04)",
              color: filter === f ? "#d4a843" : "rgba(196,181,253,0.6)",
              borderBottom: filter === f ? "2px solid #d4a843" : "2px solid transparent",
            }}>
              {f === "upcoming" ? t.mikvehCalUpcoming : f === "past" ? t.mikvehCalPast : t.mikvehCalAll}
            </button>
          ))}
        </div>

        {/* Entry list */}
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 20px" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🌙</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "#e2d9ff", marginBottom: 6 }}>{t.mikvehCalEmptyTitle}</div>
            <div style={{ fontSize: 13, color: "rgba(196,181,253,0.5)", lineHeight: 1.6 }}>
              {entries.length === 0 ? t.mikvehCalEmptySub : t.mikvehCalEmptyFilter}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filtered.map(entry => (
              <div key={entry.id}>
                <EntryCard
                  entry={entry}
                  onToggle={toggleDone}
                  onDelete={deleteEntry}
                />
                <button
                  onClick={() => { setNoteModal(entry.id); setNoteText(entry.note ?? ""); }}
                  style={{ marginTop: 6, marginLeft: 4, background: "none", border: "none", fontSize: 11, color: "rgba(196,181,253,0.45)", cursor: "pointer", padding: "0 4px" }}
                >
                  {entry.note ? "✏️ Edit note" : "＋ Add note"}
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Privacy notice */}
        <div style={{ marginTop: 24, padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: 10, alignItems: "flex-start" }}>
          <span style={{ fontSize: 16, flexShrink: 0 }}>🔒</span>
          <div style={{ fontSize: 11, color: "rgba(196,181,253,0.5)", lineHeight: 1.6 }}>
            {t.mikvehCalPrivacy}
          </div>
        </div>
      </div>

      {/* Note editor overlay */}
      {noteModal && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 10, display: "flex", alignItems: "flex-end" }}>
          <div style={{ width: "100%", background: "#1a1040", borderRadius: "20px 20px 0 0", padding: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#e2d9ff", marginBottom: 12 }}>Add Note</div>
            <textarea
              autoFocus
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="e.g. appointment at 9pm, need to book in advance…"
              rows={3}
              style={{
                width: "100%", boxSizing: "border-box", padding: "10px 12px", borderRadius: 10,
                background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
                color: "#e2d9ff", fontSize: 14, outline: "none", resize: "none", fontFamily: "inherit",
              }}
            />
            <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
              <button onClick={() => setNoteModal(null)} style={{ flex: 1, padding: "11px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)", background: "none", color: "rgba(196,181,253,0.7)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Cancel</button>
              <button onClick={() => saveNote(noteModal!)} style={{ flex: 2, padding: "11px", borderRadius: 10, border: "none", background: "rgba(212,168,67,0.2)", color: "#d4a843", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Save Note</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
