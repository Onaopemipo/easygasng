# Paystack repository preflight — 6 November 2026

Audit before implementation. Unborn main,16 untracked top-level entries representing existing user work; no reset, cleanup, commit, data import, hosting change or production activation. Baseline350 tests:337 pass,13 explicitly skipped PostgreSQL cases,0 failures (evidence/baseline-tests.txt). Web/native typecheck and Next build passed (baseline evidence); no lint script exists.

Existing TypeScript Next16.4.3/React web and Expo58/RN0.88 mobile. API dispatch in apps/web/lib/service.ts, bearer/cookie actor auth, driver/technician restricted-session guards; request-origin CSRF protections in API route; PGlite local/PostgreSQL server transactions in db.ts. Migrations001–056. Credentials must never enter tracked documents.

No Paystack adapter, payment intents/attempts, authenticated financial webhook or gateway-fee engine found. Existing manual payments, wallet and invoice infrastructure must be reused:

| Capability | Classification | Actual authority |
|---|---|---|
| Orders/stock/COD/wallet checkout | IMPLEMENTED/PARTIAL launch | operations.ts, gas-delivery.ts, mixed-checkout.ts, order-tracking.ts; existing stock/cylinder/capacity/readiness gates |
| Payment truth | IMPLEMENTED manual | verified_payments, immutable references, order/service verification; no redirect-based payment |
| Wallet | IMPLEMENTED closed-loop purchase credit | wallet_entries append-only, summed balance; finance-approved cash funding/refunds; no transfers/withdrawals |
| Issued order invoices | IMPLEMENTED | customer_invoices immutable snapshot; invoice_notes independent adjustments; invoices.ts/invoice-corrections.ts/invoice-pdf.ts |
| Invoice payment request | PARTIAL/unconnected | invoice_payment_requests hashes, expiry, scope; provider not connected |
| Service quotation/payment gate | IMPLEMENTED/PARTIAL | professional-services.ts; customer + independent quotation approval, verified amount before chargeable work |
| Doorstep amendment | PARTIAL | doorstep-amendments.ts scoped proposal/consent; no unrestricted driver sales |
| Refunds | IMPLEMENTED store credit/PARTIAL provider | credit_requests + reward-refunds.ts/commerce.ts, independent approver; existing refund is credit, not provider cash refund |
| Financial reporting | PARTIAL | financial-reports.ts/business-reporting.ts; no Paystack settlement fee allocation |
| Messaging/jobs | IMPLEMENTED/PARTIAL configured-provider gates | message_outbox, channel-messaging.ts, transactional-mail.ts, scripts/worker.ts |
| Paystack/provider settlement/dispute | MISSING | New implementation required; no merchant keys/settings verified |

Original .data/postgres customer identities remain distinct from authorised .data/mobile-demo-accounts test fixtures. Do not move/demo-import their records or reset passwords. No production-like or merchant sandbox evidence can be inferred from local fixtures. Existing production NO-GO, Excel import hold, field-session/custody/physical safety/native offline gates remain.
