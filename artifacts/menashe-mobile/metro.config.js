const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Enable proper resolution of packages that use the `exports` field in package.json
// Required for @hebcal/core and similar pure-ESM packages
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
