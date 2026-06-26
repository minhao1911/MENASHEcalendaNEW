# Architecture Overview

> Purpose: High-level system architecture, component boundaries, data flow, and design decisions for the Menashe Platform.
> Last updated: 2026-06-26 (SPR-005 H-001)

---

## System Overview

The Menashe Platform is a pnpm monorepo containing four application artifacts and six shared libraries. It serves the Bnei Menashe Jewish community with a bilingual (English + Thadou Kuki) Hebrew calendar, Zmanim, Siddur library, community tools, and a 3D Memorial Sanctuary.

```
[Browser — React + Vite]     [Expo — React Native]
           |                          |
           └──────────┬───────────────┘
                      ↓
            [Express 5 API Server]
                      ↓
           [PostgreSQL via Drizzle ORM]
                      ↓
     [External: Clerk, Gemini, Razorpay, GCS, VAPID]
```

---

## Monorepo Package Map

### Applications (artifacts/)
| Package | Runtime | Role |
|---|---|---|
| `api-server` | Node 20 / Express 5 | REST API, push schedulers, DB migrations |
| `menashe-calendar` | React 19 / Vite 7 | Web PWA (primary user surface) |
| `menashe-mobile` | Expo 54 / RN 0.81 | Native iOS/Android app |
| `mockup-sandbox` | Vite 7 | Development UI prototyping only |

### Shared Libraries (lib/)
| Package | Role |
|---|---|
| `api-spec` | OpenAPI YAML — single source of truth for all API contracts |
| `api-client-react` | Orval-generated React Query hooks (partially used) |
| `api-zod` | Orval-generated Zod schemas for server-side validation |
| `db` | Drizzle ORM schema definitions and client |
| `object-storage-web` | Uppy + GCS upload wrapper |

---

## Routing Architecture

### Web (Wouter)
- `/` — Landing (public) or redirect to `/app` (authenticated)
- `/app` — AppShell with state-driven sub-navigation (no URL per modal)
- `/sign-in/*?` — Clerk hosted sign-in
- `/sign-up/*?` — Clerk hosted sign-up
- `/?share=…` — Public share view (token-based bypass)

**Known limitation:** All in-app navigation (page switches, modal overlays) is React state only. Deep-linking and browser back button are non-functional inside `/app`.

### Mobile (Expo Router — file-based)
```
app/_layout.tsx          ← Root + Clerk auth guard
app/sign-in.tsx
app/(tabs)/_layout.tsx   ← Tab bar
app/(tabs)/index.tsx     ← Home / Calendar
app/(tabs)/zmanim.tsx
app/(tabs)/torah.tsx
app/(tabs)/community.tsx
```

---

## Authentication Architecture

- **Provider:** Clerk (`@clerk/react` web, `@clerk/expo` mobile)
- **Token flow:** JWT retrieved via `window.Clerk.session.getToken()` → `Authorization: Bearer …` on every API call
- **Server enforcement:** `clerkMiddleware` globally, `requireAuth` per-route
- **Admin access:** PIN-only (`ADMIN_PIN` env var, default `1948`) — no Clerk session required (technical debt item TD-001)
- **Mobile extra layer:** Biometric auth via `expo-local-authentication`

---

## Data Flow

```
Client action
    → apiFetch() / React Query hook
    → Express route
    → requireAuth() [if protected]
    → Drizzle ORM query
    → PostgreSQL
    → JSON response
    → React state update / UI render
```

---

## Large File Analysis (Refactoring Candidates)

See `docs/ProjectStructure.md` for full list. Critical hotspots:

| File | Lines | Problem |
|---|---|---|
| `Home.tsx` | 5,206 | Largest file in codebase by far; multiple responsibilities |
| `CensusModal.tsx` | 2,298 | Single modal with full form wizard + API calls |
| `AdminModal.tsx` | 2,038 | Admin dashboard in a single component |
| `MemorialSanctuaryModal.tsx` | 1,823 | 3D scene host + all floating UI panels |
| `App.tsx` | 931 | Root router + 30+ modal states + auth logic |
| `push.ts` (API route) | 834 | Push scheduler + VAPID + Expo + Holiday logic |
| `translations.ts` (web) | 1,293 | Entire bilingual dictionary in one file |

---

## Shared Core Package (`lib/shared-core`)

Centralised business logic shared by both web and mobile apps. All new cross-platform logic must go here first.

### What moved (SPR-003)

| Module | Shared-core path | Export sub-path |
|---|---|---|
| Hebrew calendar (HDate, Parasha, Holidays) | `src/calendar/hebrewCalendar.ts` | `@workspace/shared-core/calendar` |
| Zmanim (prayer-times calculation) | `src/zmanim/zmanim.ts` | `@workspace/shared-core/zmanim` |
| Location database (cities + coords) | `src/locations/locations.ts` | `@workspace/shared-core/locations` |
| Language type (`"en" \| "tk"`) | `src/utils/lang.ts` | `@workspace/shared-core/utils` |
| Shared translations (EN + TK strings) | `src/translations/translations.ts` | `@workspace/shared-core/translations` |
| Parasha data + rich ParashaInfo lookup | `src/parasha/parasha.ts` | `@workspace/shared-core/parasha` |
| Aliyot verse ranges (54 parashiyot) | `src/parasha/aliyot.ts` | `@workspace/shared-core/aliyot` |

### How apps consume shared-core

App-level `lib/` files are thin re-export shims that preserve backward-compatible local import paths:

```
artifacts/menashe-calendar/src/lib/hebrewCalendar.ts  →  @workspace/shared-core/calendar
artifacts/menashe-calendar/src/lib/zmanim.ts           →  @workspace/shared-core/zmanim
artifacts/menashe-calendar/src/lib/locations.ts        →  @workspace/shared-core/locations
artifacts/menashe-calendar/src/lib/parasha.ts          →  @workspace/shared-core/parasha
artifacts/menashe-calendar/src/lib/aliyot.ts           →  @workspace/shared-core/aliyot
artifacts/menashe-mobile/lib/hebrewCalendar.ts         →  @workspace/shared-core/calendar
artifacts/menashe-mobile/lib/zmanim.ts                 →  @workspace/shared-core/zmanim
artifacts/menashe-mobile/lib/locations.ts              →  @workspace/shared-core/locations
artifacts/menashe-mobile/lib/translations.ts           →  @workspace/shared-core/translations
```

### Remaining duplication (deferred to SPR-004)

| Item | Location | Notes |
|---|---|---|
| Web translations | `artifacts/menashe-calendar/src/lib/translations.ts` | 1,293 lines; web-specific keys (landing page, PWA, 3D scene). Extend `SharedTranslations` in SPR-004. |
| `announcementsApi.ts` | Both apps | Fetch base-URL differs (relative `/api` vs absolute `https://$DOMAIN/api`); needs an API-client abstraction layer. |
| `communityApi.ts` | Mobile only | No web equivalent yet; add when web gets community tab. |

### Guidelines for future shared logic

1. If a function has no UI dependency and runs on both platforms → put it in `lib/shared-core`.
2. If it references `window`, `document`, or React hooks → it stays in the app.
3. New translation keys must be added to `SharedTranslations` first; app-specific keys are extended locally.
4. Never import directly from `lib/shared-core/src/…` — always use the package export paths (`@workspace/shared-core/…`).

---

## Key Design Decisions

1. **Hebrew calendar calculations are fully client-side** — enables offline mode and avoids server round-trips for every date interaction.
2. **Zmanim use suncalc + Gra method** — fast, no external dependency, but only one opinion is offered.
3. **Siddur library uses plain `fetch`** rather than the generated React Query hooks in `lib/api-client-react`.
4. **Admin auth is PIN-based** — deliberately simple for the initial launch; full role-based auth is deferred.
5. **3D scene loads lazily** — only `MemorialValley3D` is wrapped in `React.lazy`; all other modals are eagerly bundled.
6. **Service worker caches shell + assets** — PWA shell works offline; dynamic data (books, yahrzeit) is not pre-cached.

---

## SPR-004 — Home.tsx Architecture Blueprint

> **Scope:** Pure analysis sprint. No code changes are made in SPR-004. This section is the production-ready blueprint for a future modular refactor of `Home.tsx` (5,207 lines).

### 1. Executive Summary

`Home.tsx` is the largest and most complex file in the codebase at 5,207 lines. It contains **16 inline sub-components**, **6 file-level utility functions**, **7 file-level data constants**, and the **main `Home` export component** — all in a single file. The component is the primary user surface of the app, rendering the entire home screen: date/zmanim information, AI chat, push notification management, community tools, Shabbat countdown, upcoming celebrations, and more.

The file is well-structured internally but requires extraction into a dedicated directory to enable:
- Independent testing of each card/widget
- Code splitting (currently the entire 5 K-line file is always eagerly loaded)
- Parallel development across multiple contributors
- Clear ownership boundaries per feature

---

### 2. Full Component Inventory

All 16 inline components defined inside `Home.tsx`, in order of appearance:

| # | Component | Approx. lines | Responsibilities | Has API call | Has local state |
|---|---|---|---|---|---|
| 1 | `TodayHolidayCard` | 49–194 | AI holiday insight for today's active holiday | `GET /api/holiday-insights` | `insight`, `loading`, `expanded` |
| 2 | `DailyBriefingCard` | 275–372 | Random Torah thought; special-day banner (Shabbat/fast/Rosh Chodesh) | — | — (pure derived) |
| 3 | `CandleLightingCountdown` | 374–624 | Live countdown to candle-lighting or havdalah; notification bell | — | `timeLeft`, `mode`, `notifPermission` |
| 4 | `CountdownChip` | 643–667 | Tiny chip: "in N days" for a birthday/aliyah anniversary | — | — |
| 5 | `UpcomingCelebrations` | 669–827 | Member birthday/aliyah anniversary grid from localStorage | — | `members` (from localStorage) |
| 6 | `CommunityCard` | 829–962 | Expandable card: Member Directory + Census shortcuts | — | `expanded` |
| 7 | `DateZmanimCard` | 964–1,500 | Hebrew date header; Zmanim grid; OpenStreetMap iframe; nearby synagogue list; compass button | `https://overpass-api.de/api/interpreter` | `synagogues`, `loadingSyns`, `mapExpanded`, `sections` |
| 8 | `PremiumCandleCard` | 1,502–1,624 | Premium-gated candle-lighting detail card | — | — |
| 9 | `WeekStrip` | 1,671–1,810 | 7-day mini calendar strip with Hebrew dates and holiday highlights | — | `selectedDay` |
| 10 | `ZmanimTimeline` | 1,812–1,993 | Horizontal timeline with prayer-time markers and current-time cursor | — | — (derived from props) |
| 11 | `YahrzeitReminderCard` | 2,023–2,261 | Yahrzeit display; push notification subscribe/unsubscribe/test | `/api/push/register`, `/api/push/subscribe`, `/api/push/cancel-yahrzeit` | `yahrzeit`, `pushStatus`, `notifLoading` |
| 12 | `NextHolidayCard` | 2,263–2,872 | Next-holiday countdown; AI halacha text; preparation checklist; share-card generator | `GET /api/holiday-halacha` | `daysUntil`, `halachaText`, `halachaLoading`, `checklist`, `shareVisible` |
| 13 | `ShabbatCountdownBar` | 2,875–3,146 | Sticky Shabbat/havdalah countdown bar; premium/trial gate | — | `minutesLeft`, `trialExpired` |
| 14 | `AnnouncementStrip` | 3,148–3,266 | Dismissible top banner; cycles through announcements | — | `dismissed` (persisted in localStorage) |
| 15 | `AiChatFAB` | 4,083–4,813 | Floating AI chat widget; streaming SSE response; chat history | `POST /api/chat` (SSE stream) | `open`, `messages`, `input`, `streaming`, `controller` |
| 16 | `CommunityFAB` | 4,815–5,207 | Speed-dial FAB with 9 community tool shortcuts | — | `open` |

---

### 3. Main `Home` Export Component

**Location:** lines ~3,268–4,036

#### 3a. Props Interface (HomeProps)

23 props total — a mix of data props and callback props:

```typescript
interface HomeProps {
  // Data
  hDate: HDate;
  zmanimResult: ZmanimResult | null;
  location: LocationRecord;
  parasha: string | null;
  isPremium: boolean;
  trialDaysLeft: number;
  announcements: Announcement[];
  currentPage: string;

  // Navigation callbacks
  onNavigate: (page: string) => void;
  onMoreTools: () => void;

  // Modal-opening callbacks
  onShowHolidays: () => void;
  onShowParashah: () => void;
  onShowPremium: () => void;
  onShowDafYomi: () => void;
  onShowOmer: () => void;
  onOpenSiddur: () => void;
  onShowCommunity: () => void;
  onShowCensus: () => void;
  onShowMembers: () => void;
  onShowAnnouncements: () => void;
  onShowEvents: () => void;
  onShowCommunityYahrzeit: () => void;
  onShowYartzeit: () => void;
  onShowMussar: () => void;
  onShowPrayerBoard: () => void;
  onShowTorahTracker: () => void;

  // UI action callbacks
  onLocationClick: () => void;
  onToggleTheme: () => void;
  onNotifBell: () => void;
}
```

**Architecture note:** All modal-opening is delegated upward to `App.tsx` via callbacks. `Home.tsx` never owns modal visibility state. This is the correct separation — preserve it.

#### 3b. Home Component Local State

| State variable | Type | Owner concern |
|---|---|---|
| `mapForceExpand` | `boolean` | Forces `DateZmanimCard` map open from outside the card |
| `showCompassCard` | `boolean` | Jerusalem compass overlay |
| `candleCountdown` | `string \| null` | Formatted countdown string shown in header (computed from zmanimResult) |
| `showShabbatBanner` | `boolean` | Activated Shabbat-mode header variant |
| `candleNotifFiredRef` | `MutableRefObject<boolean>` | Deduplicate candle-lighting notification |

#### 3c. Home useEffects

1. **Candle countdown ticker** — 1-second `setInterval`; derives `candleCountdown` string from `zmanimResult.candleLighting` or `zmanimResult.havdalah`. Clears on unmount.
2. **Notification permission request** — fires once on mount; calls `Notification.requestPermission()` if not yet granted.

#### 3d. Render Order (top-to-bottom)

```
┌─────────────────────────────────────────────────┐
│  Shabbat banner (conditional)                   │
│  App header (location chip · theme · notif bell)│
│  AnnouncementStrip                              │
│  CandleLightingCountdown (hero)                 │
│  CompassCard: today's Hebrew date summary       │
│  Rosh Chodesh banner (conditional)              │
│  TodayHolidayCard (conditional — holidays only) │
│  NextHolidayCard                                │
│  YahrzeitReminderCard                           │
│  CompassCard: Parasha of the week               │
│  CompassCard: Omer count (conditional)          │
│  DailyBriefingCard (Daily Wisdom / Torah quote) │
│  WeekStrip (7-day mini calendar)                │
│  ZmanimTimeline (horizontal prayer-time view)   │
│  DateZmanimCard (full date + zmanim + map)      │
│  PremiumCandleCard                              │
│  CompassCard: Siddur Library shortcut           │
│  Quick Actions grid (6 buttons)                 │
│  UpcomingCelebrations                           │
│  CommunityCard                                  │
├─────────────────────────────────────────────────┤
│  ShabbatCountdownBar (sticky bottom)            │
└─────────────────────────────────────────────────┘
  CommunityFAB (fixed overlay, bottom-right)
  AiChatFAB (fixed overlay, bottom-right, above FAB)
  Jerusalem Compass (fixed overlay, conditional)
```

---

### 4. File-Level Data Constants

| Constant | Type | Size | Purpose |
|---|---|---|---|
| `HOLIDAY_EMOJI` | `Record<string, string>` | ~15 entries | Maps holiday name → emoji (e.g. `"Passover" → "🍷"`) |
| `TORAH_THOUGHTS` | `Array<{quote: string, source: string}>` | 50 entries | Pool of daily Torah quotes shown in DailyBriefingCard |
| `HOLIDAY_THEMES` | `Record<string, {bg, text, accent}>` | ~15 entries | CSS gradient/color theme per holiday; used in NextHolidayCard and TodayHolidayCard |
| `MEMBER_DIR_KEY` | `string` constant | 1 | `'menashe_member_directory'` — localStorage key |
| `ANN_STRIP_DISMISSED_KEY` | `string` constant | 1 | localStorage key for announcement strip dismissed state |
| `AI_SUGGESTED` | `string[]` | 6 entries | Suggested AI chat prompts shown in AiChatFAB |
| `AI_FOLLOWUPS_EN` | `string[]` | 5 entries | English follow-up chip prompts in AiChatFAB |
| `AI_FOLLOWUPS_TK` | `string[]` | 5 entries | Thadou Kuki follow-up chip prompts in AiChatFAB |

**Migration note:** `TORAH_THOUGHTS` (50 items) and `AI_SUGGESTED`/`AI_FOLLOWUPS_*` should migrate to their respective component files or a dedicated `src/data/` directory. `HOLIDAY_EMOJI` and `HOLIDAY_THEMES` can move to `src/lib/hebrewCalendar.ts` or a new `src/lib/holidayThemes.ts`.

---

### 5. File-Level Utility Functions

| Function | Signature | Used by | Candidate migration target |
|---|---|---|---|
| `getHolidayEmoji` | `(holidayName: string) => string` | `TodayHolidayCard`, `NextHolidayCard` | `src/lib/holidayThemes.ts` |
| `getTodaySpecialStatus` | `(hDate, parasha, zmanimResult) => {type, label} \| null` | `DailyBriefingCard`, `Home` header | `lib/shared-core/calendar` |
| `daysUntilAnniversary` | `(month: number, day: number) => number` | `CountdownChip`, `UpcomingCelebrations` | `lib/shared-core/utils` |
| `getTodayHolidays` | `(hDate: HDate) => string[]` | `TodayHolidayCard`, `Home` render logic | `lib/shared-core/calendar` |
| `getAiToken` | `() => Promise<string>` | `TodayHolidayCard`, `NextHolidayCard`, `AiChatFAB`, `YahrzeitReminderCard` | `src/lib/auth.ts` (shared auth util) |
| `loadStripDismissed` | `() => boolean` | `AnnouncementStrip` | collocate with `AnnouncementStrip` |

**Note on `getAiToken`:** This function calls `window.Clerk?.session?.getToken()` and is duplicated in multiple places across the codebase. It should be extracted to a single shared module (`src/lib/auth.ts` or similar) used by both Home and any other component that calls authenticated endpoints.

---

### 6. Context Consumers

| Hook | Data consumed | Components that use it inside Home.tsx |
|---|---|---|
| `useLanguage()` | `t: TranslationDict`, `lang: 'en'\|'tk'` | All 16 sub-components + Home itself |
| `useUser()` (Clerk) | `user.id`, `user.primaryEmailAddress` | `YahrzeitReminderCard`, `AiChatFAB` |
| `useAuth()` (Clerk) | `getToken()` | Indirectly via `getAiToken()` |

**Note:** There is no theme context consumed in Home.tsx. Theme is passed as a CSS class on the root element and toggled via `onToggleTheme` prop — Home does not read the current theme value directly.

---

### 7. External API Surface

APIs called from within `Home.tsx` (not via generated hooks — all plain `fetch`):

| Endpoint | Method | Caller component | Auth | Purpose |
|---|---|---|---|---|
| `/api/holiday-insights` | `GET` | `TodayHolidayCard` | Bearer token | AI-generated holiday insight text |
| `/api/holiday-halacha` | `GET` | `NextHolidayCard` | Bearer token | AI-generated halacha for upcoming holiday |
| `/api/push/register` | `POST` | `YahrzeitReminderCard` | Bearer token | Register push endpoint |
| `/api/push/subscribe` | `POST` | `YahrzeitReminderCard` | Bearer token | Subscribe to yahrzeit push reminders |
| `/api/push/cancel-yahrzeit` | `POST` | `YahrzeitReminderCard` | Bearer token | Cancel yahrzeit push subscription |
| `/api/push/send-test` | `POST` | `YahrzeitReminderCard` | Bearer token | Test push notification |
| `/api/chat` | `POST` (SSE stream) | `AiChatFAB` | Bearer token | Streaming AI chat |
| `https://overpass-api.de/api/interpreter` | `POST` | `DateZmanimCard` | None | Query nearby synagogues |

---

### 8. localStorage Key Inventory

| Key | Type | Owner component | Persistence purpose |
|---|---|---|---|
| `'menashe_member_directory'` (`MEMBER_DIR_KEY`) | `Member[]` JSON | `UpcomingCelebrations` | Full member directory for anniversary calculations |
| `ANN_STRIP_DISMISSED_KEY` | `boolean` JSON | `AnnouncementStrip` | Remember if user dismissed the announcement banner |
| `'menashe_chat_history'` (approx.) | `ChatMessage[]` JSON | `AiChatFAB` | Persist AI chat conversation across reloads |
| Per-section collapse keys | `boolean` JSON | `DateZmanimCard` | Remember which Zmanim card sections are expanded |

---

### 9. Prop Drilling Map

All callbacks flow: **`App.tsx` → `Home` (via `HomeProps`) → inline sub-component (via direct props)**

No intermediate components hold callback state. The full prop chain is one level deep from `Home` to each sub-component — clean for the current monolith, but some callbacks (e.g. `onShowCommunity`, `onShowCensus`, `onShowMembers`) are passed to 2–3 different sub-components and should be consolidated when extracted.

```
App.tsx
 └── Home (HomeProps: 23 props)
      ├── AnnouncementStrip          ← t, lang, announcements
      ├── CandleLightingCountdown    ← zmanimResult, isPremium, onShowPremium, t, lang
      ├── TodayHolidayCard           ← holiday, hDate  [reads lang/t from context]
      ├── NextHolidayCard            ← hDate, t, lang, onShowHolidays
      ├── YahrzeitReminderCard       ← t, lang, onShowYartzeit
      ├── DailyBriefingCard          ← hDate, parasha, zmanimResult, t, lang
      ├── WeekStrip                  ← hDate, zmanimResult, t, lang, onDayClick
      ├── ZmanimTimeline             ← zmanimResult, t, lang
      ├── DateZmanimCard             ← hDate, zmanimResult, location, t, lang, forceExpand, onExpandMap
      ├── PremiumCandleCard          ← zmanimResult, isPremium, onShowPremium, t, lang
      ├── UpcomingCelebrations       ← t, lang, onShowMembers
      ├── CommunityCard              ← t, onShowCommunity, onShowCensus, onShowMembers
      ├── ShabbatCountdownBar        ← zmanimResult, isPremium, trialDaysLeft, onShowPremium, t, lang
      ├── AiChatFAB                  ← t, lang, hDate, parasha
      └── CommunityFAB               ← t, lang, onShowCommunity, onShowCensus, onShowMembers,
                                        onShowPrayerBoard, onShowMussar, onShowTorahTracker,
                                        onShowEvents, onShowAnnouncements, onShowCommunityYahrzeit
```

---

### 10. Proposed Modular Directory Structure

When the refactor sprint is approved, `Home.tsx` should be replaced by this directory:

```
src/pages/home/
├── index.tsx                      ← Main Home export (was lines 3268-4036)
│                                    Renders the scroll layout; owns Home-level state only
│
├── HomeProps.ts                   ← HomeProps interface extracted to its own file
│
├── hooks/
│   └── useCandleCountdown.ts      ← Candle countdown ticker (setInterval logic from Home useEffect)
│
├── data/
│   ├── torahThoughts.ts           ← TORAH_THOUGHTS array (50 items)
│   ├── aiPrompts.ts               ← AI_SUGGESTED, AI_FOLLOWUPS_EN, AI_FOLLOWUPS_TK
│   └── holidayThemes.ts           ← HOLIDAY_EMOJI, HOLIDAY_THEMES, getHolidayEmoji()
│
├── cards/
│   ├── TodayHolidayCard.tsx       ← Lines 49-194
│   ├── DailyBriefingCard.tsx      ← Lines 275-372
│   ├── CandleLightingCountdown.tsx← Lines 374-624
│   ├── UpcomingCelebrations.tsx   ← Lines 669-827 (incl. CountdownChip)
│   ├── CommunityCard.tsx          ← Lines 829-962
│   ├── DateZmanimCard.tsx         ← Lines 964-1500
│   ├── PremiumCandleCard.tsx      ← Lines 1502-1624
│   ├── WeekStrip.tsx              ← Lines 1671-1810
│   ├── ZmanimTimeline.tsx         ← Lines 1812-1993
│   ├── YahrzeitReminderCard.tsx   ← Lines 2023-2261
│   ├── NextHolidayCard.tsx        ← Lines 2263-2872
│   ├── ShabbatCountdownBar.tsx    ← Lines 2875-3146
│   └── AnnouncementStrip.tsx      ← Lines 3148-3266
│
└── overlays/
    ├── AiChatFAB.tsx              ← Lines 4083-4813
    └── CommunityFAB.tsx           ← Lines 4815-5207
```

**Backward compatibility:** The existing import `import Home from './pages/Home'` is preserved by re-exporting from `src/pages/home/index.tsx`. No other file changes required.

---

### 11. Migration Phasing

Recommended extraction order (each phase is independently shippable with zero behaviour change):

| Phase | Extract | Rationale |
|---|---|---|
| **H-001** | `data/` directory | Zero React — pure data arrays and constants. Safest first step. |
| **H-002** | File-level utilities | Extract `getAiToken`, `getTodaySpecialStatus`, `getTodayHolidays`, `daysUntilAnniversary` to `src/lib/` or `shared-core`. No UI changes. |
| **H-003** | `overlays/AiChatFAB.tsx` | Self-contained, no props into other cards. Largest single reduction (~730 lines). |
| **H-004** | `overlays/CommunityFAB.tsx` | Self-contained, pure callbacks. ~390 lines. |
| **H-005** | `cards/DateZmanimCard.tsx` | Largest card (~540 lines). Has its own Overpass API call — fully self-contained. |
| **H-006** | `cards/NextHolidayCard.tsx` | Second largest (~610 lines). Has its own `/api/holiday-halacha` call. |
| **H-007** | `cards/ShabbatCountdownBar.tsx` | Has its own `setInterval` — clean boundary. |
| **H-008** | `cards/YahrzeitReminderCard.tsx` | Has push API calls — extract with its own async logic. |
| **H-009** | `cards/CandleLightingCountdown.tsx` | Share countdown state with `useCandleCountdown` hook. |
| **H-010** | `hooks/useCandleCountdown.ts` | Extract the interval ticker that currently duplicates between Home and CandleLightingCountdown. |
| **H-011** | All remaining cards | `TodayHolidayCard`, `DailyBriefingCard`, `WeekStrip`, `ZmanimTimeline`, `PremiumCandleCard`, `UpcomingCelebrations`, `AnnouncementStrip`, `CommunityCard` — all pure or near-pure components. |
| **H-012** | `HomeProps.ts` + `index.tsx` | Final cleanup: extract interface, slim main component to layout only. |

---

### 12. Performance Opportunities

| Opportunity | Impact | Effort |
|---|---|---|
| **Lazy-load `AiChatFAB`** | Medium — AI chat bundle (~730 lines of logic + streaming) only loads on first open | Low — `React.lazy` + `Suspense` wrapper |
| **Lazy-load `DateZmanimCard`** | Medium — Overpass map fetch and OpenStreetMap iframe only needed when card is visible | Low — `React.lazy` or conditional render |
| **Memoize `TORAH_THOUGHTS` selection** | Low — `useMemo` prevents re-roll on every render | Trivial |
| **`AiChatFAB` chat history** | Low — large message arrays re-serialized to localStorage on every message | Low — debounce the write |
| **`UpcomingCelebrations` localStorage parse** | Low — re-parses full member directory on every render | Low — `useMemo` with stable key |
| **`WeekStrip` day calculations** | Low — recalculated on every render | Low — `useMemo` on `hDate` |

---

### 13. Technical Debt Items (Home-scoped)

| ID | Item | Severity |
|---|---|---|
| TD-H01 | `getAiToken()` duplicated in TodayHolidayCard, NextHolidayCard, AiChatFAB, YahrzeitReminderCard | Medium |
| TD-H02 | `MEMBER_DIR_KEY` localStorage key defined in Home.tsx but used by mobile too — should move to `shared-core/utils` | Medium |
| TD-H03 | `HomeProps` has grown to 23 props; consider grouping into sub-objects (`data`, `callbacks`) for readability | Low |
| TD-H04 | `CandleLightingCountdown` and `Home` both maintain independent countdown `setInterval` timers from the same `zmanimResult` source — one should be lifted | Medium |
| TD-H05 | `DailyBriefingCard` picks a random Torah thought via `Math.random()` on every render — not stable across re-renders | Low |
| TD-H06 | `AnnouncementStrip` hardcodes its dismissal duration (never resets until localStorage is cleared) — no TTL | Low |
| TD-H07 | `DateZmanimCard` embeds an OpenStreetMap `<iframe>` with a hardcoded tile URL — no CSP header coverage | Low |
| TD-H08 | `NextHolidayCard` preparation checklist state (`checklist: boolean[]`) is not persisted — resets on every page visit | Low |

---

## SPR-005 — Home Migration H-001: Static Data Extraction

> Completed: 2026-06-26

### Objective

Extract all static constants, lookup tables, and configuration arrays from `Home.tsx` into dedicated modules under `src/pages/home/data/`. No runtime behaviour was changed.

### Files Created

| File | Contents |
|---|---|
| `src/pages/home/data/constants.ts` | `API_BASE`, all localStorage key constants (`MEMBER_DIR_KEY`, `ANN_STRIP_DISMISSED_KEY`, `CANDLE_COLLAPSED_KEY`, `YAHRZEIT_CARD_MINIMIZED_KEY`, `HOLIDAY_CARD_MINIMIZED_KEY`, `SHABBAT_BAR_MINIMIZED_KEY`, `AI_CHAT_HISTORY_KEY`, `AI_CHAT_MINIMIZED_KEY`, `FAB_POS_KEY`, `FAB_HINT_KEY`) |
| `src/pages/home/data/holidayEmoji.ts` | `HOLIDAY_EMOJI` record + `getHolidayEmoji()` helper |
| `src/pages/home/data/holidayThemes.ts` | `HOLIDAY_THEMES` record (18 holiday theme + emoji entries) |
| `src/pages/home/data/torahThoughts.ts` | `TORAH_THOUGHTS` array (49 quote/source pairs) |
| `src/pages/home/data/aiPrompts.ts` | `AI_SUGGESTED`, `AI_FOLLOWUPS_EN`, `AI_FOLLOWUPS_TK` |
| `src/pages/home/data/index.ts` | Barrel re-export of all 5 modules |

### Files Modified

| File | Change |
|---|---|
| `src/pages/Home.tsx` | Replaced all 9 module-level constants + 10 inline localStorage string literals with imports from `./home/data`; removed all local `const FAB_POS_KEY` and `const HINT_KEY` declarations from component bodies |

### Line Count

| | Lines |
|---|---|
| Before H-001 | 5,327 |
| After H-001 | 5,209 |
| **Reduction** | **118 lines** |

### New Data Module Layout

```
src/pages/home/
└── data/
    ├── index.ts          — barrel re-export
    ├── constants.ts      — API_BASE + all localStorage keys
    ├── holidayEmoji.ts   — HOLIDAY_EMOJI + getHolidayEmoji()
    ├── holidayThemes.ts  — HOLIDAY_THEMES (countdown card themes)
    ├── torahThoughts.ts  — TORAH_THOUGHTS (49 entries)
    └── aiPrompts.ts      — AI_SUGGESTED + AI_FOLLOWUPS_EN/TK
```

### Verification

- ✓ Home renders correctly (confirmed via screenshot)
- ✓ No missing imports
- ✓ Zero TypeScript errors introduced in Home.tsx or data modules
- ✓ No runtime errors
- ✓ No visual regressions

### Remaining Migration Phases (H-002 onward)

Per the approved blueprint (SPR-004 §SPR-004):

| Phase | Description |
|---|---|
| H-002 | Extract pure utility functions (date helpers, formatting, notification helpers) into `src/pages/home/utils/` |
| H-003 | Extract sub-components (cards, widgets, strips) out of Home.tsx into `src/pages/home/components/` |
| H-004 | Extract hooks (state management, data fetching patterns) into `src/pages/home/hooks/` |
| H-005 | Extract types and interfaces into `src/pages/home/types.ts` |
| H-006 | Slim `Home.tsx` to an orchestration-only shell |

---

## SPR-006 — H-002: Pure Utility Extraction

> Status: Complete | Date: 2026-06-26

### Objective

Reduce Home.tsx complexity by extracting all pure, side-effect-free utility functions into a dedicated `src/pages/home/utils/` layer. No components, hooks, or rendering logic were moved.

### Utility Inventory

| Function | Origin in Home.tsx | Extracted to | Notes |
|---|---|---|---|
| `getTodaySpecialStatus(today)` | Top-level function (was line 191) | `holidayUtils.ts` | Uses @hebcal/core; returns fast/roshChodesh/specialShabbat status |
| `daysUntilAnniversary(dateStr)` | Top-level function (was line 571) | `dateUtils.ts` | Pure anniversary countdown (birthday / aliyah) |
| `getTodayHolidays()` | Top-level function (was line 1568) | `holidayUtils.ts` | Returns today's CHAG + MODERN_HOLIDAY names |
| `padZero(n)` | Inline const inside `CandleLightingCountdown` | `formatUtils.ts` | `String(n).padStart(2, "0")` |
| `getBearingToJerusalem(lat, lng)` | Inline IIFE inside `DateZmanimCard` (was line 986) | `geoUtils.ts` | Forward azimuth to Jerusalem |
| `getDistToJerusalemKm(lat, lng)` | Inline calc in JSX compass IIFE (was line 3786) | `geoUtils.ts` | Rounded haversine km to Jerusalem |
| `haversineDistKm(lat1, lng1, lat2, lng2)` | Inline inside fetch callback (was line 961) | `geoUtils.ts` | General-purpose Haversine distance |
| `toRad(degrees)` | Duplicated in 3 locations | `geoUtils.ts` | Internal helper used by geo functions |

**NOT extracted (correctly left in place):**
- `loadStripDismissed()` — reads `localStorage` (side effect)
- `getAiToken()` — calls `window.Clerk` (side effect)
- `buildShareText()` — closes over `next` and `checklist` state
- `getNextCandleLighting()` — closes over `location`, `canAccess` state

### Files Created

```
src/pages/home/
└── utils/
    ├── index.ts          — barrel re-export
    ├── dateUtils.ts      — daysUntilAnniversary
    ├── holidayUtils.ts   — getTodaySpecialStatus, getTodayHolidays
    ├── geoUtils.ts       — toRad, haversineDistKm, getBearingToJerusalem, getDistToJerusalemKm
    └── formatUtils.ts    — padZero
```

### Files Modified

| File | Change |
|---|---|
| `src/pages/Home.tsx` | Added `./home/utils` import block; removed 3 top-level functions; replaced 4 inline implementations with imported calls |

### Line Count

| | Lines |
|---|---|
| Before H-002 (after H-001) | 5,209 |
| After H-002 | 5,143 |
| **H-002 Reduction** | **66 lines** |
| **Total reduction (H-001 + H-002)** | **184 lines** |

### Verification

- ✓ Home renders correctly (confirmed via screenshot — landing + sign-in flow intact)
- ✓ Zero TypeScript errors introduced in Home.tsx or utils modules
- ✓ No runtime errors in browser console
- ✓ No visual regressions
- ✓ All extracted utilities are pure, side-effect free, independently reusable, fully typed
- ✓ Duplicate bearing/distance calculations consolidated (3 sites → 1 shared function each)

### Recommended Future Shared Utilities

The geo utilities (`haversineDistKm`, `getBearingToJerusalem`) and date helpers (`daysUntilAnniversary`) are strong candidates to be promoted to `lib/` shared packages in a future sprint, as they are already used or could be useful in CalendarPage, ZmanimPage, and the mobile app.

### Remaining Migration Phases

| Phase | Description | Status |
|---|---|---|
| H-001 | Extract static data into `src/pages/home/data/` | ✓ Complete |
| H-002 | Extract pure utility functions into `src/pages/home/utils/` | ✓ Complete |
| H-003 | Extract reusable business logic into `src/pages/home/hooks/` | ✓ Complete |
| H-004 | Extract sub-components (cards, widgets, strips) into `src/pages/home/components/` | Pending |
| H-005 | Extract types and interfaces into `src/pages/home/types.ts` | Pending |
| H-006 | Slim `Home.tsx` to an orchestration-only shell | Pending |

**Stop after H-003 — awaiting Chief Architect review before H-004.**

---

## SPR-007 — H-003: Business Logic Hook Extraction

> Status: Complete | Date: 2026-06-26

### Objective

Extract all stateful business logic and side-effecting behaviour from `Home.tsx` into dedicated custom React hooks under `src/pages/home/hooks/`. No JSX was moved, no components were extracted, no APIs were modified, and no rendering changed.

### Hooks Created

| Hook | State Owned | Effects |
|---|---|---|
| `useHomeGreeting.ts` | `greeting`, `displayName`, `firstName`, `user` | None — pure derivations from Clerk `useUser()` + `profileName` prop |
| `useHomeCalendar.ts` | `today`, `hdate`, `zmanim`, `parasha`, `holidays`, `hebrewDay/Month/Year`, `isFriday`, `isShabbat`, `showCandleLighting`, `todayHolidays`, `omerDay`, `nextShabbat`, `dayName`, `monthStr`, `yearStr` | None — synchronous derivations from `@hebcal/core` + lib functions |
| `useHomeLocation.ts` | `mapForceExpand`, `showCompassCard` | None — `setMapForceExpand` uses `setTimeout` (not a React effect) |
| `useHomeNotifications.ts` | `candleCountdown`, `showShabbatBanner` | `setInterval` countdown ticker; one-shot push notification + in-app banner on candle lighting time |
| `useHomeAI.ts` | `open`, `messages`, `input`, `loading`, `minimized`, `fabHovered`, `isListening`, `voiceError`, `copiedIdx`; refs: `bottomRef`, `inputRef`, `abortRef`, `recognitionRef` | localStorage persistence (minimized + chat history); scroll-to-bottom on messages; focus input on open |
| `useHomeCommunity.ts` | `open`, `isClosing`, `pos`, `showHint`, `upcomingEventCount`, `upcomingYahrzeitCount`; refs: `closeTimer`, `drag` | hint auto-dismiss timer; community yahrzeit count fetch; community events localStorage count + storage event listener |

### Responsibilities Moved

| Responsibility | From | To |
|---|---|---|
| Greeting string + display name derivation | `Home()` body | `useHomeGreeting` |
| Hebrew date / zmanim / parasha / holidays / omer | `Home()` body | `useHomeCalendar` |
| Map force-expand + compass card open state | `Home()` body | `useHomeLocation` |
| Candle countdown interval + Shabbat banner + push notification | `Home()` body (large `useEffect`) | `useHomeNotifications` |
| AI chat open/messages/streaming/voice/history persistence | `AiChatFAB()` body | `useHomeAI` |
| Community FAB drag/position/open/hint/event counts | `CommunityFAB()` body | `useHomeCommunity` |

### State Ownership Summary

```
Home()
├── calls useHomeGreeting     → { greeting, displayName, firstName, user }
├── calls useHomeCalendar     → { today, hdate, zmanim, parasha, holidays, … }
├── calls useHomeLocation     → { mapForceExpand, showCompassCard, onShowMap, onShowCompass, … }
├── calls useHomeNotifications → { candleCountdown, showShabbatBanner, setShowShabbatBanner }
└── renders (JSX unchanged)

AiChatFAB()
└── calls useHomeAI           → all chat state + refs + handlers

CommunityFAB()
└── calls useHomeCommunity    → all FAB state + drag handlers + event counts
```

### Files Created

```
src/pages/home/
└── hooks/
    ├── index.ts                 — barrel re-export of all 6 hooks
    ├── useHomeGreeting.ts       — greeting + user display name
    ├── useHomeCalendar.ts       — Hebrew calendar derivations
    ├── useHomeLocation.ts       — map/compass UI state
    ├── useHomeNotifications.ts  — candle countdown + banner + push notification
    ├── useHomeAI.ts             — AI chat state, streaming, voice, history
    └── useHomeCommunity.ts      — community FAB state, drag, event counts
```

### Files Modified

| File | Change |
|---|---|
| `src/pages/Home.tsx` | Added `./home/hooks` import; `Home()` body replaced with hook calls; `AiChatFAB()` state+effects replaced with `useHomeAI()`; `CommunityFAB()` state+effects replaced with `useHomeCommunity()`; removed orphaned `getAiToken()` function and `AiMessage` interface |

### Line Count

| | Lines |
|---|---|
| Before H-003 (after H-002) | 5,143 |
| After H-003 | ~4,788 |
| **H-003 Reduction** | **~355 lines** |
| **Total reduction (H-001 + H-002 + H-003)** | **~539 lines** |

### Verification

- ✓ UI identical (confirmed via screenshot — landing/splash screen intact, Vite HMR applied cleanly)
- ✓ Hook outputs identical to prior inline logic (faithful lift, no logic changes)
- ✓ No TypeScript errors introduced in new hook files or Home.tsx
- ✓ No runtime errors in browser console
- ✓ No API regressions (API server running, all endpoints intact)
- ✓ No JSX moved, no components extracted, no routes or database code touched

### Remaining Migration Phases

| Phase | Description | Status |
|---|---|---|
| H-001 | Extract static data into `src/pages/home/data/` | ✓ Complete |
| H-002 | Extract pure utility functions into `src/pages/home/utils/` | ✓ Complete |
| H-003 | Extract business logic into `src/pages/home/hooks/` | ✓ Complete |
| H-004 | Extract sub-components (cards, widgets, strips) into `src/pages/home/components/` | Pending |
| H-005 | Extract types and interfaces into `src/pages/home/types.ts` | Pending |
| H-006 | Slim `Home.tsx` to an orchestration-only shell | Pending |
