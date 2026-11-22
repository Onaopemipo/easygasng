# Native edge-to-edge display — 22–23 November 2026

**Current status:** the [role/device continuation](visual-acceptance/README.md) completed all 14 representative iOS phone/iPadOS tablet cases, repaired three UI issues, and finished QA cleanup. 75 tests pass, one existing concurrency case is skipped, and native types pass. Physical Android/iOS and installed release-device gates remain open; no new EasyGas binaries or web/API deployment. The initial implementation evidence below is retained as history.

User-approved scope: **native mobile app only**. Web/API and the client-demo deployment are unchanged. No EasyGas iOS/Android build, export or application installation was created. This is a source change with an existing Expo Go development preview, not an update of the installed release apps.

## Implementation

`apps/mobile/ScreenCanvas.tsx` paints the entire native window and keeps safe-area padding on the content. Its enforced full-width layout prevents a caller's finite width cap from framing a screen. Optional top/bottom edge paint matches specialised role headers/footers and does not intercept touches. Insets come from the installed safe-area provider rather than hard-coded device sizes.

The customer/commercial/Admin/Service Manager/Inventory-finance shell in `App.tsx`, the separate Driver and Technician workspaces, their dedicated sign-ins and onboarding use that canvas. Primary scroll content stretches across available width; the previous 600/640/760/780-point screen caps were removed. Ordinary card padding and readable text spacing remain. Driver retains its existing manual header inset and excludes top padding from its content safe-area edges, avoiding a double inset.

`ScreenModal` uses `fullScreen` for screen-sized forms and `overFullScreen` for transparent overlays. Onboarding and technician management forms cover the window; contextual sheets and alerts keep their compact content while their backdrops cover the display. Existing close handlers, form inputs, validation, keyboard avoidance and scroll settings remain. No native configuration or dependency changes were needed. The local generated Android project historically contained `edgeToEdgeEnabled=true`; this ignored output is not authoritative for source-only CI. Expo SDK 58 uses mandatory Android edge-to-edge; the [CI follow-up](ci-20261123/README.md) checks the committed/evaluated Expo configuration and the removed flag remains absent.

No authentication, API endpoint, branch scope, role permission, payment, approval, qualification or business-state handler was changed. The reviewed-source continuation retains the exact pre-change commit and hashes rather than overwriting earlier release proofs.

## Initial implementation verification (historical)

- Native TypeScript check passed: [log](evidence/typecheck.txt).
- 37 targeted tests passed: actual Canvas/Modal host-rendered behavior, zero/tall/side inset cases, full-window modal and close callback cases, source inventory, tamper rejection, native authority/device/password/introduction regressions, preserved native workflow denominators and installed dependency checks. [Executed log](evidence/regression-tests.txt). SDK hosts are substituted in renderer tests; this is not physical-device layout certification.
- Additional preservation/security suite:31passed,0failed,1existing PostgreSQL concurrency test skipped because its disposable database was not enabled. [Log](evidence/preservation-regression.txt). Combined bounded result:68passed,0failed,1skipped. The exploratory all-project run was interrupted and is **not** claimed as passed: [partial log](evidence/full-regression.txt).
- Existing Expo Go on iPhone 17 Pro / iOS 26.5 loaded current source from the dedicated Metro port8084, configured only for `https://easygas-client-demo.vercel.app`. Metro served `index.ts` (1169modules). The unrelated port8081 server was left running. Our port8084 preview server was stopped afterward. [Runtime observations](evidence/preview-runtime.json).
- Actual guest home checked in light and dark appearance, full-screen introduction opened and dismissed, and signed-out Orders redirected to sign-in. Screenshots are direct Device Hub captures, not mockups: [light home](evidence/home-light.png), [dark scrolled home](evidence/home-dark.png), [focused sign-in](evidence/sign-in-dark.png). The sign-in capture includes the OS Paste/AutoFill menu; no credentials were entered and no authentication session was created.
- Introduction was visually observed with its green canvas covering the notch and home indicator areas; the delayed native capture returned the subsequent home screen, so it is not presented as an introduction screenshot.
- Preview app preference returned to light, keyboard capture disabled and the prior unrelated app/screen restored. OS appearance remained at its original dark setting. The dedicated QA simulator lacks Expo Go; no runtime was installed there.
- Existing iOS release JS, Android APK and Android export hashes, sizes and nanosecond timestamps remain unchanged: [preservation evidence](evidence/native-preservation.json).

## Initial acceptance limits (historical)

All 6 requirements and6gates remain in the [matrix](../traceability/edge-to-edge-rtm.md). Four bounded implementation/documentation gates pass. Two remain PARTIAL: software-keyboard behavior, physical Android/iOS system bars and tablet widths need device verification; authenticated visual passes for every role were not executed in this phase. The source inventory covers every shared role shell and all native Modal sites; it does not claim every workflow was exercised on a device.

Existing production NO-GO, original native/provider/physical-device gates, actual-import and retain-all holds remain unchanged. No web rollout or signed/installed mobile release is claimed.

## References

The approach uses the [Expo safe-area guidance](https://docs.expo.dev/develop/user-interface/safe-areas/) and existing [Android edge-to-edge configuration](https://developer.android.com/develop/ui/views/layout/edge-to-edge). Installed React Native0.88 Modal types and the native typecheck validate the selected presentation/translucency props; a development preview does not establish physical Android behavior.

Historical proof tests that formerly used `App.tsx` as an unreviewed no-op sentinel now use an explicitly unreviewed surface sentinel. App.tsx is part of this approved native change; its actual committed baseline/current source and tamper rejection are checked by the new native continuation. Earlier approved source manifests and original binary proofs were not rewritten. Initial source-guard diagnostic output is retained in `evidence/layout-source-tests.txt`; the final two bounded regression logs supersede it.

## Role/device visual continuation

The [22–23 November visual review](visual-acceptance/README.md) completes 14/14 representative role/device simulator cases with no exclusions. Manager access feedback and icons plus shared full-screen form confirmation presentation were repaired and rechecked on phone/tablet. Actual software keyboards, cancel/confirm behavior, representative light/dark, tablet landscape and QA cleanup passed. Final regression: 75 passed, 0 failed, 1 existing PostgreSQL concurrency skip; native types passed. Three original release artifacts remain unchanged. Two existing cached Expo Go runtimes were installed, with no new EasyGas binary/export/install or web rollout. EDGE-04/05 remain PARTIAL for broader physical Android/iOS and installed release-device verification only. Original source proof remains historical; additive visual proof identifies current bytes.
