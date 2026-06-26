# Architecture Overview

> Purpose: High-level system architecture, component boundaries, data flow, and design decisions for the Menashe Platform.
> Last updated: 2026-06-26 (SPR-003)

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
