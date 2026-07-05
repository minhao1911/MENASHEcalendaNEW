/**
 * Census Experience Entry — SPR-P006B
 *
 * Introduction screen for the Community Census workflow.
 * This is the doorway — it does NOT contain any form or submission logic.
 *
 * Design: large illustration header · premium typography · generous whitespace
 *         warm neutral palette · gold accents (#d4a843)
 */

import React from "react";
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";
import { SPACE, TEXT, RADIUS } from "@/constants/colors";

// Gold is intentionally hardcoded — it is the Census brand accent,
// independent of the user's selected theme (dark / light / sapphire).
const GOLD = "#d4a843";

function haptic() {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

// ── Info card ─────────────────────────────────────────────────────────────────

function InfoCard({
  icon, title, body, colors,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  title: string;
  body: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View
      style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      accessible
      accessibilityLabel={`${title}. ${body}`}
    >
      <View style={[styles.iconBox, { backgroundColor: GOLD + "18", borderColor: GOLD + "38" }]}>
        <Feather name={icon} size={22} color={GOLD} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={[styles.infoTitle, { color: colors.foreground }]}>{title}</Text>
        <Text style={[styles.infoBody, { color: colors.mutedForeground }]}>{body}</Text>
      </View>
    </View>
  );
}

// ── Screen ────────────────────────────────────────────────────────────────────

export default function CensusScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  function handleBegin() {
    haptic();
    Alert.alert(
      "Coming Soon",
      "The Community Census workflow will be available in the next update.",
      [{ text: "OK", style: "default" }]
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>

      {/* ── Navigation bar ── */}
      <View
        style={[
          styles.nav,
          { paddingTop: insets.top + SPACE[2], borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity
          onPress={() => { haptic(); router.back(); }}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>

        <Text style={[styles.navTitle, { color: colors.foreground }]}>
          Community Census
        </Text>

        {/* Right spacer — keeps title centred */}
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + SPACE[10] },
        ]}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Hero illustration header ── */}
        <View style={[styles.hero, { backgroundColor: GOLD + "0D" }]}>
          {/* Three-emoji illustration */}
          <View style={styles.illustRow}>
            <Text style={styles.illustSide}>🏘️</Text>
            <View style={[styles.illustCenter, { borderColor: GOLD + "44", backgroundColor: GOLD + "16" }]}>
              <Text style={styles.illustCenterEmoji}>📋</Text>
            </View>
            <Text style={styles.illustSide}>👥</Text>
          </View>

          <Text style={[styles.overline, { color: GOLD }]}>BNEI MENASHE PLATFORM</Text>

          <Text style={[styles.heroTitle, { color: colors.foreground }]}>
            Community Census
          </Text>

          <Text style={[styles.heroTagline, { color: colors.mutedForeground }]}>
            Know your community.{"\n"}Build your future.
          </Text>
        </View>

        {/* ── Stat chips ── */}
        <View style={styles.chipRow}>
          <View style={[styles.chip, { backgroundColor: GOLD + "14", borderColor: GOLD + "3A" }]}>
            <Feather name="clock" size={13} color={GOLD} />
            <Text style={[styles.chipText, { color: GOLD }]}>~10 minutes</Text>
          </View>
          <View style={[styles.chip, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="shield" size={13} color={colors.mutedForeground} />
            <Text style={[styles.chipText, { color: colors.mutedForeground }]}>Private &amp; secure</Text>
          </View>
          <View style={[styles.chip, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="users" size={13} color={colors.mutedForeground} />
            <Text style={[styles.chipText, { color: colors.mutedForeground }]}>Every family</Text>
          </View>
        </View>

        {/* ── Four information cards ── */}
        <View style={styles.cards}>
          <InfoCard
            icon="help-circle"
            title="What is Community Census?"
            body="A structured registration of every Bnei Menashe family — recording names, locations, family size, and aliyah status to build an accurate picture of the global community."
            colors={colors}
          />
          <InfoCard
            icon="trending-up"
            title="Why does it matter?"
            body="Accurate census data helps Shavei Israel plan aliyah, allocate resources, and advocate on behalf of our community. Every family counted strengthens our voice."
            colors={colors}
          />
          <InfoCard
            icon="lock"
            title="Your privacy is protected"
            body="All data is held securely by community administrators. Your information is never shared with third parties or displayed publicly without your consent."
            colors={colors}
          />
          <InfoCard
            icon="clock"
            title="How long does it take?"
            body="Most families complete the census in under 10 minutes. You can save your progress and return at any time — there is no session timeout."
            colors={colors}
          />
        </View>

        {/* ── Begin Census CTA ── */}
        <View style={styles.ctaWrap}>
          <TouchableOpacity
            style={[styles.beginBtn, { backgroundColor: GOLD }]}
            onPress={handleBegin}
            activeOpacity={0.82}
            accessibilityRole="button"
            accessibilityLabel="Begin Census — coming in the next update"
          >
            <Feather name="edit-3" size={18} color="#1a1100" />
            <Text style={styles.beginBtnText}>Begin Census</Text>
          </TouchableOpacity>

          <View style={styles.hintRow}>
            <Feather name="info" size={13} color={colors.mutedForeground} />
            <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
              Coming in the next update
            </Text>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1 },

  // Nav bar
  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACE[4],
    paddingBottom: SPACE[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 40, height: 40, justifyContent: "center" },
  navTitle: {
    fontSize: TEXT.md,
    fontWeight: "700",
    letterSpacing: -0.3,
  },

  // Scroll
  scroll: { gap: 0 },

  // Hero
  hero: {
    paddingTop: SPACE[8],
    paddingBottom: SPACE[6],
    paddingHorizontal: SPACE[6],
    alignItems: "center",
    gap: SPACE[2],
  },
  illustRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE[4],
    marginBottom: SPACE[4],
  },
  illustSide: { fontSize: 44, opacity: 0.85 },
  illustCenter: {
    width: 88,
    height: 88,
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  illustCenterEmoji: { fontSize: 52 },
  overline: {
    fontSize: TEXT.xs,
    fontWeight: "800",
    letterSpacing: 2.5,
    marginBottom: SPACE[1],
  },
  heroTitle: {
    fontSize: TEXT["3xl"],
    fontWeight: "800",
    letterSpacing: -0.8,
    textAlign: "center",
  },
  heroTagline: {
    fontSize: TEXT.lg,
    fontWeight: "400",
    textAlign: "center",
    lineHeight: 27,
    marginTop: SPACE[2],
  },

  // Chips
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACE[2],
    paddingHorizontal: SPACE[5],
    paddingVertical: SPACE[4],
    justifyContent: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE[1],
    borderWidth: 1,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACE[3],
    paddingVertical: 6,
  },
  chipText: { fontSize: TEXT.xs, fontWeight: "700", letterSpacing: 0.2 },

  // Info cards
  cards: {
    paddingHorizontal: SPACE[4],
    gap: SPACE[3],
    marginTop: SPACE[1],
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACE[4],
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: SPACE[4],
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  infoTitle: {
    fontSize: TEXT.md,
    fontWeight: "700",
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  infoBody: {
    fontSize: TEXT.sm,
    lineHeight: 20,
  },

  // CTA
  ctaWrap: {
    alignItems: "center",
    paddingHorizontal: SPACE[5],
    paddingTop: SPACE[6],
    gap: SPACE[3],
  },
  beginBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACE[2],
    width: "100%",
    borderRadius: RADIUS.full,
    paddingVertical: SPACE[4],
    paddingHorizontal: SPACE[8],
  },
  beginBtnText: {
    fontSize: TEXT.md,
    fontWeight: "800",
    color: "#1a1100",
    letterSpacing: -0.3,
  },
  hintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE[1],
  },
  hintText: {
    fontSize: TEXT.sm,
    fontWeight: "500",
  },
});
