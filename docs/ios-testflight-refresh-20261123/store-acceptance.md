# iOS refresh authenticated TestFlight acceptance — 23 November 2026

Executed manually through the authenticated App Store Connect UI against app 6838122026 and exact Apple build `0bd8cec8-ed8b-46ab-b39d-079d232b3f3c`. These are distribution observations, not installed-device tests.

| Case | Procedure and authoritative readback | Result |
| --- | --- | --- |
| IOS23-U01 | EAS exact-build submission finished; Apple processed version 0.1.0 (3). Saved the unchanged owner-approved standard third-party encryption beyond OS/no-France classification; Missing Compliance cleared. | PASS |
| IOS23-U02 | Saved the prepared What to Test notes; read back Saved and the complete text. Added only the existing EasyGas Internal QA group. Build detail shows Internal, 2 testers; group Builds shows 0.1.0 (3), Testing, expires in 90 days. Earlier build2 remains Testing. | PASS |
| IOS23-U03 | Verified current signed IPA's approved demo API and exact source/signature, retained Android build2 history and all original production/physical/provider/import/retention gates in the matrices. No new Android build, public/external beta or commercial release. | PASS |

Screenshot retained privately at `.data/ios-refresh-testflight-testing.jpg`; it shows the group, two testers and both build rows without exposing tester email addresses. EAS IDs, source and artifact hash are in preflight.json, submission.json and artifact-verification.json. Signing secrets and temporary artifact/log URLs are excluded.

The optional EAS CLI changelog field was rejected by the Expo plan before a submission was scheduled. Submitting the same finished build without that optional field succeeded; notes were then saved through Apple. No duplicate successful submission, new build, paid plan change or access expansion.

Limits: This accepts upload, processing, compliance and existing internal availability. No new installed iOS launch, real iOS provider return, background/locked operation, push, camera, GPS, physical-device or all-feature acceptance was executed. TestFlight testers must install/update and run those cases. The native 300-feature denominator and production NO-GO remain.
