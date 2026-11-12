const base = require("./app.json");
const localDemo = process.env.EAS_BUILD_PROFILE === "local-demo";
const production = process.env.EAS_BUILD_PROFILE === "production";
const origin = process.env.EXPO_PUBLIC_API_URL;
const mapsEnabled = process.env.EASYGAS_NATIVE_GOOGLE_MAPS_ENABLED === "true";
const iosMapsKey = mapsEnabled && process.env.EASYGAS_GOOGLE_MAPS_IOS_KEY;
const androidMapsKey =
  mapsEnabled && process.env.EASYGAS_GOOGLE_MAPS_ANDROID_KEY;

if (production) {
  let url;
  try {
    url = new URL(origin ?? "");
  } catch {
    throw new Error("Production native builds require EXPO_PUBLIC_API_URL.");
  }
  if (
    url.protocol !== "https:" ||
    ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw new Error(
      "Production native API URL must be a public HTTPS origin, without /api, credentials or query.",
    );
  if (process.env.EASYGAS_NATIVE_IDENTIFIERS_CONFIRMED !== "true")
    throw new Error(
      "Confirm ownership of the EasyGas bundle/package identifiers before signed production builds.",
    );
}
if (localDemo) {
  const url = new URL(origin ?? "http://127.0.0.1:3003");
  if (
    url.protocol !== "http:" ||
    !["localhost", "127.0.0.1", "[::1]", "10.0.2.2"].includes(url.hostname) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw new Error(
      "Local demo builds require an explicit loopback backend origin.",
    );
}
module.exports = {
  ...base.expo,
  name: localDemo ? "EasyGas Local" : base.expo.name,
  plugins: [
    ...(base.expo.plugins ?? []),
    ...(iosMapsKey || androidMapsKey
      ? [
          [
            "react-native-maps",
            {
              ...(iosMapsKey ? { iosGoogleMapsApiKey: iosMapsKey } : {}),
              ...(androidMapsKey
                ? { androidGoogleMapsApiKey: androidMapsKey }
                : {}),
            },
          ],
        ]
      : []),
  ],
  extra: {
    ...base.expo.extra,
    riderMaps: { ios: Boolean(iosMapsKey), android: Boolean(androidMapsKey) },
    easygasRuntime: localDemo
      ? "local-demo"
      : production
        ? "production"
        : "preview",
  },
  ios: {
    ...base.expo.ios,
    ...(localDemo
      ? { bundleIdentifier: base.expo.ios.bundleIdentifier + ".local" }
      : {}),
  },
  android: {
    ...base.expo.android,
    ...(localDemo ? { package: base.expo.android.package + ".local" } : {}),
    usesCleartextTraffic: !production,
  },
};
