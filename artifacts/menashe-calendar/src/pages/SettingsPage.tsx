import { useState, useCallback, useEffect } from "react";
import { useUser } from "@clerk/react";
import { HDate } from "@hebcal/core";
import { Location } from "../lib/locations";
import { NotificationPrefs, LeadTime, LEAD_TIME_OPTIONS } from "../hooks/useNotifications";
import { useLanguage } from "../context/LanguageContext";
import { hebrewDayNumeral } from "../lib/hebrewCalendar";
import { getYahrzeitEntries, getNextYahrzeit, YartzeitEntry } from "../lib/yahrzeit";
import TranslationEditorModal from "../modals/TranslationEditorModal";

const BIRTHDAY_KEY = "menashe-my-birthday";

async function adminFetch(path: string, options: RequestInit = {}) {
  const token: string | null = await (window as any).Clerk?.session?.getToken() ?? null;
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
    credentials: "include",
  });
  return res;
}

function AdminAlertSetup() {
  const clerkUserId: string = (window as any).Clerk?.user?.id ?? "";
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ marginBottom: 16, padding: "12px 14px", borderRadius: 12, background: "rgba(212,168,67,0.05)", border: "1px solid rgba(212,168,67,0.2)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 16 }}>🔔</span>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#d4a843", letterSpacing: "0.06em" }}>ADMIN PUSH ALERTS</div>
      </div>
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 10, lineHeight: 1.6 }}>
        To receive push notifications when users request Premium, set{" "}
        <code style={{ background: "rgba(255,255,255,0.08)", padding: "1px 5px", borderRadius: 4, fontSize: 11 }}>ADMIN_USER_ID</code>{" "}
        on the server to your User ID below. Also ensure push notifications are enabled in Settings.
      </div>
      {clerkUserId ? (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div style={{
            flex: 1, padding: "8px 10px", borderRadius: 8,
            background: "rgba(0,0,0,0.3)", border: "1px solid rgba(212,168,67,0.2)",
            fontFamily: "monospace", fontSize: 11, color: "#d4a843",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{clerkUserId}</div>
          <button
            onClick={() => { navigator.clipboard.writeText(clerkUserId).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
            style={{
              padding: "8px 12px", borderRadius: 8, cursor: "pointer", fontSize: 12, fontWeight: 700,
              background: copied ? "rgba(74,222,128,0.15)" : "var(--elevated)",
              border: `1px solid ${copied ? "rgba(74,222,128,0.4)" : "var(--border)"}`,
              color: copied ? "#4ade80" : "var(--text-muted)", flexShrink: 0,
            }}
          >{copied ? "✓ Copied" : "Copy"}</button>
        </div>
      ) : (
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Sign in to see your User ID.</div>
      )}
    </div>
  );
}

function getBirthdayCountdown(dateStr: string): { hebrewDay: number; hebrewMonth: number; hebrewYear: number; nextGreg: Date; diffDays: number } | null {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr + "T12:00:00");
    const hd = new HDate(d);
    const curHYear = new HDate().getFullYear();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let next = new HDate(hd.getDate(), hd.getMonth(), curHYear).greg();
    next.setHours(0, 0, 0, 0);
    if (next < today) {
      next = new HDate(hd.getDate(), hd.getMonth(), curHYear + 1).greg();
      next.setHours(0, 0, 0, 0);
    }
    return {
      hebrewDay: hd.getDate(),
      hebrewMonth: hd.getMonth(),
      hebrewYear: hd.getFullYear(),
      nextGreg: next,
      diffDays: Math.round((next.getTime() - today.getTime()) / 86400000),
    };
  } catch { return null; }
}

interface SettingsPageProps {
  theme: string;
  location: Location;
  onToggleTheme: () => void;
  onSetTheme: (theme: "dark" | "light" | "sapphire") => void;
  onLocationClick: () => void;
  onPremium: () => void;
  onTahara: () => void;
  onYartzeit: () => void;
  onBirthday: () => void;
  onCommunity: () => void;
  onCensus: () => void;
  onProfile: () => void;
  onSignOut: () => void;
  onWhatsNew: () => void;
  profileName?: string;
  profileRole?: string;
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
  onUnsubscribePush: () => void;
  onTestPush: () => Promise<boolean>;
}

export default function SettingsPage({
  theme, location,
  onToggleTheme, onSetTheme, onLocationClick, onPremium, onTahara, onYartzeit, onBirthday, onCommunity, onCensus,
  onProfile, onSignOut, onWhatsNew, profileName, profileRole,
  notifPermission, notifPrefs, leadTime, onUpdateNotifPref, onUpdateLeadTime,
  pushSubscribed, pushSupported, pushLoading, pushError, onSubscribePush, onUnsubscribePush, onTestPush,
}: SettingsPageProps) {
  const { user } = useUser();
  const isAdminUser = user?.id === import.meta.env.VITE_ADMIN_USER_ID;
  const { lang, setLang, t } = useLanguage();
  const [showHebrew, setShowHebrew] = useState(true);
  const [pendingKey, setPendingKey] = useState<keyof NotificationPrefs | null>(null);
  const [showTxEditor, setShowTxEditor] = useState(false);
  const [testSent, setTestSent] = useState(false);
  const [copied, setCopied] = useState(false);

  // ── Admin panel state ──────────────────────────────────────────────────────
  const [adminMode, setAdminMode] = useState<"none" | "panel">("none");
  const [adminTab, setAdminTab] = useState<"requests" | "users">("requests");
  const [adminRequests, setAdminRequests] = useState<any[]>([]);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminActionId, setAdminActionId] = useState<string | null>(null);
  const [selectedRequests, setSelectedRequests] = useState<Set<string>>(new Set());
  const [bulkProcessing, setBulkProcessing] = useState(false);

  const [savedBirthday, setSavedBirthday] = useState(() => {
    try { return localStorage.getItem(BIRTHDAY_KEY) ?? ""; } catch { return ""; }
  });

  useEffect(() => {
    function refresh() {
      try { setSavedBirthday(localStorage.getItem(BIRTHDAY_KEY) ?? ""); } catch {}
    }
    window.addEventListener("menashe-birthday-updated", refresh);
    return () => window.removeEventListener("menashe-birthday-updated", refresh);
  }, []);

  const bdCountdown = getBirthdayCountdown(savedBirthday);

  const [yahrzeitEntries, setYahrzeitEntries] = useState<YartzeitEntry[]>(() => getYahrzeitEntries());

  useEffect(() => {
    function refreshYahrzeit() { setYahrzeitEntries(getYahrzeitEntries()); }
    window.addEventListener("menashe-yahrzeit-updated", refreshYahrzeit);
    return () => window.removeEventListener("menashe-yahrzeit-updated", refreshYahrzeit);
  }, []);

  const upcomingYahrzeits = yahrzeitEntries
    .map(e => ({ entry: e, next: getNextYahrzeit(e.hebrewDay, e.hebrewMonth) }))
    .filter(({ next }) => next !== null)
    .sort((a, b) => (a.next!.daysAway) - (b.next!.daysAway))
    .slice(0, 3);

  const icsUrl = `${window.location.origin}/api/calendar/ics?` + new URLSearchParams({
    lat: String(location.lat),
    lng: String(location.lng),
    tz: location.tz,
    locationName: location.name,
    country: location.country,
    months: "12",
  }).toString();

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(icsUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = icsUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }, [icsUrl]);
  const isLight = theme === "light";
  const notifBlocked = notifPermission === "denied";
  const notifUnsupported = typeof Notification === "undefined";

  function Toggle({ on, onToggle, disabled }: { on: boolean; onToggle: () => void; disabled?: boolean }) {
    return (
      <div
        onClick={disabled ? undefined : onToggle}
        style={{
          width: 44, height: 26, borderRadius: 13,
          background: disabled ? "var(--elevated)" : on ? "var(--gold)" : "var(--elevated)",
          position: "relative", cursor: disabled ? "not-allowed" : "pointer",
          transition: "background 0.2s", border: "1px solid var(--border)",
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <div style={{
          position: "absolute", top: 3, left: on ? 21 : 3, width: 18, height: 18,
          borderRadius: "50%",
          background: disabled ? "var(--text-muted)" : on ? "#1a0f00" : "var(--text-muted)",
          transition: "left 0.2s",
        }} />
      </div>
    );
  }

  function Row({ label, sub, right, onClick }: { label: string; sub?: string; right: React.ReactNode; onClick?: () => void }) {
    return (
      <div
        onClick={onClick}
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", cursor: onClick ? "pointer" : "default" }}
      >
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>{label}</div>
          {sub && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{sub}</div>}
        </div>
        {right}
      </div>
    );
  }

  async function handleNotifToggle(key: keyof NotificationPrefs, value: boolean) {
    if (notifBlocked || notifUnsupported) return;
    setPendingKey(key);
    await onUpdateNotifPref(key, value);
    setPendingKey(null);
  }

  function notifSubtitle(key: keyof NotificationPrefs, defaultText: string): string {
    if (notifUnsupported) return "Not supported in this browser";
    if (notifBlocked) return "Blocked — enable in browser settings";
    if (notifPrefs[key] && notifPermission === "granted") return `${defaultText} · Active`;
    return defaultText;
  }

  const anyActive = notifPrefs.shabbat || notifPrefs.havdalah || notifPrefs.holiday || notifPrefs.omer || notifPrefs.prayers || notifPrefs.parasha || notifPrefs.shema;

  // ── Admin panel functions ──────────────────────────────────────────────────
  async function fetchAdminData() {
    setAdminLoading(true);
    try {
      const [reqRes, usrRes] = await Promise.all([
        adminFetch("/admin/premium-requests"),
        adminFetch("/admin/users"),
      ]);
      if (reqRes.ok) setAdminRequests(await reqRes.json());
      if (usrRes.ok) setAdminUsers(await usrRes.json());
    } finally {
      setAdminLoading(false);
    }
  }

  async function handleApprove(userId: string) {
    setAdminActionId(userId);
    await adminFetch(`/admin/premium-requests/${userId}/approve`, { method: "PUT" });
    setAdminRequests(r => r.filter(x => x.userId !== userId));
    setSelectedRequests(s => { const n = new Set(s); n.delete(userId); return n; });
    setAdminActionId(null);
  }

  async function handleDeny(userId: string) {
    setAdminActionId(userId);
    await adminFetch(`/admin/premium-requests/${userId}/deny`, { method: "PUT" });
    setAdminRequests(r => r.filter(x => x.userId !== userId));
    setSelectedRequests(s => { const n = new Set(s); n.delete(userId); return n; });
    setAdminActionId(null);
  }

  async function handleBulkApprove() {
    const ids = Array.from(selectedRequests);
    if (ids.length === 0) return;
    setBulkProcessing(true);
    await Promise.all(ids.map(userId =>
      adminFetch(`/admin/premium-requests/${userId}/approve`, { method: "PUT" }).catch(() => {})
    ));
    setAdminRequests(r => r.filter(x => !selectedRequests.has(x.userId)));
    setSelectedRequests(new Set());
    setBulkProcessing(false);
  }

  async function handleBulkDeny() {
    const ids = Array.from(selectedRequests);
    if (ids.length === 0) return;
    setBulkProcessing(true);
    await Promise.all(ids.map(userId =>
      adminFetch(`/admin/premium-requests/${userId}/deny`, { method: "PUT" }).catch(() => {})
    ));
    setAdminRequests(r => r.filter(x => !selectedRequests.has(x.userId)));
    setSelectedRequests(new Set());
    setBulkProcessing(false);
  }

  function toggleSelectRequest(userId: string) {
    setSelectedRequests(s => {
      const n = new Set(s);
      if (n.has(userId)) n.delete(userId); else n.add(userId);
      return n;
    });
  }

  function toggleSelectAll() {
    if (selectedRequests.size === adminRequests.length) {
      setSelectedRequests(new Set());
    } else {
      setSelectedRequests(new Set(adminRequests.map((r: any) => r.userId)));
    }
  }

  async function handleTogglePremium(userId: string, current: boolean) {
    setAdminActionId(userId);
    await adminFetch(`/admin/users/${userId}/premium`, {
      method: "PUT",
      body: JSON.stringify({ isPremium: !current }),
    });
    setAdminUsers(u => u.map(x => x.userId === userId ? { ...x, isPremium: !current } : x));
    setAdminActionId(null);
  }

  // ── Admin Panel (full-page view when authenticated) ───────────────────────
  if (adminMode === "panel" && isAdminUser) {
    return (
      <div style={{ padding: "0 0 80px" }}>
        <div className="app-header">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={() => setAdminMode("none")}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-primary)", fontSize: 18, padding: "4px 8px 4px 0" }}
            >←</button>
            <div className="app-icon">⚙</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>Admin Panel</div>
          </div>
          <button
            onClick={fetchAdminData}
            style={{ background: "var(--elevated)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 12, color: "var(--text-muted)" }}
          >{adminLoading ? "Loading…" : "↻ Refresh"}</button>
        </div>

        <div style={{ padding: "16px 16px 0" }}>
          {/* Admin Alert Setup */}
          <AdminAlertSetup />

          {/* Tabs */}
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {(["requests", "users"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setAdminTab(tab)}
                style={{
                  flex: 1, padding: "10px", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 13,
                  background: adminTab === tab ? "linear-gradient(135deg, #b8860b, #d4a843)" : "var(--elevated)",
                  color: adminTab === tab ? "#1a0f00" : "var(--text-secondary)",
                  border: adminTab === tab ? "none" : "1px solid var(--border)",
                }}
              >
                {tab === "requests" ? `📋 Requests ${adminRequests.length > 0 ? `(${adminRequests.length})` : ""}` : "👥 Users"}
              </button>
            ))}
          </div>

          {adminLoading && (
            <div style={{ textAlign: "center", padding: 32, color: "var(--text-muted)" }}>Loading…</div>
          )}

          {/* Pending Access Requests */}
          {!adminLoading && adminTab === "requests" && (
            <div>
              <div className="section-header">PENDING PREMIUM REQUESTS</div>
              {adminRequests.length === 0 ? (
                <div className="card" style={{ padding: "20px 16px", textAlign: "center" }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>No pending requests</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>All access requests have been reviewed.</div>
                </div>
              ) : (
                <>
                  {/* Select all bar */}
                  <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "8px 12px", marginBottom: 8, borderRadius: 10,
                    background: "rgba(212,168,67,0.05)", border: "1px solid rgba(212,168,67,0.15)",
                  }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none" }}>
                      <div
                        onClick={toggleSelectAll}
                        style={{
                          width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                          background: selectedRequests.size === adminRequests.length ? "linear-gradient(135deg, #b8860b, #d4a843)" : "var(--elevated)",
                          border: `2px solid ${selectedRequests.size > 0 ? "#d4a843" : "var(--border)"}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          cursor: "pointer", transition: "all 0.15s",
                        }}
                      >
                        {selectedRequests.size === adminRequests.length && (
                          <span style={{ fontSize: 11, color: "#1a0f00", fontWeight: 900, lineHeight: 1 }}>✓</span>
                        )}
                        {selectedRequests.size > 0 && selectedRequests.size < adminRequests.length && (
                          <span style={{ fontSize: 14, color: "#d4a843", fontWeight: 900, lineHeight: 1, marginTop: -1 }}>−</span>
                        )}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>
                        {selectedRequests.size === 0
                          ? "Select all"
                          : selectedRequests.size === adminRequests.length
                          ? `All ${adminRequests.length} selected`
                          : `${selectedRequests.size} of ${adminRequests.length} selected`}
                      </span>
                    </label>
                    {selectedRequests.size > 0 && (
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {selectedRequests.size} selected
                      </span>
                    )}
                  </div>

                  {/* Request cards */}
                  {adminRequests.map((req: any) => {
                    const isSelected = selectedRequests.has(req.userId);
                    const isActioning = adminActionId === req.userId;
                    return (
                      <div
                        key={req.userId}
                        className="card"
                        style={{
                          padding: "14px 16px", marginBottom: 10,
                          border: isSelected ? "1.5px solid rgba(212,168,67,0.5)" : undefined,
                          background: isSelected ? "rgba(212,168,67,0.04)" : undefined,
                          transition: "border-color 0.15s, background 0.15s",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
                          {/* Checkbox */}
                          <div
                            onClick={() => toggleSelectRequest(req.userId)}
                            style={{
                              width: 22, height: 22, borderRadius: 7, flexShrink: 0, marginTop: 3,
                              background: isSelected ? "linear-gradient(135deg, #b8860b, #d4a843)" : "var(--elevated)",
                              border: `2px solid ${isSelected ? "#d4a843" : "var(--border)"}`,
                              display: "flex", alignItems: "center", justifyContent: "center",
                              cursor: "pointer", transition: "all 0.15s",
                            }}
                          >
                            {isSelected && <span style={{ fontSize: 12, color: "#1a0f00", fontWeight: 900, lineHeight: 1 }}>✓</span>}
                          </div>
                          <div style={{ fontSize: 26, lineHeight: 1 }}>{req.avatarEmoji ?? "👤"}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{req.displayName ?? "Unknown"}</div>
                            {req.congregation && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{req.congregation}{req.city ? ` · ${req.city}` : ""}</div>}
                            {req.note && <div style={{ fontSize: 12, color: req.note.toLowerCase().includes("paid") ? "#d4a843" : "var(--text-secondary)", marginTop: 4, fontStyle: "italic" }}>"{req.note}"</div>}
                            <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>
                              {new Date(req.requestedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            onClick={() => handleDeny(req.userId)}
                            disabled={isActioning || bulkProcessing}
                            style={{
                              flex: 1, padding: "9px", borderRadius: 9, cursor: "pointer", fontWeight: 700, fontSize: 13,
                              background: "transparent", border: "1px solid rgba(239,68,68,0.4)", color: "#ef4444",
                              opacity: isActioning || bulkProcessing ? 0.4 : 1,
                            }}
                          >✗ Deny</button>
                          <button
                            onClick={() => handleApprove(req.userId)}
                            disabled={isActioning || bulkProcessing}
                            style={{
                              flex: 2, padding: "9px", borderRadius: 9, cursor: "pointer", fontWeight: 800, fontSize: 13,
                              background: "linear-gradient(135deg, #b8860b, #d4a843)", color: "#1a0f00", border: "none",
                              opacity: isActioning || bulkProcessing ? 0.4 : 1,
                            }}
                          >{isActioning ? "Processing…" : "✓ Approve"}</button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Bulk action bar — sticky at bottom when items selected */}
                  {selectedRequests.size > 0 && (
                    <div style={{
                      position: "sticky", bottom: 16, zIndex: 10,
                      background: "var(--card)", border: "1.5px solid rgba(212,168,67,0.4)",
                      borderRadius: 14, padding: "12px 14px",
                      boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                      display: "flex", alignItems: "center", gap: 8,
                    }}>
                      <div style={{ flex: 1, fontSize: 13, fontWeight: 700, color: "#d4a843" }}>
                        {selectedRequests.size} selected
                      </div>
                      <button
                        onClick={handleBulkDeny}
                        disabled={bulkProcessing}
                        style={{
                          padding: "10px 14px", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 13,
                          background: "transparent", border: "1px solid rgba(239,68,68,0.4)", color: "#ef4444",
                          opacity: bulkProcessing ? 0.5 : 1,
                        }}
                      >✗ Deny All</button>
                      <button
                        onClick={handleBulkApprove}
                        disabled={bulkProcessing}
                        style={{
                          padding: "10px 18px", borderRadius: 10, cursor: "pointer", fontWeight: 800, fontSize: 13,
                          background: "linear-gradient(135deg, #b8860b, #d4a843)", color: "#1a0f00", border: "none",
                          opacity: bulkProcessing ? 0.5 : 1,
                        }}
                      >{bulkProcessing ? "Processing…" : `✓ Approve ${selectedRequests.size}`}</button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* All Users */}
          {!adminLoading && adminTab === "users" && (
            <div>
              <div className="section-header">ALL USERS ({adminUsers.length})</div>
              {adminUsers.length === 0 ? (
                <div className="card" style={{ padding: "20px 16px", textAlign: "center" }}>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>No users found.</div>
                </div>
              ) : adminUsers.map((user: any) => (
                <div key={user.userId} className="card" style={{ padding: "12px 16px", marginBottom: 8, display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ fontSize: 24, lineHeight: 1 }}>{user.avatarEmoji ?? "👤"}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {user.displayName ?? "Unnamed User"}
                    </div>
                    {user.congregation && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{user.congregation}{user.city ? ` · ${user.city}` : ""}</div>}
                    <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 2 }}>
                      {user.role ?? "Member"} {user.isPremium ? "· 👑 Premium" : ""}
                    </div>
                  </div>
                  <button
                    onClick={() => handleTogglePremium(user.userId, user.isPremium)}
                    disabled={adminActionId === user.userId}
                    style={{
                      padding: "7px 12px", borderRadius: 8, cursor: "pointer", fontWeight: 700, fontSize: 12,
                      background: user.isPremium ? "rgba(212,168,67,0.15)" : "var(--elevated)",
                      color: user.isPremium ? "#d4a843" : "var(--text-muted)",
                      border: `1px solid ${user.isPremium ? "rgba(212,168,67,0.4)" : "var(--border)"}`,
                      opacity: adminActionId === user.userId ? 0.5 : 1,
                      flexShrink: 0,
                    }}
                  >{adminActionId === user.userId ? "…" : user.isPremium ? "👑 Premium" : "Free"}</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "0 0 4px" }}>

      <div className="app-header">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="app-icon">✡</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>Menashe</div>
            <div style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.1em", fontWeight: 600 }}>CALENDAR</div>
          </div>
        </div>
      </div>

      <div style={{ padding: "16px 16px 0" }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text-primary)", marginBottom: 20 }}>{t.settingsTitle}</h1>

        {/* My Profile */}
        <div className="section-header">MY PROFILE</div>
        <div className="card" style={{ marginBottom: 16, overflow: "hidden" }}>
          <div
            onClick={onProfile}
            style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", cursor: "pointer" }}
          >
            <div style={{
              width: 46, height: 46, borderRadius: "50%",
              background: "linear-gradient(135deg, #1a3050, #2a1a40)",
              border: "1.5px solid rgba(212,168,67,0.35)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 18, fontWeight: 800, color: "var(--gold)", flexShrink: 0,
            }}>
              {profileName
                ? profileName.split(" ").slice(0, 2).map(w => w[0]?.toUpperCase() || "").join("")
                : "?"}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
                {profileName || "Set up your profile"}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>
                {profileRole || "Tap to add your name & community role"}
              </div>
            </div>
            <span style={{ color: "var(--text-muted)" }}>›</span>
          </div>
        </div>

        {/* Location */}
        <div className="section-header">{t.settingsLocation}</div>
        <div className="card" style={{ marginBottom: 16, overflow: "hidden" }}>
          <Row
            label={t.settingsCity}
            sub={t.settingsCityHint}
            right={<div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ fontSize: 14, color: "var(--text-secondary)" }}>{location.name}</span><span style={{ color: "var(--text-muted)" }}>›</span></div>}
            onClick={onLocationClick}
          />
          <div style={{ height: 1, background: "var(--border)" }} />
          <Row label={t.settingsTimezone} right={<span style={{ fontSize: 13, color: "var(--text-muted)" }}>{location.tz}</span>} />
        </div>

        {/* Appearance */}
        <div className="section-header">{t.settingsAppearance}</div>
        <div className="card" style={{ marginBottom: 16, overflow: "hidden" }}>
          {/* Theme Picker */}
          <div style={{ padding: "14px 16px 10px" }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", marginBottom: 12 }}>Theme</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              {/* Royal Midnight */}
              <button
                onClick={() => onSetTheme("dark")}
                style={{ background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "center" }}
              >
                <div style={{
                  borderRadius: 14, overflow: "hidden", border: `2px solid ${theme === "dark" ? "#d4a843" : "transparent"}`,
                  boxShadow: theme === "dark" ? "0 0 0 1px rgba(212,168,67,0.4), 0 4px 16px rgba(0,0,0,0.4)" : "0 2px 8px rgba(0,0,0,0.3)",
                  transition: "all 0.2s",
                }}>
                  {/* Mini preview */}
                  <div style={{ background: "#080e1a", padding: "8px 8px 6px", height: 72, display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ height: 8, borderRadius: 4, background: "linear-gradient(90deg, #d4a843, #b8860b)", width: "60%" }} />
                    <div style={{ height: 5, borderRadius: 3, background: "#1a2540", width: "90%" }} />
                    <div style={{ height: 5, borderRadius: 3, background: "#1a2540", width: "75%" }} />
                    <div style={{ flex: 1 }} />
                    <div style={{ display: "flex", gap: 4 }}>
                      {[1,2,3].map(i => <div key={i} style={{ flex: 1, height: 14, borderRadius: 4, background: "#111827" }} />)}
                    </div>
                  </div>
                  <div style={{ background: "#0d1627", padding: "5px 4px", display: "flex", justifyContent: "space-around" }}>
                    {["🏠","📅","⏰","📖","⚙️"].map((ic, i) => (
                      <span key={i} style={{ fontSize: 9 }}>{ic}</span>
                    ))}
                  </div>
                </div>
                <div style={{ marginTop: 6, fontSize: 10, fontWeight: theme === "dark" ? 700 : 500, color: theme === "dark" ? "var(--gold)" : "var(--text-muted)" }}>
                  {theme === "dark" && "✓ "}Midnight
                </div>
              </button>

              {/* Parchment Light */}
              <button
                onClick={() => onSetTheme("light")}
                style={{ background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "center" }}
              >
                <div style={{
                  borderRadius: 14, overflow: "hidden", border: `2px solid ${theme === "light" ? "#8B6914" : "transparent"}`,
                  boxShadow: theme === "light" ? "0 0 0 1px rgba(139,105,20,0.4), 0 4px 16px rgba(0,0,0,0.2)" : "0 2px 8px rgba(0,0,0,0.15)",
                  transition: "all 0.2s",
                }}>
                  <div style={{ background: "#F5EFE0", padding: "8px 8px 6px", height: 72, display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ height: 8, borderRadius: 4, background: "linear-gradient(90deg, #8B6914, #6B4F10)", width: "60%" }} />
                    <div style={{ height: 5, borderRadius: 3, background: "#EDE4D3", width: "90%", border: "1px solid #D4C9B0" }} />
                    <div style={{ height: 5, borderRadius: 3, background: "#EDE4D3", width: "75%", border: "1px solid #D4C9B0" }} />
                    <div style={{ flex: 1 }} />
                    <div style={{ display: "flex", gap: 4 }}>
                      {[1,2,3].map(i => <div key={i} style={{ flex: 1, height: 14, borderRadius: 4, background: "#EDE4D3", border: "1px solid #D4C9B0" }} />)}
                    </div>
                  </div>
                  <div style={{ background: "#EDE4D3", padding: "5px 4px", borderTop: "1px solid #D4C9B0", display: "flex", justifyContent: "space-around" }}>
                    {["🏠","📅","⏰","📖","⚙️"].map((ic, i) => (
                      <span key={i} style={{ fontSize: 9 }}>{ic}</span>
                    ))}
                  </div>
                </div>
                <div style={{ marginTop: 6, fontSize: 10, fontWeight: theme === "light" ? 700 : 500, color: theme === "light" ? "#8B6914" : "var(--text-muted)" }}>
                  {theme === "light" && "✓ "}Parchment
                </div>
              </button>

              {/* Deep Sapphire */}
              <button
                onClick={() => onSetTheme("sapphire")}
                style={{ background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "center" }}
              >
                <div style={{
                  borderRadius: 14, overflow: "hidden", border: `2px solid ${theme === "sapphire" ? "#6382FF" : "transparent"}`,
                  boxShadow: theme === "sapphire" ? "0 0 0 1px rgba(99,130,255,0.4), 0 4px 16px rgba(99,130,255,0.15)" : "0 2px 8px rgba(0,0,0,0.3)",
                  transition: "all 0.2s",
                }}>
                  <div style={{ background: "#060e1e", padding: "8px 8px 6px", height: 72, display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ height: 8, borderRadius: 4, background: "linear-gradient(90deg, #6382FF, #4060E0)", width: "60%" }} />
                    <div style={{ height: 5, borderRadius: 3, background: "#0c1830", width: "90%", border: "1px solid #1a2e58" }} />
                    <div style={{ height: 5, borderRadius: 3, background: "#0c1830", width: "75%", border: "1px solid #1a2e58" }} />
                    <div style={{ flex: 1 }} />
                    <div style={{ display: "flex", gap: 4 }}>
                      {[1,2,3].map(i => <div key={i} style={{ flex: 1, height: 14, borderRadius: 4, background: "#0c1830", border: "1px solid #1a2e58" }} />)}
                    </div>
                  </div>
                  <div style={{ background: "#060e1e", padding: "5px 4px", borderTop: "1px solid #1a2e58", display: "flex", justifyContent: "space-around" }}>
                    {["🏠","📅","⏰","📖","⚙️"].map((ic, i) => (
                      <span key={i} style={{ fontSize: 9 }}>{ic}</span>
                    ))}
                  </div>
                </div>
                <div style={{ marginTop: 6, fontSize: 10, fontWeight: theme === "sapphire" ? 700 : 500, color: theme === "sapphire" ? "#6382FF" : "var(--text-muted)" }}>
                  {theme === "sapphire" && "✓ "}Sapphire
                </div>
              </button>
            </div>
          </div>
          <div style={{ height: 1, background: "var(--border)" }} />
          <Row
            label={t.settingsShowHebrew}
            right={<Toggle on={showHebrew} onToggle={() => setShowHebrew(v => !v)} />}
          />
          <div style={{ height: 1, background: "var(--border)" }} />
          <Row
            label={t.settingsLanguage}
            sub={t.settingsLanguageHint}
            right={
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>EN</span>
                <Toggle on={lang === "tk"} onToggle={() => setLang(lang === "tk" ? "en" : "tk")} />
                <span style={{ fontSize: 11, color: lang === "tk" ? "var(--gold)" : "var(--text-muted)", fontWeight: 600 }}>TK</span>
              </div>
            }
          />
          <div style={{ height: 1, background: "var(--border)" }} />
          <button
            onClick={() => setShowTxEditor(true)}
            style={{
              width: "100%", display: "flex", alignItems: "center", gap: 12,
              background: "none", border: "none", cursor: "pointer", padding: "13px 16px",
              textAlign: "left",
            }}
          >
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>{t.settingsEditTranslations}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{t.settingsEditTranslationsHint}</div>
            </div>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        </div>

        {showTxEditor && <TranslationEditorModal onClose={() => setShowTxEditor(false)} />}

        {/* Notifications */}
        <div className="section-header">{t.settingsNotifications}</div>

        {notifBlocked && (
          <div style={{
            marginBottom: 10, padding: "10px 14px", borderRadius: 10,
            background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{ fontSize: 16 }}>🔕</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#ef4444" }}>{t.settingsNotifBlocked}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{t.settingsNotifBlockedSub}</div>
            </div>
          </div>
        )}

        {notifPermission === "granted" && anyActive && (
          <div style={{
            marginBottom: 10, padding: "10px 14px", borderRadius: 10,
            background: "rgba(212,168,67,0.1)", border: "1px solid rgba(212,168,67,0.25)",
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <span style={{ fontSize: 16 }}>🔔</span>
            <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              {[
                (notifPrefs.shabbat || notifPrefs.havdalah) && `Shabbat reminders scheduled for ${location.name}`,
                notifPrefs.shema && `Latest Shema alerts — ${leadTime} min warning daily`,
                notifPrefs.holiday && "Holiday alerts active — morning before each holiday",
                notifPrefs.parasha && "Weekly Parasha — every Friday morning",
                notifPrefs.omer && "Omer reminders at nightfall during the 49 days",
                notifPrefs.prayers && `Prayer reminders (${leadTime} min warning) for ${location.name}`,
              ].filter(Boolean).join(" · ")}
            </div>
          </div>
        )}

        {/* Lead time picker */}
        <div className="card" style={{ marginBottom: 12, padding: "14px 16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>{t.settingsLeadTime}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{t.settingsLeadTimeHint}</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {LEAD_TIME_OPTIONS.map((mins) => (
                <button
                  key={mins}
                  onClick={() => onUpdateLeadTime(mins)}
                  style={{
                    width: 38, height: 32, borderRadius: 8, border: "1px solid",
                    borderColor: leadTime === mins ? "#d4a843" : "var(--border)",
                    background: leadTime === mins ? "rgba(212,168,67,0.15)" : "var(--elevated)",
                    color: leadTime === mins ? "#d4a843" : "var(--text-muted)",
                    fontSize: 12, fontWeight: leadTime === mins ? 700 : 500,
                    cursor: "pointer", transition: "all 0.15s",
                  }}
                >
                  {mins}m
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 16, overflow: "hidden" }}>
          <Row
            label={t.settingsCandleLighting}
            sub={notifSubtitle("shabbat", `${18} min before Shabbat`)}
            right={
              <Toggle
                on={notifPrefs.shabbat}
                onToggle={() => handleNotifToggle("shabbat", !notifPrefs.shabbat)}
                disabled={notifBlocked || notifUnsupported || pendingKey === "shabbat"}
              />
            }
          />
          <div style={{ height: 1, background: "var(--border)" }} />
          <Row
            label={t.settingsHavdalah}
            sub={notifSubtitle("havdalah", "When Shabbat ends")}
            right={
              <Toggle
                on={notifPrefs.havdalah}
                onToggle={() => handleNotifToggle("havdalah", !notifPrefs.havdalah)}
                disabled={notifBlocked || notifUnsupported || pendingKey === "havdalah"}
              />
            }
          />
          <div style={{ height: 1, background: "var(--border)" }} />
          <Row
            label={t.settingsShema}
            sub={notifSubtitle("shema", `${leadTime} min warning — daily deadline`)}
            right={
              <Toggle
                on={notifPrefs.shema}
                onToggle={() => handleNotifToggle("shema", !notifPrefs.shema)}
                disabled={notifBlocked || notifUnsupported || pendingKey === "shema"}
              />
            }
          />
          <div style={{ height: 1, background: "var(--border)" }} />
          <Row
            label={t.settingsPrayers}
            sub={notifSubtitle("prayers", `Shacharit, Mincha & Maariv — ${leadTime} min warning`)}
            right={
              <Toggle
                on={notifPrefs.prayers}
                onToggle={() => handleNotifToggle("prayers", !notifPrefs.prayers)}
                disabled={notifBlocked || notifUnsupported || pendingKey === "prayers"}
              />
            }
          />
          <div style={{ height: 1, background: "var(--border)" }} />
          <Row
            label={t.settingsHolidays}
            sub={notifSubtitle("holiday", "Day before holidays")}
            right={
              <Toggle
                on={notifPrefs.holiday}
                onToggle={() => handleNotifToggle("holiday", !notifPrefs.holiday)}
                disabled={notifBlocked || notifUnsupported || pendingKey === "holiday"}
              />
            }
          />
          <div style={{ height: 1, background: "var(--border)" }} />
          <Row
            label={t.settingsParasha}
            sub={notifSubtitle("parasha", "Friday morning · this Shabbat's Torah portion")}
            right={
              <Toggle
                on={notifPrefs.parasha}
                onToggle={() => handleNotifToggle("parasha", !notifPrefs.parasha)}
                disabled={notifBlocked || notifUnsupported || pendingKey === "parasha"}
              />
            }
          />
          <div style={{ height: 1, background: "var(--border)" }} />
          <Row
            label={t.settingsOmer}
            sub={notifSubtitle("omer", "At nightfall during the 49 days")}
            right={
              <Toggle
                on={notifPrefs.omer}
                onToggle={() => handleNotifToggle("omer", !notifPrefs.omer)}
                disabled={notifBlocked || notifUnsupported || pendingKey === "omer"}
              />
            }
          />
          <div style={{ height: 1, background: "var(--border)" }} />
          <Row
            label={t.settingsShabbatDigest}
            sub={notifSubtitle("shabbatDigest", "Friday 8 AM · Parasha, candle lighting & week's holidays")}
            right={
              <Toggle
                on={notifPrefs.shabbatDigest}
                onToggle={() => handleNotifToggle("shabbatDigest", !notifPrefs.shabbatDigest)}
                disabled={notifBlocked || notifUnsupported || pendingKey === "shabbatDigest"}
              />
            }
          />
          <div style={{ height: 1, background: "var(--border)" }} />
          <Row
            label={t.settingsYahrtzeit}
            sub={notifSubtitle("yahrzeit", "7 AM on each Yahrtzeit day")}
            right={
              <Toggle
                on={notifPrefs.yahrzeit}
                onToggle={() => handleNotifToggle("yahrzeit", !notifPrefs.yahrzeit)}
                disabled={notifBlocked || notifUnsupported || pendingKey === "yahrzeit"}
              />
            }
          />
        </div>

        {/* Background Push Notifications */}
        <div className="section-header">{t.settingsBgPush}</div>
        <div className="card" style={{ marginBottom: 16, padding: "16px" }}>
          <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 12, lineHeight: 1.5 }}>
            {pushSupported ? t.settingsBgPushDesc : t.settingsBgPushDescUnsupported}
          </div>
          {pushError && (
            <div style={{ marginBottom: 10, padding: "8px 12px", borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", fontSize: 12, color: "#ef4444" }}>
              {pushError}
            </div>
          )}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {!pushSubscribed ? (
              <button
                onClick={onSubscribePush}
                disabled={!pushSupported || pushLoading}
                style={{
                  flex: 1, padding: "10px 16px", borderRadius: 10, border: "1px solid rgba(212,168,67,0.4)",
                  background: "rgba(212,168,67,0.12)", color: "#d4a843", fontWeight: 700, fontSize: 14,
                  cursor: pushSupported && !pushLoading ? "pointer" : "not-allowed",
                  opacity: pushSupported && !pushLoading ? 1 : 0.5, transition: "all 0.15s",
                }}
              >
                {pushLoading ? t.settingsEnablingPush : t.settingsEnablePush}
              </button>
            ) : (
              <>
                <button
                  onClick={async () => { const ok = await onTestPush(); if (ok) { setTestSent(true); setTimeout(() => setTestSent(false), 3000); } }}
                  disabled={pushLoading}
                  style={{
                    flex: 1, padding: "10px 16px", borderRadius: 10, border: "1px solid rgba(212,168,67,0.4)",
                    background: "rgba(212,168,67,0.12)", color: "#d4a843", fontWeight: 700, fontSize: 13,
                    cursor: "pointer", transition: "all 0.15s",
                  }}
                >
                  {testSent ? t.settingsTestSent : t.settingsTestPush}
                </button>
                <button
                  onClick={onUnsubscribePush}
                  disabled={pushLoading}
                  style={{
                    padding: "10px 16px", borderRadius: 10, border: "1px solid rgba(239,68,68,0.3)",
                    background: "rgba(239,68,68,0.08)", color: "#ef4444", fontWeight: 600, fontSize: 13,
                    cursor: "pointer", transition: "all 0.15s",
                  }}
                >
                  {pushLoading ? "…" : t.settingsDisablePush}
                </button>
              </>
            )}
          </div>
          {pushSubscribed && (
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e" }} />
              <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{t.settingsPushActive} {location.name}</span>
            </div>
          )}
        </div>

        {/* Google Calendar Sync */}
        <div className="section-header">CALENDAR SYNC</div>
        <div className="card" style={{ marginBottom: 16, padding: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              background: "white",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
            }}>
              <svg width="26" height="26" viewBox="0 0 48 48" fill="none">
                <rect x="4" y="8" width="40" height="36" rx="4" fill="white" stroke="#dadce0" strokeWidth="2"/>
                <rect x="4" y="8" width="40" height="13" rx="4" fill="#4285F4"/>
                <rect x="4" y="17" width="40" height="4" fill="#4285F4"/>
                <text x="24" y="37" textAnchor="middle" fontSize="16" fontWeight="700" fill="#4285F4" fontFamily="Arial">
                  {new Date().getDate()}
                </text>
                <rect x="14" y="4" width="4" height="9" rx="2" fill="#4285F4"/>
                <rect x="30" y="4" width="4" height="9" rx="2" fill="#4285F4"/>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Google Calendar</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>
                Sync Shabbat times, holidays & Parasha to your calendar
              </div>
            </div>
          </div>

          {/* ICS URL box */}
          <div style={{
            background: "var(--elevated)", borderRadius: 10, padding: "10px 12px",
            border: "1px solid var(--border)", marginBottom: 12,
          }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", letterSpacing: "0.08em", marginBottom: 4 }}>
              CALENDAR FEED URL
            </div>
            <div style={{
              fontSize: 11, color: "var(--text-secondary)", wordBreak: "break-all",
              fontFamily: "monospace", lineHeight: 1.5,
            }}>
              {icsUrl.slice(0, 80)}{icsUrl.length > 80 ? "…" : ""}
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => window.open(
                `https://calendar.google.com/calendar/r/settings/addbyurl?url=${encodeURIComponent(icsUrl)}`,
                "_blank"
              )}
              style={{
                flex: 1, padding: "11px 12px", borderRadius: 10,
                background: "#4285F4", border: "none",
                color: "white", fontWeight: 700, fontSize: 13,
                cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                <path d="M19 3h-1V1h-2v2H8V1H6v2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
              </svg>
              Add to Google Calendar
            </button>
            <button
              onClick={handleCopyLink}
              style={{
                padding: "11px 14px", borderRadius: 10,
                background: copied ? "rgba(34,197,94,0.15)" : "var(--elevated)",
                border: `1px solid ${copied ? "rgba(34,197,94,0.4)" : "var(--border)"}`,
                color: copied ? "#22c55e" : "var(--text-secondary)",
                fontWeight: 600, fontSize: 13, cursor: "pointer",
                transition: "all 0.2s", whiteSpace: "nowrap",
              }}
            >
              {copied ? "✓ Copied" : "Copy Link"}
            </button>
          </div>

          <div style={{ marginTop: 10, display: "flex", alignItems: "flex-start", gap: 6 }}>
            <span style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 1 }}>ℹ️</span>
            <div style={{ fontSize: 11, color: "var(--text-muted)", lineHeight: 1.5 }}>
              Works with Google Calendar, Apple Calendar, and Outlook. Events update automatically based on your location: <strong style={{ color: "var(--text-secondary)" }}>{location.name}</strong>.
            </div>
          </div>
        </div>

        {/* Tools */}
        <div className="section-header">{t.settingsTools}</div>

        {/* ── Hebrew Birthday Tracker card ── */}
        {bdCountdown ? (
          <div
            onClick={onBirthday}
            style={{
              marginBottom: 14, padding: "14px 16px", borderRadius: 14, cursor: "pointer",
              background: "linear-gradient(135deg, rgba(212,168,67,0.10) 0%, rgba(212,168,67,0.04) 100%)",
              border: "1px solid rgba(212,168,67,0.25)",
              position: "relative", overflow: "hidden",
            }}
          >
            {/* Radial accent */}
            <div style={{
              position: "absolute", inset: 0, pointerEvents: "none",
              background: "radial-gradient(ellipse at 90% 15%, rgba(212,168,67,0.10) 0%, transparent 55%)",
            }} />

            {/* Title row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 14 }}>🎂</span>
                <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: "0.13em", color: "var(--text-muted)", textTransform: "uppercase" }}>
                  {t.birthdayTrackerCardTitle}
                </span>
              </div>
              <span style={{ fontSize: 14, color: "#d4a843" }}>›</span>
            </div>

            {/* Content row */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {/* Countdown number */}
              <div style={{
                width: 60, height: 60, borderRadius: 14, flexShrink: 0,
                background: "linear-gradient(135deg, rgba(212,168,67,0.18) 0%, rgba(212,168,67,0.06) 100%)",
                border: "1px solid rgba(212,168,67,0.25)",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 1,
              }}>
                {bdCountdown.diffDays === 0 ? (
                  <span style={{ fontSize: 22 }}>🎉</span>
                ) : (
                  <>
                    <span style={{
                      fontSize: bdCountdown.diffDays >= 100 ? 18 : 24,
                      fontWeight: 900, lineHeight: 1,
                      color: bdCountdown.diffDays <= 7 ? "#f0c050" : "#d4a843",
                    }}>
                      {bdCountdown.diffDays}
                    </span>
                    <span style={{ fontSize: 8, color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.04em" }}>
                      {t.nextHolidayDaysPlural.toUpperCase()}
                    </span>
                  </>
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                {/* Hebrew date */}
                <div style={{
                  fontFamily: "'Noto Serif Hebrew', serif",
                  fontSize: 20, fontWeight: 700, color: "#d4a843",
                  direction: "rtl", lineHeight: 1.2, marginBottom: 4,
                }}>
                  {hebrewDayNumeral(bdCountdown.hebrewDay)}{" "}
                  {HDate.getMonthName(bdCountdown.hebrewMonth, bdCountdown.hebrewYear)}
                </div>
                {/* Next date */}
                <div style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 500 }}>
                  {bdCountdown.diffDays === 0
                    ? t.birthdayTrackerToday
                    : bdCountdown.nextGreg.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
                  }
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div
            onClick={onBirthday}
            style={{
              marginBottom: 14, padding: "12px 16px", borderRadius: 12, cursor: "pointer",
              background: "rgba(212,168,67,0.04)",
              border: "1px dashed rgba(212,168,67,0.25)",
              display: "flex", alignItems: "center", gap: 10,
            }}
          >
            <span style={{ fontSize: 20 }}>🎂</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#d4a843", flex: 1 }}>
              {t.birthdayTrackerCardSetup}
            </span>
            <span style={{ fontSize: 16, color: "#d4a843" }}>›</span>
          </div>
        )}

        {/* ── Yahrzeit Reminder card ── */}
        {upcomingYahrzeits.length > 0 ? (
          <div
            onClick={onYartzeit}
            style={{
              marginBottom: 14, borderRadius: 14, cursor: "pointer",
              background: "linear-gradient(135deg, rgba(212,168,67,0.08) 0%, rgba(212,168,67,0.03) 100%)",
              border: "1px solid rgba(212,168,67,0.22)",
              overflow: "hidden",
            }}
          >
            {/* Card header */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "12px 14px 10px",
              borderBottom: "1px solid rgba(212,168,67,0.1)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 14 }}>🕯</span>
                <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: "0.12em", color: "var(--text-muted)", textTransform: "uppercase" }}>
                  {t.yartzeitCardTitle}
                </span>
              </div>
              <span style={{ fontSize: 14, color: "#d4a843" }}>›</span>
            </div>

            {/* Entry rows */}
            {upcomingYahrzeits.map(({ entry, next }, i) => (
              <div key={entry.id} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 14px",
                borderBottom: i < upcomingYahrzeits.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                background: next!.isToday ? "rgba(212,168,67,0.08)" : "transparent",
              }}>
                {/* Days badge */}
                <div style={{
                  width: 46, height: 46, borderRadius: 12, flexShrink: 0,
                  background: next!.isToday
                    ? "linear-gradient(135deg, rgba(212,168,67,0.3), rgba(212,168,67,0.12))"
                    : "linear-gradient(135deg, rgba(212,168,67,0.14), rgba(212,168,67,0.05))",
                  border: `1px solid rgba(212,168,67,${next!.isToday ? "0.45" : "0.2"})`,
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  gap: 1,
                }}>
                  {next!.isToday ? (
                    <span style={{ fontSize: 22 }}>🕯</span>
                  ) : (
                    <>
                      <span style={{
                        fontSize: next!.daysAway >= 100 ? 14 : 20,
                        fontWeight: 900, lineHeight: 1,
                        color: next!.daysAway <= 7 ? "#f0c050" : "#d4a843",
                      }}>
                        {next!.daysAway}
                      </span>
                      <span style={{ fontSize: 7, color: "var(--text-muted)", fontWeight: 700, letterSpacing: "0.04em" }}>
                        {t.yartzeitCardDays.toUpperCase()}
                      </span>
                    </>
                  )}
                </div>

                {/* Name + Hebrew date */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 14, fontWeight: 700, color: next!.isToday ? "#f0c050" : "var(--text-primary)",
                    marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                  }}>
                    {next!.isToday && "✦ "}{entry.name}
                  </div>
                  <div style={{
                    fontFamily: "'Noto Serif Hebrew', serif",
                    fontSize: 13, color: "#d4a843", direction: "rtl", lineHeight: 1.2,
                  }}>
                    {hebrewDayNumeral(entry.hebrewDay)} {next!.monthName}
                  </div>
                  {!next!.isToday && (
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                      {next!.date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                  )}
                  {next!.isToday && (
                    <div style={{ fontSize: 11, color: "#d4a843", fontWeight: 600, marginTop: 2 }}>
                      {t.yartzeitCardToday}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {yahrzeitEntries.length > 3 && (
              <div style={{
                padding: "8px 14px",
                fontSize: 11, color: "var(--text-muted)", fontWeight: 600, textAlign: "center",
                borderTop: "1px solid rgba(255,255,255,0.04)",
              }}>
                +{yahrzeitEntries.length - 3} more · tap to view all
              </div>
            )}
          </div>
        ) : (
          <div
            onClick={onYartzeit}
            style={{
              marginBottom: 14, padding: "12px 16px", borderRadius: 12, cursor: "pointer",
              background: "rgba(212,168,67,0.03)",
              border: "1px dashed rgba(212,168,67,0.22)",
              display: "flex", alignItems: "center", gap: 10,
            }}
          >
            <span style={{ fontSize: 20 }}>🕯</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#d4a843", flex: 1 }}>
              {t.yartzeitCardSetup}
            </span>
            <span style={{ fontSize: 16, color: "#d4a843" }}>›</span>
          </div>
        )}

        <div className="card" style={{ marginBottom: 16, overflow: "hidden" }}>
          {[
            { label: t.settingsTahara, sub: t.settingsTaharaSub, action: onTahara },
            { label: t.settingsYartzeitCalc, sub: t.settingsYartzeitSub, action: onYartzeit },
            { label: t.settingsBirthday, sub: t.settingsBirthdaySub, action: onBirthday },
          ].map((item, i, arr) => (
            <div key={i}>
              <Row label={item.label} sub={item.sub} right={<span style={{ color: "var(--text-muted)" }}>›</span>} onClick={item.action} />
              {i < arr.length - 1 && <div style={{ height: 1, background: "var(--border)" }} />}
            </div>
          ))}
        </div>

        {/* Community */}
        <div className="section-header">COMMUNITY</div>
        <div className="card" style={{ marginBottom: 16, overflow: "hidden" }}>
          <Row label={t.settingsCommunity} sub={t.settingsCommunitySub} right={<span style={{ color: "var(--text-muted)" }}>›</span>} onClick={onCommunity} />
          <div style={{ height: 1, background: "var(--border)" }} />
          <Row label={t.settingsCensus} sub={t.settingsCensusSub} right={<span style={{ color: "var(--text-muted)" }}>›</span>} onClick={onCensus} />
        </div>

        {/* Premium */}
        <div
          onClick={onPremium}
          style={{ padding: 16, borderRadius: 14, marginBottom: 16, background: "linear-gradient(135deg, #1a2540, #0f1e38)", border: "1px solid rgba(212,168,67,0.3)", cursor: "pointer", display: "flex", alignItems: "center", gap: 14 }}
        >
          <span style={{ fontSize: 28 }}>⭐</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: "white" }}>{t.settingsUpgrade}</div>
            <div style={{ fontSize: 12, color: "#94a3b8" }}>{t.settingsUpgradeSub}</div>
          </div>
          <span style={{ color: "#d4a843", fontSize: 18 }}>›</span>
        </div>

        {/* Account */}
        <div className="section-header">{t.settingsAccount}</div>
        <div className="card" style={{ marginBottom: 16, overflow: "hidden" }}>
          {/* Release Notes row */}
          <div
            style={{
              padding: "14px 16px",
              display: "flex", alignItems: "center", gap: 12,
              cursor: "pointer",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
            }}
            onClick={onWhatsNew}
          >
            <span style={{ fontSize: 20, lineHeight: 1 }}>✨</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)" }}>{t.settingsWhatsNew}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>{t.settingsWhatsNewSub}</div>
            </div>
            <span style={{ color: "#d4a843", fontSize: 18 }}>›</span>
          </div>

          <div style={{ padding: "14px 16px" }} onClick={onSignOut}>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#ef4444", cursor: "pointer" }}>{t.settingsSignOut}</div>
          </div>
        </div>

        {/* Admin button — only visible to verified admins */}
        {isAdminUser && (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
            <button
              onClick={() => setAdminMode("panel")}
              style={{
                background: "none", border: "1px solid var(--border)", borderRadius: 99,
                padding: "7px 18px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                color: "var(--text-muted)", fontSize: 12, fontWeight: 600,
              }}
            >
              <span>🔐</span>
              <span>Admin</span>
            </button>
          </div>
        )}

        {/* Version */}
        <div style={{ textAlign: "center", padding: "8px 0 16px", opacity: 0.4 }}>
          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{t.settingsVersion} · v1.2</div>
          <div style={{ fontFamily: "'Noto Serif Hebrew', serif", fontSize: 14, color: "var(--gold)", marginTop: 4 }}>ברוך הבא</div>
        </div>
      </div>
    </div>
  );
}
