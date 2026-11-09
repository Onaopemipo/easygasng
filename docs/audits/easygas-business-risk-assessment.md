# Business risk assessment — 29 October 2026

**Current decision: do not launch the full platform commercially.** The local foundation has meaningful transaction, permission and finance controls, but critical safety integration and high-risk ordering, lifecycle and release gaps remain. This report distinguishes confirmed code behavior, scoped missing capability, suspected concurrency risk and unverified deployment behavior. It does not claim observed theft, loss, unsafe physical handling or regulatory compliance.

The [risk register](easygas-risk-register.md) contains 25 prioritised risks, inherent/current residual scores, evidence, owners, actions, phase and validation. The [security/integrity report](easygas-security-and-integrity.md) gives reproducible F01–F07. The [blocker report](easygas-production-blockers.md) identifies launch gates; optional competitive features are separate.

## Stakeholder consequences

| Stakeholder | Most relevant exposure | Existing safeguards | Required operational response |
|---|---|---|---|
| Business owner | Unsupported launch promises, inactive/other-branch orders, incomplete liabilities and continuity | Real verified revenue, owner oversight, audited approvals | Approve limited release scope, nominate accountable owners, close R01–R08/R14 and recovery gates |
| Customers | Failed delivery promises, unusable recovery, stale estimates, missing privacy/refund terms, mobile overflow | Owned records, price snapshots, code-confirmed delivery, support | Honest service/payment/estimate language, accessible support and complete refund/recovery procedures |
| Sales attendants | Cross-branch write path, incomplete POS returns/offline/variance workflow | Server prices, active shift, cash tender checks | Enforce branch scope and till reconciliation; documented outage/manual receipt procedure |
| Branch managers | Capacity overbooking and no complete branch-level customer fulfilment | Many read/settings/stock scope checks, independent receipt | Correct branch and reactivation controls; review dispatch capacity and exceptions |
| Inventory officers | No physical unit allocation at sale, duplicate custody issue, no kg stocktake model | Nonnegative counts, reservations, inspections/quarantine/events | Couple physical serials/units to fulfilment; independent stocktake/return reconciliation |
| Delivery drivers | No code renewal, limited connectivity recovery, no driver availability/load planning | Assignment scope, code throttle, exact COD amount, secure pending queue | Test offline conflicts/expiry; dispatch escalation and safe physical handover procedure |
| Finance officers | Funding settlement linkage/report completeness, restricted refund policy and reward clawback | Immutable entries, unique receipt, independent cash/credit approvals | Reconcile credit liabilities, collected vs verified cash, refunds/rewards and stock returns daily |
| Commercial customers | No contract/invoice/negotiated pricing/credit-limit account model | Ordinary COD/prepaid checkout only | Do not promise credit or negotiated contract features; implement explicit company tenancy and statements |
| Support staff | Unsent recovery/reminders, no complete stale estimate/failure recovery tooling | Ticket replies/internal notes/assignment and public contacts | Verified provider delivery/complaint SLA, account/privacy escalation and failed delivery runbook |
| Operations/compliance | Software controls disconnected from physical cylinder safety, incomplete legal/continuity evidence | Inspection records and safety copy, protected governance | Qualified LPG and privacy review, training/incident/recall procedures and rehearsed recovery |

## Revenue protection and financial trace

The existing synthetic COD chain is: customer checkout stores server-derived subtotal/fee/snapshot, reserves stock, leaves payment unpaid → assigned driver completes using customer code/exact cash amount → stock quantity and reservation decrease once, cash_collections created, payment collected → independent finance reauth/reconciliation creates unique verified_payments → dashboard recognises only delivered+verified order revenue. `platform.test.ts:665` and restricted-role `deployment.test.ts:69` execute this path, including replay. No financial amount from those fixtures is treated as real EasyGas revenue.

Wallet path is verified cash funding request → independent finance review → immutable credit → locked customer balance check/debit and internal verified payment → delivery with zero cash; cancellation refunds exact credit, and delivered full-refund approval changes payment_status to refunded and reverses earned points (`commerce.test.ts`). The original payment/receipt remains historical evidence rather than being deleted. Dashboard excludes refunded/cancelled/unverified order revenue by its filter. POS revenue is included only after independent shift verification. These controls reduce duplicate accounting but are not complete financial statements.

Outstanding revenue risks: no verified online provider settlement linkage; funding receipts are independent human attestations without till/bank linkage; partial/provider/cash refunds and POS returns/variance workflow absent; no costs/profit/tax model; no complete receivable/liability dashboard; finance export truncates at 500 without completeness marker. Redeem→refund economic policy is incomplete: points reverse, but converted/spent reward credit is not clawed back by the refund function. No exploit loss measured. See R14/R15/R25.

Incorrect price/forged totals/oversell/replay checks have real local test safeguards. New product import has exact supplied prices and no invented stock; migration keeps historical order prices/reservations. Concurrent funds/stock tests are useful but require real multi-connection pg revalidation. A payment.integration setting is not a functioning adapter; UI/API expose COD/wallet only. No successful provider payment can be claimed.

## Inventory loss and cylinder safety

Product inventory is integer units per branch/product; reservations are separate and constrained <=quantity. Delivery/POS deductions and cancellation release are transactional, uniquely referenced movements. Receipts dedupe and transfers separate outbound reduction from independent inbound receipt. Tests cover rollback/oversell/replay/branch permissions. Reserved/released movement quantities are not physical receipts/sales; reconciliation must distinguish movement kinds rather than blindly sum all quantities.

Confirmed F03 lets cylinder product sales complete without a registered/eligible serial. Inspections/quarantine work in their own module but do not gate allocated fulfilment because allocation does not exist. F04 replaces current customer custody without return. Filling changes status, not a gas kg tank ledger or inventory conversion. No deposit/exchange/incident/recall/lost-cylinder/physical-stocktake workflow. Generic inventory.receive can add stock with a reference/reason under inventory authority, bypassing supplier purchase-order review as an accepted manual operation; it is audited but lacks independent physical-receipt/adjustment reconciliation. Whether that authority is acceptable is a business-policy decision, not a proven privilege escalation.

These gaps can permit physical-vs-digital divergence and safety eligibility failure, but no actual physical unsafe cylinder or missing stock was observed. Returns after financial refunds must be inspected/reconciled explicitly; auto-restoring stock on refund would be unsafe, and current refund correctly does not invent a return. R01/R05/R16/R24 apply. A completed software inspection entry is not proof of a real qualified inspection.

## Delivery, retention and predictions

F01/F02 allow commitments in inactive/unauthorised fulfilment branches. F06 allows capacity overbooking on failed-delivery reassignment. Assignment checks active same-branch driver but not duty availability/vehicle load/navigation. Customer confirmation and replay-safe fulfilment are strong safeguards; no live tracking/ETA or complete failure/reschedule/code-renewal flow exists. Expired codes block delivery; a manual database edit is not an acceptable production remedy. Offline queue persists completion attempts, not an entire offline dispatch system; device recovery remains untested. R02–R04/R17.

Repeat purchasing has a catalogue/cart, schedule preferences, authorised COD recurrence, points/redemption and in-app reminders. There is no evidence these have improved retention. External reminders/recovery cannot deliver; no conversion events/costs/CLV evidence. F07 mobile overflow harms browsing. R07/R13/R19/R20.

Predictions are computed from recent verified matching quantity-one history rather than hardcoded percentages; minimum-history gate and non-sensor language reduce misleading precision. F05 uses payment date rather than actual refill time; multiple same-size cylinders, POS/external refills, feedback fitting, forecast snapshots/error calibration and obsolete-reminder cancellation are absent. Irregular intervals can still return medium confidence with sparse cleaned data. New customers get no estimate; long intervals outside3–180 days are rejected. An order merely placed/cancelled does not qualify, but delayed cash verification can shift history. Forecasts must not become autonomous supplier commitments. R12/R20; detailed ten-case assessment in prediction report.

## Staff fraud, privacy and security

Current-session actor reloading, branch filters, independent approvals, no self-promotion/self-approval, dual distinct approvers, reauthentication, suspension revocation and immutable ledgers are exercised. F02 is a verified gap in that boundary, not a claim all RBAC is broken. Trusted-server RLS is intentionally broad; app authorization remains essential. Global abuse throttling, monitoring/MFA and deployment hardening need evidence. Cylinder/order event histories lack equivalent immutable triggers; no remote arbitrary-history editing route was found. R02/R11/R22/R23.

Account ownership, internal-note privacy and role-limited finance configuration are exercised locally. Export is owned and reauthenticated. Deletion is request-only, retention/approved policies and fulfilment lack implementation. No location-tracking provider runs; no payment card details collected by this app. An absence of current providers does not establish full privacy compliance. Do not collect extra data or expose delivery addresses in future public QR/dispatch surfaces without access controls. R08/R19/R22.

Specialist Nigerian review is required for actual operations and the restricted purchase-credit business model. The [Nigeria Data Protection Commission's Act publication](https://ndpc.gov.ng/download/nigeria-data-protection-act-2023) and [official FAQs](https://ndpc.gov.ng/faqs/) are authoritative privacy starting points. The [CBN payments-system framework index](https://www.cbn.gov.ng/PaymentsSystem/) includes stored-value/mobile-money frameworks; whether this merchant-only cash-funded credit falls within specific licensed activities needs provider/legal analysis, not inference from a “wallet” label. [NMDPRA's LPG retailer portal](https://lpgretailer.nmdpra.gov.ng/) identifies regulated LPG retailer operations; a software inspection field cannot substitute for required business/safety review. These links establish review domains, **not a legal conclusion** about EasyGas's licences, obligations or compliance.

## Business continuity and integrations

| Failure | Current effect/safeguard | Missing operational proof |
|---|---|---|
| Branch internet outage | Web/API require connectivity; POS has no offline sale queue | Approved manual receipt/stock reservation/re-entry reconciliation procedure |
| Driver connectivity loss | SecureStore pending completion queue with manual sync, server revalidation | Real-device interrupted/reinstalled/revoked/expired/conflicting queue acceptance |
| Database outage | Mutations unavailable, generic API error, transaction rollback | Connection/statement timeouts, alerts, failover and recovery objectives |
| Provider outage | No payment/messaging provider connected; cannot claim existing fallback | Provider-specific idempotency, retries, settlement and consent-aware recovery before activation |
| Worker/app process stops | In-process timer stops; explicit worker command available | Supervised durable schedule, missed-run detection, job failure alert and recovery |
| Bad deployment | No committed release/rollback baseline | CI/reviewed version, environment isolation, migration compatibility and rollback drill |
| Need restore | Actual encrypted local backup restore test passed | Off-site managed backups, retention/passphrase ownership, production restore rehearsal/RPO/RTO |
| Mobile app unavailable | Browser customer interface exists locally | Hosted production alternative and store/device release acceptance |

No external provider cost was verified, and no cost estimate is fabricated. Supabase provisioning remains intentionally deferred under local-only authorization. Basic /api/health checks reachability, not queue freshness, settlement/backup health or full monitoring. Failed outer maintenance transactions roll back their running job record as well; stdout error type alone is insufficient supervision.

## Reporting, commercial and growth

Dashboard counts actual rows and verified revenue, not random samples. It does not distinguish profit/net margin/cash/liability/receivables/forecast revenue comprehensively. A cancelled order is excluded from revenue, full refund removes revenue, but period/refund/POS timing/accounting policy and timezone need finance-defined statements. Orders lists cap100 and finance500; customer/stat/forecast jobs can scan across histories without measured load. No demand projection/forecast purchase/cost/CLV subsystem. Growth risk is architectural and unmeasured, not an asserted capacity figure. R14/R18/R21.

Restaurants/hotels can currently use ordinary commerce; that does not support contract prices, credit limits, invoices, account statements, multi-location company permissions or overdue balances. Those workflows must not launch until implemented and tenant/finance-tested. Optional advanced modules depend on core integrity and real data, rather than solving launch reliability by adding dashboard features.

## Financial exposure limits

No production transaction counts, average loss, cost per cylinder, avoidable delivery cost, contribution margin, audited liabilities or retention metrics were accessed. **No monetary loss or exposure estimate is supportable.** Future finance assessment can calculate affected transactions×validated average loss, unaccounted units×unit cost, failed deliveries×avoidable cost, lost repeat orders×contribution margin, and duplicate credits×amount. Keep observed losses separate from scenario exposure; never substitute synthetic test volumes/prices for EasyGas financial performance.

## Assessment acceptance checklist

All requested business-risk domains have been evaluated in this assessment and linked register: revenue, wallet/payment, gas/cylinder stock/safety, delivery, predictions/reminders/retention, staff abuse, privacy, commercial accounts, reporting, integrations/continuity and scaling. Every confirmed finding has code/probe/source evidence; suspected/untested risks are labelled. Every risk has severity, action, owner role and verification target. P0/P1 blockers and phased actions are explicit. No compliance, financial loss, performance capacity or production-readiness claim is inferred from local tests. **External/device/security/load/field verification gates remain open; completion of the risk assessment does not close them.**
