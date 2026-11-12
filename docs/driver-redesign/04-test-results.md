# Driver test evidence

| Check | Evidence |
| --- | --- |
| Targeted pre-change regression | [29 passing checks](evidence/baseline-focused.txt) |
| Driver History and verified directions | [Two passing integration tests](evidence/driver-experience-tests.txt) |
| Web types and production build | [Types](evidence/web-types.txt) and [build](evidence/web-build.txt) |
| Authenticated browser | [Light](evidence/browser.txt) and [dark](evidence/browser-dark.txt) role routing, viewport, access, reconnect and appearance checks |
| Native TypeScript and bundling | [Types](evidence/native-types.txt) and [Expo exports](evidence/native-export.txt) |
| Installed iOS | [Fresh build](evidence/ios-build.txt), [light XCTest](evidence/ios-ui.txt) and [dark XCTest](evidence/ios-dark.txt) |
| Installed Android | [Unminified local build](evidence/android-build.txt) and [Pixel 8 emulator smoke test](evidence/android-ui.txt). Standard minified release remains open. |
| Application regression | [701 passed, zero failed or skipped](evidence/full-regression.txt), including local PostgreSQL and cross-role checks |
| Final driver and traceability verification | [19 driver and dispatch tests](evidence/driver-final-focused.txt), [two traceability tests](evidence/traceability.txt) |

Browser captures [Home](evidence/web-home.png), [Orders](evidence/web-orders.png), [History](evidence/web-history.png) and [Profile](evidence/web-profile.png). iPhone Simulator captures [Home](evidence/ios-home.png), [Orders](evidence/ios-orders.png), [History](evidence/ios-history.png) and [Profile](evidence/ios-profile.png). The captures show synthetic data. Dark captures are available for [web](evidence/web-dark-home.png) and [iPhone Simulator](evidence/ios-dark-home.png), with the other three tabs alongside each. The [Android Home](evidence/android-home.png), [Orders](evidence/android-orders.png), [History](evidence/android-history.png) and [Profile](evidence/android-profile.png) captures use the local emulator build.

The traceability matrix records coverage of each requested scenario. Installed verification does not substitute for physical-device background GPS, lock-screen operation, OS permission changes, screen-reader acceptance or a real delivery with proof.
