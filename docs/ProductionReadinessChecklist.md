# Production Readiness Checklist

> Purpose: Gate checklist that must be satisfied before the Menashe Platform is considered ready for public production launch.
> Last updated: 2026-06-26 (SPR-001)

---

## Legend
- ✅ Done
- ⚠️ Partial
- ❌ Not done / Missing
- 🚫 Blocked (dependency listed)

---

## 1. Architecture

| # | Item | Status | Notes |
|---|---|---|---|
| AR-01 | Monorepo structure with clear package boundaries | ✅ | pnpm workspaces with artifacts + lib |
| AR-02 | Shared business logic in a single canonical location | ❌ | zmanim, calendar, translations duplicated between web and mobile |
| AR-03 | OpenAPI spec as single source of truth for all API contracts | ⚠️ | Spec exists; web app largely bypasses generated hooks |
| AR-04 | No component file exceeds 400 lines | ❌ | Home.tsx (5,206), CensusModal (2,298), AdminModal (2,038), etc. |
| AR-05 | Modal and page routing is URL-addressable (deep-linkable) | ❌ | All in-app navigation is React state only |
| AR-06 | Code splitting on all modals and pages | ❌ | Only MemorialValley3D is lazy-loaded |
| AR-07 | Global state management is structured (not in root App.tsx) | ❌ | 30+ modal booleans in App.tsx |
| AR-08 | API client generated hooks used consistently | ❌ | Most fetches are raw `fetch` calls |
| AR-09 | Database migrations are versioned and reversible | ❌ | Raw SQL startup script with no version tracking |
| AR-10 | Foreign key constraints on all relationships | ❌ | All relationships implicit via text user_id |

---

## 2. Security

| # | Item | Status | Notes |
|---|---|---|---|
| SEC-01 | All admin routes require Clerk authentication + role check | ❌ | PIN-only auth with no session (TD-001) |
| SEC-02 | All protected data endpoints use `requireAuth` | ❌ | Census GET endpoints are public (TD-002) |
| SEC-03 | Object storage ACL enforces file ownership | ❌ | Any authenticated user can read any file (TD-003) |
| SEC-04 | Rate limiting on all API endpoints | ❌ | No rate limiting anywhere (TD-004) |
| SEC-05 | `ALLOWED_ORIGINS` explicitly set and enforced | ❌ | Defaults to `origin: true` (TD-005) |
| SEC-06 | No sensitive values in `VITE_*` environment variables | ❌ | `VITE_ADMIN_PIN` is set (TD-006) |
| SEC-07 | All JSONB inputs validated with Zod before DB insert | ❌ | Census columns unvalidated (TD-007) |
| SEC-08 | Clerk Secret Key in Replit Secrets (not in code) | ✅ | Stored in Replit Secrets |
| SEC-09 | VAPID keys in Replit Secrets (not in `.replit` config) | ⚠️ | Currently in `[userenv]` section of `.replit` |
| SEC-10 | No hardcoded fallback secrets anywhere in codebase | ❌ | ADMIN_PIN fallback `"1948"` in 4+ route files |
| SEC-11 | Content Security Policy headers configured | ❌ | No CSP middleware |
| SEC-12 | Audit log for all admin mutations | ❌ | No audit trail exists |

---

## 3. Performance

| # | Item | Status | Notes |
|---|---|---|---|
| PERF-01 | Lighthouse performance score ≥ 80 on mobile | ❌ | Not measured; estimated 40–55 given image sizes and bundle |
| PERF-02 | Initial JS bundle < 500 KB (gzipped) | ❌ | All modals eagerly loaded |
| PERF-03 | All images ≤ 200 KB, served as WebP | ❌ | PNG images up to 2.5 MB |
| PERF-04 | `React.memo` applied to all frequently-rendering components | ❌ | Zero uses |
| PERF-05 | All expensive calculations wrapped in `useMemo` | ❌ | Calendar/zmanim calculations in render |
| PERF-06 | All list API endpoints paginated | ❌ | No pagination on any endpoint |
| PERF-07 | 3D scene maintains ≥ 30 FPS on mid-range devices | ⚠️ | Quality tiers help but are coarse |
| PERF-08 | Push schedulers run in isolated worker process | ❌ | In main Express process |
| PERF-09 | DB connection pool explicitly configured | ❌ | Default pg pool settings |
| PERF-10 | Sefaria Daf Yomi API responses cached locally | ❌ | Fetched on every modal open |

---

## 4. Accessibility

| # | Item | Status | Notes |
|---|---|---|---|
| A11Y-01 | All modals have `role="dialog"` and `aria-labelledby` | ❌ | Missing across all 20+ modals |
| A11Y-02 | Focus is trapped inside modals while open | ❌ | No focus trap implemented |
| A11Y-03 | Focus returns to trigger element when modal closes | ❌ | No focus restoration |
| A11Y-04 | All interactive elements are keyboard-navigable | ❌ | Click-only interactions |
| A11Y-05 | Color contrast meets WCAG AA (4.5:1 for text) | ⚠️ | Dark theme likely passes; Parchment theme unverified |
| A11Y-06 | `prefers-reduced-motion` respected for 3D and animations | ❌ | No motion query handling |
| A11Y-07 | All images have meaningful `alt` text | ⚠️ | Partially — some decorative images lack alt="" |
| A11Y-08 | Screen reader tested with VoiceOver/NVDA | ❌ | Not tested |

---

## 5. Testing

| # | Item | Status | Notes |
|---|---|---|---|
| TEST-01 | Unit tests for all calendar/zmanim calculations | ❌ | Zero tests exist |
| TEST-02 | Unit tests for Parasha, Daf Yomi, Omer cycle | ❌ | |
| TEST-03 | Integration tests for all API routes | ❌ | Zero tests exist |
| TEST-04 | Auth middleware tested (requireAuth, admin check) | ❌ | |
| TEST-05 | E2E test: sign-in → view Zmanim flow | ❌ | |
| TEST-06 | E2E test: Siddur library browse + read flow | ❌ | |
| TEST-07 | E2E test: Community Yahrzeit light candle flow | ❌ | |
| TEST-08 | 3D scene smoke test (renders without crash) | ❌ | |
| TEST-09 | CI/CD pipeline runs tests on every PR | ❌ | No CI configured |
| TEST-10 | TypeScript build passes (`pnpm run typecheck`) | ✅ | Passes currently |

---

## 6. Deployment

| # | Item | Status | Notes |
|---|---|---|---|
| DEP-01 | Production environment variables documented | ⚠️ | Some in `.replit`, some in Secrets, no single reference |
| DEP-02 | Database migrations run before server start | ✅ | `migrate.ts` runs on startup |
| DEP-03 | API server built artifact committed / CI-built | ✅ | `dist/` built by `build.mjs` |
| DEP-04 | Health check endpoint returns 200 | ✅ | `GET /api/healthz` |
| DEP-05 | Graceful shutdown on SIGTERM | ❌ | No `process.on('SIGTERM')` handler |
| DEP-06 | DB connection pool closed on shutdown | ❌ | Connections leak on shutdown |
| DEP-07 | Push scheduler intervals cleared on shutdown | ❌ | Intervals run until process kill |
| DEP-08 | Rollback procedure documented | ❌ | No runbook |
| DEP-09 | Zero-downtime deployment strategy | ❌ | Single process; any deploy causes downtime |

---

## 7. Monitoring

| # | Item | Status | Notes |
|---|---|---|---|
| MON-01 | Error tracking (Sentry or equivalent) | ❌ | No error monitoring configured |
| MON-02 | Server-side structured logging (Pino) | ✅ | Active; logs to stdout |
| MON-03 | Log aggregation / retention | ❌ | Replit console only; not persisted |
| MON-04 | Alerting on 5xx error rate spike | ❌ | |
| MON-05 | DB query performance monitoring | ❌ | |
| MON-06 | Push notification delivery rate tracked | ❌ | Success/failure not logged to DB |
| MON-07 | 3D scene frame rate monitored | ❌ | `ScenePerf` is stubbed |

---

## 8. Analytics

| # | Item | Status | Notes |
|---|---|---|---|
| ANA-01 | Page view / feature usage tracking | ❌ | No analytics |
| ANA-02 | 3D scene engagement metrics | ❌ | |
| ANA-03 | Notification open rate tracking | ❌ | |
| ANA-04 | Premium conversion funnel | ❌ | |
| ANA-05 | Census participation rate | ❌ | |

---

## 9. Documentation

| # | Item | Status | Notes |
|---|---|---|---|
| DOC-01 | Architecture overview | ✅ | `docs/Architecture.md` (created SPR-001) |
| DOC-02 | Database schema reference | ✅ | `docs/DatabaseOverview.md` (created SPR-001) |
| DOC-03 | Coding standards | ✅ | `docs/CodingStandards.md` (created SPR-001) |
| DOC-04 | Performance notes | ✅ | `docs/PerformanceNotes.md` (created SPR-001) |
| DOC-05 | Security checklist | ✅ | `docs/SecurityChecklist.md` (created SPR-001) |
| DOC-06 | Technical debt register | ✅ | `docs/TechnicalDebtRegister.md` (created SPR-001) |
| DOC-07 | Production readiness checklist | ✅ | This file (created SPR-001) |
| DOC-08 | Engineering summary | ✅ | `docs/EngineeringSummary.md` (created SPR-001) |
| DOC-09 | API endpoint reference (auto-generated) | ⚠️ | OpenAPI spec exists; no rendered HTML docs |
| DOC-10 | Runbook for on-call / incident response | ❌ | Not written |
| DOC-11 | Local development setup guide | ❌ | Replit.md covers basics; no full onboarding doc |

---

## Production Gate Summary

| Category | Done | Partial | Missing | Score |
|---|---|---|---|---|
| Architecture | 2 | 1 | 7 | 20% |
| Security | 1 | 1 | 10 | 10% |
| Performance | 1 | 1 | 8 | 10% |
| Accessibility | 0 | 1 | 7 | 5% |
| Testing | 1 | 0 | 9 | 10% |
| Deployment | 3 | 1 | 5 | 35% |
| Monitoring | 1 | 0 | 6 | 15% |
| Analytics | 0 | 0 | 5 | 0% |
| Documentation | 8 | 1 | 2 | 80% |
| **Overall** | **17** | **6** | **59** | **~21%** |

**Verdict: Not production-ready.** The application is feature-complete for internal/community testing but requires focused security, stability, and test coverage work before a public launch.
