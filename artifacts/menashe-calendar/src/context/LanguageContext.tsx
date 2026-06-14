import { createContext, useContext, useState, ReactNode } from "react";
import translations, { Lang, Translations } from "../lib/translations";

interface LanguageContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "en",
  setLang: () => {},
  t: translations.en,
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

  function setLang(l: Lang) {
    setLangState(l);
    try { localStorage.setItem("menashe-language", l); } catch {}
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t: translations[lang] }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
