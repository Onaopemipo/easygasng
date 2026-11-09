// Local technician shell reuses the existing application and canonical backend.
if (process.env.EAS_BUILD_PROFILE !== 'local-demo') throw new Error('Technician shell is local-only pending release acceptance.');
const base = require('../app.config.js');
module.exports = {
  ...base,
  name: 'EasyGas Technician Local', slug: 'easygas-technician-local', scheme: 'easygas-technician',
  icon: '../assets/app-icon.png',
  extra: { easygasRuntime: 'local-demo', technicianOnly: true, technicianCameraEnabled: true },
  ios: { ...base.ios, bundleIdentifier: 'com.easygasng.technician.local' },
  android: { ...base.android, package: 'com.easygasng.technician.local' },
  plugins: base.plugins.map(p => Array.isArray(p) && p[0] === 'expo-image-picker' ? [p[0], { ...p[1], cameraPermission: 'Photograph the assigned service with customer consent.', photosPermission: 'Choose approved service evidence only when enabled by dispatch.' }] : p),
};
