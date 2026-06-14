---
name: Bilingual system (EN + TK)
description: How the English / Thadou Kuki language toggle works across the app
---

## Rule
All UI text must be added to `artifacts/menashe-calendar/src/lib/translations.ts` in both `en` and `tk` objects, then consumed via `useLanguage()` from `src/context/LanguageContext.tsx`. Never hardcode English-only strings in components.

**Why:** The Bnei Menashe community speaks Thadou Kuki. The user has explicitly requested that the app's entire UI switch to Thadou Kuki when the user prefers it.

**How to apply:**
1. Add a key to the `Translations` interface in `translations.ts`
2. Add English value to the `en` object and Thadou Kuki value to the `tk` object
3. In the component, call `const { t } = useLanguage()` and use `t.yourKey`
4. The language preference is persisted in `localStorage` as `"menashe-language"` = `"en"` | `"tk"`

## Surfaces already translated
- Landing page: nav, hero, features, Sign In button
- BottomNav: Home / Calendar / Zmanim / Siddur / Settings labels
- SettingsPage: all section headers, row labels, push notification buttons, tools, account

## Language switcher locations
- Landing nav: EN | TK pill in top-right corner (visible before sign-in)
- Settings > Appearance: "Thadou Kuki Language" toggle (EN ←→ TK) — persists across sessions
