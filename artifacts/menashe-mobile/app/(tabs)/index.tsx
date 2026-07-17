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
  Dimensions,
  ImageBackground,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
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
import { getTodayDaf, getDafProgress } from "@/lib/dafYomi";
import {
  getHebrewDate,
  formatHebrewDate,
  formatHebrewDateHebrew,
  getCurrentParasha,
  getUpcomingHolidays,
} from "@/lib/hebrewCalendar";
import { useThemeTokens } from "@/src/mobile/design-system";
import { SectionTitle } from "@/src/mobile/components/display";
import { DailyPriorityCard } from "@/src/mobile/components/cards/DailyPriorityCard";
import { hapticLight } from "@/src/mobile/lib/haptics";
import { useEntrance, useReducedMotion } from "@/src/mobile/lib/useEntrance";
import { usePressScale } from "@/src/mobile/lib/usePressScale";
import { useApp } from "@/context/AppContext";
import { useLanguage } from "@/context/LanguageContext";
import LocationPickerModal from "@/components/LocationPickerModal";

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

/* ── Hero card background rotation — crossfades between sacred-site photos ─── */
const HERO_BG_IMAGES = [
  require("../../assets/images/hero-kotel.jpg"),
  require("../../assets/images/hero-temple-mount.jpg"),
  require("../../assets/images/hero-synagogue.jpg"),
  HERO_BG,
];

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

// ─── Next-prayer resolver ─────────────────────────────────────────────────────
// Returns the next upcoming prayer and its time from today's zmanim.
// Shacharit deadline = chatzot · Mincha = minchaKetana · Maariv starts at tzais
function resolveNextPrayer(zm: {
  chatzot: Date | null; minchaKetana: Date | null; tzais: Date | null;
}): { name: string; label: string; icon: "sunrise" | "sun" | "moon"; time: Date } | null {
  const now = Date.now();
  if (zm.chatzot      && zm.chatzot.getTime()      > now)
    return { name: "Shacharit", label: "by",  icon: "sunrise", time: zm.chatzot      };
  if (zm.minchaKetana && zm.minchaKetana.getTime() > now)
    return { name: "Mincha",    label: "at",  icon: "sun",     time: zm.minchaKetana };
  if (zm.tzais        && zm.tzais.getTime()        > now)
    return { name: "Maariv",    label: "at",  icon: "moon",    time: zm.tzais        };
  return null;
}

// Subtitle copy for the upcoming-prayer bottom strip inside the dual card.
const PRAYER_SUBTITLES: Record<string, string> = {
  Shacharit: "Open the day in morning prayer",
  Mincha:    "Pause and connect in afternoon prayer",
  Maariv:    "Evening prayer opens now",
};

const TORAH_INSIGHTS = [
  { quote: "\"The Torah is a tree of life to those who hold fast to it.\"",           source: "Proverbs 3:18"       },
  { quote: "\"Who is wise? One who learns from every person.\"",                       source: "Pirkei Avot 4:1"     },
  { quote: "\"Love your neighbor as yourself\" — the entire Torah stands on this.",    source: "Leviticus 19:18"     },
  { quote: "\"In the place where a penitent stands, the righteous cannot stand.\"",   source: "Talmud, Berakhot 34b"},
  { quote: "\"G-d is present in every place, in every moment, in every thought.\"",   source: "Baal Shem Tov"       },
  { quote: "\"Turn it over again, for everything is contained within it.\"",           source: "Pirkei Avot 5:22"    },
  { quote: "\"Every day one must say: the world was created for my sake.\"",           source: "Sanhedrin 37a"       },
];

// ─── Phase 1: Hero shimmer — fades out on mount to reveal artwork ──────────────

function useHeroShimmer() {
  const reducedMotion = useReducedMotion();
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

// ─── Hero background crossfade — slow ambient rotation through sacred-site art ─
// Two stacked ImageBackground layers; the top layer fades in over the current
// one, then swaps index so the fade can repeat indefinitely. Respects Reduced
// Motion by swapping instantly instead of animating.

function HeroBackgroundCrossfade({
  images, style, children, intervalMs = 7000, fadeMs = 1400,
}: {
  images: any[];
  style?: ViewStyle;
  children?: React.ReactNode;
  intervalMs?: number;
  fadeMs?: number;
}) {
  const reducedMotion = useReducedMotion();
  const [index, setIndex]   = useState(0);
  const indexRef            = useRef(0);
  const nextOpacity         = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (images.length <= 1) return;
    const timer = setInterval(() => {
      const next = (indexRef.current + 1) % images.length;
      if (reducedMotion) {
        indexRef.current = next;
        setIndex(next);
        return;
      }
      Animated.timing(nextOpacity, {
        toValue: 1,
        duration: fadeMs,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          indexRef.current = next;
          setIndex(next);
          nextOpacity.setValue(0);
        }
      });
    }, intervalMs);
    return () => clearInterval(timer);
  }, [images.length, reducedMotion, intervalMs, fadeMs, nextOpacity]);

  const nextIndex = (index + 1) % images.length;

  return (
    <View style={style}>
      <ImageBackground
        source={images[index]}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
        accessibilityIgnoresInvertColors
      />
      {images.length > 1 && (
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFillObject, { opacity: nextOpacity }]}
        >
          <ImageBackground
            source={images[nextIndex]}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
          />
        </Animated.View>
      )}
      {children}
    </View>
  );
}

// ─── Overline label ───────────────────────────────────────────────────────────

const Overline = memo(function Overline({ text, color }: { text: string; color: string }) {
  return (
    <Text
      style={{ fontSize: 9, fontWeight: "800", letterSpacing: 1.6, textTransform: "uppercase", color }}
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
  const { scale, onPressIn, onPressOut } = usePressScale(0.96);
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



// ─── Phase 5: Quick Action items ──────────────────────────────────────────────
// Each item carries gradient stops + neon icon colour for the premium
// glassmorphic card design (neon-icon-grid, reference: uploaded mockup).

const QA_ITEMS = [
  { id: "calendar",     label: "Calendar",     icon: "calendar"  as const,
    gradientStart: "#0d2456", gradientEnd: "#1d5bbf", iconColor: "#60a5fa",
    route: "/(tabs)/calendar" },
  { id: "zmanim",       label: "Zmanim",       icon: "clock"     as const,
    gradientStart: "#251050", gradientEnd: "#6d28d9", iconColor: "#c084fc",
    route: "/(tabs)/zmanim"   },
  { id: "sanctuary",    label: "Sanctuary",    icon: "home"      as const,
    gradientStart: "#5c1f0a", gradientEnd: "#c2570a", iconColor: "#fb923c",
    route: "/sacred-memory"   },
  { id: "study",        label: "Study",        icon: "book-open" as const,
    gradientStart: "#092b1c", gradientEnd: "#047857", iconColor: "#34d399",
    route: "/(tabs)/torah"    },
  { id: "daf-yomi",     label: "Daf Yomi",     icon: "award"     as const,
    gradientStart: "#5a2d08", gradientEnd: "#b45309", iconColor: "#fbbf24",
    route: "/daf-yomi"        },
  { id: "library",      label: "Library",      icon: "book"      as const,
    gradientStart: "#2a0e52", gradientEnd: "#7c3aed", iconColor: "#a78bfa",
    route: "/siddur"          },
  { id: "prayer-board", label: "Prayer Board", icon: "users"     as const,
    gradientStart: "#082928", gradientEnd: "#0d9488", iconColor: "#2dd4bf",
    route: "/prayer-board"    },
  { id: "48-ways",      label: "48 Ways",      icon: "star"      as const,
    gradientStart: "#3d2005", gradientEnd: "#92400e", iconColor: "#f59e0b",
    route: "/mussar"          },
];

// Card geometry — computed once at module level (never changes on re-render).
const _SW        = Dimensions.get("window").width;
const QA_GAP     = 10;
const QA_H_PAD   = 16;                                          // matches HX
const QA_CARD_W  = Math.floor((_SW - QA_H_PAD * 2 - QA_GAP * 3) / 4);
const QA_TILE_S  = Math.floor(QA_CARD_W * 0.76);               // inner gradient square
const QA_CARD_H  = QA_CARD_W + 26;                             // extra room for label

const QuickActionCard = memo(function QuickActionCard({
  item,
}: {
  item: typeof QA_ITEMS[number];
}) {
  const { scale, onPressIn, onPressOut } = usePressScale(0.96);
  return (
    <Pressable
      onPress={() => router.push(item.route as any)}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      accessibilityLabel={item.label}
      accessibilityRole="button"
      style={{
        width:           QA_CARD_W,
        height:          QA_CARD_H,
        borderRadius:    22,
        // Glassmorphic dark shell
        backgroundColor: "rgba(10, 11, 22, 0.82)",
        borderWidth:     1,
        borderColor:     "rgba(255, 255, 255, 0.09)",
        alignItems:      "center",
        justifyContent:  "center",
        gap:             8,
        // Ambient drop shadow
        shadowColor:     "#000",
        shadowOffset:    { width: 0, height: 6 },
        shadowOpacity:   0.55,
        shadowRadius:    14,
        elevation:       10,
      }}
    >
      <Animated.View style={{ transform: [{ scale }], alignItems: "center", gap: 8 }}>
        {/* Gradient icon tile — iOS-app-icon aesthetic */}
        <LinearGradient
          colors={[item.gradientStart, item.gradientEnd]}
          start={{ x: 0.1, y: 0.1 }}
          end={{ x: 0.9, y: 0.9 }}
          style={{
            width:          QA_TILE_S,
            height:         QA_TILE_S,
            borderRadius:   16,
            alignItems:     "center",
            justifyContent: "center",
          }}
        >
          {/* Neon glow via iOS shadow on the icon wrapper */}
          <View style={{
            alignItems:     "center",
            justifyContent: "center",
            shadowColor:    item.iconColor,
            shadowOffset:   { width: 0, height: 0 },
            shadowOpacity:  1,
            shadowRadius:   10,
          }}>
            <Feather name={item.icon} size={28} color={item.iconColor} />
          </View>
        </LinearGradient>

        {/* Label */}
        <Text style={{
          fontSize:      11,
          fontWeight:    "600",
          color:         "rgba(255, 255, 255, 0.82)",
          textAlign:     "center",
          lineHeight:    14,
          letterSpacing: 0.1,
        }}>
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
  const { location, setLocation } = useApp();
  const [showLocationPicker, setShowLocationPicker] = React.useState(false);
  const [showDrawer, setShowDrawer] = React.useState(false);
  const drawerSlide = useRef(new Animated.Value(-300)).current;
  const drawerFade  = useRef(new Animated.Value(0)).current;

  const openDrawer = useCallback(() => {
    setShowDrawer(true);
    Animated.parallel([
      Animated.spring(drawerSlide, { toValue: 0,   useNativeDriver: true, damping: 22, stiffness: 220 }),
      Animated.timing (drawerFade,  { toValue: 1,   useNativeDriver: true, duration: 220 }),
    ]).start();
  }, [drawerSlide, drawerFade]);

  const closeDrawer = useCallback(() => {
    Animated.parallel([
      Animated.timing(drawerSlide, { toValue: -300, useNativeDriver: true, duration: 200 }),
      Animated.timing(drawerFade,  { toValue: 0,    useNativeDriver: true, duration: 180 }),
    ]).start(() => setShowDrawer(false));
  }, [drawerSlide, drawerFade]);

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

  const { hebrewGlyph, hebrewMonthYear } = useMemo(() => {
    const parts  = hebrewDateStr.split(" ");
    const dayNum = parseInt(parts[0] ?? "1", 10);
    return {
      hebrewGlyph:     HEBREW_DAY[dayNum] ?? parts[0] ?? "",
      hebrewMonthYear: parts.slice(1).join(" "),
    };
  }, [hebrewDateStr]);

  const weekDays = useMemo(() => {
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      let hebLetter = "";
      try {
        const hStr = formatHebrewDate(getHebrewDate(d));
        const dayNum = parseInt(hStr.split(" ")[0] ?? "1", 10);
        hebLetter = HEBREW_DAY[dayNum] ?? "";
      } catch { /* noop */ }
      return {
        gregNum: d.getDate(),
        hebLetter,
        isToday: d.toDateString() === today.toDateString(),
        isSaturday: i === 6,
      };
    });
  }, [today]);

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

  const gregDate = useMemo(
    () => today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }),
    [today],
  );

  // Countdown mode determined by day-of-week; actual ms computed inside ShabbatCountdownCard.
  const countdownMode: "candle" | "havdalah" | "upcoming" =
    isShabbat ? "havdalah" : isFriday ? "candle" : "upcoming";

  const countdownDateStr = useMemo(
    () => (countdownMode === "havdalah" ? saturday : friday).toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric", year: "numeric",
    }),
    [countdownMode, friday, saturday],
  );

  const todayInsight = useMemo(() => {
    const idx = Math.abs(Math.floor(today.getTime() / 86_400_000) % TORAH_INSIGHTS.length);
    return TORAH_INSIGHTS[idx];
  }, [today]);

  // Resolve the next upcoming prayer from today's zmanim
  const nextPrayer = useMemo(() => resolveNextPrayer(todayZm), [todayZm]);

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

  // RC-002 Task 3: Memorial card — theme-aware candlelight/sanctuary palette
  // (isSapphire already declared above from theme === "sapphire")
  const memGradient: readonly [string, string, string, string] = isSapphire
    ? ["#1a0e2a", "#0e0820", "#160c22", "#1a1030"]
    : ["#1c0e02", "#0e0700", "#140b00", "#1c1005"];
  const memTitleColor   = isSapphire ? "#d4c8f0" : "#f4e0c4";
  const memTaglineColor = isSapphire ? "#a898cc" : "#c4b090";
  const memOuterGlow    = isSapphire ? "rgba(99,130,255,0.12)" : "rgba(212,120,10,0.12)";
  const memInnerGlow    = isSapphire ? "rgba(99,130,255,0.07)" : "rgba(240,150,20,0.07)";
  const memCandleOuter  = isSapphire ? "rgba(99,130,255,0.14)" : "rgba(212,120,10,0.16)";
  const memCandleInner  = isSapphire ? "rgba(99,130,255,0.08)" : "rgba(240,160,30,0.10)";

  // MEP-005: staggered entrance — 40ms stagger, shared useEntrance hook
  const a0  = useEntrance(0);
  const a1  = useEntrance(40);
  const a2  = useEntrance(80);
  const a3  = useEntrance(120);
  const a4  = useEntrance(160);
  const a5  = useEntrance(200);
  const a6  = useEntrance(240);
  const a7  = useEntrance(280);
  const a8  = useEntrance(320);
  const a9  = useEntrance(360);
  const a10 = useEntrance(400);

  // Phase 1: hero shimmer
  const shimmerOpacity = useHeroShimmer();

  // Phase 9: consistent horizontal page margin
  const HX = 20;

  return (
    <>
    <ScrollView
      style={{ flex: 1, backgroundColor: pageBg }}
      contentContainerStyle={{ paddingBottom: (insets.bottom || 0) + 104 }}
      showsVerticalScrollIndicator={false}
    >

      {/* ═══════════════════════════════════════════════════════════════════════
          1. PROFILE HEADER — Premium native greeting
          Left:  Avatar · Greeting · Location (tappable)
          Right: Language toggle · Bell notification
          ═══════════════════════════════════════════════════════════════════════ */}
      <Animated.View style={[{
        paddingTop: topPad,
        paddingHorizontal: HX,
        paddingBottom: 12,
        flexDirection: "row",
        alignItems: "center",
      }, a0]}>

        {/* FAR LEFT — Hamburger nav button */}
        <TouchableOpacity
          onPress={openDrawer}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Open navigation menu"
          style={{ marginRight: 12 }}
        >
          <View style={{
            width: 40, height: 40, borderRadius: 20,
            backgroundColor: cardBg,
            borderWidth: 1, borderColor,
            alignItems: "center", justifyContent: "center",
          }}>
            <Feather name="menu" size={18} color={textPrimary} />
          </View>
        </TouchableOpacity>

        {/* LEFT — Avatar + Greeting + Location */}
        <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 13 }}>

          {/* Sacred avatar — gold ring, settable destination */}
          <TouchableOpacity
            onPress={() => router.push("/(tabs)/settings" as any)}
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel="Open settings"
          >
            <View style={{
              width: 40, height: 40, borderRadius: 20,
              backgroundColor: gold + "0f",
              borderWidth: 1.5, borderColor: gold + "50",
              alignItems: "center", justifyContent: "center",
            }}>
              <Text style={{ fontSize: 19 }}>⛩</Text>
            </View>
          </TouchableOpacity>

          {/* Greeting text + location chip stacked */}
          <View style={{ flex: 1 }}>
            <Text
              allowFontScaling={false}
              style={{
                fontSize: 17, fontWeight: "700",
                color: textPrimary, letterSpacing: -0.3,
              }}
              numberOfLines={1}
            >
              {greeting}
            </Text>
            <TouchableOpacity
              onPress={() => setShowLocationPicker(true)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Location: ${location.name}. Tap to change.`}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 3 }}>
                <Feather name="map-pin" size={10} color={gold} />
                <Text
                  allowFontScaling={false}
                  style={{ fontSize: 12, color: textMuted, fontWeight: "500" }}
                  numberOfLines={1}
                >
                  {location.name}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* RIGHT — Compact language toggle + Bell */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>

          {/* EN / TK pill toggle — compact */}
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
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: rd.pill,
                  backgroundColor: lang === l ? gold : "transparent",
                  minWidth: 36,
                  alignItems: "center",
                }}
                onPress={() => setLang(l)}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityState={{ selected: lang === l }}
                accessibilityLabel={l === "en" ? "Switch to English" : "Switch to Thadou Kuki"}
              >
                <Text
                  allowFontScaling={false}
                  style={{ fontSize: 10, fontWeight: "700", color: lang === l ? colors.primaryForeground : textMuted }}
                >
                  {l.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Bell — notification indicator */}
          <TouchableOpacity
            style={{
              width: 42, height: 42, borderRadius: 21,
              backgroundColor: cardBg,
              borderWidth: 1, borderColor,
              alignItems: "center", justifyContent: "center",
            }}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Feather name="bell" size={17} color={textPrimary} />
            <View style={{
              position: "absolute", top: 9, right: 9,
              width: 7, height: 7, borderRadius: 4,
              backgroundColor: "#fb923c",
              borderWidth: 1.5, borderColor: pageBg,
            }} />
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* ─── 3. HERO — Phase 1 ──────────────────────────────────────────────────── */}
      {/* Photo-background date card matching the Zmanim reference design */}
      <Animated.View style={[{
        marginHorizontal: HX, marginBottom: 24,
        borderRadius: 28, overflow: "hidden",
        ...shadow.level2,
      }, a1]}>
        <HeroBackgroundCrossfade
          images={HERO_BG_IMAGES}
          style={{ minHeight: 264 }}
        >
          <LinearGradient
            colors={["rgba(10,8,3,0.28)", "rgba(8,6,2,0.74)", "rgba(4,3,1,0.97)"]}
            locations={[0, 0.50, 1]}
            style={{ paddingTop: 20, paddingHorizontal: 20, paddingBottom: 20 }}
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
                <Text style={{ fontSize: 9, fontWeight: "800", letterSpacing: 1.6, color: gold }}>
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

            {/* Hebrew day glyph + big Gregorian date, side by side */}
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 14, marginBottom: 2 }}>
              <View>
                <Text style={{
                  fontSize: 40, fontWeight: "700",
                  color: gold, lineHeight: 46, letterSpacing: -0.6,
                  textShadowColor: "rgba(0,0,0,0.65)",
                  textShadowOffset: { width: 0, height: 2 },
                  textShadowRadius: 7,
                }}>
                  {hebrewGlyph}
                </Text>
                <Text style={{ fontSize: 12, fontWeight: "600", color: "rgba(220,200,160,0.78)", marginTop: 1 }}>
                  {hebrewMonthYear.split(" ")[0] ?? ""}
                </Text>
              </View>
              <View style={{
                width: 1, height: 44, backgroundColor: "rgba(255,255,255,0.15)", marginTop: 2,
              }} />
              <View>
                <Text style={{
                  fontSize: 40, fontWeight: "800",
                  color: "#8BB4FF", lineHeight: 44, letterSpacing: -1,
                  textShadowColor: "rgba(0,0,0,0.52)",
                  textShadowOffset: { width: 0, height: 1 },
                  textShadowRadius: 4,
                }}>
                  {today.getDate()}
                </Text>
                <Text style={{ fontSize: 12, fontWeight: "700", color: "#8BB4FF", letterSpacing: 1.2, marginTop: 1 }}>
                  {today.toLocaleDateString("en-US", { month: "short" }).toUpperCase()}
                </Text>
              </View>
            </View>

            {/* Hebrew + Gregorian year */}
            <Text style={{
              fontSize: 20, fontWeight: "700",
              color: "#FFFFFF", letterSpacing: -0.2,
              marginTop: 8, marginBottom: 4,
            }}>
              {hebrewMonthYear.split(" ").slice(1).join(" ")} · {today.getFullYear()}
            </Text>

            {/* Weekday + location subtitle */}
            <Text style={{
              fontSize: 11, fontWeight: "600",
              color: "rgba(220,200,160,0.78)", letterSpacing: 1.0,
              marginBottom: 18, textTransform: "uppercase",
            }} numberOfLines={1}>
              {today.toLocaleDateString("en-US", { weekday: "long" })}  ·  {location.name}
            </Text>

            {/* THIS WEEK — mini calendar strip */}
            <WeekStrip weekDays={weekDays} gold={gold} t={t} />

            {/* TODAY AT A GLANCE — zmanim timeline */}
            <GlanceTimeline todayZm={todayZm} location={location} gold={gold} t={t} isFriday={isFriday} />

            {/* READ → link */}
            <TouchableOpacity
              onPress={() => router.push("/(tabs)/torah")}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={t.homeReadLink}
              style={{ alignSelf: "flex-end", marginTop: 14 }}
            >
              <Text style={{ fontSize: 12, fontWeight: "700", color: "rgba(220,200,160,0.7)", letterSpacing: 0.4 }}>
                {t.homeReadLink.toUpperCase()} ›
              </Text>
            </TouchableOpacity>

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
        </HeroBackgroundCrossfade>
      </Animated.View>

      {/* ─── NEXT PRAYER + UPCOMING HOLIDAY — two separate cards ────────────────── */}
      <Animated.View style={[{ marginHorizontal: HX, marginBottom: 20, flexDirection: "row", gap: 10 }, a2]}>

        {/* ══ LEFT — Next Prayer: warm amber gradient card ══════════════════════ */}
        <Pressable
          onPress={() => router.push("/(tabs)/zmanim" as any)}
          accessibilityRole="button"
          accessibilityLabel={nextPrayer ? `Next prayer: ${nextPrayer.name}` : t.homeNoPrayer}
          style={{ flex: 1, borderRadius: rd.lg, overflow: "hidden" }}
        >
          <LinearGradient
            colors={["#1c0900", "#7a3500", "#d47800"]}
            start={{ x: 0.0, y: 0.0 }}
            end={{ x: 1.0, y: 1.0 }}
            style={{ minHeight: 176, padding: 14, overflow: "hidden" }}
          >
            {/* ── Large glowing amber orb behind the mosque emoji ── */}
            <View style={{
              position: "absolute",
              right: -18, top: "50%",
              width: 140, height: 140, borderRadius: 70,
              backgroundColor: "#e08800",
              opacity: 0.45,
              transform: [{ translateY: -70 }],
            }} />
            {/* Softer outer halo */}
            <View style={{
              position: "absolute",
              right: -38, top: "50%",
              width: 180, height: 180, borderRadius: 90,
              backgroundColor: "#d47800",
              opacity: 0.18,
              transform: [{ translateY: -90 }],
            }} />

            {/* ── Overline ── */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 12 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: gold }} />
              <Text style={{
                fontSize: 9, fontWeight: "800", letterSpacing: 1.5,
                textTransform: "uppercase", color: gold,
              }}>
                {t.homeNextPrayer}
              </Text>
            </View>

            {/* ── Row: text (left) + mosque emoji (right, floating on orb) ── */}
            <View style={{ flexDirection: "row", alignItems: "flex-end" }}>

              {/* Text column */}
              <View style={{ flex: 1, paddingRight: 8 }}>
                {/* Small prayer icon circle */}
                <View style={{
                  width: 40, height: 40, borderRadius: 20,
                  backgroundColor: "rgba(0,0,0,0.32)",
                  borderWidth: 1, borderColor: "rgba(255,255,255,0.14)",
                  alignItems: "center", justifyContent: "center",
                  marginBottom: 10,
                }}>
                  <Feather
                    name={nextPrayer ? nextPrayer.icon : "clock"}
                    size={17}
                    color="#f4f0e8"
                  />
                </View>

                {/* Prayer name */}
                <Text style={{
                  fontSize: 22, fontWeight: "800",
                  color: "#f4f0e8", letterSpacing: -0.3, marginBottom: 3,
                }} numberOfLines={1}>
                  {nextPrayer ? nextPrayer.name : "—"}
                </Text>

                {/* Time */}
                <Text style={{
                  fontSize: 12, color: "rgba(240,220,180,0.82)", marginBottom: 8,
                }} numberOfLines={1}>
                  {nextPrayer
                    ? `${nextPrayer.label} ${formatTime(nextPrayer.time, location.tz)}`
                    : t.homeNoPrayer}
                </Text>

                {/* Subtitle description */}
                {nextPrayer && (
                  <Text style={{
                    fontSize: 12, color: "rgba(240,220,180,0.6)",
                    lineHeight: 17, flexShrink: 1,
                  }}>
                    {PRAYER_SUBTITLES[nextPrayer.name] ?? "Open your heart in prayer"}
                  </Text>
                )}
              </View>

              {/* Mosque emoji — large, floats on the amber orb */}
              <Text style={{ fontSize: 54, marginBottom: -2 }}>🕌</Text>
            </View>
          </LinearGradient>
        </Pressable>

        {/* ══ RIGHT — Upcoming Holiday: dark navy card ══════════════════════════ */}
        <Pressable
          onPress={() => router.push("/(tabs)/calendar" as any)}
          accessibilityRole="button"
          accessibilityLabel={nextHoliday ? `Upcoming holiday: ${nextHoliday.name}` : t.homeNoHolidays}
          style={({ pressed }) => ({
            flex: 1,
            borderRadius: rd.lg,
            overflow: "hidden",
            backgroundColor: pressed ? "#0f1628" : "#0b1020",
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.08)",
            padding: 14,
            minHeight: 176,
            ...shadow.level1,
          })}
        >
          {/* Overline */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 12 }}>
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: gold }} />
            <Text style={{
              fontSize: 9, fontWeight: "800", letterSpacing: 1.5,
              textTransform: "uppercase", color: gold,
            }}>
              {t.homeUpcomingHoliday}
            </Text>
          </View>

          {/* Star of David circle */}
          <View style={{
            width: 42, height: 42, borderRadius: 21,
            backgroundColor: "rgba(255,255,255,0.06)",
            borderWidth: 1, borderColor: "rgba(255,255,255,0.10)",
            alignItems: "center", justifyContent: "center",
            marginBottom: 14,
          }}>
            <Text style={{ fontSize: 20 }}>✡️</Text>
          </View>

          {/* Holiday name */}
          <Text style={{
            fontSize: 17, fontWeight: "700",
            color: textPrimary, marginBottom: 3, letterSpacing: -0.2,
          }} numberOfLines={2}>
            {nextHoliday ? nextHoliday.name : "—"}
          </Text>

          {/* Date / empty state */}
          <Text style={{ fontSize: 12, color: textMuted, marginBottom: 0 }} numberOfLines={1}>
            {nextHoliday
              ? nextHoliday.date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })
              : t.homeNoHolidays}
          </Text>

          {/* Push footer to bottom */}
          <View style={{ flex: 1 }} />

          {/* Footer CTA */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
            <Text style={{ fontSize: 11, fontWeight: "600", color: gold }}>Calendar</Text>
            <Feather name="chevron-right" size={10} color={gold} />
          </View>
        </Pressable>

      </Animated.View>

      {/* ═══════════════════════════════════════════════════════════════════════
          3. TODAY'S DASHBOARD
          Three stacked cards as one cohesive block:
            Daily Priority → Today's Focus → Shabbat Times
          ═══════════════════════════════════════════════════════════════════════ */}

      {/* Section eyebrow label */}
      <Animated.View style={[{ paddingHorizontal: HX, marginBottom: 12 }, a2]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
          <Feather name="star" size={11} color={gold} />
          <Text
            allowFontScaling={false}
            style={{ fontSize: 10, fontWeight: "700", letterSpacing: 1.8, textTransform: "uppercase", color: gold }}
          >
            {t.homeTodaysFocusLabel}
          </Text>
        </View>
      </Animated.View>

      {/* 3a — Daily Priority — hidden when prayer is next (surfaced in dual card above) */}
      {!nextPrayer && (
        <Animated.View style={[{ marginHorizontal: HX, marginBottom: 8 }, a2]}>
          <DailyPriorityCard />
        </Animated.View>
      )}

      {/* 3b — Today's Focus (holiday / shabbat / omer / default) */}
      <Animated.View style={[{ marginHorizontal: HX, marginBottom: 8 }, a3]}>
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

      {/* 3c — Shabbat times (compact two-row card) */}
      <Animated.View style={[{ marginHorizontal: HX, marginBottom: 28 }, a4]}>
        <ShabbatCountdownCard
          mode={countdownMode}
          countdownDateStr={countdownDateStr}
          candleLightingDate={fridayZm.candleLighting ?? null}
          havdalahDate={satZm.havdalah ?? null}
          candleLightingTime={fridayZm.candleLighting ? formatTime(fridayZm.candleLighting, location.tz) : "—"}
          havdalahTime={satZm.havdalah ? formatTime(satZm.havdalah, location.tz) : "—"}
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

      {/* ═══════════════════════════════════════════════════════════════════════
          4. QUICK ACTIONS — 8-icon grid, web position: immediately after today
          ═══════════════════════════════════════════════════════════════════════ */}
      <Animated.View style={[{ marginBottom: 6 }, a5]}>
        <SectionTitle
          eyebrow={t.homeQuickActionsTitle}
          leadingIcon={<Feather name="grid" size={13} color={gold} />}
          style={{ paddingHorizontal: HX, marginTop: 0 }}
        />
      </Animated.View>
      <Animated.View style={[{ marginHorizontal: QA_H_PAD, marginBottom: 28 }, a5]}>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: QA_GAP }}>
          {QA_ITEMS.map((item) => (
            <QuickActionCard key={item.id} item={item} />
          ))}
        </View>
      </Animated.View>

      {/* ─── 6. SACRED TIME — Phase 3 ───────────────────────────────────────────── */}
      <Animated.View style={[{ marginBottom: 24 }, a5]}>
        <SectionTitle
          eyebrow={t.homeSacredTimeLabel}
          leadingIcon={<Feather name="clock" size={13} color={gold} />}
          actionLabel={t.homeAllTimesLocal}
          onAction={() => router.push("/(tabs)/zmanim")}
          style={{ paddingHorizontal: HX, marginTop: 0 }}
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
            const nowMs    = Date.now();
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

      {/* ─── 7. LEARNING EXPERIENCE — Phase 6 ──────────────────────────────────── */}
      {/* All 3 cards: one visual family — same overline · illustration · CTA style */}
      <Animated.View style={[{ marginBottom: 24 }, a7]}>
        <SectionTitle
          eyebrow={t.homeLearningLabel}
          leadingIcon={<Feather name="book-open" size={13} color={gold} />}
          style={{ paddingHorizontal: HX, marginTop: 0 }}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: HX, gap: 12 }}
        >
          {/* ── Parasha card ── */}
          <Pressable
            style={({ pressed }) => ({
              width: 220, borderRadius: rd.lg, overflow: "hidden",
              transform: [{ scale: pressed ? 0.982 : 1 }],
              ...shadow.level2,
            })}
            onPress={() => router.push("/(tabs)/torah")}
            accessibilityLabel={`Weekly Parasha: ${parasha || "loading"}`}
            accessibilityRole="button"
          >
            <View style={[s.galleryCard, { backgroundColor: cardBg, borderColor, borderRadius: rd.lg }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <Feather name="book" size={11} color={gold} />
                <Overline text={t.homeParashah} color={gold} />
              </View>
              <Text style={{ fontSize: 18, fontWeight: "700", color: textPrimary, lineHeight: 24 }} numberOfLines={2}>
                {parasha !== "" ? `Parashat ${parasha}` : "—"}
              </Text>
              <Text style={{ fontSize: 13, color: textMuted, marginTop: 4, fontStyle: "italic", flex: 1 }} numberOfLines={2}>
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

          {/* ── Torah Insight card ── */}
          <View style={{ width: 220, borderRadius: rd.lg, overflow: "hidden", ...shadow.level2 }}>
            <View style={[s.galleryCard, { backgroundColor: cardBg, borderColor, borderRadius: rd.lg }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <Feather name="zap" size={11} color="#E67E22" />
                <Overline text={t.homeInsightTitle} color="#E67E22" />
              </View>
              <Text style={{ fontSize: 14, fontStyle: "italic", color: textSecondary, lineHeight: 22, flex: 1 }} numberOfLines={5}>
                {todayInsight.quote}
              </Text>
              <Text style={{ fontSize: 11, fontWeight: "600", color: textMuted, marginBottom: 12, marginTop: 8 }} numberOfLines={1}>
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
              width: 220, borderRadius: rd.lg, overflow: "hidden",
              transform: [{ scale: pressed ? 0.982 : 1 }],
              ...shadow.level2,
            })}
            onPress={() => router.push("/daf-yomi")}
            accessibilityLabel={`Daf Yomi: ${daf.tractate}, page ${daf.daf}`}
            accessibilityRole="button"
          >
            <View style={[s.galleryCard, { backgroundColor: cardBg, borderColor, borderRadius: rd.lg }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <Feather name="award" size={11} color="#E67E22" />
                <Overline text={t.homeDafYomi} color="#E67E22" />
              </View>
              <Text style={{ fontSize: 18, fontWeight: "700", color: textPrimary, lineHeight: 24 }} numberOfLines={1}>
                {daf.tractate}
              </Text>
              <Text style={{ fontSize: 13, color: textMuted, marginTop: 4, flex: 1 }} numberOfLines={2}>
                {t.homeDafYomiToday} · {t.homeDafYomi} {daf.daf}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 }}>
                <View style={{
                  width: 28, height: 28, borderRadius: 14,
                  backgroundColor: successColor + "18",
                  borderWidth: 1, borderColor: successColor + "60",
                  alignItems: "center", justifyContent: "center",
                }}>
                  <Text style={{ fontSize: 8, fontWeight: "700", color: successColor }}>{dafProgress}%</Text>
                </View>
                <Text style={{ fontSize: 11, color: successColor, fontWeight: "600" }}>{dafProgress}% complete</Text>
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

      {/* ─── 10. COMMUNITY PREVIEW ──────────────────────────────────────────────── */}
      <Animated.View style={[{ marginHorizontal: HX, marginBottom: 20 }, a8]}>
        <Pressable
          style={({ pressed }) => ({
            backgroundColor: cardBg, borderRadius: rd.lg, borderWidth: 1, borderColor,
            flexDirection: "row", alignItems: "center",
            paddingHorizontal: 16, paddingVertical: 14, gap: 12,
            transform: [{ scale: pressed ? 0.98 : 1 }],
            ...shadow.level1,
          })}
          onPress={() => router.push("/(tabs)/community")}
          accessibilityLabel={t.homeCommunityPreviewTitle}
          accessibilityRole="button"
        >
          <View style={{
            width: 44, height: 44, borderRadius: 22,
            backgroundColor: successColor + "0f",
            borderWidth: 1, borderColor: successColor + "30",
            alignItems: "center", justifyContent: "center",
          }}>
            <Feather name="users" size={18} color={successColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: textPrimary }}>{t.homeCommunityPreviewTitle}</Text>
            <Text style={{ fontSize: 13, color: textMuted, marginTop: 2, lineHeight: 19 }}>{t.homeCommunityPreviewDesc}</Text>
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
      }, a9]}>
        <TouchableOpacity
          onPress={() => router.push("/sacred-memory")}
          activeOpacity={0.92}
          accessibilityLabel="Enter Memorial Sanctuary"
          accessibilityHint="Opens the Sacred Memory experience"
          accessibilityRole="button"
        >
          <LinearGradient
            colors={memGradient}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ minHeight: 212, padding: 24 }}
          >
            {/* Layered warm candlelight glow */}
            <View style={{
              position: "absolute", top: -32, right: -32,
              width: 160, height: 160, borderRadius: 80,
              backgroundColor: memOuterGlow,
            }} />
            <View style={{
              position: "absolute", top: -10, right: -10,
              width: 90, height: 90, borderRadius: 45,
              backgroundColor: memInnerGlow,
            }} />

            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{ flex: 1 }}>
                <Overline text={t.homeMemorialTitle} color={gold} />
                <Text style={{
                  fontSize: 22, fontWeight: "800",
                  color: memTitleColor, marginTop: 8, marginBottom: 8, lineHeight: 28,
                  letterSpacing: -0.3,
                }}>
                  Memorial Sanctuary
                </Text>
                <Text style={{ fontSize: 13, color: memTaglineColor, marginBottom: 20, lineHeight: 20, maxWidth: 200 }}>
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
                  backgroundColor: memCandleOuter,
                  alignItems: "center", justifyContent: "center",
                }}>
                  <View style={{
                    position: "absolute",
                    width: 56, height: 56, borderRadius: 28,
                    backgroundColor: memCandleInner,
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
      }, a10]}>
        <TouchableOpacity
          onPress={() => router.push("/(tabs)/torah")}
          activeOpacity={0.92}
          accessibilityLabel="Ask Rav Menashe AI"
          accessibilityHint="Opens the AI Torah guide"
          accessibilityRole="button"
        >
          <LinearGradient
            colors={["#03091a", "#07122e", "#0c1e4a", "#07112a"]}
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

      {/* ─── GO PREMIUM ─────────────────────────────────────────────────────── */}
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
    <LocationPickerModal
      visible={showLocationPicker}
      current={location}
      onSelect={(loc) => {
        setLocation(loc);
        setShowLocationPicker(false);
      }}
      onClose={() => setShowLocationPicker(false)}
    />

    {/* ─── Navigation Drawer ──────────────────────────────────────────────────── */}
    <Modal
      visible={showDrawer}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={closeDrawer}
      accessibilityViewIsModal
    >
      {/* Dim overlay — tap to close */}
      <Animated.View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.55)",
          opacity: drawerFade,
        }}
      >
        <Pressable style={{ flex: 1 }} onPress={closeDrawer} accessibilityLabel="Close menu" />
      </Animated.View>

      {/* Slide-in panel */}
      <Animated.View style={{
        position: "absolute",
        top: 0, left: 0, bottom: 0,
        width: 288,
        backgroundColor: pageBg,
        borderRightWidth: 1,
        borderRightColor: borderColor,
        transform: [{ translateX: drawerSlide }],
        paddingTop: (insets.top || 0) + 12,
        paddingBottom: (insets.bottom || 0) + 24,
      }}>

        {/* ── Brand Header ─────────────────────────────── */}
        <View style={{
          paddingHorizontal: 20,
          paddingBottom: 20,
          borderBottomWidth: 1,
          borderBottomColor: borderColor,
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
        }}>
          <View style={{
            width: 48, height: 48, borderRadius: 24,
            backgroundColor: gold + "14",
            borderWidth: 1.5, borderColor: gold + "40",
            alignItems: "center", justifyContent: "center",
          }}>
            <Text style={{ fontSize: 22 }}>⛩</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{
              fontSize: 15, fontWeight: "800",
              color: gold, letterSpacing: 0.8,
            }}>
              BNEI MENASHE
            </Text>
            <Text style={{ fontSize: 11, color: textMuted, marginTop: 1 }}>
              Sacred Calendar
            </Text>
          </View>
          {/* Close X */}
          <TouchableOpacity
            onPress={closeDrawer}
            accessibilityRole="button"
            accessibilityLabel="Close menu"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Feather name="x" size={20} color={textMuted} />
          </TouchableOpacity>
        </View>

        {/* ── Nav Links ────────────────────────────────── */}
        <View style={{ flex: 1, paddingTop: 12, paddingHorizontal: 12 }}>
          {([
            { icon: "home",      label: "Home",         route: "/(tabs)/"          },
            { icon: "clock",     label: "Zmanim",       route: "/(tabs)/zmanim"    },
            { icon: "calendar",  label: "Calendar",     route: "/(tabs)/calendar"  },
            { icon: "book-open", label: "Prayer Board", route: "/(tabs)/prayer"    },
            { icon: "users",     label: "Community",    route: "/(tabs)/community" },
          ] as { icon: string; label: string; route: string }[]).map((item) => (
            <TouchableOpacity
              key={item.route}
              onPress={() => {
                closeDrawer();
                setTimeout(() => router.push(item.route as any), 220);
              }}
              accessibilityRole="menuitem"
              accessibilityLabel={item.label}
              activeOpacity={0.7}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 14,
                paddingHorizontal: 14,
                paddingVertical: 14,
                borderRadius: 12,
                marginBottom: 2,
              }}
            >
              <View style={{
                width: 36, height: 36, borderRadius: 10,
                backgroundColor: cardBg,
                borderWidth: 1, borderColor,
                alignItems: "center", justifyContent: "center",
              }}>
                <Feather name={item.icon as any} size={17} color={gold} />
              </View>
              <Text style={{
                fontSize: 15, fontWeight: "600",
                color: textPrimary, letterSpacing: -0.1,
              }}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Bottom — Settings + Version ──────────────── */}
        <View style={{
          paddingHorizontal: 12,
          paddingTop: 12,
          borderTopWidth: 1,
          borderTopColor: borderColor,
        }}>
          <TouchableOpacity
            onPress={() => {
              closeDrawer();
              setTimeout(() => router.push("/(tabs)/settings" as any), 220);
            }}
            accessibilityRole="menuitem"
            accessibilityLabel="Settings"
            activeOpacity={0.7}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
              paddingHorizontal: 14,
              paddingVertical: 14,
              borderRadius: 12,
            }}
          >
            <View style={{
              width: 36, height: 36, borderRadius: 10,
              backgroundColor: cardBg,
              borderWidth: 1, borderColor,
              alignItems: "center", justifyContent: "center",
            }}>
              <Feather name="settings" size={17} color={textMuted} />
            </View>
            <Text style={{
              fontSize: 15, fontWeight: "600",
              color: textMuted, letterSpacing: -0.1,
            }}>
              Settings
            </Text>
          </TouchableOpacity>

          <Text style={{
            fontSize: 11, color: textMuted,
            textAlign: "center",
            marginTop: 8,
            opacity: 0.5,
            letterSpacing: 0.3,
          }}>
            Menashe Calendar · v1.0
          </Text>
        </View>

      </Animated.View>
    </Modal>

    </>
  );
}

// ─── Week Strip — "THIS WEEK" mini calendar row inside Hero ───────────────────

const DAY_ABBR = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

const WeekStrip = memo(function WeekStrip({
  weekDays, gold, t,
}: {
  weekDays: Array<{ gregNum: number; hebLetter: string; isToday: boolean; isSaturday: boolean }>;
  gold: string;
  t: any;
}) {
  return (
    <View style={{
      backgroundColor: "rgba(255,255,255,0.05)",
      borderRadius: 16,
      borderWidth: 1, borderColor: "rgba(255,255,255,0.09)",
      padding: 14, marginBottom: 12,
    }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Feather name="calendar" size={12} color={gold} />
          <Text allowFontScaling={false} style={{ fontSize: 10, fontWeight: "800", letterSpacing: 1.4, color: "rgba(240,220,160,0.82)" }}>
            {t.homeThisWeekLabel.toUpperCase()}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push("/(tabs)/calendar")}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t.homeCalendarLink}
        >
          <Text style={{ fontSize: 12, fontWeight: "700", color: gold }}>{t.homeCalendarLink} →</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        {weekDays.map((d, i) => (
          <View
            key={i}
            style={[
              { alignItems: "center", gap: 4, paddingVertical: 6, paddingHorizontal: 6, borderRadius: 12, minWidth: 34 },
              d.isToday ? { borderWidth: 1.5, borderColor: gold, backgroundColor: "rgba(212,168,67,0.12)" } : null,
              !d.isToday && d.isSaturday ? { backgroundColor: "rgba(147,112,255,0.14)" } : null,
            ]}
          >
            <Text style={{ fontSize: 9, fontWeight: "700", letterSpacing: 0.5, color: d.isToday ? gold : "rgba(220,200,170,0.6)" }}>
              {DAY_ABBR[i]}
            </Text>
            <Text style={{ fontSize: 15, fontWeight: "800", color: d.isToday ? gold : d.isSaturday ? "#c4b0ff" : "#F0E6C0" }}>
              {d.gregNum}
            </Text>
            <Text style={{ fontSize: 10, color: d.isToday ? gold : "rgba(220,200,170,0.55)" }}>
              {d.hebLetter}
            </Text>
            {d.isToday && <View style={{ width: 14, height: 2, borderRadius: 1, backgroundColor: gold, marginTop: 1 }} />}
          </View>
        ))}
      </View>
    </View>
  );
});

// ─── Glance Timeline — "TODAY AT A GLANCE" zmanim strip inside Hero ───────────

const GlanceTimeline = memo(function GlanceTimeline({
  todayZm, location, gold, t, isFriday,
}: {
  todayZm: any;
  location: any;
  gold: string;
  t: any;
  isFriday: boolean;
}) {
  const stops = [
    { key: "dawn",    icon: "sunrise" as const, time: todayZm.alotHaShachar, above: false },
    { key: "sunrise", icon: "sun"     as const, time: todayZm.sunrise,       above: true  },
    { key: "midday",  icon: "book-open" as const, time: todayZm.chatzot,     above: false },
    { key: "mincha",  icon: "clock"   as const, time: todayZm.minchaKetana,  above: true  },
    { key: "sunset",  icon: isFriday ? "star" as const : "sunset" as const,
      time: isFriday ? todayZm.candleLighting : todayZm.sunset,               above: false },
    { key: "night",   icon: "moon"    as const, time: todayZm.tzais,         above: true  },
  ];

  const validTimes = stops.map((s) => s.time).filter(Boolean) as Date[];
  const rangeStart = validTimes[0]?.getTime() ?? 0;
  const rangeEnd   = validTimes[validTimes.length - 1]?.getTime() ?? 1;
  const nowMs      = Date.now();
  const nowFrac    = rangeEnd > rangeStart
    ? Math.min(1, Math.max(0, (nowMs - rangeStart) / (rangeEnd - rangeStart)))
    : 0;
  const nowVisible  = nowMs >= rangeStart && nowMs <= rangeEnd;

  return (
    <View style={{
      backgroundColor: "rgba(255,255,255,0.05)",
      borderRadius: 16,
      borderWidth: 1, borderColor: "rgba(255,255,255,0.09)",
      padding: 14, paddingTop: 16,
    }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <Feather name="clock" size={12} color={gold} />
          <Text allowFontScaling={false} style={{ fontSize: 10, fontWeight: "800", letterSpacing: 1.4, color: "rgba(240,220,160,0.82)" }}>
            {t.homeGlanceLabel.toUpperCase()}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push("/(tabs)/zmanim")}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t.homeFullZmanimLink}
        >
          <Text style={{ fontSize: 12, fontWeight: "700", color: gold }}>{t.homeFullZmanimLink} →</Text>
        </TouchableOpacity>
      </View>

      {/* Above-line labels */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 2, marginBottom: 6, height: 28 }}>
        {stops.map((s) => (
          <View key={s.key + "-top"} style={{ width: 1, alignItems: "center" }}>
            {s.above && s.time ? (
              <>
                <Feather name={s.icon} size={11} color={gold} style={{ marginBottom: 2 }} />
                <Text style={{ fontSize: 10, fontWeight: "700", color: "#F0E6C0" }} numberOfLines={1}>
                  {formatTime(s.time, location.tz)}
                </Text>
              </>
            ) : null}
          </View>
        ))}
      </View>

      {/* Gradient line + dots */}
      <View style={{ height: 20, justifyContent: "center" }}>
        <LinearGradient
          colors={["#60a5fa", "#f0c050", "#fb7185"]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={{ height: 2, borderRadius: 1, marginHorizontal: 8 }}
        />
        <View style={{
          position: "absolute", left: 0, right: 0, top: 0, bottom: 0,
          flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 4,
        }}>
          {stops.map((s) => (
            <View
              key={s.key + "-dot"}
              style={{
                width: 9, height: 9, borderRadius: 4.5,
                backgroundColor: s.time ? gold : "rgba(255,255,255,0.25)",
                borderWidth: 2, borderColor: "#0a0805",
              }}
            />
          ))}
        </View>
        {nowVisible && (
          <View
            pointerEvents="none"
            style={{
              position: "absolute", top: -3,
              left: `${8 + nowFrac * 84}%`,
              width: 14, height: 14, borderRadius: 7,
              backgroundColor: gold,
              borderWidth: 2, borderColor: "#0a0805",
              shadowColor: gold, shadowOpacity: 0.9, shadowRadius: 6, shadowOffset: { width: 0, height: 0 },
            }}
          />
        )}
      </View>

      {/* Below-line labels */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 2, marginTop: 6 }}>
        {stops.map((s) => (
          <View key={s.key + "-bottom"} style={{ width: 1, alignItems: "center" }}>
            {!s.above && s.time ? (
              <>
                <Feather name={s.icon} size={11} color="rgba(220,200,160,0.75)" style={{ marginBottom: 2 }} />
                <Text style={{ fontSize: 10, fontWeight: "600", color: "rgba(220,200,160,0.75)" }} numberOfLines={1}>
                  {formatTime(s.time, location.tz)}
                </Text>
              </>
            ) : null}
          </View>
        ))}
      </View>

      {nowVisible && (
        <Text style={{ fontSize: 10, fontWeight: "700", color: gold, textAlign: "center", marginTop: 10, letterSpacing: 0.3 }}>
          {t.homeNowLabel.toUpperCase()} · {formatTime(new Date(nowMs), location.tz)}
        </Text>
      )}
    </View>
  );
});

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

// ─── Shabbat Countdown Card — compact two-row design ──────────────────────────
// Small, clear, professional. Left gold stripe → two info rows → countdown pill.

const ShabbatCountdownCard = memo(function ShabbatCountdownCard({
  mode, countdownDateStr,
  candleLightingDate, havdalahDate,
  candleLightingTime, havdalahTime,
  t,
  gold, cardBg, borderColor, textPrimary, textMuted, rd, shadow, isLight,
}: {
  mode:               "candle" | "havdalah" | "upcoming";
  countdownDateStr:   string;
  candleLightingDate: Date | null;
  havdalahDate:       Date | null;
  candleLightingTime: string;
  havdalahTime:       string;
  t:                  any;
  gold: string; cardBg: string; borderColor: string;
  textPrimary: string; textMuted: string;
  rd: any; shadow: any; isLight: boolean;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const havdalahAccent = "#a78bfa";
  const targetDate     = mode === "havdalah" ? havdalahDate : candleLightingDate;
  const countdownMs    = targetDate ? Math.max(0, targetDate.getTime() - now) : 0;
  const showCountdown  = countdownMs > 0;

  return (
    <View
      style={{
        backgroundColor: cardBg,
        borderRadius: rd.xl,
        borderWidth: 1, borderColor,
        flexDirection: "row",
        overflow: "hidden",
        ...shadow.level1,
      }}
    >
      {/* Left accent stripe — gold for candle/upcoming, violet for havdalah */}
      <View
        style={{
          width: 4,
          backgroundColor: mode === "havdalah" ? havdalahAccent : gold,
        }}
      />

      {/* Main content */}
      <View style={{ flex: 1, paddingHorizontal: 14, paddingVertical: 12, gap: 10 }}>

        {/* Row 1 — Candle Lighting */}
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View
            style={{
              width: 28, height: 28, borderRadius: 14,
              backgroundColor: gold + "18",
              alignItems: "center", justifyContent: "center",
              marginRight: 10,
            }}
          >
            <Text style={{ fontSize: 14 }}>🕯</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text
              allowFontScaling={false}
              style={{ fontSize: 9, fontWeight: "700", letterSpacing: 1.8, color: textMuted, textTransform: "uppercase" }}
            >
              {t.homeCandleLighting}
            </Text>
            <Text
              allowFontScaling={false}
              style={{ fontSize: 16, fontWeight: "700", color: gold, marginTop: 1 }}
            >
              {candleLightingTime}
            </Text>
          </View>
          {/* Countdown badge — shown only when approaching candle lighting */}
          {showCountdown && mode !== "havdalah" && (
            <View
              style={{
                backgroundColor: gold + "18",
                borderWidth: 1, borderColor: gold + "40",
                borderRadius: 9999,
                paddingHorizontal: 10, paddingVertical: 4,
              }}
            >
              <Text
                allowFontScaling={false}
                style={{ fontSize: 11, fontWeight: "700", color: gold }}
              >
                {formatCountdown(countdownMs)}
              </Text>
            </View>
          )}
        </View>

        {/* Thin divider */}
        <View style={{ height: 1, backgroundColor: borderColor, marginLeft: 38 }} />

        {/* Row 2 — Havdalah */}
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View
            style={{
              width: 28, height: 28, borderRadius: 14,
              backgroundColor: havdalahAccent + "18",
              alignItems: "center", justifyContent: "center",
              marginRight: 10,
            }}
          >
            <Text style={{ fontSize: 14 }}>✨</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text
              allowFontScaling={false}
              style={{ fontSize: 9, fontWeight: "700", letterSpacing: 1.8, color: textMuted, textTransform: "uppercase" }}
            >
              {t.homeHavdalah}
            </Text>
            <Text
              allowFontScaling={false}
              style={{ fontSize: 16, fontWeight: "700", color: havdalahAccent, marginTop: 1 }}
            >
              {havdalahTime}
            </Text>
          </View>
          {/* Countdown badge — shown when in havdalah mode */}
          {showCountdown && mode === "havdalah" && (
            <View
              style={{
                backgroundColor: havdalahAccent + "18",
                borderWidth: 1, borderColor: havdalahAccent + "40",
                borderRadius: 9999,
                paddingHorizontal: 10, paddingVertical: 4,
              }}
            >
              <Text
                allowFontScaling={false}
                style={{ fontSize: 11, fontWeight: "700", color: havdalahAccent }}
              >
                {formatCountdown(countdownMs)}
              </Text>
            </View>
          )}
        </View>

      </View>
    </View>
  );
});

// ─── Shared styles — Phase 9: Visual Rhythm ───────────────────────────────────

const s = StyleSheet.create({
  galleryCard: {
    padding: 16,
    borderWidth: 1,
    minHeight: 228,
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
