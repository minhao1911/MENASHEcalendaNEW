/**
 * SPR-M010 — Sacred Study Experience  [MEP-107 visual upgrade]
 * Mobile "Sacred Study" screen — where daily Jewish learning becomes a habit.
 *
 * NOT a document reader. NOT a content list. A calm, focused study hall:
 * Hero → Continue Learning → Weekly Parashah → Daf Yomi → Siddur →
 * Torah Insights → Reflection → Study Collections.
 *
 * Architecture rules (SPR-M010 / MEP-107):
 *   ✓ Web untouched              ✓ Shared Core reused (Parashah engine)
 *   ✓ Torah/Siddur/Daf Yomi engines reused, not duplicated
 *   ✓ Mobile Shell reused        ✓ MMDL reused        ✓ MEL followed
 *   ✓ MEP-107: presentation-only upgrade — no logic changes
 */

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  Text,
  UIManager,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";

import { useThemeTokens } from "@/src/mobile/design-system";
import { useEntrance, useReducedMotion } from "@/src/mobile/lib/useEntrance";
import { usePressScale } from "@/src/mobile/lib/usePressScale";
import { useLanguage } from "@/context/LanguageContext";
import { storageGet, storageSet } from "@/lib/storageUtils";
import { getCurrentParashaInfo, type ParashaInfo } from "@/lib/hebrewCalendar";
import { getTodayDaf, getSefariaDafUrl } from "@/lib/dafYomi";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Local content — presentation only, not calendar/torah logic ─────────────

const LAST_STUDY_KEY = "menashe-last-study";
const STUDY_HISTORY_KEY = "menashe-study-history";
const MAX_HISTORY = 30;

interface LastStudy {
  label: string;
  route: string;
  params?: Record<string, string>;
  at: number;
}

/** Gentle, non-competitive learning stats derived purely from local study history. */
function computeJourneyStats(history: LastStudy[]) {
  const now = new Date();
  const startOfDay = (t: number) => {
    const d = new Date(t);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };
  const startOfWeek = (() => {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - d.getDay());
    return d.getTime();
  })();

  const studyDays = new Set(history.map((h) => startOfDay(h.at))).size;
  const lessonsCompleted = history.length;
  const thisWeek = history.filter((h) => h.at >= startOfWeek).length;

  return { studyDays, lessonsCompleted, thisWeek };
}

const TORAH_INSIGHTS = [
  { title: "Why We Study Daily", body: "The sages teach that Torah study is compared to fire — a small daily spark, tended consistently, grows into a light that guides a lifetime. It is not the length of study that matters most, but its constancy." },
  { title: "The Value of One Verse", body: "Ben Bag Bag said of the Torah: 'Turn it over, and turn it over, for everything is in it.' A single verse studied with full attention can illuminate an entire day." },
  { title: "Learning as Relationship", body: "Study is not merely acquiring information — it is entering into conversation with those who came before us, and with the One who gave the Torah at Sinai." },
  { title: "Small Steps, Real Progress", body: "Rabbi Tarfon taught: 'It is not your duty to finish the work, but neither are you free to desist from it.' Every page read, every insight gained, is complete in itself." },
];

const REFLECTIONS = [
  { thought: "Study is not a task to complete, but a relationship to nurture — one page, one insight, one day at a time.", source: "Jewish Wisdom" },
  { thought: "Set a fixed time for Torah study, and it will become the axis around which your day turns.", source: "Pirkei Avot 1:15" },
  { thought: "A little learning that is truly your own is worth more than a great deal that is borrowed.", source: "Jewish Wisdom" },
  { thought: "The words of Torah are compared to water — they seek the lowest place, the humble heart.", source: "Taanit 7a" },
];

function getDailyIndex(len: number): number {
  const today = new Date();
  const dayNum = Math.floor(today.getTime() / 86_400_000);
  return Math.abs(dayNum % len);
}

function estimateReadingMinutes(text: string): number {
  const words = text.trim().split(/\s+/).length;
  return Math.max(2, Math.round(words / 130));
}

function slugifyParasha(name: string): string {
  return name.toLowerCase().replace(/[' ]+/g, "-").replace(/[^a-z0-9-]/g, "");
}

/** Book-opening entrance — gentle scaleY + opacity, used once for the Hero. */
function useBookOpen(reducedMotion: boolean) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scaleY = useRef(new Animated.Value(reducedMotion ? 1 : 0.9)).current;
  useEffect(() => {
    const duration = reducedMotion ? 0 : 520;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration, useNativeDriver: true }),
      Animated.timing(scaleY, { toValue: 1, duration, useNativeDriver: true }),
    ]).start();
  }, [opacity, scaleY, reducedMotion]);
  return { opacity, transform: [{ scaleY }] } as any;
}

// ─── Premium Section Header ───────────────────────────────────────────────────

const SectionHeader = memo(function SectionHeader({
  icon, label, gold, muted, actionLabel, onAction,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  gold: string;
  muted: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 18 }}>
      <View style={{
        width: 32, height: 32, borderRadius: 10,
        backgroundColor: gold + "1e",
        borderWidth: 1, borderColor: gold + "38",
        alignItems: "center", justifyContent: "center",
      }}>
        <Feather name={icon} size={14} color={gold} />
      </View>
      <Text style={{
        fontSize: 10, fontWeight: "800", letterSpacing: 2.2,
        color: gold, textTransform: "uppercase", flex: 1,
      }}>
        {label}
      </Text>
      {actionLabel && onAction && (
        <Pressable onPress={onAction} hitSlop={12} accessibilityRole="button" accessibilityLabel={actionLabel}>
          <View style={{
            flexDirection: "row", alignItems: "center", gap: 4,
            backgroundColor: gold + "12",
            borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4,
            borderWidth: 1, borderColor: gold + "28",
          }}>
            <Text style={{ fontSize: 11, fontWeight: "700", color: gold }}>{actionLabel}</Text>
            <Feather name="arrow-right" size={10} color={gold} />
          </View>
        </Pressable>
      )}
    </View>
  );
});

// ─── Study Collection tile (memoized — grid never re-renders idle tiles) ─────

interface CollectionTileProps {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  sub: string;
  color: string;
  colors: ReturnType<typeof useThemeTokens>["colors"];
  rd: ReturnType<typeof useThemeTokens>["rd"];
  sp: ReturnType<typeof useThemeTokens>["sp"];
  type: ReturnType<typeof useThemeTokens>["type"];
  onPress: () => void;
}

const CollectionTile = memo(function CollectionTile({
  icon, label, sub, color, colors, rd, sp, type, onPress,
}: CollectionTileProps) {
  const { scale, onPressIn, onPressOut } = usePressScale(0.96);
  return (
    <Animated.View style={{ width: "48%", transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${sub}`}
        style={{
          backgroundColor: colors.card,
          borderRadius: rd.lg,
          borderWidth: 1,
          borderColor: color + "28",
          padding: sp[4],
          minHeight: 120,
          justifyContent: "space-between",
          shadowColor: color,
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.12,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        <View style={{
          width: 44, height: 44, borderRadius: 13,
          backgroundColor: color + "1c",
          borderWidth: 1, borderColor: color + "28",
          alignItems: "center", justifyContent: "center",
        }}>
          <Feather name={icon} size={19} color={color} />
        </View>
        <View style={{ gap: 3 }}>
          <Text style={[type.label, { color: colors.textPrimary, fontSize: 14 }]}>{label}</Text>
          <Text style={[type.caption, { color: colors.textMuted, marginTop: 1 }]} numberOfLines={1}>{sub}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
});

// ─── Daily Learning Card ──────────────────────────────────────────────────────

interface DailyLearningCardProps {
  emoji: string;
  accent: string;
  title: string;
  subtitle: string;
  badge?: string;
  colors: ReturnType<typeof useThemeTokens>["colors"];
  onPress: () => void;
}

const DailyLearningCard = memo(function DailyLearningCard({
  emoji, accent, title, subtitle, badge, colors, onPress,
}: DailyLearningCardProps) {
  const { scale, onPressIn, onPressOut } = usePressScale(0.97);
  return (
    <Animated.View style={{ transform: [{ scale }], marginBottom: 10 }}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="button"
        accessibilityLabel={`${title}: ${subtitle}`}
        style={{
          backgroundColor: colors.card,
          borderRadius: 20,
          borderWidth: 1,
          borderColor: accent + "28",
          padding: 18,
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
          shadowColor: accent,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.16,
          shadowRadius: 12,
          elevation: 4,
        }}
      >
        {/* Icon orb */}
        <View style={{
          width: 54, height: 54, borderRadius: 27,
          backgroundColor: accent + "1c",
          borderWidth: 1.5, borderColor: accent + "38",
          alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <Text style={{ fontSize: 26 }}>{emoji}</Text>
        </View>

        {/* Text */}
        <View style={{ flex: 1, gap: 4 }}>
          {badge && (
            <Text style={{
              fontSize: 9, fontWeight: "800", letterSpacing: 1.8,
              color: accent, textTransform: "uppercase",
            }}>
              {badge}
            </Text>
          )}
          <Text style={{ fontSize: 16, fontWeight: "700", color: colors.textPrimary, letterSpacing: -0.3 }}>
            {title}
          </Text>
          <Text style={{ fontSize: 13, color: colors.textMuted, lineHeight: 18 }} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>

        {/* CTA pill */}
        <View style={{
          backgroundColor: accent + "1c",
          borderWidth: 1, borderColor: accent + "38",
          borderRadius: 12,
          paddingHorizontal: 13, paddingVertical: 8,
        }}>
          <Text style={{ fontSize: 11, fontWeight: "800", color: accent }}>Open</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
});

// ─── Library Category Card ────────────────────────────────────────────────────

interface LibraryCategoryProps {
  emoji: string;
  label: string;
  sub: string;
  accent: string;
  colors: ReturnType<typeof useThemeTokens>["colors"];
  onPress: () => void;
}

const LibraryCategory = memo(function LibraryCategory({
  emoji, label, sub, accent, colors, onPress,
}: LibraryCategoryProps) {
  const { scale, onPressIn, onPressOut } = usePressScale(0.95);
  return (
    <Animated.View style={{ transform: [{ scale }], width: "47%" }}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${sub}`}
        style={{
          backgroundColor: colors.card,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: accent + "28",
          paddingVertical: 18,
          paddingHorizontal: 15,
          marginBottom: 10,
          alignItems: "flex-start",
          gap: 12,
          shadowColor: accent,
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.13,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        <View style={{
          width: 46, height: 46, borderRadius: 14,
          backgroundColor: accent + "1c",
          borderWidth: 1, borderColor: accent + "28",
          alignItems: "center", justifyContent: "center",
        }}>
          <Text style={{ fontSize: 22 }}>{emoji}</Text>
        </View>
        <View style={{ gap: 3 }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: colors.textPrimary, letterSpacing: -0.2 }}>{label}</Text>
          <Text style={{ fontSize: 11, color: colors.textMuted }} numberOfLines={1}>{sub}</Text>
        </View>
        <View style={{
          flexDirection: "row", alignItems: "center", gap: 4,
          backgroundColor: accent + "16",
          borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4,
          alignSelf: "flex-start",
          borderWidth: 1, borderColor: accent + "25",
        }}>
          <Text style={{ fontSize: 10, fontWeight: "700", color: accent }}>Open</Text>
          <Feather name="arrow-right" size={9} color={accent} />
        </View>
      </Pressable>
    </Animated.View>
  );
});

// ─── Learning Path Card (extracted to fix Rules of Hooks — no hooks in map) ───

interface LearningPathCardProps {
  label: string;
  sub: string;
  emoji: string;
  accent: string;
  done: boolean;
  colors: ReturnType<typeof useThemeTokens>["colors"];
  onPress: () => void;
}

const LearningPathCard = memo(function LearningPathCard({
  label, sub, emoji, accent, done, colors, onPress,
}: LearningPathCardProps) {
  const { scale, onPressIn, onPressOut } = usePressScale(0.95);
  return (
    <Animated.View style={{ transform: [{ scale }], width: 148 }}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${sub}`}
        style={{
          borderRadius: 20,
          overflow: "hidden",
          borderWidth: done ? 1.5 : 1,
          borderColor: done ? accent + "70" : colors.cardBorder,
          shadowColor: done ? accent : "#000",
          shadowOffset: { width: 0, height: done ? 8 : 3 },
          shadowOpacity: done ? 0.32 : 0.12,
          shadowRadius: done ? 18 : 8,
          elevation: done ? 8 : 3,
        }}
      >
        <LinearGradient
          colors={done
            ? [accent + "38", accent + "14", colors.card]
            : [colors.card, colors.card]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={{ padding: 18, minHeight: 150, justifyContent: "space-between" }}
        >
          {/* Top row */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
            <Text style={{ fontSize: 30 }}>{emoji}</Text>
            {done ? (
              <View style={{
                width: 22, height: 22, borderRadius: 11,
                backgroundColor: accent,
                alignItems: "center", justifyContent: "center",
                shadowColor: accent,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.5,
                shadowRadius: 4,
              }}>
                <Feather name="check" size={12} color="#fff" />
              </View>
            ) : (
              <View style={{
                width: 22, height: 22, borderRadius: 11,
                borderWidth: 1.5, borderColor: colors.cardBorder,
                alignItems: "center", justifyContent: "center",
              }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.cardBorder }} />
              </View>
            )}
          </View>

          {/* Bottom text */}
          <View style={{ gap: 5 }}>
            <Text style={{
              fontSize: 14, fontWeight: "800", color: colors.textPrimary,
              letterSpacing: -0.3, lineHeight: 18,
            }}>
              {label}
            </Text>
            <Text style={{
              fontSize: 11, fontWeight: "600",
              color: done ? accent : colors.textMuted,
              letterSpacing: 0.2,
            }}>
              {done ? "Completed ✓" : sub}
            </Text>
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
});

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function SacredStudyScreen() {
  const { colors, type, sp, rd, shadow, theme } = useThemeTokens();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const reducedMotion = useReducedMotion();

  const isLight = theme === "light";
  const isSapphire = theme === "sapphire";
  const gold = colors.accentGold;
  const HX = sp[4];
  const topPad = insets.top > 0 ? insets.top : Platform.OS === "web" ? 48 : 20;

  const [lastStudy, setLastStudy] = useState<LastStudy | null>(null);
  const [history, setHistory] = useState<LastStudy[]>([]);
  const [insightExpanded, setInsightExpanded] = useState(false);
  const [parashaExpanded, setParashaExpanded] = useState(false);

  useEffect(() => {
    storageGet<LastStudy | null>(LAST_STUDY_KEY, null).then(setLastStudy);
    storageGet<LastStudy[]>(STUDY_HISTORY_KEY, []).then(setHistory);
  }, []);

  const parasha: ParashaInfo | null = useMemo(() => getCurrentParashaInfo(), []);
  const daf = useMemo(() => getTodayDaf(), []);
  const insight = useMemo(() => TORAH_INSIGHTS[getDailyIndex(TORAH_INSIGHTS.length)], []);
  const reflection = useMemo(() => REFLECTIONS[getDailyIndex(REFLECTIONS.length)], []);
  const readingMinutes = useMemo(
    () => (parasha ? estimateReadingMinutes(parasha.summary) : 0),
    [parasha],
  );

  // ── Presentation-only: Hebrew date + contextual greeting ──────────────────
  const hebrewDateStr = useMemo(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { HDate } = require("@hebcal/core") as typeof import("@hebcal/core");
      return new HDate(new Date()).render("en");
    } catch {
      return "";
    }
  }, []);

  const greeting = useMemo(() => {
    const day = new Date().getDay();
    if (day === 6) return "Shabbat Shalom ✡";
    if (day === 5) return "Shabbat preparations begin at dusk";
    const h = new Date().getHours();
    if (h < 12) return "Good morning — the gates of wisdom are open";
    if (h < 17) return "Good afternoon — continue your journey";
    return "Good evening — let the learning guide your rest";
  }, []);

  const recordStudy = useCallback((entry: Omit<LastStudy, "at">) => {
    const record: LastStudy = { ...entry, at: Date.now() };
    setLastStudy(record);
    storageSet(LAST_STUDY_KEY, record);
    setHistory((prev) => {
      const next = [record, ...prev].slice(0, MAX_HISTORY);
      storageSet(STUDY_HISTORY_KEY, next);
      return next;
    });
  }, []);

  const goCalendar = useCallback(() => {
    router.push("/(tabs)/calendar");
  }, []);

  const scrollRef = useRef<any>(null);


  const journeyStats = useMemo(() => computeJourneyStats(history), [history]);

  const goSiddur = useCallback((category: string) => {
    recordStudy({ label: `Siddur — ${category}`, route: "/siddur", params: { category } });
    router.push({ pathname: "/siddur", params: { category } } as any);
  }, [recordStudy]);

  const goDaf = useCallback(() => {
    recordStudy({ label: `Daf Yomi — ${daf.tractate} ${daf.daf}`, route: "/daf-yomi" });
    router.push("/daf-yomi");
  }, [recordStudy, daf]);

  const goTorahTracker = useCallback(() => {
    recordStudy({ label: "Torah Tracker", route: "/torah-tracker" });
    router.push("/torah-tracker");
  }, [recordStudy]);

  const studyParasha = useCallback(async () => {
    if (!parasha) return;
    recordStudy({ label: `Parashat ${parasha.name}`, route: "/(tabs)/torah" });
    await WebBrowser.openBrowserAsync(`https://www.sefaria.org/topics/parashat-${slugifyParasha(parasha.name)}`);
  }, [parasha, recordStudy]);

  const continueLastStudy = useCallback(() => {
    if (!lastStudy) return;
    router.push(lastStudy.params ? ({ pathname: lastStudy.route, params: lastStudy.params } as any) : (lastStudy.route as any));
  }, [lastStudy]);

  const toggleInsight = useCallback(() => {
    if (!reducedMotion) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setInsightExpanded((v) => !v);
  }, [reducedMotion]);

  const toggleParasha = useCallback(() => {
    if (!reducedMotion) LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setParashaExpanded((v) => !v);
  }, [reducedMotion]);

  const heroGradient = isLight
    ? (["#F7F0DE", "#EDE0B8", "#DFC489"] as const)
    : isSapphire
    ? (["#040c1c", "#0c1830", "#060e20"] as const)
    : (["#060a12", "#0d1420", "#060a12"] as const);

  const heroAnim = useBookOpen(reducedMotion);
  const a0 = useEntrance(60);
  const a1 = useEntrance(110);
  const a2 = useEntrance(160);
  const a3 = useEntrance(210);
  const a4 = useEntrance(260);
  const a5 = useEntrance(310);
  const a6 = useEntrance(360);
  const a7 = useEntrance(410);
  const a8 = useEntrance(460);

  const parashaPress = usePressScale(0.98);
  const dafPress = usePressScale(0.97);
  const continuePress = usePressScale(0.96);

  const SIDDUR_TIMES = [
    { key: "Shacharit", label: "Morning", sub: "Shacharit", icon: "sunrise" as const },
    { key: "Mincha",    label: "Afternoon", sub: "Mincha",   icon: "sun" as const },
    { key: "Maariv",   label: "Evening",  sub: "Maariv",    icon: "moon" as const },
  ];

  const READING_MAX_WIDTH = 640;

  // ── Accent colours (presentation-only) ────────────────────────────────────
  const PURPLE = "#a78bfa";
  const TEAL   = "#5eb3c9";
  const GREEN  = "#4ade80";
  const AMBER  = "#f59e0b";
  const CORAL  = "#e07856";
  const PINK   = "#d16b8f";

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Animated.ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: (insets.bottom || 0) + 104,
          maxWidth: READING_MAX_WIDTH,
          width: "100%",
          alignSelf: "center",
        }}
      >

        {/* ── ① HERO ──────────────────────────────────────────────────────── */}
        <Animated.View style={heroAnim}>
          <LinearGradient
            colors={heroGradient}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={{ paddingTop: topPad + 20, paddingHorizontal: HX, paddingBottom: 40, overflow: "hidden" }}
          >
            {/* Layered decorative background — Torah scroll atmosphere */}
            {/* Outer glow ring */}
            <View pointerEvents="none" style={{
              position: "absolute", top: -80, right: -80,
              width: 320, height: 320, borderRadius: 160,
              backgroundColor: gold + "0a",
            }} />
            {/* Mid accent orb */}
            <View pointerEvents="none" style={{
              position: "absolute", top: topPad - 10, left: -40,
              width: 180, height: 180, borderRadius: 90,
              backgroundColor: gold + "0d",
            }} />
            {/* Small floating orb — top right */}
            <View pointerEvents="none" style={{
              position: "absolute", top: topPad + 40, right: 30,
              width: 80, height: 80, borderRadius: 40,
              backgroundColor: isSapphire ? "#6382FF18" : gold + "12",
            }} />
            {/* Bottom corner accent */}
            <View pointerEvents="none" style={{
              position: "absolute", bottom: -30, right: -20,
              width: 120, height: 120, borderRadius: 60,
              backgroundColor: gold + "0a",
            }} />
            {/* Star menorah illustration — large ghost */}
            <View pointerEvents="none" style={{
              position: "absolute", top: 20, right: -60, opacity: isLight ? 0.07 : 0.05,
            }}>
              <Feather name="star" size={300} color={gold} />
            </View>
            {/* Inner detail star */}
            <View pointerEvents="none" style={{
              position: "absolute", bottom: 30, left: HX + 10, opacity: 0.08,
            }}>
              <Feather name="star" size={60} color={gold} />
            </View>

            {/* Hebrew date badge */}
            {hebrewDateStr ? (
              <View style={{
                flexDirection: "row", alignItems: "center", gap: 7,
                backgroundColor: isLight ? gold + "22" : gold + "1c",
                borderWidth: 1, borderColor: gold + "40",
                borderRadius: 100, paddingHorizontal: 14, paddingVertical: 6,
                alignSelf: "flex-start", marginBottom: 22,
                shadowColor: gold,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 6,
              }}>
                <Text style={{ fontSize: 12, color: gold }}>✦</Text>
                <Text style={{
                  fontSize: 12, fontWeight: "700", letterSpacing: 0.4,
                  color: isLight ? "#5a4010" : gold,
                }}>
                  {hebrewDateStr}
                </Text>
              </View>
            ) : (
              <View style={{ height: 36, marginBottom: 22 }} />
            )}

            {/* Eyebrow label */}
            <Text style={{
              fontSize: 10, fontWeight: "800", letterSpacing: 2.4,
              color: isLight ? "#8a6a1e" : gold + "bb",
              textTransform: "uppercase", marginBottom: 16,
            }}>
              {t.navTorah} · Today's Torah Journey
            </Text>

            {parasha ? (
              <>
                {/* Parasha badge pill */}
                <View style={{
                  flexDirection: "row", alignItems: "center", gap: 8,
                  backgroundColor: isLight ? "rgba(0,0,0,0.07)" : "rgba(255,255,255,0.07)",
                  borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6,
                  alignSelf: "flex-start", marginBottom: 14,
                  borderWidth: 1, borderColor: isLight ? "rgba(0,0,0,0.12)" : "rgba(255,255,255,0.12)",
                }}>
                  <Text style={{ fontSize: 10, color: isLight ? "#6b5323" : "#c9bfa0", fontWeight: "600", letterSpacing: 1 }}>
                    THIS WEEK'S PARASHAH
                  </Text>
                  <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: gold }} />
                  <Text style={{ fontSize: 10, color: isLight ? "#8a6a1e" : gold, fontWeight: "800", letterSpacing: 0.6 }}>
                    {parasha.book}
                  </Text>
                </View>

                {/* Parasha name — large premium typography */}
                <Text style={{
                  fontSize: 40, fontWeight: "900", letterSpacing: -1.2,
                  color: isLight ? "#1c1408" : "#f5eedd",
                  lineHeight: 44,
                }}>
                  {parasha.name}
                </Text>
                {/* Hebrew name */}
                <Text style={{
                  fontSize: 26, marginTop: 10, textAlign: "left",
                  color: isLight ? "#6b5323" : gold,
                  writingDirection: "rtl",
                  fontWeight: "600",
                  letterSpacing: 0.5,
                }}>
                  {parasha.hebrewName}
                </Text>
              </>
            ) : (
              <Text style={{
                fontSize: 32, fontWeight: "900",
                color: isLight ? "#1c1408" : "#f5eedd",
                letterSpacing: -0.8,
              }}>
                A Sacred Space to Learn
              </Text>
            )}

            {/* Warm greeting */}
            <Text style={{
              fontSize: 13, color: isLight ? "#7a6030" : "#9a8a6a",
              marginTop: 16, lineHeight: 22,
              fontStyle: "italic", letterSpacing: 0.1,
            }}>
              {greeting}
            </Text>

            {/* Weekly progress pill */}
            {journeyStats.thisWeek > 0 && (
              <View style={{
                flexDirection: "row", alignItems: "center", gap: 8, marginTop: 20,
                backgroundColor: isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)",
                borderRadius: 100, paddingHorizontal: 14, paddingVertical: 8,
                alignSelf: "flex-start",
                borderWidth: 1, borderColor: isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)",
              }}>
                <Feather name="trending-up" size={13} color={isLight ? "#6b5323" : GREEN} />
                <Text style={{ fontSize: 12, fontWeight: "700", color: isLight ? "#6b5323" : GREEN }}>
                  {journeyStats.thisWeek} session{journeyStats.thisWeek !== 1 ? "s" : ""} this week
                </Text>
              </View>
            )}
          </LinearGradient>
        </Animated.View>

        {/* ── ② THIS WEEK'S PARASHAH ──────────────────────────────────────── */}
        {parasha && (
          <Animated.View style={[{ marginHorizontal: HX, marginTop: 28, marginBottom: 28 }, a0]}>
            <SectionHeader icon="star" label="This Week's Parashah" gold={gold} muted={colors.textMuted} />

            {/* Premium feature card */}
            <View style={{
              borderRadius: 24,
              overflow: "hidden",
              borderWidth: 1.5,
              borderColor: gold + "40",
              shadowColor: gold,
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.22,
              shadowRadius: 20,
              elevation: 8,
            }}>
              {/* Gold top accent strip — gradient */}
              <LinearGradient
                colors={[gold, gold + "88", gold + "22", "transparent"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ height: 3 }}
              />

              <View style={{ backgroundColor: colors.card, padding: 24 }}>
                {/* Decorative ghost watermark */}
                <View pointerEvents="none" style={{ position: "absolute", top: -16, right: -16, opacity: 0.04 }}>
                  <Feather name="star" size={150} color={gold} />
                </View>

                {/* Name row */}
                <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
                  <View style={{ flex: 1, paddingRight: 14 }}>
                    <Text style={{ fontSize: 26, fontWeight: "900", color: colors.textPrimary, letterSpacing: -0.7, lineHeight: 30 }}>
                      {parasha.name}
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 5, letterSpacing: 0.3 }}>
                      {parasha.book} · {parasha.verses}
                    </Text>
                  </View>
                  <View style={{
                    backgroundColor: gold + "14",
                    borderWidth: 1, borderColor: gold + "30",
                    borderRadius: 12, padding: 10,
                  }}>
                    <Text style={{ fontSize: 22, color: gold, writingDirection: "rtl", fontWeight: "700" }}>
                      {parasha.hebrewName}
                    </Text>
                  </View>
                </View>

                {/* Progress bar */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 18 }}>
                  <View style={{ flex: 1, height: 4, backgroundColor: colors.cardBorder, borderRadius: 2, overflow: "hidden" }}>
                    <LinearGradient
                      colors={[gold, gold + "88"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{ width: `${Math.min(100, Math.max(4, journeyStats.thisWeek * 15))}%`, height: 4, borderRadius: 2 }}
                    />
                  </View>
                  <Text style={{ fontSize: 10, color: colors.textMuted, fontWeight: "700" }}>
                    {journeyStats.thisWeek > 0 ? `${Math.min(journeyStats.thisWeek, 7)}/7 days` : "Not started"}
                  </Text>
                </View>

                {/* Summary — expandable */}
                <Pressable
                  onPress={toggleParasha}
                  accessibilityRole="button"
                  accessibilityLabel={parashaExpanded ? "Show less" : "Read summary"}
                >
                  <Text
                    style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 24 }}
                    numberOfLines={parashaExpanded ? undefined : 3}
                  >
                    {parasha.summary}
                  </Text>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: gold, marginTop: 7 }}>
                    {parashaExpanded ? "Show less ↑" : "Read more ↓"}
                  </Text>
                </Pressable>

                {/* Reading time */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginTop: 10, marginBottom: 20 }}>
                  <View style={{
                    flexDirection: "row", alignItems: "center", gap: 5,
                    backgroundColor: colors.cardBorder + "60",
                    borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4,
                  }}>
                    <Feather name="clock" size={11} color={colors.textMuted} />
                    <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: "600" }}>{readingMinutes} min read</Text>
                  </View>
                </View>

                {/* Continue Reading CTA */}
                <Animated.View style={{ transform: [{ scale: parashaPress.scale }] }}>
                  <Pressable
                    onPress={studyParasha}
                    onPressIn={parashaPress.onPressIn}
                    onPressOut={parashaPress.onPressOut}
                    accessibilityRole="button"
                    accessibilityLabel="Continue Reading this week's Parashah"
                    style={{
                      borderRadius: 16,
                      overflow: "hidden",
                      shadowColor: gold,
                      shadowOffset: { width: 0, height: 6 },
                      shadowOpacity: 0.42,
                      shadowRadius: 14,
                      elevation: 7,
                    }}
                  >
                    <LinearGradient
                      colors={isLight ? [gold, gold + "cc"] : [gold + "ee", gold + "aa"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={{
                        paddingVertical: 17,
                        alignItems: "center",
                        justifyContent: "center",
                        flexDirection: "row",
                        gap: 10,
                        minHeight: 54,
                      }}
                    >
                      <Feather name="book-open" size={17} color={isLight ? "#241a08" : "#0f0c04"} />
                      <Text style={{ fontSize: 15, fontWeight: "900", color: isLight ? "#241a08" : "#0f0c04", letterSpacing: 0.3 }}>
                        Continue Reading
                      </Text>
                    </LinearGradient>
                  </Pressable>
                </Animated.View>
              </View>
            </View>
          </Animated.View>
        )}

        {/* ── ③ DAILY LEARNING ────────────────────────────────────────────── */}
        <Animated.View style={[{ marginHorizontal: HX, marginBottom: 28 }, a1]}>
          <SectionHeader icon="layers" label="Daily Learning" gold={gold} muted={colors.textMuted} />

          {/* Daf Yomi */}
          <Animated.View style={{ transform: [{ scale: dafPress.scale }] }}>
            <DailyLearningCard
              emoji="📖"
              accent={PURPLE}
              title={`${daf.tractate} · Daf ${daf.daf}`}
              subtitle="Babylonian Talmud · Daily page"
              badge="DAF YOMI"
              colors={colors}
              onPress={goDaf}
            />
          </Animated.View>

          {/* Mussar */}
          <DailyLearningCard
            emoji="🌿"
            accent={GREEN}
            title="Mussar"
            subtitle="48 Ways of Torah · Character refinement"
            badge="PERSONAL GROWTH"
            colors={colors}
            onPress={() => router.push("/mussar" as any)}
          />

          {/* Halacha */}
          <DailyLearningCard
            emoji="📜"
            accent={TEAL}
            title="Halacha"
            subtitle="Daily Jewish law · Practical guidance"
            badge="JEWISH LAW"
            colors={colors}
            onPress={() => goSiddur("Halacha")}
          />

          {/* Jewish Thought */}
          <DailyLearningCard
            emoji="✨"
            accent={AMBER}
            title="Jewish Thought"
            subtitle="Philosophy · Kabbalah · Ethics"
            badge="WISDOM"
            colors={colors}
            onPress={() => goSiddur("All")}
          />
        </Animated.View>

        {/* ── ④ FEATURED STUDY (Torah Insight — editorial card) ───────────── */}
        <Animated.View style={[{ marginHorizontal: HX, marginBottom: 28 }, a2]}>
          <SectionHeader icon="sunrise" label="Featured Study" gold={gold} muted={colors.textMuted} />

          <Pressable
            onPress={toggleInsight}
            accessibilityRole="button"
            accessibilityLabel={`${insight.title}. ${insightExpanded ? "Collapse" : "Expand"} insight`}
            style={{
              borderRadius: 24,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: CORAL + "38",
              shadowColor: CORAL,
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.22,
              shadowRadius: 20,
              elevation: 7,
            }}
          >
            <LinearGradient
              colors={isLight ? ["#fff8f2", "#fff0e4", "#ffe8d4"] : ["#1e0e06", "#2c1208", "#1e0e06"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: 24 }}
            >
              {/* Decorative background star */}
              <View pointerEvents="none" style={{ position: "absolute", top: -20, right: -20, opacity: 0.07 }}>
                <Feather name="star" size={120} color={CORAL} />
              </View>

              {/* Badge row */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <View style={{
                  flexDirection: "row", alignItems: "center", gap: 6,
                  backgroundColor: CORAL + "20",
                  borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5,
                  borderWidth: 1, borderColor: CORAL + "30",
                }}>
                  <Feather name="feather" size={10} color={CORAL} />
                  <Text style={{ fontSize: 9, fontWeight: "800", letterSpacing: 1.6, color: CORAL, textTransform: "uppercase" }}>
                    Torah Insight
                  </Text>
                </View>
                {/* Estimated time badge */}
                <View style={{
                  flexDirection: "row", alignItems: "center", gap: 5,
                  backgroundColor: isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)",
                  borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4,
                }}>
                  <Feather name="clock" size={10} color={isLight ? "#9a7a48" : "#8a7a5a"} />
                  <Text style={{ fontSize: 10, fontWeight: "600", color: isLight ? "#9a7a48" : "#8a7a5a" }}>
                    {estimateReadingMinutes(insight.body)} min
                  </Text>
                </View>
              </View>

              {/* Title */}
              <Text style={{
                fontSize: 24, fontWeight: "900",
                color: isLight ? "#1e0e06" : "#f5e8d0",
                letterSpacing: -0.5, lineHeight: 28,
                marginBottom: 14,
              }}>
                {insight.title}
              </Text>

              {/* Body — expandable */}
              <Text
                style={{ fontSize: 14, color: isLight ? "#5a3a18" : "#c8b898", lineHeight: 25 }}
                numberOfLines={insightExpanded ? undefined : 4}
              >
                {insight.body}
              </Text>
              <Text style={{ fontSize: 12, fontWeight: "700", color: CORAL, marginTop: 10 }}>
                {insightExpanded ? "Show less ↑" : "Read more ↓"}
              </Text>

            </LinearGradient>
          </Pressable>
        </Animated.View>

        {/* ── ⑤ LEARNING PATH ─────────────────────────────────────────────── */}
        <Animated.View style={[{ marginBottom: 28 }, a3]}>
          <View style={{ marginHorizontal: HX }}>
            <SectionHeader icon="trending-up" label={t.sacredStudyStudyPaths} gold={gold} muted={colors.textMuted} />
          </View>

          {/* Horizontal scroll — LearningPathCard extracted (fixes Rules of Hooks) */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: HX, gap: 12 }}
          >
            {[
              { label: "Alef-Bet",       sub: "Foundation",   emoji: "א", accent: gold,   param: "Hebrew",       done: journeyStats.studyDays >= 1 },
              { label: "Beginner Torah", sub: "Start here",   emoji: "📖", accent: GREEN,  param: "Beginner",     done: journeyStats.studyDays >= 3 },
              { label: "Intermediate",   sub: "Build deeper", emoji: "🌿", accent: TEAL,   param: "Intermediate", done: journeyStats.studyDays >= 7 },
              { label: "Advanced",       sub: "Full immersion", emoji: "✡", accent: PURPLE, param: "Advanced",     done: journeyStats.studyDays >= 14 },
            ].map((path) => (
              <LearningPathCard
                key={path.label}
                label={path.label}
                sub={path.sub}
                emoji={path.emoji}
                accent={path.accent}
                done={path.done}
                colors={colors}
                onPress={() => goSiddur(path.param)}
              />
            ))}
          </ScrollView>
        </Animated.View>

        {/* ── ⑥ LIBRARY ───────────────────────────────────────────────────── */}
        <Animated.View style={[{ marginHorizontal: HX, marginBottom: 28 }, a4]}>
          <SectionHeader icon="book-open" label="Sacred Library" gold={gold} muted={colors.textMuted} actionLabel="Browse All" onAction={() => goSiddur("All")} />

          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 0 }}>
            <LibraryCategory emoji="🔵" label="Siddur"         sub="Daily prayers"              accent={gold}   colors={colors} onPress={() => goSiddur("Siddur")} />
            <LibraryCategory emoji="📿" label="Tehillim"       sub="Psalms of David"            accent={PURPLE} colors={colors} onPress={() => goSiddur("Tehillim")} />
            <LibraryCategory emoji="📜" label="Tanakh"         sub="Torah · Nevi'im · Ketuvim"  accent={AMBER}  colors={colors} onPress={() => goSiddur("Tanakh")} />
            <LibraryCategory emoji="📚" label="Mishnah"        sub="Oral law · Six orders"      accent={TEAL}   colors={colors} onPress={() => goSiddur("Mishnah")} />
            <LibraryCategory emoji="🏛" label="Talmud"         sub="Gemara · Daily Daf"         accent={PURPLE} colors={colors} onPress={goDaf} />
            <LibraryCategory emoji="🌿" label="Mussar"         sub="Character & ethics"         accent={GREEN}  colors={colors} onPress={() => router.push("/mussar" as any)} />
            <LibraryCategory emoji="🎵" label="Kuki Resources" sub="Bnei Menashe traditions"    accent={CORAL}  colors={colors} onPress={() => goSiddur("Kuki")} />
            <LibraryCategory emoji="📖" label="Prayer Books"   sub="Siddurim & tefillot"        accent={PINK}   colors={colors} onPress={() => goSiddur("Prayer Books")} />
          </View>
        </Animated.View>

        {/* ── Siddur Times of Prayer (preserved — original §5) ────────────── */}
        <Animated.View style={[{ marginHorizontal: HX, marginBottom: 28 }, a4]}>
          <SectionHeader icon="sun" label="Times of Prayer" gold={gold} muted={colors.textMuted} />
          <View style={{ flexDirection: "row", gap: sp[3] }}>
            {SIDDUR_TIMES.map((s) => (
              <SiddurTimeCard
                key={s.key}
                icon={s.icon}
                label={s.label}
                sub={s.sub}
                colors={colors}
                type={type}
                rd={rd}
                sp={sp}
                shadow={shadow}
                onPress={() => goSiddur("Prayer Books")}
              />
            ))}
          </View>
        </Animated.View>

        {/* ── 48 Ways of Torah (preserved — original §8) ──────────────────── */}
        <Animated.View style={[{ marginHorizontal: HX, marginBottom: 28 }, a5]}>
          <SectionHeader icon="star" label="48 Ways of Torah" gold={gold} muted={colors.textMuted} />
          <Pressable
            onPress={() => router.push("/mussar" as any)}
            accessibilityRole="button"
            accessibilityLabel="Open 48 Ways of Torah"
            style={{
              borderRadius: 24,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: "#f59e0b40",
              shadowColor: "#f59e0b",
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.22,
              shadowRadius: 16,
              elevation: 7,
            }}
          >
            <LinearGradient
              colors={["#160900", "#3a1c04", "#6a3210"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: 24, flexDirection: "row", alignItems: "center", gap: sp[4] }}
            >
              <View pointerEvents="none" style={{ position: "absolute", top: -20, right: -20, opacity: 0.07 }}>
                <Feather name="star" size={120} color="#f59e0b" />
              </View>
              <View style={{
                width: 58, height: 58, borderRadius: 29,
                backgroundColor: "#f59e0b22",
                borderWidth: 1.5, borderColor: "#f59e0b44",
                alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <Feather name="star" size={26} color="#f59e0b" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, fontWeight: "800", letterSpacing: 2, color: "#f59e0b", textTransform: "uppercase", marginBottom: 6 }}>
                  Personal Growth · Pirkei Avot
                </Text>
                <Text style={{ fontSize: 22, fontWeight: "900", letterSpacing: -0.5, color: "#fef3c7", lineHeight: 26 }}>
                  48 Ways of Torah
                </Text>
                <Text style={{ fontSize: 13, color: "#d4974a", marginTop: 5 }}>
                  48 principles for a life of wisdom
                </Text>
              </View>
              <Feather name="chevron-right" size={22} color="#a06020" />
            </LinearGradient>
          </Pressable>
        </Animated.View>

        {/* ── ⑦ TODAY'S WISDOM (premium quote card) ───────────────────────── */}
        <Animated.View style={[{ marginHorizontal: HX, marginBottom: 28 }, a6]}>
          <SectionHeader icon="feather" label="Today's Wisdom" gold={gold} muted={colors.textMuted} />

          <View style={{
            backgroundColor: colors.card,
            borderRadius: 24,
            borderWidth: 1,
            borderColor: gold + "30",
            overflow: "hidden",
            shadowColor: gold,
            shadowOffset: { width: 0, height: 5 },
            shadowOpacity: 0.18,
            shadowRadius: 16,
            elevation: 5,
          }}>
            {/* Gold left border accent — gradient */}
            <View style={{ flexDirection: "row" }}>
              <LinearGradient
                colors={[gold, gold + "88", gold + "20", "transparent"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={{ width: 4 }}
              />

              <View style={{ flex: 1, padding: 24 }}>
                {/* Decorative quote mark — large ghost */}
                <Text style={{
                  fontSize: 96, lineHeight: 72,
                  color: gold + "14",
                  fontWeight: "900",
                  position: "absolute", top: 8, right: 14,
                  fontStyle: "normal",
                }}>
                  "
                </Text>

                <Text style={{
                  fontSize: 10, fontWeight: "800", letterSpacing: 1.8,
                  color: gold, textTransform: "uppercase", marginBottom: 16,
                }}>
                  A Quiet Moment
                </Text>

                {/* Quote — large, premium typography */}
                <Text style={{
                  fontSize: 18,
                  fontStyle: "italic",
                  lineHeight: 30,
                  color: colors.textSecondary,
                  letterSpacing: 0.1,
                  marginBottom: 20,
                  paddingRight: 32,
                }}>
                  "{reflection.thought}"
                </Text>

                {/* Attribution + share */}
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: gold + "cc", letterSpacing: 0.3 }}>
                    — {reflection.source}
                  </Text>
                  <Pressable
                    onPress={() => goSiddur("All")}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel="Share this wisdom"
                  >
                    <View style={{
                      flexDirection: "row", alignItems: "center", gap: 6,
                      backgroundColor: gold + "18",
                      borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6,
                      borderWidth: 1, borderColor: gold + "30",
                    }}>
                      <Feather name="share-2" size={12} color={gold} />
                      <Text style={{ fontSize: 11, fontWeight: "700", color: gold }}>Share</Text>
                    </View>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* ── Study Collections (preserved — original §9) ─────────────────── */}
        <Animated.View style={[{ marginHorizontal: HX, marginBottom: 28 }, a6]}>
          <SectionHeader icon="grid" label={t.sacredStudyStudyPaths} gold={gold} muted={colors.textMuted} />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: sp[3] }}>
            <CollectionTile icon="star"      label="Parashah"        sub={parasha?.name ?? "This week"}                 color={gold}    colors={colors} rd={rd} sp={sp} type={type} onPress={studyParasha} />
            <CollectionTile icon="feather"   label="Torah"           sub="Track your study"                             color={GREEN}   colors={colors} rd={rd} sp={sp} type={type} onPress={goTorahTracker} />
            <CollectionTile icon="book"      label="Daf Yomi"        sub={daf.tractate}                                 color={PURPLE}  colors={colors} rd={rd} sp={sp} type={type} onPress={goDaf} />
            <CollectionTile icon="book-open" label="Siddur"          sub="Prayer texts"                                 color="#6382FF" colors={colors} rd={rd} sp={sp} type={type} onPress={() => goSiddur("Siddur")} />
            <CollectionTile icon="sun"       label="Prayer"          sub="Daily Tefillah"                               color="#f0a020" colors={colors} rd={rd} sp={sp} type={type} onPress={() => goSiddur("Prayer Books")} />
            <CollectionTile icon="calendar"  label={t.sacredStudyJewishCalendar} sub="Hebrew dates & holidays"         color={TEAL}    colors={colors} rd={rd} sp={sp} type={type} onPress={goCalendar} />
            <CollectionTile icon="layers"    label="Learning Library" sub="All sacred texts"                           color={CORAL}   colors={colors} rd={rd} sp={sp} type={type} onPress={() => goSiddur("All")} />
          </View>
        </Animated.View>

        {/* ── Learning Journey Stats (preserved) ──────────────────────────── */}
        <Animated.View style={[{ marginHorizontal: HX, marginBottom: 28 }, a7]}>
          <SectionHeader icon="trending-up" label={t.sacredStudyLearningJourney} gold={gold} muted={colors.textMuted} />
          <View style={{ flexDirection: "row", gap: sp[3] }}>
            <JourneyStat value={journeyStats.studyDays}        label={t.sacredStudyStudyDays}        colors={colors} type={type} rd={rd} sp={sp} shadow={shadow} icon="sun" />
            <JourneyStat value={journeyStats.lessonsCompleted} label={t.sacredStudyLessonsCompleted}  colors={colors} type={type} rd={rd} sp={sp} shadow={shadow} icon="check-circle" />
            <JourneyStat value={journeyStats.thisWeek}         label={t.sacredStudyThisWeek}          colors={colors} type={type} rd={rd} sp={sp} shadow={shadow} icon="calendar" />
          </View>
        </Animated.View>

        {/* ── ⑧ CONTINUE LEARNING — large bottom CTA ──────────────────────── */}
        <Animated.View style={[{ marginHorizontal: HX, marginBottom: 8 }, a8]}>
          <SectionHeader icon="play" label="Continue Learning" gold={gold} muted={colors.textMuted} />

          <Animated.View style={{ transform: [{ scale: continuePress.scale }] }}>
            <Pressable
              onPress={continueLastStudy}
              onPressIn={lastStudy ? continuePress.onPressIn : undefined}
              onPressOut={lastStudy ? continuePress.onPressOut : undefined}
              disabled={!lastStudy}
              accessibilityRole="button"
              accessibilityLabel={lastStudy ? `Continue learning: ${lastStudy.label}` : "No study session yet"}
            >
              <LinearGradient
                colors={lastStudy
                  ? (isLight ? [gold + "ee", gold + "cc"] : [gold + "cc", gold + "88"])
                  : (isLight ? ["#e8e0d0", "#d8d0c0"] : ["#1a1610", "#1a1610"])}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  borderRadius: 24,
                  padding: 24,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 18,
                  minHeight: 92,
                  borderWidth: lastStudy ? 1.5 : 1,
                  borderColor: lastStudy ? gold + "55" : colors.cardBorder,
                  shadowColor: lastStudy ? gold : "#000",
                  shadowOffset: { width: 0, height: lastStudy ? 8 : 2 },
                  shadowOpacity: lastStudy ? 0.36 : 0.08,
                  shadowRadius: lastStudy ? 20 : 6,
                  elevation: lastStudy ? 9 : 2,
                }}
              >
                {/* Decorative watermark */}
                {lastStudy && (
                  <View pointerEvents="none" style={{ position: "absolute", top: -12, right: -12, opacity: 0.12 }}>
                    <Feather name="star" size={100} color={isLight ? "#241a08" : "#241a08"} />
                  </View>
                )}

                <View style={{
                  width: 56, height: 56, borderRadius: 28,
                  backgroundColor: lastStudy
                    ? (isLight ? "rgba(0,0,0,0.12)" : "rgba(0,0,0,0.25)")
                    : colors.card,
                  alignItems: "center", justifyContent: "center",
                  borderWidth: 1.5,
                  borderColor: lastStudy
                    ? (isLight ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.15)")
                    : colors.cardBorder,
                  flexShrink: 0,
                }}>
                  <Feather
                    name={lastStudy ? "play" : "book-open"}
                    size={22}
                    color={lastStudy ? (isLight ? "#241a08" : "#0f0c04") : colors.textMuted}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: 11, fontWeight: "800", letterSpacing: 1.6,
                    color: lastStudy ? (isLight ? "#241a08cc" : "#0f0c04bb") : colors.textMuted,
                    textTransform: "uppercase", marginBottom: 5,
                  }}>
                    {lastStudy ? "Continue Learning" : t.sacredStudyBeginJourney.toUpperCase()}
                  </Text>
                  <Text
                    style={{
                      fontSize: 17, fontWeight: "900",
                      color: lastStudy ? (isLight ? "#241a08" : "#0f0c04") : colors.textMuted,
                      letterSpacing: -0.4,
                    }}
                    numberOfLines={1}
                  >
                    {lastStudy ? lastStudy.label : "Start with this week's Parashah"}
                  </Text>
                </View>

                {lastStudy && (
                  <View style={{
                    width: 44, height: 44, borderRadius: 22,
                    backgroundColor: isLight ? "rgba(0,0,0,0.12)" : "rgba(0,0,0,0.2)",
                    alignItems: "center", justifyContent: "center",
                  }}>
                    <Feather name="arrow-right" size={20} color={isLight ? "#241a08" : "#0f0c04"} />
                  </View>
                )}
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </Animated.View>

      </Animated.ScrollView>
    </View>
  );
}

// ─── Siddur time-of-day card ──────────────────────────────────────────────────

interface SiddurTimeCardProps {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  sub: string;
  colors: ReturnType<typeof useThemeTokens>["colors"];
  type: ReturnType<typeof useThemeTokens>["type"];
  rd: ReturnType<typeof useThemeTokens>["rd"];
  sp: ReturnType<typeof useThemeTokens>["sp"];
  shadow: ReturnType<typeof useThemeTokens>["shadow"];
  onPress: () => void;
}

const SiddurTimeCard = memo(function SiddurTimeCard({
  icon, label, sub, colors, type, rd, sp, shadow, onPress,
}: SiddurTimeCardProps) {
  const { scale, onPressIn, onPressOut } = usePressScale(0.94);
  return (
    <Animated.View style={{ flex: 1, transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        accessibilityRole="button"
        accessibilityLabel={`${label} prayer — ${sub}`}
        style={{
          backgroundColor: colors.card, borderRadius: rd.lg, padding: sp[3.5],
          alignItems: "center", gap: 7, borderWidth: 1, borderColor: colors.cardBorder,
          minHeight: 100, justifyContent: "center", ...shadow.level1,
        }}
      >
        <View style={{
          width: 40, height: 40, borderRadius: 20,
          backgroundColor: colors.accentGold + "1c",
          borderWidth: 1, borderColor: colors.accentGold + "28",
          alignItems: "center", justifyContent: "center",
        }}>
          <Feather name={icon} size={17} color={colors.accentGold} />
        </View>
        <Text style={[type.label, { color: colors.textPrimary }]}>{label}</Text>
        <Text style={[type.caption, { color: colors.textMuted }]}>{sub}</Text>
      </Pressable>
    </Animated.View>
  );
});

// ─── Learning Journey stat card — gentle, non-competitive progress display ────

interface JourneyStatProps {
  value: number;
  label: string;
  colors: ReturnType<typeof useThemeTokens>["colors"];
  type: ReturnType<typeof useThemeTokens>["type"];
  rd: ReturnType<typeof useThemeTokens>["rd"];
  sp: ReturnType<typeof useThemeTokens>["sp"];
  shadow: ReturnType<typeof useThemeTokens>["shadow"];
  icon: React.ComponentProps<typeof Feather>["name"];
}

const JourneyStat = memo(function JourneyStat({ value, label, colors, type, rd, sp, shadow, icon }: JourneyStatProps) {
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={`${label}: ${value}`}
      style={{
        flex: 1, backgroundColor: colors.card, borderRadius: rd.lg, padding: sp[3.5],
        alignItems: "center", gap: 6, borderWidth: 1, borderColor: colors.cardBorder,
        minHeight: 100, justifyContent: "center", ...shadow.level1,
      }}
    >
      <View style={{
        width: 36, height: 36, borderRadius: 11,
        backgroundColor: colors.accentGold + "1c",
        borderWidth: 1, borderColor: colors.accentGold + "28",
        alignItems: "center", justifyContent: "center",
        marginBottom: 2,
      }}>
        <Feather name={icon} size={15} color={colors.accentGold} />
      </View>
      <Text style={{ fontSize: 24, fontWeight: "900", color: colors.textPrimary, letterSpacing: -0.8 }}>{value}</Text>
      <Text style={[type.caption, { color: colors.textMuted, textAlign: "center" }]} numberOfLines={2}>{label}</Text>
    </View>
  );
});
