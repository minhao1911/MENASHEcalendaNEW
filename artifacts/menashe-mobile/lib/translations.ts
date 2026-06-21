export type Lang = "en" | "tk";

export interface Translations {
  /* ── Navigation ── */
  navHome: string;
  navCalendar: string;
  navZmanim: string;
  navCommunity: string;
  navTorah: string;
  navSettings: string;
  navSiddur: string;

  /* ── Home ── */
  homeToday: string;
  homeHebrewDate: string;
  homeGregorian: string;
  homeHebrewYear: string;
  homeSacredCalendar: string;
  homeZmanim: string;
  homeViewAll: string;
  homeSunrise: string;
  homeSunset: string;
  homeNightfall: string;
  homeCandleLighting: string;
  homeHavdalah: string;
  homeHavdalahAt: string;
  homeHavdalahTonight: string;
  homeTodayShabbat: string;
  homeUpcomingShabbat: string;
  homeShabbatShalom: string;
  homeShabbatInProgress: string;
  homeShavuaTov: string;
  homeUntilHavdalah: string;
  homeUntilCandleLighting: string;
  homeUntilNextShabbat: string;
  homeQuickTools: string;
  homeKeyZmanim: string;
  homeWeeklyParasha: string;
  homeParashah: string;
  homeUpcomingHoliday: string;
  homeUpcomingHolidays: string;
  homeNoHolidays: string;
  homeTodayHoliday: string;
  homeChagSameach: string;
  homeDafYomi: string;
  homeDafYomiToday: string;
  homeOmer: string;
  homeOmerWeeks: string;
  homeOmerDays: string;
  homeDailyTorah: string;
  homeReadMore: string;
  homeShowLess: string;
  homeShare: string;
  homeCommunityTitle: string;
  homeCommunityDesc: string;
  homeCensusTitle: string;
  homeCensusDesc: string;
  homeMoreTools: string;

  /* ── Settings ── */
  settingsTitle: string;
  settingsAppearance: string;
  settingsTheme: string;
  settingsDarkMode: string;
  settingsDarkOn: string;
  settingsDarkOff: string;
  settingsShowHebrew: string;
  settingsLanguage: string;
  settingsLanguageHint: string;
  settingsEditTranslations: string;
  settingsEditTranslationsHint: string;
  settingsLocation: string;
  settingsCity: string;
  settingsCityHint: string;
  settingsTimezone: string;
  settingsNotifications: string;
  settingsCandleLighting: string;
  settingsHavdalah: string;
  settingsShema: string;
  settingsPrayers: string;
  settingsHoliday: string;
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
  txEditorGroupNav: string;
  txEditorGroupHome: string;
  txEditorGroupSettings: string;
  txEditorGroupFab: string;
  txEditorNote: string;
}

/* ──────────────────────────────────────────────────────────────
   ENGLISH
────────────────────────────────────────────────────────────── */
export const en: Translations = {
  navHome: "Home",
  navCalendar: "Calendar",
  navZmanim: "Zmanim",
  navCommunity: "Community",
  navTorah: "Torah",
  navSettings: "Settings",
  navSiddur: "Siddur",

  homeToday: "TODAY",
  homeHebrewDate: "HEBREW DATE",
  homeGregorian: "GREGORIAN",
  homeHebrewYear: "Hebrew Year",
  homeSacredCalendar: "Sacred Calendar",
  homeZmanim: "ZMANIM",
  homeViewAll: "VIEW ALL »",
  homeSunrise: "Sunrise",
  homeSunset: "Sunset",
  homeNightfall: "Nightfall",
  homeCandleLighting: "Candle Lighting",
  homeHavdalah: "Havdalah",
  homeHavdalahAt: "Havdalah at",
  homeHavdalahTonight: "HAVDALAH TONIGHT",
  homeTodayShabbat: "Today's Shabbat",
  homeUpcomingShabbat: "Upcoming Shabbat",
  homeShabbatShalom: "Shabbat Shalom",
  homeShabbatInProgress: "Shabbat is in progress",
  homeShavuaTov: "Shavua Tov — a wonderful week!",
  homeUntilHavdalah: "Until Havdalah",
  homeUntilCandleLighting: "Until Candle Lighting",
  homeUntilNextShabbat: "Until Next Shabbat",
  homeQuickTools: "Quick Tools",
  homeKeyZmanim: "Key Zmanim Today",
  homeWeeklyParasha: "Weekly Parasha",
  homeParashah: "PARASHAH",
  homeUpcomingHoliday: "Upcoming Holiday",
  homeUpcomingHolidays: "UPCOMING HOLIDAYS",
  homeNoHolidays: "No upcoming holidays",
  homeTodayHoliday: "TODAY'S HOLIDAY",
  homeChagSameach: "Chag Sameach! 🎉",
  homeDafYomi: "Daf Yomi",
  homeDafYomiToday: "Today's Daf",
  homeOmer: "Omer Count",
  homeOmerWeeks: "weeks",
  homeOmerDays: "days",
  homeDailyTorah: "📖 DAILY TORAH THOUGHT",
  homeReadMore: "Read more ↓",
  homeShowLess: "Show less ↑",
  homeShare: "↑ Share",
  homeCommunityTitle: "Community",
  homeCommunityDesc: "Shavei Israel, Torah classes, connect with members",
  homeCensusTitle: "Census & Demographics",
  homeCensusDesc: "Fill out the community census form and view statistics",
  homeMoreTools: "More Tools",

  settingsTitle: "Settings",
  settingsAppearance: "APPEARANCE",
  settingsTheme: "Theme",
  settingsDarkMode: "Dark Mode",
  settingsDarkOn: "Dark mode active",
  settingsDarkOff: "Light mode active",
  settingsShowHebrew: "Show Hebrew Dates",
  settingsLanguage: "Thadou Kuki Language",
  settingsLanguageHint: "Show labels in Thadou Kuki",
  settingsEditTranslations: "✏️ Edit Thadou Kuki Labels",
  settingsEditTranslationsHint: "Fix or improve any translation",
  settingsLocation: "LOCATION",
  settingsCity: "City",
  settingsCityHint: "Used for Zmanim calculations",
  settingsTimezone: "Timezone",
  settingsNotifications: "NOTIFICATIONS",
  settingsCandleLighting: "🕯 Candle Lighting",
  settingsHavdalah: "✨ Havdalah",
  settingsShema: "📖 Latest Shema",
  settingsPrayers: "🕍 Prayer Reminders",
  settingsHoliday: "✡ Holiday Alerts",
  settingsHolidays: "✡ Holiday Alerts",
  settingsParasha: "📜 Weekly Parasha",
  settingsOmer: "🌾 Omer Counting",
  settingsShabbatDigest: "📋 Shabbat Digest",
  settingsYahrtzeit: "🕯 Yahrtzeit Reminders",
  settingsLeadTime: "Reminder Lead Time",
  settingsLeadTimeHint: "How many minutes before each Zman to alert",
  settingsBgPush: "BACKGROUND PUSH",
  settingsBgPushDesc: "Receive notifications even when the app is closed. Your notification preferences will be sent in the background.",
  settingsBgPushDescUnsupported: "Background push notifications are not supported on this device.",
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
  settingsNotifBlockedSub: "Enable notifications for this app in your device settings",
  settingsNotifUnsupported: "Not supported on this device",
  settingsNotifActive: "Active",

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
  txEditorGroupNav: "Navigation",
  txEditorGroupHome: "Home Page",
  txEditorGroupSettings: "Settings",
  txEditorGroupFab: "Community Hub",
  txEditorNote: "Tip: Switch to Thadou Kuki mode (Settings → Language) to see your changes live.",
};

/* ──────────────────────────────────────────────────────────────
   THADOU KUKI  (community can correct via the in-app editor)
────────────────────────────────────────────────────────────── */
export const tk: Translations = {
  navHome: "Inn",
  navCalendar: "Ni Thu",
  navZmanim: "Zmanim",
  navCommunity: "Mipil",
  navTorah: "Torah",
  navSettings: "Siam Dan",
  navSiddur: "Thu Ziak",

  homeToday: "NIZAN",
  homeHebrewDate: "HEBREW NI",
  homeGregorian: "GREGORIAN",
  homeHebrewYear: "Hebrew Kum",
  homeSacredCalendar: "Ni Thu Thianghlim",
  homeZmanim: "ZMANIM",
  homeViewAll: "ZAWNG EN »",
  homeSunrise: "Ni Chhuak",
  homeSunset: "Ni Tlai",
  homeNightfall: "Zan",
  homeCandleLighting: "Katni Mei",
  homeHavdalah: "Havdalah",
  homeHavdalahAt: "Havdalah ni a",
  homeHavdalahTonight: "ZAN HAVDALAH",
  homeTodayShabbat: "Nizan Shabbat",
  homeUpcomingShabbat: "Shabbat Hla",
  homeShabbatShalom: "Shabbat Shalom",
  homeShabbatInProgress: "Shabbat a lo mek",
  homeShavuaTov: "Shavua Tov — Zarhnawk thar!",
  homeUntilHavdalah: "Havdalah Hmaa",
  homeUntilCandleLighting: "Katni Mei Hmaa",
  homeUntilNextShabbat: "Shabbat Thar Hmaa",
  homeQuickTools: "Thil Tihdan",
  homeKeyZmanim: "Nizan Zmanim",
  homeWeeklyParasha: "Parashah Thupek",
  homeParashah: "PARASHAH",
  homeUpcomingHoliday: "Ni Thianghlim Hla",
  homeUpcomingHolidays: "NI THIANGHLIM HLA",
  homeNoHolidays: "Ni thianghlim hla awm lo",
  homeTodayHoliday: "NIZAN NI THIANGHLIM",
  homeChagSameach: "Chag Sameach! 🎉",
  homeDafYomi: "Daf Yomi",
  homeDafYomiToday: "Nizan Daf",
  homeOmer: "Omer Chhiar",
  homeOmerWeeks: "thla",
  homeOmerDays: "ni",
  homeDailyTorah: "📖 NIZAN TORAH THU",
  homeReadMore: "Ziak zawk ↓",
  homeShowLess: "Zawk lo ↑",
  homeShare: "↑ Sawi Chhuak",
  homeCommunityTitle: "Mipil",
  homeCommunityDesc: "Shavei Israel, Torah class, member te nen in inhmuh",
  homeCensusTitle: "Mipil Chhiar",
  homeCensusDesc: "Mipil census form thlak la statistics en",
  homeMoreTools: "Thil Pawimawh Zawk",

  settingsTitle: "Siam Dan",
  settingsAppearance: "SIM BUATSAIH",
  settingsTheme: "Sim Dan",
  settingsDarkMode: "Zim Bel",
  settingsDarkOn: "Zim bel a khang mek",
  settingsDarkOff: "Lim bel a khang mek",
  settingsShowHebrew: "Hebrew Ni Thu En",
  settingsLanguage: "Thadou Kuki Thu",
  settingsLanguageHint: "Thadou Kuki thuin sim",
  settingsEditTranslations: "✏️ Thadou Kuki Label Siam",
  settingsEditTranslationsHint: "Label dang tak siam theih",
  settingsLocation: "HMUN",
  settingsCity: "Khua",
  settingsCityHint: "Zmanim thlen tan hmang",
  settingsTimezone: "Ni Sung Dan",
  settingsNotifications: "THUPEK HLA",
  settingsCandleLighting: "🕯 Katni Mei",
  settingsHavdalah: "✨ Havdalah",
  settingsShema: "📖 Shema Hnung Ber",
  settingsPrayers: "🕍 Thu Dawt Hla",
  settingsHoliday: "✡ Ni Thianghlim Hla",
  settingsHolidays: "✡ Ni Thianghlim Hla",
  settingsParasha: "📜 Parashah Thupek",
  settingsOmer: "🌾 Omer Chhiar",
  settingsShabbatDigest: "📋 Shabbat Sawi",
  settingsYahrtzeit: "🕯 Yahrtzeit Hla",
  settingsLeadTime: "Hla Dan Thlawhna",
  settingsLeadTimeHint: "Zman hma chuan minit engzat ngai",
  settingsBgPush: "CHHAH HLABU",
  settingsBgPushDesc: "App a tawp ngin emaw device a lock ngemin hlabu dawng theih. Hla dan na siam ang in thlen a ni.",
  settingsBgPushDescUnsupported: "Hei device hian chhah hlabu a support lo.",
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
  settingsNotifBlockedSub: "Device siam dan ah app hlabu dawng theihna pe rawh",
  settingsNotifUnsupported: "Hei device hian a support lo",
  settingsNotifActive: "A on mek",

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
  txEditorGroupNav: "Lampi (Nav)",
  txEditorGroupHome: "Inn Page",
  txEditorGroupSettings: "Siam Dan",
  txEditorGroupFab: "Mipil Inn",
  txEditorNote: "Tip: Thadou Kuki mode on siam la (Siam Dan → Thu) nakin na siam zawng en theih.",
};

const translations: Record<Lang, Translations> = { en, tk };
export default translations;
