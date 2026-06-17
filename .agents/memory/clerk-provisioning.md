---
name: Clerk provisioning requirement
description: Clerk must be provisioned via setupClerkWhitelabelAuth() before the web app works; App.tsx and post-merge.sh now guard against missing keys.
---

# Clerk Provisioning

**Rule:** At the start of any session involving auth, always call `checkClerkManagementStatus()` first. If it returns `not_configured`, immediately call `setupClerkWhitelabelAuth()` before touching any other code.

**Why:** VITE_CLERK_PUBLISHABLE_KEY is a Replit-managed secret that only exists after provisioning. Without it, the web app renders a "Authentication Not Provisioned" screen and throws. The app used to crash the entire React tree with a bare `throw new Error`; it now shows a styled fallback UI so the symptom is obvious without a white screen.

**How to apply:**
1. `checkClerkManagementStatus()` → if `not_configured` → `setupClerkWhitelabelAuth()`
2. Then restart both the API server and the web workflows so new secrets are baked in.
3. The `post-merge.sh` guard will also fail loudly (`exit 1`) if `VITE_CLERK_PUBLISHABLE_KEY` is unset after a merge, preventing silent failures.

**Safeguards added (as of 2025-06-17):**
- `artifacts/menashe-calendar/src/App.tsx` — styled fallback UI instead of hard crash
- `scripts/post-merge.sh` — exits with clear error message if key is missing
