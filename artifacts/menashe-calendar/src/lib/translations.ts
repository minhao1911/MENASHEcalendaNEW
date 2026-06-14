export type Lang = "en" | "tk";

export interface Translations {
  /* Landing */
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

  /* BottomNav */
  navHome: string;
  navCalendar: string;
  navZmanim: string;
  navSiddur: string;
  navSettings: string;

  /* Settings */
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
}

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
};

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
};

const translations: Record<Lang, Translations> = { en, tk };
export default translations;
