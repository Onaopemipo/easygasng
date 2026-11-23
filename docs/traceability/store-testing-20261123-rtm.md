# Signed native test-store distribution — 23 November 2026

All six bounded requirements/gates pass. Current iOS release is **0.1.0 (3)**; Android remains at its historically verified **0.1.0 (2)**. No physical-device, complete feature or commercial production acceptance is inferred. Production NO-GO/import/retain-all holds remain.

| Requirement | Status | Evidence and limits |
| --- | --- | --- |
| STORE23-R01 — Verify source, approved API and build configuration | VERIFIED_COMPLETE | Current iOS refresh preflight verified: approved HTTPS demo API/project guard, exact app/team identity, source b062123 with1219/1219CI. Earlier build2 artifact evidence retained. None for this bounded configuration gate; physical/live readiness separate. |
| STORE23-R02 — Produce a signed Android app bundle for internal testing | VERIFIED_COMPLETE | PASS — actual signed AAB structure/signature/certificate/package/version/API verified None for artifact generation; Play tester availability remains R04. |
| STORE23-R03 — Produce a signed device iOS archive for TestFlight | VERIFIED_COMPLETE | PASS — new iOS0.1.0 build3 FINISHED; exact device IPA passes8 signature/team/bundle/App Store profile/version/iPhone+iPad/API/orientation/URL-scheme/architecture checks. None for this iOS archive gate; Apple processing/testing and installed-device acceptance remain separate. |
| STORE23-R04 — Upload Android build and verify Google Play internal testing | VERIFIED_COMPLETE | PASS — Google Play internal release0.1.0(2) is Active and Available to internal testers; same existing48-member Pilot Testers list as AfriMarket selected and saved. None for bounded internal distribution; tester opt-in/install and device acceptance are separate. |
| STORE23-R05 — Upload iOS build and verify TestFlight processing | VERIFIED_COMPLETE | PASS — exact iOS 0.1.0 (3) submission finished, Apple processed/compliance cleared, What to Test Saved and existing two-tester internal group shows Testing; no Android change or broader acceptance inferred. None for bounded iOS distribution; installed-device/provider/lifecycle/physical/commercial acceptance remains in original matrices. |
| STORE23-R06 — Record artifact and hosted testing evidence while preserving original release holds | VERIFIED_COMPLETE | PASS — exact iOS 0.1.0 (3) submission finished, Apple processed/compliance cleared, What to Test Saved and existing two-tester internal group shows Testing; no Android change or broader acceptance inferred. None for bounded iOS distribution; installed-device/provider/lifecycle/physical/commercial acceptance remains in original matrices. |

## Current iOS distribution

[Build3 report](../ios-testflight-refresh-20261123/README.md), [exact IPA checks](../ios-testflight-refresh-20261123/artifact-verification.txt), [Apple observations](../ios-testflight-refresh-20261123/store-acceptance.md) and [saved notes](../ios-testflight-refresh-20261123/WHAT-TO-TEST.md). Signed EAS build `bc49da5f-deca-461c-b048-bde51da1a491`, submission `64b963b6-5964-4218-b221-8211b7e41b7d`, Apple build `0bd8cec8-ed8b-46ab-b39d-079d232b3f3c`. Application source `b062123`, packaging `7c8763c`. Actual group **EasyGas Internal QA**, **2 existing internal testers**, status **Testing**, notes **Saved**. Approved demo API and no-France classification retained.

## Earlier build2 evidence retained

[Original distribution report](../store-testing-20261123/README.md), [artifact verification](../store-testing-20261123/artifact-verification.json), [authenticated observations](../store-testing-20261123/store-acceptance.md). Original source `b7a53c9`; Google internal track0.1.0(2) Active/Available to internal testers using existing Pilot Testers list. [Join internal Android test](https://play.google.com/apps/internaltest/4701444205316057539). No Android action in iOS refresh. Earlier iOS2 remains in the internal group, superseded by3 for current testing.

## Acceptance boundary

[Machine-readable matrix](store-testing-20261123-rtm.json):6 requirements,6 verified,0 excluded. Original native/provider/physical/lifecycle/security/safety/import/retention requirements remain in their original matrices. Static `easygas` scheme declaration does not verify installed URL handling. Install/update iOS3 in TestFlight and execute installed return/lifecycle and full feature/role/device acceptance separately.
