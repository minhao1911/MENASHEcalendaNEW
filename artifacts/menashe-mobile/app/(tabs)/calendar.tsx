/**
 * SPR-M009 — Sacred Time Experience
 * Mobile "Sacred Time" screen — the user's primary place to experience Jewish time.
 *
 * NOT a traditional calendar. A beautifully crafted Jewish almanac:
 * Hero (Hebrew + Gregorian month) → Today → Monthly Calendar → Upcoming Events
 * → Zmanim Preview → Omer (conditional) → Study Connection → Reflection.
 *
 * Architecture rules (SPR-M009):
 *   ✓ Web untouched          ✓ Shared Core reused        ✓ Calendar engine reused
 *   ✓ Mobile Shell reused    ✓ MMDL reused                ✓ MEL followed
 *   ✓ No Hebrew/Zmanim/Holiday calculation duplicated — all sourced from
 *     @workspace/shared-core via lib/hebrewCalendar.ts and lib/zmanim.ts
 */

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { HDate } from "@hebcal/core";

import { useThemeTokens } from "@/src/mobile/design-system";
import { useReducedMotion } from "@/src/mobile/design-system/accessibility";
import { useApp } from "@/context/AppContext";
import { useLanguage } from "@/context/LanguageContext";
import { calculateZmanim, formatTime } from "@/lib/zmanim";
import {
  getHebrewDate,
  formatHebrewDate,
  formatHebrewDateHebrew,
  getHebrewMonthName,
  getMonthCalendar,
  getCurrentParasha,
  getUpcomingHolidays,
  hebrewDayNumeral,
  type CalendarDay,
} from "@/lib/hebrewCalendar";

// ─── Local presentation helpers (no calendar/zmanim math — display only) ──────

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

/** Omer day (1-49) — not part of shared-core; simple display-only derivation
 *  from the already-computed HDate, same technique used on the Home screen. */
function getOmerDay(hd: HDate): number | null {
  const m = hd.getMonth();
  const d = hd.getDate();
  if (m === 1 && d >= 16) return d - 15;
  if (m === 2) return 15 + d;
  if (m === 3 && d <= 5) return 44 + d;
  return null;
}

const REFLECTIONS = [
  { thought: "Every sunset is God's reminder that endings can be beautiful.", source: "Jewish Wisdom" },
  { thought: "Time is not something we spend — it is something we sanctify.", source: "Heschel, The Sabbath" },
  { thought: "The Jewish calendar does not measure time; it measures meaning.", source: "Jewish Wisdom" },
  { thought: "Each day carries its own light — look for it before it sets.", source: "Baal Shem Tov" },
  { thought: "To count the Omer is to count what truly matters, one day at a time.", source: "Jewish Wisdom" },
  { thought: "Shabbat is a palace in time which we build.", source: "Heschel, The Sabbath" },
  { thought: "A New Moon is a small door — walk through it renewed.", source: "Jewish Wisdom" },
];

function getTodayReflection(today: Date) {
  const idx = Math.abs(Math.floor(today.getTime() / 86_400_000) % REFLECTIONS.length);
  return REFLECTIONS[idx];
}

// ─── Reduced-motion-aware entrance ─────────────────────────────────────────────

function useEntrance(delay: number, reducedMotion: boolean): Animated.AnimatedProps<ViewStyle> {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(reducedMotion ? 0 : 14)).current;
  useEffect(() => {
    const duration = reducedMotion ? 0 : 380;
    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration, useNativeDriver: true }),
      ]).start();
    }, reducedMotion ? 0 : delay);
    return () => clearTimeout(t);
  }, [delay, opacity, translateY, reducedMotion]);
  return { opacity, transform: [{ translateY }] } as any;
}

function usePressScale(reducedMotion: boolean, toValue = 0.96) {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = useCallback(
    () => Animated.timing(scale, { toValue: reducedMotion ? 1 : toValue, duration: 80, useNativeDriver: true }).start(),
    [scale, toValue, reducedMotion],
  );
  const onPressOut = useCallback(
    () => Animated.timing(scale, { toValue: 1, duration: 150, useNativeDriver: true }).start(),
    [scale],
  );
  return { scale, onPressIn, onPressOut };
}

// ─── Section header (matches MEL overline pattern) ────────────────────────────

const SectionHeader = memo(function SectionHeader({
  icon, label, gold, muted, onPress, ctaLabel,
}: {
  icon: React.ComponentProps<typeof Feather>["name"]; label: string; gold: string; muted: string;
  onPress?: () => void; ctaLabel?: string;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
        <Feather name={icon} size={13} color={gold} />
        <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 1.8, color: muted, textTransform: "uppercase" }}>
          {label}
        </Text>
      </View>
      {onPress && ctaLabel ? (
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={ctaLabel}
          hitSlop={8}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, flexDirection: "row", alignItems: "center", gap: 4, minHeight: 44, justifyContent: "center" })}
        >
          <Text style={{ fontSize: 11, color: gold, fontWeight: "600" }}>{ctaLabel}</Text>
          <Feather name="chevron-right" size={11} color={gold} />
        </Pressable>
      ) : null}
    </View>
  );
});

// ─── Memoized calendar cell — never re-renders unless its own props change ────

interface DayCellProps {
  day: CalendarDay;
  isSelected: boolean;
  reducedMotion: boolean;
  colors: ReturnType<typeof useThemeTokens>["colors"];
  onPress: (day: CalendarDay) => void;
}

const DayCell = memo(
  function DayCell({ day, isSelected, reducedMotion, colors, onPress }: DayCellProps) {
    const { scale, onPressIn, onPressOut } = usePressScale(reducedMotion, 0.9);
    const hasEvents = day.events.length > 0;

    return (
      <Pressable
        onPress={() => onPress(day)}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="button"
        accessibilityLabel={`${day.date.toLocaleDateString("en-US", { month: "long", day: "numeric" })}${day.isToday ? ", today" : ""}${day.isShabbat ? ", Shabbat" : ""}${hasEvents ? ", " + day.events.join(", ") : ""}`}
        accessibilityState={{ selected: isSelected }}
        style={{ width: "14.28%", aspectRatio: 0.92, alignItems: "center", justifyContent: "center", paddingVertical: 3 }}
      >
        <Animated.View
          style={{
            width: 40, height: 40, borderRadius: 14,
            alignItems: "center", justifyContent: "center",
            transform: [{ scale }],
            backgroundColor: isSelected
              ? colors.primary
              : day.isShabbat
              ? colors.primaryMuted
              : "transparent",
            borderWidth: day.isToday && !isSelected ? 1.5 : 0,
            borderColor: colors.primary,
          }}
        >
          <Text
            style={{
              fontSize: 14, fontWeight: day.isToday || day.roshChodesh ? "700" : "500",
              color: isSelected ? colors.primaryForeground : day.isToday || day.isShabbat ? colors.primary : colors.textPrimary,
            }}
          >
            {day.gregorianDay}
          </Text>
          <Text
            style={{
              fontSize: 8, marginTop: 1,
              color: isSelected ? colors.primaryForeground + "cc" : colors.textMuted,
            }}
          >
            {hebrewDayNumeral(day.hebrewDay)}
          </Text>
          {hasEvents && (
            <View
              style={{
                position: "absolute", bottom: 2,
                width: 4, height: 4, borderRadius: 2,
                backgroundColor: isSelected ? colors.primaryForeground : colors.accentGold,
              }}
            />
          )}
        </Animated.View>
      </Pressable>
    );
  },
  (prev, next) =>
    prev.isSelected === next.isSelected &&
    prev.reducedMotion === next.reducedMotion &&
    prev.day.date.getTime() === next.day.date.getTime() &&
    prev.day.events.length === next.day.events.length,
);

// ─── Main Screen ────────────────────────────────────────────────────────────

export default function SacredTimeScreen() {
  const { colors, type, sp, rd, shadow, theme } = useThemeTokens();
  const insets = useSafeAreaInsets();
  const { location } = useApp();
  const { t } = useLanguage();
  const reducedMotion = useReducedMotion();

  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<CalendarDay | null>(null);

  const isLight = theme === "light";
  const isSapphire = theme === "sapphire";

  // ── Data — all sourced from shared-core, zero duplication ──────────────────
  const hdate = useMemo(() => getHebrewDate(today), [today]);
  const hebrewDateStr = useMemo(() => formatHebrewDate(hdate), [hdate]);
  const hebrewNumeralStr = useMemo(() => {
    try { return formatHebrewDateHebrew(hdate); } catch { return ""; }
  }, [hdate]);
  const hebrewMonthName = useMemo(() => getHebrewMonthName(hdate), [hdate]);
  const gregMonthName = useMemo(
    () => today.toLocaleDateString("en-US", { month: "long" }),
    [today],
  );

  const monthDays = useMemo(() => getMonthCalendar(year, month), [year, month]);
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const leadingBlanks = useMemo(() => Array(firstDayOfWeek).fill(null), [firstDayOfWeek]);
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();

  const parasha = useMemo(() => getCurrentParasha(), []);
  const allHolidays = useMemo(() => getUpcomingHolidays(60), []);
  const fastDays = useMemo(
    () => allHolidays.filter((h) => /fast|tzom|tisha|ta'?anit|taanis/i.test(h.name)).slice(0, 3),
    [allHolidays],
  );
  const majorHolidays = useMemo(
    () => allHolidays.filter((h) => !/fast|tzom|tisha|ta'?anit|taanis/i.test(h.name)).slice(0, 4),
    [allHolidays],
  );

  const todayZm = useMemo(
    () => calculateZmanim(today, location.lat, location.lng, location.candleLightingMinutes),
    [location, today],
  );

  const omerDay = useMemo(() => getOmerDay(hdate), [hdate]);
  const reflection = useMemo(() => getTodayReflection(today), [today]);

  const todaySignificance = useMemo(() => {
    if (today.getDay() === 6) return "Shabbat Shalom — a day of rest and sanctity.";
    const todaysHoliday = allHolidays.find((h) => {
      const d = h.date;
      return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
    });
    if (todaysHoliday) return todaysHoliday.name;
    return `Parashat ${parasha}`;
  }, [today, allHolidays, parasha]);

  // ── Month navigation (with fade+slide transition) ───────────────────────────
  const monthOpacity = useRef(new Animated.Value(1)).current;
  const monthTranslate = useRef(new Animated.Value(0)).current;

  const animateMonthChange = useCallback((direction: 1 | -1, apply: () => void) => {
    if (reducedMotion) { apply(); return; }
    Animated.timing(monthOpacity, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => {
      apply();
      monthTranslate.setValue(12 * direction);
      Animated.parallel([
        Animated.timing(monthOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(monthTranslate, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    });
  }, [monthOpacity, monthTranslate, reducedMotion]);

  const prevMonth = useCallback(() => {
    animateMonthChange(-1, () => {
      if (month === 0) { setMonth(11); setYear((y) => y - 1); } else setMonth((m) => m - 1);
      setSelected(null);
    });
  }, [animateMonthChange, month]);

  const nextMonth = useCallback(() => {
    animateMonthChange(1, () => {
      if (month === 11) { setMonth(0); setYear((y) => y + 1); } else setMonth((m) => m + 1);
      setSelected(null);
    });
  }, [animateMonthChange, month]);

  const goToday = useCallback(() => {
    animateMonthChange(1, () => {
      setYear(today.getFullYear());
      setMonth(today.getMonth());
      setSelected(null);
    });
  }, [animateMonthChange, today]);

  const onSelectDay = useCallback((day: CalendarDay) => {
    setSelected((prev) => (prev?.date.getTime() === day.date.getTime() ? null : day));
  }, []);

  // ── Header collapse — hero shrinks/fades as the user scrolls ───────────────
  const scrollY = useRef(new Animated.Value(0)).current;
  const heroCollapse = scrollY.interpolate({ inputRange: [0, 140], outputRange: [1, 0.88], extrapolate: "clamp" });
  const heroFade = scrollY.interpolate({ inputRange: [0, 100], outputRange: [1, 0.55], extrapolate: "clamp" });

  const topPad = insets.top > 0 ? insets.top : Platform.OS === "web" ? 48 : 20;
  const gold = colors.accentGold;
  const HX = sp[4];

  const heroGradient = isLight
    ? (["#F5EDD8", "#EDD9A3", "#D9BB6E"] as const)
    : isSapphire
    ? (["#0c1830", "#1a2e58", "#0c1830"] as const)
    : (["#101824", "#182032", "#101824"] as const);

  const a0 = useEntrance(0, reducedMotion);
  const a1 = useEntrance(60, reducedMotion);
  const a2 = useEntrance(110, reducedMotion);
  const a3 = useEntrance(160, reducedMotion);
  const a4 = useEntrance(210, reducedMotion);
  const a5 = useEntrance(260, reducedMotion);
  const a6 = useEntrance(310, reducedMotion);

  const todayBtnPress = usePressScale(reducedMotion, 0.92);
  const navPressPrev = usePressScale(reducedMotion, 0.85);
  const navPressNext = usePressScale(reducedMotion, 0.85);
  const zmanimPress = usePressScale(reducedMotion, 0.97);
  const parashaPress = usePressScale(reducedMotion, 0.97);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: (insets.bottom || 0) + 104 }}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
      >
        {/* ─── 1. HERO HEADER ────────────────────────────────────────────────── */}
        <Animated.View style={{ opacity: heroFade, transform: [{ scale: heroCollapse }] }}>
          <LinearGradient
            colors={heroGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ paddingTop: topPad + 16, paddingHorizontal: HX, paddingBottom: 24, overflow: "hidden" }}
          >
            {/* Seasonal decorative artwork — soft radial glows, no clip art */}
            <View pointerEvents="none" style={{ position: "absolute", top: -30, right: -30, width: 140, height: 140, borderRadius: 70, backgroundColor: gold + "14" }} />
            <View pointerEvents="none" style={{ position: "absolute", bottom: -20, left: -20, width: 100, height: 100, borderRadius: 50, backgroundColor: gold + "0e" }} />

            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 2, color: isLight ? "#8a6a1e" : gold, textTransform: "uppercase" }}>
                {t.navCalendar}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: isLight ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.06)", borderRadius: rd.pill, paddingHorizontal: 10, paddingVertical: 6 }}>
                <Feather name="map-pin" size={10} color={isLight ? "#6b5323" : gold} />
                <Text style={{ fontSize: 11, fontWeight: "500", color: isLight ? "#4a3a18" : "#d8d8d8" }} numberOfLines={1}>
                  {location.name}
                </Text>
              </View>
            </View>

            <Text
              allowFontScaling
              style={{ fontSize: 34, fontWeight: "800", letterSpacing: -0.5, color: isLight ? "#241a08" : "#f4ecd8", lineHeight: 38 }}
            >
              {hebrewMonthName}
            </Text>
            <Text style={{ fontSize: 15, fontWeight: "600", marginTop: 4, color: isLight ? "#6b5323" : "#c9bfa0" }}>
              {gregMonthName} {year} · {hdate.getFullYear()}
            </Text>
          </LinearGradient>
        </Animated.View>

        {/* ─── 2. TODAY'S DATE ───────────────────────────────────────────────── */}
        <Animated.View style={[{ marginHorizontal: HX, marginTop: -16, marginBottom: 20 }, a0]}>
          <View
            style={{
              backgroundColor: colors.surfacePrimary, borderRadius: rd.xl, padding: sp[5],
              alignItems: "center", borderWidth: 1, borderColor: colors.borderDefault,
              ...shadow.level2,
            }}
          >
            <Text style={[type.overline, { color: gold, letterSpacing: 2 }]}>TODAY</Text>
            <Text style={[type.hebrewLg, { color: colors.textHigh, marginTop: sp[2], textAlign: "center" }]}>
              {hebrewNumeralStr || hebrewDateStr}
            </Text>
            <View style={{ width: 40, height: 1, backgroundColor: gold, opacity: 0.6, marginVertical: sp[3] }} />
            <Text style={[type.body, { color: colors.textSecondary }]}>
              {today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </Text>
            <Text style={[type.bodySm, { color: colors.textMuted, marginTop: sp[1.5], textAlign: "center" }]}>
              {todaySignificance}
            </Text>
          </View>
        </Animated.View>

        {/* ─── 3. MONTHLY CALENDAR ───────────────────────────────────────────── */}
        <Animated.View style={[{ marginHorizontal: HX, marginBottom: 22 }, a1]}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <Text style={[type.title, { color: colors.textHigh }]}>
              {gregMonthName} {year}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              {!isCurrentMonth && (
                <Animated.View style={{ transform: [{ scale: todayBtnPress.scale }] }}>
                  <Pressable
                    onPress={goToday}
                    onPressIn={todayBtnPress.onPressIn}
                    onPressOut={todayBtnPress.onPressOut}
                    accessibilityRole="button"
                    accessibilityLabel="Go to today"
                    style={{ borderWidth: 1, borderColor: gold, backgroundColor: gold + "18", borderRadius: rd.pill, paddingHorizontal: 12, minHeight: 32, justifyContent: "center" }}
                  >
                    <Text style={{ fontSize: 12, fontWeight: "600", color: gold }}>Today</Text>
                  </Pressable>
                </Animated.View>
              )}
              <Animated.View style={{ transform: [{ scale: navPressPrev.scale }] }}>
                <Pressable
                  onPress={prevMonth}
                  onPressIn={navPressPrev.onPressIn}
                  onPressOut={navPressPrev.onPressOut}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Previous month"
                  style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
                >
                  <Feather name="chevron-left" size={20} color={colors.textPrimary} />
                </Pressable>
              </Animated.View>
              <Animated.View style={{ transform: [{ scale: navPressNext.scale }] }}>
                <Pressable
                  onPress={nextMonth}
                  onPressIn={navPressNext.onPressIn}
                  onPressOut={navPressNext.onPressOut}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Next month"
                  style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
                >
                  <Feather name="chevron-right" size={20} color={colors.textPrimary} />
                </Pressable>
              </Animated.View>
            </View>
          </View>

          <View style={{ flexDirection: "row", marginBottom: 8 }}>
            {DAY_LABELS.map((d, i) => (
              <Text
                key={`${d}-${i}`}
                style={{ flex: 1, textAlign: "center", fontSize: 11, fontWeight: "600", letterSpacing: 0.5, color: i === 6 ? gold : colors.textMuted }}
                allowFontScaling={false}
              >
                {d}
              </Text>
            ))}
          </View>

          <Animated.View style={{ opacity: monthOpacity, transform: [{ translateX: monthTranslate }], flexDirection: "row", flexWrap: "wrap" }}>
            {leadingBlanks.map((_, i) => (
              <View key={`blank-${i}`} style={{ width: "14.28%", aspectRatio: 0.92 }} />
            ))}
            {monthDays.map((day) => (
              <DayCell
                key={day.gregorianDay}
                day={day}
                isSelected={selected?.date.getTime() === day.date.getTime()}
                reducedMotion={reducedMotion}
                colors={colors}
                onPress={onSelectDay}
              />
            ))}
          </Animated.View>

          {selected && (
            <View style={{ marginTop: 14, backgroundColor: colors.surfacePrimary, borderRadius: rd.lg, borderWidth: 1, borderColor: colors.borderDefault, padding: sp[4] }}>
              <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
                <View>
                  <Text style={[type.label, { color: colors.textPrimary }]}>
                    {selected.date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                  </Text>
                  <Text style={[type.hebrewBody, { color: gold, marginTop: 2 }]}>
                    {hebrewDayNumeral(selected.hebrewDay)} {selected.hebrewMonth} {selected.hebrewYear}
                  </Text>
                </View>
                {selected.isShabbat && (
                  <View style={{ borderRadius: rd.pill, borderWidth: 1, borderColor: gold + "44", backgroundColor: gold + "18", paddingHorizontal: 10, paddingVertical: 4 }}>
                    <Text style={{ fontSize: 11, fontWeight: "600", color: gold }}>Shabbat</Text>
                  </View>
                )}
              </View>
              {selected.roshChodesh && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: gold }} />
                  <Text style={[type.bodySm, { color: colors.textPrimary, fontWeight: "600" }]}>Rosh Chodesh</Text>
                </View>
              )}
              {selected.events.length === 0 && !selected.roshChodesh ? (
                <Text style={[type.bodySm, { color: colors.textMuted }]}>No special events</Text>
              ) : (
                selected.events.map((ev) => (
                  <View key={ev} style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: gold }} />
                    <Text style={[type.bodySm, { color: colors.textPrimary }]}>{ev}</Text>
                  </View>
                ))
              )}
            </View>
          )}
        </Animated.View>

        {/* ─── 4. UPCOMING EVENTS ─────────────────────────────────────────────── */}
        <Animated.View style={[{ marginHorizontal: HX, marginBottom: 22 }, a2]}>
          <SectionHeader icon="star" label="Upcoming Holy Days" gold={gold} muted={colors.textMuted} />
          {majorHolidays.length === 0 && fastDays.length === 0 ? (
            <Text style={[type.bodySm, { color: colors.textMuted }]}>No upcoming holy days in the next 60 days.</Text>
          ) : (
            <View style={{ gap: sp[2.5] }}>
              {[...majorHolidays, ...fastDays]
                .sort((a, b) => a.date.getTime() - b.date.getTime())
                .slice(0, 5)
                .map((h) => {
                  const isFast = /fast|tzom|tisha|ta'?anit|taanis/i.test(h.name);
                  const daysAway = Math.max(0, Math.round((h.date.getTime() - today.getTime()) / 86_400_000));
                  const accent = isFast ? colors.textMuted : gold;
                  return (
                    <View
                      key={h.name + h.date.getTime()}
                      style={{
                        flexDirection: "row", alignItems: "center", gap: sp[3],
                        backgroundColor: colors.card, borderRadius: rd.md,
                        borderLeftWidth: 3, borderLeftColor: accent,
                        paddingHorizontal: sp[4], paddingVertical: sp[3],
                      }}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[type.label, { color: colors.textPrimary }]} numberOfLines={1}>{h.name}</Text>
                        <Text style={[type.caption, { color: colors.textSecondary, marginTop: 2 }]}>
                          {h.date.toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric" })}
                        </Text>
                      </View>
                      <View style={{ alignItems: "center" }}>
                        <Text style={[type.title, { color: accent, lineHeight: 24 }]}>{daysAway}</Text>
                        <Text style={[type.caption, { color: colors.textMuted }]}>{daysAway === 1 ? "day" : "days"}</Text>
                      </View>
                    </View>
                  );
                })}
            </View>
          )}
        </Animated.View>

        {/* ─── 5. ZMANIM PREVIEW ──────────────────────────────────────────────── */}
        <Animated.View style={[{ marginHorizontal: HX, marginBottom: 22 }, a3]}>
          <SectionHeader
            icon="clock"
            label="Sacred Time — Today"
            gold={gold}
            muted={colors.textMuted}
            onPress={() => router.push("/(tabs)/zmanim")}
            ctaLabel="Full list"
          />
          <Animated.View style={{ transform: [{ scale: zmanimPress.scale }] }}>
            <Pressable
              onPress={() => router.push("/(tabs)/zmanim")}
              onPressIn={zmanimPress.onPressIn}
              onPressOut={zmanimPress.onPressOut}
              accessibilityRole="button"
              accessibilityLabel="View complete Zmanim list"
              style={{
                backgroundColor: colors.card, borderRadius: rd.lg, borderWidth: 1, borderColor: colors.cardBorder,
                padding: sp[4], flexDirection: "row", justifyContent: "space-between",
              }}
            >
              {[
                { label: "Sunrise", val: todayZm.sunrise },
                { label: "Chatzot", val: todayZm.chatzot },
                { label: "Sunset", val: todayZm.sunset },
              ].map((z) => (
                <View key={z.label} style={{ alignItems: "center", flex: 1 }}>
                  <Text style={[type.caption, { color: colors.textMuted, marginBottom: 4 }]}>{z.label}</Text>
                  <Text style={[type.label, { color: colors.textPrimary }]}>{z.val ? formatTime(z.val) : "—"}</Text>
                </View>
              ))}
            </Pressable>
          </Animated.View>
        </Animated.View>

        {/* ─── 6. OMER — appears only during the Omer count ───────────────────── */}
        {omerDay !== null && (
          <Animated.View style={[{ marginHorizontal: HX, marginBottom: 22 }, a4]}>
            <View
              style={{
                backgroundColor: colors.card, borderRadius: rd.lg, borderWidth: 1, borderColor: gold + "33",
                padding: sp[4], flexDirection: "row", alignItems: "center", gap: sp[3],
              }}
            >
              <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: gold + "18", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 18, fontWeight: "800", color: gold }}>{omerDay}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[type.overline, { color: gold }]}>COUNTING THE OMER</Text>
                <Text style={[type.bodySm, { color: colors.textSecondary, marginTop: 2 }]}>
                  Today is day {omerDay} of the Omer.
                </Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* ─── 7. STUDY CONNECTION ────────────────────────────────────────────── */}
        <Animated.View style={[{ marginHorizontal: HX, marginBottom: 22 }, a5]}>
          <SectionHeader icon="book-open" label="Study Connection" gold={gold} muted={colors.textMuted} />
          <Animated.View style={{ transform: [{ scale: parashaPress.scale }] }}>
            <Pressable
              onPress={() => router.push("/(tabs)/torah")}
              onPressIn={parashaPress.onPressIn}
              onPressOut={parashaPress.onPressOut}
              accessibilityRole="button"
              accessibilityLabel={`Weekly Parasha: ${parasha}. Tap to study.`}
              style={{
                backgroundColor: colors.card, borderRadius: rd.lg, borderWidth: 1, borderColor: colors.cardBorder,
                paddingHorizontal: sp[4], paddingVertical: sp[4], flexDirection: "row", alignItems: "center", gap: sp[3],
                ...shadow.level1,
              }}
            >
              <View style={{ width: 3, borderRadius: 2, backgroundColor: gold, alignSelf: "stretch" }} />
              <View style={{ flex: 1 }}>
                <Text style={[type.overline, { color: gold }]}>WEEKLY PARASHAH</Text>
                <Text style={[type.title, { color: colors.textPrimary, marginTop: sp[1] }]}>{parasha}</Text>
                <Text style={[type.bodySm, { color: colors.textMuted, marginTop: 2 }]}>Tap to study</Text>
              </View>
              <Feather name="chevron-right" size={18} color={colors.textMuted} />
            </Pressable>
          </Animated.View>
        </Animated.View>

        {/* ─── 8. REFLECTION ──────────────────────────────────────────────────── */}
        <Animated.View style={[{ marginHorizontal: HX, marginBottom: 8 }, a6]}>
          <View style={{ backgroundColor: colors.primaryMuted, borderRadius: rd.lg, borderWidth: 1, borderColor: gold + "30", padding: sp[4] }}>
            <Text style={[type.overline, { color: gold, marginBottom: sp[2] }]}>TODAY'S REFLECTION</Text>
            <Text style={[type.bodySm, { color: colors.textSecondary, fontStyle: "italic", lineHeight: 20 }]}>
              "{reflection.thought}"
            </Text>
            <Text style={[type.caption, { color: colors.textMuted, marginTop: sp[2] }]}>— {reflection.source}</Text>
          </View>
        </Animated.View>
      </Animated.ScrollView>
    </View>
  );
}
