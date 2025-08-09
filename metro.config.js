const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Simple configuration for web builds
if (process.env.NODE_ENV === 'production') {
  // Block Stripe modules entirely for production web builds
  config.resolver.blockList = [
    /@stripe\/stripe-react-native/,
    /react-native\/Libraries\/Utilities\/codegenNativeCommands/,
    /react-native\/Libraries\/TurboModule\/TurboModuleRegistry/,
  ];
}

module.exports = config;