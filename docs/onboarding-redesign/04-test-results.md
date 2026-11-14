# Test results

- Baseline: 9/9 account onboarding and public-header tests at source `0be7105`.
- Focused: 26/26 shared presentation, role and seen-state guards, customer mobile, account onboarding, header, checkout, rewards and service details tests passed. Web and mobile TypeScript checks and the production Next build passed.
- Chromium via in-app browser: visited the local homepage, confirmed no automatic dialog, all eight primary links and the original hero; opened all three scenes, used Next and Get Started, skipped, reloaded, verified replay and checked keyboard arrows, Tab, Shift-Tab, Escape and focus return. Seven viewport widths tested for document and dialog overflow. Light and dark styles observed. Verified the final action was fully inside the viewport at 320 × 568 and 390 × 844. Screenshots: [desktop](evidence/desktop.jpg), [mobile web](evidence/mobile-web.jpg).
- Installed build evidence: Xcode Release, iOS 26.5 iPhone 17 Pro simulator; Gradle release APK, Android 17 emulator. Both were installed and reached guest Home on launch. The iOS launch also showed the existing local cart-storage warning; emulator interaction was blocked by the locked Mac. Native scene interactions, signed builds and physical devices remain unverified.
- Broad regression: 723 tests, 697 passed, zero failed and 26 opt-in PostgreSQL tests skipped. The first run failed on the unfinished matrix; the corrected matrix also passed its focused validation. See [validation](evidence/validation.txt).

All 60 scenarios retain their IDs in the JSON matrix. Partial evidence does not close the corresponding gate for every platform.
