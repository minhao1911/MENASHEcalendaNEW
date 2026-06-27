import { useState, useCallback } from "react";
import { HDate } from "@hebcal/core";
import { useLanguage } from "../../../context/LanguageContext";
import { useOnlineStatus } from "../../../hooks/useOnlineStatus";
import { GOLD, GOLD_GRAD, BORDER_GOLD } from "../../../lib/theme";
import { useMemorial } from "../hooks/useMemorial";
import { useCandles } from "../hooks/useCandles";
import { useTributes } from "../hooks/useTributes";
import { useMemorialPermissions } from "../hooks/useMemorialPermissions";
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
  LightCandleInput,
  AddTributeInput,
  PrivacyLevel,
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
  } catch {
    return null;
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return iso;
  }
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
      (gDate.getTime() - new Date().setHours(0, 0, 0, 0)) /
        (1000 * 60 * 60 * 24),
    );
    return { hebrewDate: yahrzeit.toString(), gregorianDate: gDate, daysAway };
  } catch {
    return null;
  }
}

// ── Sub-components ────────────────────────────────────────────────────────────

const PRIVACY_CONFIG: Record<
  PrivacyLevel,
  { label: string; color: string; bg: string }
> = {
  private:   { label: "Private",   color: "#e07070", bg: "rgba(224,112,112,0.12)" },
  family:    { label: "Family",    color: "#70a0e0", bg: "rgba(112,160,224,0.12)" },
  community: { label: "Community", color: GOLD,      bg: "rgba(212,168,67,0.10)"  },
  public:    { label: "Public",    color: "#70d070", bg: "rgba(112,208,112,0.10)" },
};

function PrivacyBadge({ level }: { level: PrivacyLevel }) {
  const cfg = PRIVACY_CONFIG[level] ?? PRIVACY_CONFIG.public;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "0.06em",
        color: cfg.color,
        background: cfg.bg,
        border: `1px solid ${cfg.color}33`,
        borderRadius: 20,
        padding: "2px 8px",
      }}
    >
      {level === "private" && "🔒 "}
      {level === "family" && "👪 "}
      {level === "community" && "✡ "}
      {level === "public" && "🌐 "}
      {cfg.label}
    </span>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
  disabled,
  gold,
}: {
  icon: string;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  gold?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 5,
        padding: "10px 6px",
        background: gold
          ? "linear-gradient(135deg,rgba(212,168,67,0.14),rgba(212,168,67,0.06))"
          : "rgba(255,255,255,0.04)",
        border: gold
          ? `1px solid ${BORDER_GOLD}`
          : "1px solid rgba(255,255,255,0.07)",
        borderRadius: 14,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <span style={{ fontSize: 20 }}>{icon}</span>
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.04em",
          color: gold ? GOLD : "rgba(255,255,255,0.55)",
          lineHeight: 1.2,
          textAlign: "center",
        }}
      >
        {label}
      </span>
    </button>
  );
}

// ── Candle Sheet ──────────────────────────────────────────────────────────────

const CANDLE_TYPES: { value: CandleType; label: string; emoji: string }[] = [
  { value: "memorial",  label: "Memorial",  emoji: "🕯" },
  { value: "yahrzeit",  label: "Yahrzeit",  emoji: "🕎" },
  { value: "neshama",   label: "Neshama",   emoji: "✨" },
  { value: "shabbat",   label: "Shabbat",   emoji: "🕍" },
  { value: "shloshim",  label: "Shloshim",  emoji: "🤍" },
];

function CandleSheet({
  onClose,
  onLight,
}: {
  onClose: () => void;
  onLight: (input: LightCandleInput) => Promise<void>;
}) {
  const [type, setType] = useState<CandleType>("memorial");
  const [message, setMessage] = useState("");
  const [guestName, setGuestName] = useState("");
  const [anon, setAnon] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleLight = useCallback(async () => {
    setSubmitting(true);
    setErr(null);
    try {
      await onLight({
        candleType: type,
        message: message.trim() || undefined,
        guestName: guestName.trim() || undefined,
        isAnonymous: anon,
      });
      setDone(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to light candle");
    } finally {
      setSubmitting(false);
    }
  }, [onLight, type, message, guestName, anon]);

  return (
    <BottomSheet onClose={onClose}>
      <div style={{ fontSize: 18, fontWeight: 800, color: GOLD, marginBottom: 16 }}>
        🕯 Light a Candle
      </div>

      {done ? (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🕯</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: GOLD }}>Candle Lit</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 6 }}>
            May their memory be a blessing
          </div>
          <button
            onClick={onClose}
            style={closeBtnStyle}
          >
            Close
          </button>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 14 }}>
            <div style={labelStyle}>Candle Type</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {CANDLE_TYPES.map((ct) => (
                <button
                  key={ct.value}
                  onClick={() => setType(ct.value)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 600,
                    background:
                      type === ct.value
                        ? "rgba(212,168,67,0.18)"
                        : "rgba(255,255,255,0.05)",
                    border:
                      type === ct.value
                        ? `1px solid ${GOLD}`
                        : "1px solid rgba(255,255,255,0.1)",
                    color: type === ct.value ? GOLD : "rgba(255,255,255,0.5)",
                    cursor: "pointer",
                  }}
                >
                  {ct.emoji} {ct.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={labelStyle}>Message (optional)</div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="A few words in their memory…"
              maxLength={280}
              rows={2}
              style={textareaStyle}
            />
          </div>

          {!anon && (
            <div style={{ marginBottom: 12 }}>
              <div style={labelStyle}>Your name (optional)</div>
              <input
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Leave blank to omit"
                style={inputStyle}
              />
            </div>
          )}

          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={anon}
              onChange={(e) => setAnon(e.target.checked)}
              style={{ accentColor: GOLD }}
            />
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
              Light anonymously
            </span>
          </label>

          {err && (
            <div style={{ fontSize: 12, color: "#e07070", marginBottom: 10 }}>{err}</div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} style={cancelBtnStyle}>Cancel</button>
            <button
              onClick={handleLight}
              disabled={submitting}
              style={primaryBtnStyle(submitting)}
            >
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
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (input: AddTributeInput) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [guestName, setGuestName] = useState("");
  const [anon, setAnon] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!body.trim()) {
      setErr("Please write your tribute.");
      return;
    }
    setSubmitting(true);
    setErr(null);
    try {
      await onSubmit({
        title: title.trim() || undefined,
        body: body.trim(),
        guestName: guestName.trim() || undefined,
        isAnonymous: anon,
      });
      setDone(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to submit tribute");
    } finally {
      setSubmitting(false);
    }
  }, [onSubmit, title, body, guestName, anon]);

  return (
    <BottomSheet onClose={onClose}>
      <div style={{ fontSize: 18, fontWeight: 800, color: GOLD, marginBottom: 16 }}>
        📝 Leave a Tribute
      </div>

      {done ? (
        <div style={{ textAlign: "center", padding: "20px 0" }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🕊</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: GOLD }}>
            Tribute Submitted
          </div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", marginTop: 6 }}>
            It will appear after review.
          </div>
          <button onClick={onClose} style={closeBtnStyle}>Close</button>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 12 }}>
            <div style={labelStyle}>Title (optional)</div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. A beloved father"
              maxLength={120}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={labelStyle}>Your tribute *</div>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Share a memory or words of comfort…"
              maxLength={1200}
              rows={4}
              style={textareaStyle}
            />
          </div>

          {!anon && (
            <div style={{ marginBottom: 12 }}>
              <div style={labelStyle}>Your name (optional)</div>
              <input
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Leave blank to omit"
                style={inputStyle}
              />
            </div>
          )}

          <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={anon}
              onChange={(e) => setAnon(e.target.checked)}
              style={{ accentColor: GOLD }}
            />
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>
              Submit anonymously
            </span>
          </label>

          {err && (
            <div style={{ fontSize: 12, color: "#e07070", marginBottom: 10 }}>{err}</div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={onClose} style={cancelBtnStyle}>Cancel</button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !body.trim()}
              style={primaryBtnStyle(submitting || !body.trim())}
            >
              {submitting ? "Submitting…" : "Submit Tribute"}
            </button>
          </div>
        </>
      )}
    </BottomSheet>
  );
}

// ── Generic bottom sheet ──────────────────────────────────────────────────────

function BottomSheet({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(4px)",
          zIndex: 200,
        }}
      />
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 201,
          background: "#0d1524",
          borderTop: `1px solid ${BORDER_GOLD}`,
          borderRadius: "20px 20px 0 0",
          padding: "24px 20px 36px",
          maxHeight: "85vh",
          overflowY: "auto",
        }}
      >
        {children}
      </div>
    </>
  );
}

// ── Shared style constants ─────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.06em",
  color: "rgba(255,255,255,0.35)",
  marginBottom: 6,
  textTransform: "uppercase",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 10,
  color: "rgba(255,255,255,0.85)",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: "vertical",
  minHeight: 72,
  fontFamily: "inherit",
};

const cancelBtnStyle: React.CSSProperties = {
  flex: 1,
  padding: "12px",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 12,
  color: "rgba(255,255,255,0.5)",
  fontSize: 14,
  cursor: "pointer",
};

const primaryBtnStyle = (disabled: boolean): React.CSSProperties => ({
  flex: 2,
  padding: "12px",
  background: disabled ? "rgba(212,168,67,0.12)" : GOLD_GRAD,
  border: `1px solid ${disabled ? BORDER_GOLD : "transparent"}`,
  borderRadius: 12,
  color: disabled ? "rgba(212,168,67,0.4)" : "#1a1000",
  fontSize: 14,
  fontWeight: 700,
  cursor: disabled ? "default" : "pointer",
});

const closeBtnStyle: React.CSSProperties = {
  marginTop: 16,
  padding: "10px 24px",
  background: "rgba(212,168,67,0.12)",
  border: `1px solid ${BORDER_GOLD}`,
  borderRadius: 10,
  color: GOLD,
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

// ── Main Page ─────────────────────────────────────────────────────────────────

interface MemorialProfilePageProps {
  slug: string;
  onBack: () => void;
}

export default function MemorialProfilePage({
  slug,
  onBack,
}: MemorialProfilePageProps) {
  const { t } = useLanguage();
  const isOnline = useOnlineStatus();

  const { memorial, status, error, refetch } = useMemorial(slug);
  const { candles, total: candleTotal, light } = useCandles(
    memorial?.id ?? null,
  );
  const { tributes, submit } = useTributes(memorial?.id ?? null);
  const permissions = useMemorialPermissions({ memorial });

  const [sheet, setSheet] = useState<"candle" | "tribute" | null>(null);
  const [copied, setCopied] = useState(false);

  const handleLight = useCallback(
    async (input: LightCandleInput) => {
      await light(input);
      refetch();
    },
    [light, refetch],
  );

  const handleTribute = useCallback(
    async (input: AddTributeInput) => {
      await submit(input);
    },
    [submit],
  );

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
    } catch {
      /* ignore */
    }
  }, [slug]);

  // ── Offline ──
  if (!isOnline && !memorial) {
    return (
      <PageShell onBack={onBack} title="Memorial">
        <div style={centerStyle}>
          <EmptyState
            icon="📵"
            title={t.memShellOffline}
            subtitle={t.memShellOfflineSub}
          />
        </div>
      </PageShell>
    );
  }

  // ── Loading ──
  if (status === "loading" || status === "idle") {
    return (
      <PageShell onBack={onBack} title="Memorial">
        <div style={{ padding: "20px 16px" }}>
          <LoadingState rows={5} />
        </div>
      </PageShell>
    );
  }

  // ── Error ──
  if (status === "error" || !memorial) {
    const is404 =
      error instanceof MemorialApiError && error.isNotFound;
    const is403 =
      error instanceof MemorialApiError && error.isForbidden;

    if (is403) {
      return (
        <PageShell onBack={onBack} title="Memorial">
          <div style={centerStyle}>
            <EmptyState
              icon="🔒"
              title={t.memProfilePrivate}
              subtitle={t.memProfilePrivateSub}
            />
          </div>
        </PageShell>
      );
    }

    return (
      <PageShell onBack={onBack} title="Memorial">
        <div style={centerStyle}>
          <EmptyState
            icon={is404 ? "🕊" : "⚠️"}
            title={is404 ? t.memProfileNotFound : t.memShellSearchError}
            subtitle={
              is404
                ? t.memProfileNotFoundSub
                : (error?.message ?? undefined)
            }
            action={
              !is404 && (
                <button onClick={refetch} style={closeBtnStyle}>
                  {t.memShellRetry}
                </button>
              )
            }
          />
        </div>
      </PageShell>
    );
  }

  // ── Private (published but visibility-gated) ──
  if (
    permissions &&
    !permissions.canView &&
    memorial.status === "published"
  ) {
    return (
      <PageShell onBack={onBack} title={memorial.person.fullName}>
        <div style={centerStyle}>
          <EmptyState
            icon="🔒"
            title={t.memProfilePrivate}
            subtitle={t.memProfilePrivateSub}
          />
        </div>
      </PageShell>
    );
  }

  const { person, privacy } = memorial;
  const age = calcAge(person.birthDate, person.deathDate);
  const yahrzeit = nextYahrzeit(person.deathDate);
  const approvedTributes = tributes.filter((tr) => tr.status === "approved");

  return (
    <>
      <div
        style={{
          minHeight: "100%",
          background: "var(--background, #080e1a)",
          display: "flex",
          flexDirection: "column",
          overflowY: "auto",
          overflowX: "hidden",
          paddingBottom: 80,
        }}
      >
        {/* ── Header ── */}
        <SanctuaryHeader
          onBack={onBack}
          title={person.fullName}
          subtitle={person.hebrewName ?? undefined}
        />

        {/* ── Hero ── */}
        <div
          style={{
            padding: "24px 16px 16px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
            borderBottom: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          {/* Avatar */}
          <div
            style={{
              width: 90,
              height: 90,
              borderRadius: "50%",
              background: "linear-gradient(135deg,#1a2540,#0d1524)",
              border: `2px solid ${BORDER_GOLD}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
              flexShrink: 0,
            }}
          >
            🕊
          </div>

          {/* Names */}
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: "rgba(255,255,255,0.92)",
                letterSpacing: "0.01em",
                lineHeight: 1.2,
              }}
            >
              {person.fullName}
            </div>
            {person.hebrewName && (
              <div
                style={{
                  fontSize: 16,
                  color: GOLD,
                  fontWeight: 600,
                  marginTop: 4,
                  direction: "rtl",
                }}
              >
                {person.hebrewName}
              </div>
            )}
          </div>

          {/* Privacy badge */}
          <PrivacyBadge level={privacy.visibilityLevel} />

          {/* Date / Age row */}
          <div
            style={{
              display: "flex",
              gap: 16,
              marginTop: 4,
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            {person.birthDate && (
              <InfoPill icon="🌱" label={t.memProfileBorn} value={formatDate(person.birthDate)} />
            )}
            <InfoPill icon="🕯" label={t.memProfileDied} value={formatDate(person.deathDate)} />
            {age !== null && (
              <InfoPill icon="📅" label={t.memProfileAge} value={`${age} ${t.memProfileYears}`} />
            )}
          </div>

          {/* Candle count */}
          {candleTotal > 0 && (
            <div
              style={{
                fontSize: 12,
                color: "rgba(212,168,67,0.7)",
                fontWeight: 600,
              }}
            >
              🕯 {candleTotal} {t.memCandlesCount}
            </div>
          )}
        </div>

        {/* ── Actions ── */}
        <div style={{ padding: "14px 16px" }}>
          <div style={{ display: "flex", gap: 8 }}>
            <ActionButton
              icon="🕯"
              label={t.memProfileActionLight}
              gold
              disabled={!permissions?.canLightCandle}
              onClick={() => setSheet("candle")}
            />
            <ActionButton
              icon="📝"
              label={t.memProfileActionTribute}
              disabled={!permissions?.canLeaveTribute}
              onClick={() => setSheet("tribute")}
            />
            <ActionButton
              icon="🖼"
              label={t.memProfileActionPhotos}
              disabled
            />
            <ActionButton
              icon={copied ? "✅" : "🔗"}
              label={copied ? t.memProfileCopied : t.memProfileActionShare}
              onClick={handleShare}
            />
          </div>
        </div>

        <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 18 }}>

          {/* ── Biography ── */}
          <section>
            <SectionTitle title={t.memProfileBiography} icon="📖" />
            <GlassPanel>
              {person.biography ? (
                <p
                  style={{
                    margin: 0,
                    fontSize: 14,
                    color: "rgba(255,255,255,0.7)",
                    lineHeight: 1.65,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {person.biography}
                </p>
              ) : (
                <EmptyState icon="📖" title={t.memProfileNoBio} />
              )}
            </GlassPanel>
          </section>

          {/* ── Recent Candles ── */}
          <section>
            <SectionTitle
              title={t.memProfileRecentCandles}
              icon="🕯"
              count={candleTotal || undefined}
            />
            <GlassPanel>
              {candles.length === 0 ? (
                <EmptyState
                  icon="🕯"
                  title={t.memProfileNoCandles}
                  action={
                    permissions?.canLightCandle && (
                      <button
                        onClick={() => setSheet("candle")}
                        style={{
                          fontSize: 12,
                          color: GOLD,
                          background: "rgba(212,168,67,0.1)",
                          border: `1px solid ${BORDER_GOLD}`,
                          borderRadius: 8,
                          padding: "6px 14px",
                          cursor: "pointer",
                        }}
                      >
                        {t.memProfileActionLight}
                      </button>
                    )
                  }
                />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {candles.slice(0, 5).map((c) => (
                    <div
                      key={c.id}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 10,
                      }}
                    >
                      <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>🕯</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: GOLD,
                            marginBottom: 2,
                          }}
                        >
                          {c.isAnonymous
                            ? "Anonymous"
                            : (c.guestName ?? "Community member")}
                          {" · "}
                          <span
                            style={{ fontWeight: 400, color: "rgba(212,168,67,0.55)" }}
                          >
                            {c.candleType}
                          </span>
                        </div>
                        {c.message && (
                          <div
                            style={{
                              fontSize: 12,
                              color: "rgba(255,255,255,0.5)",
                              fontStyle: "italic",
                            }}
                          >
                            "{c.message}"
                          </div>
                        )}
                      </div>
                      <div
                        style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", flexShrink: 0 }}
                      >
                        {new Date(c.litAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassPanel>
          </section>

          {/* ── Recent Tributes ── */}
          <section>
            <SectionTitle
              title={t.memProfileRecentTributes}
              icon="📝"
              count={approvedTributes.length || undefined}
            />
            <GlassPanel>
              {approvedTributes.length === 0 ? (
                <EmptyState
                  icon="🕊"
                  title={t.memProfileNoTributes}
                  action={
                    permissions?.canLeaveTribute && (
                      <button
                        onClick={() => setSheet("tribute")}
                        style={{
                          fontSize: 12,
                          color: GOLD,
                          background: "rgba(212,168,67,0.1)",
                          border: `1px solid ${BORDER_GOLD}`,
                          borderRadius: 8,
                          padding: "6px 14px",
                          cursor: "pointer",
                        }}
                      >
                        {t.memProfileActionTribute}
                      </button>
                    )
                  }
                />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {approvedTributes.slice(0, 3).map((tr) => (
                    <div key={tr.id}>
                      {tr.title && (
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: "rgba(255,255,255,0.8)",
                            marginBottom: 4,
                          }}
                        >
                          {tr.title}
                        </div>
                      )}
                      <div
                        style={{
                          fontSize: 13,
                          color: "rgba(255,255,255,0.55)",
                          lineHeight: 1.55,
                          fontStyle: "italic",
                        }}
                      >
                        "{tr.body}"
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "rgba(255,255,255,0.25)",
                          marginTop: 4,
                        }}
                      >
                        — {tr.isAnonymous ? "Anonymous" : (tr.guestName ?? "Community member")}
                        {" · "}
                        {new Date(tr.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassPanel>
          </section>

          {/* ── Family ── */}
          <section>
            <SectionTitle title={t.memProfileFamilySection} icon="👪" />
            <GlassPanel>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {person.hebrewFatherName && (
                  <FamilyRow label="Father" value={person.hebrewFatherName} />
                )}
                {person.hebrewMotherName && (
                  <FamilyRow label="Mother" value={person.hebrewMotherName} />
                )}
                {person.tribeAffiliation && (
                  <FamilyRow label="Tribe" value={person.tribeAffiliation} />
                )}
                {person.occupation && (
                  <FamilyRow label="Occupation" value={person.occupation} />
                )}
                {!person.hebrewFatherName && !person.hebrewMotherName && (
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
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      background: "rgba(212,168,67,0.12)",
                      border: `1px solid ${BORDER_GOLD}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 22,
                      flexShrink: 0,
                    }}
                  >
                    🕎
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: GOLD }}>
                      {yahrzeit.daysAway === 0
                        ? t.memProfileYahrzeitToday
                        : `${t.memProfileYahrzeitNext} ${yahrzeit.gregorianDate.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`}
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(212,168,67,0.55)", marginTop: 3 }}>
                      {yahrzeit.hebrewDate}
                      {yahrzeit.daysAway > 0 &&
                        ` · ${yahrzeit.daysAway} ${t.memProfileDaysAway}`}
                    </div>
                  </div>
                </div>
              ) : (
                <EmptyState icon="🕎" title={t.memProfileNoYahrzeit} />
              )}
            </GlassPanel>
          </section>

          {/* ── Location ── */}
          {(person.birthCity ||
            person.birthCountry ||
            person.deathCity ||
            person.deathCountry) && (
            <section>
              <SectionTitle title={t.memProfileLocationSection} icon="📍" />
              <GlassPanel>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {(person.birthCity || person.birthCountry) && (
                    <FamilyRow
                      label={t.memProfileBorn}
                      value={[person.birthCity, person.birthCountry]
                        .filter(Boolean)
                        .join(", ")}
                    />
                  )}
                  {(person.deathCity || person.deathCountry) && (
                    <FamilyRow
                      label={t.memProfileDied}
                      value={[person.deathCity, person.deathCountry]
                        .filter(Boolean)
                        .join(", ")}
                    />
                  )}
                </div>
              </GlassPanel>
            </section>
          )}

        </div>
      </div>

      {/* ── Sheets ── */}
      {sheet === "candle" && (
        <CandleSheet
          onClose={() => setSheet(null)}
          onLight={handleLight}
        />
      )}
      {sheet === "tribute" && (
        <TributeSheet
          onClose={() => setSheet(null)}
          onSubmit={handleTribute}
        />
      )}
    </>
  );
}

// ── Tiny layout helpers ───────────────────────────────────────────────────────

function PageShell({
  onBack,
  title,
  children,
}: {
  onBack: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: "100%",
        background: "var(--background, #080e1a)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <SanctuaryHeader onBack={onBack} title={title} />
      {children}
    </div>
  );
}

const centerStyle: React.CSSProperties = {
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 300,
  padding: "40px 20px",
};

function InfoPill({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
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
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "rgba(255,255,255,0.3)",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          flexShrink: 0,
          minWidth: 80,
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: 13, color: "rgba(255,255,255,0.65)" }}>
        {value}
      </span>
    </div>
  );
}
