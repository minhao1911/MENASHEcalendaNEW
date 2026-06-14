import { useState, useEffect, useCallback } from "react";
import Landing from "./pages/Landing";
import Home from "./pages/Home";
import CalendarPage from "./pages/CalendarPage";
import ZmanimPage from "./pages/ZmanimPage";
import SiddurPage from "./pages/SiddurPage";
import SettingsPage from "./pages/SettingsPage";
import PremiumPage from "./pages/PremiumPage";
import BottomNav from "./components/BottomNav";
import { useNotifications } from "./hooks/useNotifications";

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
import SharePage from "./pages/SharePage";
import BookReaderModal from "./modals/BookReaderModal";
import AdminModal from "./modals/AdminModal";
import OmerModal from "./modals/OmerModal";
import PrayerTimesModal from "./modals/PrayerTimesModal";
import MoreToolsModal from "./pages/MoreToolsModal";

import { LOCATIONS, Location } from "./lib/locations";
import type { Book } from "./pages/SiddurPage";

type Page = "home" | "calendar" | "zmanim" | "siddur" | "settings" | "premium";
type Modal =
  | "location" | "holidays" | "premium" | "parashah" | "dafyomi" | "zmaniminfo"
  | "torahnote" | "birthday" | "tahara" | "yartzeit" | "community" | "census"
  | "more" | "admin" | "omer" | "prayers" | "sefaria" | "hebrewdate" | "luach" | "mussar" | null;

type DayInfo = { day: number; month: number; year: number } | null;

export default function App() {
  const [signedIn, setSignedIn] = useState(false);
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

  if (!signedIn) {
    return (
      <div className={`app-container${isLight ? " light-theme" : ""}`}>
        <div className="app-shell">
          <Landing onSignIn={() => setSignedIn(true)} />
        </div>
      </div>
    );
  }

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
    <div className={`app-container${isLight ? " light-theme" : ""}`}>
      <div className="app-shell">
        {/* Book Reader — full-screen, shown above everything except itself */}
        {readingBook && (
          <BookReaderModal book={readingBook} onClose={() => setReadingBook(null)} />
        )}

        {/* Admin — full-screen */}
        {modal === "admin" && (
          <AdminModal
            onClose={closeModal}
            onRefresh={() => { setSiddurRefreshKey(k => k + 1); closeModal(); showToast("Library updated"); }}
          />
        )}

        {/* Normal app shell (hidden behind full-screen modals) */}
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
  );
}
