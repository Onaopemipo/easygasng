# Signed native test-store distribution — 23 November 2026

All six bounded store-distribution requirements and gates passed. This accepts signed beta builds, uploads, store processing and configured internal tester access. It does not accept physical-device operation or commercial production. Existing production NO-GO and all original physical/provider/import/retain-all requirements remain.

| Requirement | Status | Executed evidence and limits |
| --- | --- | --- |
| STORE23-R01 — Verify source, approved API and build configuration | VERIFIED_COMPLETE | PASS — configured project-scoped approved API/identifier guard; signed builds use approved source and HTTPS API None for this bounded configuration gate; physical/live readiness separate. |
| STORE23-R02 — Produce a signed Android app bundle for internal testing | VERIFIED_COMPLETE | PASS — actual signed AAB structure/signature/certificate/package/version/API verified None for artifact generation; Play tester availability remains R04. |
| STORE23-R03 — Produce a signed device iOS archive for TestFlight | VERIFIED_COMPLETE | PASS — actual device IPA codesign/team/App Store profile/iPhone+iPad/version/API verified None for artifact generation; TestFlight processing/compliance/tester availability remains R05. |
| STORE23-R04 — Upload Android build and verify Google Play internal testing | VERIFIED_COMPLETE | PASS — Google Play internal release0.1.0(2) is Active and Available to internal testers; same existing48-member Pilot Testers list as AfriMarket selected and saved. None for bounded internal distribution; tester opt-in/install and device acceptance are separate. |
| STORE23-R05 — Upload iOS build and verify TestFlight processing | VERIFIED_COMPLETE | PASS — exact Apple build2 processed, user-approved encryption/no-France declaration saved; same two AfriMarket internal testers added, group build status Testing, What to Test Saved. None for bounded TestFlight internal distribution; tester install/launch and full native acceptance remain separate. |
| STORE23-R06 — Record artifact and hosted testing evidence while preserving original release holds | VERIFIED_COMPLETE | PASS — immutable source/artifact hashes, signing/version/API readback, actual store processing/testing status and explicit acceptance limits recorded. Prior production NO-GO and all unrelated holds preserved. None for this evidence gate; original physical/provider/lifecycle/commercial acceptance remains open in its original matrices. |

## Actual builds and test access

- Android: [signed EAS build](https://expo.dev/accounts/onaopemipo/projects/easygas-energy/builds/cff563ba-a3ca-4f30-af65-5ccd1c1add52), version 0.1.0/code 2, package `com.easygasng.customer`. [Join the internal test](https://play.google.com/apps/internaltest/4701444205316057539) using an account in the same Pilot Testers list selected for AfriMarket. Google track is Active; release is Available to internal testers.
- iPhone/iPad: [signed EAS build](https://expo.dev/accounts/onaopemipo/projects/easygas-energy/builds/1c0441d6-cf78-485d-b56b-47e817093e3a), version 0.1.0/build 2, team RDQ9JJZH7F. [Upload](https://expo.dev/accounts/onaopemipo/projects/easygas-energy/submissions/59b9df06-c5a5-446c-8128-31a26c22d11e) finished. Apple app 6838122026/build a3a7f07c is Testing in EasyGas Internal QA for the same two AfriMarket internal testers. Open TestFlight using the matching account. User-approved compliance saved; future automatic build distribution OFF.
- Immutable source: `b7a53c9d7d70dd20ce31cc1326874e42b7880784`; approved runtime API: `https://easygas-client-demo.vercel.app`, synthetic demo data.

## Verification

- [Six actual artifact checks](../store-testing-20261123/artifact-verification.txt), [hashes/signing/version/API readback](../store-testing-20261123/artifact-verification.json).
- [Five configuration/security checks](../store-testing-20261123/configuration-and-traceability-tests.txt), [two matrix checks](../store-testing-20261123/traceability-final.txt).
- [Two executed authenticated-console checks](../store-testing-20261123/store-acceptance.md), [manual results](../store-testing-20261123/store-acceptance.txt).
- [Build/upload evidence](../store-testing-20261123/preflight.json), [approved encryption declaration inventory](../store-testing-20261123/ENCRYPTION-INVENTORY.md), [tester notes](../store-testing-20261123/WHAT-TO-TEST.md), [machine-readable matrix](store-testing-20261123-rtm.json).

## Acceptance limits

No tester device install, launch, background/locked GPS, notifications, camera, offline recovery, real delivery/safety, provider performance or full seven-role signed-device acceptance was performed in this phase. All remain in their original matrices and denominators. No public production release, external beta invitation group or live payment activation was performed.

## iOS-only refresh in progress

The new user request authorises an iOS-only build/upload of the approved Mobile Next design and repairs. STORE23-R01 preflight passes; STORE23-R03/R05/R06 are PARTIAL for the new artifact/distribution evidence. Earlier build2 and Android acceptance are retained. Current continuation coverage:3verified/3partial/0excluded. [Preflight](../ios-testflight-refresh-20261123/preflight.json). Production NO-GO remains.
