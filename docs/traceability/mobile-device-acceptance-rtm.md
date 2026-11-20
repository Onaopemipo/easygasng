# Sequential native device acceptance

21 November 2026. [Machine-readable matrix](mobile-device-acceptance-rtm.json) · [sequential report and evidence](../mobile-device-acceptance/README.md).

| ID | Stage | Actual implementation / authority | Acceptance result |
|---|---|---|---|
| MDEV-01 | Customer and commercial refunds | EasyRewards / CustomerOrderRefunds; authenticated own-order refund APIs; wallet credit requires independent review | Both roles on iOS; input/consent/lookup/submission failures and retries; exactly two pending requests, unchanged wallets before review — VERIFIED_COMPLETE |
| MDEV-02 | Staff review and access | NativeBusinessWorkspace / NativeForm; scoped credits, recent verification and requester separation | Finance approval once, owner rejection without credit, incorrect password, five-role API denials, self-review and replay — VERIFIED_COMPLETE |
| MDEV-03 | Seven related components | CustomerNotifications, DriverOperations, DriverProof, DriverWorkspace, NativeBusinessWorkspace, Services, TechnicianScreens | All seven rendered natively with guarded interactions; six normal navigation, one labelled legacy harness — VERIFIED_COMPLETE within component scope |
| MDEV-04 | Repairs and documentation | Four repaired native source files; original API business/security controls retained | Seven findings resolved and rechecked; 32 regressions, typecheck, prototype/native preservation and hosted restoration — VERIFIED_COMPLETE |

Gates MDEV-G01–G04: **4/4 pass within the stated scope**. Requirements/implementation 4/4, representative on-device roles 7/7, native component renders 7/7, resolved findings 7/7. Current navigation remains **6/7**, with the bypassed legacy DriverOperations path retained in the denominator. Hosted business endpoint checks are now **4/4** through the [HLED follow-up](hosted-ledger-acceptance-rtm.md): the correct GET `finance.ledger` returned all 10 payments and role restrictions passed. The original GET `ledger` 405 is preserved as history. The expanded hosted foreign-branch negative now passes (1/1) under HLED-03 using the user-authorised synthetic demo fixture; original unavailable evidence retained. Owner sees 11 entries; finance retains its original 10. No exclusions.

Source/data authority: real dispatcher and scoped APIs with an in-memory loopback fixture for mutations and forced errors; hosted read fingerprints and native owner order/invoice restoration recorded separately. Material presentation variants were synthetic props, not stock acceptance. API scope, branch/ownership rules, required evidence, independent review, idempotency and financial immutability remain enforced.

Production NO-GO, actual-import hold, retain-all, unrelated 300-feature acceptance, native/provider/signed physical-device/store gates remain unchanged. Zero new native binary, install, private-prototype publication or hosted financial write.
