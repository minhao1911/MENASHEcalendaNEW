import { useState, useEffect, useCallback } from "react";
import { HDate } from "@hebcal/core";
import BurningCandle from "../components/BurningCandle";
import yishaiMemorialBg from "@assets/YISHAI_1782279066718.png";
import {
  fetchCommunityYahrzeit,
  createCommunityYahrzeit,
  deleteCommunityYahrzeit,
  dedicateLearning,
  fetchYahrzeitEntries,
  type CommunityYahrzeitEntry,
  type YartzeitEntryApi,
} from "../lib/userApi";

const DONATION_TIERS = [
  { label: "Free / Donate later", amount: 0, tag: "" },
  { label: "₹108 — Tikkun Olam", amount: 108, tag: "💛" },
  { label: "₹360 — Zecher L'vracha", amount: 360, tag: "✡" },
  { label: "₹1080 — Eternal Light", amount: 1080, tag: "🕯" },
];

const CURRENT_YEAR = new Date().getFullYear();

function yahrzeitNumber(passingYear: number | null): number | undefined {
  if (!passingYear || passingYear >= CURRENT_YEAR) return undefined;
  return CURRENT_YEAR - passingYear;
}

function hebrewMonthName(month: number, year: number): string {
  try { return HDate.getMonthName(month, year); } catch { return `Month ${month}`; }
}

function hebrewDateStr(day: number, month: number): string {
  try {
    const curHYear = new HDate(new Date()).getFullYear();
    return `${day} ${hebrewMonthName(month, curHYear)}`;
  } catch { return `${day}/${month}`; }
}

interface Props {
  onClose: () => void;
  userName?: string | null;
}

type View = "board" | "form" | "dedicate";

export default function CommunityYahrzeitModal({ onClose, userName }: Props) {
  const [entries, setEntries] = useState<CommunityYahrzeitEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("board");
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [myEntries, setMyEntries] = useState<YartzeitEntryApi[]>([]);
  const [loadingMy, setLoadingMy] = useState(false);

  const [deceasedName, setDeceasedName] = useState("");
  const [passDateStr, setPassDateStr] = useState("");
  const [donorName, setDonorName] = useState(userName ?? "");
  const [message, setMessage] = useState("");
  const [donationIdx, setDonationIdx] = useState(0);

  const [dedicateEntryId, setDedicateEntryId] = useState<string | null>(null);
  const [dedicateName, setDedicateName] = useState(userName ?? "");
  const [dedicateSubject, setDedicateSubject] = useState("Torah");
  const [dedicateSaving, setDedicateSaving] = useState(false);
  const [dedicateDone, setDedicateDone] = useState(false);

  const load = useCallback(async () => {
    const data = await fetchCommunityYahrzeit();
    setEntries(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const iv = setInterval(load, 20000);
    return () => clearInterval(iv);
  }, [load]);

  async function loadMyEntries() {
    setLoadingMy(true);
    const data = await fetchYahrzeitEntries();
    setMyEntries(data);
    setLoadingMy(false);
  }

  function pickMyEntry(e: YartzeitEntryApi) {
    setDeceasedName(e.name);
    const yearMatch = e.displayDate.match(/\d{4}/);
    if (yearMatch) setPassDateStr(`${yearMatch[0]}-01-01`);
    setMyEntries([]);
  }

  async function handleSubmit() {
    if (!deceasedName.trim() || !passDateStr) return;
    setSaving(true);
    try {
      const passDate = new Date(passDateStr + "T12:00:00");
      const hd = new HDate(passDate);
      const id = `cy-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      await createCommunityYahrzeit({
        id,
        deceasedName: deceasedName.trim(),
        hebrewDay: hd.getDate(),
        hebrewMonth: hd.getMonth(),
        displayDate: passDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
        passingYear: passDate.getFullYear(),
        message: message.trim(),
        donorDisplayName: donorName.trim(),
      });
      setSavedSuccess(true);
      await load();
      setTimeout(() => {
        setSavedSuccess(false);
        setView("board");
        setDeceasedName(""); setPassDateStr(""); setMessage(""); setDonationIdx(0);
      }, 2000);
    } finally {
      setSaving(false);
    }
  }

  async function handleDedicate() {
    if (!dedicateEntryId || !dedicateName.trim()) return;
    setDedicateSaving(true);
    try {
      await dedicateLearning(dedicateEntryId, dedicateName.trim(), dedicateSubject.trim() || "Torah");
      setDedicateDone(true);
      await load();
      setTimeout(() => {
        setDedicateEntryId(null);
        setDedicateDone(false);
      }, 2000);
    } finally {
      setDedicateSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await deleteCommunityYahrzeit(id);
    setDeleteId(null);
    await load();
  }

  const candleCount = entries.length;
  const learnerCount = entries.reduce((s, e) => s + e.learners.length, 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-sheet"
        onClick={e => e.stopPropagation()}
        style={{ maxHeight: "95dvh", overflowY: "auto", background: "var(--card)", position: "relative" }}
      >
        {/* Yishai Memorial watermark */}
        <div
          aria-hidden="true"
          style={{
            position: "sticky",
            top: 0,
            left: 0,
            right: 0,
            height: 0,
            overflow: "visible",
            pointerEvents: "none",
            zIndex: 0,
          }}
        >
          <img
            src={yishaiMemorialBg}
            alt=""
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "auto",
              minHeight: "100%",
              objectFit: "cover",
              objectPosition: "center top",
              opacity: 0.09,
              mixBlendMode: "luminosity",
              borderRadius: "inherit",
              pointerEvents: "none",
              userSelect: "none",
            }}
          />
          {/* Subtle vignette so content stays readable */}
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(180deg, rgba(0,0,0,0.18) 0%, transparent 40%, transparent 60%, rgba(0,0,0,0.12) 100%)",
            borderRadius: "inherit",
            pointerEvents: "none",
          }} />
        </div>

        <style>{`
          .cy-board-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
            gap: 8px;
            justify-items: center;
          }
          .cy-candle-card {
            border-radius: 16px;
            padding: 12px 8px 8px;
            border: 1px solid rgba(212,175,55,0.15);
            background: rgba(212,175,55,0.04);
            display: flex;
            flex-direction: column;
            align-items: center;
            transition: border-color 0.2s;
            cursor: default;
            position: relative;
          }
          .cy-candle-card:hover { border-color: rgba(212,175,55,0.3); }
          .cy-input {
            width: 100%; padding: 10px 12px; border-radius: 9px;
            background: var(--card); border: 1px solid var(--border);
            color: var(--text-primary); font-size: 14px; outline: none;
            box-sizing: border-box; font-family: inherit;
          }
          .cy-input:focus { border-color: rgba(212,175,55,0.5); }
          .cy-textarea {
            width: 100%; padding: 10px 12px; border-radius: 9px;
            background: var(--card); border: 1px solid var(--border);
            color: var(--text-primary); font-size: 13px; outline: none;
            box-sizing: border-box; font-family: inherit;
            resize: none; min-height: 64px;
          }
          .cy-textarea:focus { border-color: rgba(212,175,55,0.5); }
          .cy-tier {
            display: flex; align-items: center; gap: 10px;
            padding: 10px 12px; border-radius: 10px;
            border: 1.5px solid var(--border); cursor: pointer;
            margin-bottom: 8px; background: var(--elevated);
            transition: border-color 0.15s, background 0.15s;
          }
          .cy-tier.selected {
            border-color: rgba(212,175,55,0.6);
            background: rgba(212,175,55,0.06);
          }
          .cy-tier:hover { border-color: rgba(212,175,55,0.35); }
        `}</style>

        <div className="modal-handle" />

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 21, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1.1, display: "flex", alignItems: "center", gap: 8 }}>
              🕯 Community Memorial
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>
              Light a candle in memory — the community prays together
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* ── Stats banner ── */}
        <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1, padding: "9px 12px", borderRadius: 10, background: "rgba(212,175,55,0.07)", border: "1px solid rgba(212,175,55,0.15)", textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#D4AF37" }}>{candleCount}</div>
            <div style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.07em" }}>CANDLES LIT</div>
          </div>
          <div style={{ flex: 1, padding: "9px 12px", borderRadius: 10, background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.15)", textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: "#22c55e" }}>{learnerCount}</div>
            <div style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.07em" }}>LEARNING NOW</div>
          </div>
        </div>

        {/* ── Board view ── */}
        {view === "board" && (
          <>
            <button
              onClick={() => setView("form")}
              style={{
                width: "100%", padding: "13px 16px", marginBottom: 18,
                background: "linear-gradient(135deg, rgba(212,175,55,0.12), rgba(212,175,55,0.06))",
                border: "1.5px dashed rgba(212,175,55,0.4)", borderRadius: 13,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              }}
            >
              <span style={{ fontSize: 20 }}>🕯</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: "#D4AF37" }}>Light a Memorial Candle</span>
            </button>

            {loading && (
              <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-muted)", fontSize: 13 }}>
                Loading memorial candles…
              </div>
            )}

            {!loading && entries.length === 0 && (
              <div style={{ textAlign: "center", padding: "32px 16px" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🕯</div>
                <div style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6 }}>
                  No memorial candles yet.<br />Be the first to light one.
                </div>
              </div>
            )}

            {!loading && entries.length > 0 && (
              <div className="cy-board-grid">
                {entries.map(entry => {
                  const yNum = yahrzeitNumber(entry.passingYear);
                  const isOwn = false;
                  const isDedicating = dedicateEntryId === entry.id;

                  return (
                    <div key={entry.id} className="cy-candle-card">
                      <BurningCandle
                        deceasedName={entry.deceasedName}
                        yahrzeitNumber={yNum}
                        donorName={entry.donorDisplayName || undefined}
                        learners={entry.learners}
                        isLit={entry.candleLit}
                        compact
                      />

                      {entry.message && (
                        <div style={{ fontSize: 9, color: "var(--text-muted)", fontStyle: "italic", textAlign: "center", marginTop: 4, lineHeight: 1.4, maxWidth: 120, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                          "{entry.message}"
                        </div>
                      )}

                      <div style={{ fontSize: 8, color: "rgba(212,175,55,0.55)", marginTop: 4 }}>
                        {hebrewDateStr(entry.hebrewDay, entry.hebrewMonth)}
                      </div>

                      {!isDedicating && (
                        <button
                          onClick={() => { setDedicateEntryId(entry.id); setDedicateDone(false); }}
                          style={{
                            marginTop: 8, padding: "4px 10px", borderRadius: 8, cursor: "pointer",
                            background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.2)",
                            fontSize: 9, fontWeight: 700, color: "#D4AF37",
                          }}
                        >
                          📖 Dedicate Learning
                        </button>
                      )}

                      {isDedicating && !dedicateDone && (
                        <div style={{ marginTop: 8, width: "100%", display: "flex", flexDirection: "column", gap: 5 }}>
                          <input
                            className="cy-input"
                            placeholder="Your name"
                            value={dedicateName}
                            onChange={e => setDedicateName(e.target.value)}
                            style={{ fontSize: 10, padding: "6px 8px" }}
                          />
                          <input
                            className="cy-input"
                            placeholder="What are you studying?"
                            value={dedicateSubject}
                            onChange={e => setDedicateSubject(e.target.value)}
                            style={{ fontSize: 10, padding: "6px 8px" }}
                          />
                          <div style={{ display: "flex", gap: 4 }}>
                            <button
                              onClick={() => setDedicateEntryId(null)}
                              style={{ flex: 1, padding: "5px", borderRadius: 7, background: "var(--elevated)", border: "1px solid var(--border)", fontSize: 9, color: "var(--text-muted)", cursor: "pointer" }}
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleDedicate}
                              disabled={dedicateSaving || !dedicateName.trim()}
                              style={{ flex: 2, padding: "5px", borderRadius: 7, background: "rgba(212,175,55,0.15)", border: "1px solid rgba(212,175,55,0.3)", fontSize: 9, fontWeight: 700, color: "#D4AF37", cursor: "pointer", opacity: (!dedicateName.trim() || dedicateSaving) ? 0.5 : 1 }}
                            >
                              {dedicateSaving ? "…" : "🕯 Dedicate"}
                            </button>
                          </div>
                        </div>
                      )}

                      {isDedicating && dedicateDone && (
                        <div style={{ marginTop: 8, fontSize: 10, color: "#22c55e", fontWeight: 700, textAlign: "center" }}>
                          ✓ Your learning glows in the flame
                        </div>
                      )}

                      {deleteId === entry.id ? (
                        <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                          <button onClick={() => setDeleteId(null)} style={{ flex: 1, padding: "3px 6px", borderRadius: 6, background: "var(--elevated)", border: "1px solid var(--border)", fontSize: 8, cursor: "pointer", color: "var(--text-muted)" }}>Cancel</button>
                          <button onClick={() => handleDelete(entry.id)} style={{ flex: 1, padding: "3px 6px", borderRadius: 6, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", fontSize: 8, fontWeight: 700, color: "#ef4444", cursor: "pointer" }}>Remove</button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── Add memorial form ── */}
        {view === "form" && (
          <div>
            <button
              onClick={() => setView("board")}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "var(--text-muted)", fontSize: 12, cursor: "pointer", padding: "0 0 14px" }}
            >
              ← Back to Board
            </button>

            <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-primary)", marginBottom: 16 }}>
              Light a Memorial Candle
            </div>

            {/* Pick from saved Yahrzeits */}
            <button
              onClick={() => { if (myEntries.length === 0) loadMyEntries(); else setMyEntries([]); }}
              style={{
                width: "100%", marginBottom: 14, padding: "10px 14px",
                background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)",
                borderRadius: 10, cursor: "pointer",
                display: "flex", alignItems: "center", gap: 8,
              }}
            >
              <span style={{ fontSize: 14 }}>📂</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#22c55e" }}>
                {loadingMy ? "Loading…" : "Use from My Saved Yahrzeits"}
              </span>
            </button>

            {myEntries.length > 0 && (
              <div style={{ marginBottom: 14, borderRadius: 10, overflow: "hidden", border: "1px solid var(--border)" }}>
                {myEntries.map(e => (
                  <button
                    key={e.id}
                    onClick={() => pickMyEntry(e)}
                    style={{
                      width: "100%", padding: "10px 14px", textAlign: "left",
                      background: "var(--elevated)", border: "none",
                      borderBottom: "1px solid var(--border)", cursor: "pointer",
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{e.name}</span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{e.displayDate}</span>
                  </button>
                ))}
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.07em", marginBottom: 5 }}>NAME OF THE DEPARTED *</div>
                <input className="cy-input" placeholder="e.g. Miriam bat Avraham" value={deceasedName} onChange={e => setDeceasedName(e.target.value)} />
              </div>

              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.07em", marginBottom: 5 }}>DATE OF PASSING *</div>
                <input className="cy-input" type="date" value={passDateStr} onChange={e => setPassDateStr(e.target.value)} />
                {passDateStr && (() => {
                  try {
                    const hd = new HDate(new Date(passDateStr + "T12:00:00"));
                    const curHYear = new HDate(new Date()).getFullYear();
                    const yNum = new Date(passDateStr).getFullYear();
                    return (
                      <div style={{ fontSize: 10, color: "#D4AF37", marginTop: 5, display: "flex", alignItems: "center", gap: 6 }}>
                        <span>✡</span>
                        <span>{hd.getDate()} {HDate.getMonthName(hd.getMonth(), curHYear)}</span>
                        {CURRENT_YEAR > yNum && <span>· {ordinalStr(CURRENT_YEAR - yNum)} Yahrzeit this year</span>}
                      </div>
                    );
                  } catch { return null; }
                })()}
              </div>

              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.07em", marginBottom: 5 }}>YOUR NAME (as donor) *</div>
                <input className="cy-input" placeholder="Your name" value={donorName} onChange={e => setDonorName(e.target.value)} />
              </div>

              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.07em", marginBottom: 5 }}>MESSAGE (optional)</div>
                <textarea className="cy-textarea" placeholder="A few words in their memory…" value={message} onChange={e => setMessage(e.target.value)} />
              </div>

              {/* Donation tiers */}
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.07em", marginBottom: 10 }}>DONATION</div>
                {DONATION_TIERS.map((tier, i) => (
                  <div
                    key={i}
                    className={`cy-tier${donationIdx === i ? " selected" : ""}`}
                    onClick={() => setDonationIdx(i)}
                  >
                    <div style={{ width: 18, height: 18, borderRadius: "50%", border: `2px solid ${donationIdx === i ? "#D4AF37" : "var(--border)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {donationIdx === i && <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#D4AF37" }} />}
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                        {tier.tag && <span style={{ marginRight: 6 }}>{tier.tag}</span>}
                        {tier.label}
                      </span>
                    </div>
                  </div>
                ))}
                {DONATION_TIERS[donationIdx].amount > 0 && (
                  <div style={{ fontSize: 10, color: "var(--text-muted)", padding: "6px 10px", background: "rgba(212,175,55,0.04)", border: "1px solid rgba(212,175,55,0.12)", borderRadius: 8, lineHeight: 1.5 }}>
                    💳 Donation of ₹{DONATION_TIERS[donationIdx].amount} will be processed by community admin. Please note your name for records.
                  </div>
                )}
              </div>
            </div>

            {savedSuccess ? (
              <div style={{ marginTop: 20, padding: "16px", borderRadius: 12, textAlign: "center", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)" }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>🕯</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#22c55e" }}>Candle lit! May their memory be a blessing.</div>
              </div>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={saving || !deceasedName.trim() || !passDateStr || !donorName.trim()}
                className="btn-gold"
                style={{
                  width: "100%", marginTop: 20, padding: "14px",
                  borderRadius: 12, fontSize: 15, fontWeight: 800,
                  opacity: (!deceasedName.trim() || !passDateStr || !donorName.trim() || saving) ? 0.45 : 1,
                }}
              >
                {saving ? "Lighting candle…" : "🕯 Light Memorial Candle"}
              </button>
            )}
          </div>
        )}

        <button onClick={onClose} className="btn-close-full" style={{ marginTop: 20 }}>Close</button>
      </div>
    </div>
  );
}

function ordinalStr(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
