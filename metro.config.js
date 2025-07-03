const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Add WASM support
config.resolver.assetExts.push("wasm");

// Add resolver for Trust Wallet Core
config.resolver.alias = {
  ...config.resolver.alias,
  "@trustwallet/wallet-core": require.resolve("@trustwallet/wallet-core"),
};

module.exports = config;
