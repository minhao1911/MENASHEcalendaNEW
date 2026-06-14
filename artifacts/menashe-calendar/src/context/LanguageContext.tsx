import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import translations, { Lang, Translations, tk as builtInTk } from "../lib/translations";

const OVERRIDE_KEY = "menashe-tk-overrides";

function loadOverrides(): Partial<Translations> {
  try {
    const raw = localStorage.getItem(OVERRIDE_KEY);
    if (raw) return JSON.parse(raw) as Partial<Translations>;
  } catch {}
  return {};
}

function buildTk(overrides: Partial<Translations>): Translations {
  return { ...builtInTk, ...overrides };
}

interface LanguageContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Translations;
  tkOverrides: Partial<Translations>;
  setTkOverride: (key: keyof Translations, value: string) => void;
  saveTkOverrides: (overrides: Partial<Translations>) => void;
  resetTkOverrides: () => void;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "en",
  setLang: () => {},
  t: translations.en,
  tkOverrides: {},
  setTkOverride: () => {},
  saveTkOverrides: () => {},
  resetTkOverrides: () => {},
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    try {
      const saved = localStorage.getItem("menashe-language") as Lang;
      return saved === "tk" ? "tk" : "en";
    } catch {
      return "en";
    }
  });

  const [tkOverrides, setTkOverridesState] = useState<Partial<Translations>>(loadOverrides);

  const activeTk = buildTk(tkOverrides);
  const t = lang === "tk" ? activeTk : translations.en;

  function setLang(l: Lang) {
    setLangState(l);
    try { localStorage.setItem("menashe-language", l); } catch {}
  }

  const setTkOverride = useCallback((key: keyof Translations, value: string) => {
    setTkOverridesState(prev => {
      const next = { ...prev, [key]: value };
      try { localStorage.setItem(OVERRIDE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const saveTkOverrides = useCallback((overrides: Partial<Translations>) => {
    setTkOverridesState(overrides);
    try { localStorage.setItem(OVERRIDE_KEY, JSON.stringify(overrides)); } catch {}
  }, []);

  const resetTkOverrides = useCallback(() => {
    setTkOverridesState({});
    try { localStorage.removeItem(OVERRIDE_KEY); } catch {}
  }, []);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, tkOverrides, setTkOverride, saveTkOverrides, resetTkOverrides }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
