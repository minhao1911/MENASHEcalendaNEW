/**
 * Menashe Journey — SPR-P004B · Journey Intelligence
 *
 * Improvements over SPR-P004A:
 *   1. Continue Journey — live priority engine: prayer → Shabbat → holiday → parasha → daf
 *   2. Journey Cards    — real current status, next step, CTA — no placeholder copy
 *   3. Reflection       — day-context aware: Shabbat / Erev Shabbat / holiday / weekday
 *   4. Visual Polish    — improved hierarchy, spacing, typography scale
 *
 * Rules:
 *   ✓ No AsyncStorage   ✓ No new APIs   ✓ Web untouched   ✓ Existing data only
 *   ✓ No new backend logic   ✓ No storage / tracking / history / analytics
 */

import React, { useMemo } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useThemeTokens } from "@/src/mobile/design-system";
import { useLanguage } from "@/context/LanguageContext";
import { useApp } from "@/context/AppContext";
import {
  getHebrewDate,
  formatHebrewDate,
  formatHebrewDateHebrew,
  formatGregorianDate,
  getDayOfWeek,
  getCurrentParasha,
  getCurrentParashaInfo,
  getUpcomingHolidays,
} from "@/lib/hebrewCalendar";
import { calculateZmanim, type ZmanimTimes } from "@/lib/zmanim";
import type { Branch } from "@workspace/shared-core/census";
import { getBranch, branchStats } from "@workspace/shared-core/census";
import { SkeletonCard } from "@/src/mobile/components/feedback/LoadingState";

// ── Daf Yomi (mirrors index.tsx) ──────────────────────────────────────────────

const TRACTATES = [
  { name: "Berakhot",    pages: 64  }, { name: "Shabbat",      pages: 157 },
  { name: "Eruvin",      pages: 105 }, { name: "Pesachim",     pages: 121 },
  { name: "Yoma",        pages: 88  }, { name: "Sukkah",       pages: 56  },
  { name: "Beitzah",     pages: 40  }, { name: "Rosh Hashana", pages: 35  },
  { name: "Ta'anit",     pages: 31  }, { name: "Megillah",     pages: 32  },
  { name: "Moed Katan",  pages: 29  }, { name: "Chagigah",     pages: 27  },
  { name: "Yevamot",     pages: 122 }, { name: "Ketubot",      pages: 112 },
  { name: "Nedarim",     pages: 91  }, { name: "Nazir",        pages: 66  },
  { name: "Sotah",       pages: 49  }, { name: "Gittin",       pages: 90  },
  { name: "Kiddushin",   pages: 82  }, { name: "Bava Kamma",   pages: 119 },
  { name: "Bava Metzia", pages: 119 }, { name: "Bava Batra",   pages: 176 },
  { name: "Sanhedrin",   pages: 113 }, { name: "Makkot",       pages: 24  },
  { name: "Shevuot",     pages: 49  }, { name: "Avodah Zarah", pages: 76  },
  { name: "Horayot",     pages: 14  }, { name: "Zevachim",     pages: 120 },
  { name: "Menachot",    pages: 110 }, { name: "Chullin",      pages: 142 },
  { name: "Bekhorot",    pages: 61  }, { name: "Arakhin",      pages: 34  },
  { name: "Temurah",     pages: 34  }, { name: "Keritot",      pages: 28  },
  { name: "Meilah",      pages: 22  }, { name: "Niddah",       pages: 73  },
];
const TOTAL_PAGES = TRACTATES.reduce((a, t) => a + t.pages, 0);
const CYCLE_START = new Date(2020, 0, 5);

function getTodayDaf(): { tractate: string; daf: number } {
  const daysSince  = Math.floor((Date.now() - CYCLE_START.getTime()) / 86_400_000);
  const dayInCycle = ((daysSince % TOTAL_PAGES) + TOTAL_PAGES) % TOTAL_PAGES;
  let cumulative   = 0;
  for (const t of TRACTATES) {
    if (dayInCycle < cumulative + t.pages)
      return { tractate: t.name, daf: dayInCycle - cumulative + 2 };
    cumulative += t.pages;
  }
  return { tractate: "Berakhot", daf: 2 };
}

function getDafProgress(tractate: string, daf: number): number {
  const t = TRACTATES.find((x) => x.name === tractate);
  if (!t) return 0;
  return Math.round(((daf - 2) / t.pages) * 100);
}

// ── Priority Engine — Continue Journey ────────────────────────────────────────

interface ContinueAction {
  overline: string;
  title: string;
  subtitle: string;
  cta: string;
  path: string;
  icon: string;
  gradientDark:  readonly [string, string, string];
  gradientLight: readonly [string, string, string];
  accent: string;
}

// Returns the name of the prayer window currently active, or null if midday gap.
function getActivePrayer(zm: ZmanimTimes | null, nowMs: number): string | null {
  if (!zm) return null;
  const sr = zm.sunrise?.getTime();
  const su = zm.sunset?.getTime();
  if (!sr || !su) return null;

  // Use latestShacharit if available (4 shaot zmaniyot after sunrise)
  const latestS = (zm as any).latestShacharit?.getTime() ?? (sr + 4 * 3_600_000);
  // Use minchaGedolah (6.5 shaot after sunrise)
  const minGed  = zm.minchaGedolah?.getTime() ?? (sr + 6.5 * 3_600_000);

  if (nowMs < sr)      return "Shacharit";   // before sunrise
  if (nowMs < latestS) return "Shacharit";   // morning window
  if (nowMs < minGed)  return null;          // midday gap — no featured prayer
  if (nowMs < su)      return "Mincha";      // afternoon
  return "Ma'ariv";                          // after sunset
}

function buildContinueAction(
  dayOfWeek: string,
  todayHoliday: { name: string } | null,
  imminentHoliday: { name: string; daysAway: number } | null,
  zm: ZmanimTimes | null,
  parasha: string | null,
  daf: { tractate: string; daf: number },
): ContinueAction {
  const nowMs = Date.now();

  // P1 — Active prayer window
  const prayer = getActivePrayer(zm, nowMs);
  if (prayer) {
    const meta: Record<string, { sub: string; icon: string; path: string }> = {
      Shacharit: { sub: "Begin the day with morning prayer",    icon: "sun",  path: "/(tabs)/zmanim" },
      Mincha:    { sub: "Pause and connect — afternoon prayer", icon: "wind", path: "/(tabs)/zmanim" },
      "Ma'ariv": { sub: "Evening prayer opens now",             icon: "moon", path: "/(tabs)/zmanim" },
    };
    const m = meta[prayer];
    return {
      overline: "TODAY'S PRAYER",
      title: `Time for ${prayer}`,
      subtitle: m.sub,
      cta: "View Prayer Times",
      path: m.path,
      icon: m.icon,
      gradientDark:  ["#1a0a00", "#5c3008", "#c8852a"],
      gradientLight: ["#5c2800", "#a06018", "#d4a030"],
      accent: "#f5c36a",
    };
  }

  // P2 — Shabbat day (Saturday) — getDayOfWeek() returns UPPERCASE
  if (dayOfWeek === "SATURDAY") {
    return {
      overline: "SHABBAT SHALOM",
      title: "Rest and Reflect",
      subtitle: "Shabbat is a sanctuary in time — Torah, family, and peace",
      cta: "Study Parasha",
      path: "/(tabs)/torah",
      icon: "star",
      gradientDark:  ["#1a0a2e", "#2d1a5c", "#5c3a8a"],
      gradientLight: ["#2e1a4a", "#5c3a8a", "#8a5cbf"],
      accent: "#b48ad4",
    };
  }

  // P3 — Friday (Erev Shabbat)
  if (dayOfWeek === "FRIDAY") {
    return {
      overline: "EREV SHABBAT",
      title: "Shabbat Begins Tonight",
      subtitle: "Review the Parasha and prepare for candle lighting",
      cta: "Study This Week",
      path: "/(tabs)/torah",
      icon: "sunset",
      gradientDark:  ["#2a1500", "#7a3d08", "#c8852a"],
      gradientLight: ["#5c2800", "#a06018", "#c8952a"],
      accent: "#f5c36a",
    };
  }

  // P4 — Today is a holiday
  if (todayHoliday) {
    return {
      overline: "TODAY'S HOLIDAY",
      title: todayHoliday.name,
      subtitle: "Observe and celebrate with your community",
      cta: "Open Calendar",
      path: "/(tabs)/calendar",
      icon: "gift",
      gradientDark:  ["#0a2a0a", "#1b5e20", "#2e7d32"],
      gradientLight: ["#1a4a1a", "#2e7d32", "#4caf50"],
      accent: "#80e080",
    };
  }

  // P5 — Imminent holiday (within 7 days)
  if (imminentHoliday) {
    const d = imminentHoliday.daysAway;
    return {
      overline: "UPCOMING HOLIDAY",
      title: imminentHoliday.name,
      subtitle: d === 1 ? "Tomorrow — begin your preparation" : `In ${d} days — prepare now`,
      cta: "View in Calendar",
      path: "/(tabs)/calendar",
      icon: "calendar",
      gradientDark:  ["#0a1a2e", "#0c2d5c", "#1a5c8a"],
      gradientLight: ["#1a3a5c", "#2e6da0", "#4a8fc0"],
      accent: "#7ac4f0",
    };
  }

  // P6 — Current Parashah study
  if (parasha) {
    return {
      overline: "CURRENT PARASHA",
      title: parasha,
      subtitle: "Study this week's Torah portion",
      cta: "Begin Study",
      path: "/(tabs)/torah",
      icon: "book-open",
      gradientDark:  ["#1a0a00", "#3a1a00", "#7a3200"],
      gradientLight: ["#3a1a00", "#7a3200", "#aa5820"],
      accent: "#d4a843",
    };
  }

  // P7 — Daf Yomi fallback
  return {
    overline: "DAF YOMI",
    title: `${daf.tractate} ${daf.daf}`,
    subtitle: "Continue your daily Talmud study",
    cta: "Study Today's Daf",
    path: "/(tabs)/torah",
    icon: "book",
    gradientDark:  ["#0a0a1e", "#12124a", "#2a2a7a"],
    gradientLight: ["#1a1a3a", "#2e2e6a", "#4a4a9a"],
    accent: "#8888d4",
  };
}

// ── Day-context Reflection ────────────────────────────────────────────────────

const REFLECTIONS = {
  shabbat: [
    { quote: "More than Israel has kept the Shabbat, the Shabbat has kept Israel.", source: "Ahad Ha'am" },
    { quote: "Remember the Shabbat day to keep it holy.", source: "Exodus 20:8" },
    { quote: "The Shabbat is a sanctuary in time.", source: "Abraham Joshua Heschel" },
    { quote: "On Shabbat we taste the world to come.", source: "Talmud, Berakhot 57b" },
    { quote: "Every Shabbat is a new world; its light renews creation.", source: "Sefat Emet" },
  ],
  friday: [
    { quote: "Prepare yourself on Erev Shabbat and you will eat on Shabbat.", source: "Talmud, Avodah Zarah 3a" },
    { quote: "The Shabbat candle is the symbol of peace in the home.", source: "Shulchan Aruch, OC 263" },
    { quote: "Welcome the Shabbat as a bride — with joy and preparation.", source: "Talmud, Shabbat 119a" },
  ],
  holiday: [
    { quote: "These are the appointed seasons of the Lord, holy gatherings.", source: "Leviticus 23:2" },
    { quote: "Rejoice in your festivals — you, your son, your daughter, your servant.", source: "Deuteronomy 16:14" },
    { quote: "A festival is not only a memory of the past but a promise of the future.", source: "Menashe Heritage" },
    { quote: "The holidays are milestones of memory and hope for our people.", source: "Menashe Heritage" },
  ],
  weekday: [
    { quote: "The Torah is a tree of life to those who hold fast to it.", source: "Proverbs 3:18" },
    { quote: "Who is wise? One who learns from every person.", source: "Pirkei Avot 4:1" },
    { quote: "Love your neighbor as yourself — the entire Torah stands on this.", source: "Leviticus 19:18" },
    { quote: "In the place where a penitent stands, the righteous cannot stand.", source: "Talmud, Berakhot 34b" },
    { quote: "G‑d is present in every place, in every moment, in every thought.", source: "Baal Shem Tov" },
    { quote: "Turn it over again, for everything is contained within it.", source: "Pirkei Avot 5:22" },
    { quote: "Every day one must say: the world was created for my sake.", source: "Sanhedrin 37a" },
    { quote: "A person should always study in a place his heart desires.", source: "Talmud, Avodah Zarah 19a" },
  ],
} as const;

function getContextualReflection(
  dayOfWeek: string,
  todayHoliday: { name: string } | null,
  dayOfYear: number,
): { quote: string; source: string; context: string } {
  // getDayOfWeek() returns UPPERCASE ("SATURDAY", "FRIDAY", …)
  if (dayOfWeek === "SATURDAY") {
    const r = REFLECTIONS.shabbat[dayOfYear % REFLECTIONS.shabbat.length];
    return { ...r, context: "Shabbat Reflection" };
  }
  if (dayOfWeek === "FRIDAY") {
    const r = REFLECTIONS.friday[dayOfYear % REFLECTIONS.friday.length];
    return { ...r, context: "Erev Shabbat" };
  }
  if (todayHoliday) {
    const r = REFLECTIONS.holiday[dayOfYear % REFLECTIONS.holiday.length];
    return { ...r, context: todayHoliday.name };
  }
  const r = REFLECTIONS.weekday[dayOfYear % REFLECTIONS.weekday.length];
  return { ...r, context: "Daily Reflection" };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function haptic() {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

function go(path: string) {
  haptic();
  router.push(path as any);
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function JourneyScreen() {
  const { colors, sp } = useThemeTokens();
  const { t }    = useLanguage();
  const { location } = useApp();
  const insets   = useSafeAreaInsets();
  const topPad   = insets.top > 0 ? insets.top : (Platform.OS === "web" ? 60 : 20);

  // Theme context
  const isLight  = (colors.background as string).toLowerCase() === "#f5efe0";
  const GOLD     = colors.primary as string;

  const today     = useMemo(() => new Date(), []);
  const hdate     = useMemo(() => getHebrewDate(today), [today]);
  const hebrewStr = useMemo(() => formatHebrewDate(hdate), [hdate]);
  const hebrewNum = useMemo(() => { try { return formatHebrewDateHebrew(hdate); } catch { return ""; } }, [hdate]);
  const gregStr   = useMemo(() => formatGregorianDate(today), [today]);
  const dayOfWeek = useMemo(() => getDayOfWeek(today), [today]);
  const parasha   = useMemo(() => getCurrentParasha(), []);
  const parashaInfo = useMemo(() => { try { return getCurrentParashaInfo(); } catch { return null; } }, []);
  const holidays  = useMemo(() => getUpcomingHolidays(30), []);
  const daf       = useMemo(() => getTodayDaf(), []);
  const dafPct    = useMemo(() => getDafProgress(daf.tractate, daf.daf), [daf]);
  const zm        = useMemo(
    () => calculateZmanim(today, location.lat, location.lng, location.candleLightingMinutes ?? 18),
    [today, location],
  );

  const dayOfYear = useMemo(() => Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86_400_000,
  ), []);

  const firstName: string | null = null;

  // ── Census integration (SPR-P006A) ────────────────────────────────────────
  // undefined = loading, null = confirmed no record, Branch = has record
  const [branch, setBranch] = React.useState<Branch | null | undefined>(undefined);
  const [censusError, setCensusError] = React.useState(false);

  React.useEffect(() => {
    const baseUrl = `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`;
    getBranch({ baseUrl })
      .then((b) => setBranch(b ?? null))
      .catch(() => { setBranch(null); setCensusError(true); });
  }, []);

  const censusStats  = React.useMemo(() => branch ? branchStats(branch) : null, [branch]);
  const censusLoading   = branch === undefined && !censusError;
  const aliyahAwaiting  = (censusStats?.aliyahBreakdown.awaiting ?? 0) > 0;

  // Holiday context from live calendar data
  const todayStr = today.toDateString();
  const todayHoliday = useMemo(
    () => holidays.find((h: { name: string; date: string | Date }) =>
      new Date(h.date).toDateString() === todayStr) ?? null,
    [holidays, todayStr],
  );
  const imminentHoliday = useMemo(() => {
    const h = holidays.find((hol: { name: string; date: string | Date }) => {
      const d = daysBetween(today, new Date(hol.date));
      return d >= 1 && d <= 7;
    });
    if (!h) return null;
    return { name: h.name, daysAway: daysBetween(today, new Date(h.date)) };
  }, [holidays, today]);

  const nextHoliday       = holidays[0] ?? null;
  const daysToNextHoliday = nextHoliday ? daysBetween(today, new Date(nextHoliday.date)) : null;

  // Minute ticker — makes the priority action time-reactive (prayer windows change hourly)
  const [, setMinuteTick] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setMinuteTick(n => n + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  // Priority-ordered "Continue Journey" action — recomputes each minute + on data changes
  const action = buildContinueAction(dayOfWeek, todayHoliday, imminentHoliday, zm, parasha ?? null, daf);
  const actionGradient = isLight ? action.gradientLight : action.gradientDark;

  // Day-context reflection
  const reflection = useMemo(
    () => getContextualReflection(dayOfWeek, todayHoliday, dayOfYear),
    [dayOfWeek, todayHoliday, dayOfYear],
  );

  // Study card values — use parasha if known, else Daf
  const studyPrimary = parasha ?? `${daf.tractate} ${daf.daf}`;
  const studySub     = parasha
    ? `Daf: ${daf.tractate} ${daf.daf}`
    : (parashaInfo?.book ?? "Daily Study");

  // Community subtitle is day-context aware — dayOfWeek is UPPERCASE
  const commSub = dayOfWeek === "SATURDAY"
    ? "Connect in community on Shabbat"
    : dayOfWeek === "FRIDAY"
    ? "Share Shabbat greetings with the community"
    : todayHoliday
    ? `Celebrate ${todayHoliday.name} together`
    : "Connect with Benei Menashe worldwide";

  // Calendar card subtitle shows nearest holiday
  const calSub = daysToNextHoliday !== null && nextHoliday
    ? daysToNextHoliday === 0  ? `Today: ${nextHoliday.name}`
    : daysToNextHoliday === 1  ? `Tomorrow: ${nextHoliday.name}`
    : `${nextHoliday.name} in ${daysToNextHoliday}d`
    : gregStr;

  // Memorial subtitle is Shabbat-aware — dayOfWeek is UPPERCASE
  const memSub = dayOfWeek === "SATURDAY"
    ? "A candle burns in sacred memory"
    : "Light a candle for those remembered";

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        accessibilityLabel="Menashe Journey"
      >

        {/* ══ §1  GREETING ════════════════════════════════════════════════════ */}
        <View style={[styles.greetingSection, { paddingTop: topPad + sp[4] }]}>
          <View
            style={[styles.starAccent, { backgroundColor: GOLD + "18", borderColor: GOLD + "38" }]}
            accessible={false}
            importantForAccessibility="no-hide-descendants"
          >
            <Text style={{ fontSize: 11 }}>✡</Text>
            <Text style={[styles.starLabel, { color: GOLD }]}>MENASHE JOURNEY</Text>
          </View>

          <Text style={[styles.shalomText, { color: colors.foreground }]}>
            {t.journeyGreeting}
            {firstName ? <Text style={{ color: GOLD }}>{", " + firstName}</Text> : null}
          </Text>

          {/* Hebrew date — full hierarchy */}
          <Text style={[styles.hebrewDateText, { color: GOLD }]}>{hebrewStr}</Text>
          {hebrewNum ? (
            <Text style={[styles.hebrewNumText, { color: GOLD + "bb" }]}>{hebrewNum}</Text>
          ) : null}
          <Text style={[styles.gregDateText, { color: colors.mutedForeground }]}>{gregStr}</Text>

          <View style={[styles.greetingDivider, { backgroundColor: GOLD }]} />
        </View>

        <View style={{ paddingHorizontal: sp[4] }}>

          {/* ══ §2  CONTINUE JOURNEY — single priority action ════════════════ */}
          <SectionLabel title="Continue Journey" GOLD={GOLD} foreground={colors.foreground} />

          <TouchableOpacity
            onPress={() => go(action.path)}
            activeOpacity={0.88}
            accessibilityRole="button"
            accessibilityLabel={`${action.title}. ${action.subtitle}`}
            style={styles.continueWrap}
          >
            <LinearGradient
              colors={actionGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.continueCard}
            >
              {/* Icon */}
              <View style={[styles.continueIcon, { backgroundColor: action.accent + "22" }]}>
                <Feather name={action.icon as any} size={20} color={action.accent} />
              </View>

              {/* Overline */}
              <Text style={[styles.continueOverline, { color: action.accent }]}>
                {action.overline}
              </Text>

              {/* Title */}
              <Text style={styles.continueTitle} numberOfLines={2}>
                {action.title}
              </Text>

              {/* Subtitle */}
              <Text style={styles.continueSubtitle} numberOfLines={2}>
                {action.subtitle}
              </Text>

              {/* CTA pill */}
              <View style={[styles.continuePill, {
                backgroundColor: action.accent + "22",
                borderColor: action.accent + "55",
              }]}>
                <Text style={[styles.continuePillText, { color: action.accent }]}>
                  {action.cta}
                </Text>
                <Feather name="arrow-right" size={12} color={action.accent} />
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* ══ §3  JOURNEY CARDS — live data, no placeholders ════════════════ */}
          <SectionLabel title={t.journeySummaryTitle} GOLD={GOLD} foreground={colors.foreground} />

          <View style={styles.cardGrid}>

            {/* Study */}
            <TouchableOpacity
              style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => go("/(tabs)/torah")}
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel={`${t.journeyStudyCard}: ${studyPrimary}`}
            >
              <View style={[styles.cardIconBox, { backgroundColor: GOLD + "18" }]}>
                <Feather name="book-open" size={17} color={GOLD} />
              </View>
              <Text style={[styles.cardOverline, { color: GOLD }]}>STUDY</Text>
              <Text style={[styles.cardValue, { color: colors.foreground }]} numberOfLines={2}>
                {studyPrimary}
              </Text>
              <Text style={[styles.cardSub, { color: colors.mutedForeground }]} numberOfLines={2}>
                {studySub}
              </Text>
              {/* Daf progress bar */}
              <View style={[styles.progressTrack, { backgroundColor: colors.border }]}>
                <View style={[styles.progressFill, { backgroundColor: GOLD, width: `${dafPct}%` as any }]} />
              </View>
              <Text style={[styles.cardCTA, { color: GOLD }]}>Begin Study →</Text>
            </TouchableOpacity>

            {/* Calendar */}
            <TouchableOpacity
              style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => go("/(tabs)/calendar")}
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel={`${t.journeyCalendarCard}: ${hebrewStr}`}
            >
              <View style={[styles.cardIconBox, { backgroundColor: GOLD + "18" }]}>
                <Feather name="calendar" size={17} color={GOLD} />
              </View>
              <Text style={[styles.cardOverline, { color: GOLD }]}>CALENDAR</Text>
              <Text style={[styles.cardValue, { color: colors.foreground }]} numberOfLines={2}>
                {hebrewStr}
              </Text>
              <Text style={[styles.cardSub, { color: colors.mutedForeground }]} numberOfLines={2}>
                {calSub}
              </Text>
              <Text style={[styles.cardCTA, { color: GOLD }]}>Open Calendar →</Text>
            </TouchableOpacity>

            {/* Memorial */}
            <TouchableOpacity
              style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => go("/sacred-memory")}
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel={`${t.journeyMemorialCard}: ${memSub}`}
            >
              <View style={[styles.cardIconBox, { backgroundColor: GOLD + "18" }]}>
                <Feather name="heart" size={17} color={GOLD} />
              </View>
              <Text style={[styles.cardOverline, { color: GOLD }]}>MEMORY</Text>
              <Text style={[styles.cardValue, { color: colors.foreground }]} numberOfLines={1}>
                Sacred Memory
              </Text>
              <Text style={[styles.cardSub, { color: colors.mutedForeground }]} numberOfLines={2}>
                {memSub}
              </Text>
              <Text style={[styles.cardCTA, { color: GOLD }]}>Visit Sanctuary →</Text>
            </TouchableOpacity>

            {/* Community */}
            <TouchableOpacity
              style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => go("/(tabs)/community")}
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel={`${t.journeyCommunityCard}: ${commSub}`}
            >
              <View style={[styles.cardIconBox, { backgroundColor: GOLD + "18" }]}>
                <Feather name="users" size={17} color={GOLD} />
              </View>
              <Text style={[styles.cardOverline, { color: GOLD }]}>COMMUNITY</Text>
              <Text style={[styles.cardValue, { color: colors.foreground }]} numberOfLines={1}>
                Benei Menashe
              </Text>
              <Text style={[styles.cardSub, { color: colors.mutedForeground }]} numberOfLines={2}>
                {commSub}
              </Text>
              <Text style={[styles.cardCTA, { color: GOLD }]}>Open Community →</Text>
            </TouchableOpacity>

          </View>

          {/* ══ §3.5  CENSUS — community data surface (SPR-P006A) ══════════════ */}
          <SectionLabel title={t.journeyCensusSectionTitle} GOLD={GOLD} foreground={colors.foreground} />

          {censusLoading ? (
            // Loading — MMDL skeleton
            <SkeletonCard lines={3} />

          ) : censusError ? (
            // API unavailable — premium empty state
            <View
              style={[styles.censusCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              accessible
              accessibilityLabel={t.journeyCensusUnavailable}
            >
              <View style={[styles.censusIconBox, { backgroundColor: GOLD + "16", borderColor: GOLD + "30" }]}>
                <Feather name="cloud-off" size={24} color={GOLD} />
              </View>
              <Text style={[styles.censusTitle, { color: colors.foreground }]}>
                {t.journeyCensusUnavailable}
              </Text>
            </View>

          ) : !branch ? (
            // No census record — milestone card (navigates to /census — SPR-P006B)
            <TouchableOpacity
              onPress={() => go("/census")}
              activeOpacity={0.88}
              accessibilityRole="button"
              accessibilityLabel={`${t.journeyCensusMilestoneTitle}. ${t.journeyCensusMilestoneSubtitle}`}
              style={[styles.censusMilestoneWrap, { backgroundColor: colors.card, borderColor: GOLD + "55" }]}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: sp[3] }}>
                <View style={[styles.censusIconBox, { backgroundColor: GOLD + "16", borderColor: GOLD + "30" }]}>
                  <Feather name="users" size={22} color={GOLD} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.censusOverline, { color: GOLD }]}>
                    MILESTONE
                  </Text>
                  <Text style={[styles.censusTitle, { color: colors.foreground }]} numberOfLines={2}>
                    {t.journeyCensusMilestoneTitle}
                  </Text>
                  <Text style={[styles.censusSub, { color: colors.mutedForeground }]} numberOfLines={2}>
                    {t.journeyCensusMilestoneSubtitle}
                  </Text>
                </View>
              </View>
              <View style={[styles.censusPill, { backgroundColor: GOLD + "18", borderColor: GOLD + "44" }]}>
                <Text style={[styles.censusPillText, { color: GOLD }]}>
                  {t.journeyCensusStartCta}
                </Text>
                <Feather name="arrow-right" size={12} color={GOLD} />
              </View>
            </TouchableOpacity>

          ) : (
            // Has census record — status + optional aliyah card
            <View style={{ gap: sp[3] }}>
              {/* Status card */}
              <View style={[styles.censusCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: sp[3] }}>
                  <View style={[styles.censusIconBox, { backgroundColor: GOLD + "16", borderColor: GOLD + "30" }]}>
                    <Feather name="check-circle" size={20} color={GOLD} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.censusOverline, { color: GOLD }]}>
                      {t.journeyCensusStatusTitle.toUpperCase()}
                    </Text>
                    <Text style={[styles.censusTitle, { color: colors.foreground }]} numberOfLines={1}>
                      {branch.name}
                    </Text>
                    <Text style={[styles.censusSub, { color: colors.mutedForeground }]} numberOfLines={1}>
                      {branch.cityName}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={[styles.censusCount, { color: GOLD }]}>
                      {censusStats!.familyCount}
                    </Text>
                    <Text style={[styles.censusCountLabel, { color: colors.mutedForeground }]}>
                      {t.journeyCensusFamiliesLabel}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Aliyah priority card — only shown when headAliyah === "awaiting" */}
              {aliyahAwaiting && (
                <View style={[styles.censusAliyahCard, { backgroundColor: GOLD + "0f", borderColor: GOLD + "66" }]}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: sp[3] }}>
                    <View style={[styles.censusIconBox, { backgroundColor: GOLD + "22", borderColor: GOLD + "44" }]}>
                      <Feather name="star" size={20} color={GOLD} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.censusOverline, { color: GOLD }]}>PRIORITY</Text>
                      <Text style={[styles.censusTitle, { color: colors.foreground }]}>
                        {t.journeyCensusAliyahTitle}
                      </Text>
                      <Text style={[styles.censusSub, { color: colors.mutedForeground }]} numberOfLines={2}>
                        {t.journeyCensusAliyahSubtitle}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* ══ §4  BOOKMARKS ════════════════════════════════════════════════════ */}
          <SectionLabel title={t.journeyBookmarksTitle} GOLD={GOLD} foreground={colors.foreground} />

          <View
            style={[styles.bookmarksEmpty, { backgroundColor: colors.card, borderColor: colors.border }]}
            accessible={true}
            accessibilityLabel={`${t.journeyBookmarksEmpty}. ${t.journeyBookmarksEmptySub}`}
          >
            <View style={[styles.bookmarkIcon, { backgroundColor: GOLD + "16", borderColor: GOLD + "30" }]}>
              <Feather name="bookmark" size={26} color={GOLD} />
            </View>
            <Text style={[styles.bookmarksTitle, { color: colors.foreground }]}>
              {t.journeyBookmarksEmpty}
            </Text>
            <Text style={[styles.bookmarksSub, { color: colors.mutedForeground }]}>
              {t.journeyBookmarksEmptySub}
            </Text>
          </View>

          {/* ══ §5  REFLECTION — day-context aware ══════════════════════════════ */}
          <SectionLabel title={t.journeyReflectionTitle} GOLD={GOLD} foreground={colors.foreground} />

          <View
            style={[styles.reflectionCard, { backgroundColor: colors.card, borderColor: GOLD + "44" }]}
            accessible={true}
            accessibilityLabel={`${reflection.context}: "${reflection.quote}" — ${reflection.source}`}
          >
            <View style={[styles.reflectionBar, { backgroundColor: GOLD }]} />
            {/* Day context badge */}
            <View style={[styles.reflectionBadge, { backgroundColor: GOLD + "18", borderColor: GOLD + "30" }]}>
              <Text style={[styles.reflectionBadgeText, { color: GOLD }]}>{reflection.context}</Text>
            </View>
            <Text style={[styles.reflectionQuote, { color: colors.foreground }]}>
              "{reflection.quote}"
            </Text>
            <Text style={[styles.reflectionSource, { color: GOLD }]}>
              — {reflection.source}
            </Text>
          </View>

        </View>
      </ScrollView>
    </View>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function SectionLabel({
  title, GOLD, foreground,
}: {
  title: string; GOLD: string; foreground: string;
}) {
  return (
    <View style={styles.sectionLabel}>
      <View
        style={[styles.sectionAccent, { backgroundColor: GOLD }]}
        accessible={false}
        importantForAccessibility="no"
      />
      <Text
        style={[styles.sectionText, { color: foreground }]}
        accessibilityRole="header"
      >
        {title}
      </Text>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({

  // §1 Greeting
  greetingSection: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  starAccent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginBottom: 16,
  },
  starLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  shalomText: {
    fontSize: 34,
    fontWeight: "800",
    letterSpacing: -0.5,
    lineHeight: 42,
    marginBottom: 8,
  },
  hebrewDateText: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  hebrewNumText: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 4,
    letterSpacing: 0.4,
  },
  gregDateText: {
    fontSize: 15,
    marginBottom: 16,
  },
  greetingDivider: {
    height: 3,
    width: 48,
    borderRadius: 2,
  },

  // Section label
  sectionLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 32,
    marginBottom: 12,
  },
  sectionAccent: {
    width: 3,
    height: 18,
    borderRadius: 2,
  },
  sectionText: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.1,
  },

  // §2 Continue Journey card
  continueWrap: {
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 6,
  },
  continueCard: {
    padding: 20,
    borderRadius: 20,
    gap: 8,
    minHeight: 178,
  },
  continueIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  continueOverline: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2.0,
  },
  continueTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: -0.3,
    lineHeight: 30,
  },
  continueSubtitle: {
    fontSize: 13,
    fontWeight: "400",
    color: "rgba(255,255,255,0.72)",
    lineHeight: 19,
  },
  continuePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  continuePillText: {
    fontSize: 13,
    fontWeight: "700",
  },

  // §3 Journey Cards 2×2
  cardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    minWidth: "46%",
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 4,
    minHeight: 164,
  },
  cardIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  cardOverline: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 1.8,
  },
  cardValue: {
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: -0.2,
    lineHeight: 22,
    marginTop: 2,
  },
  cardSub: {
    fontSize: 11,
    lineHeight: 14,
    marginTop: 1,
  },
  progressTrack: {
    height: 2,
    borderRadius: 1,
    overflow: "hidden",
    marginTop: 8,
    marginBottom: 2,
  },
  progressFill: {
    height: 2,
    borderRadius: 1,
  },
  cardCTA: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 8,
    letterSpacing: 0.1,
  },

  // §4 Bookmarks
  bookmarksEmpty: {
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: "dashed",
    padding: 24,
    alignItems: "center",
    gap: 12,
  },
  bookmarkIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  bookmarksTitle: {
    fontSize: 17,
    fontWeight: "700",
    textAlign: "center",
  },
  bookmarksSub: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 280,
  },

  // §5 Reflection
  reflectionCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 12,
    overflow: "hidden",
    marginBottom: 16,
  },
  reflectionBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  reflectionBadge: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 3,
    marginTop: 8,
  },
  reflectionBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  reflectionQuote: {
    fontSize: 20,
    fontWeight: "500",
    fontStyle: "italic",
    lineHeight: 29,
  },
  reflectionSource: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  // §3.5 Census styles (SPR-P006A)
  censusMilestoneWrap: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 16,
    gap: 12,
  },
  censusCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  censusAliyahCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  censusIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  censusOverline: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 2.0,
  },
  censusTitle: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  censusSub: {
    fontSize: 13,
    fontWeight: "400",
    lineHeight: 19,
    marginTop: 2,
  },
  censusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: "flex-start",
  },
  censusPillText: {
    fontSize: 13,
    fontWeight: "700",
  },
  censusCount: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  censusCountLabel: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
});
