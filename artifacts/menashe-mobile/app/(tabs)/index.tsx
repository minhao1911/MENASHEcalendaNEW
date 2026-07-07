/**
 * SPR-M008 — Daily Experience Refinement
 * Mobile Home Screen — Vision Implementation Sprint
 *
 * Phases:
 *   1.  Hero Experience         — balance, hierarchy, artwork, 30-35% viewport
 *   2.  Today's Focus           — one priority item, proper visual weight
 *   3.  Sacred Time             — scannable zmanim row, current-prayer emphasis
 *   4.  Shabbat Experience      — Countdown → Candle Lighting → Havdalah hierarchy
 *   5.  Quick Actions           — 48dp targets, icon consistency, premium press
 *   6.  Learning Experience     — one visual family, consistent CTA placement
 *   7.  Sanctuary Card          — flagship depth, invitation to reflect
 *   8.  Rav Menashe AI          — sapphire premium, conversation preview
 *   9.  Visual Rhythm           — consistent margins, breathing room, no crowding
 *  10.  Micro Interactions       — effortless press, card scale, entrance fade
 *  11.  Performance             — memoised sections, stable refs
 *  12.  Accessibility           — VoiceOver, 48dp targets, Reduced Motion
 *
 * Architecture rules (SPR-M008):
 *   ✓ MMDL reused      ✓ MEL followed     ✓ Component Library reused
 *   ✓ No new features  ✓ No shared-core changes  ✓ No web changes
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
  AccessibilityInfo,
  Animated,
  ImageBackground,
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
  formatHebrewDateHebrew,
  getCurrentParasha,
  getUpcomingHolidays,
} from "@/lib/hebrewCalendar";
import { useThemeTokens } from "@/src/mobile/design-system";
import { useApp } from "@/context/AppContext";
import { useLanguage } from "@/context/LanguageContext";

// ─── Daf Yomi helpers ─────────────────────────────────────────────────────────

const TRACTATES = [
  { name: "Berakhot",     pages: 64  }, { name: "Shabbat",       pages: 157 },
  { name: "Eruvin",       pages: 105 }, { name: "Pesachim",      pages: 121 },
  { name: "Yoma",         pages: 88  }, { name: "Sukkah",        pages: 56  },
  { name: "Beitzah",      pages: 40  }, { name: "Rosh Hashana",  pages: 35  },
  { name: "Ta'anit",      pages: 31  }, { name: "Megillah",      pages: 32  },
  { name: "Moed Katan",   pages: 29  }, { name: "Chagigah",      pages: 27  },
  { name: "Yevamot",      pages: 122 }, { name: "Ketubot",       pages: 112 },
  { name: "Nedarim",      pages: 91  }, { name: "Nazir",         pages: 66  },
  { name: "Sotah",        pages: 49  }, { name: "Gittin",        pages: 90  },
  { name: "Kiddushin",    pages: 82  }, { name: "Bava Kamma",    pages: 119 },
  { name: "Bava Metzia",  pages: 119 }, { name: "Bava Batra",    pages: 176 },
  { name: "Sanhedrin",    pages: 113 }, { name: "Makkot",        pages: 24  },
  { name: "Shevuot",      pages: 49  }, { name: "Avodah Zarah",  pages: 76  },
  { name: "Horayot",      pages: 14  }, { name: "Zevachim",      pages: 120 },
  { name: "Menachot",     pages: 110 }, { name: "Chullin",       pages: 142 },
  { name: "Bekhorot",     pages: 61  }, { name: "Arakhin",       pages: 34  },
  { name: "Temurah",      pages: 34  }, { name: "Keritot",       pages: 28  },
  { name: "Meilah",       pages: 22  }, { name: "Niddah",        pages: 73  },
];
const TOTAL_PAGES  = TRACTATES.reduce((a, t) => a + t.pages, 0);
const CYCLE_START  = new Date(2020, 0, 5);

/* ── Hebrew day-number glyph map (days 1–30) ─────────────────────────────── */
const HEBREW_DAY: Record<number, string> = {
   1:"א",  2:"ב",  3:"ג",  4:"ד",  5:"ה",
   6:"ו",  7:"ז",  8:"ח",  9:"ט", 10:"י",
  11:"יא", 12:"יב", 13:"יג", 14:"יד", 15:"טו",
  16:"טז", 17:"יז", 18:"יח", 19:"יט", 20:"כ",
  21:"כא", 22:"כב", 23:"כג", 24:"כד", 25:"כה",
  26:"כו", 27:"כז", 28:"כח", 29:"כט", 30:"ל",
};

const HERO_BG = require("../../assets/images/saipikhup-photo.jpg");

function getTodayDaf(): { tractate: string; daf: number } {
  const daysSince   = Math.floor((Date.now() - CYCLE_START.getTime()) / 86_400_000);
  const dayInCycle  = ((daysSince % TOTAL_PAGES) + TOTAL_PAGES) % TOTAL_PAGES;
  let   cumulative  = 0;
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

function getOmerDay(): number | null {
  const hd = new HDate(new Date());
  const m  = hd.getMonth();
  const d  = hd.getDate();
  if (m === 1 && d >= 16) return d - 15;
  if (m === 2)            return 15 + d;
  if (m === 3 && d <= 5)  return 44 + d;
  return null;
}

function getNextWeekday(targetDay: number): Date {
  const d    = new Date();
  let   diff = (targetDay - d.getDay() + 7) % 7;
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
  { quote: "\"The Torah is a tree of life to those who hold fast to it.\"",           source: "Proverbs 3:18"       },
  { quote: "\"Who is wise? One who learns from every person.\"",                       source: "Pirkei Avot 4:1"     },
  { quote: "\"Love your neighbor as yourself\" — the entire Torah stands on this.",    source: "Leviticus 19:18"     },
  { quote: "\"In the place where a penitent stands, the righteous cannot stand.\"",   source: "Talmud, Berakhot 34b"},
  { quote: "\"G-d is present in every place, in every moment, in every thought.\"",   source: "Baal Shem Tov"       },
  { quote: "\"Turn it over again, for everything is contained within it.\"",           source: "Pirkei Avot 5:22"    },
  { quote: "\"Every day one must say: the world was created for my sake.\"",           source: "Sanhedrin 37a"       },
];

// ─── Phase 12: Reduced Motion ─────────────────────────────────────────────────

function useReducedMotionSafe(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduced).catch(() => {});
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => sub.remove();
  }, []);
  return reduced;
}

// ─── Phase 10: Staggered entrance (MEL motionGuide — entrance recipe) ─────────

function useEntrance(delay = 0): Animated.AnimatedProps<ViewStyle> {
  const reducedMotion = useReducedMotionSafe();
  const opacity    = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(reducedMotion ? 0 : 14)).current;
  useEffect(() => {
    const duration = reducedMotion ? 0 : 420;
    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity,    { toValue: 1, duration,       useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration,       useNativeDriver: true }),
      ]).start();
    }, reducedMotion ? 0 : delay);
    return () => clearTimeout(t);
  }, [delay, opacity, translateY, reducedMotion]);
  return { opacity, transform: [{ translateY }] } as any;
}

// ─── Phase 1: Hero shimmer — fades out on mount to reveal artwork ──────────────

function useHeroShimmer() {
  const reducedMotion = useReducedMotionSafe();
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const t = setTimeout(() => {
      Animated.timing(opacity, {
        toValue:  0,
        duration: reducedMotion ? 0 : 900,
        useNativeDriver: true,
      }).start();
    }, reducedMotion ? 0 : 300);
    return () => clearTimeout(t);
  }, [opacity, reducedMotion]);
  return opacity;
}

// ─── Phase 10: Animated press scale ───────────────────────────────────────────

function usePressScale(toValue = 0.95) {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn  = useCallback(() =>
    Animated.timing(scale, { toValue,  duration: 80,  useNativeDriver: true }).start(), [scale, toValue]);
  const onPressOut = useCallback(() =>
    Animated.timing(scale, { toValue: 1.0, duration: 150, useNativeDriver: true }).start(), [scale]);
  return { scale, onPressIn, onPressOut };
}

// ─── Overline label ───────────────────────────────────────────────────────────

const Overline = memo(function Overline({ text, color }: { text: string; color: string }) {
  return (
    <Text
      style={{ fontSize: 10, fontWeight: "700", letterSpacing: 2.0, textTransform: "uppercase", color }}
      numberOfLines={1}
    >
      {text}
    </Text>
  );
});

// ─── MEL PillButton — press scale 0.96 @80ms, release @150ms ──────────────────

const PillButton = memo(function PillButton({
  label, onPress, bg, fg, small,
}: {
  label: string; onPress: () => void; bg: string; fg: string; small?: boolean;
}) {
  const { scale, onPressIn, onPressOut } = usePressScale(0.94);
  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        backgroundColor: pressed ? bg + "d8" : bg,
        borderRadius:    9999,
        paddingHorizontal: small ? 14 : 22,
        paddingVertical:   small ?  9 : 13,
        minHeight: small ? 36 : 44,
        flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
        alignSelf: "flex-start",
      })}
    >
      <Animated.View style={{ transform: [{ scale }], flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Text style={{ fontSize: small ? 12 : 13, fontWeight: "700", color: fg, letterSpacing: 0.1 }}>{label}</Text>
        <Feather name="chevron-right" size={small ? 11 : 13} color={fg} />
      </Animated.View>
    </Pressable>
  );
});

// ─── Section header label ──────────────────────────────────────────────────────

const SectionHeader = memo(function SectionHeader({
  icon, label, onPress, ctaLabel, HX,
}: {
  icon: string; label: string; onPress?: () => void; ctaLabel?: string; HX: number;
}) {
  return (
    <View style={{
      paddingHorizontal: HX,
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      marginBottom: 14,
    }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
        <Feather name={icon as any} size={13} color="#d4a843" />
        <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 1.8, color: "#888", textTransform: "uppercase" }}>
          {label}
        </Text>
      </View>
      {onPress && ctaLabel ? (
        <Pressable
          onPress={onPress}
          accessibilityRole="link"
          accessibilityLabel={ctaLabel}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, flexDirection: "row", alignItems: "center", gap: 4 })}
        >
          <Text style={{ fontSize: 11, color: "#d4a843", fontWeight: "600" }}>{ctaLabel}</Text>
          <Feather name="chevron-right" size={11} color="#d4a843" />
        </Pressable>
      ) : null}
    </View>
  );
});

// ─── Phase 5: Quick Action items ──────────────────────────────────────────────

const QA_ITEMS = [
  { id: "calendar",     label: "Calendar",     icon: "calendar"   as const, bg: "#4A90D9", route: "/(tabs)/calendar" },
  { id: "zmanim",       label: "Zmanim",       icon: "clock"      as const, bg: "#9B59B6", route: "/(tabs)/zmanim"   },
  { id: "sanctuary",    label: "Sanctuary",    icon: "home"       as const, bg: "#E67E22", route: "/sacred-memory"},
  { id: "study",        label: "Study",        icon: "book-open"  as const, bg: "#27AE60", route: "/(tabs)/torah"    },
  { id: "daf-yomi",     label: "Daf Yomi",     icon: "award"      as const, bg: "#E67E22", route: "/daf-yomi"        },
  { id: "library",      label: "Library",      icon: "book"       as const, bg: "#8E44AD", route: "/siddur"          },
  { id: "prayer-board", label: "Prayer Board", icon: "users"      as const, bg: "#16A085", route: "/prayer-board"    },
  { id: "48-ways",      label: "48 Ways",      icon: "star"       as const, bg: "#D4A843", route: "/mussar"          },
];

const QuickActionCard = memo(function QuickActionCard({
  item, cardBg, borderColor, textSecondary, rd,
}: {
  item: typeof QA_ITEMS[number];
  cardBg: string; borderColor: string; textSecondary: string; rd: any;
}) {
  const { scale, onPressIn, onPressOut } = usePressScale(0.93);
  return (
    <Pressable
      onPress={() => router.push(item.route as any)}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityLabel={item.label}
      accessibilityRole="button"
      style={{
        width: "22%",
        alignItems: "center",
        minHeight: 92,
        justifyContent: "center",
        gap: 9,
        paddingVertical: 18,
        borderRadius: rd.lg,
        backgroundColor: cardBg,
        borderWidth: 1, borderColor,
      }}
    >
      <Animated.View style={{ transform: [{ scale }], alignItems: "center", gap: 9 }}>
        <View style={{
          width: 50, height: 50,
          borderRadius: rd.md,
          backgroundColor: item.bg + "1e",
          alignItems: "center", justifyContent: "center",
        }}>
          <Feather name={item.icon} size={22} color={item.bg} />
        </View>
        <Text style={{ fontSize: 11, fontWeight: "600", textAlign: "center", color: textSecondary, lineHeight: 14 }}>
          {item.label}
        </Text>
      </Animated.View>
    </Pressable>
  );
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const { colors, type, sp, rd, shadow, theme } = useThemeTokens();
  const insets    = useSafeAreaInsets();
  const { location } = useApp();
  const { lang, setLang, t } = useLanguage();

  const firstName: string | null = null;

  const today = useMemo(() => new Date(), []);
  const hour  = today.getHours();

  const greeting =
    hour < 12 ? t.homeGoodMorning
    : hour < 17 ? t.homeGoodAfternoon
    : t.homeGoodEvening;

  const hdate            = useMemo(() => getHebrewDate(today), [today]);
  const hebrewDateStr    = useMemo(() => formatHebrewDate(hdate), [hdate]);
  const hebrewNumeralStr = useMemo(() => {
    try { return formatHebrewDateHebrew(hdate); } catch { return ""; }
  }, [hdate]);

  const hebrewDayNum    = parseInt(hebrewDateStr.split(" ")[0] ?? "1", 10);
  const hebrewGlyph     = HEBREW_DAY[hebrewDayNum] ?? hebrewDateStr.split(" ")[0] ?? "";
  const hebrewMonthYear = hebrewDateStr.split(" ").slice(1).join(" ");

  const parasha     = useMemo(() => getCurrentParasha(), []);
  const holidays    = useMemo(() => getUpcomingHolidays(30), []);
  const nextHoliday = holidays[0] ?? null;

  const todayHoliday = useMemo(() => {
    if (!nextHoliday) return null;
    const hd = nextHoliday.date;
    return hd.getFullYear() === today.getFullYear()
        && hd.getMonth()     === today.getMonth()
        && hd.getDate()      === today.getDate()
      ? nextHoliday : null;
  }, [nextHoliday, today]);

  const todayFast = useMemo(() => {
    if (!todayHoliday) return null;
    return /fast|tzom|tisha|ta'?anit|taanis/i.test(todayHoliday.name)
      ? todayHoliday : null;
  }, [todayHoliday]);

  const daf         = useMemo(() => getTodayDaf(), []);
  const dafProgress = useMemo(() => getDafProgress(daf.tractate, daf.daf), [daf]);
  const omerDay     = useMemo(() => getOmerDay(), []);

  const todayZm = useMemo(
    () => calculateZmanim(today, location.lat, location.lng, location.candleLightingMinutes),
    [location, today],
  );

  const isShabbat = today.getDay() === 6;
  const isFriday  = today.getDay() === 5;

  const friday = useMemo(
    () => (isFriday ? today : getNextWeekday(5)),
    [isFriday, today],
  );
  const saturday = useMemo(() => {
    const d = new Date(friday.getTime() + 86_400_000);
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
  const havdalahMs       = satZm.havdalah         ? satZm.havdalah.getTime()          - now : null;

  let countdownMode: "candle" | "havdalah" | "upcoming" = "upcoming";
  let countdownMs   = 0;
  let countdownDate = friday;

  if (isShabbat && havdalahMs && havdalahMs > 0) {
    countdownMode = "havdalah";
    countdownMs   = havdalahMs;
    countdownDate = saturday;
  } else if (isFriday && candleLightingMs && candleLightingMs > 0) {
    countdownMode = "candle";
    countdownMs   = candleLightingMs;
    countdownDate = friday;
  } else if (candleLightingMs && candleLightingMs > 0) {
    countdownMode = "upcoming";
    countdownMs   = candleLightingMs;
    countdownDate = friday;
  }

  const countdownDateStr = countdownDate.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  const todayInsight = useMemo(() => {
    const idx = Math.abs(Math.floor(today.getTime() / 86_400_000) % TORAH_INSIGHTS.length);
    return TORAH_INSIGHTS[idx];
  }, [today]);

  const topPad = insets.top > 0 ? insets.top : (Platform.OS === "web" ? 60 : 20);

  const isLight    = theme === "light";
  const isSapphire = theme === "sapphire";

  const heroGradientColors = isLight
    ? (["#F5EDD8", "#EDD9A3", "#D9BB6E"] as const)
    : isSapphire
      ? (["#0c1830", "#1a2e58", "#0c1830"] as const)
      : (["#090f1d", "#101824", "#182032"] as const);

  const heroAccent    = isLight ? "#c8852a" : colors.primary;
  const cardBg        = colors.card;
  const pageBg        = colors.background;
  const gold          = colors.primary;
  const textPrimary   = colors.textPrimary;
  const textMuted     = colors.textMuted;
  const textSecondary = colors.textSecondary;
  const borderColor   = colors.cardBorder;
  const successColor  = colors.success;
  const sapphireBlue  = "#6382FF" as const;

  // Phase 10: staggered entrance — MEL motionGuide
  const a0  = useEntrance(0);
  const a1  = useEntrance(60);
  const a2  = useEntrance(110);
  const a3  = useEntrance(160);
  const a4  = useEntrance(210);
  const a5  = useEntrance(260);
  const a6  = useEntrance(310);
  const a7  = useEntrance(360);
  const a8  = useEntrance(400);
  const a9  = useEntrance(440);

  // Phase 1: hero shimmer
  const shimmerOpacity = useHeroShimmer();

  // Phase 9: consistent horizontal page margin
  const HX = 20;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: pageBg }}
      contentContainerStyle={{ paddingBottom: (insets.bottom || 0) + 104 }}
      showsVerticalScrollIndicator={false}
    >

      {/* ─── 1. HEADER ──────────────────────────────────────────────────────────── */}
      <Animated.View style={[{
        paddingTop: topPad, paddingHorizontal: HX, paddingBottom: 12,
        flexDirection: "row", alignItems: "center",
      }, a0]}>
        {/* Hamburger — 48dp touch target */}
        <TouchableOpacity
          style={{ width: 48, height: 48, alignItems: "center", justifyContent: "center", marginRight: 6 }}
          activeOpacity={0.7}
          accessibilityLabel="Open menu"
          accessibilityRole="button"
        >
          <Feather name="menu" size={22} color={textPrimary} />
        </TouchableOpacity>

        {/* Logo + Brand */}
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{
            width: 36, height: 36, borderRadius: 10,
            backgroundColor: gold + "1e", borderWidth: 1, borderColor: gold + "44",
            alignItems: "center", justifyContent: "center",
          }}>
            <Text style={{ fontSize: 17 }}>⛩</Text>
          </View>
          <View>
            <Text style={{ fontSize: 13, fontWeight: "800", color: gold, letterSpacing: 1.8 }}>
              BNEI MENASHE
            </Text>
            <Text style={{ fontSize: 10, color: textMuted, letterSpacing: 0.4, marginTop: 1 }}>
              {t.homeSacredCalendar}
            </Text>
          </View>
        </View>

        {/* Location chip */}
        <View style={{
          flexDirection: "row", alignItems: "center", gap: 4,
          backgroundColor: isLight ? "#fff8ee" : cardBg,
          borderRadius: rd.pill, paddingHorizontal: 10, paddingVertical: 7,
          borderWidth: 1, borderColor, marginRight: 10,
        }}>
          <Feather name="map-pin" size={10} color={gold} />
          <Text style={{ fontSize: 11, color: textMuted, fontWeight: "500" }} numberOfLines={1}>
            {location.name}
          </Text>
        </View>

        {/* Bell — 48dp target */}
        <TouchableOpacity
          style={{
            width: 48, height: 48, borderRadius: 24,
            backgroundColor: cardBg, borderWidth: 1, borderColor,
            alignItems: "center", justifyContent: "center",
          }}
          activeOpacity={0.7}
          accessibilityLabel="Notifications"
          accessibilityRole="button"
        >
          <Feather name="bell" size={17} color={textPrimary} />
          <View style={{
            position: "absolute", top: 9, right: 10,
            width: 7, height: 7, borderRadius: 4,
            backgroundColor: "#fb923c",
            borderWidth: 1.5, borderColor: pageBg,
          }} />
        </TouchableOpacity>
      </Animated.View>

      {/* ─── 2. LANG BAR ──────────────────────────────────────────────────────── */}
      <Animated.View style={[{
        paddingHorizontal: HX, marginBottom: 16,
        flexDirection: "row", alignItems: "center", gap: 10,
      }, a0]}>
        <View style={{
          width: 32, height: 32, borderRadius: 16,
          backgroundColor: gold + "18", borderWidth: 1, borderColor: gold + "44",
          alignItems: "center", justifyContent: "center",
        }}>
          <Text style={{ fontSize: 14, color: gold }}>✡</Text>
        </View>

        <View style={{
          flexDirection: "row",
          backgroundColor: cardBg, borderRadius: rd.pill,
          borderWidth: 1, borderColor, padding: 3,
        }}>
          {(["en", "tk"] as const).map((l) => (
            <TouchableOpacity
              key={l}
              style={{
                paddingHorizontal: 16, paddingVertical: 8,
                minHeight: 44, minWidth: 52, justifyContent: "center", alignItems: "center",
                borderRadius: rd.pill,
                backgroundColor: lang === l ? gold : "transparent",
              }}
              onPress={() => setLang(l)}
              activeOpacity={0.8}
              accessibilityLabel={l === "en" ? "Switch to English" : "Switch to Thadou Kuki"}
              accessibilityRole="button"
              accessibilityState={{ selected: lang === l }}
            >
              <Text style={{ fontSize: 11, fontWeight: "700", color: lang === l ? colors.primaryForeground : textMuted }}>
                {l.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

      {/* ─── 3. HERO — Phase 1 ──────────────────────────────────────────────────── */}
      {/* Photo-background date card matching the Zmanim reference design */}
      <Animated.View style={[{
        marginHorizontal: HX, marginBottom: 24,
        borderRadius: 28, overflow: "hidden",
        ...shadow.level2,
      }, a1]}>
        <ImageBackground
          source={HERO_BG}
          style={{ minHeight: 264 }}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        >
          <LinearGradient
            colors={["rgba(10,8,3,0.28)", "rgba(8,6,2,0.74)", "rgba(4,3,1,0.97)"]}
            locations={[0, 0.50, 1]}
            style={{ minHeight: 264, paddingTop: 20, paddingHorizontal: 20 }}
          >
            {/* Top row: TODAY badge + greeting */}
            <View style={{
              flexDirection: "row", alignItems: "center",
              justifyContent: "space-between", marginBottom: 14,
            }}>
              <View style={{
                borderRadius: 20, borderWidth: 1,
                borderColor: gold + "60",
                backgroundColor: "rgba(30,22,4,0.82)",
                paddingHorizontal: 11, paddingVertical: 4,
              }}>
                <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 1.8, color: gold }}>
                  TODAY
                </Text>
              </View>
              <Text style={{
                fontSize: 12, fontWeight: "600",
                color: "rgba(240,220,160,0.82)", letterSpacing: 0.2,
              }}>
                {greeting}{firstName ? `, ${firstName}` : ""}
              </Text>
            </View>

            {/* Hebrew day glyph — large, prominent */}
            <Text style={{
              fontSize: 60, fontWeight: "700",
              color: "#F0E6C0", lineHeight: 66, letterSpacing: -1,
              textShadowColor: "rgba(0,0,0,0.65)",
              textShadowOffset: { width: 0, height: 2 },
              textShadowRadius: 7,
            }}>
              {hebrewGlyph}
            </Text>

            {/* Hebrew month + year */}
            <Text style={{
              fontSize: 26, fontWeight: "700",
              color: "#FFFFFF", letterSpacing: -0.4,
              marginTop: 4, marginBottom: 5,
              textShadowColor: "rgba(0,0,0,0.52)",
              textShadowOffset: { width: 0, height: 1 },
              textShadowRadius: 4,
            }}>
              {hebrewMonthYear}
            </Text>

            {/* Gregorian subtitle */}
            <Text style={{
              fontSize: 11, fontWeight: "500",
              color: "rgba(220,200,160,0.78)",
              letterSpacing: 0.3, marginBottom: 18,
            }} numberOfLines={1}>
              {gregDate}  ·  {location.name}
            </Text>

            {/* Glass Zmanim bar — 3 key times */}
            {Platform.OS !== "web" ? (
              <BlurView
                intensity={55} tint="dark"
                style={{ marginHorizontal: -6, marginBottom: 14, borderRadius: rd.lg, overflow: "hidden" }}
              >
                <ZmanimBar todayZm={todayZm} location={location} textPrimary="#FFFFFF" textMuted="rgba(220,200,160,0.72)" isLight={false} />
              </BlurView>
            ) : (
              <View style={{
                marginHorizontal: -6, marginBottom: 14, borderRadius: rd.lg, overflow: "hidden",
                backgroundColor: "rgba(0,0,0,0.55)",
                borderWidth: 1, borderColor: "rgba(255,255,255,0.10)",
              }}>
                <ZmanimBar todayZm={todayZm} location={location} textPrimary="#FFFFFF" textMuted="rgba(220,200,160,0.72)" isLight={false} />
              </View>
            )}

            {/* Phase 1: elegant loading shimmer */}
            <Animated.View
              pointerEvents="none"
              style={{
                ...StyleSheet.absoluteFillObject,
                backgroundColor: "rgba(9,15,29,0.55)",
                opacity: shimmerOpacity,
              }}
            />
          </LinearGradient>
        </ImageBackground>
      </Animated.View>

      {/* ─── 4. TODAY'S FOCUS — Phase 2 ────────────────────────────────────────── */}
      <Animated.View style={[{ marginHorizontal: HX, marginBottom: 18 }, a2]}>
        <TodaysFocusCard
          mode={countdownMode}
          isShabbat={isShabbat}
          isFriday={isFriday}
          omerDay={omerDay}
          todayHoliday={todayHoliday}
          todayFast={todayFast}
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

      {/* ─── 5. SHABBAT COUNTDOWN — Phase 4 ────────────────────────────────────── */}
      <Animated.View style={[{ marginHorizontal: HX, marginBottom: 24 }, a2]}>
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

      {/* ─── 6. SACRED TIME — Phase 3 ───────────────────────────────────────────── */}
      <Animated.View style={[{ marginBottom: 24 }, a3]}>
        <SectionHeader
          icon="clock"
          label={t.homeSacredTimeLabel}
          onPress={() => router.push("/(tabs)/zmanim")}
          ctaLabel={t.homeAllTimesLocal}
          HX={HX}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: HX, gap: 10 }}
        >
          {(() => {
            const zmanList = [
              { label: t.homeDawn,        icon: "sunrise" as const, time: todayZm.alotHaShachar },
              { label: t.homeSunrise,     icon: "sunrise" as const, time: todayZm.sunrise       },
              { label: t.homeMinchaGedola,icon: "sun"     as const, time: todayZm.chatzot       },
              { label: t.homeSunset,      icon: "sunset"  as const, time: todayZm.sunset        },
              { label: t.homeNightfall,   icon: "moon"    as const, time: todayZm.tzais         },
              { label: t.homeTzais,       icon: "moon"    as const, time: todayZm.tzais         },
            ];
            const nowMs    = now;
            let   currentIdx = -1;
            zmanList.forEach((z, i) => {
              if (z.time && new Date(z.time).getTime() <= nowMs) currentIdx = i;
            });
            return zmanList.map((z, i) => {
              const isCurrent = i === currentIdx;
              return (
                <View
                  key={z.label + i}
                  style={{
                    alignItems: "center", gap: 6,
                    backgroundColor: isCurrent ? gold + "1a" : cardBg,
                    borderRadius: rd.lg,
                    paddingVertical: 16, paddingHorizontal: 16,
                    borderWidth: isCurrent ? 1.5 : 1,
                    borderColor: isCurrent ? gold : borderColor,
                    minWidth: 88,
                    ...(isCurrent ? shadow.level2 : shadow.level1),
                  }}
                  accessibilityLabel={`${z.label}: ${z.time ? formatTime(z.time, location.tz) : "—"}${isCurrent ? ", current period" : ""}`}
                >
                  {isCurrent && (
                    <Text style={{ fontSize: 8, fontWeight: "800", letterSpacing: 1.0, color: gold, textTransform: "uppercase" }}>
                      {t.homeNowLabel}
                    </Text>
                  )}
                  <View style={{
                    width: 34, height: 34, borderRadius: 17,
                    backgroundColor: gold + (isCurrent ? "2a" : "18"),
                    alignItems: "center", justifyContent: "center",
                  }}>
                    <Feather name={z.icon} size={15} color={gold} />
                  </View>
                  <Text style={{ fontSize: 10, color: isCurrent ? gold : textMuted, fontWeight: "600", textAlign: "center", letterSpacing: 0.3 }}>
                    {z.label}
                  </Text>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: textPrimary }}>
                    {z.time ? formatTime(z.time, location.tz) : "—"}
                  </Text>
                </View>
              );
            });
          })()}
        </ScrollView>
      </Animated.View>

      {/* ─── 7. QUICK ACTIONS 2×4 — Phase 5 ──────────────────────────────────── */}
      <Animated.View style={[{ marginHorizontal: HX, marginBottom: 24 }, a4]}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
          {QA_ITEMS.map((item) => (
            <QuickActionCard
              key={item.id}
              item={item}
              cardBg={cardBg}
              borderColor={borderColor}
              textSecondary={textSecondary}
              rd={rd}
            />
          ))}
        </View>
      </Animated.View>

      {/* ─── 8. LEARNING EXPERIENCE — Phase 6 ──────────────────────────────────── */}
      {/* All 3 cards: one visual family — same overline · illustration · CTA style */}
      <Animated.View style={[{ marginBottom: 24 }, a5]}>
        <SectionHeader
          icon="book-open"
          label={t.homeLearningLabel}
          HX={HX}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: HX, gap: 12 }}
        >
          {/* ── Parasha card ── */}
          <Pressable
            style={({ pressed }) => ({
              width: 252, borderRadius: rd.xl, overflow: "hidden",
              transform: [{ scale: pressed ? 0.97 : 1 }],
              ...shadow.level2,
            })}
            onPress={() => router.push("/(tabs)/torah")}
            accessibilityLabel={`Weekly Parasha: ${parasha || "loading"}`}
            accessibilityRole="button"
          >
            <View style={[s.galleryCard, { backgroundColor: cardBg, borderColor, borderRadius: rd.xl }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <Feather name="book" size={11} color={gold} />
                <Overline text={t.homeParashah} color={gold} />
              </View>
              <Text style={{ fontSize: 17, fontWeight: "700", color: textPrimary, lineHeight: 23 }} numberOfLines={1}>
                {parasha !== "" ? `Parashat ${parasha}` : "—"}
              </Text>
              <Text style={{ fontSize: 12, color: textMuted, marginTop: 3, fontStyle: "italic" }} numberOfLines={1}>
                פרשת {parasha}
              </Text>
              <View style={s.illustrationContainer}>
                <Text style={s.illustrationEmoji}>📜</Text>
              </View>
              <PillButton
                label={t.homeReadSummary}
                onPress={() => router.push("/(tabs)/torah")}
                bg={gold}
                fg={colors.primaryForeground}
                small
              />
            </View>
          </Pressable>

          {/* ── Torah Insight card ── */}
          <View style={{ width: 252, borderRadius: rd.xl, overflow: "hidden", ...shadow.level2 }}>
            <View style={[s.galleryCard, { backgroundColor: cardBg, borderColor, borderRadius: rd.xl }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <Feather name="zap" size={11} color="#E67E22" />
                <Overline text={t.homeInsightTitle} color="#E67E22" />
              </View>
              <Text style={{ fontSize: 13, fontStyle: "italic", color: textSecondary, lineHeight: 21 }} numberOfLines={3}>
                {todayInsight.quote}
              </Text>
              <View style={s.illustrationContainer}>
                <Text style={s.illustrationEmoji}>🌳</Text>
              </View>
              <Text style={{ fontSize: 11, fontWeight: "600", color: textMuted, marginBottom: 12 }} numberOfLines={1}>
                — {todayInsight.source}
              </Text>
              <PillButton
                label={t.homeReadSummary}
                onPress={() => router.push("/(tabs)/torah")}
                bg={isLight ? "#1a0f00" : cardBg}
                fg={isLight ? "#fff" : textPrimary}
                small
              />
            </View>
          </View>

          {/* ── Daf Yomi card ── */}
          <Pressable
            style={({ pressed }) => ({
              width: 252, borderRadius: rd.xl, overflow: "hidden",
              transform: [{ scale: pressed ? 0.97 : 1 }],
              ...shadow.level2,
            })}
            onPress={() => router.push("/daf-yomi")}
            accessibilityLabel={`Daf Yomi: ${daf.tractate}, page ${daf.daf}`}
            accessibilityRole="button"
          >
            <View style={[s.galleryCard, { backgroundColor: cardBg, borderColor, borderRadius: rd.xl }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <Feather name="award" size={11} color="#E67E22" />
                <Overline text={t.homeDafYomi} color="#E67E22" />
              </View>
              <Text style={{ fontSize: 17, fontWeight: "700", color: textPrimary, lineHeight: 23 }} numberOfLines={1}>
                {daf.tractate}
              </Text>
              <Text style={{ fontSize: 12, color: textMuted, marginTop: 3 }} numberOfLines={1}>
                {t.homeDafYomiToday} · {t.homeDafYomi} {daf.daf}
              </Text>
              <View style={s.illustrationContainer}>
                <Text style={s.illustrationEmoji}>📄</Text>
                <View style={{
                  position: "absolute", bottom: 4, right: 4,
                  width: 32, height: 32, borderRadius: 16,
                  backgroundColor: successColor + "22",
                  borderWidth: 1.5, borderColor: successColor,
                  alignItems: "center", justifyContent: "center",
                }}>
                  <Text style={{ fontSize: 8, fontWeight: "700", color: successColor }}>{dafProgress}%</Text>
                </View>
              </View>
              <PillButton
                label={t.homeOpenDafYomi}
                onPress={() => router.push("/daf-yomi")}
                bg={isLight ? "#1a0f00" : cardBg}
                fg={isLight ? "#fff" : textPrimary}
                small
              />
            </View>
          </Pressable>
        </ScrollView>
      </Animated.View>

      {/* ─── 9. UPCOMING HOLIDAY ────────────────────────────────────────────────── */}
      <Animated.View style={[{ marginHorizontal: HX, marginBottom: 18 }, a6]}>
        <Pressable
          style={({ pressed }) => ({
            backgroundColor: cardBg, borderRadius: rd.xl, borderWidth: 1, borderColor,
            flexDirection: "row", alignItems: "center",
            paddingHorizontal: 18, paddingVertical: 16, gap: 14,
            transform: [{ scale: pressed ? 0.98 : 1 }],
            ...shadow.level1,
          })}
          onPress={() => router.push("/(tabs)/calendar")}
          accessibilityLabel={`${t.homeUpcomingHoliday}${nextHoliday ? ": " + nextHoliday.name : ""}`}
          accessibilityRole="link"
        >
          <View style={{
            width: 46, height: 46, borderRadius: 23,
            backgroundColor: gold + "18", borderWidth: 1, borderColor: gold + "40",
            alignItems: "center", justifyContent: "center",
          }}>
            <Text style={{ fontSize: 20, opacity: 0.85 }}>✡</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 1.6, textTransform: "uppercase", color: gold, marginBottom: 5 }}>
              {t.homeUpcomingHoliday}
            </Text>
            {nextHoliday ? (
              <>
                <Text style={{ fontSize: 15, fontWeight: "700", color: textPrimary }}>{nextHoliday.name}</Text>
                <Text style={{ fontSize: 12, color: textMuted, marginTop: 2 }}>
                  {nextHoliday.date.toLocaleDateString("en-US", { weekday: "short", month: "long", day: "numeric" })}
                </Text>
              </>
            ) : (
              <Text style={{ fontSize: 13, color: textMuted }}>{t.homeNoHolidays}</Text>
            )}
          </View>
          <Feather name="chevron-right" size={16} color={textMuted} />
        </Pressable>
      </Animated.View>

      {/* ─── 10. COMMUNITY PREVIEW ──────────────────────────────────────────────── */}
      <Animated.View style={[{ marginHorizontal: HX, marginBottom: 24 }, a6]}>
        <Pressable
          style={({ pressed }) => ({
            backgroundColor: cardBg, borderRadius: rd.xl, borderWidth: 1, borderColor,
            flexDirection: "row", alignItems: "center",
            paddingHorizontal: 18, paddingVertical: 16, gap: 14,
            transform: [{ scale: pressed ? 0.98 : 1 }],
            ...shadow.level1,
          })}
          onPress={() => router.push("/(tabs)/community")}
          accessibilityLabel={t.homeCommunityPreviewTitle}
          accessibilityRole="link"
        >
          <View style={{
            width: 46, height: 46, borderRadius: 23,
            backgroundColor: successColor + "18",
            borderWidth: 1, borderColor: successColor + "40",
            alignItems: "center", justifyContent: "center",
          }}>
            <Feather name="users" size={19} color={successColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: textPrimary }}>{t.homeCommunityPreviewTitle}</Text>
            <Text style={{ fontSize: 12, color: textMuted, marginTop: 2, lineHeight: 18 }}>{t.homeCommunityPreviewDesc}</Text>
          </View>
          <View style={{ alignItems: "flex-end", gap: 4 }}>
            <Text style={{ fontSize: 12, color: successColor, fontWeight: "600" }}>{t.homeCommunityPreviewCta}</Text>
            <Feather name="chevron-right" size={14} color={successColor} />
          </View>
        </Pressable>
      </Animated.View>

      {/* ─── 11. MEMORIAL SANCTUARY — Phase 7 ──────────────────────────────────── */}
      {/* Flagship card — invites reflection, not entertainment                     */}
      <Animated.View style={[{
        marginHorizontal: HX, marginBottom: 18,
        borderRadius: rd["2xl"], overflow: "hidden", ...shadow.level2,
      }, a7]}>
        <TouchableOpacity
          onPress={() => router.push("/sacred-memory")}
          activeOpacity={0.92}
          accessibilityLabel="Enter Memorial Sanctuary"
          accessibilityHint="Opens the Sacred Memory experience"
          accessibilityRole="button"
        >
          <LinearGradient
            colors={["#3a1e08", "#1c0e00", "#2a1500", "#3a2208"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ minHeight: 212, padding: 24 }}
          >
            {/* Layered warm candlelight glow */}
            <View style={{
              position: "absolute", top: -32, right: -32,
              width: 160, height: 160, borderRadius: 80,
              backgroundColor: "rgba(212,120,10,0.14)",
            }} />
            <View style={{
              position: "absolute", top: -10, right: -10,
              width: 90, height: 90, borderRadius: 45,
              backgroundColor: "rgba(240,150,20,0.10)",
            }} />

            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{ flex: 1 }}>
                <Overline text={t.homeMemorialTitle} color={gold} />
                <Text style={{
                  fontSize: 22, fontWeight: "800",
                  color: "#f4e0c4", marginTop: 8, marginBottom: 8, lineHeight: 28,
                  letterSpacing: -0.3,
                }}>
                  Memorial Sanctuary
                </Text>
                <Text style={{ fontSize: 13, color: "#c4b090", marginBottom: 20, lineHeight: 20, maxWidth: 200 }}>
                  {t.homeMemorialTagline}
                </Text>
                <PillButton
                  label={t.homeEnterSanctuary}
                  onPress={() => router.push("/sacred-memory")}
                  bg={gold}
                  fg="#1a0f00"
                />
              </View>

              {/* Candle — warm glowing orb */}
              <View style={{ alignItems: "center", justifyContent: "center", marginLeft: 18 }}>
                <View style={{
                  width: 80, height: 80, borderRadius: 40,
                  backgroundColor: "rgba(212,120,10,0.22)",
                  alignItems: "center", justifyContent: "center",
                }}>
                  <View style={{
                    position: "absolute",
                    width: 56, height: 56, borderRadius: 28,
                    backgroundColor: "rgba(240,160,30,0.14)",
                  }} />
                  <Text style={{
                    fontSize: 42,
                    textShadowColor: "rgba(255,160,30,0.80)",
                    textShadowOffset: { width: 0, height: 0 },
                    textShadowRadius: 16,
                  }}>🕯</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* ─── 12. RAV MENASHE AI — Phase 8 ──────────────────────────────────────── */}
      {/* Premium sapphire. Welcoming, not transactional.                           */}
      <Animated.View style={[{
        marginHorizontal: HX, marginBottom: 18,
        borderRadius: rd["2xl"], overflow: "hidden", ...shadow.level2,
      }, a8]}>
        <TouchableOpacity
          onPress={() => router.push("/(tabs)/torah")}
          activeOpacity={0.92}
          accessibilityLabel="Ask Rav Menashe AI"
          accessibilityHint="Opens the AI Torah guide"
          accessibilityRole="button"
        >
          <LinearGradient
            colors={["#04091a", "#0a1830", "#0e2248", "#091628"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ minHeight: 212, padding: 24 }}
          >
            {/* Sapphire ambient glow — layered */}
            <View style={{
              position: "absolute", top: -36, right: -36,
              width: 180, height: 180, borderRadius: 90,
              backgroundColor: "rgba(99,130,255,0.10)",
            }} />
            <View style={{
              position: "absolute", top: -6, right: -6,
              width: 100, height: 100, borderRadius: 50,
              backgroundColor: "rgba(99,130,255,0.07)",
            }} />

            {/* Constellation stars */}
            <Text style={{ position: "absolute", top: 14, right: 22,  fontSize: 9,  color: "#6382FF", opacity: 0.72 }}>✦</Text>
            <Text style={{ position: "absolute", top: 26, right: 44,  fontSize: 5,  color: "#a0b4d8", opacity: 0.60 }}>✦</Text>
            <Text style={{ position: "absolute", top: 10, right: 62,  fontSize: 6,  color: "#6382FF", opacity: 0.50 }}>✦</Text>
            <Text style={{ position: "absolute", top: 38, right: 28,  fontSize: 4,  color: "#c4d4ff", opacity: 0.45 }}>✦</Text>
            <Text style={{ position: "absolute", top: 18, right: 82,  fontSize: 4,  color: "#6382FF", opacity: 0.38 }}>✦</Text>

            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{ flex: 1 }}>
                <Overline text={t.homeAITitle} color={sapphireBlue} />
                <Text style={{
                  fontSize: 22, fontWeight: "800",
                  color: "#dce8ff", marginTop: 8, marginBottom: 6, lineHeight: 28,
                  letterSpacing: -0.3,
                }}>
                  Rav Menashe AI
                </Text>
                {/* Conversation preview — welcoming */}
                <Text style={{ fontSize: 12, color: "#5a7aaa", marginBottom: 4, fontStyle: "italic" }}>
                  "Ask me about this week's Parashah..."
                </Text>
                <Text style={{ fontSize: 13, color: "#8aabcf", marginBottom: 20, lineHeight: 20, maxWidth: 200 }}>
                  {t.homeAITagline}
                </Text>
                <PillButton
                  label={t.homeAskRavMenashe}
                  onPress={() => router.push("/(tabs)/torah")}
                  bg={sapphireBlue}
                  fg="#ffffff"
                />
              </View>

              {/* AI orb — sapphire glow */}
              <View style={{ alignItems: "center", justifyContent: "center", marginLeft: 18 }}>
                <View style={{
                  width: 80, height: 80, borderRadius: 40,
                  backgroundColor: "rgba(99,130,255,0.16)",
                  alignItems: "center", justifyContent: "center",
                }}>
                  <View style={{
                    position: "absolute",
                    width: 56, height: 56, borderRadius: 28,
                    backgroundColor: "rgba(99,130,255,0.12)",
                  }} />
                  <Text style={{
                    fontSize: 42,
                    textShadowColor: "rgba(99,130,255,0.85)",
                    textShadowOffset: { width: 0, height: 0 },
                    textShadowRadius: 18,
                  }}>🔮</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* ─── 13. GO PREMIUM ─────────────────────────────────────────────────────── */}
      <Animated.View style={[{ marginHorizontal: HX, marginBottom: 6 }, a9]}>
        <Pressable
          style={({ pressed }) => ({
            flexDirection: "row", alignItems: "center",
            backgroundColor: cardBg,
            borderRadius: rd.xl,
            borderWidth: 1, borderColor: gold + "38",
            paddingVertical: 16, paddingHorizontal: 18,
            gap: 14,
            transform: [{ scale: pressed ? 0.98 : 1 }],
            ...shadow.level1,
          })}
          onPress={() => {}}
          accessibilityLabel={t.homeGoPremium}
          accessibilityRole="button"
        >
          <View style={{
            width: 42, height: 42, borderRadius: 21,
            backgroundColor: gold + "18", borderWidth: 1, borderColor: gold + "44",
            alignItems: "center", justifyContent: "center",
          }}>
            <Text style={{ fontSize: 20 }}>💎</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: textPrimary }}>{t.homeGoPremium}</Text>
            <Text style={{ fontSize: 12, color: textMuted, marginTop: 2, lineHeight: 18 }}>{t.homeSupportMission}</Text>
          </View>
          <PillButton
            label={t.homeViewBenefits}
            onPress={() => {}}
            bg={gold}
            fg={colors.primaryForeground}
            small
          />
        </Pressable>
      </Animated.View>
    </ScrollView>
  );
}

// ─── ZmanimBar — scannable glass bar inside Hero — Phase 3 ────────────────────

const ZmanimBar = memo(function ZmanimBar({
  todayZm, location, textPrimary, textMuted, isLight,
}: {
  todayZm:     any;
  location:    any;
  textPrimary: string;
  textMuted:   string;
  isLight:     boolean;
}) {
  const gold = isLight ? "#c8852a" : "#d4a843";
  return (
    <View style={{
      flexDirection: "row", justifyContent: "space-around",
      paddingVertical: 13, paddingHorizontal: 10,
    }}>
      {[
        { icon: "sunrise" as const, label: "Sunrise",   time: todayZm.sunrise },
        { icon: "sunset"  as const, label: "Sunset",    time: todayZm.sunset  },
        { icon: "moon"    as const, label: "Nightfall", time: todayZm.tzais   },
      ].map((z) => z.time ? (
        <View
          key={z.label}
          style={{ alignItems: "center", gap: 5 }}
          accessibilityLabel={`${z.label}: ${formatTime(z.time, location.tz)}`}
        >
          <Feather name={z.icon} size={15} color={gold} />
          <Text style={{ fontSize: 10, color: isLight ? "#8a6a40" : textMuted, fontWeight: "600" }}>{z.label}</Text>
          <Text style={{ fontSize: 16, fontWeight: "700", color: isLight ? "#1a0f00" : textPrimary }}>
            {formatTime(z.time, location.tz)}
          </Text>
        </View>
      ) : null)}
    </View>
  );
});

// ─── Today's Focus Card — Phase 2 ─────────────────────────────────────────────
// Exactly ONE priority item. Priority: Holiday > Fast > Candle > Shabbat > Omer > Upcoming > Default

const TodaysFocusCard = memo(function TodaysFocusCard({
  mode, isShabbat, isFriday, omerDay, todayHoliday, todayFast, nextHoliday,
  candleLightingTime, t,
  gold, cardBg, borderColor, textPrimary, textMuted, rd, shadow, isLight,
}: {
  mode:               "candle" | "havdalah" | "upcoming";
  isShabbat:          boolean;
  isFriday:           boolean;
  omerDay:            number | null;
  todayHoliday:       any;
  todayFast:          any;
  nextHoliday:        any;
  candleLightingTime: string | null;
  t:                  any;
  gold: string; cardBg: string; borderColor: string;
  textPrimary: string; textMuted: string;
  rd: any; shadow: any; isLight: boolean;
}) {
  let icon     = "✦";
  let title    = "";
  let subtitle = "";
  let accent   = gold;

  if (todayHoliday && !todayFast) {
    icon = "🎉"; title = todayHoliday.name; subtitle = "Observed today"; accent = gold;
  } else if (todayFast) {
    icon = "🌿"; title = todayFast.name; subtitle = "Fast day observed today"; accent = "#94a3b8";
  } else if (isFriday || mode === "candle") {
    icon = "🕯"; title = t.homeCandleLightingToday;
    subtitle = (candleLightingTime ?? "") + " · " + t.homePrepareForShabbat; accent = gold;
  } else if (isShabbat) {
    icon = "✨"; title = t.homeShabbatInProgress; subtitle = t.homeShavuaTov; accent = "#a78bfa";
  } else if (omerDay !== null) {
    icon = "🌾"; title = t.homeOmer; subtitle = `Day ${omerDay} of the Omer`; accent = "#4ade80";
  } else if (nextHoliday) {
    const daysUntil = Math.ceil((nextHoliday.date.getTime() - Date.now()) / 86_400_000);
    icon = "📅"; title = nextHoliday.name;
    subtitle = daysUntil === 1 ? "Tomorrow" : `In ${daysUntil} days`; accent = gold;
  } else {
    icon = "📖"; title = t.homeDailyTorah; subtitle = t.homeWeeklyParasha; accent = gold;
  }

  return (
    <Pressable
      style={({ pressed }) => ({
        backgroundColor: cardBg,
        borderRadius: rd.xl,
        borderWidth: 1, borderColor,
        flexDirection: "row", alignItems: "center",
        overflow: "hidden",
        transform: [{ scale: pressed ? 0.98 : 1 }],
        ...shadow.level1,
      })}
      accessibilityLabel={`Today's focus: ${title}. ${subtitle}`}
      accessibilityRole="text"
    >
      {/* Phase 2: accent strip — thicker for visual importance */}
      <View style={{ width: 5, alignSelf: "stretch", backgroundColor: accent }} />

      <View style={{ flex: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 16, gap: 14 }}>
        {/* Icon circle — 48dp touch target equivalent */}
        <View style={{
          width: 48, height: 48, borderRadius: 24,
          backgroundColor: accent + "18", borderWidth: 1, borderColor: accent + "44",
          alignItems: "center", justifyContent: "center",
        }}>
          <Text style={{ fontSize: 22 }}>{icon}</Text>
        </View>

        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 1.6, textTransform: "uppercase", color: accent, marginBottom: 4 }}>
            {t.homeTodaysFocusLabel}
          </Text>
          <Text style={{ fontSize: 16, fontWeight: "700", color: textPrimary, lineHeight: 22 }}>{title}</Text>
          <Text style={{ fontSize: 12, color: textMuted, marginTop: 2, lineHeight: 17 }}>{subtitle}</Text>
        </View>

        <Feather name="chevron-right" size={16} color={textMuted} />
      </View>
    </Pressable>
  );
});

// ─── Shabbat Countdown Card — Phase 4 ─────────────────────────────────────────
// Hierarchy: Countdown (large, dominant) → Candle Lighting → Havdalah

const ShabbatCountdownCard = memo(function ShabbatCountdownCard({
  mode, countdownMs, countdownDateStr,
  candleLightingTime, havdalahTime,
  now, t,
  gold, cardBg, borderColor, textPrimary, textMuted, rd, shadow, isLight,
}: {
  mode:               "candle" | "havdalah" | "upcoming";
  countdownMs:        number;
  countdownDateStr:   string;
  candleLightingTime: string;
  havdalahTime:       string;
  now:                number;
  t:                  any;
  gold: string; cardBg: string; borderColor: string;
  textPrimary: string; textMuted: string;
  rd: any; shadow: any; isLight: boolean;
}) {
  const accent = mode === "havdalah" ? "#a78bfa" : gold;
  const label  = mode === "havdalah" ? t.homeUntilHavdalah : t.homeUntilNextShabbatLabel;

  return (
    <View style={{
      backgroundColor: cardBg,
      borderRadius: rd.xl,
      borderWidth: 1, borderColor,
      overflow: "hidden",
      ...shadow.level2,
    }}>
      {/* Top accent line */}
      <View style={{ height: 3, backgroundColor: accent }} />

      <View style={{ padding: 20 }}>
        {/* Label */}
        <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 1.8, color: textMuted, textTransform: "uppercase", marginBottom: 8 }}>
          {label}
        </Text>

        {/* Countdown — dominant, large */}
        <Text style={{
          fontSize: 38, fontWeight: "800",
          color: accent, letterSpacing: -1, lineHeight: 44,
          marginBottom: 4,
        }}>
          {countdownMs > 0 ? formatCountdown(countdownMs) : "—"}
        </Text>

        {/* Date */}
        <Text style={{ fontSize: 12, color: textMuted, marginBottom: 20, lineHeight: 17 }}>
          {countdownDateStr}
        </Text>

        {/* Divider */}
        <View style={{ height: 1, backgroundColor: borderColor, marginBottom: 18 }} />

        {/* Candle Lighting + Havdalah — below the big number */}
        <View style={{ flexDirection: "row", gap: 24 }}>
          <View style={{ gap: 4 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={{ fontSize: 12 }}>🕯</Text>
              <Text style={{ fontSize: 11, color: textMuted, fontWeight: "600" }}>{t.homeCandleLighting}</Text>
            </View>
            <Text style={{ fontSize: 18, fontWeight: "700", color: gold }}>{candleLightingTime}</Text>
          </View>

          <View style={{ width: 1, backgroundColor: borderColor }} />

          <View style={{ gap: 4 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={{ fontSize: 12 }}>✨</Text>
              <Text style={{ fontSize: 11, color: textMuted, fontWeight: "600" }}>{t.homeHavdalah}</Text>
            </View>
            <Text style={{ fontSize: 18, fontWeight: "700", color: mode === "havdalah" ? "#a78bfa" : gold }}>
              {havdalahTime}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
});

// ─── Shared styles — Phase 9: Visual Rhythm ───────────────────────────────────

const s = StyleSheet.create({
  galleryCard: {
    padding: 20,
    borderWidth: 1,
    // Phase 11: fixed minHeight so all 3 learning cards are same family height
    minHeight: 290,
    justifyContent: "flex-start",
  },
  // Phase 6: consistent illustration container for all learning gallery cards
  illustrationContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 72,
    marginVertical: 14,
    position: "relative",
  },
  illustrationEmoji: {
    fontSize: 42,
    textAlign: "center",
  },
});
