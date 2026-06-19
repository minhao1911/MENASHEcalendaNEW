import React, { useMemo, useState, useEffect, useRef } from "react";
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
import { router } from "expo-router";
import { calculateZmanim, formatTime } from "@/lib/zmanim";
import {
  getHebrewDate,
  formatHebrewDate,
  getCurrentParasha,
  getUpcomingHolidays,
} from "@/lib/hebrewCalendar";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";

const QUICK_TOOLS = [
  { id: "torah-tracker", label: "Torah Tracker",  emoji: "📖", color: "#d4a843", route: "/torah-tracker" },
  { id: "daf-yomi",     label: "Daf Yomi",        emoji: "🎓", color: "#a78bfa", route: "/daf-yomi" },
  { id: "mussar",       label: "48 Ways",          emoji: "🌱", color: "#4ade80", route: "/mussar" },
  { id: "siddur",       label: "Library",          emoji: "📚", color: "#6382FF", route: "/siddur" },
  { id: "yahrzeit",     label: "Yahrzeit Calc",    emoji: "🕯", color: "#f472b6", route: "/yahrzeit-calc" },
  { id: "prayer-board", label: "Prayer Board",     emoji: "🙏", color: "#34d399", route: "/prayer-board" },
];

function getNextWeekday(targetDay: number): Date {
  const d = new Date();
  let diff = (targetDay - d.getDay() + 7) % 7;
  if (diff === 0) diff = 7;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "Now";
  const totalSecs = Math.floor(ms / 1000);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const s = totalSecs % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
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

  const friday = isFriday ? today : getNextWeekday(5);
  const saturday = new Date(friday.getTime() + 86400000);
  saturday.setHours(0, 0, 0, 0);

  const fridayZm = useMemo(
    () => calculateZmanim(friday, location.lat, location.lng, location.candleLightingMinutes),
    [location, friday.toDateString()],
  );
  const satZm = useMemo(
    () => calculateZmanim(saturday, location.lat, location.lng),
    [location, saturday.toDateString()],
  );

  const gregDate = today.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  const topPad = insets.top > 0 ? insets.top : (Platform.OS === "web" ? 60 : 20);

  // Live countdown
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const candleLightingMs = fridayZm.candleLighting ? fridayZm.candleLighting.getTime() - now : null;
  const havdalahMs = satZm.havdalah ? satZm.havdalah.getTime() - now : null;

  let countdownMode: "candle" | "shabbat" | "havdalah" | "upcoming" = "upcoming";
  let countdownMs = 0;
  let countdownLabel = "";

  if (isShabbat && havdalahMs && havdalahMs > 0) {
    countdownMode = "havdalah";
    countdownMs = havdalahMs;
    countdownLabel = "Until Havdalah";
  } else if (isFriday && candleLightingMs && candleLightingMs > 0) {
    countdownMode = "candle";
    countdownMs = candleLightingMs;
    countdownLabel = "Until Candle Lighting";
  } else if (candleLightingMs && candleLightingMs > 0) {
    countdownMode = "upcoming";
    countdownMs = candleLightingMs;
    countdownLabel = isFriday ? "Until Candle Lighting" : "Until Next Shabbat";
  }

  const styles = makeStyles(colors, topPad, insets.bottom);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerBrand}>
          <View style={styles.headerStar}>
            <Text style={styles.headerStarText}>✡</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>BNEI MENASHE</Text>
            <Text style={styles.headerSub}>Sacred Calendar</Text>
          </View>
        </View>
        <View style={styles.locationBadge}>
          <Feather name="map-pin" size={11} color={colors.mutedForeground} />
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
              <View style={styles.miniIcon}>
                <Feather name="sunrise" size={15} color={colors.primary} />
              </View>
              <Text style={styles.miniLabel}>Sunrise</Text>
              <Text style={styles.miniValue}>{formatTime(todayZm.sunrise, location.tz)}</Text>
            </View>
          )}
          {todayZm.sunset && (
            <View style={styles.miniStat}>
              <View style={styles.miniIcon}>
                <Feather name="sunset" size={15} color={colors.primary} />
              </View>
              <Text style={styles.miniLabel}>Sunset</Text>
              <Text style={styles.miniValue}>{formatTime(todayZm.sunset, location.tz)}</Text>
            </View>
          )}
          {todayZm.tzais && (
            <View style={styles.miniStat}>
              <View style={styles.miniIcon}>
                <Feather name="moon" size={15} color={colors.primary} />
              </View>
              <Text style={styles.miniLabel}>Nightfall</Text>
              <Text style={styles.miniValue}>{formatTime(todayZm.tzais, location.tz)}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Candle Lighting Countdown */}
      {countdownMs > 0 && (
        <View style={[
          styles.countdownCard,
          {
            borderColor: countdownMode === "havdalah"
              ? "#a78bfa44"
              : countdownMode === "candle"
              ? colors.primary + "55"
              : colors.border,
            backgroundColor: countdownMode === "havdalah"
              ? "#a78bfa10"
              : countdownMode === "candle"
              ? colors.primary + "08"
              : colors.card,
          },
        ]}>
          <View style={styles.countdownHeader}>
            <Text style={styles.countdownEmoji}>
              {countdownMode === "havdalah" ? "✨" : "🕯"}
            </Text>
            <Text style={[
              styles.countdownLabel,
              { color: countdownMode === "havdalah" ? "#a78bfa" : colors.primary },
            ]}>
              {countdownLabel}
            </Text>
          </View>
          <Text style={[
            styles.countdownValue,
            { color: countdownMode === "havdalah" ? "#a78bfa" : colors.foreground },
          ]}>
            {formatCountdown(countdownMs)}
          </Text>
          {countdownMode === "candle" && fridayZm.candleLighting && (
            <Text style={[styles.countdownSub, { color: colors.mutedForeground }]}>
              Candle lighting at {formatTime(fridayZm.candleLighting, location.tz)}
            </Text>
          )}
          {countdownMode === "havdalah" && satZm.havdalah && (
            <Text style={[styles.countdownSub, { color: colors.mutedForeground }]}>
              Shabbat ends at {formatTime(satZm.havdalah, location.tz)}
            </Text>
          )}
        </View>
      )}

      {/* Shabbat Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Feather name="star" size={15} color={colors.primary} />
          <Text style={styles.cardLabel}>
            {isFriday || isShabbat ? "Today's Shabbat" : "Upcoming Shabbat"}
          </Text>
        </View>
        <View style={styles.shabbatRow}>
          <View style={styles.shabbatItem}>
            <Text style={styles.shabbatLabel}>🕯 Candle Lighting</Text>
            <Text style={styles.shabbatTime}>{formatTime(fridayZm.candleLighting, location.tz)}</Text>
          </View>
          <View style={styles.shabbatDivider} />
          <View style={styles.shabbatItem}>
            <Text style={styles.shabbatLabel}>✨ Havdalah</Text>
            <Text style={styles.shabbatTime}>{formatTime(satZm.havdalah, location.tz)}</Text>
          </View>
        </View>
      </View>

      {/* Quick Tools */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Feather name="grid" size={15} color={colors.primary} />
          <Text style={styles.cardLabel}>Quick Tools</Text>
        </View>
        <View style={styles.toolsGrid}>
          {QUICK_TOOLS.map(tool => (
            <TouchableOpacity
              key={tool.id}
              style={[styles.toolTile, { backgroundColor: tool.color + "12", borderColor: tool.color + "30" }]}
              onPress={() => router.push(tool.route as any)}
              activeOpacity={0.7}
            >
              <Text style={styles.toolEmoji}>{tool.emoji}</Text>
              <Text style={[styles.toolLabel, { color: colors.foreground }]}>{tool.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Parasha Card */}
      {parasha !== "" && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Feather name="book-open" size={15} color={colors.primary} />
            <Text style={styles.cardLabel}>Weekly Parasha</Text>
          </View>
          <Text style={styles.cardValue}>Parashat {parasha}</Text>
        </View>
      )}

      {/* Upcoming Holiday */}
      {nextHoliday && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Feather name="calendar" size={15} color={colors.primary} />
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
      <View style={[styles.card, { marginBottom: 8 }]}>
        <View style={styles.cardHeader}>
          <Feather name="clock" size={15} color={colors.primary} />
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

function makeStyles(colors: Record<string, any>, topPad: number, bottomPad: number) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { paddingTop: topPad + 12, paddingBottom: bottomPad + 100, paddingHorizontal: 16 },

    header: {
      flexDirection: "row", alignItems: "center",
      justifyContent: "space-between", marginBottom: 20,
    },
    headerBrand: { flexDirection: "row", alignItems: "center", gap: 10 },
    headerStar: {
      width: 34, height: 34, borderRadius: 17,
      backgroundColor: colors.primary + "22",
      alignItems: "center", justifyContent: "center",
      borderWidth: 1, borderColor: colors.primary + "44",
    },
    headerStarText: { fontSize: 16, color: colors.primary },
    headerTitle: { fontSize: 14, fontWeight: "700" as const, color: colors.primary, letterSpacing: 1.5 },
    headerSub: { fontSize: 10, color: colors.mutedForeground, letterSpacing: 0.5, marginTop: 1 },
    locationBadge: {
      flexDirection: "row", alignItems: "center", gap: 4,
      backgroundColor: colors.card, borderRadius: 20,
      paddingHorizontal: 10, paddingVertical: 5,
      borderWidth: 1, borderColor: colors.border,
    },
    locationText: { fontSize: 11, color: colors.mutedForeground, fontWeight: "500" as const },

    dateCard: {
      backgroundColor: colors.card, borderRadius: 16,
      padding: 20, marginBottom: 12,
      borderWidth: 1, borderColor: colors.border,
    },
    gregorianDate: { fontSize: 12, color: colors.mutedForeground, marginBottom: 4, fontWeight: "500" as const },
    hebrewDate: { fontSize: 28, fontWeight: "700" as const, color: colors.foreground, marginBottom: 18, letterSpacing: 0.5 },
    divider: { height: 1, backgroundColor: colors.border, marginBottom: 18 },
    dateRow: { flexDirection: "row", justifyContent: "space-around" },
    miniStat: { alignItems: "center", gap: 6 },
    miniIcon: {
      width: 32, height: 32, borderRadius: 16,
      backgroundColor: colors.primary + "15",
      alignItems: "center", justifyContent: "center",
    },
    miniLabel: { fontSize: 10, color: colors.mutedForeground, fontWeight: "500" as const },
    miniValue: { fontSize: 13, fontWeight: "700" as const, color: colors.foreground },

    countdownCard: {
      borderRadius: 16, borderWidth: 1, padding: 20, marginBottom: 12, alignItems: "center",
    },
    countdownHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
    countdownEmoji: { fontSize: 20 },
    countdownLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase" as const },
    countdownValue: { fontSize: 44, fontWeight: "700" as const, letterSpacing: -1.5, marginBottom: 4 },
    countdownSub: { fontSize: 12, fontWeight: "500" as const },

    card: {
      backgroundColor: colors.card, borderRadius: 16,
      padding: 16, marginBottom: 12,
      borderWidth: 1, borderColor: colors.border,
    },
    cardHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
    cardLabel: {
      fontSize: 11, color: colors.mutedForeground,
      textTransform: "uppercase" as const, letterSpacing: 1.2, fontWeight: "600" as const,
    },
    cardValue: { fontSize: 18, fontWeight: "700" as const, color: colors.foreground },
    cardSub: { fontSize: 13, color: colors.mutedForeground, marginTop: 4 },

    shabbatRow: { flexDirection: "row", alignItems: "center" },
    shabbatItem: { flex: 1, alignItems: "center" },
    shabbatLabel: { fontSize: 12, color: colors.mutedForeground, marginBottom: 6, fontWeight: "500" as const },
    shabbatTime: { fontSize: 22, fontWeight: "700" as const, color: colors.primary },
    shabbatDivider: { width: 1, height: 44, backgroundColor: colors.border, marginHorizontal: 16 },

    toolsGrid: { flexDirection: "row", flexWrap: "wrap" as const, gap: 8 },
    toolTile: {
      width: "30.5%", borderRadius: 12, borderWidth: 1,
      padding: 12, alignItems: "center", gap: 6,
    },
    toolEmoji: { fontSize: 22 },
    toolLabel: { fontSize: 10, fontWeight: "700" as const, textAlign: "center" as const },

    zmanimGrid: { flexDirection: "row", flexWrap: "wrap" as const },
    zmanimItem: {
      width: "33.33%", paddingVertical: 10, paddingHorizontal: 4,
      borderBottomWidth: 1, borderBottomColor: colors.border + "66",
    },
    zmanimLabel: { fontSize: 10, color: colors.mutedForeground, marginBottom: 3, fontWeight: "500" as const },
    zmanimTime: { fontSize: 13, fontWeight: "700" as const, color: colors.foreground },
  });
}
