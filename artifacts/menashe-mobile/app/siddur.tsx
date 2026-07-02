import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useColors } from "@/hooks/useColors";
import { fetchBooks, type Book } from "@/lib/siddurApi";

const CATEGORIES = ["All", "Siddur", "Tehillim", "Torah Portions", "Hebrew Learning", "Prayer Books", "Daily Study", "Kuki Christian Books", "Custom Community Books"];

export default function SiddurScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = insets.top > 0 ? insets.top : (Platform.OS === "web" ? 60 : 20);
  const params = useLocalSearchParams<{ category?: string }>();

  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState(() =>
    params.category && CATEGORIES.includes(params.category) ? params.category : "All",
  );
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchBooks().then(b => {
      setBooks(b);
      setLoading(false);
    });
  }, []);

  const filtered = books.filter(b => {
    const matchCat = category === "All" || b.category === category;
    const matchSearch = !search || b.title.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch && b.published;
  });

  async function openBook(book: Book) {
    if (!book.fileUrl) return;
    await WebBrowser.openBrowserAsync(book.fileUrl);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad + 12, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Feather name="chevron-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.foreground }]}>Library</Text>
          <Text style={{ fontSize: 12, color: colors.mutedForeground, marginTop: 2 }}>
            {books.filter(b => b.published).length} books available
          </Text>
        </View>
      </View>

      {/* Search */}
      <View style={[styles.searchWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name="search" size={16} color={colors.mutedForeground} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="Search books..."
          placeholderTextColor={colors.mutedForeground}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Feather name="x" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      {/* Category pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}
      >
        {CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[
              styles.pill,
              {
                backgroundColor: cat === category ? colors.primary : colors.card,
                borderColor: cat === category ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setCategory(cat)}
          >
            <Text style={[
              styles.pillText,
              { color: cat === category ? colors.primaryForeground : colors.mutedForeground },
            ]}>
              {cat}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Books grid */}
      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.primary} />
          <Text style={{ color: colors.mutedForeground, marginTop: 12 }}>Loading library…</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", padding: 32 }}>
          <Text style={{ fontSize: 36, marginBottom: 12 }}>📚</Text>
          <Text style={{ fontSize: 16, fontWeight: "700", color: colors.foreground, marginBottom: 6 }}>
            {search ? "No books found" : "No books in this category"}
          </Text>
          <Text style={{ fontSize: 13, color: colors.mutedForeground, textAlign: "center" }}>
            {search ? "Try a different search term." : "Check back soon — more books are being added."}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + 80 }]}>
          {filtered.map(book => (
            <TouchableOpacity
              key={book.id}
              style={[styles.bookCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => openBook(book)}
              activeOpacity={0.75}
            >
              <View style={[styles.bookCover, { backgroundColor: book.coverColor + "22" }]}>
                <Text style={styles.bookEmoji}>{book.coverEmoji}</Text>
                {book.isPremium && (
                  <View style={[styles.premiumBadge, { backgroundColor: "#d4a843" }]}>
                    <Text style={{ fontSize: 8, fontWeight: "800", color: "#000" }}>PRO</Text>
                  </View>
                )}
              </View>
              <View style={{ flex: 1, paddingLeft: 14 }}>
                <Text style={[styles.bookTitle, { color: colors.foreground }]} numberOfLines={2}>{book.title}</Text>
                <Text style={[styles.bookCat, { color: colors.mutedForeground }]}>{book.category}</Text>
                {book.description ? (
                  <Text style={[styles.bookDesc, { color: colors.mutedForeground }]} numberOfLines={2}>
                    {book.description}
                  </Text>
                ) : null}
              </View>
              <View style={styles.bookArrow}>
                <Feather
                  name={book.fileUrl ? "external-link" : "lock"}
                  size={16}
                  color={book.fileUrl ? colors.primary : colors.mutedForeground}
                />
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth, gap: 12,
  },
  backBtn: { padding: 4 },
  title: { fontSize: 24, fontWeight: "700", letterSpacing: -0.5 },
  searchWrap: {
    flexDirection: "row", alignItems: "center",
    marginHorizontal: 16, marginTop: 12,
    borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 10, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14 },
  pill: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 6 },
  pillText: { fontSize: 12, fontWeight: "600" },
  grid: { padding: 16, gap: 10 },
  bookCard: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 14, borderWidth: 1,
    padding: 14,
  },
  bookCover: {
    width: 56, height: 72, borderRadius: 10,
    alignItems: "center", justifyContent: "center", position: "relative",
  },
  bookEmoji: { fontSize: 28 },
  premiumBadge: {
    position: "absolute", top: 4, right: 4,
    borderRadius: 4, paddingHorizontal: 3, paddingVertical: 1,
  },
  bookTitle: { fontSize: 14, fontWeight: "700", marginBottom: 3 },
  bookCat: { fontSize: 11, fontWeight: "600", marginBottom: 4 },
  bookDesc: { fontSize: 11, lineHeight: 15 },
  bookArrow: { paddingLeft: 10 },
});
