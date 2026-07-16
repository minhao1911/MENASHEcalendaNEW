/**
 * Census & Demographics — Mobile SPR-M-CENSUS-DEMO
 *
 * Full-featured Census & Demographics page matching the web modal.
 * Three tabs: Dashboard · Admin · Local Admin
 *
 * Dashboard  — community overview, stat cards, distribution bars, approved branches
 * Admin      — branch + family submissions with approve/reject (admin-only)
 * Local Admin— branch status + link to begin census registration flow
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

import { useThemeTokens } from "@/src/mobile/design-system";
import type { ColorTokens } from "@/src/mobile/design-system";
import {
  fetchCensusSubmissions,
  fetchCensusMemberSubmissions,
  fetchMyBranch,
  reviewSubmission,
} from "@/lib/censusApi";
import type { CensusSubmission, MemberSubmission, BranchData } from "@/lib/censusApi";

/* ── Haptic helper ────────────────────────────────────────────────────────── */
function haptic() {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

/* ── Static data (mirrors web DEFAULT_STATS / DEFAULT_CITIES) ────────────── */

interface StatEntry {
  id: string;
  label: string;
  value: string;
  icon: string;
  trend?: string;
  trendUp?: boolean;
}

interface CityEntry {
  id: string;
  name: string;
  pop: number;
  country: "israel" | "india";
  region: string;
}

const DEFAULT_STATS: StatEntry[] = [
  { id: "total",     label: "Total Community Members",       value: "9,700+",            icon: "👥", trend: "+3.2%", trendUp: true },
  { id: "aliyah",   label: "Returned to Israel (Aliyah)",   value: "4,800+",            icon: "✈️", trend: "+5.1%", trendUp: true },
  { id: "india",    label: "Awaiting Aliyah in India",      value: "4,900+",            icon: "🇮🇳", trend: "−1.4%", trendUp: false },
  { id: "cities",   label: "Main Cities in Israel",         value: "12",                icon: "🏙️" },
  { id: "states",   label: "Indian States Represented",     value: "Manipur &\nMizoram", icon: "📍" },
  { id: "rabbinate",label: "Recognized by Chief Rabbinate", value: "2005",              icon: "📜" },
];

const DEFAULT_CITIES: CityEntry[] = [
  { id: "c1", name: "Kiryat Arba",   pop: 450,  country: "israel", region: "Judea & Samaria" },
  { id: "c2", name: "Be'er Sheva",   pop: 380,  country: "israel", region: "Negev" },
  { id: "c3", name: "Natzrat Illit", pop: 320,  country: "israel", region: "Galilee" },
  { id: "c4", name: "Jerusalem",     pop: 280,  country: "israel", region: "Jerusalem District" },
  { id: "c5", name: "Rehovot",       pop: 220,  country: "israel", region: "Central District" },
  { id: "c6", name: "Haifa",         pop: 180,  country: "israel", region: "Northern District" },
  { id: "c7", name: "Imphal",        pop: 2100, country: "india",  region: "Manipur" },
  { id: "c8", name: "Aizawl",        pop: 1800, country: "india",  region: "Mizoram" },
  { id: "c9", name: "Churachandpur", pop: 650,  country: "india",  region: "Manipur" },
];

/* ── Types ────────────────────────────────────────────────────────────────── */
type Tab = "dashboard" | "admin" | "localadmin";

/* ── Shared sub-components ───────────────────────────────────────────────── */

function SectionHeader({ label, colors }: { label: string; colors: ColorTokens }) {
  return (
    <Text style={[styles.secHeader, { color: colors.mutedForeground as string }]}>
      {label}
    </Text>
  );
}

/* ── STAT CARD ───────────────────────────────────────────────────────────── */
function StatCard({ stat, colors }: { stat: StatEntry; colors: ColorTokens }) {
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={styles.statIcon}>{stat.icon}</Text>
      <Text style={[styles.statValue, { color: colors.primary as string }]} numberOfLines={2}>
        {stat.value}
      </Text>
      <Text style={[styles.statLabel, { color: colors.mutedForeground as string }]} numberOfLines={2}>
        {stat.label}
      </Text>
      {stat.trend !== undefined && (
        <Text style={[styles.statTrend, { color: stat.trendUp ? "#4ade80" : "#f87171" }]}>
          {stat.trendUp ? "▲" : "▼"} {stat.trend}
        </Text>
      )}
    </View>
  );
}

/* ── DISTRIBUTION BAR LIST ───────────────────────────────────────────────── */
function DistributionSection({
  label,
  list,
  barColor,
  colors,
}: {
  label: string;
  list: CityEntry[];
  barColor: string;
  colors: ColorTokens;
}) {
  const max = list[0]?.pop || 1;
  const total = list.reduce((s, c) => s + c.pop, 0);
  return (
    <View style={{ marginBottom: 16 }}>
      <SectionHeader
        label={`${label} · ${total.toLocaleString()} documented`}
        colors={colors}
      />
      <View style={[styles.distCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {list.map((c, i) => (
          <View
            key={c.id}
            style={[
              styles.distRow,
              i < list.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border as string },
            ]}
          >
            <View style={styles.distRowTop}>
              <View>
                <Text style={[styles.distCity, { color: colors.foreground as string }]}>{c.name}</Text>
                <Text style={[styles.distRegion, { color: colors.mutedForeground as string }]}>{c.region}</Text>
              </View>
              <Text style={[styles.distPop, { color: barColor }]}>~{c.pop}</Text>
            </View>
            <View style={[styles.distTrack, { backgroundColor: (colors.border as string) }]}>
              <View
                style={[
                  styles.distBar,
                  {
                    width: `${Math.round((c.pop / max) * 100)}%` as any,
                    backgroundColor: barColor,
                  },
                ]}
              />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

/* ── BRANCH CARD (approved, with synagogue banner) ───────────────────────── */
function ApprovedBranchCard({ branch, colors }: { branch: BranchData; colors: ColorTokens }) {
  const total = branch.families.reduce((s, f) => s + 1 + f.members.length, 0);
  const inIsrael = branch.families.reduce(
    (s, f) =>
      s +
      (f.headAliyah === "in_israel" ? 1 : 0) +
      f.members.filter(m => m.aliyahStatus === "in_israel").length,
    0,
  );

  return (
    <View style={[styles.branchCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {branch.synagogueImageUrl ? (
        <View style={styles.synagogueBanner}>
          <Image
            source={{ uri: branch.synagogueImageUrl }}
            style={styles.synagogueImg}
            resizeMode="cover"
          />
          {/* dark gradient overlay */}
          <View style={styles.synagogueOverlay} />
          {/* verified badge top-right */}
          <View style={styles.verifiedBadge}>
            <Text style={styles.verifiedText}>✅ VERIFIED</Text>
          </View>
          {/* logo bottom-left */}
          {branch.logoUrl && (
            <Image source={{ uri: branch.logoUrl }} style={styles.bannerLogo} resizeMode="cover" />
          )}
          {/* name + city text, offset right of logo */}
          <View style={[styles.bannerTextBlock, { left: branch.logoUrl ? 64 : 12 }]}>
            <Text style={styles.bannerName} numberOfLines={1}>{branch.name}</Text>
            <Text style={styles.bannerSub} numberOfLines={1}>
              🇮🇳 {branch.cityName}{branch.adminName ? ` · ${branch.adminName}` : ""}
            </Text>
          </View>
          {/* member count bottom-right */}
          <View style={styles.bannerTotal}>
            <Text style={styles.bannerTotalNum}>{total}</Text>
            <Text style={styles.bannerTotalLabel}>members</Text>
          </View>
        </View>
      ) : (
        <View style={[styles.branchHeader, { borderBottomColor: colors.border as string }]}>
          {branch.logoUrl && (
            <Image source={{ uri: branch.logoUrl }} style={styles.branchLogo} resizeMode="cover" />
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.branchName, { color: colors.foreground as string }]}>{branch.name}</Text>
            <Text style={[styles.branchSub, { color: colors.mutedForeground as string }]}>
              🇮🇳 {branch.cityName}{branch.adminName ? ` · ${branch.adminName}` : ""}
            </Text>
          </View>
          <View>
            <Text style={[styles.branchTotalNum, { color: "#4ade80" }]}>{total}</Text>
            <Text style={[styles.branchTotalLabel, { color: colors.mutedForeground as string }]}>members</Text>
          </View>
        </View>
      )}
      {/* Stats row */}
      <View style={[styles.branchStatsRow, { paddingTop: branch.synagogueImageUrl ? 10 : 0 }]}>
        {[
          { v: branch.families.length, l: "Families", color: "#4f8ef7", bg: "rgba(79,142,247,0.08)" },
          { v: inIsrael,               l: "In Israel",  color: "#4ade80", bg: "rgba(74,222,128,0.08)" },
          { v: total - inIsrael,       l: "Awaiting",   color: "#facc15", bg: "rgba(250,204,21,0.08)" },
        ].map(s => (
          <View key={s.l} style={[styles.branchStat, { backgroundColor: s.bg }]}>
            <Text style={[styles.branchStatNum, { color: s.color }]}>{s.v}</Text>
            <Text style={[styles.branchStatLabel, { color: colors.mutedForeground as string }]}>{s.l}</Text>
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
  submissions,
  loading,
  onRefresh,
  refreshing,
  colors,
}: {
  submissions: CensusSubmission[];
  loading: boolean;
  onRefresh: () => void;
  refreshing: boolean;
  colors: ColorTokens;
}) {
  const approvedBranches = submissions
    .filter(s => s.status === "approved")
    .map(s => s.branch);

  const israelCities = [...DEFAULT_CITIES.filter(c => c.country === "israel")].sort((a, b) => b.pop - a.pop);
  const indiaCities  = [...DEFAULT_CITIES.filter(c => c.country === "india")].sort((a, b) => b.pop - a.pop);

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.tabScroll}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* ── Community Overview ── */}
      <View style={[styles.overviewCard, {
        backgroundColor: "rgba(212,168,67,0.08)",
        borderColor: "rgba(212,168,67,0.25)",
      }]}>
        <Text style={[styles.overviewLabel, { color: "#d4a843" }]}>COMMUNITY OVERVIEW</Text>
        <Text style={[styles.overviewBody, { color: colors.foreground as string }]}>
          The Bnei Menashe are one of the Lost Tribes of Israel, indigenous to Manipur and Mizoram
          in Northeast India, now returning to their ancestral homeland through Aliyah.
        </Text>
      </View>

      {/* ── Stat grid (2 columns) ── */}
      <View style={styles.statGrid}>
        {DEFAULT_STATS.map(s => (
          <StatCard key={s.id} stat={s} colors={colors} />
        ))}
      </View>

      {/* ── Distribution charts ── */}
      <DistributionSection
        label="DISTRIBUTION IN ISRAEL"
        list={israelCities}
        barColor="#d4a843"
        colors={colors}
      />
      <DistributionSection
        label="DISTRIBUTION IN INDIA"
        list={indiaCities}
        barColor="#4f8ef7"
        colors={colors}
      />

      {/* ── Approved branches ── */}
      {loading ? (
        <ActivityIndicator color={colors.primary as string} style={{ marginTop: 16 }} />
      ) : approvedBranches.length > 0 ? (
        <View>
          <SectionHeader
            label={`REGISTERED BRANCHES — VERIFIED ✅ · ${approvedBranches.length} branch${approvedBranches.length !== 1 ? "es" : ""}`}
            colors={colors}
          />
          {approvedBranches.map(b => (
            <ApprovedBranchCard key={b.id} branch={b} colors={colors} />
          ))}
        </View>
      ) : null}
    </ScrollView>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   ADMIN TAB
══════════════════════════════════════════════════════════════════════════ */
function AdminTab({
  submissions,
  memberSubmissions,
  loading,
  onRefresh,
  refreshing,
  onReview,
  colors,
}: {
  submissions: CensusSubmission[];
  memberSubmissions: MemberSubmission[];
  loading: boolean;
  onRefresh: () => void;
  refreshing: boolean;
  onReview: (id: string, type: "branch" | "member", status: "approved" | "rejected") => void;
  colors: ColorTokens;
}) {
  const [noteMap, setNoteMap] = useState<Record<string, string>>({});

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.tabScroll}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {loading ? (
        <ActivityIndicator color={colors.primary as string} style={{ marginTop: 40 }} />
      ) : (
        <>
          {/* Branch submissions */}
          <SectionHeader label={`BRANCH SUBMISSIONS (${submissions.length})`} colors={colors} />
          {submissions.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.mutedForeground as string }]}>No branch submissions yet</Text>
          ) : (
            submissions.map(sub => {
              const isPending = sub.status === "pending";
              const statusColor = sub.status === "approved" ? "#4ade80" : sub.status === "rejected" ? "#ef4444" : "#f59e0b";
              return (
                <View key={sub.id} style={[styles.submissionCard, {
                  backgroundColor: colors.card,
                  borderColor: isPending ? "rgba(245,158,11,0.3)" : colors.border as string,
                }]}>
                  {/* Header */}
                  <View style={styles.subHeader}>
                    {sub.branch.logoUrl ? (
                      <Image source={{ uri: sub.branch.logoUrl }} style={styles.subLogo} resizeMode="cover" />
                    ) : (
                      <Text style={{ fontSize: 22 }}>🏛️</Text>
                    )}
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[styles.subName, { color: colors.foreground as string }]}>{sub.branch.name}</Text>
                      <Text style={[styles.subMeta, { color: colors.mutedForeground as string }]}>
                        {sub.branch.cityName}{sub.branch.adminName ? ` · Admin: ${sub.branch.adminName}` : ""} · {sub.branch.families.length} families
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor + "22" }]}>
                      <Text style={[styles.statusText, { color: statusColor }]}>{sub.status.toUpperCase()}</Text>
                    </View>
                  </View>
                  {/* Synagogue photo */}
                  {sub.branch.synagogueImageUrl && (
                    <Image
                      source={{ uri: sub.branch.synagogueImageUrl }}
                      style={styles.subSynagogueImg}
                      resizeMode="cover"
                    />
                  )}
                  <Text style={[styles.subDate, { color: colors.mutedForeground as string }]}>
                    Submitted {new Date(sub.submittedAt).toLocaleDateString()}
                    {sub.reviewNote ? ` · "${sub.reviewNote}"` : ""}
                  </Text>
                  {/* Note input + approve/reject */}
                  {isPending && (
                    <>
                      <TextInput
                        value={noteMap[sub.id] ?? ""}
                        onChangeText={t => setNoteMap(n => ({ ...n, [sub.id]: t }))}
                        placeholder="Review note (optional)"
                        placeholderTextColor={colors.mutedForeground as string}
                        style={[styles.noteInput, {
                          backgroundColor: colors.background as string,
                          borderColor: colors.border as string,
                          color: colors.foreground as string,
                        }]}
                      />
                      <View style={styles.actionRow}>
                        <TouchableOpacity
                          style={[styles.rejectBtn]}
                          onPress={() => { haptic(); onReview(sub.id, "branch", "rejected"); }}
                        >
                          <Text style={styles.rejectBtnText}>✗ Reject</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.approveBtn]}
                          onPress={() => { haptic(); onReview(sub.id, "branch", "approved"); }}
                        >
                          <Text style={styles.approveBtnText}>✓ Approve</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              );
            })
          )}

          {/* Member / family submissions */}
          <SectionHeader label={`FAMILY CENSUS SUBMISSIONS (${memberSubmissions.length})`} colors={colors} />
          {memberSubmissions.length === 0 ? (
            <Text style={[styles.emptyText, { color: colors.mutedForeground as string }]}>No family submissions yet</Text>
          ) : (
            memberSubmissions.map(sub => {
              const isPending = sub.status === "pending";
              const statusColor = sub.status === "approved" ? "#4ade80" : sub.status === "rejected" ? "#ef4444" : "#f59e0b";
              const head = sub.headCensus;
              return (
                <View key={sub.id} style={[styles.submissionCard, {
                  backgroundColor: colors.card,
                  borderColor: isPending ? "rgba(245,158,11,0.3)" : colors.border as string,
                }]}>
                  <View style={styles.subHeader}>
                    <Text style={{ fontSize: 22 }}>👨‍👩‍👧‍👦</Text>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[styles.subName, { color: colors.foreground as string }]}>
                        {head.namePerPassport || sub.submitterName}
                      </Text>
                      <Text style={[styles.subMeta, { color: colors.mutedForeground as string }]}>
                        {sub.branchName} · {sub.members.length} members
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: statusColor + "22" }]}>
                      <Text style={[styles.statusText, { color: statusColor }]}>{sub.status.toUpperCase()}</Text>
                    </View>
                  </View>
                  <Text style={[styles.subDate, { color: colors.mutedForeground as string }]}>
                    Submitted {new Date(sub.submittedAt).toLocaleDateString()}
                  </Text>
                  {isPending && (
                    <>
                      <TextInput
                        value={noteMap[sub.id] ?? ""}
                        onChangeText={t => setNoteMap(n => ({ ...n, [sub.id]: t }))}
                        placeholder="Review note (optional)"
                        placeholderTextColor={colors.mutedForeground as string}
                        style={[styles.noteInput, {
                          backgroundColor: colors.background as string,
                          borderColor: colors.border as string,
                          color: colors.foreground as string,
                        }]}
                      />
                      <View style={styles.actionRow}>
                        <TouchableOpacity
                          style={styles.rejectBtn}
                          onPress={() => { haptic(); onReview(sub.id, "member", "rejected"); }}
                        >
                          <Text style={styles.rejectBtnText}>✗ Reject</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.approveBtn}
                          onPress={() => { haptic(); onReview(sub.id, "member", "approved"); }}
                        >
                          <Text style={styles.approveBtnText}>✓ Approve</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              );
            })
          )}
        </>
      )}
    </ScrollView>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   LOCAL ADMIN TAB
══════════════════════════════════════════════════════════════════════════ */
function LocalAdminTab({
  myBranch,
  loading,
  colors,
}: {
  myBranch: BranchData | null;
  loading: boolean;
  colors: ColorTokens;
}) {
  if (loading) {
    return (
      <View style={styles.centerBox}>
        <ActivityIndicator color={colors.primary as string} />
      </View>
    );
  }

  const statusColor = !myBranch ? "var" : "#facc15";
  const total = myBranch ? myBranch.families.reduce((s, f) => s + 1 + f.members.length, 0) : 0;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.tabScroll} showsVerticalScrollIndicator={false}>
      {myBranch ? (
        <>
          {/* Branch card */}
          <View style={[styles.overviewCard, {
            backgroundColor: "rgba(79,142,247,0.08)",
            borderColor: "rgba(79,142,247,0.25)",
          }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              {myBranch.logoUrl && (
                <Image source={{ uri: myBranch.logoUrl }} style={{ width: 44, height: 44, borderRadius: 10 }} resizeMode="cover" />
              )}
              <View style={{ flex: 1 }}>
                <Text style={[styles.overviewLabel, { color: "#4f8ef7" }]}>{myBranch.name}</Text>
                <Text style={[styles.overviewBody, { color: colors.mutedForeground as string, marginTop: 2, fontSize: 12 }]}>
                  🇮🇳 {myBranch.cityName}{myBranch.established ? ` · Est. ${myBranch.established}` : ""}
                </Text>
                {myBranch.adminName ? (
                  <Text style={{ fontSize: 11, color: "#4f8ef7", marginTop: 2 }}>Admin: {myBranch.adminName}</Text>
                ) : null}
              </View>
            </View>
            {/* Stats */}
            <View style={[styles.branchStatsRow, { marginTop: 12 }]}>
              {[
                { v: myBranch.families.length, l: "Families",  color: "#4f8ef7", bg: "rgba(79,142,247,0.08)" },
                { v: total,                    l: "Members",   color: "#4ade80", bg: "rgba(74,222,128,0.08)" },
              ].map(s => (
                <View key={s.l} style={[styles.branchStat, { backgroundColor: s.bg }]}>
                  <Text style={[styles.branchStatNum, { color: s.color }]}>{s.v}</Text>
                  <Text style={[styles.branchStatLabel, { color: colors.mutedForeground as string }]}>{s.l}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Synagogue image if uploaded */}
          {myBranch.synagogueImageUrl && (
            <View style={{ marginBottom: 14 }}>
              <SectionHeader label="SYNAGOGUE PHOTO" colors={colors} />
              <Image
                source={{ uri: myBranch.synagogueImageUrl }}
                style={{ width: "100%", height: 160, borderRadius: 14 }}
                resizeMode="cover"
              />
            </View>
          )}

          {/* Upload / manage note */}
          <View style={[styles.overviewCard, {
            backgroundColor: "rgba(212,168,67,0.07)",
            borderColor: "rgba(212,168,67,0.25)",
          }]}>
            <Text style={[styles.overviewLabel, { color: "#d4a843" }]}>🖼️ COMMUNITY IDENTITY</Text>
            <Text style={[styles.overviewBody, { color: colors.mutedForeground as string }]}>
              To upload or change your Community Logo and Synagogue Photo, use the web version of
              the Census & Demographics page (Local Admin tab). Photos you upload will appear here
              and on the public Dashboard once your branch is approved.
            </Text>
          </View>

          {/* Go to census registration flow */}
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary as string }]}
            onPress={() => { haptic(); router.push("/census"); }}
          >
            <Feather name="edit-3" size={15} color="#fff" />
            <Text style={styles.primaryBtnText}>Manage Census Form</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          {/* No branch yet */}
          <View style={[styles.overviewCard, {
            backgroundColor: "rgba(79,142,247,0.08)",
            borderColor: "rgba(79,142,247,0.25)",
          }]}>
            <Text style={[styles.overviewLabel, { color: "#4f8ef7" }]}>📍 Create Your Branch</Text>
            <Text style={[styles.overviewBody, { color: colors.mutedForeground as string }]}>
              Register your congregation and begin the official BMC family census. You will need
              to upload a community logo and synagogue photo before submitting for review.
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: colors.primary as string }]}
            onPress={() => { haptic(); router.push("/census"); }}
          >
            <Feather name="plus-circle" size={15} color="#fff" />
            <Text style={styles.primaryBtnText}>Begin Census Registration</Text>
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
  const { colors, sp } = useThemeTokens();
  const insets = useSafeAreaInsets();
  const { getToken, isSignedIn } = useAuth();

  const [activeTab, setActiveTab] = useState<Tab>("dashboard");

  const [submissions, setSubmissions] = useState<CensusSubmission[]>([]);
  const [memberSubmissions, setMemberSubmissions] = useState<MemberSubmission[]>([]);
  const [myBranch, setMyBranch] = useState<BranchData | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const gt = () => getToken();
      const [subs, msubs, branch] = await Promise.all([
        fetchCensusSubmissions(gt),
        fetchCensusMemberSubmissions(gt),
        isSignedIn ? fetchMyBranch(gt) : Promise.resolve(null),
      ]);
      setSubmissions(subs);
      setMemberSubmissions(msubs);
      setMyBranch(branch);
    } catch {
      // silently show whatever loaded
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getToken, isSignedIn]);

  useEffect(() => { load(); }, [load]);

  async function handleReview(id: string, type: "branch" | "member", status: "approved" | "rejected") {
    try {
      await reviewSubmission(id, type, status, undefined, () => getToken());
      await load();
    } catch {
      Alert.alert("Error", "Could not update submission. Please try again.");
    }
  }

  const TABS: { id: Tab; label: string; icon: React.ComponentProps<typeof Feather>["name"] }[] = [
    { id: "dashboard",  label: "Dashboard",   icon: "bar-chart-2" },
    { id: "admin",      label: "Admin",        icon: "shield" },
    { id: "localadmin", label: "Local Admin",  icon: "map-pin" },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background as string }]}>

      {/* ── Nav bar ── */}
      <View style={[styles.nav, {
        paddingTop: insets.top + sp[2],
        borderBottomColor: colors.border as string,
      }]}>
        <TouchableOpacity
          onPress={() => { haptic(); router.back(); }}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="arrow-left" size={22} color={colors.foreground as string} />
        </TouchableOpacity>

        <View style={{ flex: 1, paddingLeft: 4 }}>
          <Text style={[styles.navTitle, { color: colors.foreground as string }]}>Census & Demographics</Text>
          <Text style={[styles.navSubtitle, { color: colors.mutedForeground as string }]}>
            Bnei Menashe Council India · Census 2026-2027
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => { haptic(); router.back(); }}
          style={styles.closeBtn}
          accessibilityRole="button"
          accessibilityLabel="Close"
        >
          <Feather name="x" size={20} color={colors.mutedForeground as string} />
        </TouchableOpacity>
      </View>

      {/* ── Tab bar ── */}
      <View style={[styles.tabBar, {
        backgroundColor: colors.card as string,
        borderBottomColor: colors.border as string,
      }]}>
        {TABS.map(t => {
          const active = activeTab === t.id;
          return (
            <TouchableOpacity
              key={t.id}
              style={[
                styles.tabBtn,
                active && [styles.tabBtnActive, { backgroundColor: (colors.primary as string) + "18" }],
              ]}
              onPress={() => { haptic(); setActiveTab(t.id); }}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <Feather
                name={t.icon}
                size={14}
                color={active ? (colors.primary as string) : (colors.mutedForeground as string)}
              />
              <Text style={[
                styles.tabLabel,
                { color: active ? (colors.primary as string) : (colors.mutedForeground as string) },
                active && styles.tabLabelActive,
              ]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Tab content ── */}
      <View style={{ flex: 1, paddingHorizontal: 16 }}>
        {activeTab === "dashboard" && (
          <DashboardTab
            submissions={submissions}
            loading={loading}
            onRefresh={() => load(true)}
            refreshing={refreshing}
            colors={colors}
          />
        )}
        {activeTab === "admin" && (
          isSignedIn ? (
            <AdminTab
              submissions={submissions}
              memberSubmissions={memberSubmissions}
              loading={loading}
              onRefresh={() => load(true)}
              refreshing={refreshing}
              onReview={handleReview}
              colors={colors}
            />
          ) : (
            <View style={styles.centerBox}>
              <Feather name="lock" size={36} color={colors.mutedForeground as string} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground as string, marginTop: 12 }]}>
                Sign in with an admin account to access this tab.
              </Text>
            </View>
          )
        )}
        {activeTab === "localadmin" && (
          isSignedIn ? (
            <LocalAdminTab
              myBranch={myBranch}
              loading={loading}
              colors={colors}
            />
          ) : (
            <View style={styles.centerBox}>
              <Feather name="lock" size={36} color={colors.mutedForeground as string} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground as string, marginTop: 12 }]}>
                Sign in to manage your branch.
              </Text>
            </View>
          )
        )}
      </View>
    </View>
  );
}

/* ── Styles ───────────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  root: { flex: 1 },

  /* Nav */
  nav: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 36, height: 36, justifyContent: "center" },
  closeBtn: { width: 36, height: 36, justifyContent: "center", alignItems: "flex-end" },
  navTitle: { fontSize: 15, fontWeight: "800", letterSpacing: -0.3 },
  navSubtitle: { fontSize: 11, marginTop: 1 },

  /* Tab bar */
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
    paddingTop: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 9,
    borderRadius: 10,
    marginBottom: 4,
  },
  tabBtnActive: {},
  tabLabel: { fontSize: 11, fontWeight: "600" },
  tabLabelActive: { fontWeight: "800" },

  /* Tab scroll content */
  tabScroll: { paddingTop: 14, paddingBottom: 40, gap: 0 },

  /* Section header */
  secHeader: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 4,
  },

  /* Community overview card */
  overviewCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  overviewLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  overviewBody: {
    fontSize: 13,
    lineHeight: 20,
  },

  /* Stat grid */
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 18,
  },
  statCard: {
    width: "47%",
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 5,
  },
  statIcon: { fontSize: 22 },
  statValue: { fontSize: 20, fontWeight: "800", lineHeight: 24 },
  statLabel: { fontSize: 11, lineHeight: 15 },
  statTrend: { fontSize: 11, fontWeight: "600" },

  /* Distribution */
  distCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 2,
  },
  distRow: { padding: 12 },
  distRowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  distCity: { fontSize: 13, fontWeight: "600" },
  distRegion: { fontSize: 11, marginTop: 1 },
  distPop: { fontSize: 12, fontWeight: "700" },
  distTrack: {
    height: 5,
    borderRadius: 3,
    overflow: "hidden",
  },
  distBar: { height: "100%", borderRadius: 3 },

  /* Approved branch cards */
  branchCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 12,
  },
  synagogueBanner: { height: 130, position: "relative" },
  synagogueImg: { width: "100%", height: "100%" },
  synagogueOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
    backgroundImage: "linear-gradient(to bottom, rgba(0,0,0,0.08), rgba(0,0,0,0.68))",
  } as any,
  verifiedBadge: {
    position: "absolute",
    top: 8,
    right: 10,
    backgroundColor: "rgba(74,222,128,0.88)",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  verifiedText: { fontSize: 10, fontWeight: "700", color: "#fff" },
  bannerLogo: {
    position: "absolute",
    bottom: 10,
    left: 12,
    width: 42,
    height: 42,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.9)",
  },
  bannerTextBlock: {
    position: "absolute",
    bottom: 10,
    right: 70,
  },
  bannerName: { fontSize: 13, fontWeight: "800", color: "#fff", textShadowColor: "rgba(0,0,0,0.6)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  bannerSub: { fontSize: 10, color: "rgba(255,255,255,0.82)", marginTop: 2 },
  bannerTotal: { position: "absolute", bottom: 10, right: 10, alignItems: "flex-end" },
  bannerTotalNum: { fontSize: 16, fontWeight: "800", color: "#4ade80" },
  bannerTotalLabel: { fontSize: 9, color: "rgba(255,255,255,0.75)" },

  branchHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  branchLogo: { width: 36, height: 36, borderRadius: 9, borderWidth: 1, borderColor: "rgba(74,222,128,0.35)" },
  branchName: { fontSize: 13, fontWeight: "700" },
  branchSub: { fontSize: 11, marginTop: 2 },
  branchTotalNum: { fontSize: 14, fontWeight: "700", textAlign: "right" },
  branchTotalLabel: { fontSize: 10, textAlign: "right" },

  branchStatsRow: { flexDirection: "row", gap: 8, padding: 10 },
  branchStat: { flex: 1, borderRadius: 8, padding: 8, alignItems: "center" },
  branchStatNum: { fontSize: 14, fontWeight: "800" },
  branchStatLabel: { fontSize: 10, marginTop: 2 },

  /* Admin tab */
  submissionCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  subHeader: { flexDirection: "row", alignItems: "flex-start", marginBottom: 8 },
  subLogo: { width: 32, height: 32, borderRadius: 8 },
  subName: { fontSize: 13, fontWeight: "700" },
  subMeta: { fontSize: 11, marginTop: 2 },
  subDate: { fontSize: 11, marginBottom: 10 },
  subSynagogueImg: { width: "100%", height: 80, borderRadius: 8, marginBottom: 8 },
  statusBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  statusText: { fontSize: 10, fontWeight: "800" },

  noteInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    fontSize: 12,
    marginBottom: 8,
  },
  actionRow: { flexDirection: "row", gap: 8 },
  rejectBtn: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.35)",
    backgroundColor: "rgba(239,68,68,0.08)",
    alignItems: "center",
  },
  rejectBtnText: { color: "#ef4444", fontSize: 13, fontWeight: "700" },
  approveBtn: {
    flex: 2,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#166534",
    alignItems: "center",
  },
  approveBtnText: { color: "#fff", fontSize: 13, fontWeight: "800" },

  /* Empty/center */
  emptyText: { textAlign: "center", padding: 20, fontSize: 13 },
  centerBox: { flex: 1, alignItems: "center", justifyContent: "center" },

  /* Local admin */
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderRadius: 12,
    marginTop: 4,
    marginBottom: 20,
  },
  primaryBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
});
