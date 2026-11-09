# Risk remediation plan

This is a recommendation only. No fix, deployment, data correction, provider activation or live operating-setting change was made during the audit. Proposed accountable roles are not assignments accepted by named people. Estimates are experienced-engineer working days plus review; parallel dependencies and business approvals can dominate elapsed time. Validate estimates after each scoped design; do not promise an aggregate completion date.

| Phase / priority | Corrective work / risks | Dependencies | Accountable roles | Indicative effort | Exit evidence |
|---|---|---|---|---|---|
| R0 / P0 | F01/F02 active/authorized fulfilment branch | Explicit branch purchasing policy | Backend/security lead | 2–4 days | Failed inactive/cross-branch calls have zero writes; valid customer/owner/scoped staff orders pass; managed pg race tests |
| R0 / P0 | F06 shared capacity invariant on assignment/reactivation | Agreed failed-delivery rebooking policy | Dispatch/backend | 2–4 days | Capacity-one race/reassignment/reschedule rejects excess commitments |
| R0 / P0 | F03/F04 serial allocation/return/custody coupling | Cylinder ownership/unit model and physical safety SOP | Inventory + operations + engineering | 8–15 days | Unsafe/due/quarantined/missing/already-issued serial cannot sell/dispatch/return to available; duplicate scans/retries are neutral |
| R1 / P1 | F05 source timestamp and supported forecast provenance | Definition of verified physical refill; migration review | Forecast/product/backend | 3–6 days | Ten mandatory prediction lifecycle cases; late COD/prepaid/external/early refill; immutable correction provenance |
| R1 / P1 | F07 responsive product strip and core browser acceptance | Full catalogue | Frontend/QA | 1–3 days | 320/390/768/1280 no page overflow; cart/stock/changed-price/retry keyboard checks |
| R1 / P1 | Finance credit/cash/refund/reward/complete export reconciliation R14/R15/R25 | Finance policy and restricted credit model review | Finance/backend | 7–14 days | Opening + credits − debits/reversals = closing liability; bank/till reconciles; earn/redeem/spend/refund cannot create unapproved economic benefit |
| R1 / P1 | Gas unit/stocktake/returns and safety procedures R16 | R0 allocation model; real opening stock and suppliers | Inventory/finance | 8–15 days | Bulk kg and cylinder units reconcile separately; counts/discrepancies/return condition approval tested |
| R1 / P1 | Delivery code renewal, failure/reschedule and offline recovery R17 | R0 slot invariant and customer consent | Dispatch/mobile/QA | 3–6 days | Expired/missing code has audited customer-safe remedy; disconnected replay conflicts resolve without duplicate cash/stock |
| R1 / P1 | Accounts email/provider delivery + anti-abuse R07/R22 | Provider selection/credentials only when authorised | Platform/security/support | 4–8 days | Actual sandbox receipt/bounce/outage/retry, single-use expiry/revocation, registration/login abuse limits |
| R1 / P1 | Privacy/legal/retention/deletion R08 | Business/legal data-retention decisions | Privacy/owner/backend | 3–7 days plus specialist review | Approved published notices and executable export/deletion/escalation tests |
| R1 / P1 | Reviewed baseline, CI, pg concurrency/timeouts and production operations R06/R11/R23 | Later permission/budget for hosting; no cloud change now | Engineering/platform/database | 6–12 days plus provisioning | Restricted-role multi-connection tests, safe migrations, job heartbeat, incident alerts, managed off-site restore and rollback drill |
| R1 / P1 native | Dependency resolution and native release R09/R10 | Supported Expo tree, API HTTPS, store/signing identities | Mobile/platform/QA | 7–15 days plus store time | Fresh audits reviewed, export+signed device builds, keyboard/accessibility/lifecycle/offline/deep-link QA |
| R2 / P2 | Supplier/transfer discrepancy, reporting/worker scalability R21/R24 | Stable ledger and branch model | Operations/database | 6–12 days | Idempotent create and in-transit recovery, no truncated financial books, target-load plans/p95/lock metrics |
| R2 / affected launch P1 | Commercial accounts/contracts/invoices/credit R18 | R0 branch checks, finance/stock model and commercial policy | Commercial/finance/backend | 15–30 days | Company isolation, negotiated-price authorisation, credit ceiling, invoice/statement/overdue reconciliation |
| R2 / P2 | Feedback/stale reminders/conversion R19/R20 | Correct history, consent and selected provider | Forecast/support/product | 5–10 days excluding new channels | External-refill reset, obsolete notification replacement, opt-out/quiet/frequency and conversion attribution |
| R3–R4 / P3 | Selected advanced differentiators | Prior phases; validate business demand | Product + respective owners | Per advanced-gap table | Human-reviewed measurable pilot outcomes; no invented ROI |

## Release strategy

A narrowly scoped COD/restricted-credit web launch may deliberately exclude online payments, B2B credit, native distribution, exchanges and advanced modules, but the owner must approve that scope explicitly. Excluding a feature requires consistent UI/copy/operating procedures, not silently claiming the original master specification is complete. Safety/integrity controls for anything offered remain mandatory. Keep provider payments disconnected under the existing instruction.

## Recommended fix acceptance protocol

1. Preserve this audit and reproduce each finding in isolated fixtures.
2. Specify expected business behavior, safety/finance invariants and necessary data migration before editing.
3. Add targeted regression cases covering failure, permission, replay and transaction rollback; execute the failing reproduction before and after the fix.
4. Run relevant existing tests; run real multi-session Postgres concurrency where behavior depends on locks.
5. Exercise affected web/native UI with synthetic data. Provider tests use authorised sandbox identities only.
6. Finance/operations/privacy owners review reconciliation and real process evidence. Retain logs without customer data or secrets.
7. Re-score residual risk, document accepted exclusions, and only then request any separately required production activation.

The audit's current local passing tests are retained as baseline evidence. They must not be edited to mask reproduced defects. No production transaction or physical stock record should be fabricated to make a readiness dashboard appear complete.
