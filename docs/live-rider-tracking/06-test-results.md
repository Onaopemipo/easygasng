# Tracking verification

See [requirements, test scenarios and gates](../traceability/live-rider-tracking-rtm.md) for mapped evidence. The [focused run](evidence/focused.txt) covers consent, ownership, branch and per-user access, replay, observation freshness, and existing dispatch and OSRM guards. Web and native compiler and export evidence is in this directory.

Provider-connected browser/mobile tests, real background GPS, hosted security headers, device permissions and battery behavior, accessibility and realistic concurrent fleet/load tests require separate acceptance. A JavaScript bundle export does not prove signed native operation.

| Verification | Result |
| --- | --- |
| Full repository regression with disposable local PostgreSQL | 680 passed, 0 failed, 0 skipped. [Log](evidence/full-regression.txt) |
| Focused tracking, offline, dispatch and routing | 46 passed, 0 failed, 0 skipped. [Log](evidence/focused.txt) |
| Traceability matrix validator | 2 passed, 0 failed. [Log](evidence/traceability.txt) |
| Web production build and TypeScript | Passed. [Build](evidence/web-build.txt), [types](evidence/web-types.txt) |
| Native TypeScript and Expo export | Passed for JavaScript bundles. [Types](evidence/native-types.txt), [export](evidence/native-export.txt) |
| Chromium against isolated synthetic records | Authenticated customer and dispatcher fallback passed. Customer tracking fit 320, 375, 390, 768, 1024 and 1440 px and cleared its observation on offline transition. [Log](evidence/browser.txt) |

The full suite initially surfaced an unavailable-response shape regression and a launch-config hash guard. The final run preserves the existing `gps.enabled=false` shape and records the precise opt-in native maps config delta under `native-config-change.json`, retaining the existing onboarding and GPS-launch checks.
