/**
 * Census Experience Entry — SPR-P006B
 *
 * Introduction screen for the Community Census workflow.
 * Navigates to census/family-head for the registration form.
 *
 * Design: large illustration header · premium typography · generous whitespace
 *         warm neutral palette · MMDL token-driven colours
 */

import React, { useState, useEffect } from "react";
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

import { useThemeTokens } from "@/src/mobile/design-system";
import type { ColorTokens } from "@/src/mobile/design-system";
import { MenasheButton } from "@/src/mobile/components/foundation/MenasheButton";
import { hasDraft, clearDraft } from "@/lib/censusStore";
import { useLanguage } from "@/context/LanguageContext";

function haptic() {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
}

function InfoCard({
  icon, title, body, colors,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  title: string;
  body: string;
  colors: ColorTokens;
}) {
  return (
    <View
      style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      accessible
      accessibilityLabel={`${title}. ${body}`}
    >
      <View style={[styles.iconBox, {
        backgroundColor: (colors.primary as string) + "18",
        borderColor: (colors.primary as string) + "38",
      }]}>
        <Feather name={icon} size={22} color={colors.primary as string} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={[styles.infoTitle, { color: colors.foreground }]}>{title}</Text>
        <Text style={[styles.infoBody, { color: colors.mutedForeground }]}>{body}</Text>
      </View>
    </View>
  );
}

export default function CensusScreen() {
  const { colors, sp } = useThemeTokens();
  const insets = useSafeAreaInsets();
  const { t }  = useLanguage();

  const [draftExists, setDraftExists] = useState(false);

  useEffect(() => {
    hasDraft().then(setDraftExists);
  }, []);

  function handleBegin() {
    haptic();
    router.push("/census/family-head");
  }

  function handleDiscardDraft() {
    haptic();
    Alert.alert(
      t.censusDiscardDraftTitle,
      t.censusDiscardDraftBody,
      [
        { text: t.censusCancelBtn ?? "Cancel", style: "cancel" },
        {
          text: t.censusDiscardDraftConfirm,
          style: "destructive",
          onPress: async () => {
            await clearDraft();
            setDraftExists(false);
          },
        },
      ],
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>

      {/* ── Navigation bar ── */}
      <View
        style={[
          styles.nav,
          { paddingTop: insets.top + sp[2], borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity
          onPress={() => { haptic(); router.back(); }}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Feather name="arrow-left" size={22} color={colors.foreground as string} />
        </TouchableOpacity>

        <Text style={[styles.navTitle, { color: colors.foreground }]}>
          Community Census
        </Text>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + sp[10] },
        ]}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Hero illustration header ── */}
        <View style={[styles.hero, { backgroundColor: (colors.primary as string) + "0D" }]}>
          <View style={styles.illustRow}>
            <Text style={styles.illustSide}>🏘️</Text>
            <View style={[styles.illustCenter, {
              borderColor: (colors.primary as string) + "44",
              backgroundColor: (colors.primary as string) + "16",
            }]}>
              <Text style={styles.illustCenterEmoji}>📋</Text>
            </View>
            <Text style={styles.illustSide}>👥</Text>
          </View>

          <Text style={[styles.overline, { color: colors.primary }]}>BNEI MENASHE PLATFORM</Text>

          <Text style={[styles.heroTitle, { color: colors.foreground }]}>
            Community Census
          </Text>

          <Text style={[styles.heroTagline, { color: colors.mutedForeground }]}>
            Know your community.{"\n"}Build your future.
          </Text>
        </View>

        {/* ── Stat chips ── */}
        <View style={styles.chipRow}>
          <View style={[styles.chip, {
            backgroundColor: (colors.primary as string) + "14",
            borderColor: (colors.primary as string) + "3A",
          }]}>
            <Feather name="clock" size={13} color={colors.primary as string} />
            <Text style={[styles.chipText, { color: colors.primary }]}>~10 minutes</Text>
          </View>
          <View style={[styles.chip, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="shield" size={13} color={colors.mutedForeground as string} />
            <Text style={[styles.chipText, { color: colors.mutedForeground }]}>Private &amp; secure</Text>
          </View>
          <View style={[styles.chip, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="users" size={13} color={colors.mutedForeground as string} />
            <Text style={[styles.chipText, { color: colors.mutedForeground }]}>Every family</Text>
          </View>
        </View>

        {/* ── Info cards ── */}
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

        {/* ── Begin Census CTA — MMDS Button System (Primary, POC) ── */}
        <View style={styles.ctaWrap}>
          <MenasheButton
            label="Begin Census"
            variant="primary"
            size="lg"
            icon="edit-3"
            fullWidth
            onPress={handleBegin}
            accessibilityLabel="Begin Census — register as family head"
          />

          {draftExists && (
            <TouchableOpacity
              onPress={handleDiscardDraft}
              style={[styles.discardBtn, { borderColor: "#c0392b" }]}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={t.censusDiscardDraft}
            >
              <Feather name="trash-2" size={14} color="#c0392b" />
              <Text style={[styles.discardBtnText, { color: "#c0392b" }]}>
                {t.censusDiscardDraft}
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.hintRow}>
            <Feather name="info" size={13} color={colors.mutedForeground as string} />
            <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
              You will register as the family head
            </Text>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },

  nav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 40, height: 40, justifyContent: "center" },
  navTitle: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.3,
  },

  scroll: { gap: 0 },

  hero: {
    paddingTop: 32,
    paddingBottom: 24,
    paddingHorizontal: 24,
    alignItems: "center",
    gap: 8,
  },
  illustRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 16,
  },
  illustSide: { fontSize: 44, opacity: 0.85 },
  illustCenter: {
    width: 88,
    height: 88,
    borderRadius: 20,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  illustCenterEmoji: { fontSize: 52 },
  overline: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2.5,
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.8,
    textAlign: "center",
  },
  heroTagline: {
    fontSize: 18,
    fontWeight: "400",
    textAlign: "center",
    lineHeight: 27,
    marginTop: 8,
  },

  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 16,
    justifyContent: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.2 },

  cards: {
    paddingHorizontal: 16,
    gap: 12,
    marginTop: 4,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 16,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  infoTitle: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  infoBody: {
    fontSize: 13,
    lineHeight: 20,
  },

  ctaWrap: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 12,
  },
  discardBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 9999,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  discardBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  hintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  hintText: {
    fontSize: 13,
    fontWeight: "500",
  },
});
