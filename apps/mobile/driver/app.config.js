// Local driver shell reuses the existing application and canonical backend.
if (process.env.EAS_BUILD_PROFILE !== "local-demo")
  throw new Error("Driver shell is local-only pending release acceptance.");
const base = require("../app.config.js");
const path = require("node:path");
module.exports = {
  ...base,
  name: "EasyGas Driver Local",
  slug: "easygas-driver-local",
  scheme: "easygas-driver",
  icon: "../assets/app-icon.png",
  extra: {
    easygasRuntime: "local-demo",
    driverOnly: true,
    driverCameraEnabled: true,
  },
  ios: { ...base.ios, bundleIdentifier: "com.easygasng.driver.local" },
  android: { ...base.android, package: "com.easygasng.driver.local" },
  // Inherited local plugins are relative to apps/mobile, not this nested shell.
  plugins: base.plugins.map((p) => {
    const [name, options] = Array.isArray(p) ? p : [p, undefined];
    const resolved = name.startsWith("./plugins/")
      ? path.resolve(__dirname, "..", name)
      : name;
    if (name === "expo-image-picker")
      return [
        resolved,
        {
          ...options,
          cameraPermission:
            "Photograph the assigned delivery with customer consent.",
          photosPermission:
            "Choose approved delivery evidence only when enabled by dispatch.",
        },
      ];
    return options === undefined ? resolved : [resolved, options];
  }),
};
