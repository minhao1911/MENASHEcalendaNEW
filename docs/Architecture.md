# Architecture Overview

> Purpose: High-level system architecture, component boundaries, data flow, and design decisions for the Menashe Platform.
> Last updated: 2026-06-26 (SPR-001)

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

## Duplicate Logic

See `docs/ProjectStructure.md` Task 4 for full registry.

Core duplication: `zmanim.ts`, `hebrewCalendar.ts`, `translations.ts`, `locations.ts`, and `announcementsApi.ts` are all manually duplicated between `artifacts/menashe-calendar/src/lib/` and `artifacts/menashe-mobile/lib/`.

**Resolution path:** Extract to `packages/shared/` (see proposed structure in `docs/ProjectStructure.md`).

---

## Key Design Decisions

1. **Hebrew calendar calculations are fully client-side** — enables offline mode and avoids server round-trips for every date interaction.
2. **Zmanim use suncalc + Gra method** — fast, no external dependency, but only one opinion is offered.
3. **Siddur library uses plain `fetch`** rather than the generated React Query hooks in `lib/api-client-react`.
4. **Admin auth is PIN-based** — deliberately simple for the initial launch; full role-based auth is deferred.
5. **3D scene loads lazily** — only `MemorialValley3D` is wrapped in `React.lazy`; all other modals are eagerly bundled.
6. **Service worker caches shell + assets** — PWA shell works offline; dynamic data (books, yahrzeit) is not pre-cached.
