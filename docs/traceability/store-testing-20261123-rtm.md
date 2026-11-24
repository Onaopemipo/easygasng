# Signed native test-store distribution

All six bounded requirements/gates pass; zero exclusions. Current iOS release is **0.1.0 (4)** in **EasyGas Internal QA** for the same two internal testers. Android remains **0.1.0 (2)**. Original production NO-GO and unrelated installed/physical/provider/import/retain-all holds remain.

| Requirement | Status | Current evidence |
| --- | --- | --- |
| STORE23-R01 — Verify source, approved API and build configuration | VERIFIED_COMPLETE | Current native/shared source manifest matches packaging a2ef477; approved API/project/identity and 11 preflight checks plus native types pass. Application CI 1,273 web and 3 native dependency checks passed. |
| STORE23-R02 — Produce a signed Android app bundle for internal testing | VERIFIED_COMPLETE | PASS — actual signed AAB structure/signature/certificate/package/version/API verified |
| STORE23-R03 — Produce a signed device iOS archive for TestFlight | VERIFIED_COMPLETE | Exact signed iOS 0.1.0 (4) archive passes eight signing/team/bundle/device/API/orientation/scheme/architecture checks; packaged iPhone/iPad icons match approved artwork. |
| STORE23-R04 — Upload Android build and verify Google Play internal testing | VERIFIED_COMPLETE | PASS — Google Play internal release0.1.0(2) is Active and Available to internal testers; same existing48-member Pilot Testers list as AfriMarket selected and saved. |
| STORE23-R05 — Upload iOS build and verify TestFlight processing | VERIFIED_COMPLETE | Exact EAS submission finished; Apple build4 VALID / IN_BETA_TESTING in the same internal group with unchanged two tester IDs and saved notes. Prior approved encryption classification retained after unchanged-source comparison. |
| STORE23-R06 — Record artifact and hosted testing evidence while preserving original release holds | VERIFIED_COMPLETE | Actual source/artifact hashes, API readback, existing group membership, saved test notes and explicit installed/production boundaries recorded. No Android/public rollout or original acceptance hold removed. |

## Latest iOS distribution

[Build4 report](../ios-testflight-refresh-20261124/README.md), [exact archive verification](../ios-testflight-refresh-20261124/artifact-verification.json), [approved packaged icon](../ios-testflight-refresh-20261124/icon-verification.json), [Apple API observations](../ios-testflight-refresh-20261124/store-acceptance.md) and [saved notes](../ios-testflight-refresh-20261124/WHAT-TO-TEST.md). Packaging `a2ef477`; signed EAS build `b67d6ded-554e-4ceb-b4fb-d03ebfbc3c86`, submission `a6c01e5b-9d09-4270-ae89-619659576177`, Apple build `881dfd4c-3797-4fe2-a4ce-3cfa35811855`. VALID / IN_BETA_TESTING, existing EasyGas Internal QA group, two unchanged internal testers, notes Saved. No current authenticated browser screenshot is claimed; API readback is authoritative.

## Historical evidence retained

[Previous iOS build3](../ios-testflight-refresh-20261123/README.md) and [original Android/iOS build2 distribution](../store-testing-20261123/README.md) remain recorded. Their exact source, artifacts, prior store observations and acceptance limits are retained in the JSON matrix. No new Android action, external beta or public App Store release.

## Acceptance boundary

Six requirements and six gates remain in the denominator, all verified for bounded internal distribution. Install/update iOS4 from TestFlight and execute installed launcher/link/provider/lifecycle/physical/accessibility and complete role/device feature acceptance separately. Packaged icon verification does not close APPICON-R04 installed-appearance acceptance. The original native feature denominator and production NO-GO remain unchanged.
