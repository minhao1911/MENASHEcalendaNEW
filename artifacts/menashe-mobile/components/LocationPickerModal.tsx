/**
 * LocationPickerModal
 *
 * Searchable city picker, grouped by country.
 * Invoked from the location chip in the Home header.
 * Design: matches Home screen — MMDL tokens, gold accent, Feather icons.
 */

import React, { memo, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";

import { useThemeTokens } from "@/src/mobile/design-system";
import { LOCATIONS, type Location } from "@/lib/locations";

// ─── Country flag lookup ────────────────────────────────────────────────────

const COUNTRY_FLAG: Record<string, string> = {
  Israel:    "🇮🇱",
  India:     "🇮🇳",
  USA:       "🇺🇸",
  Canada:    "🇨🇦",
  UK:        "🇬🇧",
  France:    "🇫🇷",
  Australia: "🇦🇺",
};

// ─── Row data types ─────────────────────────────────────────────────────────

type ListItem =
  | { kind: "header"; country: string }
  | { kind: "city";   loc: Location };

function buildList(query: string): ListItem[] {
  const q = query.trim().toLowerCase();
  const filtered = q
    ? LOCATIONS.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.country.toLowerCase().includes(q),
      )
    : LOCATIONS;

  const byCountry = filtered.reduce<Record<string, Location[]>>((acc, loc) => {
    (acc[loc.country] ??= []).push(loc);
    return acc;
  }, {});

  const items: ListItem[] = [];
  for (const country of Object.keys(byCountry)) {
    items.push({ kind: "header", country });
    for (const loc of byCountry[country]) {
      items.push({ kind: "city", loc });
    }
  }
  return items;
}

// ─── City row ───────────────────────────────────────────────────────────────

const CityRow = memo(function CityRow({
  loc,
  selected,
  colors,
  rd,
  gold,
  onPick,
}: {
  loc: Location;
  selected: boolean;
  colors: ReturnType<typeof useThemeTokens>["colors"];
  rd:     ReturnType<typeof useThemeTokens>["rd"];
  gold:   string;
  onPick: (loc: Location) => void;
}) {
  return (
    <Pressable
      onPress={() => onPick(loc)}
      accessibilityRole="button"
      accessibilityLabel={`${loc.name}, ${loc.country}`}
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.cityRow,
        {
          backgroundColor: pressed
            ? gold + "14"
            : selected
            ? gold + "0d"
            : "transparent",
          borderRadius: rd.md,
        },
      ]}
    >
      <View style={styles.cityInfo}>
        <Text style={[styles.cityName, { color: selected ? gold : colors.textPrimary }]}>
          {loc.name}
        </Text>
        <Text style={[styles.cityMeta, { color: colors.textMuted }]}>
          {loc.tz}
        </Text>
      </View>
      {selected && (
        <Feather name="check" size={16} color={gold} />
      )}
    </Pressable>
  );
});

// ─── Main component ──────────────────────────────────────────────────────────

interface Props {
  visible:    boolean;
  current:    Location;
  onSelect:   (loc: Location) => void;
  onClose:    () => void;
}

export default function LocationPickerModal({
  visible, current, onSelect, onClose,
}: Props) {
  const { colors, rd, sp } = useThemeTokens();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);

  const gold = colors.accentGold ?? "#d4a843";

  const [query, setQuery] = useState("");

  const items = useMemo(() => buildList(query), [query]);

  function handlePick(loc: Location) {
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(loc);
    setQuery("");
    onClose();
  }

  function handleClose() {
    Keyboard.dismiss();
    setQuery("");
    onClose();
  }

  function renderItem({ item }: { item: ListItem }) {
    if (item.kind === "header") {
      const flag = COUNTRY_FLAG[item.country] ?? "🌍";
      return (
        <View style={[styles.countryHeader, { borderBottomColor: colors.cardBorder }]}>
          <Text style={styles.countryFlag}>{flag}</Text>
          <Text style={[styles.countryLabel, { color: colors.textMuted }]}>
            {item.country.toUpperCase()}
          </Text>
        </View>
      );
    }
    return (
      <CityRow
        loc={item.loc}
        selected={item.loc.name === current.name}
        colors={colors}
        rd={rd}
        gold={gold}
        onPick={handlePick}
      />
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={[styles.root, { backgroundColor: colors.background }]}>

        {/* ── Handle bar ── */}
        <View style={[styles.handle, { backgroundColor: colors.cardBorder }]} />

        {/* ── Header ── */}
        <View
          style={[
            styles.header,
            { paddingTop: insets.top + sp[3], borderBottomColor: colors.cardBorder },
          ]}
        >
          <View style={styles.headerLeft}>
            <View
              style={[
                styles.headerIcon,
                { backgroundColor: gold + "1e", borderColor: gold + "44" },
              ]}
            >
              <Feather name="map-pin" size={15} color={gold} />
            </View>
            <View>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                Choose Location
              </Text>
              <Text style={[styles.headerSub, { color: colors.textMuted }]}>
                Zmanim are calculated for your city
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityLabel="Close location picker"
            accessibilityRole="button"
            style={[styles.closeBtn, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          >
            <Feather name="x" size={16} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* ── Search bar ── */}
        <View style={[styles.searchWrap, { paddingHorizontal: sp[4] }]}>
          <View
            style={[
              styles.searchBar,
              { backgroundColor: colors.card, borderColor: colors.cardBorder },
            ]}
          >
            <Feather name="search" size={15} color={colors.textMuted} />
            <TextInput
              ref={inputRef}
              value={query}
              onChangeText={setQuery}
              placeholder="Search cities or countries…"
              placeholderTextColor={colors.textMuted}
              returnKeyType="search"
              clearButtonMode="while-editing"
              autoCorrect={false}
              autoCapitalize="none"
              style={[styles.searchInput, { color: colors.textPrimary }]}
              accessibilityLabel="Search cities"
            />
            {query.length > 0 && (
              <TouchableOpacity
                onPress={() => setQuery("")}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityLabel="Clear search"
              >
                <Feather name="x-circle" size={14} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Current location pill ── */}
        <View style={[styles.currentWrap, { paddingHorizontal: sp[4] }]}>
          <View
            style={[
              styles.currentPill,
              { backgroundColor: gold + "14", borderColor: gold + "38" },
            ]}
          >
            <Feather name="map-pin" size={12} color={gold} />
            <Text style={[styles.currentText, { color: gold }]}>
              Current: {current.name}, {current.country}
            </Text>
          </View>
        </View>

        {/* ── City list ── */}
        {items.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="map" size={32} color={colors.textMuted} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              No cities match "{query}"
            </Text>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) =>
              item.kind === "header" ? `h-${item.country}` : item.loc.name
            }
            renderItem={renderItem}
            contentContainerStyle={{
              paddingHorizontal: sp[4],
              paddingBottom: (insets.bottom || 0) + 40,
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => null}
          />
        )}
      </View>
    </Modal>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    alignSelf: "center",
    marginTop: 10, marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    flexDirection: "row", alignItems: "center", gap: 12,
  },
  headerIcon: {
    width: 38, height: 38, borderRadius: 12,
    borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16, fontWeight: "700", letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 11, marginTop: 1,
  },
  closeBtn: {
    width: 34, height: 34, borderRadius: 17,
    borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  searchWrap: {
    paddingTop: 14, paddingBottom: 8,
  },
  searchBar: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  searchInput: {
    flex: 1, fontSize: 14, paddingVertical: 0,
  },
  currentWrap: {
    paddingBottom: 12,
  },
  currentPill: {
    flexDirection: "row", alignItems: "center", gap: 6,
    alignSelf: "flex-start",
    borderRadius: 20, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 6,
  },
  currentText: {
    fontSize: 12, fontWeight: "600",
  },
  countryHeader: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingVertical: 10,
    marginTop: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 2,
  },
  countryFlag: { fontSize: 16 },
  countryLabel: {
    fontSize: 10, fontWeight: "700", letterSpacing: 1.6,
  },
  cityRow: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 13, paddingHorizontal: 8,
  },
  cityInfo: { flex: 1 },
  cityName: {
    fontSize: 15, fontWeight: "600",
  },
  cityMeta: {
    fontSize: 11, marginTop: 2,
  },
  empty: {
    flex: 1, alignItems: "center", justifyContent: "center", gap: 12,
    paddingBottom: 60,
  },
  emptyText: {
    fontSize: 14,
  },
});
