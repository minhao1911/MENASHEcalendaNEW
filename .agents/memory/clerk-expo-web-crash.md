---
name: Clerk Expo web TurboModule crash
description: Fix for Cannot read properties of undefined (reading 'get') at TurboModuleRegistry.get("ClerkExpo") when running @clerk/expo on Expo web platform
---

## The rule
`@clerk/expo@3.4.2` dist file (`dist/utils/native-module.js`) hardcodes:
```js
const require_specs_NativeClerkModule = require('../specs/NativeClerkModule.js');
```
with an **explicit `.js` extension** — Metro cannot auto-resolve to the `.web.js` variant.
This `require` runs at **module load time** (before any `Platform.OS` check), so on web it immediately executes `TurboModuleRegistry.get("ClerkExpo")` where `TurboModuleRegistry` is `undefined`, crashing the app.

**Fix in place:** `artifacts/menashe-mobile/metro.config.js` `resolveRequest` intercepts any module path matching `/specs[/\\]NativeClerkModule\.js$/` when `platform === "web"` and redirects to `NativeClerkModule.web.js` (which just exports `null`).

**Why:** The package ships a correct `.web.js` variant but its own bundled dist bypasses platform resolution by hardcoding `.js`. Metro's `resolveRequest` is the only hook that intercepts at the require-string level before file resolution.

**How to apply:** If `@clerk/expo` is upgraded, verify whether the new version still hardcodes the `.js` extension in `dist/utils/native-module.js`. If fixed upstream, the `resolveRequest` override can be removed.
