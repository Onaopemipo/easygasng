# Daily delivery acceptance in iOS —28 November2026

The actual **EasyGas First Sign-In QA** iOS26.5 simulator ran the current driver screens in **Expo Go58**. A disposable loopback API used the real service handlers, migrations, restricted driver session, paid-order ledger and private multipart photo upload. The fixture contains **zero LPG meters and zero legacy loads**; no hosted customer order, payment, gas weight or delivery was changed.

## Executed journey

1. Accepted EG-2026-8CC94EA6 in the actual assignment alert, without a reason field.
2. Started delivery directly, without pickup/load confirmation; confirmed arrival.
3. Entered synthetic scale readings8.4kg before and14.4kg after. The server recorded one6kg refill and reduced physical branch stock500→494kg once.
4. Completion without a photo was rejected409. Selected the existing solid-green synthetic test photo through the actual iOS gallery picker, with consent and description. The user assisted with that single picker tap because Device Hub could display the sheet but its image clicks returned noWindowsAvailable.
5. The first actual multipart upload deliberately returned503. Encrypted native evidence remained pending. Retry uploaded one consented private photo; completion then produced **Delivery Completed**, one delivered attempt and one photo. Completing did not debit gas again.
6. Verified the corrected Work overview/actions and daily vehicle card on iOS:6kg supplied,94kg expected remaining, office-owned closing. No normal meter/inspection/code/load-acknowledgement/driver-return shortcuts remain.
7. A second disposable assignment EG-2026-F6BBFA3D began unallocated. iOS showed **Waiting for the office**, accepted it without requiring a meter and disabled departure. Canonical office reservation attached its gas at the same order version4. After refresh, iOS showed **Ready to start** and actual direct departure succeeded, without reassignment.

[Completed screen](evidence/ios-daily/delivered.png), [scale form](evidence/ios-daily/scale-readings.png), [upload retry](evidence/ios-daily/upload-retry.png), [canonical full readback](evidence/ios-daily/server-readback.json), [same-version reservation](evidence/ios-daily/allocation-refresh.json), [native departure](evidence/ios-daily/allocation-refresh-after-native.json), [Work actions](evidence/ios-daily/work-actions.png).

## Repairs and verification

Daily readiness now keys on allocation/run state as well as the order version, so an office reservation cannot leave a cached disabled departure button. Normal unallocated daily orders wait for the office instead of opening a legacy meter/load screen. Daily reads show loading/retry states without temporarily mounting legacy custody. Driver Home, Work and vehicle pages describe the office-opened daily process; old metered controls remain under explicit earlier-record views. Acceptance notices and assignment badges now reflect the current daily allocation instead of stale pickup/office instructions.

All11 preview implementation files match current source hashes; the running iOS development bundle contains the corrected UI.22 scoped regression cases, native/web types and the normal-entry iOS JavaScript/Hermes export pass. Failed pre-repair renderer evidence remains saved. A separate broad native-next harness failed before execution on its existing maps-host shims; it is not represented as a passing whole-suite run. The real Work components were tested separately and on the simulator.

[Runtime/source verification](evidence/ios-daily/runtime-verification.json), [regression](evidence/ios-daily/regression-final.txt), [normal iOS JS export](evidence/ios-daily/ios-export-final.txt), [focused traceability](../traceability/daily-ios-rtm.md).

The preview uses a small test entry to obtain the disposable driver session; normal sign-in was outside this journey scope. The actual driver workspace, scale form, encrypted queue and upload SDK are unchanged production components. The normal app entry was also exported successfully. Neither test-only launcher nor loopback API is a production feature.

This is simulator/gallery acceptance, not a physical camera/scale test or a new signed/TestFlight binary. Full offline scale/photo acceptance remains open; current scale saves require connectivity. Parent DAY-05, prior production **NO-GO**, provider/import/retention and physical/signed-device holds remain. Earlier metered history and server safeguards were not removed.
