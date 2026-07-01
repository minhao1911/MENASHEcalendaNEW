/**
 * SPR-M005 — Premium Mobile Home Screen
 * "What does the user need today?" — warm, peaceful, sacred.
 *
 * Sections (top → bottom):
 *   1. Greeting + Date Hero
 *   2. Prayer Times (Zmanim)
 *   3. Shabbat Countdown
 *   4. Omer (conditional)
 *   5. Weekly Parashah
 *   6. Daily Torah Insight
 *   7. Daf Yomi
 *   8. Quick Actions
 *   9. Upcoming Holiday
 *  10. Community
 *  11. Memorial Sanctuary
 *  12. Rav Menashe AI
 */

import React, {
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
} from "react-native";
import { Feather } from "@expo/vector-icons";
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

function getOmerDay(): number | null {
  const hd = new HDate(new Date());
  const m = hd.getMonth();
  const d = hd.getDate();
  if (m === 1 && d >= 16) return d - 15;
  if (m === 2) return 15 + d;
  if (m === 3 && d <= 5) return 44 + d;
  return null;
}

function omerWeeksAndDays(day: number): { weeks: number; days: number } {
  return { weeks: Math.floor((day - 1) / 7), days: ((day - 1) % 7) + 1 };
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "Now";
  const totalSecs = Math.floor(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function getNextWeekday(targetDay: number): Date {
  const d = new Date();
  let diff = (targetDay - d.getDay() + 7) % 7;
  if (diff === 0) diff = 7;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

const TORAH_INSIGHTS = [
  "\"The beginning of wisdom is the fear of G-d.\" — Study each day as if it were your first encounter with Torah.",
  "\"Love your neighbor as yourself.\" — The entire Torah stands on this single principle.",
  "\"Words of Torah are like fire; just as fire does not ignite by itself, Torah does not endure in one who studies alone.\" — Talmud Bavli, Ta'anit 7a",
  "Every day one must say: the world was created for my sake — meaning, I have a unique purpose no one else can fulfill.",
  "\"Who is wise? One who learns from every person.\" — Pirkei Avot 4:1",
  "The Baal Shem Tov taught: G-d is present in every place, in every moment, in every thought. Holiness is not reserved for the synagogue alone.",
  "\"Turn it over and turn it over again, for everything is contained within it.\" — The Torah contains all wisdom if we look deeply enough.",
];

const QUICK_ACTIONS = [
  { id: "calendar",     label: "Calendar",      icon: "calendar" as const,   color: "#6382FF", route: "/(tabs)/calendar" },
  { id: "zmanim",       label: "Zmanim",         icon: "clock" as const,      color: "#d4a843", route: "/(tabs)/zmanim" },
  { id: "daf-yomi",     label: "Daf Yomi",       icon: "book-open" as const,  color: "#a78bfa", route: "/daf-yomi" },
  { id: "siddur",       label: "Library",        icon: "book" as const,       color: "#34d399", route: "/siddur" },
  { id: "prayer-board", label: "Prayer Board",   icon: "heart" as const,      color: "#f472b6", route: "/prayer-board" },
  { id: "community",   label: "Community",       icon: "users" as const,      color: "#fb923c", route: "/(tabs)/community" },
  { id: "yahrzeit",    label: "Yahrzeit",        icon: "sun" as const,        color: "#e879f9", route: "/yahrzeit-calc" },
  { id: "mussar",      label: "48 Ways",         icon: "star" as const,       color: "#4ade80", route: "/mussar" },
];

// ─── Entrance animation hook ───────────────────────────────────────────────────

function useEntrance(delay = 0) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(18)).current;
  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);
    return () => clearTimeout(timer);
  }, [delay, opacity, translateY]);
  return { opacity, transform: [{ translateY }] };
}

// ─── Section label component ───────────────────────────────────────────────────

function SectionLabel({ label, accent }: { label: string; accent: string }) {
  return (
    <Text
      style={{
        fontSize: 10,
        fontWeight: "700",
        letterSpacing: 2,
        textTransform: "uppercase",
        color: accent,
        marginBottom: 10,
      }}
    >
      {label}
    </Text>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { colors, type, sp, rd, shadow } = useThemeTokens();
  const insets = useSafeAreaInsets();
  const { location } = useApp();
  const { lang, setLang, t } = useLanguage();

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
    weekday: "long", month: "long", day: "numeric",
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
  let countdownLabel = "";

  if (isShabbat && havdalahMs && havdalahMs > 0) {
    countdownMode = "havdalah";
    countdownMs = havdalahMs;
    countdownLabel = t.homeUntilHavdalah;
  } else if (isFriday && candleLightingMs && candleLightingMs > 0) {
    countdownMode = "candle";
    countdownMs = candleLightingMs;
    countdownLabel = t.homeUntilCandleLighting;
  } else if (candleLightingMs && candleLightingMs > 0) {
    countdownMode = "upcoming";
    countdownMs = candleLightingMs;
    countdownLabel = t.homeUntilNextShabbat;
  }

  const [insightExpanded, setInsightExpanded] = useState(false);
  const insight = useMemo(() => {
    const idx = Math.floor(
      (today.getTime() / 86400000) % TORAH_INSIGHTS.length,
    );
    return TORAH_INSIGHTS[Math.abs(idx)];
  }, [today]);

  const topPad = insets.top > 0 ? insets.top : (Platform.OS === "web" ? 56 : 20);
  const bottomPad = insets.bottom > 0 ? insets.bottom : 0;

  const anim0 = useEntrance(0);
  const anim1 = useEntrance(60);
  const anim2 = useEntrance(120);
  const anim3 = useEntrance(180);
  const anim4 = useEntrance(220);
  const anim5 = useEntrance(260);
  const anim6 = useEntrance(300);
  const anim7 = useEntrance(340);
  const anim8 = useEntrance(380);
  const anim9 = useEntrance(420);

  const isHavdalah = countdownMode === "havdalah";
  const countdownAccent = isHavdalah ? "#a78bfa" : colors.primary;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{
        paddingTop: topPad + 8,
        paddingBottom: bottomPad + 110,
        paddingHorizontal: sp[4],
        gap: sp[3],
      }}
      showsVerticalScrollIndicator={false}
    >

      {/* ── 1. Top bar: Brand + Lang toggle ── */}
      <Animated.View style={[{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }, anim0]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: sp[2] }}>
          <View style={{
            width: 32, height: 32, borderRadius: 16,
            backgroundColor: colors.accentGoldMuted,
            borderWidth: 1, borderColor: colors.primary + "44",
            alignItems: "center", justifyContent: "center",
          }}>
            <Text style={{ fontSize: 15, color: colors.primary }}>✡</Text>
          </View>
          <View>
            <Text style={{ fontSize: 13, fontWeight: "700", color: colors.primary, letterSpacing: 1.8 }}>
              BNEI MENASHE
            </Text>
            <Text style={{ fontSize: 9, color: colors.textMuted, letterSpacing: 0.8, marginTop: 1 }}>
              {t.homeSacredCalendar.toUpperCase()}
            </Text>
          </View>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: sp[2] }}>
          <View style={{
            flexDirection: "row", borderRadius: rd.pill,
            borderWidth: 1, borderColor: colors.border,
            overflow: "hidden",
          }}>
            {(["en", "tk"] as const).map((l) => (
              <TouchableOpacity
                key={l}
                style={{
                  paddingHorizontal: sp[3], paddingVertical: 5,
                  backgroundColor: lang === l ? colors.primary : "transparent",
                }}
                onPress={() => setLang(l)}
                activeOpacity={0.8}
              >
                <Text style={{
                  fontSize: 11, fontWeight: "700", letterSpacing: 0.5,
                  color: lang === l ? colors.primaryForeground : colors.textMuted,
                }}>
                  {l.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={{
            flexDirection: "row", alignItems: "center", gap: 4,
            backgroundColor: colors.card, borderRadius: rd.pill,
            paddingHorizontal: sp[2.5], paddingVertical: 5,
            borderWidth: 1, borderColor: colors.border,
          }}>
            <Feather name="map-pin" size={10} color={colors.textMuted} />
            <Text style={{ fontSize: 10, color: colors.textMuted, fontWeight: "500" }}>
              {location.name}
            </Text>
          </View>
        </View>
      </Animated.View>

      {/* ── 2. Greeting + Hero Date Card ── */}
      <Animated.View style={anim0}>
        <View style={[styles.heroCard, {
          backgroundColor: colors.card,
          borderColor: colors.primary + "30",
          borderWidth: 1,
          borderRadius: rd.xl,
          ...shadow.level2,
        }]}>
          {/* Decorative star */}
          <View style={{
            position: "absolute", top: -10, right: -10,
            width: 120, height: 120, opacity: 0.04,
          }} pointerEvents="none">
            <Text style={{ fontSize: 100, color: colors.primary }}>✡</Text>
          </View>

          {/* Greeting row */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: sp[4] }}>
            <View>
              <Text style={{ fontSize: 11, color: colors.textMuted, letterSpacing: 1, textTransform: "uppercase", fontWeight: "600" }}>
                {gregDate}
              </Text>
              <Text style={{ fontSize: 22, fontWeight: "700", color: colors.textPrimary, marginTop: 2 }}>
                {greeting}
              </Text>
            </View>
            <View style={{
              backgroundColor: colors.accentGoldMuted,
              borderRadius: rd.md,
              paddingHorizontal: sp[3],
              paddingVertical: sp[1.5],
              borderWidth: 1, borderColor: colors.primary + "30",
            }}>
              <Text style={{ fontSize: 10, color: colors.primary, fontWeight: "700", letterSpacing: 1 }}>
                {t.homeToday}
              </Text>
            </View>
          </View>

          {/* Hebrew Date */}
          <Text style={{
            fontSize: 32, fontWeight: "700", color: colors.textPrimary,
            letterSpacing: -0.5, marginBottom: sp[4],
            lineHeight: 38,
          }}>
            {hebrewDateStr}
          </Text>

          {/* Divider */}
          <View style={{ height: 1, backgroundColor: colors.divider, marginBottom: sp[4] }} />

          {/* Sun times row */}
          <View style={{ flexDirection: "row", justifyContent: "space-around" }}>
            {[
              { icon: "sunrise" as const, label: t.homeSunrise, time: todayZm.sunrise },
              { icon: "sunset" as const, label: t.homeSunset, time: todayZm.sunset },
              { icon: "moon" as const, label: t.homeNightfall, time: todayZm.tzais },
            ].map((item) => item.time ? (
              <View key={item.label} style={{ alignItems: "center", gap: 6 }}>
                <View style={{
                  width: 34, height: 34, borderRadius: 17,
                  backgroundColor: colors.accentGoldMuted,
                  alignItems: "center", justifyContent: "center",
                  borderWidth: 1, borderColor: colors.primary + "25",
                }}>
                  <Feather name={item.icon} size={14} color={colors.primary} />
                </View>
                <Text style={{ fontSize: 9, color: colors.textMuted, fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase" }}>
                  {item.label}
                </Text>
                <Text style={{ fontSize: 14, fontWeight: "700", color: colors.textPrimary }}>
                  {formatTime(item.time, location.tz)}
                </Text>
              </View>
            ) : null)}
          </View>
        </View>
      </Animated.View>

      {/* ── 3. Prayer Times (Zmanim) ── */}
      <Animated.View style={anim1}>
        <SectionLabel label={t.homePrayerTimesTitle.toUpperCase()} accent={colors.primary} />
        <View style={[styles.card, {
          backgroundColor: colors.card,
          borderColor: colors.cardBorder,
          borderRadius: rd.lg,
        }]}>
          <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
            {[
              { label: t.homeDawn,         time: todayZm.alotHaShachar },
              { label: t.homeLatestShema,  time: todayZm.latestShema },
              { label: t.homeNoon,         time: todayZm.chatzot },
              { label: t.homeMincha,       time: todayZm.minchaKetana },
              { label: t.homePlag,         time: todayZm.plagHamincha },
              { label: t.homeTzais,        time: todayZm.tzais },
            ].map((z, i) => (
              <View
                key={z.label}
                style={{
                  width: "50%",
                  paddingVertical: sp[2.5],
                  paddingHorizontal: sp[2],
                  borderBottomWidth: i < 4 ? 1 : 0,
                  borderRightWidth: i % 2 === 0 ? 1 : 0,
                  borderColor: colors.divider,
                }}
              >
                <Text style={{ fontSize: 9, color: colors.textMuted, fontWeight: "600", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 4 }}>
                  {z.label}
                </Text>
                <Text style={{ fontSize: 15, fontWeight: "700", color: colors.textPrimary }}>
                  {z.time ? formatTime(z.time, location.tz) : "—"}
                </Text>
              </View>
            ))}
          </View>
          <Pressable
            onPress={() => router.push("/(tabs)/zmanim")}
            style={({ pressed }) => ({
              marginTop: sp[3],
              flexDirection: "row", alignItems: "center", justifyContent: "center",
              gap: sp[1.5], opacity: pressed ? 0.7 : 1,
            })}
          >
            <Text style={{ fontSize: 12, color: colors.primary, fontWeight: "600" }}>
              {t.homeViewZmanim}
            </Text>
            <Feather name="arrow-right" size={12} color={colors.primary} />
          </Pressable>
        </View>
      </Animated.View>

      {/* ── 4. Shabbat / Countdown ── */}
      <Animated.View style={anim2}>
        <SectionLabel label={t.homeShabbatTitle.toUpperCase()} accent={colors.primary} />
        <View style={[styles.card, {
          backgroundColor: isHavdalah ? "#a78bfa10" : colors.accentGoldMuted,
          borderColor: isHavdalah ? "#a78bfa44" : colors.primary + "44",
          borderRadius: rd.lg, alignItems: "center",
        }]}>
          {/* Countdown (if active) */}
          {countdownMs > 0 && (
            <>
              <Text style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1.5, textTransform: "uppercase", color: countdownAccent, marginBottom: sp[1] }}>
                {countdownLabel}
              </Text>
              <Text style={{ fontSize: 48, fontWeight: "700", color: countdownAccent, letterSpacing: -2, marginBottom: sp[1] }}>
                {formatCountdown(countdownMs)}
              </Text>
            </>
          )}

          {/* Candle lighting & Havdalah times */}
          <View style={{ flexDirection: "row", width: "100%", marginTop: countdownMs > 0 ? sp[3] : 0 }}>
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>
                🕯 {t.homeCandleLighting}
              </Text>
              <Text style={{ fontSize: 20, fontWeight: "700", color: colors.primary }}>
                {formatTime(fridayZm.candleLighting, location.tz)}
              </Text>
            </View>
            <View style={{ width: 1, backgroundColor: colors.divider, marginHorizontal: sp[3] }} />
            <View style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 6 }}>
                ✨ {t.homeHavdalah}
              </Text>
              <Text style={{ fontSize: 20, fontWeight: "700", color: isHavdalah ? "#a78bfa" : colors.primary }}>
                {formatTime(satZm.havdalah, location.tz)}
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* ── 5. Omer (conditional) ── */}
      {omerDay !== null && (
        <Animated.View style={anim2}>
          <View style={[styles.card, {
            backgroundColor: "#4ade8008",
            borderColor: "#4ade8033",
            borderRadius: rd.lg,
          }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: sp[2], marginBottom: sp[2] }}>
              <Text style={{ fontSize: 16 }}>🌾</Text>
              <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase", color: "#4ade80" }}>
                {t.homeOmer}
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: sp[1.5] }}>
              <Text style={{ fontSize: 40, fontWeight: "700", color: colors.textPrimary }}>
                {omerDay}
              </Text>
              <Text style={{ fontSize: 14, color: colors.textMuted }}>
                {(() => {
                  const { weeks, days } = omerWeeksAndDays(omerDay);
                  if (weeks === 0) return `${days} ${t.homeOmerDays}`;
                  return `${weeks} ${t.homeOmerWeeks} · ${days} ${t.homeOmerDays}`;
                })()}
              </Text>
            </View>
          </View>
        </Animated.View>
      )}

      {/* ── 6. Weekly Parashah ── */}
      {parasha !== "" && (
        <Animated.View style={anim3}>
          <SectionLabel label={t.homeWeeklyParasha.toUpperCase()} accent={colors.primary} />
          <Pressable
            onPress={() => router.push("/(tabs)/torah")}
            style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1 })}
          >
            <View style={[styles.card, {
              backgroundColor: colors.card,
              borderColor: colors.primary + "30",
              borderRadius: rd.lg,
              flexDirection: "row",
              gap: sp[3],
              ...shadow.level1,
            }]}>
              {/* Gold accent bar */}
              <View style={{
                width: 3, borderRadius: 2,
                backgroundColor: colors.primary,
                alignSelf: "stretch",
              }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, color: colors.primary, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase", marginBottom: sp[1] }}>
                  {t.homeParashah}
                </Text>
                <Text style={{ fontSize: 22, fontWeight: "700", color: colors.textPrimary }}>
                  Parashat {parasha}
                </Text>
                <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 4 }}>
                  {t.homeReadMore}
                </Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.textMuted} style={{ alignSelf: "center" }} />
            </View>
          </Pressable>
        </Animated.View>
      )}

      {/* ── 7. Daily Torah Insight ── */}
      <Animated.View style={anim4}>
        <SectionLabel label={t.homeInsightTitle.toUpperCase()} accent={colors.primary} />
        <View style={[styles.card, {
          backgroundColor: colors.card,
          borderColor: colors.accentGoldMuted,
          borderRadius: rd.lg,
          borderWidth: 1,
        }]}>
          <Text style={{
            fontSize: 22, color: colors.primary, marginBottom: sp[2], fontWeight: "300",
          }}>❝</Text>
          <Text style={{
            fontSize: 15, color: colors.textSecondary, lineHeight: 23,
            fontStyle: "italic",
          }}
            numberOfLines={insightExpanded ? undefined : 3}
          >
            {insight}
          </Text>
          <TouchableOpacity
            onPress={() => setInsightExpanded((e) => !e)}
            style={{ marginTop: sp[2] }}
            activeOpacity={0.7}
          >
            <Text style={{ fontSize: 12, color: colors.primary, fontWeight: "600" }}>
              {insightExpanded ? t.homeShowLess : t.homeReadMore}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* ── 8. Daf Yomi ── */}
      <Animated.View style={anim4}>
        <Pressable
          onPress={() => router.push("/daf-yomi")}
          style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1 })}
        >
          <View style={[styles.card, {
            backgroundColor: colors.card,
            borderColor: "#a78bfa33",
            borderRadius: rd.lg,
            flexDirection: "row", alignItems: "center", gap: sp[3],
            ...shadow.level1,
          }]}>
            <View style={{
              width: 44, height: 44, borderRadius: rd.md,
              backgroundColor: "#a78bfa15",
              alignItems: "center", justifyContent: "center",
              borderWidth: 1, borderColor: "#a78bfa33",
            }}>
              <Text style={{ fontSize: 20 }}>🎓</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, color: "#a78bfa", fontWeight: "700", letterSpacing: 2, textTransform: "uppercase", marginBottom: 3 }}>
                {t.homeDafYomi}
              </Text>
              <Text style={{ fontSize: 18, fontWeight: "700", color: colors.textPrimary }}>
                {daf.tractate}
              </Text>
              <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                {t.homeDafYomiToday} · Daf {daf.daf}
              </Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.textMuted} />
          </View>
        </Pressable>
      </Animated.View>

      {/* ── 9. Quick Actions ── */}
      <Animated.View style={anim5}>
        <SectionLabel label={t.homeQuickActionsTitle.toUpperCase()} accent={colors.primary} />
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: sp[2] }}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={{
                width: "22%",
                alignItems: "center",
                gap: sp[1.5],
                paddingVertical: sp[2.5],
                paddingHorizontal: sp[1],
                backgroundColor: action.color + "14",
                borderRadius: rd.md,
                borderWidth: 1,
                borderColor: action.color + "30",
              }}
              onPress={() => router.push(action.route as any)}
              activeOpacity={0.75}
            >
              <View style={{
                width: 36, height: 36, borderRadius: rd.sm,
                backgroundColor: action.color + "20",
                alignItems: "center", justifyContent: "center",
              }}>
                <Feather name={action.icon} size={16} color={action.color} />
              </View>
              <Text style={{
                fontSize: 9, fontWeight: "700", textAlign: "center",
                color: colors.textSecondary, letterSpacing: 0.3,
              }}>
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

      {/* ── 10. Upcoming Holiday ── */}
      {nextHoliday && (
        <Animated.View style={anim6}>
          <View style={[styles.card, {
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderRadius: rd.lg,
            flexDirection: "row",
            alignItems: "center",
            gap: sp[3],
          }]}>
            <View style={{
              width: 44, height: 44, borderRadius: rd.md,
              backgroundColor: colors.accentGoldMuted,
              alignItems: "center", justifyContent: "center",
              borderWidth: 1, borderColor: colors.primary + "25",
            }}>
              <Feather name="calendar" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, color: colors.primary, fontWeight: "700", letterSpacing: 2, textTransform: "uppercase", marginBottom: 3 }}>
                {t.homeUpcomingHoliday}
              </Text>
              <Text style={{ fontSize: 17, fontWeight: "700", color: colors.textPrimary }}>
                {nextHoliday.name}
              </Text>
              <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                {nextHoliday.date.toLocaleDateString("en-US", {
                  weekday: "short", month: "long", day: "numeric",
                })}
              </Text>
            </View>
          </View>
        </Animated.View>
      )}

      {/* ── 11. Community ── */}
      <Animated.View style={anim7}>
        <Pressable
          onPress={() => router.push("/(tabs)/community")}
          style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1 })}
        >
          <View style={[styles.card, {
            backgroundColor: "#fb923c0e",
            borderColor: "#fb923c30",
            borderRadius: rd.lg,
            flexDirection: "row", alignItems: "center", gap: sp[3],
          }]}>
            <View style={{
              width: 44, height: 44, borderRadius: rd.md,
              backgroundColor: "#fb923c1a",
              alignItems: "center", justifyContent: "center",
              borderWidth: 1, borderColor: "#fb923c30",
            }}>
              <Feather name="users" size={18} color="#fb923c" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, color: "#fb923c", fontWeight: "700", letterSpacing: 2, textTransform: "uppercase", marginBottom: 3 }}>
                {t.homeCommunityTitle}
              </Text>
              <Text style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 20 }}>
                {t.homeCommunityDesc}
              </Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.textMuted} />
          </View>
        </Pressable>
      </Animated.View>

      {/* ── 12. Memorial Sanctuary ── */}
      <Animated.View style={anim8}>
        <SectionLabel label={t.homeMemorialTitle.toUpperCase()} accent={colors.primary} />
        <View style={[styles.card, {
          backgroundColor: colors.card,
          borderColor: colors.primary + "25",
          borderRadius: rd.xl,
          overflow: "hidden",
          ...shadow.level2,
        }]}>
          {/* Decorative background */}
          <View style={{
            position: "absolute", bottom: -20, right: -20, opacity: 0.06,
          }} pointerEvents="none">
            <Text style={{ fontSize: 120, color: colors.primary }}>✡</Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: sp[3], marginBottom: sp[3] }}>
            <View style={{
              width: 48, height: 48, borderRadius: rd.md,
              backgroundColor: colors.accentGoldMuted,
              alignItems: "center", justifyContent: "center",
              borderWidth: 1, borderColor: colors.primary + "30",
            }}>
              <Text style={{ fontSize: 22 }}>🕯</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: colors.textPrimary }}>
                {t.homeMemorialTitle}
              </Text>
              <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 3, lineHeight: 18 }}>
                {t.homeMemorialDesc}
              </Text>
            </View>
          </View>

          <Pressable
            onPress={() => router.push("/(tabs)/community")}
            style={({ pressed }) => ({
              backgroundColor: pressed ? colors.primary + "dd" : colors.primary,
              borderRadius: rd.md,
              paddingVertical: sp[3],
              alignItems: "center",
            })}
          >
            <Text style={{ fontSize: 14, fontWeight: "700", color: colors.primaryForeground, letterSpacing: 0.5 }}>
              {t.homeOpenSanctuary}
            </Text>
          </Pressable>
        </View>
      </Animated.View>

      {/* ── 13. Rav Menashe AI ── */}
      <Animated.View style={anim9}>
        <SectionLabel label={t.homeAITitle.toUpperCase()} accent="#6382FF" />
        <Pressable
          onPress={() => router.push("/(tabs)/torah")}
          style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1 })}
        >
          <View style={[styles.card, {
            backgroundColor: "#6382FF0e",
            borderColor: "#6382FF30",
            borderRadius: rd.xl,
            overflow: "hidden",
          }]}>
            {/* Decorative */}
            <View style={{
              position: "absolute", top: -10, right: -10, opacity: 0.08,
            }} pointerEvents="none">
              <Text style={{ fontSize: 90 }}>✨</Text>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", gap: sp[3], marginBottom: sp[3] }}>
              <View style={{
                width: 48, height: 48, borderRadius: rd.md,
                backgroundColor: "#6382FF20",
                alignItems: "center", justifyContent: "center",
                borderWidth: 1, borderColor: "#6382FF35",
              }}>
                <Feather name="cpu" size={22} color="#6382FF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 17, fontWeight: "700", color: colors.textPrimary }}>
                  {t.homeAITitle}
                </Text>
                <Text style={{ fontSize: 13, color: colors.textMuted, marginTop: 3, lineHeight: 18 }}>
                  {t.homeAIDesc}
                </Text>
              </View>
            </View>

            {/* Prompt pill */}
            <View style={{
              flexDirection: "row", alignItems: "center",
              backgroundColor: colors.background,
              borderRadius: rd.pill,
              paddingHorizontal: sp[4], paddingVertical: sp[3],
              borderWidth: 1, borderColor: "#6382FF30",
              gap: sp[2],
            }}>
              <Feather name="search" size={14} color={colors.textMuted} />
              <Text style={{ fontSize: 14, color: colors.textMuted, flex: 1 }}>
                {t.homeAskRavMenashe}
              </Text>
              <Feather name="send" size={14} color="#6382FF" />
            </View>
          </View>
        </Pressable>
      </Animated.View>

    </ScrollView>
  );
}

// ─── Minimal shared card style (raw values — not using makeStyles to keep readable) ──

const styles = StyleSheet.create({
  heroCard: {
    padding: 20,
    overflow: "hidden",
  },
  card: {
    padding: 16,
    borderWidth: 1,
  },
});
