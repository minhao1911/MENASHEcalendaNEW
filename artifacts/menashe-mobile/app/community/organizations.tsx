/**
 * Community · Organizations — full list screen
 * Deep screen navigated to from the Community Hub (§5).
 * Static, curated organization/resource directory — read-only on mobile
 * (mirrors the same categories used in the web Community modal).
 */

import React, { memo } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, Platform,
  StyleSheet, Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";
import { SPACE, TEXT, RADIUS } from "@/constants/colors";
import { useLanguage } from "@/context/LanguageContext";

// ── Organization data ──────────────────────────────────────────────────────

interface Organization {
  id: string;
  emoji: string;
  name: string;
  descKey:
    | "commOrgShaveiDesc"
    | "commOrgFedDesc"
    | "commOrgHotlineDesc"
    | "commOrgNewsletterDesc"
    | "commOrgTorahClassesDesc"
    | "commOrgConnectDesc";
  url?: string;
  color: string;
}

const ORGANIZATIONS: Organization[] = [
  { id: "shavei", emoji: "✡", name: "Shavei Israel", descKey: "commOrgShaveiDesc", url: "https://www.shavei.org", color: "#1a3a22" },
  { id: "federation", emoji: "🫂", name: "Bnei Menashe Federation", descKey: "commOrgFedDesc", color: "#1a2e4a" },
  { id: "hotline", emoji: "📞", name: "Community Hotline", descKey: "commOrgHotlineDesc", color: "#3a2508" },
  { id: "newsletter", emoji: "📰", name: "Bnei Menashe Newsletter", descKey: "commOrgNewsletterDesc", color: "#2a1e3a" },
  { id: "torah", emoji: "🎓", name: "Torah Classes", descKey: "commOrgTorahClassesDesc", color: "#0e3a2e" },
  { id: "connect", emoji: "🤝", name: "Connect with Members", descKey: "commOrgConnectDesc", color: "#3a1e1e" },
];

// ── Organization card ──────────────────────────────────────────────────────

const OrgCard = memo(function OrgCard({
  org, colors, t,
}: {
  org: Organization;
  colors: ReturnType<typeof useColors>;
  t: ReturnType<typeof useLanguage>["t"];
}) {
  function handleVisit() {
    if (!org.url) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(org.url);
  }

  return (
    <View
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      accessibilityLabel={org.name}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.iconBox, { backgroundColor: org.color }]}>
          <Text style={{ fontSize: 22 }}>{org.emoji}</Text>
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={[styles.cardName, { color: colors.foreground }]} numberOfLines={1}>
            {org.name}
          </Text>
          <Text style={[styles.cardDesc, { color: colors.mutedForeground }]}>
            {t[org.descKey]}
          </Text>
        </View>
      </View>

      {org.url && (
        <TouchableOpacity
          onPress={handleVisit}
          style={[styles.actionBtn, { borderColor: colors.primary + "55", backgroundColor: colors.primary + "0E" }]}
          accessibilityRole="button"
          accessibilityLabel={`${t.commOrgVisitSite} ${org.name}`}
        >
          <Feather name="external-link" size={14} color={colors.primary} />
          <Text style={[styles.actionText, { color: colors.primary }]}>{t.commOrgVisitSite}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

// ── Screen ─────────────────────────────────────────────────────────────────

export default function OrganizationsScreen() {
  const colors = useColors();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const topPad = insets.top > 0 ? insets.top : (Platform.OS === "web" ? 60 : 20);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: topPad + SPACE[2] }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel={t.commBack}
          style={styles.backBtn}
        >
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={[styles.screenEyebrow, { color: colors.primary }]}>COMMUNITY</Text>
          <Text style={[styles.screenTitle, { color: colors.foreground }]}>
            {t.commOrgsTitle}
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: SPACE[4], paddingBottom: insets.bottom + 100 }}
        accessibilityLabel="Organizations directory"
      >
        <Text style={[styles.intro, { color: colors.mutedForeground }]}>
          {t.commOrgsScreenDesc}
        </Text>

        <View style={[styles.statsBar, { backgroundColor: colors.primary + "0C", borderColor: colors.primary + "22" }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: colors.primary }]}>{ORGANIZATIONS.length}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{t.commOrgsStatOrgs.toUpperCase()}</Text>
          </View>
        </View>

        {ORGANIZATIONS.map((org) => (
          <OrgCard key={org.id} org={org} colors={colors} t={t} />
        ))}
      </ScrollView>
    </View>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACE[4],
    paddingBottom: SPACE[4],
    gap: SPACE[3],
  },
  backBtn: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: { flex: 1 },
  screenEyebrow: {
    fontSize: TEXT.xs,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  screenTitle: {
    fontSize: TEXT["2xl"],
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  intro: {
    fontSize: TEXT.sm,
    lineHeight: 20,
    marginBottom: SPACE[4],
    marginTop: SPACE[2],
  },
  statsBar: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACE[4],
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACE[6],
    marginBottom: SPACE[6],
  },
  statItem: { alignItems: "center", gap: 2 },
  statNum: { fontSize: TEXT["2xl"], fontWeight: "900" },
  statLabel: { fontSize: TEXT.xs, fontWeight: "700", letterSpacing: 0.5 },

  card: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACE[4],
    marginBottom: SPACE[3],
    gap: SPACE[3],
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACE[3],
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardName: { fontSize: TEXT.base, fontWeight: "700" },
  cardDesc: { fontSize: TEXT.sm, lineHeight: 18, marginTop: 2 },

  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingVertical: SPACE[2],
    paddingHorizontal: SPACE[3],
    minHeight: 44,
    alignSelf: "flex-start",
  },
  actionText: { fontSize: TEXT.sm, fontWeight: "600" },
});
