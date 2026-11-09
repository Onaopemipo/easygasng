# Preflight repository audit — 9 November 2026

Audit completed before implementation edits. Repository is on unborn main: all application directories are untracked, consistent with the previous phases; no tracked HEAD/clean-checkout assertion is possible. Preserve all existing work and secrets. No reset, stash, commit, real database write, hosted rollout, payment/refund or external message is authorised by this phase.

## Existing authorities and ownership

|Capability|State|Actual implementation/source|Permissions and gaps|
|---|---|---|---|
|Order invoice/assisted checkout/recurring/order add-on|EXISTS|lib/invoices.ts; customer_invoices immutable snapshot/number sequence; invoice-corrections.ts; api/invoices/[orderId]|Own customer; scoped owner/finance/manager; issue reauth; add-ons use original invoice notes|
|Service invoice/draft/quotation|EXISTS|service-invoices.ts, service-invoice-source.ts; same customer_invoices/sequence; service_invoice_drafts; approved service_quotes/reports|Customer/scoped finance/service manager; canonical quotation/payment gates unchanged|
|Verified provider receipt|EXISTS|payments/documents.ts; payment_postings joined payment_intents; api/payments/paystack/[operation]|Only committed posting; own customer or branch finance; sandbox only. Current identity reads today's website settings: snapshot gap|
|Wallet funding|EXISTS|wallet-funding.ts, commerce.ts, payments/orchestrator.ts; credit_requests/wallet_entries|Independent manual bank approval; card server verification; no duplicate ledger|
|POS receipt|PARTIAL|commerce.ts pos.sale, workflows.tsx PointOfSale; pos_sales/shifts/items|Operational receipt preview; no canonical PDF receipt model yet. Do not invent one|
|Corrections/refunds|PARTIAL|invoice-corrections.ts, order-operations.tsx; invoice_notes + shared approvals|Original immutable; purchase-credit refund distinct from unsupported provider refund confirmation|
|Brand/PDF|EXISTS|document-brand.ts; invoice-pdf.ts; embedded NotoSans; trusted local logo|Existing PDF linear text; no remote asset loading. New design must retain legacy renderer|
|Business identity|PARTIAL|governed website.content address/phone/email; seed brand name; website-schema.ts|No verified RC/TIN/website legal-document settings. Mockup identifiers are not facts|
|History/admin search/mobile|PARTIAL|customer-dashboard.ts invoices widget; order-invoice.tsx; mobile/Invoices.tsx; reconciliation.tsx|Mobile receipt tab honestly unavailable; no unified searchable document library|
|Mail/channel/storage|PARTIAL|transactional-mail.ts branded SMTP; channel-messaging.ts consent/queue; invoice-corrections request links; db.ts|No automatic document resend capability. No message sent. Private PDFs on demand; no public document storage|
|Reconciliation|PARTIAL|payments/reporting.ts; reconciliation.tsx, paystack-reconciliation.tsx|Provider settlement/refund engineering/gates remain; transaction success is not settlement|

## Baseline and safety scope

Evidence: evidence/baseline-tests.txt (25 tests), baseline-types.txt, baseline-build.txt. Source reviewed: root/apps/web AGENTS, architecture/invoices-and-payment-requests.md, security/approval-governance.md, production-completion/DELIVERY.md, payments/paystack/09-wallet-and-refund-policy.md. Existing NO-GO, retain-all, actual Excel import hold, automatic driver assignment OFF, no native builds and no server rollout remain.

No new financial ledger, invoice number, customer or provider endpoint is needed. Safe work: additive governed optional identity configuration, new-document identity/template snapshots, reversible versioned PDF presentation, same-data screen preview/list/read projections, approved-note printouts and isolated tests. Unverified P0 provider refund/settlement, legal signoff, device and production gates prohibit financial activation; those parts remain blocked rather than inventing a confirmation.

Required 18 scope sections and26 acceptance gates remain in the phase matrix. Full80-scenario acceptance is not implied by baseline or renderer-only tests.
