import { useState, useEffect, useMemo, useCallback, memo } from "react";
import { useUser } from "@clerk/react";
import { HebrewCalendar, flags } from "@hebcal/core";
import {
  fetchTorahTrackerEntries,
  fetchYahrzeitEntries,
  type StudyEntryApi,
  type YartzeitEntryApi,
} from "../lib/userApi";
import { useLanguage } from "../context/LanguageContext";
import type { NotificationPrefs, LeadTime } from "../hooks/useNotifications";
import { LEAD_TIME_OPTIONS } from "../hooks/useNotifications";
import type { Announcement } from "../hooks/useAnnouncements";

// ── Types ─────────────────────────────────────────────────────────────────────
type TabId = "all" | "torah" | "prayer" | "holiday" | "community" | "account";
type NotifCategory = Exclude<TabId, "all">;

interface NotifItem {
  id: string;
  category: NotifCategory;
  icon: string;
  title: string;
  description: string;
  time: Date;
  action?: () => void;
  actionLabel?: string;
}

interface ActivityEntry {
  id: string;
  icon: string;
  title: string;
  description: string;
  time: Date;
}

// ── Read state (localStorage) ─────────────────────────────────────────────────
const READ_KEY = "menashe-notif-read-ids";
function loadReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch {}
  return new Set();
}
function saveReadIds(ids: Set<string>) {
  try { localStorage.setItem(READ_KEY, JSON.stringify([...ids])); } catch {}
}

// ── Time formatters ──────────────────────────────────────────────────────────
function fmtRelTime(date: Date): string {
  const diff = Date.now() - date.getTime();
  if (diff < 0) {
    const d = Math.ceil(-diff / 86400000);
    if (d <= 0) return "today";
    if (d === 1) return "tomorrow";
    if (d < 7) return `in ${d}d`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtFutureLabel(date: Date): string {
  const diff = date.getTime() - Date.now();
  const days = Math.ceil(diff / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "tomorrow";
  if (days < 7) return `in ${days} days`;
  return `on ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
}

// ── Notification builders ─────────────────────────────────────────────────────
function buildTorahItems(entries: StudyEntryApi[], onOpen: () => void): NotifItem[] {
  return [...entries]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 20)
    .map(e => ({
      id: `study-${e.id}`,
      category: "torah" as const,
      icon: "📖",
      title: `${e.subject} session completed`,
      description: `${e.duration} min${e.description ? ` · ${e.description}` : ""}`,
      time: new Date(e.date + "T12:00:00"),
      action: onOpen,
      actionLabel: "Log More",
    }));
}

function buildCommunityItems(announcements: Announcement[], onView: () => void): NotifItem[] {
  return announcements
    .filter(a => a.status === "sent")
    .sort((a, b) => (b.sentAt ?? "").localeCompare(a.sentAt ?? ""))
    .slice(0, 20)
    .map(a => ({
      id: `ann-${a.id}`,
      category: "community" as const,
      icon: a.emoji || "📢",
      title: a.title,
      description: a.body,
      time: a.sentAt ? new Date(a.sentAt) : new Date(0),
      action: onView,
      actionLabel: "View",
    }));
}

function buildHolidayItems(): NotifItem[] {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const end = new Date(today); end.setDate(end.getDate() + 60);
    const events = HebrewCalendar.calendar({
      start: today, end, il: true, isHebrewYear: false,
      mask: flags.CHAG | flags.MODERN_HOLIDAY | flags.ROSH_CHODESH,
    });
    const seen = new Set<string>();
    return events
      .filter(ev => { const k = ev.render("en"); if (seen.has(k)) return false; seen.add(k); return true; })
      .slice(0, 15)
      .map(ev => {
        const greg = ev.getDate().greg();
        return {
          id: `hol-${ev.render("en").replace(/\W+/g, "-").toLowerCase()}`,
          category: "holiday" as const,
          icon: "✡",
          title: ev.render("en"),
          description: `Upcoming ${fmtFutureLabel(greg)}`,
          time: greg,
        };
      });
  } catch { return []; }
}

function buildPrayerItems(prefs: NotificationPrefs): NotifItem[] {
  const now = new Date();
  const items: NotifItem[] = [];
  if (prefs.prayers)       items.push({ id: "prayer-daily",   category: "prayer", icon: "🌅", title: "Daily Prayer Reminders",   description: "Shacharit, Mincha & Maariv alerts are active",    time: now });
  if (prefs.shema)         items.push({ id: "prayer-shema",   category: "prayer", icon: "📜", title: "Latest Shema Reminder",    description: "You'll be notified before the Shema deadline",   time: now });
  if (prefs.shabbat)       items.push({ id: "prayer-candle",  category: "prayer", icon: "🕯️", title: "Shabbat Candle Lighting",  description: "Reminder 18 min before candle lighting",         time: now });
  if (prefs.havdalah)      items.push({ id: "prayer-havd",    category: "prayer", icon: "✨", title: "Havdalah Reminder",         description: "You'll be notified at nightfall",                time: now });
  if (prefs.shabbatDigest) items.push({ id: "prayer-digest",  category: "prayer", icon: "📋", title: "Shabbat Digest",            description: "Weekly summary every Friday morning at 8 AM",    time: now });
  return items;
}

function buildAccountItems(
  user: { createdAt?: Date | number | string | null } | null,
  isPremium: boolean,
  yahrzeitEntries: YartzeitEntryApi[],
): NotifItem[] {
  const items: NotifItem[] = [];
  if (user?.createdAt) {
    items.push({
      id: "acc-joined",
      category: "account",
      icon: "🙏",
      title: "Welcome to Bnei Menashe Calendar",
      description: `Member since ${new Date(user.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}`,
      time: new Date(user.createdAt),
    });
  }
  if (isPremium) {
    items.push({
      id: "acc-premium",
      category: "account",
      icon: "👑",
      title: "Premium Activated",
      description: "Full access to all features unlocked",
      time: new Date(),
    });
  }
  for (const y of yahrzeitEntries.slice(0, 5)) {
    items.push({
      id: `acc-yahr-${y.id}`,
      category: "account",
      icon: "🕯",
      title: `Yahrzeit: ${y.name}`,
      description: `Annual reminder set for ${y.name}`,
      time: new Date(),
    });
  }
  return items;
}

function buildActivityFeed(
  studyEntries: StudyEntryApi[],
  announcements: Announcement[],
  yahrzeitEntries: YartzeitEntryApi[],
): ActivityEntry[] {
  const items: ActivityEntry[] = [];
  for (const e of studyEntries.slice(0, 10)) {
    items.push({
      id: `act-study-${e.id}`,
      icon: "📖",
      title: `${e.subject} study session`,
      description: `${e.duration} min${e.description ? ` · ${e.description}` : ""}`,
      time: new Date(e.date + "T12:00:00"),
    });
  }
  for (const a of announcements.filter(a => a.status === "sent").slice(0, 5)) {
    items.push({
      id: `act-ann-${a.id}`,
      icon: a.emoji || "📢",
      title: a.title,
      description: a.body.slice(0, 80) + (a.body.length > 80 ? "…" : ""),
      time: a.sentAt ? new Date(a.sentAt) : new Date(0),
    });
  }
  for (const y of yahrzeitEntries.slice(0, 3)) {
    items.push({
      id: `act-yahr-${y.id}`,
      icon: "🕯",
      title: "Yahrzeit reminder set",
      description: `Remembering ${y.name}`,
      time: new Date(),
    });
  }
  return items.sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 20);
}

// ── Sub-components ────────────────────────────────────────────────────────────

const SkeletonCard = memo(function SkeletonCard() {
  return (
    <div style={{
      padding: "14px 16px",
      borderBottom: "1px solid var(--border)",
      display: "flex", gap: 12,
    }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--border)", flexShrink: 0, opacity: 0.5 }} />
      <div style={{ flex: 1 }}>
        <div style={{ height: 12, background: "var(--border)", borderRadius: 6, marginBottom: 8, width: "55%", opacity: 0.5 }} />
        <div style={{ height: 10, background: "var(--border)", borderRadius: 6, width: "80%", opacity: 0.4 }} />
      </div>
    </div>
  );
});

const EmptyState = memo(function EmptyState({
  onCta, ctaLabel,
}: { onCta: () => void; ctaLabel: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        padding: "44px 24px", textAlign: "center",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
      }}
    >
      <div style={{
        width: 76, height: 76, borderRadius: "50%",
        background: "linear-gradient(145deg, rgba(212,168,67,0.1), transparent)",
        border: "1.5px solid rgba(212,168,67,0.2)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 34,
      }}>
        🔔
      </div>
      <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)", marginTop: 4 }}>
        You're all caught up
      </div>
      <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.65, maxWidth: 220 }}>
        No new notifications right now.
      </div>
      <button
        type="button"
        onClick={onCta}
        style={{
          marginTop: 6, padding: "10px 22px", borderRadius: 22,
          background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.35)",
          color: "#d4a843", fontSize: 13, fontWeight: 700, cursor: "pointer",
          transition: "background 0.15s",
        }}
      >
        {ctaLabel}
      </button>
    </div>
  );
});

const ErrorState = memo(function ErrorState({
  onRetry, retryLabel,
}: { onRetry: () => void; retryLabel: string }) {
  return (
    <div role="alert" style={{ padding: "40px 24px", textAlign: "center" }}>
      <div style={{ fontSize: 38, marginBottom: 12 }}>⚠️</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
        Something went wrong
      </div>
      <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16, lineHeight: 1.6 }}>
        We couldn't load your notifications.
      </div>
      <button
        type="button"
        onClick={onRetry}
        style={{
          padding: "10px 20px", borderRadius: 10,
          background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.3)",
          color: "#d4a843", fontSize: 13, fontWeight: 700, cursor: "pointer",
        }}
      >
        {retryLabel}
      </button>
    </div>
  );
});

const NotifCard = memo(function NotifCard({
  item, isRead, onMarkRead,
}: {
  item: NotifItem;
  isRead: boolean;
  onMarkRead: (id: string) => void;
}) {
  const handleClick = useCallback(() => {
    if (!isRead) onMarkRead(item.id);
  }, [isRead, item.id, onMarkRead]);

  const handleAction = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onMarkRead(item.id);
    item.action?.();
  }, [item, onMarkRead]);

  return (
    <div
      role="article"
      aria-label={`${isRead ? "" : "Unread: "}${item.title}`}
      onClick={handleClick}
      style={{
        display: "flex", gap: 12,
        padding: "14px 16px",
        borderBottom: "1px solid var(--border)",
        borderLeft: isRead ? "3px solid transparent" : "3px solid var(--gold)",
        background: isRead ? "transparent" : "rgba(212,168,67,0.035)",
        cursor: isRead ? "default" : "pointer",
        transition: "background 0.18s, border-color 0.18s",
        position: "relative",
      }}
    >
      {/* Icon bubble */}
      <div style={{
        width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
        background: isRead ? "var(--elevated)" : "rgba(212,168,67,0.1)",
        border: `1px solid ${isRead ? "var(--border)" : "rgba(212,168,67,0.22)"}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 15,
      }} aria-hidden>
        {item.icon}
      </div>

      {/* Body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 3 }}>
          <div style={{
            fontSize: 13,
            fontWeight: isRead ? 500 : 700,
            color: isRead ? "var(--text-secondary)" : "var(--text-primary)",
            lineHeight: 1.4,
          }}>
            {item.title}
          </div>
          <time
            dateTime={item.time.toISOString()}
            style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap", flexShrink: 0, marginTop: 1 }}
          >
            {fmtRelTime(item.time)}
          </time>
        </div>

        <div style={{
          fontSize: 12, color: "var(--text-muted)", lineHeight: 1.55,
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          // @ts-ignore
          WebkitBoxOrient: "vertical",
          opacity: isRead ? 0.65 : 1,
        }}>
          {item.description}
        </div>

        {item.action && item.actionLabel && (
          <button
            type="button"
            onClick={handleAction}
            aria-label={item.actionLabel}
            style={{
              marginTop: 7, padding: "4px 11px", borderRadius: 6,
              background: "rgba(212,168,67,0.08)", border: "1px solid rgba(212,168,67,0.22)",
              color: "#d4a843", fontSize: 11, fontWeight: 700, cursor: "pointer",
              transition: "background 0.12s",
            }}
          >
            {item.actionLabel}
          </button>
        )}
      </div>

      {/* Unread dot */}
      {!isRead && (
        <div
          aria-hidden
          style={{
            position: "absolute", top: 13, right: 13,
            width: 7, height: 7, borderRadius: "50%",
            background: "var(--gold)",
            boxShadow: "0 0 6px rgba(212,168,67,0.55)",
          }}
        />
      )}
    </div>
  );
});

const ActivityRow = memo(function ActivityRow({
  item, isLast,
}: { item: ActivityEntry; isLast: boolean }) {
  return (
    <div style={{
      display: "flex", gap: 12, padding: "12px 16px",
      borderBottom: isLast ? "none" : "1px solid var(--border)",
    }}>
      <div style={{
        width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
        background: "var(--elevated)", border: "1px solid var(--border)",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 13,
      }} aria-hidden>
        {item.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 2 }}>
          {item.title}
        </div>
        <div style={{
          fontSize: 11, color: "var(--text-muted)",
          overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis",
        }}>
          {item.description}
        </div>
      </div>
      <time
        dateTime={item.time.toISOString()}
        style={{ fontSize: 11, color: "var(--text-muted)", whiteSpace: "nowrap", flexShrink: 0, marginTop: 2 }}
      >
        {fmtRelTime(item.time)}
      </time>
    </div>
  );
});

const ToggleRow = memo(function ToggleRow({
  label, sub, checked, onChange, disabled, isLast,
}: {
  label: string; sub?: string; checked: boolean;
  onChange: () => void; disabled?: boolean; isLast?: boolean;
}) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "13px 16px",
      borderBottom: isLast ? "none" : "1px solid var(--border)",
      opacity: disabled ? 0.45 : 1,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{sub}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={disabled ? undefined : onChange}
        style={{
          width: 44, height: 26, borderRadius: 13, border: "none",
          background: checked ? "var(--gold)" : "var(--border)",
          cursor: disabled ? "default" : "pointer",
          position: "relative", flexShrink: 0,
          transition: "background 0.2s",
          outline: "none",
        }}
        onFocus={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 2px rgba(212,168,67,0.4)"; }}
        onBlur={e => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
      >
        <span style={{
          position: "absolute", top: 3, left: checked ? 21 : 3,
          width: 20, height: 20, borderRadius: "50%",
          background: "white",
          transition: "left 0.2s",
          boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
          display: "block",
        }} />
      </button>
    </div>
  );
});

const QuickBtn = memo(function QuickBtn({
  icon, label, onClick,
}: { icon: string; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      style={{
        flex: "1 1 calc(50% - 5px)", minWidth: 0,
        padding: "13px 8px",
        background: "var(--elevated)", border: "1px solid var(--border)",
        borderRadius: 14, cursor: "pointer",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
        transition: "border-color 0.15s, transform 0.1s",
        outline: "none",
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(212,168,67,0.4)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
      onMouseDown={e => { (e.currentTarget as HTMLElement).style.transform = "scale(0.96)"; }}
      onMouseUp={e => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
      onFocus={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 2px rgba(212,168,67,0.35)"; }}
      onBlur={e => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
    >
      <span style={{ fontSize: 22 }} aria-hidden>{icon}</span>
      <span style={{
        fontSize: 11, fontWeight: 700, color: "var(--text-secondary)",
        textAlign: "center", lineHeight: 1.3,
      }}>
        {label}
      </span>
    </button>
  );
});

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11, fontWeight: 800, color: "var(--gold)",
      letterSpacing: "0.10em", textTransform: "uppercase",
      marginBottom: 8, paddingLeft: 2,
    }}>
      {children}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: "var(--elevated)",
      border: "1px solid var(--border)",
      borderRadius: 16, overflow: "hidden",
    }}>
      {children}
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  notifPermission: NotificationPermission;
  notifPrefs: NotificationPrefs;
  leadTime: LeadTime;
  onUpdateNotifPref: (key: keyof NotificationPrefs, value: boolean) => Promise<boolean>;
  onUpdateLeadTime: (mins: LeadTime) => void;
  pushSubscribed: boolean;
  pushSupported: boolean;
  pushLoading: boolean;
  pushError: string | null;
  onSubscribePush: () => Promise<boolean>;
  onUnsubscribePush: () => Promise<void>;
  onSendTestPush: () => Promise<boolean>;
  announcements: Announcement[];
  isPremium: boolean;
  onNavigate: (page: string) => void;
  onShowTorahTracker: () => void;
  onShowPrayers: () => void;
  onShowYartzeit: () => void;
  onShowCommunity: () => void;
  onShowAnnouncements: () => void;
}

// ── Main page component ───────────────────────────────────────────────────────
const NotificationsPage = memo(function NotificationsPage({
  notifPermission,
  notifPrefs,
  leadTime,
  onUpdateNotifPref,
  onUpdateLeadTime,
  pushSubscribed,
  pushSupported,
  pushLoading,
  pushError,
  onSubscribePush,
  onUnsubscribePush,
  onSendTestPush,
  announcements,
  isPremium,
  onNavigate: _onNavigate,
  onShowTorahTracker,
  onShowPrayers,
  onShowYartzeit,
  onShowCommunity,
  onShowAnnouncements,
}: Props) {
  const { user, isLoaded } = useUser();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<TabId>("all");
  const [readIds, setReadIds] = useState<Set<string>>(loadReadIds);
  const [studyEntries, setStudyEntries] = useState<StudyEntryApi[]>([]);
  const [yahrzeitEntries, setYahrzeitEntries] = useState<YartzeitEntryApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  // ── Data fetch ──────────────────────────────────────────────────────────────
  const loadData = useCallback(() => {
    if (!isLoaded || !user) { setLoading(false); return; }
    setLoading(true);
    setLoadError(false);
    Promise.all([
      fetchTorahTrackerEntries().catch(() => [] as StudyEntryApi[]),
      fetchYahrzeitEntries().catch(() => [] as YartzeitEntryApi[]),
    ]).then(([study, yahrzeit]) => {
      setStudyEntries(study);
      setYahrzeitEntries(yahrzeit);
      setLoading(false);
    }).catch(() => {
      setLoadError(true);
      setLoading(false);
    });
  }, [isLoaded, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadData(); }, [loadData]);

  // ── Build notifications ─────────────────────────────────────────────────────
  const allNotifs = useMemo<NotifItem[]>(() => {
    const torah     = buildTorahItems(studyEntries, onShowTorahTracker);
    const community = buildCommunityItems(announcements, onShowAnnouncements);
    const holidays  = buildHolidayItems();
    const prayer    = buildPrayerItems(notifPrefs);
    const account   = buildAccountItems(user, isPremium, yahrzeitEntries);
    return [...torah, ...community, ...holidays, ...prayer, ...account]
      .sort((a, b) => b.time.getTime() - a.time.getTime());
  }, [
    studyEntries, announcements, notifPrefs, user, isPremium,
    yahrzeitEntries, onShowTorahTracker, onShowAnnouncements,
  ]);

  const filteredNotifs = useMemo<NotifItem[]>(() => {
    if (activeTab === "all") return allNotifs;
    return allNotifs.filter(n => n.category === activeTab);
  }, [allNotifs, activeTab]);

  const unreadCount = useMemo(
    () => allNotifs.filter(n => !readIds.has(n.id)).length,
    [allNotifs, readIds],
  );

  const activityItems = useMemo(
    () => buildActivityFeed(studyEntries, announcements, yahrzeitEntries),
    [studyEntries, announcements, yahrzeitEntries],
  );

  // ── Handlers ────────────────────────────────────────────────────────────────
  const markRead = useCallback((id: string) => {
    setReadIds(prev => { const n = new Set([...prev, id]); saveReadIds(n); return n; });
  }, []);

  const markAllRead = useCallback(() => {
    setReadIds(prev => { const n = new Set([...prev, ...allNotifs.map(x => x.id)]); saveReadIds(n); return n; });
  }, [allNotifs]);

  const togglePref = useCallback(async (key: keyof NotificationPrefs) => {
    await onUpdateNotifPref(key, !notifPrefs[key]);
  }, [notifPrefs, onUpdateNotifPref]);

  // ── Tabs ────────────────────────────────────────────────────────────────────
  const TABS: { id: TabId; label: string }[] = useMemo(() => [
    { id: "all",       label: t.notifTabAll },
    { id: "torah",     label: t.notifTabTorah },
    { id: "prayer",    label: t.notifTabPrayer },
    { id: "holiday",   label: t.notifTabHolidays },
    { id: "community", label: t.notifTabCommunity },
    { id: "account",   label: t.notifTabAccount },
  ], [t]);

  const permissionBlocked = notifPermission === "denied";

  // ── Unauthenticated state ───────────────────────────────────────────────────
  if (isLoaded && !user) {
    return (
      <div style={{
        minHeight: "60dvh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "40px 24px", gap: 14, textAlign: "center",
      }}>
        <div style={{ fontSize: 52 }}>🔔</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
          {t.notifPageTitle}
        </div>
        <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
          Sign in to see your personalised alerts and activity.
        </div>
      </div>
    );
  }

  return (
    <div
      style={{ padding: "16px 16px 100px", maxWidth: 600, margin: "0 auto" }}
      aria-label={t.notifPageTitle}
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        marginBottom: 22,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 13,
            background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.22)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 19,
          }} aria-hidden>
            🔔
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", lineHeight: 1, margin: 0 }}>
              {t.notifPageTitle}
            </h1>
            {unreadCount > 0 && (
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                {unreadCount} unread
              </div>
            )}
          </div>
        </div>
        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            aria-label={t.notifMarkAllRead}
            style={{
              padding: "7px 13px", borderRadius: 10,
              background: "rgba(212,168,67,0.08)", border: "1px solid rgba(212,168,67,0.25)",
              color: "#d4a843", fontSize: 12, fontWeight: 700, cursor: "pointer",
              transition: "background 0.15s",
            }}
          >
            {t.notifMarkAllRead}
          </button>
        )}
      </div>

      {/* ── Quick Actions ────────────────────────────────────────────────── */}
      <section aria-label={t.notifQuickActions} style={{ marginBottom: 24 }}>
        <SectionLabel>{t.notifQuickActions}</SectionLabel>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <QuickBtn icon="📖" label={t.notifResumeStudy}   onClick={onShowTorahTracker} />
          <QuickBtn icon="🕐" label={t.notifPrayerTimes}   onClick={onShowPrayers} />
          <QuickBtn icon="🕯" label={t.notifOpenYahrzeit}  onClick={onShowYartzeit} />
          <QuickBtn icon="🤝" label={t.notifOpenCommunity} onClick={onShowCommunity} />
        </div>
      </section>

      {/* ── Tab bar ──────────────────────────────────────────────────────── */}
      <div
        role="tablist"
        aria-label="Notification categories"
        style={{
          display: "flex", gap: 6, overflowX: "auto",
          paddingBottom: 4, marginBottom: 12,
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
      >
        {TABS.map(tab => {
          const isActive = activeTab === tab.id;
          const tabCount = tab.id === "all"
            ? allNotifs.filter(n => !readIds.has(n.id)).length
            : allNotifs.filter(n => n.category === tab.id && !readIds.has(n.id)).length;
          return (
            <button
              key={tab.id}
              role="tab"
              type="button"
              aria-selected={isActive}
              aria-controls={`notif-panel-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flexShrink: 0, display: "flex", alignItems: "center", gap: 5,
                padding: "6px 14px", borderRadius: 20,
                background: isActive ? "rgba(212,168,67,0.13)" : "var(--elevated)",
                border: `1px solid ${isActive ? "rgba(212,168,67,0.42)" : "var(--border)"}`,
                color: isActive ? "#d4a843" : "var(--text-muted)",
                fontSize: 12, fontWeight: isActive ? 700 : 500,
                cursor: "pointer", transition: "all 0.15s",
                outline: "none",
              }}
              onFocus={e => { (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 2px rgba(212,168,67,0.35)"; }}
              onBlur={e => { (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
            >
              {tab.label}
              {tabCount > 0 && (
                <span style={{
                  minWidth: 16, height: 16, borderRadius: 8, padding: "0 4px",
                  background: isActive ? "rgba(212,168,67,0.25)" : "rgba(212,168,67,0.15)",
                  color: "#d4a843", fontSize: 10, fontWeight: 800,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {tabCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Notifications panel ──────────────────────────────────────────── */}
      <section
        id={`notif-panel-${activeTab}`}
        role="tabpanel"
        aria-label={`${activeTab} notifications`}
        style={{ marginBottom: 24 }}
      >
        <Card>
          {loading ? (
            <> <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard /> </>
          ) : loadError ? (
            <ErrorState onRetry={loadData} retryLabel={t.notifRetry} />
          ) : filteredNotifs.length === 0 ? (
            <EmptyState onCta={onShowTorahTracker} ctaLabel={t.notifEmptyCta} />
          ) : (
            filteredNotifs.map(item => (
              <NotifCard
                key={item.id}
                item={item}
                isRead={readIds.has(item.id)}
                onMarkRead={markRead}
              />
            ))
          )}
        </Card>
      </section>

      {/* ── Activity Feed ────────────────────────────────────────────────── */}
      <section aria-label={t.notifActivityTitle} style={{ marginBottom: 24 }}>
        <SectionLabel>{t.notifActivityTitle}</SectionLabel>
        <Card>
          {loading ? (
            <> <SkeletonCard /><SkeletonCard /><SkeletonCard /> </>
          ) : activityItems.length === 0 ? (
            <div style={{ padding: "28px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 10 }}>
                {t.notifNoActivity}
              </div>
              <button
                type="button"
                onClick={onShowTorahTracker}
                style={{
                  fontSize: 12, fontWeight: 700, color: "#d4a843",
                  background: "none", border: "none", cursor: "pointer", padding: 0,
                }}
              >
                {t.notifStartStudy}
              </button>
            </div>
          ) : (
            activityItems.map((item, idx) => (
              <ActivityRow key={item.id} item={item} isLast={idx === activityItems.length - 1} />
            ))
          )}
        </Card>
      </section>

      {/* ── Notification Settings ────────────────────────────────────────── */}
      <section aria-label={t.notifSettingsTitle} style={{ marginBottom: 24 }}>
        <SectionLabel>{t.notifSettingsTitle}</SectionLabel>

        {permissionBlocked && (
          <div
            role="alert"
            style={{
              padding: "12px 14px", borderRadius: 12, marginBottom: 10,
              background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.22)",
              display: "flex", alignItems: "flex-start", gap: 10,
            }}
          >
            <span style={{ fontSize: 17, flexShrink: 0 }} aria-hidden>🔕</span>
            <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.55 }}>
              {t.notifPermissionDenied}
            </div>
          </div>
        )}

        <Card>
          <ToggleRow label={t.notifPrayerReminders}  sub={t.notifPrayerRemindersSub}  checked={notifPrefs.prayers}       onChange={() => togglePref("prayers")}       disabled={permissionBlocked} />
          <ToggleRow label={t.notifShabbatCandles}   sub={t.notifShabbatCandlesSub}   checked={notifPrefs.shabbat}        onChange={() => togglePref("shabbat")}       disabled={permissionBlocked} />
          <ToggleRow label={t.notifHavdalahReminder}                                  checked={notifPrefs.havdalah}       onChange={() => togglePref("havdalah")}      disabled={permissionBlocked} />
          <ToggleRow label={t.notifShemaReminder}    sub={t.notifShemaReminderSub}    checked={notifPrefs.shema}          onChange={() => togglePref("shema")}         disabled={permissionBlocked} />
          <ToggleRow label={t.notifTorahReminders}   sub={t.notifTorahRemindersSub}   checked={notifPrefs.parasha}        onChange={() => togglePref("parasha")}       disabled={permissionBlocked} />
          <ToggleRow label={t.notifHolidayReminders} sub={t.notifHolidayRemindersSub} checked={notifPrefs.holiday}        onChange={() => togglePref("holiday")}       disabled={permissionBlocked} />
          <ToggleRow label={t.notifYahrzeitReminders}                                 checked={notifPrefs.yahrzeit}       onChange={() => togglePref("yahrzeit")}      disabled={permissionBlocked} />
          <ToggleRow label={t.notifOmerCount}                                         checked={notifPrefs.omer}           onChange={() => togglePref("omer")}          disabled={permissionBlocked} />
          <ToggleRow label={t.notifShabbatDigest}    sub={t.notifShabbatDigestSub}    checked={notifPrefs.shabbatDigest} onChange={() => togglePref("shabbatDigest")} disabled={permissionBlocked} isLast />
        </Card>

        {/* Lead time chips */}
        <div style={{
          background: "var(--elevated)", border: "1px solid var(--border)",
          borderRadius: 14, padding: "13px 16px", marginTop: 10,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 10 }}>
            {t.notifLeadTime}
          </div>
          <div role="radiogroup" aria-label={t.notifLeadTime} style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {LEAD_TIME_OPTIONS.map(mins => (
              <button
                key={mins}
                type="button"
                role="radio"
                aria-checked={leadTime === mins}
                onClick={() => onUpdateLeadTime(mins)}
                style={{
                  padding: "5px 14px", borderRadius: 20,
                  background: leadTime === mins ? "rgba(212,168,67,0.14)" : "transparent",
                  border: `1px solid ${leadTime === mins ? "rgba(212,168,67,0.42)" : "var(--border)"}`,
                  color: leadTime === mins ? "#d4a843" : "var(--text-muted)",
                  fontSize: 12, fontWeight: 600, cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {mins} min
              </button>
            ))}
          </div>
        </div>

        {/* Push notifications card */}
        {pushSupported && (
          <div style={{
            background: "var(--elevated)", border: "1px solid var(--border)",
            borderRadius: 14, padding: "14px 16px", marginTop: 10,
          }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", marginBottom: 3 }}>
                  {t.notifPushNotifications}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>
                  {pushSubscribed
                    ? "Push alerts are active"
                    : "Get alerts even when the app is closed"}
                </div>
                {pushError && (
                  <div style={{ fontSize: 11, color: "#ef4444", marginTop: 4 }}>{pushError}</div>
                )}
              </div>
              <button
                type="button"
                onClick={pushSubscribed ? onUnsubscribePush : onSubscribePush}
                disabled={pushLoading}
                aria-label={pushSubscribed ? t.notifPushUnsubscribe : t.notifPushSubscribe}
                style={{
                  padding: "7px 13px", borderRadius: 10, flexShrink: 0,
                  background: pushSubscribed ? "rgba(239,68,68,0.08)" : "rgba(212,168,67,0.1)",
                  border: `1px solid ${pushSubscribed ? "rgba(239,68,68,0.28)" : "rgba(212,168,67,0.28)"}`,
                  color: pushSubscribed ? "#ef4444" : "#d4a843",
                  fontSize: 12, fontWeight: 700,
                  cursor: pushLoading ? "default" : "pointer",
                  opacity: pushLoading ? 0.6 : 1,
                  transition: "all 0.15s",
                }}
              >
                {pushLoading ? "…" : pushSubscribed ? t.notifPushUnsubscribe : t.notifPushSubscribe}
              </button>
            </div>
            {pushSubscribed && (
              <button
                type="button"
                onClick={onSendTestPush}
                aria-label={t.notifPushTest}
                style={{
                  marginTop: 10, padding: "6px 13px", borderRadius: 8,
                  background: "transparent", border: "1px solid var(--border)",
                  color: "var(--text-muted)", fontSize: 11, fontWeight: 600, cursor: "pointer",
                  transition: "border-color 0.15s",
                }}
              >
                {t.notifPushTest}
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
});

export default NotificationsPage;
