> Latest continuation: [production work and remaining scope](production-completion-20261105.md). Includes private downloadable PDFs, TLS/SMTP protections and native startup repair. This is still PARTIAL, not production completion.

# Operations continuation — current status, 5 November 2026

**PARTIAL. Production NO-GO remains.** This section supersedes the earlier foundation-only status below; the earlier record is retained as history.

Implemented locally: provisional-customer secure activation and verified-phone login; independently approved invoice notes and version-bound payment requests; driver acknowledgement/reassignment, vehicle/trip capacity checks; customer-consented doorstep proposals; private photo history and expired-byte retention; encrypted native offline event/photo queues and foreground GPS/fuel capture; ledger-backed retention segmentation and governed follow-ups; encrypted, consent-checked Termii/Meta messaging adapters disabled by default. Web fuel retries preserve the original event ID and operation key.

Migrations 050 and 051 are additive; current schema requirement is 051. No Excel import was approved or performed. No live messages, provider accounts, online payments or signed app releases were activated.

The Mac was unlocked and public activation/payment-link guard screens were checked at desktop/mobile sizes. This is not acceptance of positive authenticated admin/customer flows or physical native-device behaviour. See the screenshots in `docs/audits/operations-completion-evidence/`.

Remaining engineering: doorstep commitment with van stock/cylinder/payment effects; full invoice drafts/service/PDF/reconciliation lifecycle; dispatch escalation and full van/proximity constraints; CRM conversion/campaign lifecycle; provider sandbox contracts (including WhatsApp authentication templates and SMS receipts); signed-device offline/GPS/camera/recovery acceptance. Existing TLS, mail and independent release gates remain open. These engineering tasks are READY, not falsely labelled external blockers.

Current implementation/security/test mappings and all original requirement/gate denominators remain in [the requirements matrix](../traceability/post-meeting-requirements-matrix.md). Configuration and recovery instructions are in [the operations runbook](../operations/operations-completion-runbook.md). Final verification: full suite 308 tests, 296 passed, 0 failed, 12 skipped; dedicated PostgreSQL concurrency test 1 passed; traceability validator 2 passed; web/mobile type checks and production web build passed. Skipped tests remain unverified. Local web restarted on port3003; disposable PostgreSQL test cluster stopped. Final automated command outputs are recorded in [the evidence directory](../audits/operations-completion-evidence/).

---

## Historical foundation report

# Consolidated operations implementation report — 5 November 2026

**NOT COMPLETE. Production NO-GO.** Preflight CONDITIONAL_PASS permits additive local implementation only. The attached brief is substantially broader than the shipped foundations; remaining READY engineering and external BLOCKED acceptance are separated in the blocker register. No requirement was removed or silently treated as complete.

## Implemented changes

- Reused users, addresses, shared checkout, stock/cylinder allocation, audit and notification ownership. Added opaque immutable public customer IDs; normalized phone/public-ID branch-scoped lookup; duplicate detection without merging; provisional customer; staff-attributed PHONE_ASSISTED order wrapper. No staff impersonation or customer-wallet/reward spending.
- Existing admin Orders gains a phone-assisted form. Existing Customers displays/searches/exports public IDs; Account & privacy shows the same ID. Native simple/mixed checkout marks MOBILE source. Existing order source is preserved on replay; legacy hash compatibility tested.
- Reused order lines and verified-payment/refund ledgers for immutable numbered issued order invoice snapshots. Owner/finance reauthentication; customer/branch reads; forced RLS and restricted private runtime. Repeated/concurrent issue returns one row. HTML/print UI added to customer tracking and staff order detail. Online links stay disabled. Refund/cancelled invoices flag finance adjustment without inventing debt. Full invoice lifecycle remains incomplete.
- Extended existing per-cylinder forecast to preliminary LOW confidence after two or three qualifying verified refills; no sensor or measured-consumption claim.

Migrations:047_assisted_customer_identity.sql and048_issued_order_invoices.sql, plus049_invoice_access_hardening.sql; regenerated empty-database bootstrap and exporter; migration cache50; readiness through049. No live orders, payments, customer messages, roles, inventory or service fixtures were created/activated. Local upgrade backfills actual existing customer IDs only. Other modified files and actual mappings are in the machine-readable matrix.

## Verification

Baseline:276 passed,0 failed,10 skipped. The final PostgreSQL-enabled full regression passed294/294 with0 failures and0 skips (`acceptance-regression.txt`). A further22 focused checks passed with0 failures/skips after the final mixed-checkout retry compatibility change (`focused.txt`). Web/mobile typecheck and web production build passed. PostgreSQL tests exercised separate connections, final capacity/proof, repeated invoice and same-phone creation; encrypted isolated backup restoration passed. Traceability validation passed2/2. Local browser verified the customer public ID display. Admin positive browser flow, native hardware, all new client T01–T50 scenarios, provider sandbox callbacks, newer-ledger rollback and production restoration are not proven.

No lint script exists; no lint pass is claimed. Early failed attempts remain in `regression.txt`; they are superseded by successful bootstrap/RLS and full regression results. The current required schema is049; invoice access hardening is a separate upgrade for early048 installations.

[Full T01–T50 register](../testing/post-meeting-regressions.md) · [G01–G24 and feature statuses](../traceability/post-meeting-requirements-matrix.md) · [Evidence directory](../audits/post-meeting-evidence/) · [Remaining blockers/tasks](post-meeting-blocker-register.md).

## Outstanding scope and release

Secure progressive activation/phone OTP/reorder, invoice corrections/payment-link contracts, at-door amendments/van stock, area dispatch/recommendations/driver acknowledgements, proof-photo history, full offline/GPS trip privacy, fuel/distance, dormant CRM/channel messaging and complete service invoice/work integration remain incomplete. Some components already exist, but route existence and old regression passes do not close the new requirements. Provider selection/credentials, signed devices, financial/safety policies and independent release acceptance remain required. Existing TLS/mail/privacy/release NO-GO decisions are preserved.

[Rollout/rollback instructions](../recovery/post-meeting-rollback-runbook.md). Local review only: Orders → Create phone-assisted order; finance Orders record → View invoice → Issue immutable invoice after reauthentication. Do not enable delivery or payment settings solely to make an unconfigured real order succeed. Do not apply regenerated bootstrap to existing data. Complete READY engineering before a production-readiness claim.
