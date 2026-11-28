# iOS TestFlight refresh — 25 November 2026

EasyGas **0.1.0 (5)** is **Testing** in **EasyGas Internal QA** for the same two existing internal testers. Open TestFlight and update EasyGas.

Subsequent driver runtime acceptance found native refill-submission, camera-configuration and photo-upload defects after this release. The [driver acceptance phase](../ios-driver-journey/README.md) repairs them in source and verifies the full simulator journey. These repairs are **not included in build5**; a new signed build and physical-camera acceptance remain outstanding. This report preserves the original build5 artifact and Apple evidence.

The build includes the latest native authentication, direct driver/technician acceptance, readable gas allocation, explicit load/departure action, address/map-pin confirmation, saved addresses and Order again checkout changes. The existing approved client-demo backend supplies the latest phone-payment and Dispatch fixes; web Dispatch controls remain on the website.

- [Finished signed EAS build](https://expo.dev/accounts/onaopemipo/projects/easygas-energy/builds/d607c741-82dc-4da1-9683-0c3388b9ded6) and [finished submission](https://expo.dev/accounts/onaopemipo/projects/easygas-energy/submissions/1b8682cb-6c6f-40e9-81e4-96b39900dc6f).
- [Exact source/configuration manifest](preflight.json), [release checks](preflight-validation.txt), [native types](native-types.txt), [iOS JavaScript export](native-export.txt), [source verification](source-verification.txt).
- [Eight signed IPA checks](artifact-verification.txt), [approved packaged iPhone/iPad icons](icon-verification.json), [latest signed-bundle features](bundle-features.json), [authenticated Apple acceptance](store-acceptance.md) and [saved What to Test notes](WHAT-TO-TEST.md).
- [Stable STORE23 requirements matrix](../traceability/store-testing-20261123-rtm.md) retains all six requirements, six gates and historical Android/iOS build2/3/4 evidence. [Ordering manual](../user-manual/seamless-ordering.md).

The isolated packaging commit `82857386ea7fcee529814818c9f01e4c97f6ded6` freezes the current application source, including uncommitted additions, without changing the working branch or committing unrelated work. All 186 native/shared/config hashes match the inspected EAS upload archive. Application source manifest SHA256: `f7914eca44383c8782a195d9d3b01e97fb7b3a6d7ec5bab6e4d0f5b978b36918`. Signed IPA SHA256: `87d0c503066b2f4f7db563ce118dce4d4f6593275615efd2a28eab8c448277c4`. EAS remote versioning incremented the existing build 4 to build 5. App identity `com.easygasng.customer`, signing team `RDQ9JJZH7F`, iPhone+iPad support, orientation/URL scheme and approved HTTPS testing API are verified in the actual signed archive.

Ten release/dependency/traceability checks, native type checking, frozen-source iOS export, five source checks, eight archive checks and one packaged-icon check passed. Final release verification is in [final-validation.txt](final-validation.txt); overlapping checks are not added as unique executions. Previous phase application regression evidence remains **1,321 passed /0 failed /35 environment skips** from 1,356 executions; its 15 native repeat tests passed. These prior results are linked evidence, not a fresh hosted CI run or signed-device runtime test.

Apple API readback confirms VALID / IN_BETA_TESTING, exact EAS build/submission IDs, the existing group, unchanged two-tester membership and saved notes. Unchanged encryption source/dependencies retain the prior approved classification and stored Apple exemption. The original downloaded IPA is preserved locally without recompression; no secrets or signing credentials were added to source.

Android remains **0.1.0 (2)**. No external beta, public App Store release or provider activation. Installed-device functionality, permissions/background/GPS/camera/push, accessibility and full physical/provider acceptance remain separate. Original production NO-GO, actual-import and retain-all holds are preserved.

Final all-phase traceability validation: **2 passed, zero failures/skips** ([executed output](traceability-validation.txt)). The release checker output was aligned with the required traceability evidence labels before this successful validation; the signed build and Apple observations were unchanged.
