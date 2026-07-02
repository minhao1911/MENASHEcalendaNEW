/**
 * SPR-M010 — Sacred Study Experience
 * Mobile "Sacred Study" screen — where daily Jewish learning becomes a habit.
 *
 * NOT a document reader. NOT a content list. A calm, focused study hall:
 * Hero → Continue Learning → Weekly Parashah → Daf Yomi → Siddur →
 * Torah Insights → Reflection → Study Collections.
 *
 * Architecture rules (SPR-M010):
 *   ✓ Web untouched              ✓ Shared Core reused (Parashah engine)
 *   ✓ Torah/Siddur/Daf Yomi engines reused, not duplicated
 *   ✓ Mobile Shell reused        ✓ MMDL reused        ✓ MEL followed
 */

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  LayoutAnimation,
  Platform,
  Pressable,
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
import { useReducedMotion } from "@/src/mobile/design-system/accessibility";
import { useLanguage } from "@/context/LanguageContext";
import { storageGet, storageSet } from "@/lib/storageUtils";
import { getCurrentParashaInfo, type ParashaInfo } from "@/lib/hebrewCalendar";
import { getTodayDaf, getSefariaDafUrl } from "@/lib/dafYomi";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Local content — presentation only, not calendar/torah logic ─────────────

const LAST_STUDY_KEY = "menashe-last-study";

interface LastStudy {
  label: string;
  route: string;
  params?: Record<string, string>;
  at: number;
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

// ─── Reduced-motion-aware entrance (matches Sacred Time screen pattern) ───────

function useEntrance(delay: number, reducedMotion: boolean) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(reducedMotion ? 0 : 16)).current;
  useEffect(() => {
    const duration = reducedMotion ? 0 : 420;
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

// ─── Section header ─────────────────────────────────────────────────────────

const SectionHeader = memo(function SectionHeader({
  icon, label, gold, muted,
}: { icon: React.ComponentProps<typeof Feather>["name"]; label: string; gold: string; muted: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 12 }}>
      <Feather name={icon} size={13} color={gold} />
      <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 1.8, color: muted, textTransform: "uppercase" }}>
        {label}
      </Text>
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
  reducedMotion: boolean;
  onPress: () => void;
}

const CollectionTile = memo(function CollectionTile({
  icon, label, sub, color, colors, rd, sp, type, reducedMotion, onPress,
}: CollectionTileProps) {
  const { scale, onPressIn, onPressOut } = usePressScale(reducedMotion, 0.95);
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

// ─── Main Screen ────────────────────────────────────────────────────────────

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
  const [insightExpanded, setInsightExpanded] = useState(false);
  const [parashaExpanded, setParashaExpanded] = useState(false);

  useEffect(() => {
    storageGet<LastStudy | null>(LAST_STUDY_KEY, null).then(setLastStudy);
  }, []);

  const parasha: ParashaInfo | null = useMemo(() => getCurrentParashaInfo(), []);
  const daf = useMemo(() => getTodayDaf(), []);
  const insight = useMemo(() => TORAH_INSIGHTS[getDailyIndex(TORAH_INSIGHTS.length)], []);
  const reflection = useMemo(() => REFLECTIONS[getDailyIndex(REFLECTIONS.length)], []);
  const readingMinutes = useMemo(
    () => (parasha ? estimateReadingMinutes(parasha.summary) : 0),
    [parasha],
  );

  const recordStudy = useCallback((entry: Omit<LastStudy, "at">) => {
    const record: LastStudy = { ...entry, at: Date.now() };
    setLastStudy(record);
    storageSet(LAST_STUDY_KEY, record);
  }, []);

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
    ? (["#111d33", "#1e2f52", "#111d33"] as const)
    : (["#171008", "#1f1710", "#171008"] as const);

  const heroAnim = useBookOpen(reducedMotion);
  const a0 = useEntrance(60, reducedMotion);
  const a1 = useEntrance(110, reducedMotion);
  const a2 = useEntrance(160, reducedMotion);
  const a3 = useEntrance(210, reducedMotion);
  const a4 = useEntrance(260, reducedMotion);
  const a5 = useEntrance(310, reducedMotion);
  const a6 = useEntrance(360, reducedMotion);

  const parashaPress = usePressScale(reducedMotion, 0.98);
  const dafPress = usePressScale(reducedMotion, 0.97);
  const continuePress = usePressScale(reducedMotion, 0.96);

  const SIDDUR_TIMES = [
    { key: "Shacharit", label: "Morning", sub: "Shacharit", icon: "sunrise" as const },
    { key: "Mincha", label: "Afternoon", sub: "Mincha", icon: "sun" as const },
    { key: "Maariv", label: "Evening", sub: "Maariv", icon: "moon" as const },
  ];

  // Comfortable reading width — content never stretches edge-to-edge on tablets/large screens
  const READING_MAX_WIDTH = 640;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: (insets.bottom || 0) + 104,
          maxWidth: READING_MAX_WIDTH,
          width: "100%",
          alignSelf: "center",
        }}
      >
        {/* ─── 1. HERO ─────────────────────────────────────────────────────── */}
        <Animated.View style={heroAnim}>
          <LinearGradient
            colors={heroGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ paddingTop: topPad + 16, paddingHorizontal: HX, paddingBottom: 28, overflow: "hidden" }}
          >
            {/* Large inspirational artwork — Star of David watermark, echoes brand mark used
                on the web Landing page (see Landing.tsx JerusalemSkyline/Stars pattern) */}
            <View pointerEvents="none" style={{ position: "absolute", top: -60, right: -50, opacity: isLight ? 0.10 : 0.07 }}>
              <Feather name="star" size={260} color={gold} />
            </View>
            <View pointerEvents="none" style={{ position: "absolute", top: -36, left: -24, width: 150, height: 150, borderRadius: 75, backgroundColor: gold + "12" }} />
            <View pointerEvents="none" style={{ position: "absolute", bottom: -24, right: -24, width: 110, height: 110, borderRadius: 55, backgroundColor: gold + "0d" }} />

            <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 2, color: isLight ? "#8a6a1e" : gold, textTransform: "uppercase", marginBottom: 16 }}>
              {t.navTorah} · Sacred Study
            </Text>

            {parasha ? (
              <>
                <Text style={{ fontSize: 11, fontWeight: "600", letterSpacing: 1, color: isLight ? "#6b5323" : "#c9bfa0", marginBottom: 6 }}>
                  THIS WEEK'S PARASHAH
                </Text>
                <Text style={{ fontSize: 32, fontWeight: "800", letterSpacing: -0.5, color: isLight ? "#241a08" : "#f4ecd8", lineHeight: 36 }}>
                  {parasha.name}
                </Text>
                <Text
                  style={{
                    fontSize: 26, marginTop: 6, textAlign: "left",
                    color: isLight ? "#6b5323" : "#c9a44e", writingDirection: "rtl",
                  }}
                >
                  {parasha.hebrewName}
                </Text>
              </>
            ) : (
              <Text style={{ fontSize: 24, fontWeight: "700", color: isLight ? "#241a08" : "#f4ecd8" }}>
                A Quiet Place to Learn
              </Text>
            )}
          </LinearGradient>
        </Animated.View>

        {/* ─── 2. CONTINUE LEARNING ───────────────────────────────────────── */}
        <Animated.View style={[{ marginHorizontal: HX, marginTop: -14, marginBottom: 20 }, a0]}>
          <Animated.View style={{ transform: [{ scale: continuePress.scale }] }}>
            <Pressable
              onPress={continueLastStudy}
              onPressIn={lastStudy ? continuePress.onPressIn : undefined}
              onPressOut={lastStudy ? continuePress.onPressOut : undefined}
              disabled={!lastStudy}
              accessibilityRole="button"
              accessibilityLabel={lastStudy ? `Continue learning: ${lastStudy.label}` : "No study session yet"}
              style={{
                backgroundColor: colors.card, borderRadius: rd.xl, padding: sp[4],
                flexDirection: "row", alignItems: "center", gap: sp[3],
                borderWidth: 1, borderColor: colors.cardBorder, ...shadow.level2,
              }}
            >
              <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: gold + "18", alignItems: "center", justifyContent: "center" }}>
                <Feather name={lastStudy ? "play" : "book-open"} size={18} color={gold} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[type.overline, { color: gold }]}>
                  {lastStudy ? "CONTINUE LEARNING" : "BEGIN YOUR STUDY"}
                </Text>
                <Text style={[type.label, { color: colors.textPrimary, marginTop: 2 }]} numberOfLines={1}>
                  {lastStudy ? lastStudy.label : "Start with this week's Parashah"}
                </Text>
              </View>
              {lastStudy && <Feather name="chevron-right" size={18} color={colors.textMuted} />}
            </Pressable>
          </Animated.View>
        </Animated.View>

        {/* ─── 3. WEEKLY PARASHAH ─────────────────────────────────────────── */}
        {parasha && (
          <Animated.View style={[{ marginHorizontal: HX, marginBottom: 22 }, a1]}>
            <SectionHeader icon="star" label="Weekly Parashah" gold={gold} muted={colors.textMuted} />
            <View
              style={{
                backgroundColor: colors.card, borderRadius: rd.xl, padding: sp[5],
                borderWidth: 1, borderColor: gold + "30", ...shadow.level2,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
                <Text style={[type.title, { color: colors.textPrimary }]}>{parasha.name}</Text>
                <Text style={{ fontSize: 18, color: gold, writingDirection: "rtl" }}>{parasha.hebrewName}</Text>
              </View>
              <Text style={[type.caption, { color: colors.textMuted, marginTop: 4 }]}>
                {parasha.book} {parasha.verses}
              </Text>

              <Pressable onPress={toggleParasha} accessibilityRole="button" accessibilityLabel={parashaExpanded ? "Show less" : "Read summary"} style={{ marginTop: sp[3] }}>
                <Text
                  style={[type.body, { color: colors.textSecondary, lineHeight: 24 }]}
                  numberOfLines={parashaExpanded ? undefined : 3}
                >
                  {parasha.summary}
                </Text>
                <Text style={{ fontSize: 12, fontWeight: "600", color: gold, marginTop: 6 }}>
                  {parashaExpanded ? "Show less" : "Read more"}
                </Text>
              </Pressable>

              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: sp[4] }}>
                <Feather name="clock" size={13} color={colors.textMuted} />
                <Text style={[type.caption, { color: colors.textMuted }]}>{readingMinutes} min read</Text>
              </View>

              <Animated.View style={{ transform: [{ scale: parashaPress.scale }], marginTop: sp[4] }}>
                <Pressable
                  onPress={studyParasha}
                  onPressIn={parashaPress.onPressIn}
                  onPressOut={parashaPress.onPressOut}
                  accessibilityRole="button"
                  accessibilityLabel="Continue study of this week's Parashah"
                  style={{
                    backgroundColor: gold, borderRadius: rd.md, paddingVertical: sp[3],
                    alignItems: "center", justifyContent: "center", minHeight: 48,
                  }}
                >
                  <Text style={{ fontSize: 14, fontWeight: "700", color: isLight ? "#241a08" : "#1a1206" }}>
                    Continue Study
                  </Text>
                </Pressable>
              </Animated.View>
            </View>
          </Animated.View>
        )}

        {/* ─── 4. TODAY'S DAF YOMI ────────────────────────────────────────── */}
        <Animated.View style={[{ marginHorizontal: HX, marginBottom: 22 }, a2]}>
          <SectionHeader icon="book" label="Today's Daf Yomi" gold={gold} muted={colors.textMuted} />
          <Animated.View style={{ transform: [{ scale: dafPress.scale }] }}>
            <Pressable
              onPress={goDaf}
              onPressIn={dafPress.onPressIn}
              onPressOut={dafPress.onPressOut}
              accessibilityRole="button"
              accessibilityLabel={`Open today's Daf Yomi: ${daf.tractate} page ${daf.daf}`}
              style={{
                backgroundColor: colors.card, borderRadius: rd.lg, padding: sp[4],
                flexDirection: "row", alignItems: "center", gap: sp[3],
                borderWidth: 1, borderColor: colors.cardBorder, ...shadow.level1,
              }}
            >
              <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: "#a78bfa22", alignItems: "center", justifyContent: "center" }}>
                <Feather name="book" size={18} color="#a78bfa" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[type.overline, { color: "#a78bfa" }]}>BABYLONIAN TALMUD</Text>
                <Text style={[type.title, { color: colors.textPrimary, marginTop: 2 }]}>{daf.tractate}</Text>
                <Text style={[type.bodySm, { color: colors.textMuted, marginTop: 2 }]}>Daf {daf.daf}</Text>
              </View>
              <View style={{ alignItems: "center", gap: 4 }}>
                <Text style={{ fontSize: 12, fontWeight: "600", color: "#a78bfa" }}>Open Study</Text>
                <Feather name="chevron-right" size={16} color="#a78bfa" />
              </View>
            </Pressable>
          </Animated.View>
        </Animated.View>

        {/* ─── 5. SIDDUR — PRAYER EXPERIENCE ──────────────────────────────── */}
        <Animated.View style={[{ marginHorizontal: HX, marginBottom: 22 }, a3]}>
          <SectionHeader icon="sun" label="Siddur — Times of Prayer" gold={gold} muted={colors.textMuted} />
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
                reducedMotion={reducedMotion}
                onPress={() => goSiddur("Prayer Books")}
              />
            ))}
          </View>
        </Animated.View>

        {/* ─── 6. TORAH INSIGHTS ──────────────────────────────────────────── */}
        <Animated.View style={[{ marginHorizontal: HX, marginBottom: 22 }, a4]}>
          <SectionHeader icon="sunrise" label="Torah Insights" gold={gold} muted={colors.textMuted} />
          <Pressable
            onPress={toggleInsight}
            accessibilityRole="button"
            accessibilityLabel={`${insight.title}. ${insightExpanded ? "Collapse" : "Expand"} insight`}
            style={{
              backgroundColor: colors.card, borderRadius: rd.lg, padding: sp[4],
              borderWidth: 1, borderColor: colors.cardBorder,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={[type.label, { color: colors.textPrimary, flex: 1 }]}>{insight.title}</Text>
              <Feather name={insightExpanded ? "chevron-up" : "chevron-down"} size={16} color={colors.textMuted} />
            </View>
            {insightExpanded && (
              <Text style={[type.bodySm, { color: colors.textSecondary, marginTop: sp[2], lineHeight: 21 }]}>
                {insight.body}
              </Text>
            )}
          </Pressable>
        </Animated.View>

        {/* ─── 7. REFLECTION ──────────────────────────────────────────────── */}
        <Animated.View style={[{ marginHorizontal: HX, marginBottom: 22 }, a5]}>
          <View style={{ backgroundColor: colors.primaryMuted, borderRadius: rd.lg, borderWidth: 1, borderColor: gold + "30", padding: sp[5] }}>
            <Text style={[type.overline, { color: gold, marginBottom: sp[2] }]}>A QUIET MOMENT</Text>
            <Text style={[type.body, { color: colors.textSecondary, fontStyle: "italic", lineHeight: 25 }]}>
              "{reflection.thought}"
            </Text>
            <Text style={[type.caption, { color: colors.textMuted, marginTop: sp[3] }]}>— {reflection.source}</Text>
          </View>
        </Animated.View>

        {/* ─── 8. STUDY COLLECTIONS ───────────────────────────────────────── */}
        <Animated.View style={[{ marginHorizontal: HX, marginBottom: 8 }, a6]}>
          <SectionHeader icon="grid" label="Study Collections" gold={gold} muted={colors.textMuted} />
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: sp[3] }}>
            <CollectionTile icon="feather" label="Torah" sub="Track your study" color="#4ade80" colors={colors} rd={rd} sp={sp} type={type} reducedMotion={reducedMotion} onPress={goTorahTracker} />
            <CollectionTile icon="star" label="Parashah" sub={parasha?.name ?? "This week"} color={gold} colors={colors} rd={rd} sp={sp} type={type} reducedMotion={reducedMotion} onPress={studyParasha} />
            <CollectionTile icon="book" label="Daf Yomi" sub={daf.tractate} color="#a78bfa" colors={colors} rd={rd} sp={sp} type={type} reducedMotion={reducedMotion} onPress={goDaf} />
            <CollectionTile icon="book-open" label="Siddur" sub="Prayer texts" color="#6382FF" colors={colors} rd={rd} sp={sp} type={type} reducedMotion={reducedMotion} onPress={() => goSiddur("Siddur")} />
            <CollectionTile icon="sun" label="Prayer" sub="Daily Tefillah" color="#f0a020" colors={colors} rd={rd} sp={sp} type={type} reducedMotion={reducedMotion} onPress={() => goSiddur("Prayer Books")} />
            <CollectionTile icon="layers" label="Learning Library" sub="All sacred texts" color="#e07856" colors={colors} rd={rd} sp={sp} type={type} reducedMotion={reducedMotion} onPress={() => goSiddur("All")} />
          </View>
        </Animated.View>
      </Animated.ScrollView>
    </View>
  );
}

// ─── Siddur time-of-day card ────────────────────────────────────────────────

interface SiddurTimeCardProps {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  sub: string;
  colors: ReturnType<typeof useThemeTokens>["colors"];
  type: ReturnType<typeof useThemeTokens>["type"];
  rd: ReturnType<typeof useThemeTokens>["rd"];
  sp: ReturnType<typeof useThemeTokens>["sp"];
  shadow: ReturnType<typeof useThemeTokens>["shadow"];
  reducedMotion: boolean;
  onPress: () => void;
}

const SiddurTimeCard = memo(function SiddurTimeCard({
  icon, label, sub, colors, type, rd, sp, shadow, reducedMotion, onPress,
}: SiddurTimeCardProps) {
  const { scale, onPressIn, onPressOut } = usePressScale(reducedMotion, 0.94);
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
        <Feather name={icon} size={18} color={colors.accentGold} />
        <Text style={[type.label, { color: colors.textPrimary }]}>{label}</Text>
        <Text style={[type.caption, { color: colors.textMuted }]}>{sub}</Text>
      </Pressable>
    </Animated.View>
  );
});
