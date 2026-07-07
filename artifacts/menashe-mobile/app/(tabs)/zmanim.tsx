import React, { useEffect, useMemo, useState } from "react";
import {
  AccessibilityInfo, ImageBackground, ScrollView, StyleSheet,
  Text, TouchableOpacity, View, Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeTokens } from "@/src/mobile/design-system";
import { SectionTitle } from "@/src/mobile/components/display";
import { useApp } from "@/context/AppContext";
import { calculateZmanim, formatTime } from "@/lib/zmanim";
import { getHebrewDate, formatHebrewDate } from "@/lib/hebrewCalendar";

/* ── Hebrew day-number glyph map (days 1–30) ──────────────────────────────── */
const HEBREW_DAY: Record<number, string> = {
   1:"א",  2:"ב",  3:"ג",  4:"ד",  5:"ה",
   6:"ו",  7:"ז",  8:"ח",  9:"ט", 10:"י",
  11:"יא", 12:"יב", 13:"יג", 14:"יד", 15:"טו",
  16:"טז", 17:"יז", 18:"יח", 19:"יט", 20:"כ",
  21:"כא", 22:"כב", 23:"כג", 24:"כד", 25:"כה",
  26:"כו", 27:"כז", 28:"כח", 29:"כט", 30:"ל",
};

const BG_IMAGE = require("../../assets/images/saipikhup-photo.jpg");

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
  const { colors, sp, rd, shadow } = useThemeTokens();
  const insets = useSafeAreaInsets();
  const { location } = useApp();
  const [offset, setOffset] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => {});
    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => sub.remove();
  }, []);

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

  /* ── Hebrew date parts ── */
  const hebrewDateStr = formatHebrewDate(hdate);
  const hdateParts   = hebrewDateStr.split(" ");          // ["22", "Tammuz", "5786"]
  const hebrewDayNum = parseInt(hdateParts[0], 10);
  const hebrewGlyph  = HEBREW_DAY[hebrewDayNum] ?? hdateParts[0];
  const hebrewMonthYear = hdateParts.slice(1).join(" "); // "Tammuz 5786"

  /* ── Gregorian date subtitle ── */
  const weekdayStr = selectedDate.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();
  const gregStr    = selectedDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const dateSubtitle = `${weekdayStr}  ·  ${gregStr}  ·  ${location.name}`;

  const heroTitle = offset === 0
    ? "Today's Zmanim"
    : selectedDate.toLocaleDateString("en-US", { weekday: "long" }) + "'s Zmanim";

  const heroGradient: readonly [string, string, string] = reduceMotion
    ? [colors.card, colors.card, colors.card]
    : ["#1A1208", "#100D04", "#0D0B03"];

  /* Shared card style */
  const card = {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: rd.lg,
    borderWidth: StyleSheet.hairlineWidth,
    ...shadow.level1,
  };

  /* Three key zmanim for the stat row */
  const sunriseTime  = formatTime(zmanim.sunrise  as Date | null, location.tz);
  const middayTime   = formatTime(zmanim.chatzot  as Date | null, location.tz);
  const sunsetTime   = formatTime(zmanim.sunset   as Date | null, location.tz);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Premium Sacred Time Hero ── */}
      <LinearGradient
        colors={heroGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.hero,
          {
            paddingTop: topPad + sp[5],
            paddingHorizontal: sp[5],
            paddingBottom: sp[6],
            borderRadius: rd.xl,
            marginHorizontal: sp[4],
            marginTop: sp[3],
            marginBottom: sp[4],
            borderColor: colors.primary + "28",
            ...shadow.level2,
          },
        ]}
      >
        <View style={styles.overlineRow}>
          <View style={[styles.overlinePip, { backgroundColor: colors.primary }]} />
          <Text style={[styles.overline, { color: colors.primary }]}>SACRED TIME</Text>
          <View style={[styles.overlinePip, { backgroundColor: colors.primary }]} />
        </View>
        <Text style={[styles.heroTitle, { color: "#F5EDD4", marginTop: sp[2] }]}>
          {heroTitle}
        </Text>
        <View style={[styles.metaRow, { marginTop: sp[3] }]}>
          <View style={[styles.metaIcon, { backgroundColor: colors.primary + "18" }]}>
            <Feather name="map-pin" size={12} color={colors.primary} />
          </View>
          <Text style={[styles.metaText, { color: "#C8B878" }]} numberOfLines={1}>
            {location.name}
          </Text>
        </View>
        <View style={[styles.metaRow, { marginTop: sp[1] }]}>
          <View style={[styles.metaIcon, { backgroundColor: colors.primary + "18" }]}>
            <Feather name="star" size={12} color={colors.primary} />
          </View>
          <Text style={[styles.metaText, { color: "#C8B878" }]}>{hebrewDateStr}</Text>
        </View>
        {offset !== 0 && (
          <TouchableOpacity
            onPress={() => setOffset(0)}
            style={[
              styles.todayChip,
              { borderColor: colors.primary + "55", backgroundColor: colors.primary + "18",
                marginTop: sp[4], borderRadius: rd.pill },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Return to today"
          >
            <Feather name="calendar" size={12} color={colors.primary} style={{ marginRight: 5 }} />
            <Text style={[styles.todayChipText, { color: colors.primary }]}>Return to Today</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>

      {/* ── DATE CARD — reference image style ── */}
      <SectionTitle eyebrow="DATE" style={{ marginHorizontal: sp[4], marginTop: sp[4] }} />

      <View style={[{ marginHorizontal: sp[4], marginBottom: sp[4], borderRadius: rd.lg, overflow: "hidden" }, shadow.level1]}>
        <ImageBackground
          source={BG_IMAGE}
          style={styles.dateCard}
          imageStyle={styles.dateCardImage}
          resizeMode="cover"
          accessibilityIgnoresInvertColors
        >
          {/* Dark gradient: top faint → bottom heavy */}
          <LinearGradient
            colors={["rgba(10,8,3,0.45)", "rgba(8,6,2,0.82)", "rgba(5,4,1,0.96)"]}
            locations={[0, 0.55, 1]}
            style={styles.dateCardOverlay}
          >
            {/* ── Top row: badge + nav ── */}
            <View style={styles.dateCardTopRow}>
              <View style={[styles.todayBadge, { backgroundColor: "rgba(30,22,4,0.78)", borderColor: colors.primary + "60" }]}>
                <Text style={[styles.todayBadgeText, { color: colors.primary }]}>
                  {offset === 0 ? "TODAY" : offset < 0 ? `${Math.abs(offset)}D AGO` : `+${offset}D`}
                </Text>
              </View>
              <View style={styles.dateNavRow}>
                <TouchableOpacity
                  onPress={() => setOffset(o => o - 1)}
                  style={[styles.dateNavBtn, { backgroundColor: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.14)" }]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="Previous day"
                >
                  <Feather name="chevron-left" size={14} color="rgba(255,255,255,0.75)" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setOffset(o => o + 1)}
                  style={[styles.dateNavBtn, { backgroundColor: "rgba(255,255,255,0.08)", borderColor: "rgba(255,255,255,0.14)" }]}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityLabel="Next day"
                >
                  <Feather name="chevron-right" size={14} color="rgba(255,255,255,0.75)" />
                </TouchableOpacity>
              </View>
            </View>

            {/* ── Hebrew day glyph ── */}
            <Text style={styles.hebrewGlyph}>{hebrewGlyph}</Text>

            {/* ── Hebrew month + year headline ── */}
            <Text style={styles.hebrewMonthYear}>{hebrewMonthYear}</Text>

            {/* ── Gregorian subtitle ── */}
            <Text style={styles.dateSubtitle} numberOfLines={1}>{dateSubtitle}</Text>

            {/* ── Three stat chips ── */}
            <View style={styles.statRow}>
              {[
                { label: "SUNRISE", time: sunriseTime },
                { label: "MIDDAY",  time: middayTime  },
                { label: "SUNSET",  time: sunsetTime  },
              ].map(({ label, time }) => (
                <View key={label} style={[styles.statChip, { backgroundColor: "rgba(20,15,4,0.72)", borderColor: colors.primary + "40" }]}>
                  <Text style={[styles.statLabel, { color: colors.primary }]}>{label}</Text>
                  <Text style={styles.statTime}>{time}</Text>
                </View>
              ))}
            </View>

          </LinearGradient>
        </ImageBackground>
      </View>

      {/* ── Section: Halachic Hour ── */}
      <SectionTitle eyebrow="HALACHIC HOUR" style={{ marginHorizontal: sp[4] }} />
      <View style={[styles.shaahCard, card, { marginHorizontal: sp[4], marginBottom: sp[4] }]}>
        <View style={[styles.shaahAccent, { backgroundColor: colors.primary }]} />
        <View style={styles.shaahLeft}>
          <View style={[styles.shaahIcon, { backgroundColor: colors.primary + "18", borderRadius: rd.sm }]}>
            <Feather name="clock" size={18} color={colors.primary} />
          </View>
          <View>
            <Text style={[styles.shaahLabel, { color: colors.mutedForeground }]}>Shaah Zmanit (GRA)</Text>
            <Text style={[styles.shaahSub, { color: colors.mutedForeground }]}>Proportional halachic hour</Text>
          </View>
        </View>
        <Text style={[styles.shaahValue, { color: colors.primary }]}>
          {mins}m {secs}s
        </Text>
      </View>

      {/* ── Section: Prayer Times ── */}
      <SectionTitle eyebrow="PRAYER TIMES" style={{ marginHorizontal: sp[4] }} />
      <View style={[styles.listCard, card, { marginHorizontal: sp[4] }]}>
        {visibleZmanim.map((z, i) => {
          const time   = zmanim[z.key as keyof typeof zmanim] as Date | null;
          const isLast = i === visibleZmanim.length - 1;
          const isNow  = (() => {
            if (!time || offset !== 0) return false;
            const now  = new Date();
            const diff = Math.abs(time.getTime() - now.getTime());
            return diff < 30 * 60 * 1000;
          })();
          return (
            <View
              key={z.key}
              style={[
                styles.zmRow,
                !isLast && { borderBottomColor: colors.border, borderBottomWidth: StyleSheet.hairlineWidth },
                isNow && { backgroundColor: colors.primary + "0C" },
              ]}
            >
              {isNow && <View style={[styles.zmNowAccent, { backgroundColor: colors.primary }]} />}
              <View style={[styles.zmIcon, { backgroundColor: isNow ? colors.primary + "18" : colors.background, borderRadius: rd.sm }]}>
                <Feather name={z.icon} size={15} color={isNow ? colors.primary : colors.mutedForeground} />
              </View>
              <View style={styles.zmText}>
                <Text style={[styles.zmLabel, { color: isNow ? colors.primary : colors.foreground }]}>{z.label}</Text>
                <Text style={[styles.zmSub,   { color: colors.mutedForeground }]}>{z.sub}</Text>
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
  /* ── Hero ───────────────────────────────────────────────────── */
  hero: { borderWidth: 1, overflow: "hidden" },
  overlineRow: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "flex-start" },
  overlinePip:  { width: 18, height: 1.5, borderRadius: 2, opacity: 0.75 },
  overline:     { fontSize: 10, fontWeight: "700" as const, letterSpacing: 2.8, textTransform: "uppercase", opacity: 0.90 },
  heroTitle:    { fontSize: 30, fontWeight: "700" as const, letterSpacing: -0.6, lineHeight: 36 },
  metaRow:  { flexDirection: "row", alignItems: "center", gap: 8 },
  metaIcon: { width: 22, height: 22, borderRadius: 7, alignItems: "center", justifyContent: "center" },
  metaText: { fontSize: 13, fontWeight: "500" as const, letterSpacing: 0.1, flexShrink: 1 },
  todayChip:     { flexDirection: "row", alignItems: "center", alignSelf: "flex-start", borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6 },
  todayChipText: { fontSize: 12, fontWeight: "600" as const, letterSpacing: 0.2 },

  /* ── Date card (reference-image style) ─────────────────────── */
  dateCard: { width: "100%" },
  dateCardImage: { borderRadius: 16 },
  dateCardOverlay: {
    paddingTop: 16,
    paddingHorizontal: 18,
    paddingBottom: 18,
    borderRadius: 16,
  },

  /* top row */
  dateCardTopRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  todayBadge: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 11, paddingVertical: 4 },
  todayBadgeText: { fontSize: 10, fontWeight: "700" as const, letterSpacing: 1.8 },
  dateNavRow: { flexDirection: "row", gap: 6 },
  dateNavBtn: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, alignItems: "center", justifyContent: "center" },

  /* hebrew glyph */
  hebrewGlyph: {
    fontSize: 58,
    fontWeight: "700" as const,
    color: "#F0E6C0",
    lineHeight: 64,
    letterSpacing: -1,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },

  /* hebrew month + year */
  hebrewMonthYear: {
    fontSize: 26,
    fontWeight: "700" as const,
    color: "#FFFFFF",
    letterSpacing: -0.4,
    marginTop: 4,
    marginBottom: 6,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  /* gregorian subtitle */
  dateSubtitle: {
    fontSize: 11,
    fontWeight: "500" as const,
    color: "rgba(220,200,160,0.80)",
    letterSpacing: 0.3,
    marginBottom: 18,
  },

  /* stat chips row */
  statRow: { flexDirection: "row", gap: 8 },
  statChip: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 9,
    paddingHorizontal: 6,
    alignItems: "center",
    gap: 3,
  },
  statLabel: {
    fontSize: 8.5,
    fontWeight: "700" as const,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  statTime: {
    fontSize: 13,
    fontWeight: "700" as const,
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },

  /* ── Shaah Zmanit card ──────────────────────────────────────── */
  shaahCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, overflow: "hidden" },
  shaahAccent: { position: "absolute", left: 0, top: 0, bottom: 0, width: 3, borderTopLeftRadius: 16, borderBottomLeftRadius: 16 },
  shaahLeft:  { flexDirection: "row", alignItems: "center", gap: 12, paddingLeft: 6 },
  shaahIcon:  { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
  shaahLabel: { fontSize: 13, fontWeight: "600" as const, letterSpacing: -0.1 },
  shaahSub:   { fontSize: 11, fontWeight: "400" as const, marginTop: 2, letterSpacing: 0.1, opacity: 0.75 },
  shaahValue: { fontSize: 18, fontWeight: "700" as const, letterSpacing: -0.3 },

  /* ── Zmanim list card ───────────────────────────────────────── */
  listCard: { overflow: "hidden" },
  zmRow:       { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 15, position: "relative" },
  zmNowAccent: { position: "absolute", left: 0, top: 0, bottom: 0, width: 3 },
  zmIcon:      { width: 36, height: 36, alignItems: "center", justifyContent: "center", marginRight: 13 },
  zmText:      { flex: 1 },
  zmLabel:     { fontSize: 14, fontWeight: "600" as const, letterSpacing: -0.1 },
  zmSub:       { fontSize: 11, marginTop: 2, letterSpacing: 0.1, opacity: 0.85 },
  zmTime:      { fontSize: 15, fontWeight: "700" as const, letterSpacing: -0.3 },
});
