const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const path = require('path');

/**
 * Monorepo-aware Metro config. Resolves @shared/* from ../shared and hoists
 * react-native from this package's node_modules.
 */
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = {
  watchFolders: [workspaceRoot],
  resolver: {
    // Optional native modules (receipt OCR / camera / Google / Apple) are loaded
    // via `require()` inside try/catch; this lets the bundle build whether or not
    // they're installed, so the app degrades gracefully until the next rebuild.
    allowOptionalDependencies: true,
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(workspaceRoot, 'node_modules'),
    ],
    extraNodeModules: {
      '@shared': path.resolve(workspaceRoot, 'shared/src'),
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(projectRoot), config);
