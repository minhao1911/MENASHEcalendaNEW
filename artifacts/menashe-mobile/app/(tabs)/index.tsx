import React, { useMemo } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Platform,
  TouchableOpacity,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";
import { calculateZmanim, formatTime } from "@/lib/zmanim";
import {
  getHebrewDate,
  formatHebrewDate,
  getCurrentParasha,
  getUpcomingHolidays,
} from "@/lib/hebrewCalendar";

function getNextWeekday(targetDay: number): Date {
  const d = new Date();
  let diff = (targetDay - d.getDay() + 7) % 7;
  if (diff === 0) diff = 7;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { location } = useApp();

  const today = new Date();
  const hdate = getHebrewDate(today);
  const hebrewDateStr = formatHebrewDate(hdate);
  const parasha = useMemo(() => getCurrentParasha(), []);
  const holidays = useMemo(() => getUpcomingHolidays(30), []);
  const nextHoliday = holidays[0] ?? null;

  const todayZm = useMemo(
    () => calculateZmanim(today, location.lat, location.lng, location.candleLightingMinutes),
    [location],
  );

  const isShabbat = today.getDay() === 6;
  const isFriday = today.getDay() === 5;

  const friday = getNextWeekday(5);
  const saturday = new Date(friday.getTime() + 86400000);
  const fridayZm = useMemo(
    () => calculateZmanim(friday, location.lat, location.lng, location.candleLightingMinutes),
    [location],
  );
  const satZm = useMemo(
    () => calculateZmanim(saturday, location.lat, location.lng),
    [location],
  );

  const gregDate = today.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  const styles = makeStyles(colors, insets);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerLogo}>✡</Text>
        <Text style={styles.headerTitle}>BNEI MENASHE</Text>
        <View style={styles.locationBadge}>
          <Feather name="map-pin" size={12} color={colors.mutedForeground} />
          <Text style={styles.locationText}>{location.name}</Text>
        </View>
      </View>

      {/* Hebrew Date Card */}
      <View style={styles.dateCard}>
        <Text style={styles.gregorianDate}>{gregDate}</Text>
        <Text style={styles.hebrewDate}>{hebrewDateStr}</Text>
        <View style={styles.divider} />
        <View style={styles.dateRow}>
          {todayZm.sunrise && (
            <View style={styles.miniStat}>
              <Feather name="sunrise" size={14} color={colors.primary} />
              <Text style={styles.miniLabel}>Sunrise</Text>
              <Text style={styles.miniValue}>{formatTime(todayZm.sunrise, location.tz)}</Text>
            </View>
          )}
          {todayZm.sunset && (
            <View style={styles.miniStat}>
              <Feather name="sunset" size={14} color={colors.primary} />
              <Text style={styles.miniLabel}>Sunset</Text>
              <Text style={styles.miniValue}>{formatTime(todayZm.sunset, location.tz)}</Text>
            </View>
          )}
          {todayZm.tzais && (
            <View style={styles.miniStat}>
              <Feather name="moon" size={14} color={colors.primary} />
              <Text style={styles.miniLabel}>Nightfall</Text>
              <Text style={styles.miniValue}>{formatTime(todayZm.tzais, location.tz)}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Parasha Card */}
      {parasha !== "" && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Feather name="book-open" size={16} color={colors.primary} />
            <Text style={styles.cardLabel}>Weekly Parasha</Text>
          </View>
          <Text style={styles.cardValue}>Parashat {parasha}</Text>
        </View>
      )}

      {/* Shabbat Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Feather name="star" size={16} color={colors.primary} />
          <Text style={styles.cardLabel}>{isFriday || isShabbat ? "Today's Shabbat" : "Upcoming Shabbat"}</Text>
        </View>
        <View style={styles.shabbatRow}>
          <View>
            <Text style={styles.shabbatLabel}>Candle Lighting</Text>
            <Text style={styles.shabbatTime}>{formatTime(fridayZm.candleLighting, location.tz)}</Text>
          </View>
          <View style={styles.shabbatDivider} />
          <View>
            <Text style={styles.shabbatLabel}>Havdalah</Text>
            <Text style={styles.shabbatTime}>{formatTime(satZm.havdalah, location.tz)}</Text>
          </View>
        </View>
      </View>

      {/* Upcoming Holiday */}
      {nextHoliday && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Feather name="calendar" size={16} color={colors.primary} />
            <Text style={styles.cardLabel}>Upcoming Holiday</Text>
          </View>
          <Text style={styles.cardValue}>{nextHoliday.name}</Text>
          <Text style={styles.cardSub}>
            {nextHoliday.date.toLocaleDateString("en-US", {
              weekday: "long", month: "long", day: "numeric",
            })}
          </Text>
        </View>
      )}

      {/* Today's Zmanim Summary */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Feather name="clock" size={16} color={colors.primary} />
          <Text style={styles.cardLabel}>Key Zmanim Today</Text>
        </View>
        <View style={styles.zmanimGrid}>
          {[
            { label: "Dawn", time: todayZm.alotHaShachar },
            { label: "Latest Shema", time: todayZm.latestShema },
            { label: "Noon", time: todayZm.chatzot },
            { label: "Mincha", time: todayZm.minchaKetana },
            { label: "Plag", time: todayZm.plagHamincha },
            { label: "Tzais", time: todayZm.tzais },
          ].map((z) => (
            <View key={z.label} style={styles.zmanimItem}>
              <Text style={styles.zmanimLabel}>{z.label}</Text>
              <Text style={styles.zmanimTime}>{formatTime(z.time, location.tz)}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

function makeStyles(colors: Record<string, any>, insets: { top: number; bottom: number }) {
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { paddingTop: topPad + 16, paddingBottom: insets.bottom + 100, paddingHorizontal: 16 },
    header: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 20 },
    headerLogo: { fontSize: 18, color: colors.primary },
    headerTitle: { fontSize: 15, fontWeight: "700" as const, color: colors.primary, letterSpacing: 2, flex: 1 },
    locationBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.card, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
    locationText: { fontSize: 12, color: colors.mutedForeground },
    dateCard: { backgroundColor: colors.card, borderRadius: colors.radius, padding: 20, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
    gregorianDate: { fontSize: 13, color: colors.mutedForeground, marginBottom: 4 },
    hebrewDate: { fontSize: 26, fontWeight: "700" as const, color: colors.foreground, marginBottom: 16 },
    divider: { height: 1, backgroundColor: colors.border, marginBottom: 16 },
    dateRow: { flexDirection: "row", justifyContent: "space-around" },
    miniStat: { alignItems: "center", gap: 4 },
    miniLabel: { fontSize: 11, color: colors.mutedForeground },
    miniValue: { fontSize: 13, fontWeight: "600" as const, color: colors.foreground },
    card: { backgroundColor: colors.card, borderRadius: colors.radius, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
    cardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
    cardLabel: { fontSize: 12, color: colors.mutedForeground, textTransform: "uppercase" as const, letterSpacing: 1 },
    cardValue: { fontSize: 18, fontWeight: "700" as const, color: colors.foreground },
    cardSub: { fontSize: 13, color: colors.mutedForeground, marginTop: 4 },
    shabbatRow: { flexDirection: "row", alignItems: "center" },
    shabbatLabel: { fontSize: 12, color: colors.mutedForeground, marginBottom: 4 },
    shabbatTime: { fontSize: 20, fontWeight: "700" as const, color: colors.primary },
    shabbatDivider: { width: 1, height: 40, backgroundColor: colors.border, marginHorizontal: 20 },
    zmanimGrid: { flexDirection: "row", flexWrap: "wrap" as const, gap: 0 },
    zmanimItem: { width: "33.33%", paddingVertical: 8, paddingHorizontal: 4 },
    zmanimLabel: { fontSize: 11, color: colors.mutedForeground, marginBottom: 2 },
    zmanimTime: { fontSize: 13, fontWeight: "600" as const, color: colors.foreground },
  });
}
