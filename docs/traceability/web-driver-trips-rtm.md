# Driver web trips and actual named demo workflow

Canonical mapping: [JSON](web-driver-trips-rtm.json). Stable IDs, exact implementation/data/security/test/gate mapping and historical status changes are retained there.

| ID | Requirement | Priority | Status | Gate |
|---|---|---|---|---|
| DWT-01 | Start and manage own duty trip from driver web Home and Profile | P1 | VERIFIED_COMPLETE | DWT-01-G |
| DWT-02 | Preserve canonical trip ownership, branch, suitability, replay and custody controls | P0 | VERIFIED_COMPLETE | DWT-02-G |
| DWT-03 | Responsive, explicit consent and authoritative error/reconnect states | P1 | VERIFIED_COMPLETE | DWT-03-G |
| DWT-04 | Release to the synthetic demo with fulfilment enabled and Paystack sandbox | P1 | VERIFIED_COMPLETE | DWT-04-G |
| DWT-05 | Complete the paid synthetic delivery through the driver web interface without requiring the native app | P0 | VERIFIED_COMPLETE | DWT-05-G |
| DWT-06 | Complete the existing paid demo order EG-2026-7BB8640B through the actual web UI with Demo Driver and an inspected cylinder | P0 | VERIFIED_COMPLETE | DWT-06-G |

Verified **6/6**, critical **3/3**, gates **6/6**. Every incomplete requirement remains in the denominator.

Actual named hosted EG-2026-7BB8640B isDelivered with independent zero-return reconciliation and trip closure.18 canonical checks verify a single6kg debit,filledcustomer cylinder,unchanged original invoice/payment/receipt/wallet rows and unrelated orders. See [reconciliation](../deployment/evidence/20261119-all-fixes/named-order-final-reconciliation.json) and [release report](../deployment/20261119-all-fixes-release.md). Synthetic DEMO-QA evidence is not physical certification. Commercial production NO-GO, retain-all,import and unrelated native/physical/provider/formal-accessibility holds remain.
