import { useState, useEffect, useCallback, useRef } from "react";
import {
  ClerkProvider,
  SignIn,
  SignUp,
  Show,
  useClerk,
  useUser,
} from "@clerk/react";
import { fetchUserProfile, saveUserProfile, fetchPublicProfile, type PublicProfile } from "./lib/userApi";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { dark } from "@clerk/themes";
import { Switch, Route, useLocation, Router as WouterRouter, Redirect } from "wouter";
import { LanguageProvider } from "./context/LanguageContext";
import Landing from "./pages/Landing";
import Home from "./pages/Home";
import CalendarPage from "./pages/CalendarPage";
import ZmanimPage from "./pages/ZmanimPage";
import SiddurPage from "./pages/SiddurPage";
import SettingsPage from "./pages/SettingsPage";
import PremiumPage from "./pages/PremiumPage";
import BottomNav from "./components/BottomNav";
import { useNotifications } from "./hooks/useNotifications";
import { useUnreadAnnouncements } from "./hooks/useUnreadAnnouncements";
import { usePushSubscription } from "./hooks/usePushSubscription";
import { useAnnouncements } from "./hooks/useAnnouncements";

import LocationModal from "./modals/LocationModal";
import DayModal from "./modals/DayModal";
import HolidaysModal from "./modals/HolidaysModal";
import PremiumModal from "./modals/PremiumModal";
import ParashahModal from "./modals/ParashahModal";
import DafYomiModal from "./modals/DafYomiModal";
import SefariaSearchModal from "./modals/SefariaSearchModal";
import HebrewDateModal from "./modals/HebrewDateModal";
import LuachModal from "./modals/LuachModal";
import MussarModal from "./modals/MussarModal";
import ZmanimInfoModal from "./modals/ZmanimInfoModal";
import TorahNoteModal from "./modals/TorahNoteModal";
import BirthdayModal from "./modals/BirthdayModal";
import TaharaModal from "./modals/TaharaModal";
import YartzeitModal from "./modals/YartzeitModal";
import CommunityModal from "./modals/CommunityModal";
import CensusModal from "./modals/CensusModal";
import AnnouncementsModal from "./modals/AnnouncementsModal";
import EventsModal from "./modals/EventsModal";
import MemberDirectoryModal from "./modals/MemberDirectoryModal";
import PrayerBoardModal from "./modals/PrayerBoardModal";
import TorahTrackerModal from "./modals/TorahTrackerModal";
import ProfileModal from "./modals/ProfileModal";
import SharePage from "./pages/SharePage";
import BookReaderModal from "./modals/BookReaderModal";
import AdminModal from "./modals/AdminModal";
import OmerModal from "./modals/OmerModal";
import PrayerTimesModal from "./modals/PrayerTimesModal";
import CommunityYahrzeitModal from "./modals/CommunityYahrzeitModal";
import MoreToolsModal from "./pages/MoreToolsModal";
import NotificationDrawer from "./components/NotificationDrawer";

import { LOCATIONS, Location } from "./lib/locations";
import type { Book } from "./pages/SiddurPage";

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

const clerkAppearance = {
  baseTheme: dark,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#D4AF37",
    colorForeground: "#F5F0E8",
    colorMutedForeground: "#A89070",
    colorDanger: "#ef4444",
    colorBackground: "#0F1829",
    colorInput: "#1a2440",
    colorInputForeground: "#F5F0E8",
    colorNeutral: "#2a3a5c",
    fontFamily: "'Inter', sans-serif",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-[#0F1829] border border-[#D4AF37]/20 rounded-2xl w-[440px] max-w-full overflow-hidden shadow-xl shadow-black/40",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-[#D4AF37] font-bold",
    headerSubtitle: "text-[#A89070]",
    socialButtonsBlockButtonText: "text-[#F5F0E8]",
    formFieldLabel: "text-[#A89070]",
    footerActionLink: "text-[#D4AF37] hover:text-[#F5F0E8]",
    footerActionText: "text-[#A89070]",
    dividerText: "text-[#A89070]",
    identityPreviewEditButton: "text-[#D4AF37]",
    formFieldSuccessText: "text-green-400",
    alertText: "text-[#F5F0E8]",
    logoBox: "flex justify-center mb-2",
    logoImage: "h-10",
    socialButtonsBlockButton: "border-[#2a3a5c] bg-[#1a2440] text-[#F5F0E8] hover:bg-[#243050]",
    formButtonPrimary: "bg-[#D4AF37] text-[#0F1829] font-bold hover:bg-[#c9a430]",
    formFieldInput: "bg-[#1a2440] border-[#2a3a5c] text-[#F5F0E8]",
    footerAction: "bg-[#0a1020]",
    dividerLine: "bg-[#2a3a5c]",
    alert: "bg-[#1a2440] border-[#D4AF37]/30",
    otpCodeFieldInput: "bg-[#1a2440] border-[#2a3a5c] text-[#F5F0E8]",
    formFieldRow: "gap-2",
    main: "gap-4",
  },
};

const darkCardAppearance = {
  cssLayerName: "clerk",
  options: { logoPlacement: "none" as const },
  variables: {
    colorPrimary: "#D4AF37",
    colorForeground: "#F0EDE4",
    colorMutedForeground: "#9a9080",
    colorDanger: "#ef4444",
    colorBackground: "#111118",
    colorInput: "#18181f",
    colorInputForeground: "#F0EDE4",
    colorNeutral: "#2a2a36",
    fontFamily: "'Inter', -apple-system, sans-serif",
    borderRadius: "0.65rem",
    fontSize: "15px",
  },
  elements: {
    rootBox: "w-full",
    cardBox: "w-full !shadow-none !rounded-none !bg-[#111118]",
    card: "!shadow-none !border-0 !bg-[#111118] !rounded-none !px-2",
    footer: "!shadow-none !border-0 !bg-[#0e0e16] !rounded-none",
    headerTitle: "!text-[#F5D982] !font-bold !text-[22px] !tracking-[-0.02em]",
    headerSubtitle: "!text-[#807060] !text-[13px]",
    socialButtonsBlockButton: "!border !border-[#d8d8d8] !bg-white !text-[#3c4043] hover:!bg-[#f5f5f5] !shadow-[0_1px_3px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.08)] !font-medium !transition-all",
    socialButtonsBlockButtonText: "!text-[#3c4043] !font-medium",
    formFieldLabel: "!text-[#807060] !font-semibold !text-[11px] !tracking-[0.08em] !uppercase",
    formFieldInput: "!bg-[#18181f] !border-[#2a2a36] !text-[#F0EDE4] !rounded-[0.65rem] !text-[15px] focus:!border-[#D4AF37]/60 focus:!shadow-[0_0_0_3px_rgba(212,175,55,0.12)] !transition-all !h-[46px]",
    formButtonPrimary: [
      "!bg-[linear-gradient(180deg,#F0C840_0%,#C49A20_100%)]",
      "!text-[#0a0800]",
      "!font-bold",
      "!text-[15px]",
      "!tracking-[0.02em]",
      "!h-[48px]",
      "!shadow-[0_5px_0_rgba(100,70,5,0.85),0_8px_24px_rgba(212,175,55,0.25)]",
      "hover:!shadow-[0_2px_0_rgba(100,70,5,0.85),0_4px_12px_rgba(212,175,55,0.2)]",
      "hover:!translate-y-[3px]",
      "active:!shadow-[0_0px_0_rgba(100,70,5,0.85)]",
      "active:!translate-y-[5px]",
      "!transition-all !duration-100",
      "!rounded-[0.65rem]",
    ].join(" "),
    footerActionLink: "!text-[#D4AF37] hover:!text-[#f0c94a] !font-semibold",
    footerActionText: "!text-[#706050]",
    dividerText: "!text-[#706050] !text-[12px]",
    dividerLine: "!bg-[#2a2a36]",
    alert: "!bg-[#18181f] !border !border-[#D4AF37]/25",
    alertText: "!text-[#F0EDE4]",
    identityPreviewEditButton: "!text-[#D4AF37]",
    formFieldSuccessText: "!text-emerald-400",
    otpCodeFieldInput: "!bg-[#18181f] !border-[#2a2a36] !text-[#F0EDE4] !h-[52px]",
    footerAction: "!bg-[#0e0e16] !border-t !border-[#1e1e28]",
    main: "!gap-5 !bg-[#111118]",
    formFieldRow: "!gap-3",
    formResendCodeLink: "!text-[#D4AF37]",
  },
};

type Page = "home" | "calendar" | "zmanim" | "siddur" | "settings" | "premium";
type Modal =
  | "location" | "holidays" | "premium" | "parashah" | "dafyomi" | "zmaniminfo"
  | "torahnote" | "birthday" | "tahara" | "yartzeit" | "community" | "census"
  | "more" | "admin" | "omer" | "prayers" | "sefaria" | "hebrewdate" | "luach" | "mussar"
  | "announcements" | "events" | "members" | "prayers-board" | "torah-tracker" | "profile"
  | "community-yahrzeit" | "notifications" | null;

type DayInfo = { day: number; month: number; year: number } | null;

/* ── Shared auth card wrapper — Bold 3D ─────────────────────────── */
function AuthCard({ children }: { children: React.ReactNode }) {
  const photoUrl = `${basePath}/saipikhup-photo.jpg`;
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        position: "relative",
        backgroundImage: `url(${photoUrl})`,
        backgroundSize: "cover",
        backgroundPosition: "center top",
      }}
    >
      {/* Deep dark veil */}
      <div aria-hidden style={{ position: "absolute", inset: 0, background: "rgba(3,3,8,0.88)", pointerEvents: "none" }} />
      {/* Subtle center radial glow */}
      <div aria-hidden style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 55% 50% at 50% 52%, rgba(212,175,55,0.05) 0%, transparent 70%)", pointerEvents: "none" }} />

      {/* ── 3D CARD ── */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          width: "100%",
          maxWidth: 448,
          borderRadius: "20px",
          overflow: "hidden",
          /* Light source from top-left — brighter top border */
          borderTop: "1.5px solid rgba(212,175,55,0.65)",
          borderLeft: "1px solid rgba(212,175,55,0.28)",
          borderRight: "1px solid rgba(212,175,55,0.18)",
          borderBottom: "1px solid rgba(212,175,55,0.12)",
          /* 5-layer shadow stack for floating 3D depth */
          boxShadow: [
            "0 1px 0 rgba(255,220,100,0.08)",
            "0 6px 12px rgba(0,0,0,0.55)",
            "0 20px 48px rgba(0,0,0,0.75)",
            "0 52px 100px rgba(0,0,0,0.85)",
            "0 80px 140px rgba(0,0,0,0.60)",
            "0 0 80px rgba(212,175,55,0.07)",
          ].join(", "),
          transform: "perspective(1800px) rotateX(1.2deg)",
        }}
      >
        {/* ── PHOTO HEADER — real embroidery band ── */}
        <div
          style={{
            height: 210,
            position: "relative",
            overflow: "hidden",
            backgroundImage: `url(${photoUrl})`,
            backgroundSize: "310%",
            backgroundPosition: "center 87%",
          }}
        >
          {/* Dramatic vignette overlay */}
          <div aria-hidden style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to bottom, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.08) 38%, rgba(0,0,0,0.08) 62%, rgba(0,0,0,0.85) 100%)",
          }} />
          {/* Gold shimmer top edge */}
          <div aria-hidden style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg, transparent 0%, rgba(212,175,55,1) 35%, rgba(255,235,120,1) 50%, rgba(212,175,55,1) 65%, transparent 100%)" }} />
          {/* Side edge vignettes */}
          <div aria-hidden style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(0,0,0,0.4) 0%, transparent 20%, transparent 80%, rgba(0,0,0,0.4) 100%)" }} />

          {/* Logo badge + branding */}
          <div style={{ position: "relative", zIndex: 10, height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
            {/* 3D logo badge */}
            <img
              src="/logo.jpeg"
              alt="Bnei Menashe Calendar"
              style={{
                width: 80, height: 80,
                borderRadius: "20px",
                objectFit: "cover",
                boxShadow: [
                  "0 4px 20px rgba(0,0,0,0.9)",
                  "0 10px 40px rgba(0,0,0,0.7)",
                  "0 0 24px rgba(212,175,55,0.25)",
                ].join(", "),
                border: "2px solid rgba(212,175,55,0.6)",
              }}
            />

            <div style={{ textAlign: "center" }}>
              <div style={{
                color: "#F5D982",
                fontWeight: 800,
                fontSize: 22,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                fontFamily: "Georgia, serif",
                textShadow: "0 2px 16px rgba(0,0,0,1), 0 1px 0 rgba(0,0,0,0.9), 0 0 30px rgba(212,175,55,0.2)",
                lineHeight: 1,
              }}>
                Bnei Menashe
              </div>
              <div style={{
                color: "rgba(245,217,130,0.65)",
                fontSize: 10,
                letterSpacing: "0.30em",
                textTransform: "uppercase",
                marginTop: 6,
                textShadow: "0 1px 8px rgba(0,0,0,1)",
              }}>
                Sacred Calendar
              </div>
            </div>
          </div>
        </div>

        {/* Bold gold separator */}
        <div aria-hidden style={{ height: 2, background: "linear-gradient(90deg, rgba(212,175,55,0.05) 0%, rgba(212,175,55,0.8) 30%, rgba(255,235,120,1) 50%, rgba(212,175,55,0.8) 70%, rgba(212,175,55,0.05) 100%)" }} />

        {/* ── FORM BODY ── */}
        <div style={{ background: "linear-gradient(180deg, #111118 0%, #0f0f16 100%)" }}>
          {children}
        </div>

        {/* Bottom accent bar */}
        <div style={{ height: 3, background: "linear-gradient(90deg, transparent 0%, rgba(212,175,55,0.22) 40%, rgba(212,175,55,0.35) 50%, rgba(212,175,55,0.22) 60%, transparent 100%)" }} />
      </div>
    </div>
  );
}

function SignInPage() {
  return (
    <AuthCard>
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
        appearance={darkCardAppearance}
      />
    </AuthCard>
  );
}

function SignUpPage() {
  return (
    <AuthCard>
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
        appearance={darkCardAppearance}
      />
    </AuthCard>
  );
}

function AppShell() {
  const { user, isLoaded: userLoaded } = useUser();
  const { signOut } = useClerk();
  const profileSyncedRef = useRef(false);
  const [publicProfile, setPublicProfile] = useState<PublicProfile | null>(null);

  const [activePage, setActivePage] = useState<Page>("home");
  const [modal, setModal] = useState<Modal>(null);
  const [dayModal, setDayModal] = useState<DayInfo>(null);
  const [readingBook, setReadingBook] = useState<Book | null>(null);
  const [siddurRefreshKey, setSiddurRefreshKey] = useState(0);
  const [toast, setToast] = useState("");
  const [theme, setThemeState] = useState<"dark" | "light">(() => {
    try { return (localStorage.getItem("menashe-theme") as "dark" | "light") || "dark"; } catch { return "dark"; }
  });
  const [location, setLocation] = useState<Location>(() => {
    try {
      const saved = localStorage.getItem("menashe-location");
      if (saved) return JSON.parse(saved);
    } catch {}
    return LOCATIONS[0];
  });
  const [shareToken] = useState(() => new URLSearchParams(window.location.search).get("share"));
  const [isPremium, setIsPremium] = useState(() => {
    try { return localStorage.getItem("menashe-is-premium") === "true"; } catch { return false; }
  });
  const [premiumJustApproved, setPremiumJustApproved] = useState(false);
  const [candleEnabled, setCandleEnabled] = useState(() => {
    try { return localStorage.getItem("menashe-candle-enabled") !== "false"; } catch { return true; }
  });

  // Load public profile (name/role/etc.) on sign-in
  useEffect(() => {
    if (!userLoaded || !user) return;
    fetchPublicProfile().then((p) => {
      if (p) setPublicProfile(p);
    });
  }, [userLoaded, user?.id]);

  // Load settings profile from server on first sign-in
  useEffect(() => {
    if (!userLoaded || !user) return;
    fetchUserProfile().then((profile) => {
      if (!profile) { profileSyncedRef.current = true; return; }
      if (profile.theme) {
        setThemeState(profile.theme);
        try { localStorage.setItem("menashe-theme", profile.theme); } catch {}
      }
      if (profile.location) {
        setLocation(profile.location);
        try { localStorage.setItem("menashe-location", JSON.stringify(profile.location)); } catch {}
      }
      if (profile.isPremium) {
        const wasNotPremium = localStorage.getItem("menashe-is-premium") !== "true";
        setIsPremium(true);
        try { localStorage.setItem("menashe-is-premium", "true"); } catch {}
        if (wasNotPremium) setPremiumJustApproved(true);
      }
      if (profile.candleEnabled !== undefined) {
        setCandleEnabled(profile.candleEnabled);
        try { localStorage.setItem("menashe-candle-enabled", String(profile.candleEnabled)); } catch {}
      }
      profileSyncedRef.current = true;
    });
  }, [userLoaded, user?.id]);

  // Save profile to server whenever key preferences change
  useEffect(() => {
    if (!profileSyncedRef.current) return;
    saveUserProfile({ theme, location, isPremium, candleEnabled });
  }, [theme, location, isPremium, candleEnabled]);

  function onPremiumActivated() {
    setIsPremium(true);
    try { localStorage.setItem("menashe-is-premium", "true"); } catch {}
    showToast("✨ Premium activated!");
  }

  function onToggleCandle() {
    const next = !candleEnabled;
    setCandleEnabled(next);
    try { localStorage.setItem("menashe-candle-enabled", String(next)); } catch {}
  }

  const { permission: notifPermission, prefs: notifPrefs, leadTime, updatePref: updateNotifPref, updateLeadTime } = useNotifications(location);
  const { isSubscribed: pushSubscribed, isSupported: pushSupported, isLoading: pushLoading, error: pushError, subscribe: subscribePush, unsubscribe: unsubscribePush, sendTest: sendTestPush } = usePushSubscription(location, notifPrefs, leadTime, user?.id);
  const { announcements, addAnnouncement, updateAnnouncement, deleteAnnouncement, sendNow } = useAnnouncements();
  const { unreadCount: announcementCount, unreadAnnouncements, markAllRead: markAnnouncementsRead } = useUnreadAnnouncements();

  const isLight = theme === "light";
  const isAdmin = publicProfile?.role === "Admin";

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setThemeState(next);
    try { localStorage.setItem("menashe-theme", next); } catch {}
    showToast(`Switched to ${next} mode`);
  }

  function selectLocation(loc: Location) {
    setLocation(loc);
    try { localStorage.setItem("menashe-location", JSON.stringify(loc)); } catch {}
    setModal(null);
    showToast(`Location set to ${loc.name}`);
  }

  const closeModal = useCallback(() => setModal(null), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (readingBook) { setReadingBook(null); return; }
        setModal(null);
        setDayModal(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [readingBook]);

  if (shareToken) return <SharePage token={shareToken} />;

  function renderPage() {
    switch (activePage) {
      case "home":
        return (
          <Home
            location={location}
            theme={theme}
            isPremium={isPremium}
            candleEnabled={candleEnabled}
            onNavigate={(p) => setActivePage(p as Page)}
            onMoreTools={() => setModal("more")}
            onShowHolidays={() => setModal("holidays")}
            onShowParashah={() => setModal("parashah")}
            onShowPremium={() => setActivePage("premium")}
            onShowDafYomi={() => setModal("dafyomi")}
            onShowOmer={() => setModal("omer")}
            onLocationClick={() => setModal("location")}
            onToggleTheme={toggleTheme}
            onOpenSiddur={() => setActivePage("siddur")}
            onShowCommunity={() => setModal("community")}
            onShowCensus={() => setModal("census")}
            onNotifBell={() => setModal("notifications")}
            notifActive={Object.values(notifPrefs).some(Boolean)}
            announcementCount={announcementCount}
            onShowAnnouncements={() => setModal("announcements")}
            onShowEvents={() => setModal("events")}
            onShowCommunityYahrzeit={() => setModal("community-yahrzeit")}
            onShowMussar={() => setModal("mussar")}
            onShowPrayerBoard={() => setModal("prayers-board")}
            onShowTorahTracker={() => setModal("torah-tracker")}
          />
        );
      case "calendar":
        return (
          <CalendarPage
            location={location}
            onNavigate={(p) => setActivePage(p as Page)}
            onDayClick={(d, m, y) => setDayModal({ day: d, month: m, year: y })}
            onLocationClick={() => setModal("location")}
          />
        );
      case "zmanim":
        return (
          <ZmanimPage
            location={location}
            onInfo={() => setModal("zmaniminfo")}
            onLocationClick={() => setModal("location")}
          />
        );
      case "siddur":
        return (
          <SiddurPage
            onReadBook={(book) => setReadingBook(book)}
            onAdmin={() => { if (isAdmin) setModal("admin"); }}
            adminPin="1948"
            refreshKey={siddurRefreshKey}
            isPremium={isPremium}
            onShowPremium={() => setActivePage("premium")}
            isAdmin={isAdmin}
          />
        );
      case "settings":
        return (
          <SettingsPage
            theme={theme}
            location={location}
            onToggleTheme={toggleTheme}
            onLocationClick={() => setModal("location")}
            onPremium={() => setActivePage("premium")}
            onTahara={() => setModal("tahara")}
            onYartzeit={() => setModal("yartzeit")}
            onBirthday={() => setModal("birthday")}
            onCommunity={() => setModal("community")}
            onCensus={() => setModal("census")}
            onProfile={() => setModal("profile")}
            onSignOut={() => signOut({ redirectUrl: `${basePath}/` })}
            profileName={publicProfile?.displayName}
            profileRole={publicProfile?.role !== "Member" ? publicProfile?.role : undefined}
            notifPermission={notifPermission}
            notifPrefs={notifPrefs}
            leadTime={leadTime}
            onUpdateNotifPref={updateNotifPref}
            onUpdateLeadTime={updateLeadTime}
            pushSubscribed={pushSubscribed}
            pushSupported={pushSupported}
            pushLoading={pushLoading}
            pushError={pushError}
            onSubscribePush={subscribePush}
            onUnsubscribePush={unsubscribePush}
            onTestPush={sendTestPush}
          />
        );
      case "premium":
        return (
          <PremiumPage
            onUpgrade={() => setModal("premium")}
            onBack={() => setActivePage("home")}
          />
        );
    }
  }

  return (
    <LanguageProvider>
      <div className={`app-container${isLight ? " light-theme" : ""}`}>
        <div className="app-shell">
          {readingBook && (
            <BookReaderModal book={readingBook} onClose={() => setReadingBook(null)} />
          )}

          {modal === "admin" && (
            <AdminModal
              onClose={closeModal}
              onRefresh={() => { setSiddurRefreshKey(k => k + 1); closeModal(); showToast("Library updated"); }}
            />
          )}

          {!readingBook && modal !== "admin" && (
            <>
              <div className="screen fade-in">
                {renderPage()}
              </div>

              <BottomNav active={activePage} onNavigate={(p) => setActivePage(p as Page)} />

              {toast && <div className="toast">{toast}</div>}

              {premiumJustApproved && (
                <div
                  style={{
                    position: "fixed", inset: 0, zIndex: 9000,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: "rgba(0,0,0,0.72)", backdropFilter: "blur(6px)",
                    padding: "20px",
                  }}
                  onClick={() => setPremiumJustApproved(false)}
                >
                  <div
                    style={{
                      maxWidth: 340, width: "100%", borderRadius: 22, textAlign: "center",
                      background: "linear-gradient(145deg, #0f1e12, #1a2a10)",
                      border: "1.5px solid rgba(212,168,67,0.5)",
                      boxShadow: "0 0 60px rgba(212,168,67,0.25), 0 20px 60px rgba(0,0,0,0.6)",
                      padding: "32px 24px 28px",
                      animation: "fadeIn 0.35s ease",
                    }}
                    onClick={e => e.stopPropagation()}
                  >
                    <div style={{ fontSize: 52, marginBottom: 14, lineHeight: 1 }}>👑</div>
                    <div style={{
                      fontSize: 22, fontWeight: 900, marginBottom: 8,
                      background: "linear-gradient(135deg, #b8860b, #d4a843, #f0c96a)",
                      WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                    }}>
                      Premium Approved!
                    </div>
                    <div style={{ fontSize: 14, color: "rgba(255,255,255,0.75)", lineHeight: 1.65, marginBottom: 22 }}>
                      Welcome to Premium. You now have full access to all Zmanim, Torah study tracks, AI insights, and the complete Siddur library.
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      <button
                        onClick={() => { setPremiumJustApproved(false); setActivePage("home" as any); }}
                        style={{
                          padding: "14px", borderRadius: 13, border: "none", cursor: "pointer",
                          background: "linear-gradient(135deg, #b8860b, #d4a843, #f0c96a)",
                          color: "#1a0f00", fontSize: 15, fontWeight: 900,
                          boxShadow: "0 4px 20px rgba(212,168,67,0.4)",
                        }}
                      >
                        ✦ Explore Premium Features
                      </button>
                      <button
                        onClick={() => setPremiumJustApproved(false)}
                        style={{
                          padding: "11px", borderRadius: 13, border: "1px solid rgba(212,168,67,0.25)",
                          background: "transparent", color: "rgba(255,255,255,0.5)", fontSize: 13, cursor: "pointer",
                        }}
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {dayModal && (
                <DayModal {...dayModal} location={location} onClose={() => setDayModal(null)} />
              )}

              {modal === "notifications" && (
                <NotificationDrawer
                  onClose={closeModal}
                  notifPermission={notifPermission}
                  notifPrefs={notifPrefs}
                  leadTime={leadTime}
                  onUpdateNotifPref={updateNotifPref}
                  onUpdateLeadTime={updateLeadTime}
                  unreadAnnouncements={unreadAnnouncements}
                  onViewAllAnnouncements={() => { closeModal(); setTimeout(() => setModal("announcements"), 50); }}
                />
              )}

              {modal === "location" && (
                <LocationModal current={location} onSelect={selectLocation} onClose={closeModal} />
              )}
              {modal === "holidays" && <HolidaysModal onClose={closeModal} />}
              {modal === "premium" && <PremiumModal onClose={closeModal} onActivated={onPremiumActivated} />}
              {modal === "parashah" && <ParashahModal onClose={closeModal} />}
              {modal === "dafyomi" && <DafYomiModal onClose={closeModal} />}
              {modal === "sefaria" && <SefariaSearchModal onClose={closeModal} />}
              {modal === "hebrewdate" && <HebrewDateModal onClose={closeModal} />}
              {modal === "luach" && <LuachModal onClose={closeModal} />}
              {modal === "mussar" && <MussarModal onClose={closeModal} />}
              {modal === "zmaniminfo" && <ZmanimInfoModal onClose={closeModal} />}
              {modal === "torahnote" && <TorahNoteModal onClose={closeModal} />}
              {modal === "birthday" && <BirthdayModal onClose={closeModal} />}
              {modal === "tahara" && <TaharaModal onClose={closeModal} />}
              {modal === "yartzeit" && <YartzeitModal onClose={closeModal} location={location} onCommunityBoard={() => setModal("community-yahrzeit")} />}
              {modal === "community-yahrzeit" && (
                <CommunityYahrzeitModal onClose={closeModal} userName={publicProfile?.displayName} />
              )}
              {modal === "community" && <CommunityModal onClose={closeModal} onYahrzeitBoard={() => setModal("community-yahrzeit")} isAdmin={isAdmin} />}
              {modal === "census" && <CensusModal onClose={closeModal} />}
              {modal === "omer" && <OmerModal onClose={closeModal} />}
              {modal === "events" && <EventsModal onClose={closeModal} isAdmin={isAdmin} />}
              {modal === "members" && (
                <MemberDirectoryModal
                  onClose={closeModal}
                  userProfile={publicProfile ? {
                    name: publicProfile.displayName,
                    city: publicProfile.city,
                    country: publicProfile.country,
                    role: publicProfile.role,
                    bio: publicProfile.bio,
                  } : null}
                />
              )}
              {modal === "prayers-board" && (
                <PrayerBoardModal onClose={closeModal} userName={publicProfile?.displayName} />
              )}
              {modal === "torah-tracker" && <TorahTrackerModal onClose={closeModal} />}
              {modal === "profile" && (
                <ProfileModal
                  onClose={closeModal}
                  onSaved={(p) => setPublicProfile(p)}
                />
              )}
              {modal === "announcements" && (
                <AnnouncementsModal
                  onClose={() => { markAnnouncementsRead(); closeModal(); }}
                  announcements={announcements}
                  onAdd={addAnnouncement}
                  onUpdate={updateAnnouncement}
                  onDelete={deleteAnnouncement}
                  onSendNow={sendNow}
                  isAdmin={isAdmin}
                />
              )}
              {modal === "prayers" && (
                <PrayerTimesModal
                  onClose={closeModal}
                  location={location}
                  onSettings={() => { setActivePage("settings"); setModal(null); }}
                />
              )}
              {modal === "more" && (
                <MoreToolsModal
                  onClose={closeModal}
                  onTahara={() => setModal("tahara")}
                  onYartzeit={() => setModal("yartzeit")}
                  onCommunity={() => setModal("community")}
                  onCensus={() => setModal("census")}
                  onSettings={() => { setActivePage("settings"); setModal(null); }}
                  onDafYomi={() => setModal("dafyomi")}
                  onBirthday={() => setModal("birthday")}
                  onOmer={() => setModal("omer")}
                  onPrayers={() => setModal("prayers")}
                  onSefariaSearch={() => setModal("sefaria")}
                  onHebrewDate={() => setModal("hebrewdate")}
                  onLuach={() => setModal("luach")}
                  onMussar={() => setModal("mussar")}
                  onAnnouncements={() => setModal("announcements")}
                  onEvents={() => setModal("events")}
                  onMembers={() => setModal("members")}
                  onPrayerBoard={() => setModal("prayers-board")}
                  onTorahTracker={() => setModal("torah-tracker")}
                  isPremium={isPremium}
                  candleEnabled={candleEnabled}
                  onToggleCandle={onToggleCandle}
                  onShowPremium={() => { closeModal(); setActivePage("premium"); }}
                />
              )}
            </>
          )}
        </div>
      </div>
    </LanguageProvider>
  );
}

function HomeRoute() {
  return (
    <>
      <Show when="signed-in">
        <Redirect to="/app" />
      </Show>
      <Show when="signed-out">
        <LanguageProvider>
          <div className="app-container">
            <div className="app-shell">
              <Landing onSignIn={() => { window.location.href = `${basePath}/sign-in`; }} />
            </div>
          </div>
        </LanguageProvider>
      </Show>
    </>
  );
}

function AppRoute() {
  return (
    <>
      <Show when="signed-in">
        <AppShell />
      </Show>
      <Show when="signed-out">
        <Redirect to="/" />
      </Show>
    </>
  );
}

function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Welcome back",
            subtitle: "Sign in to access the sacred calendar",
          },
        },
        signUp: {
          start: {
            title: "Join Bnei Menashe",
            subtitle: "Create your account to get started",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <Switch>
        <Route path="/" component={HomeRoute} />
        <Route path="/app" component={AppRoute} />
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?" component={SignUpPage} />
        <Route>
          <Redirect to="/" />
        </Route>
      </Switch>
    </ClerkProvider>
  );
}

export default function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}
