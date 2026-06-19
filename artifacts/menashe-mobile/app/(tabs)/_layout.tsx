import { BlurView } from "expo-blur";
import { Tabs, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import React, { useEffect } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";
import { useLanguage } from "@/context/LanguageContext";
import { useAuth } from "@clerk/expo";

export default function TabLayout() {
  const colors = useColors();
  const { theme } = useApp();
  const { t } = useLanguage();
  const isDark = theme !== "light";
  const isIOS = Platform.OS === "ios";
  const isWeb = Platform.OS === "web";
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace("/sign-in");
    }
  }, [isLoaded, isSignedIn]);

  if (!isLoaded || !isSignedIn) return null;

  const TAB_BAR_HEIGHT = isWeb ? 68 : 64;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedForeground,
        headerShown: false,
        tabBarStyle: {
          position: "absolute",
          backgroundColor: isIOS ? "transparent" : colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          elevation: 0,
          height: TAB_BAR_HEIGHT,
          paddingBottom: isWeb ? 8 : 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: "600",
          letterSpacing: 0.3,
          marginTop: 2,
        },
        tabBarBackground: () =>
          isIOS ? (
            <BlurView
              intensity={90}
              tint={isDark ? "dark" : "light"}
              style={StyleSheet.absoluteFill}
            />
          ) : isWeb ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />
          ) : null,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.navHome,
          tabBarIcon: ({ color, focused }) => (
            <Feather name="home" size={focused ? 23 : 21} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: t.navCalendar,
          tabBarIcon: ({ color, focused }) => (
            <Feather name="calendar" size={focused ? 23 : 21} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="zmanim"
        options={{
          title: t.navZmanim,
          tabBarIcon: ({ color, focused }) => (
            <Feather name="clock" size={focused ? 23 : 21} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: t.navCommunity,
          tabBarIcon: ({ color, focused }) => (
            <Feather name="users" size={focused ? 22 : 20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="torah"
        options={{
          title: t.navTorah,
          tabBarIcon: ({ color, focused }) => (
            <Feather name="book-open" size={focused ? 22 : 20} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t.navSettings,
          tabBarIcon: ({ color, focused }) => (
            <Feather name="settings" size={focused ? 22 : 20} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
