// Ensure Metro recognizes video assets
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);

// Guarantee common video formats are treated as assets
config.resolver.assetExts = [...config.resolver.assetExts, 'mp4', 'mov', 'm4v'];

module.exports = config;