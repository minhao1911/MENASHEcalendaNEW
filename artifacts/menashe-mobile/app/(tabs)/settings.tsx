import React, { useState } from "react";
import {
  Alert, Modal, Platform, ScrollView, StyleSheet, Switch, Text,
  TouchableOpacity, View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";
import { LOCATIONS, type Location } from "@/lib/locations";
import {
  requestPermission,
  getPermissionStatus,
  scheduleAllNotifications,
  type NotificationPrefs,
} from "@/lib/notifications";
import * as Notifications from "expo-notifications";

const LEAD_OPTIONS = [5, 10, 15, 30];

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const {
    location, setLocation,
    notifPrefs, setNotifPrefs,
    leadMinutes, setLeadMinutes,
    scheduledCount, reschedule,
  } = useApp();

  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [permStatus, setPermStatus] = useState<Notifications.PermissionStatus | null>(null);
  const [rescheduling, setRescheduling] = useState(false);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

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
              "Notifications Blocked",
              "Please enable notifications for Menashe Calendar in your device settings to receive alerts.",
              [{ text: "OK" }],
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
    await reschedule();
    setRescheduling(false);
    if (Platform.OS !== "web") {
      Alert.alert("Done", `${scheduledCount} notifications scheduled on your device.`);
    }
  }

  async function handleEnableAll() {
    const granted = await requestPermission();
    setPermStatus(granted ? Notifications.PermissionStatus.GRANTED : Notifications.PermissionStatus.DENIED);
    if (granted) {
      await setNotifPrefs({ shabbat: true, havdalah: true, prayers: false, parasha: true, holiday: true });
    } else {
      Alert.alert("Permission Denied", "Could not enable notifications. Check your device settings.");
    }
  }

  const notifRows: { key: keyof NotificationPrefs; label: string; sub: string; icon: keyof typeof Feather.glyphMap }[] = [
    { key: "shabbat",  label: "Candle Lighting", sub: "18 min before Shabbat",     icon: "star" },
    { key: "havdalah", label: "Havdalah",         sub: "When Shabbat ends",         icon: "moon" },
    { key: "parasha",  label: "Weekly Parasha",   sub: "Friday morning reminder",   icon: "book-open" },
    { key: "holiday",  label: "Holiday Alerts",   sub: "Day before each holiday",   icon: "calendar" },
    { key: "prayers",  label: "Prayer Reminders", sub: "Shacharit, Mincha, Maariv", icon: "clock" },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        <View style={{ paddingTop: topPad + 16, paddingHorizontal: 16 }}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>LOCATION</Text>
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
                <Text style={[styles.cardSub, { color: colors.mutedForeground }]}>{location.country} · UTC offset by timezone</Text>
              </View>
            </View>
            <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
          </View>
        </TouchableOpacity>

        <View style={{ paddingTop: 24, paddingHorizontal: 16 }}>
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>NOTIFICATIONS</Text>
        </View>

        {/* Enable All Button */}
        <TouchableOpacity
          style={[styles.enableBtn, { backgroundColor: colors.primary, marginHorizontal: 16 }]}
          onPress={handleEnableAll}
          activeOpacity={0.8}
        >
          <Feather name="bell" size={16} color={colors.primaryForeground} />
          <Text style={[styles.enableBtnText, { color: colors.primaryForeground }]}>Enable All Notifications</Text>
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
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>LEAD TIME (PRAYERS)</Text>
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
          <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>SCHEDULED</Text>
        </View>
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, marginHorizontal: 16 }]}>
          <View style={styles.rowBetween}>
            <View style={styles.rowStart}>
              <Feather name="bell" size={18} color={colors.primary} />
              <Text style={[styles.cardTitle, { color: colors.foreground, marginLeft: 12 }]}>
                {scheduledCount} notifications scheduled
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
            {rescheduling ? "Rescheduling…" : "Reschedule Now"}
          </Text>
        </TouchableOpacity>

        <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
          <Text style={[styles.noteText, { color: colors.mutedForeground }]}>
            Notifications appear in your device's notification bar even when the app is closed. They are scheduled locally on your device — no internet required.
          </Text>
        </View>
      </ScrollView>

      {/* Location Picker Modal */}
      <Modal visible={showLocationPicker} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 16, borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>Select Location</Text>
            <TouchableOpacity onPress={() => setShowLocationPicker(false)}>
              <Feather name="x" size={24} color={colors.foreground} />
            </TouchableOpacity>
          </View>
          <ScrollView>
            {LOCATIONS.map((loc) => (
              <TouchableOpacity
                key={loc.name}
                style={[styles.locationRow, { borderBottomColor: colors.border }]}
                onPress={() => {
                  setLocation(loc);
                  setShowLocationPicker(false);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.locName, { color: location.name === loc.name ? colors.primary : colors.foreground }]}>
                    {loc.name}
                  </Text>
                  <Text style={[styles.locCountry, { color: colors.mutedForeground }]}>{loc.country}</Text>
                </View>
                {location.name === loc.name && (
                  <Feather name="check" size={18} color={colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
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
});
