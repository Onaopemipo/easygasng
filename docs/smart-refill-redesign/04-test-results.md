# Smart Refill verification

All runtime checks used synthetic data in an isolated local environment. The [traceability matrix](../traceability/smart-refill-redesign-rtm.md) records 63 passing scenarios and seven partially verified scenarios. It records 20 passing, nine partial and one blocked acceptance gate.

| Check | Result | Evidence |
| --- | --- | --- |
| Existing Cooking Gas Profiles tests | Five passed before the redesign and on rerun | [Profile regression](evidence/profiles-regression.txt) |
| Focused Smart Refill, profile, rewards and customer checks | 34 passed | [Focused results](evidence/focused.txt) |
| Cross-feature checks with isolated PostgreSQL | 73 passed, including concurrent profile writes and payment, inventory and cylinder custody workflows | [Cross-feature results](evidence/cross-feature.txt) |
| Full regression with isolated PostgreSQL | 699 passed, zero failures or skips | [Full regression](evidence/full-regression.txt) |
| Web build and typecheck | Both passed | [Build](evidence/web-build.txt), [types](evidence/web-types.txt) |
| Native typecheck and Expo bundle export | Both passed, including iOS and Android bundles | [Types](evidence/native-types.txt), [export](evidence/native-export.txt) |
| Authenticated Chromium with local fixtures | Passed at 320, 375, 390, 430, 768, 1024 and 1440 px. Confirmed scoped access, creation, validation, confirmed writes, cooldown, history, offline write blocking, reconnect, draft retention and keyboard focus | [Browser log](evidence/browser.txt), [desktop](evidence/desktop.png), [mobile dark](evidence/mobile-dark.png), [create form](evidence/mobile-sheet.png) |
| Fresh iPhone 17 Pro Simulator build | Passed sign-in, profile creation, supply save and confirmed history. The final build also passed entry from Account and Home | [XCUITest results](evidence/ios.txt), [activity](evidence/ios-activity.png) |
| Fresh Pixel 8 emulator build | Passed entry from Account and Home, creation sheet Back behavior and confirmed activity using the unminified local APK | [Android results](evidence/android.txt), [screen](evidence/android.png), [activity](evidence/android-activity.png) |
| Standard minified Android release | Built successfully. The installed app still crashes during AndroidX WorkManager startup before React Native opens | [Launch log](evidence/android-minified-launch.txt) |
| Requirements traceability | Both validator tests passed | [Validator](evidence/traceability.txt) |

The full suite used the following command with the synthetic PostgreSQL instance. The isolated instance ran only for regression checks.

```sh
env -u DATABASE_URL EASYGAS_ENABLE_LOCAL_PG_TESTS=yes \
  EASYGAS_TEST_POSTGRES_URL=postgresql://127.0.0.1:56479/easygas_test_release \
  node --no-wasm-code-gc --import tsx --test --test-concurrency=1 tests/*.test.ts
npm run build
npm run typecheck
npm run typecheck --prefix apps/mobile
node --import tsx --test tests/customer-traceability.test.ts
```

Native validation used `npx expo export --platform all` and `npx expo run:ios --configuration Release` in `apps/mobile`, `./gradlew :app:assembleRelease` in the generated Android project, XCUITest on iPhone 17 Pro and Android Debug Bridge UI automation on Pixel 8. The unminified APK used a local-only build property. Neither native project needed a tracked configuration change for QA.

The [first full regression run](evidence/full-regression-initial.txt) failed the protected Home source integrity check. Smart Refill routing moved to the app navigation callback and the [isolated integrity check](evidence/protected-source.txt) and final full suite passed. An iPhone smoke attempt asserted the estimates text while the screen was still loading. The rerun waited for the confirmed state and passed on the same build.

Open acceptance includes VoiceOver and TalkBack, larger native text, installed-device offline recovery, all appearance choices, positive forecast rendering and an eligible offer handoff from Smart Refill. The standard minified Android build is a release blocker. See the matrix for the scope and evidence behind each status.
