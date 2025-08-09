const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // Add fallbacks for Node.js modules that aren't available in browsers
  config.resolve.fallback = {
    ...config.resolve.fallback,
    crypto: false,
    stream: false,
    path: false,
    fs: false,
  };

  // Add alias to prevent native module imports
  config.resolve.alias = {
    ...config.resolve.alias,
    'react-native/Libraries/Utilities/codegenNativeCommands': false,
    'react-native/Libraries/TurboModule/TurboModuleRegistry': false,
  };

  // Ignore specific modules that cause issues on web
  config.plugins.push(
    new config.plugins.constructor.IgnorePlugin({
      resourceRegExp: /^react-native\/Libraries\/Utilities\/codegenNativeCommands$/,
    })
  );

  config.plugins.push(
    new config.plugins.constructor.IgnorePlugin({
      resourceRegExp: /^react-native\/Libraries\/TurboModule\/TurboModuleRegistry$/,
    })
  );

  return config;
};