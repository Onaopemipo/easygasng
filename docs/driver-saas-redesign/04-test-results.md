# Executed validation — 18 November 2026

Source under test: `274e75e`, with isolated prerequisite `a97f4de`; baseline `904fc6b`. Node 24.21.0 / npm 11.19.0. This phase used only disposable local databases, localhost QA and dedicated iOS simulator. Test fixtures are synthetic, never illustrative production records. No hosted order/payment/settings were touched.

| Check | Actual result | Evidence |
| --- | --- | --- |
| Baseline web/native types, webpack build, 30 focused tests | PASS; 0 failed/skipped | evidence/baseline-*.txt |
| Final full PostgreSQL-enabled regression | **749 PASS, 0 failed, 0 skipped**, 531755ms | [full-regression.txt](evidence/full-regression.txt) |
| Chrome four views at six widths; real local API and failure recovery | PASS, 1 comprehensive scenario, 0 failed/skipped | [web-browser.txt](evidence/web-browser.txt) |
| Web TypeScript and production webpack build | PASS | [types](evidence/web-types.txt), [build](evidence/web-build.txt) |
| Native TypeScript; iOS/Android Hermes exports | PASS | [types](evidence/native-types.txt), [exports](evidence/native-exports.txt) |
| Dedicated iOS Release compile/install/start | PASS, 0 errors / 2 warnings | [ios-build.txt](evidence/ios-build.txt) |
| Installed iOS four screens, detail/back/filter and appearance | Functional checks PASS; final header visual acceptance incomplete | [UI observations](evidence/ios-ui-verification.txt), ios-*-light/dark.png |
| Dedicated Android ARM64 Release APK compile | PASS, 313 tasks, BUILD SUCCESSFUL | [android-build.txt](evidence/android-build.txt) |
| Web production dependency audit at high gate | 0 vulnerabilities | [web-audit.txt](evidence/web-audit.txt) |
| Native production dependency audit at moderate gate | 0 vulnerabilities | [native-audit.txt](evidence/native-audit.txt) |
| Final phase/all existing RTM validation | PASS,2 tests /0 failures | [traceability-validation.txt](evidence/traceability-validation.txt) |

Exact commands (from repository root unless a cwd is shown):

```sh
EASYGAS_ENABLE_LOCAL_PG_TESTS=yes EASYGAS_TEST_POSTGRES_URL=postgresql://philipog@127.0.0.1:55473/easygas_test_holistic EASYGAS_BACKGROUND_JOBS=false npm test
npm run typecheck
npm run build
npm --prefix apps/mobile run typecheck
npm audit --omit=dev --audit-level=high
npm --prefix apps/mobile audit --omit=dev --audit-level=moderate
node --import tsx --test --test-reporter=spec tests/customer-traceability.test.ts
```

Web build log uses Next's production webpack command (`next build --webpack`); the npm root build forwards to apps/web. Native Hermes exports: cwd apps/mobile, `EAS_BUILD_PROFILE=local-demo EXPO_PUBLIC_API_URL=http://127.0.0.1:3098 npx expo export --platform ios --platform android --output-dir /tmp/easygas-driver-saas/native-export-final`. This bundles existing native modules, not store-signing acceptance.

Browser command:

```sh
EASYGAS_DRIVER_QA_CREDENTIAL_FILE=/tmp/easygas-driver-saas/credentials.json EASYGAS_QA_PLAYWRIGHT_MODULE=/tmp/easygas-deploy-20261114.kPxY2q/browser/node_modules/playwright-core/index.mjs node --test --test-reporter=spec scripts/qa-driver-saas.mjs
```

Actual Chrome connects to webpack dev server localhost:3098 and disposable PostgreSQL database easygas_test_driver_saas_20261118. Credentials are temporary mode-600 files outside the repository. All four views pass page/workspace overflow checks at 320/390/768/1024/1440/1920px. Light/dark/system, reduced motion, filters/back, closed-history privacy, empty driver, server-confirmed availability on/off, real active-work 409 and duplicate-tap suppression pass. Browser-injected 429, real 15-second read deadline, offline recovery and injected 401 sign-in clearance pass. Customer calls to driver snapshot/availability return 403. Injected faults are explicitly not provider/live session claims.

Dedicated native builds:

```sh
# cwd apps/mobile/driver
EAS_BUILD_PROFILE=local-demo EXPO_PUBLIC_API_URL=http://127.0.0.1:3098 npx expo run:ios --configuration Release --device B4AE1FB6-4BC2-43F8-94F1-8A80DD1D7A30 --no-install --no-bundler
EAS_BUILD_PROFILE=local-demo EXPO_PUBLIC_API_URL=http://10.0.2.2:3098 npx expo prebuild --platform android --no-install
# cwd apps/mobile/driver/android; local.properties points to existing local SDK
EAS_BUILD_PROFILE=local-demo EXPO_PUBLIC_API_URL=http://10.0.2.2:3098 ANDROID_HOME=/Users/philipog/Library/Android/sdk ./gradlew :app:assembleRelease --no-daemon -PreactNativeArchitectures=arm64-v8a -Dorg.gradle.jvmargs=-Xmx2048m
```

Android output: apps/mobile/driver/android/app/build/outputs/apk/release/app-release.apk (local QA binary, not distribution/store acceptance). Generated Android build files are ignored and not committed. iOS com.easygasng.driver.local was installed on EasyGas Onboarding QA / iOS26.5 and verified through Device Hub. Home showed actual 1 new / 1 in-progress / 0 completed, true availability independently of GPS Not granted and No active trip; Orders filter/detail/back retained selection; closed declined History/detail exposed no old contact; Profile read-only vehicle/verification and actual identity/preferences were observed. Existing dark appearance applied across all four screens and System was restored. No OS permission was granted or physical delivery asserted.

Development findings resolved before the final successful runs: nested driver plugin paths failed; fixed separately and regression-tested. Two browser test expectations were corrected for asynchronous System appearance and the existing global 401 sign-in redirect. Early failed runs are not represented as acceptance passes. No product guard was weakened to satisfy a test. Android compile reports Gradle deprecations; iOS reports two toolchain warnings, with no compilation errors.

Missing proof remains in scope: Android screen/Back testing (no isolated interactive target established; other active emulator not commandeered; local disk approximately 2.6GiB free and avdmanager absent), physical iOS/Android permissions, camera/proof/OTP/handover, locked screen/airplane/reconnect, VoiceOver/TalkBack and target-device dynamic type. Provider map intentionally omitted. No screenshots exist for Android, actual offline native proof or provider navigation, and none is inferred from a build. RTM retains all 90 scenarios and 40 gates, including these unexecuted items. Production remains NO-GO.

Additional browser verification on cbcb821 (application code remains 274e75e): the actual Edit your name form saved a synthetic name, reread it from the backend and restored it. Attempts to submit role, branch_id or active through account.update each returned 400, leaving governed fields unchanged. Browser suite reran successfully after adding this check.

Final native screenshot review: Home shows the branded header. Some saved Orders/History/Profile screenshots expose their heading but lack the top branding row even though its controls remain in AX. This is an unresolved visual observation, not accepted parity. An additional Device Hub check found the shared window switched to another active app; its QA-selection attempt was rejected because the user changed the app. No competing interaction was forced. G08–G10 remain BLOCKED for an isolated header recheck/correction. Existing functional screen observations remain valid; full visual acceptance is not claimed.
