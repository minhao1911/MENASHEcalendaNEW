import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Modal, Platform, KeyboardAvoidingView,
  Animated, Easing,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useColors } from "@/hooks/useColors";
import BurningCandleRN from "@/components/BurningCandleRN";
import {
  fetchCommunityYahrzeit,
  createCommunityYahrzeit,
  dedicateLearning,
  type CommunityYahrzeitEntry,
} from "@/lib/communityApi";
import { fetchAnnouncements, type MobileAnnouncement } from "@/lib/announcementsApi";

const DONATION_TIERS = [
  { label: "Free / Donate later", amount: 0 },
  { label: "₹108 — Tikkun Olam", amount: 108, tag: "💛" },
  { label: "₹360 — Zecher L'vracha", amount: 360, tag: "✡" },
  { label: "₹1080 — Eternal Light", amount: 1080, tag: "🕯" },
];

const CURRENT_YEAR = new Date().getFullYear();

function ordinalStr(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function yahrzeitNumber(passingYear: number | null): number | undefined {
  if (!passingYear || passingYear >= CURRENT_YEAR) return undefined;
  return CURRENT_YEAR - passingYear;
}

type Screen = "board" | "form";

export default function CommunityScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = insets.top > 0 ? insets.top : (Platform.OS === "web" ? 60 : 20);

  const [entries, setEntries] = useState<CommunityYahrzeitEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState<Screen>("board");

  const [announcements, setAnnouncements] = useState<MobileAnnouncement[]>([]);
  const [announcementsExpanded, setAnnouncementsExpanded] = useState(true);

  // Form state
  const [deceasedName, setDeceasedName] = useState("");
  const [passYear, setPassYear] = useState("");
  const [passMonth, setPassMonth] = useState("");
  const [passDay, setPassDay] = useState("");
  const [donorName, setDonorName] = useState("");
  const [message, setMessage] = useState("");
  const [donationIdx, setDonationIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Dedicate state
  const [dedicateEntryId, setDedicateEntryId] = useState<string | null>(null);
  const [dedicateName, setDedicateName] = useState("");
  const [dedicateSubject, setDedicateSubject] = useState("Torah");
  const [dedicateSaving, setDedicateSaving] = useState(false);
  const [dedicateDone, setDedicateDone] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const load = useCallback(async () => {
    const data = await fetchCommunityYahrzeit();
    setEntries(data);
    setLoading(false);
  }, []);

  const loadAnnouncements = useCallback(async () => {
    const data = await fetchAnnouncements();
    setAnnouncements(data);
  }, []);

  useEffect(() => {
    load();
    loadAnnouncements();
    const iv = setInterval(load, 20000);
    const ivA = setInterval(loadAnnouncements, 60000);
    return () => { clearInterval(iv); clearInterval(ivA); };
  }, [load, loadAnnouncements]);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1, duration: 350, easing: Easing.out(Easing.ease), useNativeDriver: true,
    }).start();
  }, [screen]);

  const candleCount = entries.length;
  const learnerCount = entries.reduce((s, e) => s + e.learners.length, 0);

  function goToForm() {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fadeAnim.setValue(0);
    setScreen("form");
  }

  function goToBoard() {
    fadeAnim.setValue(0);
    setScreen("board");
  }

  async function handleSubmit() {
    if (!deceasedName.trim() || !passYear || !donorName.trim()) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);
    try {
      const y = parseInt(passYear, 10) || CURRENT_YEAR;
      const m = parseInt(passMonth, 10) || 1;
      const d = parseInt(passDay, 10) || 1;
      const passDate = new Date(y, m - 1, d, 12, 0, 0);
      const id = `cy-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      let hebrewDay = 1;
      let hebrewMonth = 1;
      try {
        const { HDate } = await import("@hebcal/core");
        const hd = new HDate(passDate);
        hebrewDay = hd.getDate();
        hebrewMonth = hd.getMonth();
      } catch {}

      await createCommunityYahrzeit({
        id,
        deceasedName: deceasedName.trim(),
        hebrewDay,
        hebrewMonth,
        displayDate: passDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
        passingYear: y,
        message: message.trim(),
        donorDisplayName: donorName.trim(),
      });
      setSavedSuccess(true);
      await load();
      setTimeout(() => {
        setSavedSuccess(false);
        setDeceasedName(""); setPassYear(""); setPassMonth(""); setPassDay("");
        setMessage(""); setDonationIdx(0);
        goToBoard();
      }, 2200);
    } finally {
      setSaving(false);
    }
  }

  async function handleDedicate() {
    if (!dedicateEntryId || !dedicateName.trim()) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDedicateSaving(true);
    try {
      await dedicateLearning(dedicateEntryId, dedicateName.trim(), dedicateSubject.trim() || "Torah");
      setDedicateDone(true);
      await load();
      setTimeout(() => {
        setDedicateEntryId(null);
        setDedicateDone(false);
        setDedicateName("");
        setDedicateSubject("Torah");
      }, 2200);
    } finally {
      setDedicateSaving(false);
    }
  }

  const canSubmit = deceasedName.trim().length > 0 && passYear.length === 4 && donorName.trim().length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        <View style={{ paddingTop: topPad + 16, paddingHorizontal: 16 }}>
          {/* Header */}
          <View style={styles.header}>
            {screen === "form" && (
              <TouchableOpacity onPress={goToBoard} style={styles.backBtn}>
                <Feather name="arrow-left" size={20} color={colors.mutedForeground} />
              </TouchableOpacity>
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.foreground }]}>
                🕯 {screen === "board" ? "Community Memorial" : "Light a Candle"}
              </Text>
              <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                {screen === "board"
                  ? "The community prays together"
                  : "Add a memorial in memory of the departed"}
              </Text>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.statsRow}>
            <View style={[styles.statCard, { backgroundColor: colors.primary + "14", borderColor: colors.primary + "33" }]}>
              <Text style={[styles.statNum, { color: colors.primary }]}>{candleCount}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>CANDLES LIT</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.success + "12", borderColor: colors.success + "2E" }]}>
              <Text style={[styles.statNum, { color: colors.success }]}>{learnerCount}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>LEARNING NOW</Text>
            </View>
          </View>
        </View>

        <Animated.View style={{ opacity: fadeAnim, paddingHorizontal: 16 }}>
          {/* ── BOARD ── */}
          {screen === "board" && (
            <>
              {/* ── Announcements section ── */}
              {announcements.length > 0 && (
                <View style={{ marginBottom: 18 }}>
                  <TouchableOpacity
                    onPress={() => setAnnouncementsExpanded(e => !e)}
                    activeOpacity={0.75}
                    style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: "800", color: colors.primary, letterSpacing: 0.6 }}>
                      📢 ANNOUNCEMENTS
                    </Text>
                    <Feather name={announcementsExpanded ? "chevron-up" : "chevron-down"} size={16} color={colors.primary} />
                  </TouchableOpacity>
                  {announcementsExpanded && announcements.map(ann => (
                    <View key={ann.id} style={{
                      borderRadius: 14, marginBottom: 10, overflow: "hidden",
                      borderWidth: ann.pinned ? 1 : 1,
                      borderColor: ann.pinned ? colors.primary + "66" : colors.border,
                      backgroundColor: ann.pinned ? colors.primary + "0F" : colors.card,
                    }}>
                      <View style={{ padding: 14, flexDirection: "row", gap: 12 }}>
                        <View style={{
                          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                          backgroundColor: ann.pinned ? colors.primary + "1F" : "rgba(255,255,255,0.06)",
                          borderWidth: 1, borderColor: ann.pinned ? colors.primary + "40" : colors.border,
                          alignItems: "center", justifyContent: "center",
                        }}>
                          <Text style={{ fontSize: 22 }}>{ann.emoji}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          {ann.pinned && (
                            <Text style={{ fontSize: 10, color: colors.primary, fontWeight: "700", marginBottom: 2 }}>📌 Pinned</Text>
                          )}
                          <Text style={{ fontSize: 14, fontWeight: "700", color: colors.foreground, marginBottom: 3 }}>
                            {ann.title}
                          </Text>
                          {!!ann.body && (
                            <Text style={{ fontSize: 12, color: colors.mutedForeground, lineHeight: 18 }}>
                              {ann.body}
                            </Text>
                          )}
                          {ann.sentAt && (
                            <Text style={{ fontSize: 10, color: colors.mutedForeground, marginTop: 5 }}>
                              {(() => {
                                const diff = Date.now() - new Date(ann.sentAt).getTime();
                                const mins = Math.floor(diff / 60000);
                                if (mins < 60) return `${mins}m ago`;
                                const hrs = Math.floor(diff / 3600000);
                                if (hrs < 24) return `${hrs}h ago`;
                                const days = Math.floor(diff / 86400000);
                                return `${days}d ago`;
                              })()}
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {/* Light a candle CTA */}
              <TouchableOpacity
                style={[styles.ctaBtn, { borderColor: colors.primary + "66", backgroundColor: colors.primary + "0D" }]}
                onPress={goToForm}
                activeOpacity={0.75}
              >
                <Text style={{ fontSize: 20 }}>🕯</Text>
                <Text style={[styles.ctaBtnText, { color: colors.primary }]}>Light a Memorial Candle</Text>
              </TouchableOpacity>

              {loading && (
                <View style={styles.centerMsg}>
                  <ActivityIndicator color={colors.primary} />
                  <Text style={[styles.emptyText, { color: colors.mutedForeground, marginTop: 10 }]}>
                    Loading memorial candles…
                  </Text>
                </View>
              )}

              {!loading && entries.length === 0 && (
                <View style={styles.centerMsg}>
                  <Text style={{ fontSize: 44, marginBottom: 12 }}>🕯</Text>
                  <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                    No memorial candles yet.{"\n"}Be the first to light one.
                  </Text>
                </View>
              )}

              {!loading && entries.length > 0 && (
                <View style={styles.candleGrid}>
                  {entries.map((entry) => {
                    const yNum = yahrzeitNumber(entry.passingYear);
                    const isDedicating = dedicateEntryId === entry.id;

                    return (
                      <View
                        key={entry.id}
                        style={[styles.candleCard, { backgroundColor: colors.primary + "0A", borderColor: colors.primary + "2E" }]}
                      >
                        <BurningCandleRN
                          deceasedName={entry.deceasedName}
                          yahrzeitNumber={yNum}
                          donorName={entry.donorDisplayName || undefined}
                          learners={entry.learners}
                          isLit={entry.candleLit}
                          compact
                        />

                        {entry.message ? (
                          <Text numberOfLines={2} style={[styles.candleMessage, { color: colors.mutedForeground }]}>
                            "{entry.message}"
                          </Text>
                        ) : null}

                        {/* Dedicate Learning */}
                        {!isDedicating && (
                          <TouchableOpacity
                            style={[styles.dedicateBtn, { backgroundColor: colors.primary + "14", borderColor: colors.primary + "33" }]}
                            onPress={() => {
                              setDedicateEntryId(entry.id);
                              setDedicateDone(false);
                              setDedicateName("");
                              setDedicateSubject("Torah");
                              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }}
                            activeOpacity={0.7}
                          >
                            <Text style={{ fontSize: 9, color: colors.primary, fontWeight: "700" }}>
                              📖 Dedicate Learning
                            </Text>
                          </TouchableOpacity>
                        )}

                        {isDedicating && !dedicateDone && (
                          <View style={{ width: "100%", gap: 5, marginTop: 8 }}>
                            <TextInput
                              style={[styles.miniInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                              placeholder="Your name"
                              placeholderTextColor={colors.mutedForeground}
                              value={dedicateName}
                              onChangeText={setDedicateName}
                            />
                            <TextInput
                              style={[styles.miniInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                              placeholder="What are you studying?"
                              placeholderTextColor={colors.mutedForeground}
                              value={dedicateSubject}
                              onChangeText={setDedicateSubject}
                            />
                            <View style={{ flexDirection: "row", gap: 5 }}>
                              <TouchableOpacity
                                style={[styles.miniBtn, { flex: 1, backgroundColor: colors.card, borderColor: colors.border }]}
                                onPress={() => setDedicateEntryId(null)}
                              >
                                <Text style={{ fontSize: 9, color: colors.mutedForeground }}>Cancel</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[styles.miniBtn, { flex: 2, backgroundColor: colors.primary + "26", borderColor: colors.primary + "59", opacity: (!dedicateName.trim() || dedicateSaving) ? 0.5 : 1 }]}
                                onPress={handleDedicate}
                                disabled={dedicateSaving || !dedicateName.trim()}
                              >
                                <Text style={{ fontSize: 9, color: colors.primary, fontWeight: "700" }}>
                                  {dedicateSaving ? "…" : "🕯 Dedicate"}
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        )}

                        {isDedicating && dedicateDone && (
                          <Text style={{ marginTop: 8, fontSize: 10, color: colors.success, fontWeight: "700", textAlign: "center" }}>
                            ✓ Your learning glows in the flame
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </>
          )}

          {/* ── FORM ── */}
          {screen === "form" && (
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
              <View style={{ gap: 14 }}>
                {/* Deceased name */}
                <View>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>NAME OF THE DEPARTED *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                    placeholder="e.g. Miriam bat Avraham"
                    placeholderTextColor={colors.mutedForeground}
                    value={deceasedName}
                    onChangeText={setDeceasedName}
                  />
                </View>

                {/* Date of passing */}
                <View>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>DATE OF PASSING *</Text>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TextInput
                      style={[styles.input, { flex: 2, backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                      placeholder="Year (e.g. 2018)"
                      placeholderTextColor={colors.mutedForeground}
                      keyboardType="number-pad"
                      maxLength={4}
                      value={passYear}
                      onChangeText={setPassYear}
                    />
                    <TextInput
                      style={[styles.input, { flex: 1, backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                      placeholder="Mo."
                      placeholderTextColor={colors.mutedForeground}
                      keyboardType="number-pad"
                      maxLength={2}
                      value={passMonth}
                      onChangeText={setPassMonth}
                    />
                    <TextInput
                      style={[styles.input, { flex: 1, backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                      placeholder="Day"
                      placeholderTextColor={colors.mutedForeground}
                      keyboardType="number-pad"
                      maxLength={2}
                      value={passDay}
                      onChangeText={setPassDay}
                    />
                  </View>
                  {passYear.length === 4 && (
                    <Text style={{ fontSize: 11, color: colors.primary, marginTop: 5 }}>
                      ✡  {ordinalStr(CURRENT_YEAR - parseInt(passYear, 10))} Yahrzeit this year
                    </Text>
                  )}
                </View>

                {/* Donor name */}
                <View>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>YOUR NAME (as donor) *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                    placeholder="Your name"
                    placeholderTextColor={colors.mutedForeground}
                    value={donorName}
                    onChangeText={setDonorName}
                  />
                </View>

                {/* Message */}
                <View>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>MESSAGE (optional)</Text>
                  <TextInput
                    style={[styles.input, styles.textarea, { backgroundColor: colors.card, borderColor: colors.border, color: colors.foreground }]}
                    placeholder="A few words in their memory…"
                    placeholderTextColor={colors.mutedForeground}
                    multiline
                    numberOfLines={3}
                    value={message}
                    onChangeText={setMessage}
                  />
                </View>

                {/* Donation tiers */}
                <View>
                  <Text style={[styles.fieldLabel, { color: colors.mutedForeground }]}>DONATION</Text>
                  {DONATION_TIERS.map((tier, i) => (
                    <TouchableOpacity
                      key={i}
                      style={[
                        styles.tierRow,
                        {
                          borderColor: donationIdx === i ? colors.primary + "99" : colors.border,
                          backgroundColor: donationIdx === i ? colors.primary + "12" : colors.card,
                        },
                      ]}
                      onPress={() => setDonationIdx(i)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.radio, { borderColor: donationIdx === i ? colors.primary : colors.mutedForeground }]}>
                        {donationIdx === i && <View style={[styles.radioDot, { backgroundColor: colors.primary }]} />}
                      </View>
                      <Text style={{ fontSize: 13, fontWeight: "600", color: colors.foreground, flex: 1 }}>
                        {tier.tag ? `${tier.tag}  ` : ""}{tier.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {DONATION_TIERS[donationIdx].amount > 0 && (
                    <View style={[styles.donationNote, { backgroundColor: colors.primary + "0D", borderColor: colors.primary + "26" }]}>
                      <Text style={{ fontSize: 11, color: colors.mutedForeground, lineHeight: 17 }}>
                        💳 Donation of ₹{DONATION_TIERS[donationIdx].amount} will be processed by community admin.
                      </Text>
                    </View>
                  )}
                </View>

                {/* Submit */}
                {savedSuccess ? (
                  <View style={[styles.successBox, { backgroundColor: colors.success + "1A", borderColor: colors.success + "4D" }]}>
                    <Text style={{ fontSize: 32, marginBottom: 6 }}>🕯</Text>
                    <Text style={{ fontSize: 15, fontWeight: "800", color: colors.success, textAlign: "center" }}>
                      Candle lit! May their memory be a blessing.
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[styles.submitBtn, { backgroundColor: colors.primary, opacity: (!canSubmit || saving) ? 0.45 : 1 }]}
                    onPress={handleSubmit}
                    disabled={!canSubmit || saving}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.submitBtnText, { color: colors.primaryForeground }]}>
                      {saving ? "Lighting candle…" : "🕯 Light Memorial Candle"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </KeyboardAvoidingView>
          )}
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 16 },
  backBtn: { paddingTop: 3, paddingRight: 4 },
  title: { fontSize: 20, fontWeight: "800", lineHeight: 24 },
  subtitle: { fontSize: 12, marginTop: 3 },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 18 },
  statCard: { flex: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  statNum: { fontSize: 22, fontWeight: "900" },
  statLabel: { fontSize: 9, fontWeight: "700", letterSpacing: 0.8, marginTop: 2 },
  ctaBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    paddingVertical: 14, borderRadius: 13, borderWidth: 1.5, borderStyle: "dashed",
    marginBottom: 18,
  },
  ctaBtnText: { fontSize: 14, fontWeight: "800" },
  centerMsg: { alignItems: "center", paddingVertical: 40 },
  emptyText: { fontSize: 14, lineHeight: 22, textAlign: "center" },
  candleGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center" },
  candleCard: { borderRadius: 16, padding: 12, borderWidth: 1, alignItems: "center", width: 150 },
  candleMessage: { fontSize: 9, fontStyle: "italic", textAlign: "center", marginTop: 5, lineHeight: 13 },
  dedicateBtn: {
    marginTop: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1,
  },
  miniInput: { borderWidth: 1, borderRadius: 7, padding: 6, fontSize: 10 },
  miniBtn: { borderWidth: 1, borderRadius: 7, padding: 5, alignItems: "center" },
  fieldLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.9, marginBottom: 6, textTransform: "uppercase" },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14 },
  textarea: { minHeight: 72, textAlignVertical: "top", paddingTop: 11 },
  tierRow: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1.5, borderRadius: 10, padding: 12, marginBottom: 8 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  radioDot: { width: 8, height: 8, borderRadius: 4 },
  donationNote: { borderWidth: 1, borderRadius: 8, padding: 10, marginTop: 4 },
  successBox: { borderWidth: 1, borderRadius: 14, padding: 20, alignItems: "center", marginTop: 8 },
  submitBtn: { borderRadius: 13, paddingVertical: 15, alignItems: "center", marginTop: 8 },
  submitBtnText: { fontSize: 15, fontWeight: "800" },
});
