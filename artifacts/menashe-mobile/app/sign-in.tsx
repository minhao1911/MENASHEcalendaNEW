import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  Image,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Polygon, Polyline } from "react-native-svg";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";

const PHOTO = require("@/assets/images/saipikhup-photo.jpg");
const SIGNED_IN_KEY = "menashe-mobile-signed-in";

const GOLD = "#D4AF37";
const GOLD_BRIGHT = "#F5D982";
const DARK_BODY = "#111118";
const DARK_INPUT = "#18181f";
const BORDER_DARK = "#2a2a36";

const { width: SW } = Dimensions.get("window");

function LogoBadge() {
  return (
    <View style={styles.logoBadge}>
      <Svg viewBox="0 0 80 80" width={44} height={44} fill="none">
        <Polygon
          points="40,6 58,38 22,38"
          stroke={GOLD}
          strokeWidth="2.8"
          strokeLinejoin="round"
          fill="rgba(212,175,55,0.07)"
        />
        <Polygon
          points="40,62 22,30 58,30"
          stroke={GOLD}
          strokeWidth="2.8"
          strokeLinejoin="round"
          fill="rgba(212,175,55,0.07)"
        />
        <Polyline
          points="14,74 14,30 40,56 66,30 66,74"
          stroke={GOLD}
          strokeWidth="4.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    </View>
  );
}

export default function SignInScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleContinue() {
    if (!email.trim()) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    await AsyncStorage.setItem(SIGNED_IN_KEY, "1");
    router.replace("/(tabs)");
  }

  async function handleGoogle() {
    setLoading(true);
    await new Promise(r => setTimeout(r, 400));
    await AsyncStorage.setItem(SIGNED_IN_KEY, "1");
    router.replace("/(tabs)");
  }

  return (
    <View style={styles.root}>
      {/* Full-bleed saipikhup photo background */}
      <ImageBackground
        source={PHOTO}
        style={StyleSheet.absoluteFill}
        resizeMode="cover"
        imageStyle={{ top: 0 }}
      />

      {/* Dark veil */}
      <LinearGradient
        colors={["rgba(3,3,8,0.90)", "rgba(3,3,8,0.84)"]}
        style={StyleSheet.absoluteFill}
      />

      {/* Radial center glow */}
      <View style={styles.centerGlow} pointerEvents="none" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── 3D CARD ── */}
          <View style={styles.card}>

            {/* ── PHOTO HEADER — real embroidery band ── */}
            <View style={styles.headerWrap}>
              {/* Photo cropped to show the embroidered band */}
              <Image
                source={PHOTO}
                style={styles.headerPhoto}
                resizeMode="cover"
              />

              {/* Vignette overlay */}
              <LinearGradient
                colors={[
                  "rgba(0,0,0,0.80)",
                  "rgba(0,0,0,0.08)",
                  "rgba(0,0,0,0.08)",
                  "rgba(0,0,0,0.88)",
                ]}
                locations={[0, 0.38, 0.62, 1]}
                style={StyleSheet.absoluteFill}
              />

              {/* Side vignettes */}
              <LinearGradient
                colors={["rgba(0,0,0,0.45)", "transparent", "rgba(0,0,0,0.45)"]}
                locations={[0, 0.5, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={StyleSheet.absoluteFill}
              />

              {/* Gold top shimmer bar */}
              <LinearGradient
                colors={["transparent", GOLD, "#FFE878", GOLD, "transparent"]}
                locations={[0, 0.25, 0.5, 0.75, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.topGoldBar}
              />

              {/* Logo + branding */}
              <View style={styles.headerContent}>
                <LogoBadge />
                <Text style={styles.brandName}>BNEI MENASHE</Text>
                <Text style={styles.brandSub}>SACRED CALENDAR</Text>
              </View>
            </View>

            {/* Gold separator */}
            <LinearGradient
              colors={["transparent", GOLD, "#FFE878", GOLD, "transparent"]}
              locations={[0, 0.2, 0.5, 0.8, 1]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.goldSep}
            />

            {/* ── DARK FORM BODY ── */}
            <LinearGradient
              colors={["#111118", "#0f0f16"]}
              style={styles.formBody}
            >
              <Text style={styles.welcomeTitle}>Welcome back</Text>
              <Text style={styles.welcomeSub}>Sign in to access the sacred calendar</Text>

              {/* Google button */}
              <TouchableOpacity
                style={styles.googleBtn}
                onPress={handleGoogle}
                activeOpacity={0.85}
              >
                <Text style={styles.googleG}>G</Text>
                <Text style={styles.googleText}>Continue with Google</Text>
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Email field */}
              <Text style={styles.fieldLabel}>EMAIL ADDRESS</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email address"
                placeholderTextColor="#4a4a5a"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                returnKeyType="go"
                onSubmitEditing={handleContinue}
                selectionColor={GOLD}
              />

              {/* Continue button — 3D press effect */}
              <TouchableOpacity
                style={[styles.continueBtn, loading && styles.continueBtnDisabled]}
                onPress={handleContinue}
                activeOpacity={0.82}
                disabled={loading}
              >
                <LinearGradient
                  colors={["#F0C840", "#C49A20"]}
                  style={styles.continueBtnGradient}
                >
                  {loading ? (
                    <ActivityIndicator color="#0a0800" />
                  ) : (
                    <Text style={styles.continueBtnText}>Continue ›</Text>
                  )}
                </LinearGradient>
                {/* 3D bottom shadow bar */}
                <View style={styles.continueBtnShadowBar} />
              </TouchableOpacity>
            </LinearGradient>

            {/* Footer */}
            <View style={styles.footer}>
              <Text style={styles.footerText}>Don't have an account? </Text>
              <TouchableOpacity onPress={handleGoogle}>
                <Text style={styles.footerLink}>Sign up</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* App tagline below card */}
          <Text style={styles.tagline}>✡ Serving the Bnei Menashe community worldwide</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const CARD_W = Math.min(SW - 32, 420);

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#030308",
  },
  centerGlow: {
    position: "absolute",
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: "rgba(212,175,55,0.04)",
    top: "25%",
    left: "50%",
    transform: [{ translateX: -200 }, { translateY: -200 }],
  },
  scroll: {
    alignItems: "center",
    justifyContent: "center",
    flexGrow: 1,
    paddingHorizontal: 16,
  },

  /* ── Card ── */
  card: {
    width: CARD_W,
    borderRadius: 20,
    overflow: "hidden",
    borderTopWidth: 1.5,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: "rgba(212,175,55,0.65)",
    borderLeftColor: "rgba(212,175,55,0.28)",
    borderRightColor: "rgba(212,175,55,0.18)",
    borderBottomColor: "rgba(212,175,55,0.12)",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 24 },
        shadowOpacity: 0.9,
        shadowRadius: 48,
      },
      android: { elevation: 32 },
    }),
  },

  /* ── Photo header ── */
  headerWrap: {
    height: 210,
    overflow: "hidden",
    backgroundColor: "#040404",
  },
  headerPhoto: {
    position: "absolute",
    width: "100%",
    height: 680,
    bottom: 0,
  },
  topGoldBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  headerContent: {
    position: "absolute",
    inset: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingTop: 4,
  },

  /* ── Logo badge ── */
  logoBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(8,8,14,0.97)",
    borderWidth: 2,
    borderColor: "rgba(212,175,55,0.75)",
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.9,
        shadowRadius: 16,
      },
      android: { elevation: 12 },
    }),
  },

  brandName: {
    color: GOLD_BRIGHT,
    fontWeight: "800",
    fontSize: 20,
    letterSpacing: 3.5,
    textTransform: "uppercase",
    textShadowColor: "rgba(0,0,0,1)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 12,
  },
  brandSub: {
    color: "rgba(245,217,130,0.60)",
    fontSize: 10,
    letterSpacing: 5,
    textTransform: "uppercase",
    textShadowColor: "rgba(0,0,0,1)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
    marginTop: 2,
  },

  /* ── Gold separator ── */
  goldSep: {
    height: 2,
  },

  /* ── Form body ── */
  formBody: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 4,
    gap: 0,
  },

  welcomeTitle: {
    color: GOLD_BRIGHT,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  welcomeSub: {
    color: "#706050",
    fontSize: 13,
    marginBottom: 24,
    lineHeight: 18,
  },

  /* Google button */
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#ffffff",
    borderRadius: 10,
    height: 48,
    borderWidth: 1,
    borderColor: "#d8d8d8",
    marginBottom: 18,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.12,
        shadowRadius: 3,
      },
      android: { elevation: 2 },
    }),
  },
  googleG: {
    fontSize: 18,
    fontWeight: "700",
    color: "#4285F4",
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
  },
  googleText: {
    color: "#3c4043",
    fontWeight: "600",
    fontSize: 15,
  },

  /* Divider */
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: BORDER_DARK,
  },
  dividerText: {
    color: "#706050",
    fontSize: 12,
  },

  /* Email input */
  fieldLabel: {
    color: "#807060",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  input: {
    height: 48,
    backgroundColor: DARK_INPUT,
    borderWidth: 1,
    borderColor: BORDER_DARK,
    borderRadius: 10,
    paddingHorizontal: 14,
    color: "#F0EDE4",
    fontSize: 15,
    marginBottom: 20,
  },

  /* Continue button — 3D */
  continueBtn: {
    borderRadius: 10,
    overflow: "visible",
    marginBottom: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#7a5000",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.9,
        shadowRadius: 0,
      },
      android: { elevation: 4 },
    }),
  },
  continueBtnDisabled: { opacity: 0.7 },
  continueBtnGradient: {
    height: 50,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  continueBtnShadowBar: {
    position: "absolute",
    bottom: -5,
    left: 4,
    right: 4,
    height: 8,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    backgroundColor: "rgba(100,65,5,0.88)",
    zIndex: -1,
  },
  continueBtnText: {
    color: "#0a0800",
    fontWeight: "800",
    fontSize: 16,
    letterSpacing: 0.3,
  },

  /* Footer */
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0e0e16",
    borderTopWidth: 1,
    borderTopColor: "#1e1e28",
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  footerText: {
    color: "#706050",
    fontSize: 13,
  },
  footerLink: {
    color: GOLD,
    fontSize: 13,
    fontWeight: "700",
  },

  tagline: {
    marginTop: 24,
    color: "rgba(212,175,55,0.30)",
    fontSize: 11,
    letterSpacing: 0.5,
    textAlign: "center",
  },
});
