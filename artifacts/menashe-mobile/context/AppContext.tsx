import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { DEFAULT_LOCATION, type Location } from "@/lib/locations";
import type { NotificationPrefs } from "@/lib/notifications";

const LOCATION_KEY = "menashe-location";
const PREFS_KEY = "menashe-notif-prefs";
const LEAD_KEY = "menashe-lead-time";

export const DEFAULT_PREFS: NotificationPrefs = {
  shabbat: true,
  havdalah: true,
  prayers: false,
  parasha: true,
  holiday: true,
};

interface AppContextValue {
  location: Location;
  setLocation: (loc: Location) => Promise<void>;
  notifPrefs: NotificationPrefs;
  setNotifPrefs: (prefs: NotificationPrefs) => Promise<void>;
  leadMinutes: number;
  setLeadMinutes: (mins: number) => Promise<void>;
  scheduledCount: number;
  reschedule: () => Promise<void>;
  permissionGranted: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

async function scheduleIfNative(
  prefs: NotificationPrefs,
  location: Location,
  lead: number,
): Promise<number> {
  if (Platform.OS === "web") return 0;
  const { scheduleAllNotifications } = await import("@/lib/notifications");
  return scheduleAllNotifications(prefs, location, lead);
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocationState] = useState<Location>(DEFAULT_LOCATION);
  const [notifPrefs, setNotifPrefsState] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [leadMinutes, setLeadMinutesState] = useState<number>(15);
  const [scheduledCount, setScheduledCount] = useState(0);
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    (async () => {
      if (Platform.OS !== "web") {
        const { setupNotificationChannel } = await import("@/lib/notifications");
        await setupNotificationChannel();
      }

      const [locRaw, prefsRaw, leadRaw] = await Promise.all([
        AsyncStorage.getItem(LOCATION_KEY),
        AsyncStorage.getItem(PREFS_KEY),
        AsyncStorage.getItem(LEAD_KEY),
      ]);

      let loc = DEFAULT_LOCATION;
      if (locRaw) {
        try { loc = JSON.parse(locRaw); } catch (_e) { /* use default */ }
      }
      let prefs = DEFAULT_PREFS;
      if (prefsRaw) {
        try { prefs = { ...DEFAULT_PREFS, ...JSON.parse(prefsRaw) }; } catch (_e) { /* use default */ }
      }
      const lead = leadRaw ? Number(leadRaw) || 15 : 15;

      setLocationState(loc);
      setNotifPrefsState(prefs);
      setLeadMinutesState(lead);

      if (Platform.OS !== "web") {
        const Notifications = await import("expo-notifications");
        const { status } = await Notifications.getPermissionsAsync();
        const granted = status === "granted";
        setPermissionGranted(granted);
        if (granted) {
          const n = await scheduleIfNative(prefs, loc, lead);
          setScheduledCount(n);
        }
      }
    })();
  }, []);

  const setLocation = async (loc: Location) => {
    setLocationState(loc);
    await AsyncStorage.setItem(LOCATION_KEY, JSON.stringify(loc));
    const n = await scheduleIfNative(notifPrefs, loc, leadMinutes);
    setScheduledCount(n);
  };

  const setNotifPrefs = async (prefs: NotificationPrefs) => {
    setNotifPrefsState(prefs);
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    const n = await scheduleIfNative(prefs, location, leadMinutes);
    setScheduledCount(n);
  };

  const setLeadMinutes = async (mins: number) => {
    setLeadMinutesState(mins);
    await AsyncStorage.setItem(LEAD_KEY, String(mins));
    const n = await scheduleIfNative(notifPrefs, location, mins);
    setScheduledCount(n);
  };

  const reschedule = async () => {
    const n = await scheduleIfNative(notifPrefs, location, leadMinutes);
    setScheduledCount(n);
  };

  return (
    <AppContext.Provider
      value={{
        location, setLocation,
        notifPrefs, setNotifPrefs,
        leadMinutes, setLeadMinutes,
        scheduledCount, reschedule,
        permissionGranted,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
