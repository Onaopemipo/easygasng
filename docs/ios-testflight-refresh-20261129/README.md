# iOS TestFlight refresh —29 November2026

**0.1.0(7) is available to the existing EasyGas Internal QA testers.** Apple reports VALID / IN_BETA_TESTING. Open TestFlight → EasyGas → Update; verify build7. Uses the existing synthetic client-demo API.

Includes the daily opening/closing gas-weight process, automatic assignment/reservation and reassignment, driver scale-based refill, consented encrypted photo upload/retry, synchronisation/completion feedback, sign-out and shared order/map validation fixes. Office-only web actions remain on the deployed admin website. [What to Test](WHAT-TO-TEST.md).

| Evidence | Executed result |
|---|---|
| Frozen native/shared/config source |197 file hashes match inspected EAS archive and root workspace; normal index.ts; no simulator gallery adapter, secrets/signing files or generated QA data in archive |
| Focused release/security/component tests |30 passed,0failed,0skipped |
| Native typecheck and production iOS export |PASS |
| Expo Doctor |18/20;2 diagnostics retained,0excluded |
| Signed device IPA |8/8 checks; exact app/team/build/API/architecture/orientations verified |
| Approved packaged icon |iPhone/iPad pixel comparison PASS |
| Packaged latest workflow and permissions |7 feature markers, consented camera/photo descriptions; no microphone permission or local QA adapter |
| EAS submission |FINISHED; exactbuild7 |
| Apple/internal testing |VALID / IN_BETA_TESTING; same2 existing testers; notes saved |

[Build record](build.json), [signed artifact](artifact-verification.json), [Apple readback](apple-status.json), [submission](submission.json), [acceptance](store-acceptance.md), [stable requirements matrix](../traceability/store-testing-20261123-rtm.md).

Source base5b13beb; exact packaging commit `e432f7fc308d0eecec5fc003f6dd3d029ec8cf92`. [Manifest](preflight.json) and [source changes since build5](source-changes.json) identify the frozen implementation. [Workspace preservation](workspace-preservation.json) records guarded mirroring of the focused release correction without staging/resetting unrelated work.

Build6 finished but was held and never submitted after native peer/duplicate/config diagnostics. Build7 declares the existing expo-asset peer, deduplicates expo-constants and removes an unsupported config property while retaining local-only cleartext safeguards. [Dependency review](dependency-review.json). The two remaining Doctor diagnostics are dynamic/static configuration analysis and newer SDK/package alignment recommendations; both remain in the20-check denominator. No unrelated SDK migration or cryptographic change was bundled.

This is bounded internal distribution acceptance. Signed installed lifecycle, physical camera/scale, GPS/background/offline, real provider/operations and original production NO-GO/import/retain-all holds remain in existing matrices. Android2 and prior iOS2–5 evidence are preserved; no public release or tester access expansion.
