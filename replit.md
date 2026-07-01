# Menashe Calendar

A sacred Jewish calendar app for the Bnei Menashe community — featuring Hebrew/Jewish calendar, Zmanim (prayer times), Parasha, Daf Yomi, holidays, and a Siddur library with community books.

## Run & Operate

### Replit workflows (all three should be running)
- **Start application** — `pnpm --filter @workspace/menashe-calendar run dev` (Vite dev server, port 5000, webview)
- **API Server** — `cd artifacts/api-server && pnpm run dev:rebuild` (always builds then starts; Express, port 8080, console)
  - `dev:rebuild` runs `pnpm run build && pnpm run start` so it is safe from a clean checkout
  - The frontend proxies all `/api/*` requests to `http://localhost:8080` (configured in `artifacts/menashe-calendar/vite.config.ts`)
- **Mobile App** — `PORT=8081 pnpm --filter @workspace/menashe-mobile run dev` (Expo Metro bundler, port 8081, console)
  - Opens a QR code in the console — scan with Expo Go on a physical device to test natively
  - Web preview available at port 8081; connects to the same API server at `https://$REPLIT_DEV_DOMAIN/api`

### Other useful commands
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

### Environment / secrets (all pre-configured)
- `DATABASE_URL` — runtime-managed by Replit (PostgreSQL attached)
- `CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` — Clerk dev instance auth
- `VAPID_PUBLIC_KEY` / `VAPID_SUBJECT` — web push (VAPID_PRIVATE_KEY not set; push notifications disabled until added)
- `ADMIN_USER_ID` / `ADMIN_PIN` — admin access

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Frontend: React + Vite + Tailwind CSS
- Jewish calendar: `@hebcal/core`, `suncalc`

## Where things live

- `artifacts/menashe-calendar/src/` — React frontend
  - `pages/` — Home, CalendarPage, ZmanimPage, SiddurPage, SettingsPage, Landing, TorahPage
  - `modals/` — Location, Day, Holidays, Parashah, DafYomi, Zmanim, Birthday, Tahara, Yartzeit, Community, Census, BookReader, Admin, Premium, TorahNote
  - `components/BottomNav.tsx` — bottom navigation bar
  - `lib/` — hebrewCalendar, zmanim, parasha, parashaInsights, locations
- `artifacts/api-server/src/routes/books.ts` — Books CRUD API (ADMIN_PIN = "1948")
- `lib/db/src/schema/books.ts` — Books table schema
- `lib/api-spec/openapi.yaml` — OpenAPI contract (source of truth)

## Architecture decisions

- Frontend uses plain `fetch` to `/api/books` rather than generated React Query hooks (SiddurPage is pre-existing implementation)
- Admin access uses a simple PIN header (`x-admin-pin: 1948`) rather than full auth
- Hebrew calendar calculations done client-side with `@hebcal/core`
- Zmanim (prayer times) calculated client-side with `suncalc`
- Location preference persisted in `localStorage`

## Product

- Landing page with Sign In (no actual auth — just a gate)
- Home: today's Hebrew date, Zmanim summary, current Parasha, upcoming holidays, Siddur Library shortcut, Daf Yomi
- Calendar: full month view with Hebrew dates and holidays
- Zmanim: detailed prayer times for the selected location
- Siddur: library of sacred texts/books with admin CRUD
- Settings: theme toggle, location picker, community tools

## User preferences

- The app is bilingual: **English (EN) + Thadou Kuki (TK)**. The Bnei Menashe community speaks Thadou Kuki; when a user turns on Thadou Kuki preference, the entire app UI should display in Thadou Kuki.
- All new UI text added to the app must have both an English and Thadou Kuki translation added to `src/lib/translations.ts`, and be referenced via `useLanguage()` / `t.xxx` — never hardcode English-only strings in UI components.

## Gotchas

- Admin PIN is hardcoded as `1948` (set via `ADMIN_PIN` env var on the server)
- Seed the books library via `POST /api/books/seed` with `x-admin-pin: 1948` header
- The Sign In on the landing page is a simple state gate — no real authentication

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
