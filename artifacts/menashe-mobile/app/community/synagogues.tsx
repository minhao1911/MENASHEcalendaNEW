/**
 * Community · Synagogue Directory — full list screen
 * Deep screen navigated to from the Community Hub (§7).
 * Uses LOCATIONS from shared-core + curated synagogue metadata.
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

// ── Synagogue data ─────────────────────────────────────────────────────────────
// Enriches shared-core LOCATIONS with synagogue-specific metadata.

interface Synagogue {
  id: string;
  name: string;
  nameTK: string;
  city: string;
  country: string;
  type: "beit-knesset" | "prayer-group" | "community-center";
  description: string;
  descriptionTK: string;
  rabbi?: string;
  contact?: string;
  address?: string;
  members?: number;
  lat: number;
  lng: number;
  tz: string;
}

const SYNAGOGUES: Synagogue[] = [
  {
    id: "churachandpur",
    name: "Beit Knesset Bnei Menashe",
    nameTK: "Beit Knesset Bnei Menashe",
    city: "Churachandpur",
    country: "India",
    type: "beit-knesset",
    description:
      "The central Beit Knesset of the Bnei Menashe community. Established prayer services, Torah study, and full lifecycle events.",
    descriptionTK:
      "Bnei Menashe mipil Beit Knesset. Thupui, Torah kihilna, leh mipil hinkhawm.",
    rabbi: "Rabbi Shlomo Gangte",
    contact: "chura@bneimenashe.org",
    address: "Churachandpur, Manipur 795128, India",
    members: 220,
    lat: 24.3333,
    lng: 93.6833,
    tz: "Asia/Kolkata",
  },
  {
    id: "imphal",
    name: "Bnei Menashe Prayer House",
    nameTK: "Bnei Menashe Thupui Inn",
    city: "Imphal",
    country: "India",
    type: "prayer-group",
    description:
      "Active prayer group serving the Imphal Bnei Menashe community. Shabbat services and holiday observances.",
    descriptionTK:
      "Imphal mipil tan thupui pawl. Shabbat leh lawmman thupui.",
    address: "Imphal, Manipur, India",
    members: 85,
    lat: 24.817,
    lng: 93.9368,
    tz: "Asia/Kolkata",
  },
  {
    id: "aizawl",
    name: "Bnei Menashe Community — Aizawl",
    nameTK: "Bnei Menashe Mipil — Aizawl",
    city: "Aizawl",
    country: "India",
    type: "prayer-group",
    description:
      "Growing Bnei Menashe community in Mizoram. Regular prayer services and Torah learning circles.",
    descriptionTK:
      "Mizoram Bnei Menashe mipil. Thupui regular leh Torah kihilna.",
    address: "Aizawl, Mizoram 796001, India",
    members: 140,
    lat: 23.7307,
    lng: 92.7173,
    tz: "Asia/Kolkata",
  },
  {
    id: "jerusalem",
    name: "Bnei Menashe Olim Community",
    nameTK: "Bnei Menashe Olim Mipil",
    city: "Jerusalem",
    country: "Israel",
    type: "community-center",
    description:
      "Community hub for Bnei Menashe olim in Jerusalem. Shabbat gatherings, absorption assistance, and cultural events.",
    descriptionTK:
      "Jerusalem Bnei Menashe olim tan mipil. Shabbat, siamna leh lawmman.",
    contact: "jerusalem@bneimenashe.org",
    address: "Jerusalem, Israel",
    members: 310,
    lat: 31.7683,
    lng: 35.2137,
    tz: "Asia/Jerusalem",
  },
  {
    id: "tel-aviv",
    name: "Bnei Menashe of Greater Tel Aviv",
    nameTK: "Tel Aviv Bnei Menashe",
    city: "Tel Aviv",
    country: "Israel",
    type: "prayer-group",
    description:
      "Shabbat and holiday prayer group for Bnei Menashe in the Tel Aviv metro area.",
    descriptionTK:
      "Tel Aviv Bnei Menashe Shabbat leh lawmman thupui.",
    address: "Tel Aviv, Israel",
    members: 90,
    lat: 32.0853,
    lng: 34.7818,
    tz: "Asia/Jerusalem",
  },
  {
    id: "new-york",
    name: "Bnei Menashe of North America",
    nameTK: "North America Bnei Menashe",
    city: "New York",
    country: "USA",
    type: "community-center",
    description:
      "Support network for Bnei Menashe in North America. Virtual Shabbat gatherings, aliyah guidance, and community events.",
    descriptionTK:
      "North America Bnei Menashe tan. Virtual Shabbat, aliyah pui leh mipil lawmman.",
    contact: "na@bneimenashe.org",
    address: "New York, USA",
    members: 55,
    lat: 40.7128,
    lng: -74.006,
    tz: "America/New_York",
  },
];

const TYPE_COLORS: Record<Synagogue["type"], string> = {
  "beit-knesset":     "#d4a843",
  "prayer-group":     "#818cf8",
  "community-center": "#fb923c",
};

// ── Country grouping ───────────────────────────────────────────────────────────

function groupByCountry(syns: Synagogue[]): Record<string, Synagogue[]> {
  return syns.reduce<Record<string, Synagogue[]>>((acc, s) => {
    if (!acc[s.country]) acc[s.country] = [];
    acc[s.country].push(s);
    return acc;
  }, {});
}

const COUNTRY_EMOJI: Record<string, string> = {
  India:     "🇮🇳",
  Israel:    "🇮🇱",
  USA:       "🇺🇸",
  Canada:    "🇨🇦",
  UK:        "🇬🇧",
  Australia: "🇦🇺",
};

// ── Synagogue card ─────────────────────────────────────────────────────────────

const SynagogueCard = memo(function SynagogueCard({
  syn,
  colors,
  lang,
  t,
}: {
  syn: Synagogue;
  colors: ReturnType<typeof useColors>;
  lang: string;
  t: ReturnType<typeof useLanguage>["t"];
}) {
  const name = lang === "tk" ? syn.nameTK : syn.name;
  const desc = lang === "tk" ? syn.descriptionTK : syn.description;
  const typeColor = TYPE_COLORS[syn.type];
  const typeLabel =
    syn.type === "beit-knesset"     ? t.commSynagogueTypeBK :
    syn.type === "prayer-group"     ? t.commSynagogueTypePG :
                                      t.commSynagogueTypeCC;

  function handleContact() {
    if (syn.contact) {
      if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      Linking.openURL(`mailto:${syn.contact}`);
    }
  }

  function handleMap() {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const query = encodeURIComponent(syn.address ?? `${syn.name} ${syn.city}`);
    const url =
      Platform.OS === "ios"
        ? `maps://?q=${query}`
        : `https://maps.google.com/?q=${query}`;
    Linking.openURL(url);
  }

  return (
    <View
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      accessibilityLabel={name}
    >
      {/* Header */}
      <View style={styles.cardHeader}>
        <View style={[styles.iconBox, { backgroundColor: typeColor + "1A" }]}>
          <Text style={{ fontSize: 22 }}>🕍</Text>
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={[styles.cardName, { color: colors.foreground }]}>{name}</Text>
          <View style={styles.metaRow}>
            <View style={[styles.typeBadge, { backgroundColor: typeColor + "18", borderColor: typeColor + "44" }]}>
              <Text style={[styles.typeText, { color: typeColor }]}>{typeLabel}</Text>
            </View>
            {syn.members !== undefined && (
              <View style={styles.memberRow}>
                <Feather name="users" size={11} color={colors.mutedForeground} />
                <Text style={[styles.memberText, { color: colors.mutedForeground }]}>
                  {syn.members}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Description */}
      <Text style={[styles.cardDesc, { color: colors.mutedForeground }]}>{desc}</Text>

      {/* Details */}
      <View style={[styles.detailsBox, { backgroundColor: colors.muted + "80", borderColor: colors.border }]}>
        {syn.address && (
          <View style={styles.detailRow}>
            <Feather name="map-pin" size={12} color={colors.mutedForeground} />
            <Text style={[styles.detailText, { color: colors.foreground }]}>{syn.address}</Text>
          </View>
        )}
        {syn.rabbi && (
          <View style={styles.detailRow}>
            <Feather name="user" size={12} color={colors.mutedForeground} />
            <Text style={[styles.detailText, { color: colors.foreground }]}>{syn.rabbi}</Text>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {syn.address && (
          <TouchableOpacity
            onPress={handleMap}
            style={[styles.actionBtn, { borderColor: colors.border, backgroundColor: colors.muted + "66" }]}
            accessibilityRole="button"
            accessibilityLabel={`${t.commMap} ${name}`}
          >
            <Feather name="map" size={14} color={colors.foreground} />
            <Text style={[styles.actionText, { color: colors.foreground }]}>{t.commMap}</Text>
          </TouchableOpacity>
        )}
        {syn.contact && (
          <TouchableOpacity
            onPress={handleContact}
            style={[styles.actionBtn, { borderColor: colors.primary + "55", backgroundColor: colors.primary + "0E" }]}
            accessibilityRole="button"
            accessibilityLabel={`${t.commContact} ${name}`}
          >
            <Feather name="mail" size={14} color={colors.primary} />
            <Text style={[styles.actionText, { color: colors.primary }]}>{t.commContact}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});

// ── Screen ─────────────────────────────────────────────────────────────────────

export default function SynagoguesScreen() {
  const colors = useColors();
  const { t, lang } = useLanguage();
  const insets = useSafeAreaInsets();
  const topPad = insets.top > 0 ? insets.top : (Platform.OS === "web" ? 60 : 20);

  const grouped = groupByCountry(SYNAGOGUES);
  const countries = Object.keys(grouped).sort((a, b) => {
    // India first (origin), Israel second (homeland), then alpha
    if (a === "India")  return -1;
    if (b === "India")  return  1;
    if (a === "Israel") return -1;
    if (b === "Israel") return  1;
    return a.localeCompare(b);
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
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
            {t.commSynagogueTitle}
          </Text>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: SPACE[4], paddingBottom: insets.bottom + 100 }}
        accessibilityLabel="Synagogue directory"
      >
        {/* Intro */}
        <Text style={[styles.intro, { color: colors.mutedForeground }]}>
          {t.commSynagogueScreenDesc}
        </Text>

        {/* Stats bar */}
        <View style={[styles.statsBar, { backgroundColor: colors.primary + "0C", borderColor: colors.primary + "22" }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: colors.primary }]}>{SYNAGOGUES.length}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{t.commSynagogueStatLocations}</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: colors.primary }]}>{countries.length}</Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{t.commSynagogueStatCountries}</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: colors.primary }]}>
              {SYNAGOGUES.reduce((s, sy) => s + (sy.members ?? 0), 0)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{t.commSynagogueStatMembers}</Text>
          </View>
        </View>

        {countries.map((country) => (
          <View key={country}>
            {/* Country header */}
            <View style={styles.countryHeader}>
              <Text style={{ fontSize: TEXT.xl }}>{COUNTRY_EMOJI[country] ?? "🌍"}</Text>
              <Text style={[styles.countryLabel, { color: colors.foreground }]}>{country}</Text>
              <View style={[styles.countryLine, { backgroundColor: colors.border }]} />
            </View>

            {grouped[country].map((syn) => (
              <SynagogueCard key={syn.id} syn={syn} colors={colors} lang={lang} t={t} />
            ))}
          </View>
        ))}

        {/* Register CTA */}
        <View style={[styles.ctaBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="plus-circle" size={22} color={colors.primary} />
          <Text style={[styles.ctaTitle, { color: colors.foreground }]}>
            {t.commSynagogueRegisterTitle}
          </Text>
          <Text style={[styles.ctaDesc, { color: colors.mutedForeground }]}>
            {t.commSynagogueRegisterDesc}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

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
  statDivider: { width: 1, height: 32 },

  countryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACE[2],
    marginBottom: SPACE[3],
    marginTop: SPACE[4],
  },
  countryLabel: { fontSize: TEXT.base, fontWeight: "700" },
  countryLine: { flex: 1, height: 1 },

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
  metaRow: { flexDirection: "row", alignItems: "center", gap: SPACE[2] },
  typeBadge: {
    borderWidth: 1,
    borderRadius: RADIUS.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  typeText: { fontSize: TEXT.xs, fontWeight: "700" },
  memberRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  memberText: { fontSize: TEXT.xs },

  cardDesc: { fontSize: TEXT.sm, lineHeight: 18 },

  detailsBox: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: SPACE[3],
    gap: SPACE[2],
  },
  detailRow: { flexDirection: "row", alignItems: "flex-start", gap: SPACE[2] },
  detailText: { fontSize: TEXT.sm, flex: 1 },

  actions: {
    flexDirection: "row",
    gap: SPACE[2],
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingVertical: SPACE[2],
    paddingHorizontal: SPACE[3],
    minHeight: 48,
    flex: 1,
    justifyContent: "center",
  },
  actionText: { fontSize: TEXT.sm, fontWeight: "600" },

  ctaBox: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACE[5],
    alignItems: "center",
    gap: SPACE[2],
    marginTop: SPACE[4],
    marginBottom: SPACE[2],
  },
  ctaTitle: { fontSize: TEXT.base, fontWeight: "700" },
  ctaDesc:  { fontSize: TEXT.sm, textAlign: "center", lineHeight: 18 },
});
