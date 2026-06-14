import { useState, useMemo } from "react";

interface Props { onClose: () => void; userName?: string; }

export interface PrayerRequest {
  id: string;
  name: string;
  isAnonymous: boolean;
  text: string;
  category: string;
  adminResponse: string;
  status: "pending" | "approved" | "removed";
  pinned: boolean;
  submittedAt: string;
  amens: number;
}

const STORAGE_KEY = "menashe-prayer-board";
const AMENS_KEY   = "menashe-prayer-amens-cast";
const ADMIN_PIN   = "1948";

const CATEGORIES = ["Healing", "Blessing", "Aliyah", "Family", "Livelihood", "Community", "Gratitude", "Protection", "Other"];

const CAT_STYLE: Record<string, { bg: string; color: string; emoji: string }> = {
  "Healing":      { bg: "rgba(74,222,128,0.12)",  color: "#4ade80",  emoji: "💚" },
  "Blessing":     { bg: "rgba(212,168,67,0.13)",   color: "#d4a843",  emoji: "✨" },
  "Aliyah":       { bg: "rgba(22,163,74,0.12)",    color: "#4ade80",  emoji: "🇮🇱" },
  "Family":       { bg: "rgba(236,72,153,0.12)",   color: "#f472b6",  emoji: "👨‍👩‍👧‍👦" },
  "Livelihood":   { bg: "rgba(99,102,241,0.13)",   color: "#818cf8",  emoji: "🌾" },
  "Community":    { bg: "rgba(255,99,31,0.13)",    color: "#ff8a5c",  emoji: "🫂" },
  "Gratitude":    { bg: "rgba(251,191,36,0.13)",   color: "#fbbf24",  emoji: "🙏" },
  "Protection":   { bg: "rgba(139,92,246,0.13)",   color: "#a78bfa",  emoji: "🛡" },
  "Other":        { bg: "rgba(100,116,139,0.12)",  color: "#94a3b8",  emoji: "✡" },
};

function fmtRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(ms / 3_600_000);
  if (hrs < 24)  return `${hrs}h ago`;
  const days = Math.floor(ms / 86_400_000);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function loadRequests(): PrayerRequest[] {
  try { const r = localStorage.getItem(STORAGE_KEY); if (r) return JSON.parse(r); } catch {}
  return DEFAULT_REQUESTS;
}
function saveRequests(list: PrayerRequest[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch {}
}
function loadCastAmens(): Set<string> {
  try { const r = localStorage.getItem(AMENS_KEY); if (r) return new Set(JSON.parse(r)); } catch {}
  return new Set();
}
function saveCastAmens(s: Set<string>) {
  try { localStorage.setItem(AMENS_KEY, JSON.stringify([...s])); } catch {}
}

const DEFAULT_REQUESTS: PrayerRequest[] = [
  { id: "p1", name: "Rivka", isAnonymous: false, text: "Please pray for my mother's complete recovery from illness. May Hashem grant her strength and healing.", category: "Healing", adminResponse: "May Hashem send a refuah shleimah — a complete healing — to your mother. 🙏", status: "approved", pinned: true, submittedAt: new Date(Date.now() - 2 * 86400000).toISOString(), amens: 14 },
  { id: "p2", name: "Anonymous", isAnonymous: true, text: "Praying that our aliyah paperwork comes through soon. We have waited three years.", category: "Aliyah", adminResponse: "", status: "approved", pinned: false, submittedAt: new Date(Date.now() - 5 * 86400000).toISOString(), amens: 22 },
  { id: "p3", name: "Shmuel", isAnonymous: false, text: "Grateful for making aliyah this month. Thank you Hashem and Shavei Israel!", category: "Gratitude", adminResponse: "Baruch Hashem! Welcome home to Eretz Yisrael! 🇮🇱", status: "approved", pinned: false, submittedAt: new Date(Date.now() - 1 * 86400000).toISOString(), amens: 31 },
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

function emptyForm() {
  return { name: "", isAnonymous: false, text: "", category: "Blessing" };
}

export default function PrayerBoardModal({ onClose, userName }: Props) {
  const [requests, setRequests] = useState<PrayerRequest[]>(loadRequests);
  const [castAmens, setCastAmens] = useState<Set<string>>(loadCastAmens);
  const [view, setView]       = useState<"board" | "submit" | "pin" | "admin">("board");
  const [pin, setPin]         = useState(""); const [pinError, setPinError] = useState("");
  const [form, setForm]       = useState(() => ({ ...emptyForm(), name: userName || "" }));
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [adminFilter, setAdminFilter] = useState<"all" | "pending" | "approved" | "removed">("all");
  const [responseId, setResponseId]   = useState<string | null>(null);
  const [responseText, setResponseText] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState("All");
  const [adminTap, setAdminTap] = useState(0);

  function persist(list: PrayerRequest[]) { setRequests(list); saveRequests(list); }

  function submitPin() {
    if (pin === ADMIN_PIN) { setView("admin"); setPin(""); setPinError(""); }
    else { setPinError("Incorrect PIN"); setPin(""); }
  }

  function submitRequest() {
    if (!form.text.trim()) { setSubmitError("Please write your prayer request."); return; }
    setSubmitError("");
    const req: PrayerRequest = {
      id: `pr-${Date.now()}`,
      name: form.isAnonymous ? "Anonymous" : (form.name.trim() || "Anonymous"),
      isAnonymous: form.isAnonymous,
      text: form.text.trim(),
      category: form.category,
      adminResponse: "",
      status: "pending",
      pinned: false,
      submittedAt: new Date().toISOString(),
      amens: 0,
    };
    persist([req, ...requests]);
    setSubmitted(true);
  }

  function castAmen(id: string) {
    if (castAmens.has(id)) return;
    const next = new Set(castAmens); next.add(id);
    setCastAmens(next); saveCastAmens(next);
    persist(requests.map(r => r.id === id ? { ...r, amens: r.amens + 1 } : r));
  }

  function approve(id: string) { persist(requests.map(r => r.id === id ? { ...r, status: "approved" } : r)); }
  function remove(id: string)  { persist(requests.map(r => r.id === id ? { ...r, status: "removed", pinned: false } : r)); setDeleteConfirm(null); }
  function togglePin(id: string) { persist(requests.map(r => r.id === id ? { ...r, pinned: !r.pinned } : r)); }

  function saveResponse(id: string) {
    persist(requests.map(r => r.id === id ? { ...r, adminResponse: responseText } : r));
    setResponseId(null); setResponseText("");
  }

  const approved = useMemo(() => {
    let list = requests.filter(r => r.status === "approved");
    if (filterCat !== "All") list = list.filter(r => r.category === filterCat);
    const pinned = list.filter(r => r.pinned);
    const rest   = list.filter(r => !r.pinned).sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
    return [...pinned, ...rest];
  }, [requests, filterCat]);

  const pending = requests.filter(r => r.status === "pending");
  const adminList = adminFilter === "all" ? requests : requests.filter(r => r.status === adminFilter);

  // ── PIN ────────────────────────────────────────────────────────────────────
  if (view === "pin") return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🔐</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)" }}>Admin Access</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>Enter your PIN to moderate the prayer board</div>
        </div>
        <input type="password" inputMode="numeric" value={pin}
          onChange={e => { setPin(e.target.value); setPinError(""); }}
          onKeyDown={e => e.key === "Enter" && submitPin()}
          placeholder="• • • •" maxLength={8} autoFocus
          style={{ ...inputStyle, fontSize: 22, textAlign: "center", letterSpacing: "0.4em", marginBottom: 10 }} />
        {pinError && <div style={{ fontSize: 12, color: "#ef4444", textAlign: "center", marginBottom: 10 }}>⚠️ {pinError}</div>}
        <button className="btn-gold" style={{ width: "100%", padding: 13, fontSize: 15, fontWeight: 700, marginBottom: 10 }} onClick={submitPin}>Enter Admin Panel</button>
        <button onClick={() => setView("board")} className="btn-close-full">Cancel</button>
      </div>
    </div>
  );

  // ── Submit form ────────────────────────────────────────────────────────────
  if (view === "submit") return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: "92vh", overflowY: "auto" }}>
        <div className="modal-handle" />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <button onClick={() => { setView("board"); setSubmitted(false); setForm(emptyForm()); setSubmitError(""); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--text-muted)" }}>← Back</button>
          <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>🙏 Submit Prayer Request</div>
          <div />
        </div>

        {submitted ? (
          <div style={{ textAlign: "center", padding: "32px 0" }}>
            <div style={{ fontSize: 52, marginBottom: 14 }}>🕍</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary)", marginBottom: 8 }}>Prayer Submitted</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 6 }}>
              Your prayer request is <strong style={{ color: "#d4a843" }}>pending review</strong>.<br />
              The admin will approve it for the community.
            </div>
            <div style={{ fontFamily: "'Noto Serif Hebrew', serif", fontSize: 18, color: "#d4a843", margin: "20px 0" }}>
              יְהִי רָצוֹן
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 24 }}>May it be G-d's will</div>
            <button className="btn-gold" style={{ padding: "12px 32px", fontSize: 14, fontWeight: 700 }}
              onClick={() => { setView("board"); setSubmitted(false); setForm(emptyForm()); }}>
              Back to Prayer Board
            </button>
          </div>
        ) : (
          <>
            {/* Category picker */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>PRAYER TYPE</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {CATEGORIES.map(cat => {
                  const cs = CAT_STYLE[cat];
                  const active = form.category === cat;
                  return (
                    <button key={cat} onClick={() => setForm(f => ({ ...f, category: cat }))}
                      style={{
                        padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: "pointer",
                        background: active ? cs.bg : "var(--elevated)",
                        border: active ? `1px solid ${cs.color}` : "1px solid var(--border)",
                        color: active ? cs.color : "var(--text-muted)", transition: "all 0.15s",
                      }}>{cs.emoji} {cat}</button>
                  );
                })}
              </div>
            </div>

            {/* Prayer text */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>YOUR PRAYER REQUEST <span style={{ color: "#ef4444" }}>*</span></label>
              <textarea style={{ ...inputStyle, minHeight: 100, resize: "vertical", lineHeight: 1.6 }}
                value={form.text} onChange={e => setForm(f => ({ ...f, text: e.target.value }))}
                placeholder="Share your prayer request with the community…" />
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, textAlign: "right" }}>{form.text.length}/500</div>
            </div>

            {/* Anonymous toggle */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "12px 14px", background: "var(--card)", borderRadius: 12, border: "1px solid var(--border)" }}>
                <input type="checkbox" checked={form.isAnonymous} onChange={e => setForm(f => ({ ...f, isAnonymous: e.target.checked }))}
                  style={{ accentColor: "#d4a843", width: 16, height: 16 }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: form.isAnonymous ? "#d4a843" : "var(--text-primary)" }}>🔒 Submit Anonymously</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>Your name will not be shown on the board</div>
                </div>
              </label>
            </div>

            {/* Name (optional unless anonymous) */}
            {!form.isAnonymous && (
              <div style={{ marginBottom: 16 }}>
                <label style={labelStyle}>YOUR NAME (optional)</label>
                <input style={inputStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Leave blank to appear as 'Anonymous'" />
              </div>
            )}

            {submitError && <div style={{ fontSize: 12, color: "#ef4444", marginBottom: 10 }}>⚠️ {submitError}</div>}

            <button className="btn-gold" style={{ width: "100%", padding: 14, fontSize: 15, fontWeight: 800, marginBottom: 10, opacity: !form.text.trim() ? 0.6 : 1 }}
              onClick={submitRequest} disabled={!form.text.trim()}>
              🙏 Submit Prayer Request
            </button>
            <button onClick={() => setView("board")} className="btn-close-full">Cancel</button>
          </>
        )}
      </div>
    </div>
  );

  // ── Admin panel ────────────────────────────────────────────────────────────
  if (view === "admin") return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: "92vh", overflowY: "auto" }}>
        <div className="modal-handle" />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <button onClick={() => setView("board")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--text-muted)" }}>← Board</button>
          <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-primary)" }}>🙏 Moderate Prayers</div>
          <div />
        </div>

        <div style={{ padding: "8px 12px", borderRadius: 10, background: "rgba(212,168,67,0.06)", border: "1px solid rgba(212,168,67,0.15)", marginBottom: 14 }}>
          <div style={{ fontSize: 12, color: "#d4a843", fontWeight: 600 }}>⚡ Admin Mode — {requests.length} total · {pending.length} pending</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Approve, respond, pin, or remove prayer requests</div>
        </div>

        {/* Filter tabs */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 4, marginBottom: 14 }}>
          {(["all", "pending", "approved", "removed"] as const).map(f => {
            const counts: Record<string, number> = { all: requests.length, pending: pending.length, approved: requests.filter(r => r.status === "approved").length, removed: requests.filter(r => r.status === "removed").length };
            return (
              <button key={f} onClick={() => setAdminFilter(f)}
                style={{
                  padding: "8px 0", borderRadius: 10, fontSize: 10, fontWeight: 800, cursor: "pointer",
                  background: adminFilter === f ? "rgba(212,168,67,0.15)" : "var(--elevated)",
                  border: adminFilter === f ? "1px solid rgba(212,168,67,0.4)" : "1px solid var(--border)",
                  color: adminFilter === f ? "#d4a843" : "var(--text-muted)",
                  textTransform: "uppercase", letterSpacing: ".04em",
                }}>
                {f === "pending" ? `⏳ ${counts[f]}` : f === "approved" ? `✅ ${counts[f]}` : f === "removed" ? `🗑 ${counts[f]}` : `All ${counts[f]}`}
              </button>
            );
          })}
        </div>

        {adminList.length === 0 ? (
          <div style={{ textAlign: "center", padding: 24, color: "var(--text-muted)", fontSize: 13 }}>No items in this filter.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
            {[...adminList].sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()).map(req => {
              const cs = CAT_STYLE[req.category] || CAT_STYLE["Other"];
              const statusColors: Record<string, string> = { pending: "#d4a843", approved: "#4ade80", removed: "#94a3b8" };
              return (
                <div key={req.id} style={{ borderRadius: 14, background: "var(--card)", border: "1px solid var(--border)", overflow: "hidden" }}>
                  <div style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, background: cs.bg, border: `1px solid ${cs.color}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>{cs.emoji}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 9, fontWeight: 900, color: statusColors[req.status] || "#94a3b8", letterSpacing: ".08em" }}>{req.status.toUpperCase()}</span>
                          <span style={{ fontSize: 9, fontWeight: 700, color: cs.color, background: cs.bg, borderRadius: 4, padding: "1px 5px" }}>{req.category}</span>
                          {req.pinned && <span style={{ fontSize: 9, color: "#d4a843" }}>📌 PINNED</span>}
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", marginBottom: 2 }}>
                          {req.isAnonymous ? "🔒 Anonymous" : req.name} · {fmtRelative(req.submittedAt)}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>{req.text}</div>
                        {req.adminResponse && (
                          <div style={{ marginTop: 8, padding: "8px 10px", borderRadius: 8, background: "rgba(212,168,67,0.08)", border: "1px solid rgba(212,168,67,0.2)", fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>
                            <span style={{ color: "#d4a843", fontWeight: 700 }}>Pastoral response: </span>{req.adminResponse}
                          </div>
                        )}
                        {responseId === req.id && (
                          <div style={{ marginTop: 8 }}>
                            <textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical", lineHeight: 1.5, fontSize: 12 }}
                              value={responseText} onChange={e => setResponseText(e.target.value)}
                              placeholder="Write a pastoral blessing or response…" autoFocus />
                            <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                              <button onClick={() => saveResponse(req.id)} style={{ flex: 1, padding: "7px", borderRadius: 8, background: "rgba(212,168,67,0.15)", border: "1px solid rgba(212,168,67,0.3)", cursor: "pointer", fontSize: 11, fontWeight: 800, color: "#d4a843" }}>Save Response</button>
                              <button onClick={() => { setResponseId(null); setResponseText(""); }} style={{ padding: "7px 10px", borderRadius: 8, background: "var(--elevated)", border: "1px solid var(--border)", cursor: "pointer", fontSize: 11, color: "var(--text-muted)", fontWeight: 700 }}>Cancel</button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 5, padding: "8px 12px", borderTop: "1px solid var(--border)", flexWrap: "wrap" }}>
                    {req.status !== "approved" && (
                      <button onClick={() => approve(req.id)} style={{ flex: 1, padding: "6px", borderRadius: 8, background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.25)", cursor: "pointer", fontSize: 10, fontWeight: 800, color: "#4ade80" }}>✓ Approve</button>
                    )}
                    <button onClick={() => togglePin(req.id)} style={{ flex: 1, padding: "6px", borderRadius: 8, background: req.pinned ? "rgba(212,168,67,0.15)" : "var(--elevated)", border: req.pinned ? "1px solid rgba(212,168,67,0.35)" : "1px solid var(--border)", cursor: "pointer", fontSize: 10, fontWeight: 800, color: req.pinned ? "#d4a843" : "var(--text-muted)" }}>
                      {req.pinned ? "📌 Unpin" : "📌 Pin"}
                    </button>
                    <button onClick={() => { setResponseId(req.id); setResponseText(req.adminResponse); }} style={{ flex: 1, padding: "6px", borderRadius: 8, background: "rgba(99,102,241,0.12)", border: "1px solid rgba(99,102,241,0.25)", cursor: "pointer", fontSize: 10, fontWeight: 800, color: "#818cf8" }}>✍ Respond</button>
                    {deleteConfirm === req.id ? (
                      <button onClick={() => remove(req.id)} style={{ flex: 1, padding: "6px", borderRadius: 8, background: "rgba(239,68,68,0.2)", border: "1px solid rgba(239,68,68,0.3)", cursor: "pointer", fontSize: 10, fontWeight: 800, color: "#ef4444" }}>CONFIRM</button>
                    ) : (
                      <button onClick={() => setDeleteConfirm(req.id)} style={{ padding: "6px 10px", borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "none", cursor: "pointer", fontSize: 10, color: "#ef4444", fontWeight: 700 }}>🗑</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <button onClick={() => setView("board")} className="btn-close-full">Done</button>
      </div>
    </div>
  );

  // ── Public prayer board ────────────────────────────────────────────────────
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: "92vh", overflowY: "auto" }}>
        <div className="modal-handle" />

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text-primary)", cursor: "default" }}
              onClick={() => { const n = adminTap + 1; setAdminTap(n); if (n >= 5) { setAdminTap(0); setView("pin"); } }}>
              🙏 Prayer Board
            </div>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Community prayers & blessings</div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>

        {/* Hebrew verse banner */}
        <div style={{ marginBottom: 14, padding: "12px 16px", borderRadius: 16, background: "linear-gradient(135deg, #0f1e38, #1a1a2a)", border: "1px solid rgba(212,168,67,0.2)", textAlign: "center" }}>
          <div style={{ fontFamily: "'Noto Serif Hebrew', serif", fontSize: 20, color: "#d4a843", marginBottom: 4 }}>
            שְׁמַע יְהוָה קוֹלִי אֶקְרָא
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }}>"Hear, O Lord, my voice when I call" — Tehillim 27:7</div>
        </div>

        {/* Category filter */}
        <div style={{ display: "flex", gap: 5, overflowX: "auto", paddingBottom: 8, marginBottom: 14, scrollbarWidth: "none" }}>
          {["All", ...CATEGORIES].map(cat => {
            const cs = CAT_STYLE[cat];
            const active = filterCat === cat;
            return (
              <button key={cat} onClick={() => setFilterCat(cat)}
                style={{
                  padding: "5px 11px", borderRadius: 20, fontSize: 11, fontWeight: 700,
                  whiteSpace: "nowrap", cursor: "pointer", flexShrink: 0, transition: "all 0.15s",
                  background: active ? (cs?.bg || "rgba(212,168,67,0.12)") : "var(--elevated)",
                  border: active ? `1px solid ${cs?.color || "#d4a843"}` : "1px solid var(--border)",
                  color: active ? (cs?.color || "#d4a843") : "var(--text-muted)",
                }}>
                {cs ? `${cs.emoji} ` : ""}{cat}
              </button>
            );
          })}
        </div>

        {/* Prayer cards */}
        {approved.length === 0 ? (
          <div style={{ textAlign: "center", padding: "28px 0", color: "var(--text-muted)" }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>🕍</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
              {filterCat !== "All" ? `No ${filterCat} prayers yet` : "No prayers yet"}
            </div>
            <div style={{ fontSize: 13 }}>Be the first to share a prayer request<br />with the Bnei Menashe community.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
            {approved.map(req => {
              const cs = CAT_STYLE[req.category] || CAT_STYLE["Other"];
              const hasAmen = castAmens.has(req.id);
              return (
                <div key={req.id} style={{
                  borderRadius: 16,
                  background: req.pinned ? "linear-gradient(135deg, rgba(212,168,67,0.06), rgba(20,16,5,0.7))" : "var(--card)",
                  border: req.pinned ? "1px solid rgba(212,168,67,0.3)" : "1px solid var(--border)",
                  overflow: "hidden",
                }}>
                  <div style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      <div style={{ width: 42, height: 42, borderRadius: 12, flexShrink: 0, background: cs.bg, border: `1px solid ${cs.color}33`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{cs.emoji}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: ".06em", color: cs.color, background: cs.bg, borderRadius: 4, padding: "2px 6px" }}>{req.category.toUpperCase()}</span>
                          {req.pinned && <span style={{ fontSize: 10, color: "#d4a843" }}>📌</span>}
                          <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: "auto" }}>{fmtRelative(req.submittedAt)}</span>
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: req.isAnonymous ? "var(--text-muted)" : "var(--text-primary)", marginBottom: 6 }}>
                          {req.isAnonymous ? "🔒 Anonymous" : req.name}
                        </div>
                        <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.65 }}>
                          {req.text}
                        </div>
                        {req.adminResponse && (
                          <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 10, background: "rgba(212,168,67,0.07)", border: "1px solid rgba(212,168,67,0.2)" }}>
                            <div style={{ fontSize: 10, fontWeight: 800, color: "#d4a843", letterSpacing: ".06em", marginBottom: 4 }}>✡ PASTORAL BLESSING</div>
                            <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>{req.adminResponse}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Amen button */}
                  <div style={{ padding: "8px 16px 12px", display: "flex", alignItems: "center", gap: 10 }}>
                    <button onClick={() => castAmen(req.id)}
                      style={{
                        display: "flex", alignItems: "center", gap: 6, padding: "7px 16px", borderRadius: 20,
                        background: hasAmen ? "rgba(212,168,67,0.15)" : "var(--elevated)",
                        border: hasAmen ? "1px solid rgba(212,168,67,0.4)" : "1px solid var(--border)",
                        cursor: hasAmen ? "default" : "pointer",
                        fontSize: 13, fontWeight: 800,
                        color: hasAmen ? "#d4a843" : "var(--text-muted)",
                        transition: "all 0.2s",
                      }}>
                      <span style={{ fontSize: 16 }}>🙏</span>
                      <span>Amen</span>
                      {req.amens > 0 && <span style={{ fontSize: 12, fontWeight: 600, color: hasAmen ? "#d4a843" : "var(--text-muted)" }}>· {req.amens}</span>}
                    </button>
                    {hasAmen && <span style={{ fontSize: 11, color: "var(--text-muted)" }}>You said Amen ✓</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Submit CTA */}
        <div style={{ marginBottom: 12, padding: "14px 16px", borderRadius: 16, background: "linear-gradient(135deg, #1a1a30, #0f1e2a)", border: "1px solid rgba(212,168,67,0.18)", textAlign: "center" }}>
          <div style={{ fontFamily: "'Noto Serif Hebrew', serif", fontSize: 16, color: "#d4a843", marginBottom: 6 }}>תְּפִלָּה</div>
          <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>Share your prayer with the community</div>
          <button className="btn-gold" style={{ padding: "10px 28px", fontSize: 13, fontWeight: 800 }}
            onClick={() => { setSubmitted(false); setForm(emptyForm()); setView("submit"); }}>
            🙏 Add Prayer Request
          </button>
        </div>

        {/* Footer admin */}
        <div style={{ textAlign: "center", marginBottom: 10 }}>
          <button onClick={() => setView("pin")} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 11, color: "var(--text-muted)", opacity: 0.5, padding: "6px 12px" }}>⚙ Admin</button>
        </div>
        <button onClick={onClose} className="btn-close-full">Close</button>
      </div>
    </div>
  );
}
