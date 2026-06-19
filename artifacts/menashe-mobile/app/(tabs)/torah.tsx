import React from "react";
import {
  ScrollView, StyleSheet, Text, TouchableOpacity, View, Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";

const TOOLS = [
  {
    id: "torah-tracker",
    label: "Torah Tracker",
    sub: "Log sessions & track streaks",
    emoji: "📖",
    route: "/torah-tracker",
    color: "#d4a843",
  },
  {
    id: "siddur",
    label: "Library",
    sub: "Siddurim, books & more",
    emoji: "📚",
    route: "/siddur",
    color: "#6382FF",
  },
  {
    id: "daf-yomi",
    label: "Daf Yomi",
    sub: "Today's Talmud page",
    emoji: "🎓",
    route: "/daf-yomi",
    color: "#a78bfa",
  },
  {
    id: "mussar",
    label: "48 Ways",
    sub: "Daily Mussar practice",
    emoji: "🌱",
    route: "/mussar",
    color: "#4ade80",
  },
  {
    id: "yahrzeit-calc",
    label: "Yahrzeit Calc",
    sub: "Hebrew anniversary dates",
    emoji: "🕯",
    route: "/yahrzeit-calc",
    color: "#f472b6",
  },
  {
    id: "prayer-board",
    label: "Prayer Board",
    sub: "Community prayer requests",
    emoji: "🙏",
    route: "/prayer-board",
    color: "#4ade80",
  },
];

export default function TorahTab() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = insets.top > 0 ? insets.top : (Platform.OS === "web" ? 60 : 20);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={{ paddingTop: topPad + 12, paddingHorizontal: 16, marginBottom: 24 }}>
        <Text style={{ fontSize: 28, fontWeight: "700", color: colors.foreground, letterSpacing: -0.5 }}>
          Torah & Tools
        </Text>
        <Text style={{ fontSize: 13, color: colors.mutedForeground, marginTop: 5 }}>
          Study, prayer, and community features
        </Text>
      </View>

      <View style={styles.grid}>
        {TOOLS.map((tool) => (
          <TouchableOpacity
            key={tool.id}
            style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push(tool.route as any)}
            activeOpacity={0.7}
          >
            <View style={[styles.emojiWrap, { backgroundColor: tool.color + "18" }]}>
              <Text style={styles.tileEmoji}>{tool.emoji}</Text>
            </View>
            <Text style={[styles.tileLabel, { color: colors.foreground }]}>{tool.label}</Text>
            <Text style={[styles.tileSub, { color: colors.mutedForeground }]}>{tool.sub}</Text>
            <Feather
              name="arrow-right"
              size={14}
              color={tool.color}
              style={styles.tileArrow}
            />
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border, marginHorizontal: 16 }]}>
        <View style={styles.infoRow}>
          <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
            ✡  All tools work offline. Your study data is saved privately on this device.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    gap: 12,
    marginBottom: 16,
  },
  tile: {
    width: "46%",
    marginHorizontal: "1%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    minHeight: 130,
  },
  emojiWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  tileEmoji: { fontSize: 22 },
  tileLabel: { fontSize: 15, fontWeight: "700", marginBottom: 4 },
  tileSub: { fontSize: 11, lineHeight: 15 },
  tileArrow: { marginTop: 12 },
  infoCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginTop: 4,
    marginBottom: 8,
  },
  infoRow: { flexDirection: "row", alignItems: "flex-start" },
  infoText: { fontSize: 12, lineHeight: 18, flex: 1 },
});
