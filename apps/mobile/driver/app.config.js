// Local driver shell reuses the existing application and canonical backend.
if (process.env.EAS_BUILD_PROFILE !== 'local-demo') throw new Error('Driver shell is local-only pending release acceptance.');
const base = require('../app.config.js');
module.exports = {
  ...base,
  name: 'EasyGas Driver Local', slug: 'easygas-driver-local', scheme: 'easygas-driver',
  icon: '../assets/app-icon.png',
  extra: { easygasRuntime: 'local-demo', driverOnly: true, driverCameraEnabled: true },
  ios: { ...base.ios, bundleIdentifier: 'com.easygasng.driver.local' },
  android: { ...base.android, package: 'com.easygasng.driver.local' },
  plugins: base.plugins.map(p => Array.isArray(p) && p[0] === 'expo-image-picker' ? [p[0], { ...p[1], cameraPermission: 'Photograph the assigned delivery with customer consent.', photosPermission: 'Choose approved delivery evidence only when enabled by dispatch.' }] : p),
};
