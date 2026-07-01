/**
 * SPR-M005A — Mobile Home Screen (Pixel-Perfect Premium)
 *
 * Official design reference: attached_assets/image_1782932878825.png
 *
 * Sections (top → bottom):
 *   1.  Header (hamburger · logo · location · bell)
 *   2.  Lang bar (star · EN | TK)
 *   3.  Hero (gradient · dates · glass zmanim)
 *   4.  Today's Focus
 *   5.  Shabbat Countdown
 *   6.  Today's Zmanim row
 *   7.  Quick Actions 2×4
 *   8.  Weekly Parasha + Torah Insight (2-col)
 *   9.  Daf Yomi + Upcoming Holiday (2-col)
 *  10.  Memorial Sanctuary hero card
 *  11.  Rav Menashe AI hero card
 *  12.  Go Premium
 */

import React, {
  memo,
  useMemo,
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { HDate } from "@hebcal/core";
import { calculateZmanim, formatTime } from "@/lib/zmanim";
import {
  getHebrewDate,
  formatHebrewDate,
  getCurrentParasha,
  getUpcomingHolidays,
} from "@/lib/hebrewCalendar";
import { useThemeTokens } from "@/src/mobile/design-system";
import { useApp } from "@/context/AppContext";
import { useLanguage } from "@/context/LanguageContext";

// ─── Daf Yomi helpers ─────────────────────────────────────────────────────────

const TRACTATES = [
  { name: "Berakhot", pages: 64 }, { name: "Shabbat", pages: 157 },
  { name: "Eruvin", pages: 105 }, { name: "Pesachim", pages: 121 },
  { name: "Yoma", pages: 88 }, { name: "Sukkah", pages: 56 },
  { name: "Beitzah", pages: 40 }, { name: "Rosh Hashana", pages: 35 },
  { name: "Ta'anit", pages: 31 }, { name: "Megillah", pages: 32 },
  { name: "Moed Katan", pages: 29 }, { name: "Chagigah", pages: 27 },
  { name: "Yevamot", pages: 122 }, { name: "Ketubot", pages: 112 },
  { name: "Nedarim", pages: 91 }, { name: "Nazir", pages: 66 },
  { name: "Sotah", pages: 49 }, { name: "Gittin", pages: 90 },
  { name: "Kiddushin", pages: 82 }, { name: "Bava Kamma", pages: 119 },
  { name: "Bava Metzia", pages: 119 }, { name: "Bava Batra", pages: 176 },
  { name: "Sanhedrin", pages: 113 }, { name: "Makkot", pages: 24 },
  { name: "Shevuot", pages: 49 }, { name: "Avodah Zarah", pages: 76 },
  { name: "Horayot", pages: 14 }, { name: "Zevachim", pages: 120 },
  { name: "Menachot", pages: 110 }, { name: "Chullin", pages: 142 },
  { name: "Bekhorot", pages: 61 }, { name: "Arakhin", pages: 34 },
  { name: "Temurah", pages: 34 }, { name: "Keritot", pages: 28 },
  { name: "Meilah", pages: 22 }, { name: "Niddah", pages: 73 },
];
const TOTAL_PAGES = TRACTATES.reduce((a, t) => a + t.pages, 0);
const CYCLE_START = new Date(2020, 0, 5);

function getTodayDaf(): { tractate: string; daf: number } {
  const daysSince = Math.floor((Date.now() - CYCLE_START.getTime()) / 86400000);
  const dayInCycle = ((daysSince % TOTAL_PAGES) + TOTAL_PAGES) % TOTAL_PAGES;
  let cumulative = 0;
  for (const t of TRACTATES) {
    if (dayInCycle < cumulative + t.pages) {
      return { tractate: t.name, daf: dayInCycle - cumulative + 2 };
    }
    cumulative += t.pages;
  }
  return { tractate: "Berakhot", daf: 2 };
}

function getDafProgress(tractate: string, daf: number): number {
  const t = TRACTATES.find((x) => x.name === tractate);
  if (!t) return 0;
  return Math.round(((daf - 2) / t.pages) * 100);
}

function getOmerDay(): number | null {
  const hd = new HDate(new Date());
  const m = hd.getMonth();
  const d = hd.getDate();
  if (m === 1 && d >= 16) return d - 15;
  if (m === 2) return 15 + d;
  if (m === 3 && d <= 5) return 44 + d;
  return null;
}

function getNextWeekday(targetDay: number): Date {
  const d = new Date();
  let diff = (targetDay - d.getDay() + 7) % 7;
  if (diff === 0) diff = 7;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "—";
  const totalSecs = Math.floor(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

const TORAH_INSIGHTS = [
  { quote: "\"The Torah is a tree of life to those who hold fast to it.\"", source: "Proverbs 3:18" },
  { quote: "\"Who is wise? One who learns from every person.\"", source: "Pirkei Avot 4:1" },
  { quote: "\"Love your neighbor as yourself\" — the entire Torah stands on this principle.", source: "Leviticus 19:18" },
  { quote: "\"In the place where a penitent stands, even the perfectly righteous cannot stand.\"", source: "Talmud, Berakhot 34b" },
  { quote: "\"G-d is present in every place, in every moment, in every thought.\"", source: "Baal Shem Tov" },
  { quote: "\"Turn it over and turn it over again, for everything is contained within it.\"", source: "Pirkei Avot 5:22" },
  { quote: "\"Every day one must say: the world was created for my sake.\"", source: "Talmud, Sanhedrin 37a" },
];

// ─── Staggered entrance animation ─────────────────────────────────────────────

function useEntrance(delay = 0): Animated.AnimatedProps<ViewStyle> {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(14)).current;
  useEffect(() => {
    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 380, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration: 380, useNativeDriver: true }),
      ]).start();
    }, delay);
    return () => clearTimeout(t);
  }, [delay, opacity, translateY]);
  return { opacity, transform: [{ translateY }] } as any;
}

// ─── Overline label shared component ─────────────────────────────────────────

const Overline = memo(function Overline({ text, color }: { text: string; color: string }) {
  return (
    <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 1.8, textTransform: "uppercase", color }}>
      {text}
    </Text>
  );
});

// ─── Pill / CTA button ────────────────────────────────────────────────────────

const PillButton = memo(function PillButton({
  label,
  onPress,
  bg,
  fg,
  small,
}: {
  label: string;
  onPress: () => void;
  bg: string;
  fg: string;
  small?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed ? bg + "cc" : bg,
        borderRadius: 9999,
        paddingHorizontal: small ? 14 : 18,
        paddingVertical: small ? 8 : 10,
        flexDirection: "row", alignItems: "center", gap: 6,
        alignSelf: "flex-start",
      })}
    >
      <Text style={{ fontSize: small ? 12 : 13, fontWeight: "700", color: fg }}>{label}</Text>
      <Feather name="chevron-right" size={small ? 11 : 12} color={fg} />
    </Pressable>
  );
});

// ─── Quick action item ─────────────────────────────────────────────────────────

const QA_ITEMS = [
  { id: "calendar",     label: "Calendar",     icon: "calendar"   as const, bg: "#4A90D9", route: "/(tabs)/calendar" },
  { id: "zmanim",       label: "Zmanim",       icon: "clock"      as const, bg: "#9B59B6", route: "/(tabs)/zmanim" },
  { id: "sanctuary",    label: "Sanctuary",    icon: "home"       as const, bg: "#E67E22", route: "/(tabs)/community" },
  { id: "study",        label: "Study",        icon: "book-open"  as const, bg: "#27AE60", route: "/(tabs)/torah" },
  { id: "daf-yomi",     label: "Daf Yomi",     icon: "award"      as const, bg: "#E67E22", route: "/daf-yomi" },
  { id: "library",      label: "Library",      icon: "book"       as const, bg: "#8E44AD", route: "/siddur" },
  { id: "prayer-board", label: "Prayer Board", icon: "users"      as const, bg: "#16A085", route: "/prayer-board" },
  { id: "48-ways",      label: "48 Ways",      icon: "star"       as const, bg: "#D4A843", route: "/mussar" },
];

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { colors, type, sp, rd, shadow, theme } = useThemeTokens();
  const insets = useSafeAreaInsets();
  const { location } = useApp();
  const { lang, setLang, t } = useLanguage();

  const firstName: string | null = null;

  const today = useMemo(() => new Date(), []);
  const hour = today.getHours();

  const greeting =
    hour < 12 ? t.homeGoodMorning
    : hour < 17 ? t.homeGoodAfternoon
    : t.homeGoodEvening;

  const hdate = useMemo(() => getHebrewDate(today), [today]);
  const hebrewDateStr = useMemo(() => formatHebrewDate(hdate), [hdate]);
  const parasha = useMemo(() => getCurrentParasha(), []);
  const holidays = useMemo(() => getUpcomingHolidays(30), []);
  const nextHoliday = holidays[0] ?? null;
  const daf = useMemo(() => getTodayDaf(), []);
  const dafProgress = useMemo(() => getDafProgress(daf.tractate, daf.daf), [daf]);
  const omerDay = useMemo(() => getOmerDay(), []);

  const todayZm = useMemo(
    () => calculateZmanim(today, location.lat, location.lng, location.candleLightingMinutes),
    [location, today],
  );

  const isShabbat = today.getDay() === 6;
  const isFriday = today.getDay() === 5;

  const friday = useMemo(
    () => (isFriday ? today : getNextWeekday(5)),
    [isFriday, today],
  );
  const saturday = useMemo(() => {
    const d = new Date(friday.getTime() + 86400000);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [friday]);

  const fridayZm = useMemo(
    () => calculateZmanim(friday, location.lat, location.lng, location.candleLightingMinutes),
    [location, friday],
  );
  const satZm = useMemo(
    () => calculateZmanim(saturday, location.lat, location.lng),
    [location, saturday],
  );

  const gregDate = today.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const candleLightingMs = fridayZm.candleLighting ? fridayZm.candleLighting.getTime() - now : null;
  const havdalahMs = satZm.havdalah ? satZm.havdalah.getTime() - now : null;

  let countdownMode: "candle" | "havdalah" | "upcoming" = "upcoming";
  let countdownMs = 0;
  let countdownDate = friday;

  if (isShabbat && havdalahMs && havdalahMs > 0) {
    countdownMode = "havdalah";
    countdownMs = havdalahMs;
    countdownDate = saturday;
  } else if (isFriday && candleLightingMs && candleLightingMs > 0) {
    countdownMode = "candle";
    countdownMs = candleLightingMs;
    countdownDate = friday;
  } else if (candleLightingMs && candleLightingMs > 0) {
    countdownMode = "upcoming";
    countdownMs = candleLightingMs;
    countdownDate = friday;
  }

  const countdownDateStr = countdownDate.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  const todayInsight = useMemo(() => {
    const idx = Math.abs(Math.floor(today.getTime() / 86400000) % TORAH_INSIGHTS.length);
    return TORAH_INSIGHTS[idx];
  }, [today]);

  const topPad = insets.top > 0 ? insets.top : (Platform.OS === "web" ? 48 : 20);

  const isLight = theme === "light";
  const isSapphire = theme === "sapphire";

  const heroGradientColors = isLight
    ? (["#F0E6CE", "#E8D5A8", "#D9BB6E"] as const)
    : isSapphire
      ? (["#0c1830", "#1a2e58", "#0c1830"] as const)
      : (["#0a1020", "#111827", "#1a2030"] as const);

  const heroAccent = isLight ? "#c8852a" : colors.primary;
  const cardBg = colors.card;
  const pageBg = colors.background;
  const gold = colors.primary;
  const textPrimary = colors.textPrimary;
  const textMuted = colors.textMuted;
  const textSecondary = colors.textSecondary;
  const borderColor = colors.cardBorder;

  const a0 = useEntrance(0);
  const a1 = useEntrance(50);
  const a2 = useEntrance(100);
  const a3 = useEntrance(150);
  const a4 = useEntrance(200);
  const a5 = useEntrance(240);
  const a6 = useEntrance(280);
  const a7 = useEntrance(320);
  const a8 = useEntrance(360);
  const a9 = useEntrance(400);
  const a10 = useEntrance(430);

  const HX = 24;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: pageBg }}
      contentContainerStyle={{ paddingBottom: (insets.bottom || 0) + 104 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ─── 1. HEADER ──────────────────────────────────────────────────────── */}
      <Animated.View style={[{ paddingTop: topPad, paddingHorizontal: HX, paddingBottom: 12, flexDirection: "row", alignItems: "center" }, a0]}>
        {/* Hamburger */}
        <TouchableOpacity
          style={{ width: 36, height: 36, alignItems: "center", justifyContent: "center", marginRight: 10 }}
          activeOpacity={0.7}
          accessibilityLabel="Menu"
        >
          <Feather name="menu" size={22} color={textPrimary} />
        </TouchableOpacity>

        {/* Logo + Brand */}
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{
            width: 32, height: 32, borderRadius: 8,
            backgroundColor: gold + "20",
            borderWidth: 1, borderColor: gold + "40",
            alignItems: "center", justifyContent: "center",
          }}>
            <Text style={{ fontSize: 16 }}>⛩</Text>
          </View>
          <View>
            <Text style={{ fontSize: 14, fontWeight: "800", color: gold, letterSpacing: 1.4 }}>
              BNEI MENASHE
            </Text>
            <Text style={{ fontSize: 10, color: textMuted, letterSpacing: 0.5 }}>
              {t.homeSacredCalendar}
            </Text>
          </View>
        </View>

        {/* Location chip */}
        <View style={{
          flexDirection: "row", alignItems: "center", gap: 4,
          backgroundColor: isLight ? "#fff8ee" : cardBg,
          borderRadius: rd.pill,
          paddingHorizontal: 10, paddingVertical: 6,
          borderWidth: 1, borderColor,
          marginRight: 10,
        }}>
          <Feather name="map-pin" size={10} color={gold} />
          <Text style={{ fontSize: 11, color: textMuted, fontWeight: "500" }}>
            {location.name}
          </Text>
        </View>

        {/* Bell */}
        <TouchableOpacity
          style={{
            width: 36, height: 36, borderRadius: 18,
            backgroundColor: cardBg,
            borderWidth: 1, borderColor,
            alignItems: "center", justifyContent: "center",
          }}
          activeOpacity={0.7}
          accessibilityLabel="Notifications"
        >
          <Feather name="bell" size={16} color={textPrimary} />
          {/* Dot */}
          <View style={{
            position: "absolute", top: 6, right: 8,
            width: 7, height: 7, borderRadius: 4,
            backgroundColor: "#fb923c",
            borderWidth: 1.5, borderColor: pageBg,
          }} />
        </TouchableOpacity>
      </Animated.View>

      {/* ─── 2. LANG BAR ──────────────────────────────────────────────────────── */}
      <Animated.View style={[{ paddingHorizontal: HX, marginBottom: 14, flexDirection: "row", alignItems: "center", gap: 10 }, a0]}>
        {/* Star badge */}
        <View style={{
          width: 30, height: 30, borderRadius: 15,
          backgroundColor: gold + "18", borderWidth: 1, borderColor: gold + "44",
          alignItems: "center", justifyContent: "center",
        }}>
          <Text style={{ fontSize: 13, color: gold }}>✡</Text>
        </View>

        {/* Pill toggle */}
        <View style={{
          flexDirection: "row",
          backgroundColor: cardBg,
          borderRadius: rd.pill,
          borderWidth: 1, borderColor,
          padding: 3,
        }}>
          {(["en", "tk"] as const).map((l) => (
            <TouchableOpacity
              key={l}
              style={{
                paddingHorizontal: 14, paddingVertical: 5,
                borderRadius: rd.pill,
                backgroundColor: lang === l ? gold : "transparent",
              }}
              onPress={() => setLang(l)}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 11, fontWeight: "700", color: lang === l ? colors.primaryForeground : textMuted }}>
                {l.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

      {/* ─── 3. HERO CARD ─────────────────────────────────────────────────────── */}
      <Animated.View style={[{ marginHorizontal: HX, marginBottom: 14, borderRadius: rd.xl, overflow: "hidden", ...shadow.level3 }, a1]}>
        <LinearGradient
          colors={heroGradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ minHeight: 220 }}
        >
          {/* Decorative top-right */}
          <View style={{ position: "absolute", top: 0, right: 0, width: 160, height: 160, opacity: isLight ? 0.15 : 0.08 }} pointerEvents="none">
            <LinearGradient
              colors={["transparent", gold + "80", gold + "30"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ flex: 1, borderBottomLeftRadius: 80 }}
            />
          </View>
          <View style={{ position: "absolute", top: -20, right: -20, opacity: 0.10 }} pointerEvents="none">
            <Text style={{ fontSize: 140, color: gold }}>⛩</Text>
          </View>

          {/* Content */}
          <View style={{ padding: 20, paddingBottom: 14 }}>
            {/* Greeting */}
            <Text style={{ fontSize: 12, color: isLight ? "#6b4c1e" : textMuted, fontWeight: "500", marginBottom: 2 }}>
              {gregDate}
            </Text>
            <Text style={{ fontSize: 17, fontWeight: "700", marginBottom: 8 }}>
              <Text style={{ color: heroAccent }}>{greeting}</Text>
              {firstName ? (
                <Text style={{ color: isLight ? "#3d2c0e" : textPrimary }}>{", " + firstName}</Text>
              ) : null}
            </Text>

            {/* Hebrew date */}
            <Text style={{ fontSize: 30, fontWeight: "800", color: isLight ? "#1a0f00" : textPrimary, letterSpacing: -0.5, lineHeight: 36 }}>
              {hebrewDateStr}
            </Text>
          </View>

          {/* Glass zmanim bar */}
          {Platform.OS !== "web" ? (
            <BlurView
              intensity={55}
              tint={isLight ? "light" : "dark"}
              style={{ marginHorizontal: 12, marginBottom: 12, borderRadius: rd.lg, overflow: "hidden" }}
            >
              <ZmanimBar todayZm={todayZm} location={location} textPrimary={textPrimary} textMuted={textMuted} isLight={isLight} />
            </BlurView>
          ) : (
            <View style={{
              marginHorizontal: 12, marginBottom: 12, borderRadius: rd.lg, overflow: "hidden",
              backgroundColor: isLight ? "rgba(255,248,238,0.88)" : "rgba(0,0,0,0.55)",
              borderWidth: 1, borderColor: isLight ? "rgba(200,133,42,0.18)" : "rgba(255,255,255,0.08)",
            }}>
              <ZmanimBar todayZm={todayZm} location={location} textPrimary={textPrimary} textMuted={textMuted} isLight={isLight} />
            </View>
          )}
        </LinearGradient>
      </Animated.View>

      {/* ─── 4. TODAY'S FOCUS ─────────────────────────────────────────────────── */}
      <Animated.View style={[{ marginHorizontal: HX, marginBottom: 14 }, a2]}>
        <TodaysFocusCard
          mode={countdownMode}
          isShabbat={isShabbat}
          isFriday={isFriday}
          omerDay={omerDay}
          nextHoliday={nextHoliday}
          candleLightingTime={fridayZm.candleLighting ? formatTime(fridayZm.candleLighting, location.tz) : null}
          t={t}
          gold={gold}
          cardBg={cardBg}
          borderColor={borderColor}
          textPrimary={textPrimary}
          textMuted={textMuted}
          rd={rd}
          shadow={shadow}
          isLight={isLight}
        />
      </Animated.View>

      {/* ─── 5. SHABBAT COUNTDOWN ─────────────────────────────────────────────── */}
      <Animated.View style={[{ marginHorizontal: HX, marginBottom: 14 }, a2]}>
        <ShabbatCountdownCard
          mode={countdownMode}
          countdownMs={countdownMs}
          countdownDateStr={countdownDateStr}
          candleLightingTime={fridayZm.candleLighting ? formatTime(fridayZm.candleLighting, location.tz) : "—"}
          havdalahTime={satZm.havdalah ? formatTime(satZm.havdalah, location.tz) : "—"}
          now={now}
          t={t}
          gold={gold}
          cardBg={cardBg}
          borderColor={borderColor}
          textPrimary={textPrimary}
          textMuted={textMuted}
          rd={rd}
          shadow={shadow}
          isLight={isLight}
        />
      </Animated.View>

      {/* ─── 6. ZMANIM ROW ────────────────────────────────────────────────────── */}
      <Animated.View style={[{ marginBottom: 14 }, a3]}>
        {/* Header row */}
        <View style={{ paddingHorizontal: HX, flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
            <Feather name="clock" size={13} color={gold} />
            <Text style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1.6, color: textMuted, textTransform: "uppercase" }}>
              {t.homeTodaysZmanimLabel}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push("/(tabs)/zmanim")}
            style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, flexDirection: "row", alignItems: "center", gap: 4 })}
          >
            <Text style={{ fontSize: 11, color: gold, fontWeight: "600" }}>{t.homeAllTimesLocal}</Text>
            <Feather name="chevron-right" size={11} color={gold} />
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: HX, gap: 10 }}
        >
          {[
            { label: t.homeDawn,         icon: "sunrise" as const, time: todayZm.alotHaShachar },
            { label: t.homeSunrise,       icon: "sunrise" as const, time: todayZm.sunrise },
            { label: t.homeMinchaGedola,  icon: "sun" as const,     time: todayZm.chatzot },
            { label: t.homeSunset,        icon: "sunset" as const,  time: todayZm.sunset },
            { label: t.homeNightfall,     icon: "moon" as const,    time: todayZm.tzais },
            { label: t.homeTzais,         icon: "moon" as const,    time: todayZm.tzais },
          ].map((z, i) => (
            <View
              key={z.label + i}
              style={{
                alignItems: "center", gap: 6,
                backgroundColor: cardBg,
                borderRadius: rd.lg,
                paddingVertical: 12,
                paddingHorizontal: 14,
                borderWidth: 1, borderColor,
                minWidth: 78,
                ...shadow.level1,
              }}
            >
              <View style={{
                width: 30, height: 30, borderRadius: 15,
                backgroundColor: gold + "18",
                alignItems: "center", justifyContent: "center",
              }}>
                <Feather name={z.icon} size={13} color={gold} />
              </View>
              <Text style={{ fontSize: 9, color: textMuted, fontWeight: "600", textAlign: "center", letterSpacing: 0.5 }}>
                {z.label}
              </Text>
              <Text style={{ fontSize: 13, fontWeight: "700", color: textPrimary }}>
                {z.time ? formatTime(z.time, location.tz) : "—"}
              </Text>
            </View>
          ))}
        </ScrollView>
      </Animated.View>

      {/* ─── 7. QUICK ACTIONS 2×4 ─────────────────────────────────────────────── */}
      <Animated.View style={[{ marginHorizontal: HX, marginBottom: 14 }, a4]}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {QA_ITEMS.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={{
                width: "22%",
                alignItems: "center",
                gap: 7,
                paddingVertical: 12,
              }}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.75}
              accessibilityLabel={item.label}
            >
              <View style={{
                width: 52, height: 52,
                borderRadius: rd.md,
                backgroundColor: item.bg + "22",
                borderWidth: 1, borderColor: item.bg + "35",
                alignItems: "center", justifyContent: "center",
              }}>
                <Feather name={item.icon} size={22} color={item.bg} />
              </View>
              <Text style={{ fontSize: 10, fontWeight: "600", textAlign: "center", color: textSecondary, lineHeight: 14 }}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

      {/* ─── 8. WEEKLY PARASHA + TORAH INSIGHT (2-col) ────────────────────────── */}
      <Animated.View style={[{ marginHorizontal: HX, marginBottom: 14, flexDirection: "row", gap: 12 }, a5]}>
        {/* Parasha */}
        <Pressable
          style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.88 : 1 })}
          onPress={() => router.push("/(tabs)/torah")}
          accessibilityLabel="Weekly Parasha"
        >
          <View style={[s.halfCard, { backgroundColor: cardBg, borderColor, borderRadius: rd.lg, ...shadow.level1 }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <Feather name="book" size={12} color={gold} />
              <Overline text={t.homeParashah} color={gold} />
            </View>
            <Text style={{ fontSize: 16, fontWeight: "700", color: textPrimary, marginBottom: 4 }}>
              {parasha !== "" ? `Parashat ${parasha}` : "—"}
            </Text>
            {/* Scroll decoration */}
            <View style={{ alignItems: "center", marginVertical: 10 }}>
              <Text style={{ fontSize: 32 }}>📜</Text>
            </View>
            <Text style={{ fontSize: 12, color: textMuted, marginBottom: 12, fontStyle: "italic" }}>
              פרשת {parasha}
            </Text>
            <PillButton
              label={t.homeReadSummary}
              onPress={() => router.push("/(tabs)/torah")}
              bg={gold}
              fg={colors.primaryForeground}
              small
            />
          </View>
        </Pressable>

        {/* Torah Insight */}
        <View style={[s.halfCard, { backgroundColor: cardBg, borderColor, borderRadius: rd.lg, ...shadow.level1 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <Feather name="zap" size={12} color="#E67E22" />
            <Overline text={t.homeInsightTitle} color="#E67E22" />
          </View>
          <Text style={{ fontSize: 13, fontStyle: "italic", color: textSecondary, lineHeight: 20, marginBottom: 6 }}>
            {todayInsight.quote}
          </Text>
          {/* Tree decoration */}
          <View style={{ alignItems: "center", marginVertical: 6 }}>
            <Text style={{ fontSize: 28 }}>🌳</Text>
          </View>
          <Text style={{ fontSize: 11, fontWeight: "600", color: textMuted }}>
            {todayInsight.source}
          </Text>
        </View>
      </Animated.View>

      {/* ─── 9. DAF YOMI + UPCOMING HOLIDAY (2-col) ──────────────────────────── */}
      <Animated.View style={[{ marginHorizontal: HX, marginBottom: 14, flexDirection: "row", gap: 12 }, a6]}>
        {/* Daf Yomi */}
        <Pressable
          style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.88 : 1 })}
          onPress={() => router.push("/daf-yomi")}
          accessibilityLabel="Daf Yomi"
        >
          <View style={[s.halfCard, { backgroundColor: cardBg, borderColor, borderRadius: rd.lg, ...shadow.level1 }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
              <Text style={{ fontSize: 12 }}>🎓</Text>
              <Overline text={t.homeDafYomi} color="#E67E22" />
            </View>
            <Text style={{ fontSize: 17, fontWeight: "700", color: textPrimary }}>
              {daf.tractate}
            </Text>
            <Text style={{ fontSize: 12, color: textMuted, marginBottom: 12 }}>
              {t.homeDafYomiToday} · {daf.daf}
            </Text>
            {/* Parchment decoration */}
            <View style={{ alignItems: "center", marginBottom: 10 }}>
              <Text style={{ fontSize: 26 }}>📄</Text>
            </View>
            {/* Progress */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 12 }}>
              <View style={{
                width: 28, height: 28, borderRadius: 14,
                backgroundColor: "#27AE60" + "22",
                borderWidth: 1.5, borderColor: "#27AE60",
                alignItems: "center", justifyContent: "center",
              }}>
                <Text style={{ fontSize: 8, fontWeight: "700", color: "#27AE60" }}>{dafProgress}%</Text>
              </View>
            </View>
            <PillButton
              label={t.homeOpenDafYomi}
              onPress={() => router.push("/daf-yomi")}
              bg={isLight ? "#1a0f00" : colors.card}
              fg={isLight ? "#fff" : textPrimary}
              small
            />
          </View>
        </Pressable>

        {/* Upcoming Holiday */}
        <View style={[s.halfCard, { backgroundColor: cardBg, borderColor, borderRadius: rd.lg, ...shadow.level1 }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <Feather name="calendar" size={12} color={gold} />
            <Overline text={t.homeUpcomingHoliday} color={gold} />
          </View>
          {nextHoliday ? (
            <>
              <Text style={{ fontSize: 16, fontWeight: "700", color: textPrimary }}>
                {nextHoliday.name}
              </Text>
              <Text style={{ fontSize: 12, color: textMuted, marginBottom: 12 }}>
                {nextHoliday.date.toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric" })}
              </Text>
            </>
          ) : (
            <Text style={{ fontSize: 13, color: textMuted, marginBottom: 12 }}>
              {t.homeNoHolidays}
            </Text>
          )}
          {/* Star of David decoration */}
          <View style={{ alignItems: "center", marginVertical: 8 }}>
            <Text style={{ fontSize: 34, opacity: 0.25 }}>✡</Text>
          </View>
          <PillButton
            label={t.homeViewAllHolidays}
            onPress={() => router.push("/(tabs)/calendar")}
            bg={isLight ? "#1a0f00" : colors.card}
            fg={isLight ? "#fff" : textPrimary}
            small
          />
        </View>
      </Animated.View>

      {/* ─── 10. MEMORIAL SANCTUARY (full-width hero) ─────────────────────────── */}
      <Animated.View style={[{ marginHorizontal: HX, marginBottom: 14, borderRadius: rd.xl, overflow: "hidden", ...shadow.level3 }, a7]}>
        <LinearGradient
          colors={["#2d1a0e", "#1a0f00", "#3d2410"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flexDirection: "row", minHeight: 110 }}
        >
          <View style={{ flex: 1, padding: 20, justifyContent: "space-between" }}>
            <Overline text={t.homeMemorialTitle} color={gold} />
            <Text style={{ fontSize: 13, color: "#d4c8b0", marginTop: 8, marginBottom: 16, lineHeight: 20 }}>
              {t.homeMemorialTagline}
            </Text>
            <PillButton
              label={t.homeOpenSanctuary}
              onPress={() => router.push("/(tabs)/community")}
              bg={gold}
              fg="#1a0f00"
              small
            />
          </View>
          {/* Candle artwork */}
          <View style={{ width: 110, alignItems: "center", justifyContent: "center", paddingRight: 12 }}>
            <Text style={{ fontSize: 52 }}>🕯</Text>
            <View style={{
              position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: gold + "08",
            }} />
          </View>
        </LinearGradient>
      </Animated.View>

      {/* ─── 11. RAV MENASHE AI (full-width hero) ─────────────────────────────── */}
      <Animated.View style={[{ marginHorizontal: HX, marginBottom: 14, borderRadius: rd.xl, overflow: "hidden", ...shadow.level3 }, a8]}>
        <LinearGradient
          colors={["#060e1e", "#0c1830", "#0a1428"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flexDirection: "row", minHeight: 110 }}
        >
          <View style={{ flex: 1, padding: 20, justifyContent: "space-between" }}>
            <Overline text={t.homeAITitle} color="#6382FF" />
            <Text style={{ fontSize: 13, color: "#a0b4d8", marginTop: 8, marginBottom: 16, lineHeight: 20 }}>
              {t.homeAITagline}
            </Text>
            <PillButton
              label={t.homeAskRavMenashe}
              onPress={() => router.push("/(tabs)/torah")}
              bg="#6382FF"
              fg="#fff"
              small
            />
          </View>
          {/* Crystal ball artwork */}
          <View style={{ width: 110, alignItems: "center", justifyContent: "center", paddingRight: 12 }}>
            <Text style={{ fontSize: 52 }}>🔮</Text>
            <View style={{
              position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: "#6382FF08",
            }} />
          </View>
        </LinearGradient>
      </Animated.View>

      {/* ─── 12. GO PREMIUM ───────────────────────────────────────────────────── */}
      <Animated.View style={[{ marginHorizontal: HX, marginBottom: 6 }, a9]}>
        <View style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: cardBg,
          borderRadius: rd.xl,
          borderWidth: 1, borderColor: gold + "30",
          paddingVertical: 14, paddingHorizontal: 16,
          gap: 12,
          ...shadow.level1,
        }}>
          <View style={{
            width: 36, height: 36, borderRadius: 18,
            backgroundColor: gold + "18",
            borderWidth: 1, borderColor: gold + "40",
            alignItems: "center", justifyContent: "center",
          }}>
            <Text style={{ fontSize: 18 }}>💎</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: textPrimary }}>{t.homeGoPremium}</Text>
            <Text style={{ fontSize: 12, color: textMuted, marginTop: 1 }}>{t.homeSupportMission}</Text>
          </View>
          <PillButton
            label={t.homeViewBenefits}
            onPress={() => {}}
            bg={gold}
            fg={colors.primaryForeground}
            small
          />
        </View>
      </Animated.View>
    </ScrollView>
  );
}

// ─── Zmanim glass bar (shared between native+web hero) ────────────────────────

const ZmanimBar = memo(function ZmanimBar({
  todayZm, location, textPrimary, textMuted, isLight,
}: {
  todayZm: any;
  location: any;
  textPrimary: string;
  textMuted: string;
  isLight: boolean;
}) {
  const gold = isLight ? "#c8852a" : "#d4a843";
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-around", paddingVertical: 12, paddingHorizontal: 8 }}>
      {[
        { icon: "sunrise" as const, label: "Sunrise",  time: todayZm.sunrise },
        { icon: "sunset" as const,  label: "Sunset",   time: todayZm.sunset },
        { icon: "moon" as const,    label: "Nightfall", time: todayZm.tzais },
      ].map((z) => z.time ? (
        <View key={z.label} style={{ alignItems: "center", gap: 4 }}>
          <Feather name={z.icon} size={14} color={gold} />
          <Text style={{ fontSize: 9, color: isLight ? "#8a6a40" : textMuted, fontWeight: "600" }}>{z.label}</Text>
          <Text style={{ fontSize: 14, fontWeight: "700", color: isLight ? "#1a0f00" : textPrimary }}>
            {formatTime(z.time, location.tz)}
          </Text>
        </View>
      ) : null)}
    </View>
  );
});

// ─── Today's Focus Card ───────────────────────────────────────────────────────

const TodaysFocusCard = memo(function TodaysFocusCard({
  mode, isShabbat, isFriday, omerDay, nextHoliday,
  candleLightingTime, t,
  gold, cardBg, borderColor, textPrimary, textMuted, rd, shadow, isLight,
}: {
  mode: "candle" | "havdalah" | "upcoming";
  isShabbat: boolean;
  isFriday: boolean;
  omerDay: number | null;
  nextHoliday: any;
  candleLightingTime: string | null;
  t: any;
  gold: string; cardBg: string; borderColor: string; textPrimary: string; textMuted: string;
  rd: any; shadow: any; isLight: boolean;
}) {
  let icon = "✦";
  let title = "";
  let subtitle = "";
  let accent = gold;

  if (isShabbat) {
    icon = "✨";
    title = t.homeShabbatInProgress;
    subtitle = t.homeShavuaTov;
    accent = "#a78bfa";
  } else if (isFriday || mode === "candle") {
    icon = "🕯";
    title = t.homeCandleLightingToday;
    subtitle = (candleLightingTime ?? "") + " · " + t.homePrepareForShabbat;
    accent = gold;
  } else if (omerDay !== null) {
    icon = "🌾";
    title = t.homeOmer;
    subtitle = `Day ${omerDay} of the Omer`;
    accent = "#4ade80";
  } else if (nextHoliday) {
    const daysUntil = Math.ceil(
      (nextHoliday.date.getTime() - Date.now()) / 86400000,
    );
    icon = "📅";
    title = nextHoliday.name;
    subtitle = daysUntil === 1 ? "Tomorrow" : `In ${daysUntil} days`;
    accent = gold;
  } else {
    icon = "📖";
    title = t.homeDailyTorah;
    subtitle = t.homeWeeklyParasha;
    accent = gold;
  }

  return (
    <Pressable
      style={({ pressed }) => [
        {
          backgroundColor: cardBg,
          borderRadius: rd.xl,
          borderWidth: 1,
          borderColor,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 14,
          gap: 14,
          opacity: pressed ? 0.88 : 1,
          ...shadow.level1,
        },
      ]}
      accessibilityLabel={title}
    >
      {/* Icon circle */}
      <View style={{
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: accent + "18",
        borderWidth: 1, borderColor: accent + "40",
        alignItems: "center", justifyContent: "center",
      }}>
        <Text style={{ fontSize: 20 }}>{icon}</Text>
      </View>

      {/* Text */}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 9, fontWeight: "700", letterSpacing: 1.6, textTransform: "uppercase", color: accent, marginBottom: 4 }}>
          {t.homeTodaysFocusLabel}
        </Text>
        <Text style={{ fontSize: 15, fontWeight: "700", color: textPrimary }}>{title}</Text>
        <Text style={{ fontSize: 12, color: textMuted, marginTop: 2 }}>{subtitle}</Text>
      </View>

      <Feather name="chevron-right" size={16} color={textMuted} />
    </Pressable>
  );
});

// ─── Shabbat Countdown Card ───────────────────────────────────────────────────

const ShabbatCountdownCard = memo(function ShabbatCountdownCard({
  mode, countdownMs, countdownDateStr,
  candleLightingTime, havdalahTime,
  now, t,
  gold, cardBg, borderColor, textPrimary, textMuted, rd, shadow, isLight,
}: {
  mode: "candle" | "havdalah" | "upcoming";
  countdownMs: number;
  countdownDateStr: string;
  candleLightingTime: string;
  havdalahTime: string;
  now: number;
  t: any;
  gold: string; cardBg: string; borderColor: string; textPrimary: string; textMuted: string;
  rd: any; shadow: any; isLight: boolean;
}) {
  const accent = mode === "havdalah" ? "#a78bfa" : gold;
  const label = mode === "havdalah"
    ? t.homeUntilHavdalah
    : t.homeUntilNextShabbatLabel;

  return (
    <View style={{
      backgroundColor: cardBg,
      borderRadius: rd.xl,
      borderWidth: 1,
      borderColor,
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 16,
      paddingVertical: 18,
      gap: 12,
      ...shadow.level2,
    }}>
      {/* Candle icon */}
      <View style={{ alignItems: "center", justifyContent: "center", width: 40 }}>
        <Text style={{ fontSize: 30 }}>{mode === "havdalah" ? "✨" : "🕯"}</Text>
      </View>

      {/* Left: countdown */}
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 9, fontWeight: "700", letterSpacing: 1.6, color: textMuted, textTransform: "uppercase", marginBottom: 4 }}>
          {label}
        </Text>
        <Text style={{ fontSize: 28, fontWeight: "800", color: accent, letterSpacing: -0.5, lineHeight: 32 }}>
          {countdownMs > 0 ? formatCountdown(countdownMs) : "—"}
        </Text>
        <Text style={{ fontSize: 11, color: textMuted, marginTop: 4 }}>{countdownDateStr}</Text>
      </View>

      {/* Divider */}
      <View style={{ width: 1, height: 64, backgroundColor: borderColor }} />

      {/* Right: times */}
      <View style={{ gap: 10, paddingRight: 4 }}>
        <View style={{ alignItems: "flex-end" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={{ fontSize: 11 }}>🕯</Text>
            <Text style={{ fontSize: 11, color: textMuted }}>{t.homeCandleLighting}</Text>
          </View>
          <Text style={{ fontSize: 16, fontWeight: "700", color: gold }}>{candleLightingTime}</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={{ fontSize: 11 }}>✨</Text>
            <Text style={{ fontSize: 11, color: textMuted }}>{t.homeHavdalah}</Text>
          </View>
          <Text style={{ fontSize: 16, fontWeight: "700", color: mode === "havdalah" ? "#a78bfa" : gold }}>{havdalahTime}</Text>
        </View>
      </View>
    </View>
  );
});

// ─── Shared styles ────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  halfCard: {
    flex: 1,
    padding: 14,
    borderWidth: 1,
  },
});
