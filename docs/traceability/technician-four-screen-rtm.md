# Technician four-screen requirements traceability

**PARTIAL / production NO-GO unchanged.** All74 scenarios and23 gates retained;4 verified,63 partial,7 blocked. Verification coverage4/74 (5.41%); this is scenario acceptance, not a measure of source-code quantity. Gate coverage1/23 passed,20 partial,2 blocked. Routes alone do not establish completion.

Machine-readable authority: [matrix](technician-four-screen-rtm.json). [Report](../reports/technician-mobile-final-implementation.md). [Acceptance evidence](../testing/technician-mobile-acceptance.md).

| ID | Requirement | Status | Gate | Result / outstanding work |
|---|---|---|---|---|
| TF-T01 | baseline lint/typecheck/build | VERIFIED_COMPLETE | G21 | PASS baseline and final typechecks/builds; no lint script exists. None for this bounded scenario; broader gates remain open. |
| TF-T02 | baseline technician navigation | PARTIAL | G03 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Complete scenario-specific populated-job/device/permission/recovery acceptance; see acceptance table and blocker register. |
| TF-T03 | existing customer app | PARTIAL | G19 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Complete scenario-specific populated-job/device/permission/recovery acceptance; see acceptance table and blocker register. |
| TF-T04 | existing driver app | PARTIAL | G19 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Complete scenario-specific populated-job/device/permission/recovery acceptance; see acceptance table and blocker register. |
| TF-T05 | existing admin service/booking/quotation workflows | PARTIAL | G19 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Complete scenario-specific populated-job/device/permission/recovery acceptance; see acceptance table and blocker register. |
| TF-T06 | existing inventory/finance invariants | PARTIAL | G18 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Complete scenario-specific populated-job/device/permission/recovery acceptance; see acceptance table and blocker register. |
| TF-T07 | technician sign-in | PARTIAL | G04 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Complete scenario-specific populated-job/device/permission/recovery acceptance; see acceptance table and blocker register. |
| TF-T08 | expired session | PARTIAL | G04 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Complete scenario-specific populated-job/device/permission/recovery acceptance; see acceptance table and blocker register. |
| TF-T09 | revoked technician | PARTIAL | G04 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Complete scenario-specific populated-job/device/permission/recovery acceptance; see acceptance table and blocker register. |
| TF-T10 | cross-technician job read denied | PARTIAL | G04 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Complete scenario-specific populated-job/device/permission/recovery acceptance; see acceptance table and blocker register. |
| TF-T11 | cross-technician mutation denied | PARTIAL | G04 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Complete scenario-specific populated-job/device/permission/recovery acceptance; see acceptance table and blocker register. |
| TF-T12 | branch scope denied | PARTIAL | G04 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Complete scenario-specific populated-job/device/permission/recovery acceptance; see acceptance table and blocker register. |
| TF-T13 | self-privilege escalation denied | PARTIAL | G04 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Complete scenario-specific populated-job/device/permission/recovery acceptance; see acceptance table and blocker register. |
| TF-T14 | unauthorised photo access denied | PARTIAL | G11 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Complete scenario-specific populated-job/device/permission/recovery acceptance; see acceptance table and blocker register. |
| TF-T15 | availability persists | PARTIAL | G05 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Complete scenario-specific populated-job/device/permission/recovery acceptance; see acceptance table and blocker register. |
| TF-T16 | offline availability distinction | PARTIAL | G05 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Complete scenario-specific populated-job/device/permission/recovery acceptance; see acceptance table and blocker register. |
| TF-T17 | accurate counts | VERIFIED_COMPLETE | G05 | PASS TF-DATA:106 canonical assignments; uncapped summary,20-row pages, completion event timestamps, actual rating, unread35 and scope isolation. None for this bounded scenario; broader gates remain open. |
| TF-T18 | zero-job empty state | VERIFIED_COMPLETE | G05 | PASS native zero-assignment account: actual zero metrics and honest empty Jobs/History; no runtime seeding. None for this bounded scenario; broader gates remain open. |
| TF-T19 | View My Jobs | PARTIAL | G03 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Complete scenario-specific populated-job/device/permission/recovery acceptance; see acceptance table and blocker register. |
| TF-T20 | photo shortcut job picker | PARTIAL | G12 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Complete scenario-specific populated-job/device/permission/recovery acceptance; see acceptance table and blocker register. |
| TF-T21 | report shortcut job picker | PARTIAL | G12 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Complete scenario-specific populated-job/device/permission/recovery acceptance; see acceptance table and blocker register. |
| TF-T22 | bottom tabs and deep links | PARTIAL | G03 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Complete scenario-specific populated-job/device/permission/recovery acceptance; see acceptance table and blocker register. |
| TF-T23 | notification badge/read state | PARTIAL | G15 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Complete scenario-specific populated-job/device/permission/recovery acceptance; see acceptance table and blocker register. |
| TF-T24 | assigned list/search/filters | PARTIAL | G06 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Complete scenario-specific populated-job/device/permission/recovery acceptance; see acceptance table and blocker register. |
| TF-T25 | accept/decline | PARTIAL | G07 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Complete scenario-specific populated-job/device/permission/recovery acceptance; see acceptance table and blocker register. |
| TF-T26 | reassignment conflict | PARTIAL | G08 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Complete scenario-specific populated-job/device/permission/recovery acceptance; see acceptance table and blocker register. |
| TF-T27 | invalid status transition | PARTIAL | G08 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Complete scenario-specific populated-job/device/permission/recovery acceptance; see acceptance table and blocker register. |
| TF-T28 | valid status transition | PARTIAL | G08 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Complete scenario-specific populated-job/device/permission/recovery acceptance; see acceptance table and blocker register. |
| TF-T29 | concurrent status update | PARTIAL | G08 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Complete scenario-specific populated-job/device/permission/recovery acceptance; see acceptance table and blocker register. |
| TF-T30 | cancellation/reschedule | PARTIAL | G08 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Complete scenario-specific populated-job/device/permission/recovery acceptance; see acceptance table and blocker register. |
| TF-T31 | customer contact privacy | PARTIAL | G04 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Complete scenario-specific populated-job/device/permission/recovery acceptance; see acceptance table and blocker register. |
| TF-T32 | safety hold | PARTIAL | G10 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Complete scenario-specific populated-job/device/permission/recovery acceptance; see acceptance table and blocker register. |
| TF-T33 | assessment before quote | PARTIAL | G09 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Complete scenario-specific populated-job/device/permission/recovery acceptance; see acceptance table and blocker register. |
| TF-T34 | quote submitted | PARTIAL | G09 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Complete scenario-specific populated-job/device/permission/recovery acceptance; see acceptance table and blocker register. |
| TF-T35 | approval required | PARTIAL | G09 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Complete scenario-specific populated-job/device/permission/recovery acceptance; see acceptance table and blocker register. |
| TF-T36 | unverified payment blocks chargeable work | PARTIAL | G09 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Complete scenario-specific populated-job/device/permission/recovery acceptance; see acceptance table and blocker register. |
| TF-T37 | verified payment permits authorised work | PARTIAL | G09 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Complete scenario-specific populated-job/device/permission/recovery acceptance; see acceptance table and blocker register. |
| TF-T38 | quotation revision | PARTIAL | G09 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Complete scenario-specific populated-job/device/permission/recovery acceptance; see acceptance table and blocker register. |
| TF-T39 | technician cannot self-approve | PARTIAL | G09 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Complete scenario-specific populated-job/device/permission/recovery acceptance; see acceptance table and blocker register. |
| TF-T40 | approved exception audited | PARTIAL | G09 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Complete scenario-specific populated-job/device/permission/recovery acceptance; see acceptance table and blocker register. |
| TF-T41 | required checklist validation | PARTIAL | G10 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Complete scenario-specific populated-job/device/permission/recovery acceptance; see acceptance table and blocker register. |
| TF-T42 | safety failure escalation | PARTIAL | G10 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Complete scenario-specific populated-job/device/permission/recovery acceptance; see acceptance table and blocker register. |
| TF-T43 | camera permission denial | PARTIAL | G11 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Complete scenario-specific populated-job/device/permission/recovery acceptance; see acceptance table and blocker register. |
| TF-T44 | invalid/oversized upload | PARTIAL | G11 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Complete scenario-specific populated-job/device/permission/recovery acceptance; see acceptance table and blocker register. |
| TF-T45 | secure successful photo upload | PARTIAL | G11 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Complete scenario-specific populated-job/device/permission/recovery acceptance; see acceptance table and blocker register. |
| TF-T46 | duplicate photo submission idempotency | PARTIAL | G11 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Complete scenario-specific populated-job/device/permission/recovery acceptance; see acceptance table and blocker register. |
| TF-T47 | report draft persistence | PARTIAL | G12 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Complete scenario-specific populated-job/device/permission/recovery acceptance; see acceptance table and blocker register. |
| TF-T48 | report submission | PARTIAL | G12 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Complete scenario-specific populated-job/device/permission/recovery acceptance; see acceptance table and blocker register. |
| TF-T49 | completion blocked without required proof | PARTIAL | G12 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Complete scenario-specific populated-job/device/permission/recovery acceptance; see acceptance table and blocker register. |
| TF-T50 | completed report historical access | PARTIAL | G12 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Complete scenario-specific populated-job/device/permission/recovery acceptance; see acceptance table and blocker register. |
| TF-T51 | previous evidence preserved | PARTIAL | G12 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Complete scenario-specific populated-job/device/permission/recovery acceptance; see acceptance table and blocker register. |
| TF-T52 | date-grouped history and filters | PARTIAL | G13 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Complete scenario-specific populated-job/device/permission/recovery acceptance; see acceptance table and blocker register. |
| TF-T53 | no fabricated ratings | VERIFIED_COMPLETE | G13 | PASS TF-DATA/TF-TIME: null rating without reviews, actual verified completed-customer feedback average and no invented timestamps. None for this bounded scenario; broader gates remain open. |
| TF-T54 | personal edit permissions | PARTIAL | G14 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Complete scenario-specific populated-job/device/permission/recovery acceptance; see acceptance table and blocker register. |
| TF-T55 | skills cannot be self-granted | PARTIAL | G14 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Complete scenario-specific populated-job/device/permission/recovery acceptance; see acceptance table and blocker register. |
| TF-T56 | notification preferences | PARTIAL | G15 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Complete scenario-specific populated-job/device/permission/recovery acceptance; see acceptance table and blocker register. |
| TF-T57 | sign out and unsynced warning | PARTIAL | G14 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Complete scenario-specific populated-job/device/permission/recovery acceptance; see acceptance table and blocker register. |
| TF-T58 | offline draft save | PARTIAL | G16 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Complete scenario-specific populated-job/device/permission/recovery acceptance; see acceptance table and blocker register. |
| TF-T59 | offline photo queue | BLOCKED | G16 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Implement and verify encrypted durable technician photo/replay/revocation/crash recovery (TF-B01/B03). |
| TF-T60 | reconnect sync | BLOCKED | G16 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Implement and verify encrypted durable technician photo/replay/revocation/crash recovery (TF-B01/B03). |
| TF-T61 | duplicate retry no double effect | PARTIAL | G16 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Complete scenario-specific populated-job/device/permission/recovery acceptance; see acceptance table and blocker register. |
| TF-T62 | assignment revoked during offline | BLOCKED | G16 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Implement and verify encrypted durable technician photo/replay/revocation/crash recovery (TF-B01/B03). |
| TF-T63 | stale version conflict | PARTIAL | G16 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Complete scenario-specific populated-job/device/permission/recovery acceptance; see acceptance table and blocker register. |
| TF-T64 | crash/restart recovery | BLOCKED | G16 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Implement and verify encrypted durable technician photo/replay/revocation/crash recovery (TF-B01/B03). |
| TF-T65 | failed upload recovery | BLOCKED | G16 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Implement and verify encrypted durable technician photo/replay/revocation/crash recovery (TF-B01/B03). |
| TF-T66 | audit trace and reconciliation | PARTIAL | G16 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Complete scenario-specific populated-job/device/permission/recovery acceptance; see acceptance table and blocker register. |
| TF-T67 | four-screen screenshot comparison | PARTIAL | G02 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Complete scenario-specific populated-job/device/permission/recovery acceptance; see acceptance table and blocker register. |
| TF-T68 | small/large screen layout | PARTIAL | G20 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Complete scenario-specific populated-job/device/permission/recovery acceptance; see acceptance table and blocker register. |
| TF-T69 | keyboard/screen reader/reduced motion | PARTIAL | G20 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Complete scenario-specific populated-job/device/permission/recovery acceptance; see acceptance table and blocker register. |
| TF-T70 | Light/Dark/System if supported | PARTIAL | G20 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Complete scenario-specific populated-job/device/permission/recovery acceptance; see acceptance table and blocker register. |
| TF-T71 | production build | BLOCKED | G21 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Signed production iOS/Android and applicable launch gates; simulator Release is not store evidence. |
| TF-T72 | no demo data or dead controls | PARTIAL | G19 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Complete scenario-specific populated-job/device/permission/recovery acceptance; see acceptance table and blocker register. |
| TF-T73 | production-like database multi-connection checks for changed transactional operations | PARTIAL | G17 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Complete scenario-specific populated-job/device/permission/recovery acceptance; see acceptance table and blocker register. |
| TF-T74 | independent rollback/recovery rehearsal where feasible | BLOCKED | G22 | PARTIAL:349-test regression passed; scenario-specific native/recovery acceptance not claimed. Independent operator rollback/restore rehearsal (TF-B06). |

## Acceptance gates

| Gate | Requirement | Status |
|---|---|---|
| G01 | preflight and repository preservation | PASS |
| G02 | four-screen visual fidelity | PARTIAL |
| G03 | shared navigation and responsiveness | PARTIAL |
| G04 | technician identity and authorisation | PARTIAL |
| G05 | accurate Home data and availability | PARTIAL |
| G06 | Jobs list/filters | PARTIAL |
| G07 | assignment acknowledgement | PARTIAL |
| G08 | service state machine | PARTIAL |
| G09 | assessment/quotation/payment gate | PARTIAL |
| G10 | safety checklist and incident handling | PARTIAL |
| G11 | photographic proof and private storage | PARTIAL |
| G12 | service report and customer records | PARTIAL |
| G13 | history integrity | PARTIAL |
| G14 | profile/security/skills | PARTIAL |
| G15 | notifications | PARTIAL |
| G16 | offline queue and reconciliation | BLOCKED |
| G17 | exactly-once effects | PARTIAL |
| G18 | stock/material integration | PARTIAL |
| G19 | customer/admin compatibility | PARTIAL |
| G20 | accessibility/performance | PARTIAL |
| G21 | regression/build | PARTIAL |
| G22 | documentation/rollback | PARTIAL |
| G23 | production readiness evidence | BLOCKED |

Scope change: approved existing green cylinder and initials fallback; no fabricated avatar/staff code. Actual verified-customer feedback reused after audit discovery. No original scenario or earlier phase removed. Excel import hold and existing production NO-GO preserved.

6 November follow-up — TF-T15: availability helper text now stays identical in on/off states, preventing text wrapping from moving the following cards. Canonical availability and offline warning retained. Native TypeScript passes; broader phase status remains PARTIAL / NO-GO.

6 November continuation: TF-T58–66 remain PARTIAL; encrypted technician drafts/photos and receipt-first replay now implemented with deterministic negative evidence. Actual device/crash/storage/camera/visual acceptance remains open. Production legacy-token scope is enforced by authenticated role. See [current continuation](production-end-to-end-rtm.json); no prior IDs/gates removed.
