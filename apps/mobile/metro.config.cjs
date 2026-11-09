const path = require("node:path");
const { getDefaultConfig } = require("expo/metro-config");
const config = getDefaultConfig(__dirname);
// The native app deliberately has its own dependency lockfile. Expose only the
// shared, dependency-free business rules without resolving the web React copy.
config.watchFolders = [
  ...(config.watchFolders || []),
  path.resolve(__dirname, "../../packages"),
];
module.exports = config;
