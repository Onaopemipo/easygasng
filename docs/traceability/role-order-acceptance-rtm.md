# Hosted role-based order-to-delivery acceptance

19 November2026. **10/10 bounded synthetic requirements and gates pass;8/8 critical requirements and9/9 functional routes verified;8/9 responsive routes exercised.** [JSON matrix](role-order-acceptance-rtm.json) · [Acceptance report](../reports/role-order-delivery-acceptance-20261119.md).

Stable demo: https://easygas-client-demo.vercel.app. Runtime source `8e0e5843e6989792f16a38971b02e22ee702ac0e`; Ready deployment `dpl_Bj5pEYpjY4wToJ9sNFo7a5x7MyE2`. Later evidence/documentation commits do not change deployed application code.

All ten approved requirements remain counted. Existing production **NO-GO**, actual-import hold and retain-all remain unchanged. Synthetic funds, goods, safety evidence and proof placards do not certify real safety/devices/GPS/travel/live payments or physical delivery. User-approved QA qualifications and sandbox meter expire **19 November2026 at11:53:44 UTC**.

| Requirement | Status | Gate | Executed checks |
|---|---|---|---|
| ROLEACC-01 — Authenticate functional role accounts and verify permitted navigation and scoped records | VERIFIED_COMPLETE | ROLEACC-G01 PASS | ROLEACC-PREFLIGHT, ROLEACC-ACCESS |
| ROLEACC-02 — Complete a fresh gas wallet order through sales, dispatch, qualified inspection, custody, metered fulfilment, proof and invoice | VERIFIED_COMPLETE | ROLEACC-G02 PASS | ROLEACC-QA-RENEWAL, ROLEACC-GAS-PREP, ROLEACC-GAS-GUARDS, ROLEACC-GAS |
| ROLEACC-03 — Complete a fresh physical-product cash-on-delivery order with independent cash reconciliation | VERIFIED_COMPLETE | ROLEACC-G03 PASS | ROLEACC-PRODUCT-PREP, ROLEACC-HANDOVER-GUARDS, ROLEACC-CASH-GUARDS, ROLEACC-COD |
| ROLEACC-04 — Reject unsuccessful, unauthorised or tampered payment attempts without false payment or stock debit | VERIFIED_COMPLETE | ROLEACC-G04 PASS | ROLEACC-PAYMENT, ROLEACC-PROVIDER-GUARDS |
| ROLEACC-05 — Cancel before pickup and protect cancellation after pickup until custody return; reconcile reservations and financial state | VERIFIED_COMPLETE | ROLEACC-G05 PASS | ROLEACC-CANCEL, ROLEACC-WALLET-CANCEL, ROLEACC-FAILED, ROLEACC-CANCEL-BALANCE, ROLEACC-CANCEL-INVOICE |
| ROLEACC-06 — Record failed delivery with owned next steps, enforce full return and exercise safe retry or cancellation | VERIFIED_COMPLETE | ROLEACC-G06 PASS | ROLEACC-FAILED, ROLEACC-RETRY, ROLEACC-RETRY-PROOF, ROLEACC-RETRY-COMPLETE |
| ROLEACC-07 — Exercise refund request, independent rejection/approval, allocation limits and replay safety on new synthetic orders | VERIFIED_COMPLETE | ROLEACC-G07 PASS | ROLEACC-COD, ROLEACC-REFUND, ROLEACC-REFUND-RUNTIME |
| ROLEACC-08 — Reject wrong-role/other-customer, stale/duplicate and incomplete handover attempts without unintended effects | VERIFIED_COMPLETE | ROLEACC-G08 PASS | ROLEACC-HANDOVER-GUARDS, ROLEACC-GAS-GUARDS, ROLEACC-RETRY-PROOF, ROLEACC-COD |
| ROLEACC-09 — Verify hosted customer, sales, dispatch, driver and finance screens for happy and exception states on desktop/phone viewport | VERIFIED_COMPLETE | ROLEACC-G09 PASS | ROLEACC-UI |
| ROLEACC-10 — Fix reproduced defects, redeploy if needed and reconcile new changes while preserving prior records and decisions | VERIFIED_COMPLETE | ROLEACC-G10 PASS | ROLEACC-FIX-HTTP, ROLEACC-REFUND-FIX-HTTP, ROLEACC-RECONCILE, ROLEACC-CANCEL-BALANCE, ROLEACC-INVOICE-FIX-HTTP |

## ROLEACC-01

Ten labelled accounts authenticated, including the independent second owner. Functional sales/dispatcher labels are canonical managers; inventory/finance labels are canonical finance. Customer ownership and restricted driver/technician scopes verified.

- Implementation: `apps/web/lib/auth.ts`, `apps/web/lib/service.ts`, `packages/business-rules/src/staff-roles.ts`, `scripts/demo-role-acceptance-client.mjs`, `scripts/check-role-acceptance-demo.mjs`.
- Authoritative data: Normal hosted me/navigation.access/orders/invoice/finance APIs; canonical users, sessions, roles, branch and order ownership; manifest labels mapped to actual authenticated roles.
- Security: Existing qualification/independent custody/finance/consent/branch/ownership/version/idempotency/retention controls remain authoritative; only new run-owned orders may mutate.
- Tests: `tests/navigation.test.ts`, `tests/admin-order-modal.test.ts`, `scripts/check-role-acceptance-demo.mjs`.
- Evidence: [preflight.txt](../../docs/deployment/evidence/20261119-role-acceptance/preflight.txt), [preexceptions.txt](../../docs/deployment/evidence/20261119-role-acceptance/preexceptions.txt), [preflight.json](../../docs/deployment/evidence/20261119-role-acceptance/preflight.json), [role-ui.txt](../../docs/deployment/evidence/20261119-role-acceptance/role-ui.txt), [browser-evidence.json](../../docs/deployment/evidence/20261119-role-acceptance/browser-evidence.json).
- Result: PASS — executed hosted product API/UI assertions and mapped local regressions; see linked evidence. Synthetic demo scope only.
- Outstanding: None within this bounded synthetic hosted pass. Physical safety/calibration/travel, live provider, native-device/GPS and commercial production gates remain governed by existing matrices and NO-GO.

## ROLEACC-02

Fresh6kg wallet order completed through normal scoped APIs and actual restricted driver UI, with independently verified synthetic qualifications, calibrated sandbox meter, custody, invoice, consented labelled proof and handover. Stock debited6000g once and load reconciled.

- Implementation: `apps/web/lib/operations.ts`, `apps/web/lib/gas-delivery.ts`, `apps/web/lib/order-tracking.ts`, `apps/web/lib/bulk-lpg.ts`, `apps/web/lib/delivery.ts`, `scripts/demo-role-acceptance-client.mjs`, `scripts/check-role-acceptance-demo.mjs`.
- Authoritative data: Canonical orders/order_gas_lines, gas_stock and immutable movements, customer cylinders/inspection/qualifications, bulk LPG meter/load/allocation records, consented proof, verified payment and issued invoice via normal scoped APIs/UI.
- Security: Existing qualification/independent custody/finance/consent/branch/ownership/version/idempotency/retention controls remain authoritative; only new run-owned orders may mutate.
- Tests: `tests/driver-lpg-workflow.test.ts`, `scripts/check-role-acceptance-demo.mjs`.
- Evidence: [qa-renewal.txt](../../docs/deployment/evidence/20261119-role-acceptance/qa-renewal.txt), [qa-renewal.json](../../docs/deployment/evidence/20261119-role-acceptance/qa-renewal.json), [gas-prepare.txt](../../docs/deployment/evidence/20261119-role-acceptance/gas-prepare.txt), [gas-guards.txt](../../docs/deployment/evidence/20261119-role-acceptance/gas-guards.txt), [gas-completed.txt](../../docs/deployment/evidence/20261119-role-acceptance/gas-completed.txt), [gas-completed.json](../../docs/deployment/evidence/20261119-role-acceptance/gas-completed.json), [operations-regression.txt](../../docs/deployment/evidence/20261119-role-acceptance/operations-regression.txt).
- Result: PASS — executed hosted product API/UI assertions and mapped local regressions; see linked evidence. Synthetic demo scope only.
- Outstanding: None within this bounded synthetic hosted pass. Physical safety/calibration/travel, live provider, native-device/GPS and commercial production gates remain governed by existing matrices and NO-GO.

## ROLEACC-03

Fresh two-unit product COD order completed through driver pickup/arrival/proof then authorised owner-supervised cash handover. Collected cash remained unverified until a separate finance user reconciled it in the restored UI.

- Implementation: `apps/web/lib/operations.ts`, `apps/web/lib/vehicle-products.ts`, `apps/web/lib/delivery.ts`, `apps/web/lib/financial-documents.ts`, `scripts/demo-role-acceptance-client.mjs`, `scripts/check-role-acceptance-demo.mjs`.
- Authoritative data: Canonical order/attempt/serial allocations, consented proof, cash_collections and verified_payments; owner-supervised collection independently reconciled by actual finance UI.
- Security: Existing qualification/independent custody/finance/consent/branch/ownership/version/idempotency/retention controls remain authoritative; only new run-owned orders may mutate.
- Tests: `tests/order-tracking.test.ts`, `scripts/check-role-acceptance-demo.mjs`.
- Evidence: [product-prepare.txt](../../docs/deployment/evidence/20261119-role-acceptance/product-prepare.txt), [handover-guards.txt](../../docs/deployment/evidence/20261119-role-acceptance/handover-guards.txt), [cash-guards.txt](../../docs/deployment/evidence/20261119-role-acceptance/cash-guards.txt), [cod-refund-rejected.txt](../../docs/deployment/evidence/20261119-role-acceptance/cod-refund-rejected.txt), [cod-refund-rejected.json](../../docs/deployment/evidence/20261119-role-acceptance/cod-refund-rejected.json), [finance-cod-verified.jpg](../../docs/deployment/evidence/20261119-role-acceptance/finance-cod-verified.jpg), [browser-evidence.json](../../docs/deployment/evidence/20261119-role-acceptance/browser-evidence.json).
- Result: PASS — executed hosted product API/UI assertions and mapped local regressions; see linked evidence. Synthetic demo scope only.
- Outstanding: None within this bounded synthetic hosted pass. Physical safety/calibration/travel, live provider, native-device/GPS and commercial production gates remain governed by existing matrices and NO-GO.

## ROLEACC-04

Insufficient-wallet, quote tampering, nonexistent verification, foreign/staff/cancelled payment targets, client-forged success fields and unsigned success webhook rejected; no wallet/ledger/order effects. Local provider-failure regressions also pass.

- Implementation: `apps/web/lib/checkout-payments.ts`, `apps/web/lib/operations.ts`, `apps/web/lib/payments/orchestrator.ts`, `scripts/demo-role-acceptance-client.mjs`, `scripts/check-role-acceptance-demo.mjs`.
- Authoritative data: Canonical gas quote versions, wallet entries, order/reservation state and payment intent/event/verified-payment controls; hosted unsigned/forged requests plus local provider fixtures.
- Security: Existing qualification/independent custody/finance/consent/branch/ownership/version/idempotency/retention controls remain authoritative; only new run-owned orders may mutate.
- Tests: `tests/paystack-policy.test.ts`, `scripts/check-role-acceptance-demo.mjs`.
- Evidence: [preexceptions.txt](../../docs/deployment/evidence/20261119-role-acceptance/preexceptions.txt), [payment-guards.txt](../../docs/deployment/evidence/20261119-role-acceptance/payment-guards.txt), [payment-guards.json](../../docs/deployment/evidence/20261119-role-acceptance/payment-guards.json), [payment-regression.txt](../../docs/deployment/evidence/20261119-role-acceptance/payment-regression.txt).
- Result: PASS — executed hosted product API/UI assertions and mapped local regressions; see linked evidence. Synthetic demo scope only.
- Outstanding: None within this bounded synthetic hosted pass. Physical safety/calibration/travel, live provider, native-device/GPS and commercial production gates remain governed by existing matrices and NO-GO.

## ROLEACC-05

Unpaid cancellation releases reservation; prepaid cancellation restores wallet and gas once. Actual cancellation ledger credit now reduces retained invoice settlement; independent finance/owner void closes the original immutable invoice without fictional excess refund. Picked-up/failed goods cannot cancel until an independent exact return.

- Implementation: `apps/web/lib/order-tracking.ts`, `apps/web/lib/operations.ts`, `scripts/demo-role-acceptance-client.mjs`, `scripts/check-role-acceptance-demo.mjs`, `apps/web/lib/invoice-corrections.ts`, `apps/web/lib/invoices.ts`.
- Authoritative data: Canonical order/attempt custody, gas reservation movements, cancellation:<order> wallet entry and immutable customer invoice/independently approved note; exact order/customer source binding.
- Security: Existing qualification/independent custody/finance/consent/branch/ownership/version/idempotency/retention controls remain authoritative; only new run-owned orders may mutate.
- Tests: `tests/order-tracking.test.ts`, `scripts/check-role-acceptance-demo.mjs`, `tests/cancelled-wallet-invoice.test.ts`.
- Evidence: [preexceptions.txt](../../docs/deployment/evidence/20261119-role-acceptance/preexceptions.txt), [wallet-cancel.txt](../../docs/deployment/evidence/20261119-role-acceptance/wallet-cancel.txt), [wallet-cancel.json](../../docs/deployment/evidence/20261119-role-acceptance/wallet-cancel.json), [failed-returned.txt](../../docs/deployment/evidence/20261119-role-acceptance/failed-returned.txt), [operations-regression.txt](../../docs/deployment/evidence/20261119-role-acceptance/operations-regression.txt), [cancel-invoice-regression.txt](../../docs/deployment/evidence/20261119-role-acceptance/cancel-invoice-regression.txt), [cancel-invoice-reviewed.txt](../../docs/deployment/evidence/20261119-role-acceptance/cancel-invoice-reviewed.txt), [cancel-invoice-reviewed.json](../../docs/deployment/evidence/20261119-role-acceptance/cancel-invoice-reviewed.json).
- Result: PASS — executed hosted product API/UI assertions, exact deployment readbacks and mapped local regressions; synthetic demo scope only.
- Outstanding: None within this bounded synthetic hosted pass. Physical safety/calibration/travel, live provider, native-device/GPS and commercial production gates remain governed by existing matrices and NO-GO.

## ROLEACC-06

Failure created a dispatch-owned incident and customer-safe next step. Full independent return preceded rescheduling/reassignment; second attempt completed through phone driver UI with new consented proof, one wallet debit and one serial fulfilment. Incident resolved after successful retry, with history retained.

- Implementation: `apps/web/lib/order-tracking.ts`, `apps/web/lib/driver-operations.ts`, `scripts/demo-role-acceptance-client.mjs`, `scripts/check-role-acceptance-demo.mjs`.
- Authoritative data: Canonical delivery_attempts, pickup/return manifests and serial allocation, dispatch response/reschedule history, operational_incidents with manager ownership, wallet and invoice records.
- Security: Existing qualification/independent custody/finance/consent/branch/ownership/version/idempotency/retention controls remain authoritative; only new run-owned orders may mutate.
- Tests: `tests/order-tracking.test.ts`, `scripts/check-role-acceptance-demo.mjs`.
- Evidence: [failed-returned.txt](../../docs/deployment/evidence/20261119-role-acceptance/failed-returned.txt), [failed-returned.json](../../docs/deployment/evidence/20261119-role-acceptance/failed-returned.json), [retry-prepared.txt](../../docs/deployment/evidence/20261119-role-acceptance/retry-prepared.txt), [retry-guards.txt](../../docs/deployment/evidence/20261119-role-acceptance/retry-guards.txt), [retry-completed.txt](../../docs/deployment/evidence/20261119-role-acceptance/retry-completed.txt), [retry-completed.json](../../docs/deployment/evidence/20261119-role-acceptance/retry-completed.json), [driver-phone-retry-completed-history.jpg](../../docs/deployment/evidence/20261119-role-acceptance/driver-phone-retry-completed-history.jpg).
- Result: PASS — executed hosted product API/UI assertions and mapped local regressions; see linked evidence. Synthetic demo scope only.
- Outstanding: None within this bounded synthetic hosted pass. Physical safety/calibration/travel, live provider, native-device/GPS and commercial production gates remain governed by existing matrices and NO-GO.

## ROLEACC-07

Restricted-runtime refund defect fixed by atomic INSERT of immutable allocation fields. Hosted rejection/approval, pending/key conflicts, final-decision immutability, over-refund, single wallet credit and unchanged physical stock verified. Original invoice snapshot retained with independently approved credit note.

- Implementation: `apps/web/lib/commerce.ts`, `apps/web/lib/reward-refunds.ts`, `scripts/demo-role-acceptance-client.mjs`, `scripts/check-role-acceptance-demo.mjs`, `apps/web/lib/invoice-corrections.ts`.
- Authoritative data: Canonical credit_requests/refund_lines/fingerprint/operation key, source order quantities, wallet entries and immutable invoices/notes; no stock return inferred from refund.
- Security: Existing qualification/independent custody/finance/consent/branch/ownership/version/idempotency/retention controls remain authoritative; only new run-owned orders may mutate.
- Tests: `scripts/check-role-acceptance-demo.mjs`, `tests/refund-restricted-role.test.ts`.
- Evidence: [cod-refund-rejected.txt](../../docs/deployment/evidence/20261119-role-acceptance/cod-refund-rejected.txt), [refund-approved.txt](../../docs/deployment/evidence/20261119-role-acceptance/refund-approved.txt), [refund-approved.json](../../docs/deployment/evidence/20261119-role-acceptance/refund-approved.json), [refund-runtime-after.txt](../../docs/deployment/evidence/20261119-role-acceptance/refund-runtime-after.txt), [refund-regression.txt](../../docs/deployment/evidence/20261119-role-acceptance/refund-regression.txt), [finance-refund-approved.jpg](../../docs/deployment/evidence/20261119-role-acceptance/finance-refund-approved.jpg).
- Result: PASS — executed hosted product API/UI assertions and mapped local regressions; see linked evidence. Synthetic demo scope only.
- Outstanding: None within this bounded synthetic hosted pass. Physical safety/calibration/travel, live provider, native-device/GPS and commercial production gates remain governed by existing matrices and NO-GO.

## ROLEACC-08

Wrong customer/role, stale versions, wrong handover code, missing attestation/proof, incorrect meter deltas and duplicate operations rejected or replayed without duplicate stock/cash/wallet effects.

- Implementation: `apps/web/lib/order-tracking.ts`, `apps/web/lib/delivery.ts`, `scripts/demo-role-acceptance-client.mjs`, `scripts/check-role-acceptance-demo.mjs`.
- Authoritative data: Canonical scoped order/attempt snapshots, tracking operation/version records, customer handover/proof checks, meter/load allocations, cash and wallet posting identities.
- Security: Existing qualification/independent custody/finance/consent/branch/ownership/version/idempotency/retention controls remain authoritative; only new run-owned orders may mutate.
- Tests: `tests/order-tracking.test.ts`, `tests/driver-lpg-http.test.ts`, `scripts/check-role-acceptance-demo.mjs`.
- Evidence: [handover-guards.txt](../../docs/deployment/evidence/20261119-role-acceptance/handover-guards.txt), [gas-guards.txt](../../docs/deployment/evidence/20261119-role-acceptance/gas-guards.txt), [retry-guards.txt](../../docs/deployment/evidence/20261119-role-acceptance/retry-guards.txt), [cod-refund-rejected.txt](../../docs/deployment/evidence/20261119-role-acceptance/cod-refund-rejected.txt), [operations-regression.txt](../../docs/deployment/evidence/20261119-role-acceptance/operations-regression.txt).
- Result: PASS — executed hosted product API/UI assertions and mapped local regressions; see linked evidence. Synthetic demo scope only.
- Outstanding: None within this bounded synthetic hosted pass. Physical safety/calibration/travel, live provider, native-device/GPS and commercial production gates remain governed by existing matrices and NO-GO.

## ROLEACC-09

Actual role UI used for pickup/arrival/gas dispensing/proof/handover, owner COD and independent finance/refund approval. Eight routes and nine role/route views checked at1440x1000 and390x844; one-dialog completed order has zero forms and bounded history. Added cash-reconciliation route functionally exercised on desktop. Its phone interaction was not tested; responsive route coverage is8/9, retained separately without claiming full phone coverage.

- Implementation: `apps/web/components/admin-order-details.tsx`, `apps/web/components/customer-orders.tsx`, `apps/web/components/dispatch-centre.tsx`, `scripts/demo-role-acceptance-client.mjs`, `scripts/check-role-acceptance-demo.mjs`.
- Authoritative data: Actual hosted CUA interactions, saved screenshots and DOM layout/dialog/sidebar observations; no mocked UI or hidden browser API calls.8targeted routes at desktop/phone, plus cash reconciliation functionally exercised on desktop;9functional routes total.
- Security: Existing qualification/independent custody/finance/consent/branch/ownership/version/idempotency/retention controls remain authoritative; only new run-owned orders may mutate.
- Tests: `tests/admin-order-modal.test.ts`, `tests/customer-orders.test.ts`, `scripts/check-role-acceptance-demo.mjs`, `tests/role-acceptance-ui.test.ts`.
- Evidence: [role-ui.txt](../../docs/deployment/evidence/20261119-role-acceptance/role-ui.txt), [browser-evidence.json](../../docs/deployment/evidence/20261119-role-acceptance/browser-evidence.json), [sales-completed-modal-desktop.jpg](../../docs/deployment/evidence/20261119-role-acceptance/sales-completed-modal-desktop.jpg), [sales-order-modal-phone.jpg](../../docs/deployment/evidence/20261119-role-acceptance/sales-order-modal-phone.jpg), [driver-retry-phone-proof.jpg](../../docs/deployment/evidence/20261119-role-acceptance/driver-retry-phone-proof.jpg), [customer-failure-phone-final.jpg](../../docs/deployment/evidence/20261119-role-acceptance/customer-failure-phone-final.jpg), [finance-refund-approved.jpg](../../docs/deployment/evidence/20261119-role-acceptance/finance-refund-approved.jpg).
- Result: PASS — executed hosted product API/UI assertions and mapped local regressions; see linked evidence. Synthetic demo scope only.
- Outstanding: Cash-reconciliation phone interaction untested; retained in responsive route coverage8/9. Eight originally targeted route layouts and all requested role journeys pass. Physical/native/GPS and production gates remain unchanged.

## ROLEACC-10

Four reproduced defects fixed and deployed: eligible serial availability, reachable independent cash review, immutable refund source insertion, and cancellation-credit invoice settlement. Exact source 8e0e5843e6989792f16a38971b02e22ee702ac0e, Ready dpl_Bj5pEYpjY4wToJ9sNFo7a5x7MyE2; before/after orders/wallet/ledger/stock unchanged by deployment. Final13orders include8unchanged originals and5reconciled new scenarios. QA custody/trip closed and availability restored.

- Implementation: `apps/web/lib/service.ts`, `apps/web/components/admin-order-details.tsx`, `scripts/demo-role-acceptance-client.mjs`, `scripts/check-role-acceptance-demo.mjs`, `apps/web/lib/cylinder-allocation.ts`, `apps/web/components/cash-reconciliation.tsx`, `apps/web/components/reconciliation.tsx`, `apps/web/components/admin.tsx`, `apps/web/lib/commerce.ts`, `apps/web/lib/invoice-corrections.ts`, `apps/web/lib/invoices.ts`.
- Authoritative data: Exact archived git-byte source, Vercel Ready project/SHA/alias identity, before/after normal product API snapshot hashes and final canonical order/wallet/stock/custody/invoice reconciliation.
- Security: Existing qualification/independent custody/finance/consent/branch/ownership/version/idempotency/retention controls remain authoritative; only new run-owned orders may mutate.
- Tests: `tests/customer-traceability.test.ts`, `scripts/check-role-acceptance-demo.mjs`, `tests/catalogue-cylinder-availability.test.ts`, `tests/cash-reconciliation.test.ts`, `tests/refund-restricted-role.test.ts`, `tests/cancelled-wallet-invoice.test.ts`.
- Evidence: [fix-hosted.txt](../../docs/deployment/evidence/20261119-role-acceptance/fix-hosted.txt), [refund-fix-hosted.txt](../../docs/deployment/evidence/20261119-role-acceptance/refund-fix-hosted.txt), [final-reconciliation.txt](../../docs/deployment/evidence/20261119-role-acceptance/final-reconciliation.txt), [final-reconciliation.json](../../docs/deployment/evidence/20261119-role-acceptance/final-reconciliation.json), [fix-regression.txt](../../docs/deployment/evidence/20261119-role-acceptance/fix-regression.txt), [operations-regression.txt](../../docs/deployment/evidence/20261119-role-acceptance/operations-regression.txt), [refund-runtime-after.txt](../../docs/deployment/evidence/20261119-role-acceptance/refund-runtime-after.txt), [refund-source-integrity.json](../../docs/deployment/evidence/20261119-role-acceptance/refund-source-integrity.json), [refund-stable-identity.json](../../docs/deployment/evidence/20261119-role-acceptance/refund-stable-identity.json), [refund-build.txt](../../docs/deployment/evidence/20261119-role-acceptance/refund-build.txt), [cancel-invoice-regression.txt](../../docs/deployment/evidence/20261119-role-acceptance/cancel-invoice-regression.txt), [invoice-fix-hosted.txt](../../docs/deployment/evidence/20261119-role-acceptance/invoice-fix-hosted.txt), [invoice-fix-before.json](../../docs/deployment/evidence/20261119-role-acceptance/invoice-fix-before.json), [invoice-fix-after.json](../../docs/deployment/evidence/20261119-role-acceptance/invoice-fix-after.json), [invoice-source-integrity.json](../../docs/deployment/evidence/20261119-role-acceptance/invoice-source-integrity.json), [invoice-stable-identity.json](../../docs/deployment/evidence/20261119-role-acceptance/invoice-stable-identity.json), [cancel-invoice-build.txt](../../docs/deployment/evidence/20261119-role-acceptance/cancel-invoice-build.txt).
- Result: PASS — executed hosted product API/UI assertions, exact deployment readbacks and mapped local regressions; synthetic demo scope only.
- Outstanding: None within this bounded synthetic hosted pass. Physical safety/calibration/travel, live provider, native-device/GPS and commercial production gates remain governed by existing matrices and NO-GO.

## Scope and investigation history

- 2026-11-19: User explicitly authorises full role-based order-to-delivery and exception acceptance, fixes and traceability.10 requirements retained. Current sourcef63bcf2/Ready53xp97 baseline; prior8orders protected. Functional sales/dispatch/inventory labels may map to consolidated manager/finance roles and will be reported truthfully. No physical delivery/provider/device/production acceptance substituted by synthetic tests.
- 2026-11-19: Preflight9labelled accounts confirms canonical owner/manager/finance/driver/technician roles. Existing8orders protected. Four pre-exception checks pass: access, insufficient wallet/tampered quote rollback, abandoned-card cancellation/replay, independent normal simulated credit. QA customer credited₦50,000 via explicit synthetic receipt with self-approval403 and finance-approved replay safety. Catalogue serial-stock mismatch reproduced (local5available vs0eligible; hosted20advertised/noeligible serials); corrected locally without weakening allocation/inspection. Initial HTTP-method/capacity/baseline test-harness assumptions corrected; superseded logs retained.
- 2026-11-19: New synthetic product COD order EG-2026-7BE57634 accepted/prepared by sales and assigned by dispatcher; finance-issued invoice, driver UI acknowledgement/pickup/departure/arrival and labelled proof upload pass. Restricted driver correctly cannot verify/collect cash; owner supervised handover records collected/unverified only. Wrong-role/customer, stale, handover-attestation and wrong-code guards pass; collector self-reconciliation and premature refund rejected. Cash review UI is unreachable after earlier finance redesign; restored as dedicated reconciliation tab with required identity check and collector self-review hidden. Existing eight orders unchanged; gas flow still awaits demo-only safety renewal approval.
- 2026-11-19: User explicitly approved two-hour demo-only renewals for four labelled QA qualifications and existing sandbox meter. Normal product APIs and independent owner verification will be used; no production controls changed. Third defect reproduced under restricted easygas_server role: refund.request inserted then attempted forbidden immutable-source UPDATE. Fixed by atomic INSERT, without widening permissions; focused regression now passes. Fresh gas and remaining exception acceptance continue.
- 2026-11-19: Completed fresh6kg wallet gas, two-cylinder supervised COD, failed product delivery/full return/rescheduled phone retry, abandoned-card cancellation and prepaid cancellation. Partial refund rejected then separate request approved in actual UI; immutable invoice reconciled with independent note. Eight original orders identical. Three defects deployed; exact source and business-state readbacks recorded. Initial harness failures (HTTP read method, returned-at field, post-completion secret omission, cash field and resize transition measurements) retained as superseded investigation evidence, corrected without weakening product assertions.
- 2026-11-19: Reopened ROLEACC-05/G05 and10/G10 before completion: final invoice void correctly refused because shared invoice balance omits automatic cancelled_order wallet credit. Original wallet and stock are correct; accounting read-model correction and focused negative regression are required. All10 requirements retained.
- 2026-11-19: Cash-reconciliation restoration adds a ninth functional route, exercised through actual finance UI. Its phone interaction is untested, retained in a separate8/9responsive-route denominator; no full-route phone acceptance is claimed.
- 2026-11-19: Fourth defect corrected and redeployed: invoiceBalance subtracts exact canonical cancellation wallet credit; public invoice read shares that settlement.41/41 restricted-runtime/commerce/refund/service/payment checks pass. Hosted deployment preserved13orders/wallet/ledger/stock; cancelled test invoice then independently voided with paid0/due0 and original snapshot intact. Final reconciliation rerun passes. Closed ROLEACC-05/G05 and10/G10;10/10bounded synthetic requirements/gates,8/8critical and9/9functional routes accepted;8/9responsive routes exercised; all earlier production/native/physical/provider/import/retention holds remain.
