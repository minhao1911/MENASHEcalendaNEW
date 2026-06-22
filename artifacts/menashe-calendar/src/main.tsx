import { createRoot } from "react-dom/client";
import { useState, useCallback } from "react";
import App from "./App";
import SplashScreen from "./components/SplashScreen";
import "./index.css";

function Root() {
  const [splashDone, setSplashDone] = useState(false);
  const onFinished = useCallback(() => setSplashDone(true), []);

  return (
    <>
      {!splashDone && <SplashScreen onFinished={onFinished} />}
      <App />
    </>
  );
}

createRoot(document.getElementById("root")!).render(<Root />);
