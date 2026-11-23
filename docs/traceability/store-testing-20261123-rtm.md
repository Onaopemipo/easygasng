# Signed native test-store distribution — 23 November 2026

Scope: unified EasyGas app using the user-approved hosted synthetic demo API. New store binaries are explicitly authorised for Google Play internal testing and Apple TestFlight only. Existing production NO-GO, physical/provider/import/retain-all gates remain.

Coverage: 6 requirements retained; 3 verified, 2 partial, 1 blocked, 0 excluded. Artifact generation is separately accepted from store processing and tester availability.

| Requirement | Status | Evidence and outstanding work |
| --- | --- | --- |
| STORE23-R01 — Verify source, approved API and build configuration | VERIFIED_COMPLETE | PASS — configured project-scoped approved API/identifier guard; signed builds use approved source and HTTPS API None for this bounded configuration gate; physical/live readiness separate. |
| STORE23-R02 — Produce a signed Android app bundle for internal testing | VERIFIED_COMPLETE | PASS — actual signed AAB structure/signature/certificate/package/version/API verified None for artifact generation; Play tester availability remains R04. |
| STORE23-R03 — Produce a signed device iOS archive for TestFlight | VERIFIED_COMPLETE | PASS — actual device IPA codesign/team/App Store profile/iPhone+iPad/version/API verified None for artifact generation; TestFlight processing/compliance/tester availability remains R05. |
| STORE23-R04 — Upload Android build and verify Google Play internal testing | PARTIAL | Google Play accepted and published version0.1.0/code2 to the internal track; release readback says Available to internal testers. Track remains inactive with no email list selected. Configure only user-specified Google tester accounts and verify track access; tester emails requested. No production rollout. |
| STORE23-R05 — Upload iOS build and verify TestFlight processing | BLOCKED | Exact iOS upload succeeded and Apple finished processing build2. TestFlight shows Missing Compliance. Prepared declaration is awaiting user approval; tester accounts also requested. User approval for prepared third-party encryption/no-France declaration or owner-reviewed alternative; then save compliance, configure authorised testers and verify Ready to Test/Testing status. |
| STORE23-R06 — Record artifact and hosted testing evidence while preserving original release holds | PARTIAL | Actual artifact hashes/config/signatures/upload IDs recorded; store availability not yet accepted Finish store status evidence and tester access, record remaining limits. |

## Actual builds and uploads

- Android: [EAS signed build cff563ba](https://expo.dev/accounts/onaopemipo/projects/easygas-energy/builds/cff563ba-a3ca-4f30-af65-5ccd1c1add52), version0.1.0/code2, package `com.easygasng.customer`. Google Play internal track4701444205316057539 accepted the bundle and shows Available to internal testers. No email list is selected; tester accounts requested.
- iOS: [EAS signed build1c0441d6](https://expo.dev/accounts/onaopemipo/projects/easygas-energy/builds/1c0441d6-cf78-485d-b56b-47e817093e3a), version0.1.0/build2, device IPA for iPhone/iPad, teamRDQ9JJZH7F. [Submission59b9df06](https://expo.dev/accounts/onaopemipo/projects/easygas-energy/submissions/59b9df06-c5a5-446c-8128-31a26c22d11e) FINISHED; Apple app6838122026/builda3a7f07c finished processing and is Missing Compliance. Prepared declaration awaiting owner approval; not saved.
- Immutable source: `b7a53c9d7d70dd20ce31cc1326874e42b7880784`. Artifact hashes, sizes, signing identities, version/API readback: [actual verification](../store-testing-20261123/artifact-verification.json).
- Executed [six artifact checks](../store-testing-20261123/artifact-verification.txt) and [configuration/matrix checks](../store-testing-20261123/configuration-and-traceability-tests.txt).
- [Encryption inventory](../store-testing-20261123/ENCRYPTION-INVENTORY.md), [tester notes](../store-testing-20261123/WHAT-TO-TEST.md), [machine-readable matrix](store-testing-20261123-rtm.json).

## Remaining acceptance

Finish Apple compliance, configure only user-authorised testers, and confirm testing availability. Upload success does not demonstrate installation, background GPS, notifications, camera, offline recovery, provider performance or full seven-role device acceptance. All original production requirements remain in their original denominators.
