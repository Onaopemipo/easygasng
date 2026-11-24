# iOS TestFlight refresh — 24 November 2026

EasyGas **0.1.0 (4)** is **Testing** in **EasyGas Internal QA** for the same two existing internal testers. Open TestFlight and update EasyGas. It packages latest committed native/shared source `a2ef477`, including the exact approved green/orange app icon and current role rules. The existing client-demo API supplies the latest hosted fixes; web-only Dispatch interfaces remain web controls.

- [Finished signed EAS build](https://expo.dev/accounts/onaopemipo/projects/easygas-energy/builds/b67d6ded-554e-4ceb-b4fb-d03ebfbc3c86) and [finished submission](https://expo.dev/accounts/onaopemipo/projects/easygas-energy/submissions/a6c01e5b-9d09-4270-ae89-619659576177).
- [Eight exact signed IPA checks](artifact-verification.txt), [packaged iPhone/iPad icon verification](icon-verification.json), [authenticated Apple observations](store-acceptance.md), [saved What to Test notes](WHAT-TO-TEST.md).
- [Stable STORE23 matrix](../traceability/store-testing-20261123-rtm.md) retains all six requirements and earlier Android/build2/build3 evidence. [Exact source/configuration manifest](preflight.json).

The device archive supports iPhone and iPad, uses the approved `https://easygas-client-demo.vercel.app` testing API and is App Store signed for `com.easygasng.customer`, team `RDQ9JJZH7F`. Eleven release preflight checks, native type checking, eight archive checks, the packaged-icon check and three actual store acceptance checks pass. The source application CI passed 1,273 web tests and three native dependency checks; packaging/documentation adds no application changes.

Apple API readback confirms VALID / IN_BETA_TESTING, the exact existing group, unchanged two-tester membership and saved notes. The browser session expired, so no fresh authenticated browser screenshot is claimed. Existing EAS-resolved API credentials completed the bounded actions without a new login/key or access grant. Encryption code/dependencies are unchanged from build3; the prior owner-approved standard third-party/no-France classification and Apple's stored exemption value are retained.

Android remains **0.1.0 (2)**; no new Android build/upload or public App Store release. Installed launcher appearance, installed links, real provider return, physical devices, permissions/background/GPS/camera/push/accessibility and complete feature/device acceptance remain separate. Original production NO-GO and import/retain-all holds are unchanged.

Final release/configuration/traceability validation: **11 passed, zero failures or skips** ([executed output](final-validation.txt)); these overlap the preflight checks and are not summed as unique tests.
