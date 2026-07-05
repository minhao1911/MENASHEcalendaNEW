/**
 * Menashe Journey — SPR-P004A
 * The user's personal journey through the Menashe Platform.
 *
 * Mission: answer "What is the next meaningful step in my journey today?"
 *
 * Sections:
 *   1. Greeting        — Shalom {name}, Hebrew date, Gregorian date
 *   2. Journey Summary — Study, Calendar, Memorial, Community cards
 *   3. Continue        — quick links to all four experiences
 *   4. Bookmarks       — premium placeholder empty state
 *   5. Reflection      — one inspirational quotation per day
 *
 * Architecture: reuses MMDL tokens, MEL patterns, Clerk auth, hebrewCalendar lib.
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useUser } from "@clerk/expo";

import { useColors } from "@/hooks/useColors";
import { SPACE, TEXT, RADIUS } from "@/constants/colors";
import { useLanguage } from "@/context/LanguageContext";
import {
  getHebrewDate,
  formatHebrewDate,
  formatGregorianDate,
  getCurrentParasha,
  getUpcomingHolidays,
} from "@/lib/hebrewCalendar";

// ── Daf Yomi (client-side, mirrors index.tsx) ─────────────────────────────────

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

// ── Daily reflections ─────────────────────────────────────────────────────────

const REFLECTIONS = [
  { quote: "The Torah is a tree of life to those who hold fast to it.", source: "Proverbs 3:18" },
  { quote: "Who is wise? One who learns from every person.", source: "Pirkei Avot 4:1" },
  { quote: "Love your neighbor as yourself — the entire Torah stands on this.", source: "Leviticus 19:18" },
  { quote: "In the place where a penitent stands, the righteous cannot stand.", source: "Talmud, Berakhot 34b" },
  { quote: "G-d is present in every place, in every moment, in every thought.", source: "Baal Shem Tov" },
  { quote: "Turn it over again, for everything is contained within it.", source: "Pirkei Avot 5:22" },
  { quote: "Every day one must say: the world was created for my sake.", source: "Sanhedrin 37a" },
];

function getDailyReflection() {
  const dayOfYear = Math.floor(
    (Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86_400_000
  );
  return REFLECTIONS[dayOfYear % REFLECTIONS.length];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function haptic() {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

function go(path: string) {
  haptic();
  router.push(path as any);
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function JourneyScreen() {
  const colors   = useColors();
  const { t }    = useLanguage();
  const insets   = useSafeAreaInsets();
  const { user } = useUser();
  const topPad   = insets.top > 0 ? insets.top : (Platform.OS === "web" ? 60 : 20);

  const today      = useMemo(() => new Date(), []);
  const hdate      = useMemo(() => getHebrewDate(today), [today]);
  const hebrewStr  = useMemo(() => formatHebrewDate(hdate), [hdate]);
  const gregStr    = useMemo(() => formatGregorianDate(today), [today]);
  const parasha    = useMemo(() => getCurrentParasha(), []);
  const holidays   = useMemo(() => getUpcomingHolidays(30), []);
  const daf        = useMemo(() => getTodayDaf(), []);
  const reflection = useMemo(() => getDailyReflection(), []);

  const firstName    = user?.firstName ?? user?.fullName?.split(" ")[0] ?? null;
  const nextHoliday  = holidays[0]?.name ?? null;

  const GOLD = colors.primary;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        accessibilityLabel="Menashe Journey"
      >

        {/* ══ §1  GREETING ═══════════════════════════════════════════════════ */}
        <View style={[styles.greetingSection, { paddingTop: topPad + SPACE[4] }]}>
          {/* Gold star accent */}
          <View style={[styles.starAccent, { backgroundColor: GOLD + "22", borderColor: GOLD + "44" }]}>
            <Text style={{ fontSize: 13 }}>✡</Text>
            <Text style={[styles.starLabel, { color: GOLD }]}>MENASHE JOURNEY</Text>
          </View>

          {/* Shalom greeting */}
          <View style={styles.greetingRow}>
            <Text style={[styles.shalomText, { color: colors.foreground }]}>
              {t.journeyGreeting}
              {firstName ? (
                <Text style={{ color: GOLD }}>{", " + firstName}</Text>
              ) : null}
            </Text>
          </View>

          {/* Dates */}
          <Text style={[styles.hebrewDateText, { color: GOLD }]}>{hebrewStr}</Text>
          <Text style={[styles.gregDateText, { color: colors.mutedForeground }]}>{gregStr}</Text>

          {/* Gold divider */}
          <View style={[styles.greetingDivider, { backgroundColor: GOLD }]} />
        </View>

        <View style={{ paddingHorizontal: SPACE[4] }}>

          {/* ══ §2  JOURNEY SUMMARY ════════════════════════════════════════════ */}
          <SectionLabel title={t.journeySummaryTitle} colors={colors} />

          <View style={styles.cardGrid}>
            {/* Study Journey */}
            <TouchableOpacity
              style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => go("/(tabs)/torah")}
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel={t.journeyStudyCard}
            >
              <View style={[styles.summaryCardIcon, { backgroundColor: GOLD + "18" }]}>
                <Feather name="book-open" size={20} color={GOLD} />
              </View>
              <Text style={[styles.summaryCardTitle, { color: colors.foreground }]}>
                {t.journeyStudyCard}
              </Text>
              <Text style={[styles.summaryCardValue, { color: GOLD }]} numberOfLines={1}>
                {daf.tractate} {daf.daf}
              </Text>
              {parasha ? (
                <Text style={[styles.summaryCardSub, { color: colors.mutedForeground }]} numberOfLines={1}>
                  Parasha: {parasha}
                </Text>
              ) : null}
              <View style={styles.summaryCardArrow}>
                <Feather name="arrow-right" size={12} color={GOLD} />
              </View>
            </TouchableOpacity>

            {/* Calendar */}
            <TouchableOpacity
              style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => go("/(tabs)/calendar")}
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel={t.journeyCalendarCard}
            >
              <View style={[styles.summaryCardIcon, { backgroundColor: GOLD + "18" }]}>
                <Feather name="calendar" size={20} color={GOLD} />
              </View>
              <Text style={[styles.summaryCardTitle, { color: colors.foreground }]}>
                {t.journeyCalendarCard}
              </Text>
              <Text style={[styles.summaryCardValue, { color: GOLD }]} numberOfLines={2}>
                {hebrewStr}
              </Text>
              {nextHoliday ? (
                <Text style={[styles.summaryCardSub, { color: colors.mutedForeground }]} numberOfLines={1}>
                  Next: {nextHoliday}
                </Text>
              ) : null}
              <View style={styles.summaryCardArrow}>
                <Feather name="arrow-right" size={12} color={GOLD} />
              </View>
            </TouchableOpacity>

            {/* Memorial Journey */}
            <TouchableOpacity
              style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => go("/sacred-memory")}
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel={t.journeyMemorialCard}
            >
              <View style={[styles.summaryCardIcon, { backgroundColor: GOLD + "18" }]}>
                <Feather name="heart" size={20} color={GOLD} />
              </View>
              <Text style={[styles.summaryCardTitle, { color: colors.foreground }]}>
                {t.journeyMemorialCard}
              </Text>
              <Text style={[styles.summaryCardValue, { color: colors.mutedForeground }]} numberOfLines={2}>
                {t.journeyStartYourJourney}
              </Text>
              <Text style={[styles.summaryCardSub, { color: colors.mutedForeground }]} numberOfLines={1}>
                Light a candle in memory
              </Text>
              <View style={styles.summaryCardArrow}>
                <Feather name="arrow-right" size={12} color={GOLD} />
              </View>
            </TouchableOpacity>

            {/* Community */}
            <TouchableOpacity
              style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => go("/(tabs)/community")}
              activeOpacity={0.82}
              accessibilityRole="button"
              accessibilityLabel={t.journeyCommunityCard}
            >
              <View style={[styles.summaryCardIcon, { backgroundColor: GOLD + "18" }]}>
                <Feather name="users" size={20} color={GOLD} />
              </View>
              <Text style={[styles.summaryCardTitle, { color: colors.foreground }]}>
                {t.journeyCommunityCard}
              </Text>
              <Text style={[styles.summaryCardValue, { color: colors.mutedForeground }]} numberOfLines={2}>
                {t.journeyStartYourJourney}
              </Text>
              <Text style={[styles.summaryCardSub, { color: colors.mutedForeground }]} numberOfLines={1}>
                Connect with Bnei Menashe
              </Text>
              <View style={styles.summaryCardArrow}>
                <Feather name="arrow-right" size={12} color={GOLD} />
              </View>
            </TouchableOpacity>
          </View>

          {/* ══ §3  CONTINUE ════════════════════════════════════════════════════ */}
          <SectionLabel title={t.journeyContinueTitle} colors={colors} />

          <View style={styles.continueGrid}>
            {[
              { label: t.journeyContinueStudy,    icon: "book-open" as const, path: "/(tabs)/torah"    },
              { label: t.journeyContinueCalendar,  icon: "calendar"  as const, path: "/(tabs)/calendar" },
              { label: t.journeyContinueMemorial,  icon: "heart"     as const, path: "/sacred-memory"  },
              { label: t.journeyContinueAI,        icon: "cpu"       as const, path: "/sacred-wisdom"  },
            ].map((item) => (
              <TouchableOpacity
                key={item.label}
                style={[styles.continueBtn, {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                }]}
                onPress={() => go(item.path)}
                activeOpacity={0.78}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Feather name={item.icon} size={16} color={GOLD} />
                <Text style={[styles.continueBtnText, { color: colors.foreground }]} numberOfLines={2}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ══ §4  BOOKMARKS ═══════════════════════════════════════════════════ */}
          <SectionLabel title={t.journeyBookmarksTitle} colors={colors} />

          <View style={[styles.bookmarksEmpty, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.bookmarkIconWrap, { backgroundColor: GOLD + "16", borderColor: GOLD + "30" }]}>
              <Feather name="bookmark" size={26} color={GOLD} />
            </View>
            <Text style={[styles.bookmarksEmptyTitle, { color: colors.foreground }]}>
              {t.journeyBookmarksEmpty}
            </Text>
            <Text style={[styles.bookmarksEmptySub, { color: colors.mutedForeground }]}>
              {t.journeyBookmarksEmptySub}
            </Text>
          </View>

          {/* ══ §5  REFLECTION ══════════════════════════════════════════════════ */}
          <SectionLabel title={t.journeyReflectionTitle} colors={colors} />

          <View style={[styles.reflectionCard, { backgroundColor: colors.card, borderColor: GOLD + "44" }]}>
            <View style={[styles.reflectionTopBar, { backgroundColor: GOLD }]} />
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

function SectionLabel({ title, colors }: { title: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.sectionLabel}>
      <View style={[styles.sectionAccent, { backgroundColor: colors.primary }]} />
      <Text style={[styles.sectionLabelText, { color: colors.foreground }]}>{title}</Text>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // §1 Greeting
  greetingSection: {
    paddingHorizontal: SPACE[4],
    paddingBottom: SPACE[5],
  },
  starAccent: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE[1],
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 99,
    paddingHorizontal: SPACE[3],
    paddingVertical: SPACE[1],
    marginBottom: SPACE[4],
  },
  starLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  greetingRow: {
    flexDirection: "row",
    alignItems: "baseline",
    flexWrap: "wrap",
    marginBottom: SPACE[2],
  },
  shalomText: {
    fontSize: TEXT["3xl"],
    fontWeight: "800",
    letterSpacing: -0.5,
    lineHeight: 42,
  },
  hebrewDateText: {
    fontSize: TEXT.lg,
    fontWeight: "700",
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  gregDateText: {
    fontSize: TEXT.base,
    marginBottom: SPACE[4],
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
    gap: SPACE[2],
    marginTop: SPACE[8],
    marginBottom: SPACE[3],
  },
  sectionAccent: {
    width: 3,
    height: 18,
    borderRadius: 2,
  },
  sectionLabelText: {
    fontSize: TEXT.md,
    fontWeight: "700",
    letterSpacing: 0.1,
  },

  // §2 Journey Summary 2×2 grid
  cardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACE[3],
  },
  summaryCard: {
    flex: 1,
    minWidth: "46%",
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACE[4],
    gap: SPACE[1],
    position: "relative",
  },
  summaryCardIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACE[1],
  },
  summaryCardTitle: {
    fontSize: TEXT.sm,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  summaryCardValue: {
    fontSize: TEXT.md,
    fontWeight: "800",
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  summaryCardSub: {
    fontSize: TEXT.xs,
    lineHeight: 16,
  },
  summaryCardArrow: {
    position: "absolute",
    bottom: SPACE[3],
    right: SPACE[3],
  },

  // §3 Continue 2×2 grid
  continueGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACE[3],
  },
  continueBtn: {
    flex: 1,
    minWidth: "46%",
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    paddingVertical: SPACE[4],
    paddingHorizontal: SPACE[3],
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE[2],
    minHeight: 54,
  },
  continueBtnText: {
    fontSize: TEXT.sm,
    fontWeight: "600",
    flex: 1,
    lineHeight: 18,
  },

  // §4 Bookmarks
  bookmarksEmpty: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderStyle: "dashed",
    padding: SPACE[6],
    alignItems: "center",
    gap: SPACE[3],
  },
  bookmarkIconWrap: {
    width: 60,
    height: 60,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  bookmarksEmptyTitle: {
    fontSize: TEXT.md,
    fontWeight: "700",
    textAlign: "center",
  },
  bookmarksEmptySub: {
    fontSize: TEXT.sm,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 280,
  },

  // §5 Reflection
  reflectionCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: SPACE[5],
    gap: SPACE[3],
    overflow: "hidden",
    marginBottom: SPACE[4],
  },
  reflectionTopBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  reflectionQuote: {
    fontSize: TEXT.lg,
    fontWeight: "500",
    fontStyle: "italic",
    lineHeight: 28,
    marginTop: SPACE[2],
  },
  reflectionSource: {
    fontSize: TEXT.sm,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
