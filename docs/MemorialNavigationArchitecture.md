# Memorial Navigation Architecture

> **Document type:** Read-only architecture map — no code changes.
> **Date:** 2026-06-28
> **Scope:** Web app (`artifacts/menashe-calendar`) + API server (`artifacts/api-server`)

---

## 1. Complete Feature Inventory

### 1A. Memorial Hub Page — Profile Browser
**File:** `src/features/memorial/pages/MemorialSanctuaryPage.tsx`
**Activates via:** `activePage === "memorial"` (when `memorialSlug` is `null`)

A full-page browse/search interface for finding and exploring individual memorial profiles. NOT the 3D experience despite the name "Memorial Sanctuary Page."

**What it contains:**
- `SanctuaryHero` — search bar + CTA to enter 3D world
- Featured / recent / community-picks portrait strips (`PortraitCard` grid)
- `SanctuaryWorldPreview` — static 3D preview teaser
- "Enter the 3D Sanctuary" button → `onEnter3D()` → ⚠️ **BROKEN** (see §5)

---

### 1B. Memorial Profile Page — Individual Memorial
**File:** `src/features/memorial/pages/MemorialProfilePage.tsx` (~1380 lines)
**Activates via:** `activePage === "memorial"` AND `memorialSlug !== null`

A deep-dive page for a single deceased person's memorial record.

**What it contains:**
- Full name, dates, photo, biography
- Next yahrzeit countdown (computed client-side via `@hebcal/core`)
- **Candle lighting** — inline bottom-sheet (`CandleSheet`)
- **Tributes** — inline bottom-sheet (`TributeSheet`)
- Photo gallery
- Family management (invite members, roles: admin / member / viewer)
- Privacy controls (public / family-only / private)

---

### 1C. Memorial Sanctuary Modal — 3D Interactive Valley
**File:** `src/modals/MemorialSanctuaryModal.tsx` (~1955 lines)
**Activates via:** Rendered internally inside `CommunityYahrzeitModal` when user taps "Enter 3D Valley"

The immersive 3D experience built on React Three Fiber.

**What it contains:**
- `MemorialValley3D` (R3F canvas) — lazy-loaded via `React.lazy()`
- Scene tabs: `valley | garden | waterfall | sanctuary | sunset`
- Virtual candle placement in 3D space (capped at `MAX_VIRTUAL_FLOWERS = 40`)
- Virtual flowers
- `MinimapOverlay` (PUBG-style map — borrowed from `features/memorial/components/`)
- Ambient audio engine (brown-noise + pentatonic drones, Web Audio API)
- `R3FErrorBoundary` safety net
- `SanctuaryHomePanel` (scene selector + info)
- `LightCandleForm` (adds candle to community yahrzeit data)
- `MemorialProfileSheet` (view a profile from within 3D)

---

### 1D. Community Yahrzeit / Memorial Board
**File:** `src/modals/CommunityYahrzeitModal.tsx` (~826 lines)
**Activates via:** `modal === "community-yahrzeit"`

A community-wide board of remembered souls with candle lighting and Torah dedication.

**What it contains:**
- Board view: all lit-candle entries with active learners
- Form view: add a new yahrzeit entry (Hebrew date picker, donor name, message)
- Donation tiers (₹0 / ₹108 / ₹360 / ₹1080) linked to Razorpay
- "Dedicate Learning" flow — attach a learner to an entry
- **"Enter 3D Valley" button** → renders `MemorialSanctuaryModal` inline
- Imports and mounts `MemorialSanctuaryModal` as a child component

---

### 1E. Personal Yahrzeit Calculator
**File:** `src/modals/YartzeitModal.tsx` (~483 lines)
**Activates via:** `modal === "yartzeit"` *(note: misspelled key — should be "yahrzeit")*

A personal tool for calculating the Hebrew anniversary of a person's passing.

**What it contains:**
- Gregorian → Hebrew date conversion (uses `suncalc` for sunset check)
- Saved personal entries (synced to server via `userApi`)
- Next yahrzeit date + countdown
- "Community Board" button → `onCommunityBoard()` → opens `CommunityYahrzeitModal`

---

### 1F. Candles (two separate systems)

| System | Where | Backed by |
|---|---|---|
| **Profile Candles** | `MemorialProfilePage` → `CandleSheet` | `/api/memorials/:id/candles` (Drizzle, `memorial_candles` table) |
| **Community Candles** | `CommunityYahrzeitModal` + `MemorialSanctuaryModal` | `/api/yahrzeit` + `community_yahrzeit` table (raw SQL) |

These are **two completely independent data systems** with no shared tables or API routes.

---

### 1G. Tributes
**File:** `src/features/memorial/hooks/useTributes.ts`
**API:** `POST /api/memorials/:id/tributes`
**Only appears in:** `MemorialProfilePage`

Text messages, prayers, or dedications left on an individual memorial profile. Stored in `memorial_tributes` table.

---

### 1H. 3D Engine Components
**Files:**
- `src/components/MemorialValley3D.tsx` — R3F scene root, scene graph, camera, lighting
- `src/scene/` — supporting R3F modules (loaders, lighting, post-processing, environment, quality context)
- `src/components/BurningCandle.tsx` — animated candle flame component (used in both 2D and 3D contexts)

---

## 2. Entry Points — Where Each Feature is Accessed From

| Feature | Entry Point | Trigger |
|---|---|---|
| Memorial Hub Page | More Tools Modal → "Memorial Sanctuary" | `onMemorial` → `setActivePage("memorial")` |
| Memorial Profile Page | Memorial Hub Page → portrait card tap | `onSelectMemorial(slug)` → `setMemorialSlug(slug)` |
| Community Yahrzeit Board | Home.tsx → `onShowCommunityYahrzeit` | `setModal("community-yahrzeit")` |
| Community Yahrzeit Board | YartzeitModal → "Community Board" button | `onCommunityBoard` → `setModal("community-yahrzeit")` |
| Community Yahrzeit Board | CommunityModal → "Yahrzeit Board" link | `onYahrzeitBoard` → `setModal("community-yahrzeit")` |
| 3D Memorial Valley | CommunityYahrzeitModal → "Enter 3D Valley" | Renders `MemorialSanctuaryModal` as child |
| 3D Memorial Valley | Memorial Hub Page → "Enter 3D Sanctuary" | ⚠️ `setModal("memorial-3d" as any)` — **BROKEN** |
| Personal Yahrzeit Calculator | More Tools Modal → "Yahrzeit Calculator" | `onYartzeit` → `setModal("yartzeit")` |
| Personal Yahrzeit Calculator | Settings Page → Yahrzeit link | `onYartzeit` → `setModal("yartzeit")` |
| Personal Yahrzeit Calculator | Home.tsx → `onShowYartzeit` | `setModal("yartzeit")` |
| Profile Candles | Memorial Profile Page → "Light a Candle" | Inline `CandleSheet` bottom-sheet |
| Profile Tributes | Memorial Profile Page → "Add Tribute" | Inline `TributeSheet` bottom-sheet |
| Community Candles | CommunityYahrzeitModal → candle icon | `POST /api/yahrzeit/:id/light` |

---

## 3. Full Navigation Tree

```
/ (Landing)
└── Sign In → /app (AppShell — signed-in gate)
    │
    ├── Bottom Nav
    │   ├── 🏠 Home
    │   ├── 📅 Calendar
    │   ├── 🕰 Zmanim
    │   ├── 📚 Siddur
    │   └── ⚙️ Settings
    │       └── "Yahrzeit" link → modal "yartzeit"
    │
    ├── activePage = "memorial"
    │   ├── [memorialSlug = null] → MemorialSanctuaryPage (Hub)
    │   │   ├── Search bar → portrait results → tap → setMemorialSlug(slug)
    │   │   ├── Portrait strip cards → tap → setMemorialSlug(slug)
    │   │   │
    │   │   └── [memorialSlug set] → MemorialProfilePage
    │   │       ├── "Light a Candle" → CandleSheet (inline)
    │   │       │   └── POST /api/memorials/:id/candles
    │   │       ├── "Add Tribute" → TributeSheet (inline)
    │   │       │   └── POST /api/memorials/:id/tributes
    │   │       ├── Photos gallery
    │   │       │   └── GET /api/memorials/:id/photos
    │   │       └── Family management
    │   │           └── POST /api/memorials/:id/family/invite
    │   │
    │   └── "Enter 3D Sanctuary" button
    │       └── setModal("memorial-3d" as any)
    │           └── ⚠️ DEAD PATH — "memorial-3d" is not in Modal union type;
    │               no condition in App.tsx renders anything for this value
    │
    ├── modal = "more" → MoreToolsModal
    │   ├── 🕯 "Yahrzeit Calculator" → modal "yartzeit"
    │   │   └── YartzeitModal
    │   │       ├── Hebrew date calculator (client-side)
    │   │       ├── Saved personal entries (server-synced)
    │   │       └── "Community Board" → modal "community-yahrzeit"
    │   │
    │   └── 🕍 "Memorial Sanctuary" → setActivePage("memorial") + setModal(null)
    │       └── (see MemorialSanctuaryPage branch above)
    │
    ├── modal = "community-yahrzeit" → CommunityYahrzeitModal
    │   ├── Board view (all lit entries)
    │   ├── Add entry form → POST /api/yahrzeit
    │   ├── Light candle → POST /api/yahrzeit/:id/light
    │   ├── Dedicate learning → POST /api/yahrzeit/:id/dedicate
    │   └── "Enter 3D Valley" button
    │       └── Renders MemorialSanctuaryModal (inline child)
    │           ├── Scene: valley / garden / waterfall / sanctuary / sunset
    │           ├── Place virtual candle (client-only, Zustand store)
    │           ├── MinimapOverlay (PUBG-style navigation)
    │           └── Ambient audio engine (Web Audio API)
    │
    ├── modal = "community" → CommunityModal
    │   └── "Yahrzeit Board" → modal "community-yahrzeit"
    │
    └── modal = "yartzeit" → YartzeitModal (Personal Calculator)
        └── "Community Board" → modal "community-yahrzeit"
```

---

## 4. Component Ownership

### Memorial Hub (More Tools entry path)

| Layer | Component / File | Notes |
|---|---|---|
| **Pages** | `features/memorial/pages/MemorialSanctuaryPage.tsx` | Browse/search hub |
| | `features/memorial/pages/MemorialProfilePage.tsx` | Individual profile |
| **Components** | `features/memorial/components/SanctuaryHeader.tsx` | Shared back-nav header |
| | `features/memorial/components/SanctuaryHero.tsx` | Search bar + CTA banner |
| | `features/memorial/components/SanctuaryWorldPreview.tsx` | Static 3D preview teaser |
| | `features/memorial/components/PortraitCard.tsx` | Memorial thumbnail card |
| | `features/memorial/components/MemorialPlaceholderCard.tsx` | Shimmer/placeholder |
| | `features/memorial/components/MinimapOverlay.tsx` | ⚠️ Used cross-boundary (inside MemorialSanctuaryModal in modals/) |
| | `features/memorial/components/LoadingState.tsx` | Shared loading UI |
| | `features/memorial/components/EmptyState.tsx` | Shared empty UI |
| **Hooks** | `features/memorial/hooks/useSearch.ts` | Search + pagination |
| | `features/memorial/hooks/useCollections.ts` | Featured / recent / picks |
| | `features/memorial/hooks/useMemorial.ts` | Single memorial fetch |
| | `features/memorial/hooks/useCandles.ts` | Profile candle operations |
| | `features/memorial/hooks/useTributes.ts` | Tribute operations |
| | `features/memorial/hooks/useMemorialPermissions.ts` | View/edit permission check |
| | `features/memorial/hooks/useFamilyManagement.ts` | Family invite/role |
| | `features/memorial/hooks/useCreateMemorial.ts` | Create new memorial |
| | `features/memorial/hooks/useUploadPhoto.ts` | Photo upload |
| **API** | `features/memorial/api/memorialApi.ts` | Typed fetch wrappers |
| **Store** | `features/memorial/stores/memorialStore.ts` | Zustand — profile UI state |
| **Types** | `features/memorial/types/index.ts` | Shared TS types |

---

### 3D Memorial Sanctuary (Yahrzeit section entry path)

| Layer | Component / File | Notes |
|---|---|---|
| **Modal** | `modals/MemorialSanctuaryModal.tsx` (~1955 lines) | Entire 3D orchestrator |
| **3D Engine** | `components/MemorialValley3D.tsx` | R3F canvas, scene graph |
| **Scene** | `scene/lighting/GoldenHourLighting.tsx` | R3F lighting rig |
| | `scene/fx/PostProcessingPipeline.tsx` | Bloom / post-processing |
| | `scene/env/SceneEnvironment.tsx` | Sky / environment map |
| | `scene/QualityContext.tsx` | GPU quality tier context |
| | `scene/loaders.ts` | Asset loader utilities |
| **Components** | `components/BurningCandle.tsx` | Animated candle (2D + 3D) |
| | `features/memorial/components/MinimapOverlay.tsx` | ⚠️ Cross-boundary — lives in features/memorial but used from modals/ |
| **Entry Modal** | `modals/CommunityYahrzeitModal.tsx` | Owns + mounts the 3D modal |

---

## 5. Identified Problems — Naming, Broken Paths, Duplication

### BUG-01 — 3D Entry from Memorial Hub is Dead Code
**Location:** `MemorialSanctuaryPage.tsx` → `onEnter3D` prop → `App.tsx` line 633
```ts
onEnter3D={() => setModal("memorial-3d" as any)}
```
`"memorial-3d"` is cast with `as any` to bypass the `Modal` union type. No condition in `App.tsx` renders `MemorialSanctuaryModal` (or anything else) for `modal === "memorial-3d"`. Tapping "Enter the 3D Sanctuary" from the Memorial Hub page silently does nothing.

---

### DUP-01 — Same Emoji, Ambiguous Name in More Tools
**Location:** `MoreToolsModal.tsx` — TOOLS array

| Index | Emoji | Label | Opens |
|---|---|---|---|
| 0 | 🕍 | Prayer Times | `PrayerTimesModal` |
| 16 | 🕍 | Memorial Sanctuary | `MemorialSanctuaryPage` (Hub) |

Two completely unrelated features share the same `🕍` emoji. A developer seeing `onMemorial` vs `onPrayers` can easily confuse which is which.

---

### DUP-02 — Two Features Both Named "Memorial Sanctuary"
| Name | File | What it actually is |
|---|---|---|
| `MemorialSanctuaryPage` | `features/memorial/pages/MemorialSanctuaryPage.tsx` | **A browse/search hub for profiles** |
| `MemorialSanctuaryModal` | `modals/MemorialSanctuaryModal.tsx` | **The 3D interactive valley experience** |

These are entirely different UX paradigms (2D list vs 3D world) sharing the same name. Every future developer encountering "Memorial Sanctuary" will be unsure which one is meant.

---

### DUP-03 — Two Independent Candle Data Systems
| System | Table | API prefix | Entry |
|---|---|---|---|
| Profile Candles | `memorial_candles` (Drizzle) | `/api/memorials/:id/candles` | Memorial Profile Page |
| Community Candles | `community_yahrzeit` (raw SQL) | `/api/yahrzeit` | Community Board + 3D Valley |

These are completely separate — lighting a candle in the 3D valley does NOT appear on a memorial profile, and vice versa.

---

### DUP-04 — Modal Key Typo: "yartzeit" vs "yahrzeit"
**Location:** `App.tsx` — Modal union type and all call sites
```ts
type Modal = ... | "yartzeit" | ...  // missing the 'h'
```
The correct English spelling is **yahrzeit**. The key `"yartzeit"` (missing 'h') is used consistently but is incorrect, and introduces a mismatch with the community version `"community-yahrzeit"` which is spelled correctly.

---

### DUP-05 — MinimapOverlay Cross-Boundary Dependency
`MinimapOverlay.tsx` lives in `features/memorial/components/` (owned by the Hub feature module) but is imported and used inside `modals/MemorialSanctuaryModal.tsx` (the 3D modal, owned by the Yahrzeit path). This creates a hidden coupling between two separate feature areas.

---

### DUP-06 — CommunityYahrzeitModal is the Sole Entry to the 3D Sanctuary
The 3D memorial experience is only reachable through the Community Yahrzeit Board. A user who navigates to the Memorial Hub (profile browser) and clicks "Enter the 3D Sanctuary" gets a broken experience (BUG-01). The architecture implies these should both work, but only one path is wired.

---

## 6. Recommended Internal Names

| Current Name | Recommended Internal Name | Rationale |
|---|---|---|
| `MemorialSanctuaryPage` | `MemorialHubPage` | It is a browse/search hub, not the sanctuary itself |
| `MemorialSanctuaryModal` | `MemorialValleyModal` | It is the 3D valley experience; "modal" is accurate since it overlays the screen |
| `CommunityYahrzeitModal` | `CommunityMemorialBoardModal` | Describes what the user sees: a board of community memorials |
| `YartzeitModal` | `PersonalYahrzeitModal` | Distinguishes it from the community version |
| Modal key `"yartzeit"` | `"yahrzeit"` | Fix the spelling |
| MoreTools label `"Memorial Sanctuary"` | `"Memorial Profiles"` | Describes the hub page accurately |
| MoreTools emoji for Memorial | `🕯` or `🪦` | Distinguish from Prayer Times (🕍) |
| `onMemorial` prop on MoreToolsModal | `onOpenMemorialHub` | More precise intent |
| `onEnter3D` prop on MemorialSanctuaryPage | `onOpenValley` | Disambiguates from "the sanctuary page" |

---

## 7. Recommended User Flow

The current flows are fragmented. The recommended flow consolidates both entry paths into a single coherent journey without removing any functionality:

```
More Tools
  └── 🕯 "Memorial Hub" (renamed from "Memorial Sanctuary")
        │
        ├── BROWSE TAB — profile browser (current MemorialSanctuaryPage)
        │     ├── Search by name
        │     ├── Featured / Recent / Community Picks
        │     └── Tap portrait → Memorial Profile Page
        │           ├── Light Candle (profile-level)
        │           ├── Add Tribute
        │           └── View Photos / Family
        │
        ├── COMMUNITY TAB — community board (current CommunityYahrzeitModal)
        │     ├── View all lit community candles
        │     ├── Add yahrzeit entry
        │     ├── Donate / Dedicate Learning
        │     └── "Enter 3D Valley" → MemorialValleyModal (3D)  ✅
        │
        └── 3D VALLEY button (both tabs) → MemorialValleyModal (3D)  ✅
              ├── Scene selector (valley / garden / waterfall / sanctuary / sunset)
              ├── Place virtual candle
              └── Minimap navigation
```

**Key changes this flow makes:**
1. Merges Memorial Hub and Community Board into a two-tab page — users see both profile-level and community-level memorials from one entry point.
2. Fixes BUG-01 by wiring "Enter 3D Valley" on the Hub tab to the same `MemorialValleyModal` already used by the Community tab.
3. No feature is removed — all existing functionality is preserved.
4. The `YartzeitModal` (personal calculator) remains accessible from More Tools as a separate tool since its audience (personal calculation) is distinct from the community board.

---

## 8. Backend API Reference

### Memorial Profiles (`/api/memorials`)
| Method | Route | Auth | Description |
|---|---|---|---|
| `POST` | `/memorials` | Required | Create a new memorial |
| `GET` | `/memorials/search` | Optional | Search by name/slug, paginated, sortable |
| `GET` | `/memorials/:id` | Optional | Fetch by UUID or slug |
| `PATCH` | `/memorials/:id` | Required | Update status (draft/published/archived) |
| `GET` | `/memorials/:id/candles` | Public | Fetch candles (filter: recent/today/community) |
| `POST` | `/memorials/:id/candles` | Optional | Light a candle |
| `GET` | `/memorials/:id/tributes` | Optional | Fetch tributes (paginated) |
| `POST` | `/memorials/:id/tributes` | Optional | Add a tribute |
| `GET` | `/memorials/:id/photos` | Optional | Fetch photo gallery |
| `POST` | `/memorials/:id/photos` | Required | Upload a photo |
| `POST` | `/memorials/:id/family/invite` | Required | Invite family member |
| `PATCH` | `/memorials/:id/family/:userId` | Required | Update family member role |
| `POST` | `/memorials/:id/transfer` | Required | Transfer ownership |
| `POST` | `/memorials/:id/moderate` | Admin | Approve/reject |

### Community Yahrzeit (`/api/yahrzeit`)
| Method | Route | Auth | Description |
|---|---|---|---|
| `GET` | `/yahrzeit` | Public | All lit candle entries + active learners |
| `POST` | `/yahrzeit` | Required | Create a new community yahrzeit entry |
| `POST` | `/yahrzeit/:id/light` | Required | Light candle on an entry |
| `POST` | `/yahrzeit/:id/dedicate` | Required | Add a Torah learner dedication |
| `DELETE` | `/yahrzeit/:id` | Required | Delete own entry |
| `GET` | `/community/admin/yahrzeit` | Admin | All entries (admin view) |
| `DELETE` | `/community/admin/yahrzeit/:id` | Admin | Admin delete any entry |

### Database Tables
| Table | System | ORM |
|---|---|---|
| `memorial_persons` | Profile system | Drizzle |
| `memorials` | Profile system | Drizzle |
| `memorial_families` | Profile system | Drizzle |
| `memorial_family_members` | Profile system | Drizzle |
| `memorial_candles` | Profile system | Drizzle |
| `memorial_tributes` | Profile system | Drizzle |
| `memorial_photos` | Profile system | Drizzle |
| `memorial_collections` | Profile system | Drizzle |
| `community_yahrzeit` | Community board | Raw SQL |
| `community_yahrzeit_learners` | Community board | Raw SQL |
