# Executed verification

| Check | Result |
| --- | --- |
| Full regression suite with disposable PostgreSQL | 690 passed, 0 failed, 0 skipped. One previous run hit a Node 24 WebAssembly GC assertion while running the order-additions suite. The final run disabled WebAssembly code GC for the test process only. |
| Focused profile and concurrency suite | 6 passed, including simultaneous independent PostgreSQL transactions for duplicate creation and conflicting supply writes. |
| Web build and typecheck | Passed. |
| Expo typecheck and exports | Passed for iOS and Android. |
| Authenticated local Chromium | Passed profile creation, five supply choices, local reset, server confirmation, reload, offline retry and account isolation. Verified viewport widths of 320, 375, 390, 768, 1024 and 1440 pixels, keyboard dialog and system dark theme. Mobile web creation cleared the demo banner at all three narrow widths. |
| iOS Simulator | Fresh local release build installed on iPhone 17 Pro. XCTest verified sign-in, the real empty state, profile creation, native supply selection and confirmed save. |
| Android emulator | The minified ARM64 APK built and crashed during AndroidX WorkManager initialisation. A separate local APK with minification disabled and loopback HTTP enabled passed sign-in, creation, Android Back and supply save on Pixel 8. The local build settings were not applied to tracked configuration. |
| Signed physical devices and assistive technology | Not run. |

Evidence is in [the regression log](evidence/full-regression.txt), [the focused log](evidence/focused.txt) and [the browser log](evidence/browser.txt). The captures show the [desktop workspace](evidence/desktop.png), [mobile dark appearance](evidence/mobile-dark.png), [mobile add sheet](evidence/mobile-add-sheet.png), [iOS confirmed save](evidence/ios-supply-saved.png) and [Android local confirmed save](evidence/android-supply-saved.png). See the [iOS XCTest log](evidence/ios-runtime.txt), [Android local verification](evidence/android-runtime.txt) and [minified Android launch failure](evidence/android-launch.txt).
