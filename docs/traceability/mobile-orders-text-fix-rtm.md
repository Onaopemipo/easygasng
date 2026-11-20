# Native Orders text rendering repair

21 November 2026. [Machine-readable matrix](mobile-orders-text-fix-rtm.json) · [implementation and evidence](../mobile-orders-text-fix/README.md).

| ID | Requirement | Implementation / authority / controls | Executed acceptance | Status |
|---|---|---|---|---|
| ORDTXT-01 | Orders renders without invalid native text children | `apps/mobile/OrderVisit.tsx`; existing scoped visit/photos/invoice APIs; permissions and financial controls unchanged | Original component reproduces defect; customer/driver status, loaded details and failed reads pass; actual iOS Orders and visit read after reload | VERIFIED_COMPLETE |
| ORDTXT-02 | Remove matching invalid spacers and guard recurrence | Eight native files listed in reviewed-source JSON; exact baseline/source hashes retained | Nine invalid spacers removed; text-host AST guard, source continuation and existing regressions pass | VERIFIED_COMPLETE |
| ORDTXT-03 | Verify current preview and preserve binaries | Existing Expo Go 58 / iPhone 17 Pro / iOS 26.5; original native artifacts and private prototype unchanged | Full source reload, Orders entry and successful visit read; screenshots/readback; native hash/size/mtime checks | VERIFIED_COMPLETE |

Gates ORDTXT-G01–G03: **3/3 pass for this repair**. Implementation/requirements 3/3 and source-pattern coverage 8/8. Original executed tests and 1/8 live coverage remain historical. Subsequent [MDEV-01–04](mobile-device-acceptance-rtm.md) renders all eight components natively: current navigation **7/8**, plus legacy DriverOperations in a labelled native harness. The legacy inactive route remains in the denominator. This is scoped acceptance, not certification of every project feature.

Finding **ORDTXT-F01 resolved in source/Expo preview** by [MORD-01–04](native-order-authority-rtm.md): customer actions now require the owning customer account, and owner invoice/visit reads pass without misplaced refund forms. The original observation is retained. Driver branches in this text repair were tested with component fixtures; seven sibling screens were not manually tested.

Production **NO-GO**, actual-import hold, retain-all and unrelated native/provider/operational gates remain unchanged. No new mobile binary, install or prototype publication.
