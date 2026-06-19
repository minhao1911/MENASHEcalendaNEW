const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

config.resolver.unstable_enablePackageExports = true;

// Explicit @/ alias so Metro resolves it correctly after cache invalidation.
// babel-preset-expo reads tsconfig paths, but Metro's own resolver needs
// this for require.context (expo-router) resolution to work reliably.
config.resolver.alias = {
  "@": path.resolve(__dirname),
};

// @hebcal/noaa@0.11.0 ships only pure ESM (export class + top-level await import).
// Metro does not Babel-transform node_modules by default, so the raw ESM goes
// directly to Terser during production builds and fails with "Unexpected token".
// The fix: intercept @hebcal/noaa resolution and point it at a pre-compiled
// CJS shim (generated once via Babel — see shims/hebcal-noaa-cjs.js).
const noaaShim = path.resolve(__dirname, "shims/hebcal-noaa-cjs.js");

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "@hebcal/noaa") {
    return { filePath: noaaShim, type: "sourceFile" };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
