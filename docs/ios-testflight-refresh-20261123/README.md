# iOS-only TestFlight refresh — 23 November 2026

EasyGas **0.1.0 (3)** is **Testing** in **EasyGas Internal QA** for the same two existing internal testers. Open TestFlight with the approved account and update EasyGas. This includes the approved Mobile Next design, native loading/keyboard/orientation repairs and provider-return recovery from application source `b062123`; packaging commit `7c8763c`.

The signed device build supports iPhone and iPad, uses `https://easygas-client-demo.vercel.app` and synthetic demo data. Android remains at its earlier build2; no Android build or upload was performed. No production release was requested or made.

- [Signed EAS build](https://expo.dev/accounts/onaopemipo/projects/easygas-energy/builds/bc49da5f-deca-461c-b048-bde51da1a491) and [finished submission](https://expo.dev/accounts/onaopemipo/projects/easygas-energy/submissions/64b963b6-5964-4218-b221-8211b7e41b7d).
- [Eight exact IPA checks](artifact-verification.txt), [artifact hash/signing/API metadata](artifact-verification.json), [three authenticated distribution checks](store-acceptance.md), [results](store-acceptance.txt), [saved tester notes](WHAT-TO-TEST.md).
- [Stable STORE23 matrix](../traceability/store-testing-20261123-rtm.md) retains all six requirements and earlier Android/build2 evidence.

The unchanged owner-approved encryption/no-France classification is saved. App Store Connect shows the beta notes Saved and build3 Testing. No signing secrets, temporary artifact URLs or tester emails are committed.

Upload availability and static scheme/orientation checks do not accept installed app links, real iOS payment return, physical devices, background/push/camera/GPS or every feature/role/device combination. Those remain explicitly open in the original matrices; production NO-GO/import/retain-all holds remain unchanged.

Final configuration/security/matrix checks: **9 passed, 0 failed, 0 skipped**; [executed output](final-validation.txt). No application source changed after the packaged commit.
