// Local technician shell reuses the existing application and canonical backend.
if (process.env.EAS_BUILD_PROFILE !== 'local-demo') throw new Error('Technician shell is local-only pending release acceptance.');
const base = require('../app.config.js');
const path = require('node:path');
module.exports = {
  ...base,
  name: 'EasyGas Technician Local', slug: 'easygas-technician-local', scheme: 'easygas-technician',
  icon: '../assets/app-icon.png',
  extra: { easygasRuntime: 'local-demo', technicianOnly: true, technicianCameraEnabled: true },
  ios: { ...base.ios, bundleIdentifier: 'com.easygasng.technician.local' },
  android: { ...base.android, package: 'com.easygasng.technician.local' },
  plugins: base.plugins.map(p => {
    const [name, options] = Array.isArray(p) ? p : [p, undefined];
    const resolved = name.startsWith('./plugins/') ? path.resolve(__dirname, '..', name) : name;
    if (name === 'expo-image-picker') return [resolved, { ...options, cameraPermission: 'Photograph the assigned service with customer consent.', photosPermission: 'Choose approved service evidence only when enabled by dispatch.' }];
    return options === undefined ? resolved : [resolved, options];
  }),
};
