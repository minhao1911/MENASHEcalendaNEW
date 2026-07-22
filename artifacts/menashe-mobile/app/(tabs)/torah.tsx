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
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 }}>
      <View style={{
        width: 30, height: 30, borderRadius: 9,
        backgroundColor: gold + "1a",
        borderWidth: 1, borderColor: gold + "30",
        alignItems: "center", justifyContent: "center",
      }}>
        <Feather name={icon} size={13} color={gold} />
      </View>
      <Text style={{ fontSize: 11, fontWeight: "700", letterSpacing: 1.8, color: gold, textTransform: "uppercase", flex: 1 }}>
        {label}
      </Text>
      {actionLabel && onAction && (
        <Pressable onPress={onAction} hitSlop={10} accessibilityRole="button" accessibilityLabel={actionLabel}>
          <Text style={{ fontSize: 12, fontWeight: "600", color: muted, letterSpacing: 0.2 }}>{actionLabel} →</Text>
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
          backgroundColor: colors.card, borderRadius: rd.lg, borderWidth: 1, borderColor: colors.cardBorder,
          padding: sp[4], minHeight: 116, justifyContent: "space-between",
        }}
      >
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: color + "18", alignItems: "center", justifyContent: "center" }}>
          <Feather name={icon} size={18} color={color} />
        </View>
        <View>
          <Text style={[type.label, { color: colors.textPrimary }]}>{label}</Text>
          <Text style={[type.caption, { color: colors.textMuted, marginTop: 2 }]} numberOfLines={1}>{sub}</Text>
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
          borderRadius: 18,
          borderWidth: 1,
          borderColor: accent + "25",
          padding: 18,
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.14,
          shadowRadius: 10,
          elevation: 4,
        }}
      >
        {/* Icon orb */}
        <View style={{
          width: 52, height: 52, borderRadius: 26,
          backgroundColor: accent + "18",
          borderWidth: 1.5, borderColor: accent + "35",
          alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <Text style={{ fontSize: 24 }}>{emoji}</Text>
        </View>

        {/* Text */}
        <View style={{ flex: 1, gap: 3 }}>
          {badge && (
            <Text style={{ fontSize: 9, fontWeight: "700", letterSpacing: 1.4, color: accent, textTransform: "uppercase" }}>
              {badge}
            </Text>
          )}
          <Text style={{ fontSize: 16, fontWeight: "700", color: colors.textPrimary, letterSpacing: -0.2 }}>
            {title}
          </Text>
          <Text style={{ fontSize: 13, color: colors.textMuted, lineHeight: 18 }} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>

        {/* CTA */}
        <View style={{ alignItems: "center", gap: 3 }}>
          <View style={{
            backgroundColor: accent + "18",
            borderWidth: 1, borderColor: accent + "35",
            borderRadius: 12,
            paddingHorizontal: 12, paddingVertical: 7,
          }}>
            <Text style={{ fontSize: 11, fontWeight: "700", color: accent }}>Continue</Text>
          </View>
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
          borderRadius: 16,
          borderWidth: 1,
          borderColor: accent + "28",
          paddingVertical: 16,
          paddingHorizontal: 14,
          marginBottom: 10,
          alignItems: "flex-start",
          gap: 10,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 6,
          elevation: 2,
        }}
      >
        <View style={{
          width: 42, height: 42, borderRadius: 12,
          backgroundColor: accent + "18",
          alignItems: "center", justifyContent: "center",
        }}>
          <Text style={{ fontSize: 20 }}>{emoji}</Text>
        </View>
        <View>
          <Text style={{ fontSize: 14, fontWeight: "700", color: colors.textPrimary, letterSpacing: -0.1 }}>{label}</Text>
          <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }} numberOfLines={1}>{sub}</Text>
        </View>
        <View style={{
          flexDirection: "row", alignItems: "center", gap: 3,
          backgroundColor: accent + "14",
          borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3,
          alignSelf: "flex-start",
        }}>
          <Feather name="arrow-right" size={10} color={accent} />
          <Text style={{ fontSize: 10, fontWeight: "600", color: accent }}>Open</Text>
        </View>
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

  const bookmarksRef = useRef<View>(null);
  const scrollRef = useRef<any>(null);
  const bookmarksY = useRef(0);

  const scrollToBookmarks = useCallback(() => {
    scrollRef.current?.scrollTo?.({ y: Math.max(bookmarksY.current - 24, 0), animated: !reducedMotion });
  }, [reducedMotion]);

  const bookmarks = useMemo(() => history.slice(1, 5), [history]);
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
    ? (["#F7F0DE", "#EFDFB8", "#DFC489"] as const)
    : isSapphire
    ? (["#060e1e", "#0f1d38", "#060e1e"] as const)
    : (["#080c14", "#0f1420", "#080c14"] as const);

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
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ paddingTop: topPad + 20, paddingHorizontal: HX, paddingBottom: 36, overflow: "hidden" }}
          >
            {/* Decorative Torah scroll illustration — large radial glow */}
            <View pointerEvents="none" style={{ position: "absolute", top: -60, right: -50, opacity: isLight ? 0.08 : 0.06 }}>
              <Feather name="star" size={280} color={gold} />
            </View>
            <View pointerEvents="none" style={{ position: "absolute", top: -30, left: -20, width: 160, height: 160, borderRadius: 80, backgroundColor: gold + "10" }} />
            <View pointerEvents="none" style={{ position: "absolute", bottom: -20, right: -16, width: 100, height: 100, borderRadius: 50, backgroundColor: gold + "0c" }} />
            <View pointerEvents="none" style={{ position: "absolute", top: 80, right: 20, width: 70, height: 70, borderRadius: 35, backgroundColor: isLight ? gold + "20" : "#6382FF18" }} />

            {/* Hebrew date badge */}
            {hebrewDateStr ? (
              <View style={{
                flexDirection: "row", alignItems: "center", gap: 6,
                backgroundColor: gold + "18",
                borderWidth: 1, borderColor: gold + "35",
                borderRadius: 24, paddingHorizontal: 12, paddingVertical: 5,
                alignSelf: "flex-start", marginBottom: 20,
              }}>
                <Text style={{ fontSize: 11, color: gold }}>☀</Text>
                <Text style={{ fontSize: 11, fontWeight: "600", color: isLight ? "#6b5323" : gold, letterSpacing: 0.3 }}>
                  {hebrewDateStr}
                </Text>
              </View>
            ) : (
              <View style={{ height: 30, marginBottom: 20 }} />
            )}

            {/* Eyebrow */}
            <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 2.2, color: isLight ? "#8a6a1e" : gold + "cc", textTransform: "uppercase", marginBottom: 14 }}>
              {t.navTorah} · Today's Torah Journey
            </Text>

            {parasha ? (
              <>
                {/* Parasha badge */}
                <View style={{
                  flexDirection: "row", alignItems: "center", gap: 8,
                  backgroundColor: isLight ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.06)",
                  borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5,
                  alignSelf: "flex-start", marginBottom: 12,
                  borderWidth: 1, borderColor: isLight ? "rgba(0,0,0,0.1)" : "rgba(255,255,255,0.1)",
                }}>
                  <Text style={{ fontSize: 10, color: isLight ? "#6b5323" : "#c9bfa0", fontWeight: "600", letterSpacing: 0.8 }}>
                    THIS WEEK'S PARASHAH
                  </Text>
                  <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: gold }} />
                  <Text style={{ fontSize: 10, color: isLight ? "#8a6a1e" : gold, fontWeight: "700", letterSpacing: 0.5 }}>
                    {parasha.book}
                  </Text>
                </View>

                {/* Parasha name — large premium typography */}
                <Text style={{ fontSize: 38, fontWeight: "800", letterSpacing: -0.8, color: isLight ? "#241a08" : "#f4ecd8", lineHeight: 42 }}>
                  {parasha.name}
                </Text>
                <Text style={{
                  fontSize: 28, marginTop: 8, textAlign: "left",
                  color: isLight ? "#6b5323" : gold,
                  writingDirection: "rtl",
                  fontWeight: "600",
                }}>
                  {parasha.hebrewName}
                </Text>
              </>
            ) : (
              <Text style={{ fontSize: 30, fontWeight: "800", color: isLight ? "#241a08" : "#f4ecd8", letterSpacing: -0.5 }}>
                A Sacred Space to Learn
              </Text>
            )}

            {/* Warm greeting */}
            <Text style={{ fontSize: 13, color: isLight ? "#7a6030" : "#9a8a6a", marginTop: 14, lineHeight: 20, fontStyle: "italic" }}>
              {greeting}
            </Text>

            {/* Weekly progress pill */}
            {journeyStats.thisWeek > 0 && (
              <View style={{
                flexDirection: "row", alignItems: "center", gap: 8, marginTop: 18,
                backgroundColor: isLight ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.06)",
                borderRadius: 12, paddingHorizontal: 12, paddingVertical: 7,
                alignSelf: "flex-start",
                borderWidth: 1, borderColor: isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.08)",
              }}>
                <Feather name="trending-up" size={13} color={isLight ? "#6b5323" : GREEN} />
                <Text style={{ fontSize: 12, fontWeight: "600", color: isLight ? "#6b5323" : GREEN }}>
                  {journeyStats.thisWeek} session{journeyStats.thisWeek !== 1 ? "s" : ""} this week
                </Text>
              </View>
            )}
          </LinearGradient>
        </Animated.View>

        {/* ── ② THIS WEEK'S PARASHAH ──────────────────────────────────────── */}
        {parasha && (
          <Animated.View style={[{ marginHorizontal: HX, marginTop: 24, marginBottom: 24 }, a0]}>
            <SectionHeader icon="star" label="This Week's Parashah" gold={gold} muted={colors.textMuted} />

            {/* Premium feature card */}
            <View style={{
              borderRadius: 22,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: gold + "35",
              shadowColor: gold,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 16,
              elevation: 6,
            }}>
              {/* Gold top accent strip */}
              <LinearGradient
                colors={[gold + "cc", gold + "44", "transparent"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ height: 3 }}
              />

              <View style={{ backgroundColor: colors.card, padding: 22 }}>
                {/* Decorative watermark */}
                <View pointerEvents="none" style={{ position: "absolute", top: -10, right: -10, opacity: 0.04 }}>
                  <Feather name="star" size={130} color={gold} />
                </View>

                {/* Name row */}
                <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text style={{ fontSize: 24, fontWeight: "800", color: colors.textPrimary, letterSpacing: -0.5, lineHeight: 28 }}>
                      {parasha.name}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 4, letterSpacing: 0.3 }}>
                      {parasha.book} · {parasha.verses}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 22, color: gold, writingDirection: "rtl", fontWeight: "600" }}>
                    {parasha.hebrewName}
                  </Text>
                </View>

                {/* Progress bar */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  <View style={{ flex: 1, height: 3, backgroundColor: colors.cardBorder, borderRadius: 2 }}>
                    <View style={{ width: `${Math.min(100, journeyStats.thisWeek * 15)}%`, height: 3, backgroundColor: gold, borderRadius: 2 }} />
                  </View>
                  <Text style={{ fontSize: 10, color: colors.textMuted, fontWeight: "600" }}>
                    {journeyStats.thisWeek > 0 ? `${Math.min(journeyStats.thisWeek, 7)}/7 days` : "Not started"}
                  </Text>
                </View>

                {/* Summary */}
                <Pressable
                  onPress={toggleParasha}
                  accessibilityRole="button"
                  accessibilityLabel={parashaExpanded ? "Show less" : "Read summary"}
                >
                  <Text
                    style={{ fontSize: 14, color: colors.textSecondary, lineHeight: 23 }}
                    numberOfLines={parashaExpanded ? undefined : 3}
                  >
                    {parasha.summary}
                  </Text>
                  <Text style={{ fontSize: 12, fontWeight: "600", color: gold, marginTop: 6 }}>
                    {parashaExpanded ? "Show less ↑" : "Read more ↓"}
                  </Text>
                </Pressable>

                {/* Reading time + CTA */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8, marginBottom: 18 }}>
                  <Feather name="clock" size={12} color={colors.textMuted} />
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>{readingMinutes} min read</Text>
                </View>

                <Animated.View style={{ transform: [{ scale: parashaPress.scale }] }}>
                  <Pressable
                    onPress={studyParasha}
                    onPressIn={parashaPress.onPressIn}
                    onPressOut={parashaPress.onPressOut}
                    accessibilityRole="button"
                    accessibilityLabel="Continue Reading this week's Parashah"
                    style={{
                      backgroundColor: gold,
                      borderRadius: 14,
                      paddingVertical: 16,
                      alignItems: "center",
                      justifyContent: "center",
                      flexDirection: "row",
                      gap: 8,
                      minHeight: 52,
                      shadowColor: gold,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.35,
                      shadowRadius: 10,
                      elevation: 5,
                    }}
                  >
                    <Feather name="book-open" size={16} color={isLight ? "#241a08" : "#0f0c04"} />
                    <Text style={{ fontSize: 15, fontWeight: "800", color: isLight ? "#241a08" : "#0f0c04", letterSpacing: 0.2 }}>
                      Continue Reading
                    </Text>
                  </Pressable>
                </Animated.View>
              </View>
            </View>
          </Animated.View>
        )}

        {/* ── ③ DAILY LEARNING ────────────────────────────────────────────── */}
        <Animated.View style={[{ marginHorizontal: HX, marginBottom: 24 }, a1]}>
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
        <Animated.View style={[{ marginHorizontal: HX, marginBottom: 24 }, a2]}>
          <SectionHeader icon="sunrise" label="Featured Study" gold={gold} muted={colors.textMuted} actionLabel="Bookmark" onAction={scrollToBookmarks} />

          <Pressable
            onPress={toggleInsight}
            accessibilityRole="button"
            accessibilityLabel={`${insight.title}. ${insightExpanded ? "Collapse" : "Expand"} insight`}
            style={{
              borderRadius: 22,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: CORAL + "35",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 5 },
              shadowOpacity: 0.2,
              shadowRadius: 16,
              elevation: 6,
            }}
          >
            {/* Header gradient */}
            <LinearGradient
              colors={isLight ? ["#fff8f0", "#fff0e0"] : ["#1c1008", "#281508"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: 22 }}
            >
              {/* Decorative star */}
              <View pointerEvents="none" style={{ position: "absolute", top: -15, right: -15, opacity: 0.07 }}>
                <Feather name="star" size={100} color={CORAL} />
              </View>

              {/* Badge */}
              <View style={{
                flexDirection: "row", alignItems: "center", gap: 5,
                backgroundColor: CORAL + "20",
                borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4,
                alignSelf: "flex-start", marginBottom: 14,
                borderWidth: 1, borderColor: CORAL + "30",
              }}>
                <Feather name="feather" size={10} color={CORAL} />
                <Text style={{ fontSize: 9, fontWeight: "700", letterSpacing: 1.4, color: CORAL, textTransform: "uppercase" }}>
                  Torah Insight
                </Text>
              </View>

              {/* Title */}
              <Text style={{ fontSize: 22, fontWeight: "800", color: isLight ? "#241a08" : "#f4e8d0", letterSpacing: -0.4, lineHeight: 26, marginBottom: 12 }}>
                {insight.title}
              </Text>

              {/* Body — expandable */}
              <Text
                style={{ fontSize: 14, color: isLight ? "#5a3a18" : "#c8b898", lineHeight: 24 }}
                numberOfLines={insightExpanded ? undefined : 4}
              >
                {insight.body}
              </Text>
              <Text style={{ fontSize: 12, fontWeight: "600", color: CORAL, marginTop: 8 }}>
                {insightExpanded ? "Show less ↑" : "Read more ↓"}
              </Text>

              {/* Footer */}
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Feather name="clock" size={12} color={isLight ? "#9a7a48" : "#8a7a5a"} />
                  <Text style={{ fontSize: 11, color: isLight ? "#9a7a48" : "#8a7a5a" }}>
                    {estimateReadingMinutes(insight.body)} min read
                  </Text>
                </View>
                <Pressable
                  onPress={scrollToBookmarks}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Bookmark this insight"
                >
                  <View style={{
                    flexDirection: "row", alignItems: "center", gap: 5,
                    backgroundColor: CORAL + "18",
                    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5,
                  }}>
                    <Feather name="bookmark" size={12} color={CORAL} />
                    <Text style={{ fontSize: 11, fontWeight: "600", color: CORAL }}>Save</Text>
                  </View>
                </Pressable>
              </View>
            </LinearGradient>
          </Pressable>
        </Animated.View>

        {/* ── ⑤ LEARNING PATH ─────────────────────────────────────────────── */}
        <Animated.View style={[{ marginBottom: 24 }, a3]}>
          <View style={{ marginHorizontal: HX }}>
            <SectionHeader icon="trending-up" label={t.sacredStudyStudyPaths} gold={gold} muted={colors.textMuted} />
          </View>

          {/* Horizontal scroll of path cards */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: HX, gap: 12 }}
          >
            {[
              { label: "Alef-Bet", sub: "Foundation", emoji: "א", accent: gold, route: "goSiddur", param: "Hebrew", done: journeyStats.studyDays >= 1 },
              { label: "Beginner Torah", sub: "Start here", emoji: "📖", accent: GREEN, route: "goSiddur", param: "Beginner", done: journeyStats.studyDays >= 3 },
              { label: "Intermediate", sub: "Build deeper", emoji: "🌿", accent: TEAL, route: "goSiddur", param: "Intermediate", done: journeyStats.studyDays >= 7 },
              { label: "Advanced", sub: "Full immersion", emoji: "✡", accent: PURPLE, route: "goSiddur", param: "Advanced", done: journeyStats.studyDays >= 14 },
            ].map((path) => {
              const { scale, onPressIn, onPressOut } = usePressScale(0.95);
              return (
                <Animated.View
                  key={path.label}
                  style={{ transform: [{ scale }], width: 140 }}
                >
                  <Pressable
                    onPress={() => goSiddur(path.param)}
                    onPressIn={onPressIn}
                    onPressOut={onPressOut}
                    accessibilityRole="button"
                    accessibilityLabel={`${path.label}: ${path.sub}`}
                    style={{
                      borderRadius: 18,
                      overflow: "hidden",
                      borderWidth: path.done ? 1.5 : 1,
                      borderColor: path.done ? path.accent + "70" : colors.cardBorder,
                      shadowColor: path.done ? path.accent : "#000",
                      shadowOffset: { width: 0, height: path.done ? 6 : 2 },
                      shadowOpacity: path.done ? 0.28 : 0.1,
                      shadowRadius: path.done ? 14 : 6,
                      elevation: path.done ? 6 : 2,
                    }}
                  >
                    <LinearGradient
                      colors={path.done
                        ? [path.accent + "30", path.accent + "10", colors.card]
                        : [colors.card, colors.card]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 0, y: 1 }}
                      style={{ padding: 16, minHeight: 136, justifyContent: "space-between" }}
                    >
                      {/* Top: done indicator */}
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <Text style={{ fontSize: 28 }}>{path.emoji}</Text>
                        {path.done && (
                          <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: path.accent, alignItems: "center", justifyContent: "center" }}>
                            <Feather name="check" size={11} color="#fff" />
                          </View>
                        )}
                      </View>

                      {/* Bottom: text */}
                      <View>
                        <Text style={{ fontSize: 14, fontWeight: "700", color: colors.textPrimary, letterSpacing: -0.2, marginBottom: 3 }}>
                          {path.label}
                        </Text>
                        <Text style={{ fontSize: 11, color: path.done ? path.accent : colors.textMuted, fontWeight: "600" }}>
                          {path.done ? "Completed ✓" : path.sub}
                        </Text>
                      </View>
                    </LinearGradient>
                  </Pressable>
                </Animated.View>
              );
            })}
          </ScrollView>
        </Animated.View>

        {/* ── ⑥ LIBRARY ───────────────────────────────────────────────────── */}
        <Animated.View style={[{ marginHorizontal: HX, marginBottom: 24 }, a4]}>
          <SectionHeader icon="book-open" label="Sacred Library" gold={gold} muted={colors.textMuted} actionLabel="Browse All" onAction={() => goSiddur("All")} />

          <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 0 }}>
            <LibraryCategory emoji="🔵" label="Siddur"          sub="Daily prayers"           accent={gold}   colors={colors} onPress={() => goSiddur("Siddur")} />
            <LibraryCategory emoji="📿" label="Tehillim"        sub="Psalms of David"         accent={PURPLE} colors={colors} onPress={() => goSiddur("Tehillim")} />
            <LibraryCategory emoji="📜" label="Tanakh"          sub="Torah · Nevi'im · Ketuvim" accent={AMBER} colors={colors} onPress={() => goSiddur("Tanakh")} />
            <LibraryCategory emoji="📚" label="Mishnah"         sub="Oral law · Six orders"   accent={TEAL}   colors={colors} onPress={() => goSiddur("Mishnah")} />
            <LibraryCategory emoji="🏛" label="Talmud"          sub="Gemara · Daily Daf"       accent={PURPLE} colors={colors} onPress={goDaf} />
            <LibraryCategory emoji="🌿" label="Mussar"          sub="Character & ethics"       accent={GREEN}  colors={colors} onPress={() => router.push("/mussar" as any)} />
            <LibraryCategory emoji="🎵" label="Kuki Resources"  sub="Bnei Menashe traditions"  accent={CORAL}  colors={colors} onPress={() => goSiddur("Kuki")} />
            <LibraryCategory emoji="📖" label="Prayer Books"    sub="Siddurim & tefillot"       accent={PINK}   colors={colors} onPress={() => goSiddur("Prayer Books")} />
          </View>
        </Animated.View>

        {/* ── Siddur Times of Prayer (preserved — original §5) ────────────── */}
        <Animated.View style={[{ marginHorizontal: HX, marginBottom: 24 }, a4]}>
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
        <Animated.View style={[{ marginHorizontal: HX, marginBottom: 24 }, a5]}>
          <SectionHeader icon="star" label="48 Ways of Torah" gold={gold} muted={colors.textMuted} />
          <Pressable
            onPress={() => router.push("/mussar" as any)}
            accessibilityRole="button"
            accessibilityLabel="Open 48 Ways of Torah"
            style={{
              borderRadius: 22,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: "#f59e0b35",
              shadowColor: "#f59e0b",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
              elevation: 5,
            }}
          >
            <LinearGradient
              colors={["#1c0e00", "#3d2005", "#6b3510"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{ padding: 22, flexDirection: "row", alignItems: "center", gap: sp[4] }}
            >
              <View pointerEvents="none" style={{ position: "absolute", top: -18, right: -18, opacity: 0.07 }}>
                <Feather name="star" size={110} color="#f59e0b" />
              </View>
              <View style={{
                width: 54, height: 54, borderRadius: 27,
                backgroundColor: "#f59e0b22",
                borderWidth: 1, borderColor: "#f59e0b40",
                alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <Feather name="star" size={24} color="#f59e0b" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 2, color: "#f59e0b", textTransform: "uppercase", marginBottom: 5 }}>
                  Personal Growth · Pirkei Avot
                </Text>
                <Text style={{ fontSize: 20, fontWeight: "800", letterSpacing: -0.4, color: "#fef3c7" }}>
                  48 Ways of Torah
                </Text>
                <Text style={{ fontSize: 13, color: "#d4974a", marginTop: 4 }}>
                  48 principles for a life of wisdom
                </Text>
              </View>
              <Feather name="chevron-right" size={20} color="#a06020" />
            </LinearGradient>
          </Pressable>
        </Animated.View>

        {/* ── ⑦ TODAY'S WISDOM (premium quote card) ───────────────────────── */}
        <Animated.View style={[{ marginHorizontal: HX, marginBottom: 24 }, a6]}>
          <SectionHeader icon="feather" label="Today's Wisdom" gold={gold} muted={colors.textMuted} />

          <View style={{
            backgroundColor: colors.card,
            borderRadius: 22,
            borderWidth: 1,
            borderColor: gold + "28",
            overflow: "hidden",
            shadowColor: gold,
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.12,
            shadowRadius: 12,
            elevation: 4,
          }}>
            {/* Gold left border accent */}
            <View style={{ flexDirection: "row" }}>
              <LinearGradient
                colors={[gold, gold + "60", "transparent"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={{ width: 4 }}
              />

              <View style={{ flex: 1, padding: 22 }}>
                {/* Decorative quote mark */}
                <Text style={{
                  fontSize: 72, lineHeight: 60,
                  color: gold + "18",
                  fontWeight: "900",
                  position: "absolute", top: 10, right: 16,
                }}>
                  "
                </Text>

                <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 1.6, color: gold, textTransform: "uppercase", marginBottom: 14 }}>
                  A Quiet Moment
                </Text>

                {/* Quote — large, premium typography */}
                <Text style={{
                  fontSize: 17,
                  fontStyle: "italic",
                  lineHeight: 28,
                  color: colors.textSecondary,
                  letterSpacing: 0.1,
                  marginBottom: 16,
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
                      flexDirection: "row", alignItems: "center", gap: 5,
                      backgroundColor: gold + "15",
                      borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5,
                      borderWidth: 1, borderColor: gold + "30",
                    }}>
                      <Feather name="share-2" size={12} color={gold} />
                      <Text style={{ fontSize: 11, fontWeight: "600", color: gold }}>Share</Text>
                    </View>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* ── Study Collections (preserved — original §9) ─────────────────── */}
        <Animated.View style={[{ marginHorizontal: HX, marginBottom: 24 }, a6]}>
          <SectionHeader icon="grid" label={t.sacredStudyStudyPaths} gold={gold} muted={colors.textMuted} />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: sp[3] }}>
            <CollectionTile icon="star" label="Parashah" sub={parasha?.name ?? "This week"} color={gold} colors={colors} rd={rd} sp={sp} type={type} onPress={studyParasha} />
            <CollectionTile icon="feather" label="Torah" sub="Track your study" color={GREEN} colors={colors} rd={rd} sp={sp} type={type} onPress={goTorahTracker} />
            <CollectionTile icon="book" label="Daf Yomi" sub={daf.tractate} color={PURPLE} colors={colors} rd={rd} sp={sp} type={type} onPress={goDaf} />
            <CollectionTile icon="book-open" label="Siddur" sub="Prayer texts" color="#6382FF" colors={colors} rd={rd} sp={sp} type={type} onPress={() => goSiddur("Siddur")} />
            <CollectionTile icon="sun" label="Prayer" sub="Daily Tefillah" color="#f0a020" colors={colors} rd={rd} sp={sp} type={type} onPress={() => goSiddur("Prayer Books")} />
            <CollectionTile icon="calendar" label={t.sacredStudyJewishCalendar} sub="Hebrew dates & holidays" color={TEAL} colors={colors} rd={rd} sp={sp} type={type} onPress={goCalendar} />
            <CollectionTile icon="layers" label="Learning Library" sub="All sacred texts" color={CORAL} colors={colors} rd={rd} sp={sp} type={type} onPress={() => goSiddur("All")} />
            <CollectionTile icon="bookmark" label={t.sacredStudyBookmarks} sub={bookmarks.length ? `${bookmarks.length} saved` : "Nothing saved yet"} color={PINK} colors={colors} rd={rd} sp={sp} type={type} onPress={scrollToBookmarks} />
          </View>
        </Animated.View>

        {/* ── Bookmarks (preserved) ───────────────────────────────────────── */}
        <View
          ref={bookmarksRef}
          onLayout={(e) => { bookmarksY.current = e.nativeEvent.layout.y; }}
        >
          <Animated.View style={[{ marginHorizontal: HX, marginBottom: 24 }, a7]}>
            <SectionHeader icon="bookmark" label={t.sacredStudyBookmarks} gold={gold} muted={colors.textMuted} />
            {bookmarks.length === 0 ? (
              <View style={{
                backgroundColor: colors.card, borderRadius: 16,
                borderWidth: 1, borderColor: colors.cardBorder,
                padding: 20, alignItems: "center", gap: 8,
              }}>
                <Feather name="bookmark" size={22} color={colors.textMuted} />
                <Text style={[type.bodySm, { color: colors.textMuted, textAlign: "center" }]}>
                  {t.sacredStudyNoBookmarks}
                </Text>
              </View>
            ) : (
              <View style={{ gap: sp[2] }}>
                {bookmarks.map((item, idx) => (
                  <Pressable
                    key={`${item.route}-${item.at}-${idx}`}
                    onPress={() => router.push(item.params ? ({ pathname: item.route, params: item.params } as any) : (item.route as any))}
                    accessibilityRole="button"
                    accessibilityLabel={`${t.sacredStudyRecentlySaved}: ${item.label}`}
                    style={{
                      backgroundColor: colors.card, borderRadius: rd.md, padding: sp[3.5],
                      flexDirection: "row", alignItems: "center", gap: sp[3],
                      borderWidth: 1, borderColor: colors.cardBorder, minHeight: 52,
                      shadowColor: "#000",
                      shadowOffset: { width: 0, height: 1 },
                      shadowOpacity: 0.08,
                      shadowRadius: 4,
                      elevation: 2,
                    }}
                  >
                    <View style={{
                      width: 34, height: 34, borderRadius: 10,
                      backgroundColor: gold + "15",
                      alignItems: "center", justifyContent: "center",
                    }}>
                      <Feather name="bookmark" size={15} color={gold} />
                    </View>
                    <Text style={[type.bodySm, { color: colors.textPrimary, flex: 1 }]} numberOfLines={1}>{item.label}</Text>
                    <Feather name="chevron-right" size={16} color={colors.textMuted} />
                  </Pressable>
                ))}
              </View>
            )}
          </Animated.View>
        </View>

        {/* ── Learning Journey Stats (preserved) ──────────────────────────── */}
        <Animated.View style={[{ marginHorizontal: HX, marginBottom: 24 }, a7]}>
          <SectionHeader icon="trending-up" label={t.sacredStudyLearningJourney} gold={gold} muted={colors.textMuted} />
          <View style={{ flexDirection: "row", gap: sp[3] }}>
            <JourneyStat value={journeyStats.studyDays}       label={t.sacredStudyStudyDays}       colors={colors} type={type} rd={rd} sp={sp} shadow={shadow} icon="sun" />
            <JourneyStat value={journeyStats.lessonsCompleted} label={t.sacredStudyLessonsCompleted} colors={colors} type={type} rd={rd} sp={sp} shadow={shadow} icon="check-circle" />
            <JourneyStat value={journeyStats.thisWeek}         label={t.sacredStudyThisWeek}         colors={colors} type={type} rd={rd} sp={sp} shadow={shadow} icon="calendar" />
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
                  borderRadius: 22,
                  padding: 24,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 16,
                  minHeight: 88,
                  borderWidth: 1,
                  borderColor: lastStudy ? gold + "50" : colors.cardBorder,
                  shadowColor: lastStudy ? gold : "#000",
                  shadowOffset: { width: 0, height: 6 },
                  shadowOpacity: lastStudy ? 0.3 : 0.08,
                  shadowRadius: 16,
                  elevation: lastStudy ? 7 : 2,
                }}
              >
                {/* Decorative watermark */}
                {lastStudy && (
                  <View pointerEvents="none" style={{ position: "absolute", top: -10, right: -10, opacity: 0.12 }}>
                    <Feather name="star" size={90} color={isLight ? "#241a08" : "#241a08"} />
                  </View>
                )}

                <View style={{
                  width: 52, height: 52, borderRadius: 26,
                  backgroundColor: lastStudy
                    ? (isLight ? "rgba(0,0,0,0.12)" : "rgba(0,0,0,0.25)")
                    : colors.card,
                  alignItems: "center", justifyContent: "center",
                  borderWidth: 1,
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
                    fontSize: 11, fontWeight: "700", letterSpacing: 1.4,
                    color: lastStudy ? (isLight ? "#241a08cc" : "#0f0c04bb") : colors.textMuted,
                    textTransform: "uppercase", marginBottom: 4,
                  }}>
                    {lastStudy ? "Continue Learning" : t.sacredStudyBeginJourney.toUpperCase()}
                  </Text>
                  <Text
                    style={{
                      fontSize: 16, fontWeight: "800",
                      color: lastStudy ? (isLight ? "#241a08" : "#0f0c04") : colors.textMuted,
                      letterSpacing: -0.3,
                    }}
                    numberOfLines={1}
                  >
                    {lastStudy ? lastStudy.label : "Start with this week's Parashah"}
                  </Text>
                </View>

                {lastStudy && (
                  <View style={{
                    width: 40, height: 40, borderRadius: 20,
                    backgroundColor: isLight ? "rgba(0,0,0,0.12)" : "rgba(0,0,0,0.2)",
                    alignItems: "center", justifyContent: "center",
                  }}>
                    <Feather name="arrow-right" size={18} color={isLight ? "#241a08" : "#0f0c04"} />
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
          alignItems: "center", gap: 6, borderWidth: 1, borderColor: colors.cardBorder,
          minHeight: 96, justifyContent: "center", ...shadow.level1,
        }}
      >
        <View style={{
          width: 36, height: 36, borderRadius: 18,
          backgroundColor: colors.accentGold + "18",
          alignItems: "center", justifyContent: "center",
        }}>
          <Feather name={icon} size={16} color={colors.accentGold} />
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
        minHeight: 96, justifyContent: "center", ...shadow.level1,
      }}
    >
      <View style={{
        width: 32, height: 32, borderRadius: 10,
        backgroundColor: colors.accentGold + "18",
        alignItems: "center", justifyContent: "center",
        marginBottom: 2,
      }}>
        <Feather name={icon} size={14} color={colors.accentGold} />
      </View>
      <Text style={{ fontSize: 22, fontWeight: "800", color: colors.textPrimary, letterSpacing: -0.5 }}>{value}</Text>
      <Text style={[type.caption, { color: colors.textMuted, textAlign: "center" }]} numberOfLines={2}>{label}</Text>
    </View>
  );
});
