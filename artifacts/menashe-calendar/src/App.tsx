import { useState, useEffect, useCallback, useRef } from "react";
import {
  ClerkProvider,
  SignIn,
  SignUp,
  Show,
  useClerk,
  useUser,
} from "@clerk/react";
import { fetchUserProfile, saveUserProfile } from "./lib/userApi";
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
import SharePage from "./pages/SharePage";
import BookReaderModal from "./modals/BookReaderModal";
import AdminModal from "./modals/AdminModal";
import OmerModal from "./modals/OmerModal";
import PrayerTimesModal from "./modals/PrayerTimesModal";
import MoreToolsModal from "./pages/MoreToolsModal";

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

type Page = "home" | "calendar" | "zmanim" | "siddur" | "settings" | "premium";
type Modal =
  | "location" | "holidays" | "premium" | "parashah" | "dafyomi" | "zmaniminfo"
  | "torahnote" | "birthday" | "tahara" | "yartzeit" | "community" | "census"
  | "more" | "admin" | "omer" | "prayers" | "sefaria" | "hebrewdate" | "luach" | "mussar"
  | "announcements" | "events" | "members" | "prayers-board" | "torah-tracker" | null;

type DayInfo = { day: number; month: number; year: number } | null;

function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-4" style={{ background: "linear-gradient(135deg, #0a1020 0%, #0F1829 50%, #0a1525 100%)" }}>
      <SignIn routing="path" path={`${basePath}/sign-in`} signUpUrl={`${basePath}/sign-up`} />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center px-4" style={{ background: "linear-gradient(135deg, #0a1020 0%, #0F1829 50%, #0a1525 100%)" }}>
      <SignUp routing="path" path={`${basePath}/sign-up`} signInUrl={`${basePath}/sign-in`} />
    </div>
  );
}

function AppShell() {
  const { user, isLoaded: userLoaded } = useUser();
  const profileSyncedRef = useRef(false);

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
  const [candleEnabled, setCandleEnabled] = useState(() => {
    try { return localStorage.getItem("menashe-candle-enabled") !== "false"; } catch { return true; }
  });

  // Load profile from server on first sign-in
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
        setIsPremium(profile.isPremium);
        try { localStorage.setItem("menashe-is-premium", "true"); } catch {}
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
  const { isSubscribed: pushSubscribed, isSupported: pushSupported, isLoading: pushLoading, error: pushError, subscribe: subscribePush, unsubscribe: unsubscribePush, sendTest: sendTestPush } = usePushSubscription(location, notifPrefs, leadTime);
  const { announcements, addAnnouncement, updateAnnouncement, deleteAnnouncement, sendNow } = useAnnouncements();

  const isLight = theme === "light";

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
            onAdmin={() => setModal("admin")}
            adminPin="1948"
            refreshKey={siddurRefreshKey}
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

              {dayModal && (
                <DayModal {...dayModal} location={location} onClose={() => setDayModal(null)} />
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
              {modal === "yartzeit" && <YartzeitModal onClose={closeModal} location={location} />}
              {modal === "community" && <CommunityModal onClose={closeModal} />}
              {modal === "census" && <CensusModal onClose={closeModal} />}
              {modal === "omer" && <OmerModal onClose={closeModal} />}
              {modal === "events" && <EventsModal onClose={closeModal} />}
              {modal === "members" && <MemberDirectoryModal onClose={closeModal} />}
              {modal === "prayers-board" && <PrayerBoardModal onClose={closeModal} />}
              {modal === "torah-tracker" && <TorahTrackerModal onClose={closeModal} />}
              {modal === "announcements" && (
                <AnnouncementsModal
                  onClose={closeModal}
                  announcements={announcements}
                  onAdd={addAnnouncement}
                  onUpdate={updateAnnouncement}
                  onDelete={deleteAnnouncement}
                  onSendNow={sendNow}
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
