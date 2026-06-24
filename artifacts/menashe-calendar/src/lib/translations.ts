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
  annStripNew: string;
  celebTitle: string;
  celebDirLink: string;
  celebTypeBirthday: string;
  celebTypeAliyah: string;
  celebToday: string;
  celebTomorrow: string;
  celebInDays: string;
  annStripNews: string;
  annStripRead: string;
  shabbatBarTitle: string;
  shabbatBarTrialBadge: string;
  shabbatBarTrialEnd: string;
  shabbatBarUpgradeBtn: string;
  shabbatBarTonightLabel: string;
  shabbatBarPremiumBadge: string;
  homeOmer: string;
  omerSefiratTitle: string;
  omerDayCount: string;
  omerDaysLeft: string;
  omerDayLeft: string;

  /* ── Community FAB ── */
  fabTitle: string;
  fabAnnouncements: string;
  fabCommunityEvents: string;
  fabCommunityMemorial: string;
  fabTorahWisdom: string;
  fabPrayerBoard: string;
  fabTorahTracker: string;
  fabLocationMap: string;
  fabCompass: string;
  compassJerusalem: string;
  compassBearing: string;
  compassDistKm: string;
  compassFromCity: string;

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

  /* ── Rosh Chodesh banner ── */
  roshChodeshLabel: string;
  roshChodeshTodayTitle: string;
  roshChodeshTodaySub: string;
  roshChodeshTomorrowTitle: string;
  roshChodeshTomorrowSub: string;

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

  /* ── Splash screen ── */
  splashTagline: string;

  /* ── Onboarding ── */
  onboardingStep: string;
  onboardingSkip: string;
  onboardingNext: string;
  onboardingGetStarted: string;
  onboardingLangTitle: string;
  onboardingLangSubtitle: string;
  onboardingLocTitle: string;
  onboardingLocSubtitle: string;
  onboardingLocDetect: string;
  onboardingLocDetecting: string;
  onboardingLocSelected: string;
  onboardingNotifTitle: string;
  onboardingNotifSubtitle: string;
  onboardingNotifEnable: string;
  onboardingNotifLater: string;
  onboardingNotifEnabled: string;
  onboardingNotifDenied: string;

  /* ── Install prompt ── */
  installTitle: string;
  installBody: string;
  installBtn: string;
  installDismiss: string;

  /* ── Tahara Modal ── */
  taharaTitle: string;
  taharaSub: string;
  taharaPeriodLabel: string;
  taharaCalculate: string;
  taharaHefsek: string;
  taharaMikveh: string;
  taharaPosekNote: string;
  taharaClose: string;

  /* ── Yahrzeit Modal ── */
  yartzeitTitle: string;
  yartzeitSub: string;
  yartzeitSavedReminders: string;
  yartzeitNameLabel: string;
  yartzeitDateLabel: string;
  yartzeitTimeLabel: string;
  yartzeitTimeUnknown: string;
  yartzeitCalculate: string;
  yartzeitSaveReminder: string;
  yartzeitSaved: string;
  yartzeitAddNew: string;
  yartzeitHalachicNote: string;
  yartzeitClose: string;

  /* ── Daf Yomi Modal ── */
  dafYomiTitle: string;
  dafYomiSub: string;
  dafYomiReadSefaria: string;
  dafYomiCopied: string;
  dafYomiShare: string;
  dafYomiLoading: string;
  dafYomiError: string;

  /* ── Holidays Modal ── */
  holidaysTitle: string;
  holidaysCategoryYomTov: string;
  holidaysCategoryFast: string;
  holidaysCategoryMinor: string;
  holidaysCategoryRoshChodesh: string;
  holidaysCategoryModern: string;
  holidaysCategoryShabbat: string;
  holidaysMussarLesson: string;
  holidaysSpiritualTheme: string;
  holidaysInsightsSoon: string;

  /* ── Prayer Board Modal ── */
  prayerBoardTitle: string;
  prayerBoardAdminAccess: string;
  prayerBoardAdminPin: string;
  prayerBoardSubmitTitle: string;
  prayerBoardCategory: string;
  prayerBoardAnonymous: string;
  prayerBoardSubmit: string;
  prayerBoardModerate: string;
  prayerBoardResponse: string;
  prayerBoardAmen: string;
  prayerBoardPending: string;
  prayerBoardApprove: string;
  prayerBoardRemove: string;

  /* ── Premium Modal ── */
  premiumTitle: string;
  premiumSubtitle: string;
  premiumSecure: string;
  premiumCancel: string;
  premiumPayment: string;
  premiumReviewed: string;

  /* ── Not Found ── */
  notFoundTitle: string;
  notFoundHome: string;

  /* ── Week Strip ── */
  weekStripTitle: string;
  weekStripViewCal: string;
  weekStripDaySun: string;
  weekStripDayMon: string;
  weekStripDayTue: string;
  weekStripDayWed: string;
  weekStripDayThu: string;
  weekStripDayFri: string;
  weekStripDaySat: string;

  /* ── Zmanim Timeline ── */
  zmanimTimelineTitle: string;
  zmanimTimelineDawn: string;
  zmanimTimelineSunrise: string;
  zmanimTimelineShema: string;
  zmanimTimelineMidday: string;
  zmanimTimelineMincha: string;
  zmanimTimelineSunset: string;
  zmanimTimelineNightfall: string;
  zmanimTimelineNow: string;
  zmanimTimelineTap: string;
  nextHolidayTitle: string;
  nextHolidayDaysSingle: string;
  nextHolidayDaysPlural: string;
  nextHolidayToday: string;
  nextHolidayTomorrow: string;
  nextHolidayHide: string;
  nextHolidayShow: string;
  nextHolidayHalachaTitle: string;
  nextHolidayHalachaSource: string;
  nextHolidayHalachaLoading: string;
  nextHolidayHalachaError: string;
  nextHolidayPushTitle: string;
  nextHolidayPushBody: string;
  nextHolidayChecklistProgress: string;
  nextHolidayChecklistReset: string;
  nextHolidayChecklistAllDone: string;
  nextHolidayShareBtn: string;
  nextHolidayShareCardTitle: string;
  nextHolidayShareCardBrand: string;
  nextHolidayShareCardProgress: string;
  nextHolidayShareCardOf: string;
  nextHolidayShareCardStepsComplete: string;
  nextHolidayShareCardUnchecked: string;
  nextHolidayShareAction: string;
  nextHolidayShareCopied: string;
  nextHolidayShareClose: string;
  birthdayTrackerTitle: string;
  birthdayTrackerSub: string;
  birthdayTrackerGregorianLabel: string;
  birthdayTrackerHebrewLabel: string;
  birthdayTrackerNextLabel: string;
  birthdayTrackerCalculate: string;
  birthdayTrackerSave: string;
  birthdayTrackerSaved: string;
  birthdayTrackerClear: string;
  birthdayTrackerToday: string;
  birthdayTrackerCardTitle: string;
  birthdayTrackerCardDays: string;
  birthdayTrackerCardSetup: string;
  modalClose: string;
  yartzeitCardTitle: string;
  yartzeitCardSetup: string;
  yartzeitCardToday: string;
  yartzeitCardDays: string;

  /* ── AI Chat Assistant ── */
  chatTitle: string;
  chatSubtitle: string;
  chatWelcomeTitle: string;
  chatWelcomeDesc: string;
  chatPlaceholder: string;
  chatDisclaimer: string;
  chatError: string;
  chatFabLabel: string;
  chatVoiceStart: string;
  chatVoiceStop: string;
  chatVoiceUnsupported: string;
  chatShare: string;
  chatCopied: string;
  chatSuggestLabel: string;
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
  annStripNew: "New Announcement",
  celebTitle: "Upcoming Celebrations",
  celebDirLink: "See All →",
  celebTypeBirthday: "Birthday 🎂",
  celebTypeAliyah: "Aliyah Anniversary ✈️",
  celebToday: "Today 🎉",
  celebTomorrow: "Tomorrow",
  celebInDays: "{n}d",
  annStripNews: "{n} New Announcements",
  annStripRead: "Read",
  shabbatBarTitle: "Candle Lighting",
  shabbatBarTrialBadge: "{n} free days left",
  shabbatBarTrialEnd: "Free trial ended",
  shabbatBarUpgradeBtn: "Upgrade 👑",
  shabbatBarTonightLabel: "Tonight!",
  shabbatBarPremiumBadge: "Premium",
  homeOmer: "OMER",
  omerSefiratTitle: "Sefirat HaOmer",
  omerDayCount: "Day {day} of 49",
  omerDaysLeft: "{days} days until Shavuot",
  omerDayLeft: "{days} day until Shavuot",

  fabTitle: "Community Hub",
  fabAnnouncements: "Announcements",
  fabCommunityEvents: "Community Events",
  fabCommunityMemorial: "Community Memorial",
  fabTorahWisdom: "48 Ways to Torah Wisdom",
  fabPrayerBoard: "Prayer Board",
  fabTorahTracker: "Torah Tracker",
  fabLocationMap: "Location Map",
  fabCompass: "Jerusalem Compass",
  compassJerusalem: "Jerusalem",
  compassBearing: "Bearing",
  compassDistKm: "km to Jerusalem",
  compassFromCity: "from",

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

  roshChodeshLabel: "ROSH CHODESH",
  roshChodeshTodayTitle: "Chodesh Tov! 🌙",
  roshChodeshTodaySub: "Today is Rosh Chodesh {month}",
  roshChodeshTomorrowTitle: "Erev Rosh Chodesh",
  roshChodeshTomorrowSub: "Tomorrow begins Rosh Chodesh {month}",

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

  splashTagline: "The Sacred Calendar of Bnei Menashe",

  onboardingStep: "Step {n} of 3",
  onboardingSkip: "Skip",
  onboardingNext: "Next",
  onboardingGetStarted: "Get Started",
  onboardingLangTitle: "Choose Your Language",
  onboardingLangSubtitle: "Select how you'd like to use the app",
  onboardingLocTitle: "Where Are You Located?",
  onboardingLocSubtitle: "Used to calculate accurate prayer times",
  onboardingLocDetect: "📍 Detect My Location",
  onboardingLocDetecting: "Detecting…",
  onboardingLocSelected: "✓ Location set",
  onboardingNotifTitle: "Stay Connected",
  onboardingNotifSubtitle: "Get reminders for Shabbat candle lighting, prayer times, and holidays",
  onboardingNotifEnable: "🔔 Enable Notifications",
  onboardingNotifLater: "Maybe Later",
  onboardingNotifEnabled: "✓ Notifications enabled!",
  onboardingNotifDenied: "Notifications blocked — enable them in browser settings",

  installTitle: "Add to Home Screen",
  installBody: "Install Menashe Calendar for quick access.",
  installBtn: "Install",
  installDismiss: "Not now",

  taharaTitle: "💧 Tahara Calculator",
  taharaSub: "Purity & Mikveh timing",
  taharaPeriodLabel: "Start of period (vesset)",
  taharaCalculate: "Calculate",
  taharaHefsek: "HEFSEK TAHARA",
  taharaMikveh: "MIKVEH NIGHT (EARLIEST)",
  taharaPosekNote: "⚠️ Always consult a qualified posek (halachic authority) for personal guidance.",
  taharaClose: "Close",

  yartzeitTitle: "Yahrzeit Calculator",
  yartzeitSub: "Anniversary of passing",
  yartzeitSavedReminders: "SAVED REMINDERS",
  yartzeitNameLabel: "Name of the departed",
  yartzeitDateLabel: "Date of passing",
  yartzeitTimeLabel: "Time of passing",
  yartzeitTimeUnknown: "Time unknown",
  yartzeitCalculate: "Calculate",
  yartzeitSaveReminder: "Save Reminder",
  yartzeitSaved: "✓ Saved",
  yartzeitAddNew: "Add New",
  yartzeitHalachicNote: "Halachic Note",
  yartzeitClose: "Close",

  dafYomiTitle: "Daf Yomi",
  dafYomiSub: "Daily Talmud Study",
  dafYomiReadSefaria: "Read on Sefaria",
  dafYomiCopied: "Copied to clipboard",
  dafYomiShare: "Share Today's Daf",
  dafYomiLoading: "Loading today's daf…",
  dafYomiError: "Could not load daf. Showing local calculation.",

  holidaysTitle: "Jewish Holidays",
  holidaysCategoryYomTov: "Yom Tov",
  holidaysCategoryFast: "Fast Day",
  holidaysCategoryMinor: "Minor Holiday",
  holidaysCategoryRoshChodesh: "Rosh Chodesh",
  holidaysCategoryModern: "Modern",
  holidaysCategoryShabbat: "Special Shabbat",
  holidaysMussarLesson: "Mussar Lesson",
  holidaysSpiritualTheme: "Spiritual Theme",
  holidaysInsightsSoon: "Detailed insights for this observance are coming soon.",

  prayerBoardTitle: "Prayer Board",
  prayerBoardAdminAccess: "Admin Access",
  prayerBoardAdminPin: "Enter your PIN to moderate the prayer board",
  prayerBoardSubmitTitle: "Submit Prayer Request",
  prayerBoardCategory: "PRAYER TYPE",
  prayerBoardAnonymous: "Submit Anonymously",
  prayerBoardSubmit: "Submit",
  prayerBoardModerate: "Moderate Prayers",
  prayerBoardResponse: "Pastoral response",
  prayerBoardAmen: "Amen",
  prayerBoardPending: "Pending",
  prayerBoardApprove: "Approve",
  prayerBoardRemove: "Remove",

  premiumTitle: "Menashe Premium",
  premiumSubtitle: "Unlock everything",
  premiumSecure: "Secure",
  premiumCancel: "Cancel anytime",
  premiumPayment: "UPI & cards accepted",
  premiumReviewed: "Community reviewed",

  notFoundTitle: "This screen doesn't exist.",
  notFoundHome: "Go to home screen!",

  weekStripTitle: "THIS WEEK",
  weekStripViewCal: "Calendar →",
  weekStripDaySun: "SUN",
  weekStripDayMon: "MON",
  weekStripDayTue: "TUE",
  weekStripDayWed: "WED",
  weekStripDayThu: "THU",
  weekStripDayFri: "FRI",
  weekStripDaySat: "SAT",

  zmanimTimelineTitle: "TODAY AT A GLANCE",
  zmanimTimelineDawn: "Dawn",
  zmanimTimelineSunrise: "Sunrise",
  zmanimTimelineShema: "Shema",
  zmanimTimelineMidday: "Midday",
  zmanimTimelineMincha: "Mincha",
  zmanimTimelineSunset: "Sunset",
  zmanimTimelineNightfall: "Nightfall",
  zmanimTimelineNow: "Now",
  zmanimTimelineTap: "Full Zmanim →",
  nextHolidayTitle: "NEXT HOLIDAY",
  nextHolidayDaysSingle: "day away",
  nextHolidayDaysPlural: "days away",
  nextHolidayToday: "Today!",
  nextHolidayTomorrow: "Tomorrow",
  nextHolidayHide: "Minimise",
  nextHolidayShow: "Next Holiday",
  nextHolidayHalachaTitle: "📖 How to Prepare · Yalkut Yosef",
  nextHolidayHalachaSource: "Source",
  nextHolidayHalachaLoading: "Loading halachot…",
  nextHolidayHalachaError: "Could not load halachot",
  nextHolidayPushTitle: "Holiday Reminder",
  nextHolidayPushBody: "begins tomorrow. Chag Sameach from Bnei Menashe!",
  nextHolidayChecklistProgress: "prepared",
  nextHolidayChecklistReset: "Reset",
  nextHolidayChecklistAllDone: "All steps complete! ✓",
  nextHolidayShareBtn: "Share",
  nextHolidayShareCardTitle: "My Holiday Preparation",
  nextHolidayShareCardBrand: "Bnei Menashe Calendar",
  nextHolidayShareCardProgress: "Preparation Progress",
  nextHolidayShareCardOf: "of",
  nextHolidayShareCardStepsComplete: "steps complete",
  nextHolidayShareCardUnchecked: "Remaining",
  nextHolidayShareAction: "Share",
  nextHolidayShareCopied: "Copied!",
  nextHolidayShareClose: "Close",
  birthdayTrackerTitle: "Hebrew Birthday Tracker",
  birthdayTrackerSub: "Find & save your Jewish birthday",
  birthdayTrackerGregorianLabel: "Date of birth (Gregorian)",
  birthdayTrackerHebrewLabel: "YOUR HEBREW BIRTHDAY",
  birthdayTrackerNextLabel: "NEXT CELEBRATION",
  birthdayTrackerCalculate: "Calculate",
  birthdayTrackerSave: "Save My Birthday",
  birthdayTrackerSaved: "Birthday saved!",
  birthdayTrackerClear: "Clear",
  birthdayTrackerToday: "Today is your Hebrew Birthday! 🎂",
  birthdayTrackerCardTitle: "MY HEBREW BIRTHDAY",
  birthdayTrackerCardDays: "days until birthday",
  birthdayTrackerCardSetup: "Tap to set your Hebrew birthday →",
  modalClose: "Close",
  yartzeitCardTitle: "YAHRZEIT REMINDERS",
  yartzeitCardSetup: "Tap to add a Yahrzeit reminder →",
  yartzeitCardToday: "Today's Yahrzeit",
  yartzeitCardDays: "days away",

  chatTitle: "Rav Menashe AI",
  chatSubtitle: "Your Jewish calendar & Torah companion",
  chatWelcomeTitle: "Shalom! How can I help you?",
  chatWelcomeDesc: "Ask me anything about the Jewish calendar, Torah, prayer times, holidays, or Bnei Menashe traditions.",
  chatPlaceholder: "Ask about Shabbat, Zmanim, Torah…",
  chatDisclaimer: "For practical halachic decisions, consult your rabbi.",
  chatError: "Sorry, I couldn't respond. Please try again.",
  chatFabLabel: "Ask Rabbi AI",
  chatVoiceStart: "Tap to speak",
  chatVoiceStop: "Listening… tap to stop",
  chatVoiceUnsupported: "Voice not supported in this browser",
  chatShare: "Share",
  chatCopied: "Copied!",
  chatSuggestLabel: "Ask more",
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
  annStripNew: "Thu Thar Dawng",
  celebTitle: "Ni Lawmawm Hla",
  celebDirLink: "Zawng Ta →",
  celebTypeBirthday: "Nirualna 🎂",
  celebTypeAliyah: "Aliyah Ni Thleng ✈️",
  celebToday: "Nihin 🎉",
  celebTomorrow: "Zanthla",
  celebInDays: "{n}ni",
  annStripNews: "Thu Thar {n} Dawng",
  annStripRead: "Chhiar",
  shabbatBarTitle: "Kerhi Hun",
  shabbatBarTrialBadge: "Ni {n} theih leh",
  shabbatBarTrialEnd: "Theih hun zo tawh",
  shabbatBarUpgradeBtn: "Nei Ta 👑",
  shabbatBarTonightLabel: "Zanin!",
  shabbatBarPremiumBadge: "Premium",
  homeOmer: "OMER",
  omerSefiratTitle: "Sefirat HaOmer",
  omerDayCount: "{day} ni a ni, 49 chhung",
  omerDaysLeft: "Shavuot hma {days} ni",
  omerDayLeft: "Shavuot hma {days} ni",

  fabTitle: "Mipil Inn",
  fabAnnouncements: "Thupek",
  fabCommunityEvents: "Mipil Lawmman",
  fabCommunityMemorial: "Mipil Thi Ni",
  fabTorahWisdom: "Torah Thu 48 Dan",
  fabPrayerBoard: "Thu Dawt Hmang",
  fabTorahTracker: "Torah Chhiar",
  fabLocationMap: "Hmun Kolam",
  fabCompass: "Yerusalem Compass",
  compassJerusalem: "Yerusalem",
  compassBearing: "Bearing",
  compassDistKm: "km Yerusalem tan",
  compassFromCity: "atangin",

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

  roshChodeshLabel: "ROSH CHODESH",
  roshChodeshTodayTitle: "Chodesh Tov! 🌙",
  roshChodeshTodaySub: "Ni thar chu Rosh Chodesh {month}",
  roshChodeshTomorrowTitle: "Erev Rosh Chodesh",
  roshChodeshTomorrowSub: "Ni thar {month} chu thleng dawn",

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

  splashTagline: "Bnei Menashe Gil Ni Thu Leh Thla",

  onboardingStep: "Lehkha {n} / 3",
  onboardingSkip: "Kal Ta",
  onboardingNext: "Hla Ta",
  onboardingGetStarted: "Tan Ta",
  onboardingLangTitle: "Thu Dang Thlang",
  onboardingLangSubtitle: "App ah thuzia zawng thlang rawh",
  onboardingLocTitle: "Na Hmun Engzat?",
  onboardingLocSubtitle: "Zmanim chiang tak phuah tan hmang",
  onboardingLocDetect: "📍 Na Hmun En Ta",
  onboardingLocDetecting: "A en mek…",
  onboardingLocSelected: "✓ Hmun siam zo",
  onboardingNotifTitle: "Inhmuh Zel",
  onboardingNotifSubtitle: "Shabbat mei, thu dawt hun leh ni thianghlim hlabu dawng rawh",
  onboardingNotifEnable: "🔔 Hlabu On Siam",
  onboardingNotifLater: "Hun Dang Ah",
  onboardingNotifEnabled: "✓ Hlabu a on mek!",
  onboardingNotifDenied: "Hlabu a block — browser siam dan-ah on siam rawh",

  installTitle: "Home Screen-ah Chhuang",
  installBody: "Menashe Calendar install siam la a hun zel.",
  installBtn: "Install",
  installDismiss: "Hun dang ah",

  taharaTitle: "💧 Tahara Chhiar",
  taharaSub: "Ropui leh Mikveh hun",
  taharaPeriodLabel: "Vesset tan ni",
  taharaCalculate: "Chhiar Ta",
  taharaHefsek: "HEFSEK TAHARA",
  taharaMikveh: "MIKVEH ZAN (HMASAWN BER)",
  taharaPosekNote: "⚠️ Posek (dinna thu neih) nen inpawl rawh.",
  taharaClose: "Tawp Ta",

  yartzeitTitle: "Yahrzeit Chhiar",
  yartzeitSub: "Thi ni chhiar",
  yartzeitSavedReminders: "CHHUANG ZO HLABU",
  yartzeitNameLabel: "Thi mi hming",
  yartzeitDateLabel: "Thi ni",
  yartzeitTimeLabel: "Thi hun",
  yartzeitTimeUnknown: "Hun hre lo",
  yartzeitCalculate: "Chhiar Ta",
  yartzeitSaveReminder: "Hlabu Chhuang",
  yartzeitSaved: "✓ Chhuangin zo",
  yartzeitAddNew: "Thar Chhuang",
  yartzeitHalachicNote: "Dinna Thu",
  yartzeitClose: "Tawp Ta",

  dafYomiTitle: "Daf Yomi",
  dafYomiSub: "Ni Tin Talmud Ziak",
  dafYomiReadSefaria: "Sefaria-ah Chhiar",
  dafYomiCopied: "Clipboard-ah chhuang zo",
  dafYomiShare: "Nizan Daf Sawi Chhuak",
  dafYomiLoading: "Nizan daf lo mek…",
  dafYomiError: "Daf load theih lo. Chhiar dan hrang hmang.",

  holidaysTitle: "Ni Thianghlim",
  holidaysCategoryYomTov: "Yom Tov",
  holidaysCategoryFast: "Ni Tawh",
  holidaysCategoryMinor: "Ni Thianghlim Hmelhriat",
  holidaysCategoryRoshChodesh: "Rosh Chodesh",
  holidaysCategoryModern: "Modern",
  holidaysCategoryShabbat: "Shabbat Hlawhtling",
  holidaysMussarLesson: "Mussar Thu",
  holidaysSpiritualTheme: "Thianghlim Thu",
  holidaysInsightsSoon: "Ni thianghlim hian thu zawng a lo dawn.",

  prayerBoardTitle: "Thu Dawt Hmang",
  prayerBoardAdminAccess: "Admin Lut Dan",
  prayerBoardAdminPin: "Thu dawt hmang moderate tan PIN dil rawh",
  prayerBoardSubmitTitle: "Thu Dawt Thawn",
  prayerBoardCategory: "THU DAWT DAN",
  prayerBoardAnonymous: "Hming Nei Lo Ber Thawn",
  prayerBoardSubmit: "Thawn Ta",
  prayerBoardModerate: "Thu Dawt Moderate",
  prayerBoardResponse: "Pastoral response",
  prayerBoardAmen: "Amen",
  prayerBoardPending: "A lo mek",
  prayerBoardApprove: "Pawm Ta",
  prayerBoardRemove: "Thlak Ta",

  premiumTitle: "Menashe Premium",
  premiumSubtitle: "Zawng zawng en theih",
  premiumSecure: "Thlen tak",
  premiumCancel: "Hun dang ah tawp theih",
  premiumPayment: "UPI & card dawng",
  premiumReviewed: "Mipil enkawl",

  notFoundTitle: "Screen hei awm lo.",
  notFoundHome: "Inn screen-ah kal rawh!",

  weekStripTitle: "THAWHNI",
  weekStripViewCal: "Kolam en →",
  weekStripDaySun: "NI",
  weekStripDayMon: "LUN",
  weekStripDayTue: "ZAN",
  weekStripDayWed: "ARB",
  weekStripDayThu: "BRES",
  weekStripDayFri: "PAR",
  weekStripDaySat: "ZAT",

  zmanimTimelineTitle: "NI ZMANIM TIMELINE",
  zmanimTimelineDawn: "Alah",
  zmanimTimelineSunrise: "Ni Leh",
  zmanimTimelineShema: "Shema",
  zmanimTimelineMidday: "Nitang",
  zmanimTimelineMincha: "Mincha",
  zmanimTimelineSunset: "Ni Tum",
  zmanimTimelineNightfall: "Zanin",
  zmanimTimelineNow: "Ni Tawp",
  zmanimTimelineTap: "Zmanim en →",
  nextHolidayTitle: "NISA THIAMNA",
  nextHolidayDaysSingle: "ni en",
  nextHolidayDaysPlural: "ni en",
  nextHolidayToday: "Ni Tawp!",
  nextHolidayTomorrow: "Tuni",
  nextHolidayHide: "Paih",
  nextHolidayShow: "Nisa Thiamna",
  nextHolidayHalachaTitle: "📖 Zang Dinga · Yalkut Yosef",
  nextHolidayHalachaSource: "Chun",
  nextHolidayHalachaLoading: "Halachot lak in…",
  nextHolidayHalachaError: "Halachot lak theih nahi",
  nextHolidayPushTitle: "Nisa Suangkhol",
  nextHolidayPushBody: "tuni khata suak. Chag Sameach Bnei Menashe sung!",
  nextHolidayChecklistProgress: "bawl",
  nextHolidayChecklistReset: "Reset",
  nextHolidayChecklistAllDone: "Tangkhul dawn! ✓",
  nextHolidayShareBtn: "Sawi Chhuak",
  nextHolidayShareCardTitle: "Ka Nisa Zang Dinga",
  nextHolidayShareCardBrand: "Bnei Menashe Luangthar",
  nextHolidayShareCardProgress: "Zang Dinga Progress",
  nextHolidayShareCardOf: "in",
  nextHolidayShareCardStepsComplete: "zangkhol dawn",
  nextHolidayShareCardUnchecked: "Lak kik",
  nextHolidayShareAction: "Sawi Chhuak",
  nextHolidayShareCopied: "Copy dawn!",
  nextHolidayShareClose: "Hawl",
  birthdayTrackerTitle: "Hebrew Nirualna Tracker",
  birthdayTrackerSub: "Na nirualna Jewish en sou",
  birthdayTrackerGregorianLabel: "Nirualna ni (Gregorian)",
  birthdayTrackerHebrewLabel: "NA NIRUALNA HEBREW",
  birthdayTrackerNextLabel: "NISA SUANGKHOL",
  birthdayTrackerCalculate: "Kalkulet",
  birthdayTrackerSave: "Na Nirualna Sou",
  birthdayTrackerSaved: "Nirualna sou!",
  birthdayTrackerClear: "Paih",
  birthdayTrackerToday: "Ni tawp na nirualna Hebrew! 🎂",
  birthdayTrackerCardTitle: "NA NIRUALNA HEBREW",
  birthdayTrackerCardDays: "ni en nirualna",
  birthdayTrackerCardSetup: "Na nirualna Hebrew set →",
  modalClose: "Khat",
  yartzeitCardTitle: "YAHRZEIT HLABU",
  yartzeitCardSetup: "Yahrzeit hlabu en →",
  yartzeitCardToday: "Ni tawp Yahrzeit",
  yartzeitCardDays: "ni en",

  chatTitle: "Rav Menashe AI",
  chatSubtitle: "Jewish kolam & Torah thu ropui",
  chatWelcomeTitle: "Shalom! Keimah thiam em?",
  chatWelcomeDesc: "Jewish kolam, Torah, thu dawt hun, ni thianghlim, leh Bnei Menashe thu zawng theih.",
  chatPlaceholder: "Shabbat, Zmanim, Torah zawng…",
  chatDisclaimer: "Thu halacha dik tak tan, Rabbi-a din rawh.",
  chatError: "Thlen theih lo. Chhiar dan hrang hmang.",
  chatFabLabel: "Rabbi AI Zawng",
  chatVoiceStart: "Thu sawi rawh",
  chatVoiceStop: "Chhiar mek… paih tan rawh",
  chatVoiceUnsupported: "Voice browser-in support lo",
  chatShare: "Share",
  chatCopied: "Copy!",
  chatSuggestLabel: "Zawk hran",
};

const translations: Record<Lang, Translations> = { en, tk };
export default translations;
