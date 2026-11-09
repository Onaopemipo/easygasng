# Theme And Motion

ThemeProvider hydrates device preference before app UI mounts. SecureStore stores light/dark/system; system changes follow useColorScheme. Explicit device preference takes priority and survives sign-out; no identity data is stored with it. Native onboarding fade respects Reduce Motion; no decorative looping animations. Legacy surfaces use a compatibility bridge pending per-screen semantic token conversion. Native launch artwork, keyboard surfaces and all contrast cases require device validation.
