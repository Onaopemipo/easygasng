# All pending fixes demo release and named recovery

Canonical mapping: [JSON](demo-all-fixes-20261119-rtm.json). Stable IDs, actual implementation/data/security/test/gate mapping and historical status changes are retained.

| ID | Requirement | Priority | Status | Gate |
|---|---|---|---|---|
| DREL2-01 | Publish all authorised pending fixes and verify the exact demo deployment against successful release validation | P0 | VERIFIED_COMPLETE | DREL2-G01 |
| DREL2-02 | Apply service-request migration081 only to the isolated demo database while preserving canonical records and restricted runtime access | P0 | VERIFIED_COMPLETE | DREL2-G02 |
| DREL2-03 | Verify deployed customer Orders, Notifications, Account and service booking pages including preferred-time requests without technician capacity | P1 | VERIFIED_COMPLETE | DREL2-G03 |
| DREL2-04 | Recover and complete existing synthetic order EG-2026-7BB8640B through the actual web workflow with audited qualifications, custody, dispensing and customer handover | P0 | VERIFIED_COMPLETE | DREL2-G04 |
| DREL2-05 | Reconcile exact demo stock, cylinder, invoice/payment and returned vehicle custody without new charges or duplicate fulfilment | P0 | VERIFIED_COMPLETE | DREL2-G05 |

Implementation **5/5**, verified **5/5**, critical **4/4**, acceptance gates **5/5**. Stable demo origin **1/1** verified by actual authenticated customer/driver pages and readiness; route existence alone is not acceptance. No requirement removed from denominators.

Final source `600b0fddd1a90e6c5edecfd5f81b2c539c6f5196`, cloud run [44457056157](https://github.com/Onaopemipo/easygasng/actions/runs/44457056157):797/797 web tests,0failures/skips, build/types/audit; native types/dependencies/audit only. Stable deployment `dpl_6MewDCoCGcTpw1UKyqpeVpdFBe2C`.

Actual named order EG-2026-7BB8640B is Delivered,6000g load independently reconciled and trip closed.18 restricted canonical checks verify one6kg debit,filled customer cylinder,unchanged original invoice/payment/receipt/wallet rows and unrelated orders. Service requestEGS-AD0E7F94 accepted without provider/capacity/payment then cancelled with history retained; final presentation correction verified.

See [release report](../deployment/20261119-all-fixes-release.md) and [reconciliation](../deployment/evidence/20261119-all-fixes/named-order-final-reconciliation.json). Synthetic DEMO-QA evidence is not physical certification. Commercial production NO-GO,retain-all,actual-import and unrelated native/physical/provider/formal-accessibility holds remain. Independent backup restore drill remains unclaimed.
