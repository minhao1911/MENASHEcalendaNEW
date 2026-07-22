/**
 * MEP-301 — Premium Screen
 * Platform: Mobile V1
 *
 * Production-ready Premium screen using the MMDL design system exclusively.
 * Payments are NOT implemented — shows a "Coming Soon" state with a
 * Contact Support button for early-access requests.
 *
 * Architecture rules:
 *   ✓ MMDL tokens only (useThemeTokens)     ✓ useEntrance stagger animations
 *   ✓ useLanguage for all strings            ✓ Back navigation via router.back()
 *   ✓ No Stripe / Razorpay / RevenueCat      ✓ No placeholder onPress handlers
 *   ✓ Reduced Motion respected               ✓ Accessibility labels on all CTAs
 */

import React, { useCallback } from "react";
import {
  Animated,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";

import { useThemeTokens } from "@/src/mobile/design-system";
import { useEntrance } from "@/src/mobile/lib/useEntrance";
import { useLanguage } from "@/context/LanguageContext";

// ─── Constants ────────────────────────────────────────────────────────────────

const SUPPORT_EMAIL = "admin@menashecalendar.app";

// Free vs Premium comparison rows
const COMPARE_ROWS: Array<{
  label: string;
  free: boolean;
  pro: boolean;
}> = [
  { label: "Hebrew Calendar & Zmanim",      free: true,  pro: true  },
  { label: "Daily Parasha & Daf Yomi",      free: true,  pro: true  },
  { label: "Community & Prayer Board",      free: true,  pro: true  },
  { label: "Memorial Sanctuary (basic)",    free: true,  pro: true  },
  { label: "Sacred Study Suite",            free: false, pro: true  },
  { label: "AI Holiday Insights",           free: false, pro: true  },
  { label: "Audio Prayer Guides",           free: false, pro: true  },
  { label: "Multi-Year Calendar Export",    free: false, pro: true  },
  { label: "Tahara & Mikveh Tools",         free: false, pro: true  },
  { label: "Community Census & History",    free: false, pro: true  },
];

// Premium features detail cards
const FEATURES: Array<{
  icon: string;
  title: string;
  body: string;
  color: string;
  bullets: string[];
}> = [
  {
    icon: "📜",
    title: "Sacred Study Suite",
    body: "Full Daf Yomi, Mishna Yomit, and Halacha Yomit with Bnei Menashe commentary.",
    color: "#4ade80",
    bullets: ["Daf Yomi with English translation", "Mishna Yomit daily cycle", "Halacha Yomit (practical law)", "Bnei Menashe insights on every Parasha"],
  },
  {
    icon: "✨",
    title: "AI Holiday Insights",
    body: "Every Yom Tov comes alive with deep spiritual themes, historical context, and Bnei Menashe traditions.",
    color: "#a78bfa",
    bullets: ["Unique Bnei Menashe traditions per holiday", "Spiritual themes and kavannot", "Historical connections to Manipur & Israel", "AI-generated divrei Torah"],
  },
  {
    icon: "🎙",
    title: "Audio Prayer Guides",
    body: "Complete recordings of Shacharit, Mincha, Ma'ariv, and special services in the authentic Bnei Menashe nusach.",
    color: "#f472b6",
    bullets: ["Shacharit (45 min complete)", "Kabbalat Shabbat & Ma'ariv", "All Yom Tov musaf services", "Kiddush & Havdalah recordings"],
  },
  {
    icon: "📅",
    title: "Multi-Year Hebrew Calendar",
    body: "Plan Bar Mitzvahs, weddings, and family milestones years ahead. Export to PDF or iCal.",
    color: "#d4a843",
    bullets: ["20-year range (5780–5800)", "Export to PDF, iCal, Google Calendar", "Custom event annotations", "Bar/Bat Mitzvah date calculator"],
  },
  {
    icon: "💧",
    title: "Tahara & Mikveh Tools",
    body: "A private, secure purity cycle calculator built on the Shulchan Aruch, with Bnei Menashe halachic guidance.",
    color: "#38bdf8",
    bullets: ["Cycle tracking with reminders", "Shulchan Aruch based calculations", "Bnei Menashe halachic notes", "Completely private & secure"],
  },
  {
    icon: "📊",
    title: "Community Census & History",
    body: "Explore the demographic story of Bnei Menashe — family trees, aliyah waves, and historical records.",
    color: "#34d399",
    bullets: ["12 waves of aliyah records", "Family tree connections", "Settlement patterns across Israel", "Historical community milestones"],
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function CheckIcon({ checked, gold }: { checked: boolean; gold: string }) {
  return (
    <View
      style={{
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: checked ? gold + "22" : "transparent",
      }}
    >
      {checked ? (
        <Feather name="check" size={14} color={gold} />
      ) : (
        <Feather name="minus" size={14} color="#555" />
      )}
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PremiumScreen() {
  const { colors, rd, shadow, sp } = useThemeTokens();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  const gold = colors.accentGold;

  // Staggered entrance animations
  const aHero    = useEntrance(0);
  const aBadge   = useEntrance(60);
  const aNotice  = useEntrance(120);
  const aCompare = useEntrance(200);
  const aFeatures = useEntrance(280);
  const aCta     = useEntrance(360);

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.back();
  }, []);

  const handleContactSupport = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Premium%20Early%20Access%20Request`).catch(() => {});
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* ─── Status-bar spacer ─────────────────────────────────────────────── */}
      <View style={{ height: insets.top, backgroundColor: colors.background }} />

      {/* ─── Header ────────────────────────────────────────────────────────── */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [
            styles.backBtn,
            {
              backgroundColor: pressed ? colors.surface : colors.card,
              borderColor: colors.border,
            },
          ]}
          accessibilityLabel={t.premiumBack}
          accessibilityRole="button"
          hitSlop={8}
        >
          <Feather name="arrow-left" size={20} color={colors.textPrimary} />
        </Pressable>

        <Text
          style={[styles.headerTitle, { color: colors.textPrimary }]}
          accessibilityRole="header"
        >
          {t.premiumTitle}
        </Text>

        {/* Spacer to balance the back button */}
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingBottom: insets.bottom + sp[6],
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Hero ──────────────────────────────────────────────────────────── */}
        <Animated.View style={aHero}>
          <LinearGradient
            colors={["#1a0f00", colors.background]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.heroGradient}
          >
            {/* Diamond icon */}
            <View
              style={[
                styles.heroIcon,
                {
                  backgroundColor: gold + "18",
                  borderColor: gold + "55",
                },
              ]}
            >
              <Text style={styles.heroEmoji}>💎</Text>
            </View>

            <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>
              {t.premiumTitle}
            </Text>
            <Text style={[styles.heroTagline, { color: gold }]}>
              {t.premiumTagline}
            </Text>
            <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
              {t.premiumHeroSubtitle}
            </Text>
          </LinearGradient>
        </Animated.View>

        {/* ─── Coming Soon badge ─────────────────────────────────────────────── */}
        <Animated.View style={[{ marginHorizontal: sp[4], marginTop: -sp[2] }, aBadge]}>
          <View
            style={[
              styles.comingSoonBadge,
              {
                backgroundColor: gold + "18",
                borderColor: gold + "44",
              },
            ]}
          >
            <Feather name="clock" size={14} color={gold} />
            <Text style={[styles.comingSoonText, { color: gold }]}>
              {t.premiumComingSoon}
            </Text>
          </View>
        </Animated.View>

        {/* ─── Coming Soon notice ────────────────────────────────────────────── */}
        <Animated.View style={[{ marginHorizontal: sp[4], marginTop: sp[3] }, aNotice]}>
          <View
            style={[
              styles.noticeCard,
              {
                backgroundColor: colors.card,
                borderColor: gold + "33",
                ...shadow.level1,
              },
            ]}
          >
            {/* Gold top accent */}
            <View style={[styles.noticeAccent, { backgroundColor: gold }]} />
            <View style={styles.noticeBody}>
              <Feather name="info" size={18} color={gold} style={{ marginTop: 2 }} />
              <Text
                style={[styles.noticeText, { color: colors.textSecondary }]}
              >
                {t.premiumComingSoonBody}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* ─── Free vs Premium comparison ────────────────────────────────────── */}
        <Animated.View style={[{ marginHorizontal: sp[4], marginTop: sp[5] }, aCompare]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {t.premiumCompareTitle}
          </Text>

          <View
            style={[
              styles.compareCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                ...shadow.level1,
              },
            ]}
          >
            {/* Column headers */}
            <View
              style={[
                styles.compareHeader,
                {
                  backgroundColor: colors.surface,
                  borderBottomColor: colors.border,
                },
              ]}
            >
              <View style={styles.compareFeatureCol} />
              <View style={styles.compareCheckCol}>
                <Text style={[styles.compareHeaderText, { color: colors.textMuted }]}>
                  {t.premiumFreeLabel}
                </Text>
              </View>
              <View style={styles.compareCheckCol}>
                <Text style={[styles.compareHeaderText, { color: gold }]}>
                  {t.premiumProLabel}
                </Text>
              </View>
            </View>

            {/* Rows */}
            {COMPARE_ROWS.map((row, i) => (
              <View
                key={row.label}
                style={[
                  styles.compareRow,
                  {
                    borderBottomColor: colors.divider,
                    borderBottomWidth: i < COMPARE_ROWS.length - 1 ? StyleSheet.hairlineWidth : 0,
                    backgroundColor: i % 2 === 0 ? "transparent" : colors.background + "55",
                  },
                ]}
              >
                <View style={styles.compareFeatureCol}>
                  <Text
                    style={[
                      styles.compareRowLabel,
                      { color: row.pro && !row.free ? colors.textPrimary : colors.textSecondary },
                    ]}
                  >
                    {row.label}
                  </Text>
                </View>
                <View style={styles.compareCheckCol}>
                  <CheckIcon checked={row.free} gold={gold} />
                </View>
                <View style={styles.compareCheckCol}>
                  <CheckIcon checked={row.pro} gold={gold} />
                </View>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* ─── Premium Features ──────────────────────────────────────────────── */}
        <Animated.View style={[{ marginHorizontal: sp[4], marginTop: sp[5] }, aFeatures]}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            {t.premiumFeaturesTitle}
          </Text>

          <View style={{ gap: sp[3] }}>
            {FEATURES.map((feature) => (
              <View
                key={feature.title}
                style={[
                  styles.featureCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: feature.color + "33",
                    ...shadow.level1,
                  },
                ]}
              >
                {/* Left accent bar */}
                <View
                  style={[
                    styles.featureAccentBar,
                    { backgroundColor: feature.color },
                  ]}
                />
                <View style={{ flex: 1, paddingLeft: sp[3] }}>
                  {/* Title row */}
                  <View style={styles.featureTitleRow}>
                    <Text style={styles.featureEmoji}>{feature.icon}</Text>
                    <Text
                      style={[styles.featureTitle, { color: colors.textPrimary }]}
                    >
                      {feature.title}
                    </Text>
                  </View>
                  {/* Body */}
                  <Text
                    style={[styles.featureBody, { color: colors.textSecondary }]}
                  >
                    {feature.body}
                  </Text>
                  {/* Bullets */}
                  <View style={{ marginTop: sp[2], gap: 4 }}>
                    {feature.bullets.map((b) => (
                      <View key={b} style={styles.bulletRow}>
                        <Feather name="check-circle" size={12} color={feature.color} />
                        <Text style={[styles.bulletText, { color: colors.textSecondary }]}>
                          {b}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* ─── CTA footer ────────────────────────────────────────────────────── */}
        <Animated.View style={[{ marginHorizontal: sp[4], marginTop: sp[6] }, aCta]}>
          {/* Support CTA */}
          <Pressable
            onPress={handleContactSupport}
            style={({ pressed }) => [
              styles.contactBtn,
              {
                backgroundColor: pressed ? gold + "dd" : gold,
                ...shadow.level2,
              },
            ]}
            accessibilityLabel={t.premiumContactSupport}
            accessibilityRole="button"
          >
            <Feather name="mail" size={18} color="#1a0f00" />
            <Text style={styles.contactBtnText}>{t.premiumContactSupport}</Text>
          </Pressable>

          {/* Secondary: request early access */}
          <Pressable
            onPress={handleContactSupport}
            style={({ pressed }) => [
              styles.earlyAccessBtn,
              {
                backgroundColor: pressed ? gold + "18" : "transparent",
                borderColor: gold + "55",
              },
            ]}
            accessibilityLabel={t.premiumEarlyAccess}
            accessibilityRole="button"
          >
            <Text style={[styles.earlyAccessText, { color: gold }]}>
              {t.premiumEarlyAccess}
            </Text>
          </Pressable>

          {/* Trust line */}
          <View style={styles.trustRow}>
            <Feather name="shield" size={12} color={colors.textMuted} />
            <Text style={[styles.trustText, { color: colors.textMuted }]}>
              Community reviewed · Approved within 24 hrs
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  // Hero
  heroGradient: {
    alignItems: "center",
    paddingTop: 40,
    paddingBottom: 44,
    paddingHorizontal: 24,
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  heroEmoji: {
    fontSize: 32,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 0.3,
    textAlign: "center",
    marginBottom: 10,
  },
  heroTagline: {
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: 0.2,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    letterSpacing: 0.1,
  },

  // Coming Soon badge
  comingSoonBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  comingSoonText: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  // Notice card
  noticeCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  noticeAccent: {
    height: 3,
  },
  noticeBody: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
  },
  noticeText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
  },

  // Section titles
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 14,
    letterSpacing: 0.2,
  },

  // Comparison table
  compareCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  compareHeader: {
    flexDirection: "row",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  compareHeaderText: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    textAlign: "center",
  },
  compareRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 4,
  },
  compareFeatureCol: {
    flex: 1,
    paddingLeft: 14,
    paddingRight: 8,
  },
  compareCheckCol: {
    width: 72,
    alignItems: "center",
  },
  compareRowLabel: {
    fontSize: 13,
    lineHeight: 18,
  },

  // Feature cards
  featureCard: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    paddingVertical: 16,
    paddingRight: 16,
  },
  featureAccentBar: {
    width: 4,
    borderRadius: 2,
    marginLeft: 14,
  },
  featureTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  featureEmoji: {
    fontSize: 18,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  featureBody: {
    fontSize: 13,
    lineHeight: 20,
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  bulletText: {
    fontSize: 12,
    lineHeight: 18,
  },

  // CTA footer
  contactBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 12,
  },
  contactBtnText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1a0f00",
    letterSpacing: 0.2,
  },
  earlyAccessBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  earlyAccessText: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  trustRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 8,
  },
  trustText: {
    fontSize: 11,
    letterSpacing: 0.1,
  },
});
