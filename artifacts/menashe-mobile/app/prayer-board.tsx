import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, Platform, Switch, Modal,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import { storageGet, storageSet } from "@/lib/storageUtils";

const STORAGE_KEY = "menashe-prayer-board-v1";
const AMENS_KEY = "menashe-prayer-amens-v1";

interface PrayerRequest {
  id: string;
  name: string;
  isAnonymous: boolean;
  text: string;
  category: string;
  submittedAt: string;
  amens: number;
}

const CATEGORIES = ["Healing", "Blessing", "Aliyah", "Family", "Livelihood", "Community", "Gratitude", "Protection", "Other"];

const CAT_META: Record<string, { color: string; emoji: string }> = {
  Healing:     { color: "#4ade80", emoji: "💚" },
  Blessing:    { color: "#d4a843", emoji: "✨" },
  Aliyah:      { color: "#4ade80", emoji: "🇮🇱" },
  Family:      { color: "#f472b6", emoji: "👨‍👩‍👧‍👦" },
  Livelihood:  { color: "#818cf8", emoji: "🌾" },
  Community:   { color: "#fb923c", emoji: "🫂" },
  Gratitude:   { color: "#fbbf24", emoji: "🙏" },
  Protection:  { color: "#a78bfa", emoji: "🛡️" },
  Other:       { color: "#94a3b8", emoji: "✡" },
};

const DEFAULT_REQUESTS: PrayerRequest[] = [
  { id: "p1", name: "Rivka", isAnonymous: false, text: "Please pray for my mother's complete recovery from illness. May Hashem grant her strength and healing.", category: "Healing", submittedAt: new Date(Date.now() - 2 * 86400000).toISOString(), amens: 14 },
  { id: "p2", name: "Anonymous", isAnonymous: true, text: "Praying that our aliyah paperwork comes through soon. We have waited three years.", category: "Aliyah", submittedAt: new Date(Date.now() - 5 * 86400000).toISOString(), amens: 22 },
  { id: "p3", name: "Shmuel", isAnonymous: false, text: "Grateful for making aliyah this month. Thank you Hashem and Shavei Israel!", category: "Gratitude", submittedAt: new Date(Date.now() - 1 * 86400000).toISOString(), amens: 31 },
];

function fmtRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(ms / 3_600_000);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(ms / 86_400_000);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function PrayerBoardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = insets.top > 0 ? insets.top : (Platform.OS === "web" ? 60 : 20);

  const [requests, setRequests] = useState<PrayerRequest[]>([]);
  const [amens, setAmens] = useState<Set<string>>(new Set());
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState("All");

  const [name, setName] = useState("");
  const [isAnon, setIsAnon] = useState(false);
  const [text, setText] = useState("");
  const [category, setCategory] = useState("Blessing");

  useEffect(() => {
    Promise.all([
      storageGet<PrayerRequest[]>(STORAGE_KEY, DEFAULT_REQUESTS),
      storageGet<string[]>(AMENS_KEY, []),
    ]).then(([r, a]) => {
      setRequests(r);
      setAmens(new Set(a));
    });
  }, []);

  const displayed = filter === "All"
    ? requests
    : requests.filter(r => r.category === filter);

  async function toggleAmen(id: string) {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = new Set(amens);
    const updated = requests.map(r => {
      if (r.id !== id) return r;
      if (next.has(id)) { next.delete(id); return { ...r, amens: r.amens - 1 }; }
      next.add(id);
      return { ...r, amens: r.amens + 1 };
    });
    setAmens(next);
    setRequests(updated);
    await storageSet(STORAGE_KEY, updated);
    await storageSet(AMENS_KEY, [...next]);
  }

  async function submitRequest() {
    if (!text.trim()) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const req: PrayerRequest = {
      id: Date.now().toString(),
      name: isAnon ? "Anonymous" : (name.trim() || "Anonymous"),
      isAnonymous: isAnon,
      text: text.trim(),
      category,
      submittedAt: new Date().toISOString(),
      amens: 0,
    };
    const updated = [req, ...requests];
    setRequests(updated);
    await storageSet(STORAGE_KEY, updated);
    setName(""); setText(""); setIsAnon(false); setCategory("Blessing");
    setShowForm(false);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 100 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: topPad + 12 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="chevron-left" size={24} color={colors.foreground} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.foreground }]}>Prayer Board</Text>
            <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 2 }}>Community prayer requests</Text>
          </View>
          <TouchableOpacity
            style={[styles.newBtn, { backgroundColor: colors.primary }]}
            onPress={() => setShowForm(true)}
          >
            <Feather name="plus" size={18} color={colors.primaryForeground} />
            <Text style={[styles.newBtnText, { color: colors.primaryForeground }]}>Request</Text>
          </TouchableOpacity>
        </View>

        {/* Category Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 14, gap: 8 }}
        >
          {["All", ...CATEGORIES].map(cat => {
            const active = cat === filter;
            const meta = CAT_META[cat];
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.pill,
                  { borderColor: active ? (meta?.color ?? colors.primary) : colors.border,
                    backgroundColor: active ? ((meta?.color ?? colors.primary) + "18") : colors.card },
                ]}
                onPress={() => setFilter(cat)}
              >
                {meta && <Text style={{ fontSize: 12 }}>{meta.emoji} </Text>}
                <Text style={[styles.pillText, { color: active ? (meta?.color ?? colors.primary) : colors.mutedForeground }]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Requests */}
        {displayed.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>🙏</Text>
            <Text style={{ fontSize: 15, fontWeight: "600", color: colors.foreground }}>No requests yet</Text>
            <Text style={{ fontSize: 13, color: colors.mutedForeground, marginTop: 4 }}>Be the first to share a prayer request.</Text>
          </View>
        ) : displayed.map(req => {
          const meta = CAT_META[req.category] ?? CAT_META.Other;
          const hasAmen = amens.has(req.id);
          return (
            <View
              key={req.id}
              style={[styles.reqCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={styles.reqHeader}>
                <View style={[styles.catBadge, { backgroundColor: meta.color + "18", borderColor: meta.color + "44" }]}>
                  <Text style={{ fontSize: 11 }}>{meta.emoji} </Text>
                  <Text style={[styles.catText, { color: meta.color }]}>{req.category}</Text>
                </View>
                <Text style={[styles.timeText, { color: colors.mutedForeground }]}>{fmtRelative(req.submittedAt)}</Text>
              </View>

              <Text style={[styles.reqName, { color: colors.foreground }]}>
                {req.isAnonymous ? "Anonymous" : req.name}
              </Text>
              <Text style={[styles.reqText, { color: colors.mutedForeground }]}>{req.text}</Text>

              <TouchableOpacity
                style={[
                  styles.amenBtn,
                  { borderColor: hasAmen ? meta.color : colors.border, backgroundColor: hasAmen ? meta.color + "12" : "transparent" },
                ]}
                onPress={() => toggleAmen(req.id)}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 14 }}>{hasAmen ? "🙏" : "🤲"}</Text>
                <Text style={[styles.amenText, { color: hasAmen ? meta.color : colors.mutedForeground }]}>
                  Amen · {req.amens}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>

      {/* Submit Modal */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: colors.background }}>
          <View style={[styles.modalHeader, { paddingTop: insets.top + 16, borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.foreground }]}>New Prayer Request</Text>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <Feather name="x" size={24} color={colors.foreground} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            <View style={[styles.anonRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View>
                <Text style={[{ fontSize: 14, fontWeight: "600", color: colors.foreground }]}>Submit anonymously</Text>
                <Text style={[{ fontSize: 12, color: colors.mutedForeground }]}>Your name will not be shown</Text>
              </View>
              <Switch
                value={isAnon}
                onValueChange={setIsAnon}
                trackColor={{ false: colors.border, true: colors.primary + "88" }}
                thumbColor={isAnon ? colors.primary : colors.mutedForeground}
              />
            </View>

            {!isAnon && (
              <>
                <Text style={[styles.fLabel, { color: colors.mutedForeground }]}>YOUR NAME</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                  placeholder="Enter your name"
                  placeholderTextColor={colors.mutedForeground}
                  value={name}
                  onChangeText={setName}
                />
              </>
            )}

            <Text style={[styles.fLabel, { color: colors.mutedForeground }]}>CATEGORY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, marginBottom: 16 }}>
              {CATEGORIES.map(cat => {
                const meta = CAT_META[cat];
                const active = cat === category;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.catBtn,
                      { borderColor: active ? meta.color : colors.border, backgroundColor: active ? meta.color + "18" : colors.card },
                    ]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text style={{ fontSize: 13 }}>{meta.emoji} </Text>
                    <Text style={[{ fontSize: 12, fontWeight: "600", color: active ? meta.color : colors.mutedForeground }]}>{cat}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <Text style={[styles.fLabel, { color: colors.mutedForeground }]}>YOUR PRAYER REQUEST</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
              placeholder="Share your prayer request with the community…"
              placeholderTextColor={colors.mutedForeground}
              value={text}
              onChangeText={setText}
              multiline
              numberOfLines={5}
            />

            <TouchableOpacity
              style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: text.trim() ? 1 : 0.5 }]}
              onPress={submitRequest}
              disabled={!text.trim()}
            >
              <Text style={[{ fontSize: 16, fontWeight: "700", color: colors.primaryForeground }]}>
                🙏 Submit Prayer Request
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, marginBottom: 4, gap: 12 },
  backBtn: { padding: 4 },
  title: { fontSize: 24, fontWeight: "700", letterSpacing: -0.5 },
  newBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  newBtnText: { fontSize: 14, fontWeight: "700" },
  pill: { flexDirection: "row", alignItems: "center", borderRadius: 20, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6 },
  pillText: { fontSize: 12, fontWeight: "600" },
  emptyCard: { marginHorizontal: 16, borderRadius: 14, borderWidth: 1, padding: 32, alignItems: "center" },
  reqCard: { marginHorizontal: 16, marginBottom: 10, borderRadius: 14, borderWidth: 1, padding: 16 },
  reqHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  catBadge: { flexDirection: "row", alignItems: "center", borderRadius: 20, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  catText: { fontSize: 11, fontWeight: "700" },
  timeText: { fontSize: 11 },
  reqName: { fontSize: 13, fontWeight: "700", marginBottom: 6 },
  reqText: { fontSize: 13, lineHeight: 20, marginBottom: 12 },
  amenBtn: { flexDirection: "row", alignItems: "center", gap: 8, borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 7, alignSelf: "flex-start" },
  amenText: { fontSize: 13, fontWeight: "700" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: "700" },
  anonRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderRadius: 12, borderWidth: 1, padding: 14, marginBottom: 16 },
  fLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1, marginBottom: 8 },
  input: { borderRadius: 10, borderWidth: 1, padding: 12, fontSize: 14, marginBottom: 16 },
  textArea: { minHeight: 120, textAlignVertical: "top" as const },
  catBtn: { flexDirection: "row", alignItems: "center", borderRadius: 20, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7 },
  submitBtn: { borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 4 },
});
