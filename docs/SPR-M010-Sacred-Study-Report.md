# SPR-M010 — Sacred Study Experience (Mobile V1)

Status: **Complete — gap-fill pass**. The Sacred Study hub was already built (screen:
`artifacts/menashe-mobile/app/(tabs)/torah.tsx`) before this spec revision landed. This
document records what already existed, what was added to close the remaining gaps
against the revised spec, and the verification evidence for each spec requirement.

No web app, API, or database code was touched. No Torah/Siddur/Parashah/Daf Yomi
calculation engine was duplicated — the screen consumes the existing shared-core
libraries (`lib/hebrewCalendar.ts`, `lib/dafYomi.ts`, `lib/siddurApi.ts`) exactly as
before.

## 1. Folder tree (Sacred Study surface only)

```
artifacts/menashe-mobile/
├── app/
│   ├── (tabs)/
│   │   └── torah.tsx            Sacred Study hub screen (spec sections 1-8)
│   ├── daf-yomi.tsx             Daf Yomi detail screen
│   ├── siddur.tsx               Siddur / prayer library screen
│   ├── mussar.tsx               Mussar / reflection reading screen
│   └── torah-tracker.tsx        Torah reading progress tracker
├── src/mobile/
│   ├── components/cards/ParashaCard.tsx   Reusable MMDL Parashah card (available, opt-in)
│   ├── design-system/                     Theme tokens, useReducedMotion, a11y helpers
│   └── types/screens.ts                   Route registry
├── lib/
│   ├── hebrewCalendar.ts        Shared-core wrapper (Hebrew date, Parashah)
│   ├── dafYomi.ts               Shared-core wrapper (Daf Yomi)
│   └── siddurApi.ts             Shared-core wrapper (Siddur content)
└── context/LanguageContext.tsx  EN / TK translations (`useLanguage()`)
```

No new screens or navigation routes were added — the hub and its four drill-down
screens already covered the full spec surface.

## 2. Screen architecture

`torah.tsx` is a single-scroll hub composed of 8 sections rendered in this order:

1. **Hero** — greeting + date context, now with a large Star-of-David watermark motif
   (added this pass) instead of a plain gradient.
2. **Continue Learning** — resumes the user's last reading position.
3. **Weekly Parashah** — summary, reading time estimate, "Continue Study" CTA.
4. **Today's Daf Yomi** — current daf reference, links to `daf-yomi.tsx`.
5. **Siddur** — Morning / Afternoon / Evening prayer cards, links to `siddur.tsx`.
6. **Torah Insights** — expandable insight cards.
7. **Reflection** — a rotating quiet quote/mussar excerpt.
8. **Study Collections** — grid linking to Torah, Parashah, Daf Yomi, Siddur, Prayer,
   and Learning Library.

Each section is driven entirely by shared-core data (no mock/duplicated content).

## 3. Component reuse report

| Spec requirement | Reused from | Notes |
|---|---|---|
| Hebrew date / calendar math | `lib/hebrewCalendar.ts` (Shared Core) | No duplication |
| Daf Yomi data | `lib/dafYomi.ts` (Shared Core) | No duplication |
| Siddur content | `lib/siddurApi.ts` (Shared Core) | No duplication |
| Theming (colors, spacing, gold token) | `src/mobile/design-system` | `GOLD` token shared with rest of app |
| Reduce-motion entrance animation | `useReducedMotion()` (design-system) | Honors OS accessibility setting |
| Bilingual strings | `useLanguage()` / `lib/translations.ts` | All hub copy already routed through `t.*` |
| Card visuals | Inline hub-specific markup (Parashah/Siddur cards) | `ParashaCard.tsx` exists as an MMDL component but is not the one used in the hub — left untouched, no behavior change made |

No new engines, calculators, or duplicate data-fetching logic were introduced.

## 4. Reading experience report (gap closed this pass)

- **Comfortable reading width**: the hub's scroll content is now constrained to a
  `640px` max width, centered (`alignSelf: "center"`), so text never stretches
  edge-to-edge on tablets or large-screen devices. Phones are unaffected (screen
  width is always below the cap).
- **Dynamic Type / font scaling**: unaffected by this change — the app does not
  globally disable `allowFontScaling`; the design system only disables it on a
  documented, narrow allowlist (see `src/mobile/design-system/accessibility/index.ts`)
  for icon-glyph-adjacent labels, not body/reading text.

## 5. Animation summary

- Hero and section entrances use the existing MEL-style staged fade/slide, gated by
  `useReducedMotion()` — unchanged this pass.
- New hero watermark (Star of David, `Feather` icon at low opacity) is a static
  decorative layer with `pointerEvents="none"`; it does not animate and does not add
  any additional animated nodes, so it has no performance or reduced-motion impact.

## 6. Performance report

- No new network calls, list re-renders, or state were introduced by this pass.
- The watermark is a single vector icon (`Feather`), not a rasterized image asset —
  no additional bundle size or image-decode cost.
- The reading-width constraint is a pure layout style change (`maxWidth`/`alignSelf`)
  with no re-render or measurement cost.

## 7. Accessibility report

- Hero watermark is `pointerEvents="none"` and purely decorative — it is not exposed
  to screen readers and does not sit in the focus/reading order.
- Existing VoiceOver/TalkBack labels on interactive elements (CTAs, cards, expandable
  insights) were not modified and remain intact.
- Reduce-motion support (`useReducedMotion()`) continues to gate all entrance
  animation as before.

## 8. Verification checklist

- [x] Sacred Study hub renders all 8 spec sections (pre-existing, confirmed by code
      read of `torah.tsx`).
- [x] Hero includes large inspirational artwork (added: Star-of-David watermark).
- [x] Reading content respects a comfortable max width on large screens (added).
- [x] No web app files modified.
- [x] No API routes or database schema modified.
- [x] No duplication of Torah/Siddur/Parashah/Daf Yomi calculation logic — all data
      continues to flow through existing shared-core wrappers.
- [x] No Community/AI/Settings/Notifications/Widgets work performed (out of scope
      per spec).
- [x] All UI copy already routed through `useLanguage()` / `t.*`; no new hardcoded
      English-only strings were added (the two additions in this pass — watermark,
      width constraint — are non-textual/layout-only).
- [x] `tsc --noEmit` shows zero new errors introduced in `torah.tsx` (verified against
      a clean baseline; remaining project-wide TS errors are pre-existing and outside
      this screen).
- [x] All 6 workflows (`Start application`, `API Server`, `Mobile App`, and their
      `artifacts/*` counterparts) run without errors after the change.
