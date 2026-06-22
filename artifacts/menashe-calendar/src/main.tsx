import { createRoot } from "react-dom/client";
import { useState, useCallback } from "react";
import App from "./App";
import SplashScreen from "./components/SplashScreen";
import OnboardingFlow, { hasSeenOnboarding } from "./components/OnboardingFlow";
import "./index.css";

function Root() {
  const [splashDone, setSplashDone] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(() => hasSeenOnboarding());

  const onSplashFinished = useCallback(() => setSplashDone(true), []);
  const onOnboardingFinished = useCallback(() => setOnboardingDone(true), []);

  return (
    <>
      {!splashDone && <SplashScreen onFinished={onSplashFinished} />}
      {splashDone && !onboardingDone && (
        <OnboardingFlow onFinished={onOnboardingFinished} />
      )}
      <App />
    </>
  );
}

createRoot(document.getElementById("root")!).render(<Root />);
