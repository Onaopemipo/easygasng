# Test-store distribution requirements traceability

EasyGas **0.1.0 (5)** is **Testing** in the existing two-tester internal group. Public commercial release remains **NO-GO**. All six stable requirements/gates remain in the denominator; zero exclusions. Android/build2/3/4 history is preserved.

| Requirement | Status | Executed evidence |
|---|---|---|
| STORE23-R01 — Verify source, approved API and build configuration | VERIFIED_COMPLETE | Frozen current native/shared source including uncommitted changes matches all186 inspected EAS archive hashes; exact packaging commit and approved HTTPS API/project/identity verified. Ten release/dependency/traceability checks, native types, iOS export and source checks pass. Prior encryption/dependency hashes match build4. |
| STORE23-R02 — Produce a signed Android app bundle for internal testing | VERIFIED_COMPLETE | PASS — actual signed AAB structure/signature/certificate/package/version/API verified |
| STORE23-R03 — Produce a signed device iOS archive for TestFlight | VERIFIED_COMPLETE | Exact signed iOS0.1.0(5) IPA matches build/packaging source; eight signing/team/bundle/device/API/orientation/scheme/architecture checks and packaged iPhone/iPad icon verification pass. Latest feature strings present in signed bundle. |
| STORE23-R04 — Upload Android build and verify Google Play internal testing | VERIFIED_COMPLETE | PASS — Google Play internal release0.1.0(2) is Active and Available to internal testers; same existing48-member Pilot Testers list as AfriMarket selected and saved. |
| STORE23-R05 — Upload iOS build and verify TestFlight processing | VERIFIED_COMPLETE | Exact EAS submission FINISHED; Apple build5 VALID/IN_BETA_TESTING in the existing EasyGas Internal QA group, same two tester IDs and saved notes. Previously approved encryption classification retained after unchanged-source comparison. |
| STORE23-R06 — Record artifact and hosted testing evidence while preserving original release holds | VERIFIED_COMPLETE | Current source/artifact hashes, exact EAS/Apple IDs, tester-group readback and notes recorded in dated report and manual. All six stable requirements/gates and historical evidence retained; no Android/public rollout or original acceptance hold removed. |

## Latest iOS distribution

[Build5 release report](../ios-testflight-refresh-20261125/README.md), [frozen source](../ios-testflight-refresh-20261125/preflight.json), [signed IPA](../ios-testflight-refresh-20261125/artifact-verification.json), [packaged icons](../ios-testflight-refresh-20261125/icon-verification.json), [Apple readback](../ios-testflight-refresh-20261125/store-acceptance.md), [final verification](../ios-testflight-refresh-20261125/final-validation.txt) and [saved testing notes](../ios-testflight-refresh-20261125/WHAT-TO-TEST.md).

Implementation mapping **6/6**; verified requirements **6/6**; distribution destinations **2/2** (current TestFlight5, historical unchanged Play2); acceptance gates **6/6**. No P0 requirements in this bounded P1 distribution matrix; application/security critical acceptance remains in the original matrices. These percentages do not measure whole-app functionality or production readiness.

## Historical evidence and acceptance boundaries

[Build4](../ios-testflight-refresh-20261124/README.md), [build3](../ios-testflight-refresh-20261123/README.md) and [original Android/iOS build2](../store-testing-20261123/README.md) remain recorded. Full stable implementation files, authoritative data sources, security controls, negative tests, executed evidence, reasons, outstanding work, six gates and scope-change history are retained in the [machine-readable matrix](store-testing-20261123-rtm.json).

Open TestFlight and update to iOS5. Installed launcher/link/provider/lifecycle/physical/accessibility and full role/device feature acceptance remain separate. Packaged icon verification does not close APPICON-R04 installed appearance. No new Android release, external beta, public App Store release, new tester access or provider activation. Original production NO-GO, import and retain-all holds remain.
