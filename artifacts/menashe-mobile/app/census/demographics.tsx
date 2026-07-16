/**
 * Census & Demographics — Mobile
 *
 * Full Census & Demographics dashboard matching the web modal.
 * Three tabs: Dashboard · Admin · Local Admin
 *
 * Design system: useColors() + SPACE/TEXT/RADIUS constants (matches all
 * census form screens). colors.primary = brand gold in dark, warm brown
 * in light — never hard-code #d4a843 here.
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  RefreshControl,
  Alert,
  TextInput,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useAuth } from "@clerk/expo";

import { useColors } from "@/hooks/useColors";
import { SPACE, TEXT, RADIUS } from "@/constants/colors";
import {
  fetchCensusSubmissions,
  fetchCensusMemberSubmissions,
  fetchMyBranch,
  reviewSubmission,
} from "@/lib/censusApi";
import type { CensusSubmission, MemberSubmission, BranchData } from "@/lib/censusApi";

const GOLD = "#d4a843";
const GREEN = "#4ade80";
const BLUE  = "#4f8ef7";

function haptic() {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

/* ── Static data ─────────────────────────────────────────────────────────── */
type Tab = "dashboard" | "admin" | "localadmin";

interface StatEntry {
  id: string; label: string; value: string; icon: string;
  trend?: string; trendUp?: boolean;
}
interface CityEntry {
  id: string; name: string; pop: number; country: "israel" | "india"; region: string;
}

const STATS: StatEntry[] = [
  { id: "total",     label: "Total Community Members",       value: "9,700+",            icon: "👥",  trend: "+3.2%", trendUp: true  },
  { id: "aliyah",   label: "Returned to Israel (Aliyah)",   value: "4,800+",            icon: "✈️",  trend: "+5.1%", trendUp: true  },
  { id: "india",    label: "Awaiting Aliyah in India",      value: "4,900+",            icon: "🇮🇳",  trend: "−1.4%", trendUp: false },
  { id: "cities",   label: "Main Cities in Israel",         value: "12",                icon: "🏙️"                                   },
  { id: "states",   label: "Indian States Represented",     value: "Manipur &\nMizoram", icon: "📍"                                  },
  { id: "rabbinate",label: "Recognized by Chief Rabbinate", value: "2005",              icon: "📜"                                   },
];

const CITIES: CityEntry[] = [
  { id: "c1", name: "Kiryat Arba",   pop: 450,  country: "israel", region: "Judea & Samaria"   },
  { id: "c2", name: "Be'er Sheva",   pop: 380,  country: "israel", region: "Negev"              },
  { id: "c3", name: "Natzrat Illit", pop: 320,  country: "israel", region: "Galilee"            },
  { id: "c4", name: "Jerusalem",     pop: 280,  country: "israel", region: "Jerusalem District" },
  { id: "c5", name: "Rehovot",       pop: 220,  country: "israel", region: "Central District"   },
  { id: "c6", name: "Haifa",         pop: 180,  country: "israel", region: "Northern District"  },
  { id: "c7", name: "Imphal",        pop: 2100, country: "india",  region: "Manipur"            },
  { id: "c8", name: "Aizawl",        pop: 1800, country: "india",  region: "Mizoram"            },
  { id: "c9", name: "Churachandpur", pop: 650,  country: "india",  region: "Manipur"            },
];

/* ── Shared primitives ───────────────────────────────────────────────────── */

function SectionHeader({
  label, right, colors,
}: {
  label: string;
  right?: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.secHeader}>
      <View style={[styles.secBar, { backgroundColor: GOLD }]} />
      <Text style={[styles.secLabel, { color: colors.mutedForeground }]}>{label}</Text>
      {right && (
        <Text style={[styles.secRight, { color: colors.mutedForeground }]}>{right}</Text>
      )}
    </View>
  );
}

/* ── STAT CARD ───────────────────────────────────────────────────────────── */
function StatCard({ stat, colors }: { stat: StatEntry; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={styles.statIcon}>{stat.icon}</Text>
      <Text style={[styles.statValue, { color: colors.primary }]} numberOfLines={2}>
        {stat.value}
      </Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]} numberOfLines={2}>
        {stat.label}
      </Text>
      {stat.trend !== undefined && (
        <Text style={[styles.statTrend, { color: stat.trendUp ? GREEN : "#f87171" }]}>
          {stat.trendUp ? "▲" : "▼"} {stat.trend}
        </Text>
      )}
    </View>
  );
}

/* ── DISTRIBUTION BAR ────────────────────────────────────────────────────── */
function DistributionSection({
  label, list, barColor, colors,
}: {
  label: string; list: CityEntry[]; barColor: string; colors: ReturnType<typeof useColors>;
}) {
  const max   = list[0]?.pop || 1;
  const total = list.reduce((s, c) => s + c.pop, 0);
  return (
    <View style={{ marginBottom: SPACE[4] }}>
      <SectionHeader label={label} right={`${total.toLocaleString()} documented`} colors={colors} />
      <View style={[styles.distCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {list.map((c, i) => (
          <View
            key={c.id}
            style={[
              styles.distRow,
              i < list.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
            ]}
          >
            <View style={styles.distRowTop}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.distCity, { color: colors.foreground }]}>{c.name}</Text>
                <Text style={[styles.distRegion, { color: colors.mutedForeground }]}>{c.region}</Text>
              </View>
              <Text style={[styles.distPop, { color: barColor }]}>~{c.pop}</Text>
            </View>
            <View style={[styles.distTrack, { backgroundColor: colors.border }]}>
              <View style={[styles.distBar, { width: `${Math.round((c.pop / max) * 100)}%` as any, backgroundColor: barColor }]} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

/* ── APPROVED BRANCH CARD ───────────────────────────────────────────────── */
function ApprovedBranchCard({ branch, colors }: { branch: BranchData; colors: ReturnType<typeof useColors> }) {
  const total    = branch.families.reduce((s, f) => s + 1 + f.members.length, 0);
  const inIsrael = branch.families.reduce(
    (s, f) => s + (f.headAliyah === "in_israel" ? 1 : 0) + f.members.filter(m => m.aliyahStatus === "in_israel").length,
    0,
  );

  return (
    <View style={[styles.branchCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {branch.synagogueImageUrl ? (
        /* ── Synagogue photo banner ── */
        <View style={styles.synagogueBanner}>
          <Image source={{ uri: branch.synagogueImageUrl }} style={styles.synagogueImg} resizeMode="cover" />
          <View style={styles.synagogueOverlay} />
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedText}>✅ VERIFIED</Text>
          </View>
          {branch.logoUrl && (
            <Image source={{ uri: branch.logoUrl }} style={styles.bannerLogo} resizeMode="cover" />
          )}
          <View style={[styles.bannerTextBlock, { left: branch.logoUrl ? 64 : 12 }]}>
            <Text style={styles.bannerName} numberOfLines={1}>{branch.name}</Text>
            <Text style={styles.bannerSub} numberOfLines={1}>
              🇮🇳 {branch.cityName}{branch.adminName ? ` · ${branch.adminName}` : ""}
            </Text>
          </View>
          <View style={styles.bannerTotal}>
            <Text style={styles.bannerTotalNum}>{total}</Text>
            <Text style={styles.bannerTotalLabel}>members</Text>
          </View>
        </View>
      ) : (
        /* ── Plain header with optional logo ── */
        <View style={[styles.branchHeader, { borderBottomColor: colors.border }]}>
          {branch.logoUrl
            ? <Image source={{ uri: branch.logoUrl }} style={styles.branchLogo} resizeMode="cover" />
            : <Text style={{ fontSize: 28 }}>🏛️</Text>
          }
          <View style={{ flex: 1 }}>
            <Text style={[styles.branchName, { color: colors.foreground }]}>{branch.name}</Text>
            <Text style={[styles.branchSub, { color: colors.mutedForeground }]}>
              🇮🇳 {branch.cityName}{branch.adminName ? ` · ${branch.adminName}` : ""}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={[{ fontSize: TEXT.lg, fontWeight: "800", color: GREEN }]}>{total}</Text>
            <Text style={[{ fontSize: TEXT.xs, color: colors.mutedForeground }]}>members</Text>
          </View>
        </View>
      )}
      {/* Stats row */}
      <View style={styles.branchStatsRow}>
        {[
          { v: branch.families.length, l: "Families", color: BLUE,  bg: BLUE  + "14" },
          { v: inIsrael,               l: "In Israel", color: GREEN, bg: GREEN + "14" },
          { v: total - inIsrael,       l: "Awaiting",  color: "#facc15", bg: "#facc1514" },
        ].map(s => (
          <View key={s.l} style={[styles.branchStat, { backgroundColor: s.bg }]}>
            <Text style={[styles.branchStatNum, { color: s.color }]}>{s.v}</Text>
            <Text style={[styles.branchStatLabel, { color: colors.mutedForeground }]}>{s.l}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   DASHBOARD TAB
══════════════════════════════════════════════════════════════════════════ */
function DashboardTab({
  submissions, loading, refreshing, onRefresh, colors,
}: {
  submissions: CensusSubmission[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const approved   = submissions.filter(s => s.status === "approved").map(s => s.branch);
  const israelCities = CITIES.filter(c => c.country === "israel").sort((a, b) => b.pop - a.pop);
  const indiaCities  = CITIES.filter(c => c.country === "india").sort((a, b) => b.pop - a.pop);

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[styles.tabContent, { paddingBottom: 48 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} />}
    >
      {/* Community Overview */}
      <View style={[styles.overviewCard, { backgroundColor: GOLD + "0D", borderColor: GOLD + "33" }]}>
        <Text style={[styles.overviewLabel, { color: GOLD }]}>COMMUNITY OVERVIEW</Text>
        <Text style={[styles.overviewBody, { color: colors.foreground }]}>
          The Bnei Menashe are one of the Lost Tribes of Israel, indigenous to Manipur and Mizoram
          in Northeast India, now returning to their ancestral homeland through Aliyah.
        </Text>
      </View>

      {/* Stat grid */}
      <View style={styles.statGrid}>
        {STATS.map(s => <StatCard key={s.id} stat={s} colors={colors} />)}
      </View>

      {/* Distribution bars */}
      <DistributionSection label="DISTRIBUTION IN ISRAEL" list={israelCities} barColor={GOLD}  colors={colors} />
      <DistributionSection label="DISTRIBUTION IN INDIA"  list={indiaCities}  barColor={BLUE}  colors={colors} />

      {/* Approved branches */}
      {loading ? (
        <ActivityIndicator color={GOLD} style={{ marginTop: 20 }} />
      ) : approved.length > 0 ? (
        <View>
          <SectionHeader
            label="REGISTERED BRANCHES"
            right={`✅ ${approved.length} verified`}
            colors={colors}
          />
          {approved.map(b => <ApprovedBranchCard key={b.id} branch={b} colors={colors} />)}
        </View>
      ) : null}
    </ScrollView>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   ADMIN TAB
══════════════════════════════════════════════════════════════════════════ */
function AdminTab({
  submissions, memberSubmissions, loading, refreshing, onRefresh, onReview, colors,
}: {
  submissions: CensusSubmission[];
  memberSubmissions: MemberSubmission[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onReview: (id: string, type: "branch" | "member", status: "approved" | "rejected", note?: string) => void;
  colors: ReturnType<typeof useColors>;
}) {
  const [noteMap, setNoteMap] = useState<Record<string, string>>({});
  const [acting, setActing] = useState<string | null>(null);

  async function act(id: string, type: "branch" | "member", status: "approved" | "rejected") {
    setActing(id);
    await onReview(id, type, status, noteMap[id]);
    setActing(null);
  }

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[styles.tabContent, { paddingBottom: 48 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={GOLD} />}
    >
      {loading ? (
        <ActivityIndicator color={GOLD} style={{ marginTop: 40 }} />
      ) : (
        <>
          {/* Branch submissions */}
          <SectionHeader
            label="BRANCH SUBMISSIONS"
            right={`${submissions.length}`}
            colors={colors}
          />
          {submissions.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="inbox" size={24} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No branch submissions yet</Text>
            </View>
          ) : submissions.map(sub => {
            const isPending   = sub.status === "pending";
            const statusColor = sub.status === "approved" ? GREEN : sub.status === "rejected" ? "#ef4444" : "#f59e0b";
            const isActing    = acting === sub.id;
            return (
              <View key={sub.id} style={[styles.subCard, {
                backgroundColor: colors.card,
                borderColor: isPending ? "#f59e0b44" : colors.border,
              }]}>
                {/* Header row */}
                <View style={styles.subRow}>
                  {sub.branch.logoUrl
                    ? <Image source={{ uri: sub.branch.logoUrl }} style={styles.subLogo} />
                    : <Text style={{ fontSize: 22 }}>🏛️</Text>
                  }
                  <View style={{ flex: 1, marginLeft: SPACE[3] }}>
                    <Text style={[styles.subName, { color: colors.foreground }]}>{sub.branch.name}</Text>
                    <Text style={[styles.subMeta, { color: colors.mutedForeground }]}>
                      {sub.branch.cityName}
                      {sub.branch.adminName ? ` · Admin: ${sub.branch.adminName}` : ""}
                      {" · "}{sub.branch.families.length} families
                    </Text>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: statusColor + "22" }]}>
                    <Text style={[styles.statusText, { color: statusColor }]}>
                      {sub.status.toUpperCase()}
                    </Text>
                  </View>
                </View>
                {/* Synagogue thumbnail */}
                {sub.branch.synagogueImageUrl && (
                  <Image
                    source={{ uri: sub.branch.synagogueImageUrl }}
                    style={styles.subSynagogue}
                    resizeMode="cover"
                  />
                )}
                {/* Date */}
                <Text style={[styles.subDate, { color: colors.mutedForeground }]}>
                  Submitted {new Date(sub.submittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                  {sub.reviewNote ? `  ·  "${sub.reviewNote}"` : ""}
                </Text>
                {isPending && (
                  <>
                    <TextInput
                      value={noteMap[sub.id] ?? ""}
                      onChangeText={t => setNoteMap(n => ({ ...n, [sub.id]: t }))}
                      placeholder="Review note (optional)"
                      placeholderTextColor={colors.mutedForeground + "88"}
                      style={[styles.noteInput, {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                        color: colors.foreground,
                      }]}
                    />
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={styles.rejectBtn}
                        disabled={isActing}
                        onPress={() => { haptic(); act(sub.id, "branch", "rejected"); }}
                      >
                        {isActing ? <ActivityIndicator size="small" color="#ef4444" /> : <Text style={styles.rejectText}>✗ Reject</Text>}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.approveBtn}
                        disabled={isActing}
                        onPress={() => { haptic(); act(sub.id, "branch", "approved"); }}
                      >
                        {isActing ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.approveText}>✓ Approve</Text>}
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            );
          })}

          {/* Family submissions */}
          <SectionHeader
            label="FAMILY CENSUS SUBMISSIONS"
            right={`${memberSubmissions.length}`}
            colors={colors}
          />
          {memberSubmissions.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="users" size={24} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No family submissions yet</Text>
            </View>
          ) : memberSubmissions.map(sub => {
            const isPending   = sub.status === "pending";
            const statusColor = sub.status === "approved" ? GREEN : sub.status === "rejected" ? "#ef4444" : "#f59e0b";
            const isActing    = acting === sub.id;
            const head        = sub.headCensus;
            return (
              <View key={sub.id} style={[styles.subCard, {
                backgroundColor: colors.card,
                borderColor: isPending ? "#f59e0b44" : colors.border,
              }]}>
                <View style={styles.subRow}>
                  <Text style={{ fontSize: 22 }}>👨‍👩‍👧‍👦</Text>
                  <View style={{ flex: 1, marginLeft: SPACE[3] }}>
                    <Text style={[styles.subName, { color: colors.foreground }]}>
                      {head.namePerPassport || sub.submitterName}
                    </Text>
                    <Text style={[styles.subMeta, { color: colors.mutedForeground }]}>
                      {sub.branchName} · {sub.members.length} members
                    </Text>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: statusColor + "22" }]}>
                    <Text style={[styles.statusText, { color: statusColor }]}>{sub.status.toUpperCase()}</Text>
                  </View>
                </View>
                <Text style={[styles.subDate, { color: colors.mutedForeground }]}>
                  Submitted {new Date(sub.submittedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </Text>
                {isPending && (
                  <>
                    <TextInput
                      value={noteMap[sub.id] ?? ""}
                      onChangeText={t => setNoteMap(n => ({ ...n, [sub.id]: t }))}
                      placeholder="Review note (optional)"
                      placeholderTextColor={colors.mutedForeground + "88"}
                      style={[styles.noteInput, {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                        color: colors.foreground,
                      }]}
                    />
                    <View style={styles.actionRow}>
                      <TouchableOpacity
                        style={styles.rejectBtn}
                        disabled={isActing}
                        onPress={() => { haptic(); act(sub.id, "member", "rejected"); }}
                      >
                        {isActing ? <ActivityIndicator size="small" color="#ef4444" /> : <Text style={styles.rejectText}>✗ Reject</Text>}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.approveBtn}
                        disabled={isActing}
                        onPress={() => { haptic(); act(sub.id, "member", "approved"); }}
                      >
                        {isActing ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.approveText}>✓ Approve</Text>}
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   LOCAL ADMIN TAB
══════════════════════════════════════════════════════════════════════════ */
function LocalAdminTab({
  myBranch, loading, colors,
}: {
  myBranch: BranchData | null;
  loading: boolean;
  colors: ReturnType<typeof useColors>;
}) {
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={GOLD} />
      </View>
    );
  }

  const total = myBranch ? myBranch.families.reduce((s, f) => s + 1 + f.members.length, 0) : 0;

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[styles.tabContent, { paddingBottom: 48 }]}
      showsVerticalScrollIndicator={false}
    >
      {myBranch ? (
        <>
          {/* Branch identity card */}
          <View style={[styles.overviewCard, { backgroundColor: BLUE + "0D", borderColor: BLUE + "33" }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: SPACE[3] }}>
              {myBranch.logoUrl && (
                <Image source={{ uri: myBranch.logoUrl }} style={{ width: 48, height: 48, borderRadius: RADIUS.md }} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={[styles.overviewLabel, { color: BLUE }]}>{myBranch.name}</Text>
                <Text style={[styles.overviewBody, { color: colors.mutedForeground, marginTop: 2, fontSize: TEXT.sm }]}>
                  🇮🇳 {myBranch.cityName}{myBranch.established ? ` · Est. ${myBranch.established}` : ""}
                </Text>
                {myBranch.adminName && (
                  <Text style={{ fontSize: TEXT.sm, color: BLUE, marginTop: 2 }}>Admin: {myBranch.adminName}</Text>
                )}
              </View>
            </View>
            <View style={[styles.branchStatsRow, { marginTop: SPACE[4] }]}>
              {[
                { v: myBranch.families.length, l: "Families", color: BLUE,  bg: BLUE  + "14" },
                { v: total,                    l: "Members",  color: GREEN,  bg: GREEN + "14" },
              ].map(s => (
                <View key={s.l} style={[styles.branchStat, { backgroundColor: s.bg }]}>
                  <Text style={[styles.branchStatNum, { color: s.color }]}>{s.v}</Text>
                  <Text style={[styles.branchStatLabel, { color: colors.mutedForeground }]}>{s.l}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Synagogue photo */}
          {myBranch.synagogueImageUrl && (
            <>
              <SectionHeader label="SYNAGOGUE PHOTO" colors={colors} />
              <Image
                source={{ uri: myBranch.synagogueImageUrl }}
                style={[styles.synagogueFull, { borderColor: colors.border }]}
                resizeMode="cover"
              />
            </>
          )}

          {/* Upload note */}
          <View style={[styles.overviewCard, { backgroundColor: GOLD + "0A", borderColor: GOLD + "2A" }]}>
            <Text style={[styles.overviewLabel, { color: GOLD }]}>🖼️  COMMUNITY IDENTITY</Text>
            <Text style={[styles.overviewBody, { color: colors.mutedForeground }]}>
              To upload or replace your Community Logo and Synagogue Photo, use the web version of
              Census & Demographics (Local Admin tab). Photos appear here and on the public Dashboard
              once your branch is approved.
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={() => { haptic(); router.push("/census"); }}
          >
            <Feather name="edit-3" size={15} color={colors.primaryForeground ?? "#1a0f00"} />
            <Text style={[styles.primaryBtnText, { color: colors.primaryForeground ?? "#1a0f00" }]}>
              Manage Census Form
            </Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <View style={[styles.overviewCard, { backgroundColor: BLUE + "0D", borderColor: BLUE + "33" }]}>
            <Text style={[styles.overviewLabel, { color: BLUE }]}>📍  CREATE YOUR BRANCH</Text>
            <Text style={[styles.overviewBody, { color: colors.mutedForeground }]}>
              Register your congregation and begin the official BMC family census. You will need
              to upload a Community Logo and Synagogue Photo before submitting for review.
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            onPress={() => { haptic(); router.push("/census"); }}
          >
            <Feather name="plus-circle" size={15} color={colors.primaryForeground ?? "#1a0f00"} />
            <Text style={[styles.primaryBtnText, { color: colors.primaryForeground ?? "#1a0f00" }]}>
              Begin Census Registration
            </Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   ROOT SCREEN
══════════════════════════════════════════════════════════════════════════ */
export default function CensusDemographicsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { getToken, isSignedIn } = useAuth();

  const [activeTab, setActiveTab]     = useState<Tab>("dashboard");
  const [submissions, setSubmissions]           = useState<CensusSubmission[]>([]);
  const [memberSubmissions, setMemberSubs]      = useState<MemberSubmission[]>([]);
  const [myBranch, setMyBranch]                 = useState<BranchData | null>(null);
  const [loading, setLoading]                   = useState(true);
  const [refreshing, setRefreshing]             = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try {
      const gt = () => getToken();
      const [subs, msubs, branch] = await Promise.all([
        fetchCensusSubmissions(gt),
        fetchCensusMemberSubmissions(gt),
        isSignedIn ? fetchMyBranch(gt) : Promise.resolve(null),
      ]);
      setSubmissions(subs);
      setMemberSubs(msubs);
      setMyBranch(branch);
    } catch { /* show whatever loaded */ }
    finally { setLoading(false); setRefreshing(false); }
  }, [getToken, isSignedIn]);

  useEffect(() => { load(); }, [load]);

  async function handleReview(id: string, type: "branch" | "member", status: "approved" | "rejected", note?: string) {
    try {
      await reviewSubmission(id, type, status, note, () => getToken());
      await load();
    } catch {
      Alert.alert("Error", "Could not update submission. Please try again.");
    }
  }

  const TABS: { id: Tab; label: string; icon: React.ComponentProps<typeof Feather>["name"] }[] = [
    { id: "dashboard",  label: "Dashboard",   icon: "bar-chart-2" },
    { id: "admin",      label: "Admin",        icon: "shield"      },
    { id: "localadmin", label: "Local Admin",  icon: "map-pin"     },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>

      {/* ── Nav bar ── */}
      <View style={[styles.nav, {
        paddingTop: insets.top + SPACE[2],
        borderBottomColor: colors.border,
      }]}>
        <TouchableOpacity
          onPress={() => { haptic(); router.back(); }}
          style={styles.navBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="arrow-left" size={22} color={colors.foreground} />
        </TouchableOpacity>

        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={[styles.navTitle, { color: colors.foreground }]}>Census & Demographics</Text>
          <Text style={[styles.navSub, { color: colors.mutedForeground }]}>BMC India · Census 2026–2027</Text>
        </View>

        <TouchableOpacity
          onPress={() => { haptic(); router.back(); }}
          style={[styles.navBtn, { alignItems: "flex-end" }]}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Feather name="x" size={20} color={colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      {/* ── Tab bar ── */}
      <View style={[styles.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {TABS.map(t => {
          const active = activeTab === t.id;
          return (
            <TouchableOpacity
              key={t.id}
              style={[styles.tabBtn, active && styles.tabBtnActive]}
              onPress={() => { haptic(); setActiveTab(t.id); }}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              {/* Active underline */}
              <View style={[styles.tabUnderline, active && { backgroundColor: GOLD }]} />
              <Feather
                name={t.icon}
                size={13}
                color={active ? GOLD : colors.mutedForeground}
              />
              <Text style={[styles.tabLabel, {
                color:      active ? GOLD : colors.mutedForeground,
                fontWeight: active ? "800" : "600",
              }]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Content ── */}
      <View style={[styles.content, { paddingHorizontal: 16 }]}>
        {activeTab === "dashboard" && (
          <DashboardTab
            submissions={submissions} loading={loading}
            refreshing={refreshing} onRefresh={() => load(true)} colors={colors}
          />
        )}
        {activeTab === "admin" && (
          isSignedIn ? (
            <AdminTab
              submissions={submissions} memberSubmissions={memberSubmissions}
              loading={loading} refreshing={refreshing}
              onRefresh={() => load(true)} onReview={handleReview} colors={colors}
            />
          ) : (
            <View style={styles.center}>
              <View style={[styles.lockBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="lock" size={32} color={colors.mutedForeground} />
                <Text style={[styles.lockTitle, { color: colors.foreground }]}>Admin Access Required</Text>
                <Text style={[styles.lockBody, { color: colors.mutedForeground }]}>
                  Sign in with an admin account to review branch and family census submissions.
                </Text>
              </View>
            </View>
          )
        )}
        {activeTab === "localadmin" && (
          isSignedIn ? (
            <LocalAdminTab myBranch={myBranch} loading={loading} colors={colors} />
          ) : (
            <View style={styles.center}>
              <View style={[styles.lockBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name="lock" size={32} color={colors.mutedForeground} />
                <Text style={[styles.lockTitle, { color: colors.foreground }]}>Sign In Required</Text>
                <Text style={[styles.lockBody, { color: colors.mutedForeground }]}>
                  Sign in to manage your community branch registration.
                </Text>
              </View>
            </View>
          )
        )}
      </View>
    </View>
  );
}

/* ── Styles ───────────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  root:    { flex: 1 },
  content: { flex: 1 },
  center:  { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },

  /* Nav */
  nav: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navBtn:   { width: 40, height: 40, justifyContent: "center" },
  navTitle: { fontSize: TEXT.md, fontWeight: "800", letterSpacing: -0.3 },
  navSub:   { fontSize: 10, marginTop: 1, letterSpacing: 0.2 },

  /* Tab bar */
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingTop: 10,
    paddingBottom: 8,
    gap: 4,
    position: "relative",
  },
  tabBtnActive: {},
  tabUnderline: {
    position: "absolute",
    bottom: 0,
    left: 12,
    right: 12,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: "transparent",
  },
  tabLabel: { fontSize: 10, letterSpacing: 0.3 },

  /* Shared tab content padding */
  tabContent: { paddingTop: 16, gap: 0 },

  /* Section header */
  secHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    marginTop: 4,
  },
  secBar:   { width: 3, height: 14, borderRadius: 2 },
  secLabel: { flex: 1, fontSize: 10, fontWeight: "700", letterSpacing: 0.8 },
  secRight: { fontSize: 10, fontWeight: "600" },

  /* Overview card */
  overviewCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  overviewLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 1.4, marginBottom: 6 },
  overviewBody:  { fontSize: 13, lineHeight: 20 },

  /* Stat grid */
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    width: "47.5%",
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: 14,
    gap: 4,
  },
  statIcon:  { fontSize: 22 },
  statValue: { fontSize: 20, fontWeight: "800", lineHeight: 24 },
  statLabel: { fontSize: 11, lineHeight: 15 },
  statTrend: { fontSize: 11, fontWeight: "600" },

  /* Distribution */
  distCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 4,
  },
  distRow:    { padding: 12 },
  distRowTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 },
  distCity:   { fontSize: 13, fontWeight: "600" },
  distRegion: { fontSize: 11, marginTop: 1 },
  distPop:    { fontSize: 12, fontWeight: "700" },
  distTrack:  { height: 5, borderRadius: 3, overflow: "hidden" },
  distBar:    { height: "100%" as any, borderRadius: 3 },

  /* Approved branches */
  branchCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 12,
  },
  synagogueBanner: { height: 130, position: "relative" },
  synagogueImg:    { width: "100%", height: "100%" as any },
  synagogueOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.52)",
  },
  verifiedBadge: {
    position: "absolute", top: 8, right: 10,
    backgroundColor: "rgba(74,222,128,0.88)",
    borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2,
  },
  verifiedText: { fontSize: 10, fontWeight: "700", color: "#fff" },
  bannerLogo: {
    position: "absolute", bottom: 10, left: 12,
    width: 42, height: 42, borderRadius: 10,
    borderWidth: 2, borderColor: "rgba(255,255,255,0.9)",
  },
  bannerTextBlock: { position: "absolute", bottom: 10, right: 70 },
  bannerName: { fontSize: 13, fontWeight: "800", color: "#fff" },
  bannerSub:  { fontSize: 10, color: "rgba(255,255,255,0.8)", marginTop: 2 },
  bannerTotal: { position: "absolute", bottom: 10, right: 10, alignItems: "flex-end" },
  bannerTotalNum:   { fontSize: 16, fontWeight: "800", color: GREEN },
  bannerTotalLabel: { fontSize: 9, color: "rgba(255,255,255,0.7)" },

  branchHeader: {
    flexDirection: "row", alignItems: "center", padding: 12, gap: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  branchLogo: { width: 38, height: 38, borderRadius: 9 },
  branchName: { fontSize: 13, fontWeight: "700" },
  branchSub:  { fontSize: 11, marginTop: 2 },

  branchStatsRow: { flexDirection: "row", gap: 8, padding: 10 },
  branchStat:     { flex: 1, borderRadius: 8, padding: 8, alignItems: "center" },
  branchStatNum:  { fontSize: 15, fontWeight: "800" },
  branchStatLabel:{ fontSize: 10, marginTop: 2 },

  /* Admin tab — submission cards */
  subCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  subRow:   { flexDirection: "row", alignItems: "flex-start", marginBottom: 8 },
  subLogo:  { width: 32, height: 32, borderRadius: 8 },
  subName:  { fontSize: 13, fontWeight: "700" },
  subMeta:  { fontSize: 11, marginTop: 2 },
  subDate:  { fontSize: 11, marginBottom: 8 },
  subSynagogue: {
    width: "100%", height: 80, borderRadius: 8, marginBottom: 8,
  },
  statusPill: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 10, fontWeight: "800" },

  noteInput: {
    borderWidth: 1, borderRadius: RADIUS.lg,
    paddingHorizontal: 12, paddingVertical: 8,
    fontSize: 12, marginBottom: 8,
  },
  actionRow:   { flexDirection: "row", gap: 8 },
  rejectBtn: {
    flex: 1, padding: 10, borderRadius: RADIUS.full,
    borderWidth: 1, borderColor: "rgba(239,68,68,0.35)",
    backgroundColor: "rgba(239,68,68,0.08)", alignItems: "center",
  },
  rejectText:  { color: "#ef4444", fontSize: 13, fontWeight: "700" },
  approveBtn: {
    flex: 2, padding: 10, borderRadius: RADIUS.full,
    backgroundColor: "#166534", alignItems: "center",
  },
  approveText: { color: "#fff", fontSize: 13, fontWeight: "800" },

  /* Empty states */
  emptyCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: RADIUS.xl, borderWidth: 1, borderStyle: "dashed",
    padding: 20, marginBottom: 10, justifyContent: "center",
  },
  emptyText: { fontSize: 13 },

  /* Lock / not signed-in */
  lockBox: {
    borderRadius: RADIUS.xl, borderWidth: 1,
    padding: 28, alignItems: "center", gap: 10, maxWidth: 300,
  },
  lockTitle: { fontSize: TEXT.md, fontWeight: "700", textAlign: "center" },
  lockBody:  { fontSize: TEXT.sm, textAlign: "center", lineHeight: 20 },

  /* Local admin */
  synagogueFull: {
    width: "100%", height: 180, borderRadius: RADIUS.xl,
    borderWidth: 1, marginBottom: 14,
  },
  primaryBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, padding: 14, borderRadius: RADIUS.full, marginTop: 4, marginBottom: 20,
  },
  primaryBtnText: { fontSize: TEXT.md, fontWeight: "800" },
});
