export type Lang = "en" | "tk";

export interface Translations {
  navHome: string;
  navCalendar: string;
  navZmanim: string;
  navCommunity: string;
  navTorah: string;
  navSettings: string;

  homeSacredCalendar: string;
  homeSunrise: string;
  homeSunset: string;
  homeNightfall: string;
  homeTodayShabbat: string;
  homeUpcomingShabbat: string;
  homeCandleLighting: string;
  homeHavdalah: string;
  homeQuickTools: string;
  homeWeeklyParasha: string;
  homeUpcomingHoliday: string;
  homeKeyZmanim: string;
  homeUntilHavdalah: string;
  homeUntilCandleLighting: string;
  homeUntilNextShabbat: string;
  homeDafYomi: string;
  homeDafYomiToday: string;
  homeOmer: string;
  homeOmerWeeks: string;
  homeOmerDays: string;

  settingsTitle: string;
  settingsLanguage: string;
  settingsLanguageHint: string;
  settingsAppearance: string;
  settingsTheme: string;
  settingsLocation: string;
  settingsNotifications: string;
  settingsCandleLighting: string;
  settingsHavdalah: string;
  settingsParasha: string;
  settingsHoliday: string;
  settingsPrayers: string;
  settingsLeadTime: string;
  settingsBgPush: string;
  settingsAccount: string;
  settingsSignOut: string;
}

export const en: Translations = {
  navHome: "Home",
  navCalendar: "Calendar",
  navZmanim: "Zmanim",
  navCommunity: "Community",
  navTorah: "Torah",
  navSettings: "Settings",

  homeSacredCalendar: "Sacred Calendar",
  homeSunrise: "Sunrise",
  homeSunset: "Sunset",
  homeNightfall: "Nightfall",
  homeTodayShabbat: "Today's Shabbat",
  homeUpcomingShabbat: "Upcoming Shabbat",
  homeCandleLighting: "Candle Lighting",
  homeHavdalah: "Havdalah",
  homeQuickTools: "Quick Tools",
  homeWeeklyParasha: "Weekly Parasha",
  homeUpcomingHoliday: "Upcoming Holiday",
  homeKeyZmanim: "Key Zmanim Today",
  homeUntilHavdalah: "Until Havdalah",
  homeUntilCandleLighting: "Until Candle Lighting",
  homeUntilNextShabbat: "Until Next Shabbat",
  homeDafYomi: "Daf Yomi",
  homeDafYomiToday: "Today's Daf",
  homeOmer: "Omer Count",
  homeOmerWeeks: "weeks",
  homeOmerDays: "days",

  settingsTitle: "Settings",
  settingsLanguage: "Thadou Kuki Language",
  settingsLanguageHint: "Show labels in Thadou Kuki",
  settingsAppearance: "APPEARANCE",
  settingsTheme: "Theme",
  settingsLocation: "LOCATION",
  settingsNotifications: "NOTIFICATIONS",
  settingsCandleLighting: "🕯 Candle Lighting",
  settingsHavdalah: "✨ Havdalah",
  settingsParasha: "📜 Weekly Parasha",
  settingsHoliday: "✡ Holiday Alerts",
  settingsPrayers: "🕍 Prayer Reminders",
  settingsLeadTime: "Reminder Lead Time",
  settingsBgPush: "BACKGROUND PUSH",
  settingsAccount: "ACCOUNT",
  settingsSignOut: "Sign Out",
};

export const tk: Translations = {
  navHome: "Inn",
  navCalendar: "Ni Thu",
  navZmanim: "Zmanim",
  navCommunity: "Mipil",
  navTorah: "Torah",
  navSettings: "Siam Dan",

  homeSacredCalendar: "Ni Thu Thianghlim",
  homeSunrise: "Ni Chhuak",
  homeSunset: "Ni Tlai",
  homeNightfall: "Zan",
  homeTodayShabbat: "Nizan Shabbat",
  homeUpcomingShabbat: "Shabbat Hla",
  homeCandleLighting: "Katni Mei",
  homeHavdalah: "Havdalah",
  homeQuickTools: "Thil Tihdan",
  homeWeeklyParasha: "Parashah Thupek",
  homeUpcomingHoliday: "Ni Thianghlim Hla",
  homeKeyZmanim: "Nizan Zmanim",
  homeUntilHavdalah: "Havdalah Hmaa",
  homeUntilCandleLighting: "Katni Mei Hmaa",
  homeUntilNextShabbat: "Shabbat Thar Hmaa",
  homeDafYomi: "Daf Yomi",
  homeDafYomiToday: "Nizan Daf",
  homeOmer: "Omer Chhiar",
  homeOmerWeeks: "thla",
  homeOmerDays: "ni",

  settingsTitle: "Siam Dan",
  settingsLanguage: "Thadou Kuki Thu",
  settingsLanguageHint: "Thadou Kuki thuin sim",
  settingsAppearance: "SIM BUATSAIH",
  settingsTheme: "Sim Dan",
  settingsLocation: "HMUN",
  settingsNotifications: "THUPEK HLA",
  settingsCandleLighting: "🕯 Katni Mei",
  settingsHavdalah: "✨ Havdalah",
  settingsParasha: "📜 Parashah Thupek",
  settingsHoliday: "✡ Ni Thianghlim Hla",
  settingsPrayers: "🕍 Thu Dawt Hla",
  settingsLeadTime: "Hla Dan Thlawhna",
  settingsBgPush: "CHHAH HLABU",
  settingsAccount: "ACCOUNT",
  settingsSignOut: "Tawp Ta",
};

const translations: Record<Lang, Translations> = { en, tk };
export default translations;
