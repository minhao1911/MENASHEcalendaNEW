import { useState, useMemo } from "react";

interface Props { onClose: () => void; }

export interface StudyEntry {
  id: string;
  date: string;       // YYYY-MM-DD
  subject: string;
  description: string;
  duration: number;   // minutes
  notes: string;
}

const STORAGE_KEY = "menashe-torah-tracker";

const SUBJECTS = ["Parasha", "Gemara", "Mishna", "Halacha", "Tanach", "Mussar", "Prayer", "Other"];

const SUBJECT_STYLE: Record<string, { bg: string; color: string; emoji: string }> = {
  "Parasha":  { bg: "rgba(212,168,67,0.15)", color: "#d4a843", emoji: "📜" },
  "Gemara":   { bg: "rgba(139,92,246,0.15)", color: "#a78bfa", emoji: "📖" },
  "Mishna":   { bg: "rgba(99,102,241,0.15)", color: "#818cf8", emoji: "📚" },
  "Halacha":  { bg: "rgba(22,163,74,0.15)",  color: "#4ade80", emoji: "⚖" },
  "Tanach":   { bg: "rgba(251,191,36,0.13)", color: "#fbbf24", emoji: "✡" },
  "Mussar":   { bg: "rgba(236,72,153,0.13)", color: "#f472b6", emoji: "🌱" },
  "Prayer":   { bg: "rgba(74,222,128,0.12)", color: "#4ade80", emoji: "🙏" },
  "Other":    { bg: "rgba(100,116,139,0.12)",color: "#94a3b8", emoji: "📝" },
};

function todayStr() { return new Date().toISOString().slice(0, 10); }

function dateRange(days: number): string[] {
  const result: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    result.push(d.toISOString().slice(0, 10));
  }
  return result;
}

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const today = todayStr();
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().slice(0, 10);
  if (dateStr === today) return "Today";
  if (dateStr === yStr) return "Yesterday";
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function fmtDuration(mins: number): string {
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60); const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function calcStreak(entries: StudyEntry[]): number {
  const days = new Set(entries.map(e => e.date));
  let streak = 0;
  const d = new Date(); d.setHours(0, 0, 0, 0);
  // If didn't study today, start checking from yesterday
  if (!days.has(d.toISOString().slice(0, 10))) d.setDate(d.getDate() - 1);
  while (days.has(d.toISOString().slice(0, 10))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

function sumMinutes(entries: StudyEntry[], days: number): number {
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days);
  return entries.filter(e => new Date(e.date + "T12:00:00") >= cutoff).reduce((s, e) => s + e.duration, 0);
}

function loadEntries(): StudyEntry[] {
  try { const r = localStorage.getItem(STORAGE_KEY); if (r) return JSON.parse(r); } catch {}
  return SAMPLE_ENTRIES;
}
function saveEntries(list: StudyEntry[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch {}
}

const SAMPLE_ENTRIES: StudyEntry[] = [
  { id: "s1", date: todayStr(), subject: "Parasha", description: "Parashat Nasso — Numbers 4–7", duration: 30, notes: "Studied the Birkat Kohanim section." },
  { id: "s2", date: (() => { const d = new Date(); d.setDate(d.getDate()-1); return d.toISOString().slice(0,10); })(), subject: "Gemara", description: "Brachot 5a–5b", duration: 45, notes: "Discussion of yissurin (suffering) and their spiritual meaning." },
  { id: "s3", date: (() => { const d = new Date(); d.setDate(d.getDate()-2); return d.toISOString().slice(0,10); })(), subject: "Mishna", description: "Pirkei Avot 2:1–5", duration: 20, notes: "" },
  { id: "s4", date: (() => { const d = new Date(); d.setDate(d.getDate()-3); return d.toISOString().slice(0,10); })(), subject: "Halacha", description: "Laws of Shabbat — Shmirat Shabbat", duration: 25, notes: "" },
  { id: "s5", date: (() => { const d = new Date(); d.setDate(d.getDate()-5); return d.toISOString().slice(0,10); })(), subject: "Tanach", description: "Tehillim 119", duration: 15, notes: "Recited with kavvanah." },
];

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px", borderRadius: 10,
  background: "var(--elevated)", border: "1px solid var(--border)",
  color: "var(--text-primary)", fontSize: 13, outline: "none", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: "var(--text-muted)",
  letterSpacing: "0.06em", marginBottom: 5, display: "block",
};

const DURATION_PRESETS = [10, 15, 20, 30, 45, 60, 90, 120];

function emptyForm() {
  return { date: todayStr(), subject: "Parasha", description: "", duration: 30, notes: "" };
}

export default function TorahTrackerModal({ onClose }: Props) {
  const [entries, setEntries] = useState<StudyEntry[]>(loadEntries);
  const [view, setView] = useState<"dashboard" | "log" | "history">("dashboard");
  const [form, setForm] = useState(emptyForm());
  const [saved, setSaved] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [customDuration, setCustomDuration] = useState(false);

  function persist(list: StudyEntry[]) { setEntries(list); saveEntries(list); }

  function submitLog() {
    if (!form.description.trim()) return;
    const entry: StudyEntry = { ...form, id: `se-${Date.now()}` };
    persist([entry, ...entries]);
    setSaved(true);
  }

  function deleteEntry(id: string) { persist(entries.filter(e => e.id !== id)); setDeleteConfirm(null); }

  const streak = useMemo(() => calcStreak(entries), [entries]);
  const weekMins = useMemo(() => sumMinutes(entries, 7), [entries]);
  const monthMins = useMemo(() => sumMinutes(entries, 30), [entries]);
  const totalSessions = entries.length;

  // Last 28 days heatmap
  const last28 = useMemo(() => dateRange(28), []);
  const dayMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of entries) {
      map[e.date] = (map[e.date] || 0) + e.duration;
    }
    return map;
  }, [entries]);

  // Subject breakdown for this month
  const subjectBreakdown = useMemo(() => {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
    const map: Record<string, number> = {};
    for (const e of entries) {
      if (new Date(e.date + "T12:00:00") >= cutoff) {
        map[e.subject] = (map[e.subject] || 0) + e.duration;
      }
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [entries]);

  const totalMonthMins = subjectBreakdown.reduce((s, [, m]) => s + m, 0);

  // Group history by date
  const grouped = useMemo(() => {
    const map: Record<string, StudyEntry[]> = {};
    for (const e of [...entries].sort((a, b) => b.date.localeCompare(a.date))) {
      if (!map[e.date]) map[e.date] = [];
      map[e.date].push(e);
    }
    return map;
  }, [entries]);

  function heatColor(mins: number): string {
    if (!mins) return "rgba(255,255,255,0.04)";
    if (mins < 20) return "rgba(212,168,67,0.2)";
    if (mins < 45) return "rgba(212,168,67,0.45)";
    if (mins < 90) return "rgba(212,168,67,0.7)";
    return "rgba(212,168,67,0.95)";
  }

  // ── Log session ───────────────────────────────────────────────────────────
  if (view === "log") return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: "92vh", overflowY: "auto" }}>
        <div className="modal-handle" />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <button onClick={() => { setView("dashboard"); setSaved(false); setForm(emptyForm()); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--text-muted)" }}>← Back</button>
          <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>📝 Log Study Session</div>
          <div />
        </div>

        {saved ? (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <div style={{ fontSize: 52, marginBottom: 14 }}>🌟</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", marginBottom: 8 }}>Session Logged!</div>
            <div style={{ fontFamily: "'Noto Serif Hebrew', serif", fontSize: 18, color: "#d4a843", margin: "16px 0 6px" }}>כָּל הַמְּלַמֵּד תּוֹרָה</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 24 }}>"All who teach Torah" — every session counts</div>
            {streak > 1 && (
              <div style={{ marginBottom: 20, padding: "10px 20px", borderRadius: 12, background: "rgba(212,168,67,0.08)", border: "1px solid rgba(212,168,67,0.2)", display: "inline-block" }}>
                <span style={{ fontSize: 18 }}>🔥</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: "#d4a843", marginLeft: 6 }}>{streak}-day streak!</span>
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button className="btn-gold" style={{ padding: "12px 32px", fontSize: 14, fontWeight: 700 }}
                onClick={() => { setView("dashboard"); setSaved(false); setForm(emptyForm()); }}>
                View Dashboard
              </button>
              <button onClick={() => { setSaved(false); setForm(emptyForm()); }}
                style={{ padding: "10px", borderRadius: 12, background: "var(--elevated)", border: "1px solid var(--border)", color: "var(--text-muted)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Log Another Session
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Subject */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>SUBJECT</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {SUBJECTS.map(s => {
                  const ss = SUBJECT_STYLE[s];
                  const active = form.subject === s;
                  return (
                    <button key={s} onClick={() => setForm(f => ({ ...f, subject: s }))}
                      style={{
                        padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: "pointer",
                        background: active ? ss.bg : "var(--elevated)",
                        border: active ? `1px solid ${ss.color}` : "1px solid var(--border)",
                        color: active ? ss.color : "var(--text-muted)", transition: "all 0.15s",
                      }}>{ss.emoji} {s}</button>
                  );
                })}
              </div>
            </div>

            {/* What did you study */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>WHAT DID YOU STUDY? <span style={{ color: "#ef4444" }}>*</span></label>
              <input style={inputStyle} value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder={`e.g. ${SUBJECT_STYLE[form.subject].emoji} ${form.subject === "Parasha" ? "Parashat Beha'alotcha" : form.subject === "Gemara" ? "Brachot 5a–6b" : form.subject === "Mishna" ? "Pirkei Avot 2:1" : "Your topic"}`} />
            </div>

            {/* Duration */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>HOW LONG? (minutes)</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                {DURATION_PRESETS.map(d => (
                  <button key={d} onClick={() => { setForm(f => ({ ...f, duration: d })); setCustomDuration(false); }}
                    style={{
                      padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: "pointer",
                      background: form.duration === d && !customDuration ? "rgba(212,168,67,0.15)" : "var(--elevated)",
                      border: form.duration === d && !customDuration ? "1px solid rgba(212,168,67,0.5)" : "1px solid var(--border)",
                      color: form.duration === d && !customDuration ? "#d4a843" : "var(--text-muted)",
                    }}>{d < 60 ? `${d}m` : `${d / 60}h`}</button>
                ))}
                <button onClick={() => setCustomDuration(true)}
                  style={{
                    padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: "pointer",
                    background: customDuration ? "rgba(212,168,67,0.15)" : "var(--elevated)",
                    border: customDuration ? "1px solid rgba(212,168,67,0.5)" : "1px solid var(--border)",
                    color: customDuration ? "#d4a843" : "var(--text-muted)",
                  }}>✏ Custom</button>
              </div>
              {customDuration && (
                <input type="number" style={inputStyle} value={form.duration} min={1} max={480}
                  onChange={e => setForm(f => ({ ...f, duration: Math.min(480, Math.max(1, parseInt(e.target.value) || 1)) }))}
                  placeholder="Enter minutes" />
              )}
            </div>

            {/* Date */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>DATE</label>
              <input type="date" style={inputStyle} value={form.date} max={todayStr()}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </div>

            {/* Notes */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}>NOTES (optional)</label>
              <textarea style={{ ...inputStyle, minHeight: 64, resize: "vertical", lineHeight: 1.5 }}
                value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Key insights, questions, or takeaways…" />
            </div>

            <button className="btn-gold" style={{ width: "100%", padding: 14, fontSize: 15, fontWeight: 800, marginBottom: 10, opacity: !form.description.trim() ? 0.6 : 1 }}
              onClick={submitLog} disabled={!form.description.trim()}>
              ✓ Log Session ({fmtDuration(form.duration)})
            </button>
            <button onClick={() => setView("dashboard")} className="btn-close-full">Cancel</button>
          </>
        )}
      </div>
    </div>
  );

  // ── History view ──────────────────────────────────────────────────────────
  if (view === "history") return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: "92vh", overflowY: "auto" }}>
        <div className="modal-handle" />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <button onClick={() => setView("dashboard")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--text-muted)" }}>← Dashboard</button>
          <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>📋 Study History</div>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{totalSessions} sessions</div>
        </div>

        {Object.keys(grouped).length === 0 ? (
          <div style={{ textAlign: "center", padding: 32, color: "var(--text-muted)", fontSize: 13 }}>No sessions logged yet.</div>
        ) : (
          Object.entries(grouped).map(([date, dayEntries]) => (
            <div key={date} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-muted)", letterSpacing: ".08em", marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>{fmtDate(date).toUpperCase()}</span>
                <span>{fmtDuration(dayEntries.reduce((s, e) => s + e.duration, 0))}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {dayEntries.map(entry => {
                  const ss = SUBJECT_STYLE[entry.subject] || SUBJECT_STYLE["Other"];
                  return (
                    <div key={entry.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "11px 13px", borderRadius: 14, background: "var(--card)", border: "1px solid var(--border)" }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: ss.bg, border: `1px solid ${ss.color}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{ss.emoji}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
                          <span style={{ fontSize: 9, fontWeight: 800, color: ss.color, background: ss.bg, borderRadius: 4, padding: "1px 5px" }}>{entry.subject}</span>
                          <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: "auto" }}>⏱ {fmtDuration(entry.duration)}</span>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{entry.description}</div>
                        {entry.notes && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3, lineHeight: 1.4 }}>{entry.notes}</div>}
                      </div>
                      {deleteConfirm === entry.id ? (
                        <button onClick={() => deleteEntry(entry.id)} style={{ padding: "4px 7px", borderRadius: 6, background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.3)", cursor: "pointer", fontSize: 10, color: "#ef4444", fontWeight: 700, flexShrink: 0 }}>DEL</button>
                      ) : (
                        <button onClick={() => setDeleteConfirm(entry.id)} style={{ padding: "4px 7px", borderRadius: 6, background: "rgba(239,68,68,0.08)", border: "none", cursor: "pointer", fontSize: 10, color: "#ef4444", fontWeight: 700, flexShrink: 0 }}>✕</button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
        <button onClick={() => setView("dashboard")} className="btn-close-full">Back to Dashboard</button>
      </div>
    </div>
  );

  // ── Dashboard ──────────────────────────────────────────────────────────────
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: "92vh", overflowY: "auto" }}>
        <div className="modal-handle" />

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)" }}>📚 Torah Tracker</div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Your daily learning journey</div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Hebrew quote */}
        <div style={{ marginBottom: 14, padding: "10px 14px", borderRadius: 14, background: "linear-gradient(135deg, #0f1e38, #1a1a2a)", border: "1px solid rgba(212,168,67,0.2)", textAlign: "center" }}>
          <div style={{ fontFamily: "'Noto Serif Hebrew', serif", fontSize: 18, color: "#d4a843", marginBottom: 3 }}>וְהָגִיתָ בּוֹ יוֹמָם וָלַיְלָה</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>"Meditate on it day and night" — Yehoshua 1:8</div>
        </div>

        {/* Stat cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
          {[
            { label: "🔥 Streak", value: streak > 0 ? `${streak}d` : "—", sub: "consecutive days", color: streak >= 7 ? "#d4a843" : streak >= 3 ? "#f97316" : "var(--text-primary)" },
            { label: "📅 This Week", value: weekMins > 0 ? fmtDuration(weekMins) : "—", sub: "studied", color: "var(--text-primary)" },
            { label: "📆 This Month", value: monthMins > 0 ? fmtDuration(monthMins) : "—", sub: "studied", color: "var(--text-primary)" },
          ].map(stat => (
            <div key={stat.label} style={{ padding: "12px 10px", borderRadius: 14, background: "var(--card)", border: "1px solid var(--border)", textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>{stat.label}</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: stat.color, lineHeight: 1 }}>{stat.value}</div>
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 3 }}>{stat.sub}</div>
            </div>
          ))}
        </div>

        {/* 28-day heatmap */}
        <div style={{ marginBottom: 14, padding: "14px", borderRadius: 16, background: "var(--card)", border: "1px solid var(--border)" }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-muted)", letterSpacing: ".08em", marginBottom: 10 }}>LAST 28 DAYS</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(14, 1fr)", gap: 4 }}>
            {last28.map(dateStr => {
              const mins = dayMap[dateStr] || 0;
              const isToday = dateStr === todayStr();
              return (
                <div key={dateStr} title={`${dateStr}: ${mins > 0 ? fmtDuration(mins) : "No study"}`}
                  style={{
                    aspectRatio: "1", borderRadius: 4,
                    background: heatColor(mins),
                    border: isToday ? "1px solid rgba(212,168,67,0.8)" : "none",
                    cursor: "default",
                  }} />
              );
            })}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 8, justifyContent: "flex-end" }}>
            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Less</span>
            {["rgba(255,255,255,0.04)", "rgba(212,168,67,0.2)", "rgba(212,168,67,0.45)", "rgba(212,168,67,0.7)", "rgba(212,168,67,0.95)"].map((c, i) => (
              <div key={i} style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
            ))}
            <span style={{ fontSize: 10, color: "var(--text-muted)" }}>More</span>
          </div>
        </div>

        {/* Subject breakdown */}
        {subjectBreakdown.length > 0 && (
          <div style={{ marginBottom: 14, padding: "14px", borderRadius: 16, background: "var(--card)", border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-muted)", letterSpacing: ".08em", marginBottom: 12 }}>THIS MONTH — BY SUBJECT</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {subjectBreakdown.map(([subject, mins]) => {
                const ss = SUBJECT_STYLE[subject] || SUBJECT_STYLE["Other"];
                const pct = totalMonthMins > 0 ? Math.round((mins / totalMonthMins) * 100) : 0;
                return (
                  <div key={subject}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 14 }}>{ss.emoji}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>{subject}</span>
                      </div>
                      <div style={{ display: "flex", align: "center", gap: 8 }}>
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{fmtDuration(mins)}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: ss.color, minWidth: 30, textAlign: "right" }}>{pct}%</span>
                      </div>
                    </div>
                    <div style={{ height: 5, borderRadius: 3, background: "var(--elevated)", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: ss.color, borderRadius: 3, transition: "width 0.4s" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent sessions preview */}
        {entries.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "var(--text-muted)", letterSpacing: ".08em" }}>RECENT SESSIONS</div>
              <button onClick={() => setView("history")} style={{ fontSize: 11, color: "#d4a843", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>View All →</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {entries.slice(0, 3).map(entry => {
                const ss = SUBJECT_STYLE[entry.subject] || SUBJECT_STYLE["Other"];
                return (
                  <div key={entry.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 13px", borderRadius: 14, background: "var(--card)", border: "1px solid var(--border)" }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: ss.bg, border: `1px solid ${ss.color}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{ss.emoji}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{entry.description}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{fmtDate(entry.date)} · ⏱ {fmtDuration(entry.duration)}</div>
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 800, color: ss.color, background: ss.bg, borderRadius: 4, padding: "2px 6px", flexShrink: 0 }}>{entry.subject}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* CTA */}
        <button className="btn-gold" style={{ width: "100%", padding: 14, fontSize: 15, fontWeight: 800, marginBottom: 10 }}
          onClick={() => { setForm(emptyForm()); setSaved(false); setView("log"); }}>
          + Log Today's Learning
        </button>
        <button onClick={onClose} className="btn-close-full">Close</button>
      </div>
    </div>
  );
}
