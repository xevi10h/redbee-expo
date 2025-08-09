// Web shims for React Native modules that don't work on web

// Mock for native commands and modules
const mockNativeModule = {
  default: {},
  Commands: {
    blur: () => {},
    focus: () => {},
    clear: () => {},
  },
  __INTERNAL_VIEW_CONFIG: {
    uiViewClassName: 'MockView',
    directEventTypes: {},
    validAttributes: {},
  },
};

// Export mock objects for different import patterns
module.exports = mockNativeModule;
module.exports.default = mockNativeModule;
module.exports.Commands = mockNativeModule.Commands;

// Handle global polyfills
if (typeof window !== 'undefined') {
  // Mock native modules that cause issues on web
  if (!global.nativeCallSyncHook) {
    global.nativeCallSyncHook = undefined;
  }
  
  // Ensure global is available for AsyncStorage
  if (!global.window) {
    global.window = window;
  }
  
  // Add any additional web-specific polyfills here
} else {
  // For Node.js environment during SSR, define a minimal window object
  if (typeof global !== 'undefined' && !global.window) {
    global.window = {
      localStorage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      },
    };
  }
}