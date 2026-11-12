# Verification

| Check | Result |
| --- | --- |
| Full repository suite with disposable local PostgreSQL | 684 passed, 0 failed, 0 skipped. [Log](evidence/full-regression.txt) |
| Focused service and booking suite | 30 passed, 0 failed, 0 skipped. [Log](evidence/focused.txt) |
| Web build and typecheck | Passed. [Build](evidence/web-build.txt), [types](evidence/web-types.txt) |
| Native typecheck and Expo JavaScript exports | Passed. [Types](evidence/native-types.txt), [export](evidence/native-export.txt) |
| Requirements matrix validation | 2 passed, 0 failed. [Log](evidence/traceability.txt) |
| Fresh iOS Simulator build | Compiled, installed and launched on iPhone 17 Pro. [Build](evidence/ios-simulator-build.txt) |
| Chromium, isolated synthetic accounts | Existing service links, disabled and empty availability, keyboard accordion, seven widths, system dark theme, actual booking, offline recovery, competing slot recovery with contact draft retention, and guest return. [Log](evidence/browser.txt) |

Browser evidence uses local synthetic records. [Desktop unavailable](evidence/desktop-unavailable.png) and [mobile web available, dark](evidence/mobile-dark-available.png). The bookings used synthetic accounts and records. The Mac was locked during the authenticated iOS Simulator interaction check. Android runtime, hardware Back and assistive technology acceptance require separate device testing.
