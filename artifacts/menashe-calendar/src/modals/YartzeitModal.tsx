import { useState } from "react";
import { HDate } from "@hebcal/core";
import { hebrewDayNumeral } from "../lib/hebrewCalendar";

export const YAHRZEIT_STORAGE_KEY = "menashe-yahrzeit-entries";

export interface YartzeitEntry {
  id: string;
  name: string;
  passDateStr: string;
}

export function getYahrzeitEntries(): YartzeitEntry[] {
  try {
    const raw = localStorage.getItem(YAHRZEIT_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as YartzeitEntry[];
  } catch {}
  return [];
}

function saveEntries(entries: YartzeitEntry[]) {
  try {
    localStorage.setItem(YAHRZEIT_STORAGE_KEY, JSON.stringify(entries));
  } catch {}
}

export function getNextYahrzeit(passDateStr: string): {
  date: Date;
  daysAway: number;
  hebrewDay: number;
  hebrewMonth: string;
  isToday: boolean;
} | null {
  try {
    const passDate = new Date(passDateStr + "T12:00:00");
    const hd = new HDate(passDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const currentHYear = new HDate(today).getFullYear();

    for (let offset = 0; offset <= 2; offset++) {
      const yhDate = new HDate(hd.getDate(), hd.getMonth(), currentHYear + offset);
      const greg = yhDate.greg();
      greg.setHours(0, 0, 0, 0);
      if (greg >= today) {
        const daysAway = Math.round((greg.getTime() - today.getTime()) / 86400000);
        return {
          date: greg,
          daysAway,
          hebrewDay: hd.getDate(),
          hebrewMonth: HDate.getMonthName(hd.getMonth(), hd.getFullYear()),
          isToday: daysAway === 0,
        };
      }
    }
  } catch {}
  return null;
}

interface Props { onClose: () => void }

export default function YartzeitModal({ onClose }: Props) {
  const [entries, setEntries] = useState<YartzeitEntry[]>(() => getYahrzeitEntries());
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [passDate, setPassDate] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  function addEntry() {
    if (!name.trim() || !passDate) return;
    const entry: YartzeitEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: name.trim(),
      passDateStr: passDate,
    };
    const next = [...entries, entry];
    setEntries(next);
    saveEntries(next);
    setName("");
    setPassDate("");
    setShowForm(false);
  }

  function deleteEntry(id: string) {
    const next = entries.filter(e => e.id !== id);
    setEntries(next);
    saveEntries(next);
    setDeleteConfirm(null);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: "90vh", overflowY: "auto" }}>
        <div className="modal-handle" />

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.1 }}>
              🕯 Yahrtzeit Reminders
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
              Annual memorial notifications for loved ones
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Empty state */}
        {entries.length === 0 && !showForm && (
          <div style={{
            textAlign: "center", padding: "28px 16px",
            background: "var(--elevated)", borderRadius: 14,
            border: "1px solid var(--border)", marginBottom: 14,
          }}>
            <div style={{ fontSize: 44, marginBottom: 12, opacity: 0.6 }}>🕯</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
              No Yahrtzeit Entries Yet
            </div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 0 }}>
              Add a loved one's date of passing and receive<br />a reminder on their Yahrtzeit each year.
            </div>
          </div>
        )}

        {/* Entry cards */}
        {entries.map(entry => {
          const next = getNextYahrzeit(entry.passDateStr);
          const isDeleting = deleteConfirm === entry.id;
          return (
            <div
              key={entry.id}
              style={{
                marginBottom: 10, borderRadius: 14, overflow: "hidden",
                background: next?.isToday
                  ? "linear-gradient(135deg, #2a1500 0%, #1a0f00 100%)"
                  : "var(--card)",
                border: next?.isToday
                  ? "1.5px solid rgba(212,168,67,0.6)"
                  : "1px solid var(--border)",
                boxShadow: next?.isToday ? "0 0 20px rgba(212,168,67,0.15)" : "none",
              }}
            >
              <div style={{ padding: "13px 14px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {next?.isToday && (
                      <div style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        background: "rgba(212,168,67,0.18)", border: "1px solid rgba(212,168,67,0.4)",
                        borderRadius: 99, padding: "2px 9px", marginBottom: 7,
                      }}>
                        <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: "0.1em", color: "#d4a843" }}>✦ TODAY'S YAHRTZEIT</span>
                      </div>
                    )}

                    <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)", marginBottom: 4 }}>
                      {entry.name}
                    </div>

                    {next && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span style={{
                          fontFamily: "'Noto Serif Hebrew', serif",
                          fontSize: 13, color: "#d4a843", direction: "rtl",
                        }}>
                          {hebrewDayNumeral(next.hebrewDay)} {next.hebrewMonth}
                        </span>
                        <span style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--text-muted)", display: "inline-block", flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                          {next.date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Days badge */}
                  {next && !next.isToday && (
                    <div style={{
                      flexShrink: 0, textAlign: "center",
                      background: "rgba(212,168,67,0.08)", border: "1px solid rgba(212,168,67,0.18)",
                      borderRadius: 10, padding: "6px 10px", minWidth: 50,
                    }}>
                      <div style={{ fontSize: 18, fontWeight: 900, color: "#d4a843", lineHeight: 1 }}>
                        {next.daysAway}
                      </div>
                      <div style={{ fontSize: 8, color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.06em", marginTop: 2 }}>
                        {next.daysAway === 1 ? "DAY" : "DAYS"}
                      </div>
                    </div>
                  )}

                  {next?.isToday && (
                    <div style={{ fontSize: 28, flexShrink: 0 }}>🕯</div>
                  )}
                </div>

                {next?.isToday && (
                  <div style={{
                    marginTop: 10, padding: "9px 12px", borderRadius: 10,
                    background: "rgba(212,168,67,0.08)", border: "1px solid rgba(212,168,67,0.2)",
                  }}>
                    <div style={{ fontSize: 12, color: "#d4a843", fontWeight: 700, marginBottom: 2 }}>Observances for today:</div>
                    <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.7 }}>
                      🕯 Light a memorial candle · 🙏 Recite Kaddish · 📖 Study in their memory
                    </div>
                  </div>
                )}

                {/* Actions */}
                {!isDeleting ? (
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
                    <button
                      onClick={() => setDeleteConfirm(entry.id)}
                      style={{
                        display: "flex", alignItems: "center", gap: 5,
                        background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.15)",
                        borderRadius: 8, padding: "5px 10px",
                        fontSize: 11, color: "#ef4444", fontWeight: 700, cursor: "pointer",
                      }}
                    >
                      🗑 Remove
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center" }}>
                    <span style={{ fontSize: 12, color: "var(--text-muted)", flex: 1 }}>Remove {entry.name}?</span>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      style={{ padding: "5px 12px", borderRadius: 8, background: "var(--elevated)", border: "1px solid var(--border)", fontSize: 11, color: "var(--text-secondary)", cursor: "pointer" }}
                    >Cancel</button>
                    <button
                      onClick={() => deleteEntry(entry.id)}
                      style={{ padding: "5px 12px", borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", fontSize: 11, color: "#ef4444", fontWeight: 700, cursor: "pointer" }}
                    >Remove</button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Add entry form */}
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            style={{
              width: "100%", padding: "12px 16px", marginBottom: 14,
              background: "rgba(212,168,67,0.07)", border: "1.5px dashed rgba(212,168,67,0.3)",
              borderRadius: 14, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            <span style={{ fontSize: 18 }}>+</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#d4a843" }}>Add a Yahrtzeit</span>
          </button>
        ) : (
          <div style={{
            marginBottom: 14, borderRadius: 14, overflow: "hidden",
            background: "var(--elevated)", border: "1px solid rgba(212,168,67,0.25)",
          }}>
            <div style={{ padding: "13px 14px 0", fontSize: 13, fontWeight: 800, color: "#d4a843", letterSpacing: "0.06em" }}>
              ✦ NEW YAHRTZEIT
            </div>
            <div style={{ padding: "12px 14px" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 6, letterSpacing: "0.06em" }}>NAME OF THE DEPARTED</div>
              <input
                type="text"
                placeholder="e.g. Miriam Cohen"
                value={name}
                onChange={e => setName(e.target.value)}
                style={{
                  width: "100%", padding: "11px 13px", borderRadius: 10, marginBottom: 12,
                  background: "var(--card)", border: "1px solid var(--border)",
                  color: "var(--text-primary)", fontSize: 15, outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 6, letterSpacing: "0.06em" }}>DATE OF PASSING (GREGORIAN)</div>
              <input
                type="date"
                value={passDate}
                onChange={e => setPassDate(e.target.value)}
                style={{
                  width: "100%", padding: "11px 13px", borderRadius: 10, marginBottom: 14,
                  background: "var(--card)", border: "1px solid var(--border)",
                  color: "var(--text-primary)", fontSize: 15, outline: "none",
                  boxSizing: "border-box",
                }}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => { setShowForm(false); setName(""); setPassDate(""); }}
                  style={{
                    flex: 1, padding: "11px 0", borderRadius: 10,
                    background: "var(--card)", border: "1px solid var(--border)",
                    color: "var(--text-secondary)", fontSize: 13, fontWeight: 700, cursor: "pointer",
                  }}
                >Cancel</button>
                <button
                  onClick={addEntry}
                  disabled={!name.trim() || !passDate}
                  className="btn-gold"
                  style={{ flex: 2, padding: "11px 0", borderRadius: 10, fontSize: 13, fontWeight: 800, opacity: (!name.trim() || !passDate) ? 0.4 : 1 }}
                >Save Yahrtzeit</button>
              </div>
            </div>
          </div>
        )}

        <button onClick={onClose} className="btn-close-full">Close</button>
      </div>
    </div>
  );
}
