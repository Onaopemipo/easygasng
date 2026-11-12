# Driver experience redesign traceability

Baseline `54b1b15`. Production remains **NO-GO**.

- 35 requirements · 22 PARTIAL, 13 VERIFIED_COMPLETE
- 80 scenarios · 12 NOT_RUN, 30 PARTIAL, 38 PASS
- 35 gates · 22 PARTIAL, 13 PASS

[Source, tests and evidence mapping](driver-experience-redesign-rtm.json) · [Test results](../driver-redesign/04-test-results.md) · [Release and rollback](../driver-redesign/05-rollback-release.md)

| Requirement | Description | Gate | Status | Outstanding work |
| --- | --- | --- | --- | --- |
| DRV-R01 | Audit | G01 | VERIFIED_COMPLETE | None for this requirement. |
| DRV-R02 | Baseline | G02 | PARTIAL | Pre-change device captures and a separate baseline release build were not run. |
| DRV-R03 | Route parity | G03 | VERIFIED_COMPLETE | None for this requirement. |
| DRV-R04 | Driver role scoping | G04 | VERIFIED_COMPLETE | None for this requirement. |
| DRV-R05 | Home compact | G05 | PARTIAL | Toggle layout stability and the empty Home state were not replayed on each installed client. |
| DRV-R06 | Availability verified | G06 | PARTIAL | The active-assignment refusal and browser offline state passed. A clean on/off cycle remains to be replayed on devices. |
| DRV-R07 | Connectivity separate | G07 | VERIFIED_COMPLETE | None for this requirement. |
| DRV-R08 | Gps status honest | G08 | PARTIAL | Not-granted and no active trip were displayed. Permission transitions on physical devices remain open. |
| DRV-R09 | Actual counts | G09 | PARTIAL | The Home count was observed with a real fixture. Error and all-zero Home states were not exercised in both native clients. |
| DRV-R10 | Orders backend list | G10 | VERIFIED_COMPLETE | None for this requirement. |
| DRV-R11 | No self-claim | G11 | VERIFIED_COMPLETE | None for this requirement. |
| DRV-R12 | Assignment acknowledge | G12 | PARTIAL | Expired and repeated requests were covered in regression. Fresh web and mobile acknowledgement was not replayed in the UI. |
| DRV-R13 | Pickup guards | G13 | PARTIAL | Backend guards were exercised. A physical inspected pickup remains open. |
| DRV-R14 | Delivery transitions | G14 | PARTIAL | Current driver design was not exercised through a real delivery handover or return. |
| DRV-R15 | Proof server-confirmed | G15 | PARTIAL | Backend proof and privacy regression passed. A fresh native photo and handover were not captured. |
| DRV-R16 | Offline queue preserved | G16 | PARTIAL | Offline records and GPS replay passed automated tests. Physical capture, restart and reconnect acceptance remains open. |
| DRV-R17 | History closed-only | G17 | VERIFIED_COMPLETE | None for this requirement. |
| DRV-R18 | History accurate aggregates | G18 | PARTIAL | Totals and pagination passed. Restoring filter state across native restart was not requested by the code path and was not checked. |
| DRV-R19 | Proof access controlled | G19 | PARTIAL | Existing private proof tests pass. New history proof download with consented media was not replayed in the browser or installed clients. |
| DRV-R20 | Profile real identity | G20 | VERIFIED_COMPLETE | None for this requirement. |
| DRV-R21 | Vehicle read-only | G21 | PARTIAL | No-vehicle state was verified. A live active trip with a vehicle was not exercised on all clients. |
| DRV-R22 | Compliance noneditable | G22 | PARTIAL | The driver workspace exposes no compliance edit. A specific compliance-write negative test was not added. |
| DRV-R23 | Location consent | G23 | PARTIAL | Revocation and delayed sync passed automated tests. Physical background and locked-screen GPS acceptance remains open. |
| DRV-R24 | Light/dark/system | G24 | PARTIAL | Web switched between all three choices. Installed iOS system light/dark passed. Native preference switching and Android dark acceptance remain open. |
| DRV-R25 | Support/security | G25 | PARTIAL | Entry points exist. Support, password change and secure logout were not replayed on every client. |
| DRV-R26 | Web responsive | G26 | VERIFIED_COMPLETE | None for this requirement. |
| DRV-R27 | Native ios | G27 | PARTIAL | Physical-device and signed-distribution testing remains open. |
| DRV-R28 | Native android | G28 | PARTIAL | The unminified emulator build passed the four-screen smoke test. Standard minified release and physical devices remain open. |
| DRV-R29 | Accessibility | G29 | PARTIAL | VoiceOver, TalkBack and large text checks remain open. |
| DRV-R30 | Cross-role security | G30 | VERIFIED_COMPLETE | None for this requirement. |
| DRV-R31 | Payment/stock/custody regressions | G31 | VERIFIED_COMPLETE | None for this requirement. |
| DRV-R32 | Tests and screenshots | G32 | PARTIAL | Full theme, device and physical handover coverage remains open. |
| DRV-R33 | Rtm | G33 | VERIFIED_COMPLETE | None for this requirement. |
| DRV-R34 | Rollback | G34 | PARTIAL | Rollback is documented. A hosted rollback drill was not run. |
| DRV-R35 | Explicit go/no-go | G35 | VERIFIED_COMPLETE | None for this requirement. |
