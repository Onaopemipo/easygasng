# EasyRewards verification

The browser, native and database checks used local isolated data and synthetic accounts. The source baseline was `54b1b15` plus the working-tree changes. The baseline synthetic programme had no approved policy, no offers and zero available points. A separate fixture used the normal independent approval workflow to verify eligible offers and referrals.

| Verification | Result |
| --- | --- |
| Existing rewards baseline | 30 passed. [Baseline](evidence/baseline.txt) |
| Redesign tests | 4 passed, including pending versus posted points, order references, history cap, referral flags and cross-account access. [Focused results](evidence/focused.txt) |
| Full regression | 694 passed with isolated PostgreSQL, zero failures or skips. [Regression output](evidence/full-regression.txt) |
| Web production build and TypeScript | Passed. [Build](evidence/web-build.txt), [types](evidence/web-types.txt) |
| Expo TypeScript and bundle export | Passed for iOS and Android. [Types](evidence/native-types.txt), [exports](evidence/native-export.txt) |
| Chromium responsive and recovery | Passed at 320, 375, 390, 430, 768 and 1440px. Verified history disclosure, offline recovery, server error retry, expired session redirect and System dark appearance. [Browser results](evidence/browser.txt) |
| Chromium enabled programme | Approved offer applied the configured discount at checkout and deducted points once. The signed history entry linked to the owned order. Verified keyboard focus, mobile sheet, double-click handling, no localhost share link, self-attribution rejection and successful same-branch attribution without immediate points. [Enabled programme results](evidence/browser-enabled.txt) |
| iPhone 17 Pro, iOS 26.5 Simulator | Fresh Release build passed sign-in, EasyRewards navigation, zero pending events, no active referral action and empty history. Explicit dark appearance and larger text passed in separate runs. [Normal](evidence/ios.txt), [dark](evidence/ios-dark.txt), [larger text](evidence/ios-large.txt) |
| Pixel 8 emulator | Unminified local release APK passed sign-in, EasyRewards navigation, empty history, Android Back and a larger-text dark appearance run. The standard minified APK built and then crashed before React Native in AndroidX WorkManager initialization, reproducing the pre-existing release blocker. [Local check](evidence/android.txt), [larger text](evidence/android-large.txt), [minified launch](evidence/android-minified-launch.txt) |
| Requirements matrix | 30 requirements, 65 scenarios and 30 gates. Matrix validation passed. [Traceability](../traceability/easyrewards-redesign-rtm.md), [matrix validation](evidence/traceability.txt) |

## Commands

- Baseline `node --import tsx --test --test-concurrency=1 tests/easyrewards.test.ts tests/easyrewards-completion.test.ts`.
- Focused `node --import tsx --test --test-concurrency=1 tests/easyrewards-redesign.test.ts`.
- Full suite `node --no-wasm-code-gc --import tsx --test --test-concurrency=1 tests/*.test.ts`, with local PostgreSQL opt-in and the isolated test database URL.
- Web `npm run build` and `npm run typecheck`.
- Mobile `npm --prefix apps/mobile run typecheck` and `expo export --platform all`. Installed tests used `expo run:ios --configuration Release`, XCTest and Gradle `:app:assembleRelease`.
- The CSS import initially prevented three Node tests from loading the affected modules. The scoped styles now load from the root layout. The three tests passed on rerun. [CSS regression](evidence/css-regression.txt)

## Screenshots

- Web [desktop](evidence/desktop.png), [mobile light](evidence/mobile-light.png), [mobile dark](evidence/mobile-dark.png), [history](evidence/desktop-history.png) and [referral sheet](evidence/mobile-referral-sheet.png).
- iOS [light](evidence/ios.png), [dark](evidence/ios-dark.png) and [larger text](evidence/ios-large.png).
- Android [light](evidence/android.png) and [dark with larger text](evidence/android-large-dark.png).

Native checkout and enabled referrals, native network recovery, screen-reader acceptance and minified Android launch remain open. See the matrix for the remaining navigation and appearance checks.
