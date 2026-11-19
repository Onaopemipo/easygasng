# Customer My Orders redesign

The customer page now starts with a compact order list. Search, status filters and six orders per page replace the long stack of expanded histories. Invoices and receipts have their own tab with optional advanced filters. Order details, delivery events, visit/photo history, delivery code and refund requests are revealed when needed. Full and selected-quantity refunds share one consent-based dialog; cancellation asks for confirmation and preserves canonical version/idempotency checks.

The existing authenticated order stream, private document/visit APIs, verified payment ledger and independent finance review remain authoritative. Staff and native flows retain their existing defaults. No backend schema, business flags, provider configuration or customer records changed in the working or hosted database.

## Verification

- Five focused component/presentation checks, 18 tracking checks and 41 financial/document/order-addition checks passed: 64 distinct checks. The tracking log also includes the earlier four presentation checks; these are counted once.
- Final web production build and TypeScript check passed. An earlier simultaneous build/typecheck raced Next's generated types; rerunning sequentially passed and the final logs contain the successful results.
- Local browser checked at 1280×720, 768×1024 and 390×844, plus dark theme, pagination/search, dialogs/focus/Escape, invoice preview, direct tracking links, confirmation-code reveal, both synthetic refund submissions and guarded cancellation rejection.
- Cancellation on the deliberately unreconciled synthetic gas fixture was rejected as intended. Positive canonical cancellation is covered by the existing executed backend tests; this fixture is not physical gas acceptance.

Evidence is in [evidence](evidence/). [Requirements matrix](../traceability/customer-orders-redesign-rtm.md).

## Scope and remaining gates

The requested local customer web redesign is verified. Hosted rollout, native/physical device acceptance, formal screen-reader testing and all prior full-app production gates remain outside this bounded phase. No deployment or native build performed. Existing production NO-GO, actual-import hold and retain-all decisions remain.

For a repeatable isolated preview, run `node --import tsx scripts/prepare-customer-orders-qa.ts`, then start Next dev on an unused port with `EASYGAS_DATA_DIR` set to the database path in ignored `.data/customer-orders-qa.json` and `EASYGAS_PREVIEW=true`. The fixture contains synthetic direct order states; it must never be treated as operational fulfilment or production payment evidence. Do not run it against a hosted database.
