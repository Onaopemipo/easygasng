# Fresh customer order normal-path acceptance

[Canonical matrix](fresh-order-demo-20261119-rtm.json) · [Execution report](../deployment/20261119-fresh-order-acceptance.md).

| Requirement | Priority | Status | Gate |
|---|---|---|---|
| FRESH-01 — Place a brand-new synthetic customer order through normal hosted checkout | P0 | VERIFIED_COMPLETE | FRESH-G01 PASS |
| FRESH-02 — Accept, prepare and dispatch the new order with registered cylinder and recorded filling eligibility | P0 | VERIFIED_COMPLETE | FRESH-G02 PASS |
| FRESH-03 — Issue and independently acknowledge vehicle custody, dispense to exact meter delta and complete proof/customer handover | P0 | VERIFIED_COMPLETE | FRESH-G03 PASS |
| FRESH-04 — Reconcile new delivery stock/payment/custody and close trip without direct database mutation or missing-custody recovery | P1 | VERIFIED_COMPLETE | FRESH-G04 PASS |

Implementation4/4,verified4/4,critical3/3,gates4/4;actual hosted demo origin1/1. No denominator exclusion. NeworderEG-2026-FD9F2C67 delivered06:05WAT,15UIcheckspass. Focused existingDLPG-04test1/1passes and contains pre-load pickup rejection/idempotent inspection assertions.

Actual normal UI run only; no hosted DBconnection/query/write,APIshortcut,status edit,stockadjustment,manual walletcredit or arrived-order recovery. Initial missinginvoice guard was resolved through normalFinanceinvoice issuance. Existing customer and sandboxwallet used; brand-new account/card/COD/provider/native/physical/formal-accessibility/global DBhash acceptance not claimed. Prior NO-GO/import/retain-all holds remain.
