import React, { useMemo, useState } from "react";
import {
  ScrollView, StyleSheet, Text, TouchableOpacity, View, Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";
import { getMonthCalendar, hebrewDayNumeral, type CalendarDay } from "@/lib/hebrewCalendar";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

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

  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth();

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
  function goToday() {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setSelected(null);
  }

  const topPad = insets.top > 0 ? insets.top : (Platform.OS === "web" ? 60 : 20);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: topPad + 12 }]}>
          <View style={styles.monthTitleWrap}>
            <Text style={[styles.monthTitle, { color: colors.foreground }]}>{MONTH_NAMES[month]}</Text>
            <Text style={[styles.yearText, { color: colors.mutedForeground }]}>{year}</Text>
          </View>
          <View style={styles.headerRight}>
            {!isCurrentMonth && (
              <TouchableOpacity
                onPress={goToday}
                style={[styles.todayBtn, { borderColor: colors.primary, backgroundColor: colors.primary + "15" }]}
              >
                <Text style={[styles.todayBtnText, { color: colors.primary }]}>Today</Text>
              </TouchableOpacity>
            )}
            <View style={styles.navBtns}>
              <TouchableOpacity onPress={prevMonth} style={styles.navBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="chevron-left" size={22} color={colors.foreground} />
              </TouchableOpacity>
              <TouchableOpacity onPress={nextMonth} style={styles.navBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Feather name="chevron-right" size={22} color={colors.foreground} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Day labels */}
        <View style={styles.dayLabels}>
          {DAY_LABELS.map((d, i) => (
            <Text
              key={d}
              style={[
                styles.dayLabel,
                { color: i === 6 ? colors.primary : colors.mutedForeground },
              ]}
            >
              {d}
            </Text>
          ))}
        </View>

        {/* Separator */}
        <View style={[styles.separator, { backgroundColor: colors.border }]} />

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
                  day.isShabbat && !isSelected && { backgroundColor: colors.card },
                  day.isToday && !isSelected && {
                    borderColor: colors.primary,
                    borderWidth: 1.5,
                    borderRadius: 10,
                  },
                  isSelected && {
                    backgroundColor: colors.primary,
                    borderRadius: 10,
                  },
                ]}
                onPress={() => setSelected(isSelected ? null : day)}
                activeOpacity={0.65}
              >
                <Text style={[
                  styles.dayNum,
                  {
                    color: isSelected
                      ? colors.primaryForeground
                      : day.isToday
                      ? colors.primary
                      : day.isShabbat
                      ? colors.primary
                      : colors.foreground,
                  },
                  day.isToday && !isSelected && { fontWeight: "700" as const },
                  day.roshChodesh && { fontWeight: "700" as const },
                ]}>
                  {day.gregorianDay}
                </Text>
                <Text style={[
                  styles.hebrewNum,
                  { color: isSelected ? colors.primaryForeground + "cc" : colors.mutedForeground },
                ]}>
                  {hebrewDayNumeral(day.hebrewDay)}
                </Text>
                {hasEvents && (
                  <View style={[
                    styles.eventDot,
                    { backgroundColor: isSelected ? colors.primaryForeground : colors.primary },
                  ]} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Selected Day Detail */}
        {selected && (
          <View style={[styles.detailCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.detailHeader}>
              <View>
                <Text style={[styles.detailDate, { color: colors.foreground }]}>
                  {selected.date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                </Text>
                <Text style={[styles.detailHebrew, { color: colors.primary }]}>
                  {hebrewDayNumeral(selected.hebrewDay)} {selected.hebrewMonth} {selected.hebrewYear}
                </Text>
              </View>
              {selected.isShabbat && (
                <View style={[styles.shabbatBadge, { backgroundColor: colors.primary + "20", borderColor: colors.primary + "44" }]}>
                  <Text style={[styles.shabbatBadgeText, { color: colors.primary }]}>Shabbat</Text>
                </View>
              )}
            </View>
            {selected.roshChodesh && (
              <View style={[styles.eventRow, { marginBottom: 8 }]}>
                <View style={[styles.eventBullet, { backgroundColor: colors.primary }]} />
                <Text style={[styles.detailEvent, { color: colors.foreground, fontWeight: "600" as const }]}>Rosh Chodesh</Text>
              </View>
            )}
            {selected.events.length === 0 && !selected.roshChodesh ? (
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
  header: {
    flexDirection: "row", alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 16, marginBottom: 16,
  },
  monthTitleWrap: {},
  monthTitle: { fontSize: 28, fontWeight: "700" as const, letterSpacing: -0.5 },
  yearText: { fontSize: 13, marginTop: 2, fontWeight: "500" as const },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 10, paddingBottom: 4 },
  todayBtn: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 5 },
  todayBtnText: { fontSize: 12, fontWeight: "600" as const },
  navBtns: { flexDirection: "row", gap: 2 },
  navBtn: { padding: 6 },
  dayLabels: { flexDirection: "row", paddingHorizontal: 8, marginBottom: 6 },
  dayLabel: { flex: 1, textAlign: "center", fontSize: 11, fontWeight: "600" as const, letterSpacing: 0.5 },
  separator: { height: StyleSheet.hairlineWidth, marginHorizontal: 8, marginBottom: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap" as const, paddingHorizontal: 8 },
  cell: { width: "14.28%", aspectRatio: 0.88, alignItems: "center", justifyContent: "center", paddingVertical: 4 },
  dayNum: { fontSize: 14, fontWeight: "500" as const },
  hebrewNum: { fontSize: 8, marginTop: 1 },
  eventDot: { width: 4, height: 4, borderRadius: 2, marginTop: 2 },
  detailCard: { margin: 16, borderRadius: 14, padding: 16, borderWidth: 1 },
  detailHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 },
  detailDate: { fontSize: 16, fontWeight: "700" as const, marginBottom: 3 },
  detailHebrew: { fontSize: 13, fontWeight: "500" as const },
  shabbatBadge: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4 },
  shabbatBadgeText: { fontSize: 11, fontWeight: "600" as const },
  eventRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  eventBullet: { width: 6, height: 6, borderRadius: 3 },
  detailEvent: { fontSize: 14 },
});
