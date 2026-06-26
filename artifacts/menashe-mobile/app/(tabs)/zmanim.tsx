import React, { useMemo, useState } from "react";
import {
  ScrollView, StyleSheet, Text, TouchableOpacity, View, Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";
import { calculateZmanim, formatTime } from "@/lib/zmanim";
import { getHebrewDate, formatHebrewDate } from "@/lib/hebrewCalendar";

const ZMANIM_LIST = [
  { key: "alotHaShachar",   label: "Alot HaShachar",   sub: "Dawn",                         icon: "sun" as const },
  { key: "sunrise",          label: "Sunrise",           sub: "Hanetz HaChama",               icon: "sunrise" as const },
  { key: "latestShema",      label: "Latest Shema",      sub: "Sof Zman Kriat Shema",         icon: "book" as const },
  { key: "latestShacharit",  label: "Latest Shacharit",  sub: "Sof Zman Tefillah",            icon: "feather" as const },
  { key: "chatzot",          label: "Chatzot",           sub: "Halachic Noon",                icon: "clock" as const },
  { key: "minchaGedolah",   label: "Mincha Gedolah",    sub: "Earliest Mincha",              icon: "sun" as const },
  { key: "minchaKetana",    label: "Mincha Ketana",     sub: "Ideal Mincha",                 icon: "sun" as const },
  { key: "plagHamincha",    label: "Plag HaMincha",     sub: "1.25 hours before nightfall",  icon: "sunset" as const },
  { key: "sunset",           label: "Sunset",            sub: "Shkiah",                       icon: "sunset" as const },
  { key: "tzais",            label: "Tzais HaKochavim", sub: "Nightfall (42 min)",           icon: "moon" as const },
  { key: "candleLighting",  label: "Candle Lighting",   sub: "Erev Shabbat",                 icon: "star" as const },
  { key: "havdalah",         label: "Havdalah",          sub: "End of Shabbat",               icon: "star" as const },
];

export default function ZmanimScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { location } = useApp();
  const [offset, setOffset] = useState(0);

  const selectedDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [offset]);

  const zmanim = useMemo(
    () => calculateZmanim(selectedDate, location.lat, location.lng, location.candleLightingMinutes),
    [selectedDate, location],
  );

  const hdate = useMemo(() => getHebrewDate(selectedDate), [selectedDate]);
  const isFriday = selectedDate.getDay() === 5;
  const isShabbat = selectedDate.getDay() === 6;

  const visibleZmanim = ZMANIM_LIST.filter((z) => {
    if (z.key === "candleLighting") return isFriday;
    if (z.key === "havdalah") return isShabbat;
    return true;
  });

  const topPad = insets.top > 0 ? insets.top : (Platform.OS === "web" ? 60 : 20);
  const mins = Math.floor(zmanim.shaahZmanitGra);
  const secs = Math.round((zmanim.shaahZmanitGra % 1) * 60);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12 }]}>
        <View>
          <Text style={[styles.screenTitle, { color: colors.foreground }]}>Zmanim</Text>
          <View style={styles.locationRow}>
            <Feather name="map-pin" size={11} color={colors.mutedForeground} />
            <Text style={[styles.locationName, { color: colors.mutedForeground }]}>{location.name}</Text>
          </View>
        </View>
        {offset !== 0 && (
          <TouchableOpacity
            onPress={() => setOffset(0)}
            style={[styles.todayBtn, { borderColor: colors.primary, backgroundColor: colors.primary + "15" }]}
          >
            <Text style={[styles.todayBtnText, { color: colors.primary }]}>Today</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Date Picker */}
      <View style={[styles.datePicker, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity onPress={() => setOffset(o => o - 1)} style={styles.dateArrow} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="chevron-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.dateCenter}>
          <Text style={[styles.dateFull, { color: colors.foreground }]}>
            {offset === 0 ? "Today — " : ""}
            {selectedDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
          </Text>
          <Text style={[styles.dateHebrew, { color: colors.primary }]}>{formatHebrewDate(hdate)}</Text>
        </View>
        <TouchableOpacity onPress={() => setOffset(o => o + 1)} style={styles.dateArrow} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="chevron-right" size={22} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      {/* Shaah Zmanit */}
      <View style={[styles.shaahCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.shaahLeft}>
          <View style={[styles.shaahIcon, { backgroundColor: colors.primary + "15" }]}>
            <Feather name="clock" size={16} color={colors.primary} />
          </View>
          <Text style={[styles.shaahLabel, { color: colors.mutedForeground }]}>Halachic Hour (Shaah Zmanit)</Text>
        </View>
        <Text style={[styles.shaahValue, { color: colors.primary }]}>
          {mins}m {secs}s
        </Text>
      </View>

      {/* Zmanim List */}
      <View style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {visibleZmanim.map((z, i) => {
          const time = zmanim[z.key as keyof typeof zmanim] as Date | null;
          const isLast = i === visibleZmanim.length - 1;
          const isNow = (() => {
            if (!time || offset !== 0) return false;
            const now = new Date();
            const diff = Math.abs(time.getTime() - now.getTime());
            return diff < 30 * 60 * 1000;
          })();
          return (
            <View
              key={z.key}
              style={[
                styles.zmRow,
                !isLast && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
                isNow && { backgroundColor: colors.primary + "08" },
              ]}
            >
              <View style={[styles.zmIcon, { backgroundColor: colors.background }]}>
                <Feather name={z.icon} size={14} color={isNow ? colors.primary : colors.mutedForeground} />
              </View>
              <View style={styles.zmText}>
                <Text style={[styles.zmLabel, { color: isNow ? colors.primary : colors.foreground }]}>{z.label}</Text>
                <Text style={[styles.zmSub, { color: colors.mutedForeground }]}>{z.sub}</Text>
              </View>
              <Text style={[styles.zmTime, { color: time ? (isNow ? colors.primary : colors.foreground) : colors.mutedForeground }]}>
                {formatTime(time, location.tz)}
              </Text>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16, marginBottom: 14,
    flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between",
  },
  screenTitle: { fontSize: 28, fontWeight: "700" as const, letterSpacing: -0.5, marginBottom: 4 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  locationName: { fontSize: 12, fontWeight: "500" as const },
  todayBtn: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 6 },
  todayBtnText: { fontSize: 13, fontWeight: "600" as const },
  datePicker: {
    flexDirection: "row", alignItems: "center",
    marginHorizontal: 16, marginBottom: 12,
    borderRadius: 14, borderWidth: 1, padding: 14,
  },
  dateArrow: { padding: 4 },
  dateCenter: { flex: 1, alignItems: "center" },
  dateFull: { fontSize: 15, fontWeight: "600" as const },
  dateHebrew: { fontSize: 13, marginTop: 3, fontWeight: "500" as const },
  shaahCard: {
    marginHorizontal: 16, marginBottom: 12,
    borderRadius: 14, borderWidth: 1, padding: 14,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  shaahLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  shaahIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  shaahLabel: { fontSize: 12, fontWeight: "500" as const },
  shaahValue: { fontSize: 16, fontWeight: "700" as const },
  listCard: { marginHorizontal: 16, borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  zmRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14 },
  zmIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center", marginRight: 14 },
  zmText: { flex: 1 },
  zmLabel: { fontSize: 14, fontWeight: "600" as const },
  zmSub: { fontSize: 11, marginTop: 2 },
  zmTime: { fontSize: 14, fontWeight: "700" as const },
});
