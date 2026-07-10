/**
 * MUX-001 — Calendar Experience Redesign
 * "What do I need to know TODAY?" — one clear visual answer per scroll position.
 *
 * Screen hierarchy (replaces old vertical stack):
 *   1. Today Hero      — large Gregorian date, Hebrew date, Shabbat/holiday badge
 *   2. Month Nav       — compact centered ← Month Year →
 *   3. Calendar Card   — premium card surface, grid + selected detail inside
 *   4. Next Holy Day   — single upcoming holiday, days countdown prominent
 *   5. Sacred Time     — next prayer + countdown → Zmanim tab CTA
 *   6. This Week       — horizontal chips, one-glance week overview
 *
 * Architecture rules (SPR-M009):
 *   ✓ No new APIs          ✓ No new calculations       ✓ Shared Core reused
 *   ✓ Web untouched        ✓ Zmanim detail stays on Zmanim tab
 *   ✓ Navigation unchanged ✓ MMDL design system used throughout
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

// ─── Local presentation helpers (display only — no calendar math) ─────────────

const DAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

/** Omer day 1–49 derived from already-computed HDate — display only. */
function getOmerDay(hd: HDate): number | null {
  const m = hd.getMonth();
  const d = hd.getDate();
  if (m === 1 && d >= 16) return d - 15;
  if (m === 2) return 15 + d;
  if (m === 3 && d <= 5) return 44 + d;
  return null;
}

/** Human-readable countdown from now to a future Date. */
function formatCountdown(target: Date): string {
  const diff = Math.max(0, target.getTime() - Date.now());
  if (diff === 0) return "Now";
  const hours = Math.floor(diff / 3_600_000);
  const mins = Math.floor((diff % 3_600_000) / 60_000);
  if (hours >= 24) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

// ─── Reduced-motion entrance animation ───────────────────────────────────────

function useEntrance(delay: number, reducedMotion: boolean): Animated.AnimatedProps<ViewStyle> {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(reducedMotion ? 0 : 12)).current;
  useEffect(() => {
    const duration = reducedMotion ? 0 : 360;
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

// ─── DayCell — memoized calendar day with MUX-001 visual language ─────────────
//
//   Gold border + gold text  →  Today
//   Gold fill + white text   →  Selected
//   Subtle gold tint bg      →  Shabbat
//   Gold dot                 →  Holiday / event

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
    const gold = colors.accentGold;

    return (
      <Pressable
        onPress={() => onPress(day)}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="button"
        accessibilityLabel={[
          day.date.toLocaleDateString("en-US", { month: "long", day: "numeric" }),
          day.isToday ? "today" : "",
          day.isShabbat ? "Shabbat" : "",
          hasEvents ? day.events.join(", ") : "",
        ].filter(Boolean).join(", ")}
        accessibilityState={{ selected: isSelected }}
        style={{ width: "14.28%", aspectRatio: 0.92, alignItems: "center", justifyContent: "center", paddingVertical: 2 }}
      >
        <Animated.View
          style={{
            width: 38, height: 38, borderRadius: 12,
            alignItems: "center", justifyContent: "center",
            transform: [{ scale }],
            backgroundColor: isSelected ? gold : day.isShabbat ? gold + "15" : "transparent",
            borderWidth: day.isToday && !isSelected ? 1.5 : 0,
            borderColor: gold,
          }}
        >
          <Text
            allowFontScaling={false}
            style={{
              fontSize: 13,
              fontWeight: (day.isToday || isSelected || hasEvents) ? "700" : "400",
              color: isSelected ? "#fff" : day.isToday ? gold : day.isShabbat ? gold + "dd" : colors.textPrimary,
            }}
          >
            {day.gregorianDay}
          </Text>
          <Text
            allowFontScaling={false}
            style={{ fontSize: 7.5, marginTop: 0.5, color: isSelected ? "rgba(255,255,255,0.65)" : colors.textMuted }}
          >
            {hebrewDayNumeral(day.hebrewDay)}
          </Text>
          {hasEvents && (
            <View
              style={{
                position: "absolute", bottom: 3,
                width: 3.5, height: 3.5, borderRadius: 2,
                backgroundColor: isSelected ? "rgba(255,255,255,0.8)" : gold,
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

// ─── Main Screen ──────────────────────────────────────────────────────────────

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
  const gregMonthName = useMemo(() => today.toLocaleDateString("en-US", { month: "long" }), [today]);

  // Month nav label — tracks navigation state, not just today
  const navMonthLabel = useMemo(
    () => new Date(year, month, 1).toLocaleDateString("en-US", { month: "long" }),
    [year, month],
  );

  const monthDays = useMemo(() => getMonthCalendar(year, month), [year, month]);
  const leadingBlanks = useMemo(
    () => Array(new Date(year, month, 1).getDay()).fill(null),
    [year, month],
  );
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();

  const parasha = useMemo(() => getCurrentParasha(), []);
  const allHolidays = useMemo(() => getUpcomingHolidays(60), []);

  // Single most upcoming holy day for the Next Holy Day card
  const nextHolyDay = useMemo(
    () => [...allHolidays].sort((a, b) => a.date.getTime() - b.date.getTime())[0] ?? null,
    [allHolidays],
  );

  const todayZm = useMemo(
    () => calculateZmanim(today, location.lat, location.lng, location.candleLightingMinutes),
    [location, today],
  );

  const omerDay = useMemo(() => getOmerDay(hdate), [hdate]);

  // Today's badge: Shabbat > Holiday > Omer Day > null
  const todayBadge = useMemo(() => {
    if (today.getDay() === 6) return "Shabbat Shalom";
    const todaysHoliday = allHolidays.find((h) => {
      const d = h.date;
      return d.getFullYear() === today.getFullYear()
        && d.getMonth() === today.getMonth()
        && d.getDate() === today.getDate();
    });
    if (todaysHoliday) return todaysHoliday.name;
    if (omerDay !== null) return `Omer Day ${omerDay}`;
    return null;
  }, [today, allHolidays, omerDay]);

  // Next prayer from today's zmanim — first upcoming time after now
  const nextPrayer = useMemo(() => {
    const now = new Date();
    const points: { name: string; time: Date }[] = [
      { name: "Dawn", time: todayZm.alotHaShachar! },
      { name: "Sunrise", time: todayZm.sunrise! },
      { name: "Latest Shema", time: todayZm.latestShema! },
      { name: "Latest Shacharit", time: todayZm.latestShacharit! },
      { name: "Midday", time: todayZm.chatzot! },
      { name: "Mincha Gedolah", time: todayZm.minchaGedolah! },
      { name: "Mincha Ketanah", time: todayZm.minchaKetana! },
      { name: "Plag HaMincha", time: todayZm.plagHamincha! },
      ...(todayZm.candleLighting ? [{ name: "Candle Lighting", time: todayZm.candleLighting }] : []),
      { name: "Sunset", time: todayZm.sunset! },
      { name: "Nightfall", time: todayZm.tzais! },
      ...(todayZm.havdalah ? [{ name: "Havdalah", time: todayZm.havdalah }] : []),
    ].filter((p): p is { name: string; time: Date } =>
      p.time instanceof Date && !isNaN(p.time.getTime()),
    );
    return points.find((p) => p.time > now) ?? null;
  }, [todayZm]);

  // This Week chips — Parasha + Shabbat + any holidays this week + Omer
  const thisWeekChips = useMemo(() => {
    const sun = new Date(today);
    sun.setDate(today.getDate() - today.getDay());
    const sat = new Date(sun);
    sat.setDate(sun.getDate() + 6);
    const chips: string[] = [`Parashat ${parasha}`, "Shabbat"];
    allHolidays.forEach((h) => {
      if (h.date >= sun && h.date <= sat) chips.push(h.name);
    });
    if (omerDay !== null) chips.push(`Omer ${omerDay}`);
    return [...new Set(chips)].slice(0, 6);
  }, [today, allHolidays, parasha, omerDay]);

  // ── Month navigation with fade+slide ────────────────────────────────────────
  const monthOpacity = useRef(new Animated.Value(1)).current;
  const monthTranslate = useRef(new Animated.Value(0)).current;

  const animateMonthChange = useCallback((direction: 1 | -1, apply: () => void) => {
    if (reducedMotion) { apply(); return; }
    Animated.timing(monthOpacity, { toValue: 0, duration: 100, useNativeDriver: true }).start(() => {
      apply();
      monthTranslate.setValue(10 * direction);
      Animated.parallel([
        Animated.timing(monthOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(monthTranslate, { toValue: 0, duration: 200, useNativeDriver: true }),
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

  // ── Press scales ────────────────────────────────────────────────────────────
  const navPressPrev = usePressScale(reducedMotion, 0.85);
  const navPressNext = usePressScale(reducedMotion, 0.85);
  const todayBtnPress = usePressScale(reducedMotion, 0.92);
  const holyDayPress = usePressScale(reducedMotion, 0.97);
  const zmanimPress = usePressScale(reducedMotion, 0.97);

  // ── Entrance animations — staggered ────────────────────────────────────────
  const a0 = useEntrance(0, reducedMotion);   // Hero
  const a1 = useEntrance(50, reducedMotion);  // Calendar card
  const a2 = useEntrance(100, reducedMotion); // Next Holy Day
  const a3 = useEntrance(140, reducedMotion); // Sacred Time
  const a4 = useEntrance(180, reducedMotion); // This Week

  const topPad = insets.top > 0 ? insets.top : Platform.OS === "web" ? 48 : 20;
  const gold = colors.accentGold;
  const HX = sp[4];

  // ── Theme-aware hero gradient ────────────────────────────────────────────────
  const heroGrad = isLight
    ? (["#F7EED8", "#EDD9A3", "#F7EED8"] as const)
    : isSapphire
    ? (["#0c1830", "#132040", "#0c1830"] as const)
    : (["#0d1520", "#15202e", "#0d1520"] as const);

  const heroDateColor = isLight ? "#1a1208" : "#f4ecd8";
  const heroDimColor = isLight ? "#7a6030" : "#a09070";

  // ── Next Holy Day computed values ────────────────────────────────────────────
  const nextHolyDayDays = nextHolyDay
    ? Math.max(0, Math.round((nextHolyDay.date.getTime() - today.getTime()) / 86_400_000))
    : null;
  const nextHolyDayHebrew = useMemo(() => {
    if (!nextHolyDay) return "";
    try { return formatHebrewDate(getHebrewDate(nextHolyDay.date)); } catch { return ""; }
  }, [nextHolyDay]);
  const isFastDay = nextHolyDay
    ? /fast|tzom|tisha|ta'?anit|taanis/i.test(nextHolyDay.name)
    : false;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: (insets.bottom || 0) + 104 }}
      >

        {/* ══════════════════════════════════════════════════════════════════
            1. TODAY HERO
            Visual anchor. Eyes land here first.
            Large Gregorian date · Hebrew date · Shabbat/holiday badge.
            Max height ~140dp. Minimal. Premium.
            ══════════════════════════════════════════════════════════════════ */}
        <Animated.View style={a0}>
          <LinearGradient
            colors={heroGrad}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={{ paddingTop: topPad + 14, paddingBottom: 28, paddingHorizontal: HX }}
          >
            {/* Ambient glow — decorative, no clip art */}
            <View pointerEvents="none" style={{ position: "absolute", top: 0, right: 20, width: 200, height: 200, borderRadius: 100, backgroundColor: gold + "0c" }} />
            <View pointerEvents="none" style={{ position: "absolute", bottom: -60, left: -20, width: 140, height: 140, borderRadius: 70, backgroundColor: gold + "08" }} />

            {/* Row: TODAY label + location */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <Text
                allowFontScaling={false}
                style={{ fontSize: 9, fontWeight: "700", letterSpacing: 2.8, color: gold, textTransform: "uppercase" }}
              >
                TODAY
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Feather name="map-pin" size={10} color={heroDimColor} />
                <Text
                  allowFontScaling={false}
                  style={{ fontSize: 11, color: heroDimColor }}
                  numberOfLines={1}
                >
                  {location.name}
                </Text>
              </View>
            </View>

            {/* Large Gregorian date + day/month stack */}
            <View style={{ flexDirection: "row", alignItems: "flex-end", gap: 14, marginBottom: 10 }}>
              <Text
                allowFontScaling={false}
                style={{ fontSize: 76, fontWeight: "800", letterSpacing: -3, color: heroDateColor, lineHeight: 76 }}
              >
                {today.getDate()}
              </Text>
              <View style={{ paddingBottom: 8 }}>
                <Text
                  allowFontScaling={false}
                  style={{ fontSize: 16, fontWeight: "700", color: heroDateColor, letterSpacing: 0.1 }}
                >
                  {today.toLocaleDateString("en-US", { weekday: "long" })}
                </Text>
                <Text
                  allowFontScaling={false}
                  style={{ fontSize: 13, color: heroDimColor, marginTop: 2 }}
                >
                  {gregMonthName} {year}
                </Text>
              </View>
            </View>

            {/* Hebrew date — gold, reads as sacred layer */}
            <Text
              allowFontScaling={false}
              style={{ fontSize: 18, fontWeight: "600", color: gold, letterSpacing: 0.2 }}
            >
              {hebrewNumeralStr || hebrewDateStr}
            </Text>
            <Text
              allowFontScaling={false}
              style={{ fontSize: 12, color: heroDimColor, marginTop: 3 }}
            >
              {hebrewMonthName} {hdate.getFullYear()}
            </Text>

            {/* Shabbat / Holiday / Omer badge */}
            {todayBadge && (
              <View
                style={{
                  alignSelf: "flex-start", marginTop: 14,
                  borderRadius: 9999,
                  borderWidth: 1, borderColor: gold + "50",
                  backgroundColor: gold + "18",
                  paddingHorizontal: 13, paddingVertical: 5,
                }}
              >
                <Text
                  allowFontScaling={false}
                  style={{ fontSize: 12, fontWeight: "600", color: gold }}
                >
                  {todayBadge}
                </Text>
              </View>
            )}
          </LinearGradient>
        </Animated.View>

        {/* ══════════════════════════════════════════════════════════════════
            2 + 3. MONTH NAVIGATION + CALENDAR
            One premium card surface. Navigation compact, centered.
            Calendar grid inside — today/selected/shabbat/holiday each
            have distinct visual language. Selected detail inside same card.
            ══════════════════════════════════════════════════════════════════ */}
        <Animated.View style={[{ marginHorizontal: HX, marginTop: 20, marginBottom: 18 }, a1]}>
          <View
            style={{
              backgroundColor: colors.surfacePrimary,
              borderRadius: rd.xl, borderWidth: 1,
              borderColor: colors.borderDefault,
              overflow: "hidden",
              ...shadow.level2,
            }}
          >
            {/* ── Compact month navigation bar ── */}
            <View
              style={{
                flexDirection: "row", alignItems: "center",
                justifyContent: "space-between",
                paddingHorizontal: sp[3],
                paddingTop: sp[3], paddingBottom: sp[3],
                borderBottomWidth: 1, borderBottomColor: colors.borderDefault,
              }}
            >
              {/* Prev button */}
              <Animated.View style={{ transform: [{ scale: navPressPrev.scale }] }}>
                <Pressable
                  onPress={prevMonth}
                  onPressIn={navPressPrev.onPressIn}
                  onPressOut={navPressPrev.onPressOut}
                  hitSlop={14}
                  accessibilityRole="button"
                  accessibilityLabel="Previous month"
                  style={{ width: 40, height: 36, alignItems: "center", justifyContent: "center" }}
                >
                  <Feather name="chevron-left" size={18} color={colors.textSecondary} />
                </Pressable>
              </Animated.View>

              {/* Centered month + year — small, low visual weight */}
              <View style={{ flex: 1, alignItems: "center" }}>
                <Animated.View style={{ opacity: monthOpacity, transform: [{ translateX: monthTranslate }], flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Text
                    allowFontScaling={false}
                    style={{ fontSize: 14, fontWeight: "700", color: colors.textPrimary, letterSpacing: 0.1 }}
                  >
                    {navMonthLabel} {year}
                  </Text>
                  {!isCurrentMonth && (
                    <Animated.View style={{ transform: [{ scale: todayBtnPress.scale }] }}>
                      <Pressable
                        onPress={goToday}
                        onPressIn={todayBtnPress.onPressIn}
                        onPressOut={todayBtnPress.onPressOut}
                        accessibilityRole="button"
                        accessibilityLabel="Return to today"
                        style={{
                          borderWidth: 1, borderColor: gold + "55",
                          backgroundColor: gold + "12",
                          borderRadius: 9999, paddingHorizontal: 9,
                          minHeight: 26, justifyContent: "center",
                        }}
                      >
                        <Text allowFontScaling={false} style={{ fontSize: 10, fontWeight: "600", color: gold }}>Today</Text>
                      </Pressable>
                    </Animated.View>
                  )}
                </Animated.View>
              </View>

              {/* Next button */}
              <Animated.View style={{ transform: [{ scale: navPressNext.scale }] }}>
                <Pressable
                  onPress={nextMonth}
                  onPressIn={navPressNext.onPressIn}
                  onPressOut={navPressNext.onPressOut}
                  hitSlop={14}
                  accessibilityRole="button"
                  accessibilityLabel="Next month"
                  style={{ width: 40, height: 36, alignItems: "center", justifyContent: "center" }}
                >
                  <Feather name="chevron-right" size={18} color={colors.textSecondary} />
                </Pressable>
              </Animated.View>
            </View>

            {/* ── Day-of-week column headers ── */}
            <View style={{ flexDirection: "row", paddingHorizontal: sp[2], paddingTop: sp[3], paddingBottom: sp[2] }}>
              {DAY_LABELS.map((d, i) => (
                <Text
                  key={`dlbl-${i}`}
                  allowFontScaling={false}
                  style={{
                    flex: 1, textAlign: "center",
                    fontSize: 10, fontWeight: "600", letterSpacing: 0.8,
                    textTransform: "uppercase",
                    color: i === 6 ? gold + "bb" : colors.textMuted,
                  }}
                >
                  {d}
                </Text>
              ))}
            </View>

            {/* ── Calendar grid ── */}
            <Animated.View
              style={{
                opacity: monthOpacity,
                transform: [{ translateX: monthTranslate }],
                flexDirection: "row", flexWrap: "wrap",
                paddingHorizontal: sp[2], paddingBottom: selected ? sp[2] : sp[3],
              }}
            >
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

            {/* ── Selected day detail — inside the card ── */}
            {selected && (
              <View
                style={{
                  marginHorizontal: sp[4], marginBottom: sp[4],
                  backgroundColor: colors.card,
                  borderRadius: rd.lg,
                  borderWidth: 1, borderColor: gold + "2e",
                  padding: sp[4],
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[type.label, { color: colors.textPrimary }]}>
                      {selected.date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                    </Text>
                    <Text style={[type.hebrewBody, { color: gold, marginTop: 2 }]}>
                      {hebrewDayNumeral(selected.hebrewDay)} {selected.hebrewMonth} {selected.hebrewYear}
                    </Text>
                  </View>
                  {selected.isShabbat && (
                    <View style={{ borderRadius: 9999, borderWidth: 1, borderColor: gold + "44", backgroundColor: gold + "18", paddingHorizontal: 10, paddingVertical: 4 }}>
                      <Text style={{ fontSize: 11, fontWeight: "600", color: gold }}>Shabbat</Text>
                    </View>
                  )}
                </View>
                {selected.roshChodesh && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                    <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: gold }} />
                    <Text style={[type.bodySm, { color: colors.textPrimary, fontWeight: "600" }]}>Rosh Chodesh</Text>
                  </View>
                )}
                {selected.events.length === 0 && !selected.roshChodesh ? (
                  <Text style={[type.bodySm, { color: colors.textMuted }]}>No special events</Text>
                ) : (
                  selected.events.map((ev) => (
                    <View key={ev} style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: gold }} />
                      <Text style={[type.bodySm, { color: colors.textPrimary }]}>{ev}</Text>
                    </View>
                  ))
                )}
              </View>
            )}
          </View>
        </Animated.View>

        {/* ══════════════════════════════════════════════════════════════════
            4. NEXT HOLY DAY
            Single most upcoming holiday. Days countdown is the visual hero.
            Gold = sacred. Gray accent = fast days.
            ══════════════════════════════════════════════════════════════════ */}
        {nextHolyDay && (
          <Animated.View style={[{ marginHorizontal: HX, marginBottom: 14 }, a2]}>
            <View
              style={{
                flexDirection: "row", alignItems: "stretch",
                backgroundColor: colors.surfacePrimary,
                borderRadius: rd.xl,
                borderWidth: 1, borderColor: isFastDay ? colors.borderDefault : gold + "3a",
                overflow: "hidden",
                ...shadow.level1,
              }}
            >
              {/* Sacred accent stripe — gold for holidays, gray for fasts */}
              <View style={{ width: 4, backgroundColor: isFastDay ? colors.textMuted + "60" : gold }} />

              {/* Name + date */}
              <View style={{ flex: 1, paddingHorizontal: sp[4], paddingVertical: sp[4] }}>
                <Text
                  allowFontScaling={false}
                  style={{
                    fontSize: 9, fontWeight: "700", letterSpacing: 2.2,
                    color: isFastDay ? colors.textMuted : gold,
                    textTransform: "uppercase", marginBottom: 6,
                  }}
                >
                  NEXT HOLY DAY
                </Text>
                <Text
                  allowFontScaling={false}
                  style={{ fontSize: 18, fontWeight: "700", color: colors.textHigh, letterSpacing: -0.2 }}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {nextHolyDay.name}
                </Text>
                <Text
                  allowFontScaling={false}
                  style={{ fontSize: 12, color: colors.textMuted, marginTop: 4, lineHeight: 18 }}
                >
                  {nextHolyDay.date.toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric" })}
                </Text>
                {nextHolyDayHebrew ? (
                  <Text
                    allowFontScaling={false}
                    style={{ fontSize: 11, color: isFastDay ? colors.textMuted : gold + "cc", marginTop: 2 }}
                  >
                    {nextHolyDayHebrew}
                  </Text>
                ) : null}
              </View>

              {/* Days countdown — the visual hero of this card */}
              <View
                style={{
                  alignItems: "center", justifyContent: "center",
                  paddingHorizontal: sp[4],
                  borderLeftWidth: 1, borderLeftColor: colors.borderDefault,
                  minWidth: 72,
                }}
              >
                <Text
                  allowFontScaling={false}
                  style={{
                    fontSize: 36, fontWeight: "800",
                    color: isFastDay ? colors.textSecondary : gold,
                    lineHeight: 40,
                  }}
                >
                  {nextHolyDayDays}
                </Text>
                <Text
                  allowFontScaling={false}
                  style={{ fontSize: 10, fontWeight: "600", color: colors.textMuted, letterSpacing: 0.5 }}
                >
                  {nextHolyDayDays === 1 ? "day" : "days"}
                </Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* ══════════════════════════════════════════════════════════════════
            5. TODAY'S SACRED TIME
            Compact. One glance. Next prayer + countdown pill.
            Detail lives on the Zmanim tab — never duplicated here.
            ══════════════════════════════════════════════════════════════════ */}
        <Animated.View style={[{ marginHorizontal: HX, marginBottom: 18 }, a3]}>
          <Animated.View style={{ transform: [{ scale: zmanimPress.scale }] }}>
            <Pressable
              onPress={() => router.push("/(tabs)/zmanim")}
              onPressIn={zmanimPress.onPressIn}
              onPressOut={zmanimPress.onPressOut}
              accessibilityRole="button"
              accessibilityLabel="View full prayer schedule on Zmanim screen"
              style={{
                backgroundColor: colors.surfacePrimary,
                borderRadius: rd.xl,
                borderWidth: 1, borderColor: colors.borderDefault,
                padding: sp[4],
                ...shadow.level1,
              }}
            >
              {/* Header row */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
                  <Feather name="clock" size={12} color={gold} />
                  <Text
                    allowFontScaling={false}
                    style={{ fontSize: 9, fontWeight: "700", letterSpacing: 2.2, color: colors.textMuted, textTransform: "uppercase" }}
                  >
                    TODAY'S SACRED TIME
                  </Text>
                </View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                  <Text allowFontScaling={false} style={{ fontSize: 11, color: gold, fontWeight: "600" }}>
                    Full Schedule
                  </Text>
                  <Feather name="chevron-right" size={11} color={gold} />
                </View>
              </View>

              {/* Next prayer row */}
              {nextPrayer ? (
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <View>
                    <Text
                      allowFontScaling={false}
                      style={{ fontSize: 10, color: colors.textMuted, marginBottom: 3, fontWeight: "500" }}
                    >
                      Next
                    </Text>
                    <Text
                      allowFontScaling={false}
                      style={{ fontSize: 20, fontWeight: "700", color: colors.textHigh, letterSpacing: -0.3 }}
                    >
                      {nextPrayer.name}
                    </Text>
                    <Text
                      allowFontScaling={false}
                      style={{ fontSize: 13, color: colors.textSecondary, marginTop: 3 }}
                    >
                      {formatTime(nextPrayer.time)}
                    </Text>
                  </View>

                  {/* Countdown pill */}
                  <View
                    style={{
                      alignItems: "center", justifyContent: "center",
                      backgroundColor: gold + "14",
                      borderRadius: rd.lg,
                      paddingHorizontal: sp[4], paddingVertical: sp[3],
                      borderWidth: 1, borderColor: gold + "30",
                      minWidth: 88,
                    }}
                  >
                    <Text
                      allowFontScaling={false}
                      style={{ fontSize: 18, fontWeight: "800", color: gold }}
                    >
                      {formatCountdown(nextPrayer.time)}
                    </Text>
                  </View>
                </View>
              ) : (
                <Text style={[type.bodySm, { color: colors.textMuted }]}>
                  All prayer times have passed for today.
                </Text>
              )}
            </Pressable>
          </Animated.View>
        </Animated.View>

        {/* ══════════════════════════════════════════════════════════════════
            6. THIS WEEK — horizontal chips
            One glance at the week's sacred occasions.
            Shabbat always highlighted in gold. Parasha always shown.
            ══════════════════════════════════════════════════════════════════ */}
        {thisWeekChips.length > 0 && (
          <Animated.View style={[{ marginBottom: 8 }, a4]}>
            <Text
              allowFontScaling={false}
              style={{
                fontSize: 9, fontWeight: "700", letterSpacing: 2.2,
                color: colors.textMuted, textTransform: "uppercase",
                marginHorizontal: HX, marginBottom: 10,
              }}
            >
              THIS WEEK
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: HX, gap: 8, flexDirection: "row" }}
            >
              {thisWeekChips.map((chip) => {
                const isShabbat = chip === "Shabbat";
                return (
                  <View
                    key={chip}
                    style={{
                      borderRadius: 9999,
                      borderWidth: 1,
                      borderColor: isShabbat ? gold + "50" : colors.borderDefault,
                      backgroundColor: isShabbat ? gold + "14" : colors.card,
                      paddingHorizontal: 14, paddingVertical: 8,
                    }}
                  >
                    <Text
                      allowFontScaling={false}
                      style={{
                        fontSize: 12,
                        fontWeight: isShabbat ? "600" : "400",
                        color: isShabbat ? gold : colors.textSecondary,
                      }}
                    >
                      {chip}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
          </Animated.View>
        )}

      </ScrollView>
    </View>
  );
}
