const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Add WASM support
config.resolver.assetExts.push("wasm");

// Ensure WASM files are treated as assets
config.transformer = {
  ...config.transformer,
  assetPlugins: ["expo-asset/tools/hashAssetFiles"],
};

module.exports = config;
