# Security Checklist

> Purpose: Track all security vulnerabilities, mitigations, and required hardening work across the Menashe Platform.
> Last updated: 2026-06-26 (SPR-001)

---

## Severity Legend

- 🔴 **Critical** — exploitable by any user; fix before any public launch
- 🟠 **High** — exploitable by a motivated attacker; fix in the next sprint
- 🟡 **Medium** — exploitable under specific conditions; fix within 2 sprints
- 🟢 **Low** — hardening / best practice; fix when capacity allows

---

## Authentication & Authorization

| # | Item | Severity | Status | Notes |
|---|---|---|---|---|
| A-01 | Admin PIN hardcoded as `1948` in 4+ route files with no Clerk session required | 🔴 Critical | ❌ Open | Anyone who discovers the PIN can grant premium, delete users, broadcast to all devices, manage census. Fix: Clerk `requireAuth` + admin role/claim check. |
| A-02 | Census GET endpoints (`/census/submissions`, `/census/member-submissions`) have no auth | 🔴 Critical | ❌ Open | All community family data is publicly readable. Fix: add `requireAuth` to both endpoints immediately. |
| A-03 | Object storage ACL not enforced | 🔴 Critical | ❌ Open | Any authenticated user can download any other user's private file via `/storage/objects/*path`. Ownership is not verified. Fix: check `user_id` matches the file path prefix before serving. |
| A-04 | Admin routes in `user.ts` bypass Clerk entirely | 🟠 High | ❌ Open | Routes like `/admin/premium-requests`, `/admin/users`, `/admin/users/:userId/premium` only check the PIN header. No `requireAuth`. Fix: require both. |
| A-05 | No audit log for admin actions | 🟡 Medium | ❌ Open | PIN-authenticated operations leave no traceable record. Fix: log all admin mutations to a dedicated `admin_audit_log` table. |

---

## Input Validation

| # | Item | Severity | Status | Notes |
|---|---|---|---|---|
| V-01 | JSONB census columns accept raw user input without Zod validation | 🟠 High | ❌ Open | `families`, `head_census`, `members` are `JSON.stringify`'d from request body and stored directly. Malformed or malicious JSON can corrupt data or cause unexpected behavior. |
| V-02 | AI chat input not sanitized before Gemini | 🟡 Medium | ❌ Open | Prompt injection is possible — a crafted message could manipulate "Rav Menashe" to produce harmful output. Fix: add a system-level content filter / input sanitizer before the Gemini call. |
| V-03 | No input length limits on text fields | 🟡 Medium | ❌ Open | Name, bio, message fields have no max length validation at the API layer. Add `z.string().max(N)` in Zod schemas. |

---

## Rate Limiting

| # | Item | Severity | Status | Notes |
|---|---|---|---|---|
| R-01 | No rate limiting on any endpoint | 🟠 High | ❌ Open | Admin PIN brute force (10,000 combinations), AI chat abuse, payment endpoint spam, push subscription flood — all trivially possible. Fix: `express-rate-limit` with per-IP and per-user limits. |
| R-02 | No rate limit on Gemini chat | 🟠 High | ❌ Open | Unbounded AI API cost exposure. Fix: per-user daily request cap stored in the DB or Redis. |

---

## Secrets & Configuration

| # | Item | Severity | Status | Notes |
|---|---|---|---|---|
| S-01 | `VITE_ADMIN_PIN` baked into browser bundle | 🟠 High | ❌ Open | If set, the admin PIN is visible in the client-side JavaScript bundle. The PIN check should only happen on the server. |
| S-02 | VAPID private key stored in `.replit` `[userenv]` section | 🟡 Medium | ⚠️ Review | Visible in the project config to any collaborator. Should be in Replit Secrets instead. |
| S-03 | Razorpay public key exposed via `/api/payment/config` | 🟢 Low | ✅ Acceptable | Public keys are designed to be shared. Monitor that private key is never in this route. |

---

## Network & Transport

| # | Item | Severity | Status | Notes |
|---|---|---|---|---|
| N-01 | CORS defaults to `origin: true` when `ALLOWED_ORIGINS` is unset | 🟠 High | ❌ Open | Reflects the requester's origin back — allows any site to make credentialed requests. Fix: always set `ALLOWED_ORIGINS` in production; fail hard if unset. |
| N-02 | Host header injection in Clerk proxy middleware | 🟡 Medium | ❌ Open | `x-forwarded-host` is used to construct proxy URLs without allowlist validation. Fix: validate against a list of known good hosts. |
| N-03 | No HTTPS enforcement at the app level | 🟢 Low | ✅ Replit handles | Replit's proxy terminates TLS. Acceptable in current hosting. Revisit if self-hosted. |

---

## Data Privacy

| # | Item | Severity | Status | Notes |
|---|---|---|---|---|
| D-01 | No data retention policy | 🟡 Medium | ❌ Open | Census submissions, push tokens, and payment records accumulate indefinitely. |
| D-02 | No PII scrubbing in logs | 🟡 Medium | ❌ Open | Pino logs request URLs; query strings may contain PII. The `?` split in the serializer helps but doesn't cover all cases. |
| D-03 | No user data export/deletion flow | 🟡 Medium | ❌ Open | GDPR/privacy regulation compliance requires a way for users to export or delete their data. |

---

## Production Readiness — Security Gate

Before any public / production launch, the following must be resolved:

- [ ] A-01: Replace PIN-only admin auth with Clerk role check
- [ ] A-02: Protect census read endpoints with `requireAuth`
- [ ] A-03: Enforce file ownership in object storage ACL
- [ ] R-01: Add `express-rate-limit` to all endpoints
- [ ] N-01: Set and enforce `ALLOWED_ORIGINS` in production
- [ ] V-01: Add Zod validation to all JSONB census inputs
- [ ] S-01: Remove `VITE_ADMIN_PIN` from frontend bundle
