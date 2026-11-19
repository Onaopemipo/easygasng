# Vehicle-dispensed LPG web workflow

Canonical mapping: [JSON](driver-lpg-workflow-rtm.json). Stable IDs, exact implementation/data/security/test/gate mapping and historical status changes are retained there.

| ID | Requirement | Priority | Status | Gate |
|---|---|---|---|---|
| DLPG-01 | Complete vehicle load issue, driver acknowledgement, metered dispensing and handover through the web with canonical stock and payment controls | P0 | VERIFIED_COMPLETE | DLPG-G01 |
| DLPG-02 | Recover a picked-up or arrived order missing LPG allocation through explicit measured and audited custody intake, without rewinding or inventing dispensing | P0 | VERIFIED_COMPLETE | DLPG-G02 |
| DLPG-03 | Select the actual cylinder by serial with an owned/allocated branch-scoped record and qualified inspection rather than typing internal IDs | P0 | VERIFIED_COMPLETE | DLPG-G03 |
| DLPG-04 | Show actionable order and trip LPG readiness, versioned retry-safe controls and return reconciliation with responsive driver views | P1 | VERIFIED_COMPLETE | DLPG-G04 |

Verified **4/4**, critical **3/3**, gates **4/4**. Every incomplete requirement remains in the denominator.

Actual named hosted EG-2026-7BB8640B isDelivered with independent zero-return reconciliation and trip closure.18 canonical checks verify a single6kg debit,filledcustomer cylinder,unchanged original invoice/payment/receipt/wallet rows and unrelated orders. See [reconciliation](../deployment/evidence/20261119-all-fixes/named-order-final-reconciliation.json) and [release report](../deployment/20261119-all-fixes-release.md). Synthetic DEMO-QA evidence is not physical certification. Commercial production NO-GO, retain-all,import and unrelated native/physical/provider/formal-accessibility holds remain.
