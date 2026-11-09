> Historical 29 October status. For the 30 October implementation, use [the current report](reports/easygas-implementation-report.md), [test results](reports/easygas-test-results.md) and [remaining release gates](reports/easygas-production-readiness.md). Older missing-feature and test-count statements below are baseline evidence.

# Implementation status — 29 October 2026

## Release statement

EasyGas has an expanded, working local implementation across web, shared backend and Expo native clients. **The complete master specification is still unfinished. This is not a production-ready release or a pass of every Part 19.6 acceptance gate.**

Hosting remains local and external payments remain disconnected, as requested. No production Supabase project was created and no existing cloud project was changed. The selected future account remains Philip 2 Acc / BytesNGigs; its active-free-project limit remains unresolved.

The 29 October catalogue update adds four empty-cylinder sizes and the 50kg refill, updates existing refill prices to the user-supplied list, and publishes those eight items. Stock/reservations, existing order prices and payment configuration are preserved. The import has a dedicated audit record.

## Implemented and connected

| Area | Working scope |
|---|---|
| Website | Responsive storefront, catalogue/search/categories/details, cart, checkout, account, order history, reference-based brand treatment and illustrative assets. |
| Authentication | Scrypt passwords, opaque hashed sessions, cookie/native-token parity, live role/branch checks, password change, single-use expiring recovery and verification tokens, session revocation, reauthentication throttling. Recovery emails queue locally; external delivery is not connected. |
| Account and privacy | Profile name, saved addresses, checkout address selection on web, marketing/refill consent, Lagos quiet hours, privacy requests and authenticated personal-data JSON export. Deletion requests are recorded; actual erasure/retention review is unfinished. |
| Staff | One-time initial team setup, expiring invitations, acceptance without privileged access, governed role grants and owner-authorised staff suspension with immediate session revocation. No default production credentials. |
| Catalogue | Owner-managed descriptions/category/size/safety information, new draft products with branch inventory and approval settings. New products have no price, stock or publication. Price/publication remain governed independently. Variants, media uploads and a content CMS are unfinished. |
| Orders | Server price snapshots, delivery coverage/date/window validation, capacity checks, transactional reservations, idempotent checkout, controlled cancellation and stock release. Website checkout fulfils from Lagos. |
| Delivery | Branch-assigned drivers, controlled transitions, customer confirmation codes, throttled code attempts, exact cash collection, wallet-paid delivery without cash, replay-safe completion and independent finance cash verification. |
| Offline delivery | Native encrypted pending-completion queue, explicit sync/discard, account separation and server revalidation. An offline record never marks an order delivered. This is not complete offline dispatch, offline order browsing or device-validated synchronisation. |
| Inventory and branches | Idempotent receipts, available/reserved stock, branch creation with selling disabled, transfer dispatch and independent destination receipt. New branches are unpriced and unstocked. |
| Suppliers | Supplier records, purchase requests, independent purchase approval and idempotent invoice-referenced goods receipt. Supplier invoices/accounts payable and full reconciliation remain incomplete. |
| Cylinders | Registry, condition/history, documented inspection outcomes, quarantine on failure, expiry flags, guarded filling and customer custody handover/return. These records do not issue safety certification or add gas stock. |
| POS | Cash till shifts, server-priced sales, immediate stock consumption, replay-safe receipts, submitted cash-up and independent exact reconciliation. API supports multiple items; current till form records one product line per receipt. Offline POS, sale reversal and cash-variance resolution remain incomplete. |
| Purchase credit | Independently verified cash funding, immutable credits/debits, guarded wallet spending, no overdraft on tested concurrent checkouts, exact cancellation reversals. External top-ups, withdrawals and transfers remain unavailable. |
| Refunds | Customer-consented full refund requests for delivered verified orders, finance review, one wallet credit and reversal of earned reward points. Original receipts remain immutable. Bank/provider refunds, partial refunds and full dispute workflows are unfinished. |
| Rewards | Governed earning/conversion settings; points earned once on delivered verified product spend, redemption into purchase credit, idempotency and refund reversals. Refunds can produce a negative points balance after previously earned points were spent; future earnings offset it. Tiers, referrals, expiry and an offers marketplace are unfinished. |
| Refill profiles | Customer profiles by refill size, verified single-cylinder purchase ingestion, explainable estimates/insufficient-history states and customer feedback records. These are purchase-history profiles, not physical gas sensors or complete cylinder-attributed consumption models. |
| Plans and recurring orders | Preferred-date plans with pause/resume/cancel; explicit customer authorisation for recurring COD, quantity/address/window and maximum total; guarded order generation, failure records, advance on success, rescheduling and revocation. Recurring electronic debits are not authorised or connected. |
| Communications | Customer notification inboxes on web/native, read status, support/order/reminder notices, local email outbox, consent/quiet-hour-aware in-app campaigns with independent approval and deduplication. External email/SMS/WhatsApp/push delivery is not connected. |
| Support | Customer request history, replies, staff-only internal notes, assignment, resolution/closure and customer notifications. Refund approval is a separate controlled workflow. |
| Settings | Persisted ownership/risk definitions, scoped access, independent/dual approvals, recent verification, version conflicts, revisions, rollback, immutable history and protective emergency disable. |
| Limited delegation | Independently owner-reviewed grants for Level 2 publication/capacity reviews, exact branch/key, numerical ceiling, start/expiry, live grantor/reviewer/delegate authority, revocation and no inherited/redelegated authority. A grantor's own setting request cannot be approved using their delegation. Financial/security delegation is not supported. |
| Maintenance | In-process maintenance every minute while the application is running; explicit one-shot/watch worker; expiry, scheduled activation with current-authority checks, failure preservation, escalation, inspection flags, eligible reminders, recurring COD generation and campaign delivery. Jobs serialize transactionally. |
| Reporting | Order/POS finance records, verified delivered-order and reconciled-POS revenue, audited finance CSV exports and personal-data JSON export. Full management analytics and Excel/PDF reports are unfinished. |
| Backup | Encrypted local snapshots, authenticated verification and restore into a separate empty directory. An automated test actually decrypts and opens a restored PostgreSQL database. This is not a managed-production backup/DR certification. |
| Future PostgreSQL | Updated private-schema bootstrap and incremental migrations, RLS on every table, restricted runtime grants and append-only financial/audit/history guards. New workflows are exercised under the restricted runtime role, not only a schema owner. |
| Native | Customer catalogue/cart/checkout, wallet payments, account/recovery/preferences/addresses/sessions/privacy requests, support conversations, profiles/plans/recurring authorisations, rewards conversion, notifications and driver delivery completion. iOS/Android JavaScript/Hermes exports pass. No signed binary or physical-device acceptance has been performed. |

## Still required to complete the specification

- Phone OTP, social sign-in, biometric/device lifecycle and actual privacy-deletion/retention fulfilment; broader production abuse protections.
- Product variants, media uploads, standalone approved product photography/logo assets and business-managed public/legal content.
- Complete retail multi-line UI, offline POS, refunds/reversals, till variance investigations and receipt printing.
- Commercial negotiated pricing, credit limits, account approvals, business contracts and supply arrangements.
- Supplier invoicing/accounts payable and full goods/invoice/payment reconciliation.
- Cylinder exchanges, deposits/refunds, batch recalls, expanded safety/compliance and physical cylinder attribution.
- External payment integration and verified webhooks, bank/provider refunds, complete financial reconciliation. Providers remain disconnected by explicit user preference.
- Reward tiers, referral abuse prevention, point expiry, offers/coupons and broader loyalty controls.
- Complete consumption feedback-driven modelling, physical cylinder histories, measured prediction quality and business forecasting dashboards.
- External email/SMS/WhatsApp/push adapters, delivery receipts/retries/channel failure handling and production notification operations.
- Real location/map/ETA integrations, redelivery/rescheduling/proof exceptions, offline dispatch and device-tested synchronisation.
- Multi-branch customer fulfilment, fuller branch configuration and staff lifecycle (including controlled reinstatement).
- Remaining settings categories and their real business effects, governed approval-policy editing, threshold routing and appropriately protected financial/security delegation. Limited delegation does not complete all Part 19.6 requirements.
- Full privacy/support/dispute operations, Excel/PDF reports, profitability and deeper operational analytics.
- Approved legal policies, qualified safety/compliance review, monitored deployment, managed database backups/restore drills, load/concurrency/penetration testing and disaster recovery.
- Resolution of eight mobile Expo toolchain advisories, simulator/device QA, signing and app-store distribution.

## Verification boundary

The current suite has **79 passing tests** against isolated PostgreSQL/PGlite databases. Web type-check and production build pass. Native type-check and iOS/Android JavaScript exports pass. Script/test TypeScript also checks successfully. Browser QA verified the new operations form persists a supplier in an isolated database, the catalogue editor and support desk load, and account settings render at 390px width. No real customer, stock, revenue or financial records were inserted into the normal business database for these tests.

Tests are not a substitute for hosted PostgreSQL concurrency tests, a security assessment or physical-device QA. The root web dependency audit was rerun after this expansion and reports zero known vulnerabilities. The mobile audit was rerun and still reports eight aggregate advisories through Expo CLI's Zod 3/deepmerge dependencies. The suggested automated fix downgrades Expo by major versions, so it was not forced.
