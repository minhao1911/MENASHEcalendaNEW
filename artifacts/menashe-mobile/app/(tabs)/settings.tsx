import React, { useState } from "react";
import {
  Alert, Modal, Platform, ScrollView, StyleSheet, Switch, Text,
  TouchableOpacity, View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useAuth, useUser } from "@clerk/expo";
import { useThemeTokens } from "@/src/mobile/design-system";
import { useApp } from "@/context/AppContext";
import { useLanguage } from "@/context/LanguageContext";
import PALETTES, { type ThemeKey } from "@/constants/colors";
import { LOCATIONS } from "@/lib/locations";
import LocationPickerModal from "@/components/LocationPickerModal";
import {
  requestPermission,
  getPermissionStatus,
  scheduleAllNotifications,
  type NotificationPrefs,
} from "@/lib/notifications";
import { sendTestExpoPush } from "@/lib/expoPush";
import * as Notifications from "expo-notifications";

const LEAD_OPTIONS = [5, 10, 15, 30];

export default function SettingsScreen() {
  const { colors } = useThemeTokens();
  const insets = useSafeAreaInsets();
  const { signOut, getToken } = useAuth();
  const { user } = useUser();
  const {
    theme, setTheme,
    location, setLocation,
    notifPrefs, setNotifPrefs,
    leadMinutes, setLeadMinutes,
    scheduledCount, reschedule,
    serverPushRegistered, registerServerPush, unregisterServerPush,
  } = useApp();
  const { lang, setLang, t } = useLanguage();

  async function handleSetTheme(themeKey: ThemeKey) {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await setTheme(themeKey);
  }
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [permStatus, setPermStatus] = useState<Notifications.PermissionStatus | null>(null);
  const [rescheduling, setRescheduling] = useState(false);
  const [serverPushLoading, setServerPushLoading] = useState(false);
  const [testPushLoading, setTestPushLoading] = useState(false);

  const topPad = insets.top > 0 ? insets.top : (Platform.OS === "web" ? 60 : 20);

  async function handleToggle(key: keyof NotificationPrefs, value: boolean) {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (value) {
      const status = await getPermissionStatus();
      if (status !== Notifications.PermissionStatus.GRANTED) {
        const granted = await requestPermission();
        if (!granted) {
          if (Platform.OS !== "web") {
            Alert.alert(
              t.settingsAlertNotifBlockedTitle,
              t.settingsAlertNotifBlockedMsg,
              [{ text: t.settingsAlertOk }],
            );
          }
          return;
        }
      }
    }
    await setNotifPrefs({ ...notifPrefs, [key]: value });
  }

  async function handleReschedule() {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setRescheduling(true);
    const n = await reschedule();
    setRescheduling(false);
    if (Platform.OS !== "web") {
      Alert.alert(t.settingsAlertScheduledTitle, t.settingsAlertScheduledMsg.replace("{n}", String(n)));
    }
  }

  async function handleEnableAll() {
    const granted = await requestPermission();
    setPermStatus(granted ? Notifications.PermissionStatus.GRANTED : Notifications.PermissionStatus.DENIED);
    if (granted) {
      await setNotifPrefs({ shabbat: true, havdalah: true, prayers: false, parasha: true, holiday: true });
    } else {
      Alert.alert(t.settingsAlertPermDeniedTitle, t.settingsAlertPermDeniedMsg);
    }
  }

  async function handleToggleServerPush(enable: boolean) {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setServerPushLoading(true);
    try {
      if (enable) {
        await registerServerPush(getToken);
        Alert.alert(t.settingsAlertServerPushTitle, t.settingsAlertServerPushMsg);
      } else {
        await unregisterServerPush(getToken);
      }
    } catch (err: any) {
      Alert.alert(t.settingsAlertErrorTitle, err?.message ?? t.settingsAlertServerPushErrMsg);
    } finally {
      setServerPushLoading(false);
    }
  }

  async function handleTestServerPush() {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTestPushLoading(true);
    try {
      await sendTestExpoPush(getToken);
      Alert.alert(t.settingsAlertTestSentTitle, t.settingsAlertTestSentMsg);
    } catch (err: any) {
      Alert.alert(t.settingsAlertErrorTitle, err?.message ?? t.settingsAlertTestFailMsg);
    } finally {
      setTestPushLoading(false);
    }
  }

  function handleSignOut() {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    Alert.alert(
      t.settingsAlertSignOutTitle,
      t.settingsAlertSignOutMsg,
      [
        { text: t.settingsAlertCancel, style: "cancel" },
        {
          text: t.settingsAlertSignOutTitle,
          style: "destructive",
          onPress: async () => {
            await signOut();
            router.replace("/sign-in");
          },
        },
      ],
    );
  }

  const notifRows: { key: keyof NotificationPrefs; label: string; sub: string; icon: keyof typeof Feather.glyphMap }[] = [
    { key: "shabbat",  label: t.settingsNotifCandleLighting,  sub: t.settingsNotifShabbatSub,  icon: "star" },
    { key: "havdalah", label: t.settingsNotifHavdalah,         sub: t.settingsNotifHavdalahSub, icon: "moon" },
    { key: "parasha",  label: t.settingsNotifParasha,          sub: t.settingsNotifParashaSub,  icon: "book-open" },
    { key: "holiday",  label: t.settingsNotifHolidayAlerts,    sub: t.settingsNotifHolidaySub,  icon: "calendar" },
    { key: "prayers",  label: t.settingsNotifPrayerReminders,  sub: t.settingsNotifPrayersSub,  icon: "clock" },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        {/* ── SCREEN HEADER ── */}
        <View style={{ paddingTop: topPad + 12, paddingHorizontal: 16, marginBottom: 20 }}>
          <Text style={{ fontSize: 28, fontWeight: "700", color: colors.foreground, letterSpacing: -0.5 }}>{t.settingsTitle}</Text>
          <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 4, fontWeight: "500" }}>
            {user?.primaryEmailAddress?.emailAddress ?? t.settingsYourAccount}
          </Text>
        </View>

        {/* ── APPEARANCE ── */}
        <View style={{ paddingHorizontal: 16 }}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{t.settingsAppearance}</Text>
        </View>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginHorizontal: 16, marginBottom: 16 }]}>
          <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground, marginBottom: 14 }}>{t.settingsTheme}</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            {/* Royal Midnight */}
            {/* Midnight */}
            <TouchableOpacity
              style={{ flex: 1, alignItems: "center" }}
              onPress={() => handleSetTheme("dark")}
              activeOpacity={0.75}
              accessibilityRole="radio"
              accessibilityState={{ checked: theme === "dark" }}
              accessibilityLabel={t.settingsThemeMidnight}
            >
              <View style={{
                borderRadius: 14, overflow: "hidden", borderWidth: 2,
                borderColor: theme === "dark" ? PALETTES.dark.primary : "transparent",
                shadowColor: theme === "dark" ? PALETTES.dark.primary : "#000",
                shadowOpacity: theme === "dark" ? 0.4 : 0.2,
                shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
                elevation: theme === "dark" ? 4 : 1,
              }}>
                <View style={{ backgroundColor: PALETTES.dark.background, padding: 8, height: 72, gap: 4 }}>
                  <View style={{ height: 8, borderRadius: 4, backgroundColor: PALETTES.dark.primary, width: "60%" }} />
                  <View style={{ height: 5, borderRadius: 3, backgroundColor: PALETTES.dark.secondary, width: "90%" }} />
                  <View style={{ height: 5, borderRadius: 3, backgroundColor: PALETTES.dark.secondary, width: "75%" }} />
                  <View style={{ flex: 1 }} />
                  <View style={{ flexDirection: "row", gap: 4 }}>
                    {[1,2,3].map(i => <View key={i} style={{ flex: 1, height: 14, borderRadius: 4, backgroundColor: PALETTES.dark.card }} />)}
                  </View>
                </View>
                <View style={{ backgroundColor: PALETTES.dark.background, padding: 5, flexDirection: "row", justifyContent: "space-around" }}>
                  {["🏠","📅","⏰","👥","⚙️"].map((ic, i) => (
                    <Text key={i} style={{ fontSize: 8 }}>{ic}</Text>
                  ))}
                </View>
              </View>
              <Text style={{ marginTop: 6, fontSize: 10, fontWeight: theme === "dark" ? "700" : "500", color: theme === "dark" ? PALETTES.dark.primary : colors.mutedForeground }}>
                {theme === "dark" ? "✓ " : ""}{t.settingsThemeMidnight}
              </Text>
            </TouchableOpacity>

            {/* Parchment Light */}
            <TouchableOpacity
              style={{ flex: 1, alignItems: "center" }}
              onPress={() => handleSetTheme("light")}
              activeOpacity={0.75}
              accessibilityRole="radio"
              accessibilityState={{ checked: theme === "light" }}
              accessibilityLabel={t.settingsThemeParchment}
            >
              <View style={{
                borderRadius: 14, overflow: "hidden", borderWidth: 2,
                borderColor: theme === "light" ? PALETTES.light.primary : "transparent",
                shadowColor: theme === "light" ? PALETTES.light.primary : "#000",
                shadowOpacity: theme === "light" ? 0.3 : 0.15,
                shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
                elevation: theme === "light" ? 4 : 1,
              }}>
                <View style={{ backgroundColor: PALETTES.light.background, padding: 8, height: 72, gap: 4 }}>
                  <View style={{ height: 8, borderRadius: 4, backgroundColor: PALETTES.light.primary, width: "60%" }} />
                  <View style={{ height: 5, borderRadius: 3, backgroundColor: PALETTES.light.card, width: "90%", borderWidth: 1, borderColor: PALETTES.light.border }} />
                  <View style={{ height: 5, borderRadius: 3, backgroundColor: PALETTES.light.card, width: "75%", borderWidth: 1, borderColor: PALETTES.light.border }} />
                  <View style={{ flex: 1 }} />
                  <View style={{ flexDirection: "row", gap: 4 }}>
                    {[1,2,3].map(i => <View key={i} style={{ flex: 1, height: 14, borderRadius: 4, backgroundColor: PALETTES.light.card, borderWidth: 1, borderColor: PALETTES.light.border }} />)}
                  </View>
                </View>
                <View style={{ backgroundColor: PALETTES.light.card, padding: 5, borderTopWidth: 1, borderTopColor: PALETTES.light.border, flexDirection: "row", justifyContent: "space-around" }}>
                  {["🏠","📅","⏰","👥","⚙️"].map((ic, i) => (
                    <Text key={i} style={{ fontSize: 8 }}>{ic}</Text>
                  ))}
                </View>
              </View>
              <Text style={{ marginTop: 6, fontSize: 10, fontWeight: theme === "light" ? "700" : "500", color: theme === "light" ? PALETTES.light.primary : colors.mutedForeground }}>
                {theme === "light" ? "✓ " : ""}{t.settingsThemeParchment}
              </Text>
            </TouchableOpacity>

            {/* Deep Sapphire */}
            <TouchableOpacity
              style={{ flex: 1, alignItems: "center" }}
              onPress={() => handleSetTheme("sapphire")}
              activeOpacity={0.75}
              accessibilityRole="radio"
              accessibilityState={{ checked: theme === "sapphire" }}
              accessibilityLabel={t.settingsThemeSapphire}
            >
              <View style={{
                borderRadius: 14, overflow: "hidden", borderWidth: 2,
                borderColor: theme === "sapphire" ? PALETTES.sapphire.primary : "transparent",
                shadowColor: theme === "sapphire" ? PALETTES.sapphire.primary : "#000",
                shadowOpacity: theme === "sapphire" ? 0.4 : 0.2,
                shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
                elevation: theme === "sapphire" ? 4 : 1,
              }}>
                <View style={{ backgroundColor: PALETTES.sapphire.background, padding: 8, height: 72, gap: 4 }}>
                  <View style={{ height: 8, borderRadius: 4, backgroundColor: PALETTES.sapphire.primary, width: "60%" }} />
                  <View style={{ height: 5, borderRadius: 3, backgroundColor: PALETTES.sapphire.card, width: "90%", borderWidth: 1, borderColor: PALETTES.sapphire.border }} />
                  <View style={{ height: 5, borderRadius: 3, backgroundColor: PALETTES.sapphire.card, width: "75%", borderWidth: 1, borderColor: PALETTES.sapphire.border }} />
                  <View style={{ flex: 1 }} />
                  <View style={{ flexDirection: "row", gap: 4 }}>
                    {[1,2,3].map(i => <View key={i} style={{ flex: 1, height: 14, borderRadius: 4, backgroundColor: PALETTES.sapphire.card, borderWidth: 1, borderColor: PALETTES.sapphire.border }} />)}
                  </View>
                </View>
                <View style={{ backgroundColor: PALETTES.sapphire.background, padding: 5, borderTopWidth: 1, borderTopColor: PALETTES.sapphire.border, flexDirection: "row", justifyContent: "space-around" }}>
                  {["🏠","📅","⏰","👥","⚙️"].map((ic, i) => (
                    <Text key={i} style={{ fontSize: 8 }}>{ic}</Text>
                  ))}
                </View>
              </View>
              <Text style={{ marginTop: 6, fontSize: 10, fontWeight: theme === "sapphire" ? "700" : "500", color: theme === "sapphire" ? PALETTES.sapphire.primary : colors.mutedForeground }}>
                {theme === "sapphire" ? "✓ " : ""}{t.settingsThemeSapphire}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── LANGUAGE ── */}
        <View style={{ paddingTop: 24, paddingHorizontal: 16 }}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{t.settingsLanguage.toUpperCase()}</Text>
        </View>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginHorizontal: 16, marginBottom: 16 }]}>
          <Text style={{ fontSize: 14, fontWeight: "600", color: colors.foreground, marginBottom: 4 }}>{t.settingsLanguage}</Text>
          <Text style={{ fontSize: 12, color: colors.mutedForeground, marginBottom: 14 }}>{t.settingsLanguageHint}</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TouchableOpacity
              style={{
                flex: 1, borderRadius: 12, borderWidth: 1.5, paddingVertical: 12, alignItems: "center",
                borderColor: lang === "en" ? colors.primary : colors.border,
                backgroundColor: lang === "en" ? colors.primary + "15" : "transparent",
              }}
              onPress={() => setLang("en")}
              activeOpacity={0.75}
            >
              <Text style={{ fontSize: 15, fontWeight: "700", color: lang === "en" ? colors.primary : colors.mutedForeground }}>English</Text>
              <Text style={{ fontSize: 11, color: colors.mutedForeground, marginTop: 2 }}>EN</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{
                flex: 1, borderRadius: 12, borderWidth: 1.5, paddingVertical: 12, alignItems: "center",
                borderColor: lang === "tk" ? colors.primary : colors.border,
                backgroundColor: lang === "tk" ? colors.primary + "15" : "transparent",
              }}
              onPress={() => setLang("tk")}
              activeOpacity={0.75}
            >
              <Text style={{ fontSize: 15, fontWeight: "700", color: lang === "tk" ? colors.primary : colors.mutedForeground }}>Thadou Kuki</Text>
              <Text style={{ fontSize: 11, color: colors.mutedForeground, marginTop: 2 }}>TK</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Edit Translations */}
        <TouchableOpacity
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginHorizontal: 16, marginBottom: 16 }]}
          onPress={() => router.push("/translation-editor")}
          activeOpacity={0.75}
        >
          <View style={styles.rowBetween}>
            <View style={styles.rowStart}>
              <View style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: "rgba(212,168,67,0.12)", alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontSize: 17 }}>✏️</Text>
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>{t.settingsEditTranslations}</Text>
                <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>{t.settingsEditTranslationsHint}</Text>
              </View>
            </View>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </View>
        </TouchableOpacity>

        {/* ── LOCATION ── */}
        <View style={{ paddingHorizontal: 16 }}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{t.settingsLocation}</Text>
        </View>

        {/* Location Card */}
        <TouchableOpacity
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginHorizontal: 16 }]}
          onPress={() => setShowLocationPicker(true)}
          activeOpacity={0.7}
        >
          <View style={styles.rowBetween}>
            <View style={styles.rowStart}>
              <Feather name="map-pin" size={18} color={colors.primary} />
              <View style={{ marginLeft: 12 }}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>{location.name}</Text>
                <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>{location.country} · {t.settingsLocationUtc}</Text>
              </View>
            </View>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </View>
        </TouchableOpacity>

        <View style={{ paddingTop: 24, paddingHorizontal: 16 }}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{t.settingsNotifications}</Text>
        </View>

        {/* Enable All Button */}
        <TouchableOpacity
          style={[styles.enableBtn, { backgroundColor: colors.primary, marginHorizontal: 16 }]}
          onPress={handleEnableAll}
          activeOpacity={0.8}
        >
          <Feather name="bell" size={16} color={colors.primaryForeground} />
          <Text style={[styles.enableBtnText, { color: colors.primaryForeground }]}>{t.settingsEnableAllNotif}</Text>
        </TouchableOpacity>

        {/* Notification Toggles */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginHorizontal: 16 }]}>
          {notifRows.map((row, i) => (
            <View key={row.key}>
              {i > 0 && <View style={[styles.divider, { backgroundColor: colors.border }]} />}
              <View style={styles.toggleRow}>
                <View style={[styles.iconWrap, { backgroundColor: colors.background }]}>
                  <Feather name={row.icon} size={15} color={colors.primary} />
                </View>
                <View style={styles.toggleText}>
                  <Text style={[styles.cardTitle, { color: colors.foreground }]}>{row.label}</Text>
                  <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>{row.sub}</Text>
                </View>
                <Switch
                  value={notifPrefs[row.key]}
                  onValueChange={(v) => handleToggle(row.key, v)}
                  trackColor={{ false: colors.border, true: colors.primary + "88" }}
                  thumbColor={notifPrefs[row.key] ? colors.primary : colors.mutedForeground}
                />
              </View>
            </View>
          ))}
        </View>

        {/* Lead Time */}
        <View style={{ paddingTop: 24, paddingHorizontal: 16 }}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{t.settingsLeadTimeSection}</Text>
        </View>
        <View style={[styles.leadRow, { marginHorizontal: 16 }]}>
          {LEAD_OPTIONS.map((mins) => (
            <TouchableOpacity
              key={mins}
              style={[
                styles.leadBtn,
                { backgroundColor: leadMinutes === mins ? colors.primary : colors.card, borderColor: colors.border },
              ]}
              onPress={() => setLeadMinutes(mins)}
              activeOpacity={0.7}
            >
              <Text style={[styles.leadText, { color: leadMinutes === mins ? colors.primaryForeground : colors.foreground }]}>
                {mins} min
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Status + Reschedule */}
        <View style={{ paddingTop: 24, paddingHorizontal: 16 }}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{t.settingsScheduled}</Text>
        </View>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginHorizontal: 16 }]}>
          <View style={styles.rowBetween}>
            <View style={styles.rowStart}>
              <Feather name="bell" size={18} color={colors.primary} />
              <Text style={[styles.cardTitle, { color: colors.foreground, marginLeft: 12 }]}>
                {t.settingsScheduledCount.replace("{n}", String(scheduledCount))}
              </Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.rescheduleBtn, { borderColor: colors.primary, marginHorizontal: 16 }]}
          onPress={handleReschedule}
          disabled={rescheduling}
          activeOpacity={0.8}
        >
          <Feather name="refresh-cw" size={16} color={colors.primary} />
          <Text style={[styles.rescheduleBtnText, { color: colors.primary }]}>
            {rescheduling ? t.settingsRescheduling : t.settingsRescheduleNow}
          </Text>
        </TouchableOpacity>

        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          <Text style={[styles.noteText, { color: colors.mutedForeground }]}>
            {t.settingsLocalNotifDesc}
          </Text>
        </View>

        {/* ── SERVER PUSH ── */}
        {Platform.OS !== "web" && (
          <>
            <View style={{ paddingTop: 24, paddingHorizontal: 16 }}>
              <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{t.settingsServerPushSection}</Text>
            </View>

            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginHorizontal: 16 }]}>
              <View style={styles.toggleRow}>
                <View style={[styles.iconWrap, { backgroundColor: colors.background }]}>
                  <Feather name="cloud" size={15} color={colors.primary} />
                </View>
                <View style={styles.toggleText}>
                  <Text style={[styles.cardTitle, { color: colors.foreground }]}>{t.settingsServerPushLabel}</Text>
                  <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>
                    {serverPushRegistered
                      ? t.settingsServerPushActiveDesc
                      : t.settingsServerPushInactiveDesc}
                  </Text>
                </View>
                <Switch
                  value={serverPushRegistered}
                  onValueChange={handleToggleServerPush}
                  disabled={serverPushLoading}
                  trackColor={{ false: colors.border, true: colors.primary + "88" }}
                  thumbColor={serverPushRegistered ? colors.primary : colors.mutedForeground}
                />
              </View>
            </View>

            {serverPushRegistered && (
              <TouchableOpacity
                style={[styles.rescheduleBtn, { borderColor: colors.primary, marginHorizontal: 16, marginTop: 8 }]}
                onPress={handleTestServerPush}
                disabled={testPushLoading}
                activeOpacity={0.8}
              >
                <Feather name="send" size={16} color={colors.primary} />
                <Text style={[styles.rescheduleBtnText, { color: colors.primary }]}>
                  {testPushLoading ? t.settingsSendingPush : t.settingsSendTestNotif}
                </Text>
              </TouchableOpacity>
            )}

            <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
              <Text style={[styles.noteText, { color: colors.mutedForeground }]}>
                {t.settingsServerPushFullDesc}
              </Text>
            </View>
          </>
        )}

        {/* ── ACCOUNT ── */}
        <View style={{ paddingTop: 32, paddingHorizontal: 16 }}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>{t.settingsAccount}</Text>
        </View>

        {/* User info card */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginHorizontal: 16, marginBottom: 12 }]}>
          <View style={styles.rowStart}>
            <View style={[styles.avatarCircle, { backgroundColor: colors.primary + "22", borderColor: colors.primary + "55" }]}>
              <Feather name="user" size={18} color={colors.primary} />
            </View>
            <View style={{ marginLeft: 12, flex: 1 }}>
              {user?.fullName ? (
                <Text style={[styles.cardTitle, { color: colors.foreground }]} numberOfLines={1}>{user.fullName}</Text>
              ) : null}
              <Text style={[styles.cardSub, { color: colors.mutedForeground }]} numberOfLines={1}>
                {user?.primaryEmailAddress?.emailAddress ?? t.settingsSignedIn}
              </Text>
            </View>
          </View>
        </View>

        {/* Edit Profile row */}
        <TouchableOpacity
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginHorizontal: 16, marginBottom: 12 }]}
          onPress={() => router.push("/profile/edit" as any)}
          activeOpacity={0.75}
        >
          <View style={styles.rowBetween}>
            <View style={styles.rowStart}>
              <View style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: colors.primary + "14", alignItems: "center", justifyContent: "center" }}>
                <Feather name="edit-2" size={16} color={colors.primary} />
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={[styles.cardTitle, { color: colors.foreground }]}>{t.settingsEditProfile}</Text>
                <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>{t.settingsEditProfileHint}</Text>
              </View>
            </View>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.signOutBtn, { borderColor: "#c0392b", marginHorizontal: 16 }]}
          onPress={handleSignOut}
          activeOpacity={0.8}
        >
          <Feather name="log-out" size={16} color="#c0392b" />
          <Text style={[styles.signOutText, { color: "#c0392b" }]}>{t.settingsSignOut}</Text>
        </TouchableOpacity>

        <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 8 }}>
          <Text style={[styles.noteText, { color: colors.mutedForeground }]}>
            {t.settingsSignOutHint}
          </Text>
        </View>

      </ScrollView>

      <LocationPickerModal
        visible={showLocationPicker}
        current={location}
        onSelect={(loc) => {
          setLocation(loc);
          setShowLocationPicker(false);
        }}
        onClose={() => setShowLocationPicker(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 11, fontWeight: "700" as const, letterSpacing: 1.2, marginBottom: 8 },
  card: { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 0 },
  cardTitle: { fontSize: 15, fontWeight: "600" as const },
  cardSub: { fontSize: 12, marginTop: 2 },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  rowStart: { flexDirection: "row", alignItems: "center" },
  enableBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, paddingVertical: 14, marginBottom: 12 },
  enableBtnText: { fontSize: 15, fontWeight: "700" as const },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: -16 },
  toggleRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12 },
  iconWrap: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center", marginRight: 12 },
  toggleText: { flex: 1 },
  leadRow: { flexDirection: "row", gap: 8 },
  leadBtn: { flex: 1, borderRadius: 10, borderWidth: 1, paddingVertical: 10, alignItems: "center" },
  leadText: { fontSize: 14, fontWeight: "600" as const },
  rescheduleBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, borderWidth: 1.5, paddingVertical: 13, marginTop: 12 },
  rescheduleBtnText: { fontSize: 15, fontWeight: "700" as const },
  noteText: { fontSize: 12, lineHeight: 18 },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: "700" as const },
  locationRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  locName: { fontSize: 15, fontWeight: "600" as const },
  locCountry: { fontSize: 13, marginTop: 2 },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  signOutBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, borderRadius: 12, borderWidth: 1.5, paddingVertical: 14 },
  signOutText: { fontSize: 15, fontWeight: "700" as const },
});
