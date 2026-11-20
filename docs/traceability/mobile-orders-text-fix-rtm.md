# Native Orders text rendering repair

21 November 2026. [Machine-readable matrix](mobile-orders-text-fix-rtm.json) · [implementation and evidence](../mobile-orders-text-fix/README.md).

| ID | Requirement | Implementation / authority / controls | Executed acceptance | Status |
|---|---|---|---|---|
| ORDTXT-01 | Orders renders without invalid native text children | `apps/mobile/OrderVisit.tsx`; existing scoped visit/photos/invoice APIs; permissions and financial controls unchanged | Original component reproduces defect; customer/driver status, loaded details and failed reads pass; actual iOS Orders and visit read after reload | VERIFIED_COMPLETE |
| ORDTXT-02 | Remove matching invalid spacers and guard recurrence | Eight native files listed in reviewed-source JSON; exact baseline/source hashes retained | Nine invalid spacers removed; text-host AST guard, source continuation and existing regressions pass | VERIFIED_COMPLETE |
| ORDTXT-03 | Verify current preview and preserve binaries | Existing Expo Go 58 / iPhone 17 Pro / iOS 26.5; original native artifacts and private prototype unchanged | Full source reload, Orders entry and successful visit read; screenshots/readback; native hash/size/mtime checks | VERIFIED_COMPLETE |

Gates ORDTXT-G01–G03: **3/3 pass for this repair**. Implementation 3/3; requirements 3/3; source-pattern coverage 8/8; live surfaces **1/8**, with seven untested sibling surfaces retained in the denominator. Selected regressions 24/24, prototype-preservation checks 5/5 and mobile typecheck pass. These results do not certify a new full role-based acceptance pass.

Finding **ORDTXT-F01 resolved in source/Expo preview** by [MORD-01–04](native-order-authority-rtm.md): customer actions now require the owning customer account, and owner invoice/visit reads pass without misplaced refund forms. The original observation is retained. Driver branches in this text repair were tested with component fixtures; seven sibling screens were not manually tested.

Production **NO-GO**, actual-import hold, retain-all and unrelated native/provider/operational gates remain unchanged. No new mobile binary, install or prototype publication.
