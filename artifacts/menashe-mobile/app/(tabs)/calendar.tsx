import React, { useMemo, useState } from "react";
import {
  ScrollView, StyleSheet, Text, TouchableOpacity, View, Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { getMonthCalendar, hebrewDayNumeral, type CalendarDay } from "@/lib/hebrewCalendar";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function CalendarScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState<CalendarDay | null>(null);

  const days = useMemo(() => getMonthCalendar(year, month), [year, month]);

  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const leadingBlanks = Array(firstDayOfWeek).fill(null);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
    setSelected(null);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
    setSelected(null);
  }

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
        {/* Month Nav */}
        <View style={[styles.monthNav, { paddingTop: topPad + 16 }]}>
          <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
            <Feather name="chevron-left" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <View style={styles.monthTitleWrap}>
            <Text style={[styles.monthTitle, { color: colors.foreground }]}>{MONTH_NAMES[month]}</Text>
            <Text style={[styles.yearText, { color: colors.mutedForeground }]}>{year}</Text>
          </View>
          <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
            <Feather name="chevron-right" size={22} color={colors.foreground} />
          </TouchableOpacity>
        </View>

        {/* Day labels */}
        <View style={styles.dayLabels}>
          {DAY_LABELS.map((d, i) => (
            <Text key={d} style={[styles.dayLabel, { color: i === 6 ? colors.primary : colors.mutedForeground }]}>{d}</Text>
          ))}
        </View>

        {/* Grid */}
        <View style={styles.grid}>
          {leadingBlanks.map((_, i) => <View key={`blank-${i}`} style={styles.cell} />)}
          {days.map((day) => {
            const isSelected = selected?.date.getTime() === day.date.getTime();
            const hasEvents = day.events.length > 0;
            return (
              <TouchableOpacity
                key={day.gregorianDay}
                style={[
                  styles.cell,
                  day.isShabbat && { backgroundColor: colors.card },
                  day.isToday && { borderColor: colors.primary, borderWidth: 1, borderRadius: colors.radius / 2 },
                  isSelected && { backgroundColor: colors.primary, borderRadius: colors.radius / 2 },
                ]}
                onPress={() => setSelected(isSelected ? null : day)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.dayNum,
                  { color: isSelected ? colors.primaryForeground : day.isShabbat ? colors.primary : colors.foreground },
                  day.roshChodesh && { fontWeight: "700" as const },
                ]}>
                  {day.gregorianDay}
                </Text>
                <Text style={[styles.hebrewNum, { color: isSelected ? colors.primaryForeground : colors.mutedForeground }]}>
                  {hebrewDayNumeral(day.hebrewDay)}
                </Text>
                {hasEvents && (
                  <View style={[styles.eventDot, { backgroundColor: isSelected ? colors.primaryForeground : colors.primary }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selected Day Detail */}
        {selected && (
          <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.detailDate, { color: colors.foreground }]}>
              {selected.date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </Text>
            <Text style={[styles.detailHebrew, { color: colors.primary }]}>
              {hebrewDayNumeral(selected.hebrewDay)} {selected.hebrewMonth} {selected.hebrewYear}
            </Text>
            {selected.events.length === 0 ? (
              <Text style={[styles.detailEvent, { color: colors.mutedForeground }]}>No special events</Text>
            ) : selected.events.map((ev) => (
              <View key={ev} style={styles.eventRow}>
                <View style={[styles.eventBullet, { backgroundColor: colors.primary }]} />
                <Text style={[styles.detailEvent, { color: colors.foreground }]}>{ev}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  monthNav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, marginBottom: 16 },
  navBtn: { padding: 8 },
  monthTitleWrap: { alignItems: "center" },
  monthTitle: { fontSize: 20, fontWeight: "700" as const },
  yearText: { fontSize: 13, marginTop: 2 },
  dayLabels: { flexDirection: "row", paddingHorizontal: 8, marginBottom: 4 },
  dayLabel: { flex: 1, textAlign: "center", fontSize: 12, fontWeight: "600" as const },
  grid: { flexDirection: "row", flexWrap: "wrap" as const, paddingHorizontal: 8 },
  cell: { width: "14.28%", aspectRatio: 0.9, alignItems: "center", justifyContent: "center", paddingVertical: 4 },
  dayNum: { fontSize: 14, fontWeight: "500" as const },
  hebrewNum: { fontSize: 9, marginTop: 1 },
  eventDot: { width: 4, height: 4, borderRadius: 2, marginTop: 2 },
  detailCard: { margin: 16, borderRadius: 12, padding: 16, borderWidth: 1 },
  detailDate: { fontSize: 16, fontWeight: "700" as const, marginBottom: 4 },
  detailHebrew: { fontSize: 14, marginBottom: 12 },
  eventRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  eventBullet: { width: 6, height: 6, borderRadius: 3 },
  detailEvent: { fontSize: 14 },
});
