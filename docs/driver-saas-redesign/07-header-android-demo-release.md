# Native correction and authorised demo release — 18 November 2026

The user explicitly requested: fix the iOS header, finish Android checks, push all changes and deploy to the demo, preserving fulfilment and Paystack sandbox. This authorisation supersedes the supplied design brief’s automatic-deployment hold for this named synthetic demo only. Commercial production NO-GO, physical acceptance and historical Excel import hold remain.

## Changes and reproduced defects

`apps/mobile/DriverWorkspace.tsx` replaces the nested clipped header SafeAreaView with a non-collapsible native View using the existing top safe-area inset. The brand/action row cannot shrink, its native hierarchy is retained, and only the decorative wave layer clips. Navigation and resolved-theme changes recreate the header without remounting delivery state or changing mutation authority.

Android interactive testing reproduced a History loading crash: the nested driver package did not declare `react-native-svg`, so the release lacked the `RNSVGRadialGradient` native manager used by the shared EasyGasLoader. `apps/mobile/driver/package.json` now declares the already installed parent version 15.16.0. Both native builds link SVG; `DRVS-NATIVE-LINK` verifies the nested declaration. No package version upgrade, schema, canonical payload, payment/proof/custody/GPS guard or production flag was changed.

## Executed native acceptance

Final installed iOS Release: EasyGas Onboarding QA / iOS 26.5. Final installed Android ARM64 Release: dedicated EasyGas_Driver_QA / Android API37.1. Both connect only to disposable local synthetic QA. [Manual observations](evidence/header-release/native-observations.txt), [iOS build](evidence/header-release/ios-svg-build.txt), [Android build](evidence/header-release/android-svg-build.txt).

All four screens render their branding and truthful records. Android History now loads without crashing; Profile dark mode and System restoration pass. Android In progress/detail/system Back preserves the selected filter. Availability is separate from Backend Connected, GPS Not granted and No active trip. Closed History has no old customer contact/address. No OS location/camera permission or physical handover was asserted. Immediate captures sometimes omitted unchanged compositor layers, including OS clock or bottom tabs; final settled captures were visually reviewed and retained.

Final screenshots: `evidence/header-release/ios-svg-{home,orders,history,profile,profile-dark}.png`; Android `android-svg-home.png`, `android-svg-back-filter.png`, `android-svg-history.png`, `android-svg-profile-settled.png`, `android-svg-profile-dark.png`.

Fresh focused tests: 33 PASS, 0 failed/skipped. Web/native typechecks pass. Both production dependency audits report 0 vulnerabilities. Evidence is under `evidence/header-release`. The prior complete PostgreSQL run remains 749/749; fresh GitHub validation on the release commit is required before promotion and will be recorded here.

## Release record

Push, fresh GitHub validation and candidate deployment/promotion pending. Permanent project fulfilment flags must stay true; Paystack configuration must report environment `test`. No deployment-specific setting overrides are needed. Candidate must be Ready and checked before promotion to https://easygas-client-demo.vercel.app.

## Retained acceptance gaps

The phase keeps all 12 requirements, 90 scenarios and 40 gates. Native physical permissions, locked screen, airplane/reconnect, camera/proof/OTP/handover, VoiceOver/TalkBack and target dynamic type remain open. Exact requested 35% density comparison remains unverified. These gates remain in coverage denominators and are separate from this authorised synthetic web demo release.
