import { createRoot } from "react-dom/client";
import { useState, useCallback } from "react";
import { Router as WouterRouter } from "wouter";
import App from "./App";
import SplashScreen from "./components/SplashScreen";
import OnboardingFlow, { hasSeenOnboarding } from "./components/OnboardingFlow";
import OfflineBanner from "./components/OfflineBanner";
import "./index.css";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

/* Register service worker on startup so offline caching is active
   immediately — independent of whether push notifications are enabled. */
if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register(`${import.meta.env.BASE_URL}sw.js`, {
      scope: import.meta.env.BASE_URL,
    })
    .catch(() => {});
}

function Root() {
  const [splashDone, setSplashDone] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(() => hasSeenOnboarding());

  const onSplashFinished = useCallback(() => setSplashDone(true), []);
  const onOnboardingFinished = useCallback(() => setOnboardingDone(true), []);

  return (
    <>
      <OfflineBanner />
      {!splashDone && <SplashScreen onFinished={onSplashFinished} />}
      {splashDone && !onboardingDone && (
        <OnboardingFlow onFinished={onOnboardingFinished} />
      )}
      <App />
    </>
  );
}

createRoot(document.getElementById("root")!).render(
  <WouterRouter base={basePath}>
    <Root />
  </WouterRouter>
);
