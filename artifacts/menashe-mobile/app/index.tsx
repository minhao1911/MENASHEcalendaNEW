import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { View } from "react-native";

const SIGNED_IN_KEY = "menashe-mobile-signed-in";

export default function Index() {
  const [checked, setChecked] = useState(false);
  const [signedIn, setSignedIn] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(SIGNED_IN_KEY).then((val) => {
      setSignedIn(val === "1");
      setChecked(true);
    });
  }, []);

  if (!checked) return <View style={{ flex: 1, backgroundColor: "#030308" }} />;
  if (signedIn) return <Redirect href="/(tabs)" />;
  return <Redirect href="/sign-in" />;
}
