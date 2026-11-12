# Test results

- `npm test` with isolated PostgreSQL passed 676 tests, with zero failures or skips. [Regression](evidence/full-regression.txt)
- `npm run typecheck`, `npm run build`, and `npm --prefix apps/mobile run typecheck` passed. Expo exported both iOS and Android bundles. [Export](evidence/native-export.txt)
- Chromium exercised ten widths, pending coverage, fractional quantity and line editing, required-field disclosure, quote/edit/requote, and one isolated COD checkout. A separate browser check exercised system appearance, summary stickiness and the in-flow demo notice. [Order checks](evidence/browser.txt) · [Appearance checks](evidence/theme-browser.txt)
- Installed-device, screen-reader and provider acceptance remain open. See the [84-scenario register](scenarios.csv).
