export type Lang = "en" | "tk";

export interface Translations {
  /* ── Landing ── */
  landingBadge: string;
  landingHero: string;
  landingSubtitle: string;
  landingSignIn: string;
  landingFree: string;
  landingScroll: string;
  landingFeaturesEyebrow: string;
  landingFeaturesHeading: string;
  landingFeaturesSubHeading: string;
  featureZmanimTitle: string;
  featureZmanimDesc: string;
  featureTorahTitle: string;
  featureTorahDesc: string;
  featureCommunityTitle: string;
  featureCommunityDesc: string;
  statsParashot: string;
  statsHolidays: string;
  statsCommunities: string;
  ctaHeading: string;
  ctaSubtitle: string;

  /* ── BottomNav ── */
  navHome: string;
  navCalendar: string;
  navZmanim: string;
  navSiddur: string;
  navSettings: string;

  /* ── Settings ── */
  settingsTitle: string;
  settingsLocation: string;
  settingsCity: string;
  settingsCityHint: string;
  settingsTimezone: string;
  settingsAppearance: string;
  settingsDarkMode: string;
  settingsDarkOn: string;
  settingsDarkOff: string;
  settingsShowHebrew: string;
  settingsLanguage: string;
  settingsLanguageHint: string;
  settingsEditTranslations: string;
  settingsEditTranslationsHint: string;
  settingsNotifications: string;
  settingsCandleLighting: string;
  settingsHavdalah: string;
  settingsShema: string;
  settingsPrayers: string;
  settingsHolidays: string;
  settingsParasha: string;
  settingsOmer: string;
  settingsShabbatDigest: string;
  settingsYahrtzeit: string;
  settingsLeadTime: string;
  settingsLeadTimeHint: string;
  settingsBgPush: string;
  settingsBgPushDesc: string;
  settingsBgPushDescUnsupported: string;
  settingsEnablePush: string;
  settingsEnablingPush: string;
  settingsTestPush: string;
  settingsTestSent: string;
  settingsDisablePush: string;
  settingsPushActive: string;
  settingsTools: string;
  settingsTahara: string;
  settingsTaharaSub: string;
  settingsYartzeitCalc: string;
  settingsYartzeitSub: string;
  settingsBirthday: string;
  settingsBirthdaySub: string;
  settingsCommunity: string;
  settingsCommunitySub: string;
  settingsCensus: string;
  settingsCensusSub: string;
  settingsUpgrade: string;
  settingsUpgradeSub: string;
  settingsAccount: string;
  settingsSignOut: string;
  settingsVersion: string;
  settingsNotifBlocked: string;
  settingsNotifBlockedSub: string;
  settingsNotifUnsupported: string;
  settingsNotifActive: string;

  /* ── Home ── */
  homeToday: string;
  homeHebrewDate: string;
  homeGregorian: string;
  homeHebrewYear: string;
  homeZmanim: string;
  homeViewAll: string;
  homeSunrise: string;
  homeSunset: string;
  homeCandleLighting: string;
  homeHavdalahTonight: string;
  homeShabbatShalom: string;
  homeShabbatInProgress: string;
  homeHavdalahAt: string;
  homeShavuaTov: string;
  homeDailyTorah: string;
  homeReadMore: string;
  homeShowLess: string;
  homeShare: string;
  homeTodayHoliday: string;
  homeChagSameach: string;
  homeCommunityTitle: string;
  homeCommunityDesc: string;
  homeMembersTitle: string;
  homeMembersDesc: string;
  homeCensusTitle: string;
  homeCensusDesc: string;
  homeUpcomingHolidays: string;
  homeNoHolidays: string;
  homeParashah: string;
  homeDafYomi: string;
  homeMoreTools: string;
  homeOmer: string;

  /* ── Community FAB ── */
  fabTitle: string;
  fabAnnouncements: string;
  fabCommunityEvents: string;
  fabCommunityMemorial: string;
  fabTorahWisdom: string;
  fabPrayerBoard: string;
  fabTorahTracker: string;

  /* ── Translation Editor ── */
  txEditorTitle: string;
  txEditorSubtitle: string;
  txEditorSave: string;
  txEditorSaved: string;
  txEditorReset: string;
  txEditorResetConfirm: string;
  txEditorSearch: string;
  txEditorEnglish: string;
  txEditorThadou: string;
  txEditorGroupLanding: string;
  txEditorGroupNav: string;
  txEditorGroupSettings: string;
  txEditorGroupHome: string;
  txEditorNote: string;

  /* ── Shabbat banner ── */
  shabbatApproaching: string;
  shabbatShalomEn: string;
  shabbatShalomTk: string;
  shabbatCandleLighting: string;
  shabbatHavdalah: string;
  shabbatMinutes: string;

  /* ── Settings: What's New entry ── */
  settingsWhatsNew: string;
  settingsWhatsNewSub: string;

  /* ── What's New ── */
  whatsNewTitle: string;
  whatsNewSubtitle: string;
  whatsNewGotIt: string;

  /* ── Install prompt ── */
  installTitle: string;
  installBody: string;
  installBtn: string;
  installDismiss: string;
}

/* ──────────────────────────────────────────────────────────────
   ENGLISH
────────────────────────────────────────────────────────────── */
export const en: Translations = {
  landingBadge: "BNEI MENASHE",
  landingHero: "The Sacred Calendar\nof Bnei Menashe",
  landingSubtitle: "Accurate Zmanim, Torah wisdom, Jewish holidays, and community resources — all in one spiritual home.",
  landingSignIn: "Sign In",
  landingFree: "Free for the community · No account needed",
  landingScroll: "SCROLL",
  landingFeaturesEyebrow: "EVERYTHING YOU NEED",
  landingFeaturesHeading: "Your complete Jewish\nspiritual companion",
  landingFeaturesSubHeading: "Your complete Jewish spiritual companion",
  featureZmanimTitle: "Accurate Zmanim",
  featureZmanimDesc: "Precise daily prayer times calculated for your exact location — Shacharit, Mincha, Maariv, Shabbat candles, and more.",
  featureTorahTitle: "Torah Insights",
  featureTorahDesc: "Weekly Parashah, Daf Yomi, Siddur Library, and curated Torah wisdom for continuous Jewish learning.",
  featureCommunityTitle: "Community Hub",
  featureCommunityDesc: "Announcements, events, Yahrtzeit reminders, and resources tailored for the Bnei Menashe community worldwide.",
  statsParashot: "Weekly Parashot",
  statsHolidays: "Holiday Resources",
  statsCommunities: "Communities",
  ctaHeading: "Begin your journey",
  ctaSubtitle: "Join the Bnei Menashe community — free for everyone.",

  navHome: "Home",
  navCalendar: "Calendar",
  navZmanim: "Zmanim",
  navSiddur: "Siddur",
  navSettings: "Settings",

  settingsTitle: "Settings",
  settingsLocation: "LOCATION",
  settingsCity: "City",
  settingsCityHint: "Used for Zmanim calculations",
  settingsTimezone: "Timezone",
  settingsAppearance: "APPEARANCE",
  settingsDarkMode: "Dark Mode",
  settingsDarkOn: "Dark mode active",
  settingsDarkOff: "Light mode active",
  settingsShowHebrew: "Show Hebrew Dates",
  settingsLanguage: "Thadou Kuki Language",
  settingsLanguageHint: "Show labels in Thadou Kuki",
  settingsEditTranslations: "✏️ Edit Thadou Kuki Labels",
  settingsEditTranslationsHint: "Fix or improve any translation",
  settingsNotifications: "NOTIFICATIONS",
  settingsCandleLighting: "🕯 Candle Lighting",
  settingsHavdalah: "✨ Havdalah",
  settingsShema: "📖 Latest Shema",
  settingsPrayers: "🕍 Prayer Reminders",
  settingsHolidays: "✡ Holiday Alerts",
  settingsParasha: "📜 Weekly Parasha",
  settingsOmer: "🌾 Omer Counting",
  settingsShabbatDigest: "📋 Shabbat Digest",
  settingsYahrtzeit: "🕯 Yahrtzeit Reminders",
  settingsLeadTime: "Reminder Lead Time",
  settingsLeadTimeHint: "How many minutes before each Zman to alert",
  settingsBgPush: "BACKGROUND PUSH NOTIFICATIONS",
  settingsBgPushDesc: "Receive notifications even when the app is closed or your device is locked. Your current notification preferences above will be sent in the background.",
  settingsBgPushDescUnsupported: "Background push notifications are not supported in this browser.",
  settingsEnablePush: "🔔 Enable Background Push",
  settingsEnablingPush: "Enabling…",
  settingsTestPush: "🧪 Send Test Push",
  settingsTestSent: "✓ Test Sent!",
  settingsDisablePush: "Disable",
  settingsPushActive: "Active — notifications scheduled for",
  settingsTools: "TOOLS",
  settingsTahara: "Tahara Calculator",
  settingsTaharaSub: "Mikveh & purity timing",
  settingsYartzeitCalc: "Yahrzeit Calculator",
  settingsYartzeitSub: "Anniversary of passing",
  settingsBirthday: "Hebrew Birthday",
  settingsBirthdaySub: "Your Jewish birthday",
  settingsCommunity: "Community",
  settingsCommunitySub: "Bnei Menashe worldwide",
  settingsCensus: "Census & Demographics",
  settingsCensusSub: "Community statistics",
  settingsUpgrade: "Upgrade to Premium",
  settingsUpgradeSub: "Unlock all features — 7 days free",
  settingsAccount: "ACCOUNT",
  settingsSignOut: "Sign Out",
  settingsVersion: "Menashe Calendar",
  settingsNotifBlocked: "Notifications blocked",
  settingsNotifBlockedSub: "Open your browser settings and allow notifications for this site",
  settingsNotifUnsupported: "Not supported in this browser",
  settingsNotifActive: "Active",

  homeToday: "TODAY",
  homeHebrewDate: "HEBREW DATE",
  homeGregorian: "GREGORIAN",
  homeHebrewYear: "Hebrew Year",
  homeZmanim: "ZMANIM",
  homeViewAll: "VIEW ALL »",
  homeSunrise: "SUNRISE",
  homeSunset: "SUNSET",
  homeCandleLighting: "CANDLE LIGHTING",
  homeHavdalahTonight: "HAVDALAH TONIGHT",
  homeShabbatShalom: "Shabbat Shalom",
  homeShabbatInProgress: "Shabbat is in progress",
  homeHavdalahAt: "Havdalah at",
  homeShavuaTov: "Shavua Tov — a wonderful week!",
  homeDailyTorah: "📖 DAILY TORAH THOUGHT",
  homeReadMore: "Read more ↓",
  homeShowLess: "Show less ↑",
  homeShare: "↑ Share",
  homeTodayHoliday: "TODAY'S HOLIDAY",
  homeChagSameach: "Chag Sameach! 🎉",
  homeCommunityTitle: "Community",
  homeCommunityDesc: "Shavei Israel, Torah classes, connect with members",
  homeMembersTitle: "Member Directory",
  homeMembersDesc: "Browse & register in the community directory",
  homeCensusTitle: "Census & Demographics",
  homeCensusDesc: "Fill out the community census form and view statistics",
  homeUpcomingHolidays: "UPCOMING HOLIDAYS",
  homeNoHolidays: "No upcoming holidays",
  homeParashah: "PARASHAH",
  homeDafYomi: "DAF YOMI",
  homeMoreTools: "More Tools",
  homeOmer: "OMER",

  fabTitle: "Community Hub",
  fabAnnouncements: "Announcements",
  fabCommunityEvents: "Community Events",
  fabCommunityMemorial: "Community Memorial",
  fabTorahWisdom: "48 Ways to Torah Wisdom",
  fabPrayerBoard: "Prayer Board",
  fabTorahTracker: "Torah Tracker",

  txEditorTitle: "Edit Thadou Kuki Labels",
  txEditorSubtitle: "Correct any translation below. Changes are saved on your device.",
  txEditorSave: "Save Changes",
  txEditorSaved: "✓ Saved!",
  txEditorReset: "Reset to Default",
  txEditorResetConfirm: "Reset all Thadou Kuki labels to the built-in defaults?",
  txEditorSearch: "Search labels…",
  txEditorEnglish: "English",
  txEditorThadou: "Thadou Kuki",
  txEditorGroupLanding: "Landing Page",
  txEditorGroupNav: "Navigation",
  txEditorGroupSettings: "Settings",
  txEditorGroupHome: "Home Page",
  txEditorNote: "Tip: Switch the app to Thadou Kuki mode (Settings → Appearance) to see your changes live.",

  shabbatApproaching: "Shabbat begins soon",
  shabbatShalomEn: "Shabbat Shalom",
  shabbatShalomTk: "Shabbat Shalom",
  shabbatCandleLighting: "Candle lighting",
  shabbatHavdalah: "Havdalah",
  shabbatMinutes: "min away",

  settingsWhatsNew: "Release Notes",
  settingsWhatsNewSub: "See what changed in this version",

  whatsNewTitle: "What's New",
  whatsNewSubtitle: "Highlights from the latest update",
  whatsNewGotIt: "Got it — let's go!",

  installTitle: "Add to Home Screen",
  installBody: "Install Menashe Calendar for quick access.",
  installBtn: "Install",
  installDismiss: "Not now",
};

/* ──────────────────────────────────────────────────────────────
   THADOU KUKI  (community can correct via the in-app editor)
────────────────────────────────────────────────────────────── */
export const tk: Translations = {
  landingBadge: "BNEI MENASHE",
  landingHero: "Bnei Menashe Gil\nNi Thu Leh Thla",
  landingSubtitle: "Zmanim chiang tak, Torah thu, ni thianghlim leh mipil thupek — inn khat ah phung.",
  landingSignIn: "Lut Ta",
  landingFree: "Mipil tan belin · Account hau lo",
  landingScroll: "SENG",
  landingFeaturesEyebrow: "NA HAUT ZAWNG",
  landingFeaturesHeading: "Na thu neksang\nsanggam khat",
  landingFeaturesSubHeading: "Na thu neksang sanggam khat",
  featureZmanimTitle: "Zmanim Chiang Tak",
  featureZmanimDesc: "Zingkha thu dawt, Mincha, Maariv leh Shabbat katni — na hmun chiangin phuah.",
  featureTorahTitle: "Torah Thu",
  featureTorahDesc: "Parashah thupek, Daf Yomi, Siddur leh Torah thu — ni tin khawl theih.",
  featureCommunityTitle: "Mipil Inn",
  featureCommunityDesc: "Thupek, lawmman, Yahrtzeit leh Bnei Menashe mipil thupek zawng zawng.",
  statsParashot: "Thupek Parashot",
  statsHolidays: "Ni Thianghlim",
  statsCommunities: "Mipil Innkuan",
  ctaHeading: "Na lamka phun ta",
  ctaSubtitle: "Bnei Menashe mipil tan bel a — mipil zawng zawng tan.",

  navHome: "Inn",
  navCalendar: "Ni Thu",
  navZmanim: "Zmanim",
  navSiddur: "Thu Ziak",
  navSettings: "Siam Dan",

  settingsTitle: "Siam Dan",
  settingsLocation: "HMUN",
  settingsCity: "Khua",
  settingsCityHint: "Zmanim thlen tan hmang",
  settingsTimezone: "Ni Sung Dan",
  settingsAppearance: "SIM BUATSAIH",
  settingsDarkMode: "Zim Bel",
  settingsDarkOn: "Zim bel a khang mek",
  settingsDarkOff: "Lim bel a khang mek",
  settingsShowHebrew: "Hebrew Ni Thu En",
  settingsLanguage: "Thadou Kuki Thu",
  settingsLanguageHint: "Thadou Kuki thuin sim",
  settingsEditTranslations: "✏️ Thadou Kuki Label Siam",
  settingsEditTranslationsHint: "Label dang tak siam theih",
  settingsNotifications: "THUPEK HLA",
  settingsCandleLighting: "🕯 Katni Mei",
  settingsHavdalah: "✨ Havdalah",
  settingsShema: "📖 Shema Hnung Ber",
  settingsPrayers: "🕍 Thu Dawt Hla",
  settingsHolidays: "✡ Ni Thianghlim Hla",
  settingsParasha: "📜 Parashah Thupek",
  settingsOmer: "🌾 Omer Chhiar",
  settingsShabbatDigest: "📋 Shabbat Sawi",
  settingsYahrtzeit: "🕯 Yahrtzeit Hla",
  settingsLeadTime: "Hla Dan Thlawhna",
  settingsLeadTimeHint: "Zman hma chuan minit engzat ngai",
  settingsBgPush: "THLEN CHHAH HLABU",
  settingsBgPushDesc: "App a tawp ngin emaw device a lock ngemin hlabu dawng theih. Hla dan na siam ang in thlen a ni.",
  settingsBgPushDescUnsupported: "Hei browser hian chhah hlabu a support lo.",
  settingsEnablePush: "🔔 Chhah Hlabu On",
  settingsEnablingPush: "A on mek…",
  settingsTestPush: "🧪 Test Hlabu Thawn",
  settingsTestSent: "✓ Thawn Zo!",
  settingsDisablePush: "Off Siam",
  settingsPushActive: "A on mek —",
  settingsTools: "THIL TIHDAN",
  settingsTahara: "Tahara Chhiar",
  settingsTaharaSub: "Mikveh leh ropui dan",
  settingsYartzeitCalc: "Yahrzeit Chhiar",
  settingsYartzeitSub: "Thi ni chhiar",
  settingsBirthday: "Hebrew Nirualna",
  settingsBirthdaySub: "Na nirualna Jewish",
  settingsCommunity: "Mipil",
  settingsCommunitySub: "Bnei Menashe mipil hmun hrang hrang",
  settingsCensus: "Mipil Chhiar",
  settingsCensusSub: "Mipil hmasawn",
  settingsUpgrade: "Premium Nei Ta",
  settingsUpgradeSub: "Zawng zawng en theih — 7 ni bel",
  settingsAccount: "ACCOUNT",
  settingsSignOut: "Tawp Ta",
  settingsVersion: "Menashe Ni Thu",
  settingsNotifBlocked: "Hlabu a block",
  settingsNotifBlockedSub: "Browser siam dan chu thlak la, hlabu dawng theihna pe rawh",
  settingsNotifUnsupported: "Hei browser hian a support lo",
  settingsNotifActive: "A on mek",

  homeToday: "NIZAN",
  homeHebrewDate: "HEBREW NI",
  homeGregorian: "GREGORIAN",
  homeHebrewYear: "Hebrew Kum",
  homeZmanim: "ZMANIM",
  homeViewAll: "ZAWNG EN »",
  homeSunrise: "NI CHHUAK",
  homeSunset: "NI TLAI",
  homeCandleLighting: "KATNI MEI",
  homeHavdalahTonight: "ZAN HAVDALAH",
  homeShabbatShalom: "Shabbat Shalom",
  homeShabbatInProgress: "Shabbat a lo mek",
  homeHavdalahAt: "Havdalah ni a",
  homeShavuaTov: "Shavua Tov — Zarhnawk thar!",
  homeDailyTorah: "📖 NIZAN TORAH THU",
  homeReadMore: "Ziak zawk ↓",
  homeShowLess: "Zawk lo ↑",
  homeShare: "↑ Sawi Chhuak",
  homeTodayHoliday: "NIZAN NI THIANGHLIM",
  homeChagSameach: "Chag Sameach! 🎉",
  homeCommunityTitle: "Mipil",
  homeCommunityDesc: "Shavei Israel, Torah class, member te nen in inhmuh",
  homeMembersTitle: "Member Directory",
  homeMembersDesc: "Mipil directory-ah register la member te en",
  homeCensusTitle: "Mipil Chhiar",
  homeCensusDesc: "Mipil census form thlak la statistics en",
  homeUpcomingHolidays: "NI THIANGHLIM HLA",
  homeNoHolidays: "Ni thianghlim hla awm lo",
  homeParashah: "PARASHAH",
  homeDafYomi: "DAF YOMI",
  homeMoreTools: "Thil Pawimawh Zawk",
  homeOmer: "OMER",

  fabTitle: "Mipil Inn",
  fabAnnouncements: "Thupek",
  fabCommunityEvents: "Mipil Lawmman",
  fabCommunityMemorial: "Mipil Thi Ni",
  fabTorahWisdom: "Torah Thu 48 Dan",
  fabPrayerBoard: "Thu Dawt Hmang",
  fabTorahTracker: "Torah Chhiar",

  txEditorTitle: "Thadou Kuki Label Siam",
  txEditorSubtitle: "Label dang tak chu hnuaiah siam rawh. Na device-ah chhuang a ni.",
  txEditorSave: "Chhuang Ta",
  txEditorSaved: "✓ Chhuangin zo!",
  txEditorReset: "Default Ah Chhawn",
  txEditorResetConfirm: "Thadou Kuki label zawng zawng default-ah chhawn ang em?",
  txEditorSearch: "Label zawng…",
  txEditorEnglish: "English",
  txEditorThadou: "Thadou Kuki",
  txEditorGroupLanding: "Landing Page",
  txEditorGroupNav: "Lampi (Nav)",
  txEditorGroupSettings: "Siam Dan",
  txEditorGroupHome: "Inn Page",
  txEditorNote: "Tip: Thadou Kuki mode on siam la (Siam Dan → SIM BUATSAIH) nakin na siam zawng en theih.",

  shabbatApproaching: "Shabbat a thleng a tlem",
  shabbatShalomEn: "Shabbat Shalom",
  shabbatShalomTk: "Shabbat Shalom — Ni Thianghlim",
  shabbatCandleLighting: "Kerhi hun",
  shabbatHavdalah: "Havdalah",
  shabbatMinutes: "min chhung",

  settingsWhatsNew: "Release Notes",
  settingsWhatsNewSub: "Version thar-ah thil thar zawng en",

  whatsNewTitle: "Thar Zawng Zawng",
  whatsNewSubtitle: "Update thar ber-ah thil thar zawng",
  whatsNewGotIt: "A lo — kal ang!",

  installTitle: "Home Screen-ah Chhuang",
  installBody: "Menashe Calendar install siam la a hun zel.",
  installBtn: "Install",
  installDismiss: "Hun dang ah",
};

const translations: Record<Lang, Translations> = { en, tk };
export default translations;
