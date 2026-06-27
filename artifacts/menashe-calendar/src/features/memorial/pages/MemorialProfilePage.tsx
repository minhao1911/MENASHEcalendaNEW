import { useState, useCallback } from "react";
import { HDate } from "@hebcal/core";
import { useLanguage } from "../../../context/LanguageContext";
import { useOnlineStatus } from "../../../hooks/useOnlineStatus";
import { GOLD, GOLD_GRAD, BORDER_GOLD } from "../../../lib/theme";
import { useMemorial } from "../hooks/useMemorial";
import { useCandles } from "../hooks/useCandles";
import { useTributes } from "../hooks/useTributes";
import { useMemorialPermissions } from "../hooks/useMemorialPermissions";
import { useFamilyManagement } from "../hooks/useFamilyManagement";
import { MemorialApiError } from "../api/memorialApi";
import {
  SanctuaryHeader,
  GlassPanel,
  SectionTitle,
  EmptyState,
  LoadingState,
} from "../components";
import type {
  CandleType,
  TributeType,
  LightCandleInput,
  AddTributeInput,
  PrivacyLevel,
  FamilyMemberRole,
  MemorialCandle,
  MemorialTribute,
  MemorialFamilyMember,
  MemorialFamily,
} from "../types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function calcAge(birthDate: string | null, deathDate: string): number | null {
  if (!birthDate) return null;
  try {
    const b = new Date(birthDate);
    const d = new Date(deathDate);
    let age = d.getFullYear() - b.getFullYear();
    const m = d.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && d.getDate() < b.getDate())) age--;
    return age >= 0 ? age : null;
  } catch { return null; }
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric", month: "long", year: "numeric",
    });
  } catch { return iso; }
}

function isToday(iso: string): boolean {
  return new Date(iso).toDateString() === new Date().toDateString();
}

interface YahrzeitInfo {
  hebrewDate: string;
  gregorianDate: Date;
  daysAway: number;
}

function nextYahrzeit(deathDate: string): YahrzeitInfo | null {
  try {
    const d = new Date(deathDate + "T12:00:00");
    const hDeath = new HDate(d);
    const today = new HDate(new Date());
    let year = today.getFullYear();
    let yahrzeit = new HDate(hDeath.getDate(), hDeath.getMonth(), year);
    if (yahrzeit.abs() < today.abs()) {
      year++;
      yahrzeit = new HDate(hDeath.getDate(), hDeath.getMonth(), year);
    }
    const gDate = yahrzeit.greg();
    const daysAway = Math.round(
      (gDate.getTime() - new Date().setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24),
    );
    return { hebrewDate: yahrzeit.toString(), gregorianDate: gDate, daysAway };
  } catch { return null; }
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CANDLE_TYPES: { value: CandleType; label: string; emoji: string }[] = [
  { value: "memorial", label: "Memorial", emoji: "🕯" },
  { value: "yahrzeit", label: "Yahrzeit", emoji: "🕎" },
  { value: "neshama",  label: "Neshama",  emoji: "✨" },
  { value: "shabbat",  label: "Shabbat",  emoji: "🕍" },
  { value: "shloshim", label: "Shloshim", emoji: "🤍" },
];

const TRIBUTE_TYPE_CONFIG: Record<TributeType, { label: string; emoji: string; color: string }> = {
  memory:    { label: "Memory",    emoji: "💭", color: "#6bb0e8" },
  prayer:    { label: "Prayer",    emoji: "🙏", color: "#c5a060" },
  scripture: { label: "Scripture", emoji: "📜", color: "#7fc47f" },
  family:    { label: "Family",    emoji: "👪", color: GOLD },
  community: { label: "Community", emoji: "✡", color: "#9b8fd4" },
};

const RELATIONSHIP_OPTIONS = [
  "Son", "Daughter", "Father", "Mother",
  "Grandfather", "Grandmother", "Brother", "Sister",
  "Husband", "Wife", "Friend", "Community member",
  "Rabbi", "Teacher", "Colleague", "Other",
];

const PRIVACY_CONFIG: Record<PrivacyLevel, { color: string; bg: string }> = {
  private:   { color: "#e07070", bg: "rgba(224,112,112,0.12)" },
  family:    { color: "#70a0e0", bg: "rgba(112,160,224,0.12)" },
  community: { color: GOLD,      bg: "rgba(212,168,67,0.10)" },
  public:    { color: "#70d070", bg: "rgba(112,208,112,0.10)" },
};

const PRIVACY_ICON: Record<PrivacyLevel, string> = {
  private: "🔒", family: "👪", community: "✡", public: "🌐",
};

// ── Shared styles ─────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, letterSpacing: "0.06em",
  color: "rgba(255,255,255,0.35)", marginBottom: 6, textTransform: "uppercase",
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 12px",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 10, color: "rgba(255,255,255,0.85)", fontSize: 14,
  outline: "none", boxSizing: "border-box",
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle, resize: "vertical" as const, minHeight: 72, fontFamily: "inherit",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle, appearance: "none" as const, cursor: "pointer",
};

const cancelBtnStyle: React.CSSProperties = {
  flex: 1, padding: "12px",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 12, color: "rgba(255,255,255,0.5)", fontSize: 14, cursor: "pointer",
};

const primaryBtnStyle = (disabled: boolean): React.CSSProperties => ({
  flex: 2, padding: "12px",
  background: disabled ? "rgba(212,168,67,0.12)" : GOLD_GRAD,
  border: `1px solid ${disabled ? BORDER_GOLD : "transparent"}`,
  borderRadius: 12,
  color: disabled ? "rgba(212,168,67,0.4)" : "#1a1000",
  fontSize: 14, fontWeight: 700, cursor: disabled ? "default" : "pointer",
});

const closeBtnStyle: React.CSSProperties = {
  marginTop: 16, padding: "10px 24px",
  background: "rgba(212,168,67,0.12)", border: `1px solid ${BORDER_GOLD}`,
  borderRadius: 10, color: GOLD, fontSize: 13, fontWeight: 600, cursor: "pointer",
};

// ── Sub-components ────────────────────────────────────────────────────────────

function PrivacyBadge({ level }: { level: PrivacyLevel }) {
  const cfg = PRIVACY_CONFIG[level] ?? PRIVACY_CONFIG.public;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      fontSize: 10, fontWeight: 700, letterSpacing: "0.06em",
      color: cfg.color, background: cfg.bg,
      border: `1px solid ${cfg.color}33`, borderRadius: 20, padding: "2px 8px",
    }}>
      {PRIVACY_ICON[level]} {level.charAt(0).toUpperCase() + level.slice(1)}
    </span>
  );
}

function ActionButton({ icon, label, onClick, disabled, gold }: {
  icon: string; label: string; onClick?: () => void; disabled?: boolean; gold?: boolean;
}) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
      gap: 5, padding: "10px 6px",
      background: gold
        ? "linear-gradient(135deg,rgba(212,168,67,0.14),rgba(212,168,67,0.06))"
        : "rgba(255,255,255,0.04)",
      border: gold ? `1px solid ${BORDER_GOLD}` : "1px solid rgba(255,255,255,0.07)",
      borderRadius: 14, cursor: disabled ? "default" : "pointer",
      opacity: disabled ? 0.4 : 1,
    }}>
      <span style={{ fontSize: 20 }}>{icon}</span>
      <span style={{
        fontSize: 10, fontWeight: 700, letterSpacing: "0.04em",
        color: gold ? GOLD : "rgba(255,255,255,0.55)", lineHeight: 1.2, textAlign: "center",
      }}>{label}</span>
    </button>
  );
}

function InfoPill({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>
        {icon} {value}
      </div>
    </div>
  );
}

function FamilyRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
      <span style={{
        fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.3)",
        letterSpacing: "0.05em", textTransform: "uppercase", flexShrink: 0, minWidth: 80,
      }}>{label}</span>
      <span style={{ fontSize: 13, color: "rgba(255,255,255,0.65)" }}>{value}</span>
    </div>
  );
}

// ── Candle Card ───────────────────────────────────────────────────────────────

function CandleCard({ candle }: { candle: MemorialCandle }) {
  const candleEmoji = CANDLE_TYPES.find(ct => ct.value === candle.candleType)?.emoji ?? "🕯";
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
      <span style={{ fontSize: 20, flexShrink: 0, marginTop: 2 }}>{candleEmoji}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 2 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: GOLD }}>
            {candle.isAnonymous ? "Anonymous" : (candle.guestName ?? "Community member")}
          </span>
          <span style={{
            fontSize: 10, color: "rgba(212,168,67,0.5)", background: "rgba(212,168,67,0.08)",
            border: "1px solid rgba(212,168,67,0.2)", borderRadius: 6, padding: "1px 5px",
          }}>{candle.candleType}</span>
          {candle.relationship && (
            <span style={{
              fontSize: 10, color: "rgba(255,255,255,0.35)", background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, padding: "1px 5px",
            }}>{candle.relationship}</span>
          )}
        </div>
        {candle.community && (
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 2 }}>
            ✡ {candle.community}
          </div>
        )}
        {candle.message && (
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", fontStyle: "italic" }}>
            "{candle.message}"
          </div>
        )}
      </div>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", flexShrink: 0, marginTop: 2 }}>
        {new Date(candle.litAt).toLocaleDateString()}
      </div>
    </div>
  );
}

// ── Tribute Card ──────────────────────────────────────────────────────────────

function TributeCard({ tribute }: { tribute: MemorialTribute }) {
  const typeCfg = tribute.tributeType ? TRIBUTE_TYPE_CONFIG[tribute.tributeType] : null;
  return (
    <div style={{ paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        {typeCfg && (
          <span style={{
            fontSize: 10, fontWeight: 700,
            color: typeCfg.color, background: `${typeCfg.color}15`,
            border: `1px solid ${typeCfg.color}33`,
            borderRadius: 6, padding: "1px 6px", letterSpacing: "0.05em",
          }}>
            {typeCfg.emoji} {typeCfg.label}
          </span>
        )}
        {tribute.title && (
          <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.8)" }}>
            {tribute.title}
          </span>
        )}
      </div>
      <div style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", lineHeight: 1.6, fontStyle: "italic" }}>
        "{tribute.body}"
      </div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 5 }}>
        — {tribute.isAnonymous ? "Anonymous" : (tribute.guestName ?? "Community member")}
        {" · "}{new Date(tribute.createdAt).toLocaleDateString()}
      </div>
    </div>
  );
}

// ── Yahrzeit Alert ────────────────────────────────────────────────────────────

function YahrzeitAlert({
  yahrzeit,
  personName,
  onLightCandle,
  canLightCandle,
  t,
}: {
  yahrzeit: { daysAway: number; hebrewDate: string; gregorianDate: Date };
  personName: string;
  onLightCandle?: () => void;
  canLightCandle?: boolean;
  t: any;
}) {
  const isToday = yahrzeit.daysAway === 0;

  if (isToday) {
    return (
      <div style={{
        margin: "0 16px 16px",
        borderRadius: 16,
        background: "linear-gradient(135deg, rgba(212,168,67,0.18) 0%, rgba(212,168,67,0.08) 100%)",
        border: `1.5px solid ${BORDER_GOLD}`,
        padding: "16px",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 24 }}>🕎</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: GOLD }}>
              {t.memYahrzeitAlertToday}
            </div>
            <div style={{ fontSize: 12, color: "rgba(212,168,67,0.65)", marginTop: 2 }}>
              {yahrzeit.hebrewDate} · {yahrzeit.gregorianDate.toLocaleDateString("en-GB", {
                day: "numeric", month: "long",
              })}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <SuggestionRow emoji="🙏" label={t.memYahrzeitSuggestPrayer} />
          <SuggestionRow emoji="📜" label={t.memYahrzeitSuggestPsalm} />
          {canLightCandle && (
            <button onClick={onLightCandle} style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "8px 12px", borderRadius: 10,
              background: "rgba(212,168,67,0.15)",
              border: `1px solid ${BORDER_GOLD}`,
              cursor: "pointer", textAlign: "left",
            }}>
              <span style={{ fontSize: 16 }}>🕯</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: GOLD }}>
                {t.memYahrzeitSuggestCandle}
              </span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{
      margin: "0 16px 12px",
      borderRadius: 12,
      background: "rgba(212,168,67,0.07)",
      border: `1px solid rgba(212,168,67,0.25)`,
      padding: "10px 14px",
      display: "flex", alignItems: "center", gap: 10,
    }}>
      <span style={{ fontSize: 18 }}>🕎</span>
      <div>
        <span style={{ fontSize: 12, fontWeight: 700, color: GOLD }}>
          {t.memYahrzeitAlertSoon} {yahrzeit.daysAway} {t.memProfileDaysAway}
        </span>
        <span style={{ fontSize: 11, color: "rgba(212,168,67,0.55)", marginLeft: 6 }}>
          · {yahrzeit.hebrewDate}
        </span>
      </div>
    </div>
  );
}

function SuggestionRow({ emoji, label }: { emoji: string; label: string }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "7px 10px", borderRadius: 8,
      background: "rgba(255,255,255,0.04)",
    }}>
      <span style={{ fontSize: 14 }}>{emoji}</span>
      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>{label}</span>
    </div>
  );
}

// ── BottomSheet ───────────────────────────────────────────────────────────────

function BottomSheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <>
      <div onClick={onClose} style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(4px)", zIndex: 200,
      }} />
      <div style={{
        position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 201,
        background: "#0d1524", borderTop: `1px solid ${BORDER_GOLD}`,
        borderRadius: "20px 20px 0 0", padding: "24px 20px 36px",
        maxHeight: "85vh", overflowY: "auto",
      }}>
        {children}
      </div>
    </>
  );
}

// ── Candle Sheet ──────────────────────────────────────────────────────────────

function CandleSheet({
  onClose, onLight, t,
}: {
  onClose: () => void;
  onLight: (input: LightCandleInput) => Promise<void>;
  t: any;
}) {
  const [type, setType] = useState<CandleType>("memorial");
  const [message, setMessage] = useState("");
  const [relationship, setRelationship] = useState("");
  const [community, setCommunity] = useState("");
  const [guestName, setGuestName] = useState("");
  const [anon, setAnon] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleLight = useCallback(async () => {
    setSubmitting(true); setErr(null);
    try {
      await onLight({
        candleType: type,
        message: message.trim() || undefined,
        relationship: relationship || undefined,
        community: community.trim() || undefined,
        guestName: guestName.trim() || undefined,
        isAnonymous: anon,
      });
      setDone(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to light candle");
    } finally { setSubmitting(false); }
  }, [onLight, type, message, relationship, community, guestName, anon]);

  return (
    <BottomSheet onClose={onClose}>
      <div style={{ fontSize: 18, fontWeight: 800, color: GOLD, marginBottom: 16 }}>
        🕯 {t.memProfileActionLight}
      </div>

      {done ? (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🕯</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: GOLD }}>{t.memProfileCandleLit ?? "Candle Lit"}</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 6 }}>
            May their memory be a blessing
          </div>
          <button onClick={onClose} style={closeBtnStyle}>{t.memProfileCancel ?? "Close"}</button>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 14 }}>
            <div style={labelStyle}>Candle Type</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {CANDLE_TYPES.map(ct => (
                <button key={ct.value} onClick={() => setType(ct.value)} style={{
                  padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                  background: type === ct.value ? "rgba(212,168,67,0.18)" : "rgba(255,255,255,0.05)",
                  border: type === ct.value ? `1px solid ${GOLD}` : "1px solid rgba(255,255,255,0.1)",
                  color: type === ct.value ? GOLD : "rgba(255,255,255,0.5)", cursor: "pointer",
                }}>
                  {ct.emoji} {ct.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={labelStyle}>{t.memCandleRelationship}</div>
            <select value={relationship} onChange={e => setRelationship(e.target.value)} style={selectStyle}>
              <option value="">{t.memCandleRelationshipPlaceholder}</option>
              {RELATIONSHIP_OPTIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={labelStyle}>{t.memCandleCommunityField}</div>
            <input
              value={community} onChange={e => setCommunity(e.target.value)}
              placeholder="e.g. Bnei Menashe Manipur"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={labelStyle}>Message (optional)</div>
            <textarea
              value={message} onChange={e => setMessage(e.target.value)}
              placeholder="A few words in their memory…"
              maxLength={280} rows={2} style={textareaStyle}
            />
          </div>

          {!anon && (
            <div style={{ marginBottom: 12 }}>
              <div style={labelStyle}>Your name (optional)</div>
              <input value={guestName} onChange={e => setGuestName(e.target.value)}
                placeholder="Leave blank to omit" style={inputStyle} />
            </div>
          )}

          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, cursor: "pointer" }}>
            <input type="checkbox" checked={anon} onChange={e => setAnon(e.target.checked)} style={{ accentColor: GOLD }} />
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>Light anonymously</span>
          </label>

          {err && <div style={{ fontSize: 12, color: "#e07070", marginBottom: 10 }}>{err}</div>}

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} style={cancelBtnStyle}>{t.memProfileCancel ?? "Cancel"}</button>
            <button onClick={handleLight} disabled={submitting} style={primaryBtnStyle(submitting)}>
              {submitting ? "Lighting…" : "🕯 Light the Candle"}
            </button>
          </div>
        </>
      )}
    </BottomSheet>
  );
}

// ── Tribute Sheet ─────────────────────────────────────────────────────────────

function TributeSheet({
  onClose, onSubmit, t,
}: {
  onClose: () => void;
  onSubmit: (input: AddTributeInput) => Promise<MemorialTribute | void>;
  t: any;
}) {
  const [tributeType, setTributeType] = useState<TributeType>("memory");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [guestName, setGuestName] = useState("");
  const [anon, setAnon] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!body.trim()) { setErr("Please write your tribute."); return; }
    setSubmitting(true); setErr(null);
    try {
      await onSubmit({
        tributeType,
        title: title.trim() || undefined,
        body: body.trim(),
        guestName: guestName.trim() || undefined,
        isAnonymous: anon,
      });
      setDone(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to submit tribute");
    } finally { setSubmitting(false); }
  }, [onSubmit, tributeType, title, body, guestName, anon]);

  return (
    <BottomSheet onClose={onClose}>
      <div style={{ fontSize: 18, fontWeight: 800, color: GOLD, marginBottom: 16 }}>
        📝 {t.memProfileActionTribute}
      </div>

      {done ? (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🕊</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: GOLD }}>
            {t.memProfileTributeSubmitted ?? "Tribute Submitted"}
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 6 }}>
            {t.memProfileTributePending ?? "It will appear after review."}
          </div>
          <button onClick={onClose} style={closeBtnStyle}>Close</button>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 14 }}>
            <div style={labelStyle}>{t.memTributeTypeLabel}</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {(Object.entries(TRIBUTE_TYPE_CONFIG) as [TributeType, typeof TRIBUTE_TYPE_CONFIG[TributeType]][]).map(([key, cfg]) => (
                <button key={key} onClick={() => setTributeType(key)} style={{
                  padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600,
                  background: tributeType === key ? `${cfg.color}20` : "rgba(255,255,255,0.05)",
                  border: tributeType === key ? `1px solid ${cfg.color}` : "1px solid rgba(255,255,255,0.1)",
                  color: tributeType === key ? cfg.color : "rgba(255,255,255,0.5)", cursor: "pointer",
                }}>
                  {cfg.emoji} {cfg.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={labelStyle}>Title (optional)</div>
            <input value={title} onChange={e => setTitle(e.target.value)}
              placeholder="e.g. A beloved father" maxLength={120} style={inputStyle} />
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={labelStyle}>{t.memProfileTributeBody ?? "Your tribute"} *</div>
            <textarea value={body} onChange={e => setBody(e.target.value)}
              placeholder="Share a memory or words of comfort…"
              maxLength={1200} rows={4} style={textareaStyle} />
          </div>

          {!anon && (
            <div style={{ marginBottom: 12 }}>
              <div style={labelStyle}>Your name (optional)</div>
              <input value={guestName} onChange={e => setGuestName(e.target.value)}
                placeholder="Leave blank to omit" style={inputStyle} />
            </div>
          )}

          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, cursor: "pointer" }}>
            <input type="checkbox" checked={anon} onChange={e => setAnon(e.target.checked)} style={{ accentColor: GOLD }} />
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>Submit anonymously</span>
          </label>

          {err && <div style={{ fontSize: 12, color: "#e07070", marginBottom: 10 }}>{err}</div>}

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} style={cancelBtnStyle}>Cancel</button>
            <button onClick={handleSubmit} disabled={submitting || !body.trim()} style={primaryBtnStyle(submitting || !body.trim())}>
              {submitting ? "Submitting…" : "Submit Tribute"}
            </button>
          </div>
        </>
      )}
    </BottomSheet>
  );
}

// ── Family Management Sheet ───────────────────────────────────────────────────

function FamilyManagementSheet({
  family,
  members,
  onClose,
  invite,
  updateRole,
  remove,
  t,
}: {
  family: MemorialFamily | null;
  members: MemorialFamilyMember[];
  onClose: () => void;
  invite: (userId: string, role: FamilyMemberRole) => Promise<void>;
  updateRole: (memberId: string, role: FamilyMemberRole) => Promise<void>;
  remove: (memberId: string) => Promise<void>;
  t: any;
}) {
  const [inviteId, setInviteId] = useState("");
  const [inviteRole, setInviteRole] = useState<FamilyMemberRole>("member");
  const [inviting, setInviting] = useState(false);
  const [inviteDone, setInviteDone] = useState(false);
  const [inviteErr, setInviteErr] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const handleInvite = useCallback(async () => {
    if (!inviteId.trim()) return;
    setInviting(true); setInviteErr(null);
    try {
      await invite(inviteId.trim(), inviteRole);
      setInviteDone(true);
      setInviteId("");
      setTimeout(() => setInviteDone(false), 3000);
    } catch (e) {
      setInviteErr(e instanceof Error ? e.message : "Invite failed");
    } finally { setInviting(false); }
  }, [invite, inviteId, inviteRole]);

  const handleRemove = useCallback(async (memberId: string) => {
    setRemoving(memberId);
    try { await remove(memberId); } catch { /* ignore */ }
    setRemoving(null);
  }, [remove]);

  const roleLabel: Record<FamilyMemberRole, string> = {
    admin: t.memFamilyRoleAdmin,
    member: t.memFamilyRoleMember,
    viewer: t.memFamilyRoleViewer,
  };

  return (
    <BottomSheet onClose={onClose}>
      <div style={{ fontSize: 18, fontWeight: 800, color: GOLD, marginBottom: 16 }}>
        👪 {t.memFamilyManage}
      </div>

      {family && (
        <div style={{
          padding: "10px 12px", borderRadius: 10, marginBottom: 16,
          background: "rgba(212,168,67,0.08)", border: `1px solid ${BORDER_GOLD}`,
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: GOLD }}>{family.name}</div>
          <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>
            {family.memberCount} member{family.memberCount !== 1 ? "s" : ""}
          </div>
        </div>
      )}

      {members.length === 0 ? (
        <div style={{ padding: "12px 0", textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>
          {t.memFamilyNoMembers}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
          {members.map(m => (
            <div key={m.id} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "10px 12px", borderRadius: 10,
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.75)" }}>
                  {m.userId.slice(0, 18)}…
                </div>
                {family?.primaryContactId === m.userId && (
                  <div style={{ fontSize: 10, color: GOLD, marginTop: 1 }}>
                    ★ {t.memFamilyPrimaryContact}
                  </div>
                )}
              </div>
              <select
                value={m.role}
                onChange={e => updateRole(m.id, e.target.value as FamilyMemberRole)}
                style={{
                  ...selectStyle, width: "auto", padding: "4px 8px", fontSize: 11,
                }}
              >
                {(["admin", "member", "viewer"] as FamilyMemberRole[]).map(r => (
                  <option key={r} value={r}>{roleLabel[r]}</option>
                ))}
              </select>
              <button
                onClick={() => handleRemove(m.id)}
                disabled={removing === m.id}
                style={{
                  padding: "4px 8px", borderRadius: 6, fontSize: 11,
                  background: "rgba(224,112,112,0.1)", border: "1px solid rgba(224,112,112,0.25)",
                  color: "#e07070", cursor: "pointer", opacity: removing === m.id ? 0.5 : 1,
                }}
              >
                {t.memFamilyRemove}
              </button>
            </div>
          ))}
        </div>
      )}

      <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,0.7)", marginBottom: 12 }}>
          {t.memFamilyInvite}
        </div>
        <div style={{ marginBottom: 10 }}>
          <div style={labelStyle}>{t.memFamilyUserId}</div>
          <input value={inviteId} onChange={e => setInviteId(e.target.value)}
            placeholder="user_2abc…" style={inputStyle} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <div style={labelStyle}>{t.memFamilySelectRole}</div>
          <select value={inviteRole} onChange={e => setInviteRole(e.target.value as FamilyMemberRole)} style={selectStyle}>
            {(["admin", "member", "viewer"] as FamilyMemberRole[]).map(r => (
              <option key={r} value={r}>{roleLabel[r]}</option>
            ))}
          </select>
        </div>
        {inviteErr && <div style={{ fontSize: 12, color: "#e07070", marginBottom: 8 }}>{inviteErr}</div>}
        {inviteDone && <div style={{ fontSize: 12, color: "#70d070", marginBottom: 8 }}>✓ {t.memFamilyInvited}</div>}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onClose} style={cancelBtnStyle}>Close</button>
          <button
            onClick={handleInvite}
            disabled={inviting || !inviteId.trim()}
            style={primaryBtnStyle(inviting || !inviteId.trim())}
          >
            {inviting ? t.memFamilyInviting : t.memFamilyInvite}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}

// ── Load More Button ──────────────────────────────────────────────────────────

function LoadMoreBtn({ onLoad, loading, label }: { onLoad: () => void; loading: boolean; label: string }) {
  return (
    <button onClick={onLoad} disabled={loading} style={{
      width: "100%", marginTop: 10, padding: "9px",
      background: "none", border: "1px solid rgba(255,255,255,0.08)",
      borderRadius: 10, color: "rgba(255,255,255,0.35)", fontSize: 12, cursor: "pointer",
      opacity: loading ? 0.5 : 1,
    }}>
      {loading ? "Loading…" : `↓ ${label}`}
    </button>
  );
}

// ── Candle Tabs ───────────────────────────────────────────────────────────────

type CandleTab = "recent" | "today" | "community";

function CandleTabs({ active, onChange, t }: {
  active: CandleTab;
  onChange: (t: CandleTab) => void;
  t: any;
}) {
  const tabs: { key: CandleTab; label: string }[] = [
    { key: "recent", label: t.memCandleTabRecent },
    { key: "today", label: t.memCandleTabToday },
    { key: "community", label: t.memCandleTabCommunity },
  ];
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
      {tabs.map(tab => (
        <button key={tab.key} onClick={() => onChange(tab.key)} style={{
          padding: "5px 12px", borderRadius: 20, fontSize: 11, fontWeight: 600,
          background: active === tab.key ? "rgba(212,168,67,0.15)" : "transparent",
          border: active === tab.key ? `1px solid ${BORDER_GOLD}` : "1px solid rgba(255,255,255,0.08)",
          color: active === tab.key ? GOLD : "rgba(255,255,255,0.4)", cursor: "pointer",
        }}>
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ── Tribute Filter ────────────────────────────────────────────────────────────

function TributeFilter({ active, onChange, t }: {
  active: TributeType | "all";
  onChange: (f: TributeType | "all") => void;
  t: any;
}) {
  const filters: { key: TributeType | "all"; label: string }[] = [
    { key: "all", label: t.memTributeTypeAll },
    { key: "memory", label: t.memTributeTypeMemory },
    { key: "prayer", label: t.memTributeTypePrayer },
    { key: "scripture", label: t.memTributeTypeScripture },
    { key: "family", label: t.memTributeTypeFamily },
    { key: "community", label: t.memTributeCommunityType },
  ];
  return (
    <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 12 }}>
      {filters.map(f => {
        const cfg = f.key !== "all" ? TRIBUTE_TYPE_CONFIG[f.key] : null;
        const activeColor = cfg?.color ?? GOLD;
        return (
          <button key={f.key} onClick={() => onChange(f.key)} style={{
            padding: "4px 10px", borderRadius: 16, fontSize: 11, fontWeight: 600,
            background: active === f.key ? `${activeColor}18` : "transparent",
            border: active === f.key ? `1px solid ${activeColor}55` : "1px solid rgba(255,255,255,0.07)",
            color: active === f.key ? activeColor : "rgba(255,255,255,0.35)", cursor: "pointer",
          }}>
            {f.key !== "all" && TRIBUTE_TYPE_CONFIG[f.key].emoji + " "}
            {f.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Page Shell ────────────────────────────────────────────────────────────────

function PageShell({ onBack, title, children }: {
  onBack: () => void; title: string; children: React.ReactNode;
}) {
  return (
    <div style={{ minHeight: "100%", background: "var(--background, #080e1a)", display: "flex", flexDirection: "column" }}>
      <SanctuaryHeader onBack={onBack} title={title} />
      {children}
    </div>
  );
}

const centerStyle: React.CSSProperties = {
  flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
  minHeight: 300, padding: "40px 20px",
};

// ── Main Page ─────────────────────────────────────────────────────────────────

interface MemorialProfilePageProps {
  slug: string;
  onBack: () => void;
}

export default function MemorialProfilePage({ slug, onBack }: MemorialProfilePageProps) {
  const { t } = useLanguage();
  const isOnline = useOnlineStatus();

  const { memorial, status, error, refetch } = useMemorial(slug);
  const {
    candles, total: candleTotal, hasMore: candleHasMore,
    status: candleStatus, loadMore: loadMoreCandles, light,
  } = useCandles(memorial?.id ?? null);
  const {
    tributes, total: tributeTotal, hasMore: tributeHasMore,
    status: tributeStatus, loadMore: loadMoreTributes, submit,
  } = useTributes(memorial?.id ?? null);
  const permissions = useMemorialPermissions({ memorial });
  const familyMgmt = useFamilyManagement(
    permissions?.canManageFamily ? memorial?.familyId : null,
  );

  const [sheet, setSheet] = useState<"candle" | "tribute" | "family" | null>(null);
  const [candleTab, setCandleTab] = useState<CandleTab>("recent");
  const [tributeFilter, setTributeFilter] = useState<TributeType | "all">("all");
  const [copied, setCopied] = useState(false);

  const handleLight = useCallback(async (input: LightCandleInput) => {
    await light(input);
    refetch();
  }, [light, refetch]);

  const handleShare = useCallback(async () => {
    const url = `${window.location.origin}/memorial/${slug}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Memorial", url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch { /* ignore */ }
  }, [slug]);

  // ── Offline ──
  if (!isOnline && !memorial) {
    return (
      <PageShell onBack={onBack} title="Memorial">
        <div style={centerStyle}>
          <EmptyState icon="📵" title={t.memShellOffline} subtitle={t.memShellOfflineSub} />
        </div>
      </PageShell>
    );
  }

  // ── Loading ──
  if (status === "loading" || status === "idle") {
    return (
      <PageShell onBack={onBack} title="Memorial">
        <div style={{ padding: "20px 16px" }}><LoadingState rows={5} /></div>
      </PageShell>
    );
  }

  // ── Error / Not Found / Private ──
  if (status === "error" || !memorial) {
    const is404 = error instanceof MemorialApiError && error.isNotFound;
    const is403 = error instanceof MemorialApiError && error.isForbidden;
    return (
      <PageShell onBack={onBack} title="Memorial">
        <div style={centerStyle}>
          <EmptyState
            icon={is403 ? "🔒" : is404 ? "🕊" : "⚠️"}
            title={is403 ? t.memProfilePrivate : is404 ? t.memProfileNotFound : t.memShellSearchError}
            subtitle={is403 ? t.memProfilePrivateSub : is404 ? t.memProfileNotFoundSub : (error?.message ?? undefined)}
            action={!is404 && !is403 ? <button onClick={refetch} style={closeBtnStyle}>{t.memShellRetry}</button> : undefined}
          />
        </div>
      </PageShell>
    );
  }

  if (permissions && !permissions.canView && memorial.status === "published") {
    return (
      <PageShell onBack={onBack} title={memorial.person.fullName}>
        <div style={centerStyle}>
          <EmptyState icon="🔒" title={t.memProfilePrivate} subtitle={t.memProfilePrivateSub} />
        </div>
      </PageShell>
    );
  }

  // ── Derived data ──
  const { person, privacy } = memorial;
  const age = calcAge(person.birthDate, person.deathDate);
  const yahrzeit = nextYahrzeit(person.deathDate);
  const isYahrzeitToday = yahrzeit?.daysAway === 0;
  const isYahrzeitSoon = yahrzeit !== null && yahrzeit.daysAway > 0 && yahrzeit.daysAway <= 7;

  const approvedTributes = tributes.filter(tr => tr.status === "approved");
  const filteredTributes = tributeFilter === "all"
    ? approvedTributes
    : approvedTributes.filter(tr => tr.tributeType === tributeFilter);

  const todayCandles = candles.filter(c => isToday(c.litAt));
  const communityCandles = candles.filter(c => Boolean(c.community));
  const displayCandles =
    candleTab === "today" ? todayCandles
    : candleTab === "community" ? communityCandles
    : candles;

  return (
    <>
      <div style={{
        minHeight: "100%",
        background: "var(--background, #080e1a)",
        display: "flex", flexDirection: "column",
        overflowY: "auto", overflowX: "hidden", paddingBottom: 80,
      }}>
        <SanctuaryHeader
          onBack={onBack}
          title={person.fullName}
          subtitle={person.hebrewName ?? undefined}
        />

        {/* ── Yahrzeit Alert ── */}
        {(isYahrzeitToday || isYahrzeitSoon) && yahrzeit && (
          <YahrzeitAlert
            yahrzeit={yahrzeit}
            personName={person.fullName}
            onLightCandle={() => setSheet("candle")}
            canLightCandle={permissions?.canLightCandle}
            t={t}
          />
        )}

        {/* ── Hero ── */}
        <div style={{
          padding: "20px 16px 16px", display: "flex", flexDirection: "column",
          alignItems: "center", gap: 10, borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}>
          <div style={{
            width: 88, height: 88, borderRadius: "50%",
            background: "linear-gradient(135deg,#1a2540,#0d1524)",
            border: `2px solid ${BORDER_GOLD}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 34, flexShrink: 0,
          }}>
            🕊
          </div>

          <div style={{ textAlign: "center" }}>
            <div style={{
              fontSize: 22, fontWeight: 800, color: "rgba(255,255,255,0.92)",
              letterSpacing: "0.01em", lineHeight: 1.2,
            }}>
              {person.fullName}
            </div>
            {person.hebrewName && (
              <div style={{ fontSize: 16, color: GOLD, fontWeight: 600, marginTop: 4, direction: "rtl" }}>
                {person.hebrewName}
              </div>
            )}
          </div>

          <PrivacyBadge level={privacy.visibilityLevel} />

          <div style={{ display: "flex", gap: 16, marginTop: 4, flexWrap: "wrap", justifyContent: "center" }}>
            {person.birthDate && (
              <InfoPill icon="🌱" label={t.memProfileBorn} value={formatDate(person.birthDate)} />
            )}
            <InfoPill icon="🕯" label={t.memProfileDied} value={formatDate(person.deathDate)} />
            {age !== null && (
              <InfoPill icon="📅" label={t.memProfileAge} value={`${age} ${t.memProfileYears}`} />
            )}
          </div>

          {candleTotal > 0 && (
            <div style={{ fontSize: 12, color: "rgba(212,168,67,0.7)", fontWeight: 600 }}>
              🕯 {candleTotal} {t.memCandlesCount}
            </div>
          )}
        </div>

        {/* ── Actions ── */}
        <div style={{ padding: "14px 16px" }}>
          <div style={{ display: "flex", gap: 8 }}>
            <ActionButton
              icon="🕯" label={t.memProfileActionLight} gold
              disabled={!permissions?.canLightCandle}
              onClick={() => setSheet("candle")}
            />
            <ActionButton
              icon="📝" label={t.memProfileActionTribute}
              disabled={!permissions?.canLeaveTribute}
              onClick={() => setSheet("tribute")}
            />
            <ActionButton
              icon="🖼" label={t.memProfileActionPhotos} disabled
            />
            {permissions?.canManageFamily && (
              <ActionButton
                icon="👪" label={t.memFamilyManage}
                onClick={() => setSheet("family")}
              />
            )}
            <ActionButton
              icon={copied ? "✅" : "🔗"}
              label={copied ? t.memProfileCopied : t.memProfileActionShare}
              onClick={handleShare}
            />
          </div>
        </div>

        <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 20 }}>

          {/* ── Biography ── */}
          <section>
            <SectionTitle title={t.memProfileBiography} icon="📖" />
            <GlassPanel>
              {person.biography ? (
                <p style={{ margin: 0, fontSize: 14, color: "rgba(255,255,255,0.7)", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>
                  {person.biography}
                </p>
              ) : (
                <EmptyState icon="📖" title={t.memProfileNoBio} />
              )}
            </GlassPanel>
          </section>

          {/* ── Candles ── */}
          <section>
            <SectionTitle
              title={t.memProfileRecentCandles}
              icon="🕯"
              count={candleTotal || undefined}
              action={
                permissions?.canLightCandle && (
                  <button
                    onClick={() => setSheet("candle")}
                    style={{ fontSize: 11, color: GOLD, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
                  >
                    + Light
                  </button>
                )
              }
            />
            <GlassPanel>
              <CandleTabs active={candleTab} onChange={setCandleTab} t={t} />
              {displayCandles.length === 0 ? (
                <EmptyState
                  icon="🕯"
                  title={candleTab === "today" ? "No candles lit today" : candleTab === "community" ? "No community candles" : t.memProfileNoCandles}
                  action={
                    permissions?.canLightCandle && (
                      <button onClick={() => setSheet("candle")} style={{
                        fontSize: 12, color: GOLD, background: "rgba(212,168,67,0.1)",
                        border: `1px solid ${BORDER_GOLD}`, borderRadius: 8,
                        padding: "6px 14px", cursor: "pointer",
                      }}>
                        {t.memProfileActionLight}
                      </button>
                    )
                  }
                />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {displayCandles.map(c => <CandleCard key={c.id} candle={c} />)}
                </div>
              )}
              {candleHasMore && candleTab === "recent" && (
                <LoadMoreBtn
                  onLoad={loadMoreCandles}
                  loading={candleStatus === "loading"}
                  label={t.memLoadMore}
                />
              )}
            </GlassPanel>
          </section>

          {/* ── Tributes ── */}
          <section>
            <SectionTitle
              title={t.memProfileRecentTributes}
              icon="📝"
              count={approvedTributes.length || undefined}
              action={
                permissions?.canLeaveTribute && (
                  <button
                    onClick={() => setSheet("tribute")}
                    style={{ fontSize: 11, color: GOLD, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
                  >
                    + Add
                  </button>
                )
              }
            />
            <GlassPanel>
              <TributeFilter active={tributeFilter} onChange={setTributeFilter} t={t} />
              {filteredTributes.length === 0 ? (
                <EmptyState
                  icon="🕊"
                  title={tributeFilter === "all" ? t.memProfileNoTributes : `No ${tributeFilter} tributes`}
                  action={
                    permissions?.canLeaveTribute && tributeFilter === "all" && (
                      <button onClick={() => setSheet("tribute")} style={{
                        fontSize: 12, color: GOLD, background: "rgba(212,168,67,0.1)",
                        border: `1px solid ${BORDER_GOLD}`, borderRadius: 8,
                        padding: "6px 14px", cursor: "pointer",
                      }}>
                        {t.memProfileActionTribute}
                      </button>
                    )
                  }
                />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {filteredTributes.map(tr => <TributeCard key={tr.id} tribute={tr} />)}
                </div>
              )}
              {tributeHasMore && tributeFilter === "all" && (
                <LoadMoreBtn
                  onLoad={loadMoreTributes}
                  loading={tributeStatus === "loading"}
                  label={t.memLoadMore}
                />
              )}
            </GlassPanel>
          </section>

          {/* ── Family ── */}
          <section>
            <SectionTitle title={t.memProfileFamilySection} icon="👪"
              action={
                permissions?.canManageFamily && (
                  <button
                    onClick={() => setSheet("family")}
                    style={{ fontSize: 11, color: GOLD, background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
                  >
                    {t.memFamilyManage}
                  </button>
                )
              }
            />
            <GlassPanel>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {person.hebrewFatherName && <FamilyRow label="Father" value={person.hebrewFatherName} />}
                {person.hebrewMotherName && <FamilyRow label="Mother" value={person.hebrewMotherName} />}
                {person.tribeAffiliation && <FamilyRow label="Tribe" value={person.tribeAffiliation} />}
                {person.occupation && <FamilyRow label="Occupation" value={person.occupation} />}
                {familyMgmt.members.length > 0 && (
                  <FamilyRow
                    label="Family"
                    value={`${familyMgmt.members.length} member${familyMgmt.members.length !== 1 ? "s" : ""}`}
                  />
                )}
                {!person.hebrewFatherName && !person.hebrewMotherName && familyMgmt.members.length === 0 && (
                  <EmptyState icon="👪" title={t.memProfileNoFamily} />
                )}
              </div>
            </GlassPanel>
          </section>

          {/* ── Upcoming Yahrzeit ── */}
          <section>
            <SectionTitle title={t.memProfileUpcomingYahrzeit} icon="🕎" />
            <GlassPanel gold>
              {yahrzeit ? (
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: isYahrzeitToday ? 14 : 0 }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: 12,
                      background: "rgba(212,168,67,0.12)", border: `1px solid ${BORDER_GOLD}`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 22, flexShrink: 0,
                    }}>🕎</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: GOLD }}>
                        {yahrzeit.daysAway === 0
                          ? t.memProfileYahrzeitToday
                          : `${t.memProfileYahrzeitNext} ${yahrzeit.gregorianDate.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`
                        }
                      </div>
                      <div style={{ fontSize: 11, color: "rgba(212,168,67,0.55)", marginTop: 3 }}>
                        {yahrzeit.hebrewDate}
                        {yahrzeit.daysAway > 0 && ` · ${yahrzeit.daysAway} ${t.memProfileDaysAway}`}
                      </div>
                    </div>
                  </div>
                  {isYahrzeitToday && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      <SuggestionRow emoji="🙏" label={t.memYahrzeitSuggestPrayer} />
                      <SuggestionRow emoji="📜" label={t.memYahrzeitSuggestPsalm} />
                    </div>
                  )}
                </div>
              ) : (
                <EmptyState icon="🕎" title={t.memProfileNoYahrzeit} />
              )}
            </GlassPanel>
          </section>

          {/* ── Location ── */}
          {(person.birthCity || person.birthCountry || person.deathCity || person.deathCountry) && (
            <section>
              <SectionTitle title={t.memProfileLocationSection} icon="📍" />
              <GlassPanel>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {(person.birthCity || person.birthCountry) && (
                    <FamilyRow label={t.memProfileBorn}
                      value={[person.birthCity, person.birthCountry].filter(Boolean).join(", ")} />
                  )}
                  {(person.deathCity || person.deathCountry) && (
                    <FamilyRow label={t.memProfileDied}
                      value={[person.deathCity, person.deathCountry].filter(Boolean).join(", ")} />
                  )}
                </div>
              </GlassPanel>
            </section>
          )}

        </div>
      </div>

      {/* ── Sheets ── */}
      {sheet === "candle" && (
        <CandleSheet onClose={() => setSheet(null)} onLight={handleLight} t={t} />
      )}
      {sheet === "tribute" && (
        <TributeSheet onClose={() => setSheet(null)} onSubmit={submit} t={t} />
      )}
      {sheet === "family" && permissions?.canManageFamily && (
        <FamilyManagementSheet
          family={familyMgmt.family}
          members={familyMgmt.members}
          onClose={() => setSheet(null)}
          invite={familyMgmt.invite}
          updateRole={familyMgmt.updateRole}
          remove={familyMgmt.remove}
          t={t}
        />
      )}
    </>
  );
}
