const { AndroidConfig, withAndroidManifest } = require("expo/config-plugins");

module.exports = (config, { enabled }) => withAndroidManifest(config, (mod) => {
  const application = AndroidConfig.Manifest.getMainApplicationOrThrow(mod.modResults);
  if (enabled) application.$["android:usesCleartextTraffic"] = "true";
  else delete application.$["android:usesCleartextTraffic"];
  return mod;
});
