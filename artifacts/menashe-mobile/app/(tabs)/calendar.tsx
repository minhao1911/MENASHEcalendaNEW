/**
 * Calendar Screen — Web-Parity Grid View
 *
 * Full month calendar grid matching the web app design:
 *   - Gold-gradient header card with Month/Year + Hebrew month range
 *   - Day column headers (Sun–Sat) with Hebrew names
 *   - Rich day cells: Hebrew numeral, month name, candle-lighting times,
 *     FAST label, holiday names, special Shabbat names
 *   - Today highlighted in gold; Shabbat (Sat) in crimson; fast in charcoal
 *   - Legend row + TODAY button
 *   - Tap a day for a full detail card below the grid
 */

import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";

import { useThemeTokens } from "@/src/mobile/design-system";
import { useReducedMotion } from "@/src/mobile/design-system/accessibility";
import { useApp } from "@/context/AppContext";
import { useLanguage } from "@/context/LanguageContext";
import { calculateZmanim, formatTime } from "@/lib/zmanim";
import {
  getHebrewDate,
  getHebrewMonthName,
  getMonthCalendar,
  hebrewDayNumeral,
  type CalendarDay,
} from "@/lib/hebrewCalendar";

// ─── Constants ────────────────────────────────────────────────────────────────

const GRID_H_PAD = 14; // px, each side inside the card
const CARD_MARGIN = 14; // px, card from screen edge

// Full day-of-week labels for header
const DAY_LABELS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_LABELS_HE = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "ששי", "שבת"];

// Fast-day keyword regex
const FAST_RE = /fast|tzom|tisha|ta'?anit|taanis/i;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isFastEvent(events: string[]): boolean {
  return events.some((e) => FAST_RE.test(e));
}

/** Return the first holiday/special event that is NOT generic "Shabbat". */
function primaryEvent(events: string[]): string | null {
  return events.find((e) => !/^shabbat$/i.test(e)) ?? null;
}

/** Shorten long event names so they fit inside a narrow cell. */
function shortenEvent(name: string): string {
  return name
    .replace(/Rosh Chodesh\s*/i, "R.Ch. ")
    .replace(/Parashat\s*/i, "")
    .replace(/Shabbat\s*/i, "Shab. ")
    .trim();
}

/** "7:31 PM" → "7:31PM" for tighter cell display */
function compactTime(t: string): string {
  return t.replace(/\s+/g, "");
}

// ─── Month navigation animation hook ─────────────────────────────────────────

function useMonthAnim(reducedMotion: boolean) {
  const opacity = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;

  const run = useCallback(
    (dir: 1 | -1, apply: () => void) => {
      if (reducedMotion) {
        apply();
        return;
      }
      Animated.timing(opacity, {
        toValue: 0,
        duration: 90,
        useNativeDriver: true,
      }).start(() => {
        apply();
        translateX.setValue(16 * dir);
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(translateX, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      });
    },
    [opacity, translateX, reducedMotion],
  );

  return { opacity, translateX, run };
}

// ─── Press-scale micro-animation ─────────────────────────────────────────────

function usePressScale(reducedMotion: boolean, to = 0.94) {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = useCallback(
    () =>
      Animated.timing(scale, {
        toValue: reducedMotion ? 1 : to,
        duration: 70,
        useNativeDriver: true,
      }).start(),
    [scale, to, reducedMotion],
  );
  const onPressOut = useCallback(
    () =>
      Animated.timing(scale, {
        toValue: 1,
        duration: 130,
        useNativeDriver: true,
      }).start(),
    [scale],
  );
  return { scale, onPressIn, onPressOut };
}

// ─── DayCell ──────────────────────────────────────────────────────────────────

interface DayCellProps {
  day: CalendarDay;
  candleTime: string | null; // pre-computed for Fridays
  isSelected: boolean;
  cellW: number;
  cellH: number;
  reducedMotion: boolean;
  accentGold: string;
  textPrimary: string;
  textMuted: string;
  onPress: (d: CalendarDay) => void;
}

const DayCell = memo(
  function DayCell({
    day,
    candleTime,
    isSelected,
    cellW,
    cellH,
    reducedMotion,
    accentGold,
    textPrimary,
    textMuted,
    onPress,
  }: DayCellProps) {
    const { scale, onPressIn, onPressOut } = usePressScale(reducedMotion, 0.88);

    const isSat = day.date.getDay() === 6;
    const isFri = day.date.getDay() === 5;
    const isFast = isFastEvent(day.events);
    const evLabel = primaryEvent(day.events);

    // Visual state priority: selected > today > shabbat > fast > normal
    const bgColor = isSelected
      ? accentGold
      : day.isToday
      ? accentGold + "22"
      : isFast && !isSat
      ? "#374151" + "18"
      : "transparent";

    const dayNumColor = isSelected
      ? "#fff"
      : day.isToday
      ? accentGold
      : isSat
      ? "#dc2626"
      : isFast
      ? "#374151"
      : textPrimary;

    const subColor = isSelected ? "rgba(255,255,255,0.65)" : textMuted;

    return (
      <Pressable
        onPress={() => onPress(day)}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="button"
        accessibilityLabel={[
          day.date.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          }),
          day.isToday ? "today" : "",
          isFast ? "fast day" : "",
          evLabel ?? "",
        ]
          .filter(Boolean)
          .join(", ")}
        accessibilityState={{ selected: isSelected }}
        style={{
          width: cellW,
          height: cellH,
          alignItems: "center",
          justifyContent: "flex-start",
          paddingTop: 4,
          paddingBottom: 2,
        }}
      >
        <Animated.View
          style={{
            width: cellW - 3,
            height: cellH - 3,
            borderRadius: 8,
            alignItems: "center",
            justifyContent: "flex-start",
            paddingTop: 3,
            backgroundColor: bgColor,
            borderWidth: day.isToday && !isSelected ? 1.5 : 0,
            borderColor: accentGold,
            transform: [{ scale }],
            overflow: "hidden",
          }}
        >
          {/* Candle lighting time — Fridays */}
          {candleTime && !isSelected && (
            <Text
              allowFontScaling={false}
              numberOfLines={1}
              style={{
                fontSize: 7,
                fontWeight: "600",
                color: accentGold,
                lineHeight: 10,
              }}
            >
              {compactTime(candleTime)}
            </Text>
          )}

          {/* Day number */}
          <Text
            allowFontScaling={false}
            style={{
              fontSize: cellW > 48 ? 15 : 13,
              fontWeight: day.isToday || isSelected ? "800" : isSat ? "700" : "500",
              color: dayNumColor,
              lineHeight: cellW > 48 ? 18 : 16,
              marginTop: candleTime && !isSelected ? 0 : isFri ? 2 : 2,
            }}
          >
            {day.gregorianDay}
          </Text>

          {/* Hebrew day numeral */}
          <Text
            allowFontScaling={false}
            style={{
              fontSize: 8,
              color: subColor,
              lineHeight: 11,
              fontWeight: "400",
            }}
          >
            {hebrewDayNumeral(day.hebrewDay)}
          </Text>

          {/* Hebrew month name */}
          <Text
            allowFontScaling={false}
            style={{
              fontSize: 7,
              color: subColor,
              lineHeight: 9,
            }}
          >
            {day.hebrewMonth}
          </Text>

          {/* Event label — fast / holiday / rosh chodesh / special shabbat */}
          {(isFast || evLabel || day.roshChodesh) && (
            <Text
              allowFontScaling={false}
              numberOfLines={1}
              style={{
                fontSize: 6.5,
                fontWeight: "700",
                color: isSelected
                  ? "rgba(255,255,255,0.85)"
                  : isFast
                  ? "#f59e0b"
                  : isSat
                  ? "#dc2626"
                  : "#7c3aed",
                lineHeight: 9,
                marginTop: 1,
                paddingHorizontal: 1,
                textAlign: "center",
              }}
            >
              {isFast
                ? "FAST"
                : evLabel
                ? shortenEvent(evLabel).substring(0, 10)
                : "R.Ch."}
            </Text>
          )}
        </Animated.View>
      </Pressable>
    );
  },
  (p, n) =>
    p.isSelected === n.isSelected &&
    p.day.date.getTime() === n.day.date.getTime() &&
    p.day.events.length === n.day.events.length &&
    p.candleTime === n.candleTime,
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CalendarScreen() {
  const { colors, sp, rd, shadow, theme } = useThemeTokens();
  const insets = useSafeAreaInsets();
  const { location } = useApp();
  const { t } = useLanguage();
  const reducedMotion = useReducedMotion();

  const { width: screenW } = Dimensions.get("window");

  // ── State ──────────────────────────────────────────────────────────────────
  const today = useMemo(() => new Date(), []);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<CalendarDay | null>(null);

  const isCurrentMonth =
    year === today.getFullYear() && month === today.getMonth();

  const isLight = theme === "light";
  const gold = colors.accentGold;

  // ── Grid dimensions ────────────────────────────────────────────────────────
  const gridWidth = screenW - CARD_MARGIN * 2 - GRID_H_PAD * 2;
  const cellW = Math.floor(gridWidth / 7);
  const cellH = Math.floor(cellW * 1.45); // tall enough for all cell content

  // ── Calendar data ──────────────────────────────────────────────────────────
  const monthDays = useMemo(() => getMonthCalendar(year, month), [year, month]);
  const leadingBlanks = useMemo(
    () => Array(new Date(year, month, 1).getDay()).fill(null),
    [year, month],
  );

  // Hebrew month range for subtitle: "Tamuz - Av 5786"
  const hebrewSubtitle = useMemo(() => {
    const firstHDate = getHebrewDate(new Date(year, month, 1));
    const lastHDate = getHebrewDate(new Date(year, month + 1, 0)); // last day
    const hYear = firstHDate.getFullYear();
    const firstMon = getHebrewMonthName(firstHDate);
    const lastMon = getHebrewMonthName(lastHDate);
    const months =
      firstMon === lastMon ? firstMon : `${firstMon} - ${lastMon}`;
    return `${months} ${hYear}`;
  }, [year, month]);

  // Candle lighting map: gregorianDay → "7:31 PM" for all Fridays
  const candleMap = useMemo(() => {
    const map: Record<number, string> = {};
    monthDays.forEach((day) => {
      if (day.date.getDay() === 5) {
        try {
          const zm = calculateZmanim(
            day.date,
            location.lat,
            location.lng,
            location.candleLightingMinutes,
          );
          if (zm.candleLighting instanceof Date) {
            map[day.gregorianDay] = formatTime(zm.candleLighting);
          }
        } catch {
          // skip
        }
      }
    });
    return map;
  }, [monthDays, location]);

  // ── Month navigation ───────────────────────────────────────────────────────
  const { opacity: gridOpacity, translateX: gridTransX, run: animateMonth } =
    useMonthAnim(reducedMotion);

  const prevMonth = useCallback(() => {
    animateMonth(-1, () => {
      setSelected(null);
      if (month === 0) {
        setMonth(11);
        setYear((y) => y - 1);
      } else {
        setMonth((m) => m - 1);
      }
    });
  }, [animateMonth, month]);

  const nextMonth = useCallback(() => {
    animateMonth(1, () => {
      setSelected(null);
      if (month === 11) {
        setMonth(0);
        setYear((y) => y + 1);
      } else {
        setMonth((m) => m + 1);
      }
    });
  }, [animateMonth, month]);

  const goToday = useCallback(() => {
    animateMonth(1, () => {
      setYear(today.getFullYear());
      setMonth(today.getMonth());
      setSelected(null);
    });
  }, [animateMonth, today]);

  const onSelectDay = useCallback((day: CalendarDay) => {
    setSelected((prev) =>
      prev?.date.getTime() === day.date.getTime() ? null : day,
    );
  }, []);

  // ── Press scales ───────────────────────────────────────────────────────────
  const prevPress = usePressScale(reducedMotion, 0.82);
  const nextPress = usePressScale(reducedMotion, 0.82);
  const todayPress = usePressScale(reducedMotion, 0.92);

  // ── Header gradient stops ──────────────────────────────────────────────────
  const headerGrad = isLight
    ? (["#C4920A", "#D4A843", "#B8810A"] as const)
    : (["#9A6E18", "#C4922A", "#8A6010"] as const);

  const topPad = insets.top > 0 ? insets.top : Platform.OS === "web" ? 48 : 20;

  // Gregorian month label e.g. "JULY 2026"
  const monthLabel = useMemo(
    () =>
      new Date(year, month, 1)
        .toLocaleDateString("en-US", { month: "long", year: "numeric" })
        .toUpperCase(),
    [year, month],
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: topPad,
          paddingBottom: (insets.bottom || 0) + 110,
          paddingHorizontal: CARD_MARGIN,
        }}
      >

        {/* ══════════════════════════════════════════════════════════
            MAIN CALENDAR CARD
            Gold-gradient header + full month grid in one card.
            ══════════════════════════════════════════════════════════ */}
        <View
          style={{
            borderRadius: rd.xl,
            overflow: "hidden",
            ...shadow.level2,
            borderWidth: 1,
            borderColor: isLight ? "rgba(180,130,20,0.25)" : "rgba(212,168,67,0.18)",
          }}
        >

          {/* ── Gold-gradient header ── */}
          <LinearGradient
            colors={headerGrad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ paddingVertical: 14, paddingHorizontal: GRID_H_PAD }}
          >
            {/* Ambient shimmer */}
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                top: -30,
                right: -20,
                width: 140,
                height: 140,
                borderRadius: 70,
                backgroundColor: "rgba(255,255,255,0.08)",
              }}
            />

            {/* Nav row */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              {/* Prev */}
              <Animated.View style={{ transform: [{ scale: prevPress.scale }] }}>
                <Pressable
                  onPress={prevMonth}
                  onPressIn={prevPress.onPressIn}
                  onPressOut={prevPress.onPressOut}
                  hitSlop={16}
                  accessibilityRole="button"
                  accessibilityLabel="Previous month"
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    backgroundColor: "rgba(255,255,255,0.15)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Feather name="chevron-left" size={18} color="#fff" />
                </Pressable>
              </Animated.View>

              {/* Center: month + year + Hebrew subtitle */}
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text
                  allowFontScaling={false}
                  style={{
                    fontSize: 18,
                    fontWeight: "800",
                    color: "#fff",
                    letterSpacing: 1.5,
                    textAlign: "center",
                  }}
                >
                  {monthLabel}
                </Text>
                <Text
                  allowFontScaling={false}
                  style={{
                    fontSize: 11,
                    color: "rgba(255,255,255,0.82)",
                    marginTop: 3,
                    letterSpacing: 0.3,
                  }}
                >
                  — {hebrewSubtitle} —
                </Text>
              </View>

              {/* Next */}
              <Animated.View style={{ transform: [{ scale: nextPress.scale }] }}>
                <Pressable
                  onPress={nextMonth}
                  onPressIn={nextPress.onPressIn}
                  onPressOut={nextPress.onPressOut}
                  hitSlop={16}
                  accessibilityRole="button"
                  accessibilityLabel="Next month"
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    backgroundColor: "rgba(255,255,255,0.15)",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Feather name="chevron-right" size={18} color="#fff" />
                </Pressable>
              </Animated.View>
            </View>
          </LinearGradient>

          {/* ── Calendar grid body ── */}
          <View
            style={{
              backgroundColor: isLight ? "#fff" : colors.surface,
              paddingHorizontal: GRID_H_PAD,
              paddingBottom: 12,
            }}
          >

            {/* Day-of-week column headers */}
            <View
              style={{
                flexDirection: "row",
                borderBottomWidth: 1,
                borderBottomColor: isLight
                  ? "rgba(0,0,0,0.08)"
                  : colors.border,
                paddingVertical: 8,
              }}
            >
              {DAY_LABELS_EN.map((label, i) => {
                const isSatCol = i === 6;
                return (
                  <View
                    key={label}
                    style={{ width: cellW, alignItems: "center" }}
                  >
                    <Text
                      allowFontScaling={false}
                      style={{
                        fontSize: 11,
                        fontWeight: "700",
                        letterSpacing: 0.5,
                        color: isSatCol
                          ? "#dc2626"
                          : colors.textPrimary,
                      }}
                    >
                      {label}
                    </Text>
                    <Text
                      allowFontScaling={false}
                      style={{
                        fontSize: 7.5,
                        color: isSatCol ? "#dc262680" : colors.textMuted,
                        marginTop: 1,
                      }}
                    >
                      {DAY_LABELS_HE[i]}
                    </Text>
                  </View>
                );
              })}
            </View>

            {/* Grid rows */}
            <Animated.View
              style={{
                opacity: gridOpacity,
                transform: [{ translateX: gridTransX }],
                flexDirection: "row",
                flexWrap: "wrap",
                marginTop: 4,
              }}
            >
              {/* Leading blanks */}
              {leadingBlanks.map((_, i) => (
                <View
                  key={`blank-${i}`}
                  style={{ width: cellW, height: cellH }}
                />
              ))}

              {/* Day cells */}
              {monthDays.map((day) => (
                <DayCell
                  key={day.gregorianDay}
                  day={day}
                  candleTime={candleMap[day.gregorianDay] ?? null}
                  isSelected={
                    selected?.date.getTime() === day.date.getTime()
                  }
                  cellW={cellW}
                  cellH={cellH}
                  reducedMotion={reducedMotion}
                  accentGold={gold}
                  textPrimary={colors.textPrimary}
                  textMuted={colors.textMuted}
                  onPress={onSelectDay}
                />
              ))}
            </Animated.View>

          </View>

          {/* ── Legend + TODAY button ── */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingHorizontal: GRID_H_PAD + 2,
              paddingVertical: 10,
              backgroundColor: isLight
                ? "rgba(0,0,0,0.02)"
                : "rgba(255,255,255,0.03)",
              borderTopWidth: 1,
              borderTopColor: isLight
                ? "rgba(0,0,0,0.07)"
                : colors.border,
            }}
          >
            {/* Legend items */}
            <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
              {/* Today */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 3,
                    backgroundColor: gold + "30",
                    borderWidth: 1.5,
                    borderColor: gold,
                  }}
                />
                <Text
                  allowFontScaling={false}
                  style={{ fontSize: 9.5, color: colors.textMuted }}
                >
                  Today
                </Text>
              </View>

              {/* Shabbat */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 3,
                    backgroundColor: "#dc262618",
                    borderWidth: 1,
                    borderColor: "#dc262640",
                  }}
                />
                <Text
                  allowFontScaling={false}
                  style={{ fontSize: 9.5, color: colors.textMuted }}
                >
                  Shabbat
                </Text>
              </View>

              {/* Fast */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 3,
                    backgroundColor: "#37415118",
                    borderWidth: 1,
                    borderColor: "#37415140",
                  }}
                />
                <Text
                  allowFontScaling={false}
                  style={{ fontSize: 9.5, color: colors.textMuted }}
                >
                  Fast
                </Text>
              </View>

              {/* Yahrzeit */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <View
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 3,
                    backgroundColor: "#7c3aed18",
                    borderWidth: 1,
                    borderColor: "#7c3aed50",
                  }}
                />
                <Text
                  allowFontScaling={false}
                  style={{ fontSize: 9.5, color: colors.textMuted }}
                >
                  Yahrzeit
                </Text>
              </View>
            </View>

            {/* TODAY button */}
            {!isCurrentMonth && (
              <Animated.View style={{ transform: [{ scale: todayPress.scale }] }}>
                <Pressable
                  onPress={goToday}
                  onPressIn={todayPress.onPressIn}
                  onPressOut={todayPress.onPressOut}
                  accessibilityRole="button"
                  accessibilityLabel="Go to today"
                  style={{
                    backgroundColor: gold,
                    borderRadius: 9999,
                    paddingHorizontal: 14,
                    paddingVertical: 6,
                  }}
                >
                  <Text
                    allowFontScaling={false}
                    style={{
                      fontSize: 11,
                      fontWeight: "800",
                      color: "#fff",
                      letterSpacing: 1,
                    }}
                  >
                    TODAY
                  </Text>
                </Pressable>
              </Animated.View>
            )}
            {isCurrentMonth && (
              <Pressable
                onPress={goToday}
                accessibilityRole="button"
                accessibilityLabel="Go to today"
                style={{
                  backgroundColor: gold + "22",
                  borderRadius: 9999,
                  paddingHorizontal: 14,
                  paddingVertical: 6,
                  borderWidth: 1,
                  borderColor: gold + "55",
                }}
              >
                <Text
                  allowFontScaling={false}
                  style={{
                    fontSize: 11,
                    fontWeight: "800",
                    color: gold,
                    letterSpacing: 1,
                  }}
                >
                  TODAY
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* ══════════════════════════════════════════════════════════
            SELECTED DAY DETAIL
            Appears below the card when a day is tapped.
            ══════════════════════════════════════════════════════════ */}
        {selected && (
          <View
            style={{
              marginTop: 14,
              backgroundColor: colors.surface,
              borderRadius: rd.xl,
              borderWidth: 1,
              borderColor: gold + "30",
              overflow: "hidden",
              ...shadow.level1,
            }}
          >
            {/* Accent stripe */}
            <View
              style={{
                height: 3,
                backgroundColor: isFastEvent(selected.events)
                  ? "#f59e0b"
                  : selected.isShabbat
                  ? "#dc2626"
                  : gold,
              }}
            />

            <View style={{ padding: sp[4] }}>
              {/* Date row */}
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    allowFontScaling={false}
                    style={{
                      fontSize: 17,
                      fontWeight: "700",
                      color: colors.textPrimary,
                      letterSpacing: -0.2,
                    }}
                  >
                    {selected.date.toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </Text>
                  <Text
                    allowFontScaling={false}
                    style={{ fontSize: 13, color: gold, marginTop: 3 }}
                  >
                    {hebrewDayNumeral(selected.hebrewDay)} {selected.hebrewMonth}{" "}
                    {selected.hebrewYear}
                  </Text>
                </View>

                {/* Shabbat / fast badge */}
                {(selected.isShabbat || isFastEvent(selected.events)) && (
                  <View
                    style={{
                      borderRadius: 9999,
                      borderWidth: 1,
                      borderColor: isFastEvent(selected.events)
                        ? "#f59e0b44"
                        : "#dc262644",
                      backgroundColor: isFastEvent(selected.events)
                        ? "#f59e0b12"
                        : "#dc262612",
                      paddingHorizontal: 10,
                      paddingVertical: 4,
                      marginLeft: 8,
                    }}
                  >
                    <Text
                      allowFontScaling={false}
                      style={{
                        fontSize: 11,
                        fontWeight: "700",
                        color: isFastEvent(selected.events)
                          ? "#f59e0b"
                          : "#dc2626",
                      }}
                    >
                      {isFastEvent(selected.events) ? "Fast Day" : "Shabbat"}
                    </Text>
                  </View>
                )}
              </View>

              {/* Candle lighting (if Friday) */}
              {candleMap[selected.gregorianDay] && (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    backgroundColor: gold + "10",
                    borderRadius: rd.md,
                    marginBottom: 10,
                    borderWidth: 1,
                    borderColor: gold + "25",
                  }}
                >
                  <Feather name="sunset" size={14} color={gold} />
                  <View>
                    <Text
                      allowFontScaling={false}
                      style={{
                        fontSize: 10,
                        color: gold,
                        fontWeight: "600",
                        letterSpacing: 0.8,
                        textTransform: "uppercase",
                      }}
                    >
                      Candle Lighting
                    </Text>
                    <Text
                      allowFontScaling={false}
                      style={{
                        fontSize: 16,
                        fontWeight: "700",
                        color: gold,
                        marginTop: 1,
                      }}
                    >
                      {candleMap[selected.gregorianDay]}
                    </Text>
                  </View>
                </View>
              )}

              {/* Events list */}
              {selected.events.length === 0 && !selected.roshChodesh ? (
                <Text
                  allowFontScaling={false}
                  style={{ fontSize: 13, color: colors.textMuted, fontStyle: "italic" }}
                >
                  No special events
                </Text>
              ) : (
                <View style={{ gap: 6 }}>
                  {selected.roshChodesh && (
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <View
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: "#7c3aed",
                        }}
                      />
                      <Text
                        allowFontScaling={false}
                        style={{
                          fontSize: 13,
                          color: colors.textPrimary,
                          fontWeight: "600",
                        }}
                      >
                        Rosh Chodesh
                      </Text>
                    </View>
                  )}
                  {selected.events.map((ev) => (
                    <View
                      key={ev}
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <View
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: isFastEvent([ev])
                            ? "#f59e0b"
                            : /shabbat/i.test(ev)
                            ? "#dc2626"
                            : gold,
                        }}
                      />
                      <Text
                        allowFontScaling={false}
                        style={{
                          fontSize: 13,
                          color: colors.textPrimary,
                          flex: 1,
                        }}
                      >
                        {ev}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Zmanim link */}
              <Pressable
                onPress={() => router.push("/(tabs)/zmanim")}
                accessibilityRole="button"
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  marginTop: 14,
                  paddingVertical: 10,
                  borderRadius: rd.lg,
                  borderWidth: 1,
                  borderColor: colors.border,
                  backgroundColor: colors.card,
                }}
              >
                <Feather name="clock" size={13} color={gold} />
                <Text
                  allowFontScaling={false}
                  style={{
                    fontSize: 12,
                    fontWeight: "600",
                    color: gold,
                  }}
                >
                  View Prayer Times
                </Text>
                <Feather name="chevron-right" size={12} color={gold} />
              </Pressable>
            </View>
          </View>
        )}

      </ScrollView>
    </View>
  );
}
