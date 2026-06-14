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
  { key: "alotHaShachar",   label: "Alot HaShachar",  sub: "Dawn",                   icon: "sun" as const },
  { key: "sunrise",          label: "Sunrise",          sub: "Hanetz HaChama",         icon: "sunrise" as const },
  { key: "latestShema",      label: "Latest Shema",     sub: "Sof Zman Kriat Shema",   icon: "book" as const },
  { key: "latestShacharit",  label: "Latest Shacharit", sub: "Sof Zman Tefillah",      icon: "feather" as const },
  { key: "chatzot",          label: "Chatzot",          sub: "Halachic Noon",          icon: "clock" as const },
  { key: "minchaGedolah",    label: "Mincha Gedolah",   sub: "Earliest Mincha",        icon: "sun" as const },
  { key: "minchaKetana",     label: "Mincha Ketana",    sub: "Ideal Mincha",           icon: "sun" as const },
  { key: "plagHamincha",     label: "Plag HaMincha",    sub: "1.25 hours before nightfall", icon: "sunset" as const },
  { key: "sunset",           label: "Sunset",           sub: "Shkiah",                 icon: "sunset" as const },
  { key: "tzais",            label: "Tzais HaKochavim", sub: "Nightfall (42 min)",     icon: "moon" as const },
  { key: "candleLighting",   label: "Candle Lighting",  sub: "Erev Shabbat",           icon: "star" as const },
  { key: "havdalah",         label: "Havdalah",         sub: "End of Shabbat",         icon: "star" as const },
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

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 16 }]}>
        <View style={styles.locationRow}>
          <Feather name="map-pin" size={14} color={colors.primary} />
          <Text style={[styles.locationName, { color: colors.foreground }]}>{location.name}</Text>
        </View>
      </View>

      {/* Date Picker */}
      <View style={[styles.datePicker, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity onPress={() => setOffset(o => o - 1)} style={styles.dateArrow}>
          <Feather name="chevron-left" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.dateCenter}>
          <Text style={[styles.dateFull, { color: colors.foreground }]}>
            {offset === 0 ? "Today — " : ""}
            {selectedDate.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
          </Text>
          <Text style={[styles.dateHebrew, { color: colors.primary }]}>{formatHebrewDate(hdate)}</Text>
        </View>
        <TouchableOpacity onPress={() => setOffset(o => o + 1)} style={styles.dateArrow}>
          <Feather name="chevron-right" size={22} color={colors.foreground} />
        </TouchableOpacity>
      </View>

      {/* Shaah Zmanit */}
      <View style={[styles.shaahCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.shaahLabel, { color: colors.mutedForeground }]}>Halachic Hour (Shaah Zmanit)</Text>
        <Text style={[styles.shaahValue, { color: colors.primary }]}>
          {Math.floor(zmanim.shaahZmanitMinutes)} min {Math.round((zmanim.shaahZmanitMinutes % 1) * 60)} sec
        </Text>
      </View>

      {/* Zmanim List */}
      <View style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {visibleZmanim.map((z, i) => {
          const time = zmanim[z.key as keyof typeof zmanim] as Date | null;
          const isLast = i === visibleZmanim.length - 1;
          return (
            <View key={z.key} style={[styles.zmRow, !isLast && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
              <View style={[styles.zmIcon, { backgroundColor: colors.background }]}>
                <Feather name={z.icon} size={15} color={colors.primary} />
              </View>
              <View style={styles.zmText}>
                <Text style={[styles.zmLabel, { color: colors.foreground }]}>{z.label}</Text>
                <Text style={[styles.zmSub, { color: colors.mutedForeground }]}>{z.sub}</Text>
              </View>
              <Text style={[styles.zmTime, { color: time ? colors.foreground : colors.mutedForeground }]}>
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
  header: { paddingHorizontal: 16, marginBottom: 12 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  locationName: { fontSize: 16, fontWeight: "700" as const },
  datePicker: { flexDirection: "row", alignItems: "center", marginHorizontal: 16, marginBottom: 12, borderRadius: 12, borderWidth: 1, padding: 12 },
  dateArrow: { padding: 4 },
  dateCenter: { flex: 1, alignItems: "center" },
  dateFull: { fontSize: 15, fontWeight: "600" as const },
  dateHebrew: { fontSize: 13, marginTop: 2 },
  shaahCard: { marginHorizontal: 16, marginBottom: 12, borderRadius: 12, borderWidth: 1, padding: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  shaahLabel: { fontSize: 12 },
  shaahValue: { fontSize: 15, fontWeight: "700" as const },
  listCard: { marginHorizontal: 16, borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  zmRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 13 },
  zmIcon: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center", marginRight: 12 },
  zmText: { flex: 1 },
  zmLabel: { fontSize: 14, fontWeight: "600" as const },
  zmSub: { fontSize: 11, marginTop: 1 },
  zmTime: { fontSize: 14, fontWeight: "700" as const },
});
