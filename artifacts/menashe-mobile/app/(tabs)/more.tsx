/**
 * More — Hub page
 * Design blueprint: uploaded reference image
 * Sections: header · community banner · quick-access grid ·
 *           APP settings group · SUPPORT & ABOUT group
 */

import React, { useRef, useEffect } from "react";
import {
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuth, useUser } from "@clerk/expo";
import Constants from "expo-constants";
import { useThemeTokens } from "@/src/mobile/design-system";
import { useApp } from "@/context/AppContext";
import { useLanguage } from "@/context/LanguageContext";
import * as Haptics from "expo-haptics";

// ─── Constants ────────────────────────────────────────────────────────────────

const GOLD      = "#d4a843";
const NAVY_CARD = "#0e1628";
const NAVY_ROW  = "#111827";

// ─── Globe dot decoration ─────────────────────────────────────────────────────
// Pure-View dots arranged in a hemisphere grid + 3 arc connection lines

function GlobeDots() {
  // 3 arc rows of dots; each row has increasing/decreasing count for the sphere feel
  const rows = [
    { y: 8,  dots: [60, 82, 104, 126], r: 2.5 },
    { y: 28, dots: [50, 68, 86, 104, 122, 140], r: 3 },
    { y: 50, dots: [58, 76, 94, 112, 130], r: 2.5 },
    { y: 70, dots: [66, 84, 102, 120], r: 2 },
    { y: 86, dots: [74, 90, 106], r: 1.5 },
  ];
  return (
    <View style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 160, overflow: "hidden" }}>
      {/* Dot grid */}
      {rows.map((row, ri) =>
        row.dots.map((x, di) => (
          <View
            key={`${ri}-${di}`}
            style={{
              position: "absolute",
              top: row.y,
              left: x,
              width: row.r * 2,
              height: row.r * 2,
              borderRadius: row.r,
              backgroundColor: "rgba(139,92,246,0.55)",
            }}
          />
        ))
      )}
      {/* Arc connection lines — simulated with rotated thin views */}
      <View style={{
        position: "absolute", top: 10, left: 55,
        width: 110, height: 55,
        borderTopWidth: 1.5, borderRightWidth: 0,
        borderTopColor: "rgba(139,92,246,0.40)",
        borderRadius: 60,
      }} />
      <View style={{
        position: "absolute", top: 22, left: 62,
        width: 96, height: 48,
        borderTopWidth: 1, borderRightWidth: 0,
        borderTopColor: "rgba(99,102,241,0.30)",
        borderRadius: 55,
      }} />
      <View style={{
        position: "absolute", top: 36, left: 70,
        width: 78, height: 36,
        borderTopWidth: 1, borderRightWidth: 0,
        borderTopColor: "rgba(167,139,250,0.25)",
        borderRadius: 45,
      }} />
      {/* Glow pulse at arc origin */}
      <View style={{
        position: "absolute", top: 8, left: 55,
        width: 8, height: 8, borderRadius: 4,
        backgroundColor: "rgba(167,139,250,0.90)",
        shadowColor: "#a78bfa", shadowOpacity: 0.9, shadowRadius: 6,
        shadowOffset: { width: 0, height: 0 },
      }} />
      <View style={{
        position: "absolute", top: 32, left: 130,
        width: 6, height: 6, borderRadius: 3,
        backgroundColor: "rgba(139,92,246,0.85)",
        shadowColor: "#8b5cf6", shadowOpacity: 0.8, shadowRadius: 5,
        shadowOffset: { width: 0, height: 0 },
      }} />
    </View>
  );
}

// ─── Quick-access grid item ────────────────────────────────────────────────────

function QuickItem({
  icon, label, sub, color, onPress,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  label: string;
  sub: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.78}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.quickItem}
    >
      <View style={[styles.quickIconBox, { backgroundColor: color + "1A" }]}>
        <Feather name={icon} size={22} color={color} />
      </View>
      <Text style={styles.quickLabel} numberOfLines={1}>{label}</Text>
      <Text style={styles.quickSub} numberOfLines={1}>{sub}</Text>
    </TouchableOpacity>
  );
}

// ─── Settings row ─────────────────────────────────────────────────────────────

function SettingsRow({
  icon, iconBg, iconColor, title, subtitle, onPress, trailing, last,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle: string;
  onPress?: () => void;
  trailing?: React.ReactNode;
  last?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.72}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={[styles.settingsRow, last && { borderBottomWidth: 0 }]}
    >
      <View style={[styles.settingsIconBox, { backgroundColor: iconBg }]}>
        <Feather name={icon} size={18} color={iconColor} />
      </View>
      <View style={styles.settingsText}>
        <Text style={styles.settingsTitle}>{title}</Text>
        <Text style={styles.settingsSub}>{subtitle}</Text>
      </View>
      {trailing ?? <Feather name="chevron-right" size={17} color="rgba(255,255,255,0.28)" />}
    </TouchableOpacity>
  );
}

// ─── Inline value pill (e.g. "English ˅") ─────────────────────────────────────

function ValuePill({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.72}
      style={styles.valuePill}
    >
      <Text style={styles.valuePillText}>{label}</Text>
      <Feather name="chevron-down" size={12} color="rgba(255,255,255,0.55)" />
    </TouchableOpacity>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MoreScreen() {
  const { colors }          = useThemeTokens();
  const { theme, setTheme } = useApp();
  const { lang, setLang, t } = useLanguage();
  const { user }            = useUser();
  const { signOut }         = useAuth();
  const insets              = useSafeAreaInsets();
  const isDark              = theme !== "light";
  const topPad              = insets.top > 0 ? insets.top : (Platform.OS === "web" ? 60 : 20);
  const appVersion          = Constants.expoConfig?.version ?? "1.2.0";

  // Entrance animation
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(18)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim,  { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 380, useNativeDriver: true }),
    ]).start();
  }, []);

  function haptic() {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function cycleTheme() {
    haptic();
    const order: ("dark" | "light" | "sapphire")[] = ["dark", "light", "sapphire"];
    const idx = order.indexOf(theme as any);
    setTheme(order[(idx + 1) % order.length]);
  }

  function cycleLang() {
    haptic();
    setLang(lang === "en" ? "tk" : "en");
  }

  const themeLabel = theme === "dark" ? "Dark Mode" : theme === "light" ? "Light Mode" : "Sapphire";
  const langLabel  = lang === "en" ? "English" : "Mizo";

  const BG = isDark ? "#080c14" : colors.background;

  return (
    <View style={{ flex: 1, backgroundColor: BG }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}
      >
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          {/* ── Header ─────────────────────────────────────────────────────── */}
          <View style={[styles.header, { paddingTop: topPad + 8 }]}>
            <View>
              <Text style={styles.headerTitle}>More</Text>
              <Text style={[styles.headerSub, { color: "rgba(255,255,255,0.45)" }]}>
                All features &amp; settings in one place
              </Text>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.headerBtn}
                onPress={() => router.push("/search" as any)}
                accessibilityLabel="Search"
                accessibilityRole="button"
              >
                <Feather name="search" size={20} color="rgba(255,255,255,0.80)" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.headerBtn}
                onPress={() => router.push("/community/announcements" as any)}
                accessibilityLabel="Notifications"
                accessibilityRole="button"
              >
                <Feather name="bell" size={20} color="rgba(255,255,255,0.80)" />
                {/* Notification dot */}
                <View style={styles.notifDot} />
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Community banner card ────────────────────────────────────── */}
          <TouchableOpacity
            style={styles.bannerCard}
            onPress={() => { haptic(); router.push("/community" as any); }}
            activeOpacity={0.88}
            accessibilityRole="button"
            accessibilityLabel="Bnei Menashe Community"
          >
            {/* Gradient background */}
            <LinearGradient
              colors={["#141d35", "#0e1628"]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            {/* Globe dot decoration */}
            <GlobeDots />

            {/* Content */}
            <View style={styles.bannerContent}>
              {/* Menorah icon circle */}
              <View style={styles.menorahRing}>
                <LinearGradient
                  colors={["#1a1200", "#2a1c00"]}
                  style={StyleSheet.absoluteFillObject}
                />
                <View style={[StyleSheet.absoluteFillObject, { borderRadius: 34, borderWidth: 2, borderColor: GOLD + "70" }]} />
                <Text style={{ fontSize: 30 }}>🕎</Text>
              </View>

              {/* Text block */}
              <View style={styles.bannerText}>
                <Text style={styles.bannerTitle}>Bnei Menashe Community</Text>
                <Text style={styles.bannerSub}>Connected • United • Rising Together</Text>
                <View style={styles.memberBadge}>
                  <Text style={{ fontSize: 11 }}>⭐</Text>
                  <Text style={styles.memberBadgeText}>Community Member</Text>
                </View>
              </View>
            </View>

            {/* Chevron */}
            <View style={styles.bannerChevron}>
              <Feather name="chevron-right" size={20} color="rgba(255,255,255,0.45)" />
            </View>
          </TouchableOpacity>

          {/* ── Quick access grid ────────────────────────────────────────── */}
          <View style={styles.quickGrid}>
            <QuickItem icon="book-open"  label="My Library"  sub="8 books"        color="#8b5cf6" onPress={() => { haptic(); router.push("/torah" as any); }} />
            <QuickItem icon="calendar"   label="Calendar"    sub="Events & times" color="#06b6d4" onPress={() => { haptic(); router.push("/calendar" as any); }} />
            <QuickItem icon="users"      label="Community"   sub="Connect"        color="#22c55e" onPress={() => { haptic(); router.push("/community" as any); }} />
            <QuickItem icon="heart"      label="Prayer"      sub="Requests"       color="#f43f5e" onPress={() => { haptic(); router.push("/prayer-board" as any); }} />
            <QuickItem icon="star"       label="Favorites"   sub="Saved items"    color="#a78bfa" onPress={() => { haptic(); }} />
          </View>

          {/* ── APP section ──────────────────────────────────────────────── */}
          <Text style={styles.sectionLabel}>APP</Text>
          <View style={styles.card}>
            <SettingsRow
              icon="settings"      iconBg="rgba(59,130,246,0.18)"  iconColor="#3b82f6"
              title="Settings"     subtitle="App preferences & customization"
              onPress={() => { haptic(); router.push("/settings" as any); }}
            />
            <SettingsRow
              icon="globe"         iconBg="rgba(34,197,94,0.18)"   iconColor="#22c55e"
              title="Language"     subtitle="Choose your preferred language"
              onPress={cycleLang}
              trailing={
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <ValuePill label={langLabel} onPress={cycleLang} />
                  <Feather name="chevron-right" size={17} color="rgba(255,255,255,0.28)" />
                </View>
              }
            />
            <SettingsRow
              icon="moon"          iconBg="rgba(168,85,247,0.18)"  iconColor="#a855f7"
              title="Appearance"   subtitle="Customize the look & feel"
              onPress={cycleTheme}
              trailing={
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <ValuePill label={themeLabel} onPress={cycleTheme} />
                  <Feather name="chevron-right" size={17} color="rgba(255,255,255,0.28)" />
                </View>
              }
            />
            <SettingsRow
              icon="download"      iconBg="rgba(245,158,11,0.18)"  iconColor="#f59e0b"
              title="Downloads"    subtitle="Manage offline content"
              onPress={() => haptic()}
            />
            <SettingsRow
              icon="upload-cloud"  iconBg="rgba(20,184,166,0.18)"  iconColor="#14b8a6"
              title="Backup & Sync" subtitle="Keep your data safe"
              onPress={() => haptic()}
              last
            />
          </View>

          {/* ── SUPPORT & ABOUT section ──────────────────────────────────── */}
          <Text style={styles.sectionLabel}>SUPPORT &amp; ABOUT</Text>
          <View style={styles.card}>
            <SettingsRow
              icon="help-circle"   iconBg="rgba(59,130,246,0.18)"  iconColor="#3b82f6"
              title="Help Center"  subtitle="FAQs & support"
              onPress={() => haptic()}
            />
            <SettingsRow
              icon="message-square" iconBg="rgba(168,85,247,0.18)" iconColor="#a855f7"
              title="Send Feedback" subtitle="We'd love to hear from you"
              onPress={() => haptic()}
            />
            <SettingsRow
              icon="info"          iconBg="rgba(34,197,94,0.18)"   iconColor="#22c55e"
              title="About Bnei Menashe App" subtitle={`Version ${appVersion}`}
              onPress={() => haptic()}
            />
            <SettingsRow
              icon="shield"        iconBg="rgba(239,68,68,0.18)"   iconColor="#ef4444"
              title="Privacy Policy" subtitle="Your privacy matters"
              onPress={() => haptic()}
              last
            />
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
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  headerSub: {
    fontSize: 13,
    fontWeight: "400",
    marginTop: 3,
  },
  headerActions: {
    flexDirection: "row",
    gap: 6,
    marginTop: 6,
  },
  headerBtn: {
    width: 40, height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.07)",
    alignItems: "center",
    justifyContent: "center",
  },
  notifDot: {
    position: "absolute",
    top: 8, right: 8,
    width: 7, height: 7,
    borderRadius: 3.5,
    backgroundColor: "#a78bfa",
    borderWidth: 1.5,
    borderColor: "#080c14",
  },

  // Community banner
  bannerCard: {
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(139,92,246,0.20)",
    overflow: "hidden",
    minHeight: 120,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 18,
    shadowColor: "#000",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  bannerContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 14,
  },
  menorahRing: {
    width: 68, height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flexShrink: 0,
  },
  bannerText: {
    flex: 1,
    gap: 3,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: -0.2,
  },
  bannerSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.55)",
    fontWeight: "500",
  },
  memberBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(212,168,67,0.15)",
    borderWidth: 1,
    borderColor: "rgba(212,168,67,0.35)",
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  memberBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: GOLD,
    letterSpacing: 0.3,
  },
  bannerChevron: {
    paddingLeft: 8,
  },

  // Quick grid
  quickGrid: {
    flexDirection: "row",
    marginHorizontal: 16,
    marginBottom: 24,
    gap: 8,
  },
  quickItem: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 4,
    gap: 6,
  },
  quickIconBox: {
    width: 48, height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  quickLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#ffffff",
    textAlign: "center",
    letterSpacing: 0,
  },
  quickSub: {
    fontSize: 9.5,
    fontWeight: "500",
    color: "rgba(255,255,255,0.40)",
    textAlign: "center",
  },

  // Section label
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.5,
    color: "rgba(255,255,255,0.38)",
    marginHorizontal: 20,
    marginBottom: 10,
    marginTop: 4,
  },

  // Settings card
  card: {
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.045)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
    overflow: "hidden",
  },
  settingsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.07)",
  },
  settingsIconBox: {
    width: 38, height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  settingsText: {
    flex: 1,
  },
  settingsTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#ffffff",
    letterSpacing: -0.1,
  },
  settingsSub: {
    fontSize: 12,
    color: "rgba(255,255,255,0.42)",
    marginTop: 1,
    fontWeight: "400",
  },

  // Value pill
  valuePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  valuePillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.72)",
  },
});
