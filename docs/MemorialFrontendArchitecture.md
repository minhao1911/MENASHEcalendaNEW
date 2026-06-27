# Memorial Frontend Architecture

**Sprint:** SPR-016 (profile page) builds on SPR-015 (sanctuary shell)
**Status:** Profile page complete (SPR-016)
**Scope:** Frontend only. Backend APIs, DB schema, and 3D scene are out of scope for this document.

---

## 1. Module Structure

```
src/features/memorial/
├── api/
│   └── memorialApi.ts             — API client (fetch + Clerk Bearer auth), MemorialApiError
├── hooks/
│   ├── useMemorial.ts              — Fetch + refetch a single memorial by slug
│   ├── useCandles.ts               — Paginated candle list + optimistic light action
│   ├── useTributes.ts              — Paginated tribute list + submit (moderation-aware)
│   ├── useSearch.ts                — Debounced search with stale-response guard
│   ├── useCreateMemorial.ts        — Multi-step create submission lifecycle
│   ├── useUploadPhoto.ts           — File upload to Object Storage + API registration
│   ├── useMemorialPermissions.ts   — Derives effective permissions from Clerk + family membership
│   └── index.ts
├── components/
│   ├── SanctuaryHeader.tsx         — Sticky back-button header (shared across pages)
│   ├── SanctuaryHero.tsx           — Hero banner with search input
│   ├── GlassPanel.tsx              — Frosted-glass card container
│   ├── SectionTitle.tsx            — Section label + optional count + optional action
│   ├── MemorialPlaceholderCard.tsx — Compact result card for search/lists
│   ├── EmptyState.tsx              — Centered icon + message + optional CTA
│   ├── LoadingState.tsx             — Skeleton shimmer rows
│   └── index.ts
├── pages/
│   ├── MemorialSanctuaryPage.tsx   — Shell: search, featured, recent candles, family list (SPR-015)
│   ├── MemorialProfilePage.tsx     — Profile: hero, actions, sections, sheets (SPR-016)
│   └── index.ts
└── types/
    └── index.ts                    — All domain + UI + API types
```

---

## 2. Navigation Model

Navigation is state-driven (no URL routing for this page set):

```
App.tsx
  activePage = "memorial"
    memorialSlug === null  →  MemorialSanctuaryPage  (search + browse)
    memorialSlug !== null  →  MemorialProfilePage    (profile for that slug)
```

`onSelectMemorial(slug)` on `MemorialSanctuaryPage` sets `memorialSlug` in App state.
`onBack()` on `MemorialProfilePage` clears `memorialSlug`, returning to the sanctuary.

---

## 3. MemorialProfilePage — Composition (SPR-016)

### Props

| Prop | Type | Description |
|------|------|-------------|
| `slug` | `string` | Memorial slug from the sanctuary list |
| `onBack` | `() => void` | Clears active slug, returns to sanctuary |

### Hook Wiring (no duplicate fetches)

| Hook | Arg | Purpose |
|------|-----|---------|
| `useMemorial(slug)` | slug | Fetches `MemorialWithPerson`, drives all states |
| `useCandles(memorial?.id)` | memorial ID | Paginated candles + optimistic light action |
| `useTributes(memorial?.id)` | memorial ID | Paginated tributes + submit |
| `useMemorialPermissions({memorial})` | memorial | Gates action buttons per user role |

### State Machine

```
status = "idle" | "loading"    →  <LoadingState />
!isOnline && !memorial         →  Offline state
status = "error" && 404        →  Not Found state
status = "error" && 403        →  Private (access denied) state
status = "error" && other      →  Generic error + Retry button
permissions?.canView = false   →  Private gate (published but visibility-restricted)
status = "success"             →  Full profile render
```

### Rendered Sections (in order)

1. **SanctuaryHeader** — sticky back button · full name · Hebrew name subtitle
2. **Hero** — avatar (🕊 placeholder), full name, Hebrew name, privacy badge, birth/death/age pills, candle count
3. **Action Row** — Light Candle · Leave Tribute · Photos (disabled) · Share (Web Share API / clipboard fallback)
4. **Biography** — `person.biography` freetext or empty state
5. **Recent Candles** — first 5 from `useCandles`; lit-by + candle type + message
6. **Recent Tributes** — first 3 approved from `useTributes`; title + body + author
7. **Family** — father name, mother name, tribe affiliation, occupation
8. **Upcoming Yahrzeit** — next Hebrew anniversary computed client-side via `@hebcal/core` HDate
9. **Location** — birthplace + death location from `MemorialPerson` (section omitted if both empty)

### Inline Interaction Sheets

Both actions open as a `BottomSheet` overlay — no external modal library required.

**CandleSheet**
- 5 candle types: Memorial · Yahrzeit · Neshama · Shabbat · Shloshim
- Optional message (280 chars), optional guest name, anonymous toggle
- Calls `useCandles.light()` → optimistic prepend → triggers `refetch()`

**TributeSheet**
- Optional title (120 chars), required body (1200 chars), optional guest name, anonymous toggle
- Calls `useTributes.submit()` → pending moderation notice on success

### Privacy Badge

Colour-coded by `privacy.visibilityLevel`:

| Level | Colour | Icon |
|-------|--------|------|
| private | Red | 🔒 |
| family | Blue | 👪 |
| community | Gold | ✡ |
| public | Green | 🌐 |

---

## 4. Permission Gating

`useMemorialPermissions` resolves role via Clerk public metadata + family membership table:

| Role | Light candle | Leave tribute | View photos |
|------|-------------|---------------|-------------|
| guest | per privacy | per privacy | per privacy |
| authenticated | per privacy | per privacy | per privacy |
| family_member | ✓ | ✓ | ✓ |
| family_admin | ✓ | ✓ | ✓ |
| moderator | ✓ | ✓ | ✓ |
| administrator | ✓ | ✓ | ✓ |

Action buttons are rendered `disabled` (not hidden) when permission is denied.

---

## 5. Bilingual Support

All UI strings flow through `useLanguage()` / `t.memProfile*` keys.
32 new translation keys added in both EN and TK in `lib/translations.ts`.

---

## 6. Future Extensions

| Feature | What exists today | Remaining work |
|---------|-------------------|----------------|
| Profile photo | `MemorialPhoto.isFeatured` in DB; hero avatar ready for URL | `useUploadPhoto` + Object Storage wiring; hero `<img>` |
| Photo gallery | `canViewPhotos` permission; `getPhotos()` API; action button present (disabled) | Gallery panel page/sheet |
| Family member list | `getFamilyMembers()` in `memorialApi.ts`; family section UI | Member list rows + role display |
| Editing | `canEditProfile` permission resolves correctly | Edit sheet/page (separate sprint) |
| Deep linking | State-driven nav works | URL-based routing (`/memorial/:slug`) when needed |
| Story / Timeline | Not started | Separate feature sprint |
| 3D scene | Not started | Separate 3D sprint |
| Create memorial | `useCreateMemorial` hook exists | Multi-step wizard page |
| Moderation panel | `moderateTribute()` API exists | Admin-only tribute review UI |

---

## 7. Remaining Work (Prioritised)

- [ ] Profile photo upload and display
- [ ] Photo gallery panel
- [ ] Family member list in Family section
- [ ] Edit memorial flow (title, biography, dates, privacy)
- [ ] Moderation UI for pending tributes
- [ ] Create memorial wizard
- [ ] URL-based deep linking (`/memorial/:slug`)
- [ ] 3D scene integration (future sprint)
