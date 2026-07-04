/**
 * Community Hub — SPR-M009
 * Central hub for all Bnei Menashe community features:
 *   Announcements · Prayer Requests · Memorials · Events · Organizations · Learning · Synagogue
 *
 * Design: warm, organised, peaceful — large cards, generous whitespace, premium typography.
 * Reuses: existing community APIs, MMDL color tokens, bilingual t.* strings.
 * Does NOT: duplicate web logic, create social features, add likes/feeds.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, Platform,
  ActivityIndicator, StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";
import { SPACE, TEXT, RADIUS } from "@/constants/colors";
import { useLanguage } from "@/context/LanguageContext";
import { fetchAnnouncements, type MobileAnnouncement } from "@/lib/announcementsApi";
import { fetchPrayerRequests, type PrayerRequest } from "@/lib/prayerBoardApi";
import { fetchCommunityYahrzeit, type CommunityYahrzeitEntry } from "@/lib/communityApi";

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Prayer category colour + emoji mapping (mirrors prayer-board.tsx) */
const PRAYER_CAT: Record<string, { color: string; emoji: string }> = {
  Healing:    { color: "#4ade80", emoji: "💚" },
  Blessing:   { color: "#d4a843", emoji: "✨" },
  Aliyah:     { color: "#4ade80", emoji: "🇮🇱" },
  Family:     { color: "#f472b6", emoji: "👨‍👩‍👧‍👦" },
  Livelihood: { color: "#818cf8", emoji: "🌾" },
  Community:  { color: "#fb923c", emoji: "🫂" },
  Gratitude:  { color: "#fbbf24", emoji: "🙏" },
  Protection: { color: "#a78bfa", emoji: "🛡️" },
  Other:      { color: "#94a3b8", emoji: "✡" },
};

function fmtAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(ms / 3_600_000);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(ms / 86_400_000);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function haptic() {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

function navigate(path: string) {
  haptic();
  router.push(path as any);
}

// ── Sub-components ────────────────────────────────────────────────────────────

type Colors = ReturnType<typeof useColors>;

function SectionHeader({
  emoji, title, action, onAction, colors,
}: {
  emoji?: string;
  title: string;
  action?: string;
  onAction?: () => void;
  colors: Colors;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        <View style={[styles.sectionAccent, { backgroundColor: colors.primary }]} />
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
          {emoji ? `${emoji}  ` : ""}{title}
        </Text>
      </View>
      {action && onAction && (
        <TouchableOpacity
          onPress={onAction}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={action}
        >
          <Text style={[styles.seeAll, { color: colors.primary }]}>{action} →</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function EmptyCard({ icon, message, colors }: {
  icon: React.ComponentProps<typeof Feather>["name"];
  message: string;
  colors: Colors;
}) {
  return (
    <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      accessibilityLabel={message}
    >
      <Feather name={icon} size={28} color={colors.mutedForeground} />
      <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>{message}</Text>
    </View>
  );
}

function ComingSoonCard({ icon, title, hint, colors }: {
  icon: React.ComponentProps<typeof Feather>["name"];
  title: string;
  hint: string;
  colors: Colors;
}) {
  return (
    <View style={[styles.comingSoonCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.comingSoonIcon, { backgroundColor: colors.primary + "16" }]}>
        <Feather name={icon} size={22} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.comingSoonTitle, { color: colors.foreground }]}>{title}</Text>
        <Text style={[styles.comingSoonHint, { color: colors.mutedForeground }]}>{hint}</Text>
      </View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function CommunityScreen() {
  const colors = useColors();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const topPad = insets.top > 0 ? insets.top : (Platform.OS === "web" ? 60 : 20);

  const [announcements, setAnnouncements] = useState<MobileAnnouncement[]>([]);
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [memorials, setMemorials] = useState<CommunityYahrzeitEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [anns, prays, mems] = await Promise.allSettled([
      fetchAnnouncements(),
      fetchPrayerRequests(),
      fetchCommunityYahrzeit(),
    ]);
    if (anns.status === "fulfilled") setAnnouncements(anns.value);
    if (prays.status === "fulfilled") setPrayers(prays.value);
    if (mems.status === "fulfilled") setMemorials(mems.value);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const iv = setInterval(refresh, 60_000);
    return () => clearInterval(iv);
  }, [refresh]);

  const topAnnouncements = announcements.slice(0, 3);
  const approvedPrayers = prayers.filter((p) => p.status === "approved").slice(0, 3);
  const candleCount = memorials.length;
  const learnerCount = memorials.reduce((s, e) => s + e.learners.length, 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        accessibilityLabel="Community hub"
      >
        {/* ── Screen header ── */}
        <View style={[styles.header, { paddingTop: topPad + SPACE[3] }]}>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>BNEI MENASHE</Text>
          <Text style={[styles.hubTitle, { color: colors.foreground }]}>{t.commHubTitle}</Text>
          <View style={[styles.goldBar, { backgroundColor: colors.primary }]} />
          <Text style={[styles.hubSubtitle, { color: colors.mutedForeground }]}>{t.commHubSubtitle}</Text>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : (
          <View style={{ paddingHorizontal: SPACE[4] }}>

            {/* ═══ 1. ANNOUNCEMENTS ═══ */}
            <SectionHeader
              emoji="📢"
              title={t.commAnnouncementsTitle}
              action={announcements.length > 0 ? t.commSeeAll : undefined}
              onAction={() => navigate("/community/announcements")}
              colors={colors}
            />
            {topAnnouncements.length === 0 ? (
              <EmptyCard icon="bell" message={t.commAnnouncementsEmpty} colors={colors} />
            ) : topAnnouncements.map((ann) => (
              <TouchableOpacity
                key={ann.id}
                activeOpacity={0.82}
                onPress={() => navigate("/community/announcements")}
                accessibilityRole="button"
                accessibilityLabel={ann.title}
                style={[
                  styles.annCard,
                  {
                    backgroundColor: ann.pinned ? colors.primary + "0F" : colors.card,
                    borderColor: ann.pinned ? colors.primary + "55" : colors.border,
                  },
                ]}
              >
                <View style={[styles.annIconBox, {
                  backgroundColor: ann.pinned ? colors.primary + "22" : colors.muted,
                  borderColor: ann.pinned ? colors.primary + "44" : colors.border,
                }]}>
                  <Text style={{ fontSize: TEXT.xl }}>{ann.emoji}</Text>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  {ann.pinned && (
                    <Text style={[styles.pinnedLabel, { color: colors.primary }]}>
                      📌 {t.commAnnouncementsPinned}
                    </Text>
                  )}
                  <Text style={[styles.annTitle, { color: colors.foreground }]} numberOfLines={1}>
                    {ann.title}
                  </Text>
                  {!!ann.body && (
                    <Text style={[styles.annBody, { color: colors.mutedForeground }]} numberOfLines={2}>
                      {ann.body}
                    </Text>
                  )}
                  {!!ann.sentAt && (
                    <Text style={[styles.timeLabel, { color: colors.mutedForeground }]}>
                      {fmtAgo(ann.sentAt)}
                    </Text>
                  )}
                </View>
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} style={{ alignSelf: "center" }} />
              </TouchableOpacity>
            ))}

            {/* ═══ 2. PRAYER REQUESTS ═══ */}
            <SectionHeader
              emoji="🙏"
              title={t.commPrayerTitle}
              action={t.commPrayerSeeAll}
              onAction={() => navigate("/prayer-board")}
              colors={colors}
            />
            {approvedPrayers.length === 0 ? (
              <EmptyCard icon="heart" message={t.commPrayerEmpty} colors={colors} />
            ) : approvedPrayers.map((pr) => {
              const meta = PRAYER_CAT[pr.category] ?? PRAYER_CAT.Other;
              return (
                <TouchableOpacity
                  key={pr.id}
                  activeOpacity={0.82}
                  onPress={() => navigate("/prayer-board")}
                  accessibilityRole="button"
                  accessibilityLabel={pr.text}
                  style={[styles.prayCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                >
                  <View style={styles.prayCardHeader}>
                    <View style={[styles.catBadge, {
                      backgroundColor: meta.color + "1A",
                      borderColor: meta.color + "44",
                    }]}>
                      <Text style={{ fontSize: TEXT.xs }}>{meta.emoji} </Text>
                      <Text style={[styles.catText, { color: meta.color }]}>{pr.category}</Text>
                    </View>
                    <Text style={[styles.timeLabel, { color: colors.mutedForeground }]}>
                      {fmtAgo(pr.submittedAt)}
                    </Text>
                  </View>
                  <Text style={[styles.prayName, { color: colors.foreground }]}>
                    {pr.isAnonymous ? "Anonymous" : pr.name}
                  </Text>
                  <Text style={[styles.prayText, { color: colors.mutedForeground }]} numberOfLines={2}>
                    {pr.text}
                  </Text>
                  <View style={[styles.amenRow, { borderTopColor: colors.border }]}>
                    <Text style={{ fontSize: TEXT.sm }}>🤲</Text>
                    <Text style={[styles.amenText, { color: colors.mutedForeground }]}>
                      {t.commPrayerAmen} · {pr.amens}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={[styles.dashedCta, {
                borderColor: colors.primary + "55",
                backgroundColor: colors.primary + "0C",
              }]}
              onPress={() => navigate("/prayer-board")}
              accessibilityRole="button"
              accessibilityLabel={t.commPrayerSubmit}
              activeOpacity={0.75}
            >
              <Feather name="plus-circle" size={16} color={colors.primary} />
              <Text style={[styles.dashedCtaText, { color: colors.primary }]}>{t.commPrayerSubmit}</Text>
            </TouchableOpacity>

            {/* ═══ 3. COMMUNITY MEMORIALS ═══ */}
            <SectionHeader
              emoji="🕯"
              title={t.commMemorialsTitle}
              action={t.commMemorialsSeeAll}
              onAction={() => navigate("/community/memorials")}
              colors={colors}
            />
            <TouchableOpacity
              activeOpacity={0.88}
              onPress={() => navigate("/community/memorials")}
              accessibilityRole="button"
              accessibilityLabel={t.commMemorialsTitle}
              style={[styles.memSummary, {
                backgroundColor: colors.primary + "0A",
                borderColor: colors.primary + "33",
              }]}
            >
              {/* Stats row */}
              <View style={styles.memStatsRow}>
                <View style={styles.memStat} accessibilityLabel={`${candleCount} ${t.commMemorialsCandlesLit}`}>
                  <Text style={[styles.memStatNum, { color: colors.primary }]}>{candleCount}</Text>
                  <Text style={[styles.memStatLabel, { color: colors.mutedForeground }]}>
                    {t.commMemorialsCandlesLit.toUpperCase()}
                  </Text>
                </View>
                <View style={[styles.memStatDivider, { backgroundColor: colors.border }]} />
                <View style={styles.memStat} accessibilityLabel={`${learnerCount} ${t.commMemorialsLearning}`}>
                  <Text style={[styles.memStatNum, { color: colors.success }]}>{learnerCount}</Text>
                  <Text style={[styles.memStatLabel, { color: colors.mutedForeground }]}>
                    {t.commMemorialsLearning.toUpperCase()}
                  </Text>
                </View>
              </View>

              {/* Recent names */}
              {memorials.length > 0 ? (
                <View style={[styles.memNames, { borderTopColor: colors.primary + "22" }]}>
                  {memorials.slice(0, 4).map((m) => (
                    <Text key={m.id} style={[styles.memName, { color: colors.foreground }]} numberOfLines={1}>
                      🕯 {m.deceasedName}
                    </Text>
                  ))}
                  {memorials.length > 4 && (
                    <Text style={[styles.memMore, { color: colors.mutedForeground }]}>
                      +{memorials.length - 4} more
                    </Text>
                  )}
                </View>
              ) : (
                <Text style={[styles.memEmpty, { color: colors.mutedForeground }]}>
                  {t.commMemorialsEmpty}
                </Text>
              )}

              {/* CTA */}
              <View style={[styles.memCta, { backgroundColor: colors.primary }]}>
                <Text style={{ fontSize: TEXT.sm }}>🕯</Text>
                <Text style={[styles.memCtaText, { color: colors.primaryForeground }]}>
                  {t.commLightCandle}
                </Text>
              </View>
            </TouchableOpacity>

            {/* ═══ 4. UPCOMING EVENTS ═══ */}
            <SectionHeader
              emoji="📅"
              title={t.commEventsTitle}
              colors={colors}
            />
            <ComingSoonCard
              icon="calendar"
              title={t.commEventsSoon}
              hint={t.commEventsComingSoonHint}
              colors={colors}
            />

            {/* ═══ 5. ORGANIZATIONS ═══ */}
            <SectionHeader
              emoji="🏛"
              title={t.commOrgsTitle}
              colors={colors}
            />
            <View style={[styles.orgCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.orgBadge, { backgroundColor: "#1a3a22" }]}>
                <Text style={{ fontSize: TEXT.xl }}>✡</Text>
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={[styles.orgName, { color: colors.foreground }]}>Shavei Israel</Text>
                <Text style={[styles.orgDesc, { color: colors.mutedForeground }]}>{t.commOrgShaveiDesc}</Text>
                <Text style={[styles.orgLink, { color: colors.primary }]}>shavei.org</Text>
              </View>
            </View>
            <View style={[styles.orgCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.orgBadge, { backgroundColor: "#1a2e4a" }]}>
                <Text style={{ fontSize: TEXT.xl }}>🫂</Text>
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={[styles.orgName, { color: colors.foreground }]}>Bnei Menashe Federation</Text>
                <Text style={[styles.orgDesc, { color: colors.mutedForeground }]}>{t.commOrgFedDesc}</Text>
              </View>
            </View>

            {/* ═══ 6. LEARNING GROUPS ═══ */}
            <SectionHeader
              emoji="📚"
              title={t.commLearningTitle}
              colors={colors}
            />
            <ComingSoonCard
              icon="book-open"
              title={t.commLearningSoon}
              hint={t.commLearningComingSoonHint}
              colors={colors}
            />

            {/* ═══ 7. SYNAGOGUE ═══ */}
            <SectionHeader
              emoji="🕍"
              title={t.commSynagogueTitle}
              colors={colors}
            />
            <View
              style={[styles.synCard, {
                backgroundColor: colors.primary + "0A",
                borderColor: colors.primary + "33",
              }]}
              accessibilityLabel="Synagogue directory"
            >
              <Text style={{ fontSize: 40, marginBottom: SPACE[2] }}>🕍</Text>
              <Text style={[styles.synTitle, { color: colors.foreground }]}>{t.commSynagogueDirectoryTitle}</Text>
              <Text style={[styles.synBody, { color: colors.mutedForeground }]}>{t.commSynagogueDirectoryDesc}</Text>
            </View>

          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Header
  header: {
    paddingHorizontal: SPACE[4],
    paddingBottom: SPACE[4],
  },
  eyebrow: {
    fontSize: TEXT.xs,
    fontWeight: "700",
    letterSpacing: 1.4,
    marginBottom: SPACE[1],
  },
  hubTitle: {
    fontSize: TEXT["3xl"],
    fontWeight: "800",
    letterSpacing: -0.5,
    lineHeight: 38,
  },
  goldBar: {
    width: 40,
    height: 3,
    borderRadius: 2,
    marginTop: SPACE[2],
    marginBottom: SPACE[2],
  },
  hubSubtitle: {
    fontSize: TEXT.base,
    lineHeight: 20,
  },
  loadingBox: {
    alignItems: "center",
    paddingVertical: 60,
  },

  // Section headers
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: SPACE[8],
    marginBottom: SPACE[3],
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE[2],
  },
  sectionAccent: {
    width: 3,
    height: 18,
    borderRadius: 2,
  },
  sectionTitle: {
    fontSize: TEXT.md,
    fontWeight: "700",
  },
  seeAll: {
    fontSize: TEXT.sm,
    fontWeight: "600",
  },

  // Empty / Coming-soon
  emptyCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACE[5],
    alignItems: "center",
    gap: SPACE[2],
    marginBottom: SPACE[2],
  },
  emptyText: {
    fontSize: TEXT.sm,
    textAlign: "center",
  },
  comingSoonCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACE[4],
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE[3],
    marginBottom: SPACE[2],
  },
  comingSoonIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  comingSoonTitle: {
    fontSize: TEXT.base,
    fontWeight: "600",
    marginBottom: 2,
  },
  comingSoonHint: {
    fontSize: TEXT.sm,
    lineHeight: 18,
  },

  // Announcement cards
  annCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACE[3],
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACE[3],
    marginBottom: SPACE[2],
  },
  annIconBox: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  pinnedLabel: {
    fontSize: TEXT.xs,
    fontWeight: "700",
  },
  annTitle: {
    fontSize: TEXT.base,
    fontWeight: "700",
  },
  annBody: {
    fontSize: TEXT.sm,
    lineHeight: 18,
  },
  timeLabel: {
    fontSize: TEXT.xs,
  },

  // Prayer cards
  prayCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACE[4],
    marginBottom: SPACE[2],
  },
  prayCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACE[2],
  },
  catBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: RADIUS.full,
    borderWidth: 1,
    paddingHorizontal: SPACE[2],
    paddingVertical: 3,
  },
  catText: {
    fontSize: TEXT.xs,
    fontWeight: "700",
  },
  prayName: {
    fontSize: TEXT.sm,
    fontWeight: "700",
    marginBottom: 4,
  },
  prayText: {
    fontSize: TEXT.sm,
    lineHeight: 18,
    marginBottom: SPACE[3],
  },
  amenRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE[2],
    borderTopWidth: 1,
    paddingTop: SPACE[2],
  },
  amenText: {
    fontSize: TEXT.sm,
    fontWeight: "600",
  },
  dashedCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACE[2],
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: RADIUS.lg,
    paddingVertical: SPACE[3],
    marginBottom: SPACE[2],
  },
  dashedCtaText: {
    fontSize: TEXT.sm,
    fontWeight: "700",
  },

  // Memorials summary card
  memSummary: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACE[4],
    marginBottom: SPACE[2],
  },
  memStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACE[8],
    marginBottom: SPACE[4],
  },
  memStat: {
    alignItems: "center",
    gap: 2,
  },
  memStatNum: {
    fontSize: TEXT["2xl"],
    fontWeight: "900",
  },
  memStatLabel: {
    fontSize: TEXT.xs,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  memStatDivider: {
    width: 1,
    height: 36,
  },
  memNames: {
    borderTopWidth: 1,
    paddingTop: SPACE[3],
    marginBottom: SPACE[3],
    gap: SPACE[1],
  },
  memName: {
    fontSize: TEXT.sm,
    lineHeight: 22,
  },
  memMore: {
    fontSize: TEXT.xs,
    fontStyle: "italic",
  },
  memEmpty: {
    fontSize: TEXT.sm,
    textAlign: "center",
    marginBottom: SPACE[3],
  },
  memCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACE[2],
    borderRadius: RADIUS.md,
    paddingVertical: SPACE[3],
  },
  memCtaText: {
    fontSize: TEXT.sm,
    fontWeight: "700",
  },

  // Organizations
  orgCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACE[4],
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACE[3],
    marginBottom: SPACE[2],
  },
  orgBadge: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  orgName: {
    fontSize: TEXT.base,
    fontWeight: "700",
  },
  orgDesc: {
    fontSize: TEXT.sm,
    lineHeight: 18,
  },
  orgLink: {
    fontSize: TEXT.xs,
    fontWeight: "700",
  },

  // Synagogue
  synCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACE[6],
    alignItems: "center",
    marginBottom: SPACE[2],
  },
  synTitle: {
    fontSize: TEXT.md,
    fontWeight: "700",
    marginBottom: SPACE[2],
  },
  synBody: {
    fontSize: TEXT.sm,
    lineHeight: 20,
    textAlign: "center",
  },
});
