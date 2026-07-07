/**
 * SPR-M011 — Sacred Memory Experience
 * Mobile "Sacred Memory" screen — the emotional gateway into remembrance.
 *
 * NOT a mobile copy of the Web 3D Sanctuary. A calm, personal hall that
 * guides a user through reflection, family memory, and candle lighting
 * before offering entry into the immersive 3D Sanctuary (opened in-browser,
 * never recreated here):
 * Hero → Today's Remembrance → My Family Memorials → Light a Candle →
 * Recent Candles → Prayer & Reflection → Community Memorial → Enter Sanctuary.
 *
 * Architecture rules (SPR-M011):
 *   ✓ Web untouched                 ✓ Web 3D Sanctuary untouched
 *   ✓ Shared Core reused            ✓ Memorial APIs reused (communityApi.ts)
 *   ✓ Mobile Shell reused           ✓ MMDL reused        ✓ MEL followed
 *   ✓ No duplicated candle/memorial business logic
 */

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { HDate } from "@hebcal/core";
import { useUser } from "@clerk/expo";

import { useThemeTokens } from "@/src/mobile/design-system";
import { SectionTitle } from "@/src/mobile/components/display";
import { useReducedMotion } from "@/src/mobile/design-system/accessibility";
import { useLanguage } from "@/context/LanguageContext";
import { fetchCommunityYahrzeit, type CommunityYahrzeitEntry } from "@/lib/communityApi";
import BurningCandleRN from "@/components/BurningCandleRN";

const CURRENT_YEAR = new Date().getFullYear();

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function yahrzeitNumber(passingYear: number | null): number | undefined {
  if (!passingYear || passingYear >= CURRENT_YEAR) return undefined;
  return CURRENT_YEAR - passingYear;
}

// Quiet memorial readings — presentation-only content, not a duplicated engine.
const MEMORIAL_REFLECTIONS = [
  { thought: "May their memory be a blessing — a light that continues to guide those who loved them.", source: "Jewish Tradition" },
  { thought: "El Malei Rachamim: God, full of mercy, grant perfect rest beneath the wings of Your presence.", source: "Memorial Prayer" },
  { thought: "The righteous, even in death, are called living — their deeds continue to speak.", source: "Berakhot 18a" },
  { thought: "A candle is a soul, and remembrance is the flame that never lets it go dark.", source: "Jewish Wisdom" },
];

function getDailyIndex(len: number): number {
  const dayNum = Math.floor(Date.now() / 86_400_000);
  return Math.abs(dayNum % len);
}

// ─── Reduced-motion-aware entrance (matches Sacred Study screen pattern) ─────

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

/** Gentle candle-glow entrance for the hero — fade + soft scale, never a "pop". */
function useGlowIn(reducedMotion: boolean) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(reducedMotion ? 1 : 0.94)).current;
  useEffect(() => {
    const duration = reducedMotion ? 0 : 560;
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration, useNativeDriver: true }),
    ]).start();
  }, [opacity, scale, reducedMotion]);
  return { opacity, transform: [{ scale }] } as any;
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

// ─── Memorial card (memoized — galleries never re-render idle cards) ────────

interface MemorialCardProps {
  entry: CommunityYahrzeitEntry;
  colors: ReturnType<typeof useThemeTokens>["colors"];
  rd: ReturnType<typeof useThemeTokens>["rd"];
  onPress: () => void;
}

const MemorialCard = memo(function MemorialCard({ entry, colors, rd, onPress }: MemorialCardProps) {
  const yNum = yahrzeitNumber(entry.passingYear);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${entry.deceasedName}${yNum ? `, ${ordinal(yNum)} yahrzeit` : ""}`}
      style={{
        backgroundColor: colors.card, borderRadius: rd.lg, borderWidth: 1, borderColor: colors.cardBorder,
        padding: 14, marginRight: 12, alignItems: "center",
      }}
    >
      <BurningCandleRN
        deceasedName={entry.deceasedName}
        yahrzeitNumber={yNum}
        donorName={entry.donorDisplayName || undefined}
        learners={entry.learners}
        isLit={entry.candleLit}
        compact
      />
    </Pressable>
  );
});

// ─── Main Screen ──────────────────────────────────────────────────────────

export default function SacredMemoryScreen() {
  const { colors, type, sp, rd, shadow, theme } = useThemeTokens();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const reducedMotion = useReducedMotion();
  const { user } = useUser();

  const isLight = theme === "light";
  const isSapphire = theme === "sapphire";
  const gold = colors.accentGold;
  const HX = sp[4];
  const topPad = insets.top > 0 ? insets.top : Platform.OS === "web" ? 60 : 20;

  const [entries, setEntries] = useState<CommunityYahrzeitEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [reflectionExpanded, setReflectionExpanded] = useState(false);
  const [opening, setOpening] = useState(false);

  const load = useCallback(async () => {
    const data = await fetchCommunityYahrzeit();
    setEntries(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const iv = setInterval(load, 30000);
    return () => clearInterval(iv);
  }, [load]);

  const reflection = useMemo(() => MEMORIAL_REFLECTIONS[getDailyIndex(MEMORIAL_REFLECTIONS.length)], []);

  // Real Hebrew-calendar match — today's yahrzeits, not fabricated data.
  const todaysRemembrances = useMemo(() => {
    const hd = new HDate(new Date());
    const day = hd.getDate();
    const month = hd.getMonth();
    return entries.filter((e) => e.hebrewDay === day && e.hebrewMonth === month);
  }, [entries]);

  // Real data only — memorials this signed-in user actually lit, matched by donor name.
  const myFamilyMemorials = useMemo(() => {
    const name = (user?.fullName || user?.firstName || "").trim().toLowerCase();
    if (!name) return [];
    return entries.filter((e) => e.donorDisplayName.trim().toLowerCase() === name);
  }, [entries, user]);

  const recentCandles = useMemo(() => {
    return [...entries]
      .sort((a, b) => new Date(b.candleLitAt || b.createdAt).getTime() - new Date(a.candleLitAt || a.createdAt).getTime())
      .slice(0, 8);
  }, [entries]);

  const candleCount = entries.length;
  const learnerCount = entries.reduce((s, e) => s + e.learners.length, 0);

  const goCommunity = useCallback(() => {
    router.push("/(tabs)/community");
  }, []);

  const goLightCandle = useCallback(() => {
    router.push({ pathname: "/(tabs)/community", params: { form: "1" } } as any);
  }, []);

  const enterSanctuary = useCallback(async () => {
    setOpening(true);
    try {
      await WebBrowser.openBrowserAsync(`https://${process.env.EXPO_PUBLIC_DOMAIN}`);
    } finally {
      setOpening(false);
    }
  }, []);

  const toggleReflection = useCallback(() => {
    setReflectionExpanded((v) => !v);
  }, []);

  const heroGradient = isLight
    ? (["#F9EEDB", "#F0DBAE", "#E0B978"] as const)
    : isSapphire
    ? (["#111d33", "#1e2f52", "#111d33"] as const)
    : (["#2a1500", "#1c0e00", "#3a2208"] as const);

  const heroAnim = useGlowIn(reducedMotion);
  const a0 = useEntrance(60, reducedMotion);
  const a1 = useEntrance(110, reducedMotion);
  const a2 = useEntrance(160, reducedMotion);
  const a3 = useEntrance(210, reducedMotion);
  const a4 = useEntrance(260, reducedMotion);
  const a5 = useEntrance(310, reducedMotion);
  const a6 = useEntrance(360, reducedMotion);

  const lightPress = usePressScale(reducedMotion, 0.97);
  const sanctuaryPress = usePressScale(reducedMotion, 0.97);

  // Comfortable reading width — content never stretches edge-to-edge on tablets/large screens
  const READING_MAX_WIDTH = 640;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: (insets.bottom || 0) + 48,
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
            style={{ paddingTop: topPad + 16, paddingHorizontal: HX, paddingBottom: 30, overflow: "hidden" }}
          >
            <TouchableOpacity
              onPress={() => router.back()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={{ marginBottom: 14 }}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <Feather name="chevron-left" size={22} color={isLight ? "#5a3d10" : "#e8d3a0"} />
            </TouchableOpacity>

            {/* Soft glass overlay + warm candlelight glow — no clutter, quiet atmosphere */}
            <View pointerEvents="none" style={{ position: "absolute", top: -50, right: -40, width: 200, height: 200, borderRadius: 100, backgroundColor: "rgba(255,170,40,0.14)" }} />
            <View pointerEvents="none" style={{ position: "absolute", bottom: -30, left: -30, width: 140, height: 140, borderRadius: 70, backgroundColor: gold + "10" }} />

            <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 2, color: isLight ? "#8a5a1e" : gold, textTransform: "uppercase", marginBottom: 14 }}>
              {t.navCommunity} · {t.sacredMemoryTitle}
            </Text>
            <Text style={{ fontSize: 34, fontWeight: "800", letterSpacing: -0.5, color: isLight ? "#2a1a08" : "#f4e0c4", lineHeight: 38 }}>
              {t.sacredMemoryTitle}
            </Text>
            <Text style={{ fontSize: 14, marginTop: 8, color: isLight ? "#6b4d23" : "#d8c090", lineHeight: 21 }}>
              {t.sacredMemorySubtitle}
            </Text>
          </LinearGradient>
        </Animated.View>

        {/* ─── 2. TODAY'S REMEMBRANCE ─────────────────────────────────────── */}
        <Animated.View style={[{ marginHorizontal: HX, marginTop: 20, marginBottom: 22 }, a0]}>
          <SectionTitle eyebrow={t.sacredMemoryTodaysRemembrance} leadingIcon={<Feather name="sun" size={13} color={colors.primary} />} style={{ marginTop: 0 }} />
          {todaysRemembrances.length === 0 ? (
            <View style={{
              backgroundColor: colors.card, borderRadius: rd.lg, padding: sp[4],
              borderWidth: 1, borderColor: colors.cardBorder, alignItems: "center",
            }}>
              <Text style={{ fontSize: 22, marginBottom: 6 }}>🕊</Text>
              <Text style={[type.bodySm, { color: colors.textMuted, textAlign: "center" }]}>
                {t.sacredMemoryNoRemembrance}
              </Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {todaysRemembrances.map((entry) => (
                <MemorialCard key={entry.id} entry={entry} colors={colors} rd={rd} onPress={goCommunity} />
              ))}
            </ScrollView>
          )}
        </Animated.View>

        {/* ─── 3. MY FAMILY MEMORIALS ─────────────────────────────────────── */}
        <Animated.View style={[{ marginHorizontal: HX, marginBottom: 22 }, a1]}>
          <SectionTitle eyebrow={t.sacredMemoryMyFamilyMemorials} leadingIcon={<Feather name="heart" size={13} color={colors.primary} />} style={{ marginTop: 0 }} />
          {myFamilyMemorials.length === 0 ? (
            <View style={{
              backgroundColor: colors.card, borderRadius: rd.lg, padding: sp[4],
              borderWidth: 1, borderColor: colors.cardBorder, alignItems: "center",
            }}>
              <Text style={{ fontSize: 22, marginBottom: 6 }}>🖼</Text>
              <Text style={[type.bodySm, { color: colors.textMuted, textAlign: "center" }]}>
                {t.sacredMemoryNoFamilyMemorials}
              </Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {myFamilyMemorials.map((entry) => (
                <MemorialCard key={entry.id} entry={entry} colors={colors} rd={rd} onPress={goCommunity} />
              ))}
            </ScrollView>
          )}
        </Animated.View>

        {/* ─── 4. LIGHT A CANDLE — flagship one-tap CTA ──────────────────── */}
        <Animated.View style={[{ marginHorizontal: HX, marginBottom: 22 }, a2]}>
          <Animated.View style={{ transform: [{ scale: lightPress.scale }] }}>
            <Pressable
              onPress={goLightCandle}
              onPressIn={lightPress.onPressIn}
              onPressOut={lightPress.onPressOut}
              accessibilityRole="button"
              accessibilityLabel={t.sacredMemoryLightCandleCta}
              style={{ borderRadius: rd.xl, overflow: "hidden", ...shadow.level2 }}
            >
              <LinearGradient
                colors={isLight ? (["#F0DBAE", "#E0B978"] as const) : (["#3a2208", "#2a1500"] as const)}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={{ padding: sp[5], flexDirection: "row", alignItems: "center", gap: sp[4], minHeight: 96 }}
              >
                <View style={{
                  width: 58, height: 58, borderRadius: 29,
                  backgroundColor: "rgba(255,160,30,0.20)", alignItems: "center", justifyContent: "center",
                }}>
                  <Text style={{ fontSize: 30, textShadowColor: "rgba(255,160,30,0.7)", textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12 }}>🕯</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 17, fontWeight: "800", color: isLight ? "#2a1a08" : "#f4e0c4" }}>
                    {t.sacredMemoryLightCandle}
                  </Text>
                  <Text style={{ fontSize: 12, color: isLight ? "#6b4d23" : "#d8c090", marginTop: 3, lineHeight: 17 }}>
                    {t.sacredMemoryLightCandleDesc}
                  </Text>
                </View>
                <View style={{
                  paddingHorizontal: 14, paddingVertical: 10, borderRadius: rd.md,
                  backgroundColor: gold, minHeight: 40, justifyContent: "center",
                }}>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: isLight ? "#2a1a08" : "#1a1206" }}>
                    {t.sacredMemoryLightCandleCta}
                  </Text>
                </View>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </Animated.View>

        {/* ─── 5. RECENT CANDLES ──────────────────────────────────────────── */}
        <Animated.View style={[{ marginBottom: 22 }, a3]}>
          <View style={{ marginHorizontal: HX }}>
            <SectionTitle eyebrow={t.sacredMemoryRecentCandles} leadingIcon={<Feather name="clock" size={13} color={colors.primary} />} style={{ marginTop: 0 }} />
          </View>
          {!loading && recentCandles.length === 0 ? (
            <View style={{
              marginHorizontal: HX, backgroundColor: colors.card, borderRadius: rd.lg, padding: sp[4],
              borderWidth: 1, borderColor: colors.cardBorder, alignItems: "center",
            }}>
              <Text style={[type.bodySm, { color: colors.textMuted, textAlign: "center" }]}>
                {t.sacredMemoryNoRecentCandles}
              </Text>
            </View>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: HX }}>
              {recentCandles.map((entry) => (
                <MemorialCard key={entry.id} entry={entry} colors={colors} rd={rd} onPress={goCommunity} />
              ))}
            </ScrollView>
          )}
        </Animated.View>

        {/* ─── 6. PRAYER & REFLECTION ─────────────────────────────────────── */}
        <Animated.View style={[{ marginHorizontal: HX, marginBottom: 22 }, a4]}>
          <SectionTitle eyebrow={t.sacredMemoryPrayerReflection} leadingIcon={<Feather name="feather" size={13} color={colors.primary} />} style={{ marginTop: 0 }} />
          <Pressable
            onPress={toggleReflection}
            accessibilityRole="button"
            accessibilityLabel={reflection.thought}
            style={{
              backgroundColor: colors.card, borderRadius: rd.xl, padding: sp[5],
              borderWidth: 1, borderColor: gold + "30", ...shadow.level1,
            }}
          >
            <Text
              style={[type.body, { color: colors.textSecondary, lineHeight: 24, fontStyle: "italic" }]}
              numberOfLines={reflectionExpanded ? undefined : 3}
            >
              "{reflection.thought}"
            </Text>
            <Text style={{ fontSize: 12, fontWeight: "600", color: gold, marginTop: 10 }}>
              — {reflection.source}
            </Text>
          </Pressable>
        </Animated.View>

        {/* ─── 7. COMMUNITY MEMORIAL ──────────────────────────────────────── */}
        <Animated.View style={[{ marginHorizontal: HX, marginBottom: 22 }, a5]}>
          <SectionTitle eyebrow={t.sacredMemoryCommunityMemorial} leadingIcon={<Feather name="users" size={13} color={colors.primary} />} style={{ marginTop: 0 }} />
          <Pressable
            onPress={goCommunity}
            accessibilityRole="button"
            accessibilityLabel={t.sacredMemoryViewCommunity}
            style={{
              backgroundColor: colors.card, borderRadius: rd.lg, padding: sp[4],
              flexDirection: "row", alignItems: "center", gap: sp[3],
              borderWidth: 1, borderColor: colors.cardBorder, ...shadow.level1,
            }}
          >
            <View style={{ flexDirection: "row", gap: sp[3], flex: 1 }}>
              <View style={{ flex: 1, alignItems: "center", paddingVertical: 6, borderRadius: rd.md, backgroundColor: gold + "12" }}>
                <Text style={{ fontSize: 18, fontWeight: "800", color: gold }}>{candleCount}</Text>
                <Text style={{ fontSize: 9, fontWeight: "700", letterSpacing: 0.6, color: colors.textMuted, textTransform: "uppercase", marginTop: 2 }}>
                  {t.sacredMemoryCandlesLit}
                </Text>
              </View>
              <View style={{ flex: 1, alignItems: "center", paddingVertical: 6, borderRadius: rd.md, backgroundColor: colors.success + "12" }}>
                <Text style={{ fontSize: 18, fontWeight: "800", color: colors.success }}>{learnerCount}</Text>
                <Text style={{ fontSize: 9, fontWeight: "700", letterSpacing: 0.6, color: colors.textMuted, textTransform: "uppercase", marginTop: 2 }}>
                  {t.sacredMemoryLearningNow}
                </Text>
              </View>
            </View>
            <Feather name="chevron-right" size={18} color={colors.textMuted} />
          </Pressable>
        </Animated.View>

        {/* ─── 8. ENTER SANCTUARY — flagship CTA, opens the real 3D world ─── */}
        <Animated.View style={[{ marginHorizontal: HX, marginBottom: 8 }, a6]}>
          <Animated.View style={{ transform: [{ scale: sanctuaryPress.scale }] }}>
            <Pressable
              onPress={enterSanctuary}
              onPressIn={sanctuaryPress.onPressIn}
              onPressOut={sanctuaryPress.onPressOut}
              disabled={opening}
              accessibilityRole="button"
              accessibilityLabel={t.sacredMemoryEnterSanctuaryCta}
              accessibilityHint="Opens the immersive 3D memorial sanctuary in your browser"
              style={{ borderRadius: rd["2xl"], overflow: "hidden", ...shadow.level2 }}
            >
              <LinearGradient
                colors={["#3a1e08", "#1c0e00", "#2a1500", "#3a2208"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={{ minHeight: 200, padding: 24 }}
              >
                <View pointerEvents="none" style={{ position: "absolute", top: -32, right: -32, width: 160, height: 160, borderRadius: 80, backgroundColor: "rgba(212,120,10,0.14)" }} />
                <View pointerEvents="none" style={{ position: "absolute", top: -10, right: -10, width: 90, height: 90, borderRadius: 45, backgroundColor: "rgba(240,150,20,0.10)" }} />

                <Text style={{ fontSize: 10, fontWeight: "700", letterSpacing: 1.8, color: gold, textTransform: "uppercase", marginBottom: 10 }}>
                  {t.sacredMemoryEnterSanctuary}
                </Text>
                <Text style={{ fontSize: 22, fontWeight: "800", color: "#f4e0c4", marginBottom: 8, lineHeight: 28, letterSpacing: -0.3 }}>
                  {t.sacredMemoryEnterSanctuaryCta}
                </Text>
                <Text style={{ fontSize: 13, color: "#c4b090", marginBottom: 20, lineHeight: 20, maxWidth: 340 }}>
                  {t.sacredMemoryEnterSanctuaryDesc}
                </Text>

                <View style={{
                  alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 8,
                  paddingHorizontal: 18, paddingVertical: 12, borderRadius: rd.md,
                  backgroundColor: gold, minHeight: 44,
                }}>
                  {opening ? (
                    <Text style={{ fontSize: 13, fontWeight: "700", color: "#1a0f00" }}>…</Text>
                  ) : (
                    <>
                      <Text style={{ fontSize: 13, fontWeight: "700", color: "#1a0f00" }}>{t.sacredMemoryEnterSanctuaryCta}</Text>
                      <Feather name="external-link" size={14} color="#1a0f00" />
                    </>
                  )}
                </View>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </Animated.View>
      </Animated.ScrollView>
    </View>
  );
}
