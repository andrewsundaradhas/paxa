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
