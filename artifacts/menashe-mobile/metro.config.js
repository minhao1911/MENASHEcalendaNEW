const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

config.resolver.unstable_enablePackageExports = true;

// @hebcal/noaa@0.11.0 ships only pure ESM (export class + top-level await import).
// Metro does not Babel-transform node_modules by default, so the raw ESM goes
// directly to Terser during production builds and fails with "Unexpected token".
// The fix: intercept @hebcal/noaa resolution and point it at a pre-compiled
// CJS shim (generated once via Babel — see shims/hebcal-noaa-cjs.js).
const noaaShim = path.resolve(__dirname, "shims/hebcal-noaa-cjs.js");

// @clerk/expo@3.4.2 hardcodes `require('../specs/NativeClerkModule.js')` with
// an explicit .js extension, bypassing Metro's platform-specific resolution.
// The top-level require runs before any Platform.OS check, so on web it
// immediately calls TurboModuleRegistry.get("ClerkExpo") which is undefined
// and crashes. Redirect to the .web.js variant (which just exports null) when
// building for the web platform.
//
// NOTE: use path.resolve instead of require.resolve because Node.js 20 enforces
// the package.json "exports" field and the dist subpath is not listed there.
const clerkExpoDir = path.dirname(
  require.resolve("@clerk/expo/package.json", { paths: [__dirname] }),
);
const clerkNativeModuleWeb = path.join(
  clerkExpoDir,
  "dist/specs/NativeClerkModule.web.js",
);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "@hebcal/noaa") {
    return { filePath: noaaShim, type: "sourceFile" };
  }
  // On web: intercept the hardcoded require('../specs/NativeClerkModule.js')
  // in @clerk/expo's dist. The relative import ends with this pattern and Metro
  // won't auto-pick the .web.js variant because of the explicit .js extension.
  if (
    platform === "web" &&
    /specs[/\\]NativeClerkModule\.js$/.test(moduleName)
  ) {
    return { filePath: clerkNativeModuleWeb, type: "sourceFile" };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
