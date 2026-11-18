# Native correction and authorised demo release — 18 November 2026

The user explicitly requested: fix the iOS header, finish Android checks, push all changes and deploy to the demo, preserving fulfilment and Paystack sandbox. This authorisation supersedes the supplied design brief’s automatic-deployment hold for this named synthetic demo only. Commercial production NO-GO, physical acceptance and historical Excel import hold remain.

## Changes and reproduced defects

`apps/mobile/DriverWorkspace.tsx` replaces the nested clipped header SafeAreaView with a non-collapsible native View using the existing top safe-area inset. The brand/action row cannot shrink, its native hierarchy is retained, and only the decorative wave layer clips. Navigation and resolved-theme changes recreate the header without remounting delivery state or changing mutation authority.

Android interactive testing reproduced a History loading crash: the nested driver package did not declare `react-native-svg`, so the release lacked the `RNSVGRadialGradient` native manager used by the shared EasyGasLoader. `apps/mobile/driver/package.json` now declares the already installed parent version 15.16.0. Both native builds link SVG; `DRVS-NATIVE-LINK` verifies the nested declaration. No package version upgrade, schema, canonical payload, payment/proof/custody/GPS guard or production flag was changed.

## Executed native acceptance

Final installed iOS Release: EasyGas Onboarding QA / iOS 26.5. Final installed Android ARM64 Release: dedicated EasyGas_Driver_QA / Android API37.1. Both connect only to disposable local synthetic QA. [Manual observations](evidence/header-release/native-observations.txt), [iOS build](evidence/header-release/ios-svg-build.txt), [Android build](evidence/header-release/android-svg-build.txt).

All four screens render their branding and truthful records. Android History now loads without crashing; Profile dark mode and System restoration pass. Android In progress/detail/system Back preserves the selected filter. Availability is separate from Backend Connected, GPS Not granted and No active trip. Closed History has no old customer contact/address. No OS location/camera permission or physical handover was asserted. Some immediate captures omitted content, including OS clock or bottom tabs; later UI inspection and settled captures were complete. The capture discrepancy’s cause was not established. Only visually reviewed, complete settled captures were retained as acceptance evidence.

Final screenshots: `evidence/header-release/ios-svg-{home,orders,history,profile,profile-dark}.png`; Android `android-svg-home.png`, `android-svg-back-filter.png`, `android-svg-history.png`, `android-svg-profile-settled.png`, `android-svg-profile-dark.png`.

Fresh focused tests: 33 PASS, 0 failed/skipped. Web/native typechecks pass. Both production dependency audits report 0 vulnerabilities. Evidence is under `evidence/header-release`. The prior complete PostgreSQL run remains 749/749; fresh GitHub validation on the release commit is required before promotion and will be recorded here.

## Release record

Source commit `882c08d3f479f151c32de1d63cd227c58d08beb5` and all preceding driver phase commits are pushed to `codex/driver-saas-redesign`. [Fresh GitHub run44240558101](https://github.com/Onaopemipo/easygasng/actions/runs/44240558101) completed with **web SUCCESS and native SUCCESS**. Web regression totals and build/type/audit results are preserved in `evidence/header-release/ci-web.txt`; native install/types/dependency tests/moderate audit passed. Deferred CI bundle export was skipped; both final native Release builds with embedded JS bundles were independently compiled, installed and checked locally.

Clean committed source was deployed as candidate `dpl_EaXJRaDgh8ocgWnPuH18TN2EqkX3`, Ready at https://easygas-client-demo-g4vklxa5l-onaopemipos-projects.vercel.app. Candidate sandbox and fulfilment checks passed before promotion. It is now promoted to **https://easygas-client-demo.vercel.app**. No deployment-specific environment overrides were used. Previous verified Ready deployment `dpl_Dgvn7MrBfRpp3f42tXi6A4CBXEhu` remains the web rollback target.

Stable-alias verification passed: driver Home/Orders/History/Profile at320/390/768/1024/1440/1920px without horizontal overflow; Incidents at320/1440 plus Finance390 read-only actions; Card/Cash/Wallet at390/1440, own private balance, identity injection denial and sandbox configuration. Existing test orderEG-2026-E8ED8AE8 remains paid/verified and delivered. The expired proof is not exposed. Permanent project defaults remain fulfilment=true, tracking=true, bulk=true and proof retention1day; runtime Paystack reports test/available. No charge, stock allocation, driver handover or existing order mutation was performed in this release verification.

[Deployment readback](evidence/header-release/deployment-verification.json), [project defaults](evidence/header-release/project-defaults.json), [candidate fulfilment](evidence/header-release/candidate-fulfilment.txt), [hosted driver](evidence/header-release/hosted-driver.txt), [operations/Incidents](evidence/header-release/hosted-operations.txt), [checkout choices](evidence/header-release/hosted-wallet-choices.txt), [fresh browser fault checks](evidence/header-release/browser-release.txt).

## Retained acceptance gaps

The phase keeps all 12 requirements, 90 scenarios and 40 gates. Native physical permissions, locked screen, airplane/reconnect, camera/proof/OTP/handover, VoiceOver/TalkBack and target dynamic type remain open. Exact requested 35% density comparison remains unverified. These gates remain in coverage denominators and are separate from this authorised synthetic web demo release.
