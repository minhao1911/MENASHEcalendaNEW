# Memorial Frontend Architecture

**Sprint:** SPR-014  
**Status:** Architecture complete — UI implementation pending (SPR-015)  
**Scope:** Frontend only. Backend APIs, DB schema, and 3D scene are out of scope for this document.

---

## 1. Module Structure

```
src/features/memorial/
├── api/
│   └── memorialApi.ts        — API client functions (fetch + Clerk auth)
├── hooks/
│   ├── useMemorial.ts         — Fetch + refetch a single memorial by slug
│   ├── useCandles.ts          — Paginated candle list + optimistic light action
│   ├── useTributes.ts         — Paginated tribute list + submit action
│   ├── useSearch.ts           — Debounced search with stale-response guard
│   ├── useCreateMemorial.ts   — Multi-step create submission lifecycle
│   ├── useUploadPhoto.ts      — File upload to Object Storage + API registration
│   ├── useMemorialPermissions.ts — Derives effective permissions from Clerk + family
│   └── index.ts               — Barrel export
├── components/
│   └── index.ts               — Reserved (SPR-015)
├── pages/
│   └── index.ts               — Reserved (SPR-015)
├── stores/
│   └── memorialStore.ts       — UI state + create wizard form state (hook-based)
├── types/
│   └── index.ts               — All TypeScript types for the feature
├── utils/
│   └── index.ts               — Permission resolver, date formatters, label helpers
└── index.ts                   — Public module barrel
```

---

## 2. API Layer

### Transport

All API calls go through a shared `apiFetch` helper that:

- Targets `/api/*` (proxied by Vite dev server to the Express backend on port 8080)
- Attaches a Clerk Bearer token via `window.Clerk?.session?.getToken()`
- Throws `MemorialApiError` on non-2xx responses (carries `.status`, `.isNotFound`, `.isForbidden`, etc.)

### Functions

| Function | Method | Path |
|---|---|---|
| `getMemorial(slug)` | GET | `/api/memorials/:slug` |
| `createMemorial(input)` | POST | `/api/memorials` |
| `updateMemorial(id, input)` | PATCH | `/api/memorials/:id` |
| `deleteMemorial(id)` | DELETE | `/api/memorials/:id` |
| `searchMemorial(params)` | GET | `/api/memorials/search?q=…` |
| `getCandles(id, page)` | GET | `/api/memorials/:id/candles` |
| `lightCandle(id, input)` | POST | `/api/memorials/:id/candles` |
| `getTributes(id, page)` | GET | `/api/memorials/:id/tributes` |
| `addTribute(id, input)` | POST | `/api/memorials/:id/tributes` |
| `moderateTribute(id, tid, action)` | POST | `/api/memorials/:id/tributes/:tid/moderate` |
| `getPhotos(id)` | GET | `/api/memorials/:id/photos` |
| `uploadPhoto(id, input)` | POST | `/api/memorials/:id/photos` |
| `deletePhoto(id, pid)` | DELETE | `/api/memorials/:id/photos/:pid` |
| `getFamily(familyId)` | GET | `/api/memorials/families/:id` |
| `getFamilyMembers(familyId)` | GET | `/api/memorials/families/:id/members` |
| `inviteFamilyMember(…)` | POST | `/api/memorials/families/:id/members` |
| `updateFamilyMemberRole(…)` | PATCH | `/api/memorials/families/:id/members/:mid` |
| `removeFamilyMember(…)` | DELETE | `/api/memorials/families/:id/members/:mid` |

---

## 3. Hook Architecture

### Server state hooks (fetch + lifecycle)

```
useMemorial(slug)
  └── state: { memorial, status, error }
  └── action: refetch()            — call after any mutation to re-sync

useCandles(memorialId)
  └── state: { candles[], total, hasMore, status }
  └── actions: loadMore(), light(input) — optimistic prepend on light

useTributes(memorialId)
  └── state: { tributes[], total, hasMore, status }
  └── actions: loadMore(), submit(input) — no optimistic (moderation queue)

useSearch()
  └── state: { results[], total, hasMore, status, query }
  └── actions: setQuery(q), loadMore(), reset()
  └── debounced 300 ms, stale-response guard via ref

useCreateMemorial()
  └── state: { status, error, created }
  └── action: submit(CreateMemorialInput) → MemorialWithPerson | null

useUploadPhoto()
  └── state: { status, progress, error }
  └── action: upload(memorialId, File, meta) → MemorialPhoto | null
```

### Derived / permission hook

```
useMemorialPermissions({ memorial, familyMembers })
  └── reads useUser() from Clerk
  └── returns MemorialPermissions | null
  └── role resolution: administrator > moderator > family_admin > family_member > authenticated > guest
```

---

## 4. State Ownership

| State category | Owner | Notes |
|---|---|---|
| **Server state** | Fetch hooks (`useMemorial`, `useCandles`, `useTributes`) | Re-fetched via `refetch()` / page reload after mutations |
| **UI state** | `useMemorialUIStore()` | Active panel, edit mode, upload progress |
| **Session state** | Clerk (`useUser`) | User identity, role metadata |
| **Temporary form state** | `useCreateMemorialFormStore()` | Multi-step wizard, cleared on unmount |
| **Optimistic updates** | `useCandles.light()` + `useMemorialUIStore.optimisticCandleCount` | Candle count incremented immediately, cleared on next server sync |

### Caching strategy

- No global cache layer (no React Query in this codebase)
- Per-hook local state is source of truth
- `refetch()` token (integer `rev` increment) re-triggers `useEffect` to reload
- Search results are page-accumulated (infinite scroll model); reset on query change
- Candle / tribute pages are accumulated; re-fetch page 1 after mutations

---

## 5. Routing Architecture

Wouter is the app router. Routes integrate into the existing `/app/*` subtree.

```
/app/memorial                   MemorialSearchPage
/app/memorial/create            CreateMemorialPage      [auth required]
/app/memorial/:slug             MemorialProfilePage     [privacy gate]
/app/memorial/:slug/edit        EditMemorialPage        [family_admin+]
/app/memorial/:slug/family      FamilyManagementPage    [family_admin+]
/app/memorial/:slug/gallery     MemorialGalleryPage     [privacy.canViewPhotos]
```

Route registration belongs in `App.tsx` inside the `<Route path="/app/*">` block (SPR-015).

### Navigation flow

```
Landing / Home
  └─ "Memorial Sanctuary" button
        └─ /app/memorial  (search)
              ├─ [create button] → /app/memorial/create
              └─ [select result] → /app/memorial/:slug
                    ├─ [edit] → /app/memorial/:slug/edit
                    ├─ [family] → /app/memorial/:slug/family
                    └─ [gallery] → /app/memorial/:slug/gallery
```

---

## 6. Permission Architecture

### Roles (ascending privilege)

| Role | Conditions |
|---|---|
| `guest` | Not signed in |
| `authenticated` | Signed in via Clerk |
| `family_member` | In `memorial_family_members` for this memorial's family |
| `family_admin` | Same + `role = "admin"` in that table |
| `moderator` | Clerk `publicMetadata.role === "moderator"` |
| `administrator` | Clerk `publicMetadata.role === "admin"` |

### Capability matrix

| Capability | guest | auth | family | f.admin | mod | admin |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| canView (public) | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| canView (community) | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| canView (family) | — | — | ✓ | ✓ | ✓ | ✓ |
| canView (private) | — | — | — | ✓ | ✓ | ✓ |
| canLightCandle\* | ✓\* | ✓ | ✓ | ✓ | ✓ | ✓ |
| canLeaveTribute\* | — | — | ✓ | ✓ | ✓ | ✓ |
| canViewPhotos\* | — | — | ✓ | ✓ | ✓ | ✓ |
| canUploadPhotos | — | — | ✓ | ✓ | ✓ | ✓ |
| canEditProfile | — | — | — | ✓ | — | ✓ |
| canManageFamily | — | — | — | ✓ | — | ✓ |
| canModerate | — | — | — | — | ✓ | ✓ |
| canDelete | — | — | — | — | — | ✓ |
| canPublish | — | — | — | ✓ | — | ✓ |

\* `allowGuestInteraction` flag on the privacy record can expand guest access to candles. Interaction permissions (`canLightCandles`, `canLeaveTributes`, `canViewPhotos`) are configurable per memorial.

Permission resolution is handled by `resolvePermissions(role, privacy)` in `utils/index.ts` and surfaced to components via `useMemorialPermissions()`.

---

## 7. Error Handling

| State | Handling strategy |
|---|---|
| **Loading** | `status === "loading"` guard in hooks — components render skeletons |
| **Empty state** | `status === "success"` + empty array — `<MemorialEmptyState />` placeholder |
| **Fetch error** | `status === "error"` + `error` exposed — component renders retry button that calls `refetch()` |
| **Retry** | `refetch()` increments an internal `rev` counter, re-triggering `useEffect` |
| **Offline** | `useOnlineStatus()` (existing hook) — banner shown, mutations disabled |
| **Upload failure** | `useUploadPhoto.status === "error"` — progress resets, error message shown, retry available |
| **Permission denied** | `MemorialApiError.isForbidden` caught — redirects to `/app/memorial` with toast |
| **Not found** | `MemorialApiError.isNotFound` caught — renders 404 state, link back to search |

---

## 8. Implementation Roadmap

### SPR-014 (this sprint) — Architecture ✅
- [x] Feature module directory structure
- [x] TypeScript types (`types/index.ts`)
- [x] API client layer (`api/memorialApi.ts`)
- [x] All 7 custom hooks (`hooks/*.ts`)
- [x] State stores (`stores/memorialStore.ts`)
- [x] Utility functions (`utils/index.ts`)
- [x] Module barrel (`index.ts`)
- [x] This document

### SPR-015 — UI Implementation (next)
- [ ] `PermissionGate` component
- [ ] `MemorialCard` for search results
- [ ] `MemorialSearchPage` with filters
- [ ] `CreateMemorialWizard` (multi-step, uses `useCreateMemorialFormStore`)
- [ ] `MemorialProfilePage` with panel tabs
- [ ] `CandleWall` with `useCandles`
- [ ] `TributeList` with `useTributes`
- [ ] `PhotoGallery` with `useUploadPhoto`
- [ ] `FamilyRoster` with `getFamilyMembers` / `inviteFamilyMember`
- [ ] Route registration in `App.tsx`
- [ ] Bilingual labels in `translations.ts`

### SPR-016 — Polish & Integration
- [ ] Object Storage presigned URL backend route for `useUploadPhoto`
- [ ] Moderation queue UI for family admins
- [ ] Edit memorial form
- [ ] Family management page
- [ ] Memorial → Yahrzeit cross-link (death date → auto-yahrzeit entry)
- [ ] Push notification on new tributes (family members)
