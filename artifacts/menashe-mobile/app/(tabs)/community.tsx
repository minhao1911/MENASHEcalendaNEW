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

import { useThemeTokens } from "@/src/mobile/design-system";
import type { ColorTokens } from "@/src/mobile/design-system";
import { useLanguage } from "@/context/LanguageContext";
import { fetchAnnouncements, type MobileAnnouncement } from "@/lib/announcementsApi";
import { fetchPrayerRequests, amenPrayerRequest, type PrayerRequest } from "@/lib/prayerBoardApi";
import { fetchCommunityYahrzeit, type CommunityYahrzeitEntry } from "@/lib/communityApi";
import { fetchCommunityEvents, type CommunityEvent } from "@/lib/eventsApi";

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

type Colors = ColorTokens;

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
  const { colors, sp, type: ty, rd } = useThemeTokens();
  const { t, lang } = useLanguage();
  const insets = useSafeAreaInsets();
  const topPad = insets.top > 0 ? insets.top : (Platform.OS === "web" ? 60 : 20);

  const [announcements, setAnnouncements] = useState<MobileAnnouncement[]>([]);
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [memorials, setMemorials] = useState<CommunityYahrzeitEntry[]>([]);
  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [hubAmens, setHubAmens] = useState<Set<string>>(new Set());

  function handleHubAmen(id: string) {
    if (hubAmens.has(id)) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setHubAmens((prev) => new Set(prev).add(id));
    setPrayers((prev) =>
      prev.map((r) => r.id === id ? { ...r, amens: r.amens + 1 } : r)
    );
    amenPrayerRequest(id).catch(() => {});
  }

  const refresh = useCallback(async () => {
    const [anns, prays, mems, evs] = await Promise.allSettled([
      fetchAnnouncements(),
      fetchPrayerRequests(),
      fetchCommunityYahrzeit(),
      fetchCommunityEvents(),
    ]);
    if (anns.status === "fulfilled") setAnnouncements(anns.value);
    if (prays.status === "fulfilled") setPrayers(prays.value);
    if (mems.status === "fulfilled") setMemorials(mems.value);
    if (evs.status === "fulfilled") setEvents(evs.value);
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
        {/* ── Community Hero ── */}
        <View style={[styles.hero, { paddingTop: topPad + sp[3] }]}>
          {/* Eyebrow */}
          <View style={[styles.heroBadge, { backgroundColor: colors.primary + "14", borderColor: colors.primary + "35" }]}>
            <Text style={{ fontSize: 12 }}>✡</Text>
            <Text style={[styles.heroBadgeText, { color: colors.primary }]}>BNEI MENASHE WORLDWIDE</Text>
          </View>

          {/* Hebrew title */}
          <Text style={styles.heroHebrew} accessibilityLabel="Bnei Menashe">בְּנֵי מְנַשֶּׁה</Text>

          {/* English title */}
          <Text style={[styles.hubTitle, { color: colors.foreground }]}>{t.commHubTitle}</Text>
          <View style={[styles.goldBar, { backgroundColor: colors.primary }]} />
          <Text style={[styles.hubSubtitle, { color: colors.mutedForeground }]}>{t.commHubSubtitle}</Text>

          {/* Community stats */}
          <View style={[styles.heroStats, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {[
              { val: "10,000+", labelKey: "commStatPopulation" as const },
              { val: "5,000+",  labelKey: "commStatAliyah" as const },
              { val: "54",      labelKey: "commStatParshiyot" as const },
            ].map((s, i) => (
              <View
                key={s.labelKey}
                style={[
                  styles.heroStatItem,
                  i < 2 && { borderRightWidth: 1, borderRightColor: colors.border },
                ]}
              >
                <Text style={[styles.heroStatVal, { color: colors.primary }]}>{s.val}</Text>
                <Text style={[styles.heroStatLabel, { color: colors.mutedForeground }]}>{t[s.labelKey]}</Text>
              </View>
            ))}
          </View>

          {/* Isaiah quote */}
          <View style={[styles.heroQuote, { borderLeftColor: colors.primary + "55" }]}>
            <Text style={[styles.heroQuoteText, { color: colors.mutedForeground }]}>
              "{t.commIsaiahQuote}"
            </Text>
            <Text style={[styles.heroQuoteRef, { color: colors.primary }]}>— {t.commIsaiahRef}</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.primary} size="large" />
          </View>
        ) : (
          <View style={{ paddingHorizontal: sp[4] }}>

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
                  <Text style={{ fontSize: ty.subtitle.fontSize }}>{ann.emoji}</Text>
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
                      <Text style={{ fontSize: ty.caption.fontSize }}>{meta.emoji} </Text>
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
                  <TouchableOpacity
                    onPress={(e) => { e.stopPropagation?.(); handleHubAmen(pr.id); }}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`${t.commPrayerAmen} ${pr.amens}`}
                    accessibilityState={{ selected: hubAmens.has(pr.id) }}
                    hitSlop={{ top: 11, bottom: 11, left: 8, right: 8 }}
                    style={[
                      styles.amenRow,
                      {
                        borderTopColor: colors.border,
                        borderRadius: rd.md,
                        paddingHorizontal: sp[2],
                        paddingVertical: sp[1],
                        backgroundColor: hubAmens.has(pr.id) ? (meta.color + "12") : "transparent",
                      },
                    ]}
                  >
                    <Text style={{ fontSize: ty.bodySm.fontSize }}>{hubAmens.has(pr.id) ? "🙏" : "🤲"}</Text>
                    <Text style={[styles.amenText, {
                      color: hubAmens.has(pr.id) ? meta.color : colors.mutedForeground,
                    }]}>
                      {t.commPrayerAmen} · {pr.amens}
                    </Text>
                  </TouchableOpacity>
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

              {/* CTAs row */}
              <View style={styles.memCtaRow}>
                <View style={[styles.memCta, { backgroundColor: colors.primary, flex: 1 }]}>
                  <Text style={{ fontSize: ty.bodySm.fontSize }}>🕯</Text>
                  <Text style={[styles.memCtaText, { color: colors.primaryForeground }]}>
                    {t.commLightCandle}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={(e) => { e.stopPropagation?.(); navigate("/sacred-memory"); }}
                  activeOpacity={0.82}
                  accessibilityRole="button"
                  accessibilityLabel={t.commEnterSanctuary}
                  style={[styles.memSanctuaryCta, { borderColor: colors.primary + "55" }]}
                >
                  <Text style={{ fontSize: ty.bodySm.fontSize }}>✨</Text>
                  <Text style={[styles.memCtaText, { color: colors.primary }]}>
                    {t.commEnterSanctuary}
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>

            {/* ═══ 4. UPCOMING EVENTS ═══ */}
            <SectionHeader
              emoji="📅"
              title={t.commEventsTitle}
              action={events.length > 0 ? t.commEventsSeeAll : undefined}
              onAction={() => navigate("/community/events")}
              colors={colors}
            />
            {events.length === 0 ? (
              <TouchableOpacity
                onPress={() => navigate("/community/events")}
                activeOpacity={0.82}
                accessibilityRole="button"
                accessibilityLabel="View upcoming events"
                style={[styles.comingSoonCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={[styles.comingSoonIcon, { backgroundColor: colors.primary + "16" }]}>
                  <Feather name="calendar" size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.comingSoonTitle, { color: colors.foreground }]}>
                    {t.commEventsTitle}
                  </Text>
                  <Text style={[styles.comingSoonHint, { color: colors.mutedForeground }]}>
                    {t.commEventsComingSoonHint}
                  </Text>
                </View>
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
              </TouchableOpacity>
            ) : (
              <>
                {events.slice(0, 3).map((ev) => {
                  const EVENT_COLORS: Record<string, string> = {
                    shabbat: "#d4a843", holiday: "#818cf8",
                    community: "#fb923c", learning: "#4ade80",
                  };
                  const accentColor = EVENT_COLORS[ev.type] ?? colors.primary;
                  const [y, m, d] = ev.date.split("-").map(Number);
                  const dateObj = new Date(y, m - 1, d);
                  const dayNum  = dateObj.toLocaleDateString("en-US", { day: "numeric" });
                  const month   = dateObj.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
                  const weekday = dateObj.toLocaleDateString("en-US", { weekday: "short" });

                  return (
                    <TouchableOpacity
                      key={ev.id}
                      activeOpacity={0.82}
                      onPress={() => navigate("/community/events")}
                      accessibilityRole="button"
                      accessibilityLabel={ev.title}
                      style={[styles.eventCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                    >
                      {/* Date column */}
                      <View style={[styles.eventDateBox, { backgroundColor: accentColor + "18" }]}>
                        <Text style={[styles.eventMonth, { color: accentColor }]}>{month}</Text>
                        <Text style={[styles.eventDay, { color: colors.foreground }]}>{dayNum}</Text>
                        <Text style={[styles.eventWeekday, { color: colors.mutedForeground }]}>{weekday}</Text>
                      </View>
                      {/* Content */}
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text style={[styles.eventEmoji]}>{ev.emoji}</Text>
                        <Text style={[styles.eventTitle, { color: colors.foreground }]} numberOfLines={1}>
                          {ev.title}
                        </Text>
                        {ev.location ? (
                          <View style={styles.eventLocRow}>
                            <Feather name={ev.virtual ? "video" : "map-pin"} size={11} color={colors.mutedForeground} />
                            <Text style={[styles.eventLoc, { color: colors.mutedForeground }]} numberOfLines={1}>
                              {ev.location}
                            </Text>
                          </View>
                        ) : null}
                        {ev.time ? (
                          <Text style={[styles.eventTime, { color: accentColor }]}>{ev.time}</Text>
                        ) : null}
                      </View>
                      {ev.recurring && (
                        <View style={[styles.recBadge, { backgroundColor: accentColor + "16", borderColor: accentColor + "44" }]}>
                          <Feather name="repeat" size={10} color={accentColor} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
                <TouchableOpacity
                  style={[styles.dashedCta, { borderColor: colors.primary + "55", backgroundColor: colors.primary + "0C" }]}
                  onPress={() => navigate("/community/events")}
                  accessibilityRole="button"
                  accessibilityLabel={t.commEventsSeeAll}
                  activeOpacity={0.75}
                >
                  <Feather name="calendar" size={16} color={colors.primary} />
                  <Text style={[styles.dashedCtaText, { color: colors.primary }]}>{t.commEventsSeeAll}</Text>
                </TouchableOpacity>
              </>
            )}

            {/* ═══ 5. ORGANIZATIONS ═══ */}
            <SectionHeader
              emoji="🏛"
              title={t.commOrgsTitle}
              action={t.commOrgsSeeAll}
              onAction={() => navigate("/community/organizations")}
              colors={colors}
            />
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() => navigate("/community/organizations")}
              accessibilityRole="button"
              accessibilityLabel="Shavei Israel"
              style={[styles.orgCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={[styles.orgBadge, { backgroundColor: "#1a3a22" }]}>
                <Text style={{ fontSize: ty.subtitle.fontSize }}>✡</Text>
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={[styles.orgName, { color: colors.foreground }]}>Shavei Israel</Text>
                <Text style={[styles.orgDesc, { color: colors.mutedForeground }]}>{t.commOrgShaveiDesc}</Text>
                <Text style={[styles.orgLink, { color: colors.primary }]}>shavei.org</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.82}
              onPress={() => navigate("/community/organizations")}
              accessibilityRole="button"
              accessibilityLabel="Bnei Menashe Federation"
              style={[styles.orgCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={[styles.orgBadge, { backgroundColor: "#1a2e4a" }]}>
                <Text style={{ fontSize: ty.subtitle.fontSize }}>🫂</Text>
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={[styles.orgName, { color: colors.foreground }]}>Bnei Menashe Federation</Text>
                <Text style={[styles.orgDesc, { color: colors.mutedForeground }]}>{t.commOrgFedDesc}</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.dashedCta, { borderColor: colors.primary + "55", backgroundColor: colors.primary + "0C" }]}
              onPress={() => navigate("/community/organizations")}
              accessibilityRole="button"
              accessibilityLabel={t.commOrgsSeeAll}
              activeOpacity={0.75}
            >
              <Feather name="external-link" size={16} color={colors.primary} />
              <Text style={[styles.dashedCtaText, { color: colors.primary }]}>{t.commOrgsSeeAll}</Text>
            </TouchableOpacity>

            {/* ═══ 6. LEARNING GROUPS ═══ */}
            <SectionHeader
              emoji="📚"
              title={t.commLearningTitle}
              action={t.commLearningSeeAll}
              onAction={() => navigate("/community/learning-groups")}
              colors={colors}
            />
            {/* Preview: 3 featured groups */}
            {[
              { emoji: "📖", name: "Daf Yomi Circle", nameTK: "Daf Yomi Kihilna", schedule: "Daily", scheduleTK: "Zingkhan", virtual: true },
              { emoji: "📜", name: "Weekly Parasha Study", nameTK: "Parasha Kihilna", schedule: "Shabbat · 09:30", scheduleTK: "Shabbat · 09:30", virtual: false },
              { emoji: "🕍", name: "Halacha for Bnei Menashe", nameTK: "Bnei Menashe Halacha", schedule: "Thu · 20:00", scheduleTK: "Kir · 20:00", virtual: true },
            ].map((g) => (
              <TouchableOpacity
                key={g.name}
                activeOpacity={0.82}
                onPress={() => navigate("/community/learning-groups")}
                accessibilityRole="button"
                accessibilityLabel={lang === "tk" ? g.nameTK : g.name}
                style={[styles.learnCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={[styles.learnEmoji, { backgroundColor: colors.primary + "16" }]}>
                  <Text style={{ fontSize: ty.subtitle.fontSize }}>{g.emoji}</Text>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.learnName, { color: colors.foreground }]} numberOfLines={1}>
                    {lang === "tk" ? g.nameTK : g.name}
                  </Text>
                  <View style={styles.learnMeta}>
                    <Feather name={g.virtual ? "video" : "map-pin"} size={11} color={colors.mutedForeground} />
                    <Text style={[styles.learnSchedule, { color: colors.mutedForeground }]}>
                      {lang === "tk" ? g.scheduleTK : g.schedule}
                    </Text>
                  </View>
                </View>
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} style={{ alignSelf: "center" }} />
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.dashedCta, { borderColor: colors.primary + "55", backgroundColor: colors.primary + "0C" }]}
              onPress={() => navigate("/community/learning-groups")}
              accessibilityRole="button"
              accessibilityLabel={t.commLearningSeeAll}
              activeOpacity={0.75}
            >
              <Feather name="book-open" size={16} color={colors.primary} />
              <Text style={[styles.dashedCtaText, { color: colors.primary }]}>{t.commLearningSeeAll}</Text>
            </TouchableOpacity>

            {/* ═══ 7. SYNAGOGUE ═══ */}
            <SectionHeader
              emoji="🕍"
              title={t.commSynagogueTitle}
              action={t.commSynagogueSeeAll}
              onAction={() => navigate("/community/synagogues")}
              colors={colors}
            />
            {/* Preview: top 3 synagogues by country priority */}
            {[
              { id: "churachandpur", flag: "🇮🇳", name: "Beit Knesset Bnei Menashe", nameTK: "Beit Knesset Bnei Menashe", city: "Churachandpur, India", members: 220, type: "Beit Knesset" },
              { id: "jerusalem",     flag: "🇮🇱", name: "Bnei Menashe Olim Community", nameTK: "Jerusalem Bnei Menashe Olim", city: "Jerusalem, Israel", members: 310, type: "Community Center" },
              { id: "aizawl",        flag: "🇮🇳", name: "Bnei Menashe Community — Aizawl", nameTK: "Aizawl Bnei Menashe Mipil", city: "Aizawl, India", members: 140, type: "Prayer Group" },
            ].map((syn) => (
              <TouchableOpacity
                key={syn.id}
                activeOpacity={0.82}
                onPress={() => navigate("/community/synagogues")}
                accessibilityRole="button"
                accessibilityLabel={lang === "tk" ? syn.nameTK : syn.name}
                style={[styles.synPreviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={[styles.synFlagBox, { backgroundColor: colors.primary + "12" }]}>
                  <Text style={{ fontSize: ty.subtitle.fontSize }}>{syn.flag}</Text>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={[styles.synPreviewName, { color: colors.foreground }]} numberOfLines={1}>
                    {lang === "tk" ? syn.nameTK : syn.name}
                  </Text>
                  <Text style={[styles.synPreviewCity, { color: colors.mutedForeground }]}>{syn.city}</Text>
                  <View style={styles.synMeta}>
                    <Feather name="users" size={11} color={colors.mutedForeground} />
                    <Text style={[styles.synMetaText, { color: colors.mutedForeground }]}>{syn.members} {t.commMembersCount}</Text>
                    <Text style={[styles.synType, { color: colors.primary }]}>· {syn.type}</Text>
                  </View>
                </View>
                <Feather name="chevron-right" size={16} color={colors.mutedForeground} style={{ alignSelf: "center" }} />
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.dashedCta, { borderColor: colors.primary + "55", backgroundColor: colors.primary + "0C" }]}
              onPress={() => navigate("/community/synagogues")}
              accessibilityRole="button"
              accessibilityLabel={t.commSynagogueSeeAll}
              activeOpacity={0.75}
            >
              <Text style={{ fontSize: ty.bodySm.fontSize }}>🕍</Text>
              <Text style={[styles.dashedCtaText, { color: colors.primary }]}>{t.commSynagogueSeeAll}</Text>
            </TouchableOpacity>

          </View>
        )}

        {/* ── §8  Community Census ── */}
        <View style={[styles.section, { paddingBottom: sp[4] }]}>
          <SectionHeader
            emoji="📋"
            title="Community Census"
            action={t.commSeeAll}
            onAction={() => navigate("/census")}
            colors={colors}
          />
          <TouchableOpacity
            style={[styles.censusEntryCard, {
              backgroundColor: "#d4a84310",
              borderColor: "#d4a84340",
            }]}
            onPress={() => navigate("/census")}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Community Census — register your family"
          >
            <View style={[styles.censusEntryIconBox, {
              backgroundColor: "#d4a84318",
              borderColor: "#d4a84338",
            }]}>
              <Feather name="users" size={26} color="#d4a843" />
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={[styles.censusEntryOverline, { color: "#d4a843" }]}>
                BNEI MENASHE
              </Text>
              <Text style={[styles.censusEntryTitle, { color: colors.foreground }]}>
                Community Census
              </Text>
              <Text style={[styles.censusEntryDesc, { color: colors.mutedForeground }]}>
                Register your family and help build an accurate picture of our global community.
              </Text>
            </View>
            <Feather name="arrow-right" size={18} color="#d4a843" style={{ alignSelf: "center", marginLeft: sp[2] }} />
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Header
  hero: {
    paddingHorizontal: sp[4],
    paddingBottom: sp[5],
    alignItems: "flex-start",
  },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: sp[1],
    borderWidth: 1,
    borderRadius: 99,
    paddingHorizontal: sp[3],
    paddingVertical: sp[1],
    marginBottom: sp[3],
  },
  heroBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  heroHebrew: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 1,
    color: "#D4AF37",
    marginBottom: sp[1],
    textAlign: "left",
  },
  heroStats: {
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    marginTop: sp[4],
    overflow: "hidden",
    alignSelf: "stretch",
  },
  heroStatItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: sp[3],
    gap: 2,
  },
  heroStatVal: {
    fontSize: ty.subtitle.fontSize,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  heroStatLabel: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.6,
    textAlign: "center",
  },
  heroQuote: {
    marginTop: sp[4],
    borderLeftWidth: 3,
    paddingLeft: sp[3],
    gap: sp[1],
  },
  heroQuoteText: {
    fontSize: ty.bodySm.fontSize,
    lineHeight: 20,
    fontStyle: "italic",
  },
  heroQuoteRef: {
    fontSize: ty.caption.fontSize,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  eyebrow: {
    fontSize: ty.caption.fontSize,
    fontWeight: "700",
    letterSpacing: 1.4,
    marginBottom: sp[1],
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
    marginTop: sp[2],
    marginBottom: sp[2],
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
    marginTop: sp[8],
    marginBottom: sp[3],
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: sp[2],
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
    fontSize: ty.bodySm.fontSize,
    fontWeight: "600",
  },

  // Empty / Coming-soon
  emptyCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: sp[5],
    alignItems: "center",
    gap: sp[2],
    marginBottom: sp[2],
  },
  emptyText: {
    fontSize: ty.bodySm.fontSize,
    textAlign: "center",
  },
  comingSoonCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: sp[4],
    flexDirection: "row",
    alignItems: "center",
    gap: sp[3],
    marginBottom: sp[2],
  },
  comingSoonIcon: {
    width: 44,
    height: 44,
    borderRadius: rd.md,
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
    fontSize: ty.bodySm.fontSize,
    lineHeight: 18,
  },

  // Announcement cards
  annCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: sp[3],
    flexDirection: "row",
    alignItems: "flex-start",
    gap: sp[3],
    marginBottom: sp[2],
  },
  annIconBox: {
    width: 48,
    height: 48,
    borderRadius: rd.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  pinnedLabel: {
    fontSize: ty.caption.fontSize,
    fontWeight: "700",
  },
  annTitle: {
    fontSize: TEXT.base,
    fontWeight: "700",
  },
  annBody: {
    fontSize: ty.bodySm.fontSize,
    lineHeight: 18,
  },
  timeLabel: {
    fontSize: ty.caption.fontSize,
  },

  // Prayer cards
  prayCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: sp[4],
    marginBottom: sp[2],
  },
  prayCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: sp[2],
  },
  catBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: RADIUS.full,
    borderWidth: 1,
    paddingHorizontal: sp[2],
    paddingVertical: 3,
  },
  catText: {
    fontSize: ty.caption.fontSize,
    fontWeight: "700",
  },
  prayName: {
    fontSize: ty.bodySm.fontSize,
    fontWeight: "700",
    marginBottom: 4,
  },
  prayText: {
    fontSize: ty.bodySm.fontSize,
    lineHeight: 18,
    marginBottom: sp[3],
  },
  amenRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: sp[2],
    borderTopWidth: 1,
    paddingTop: sp[2],
  },
  amenText: {
    fontSize: ty.bodySm.fontSize,
    fontWeight: "600",
  },
  dashedCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: sp[2],
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderRadius: RADIUS.lg,
    paddingVertical: sp[3],
    marginBottom: sp[2],
  },
  dashedCtaText: {
    fontSize: ty.bodySm.fontSize,
    fontWeight: "700",
  },

  // Memorials summary card
  memSummary: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: sp[4],
    marginBottom: sp[2],
  },
  memStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: sp[8],
    marginBottom: sp[4],
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
    fontSize: ty.caption.fontSize,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  memStatDivider: {
    width: 1,
    height: 36,
  },
  memNames: {
    borderTopWidth: 1,
    paddingTop: sp[3],
    marginBottom: sp[3],
    gap: sp[1],
  },
  memName: {
    fontSize: ty.bodySm.fontSize,
    lineHeight: 22,
  },
  memMore: {
    fontSize: ty.caption.fontSize,
    fontStyle: "italic",
  },
  memEmpty: {
    fontSize: ty.bodySm.fontSize,
    textAlign: "center",
    marginBottom: sp[3],
  },
  memCtaRow: {
    flexDirection: "row",
    gap: sp[2],
    marginTop: sp[2],
  },
  memCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: sp[2],
    borderRadius: rd.md,
    paddingVertical: sp[3],
  },
  memSanctuaryCta: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: sp[2],
    borderRadius: rd.md,
    paddingVertical: sp[3],
    borderWidth: 1,
    minHeight: 44,
  },
  memCtaText: {
    fontSize: ty.bodySm.fontSize,
    fontWeight: "700",
  },

  // Organizations
  orgCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: sp[4],
    flexDirection: "row",
    alignItems: "flex-start",
    gap: sp[3],
    marginBottom: sp[2],
  },
  orgBadge: {
    width: 48,
    height: 48,
    borderRadius: rd.md,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  orgName: {
    fontSize: TEXT.base,
    fontWeight: "700",
  },
  orgDesc: {
    fontSize: ty.bodySm.fontSize,
    lineHeight: 18,
  },
  orgLink: {
    fontSize: ty.caption.fontSize,
    fontWeight: "700",
  },

  // Event cards
  eventCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: sp[3],
    flexDirection: "row",
    alignItems: "stretch",
    gap: sp[3],
    marginBottom: sp[2],
  },
  eventDateBox: {
    width: 52,
    borderRadius: rd.md,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: sp[2],
    flexShrink: 0,
  },
  eventMonth: {
    fontSize: ty.caption.fontSize,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  eventDay: {
    fontSize: TEXT["2xl"],
    fontWeight: "900",
    lineHeight: 28,
  },
  eventWeekday: {
    fontSize: ty.caption.fontSize,
    fontWeight: "600",
  },
  eventEmoji: {
    fontSize: TEXT.base,
  },
  eventTitle: {
    fontSize: TEXT.base,
    fontWeight: "700",
  },
  eventLocRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  eventLoc: {
    fontSize: ty.caption.fontSize,
    flex: 1,
  },
  eventTime: {
    fontSize: ty.caption.fontSize,
    fontWeight: "700",
  },
  recBadge: {
    borderWidth: 1,
    borderRadius: RADIUS.full,
    width: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    flexShrink: 0,
  },

  // Learning group preview cards
  learnCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: sp[3],
    flexDirection: "row",
    alignItems: "center",
    gap: sp[3],
    marginBottom: sp[2],
  },
  learnEmoji: {
    width: 48,
    height: 48,
    borderRadius: rd.md,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  learnName: {
    fontSize: TEXT.base,
    fontWeight: "700",
  },
  learnMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  learnSchedule: {
    fontSize: ty.bodySm.fontSize,
  },

  // Synagogue preview cards
  synPreviewCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: sp[3],
    flexDirection: "row",
    alignItems: "center",
    gap: sp[3],
    marginBottom: sp[2],
  },
  synFlagBox: {
    width: 48,
    height: 48,
    borderRadius: rd.md,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  synPreviewName: {
    fontSize: TEXT.base,
    fontWeight: "700",
  },
  synPreviewCity: {
    fontSize: ty.bodySm.fontSize,
  },
  synMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  synMetaText: {
    fontSize: ty.caption.fontSize,
  },
  synType: {
    fontSize: ty.caption.fontSize,
    fontWeight: "700",
  },

  // Community Census entry card (§8)
  censusEntryCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: RADIUS.xl,
    borderWidth: 1.5,
    padding: sp[4],
    gap: sp[3],
  },
  censusEntryIconBox: {
    width: 52,
    height: 52,
    borderRadius: rd.md,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  censusEntryOverline: {
    fontSize: ty.caption.fontSize,
    fontWeight: "800",
    letterSpacing: 2,
  },
  censusEntryTitle: {
    fontSize: TEXT.md,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  censusEntryDesc: {
    fontSize: ty.bodySm.fontSize,
    lineHeight: 19,
  },
});
