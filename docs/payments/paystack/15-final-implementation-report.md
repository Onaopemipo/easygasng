# Paystack implementation report — 6 November2026

**PARTIAL / production NO-GO remains.** This delivery implements tested sandbox payment foundations, not the entire approved end-to-end specification. Neither live activation nor actual Excel import is approved. No original identity, order, invoice or wallet history was imported, reset, backfilled or marked paid.

Implemented:
- Repository audit, baseline regression and dated official provider research before coding.
- Integer-kobo minimal gross-up engine with discontinuous waiver/cap/rounding handling and immutable policy snapshot.
- Existing independent Settings/Approval Centre extension; no secrets in settings, customer pass-through default false, fee=null, provider OFF, test mode only.
- Additive migration057, registered in db.ts, local migration sentinel58: canonical intent/attempt/event/posting/exception extensions, existing identity/obligation/ledger foreign keys, RLS, unique posting keys and immutable economic history.
- Typed hosted Paystack adapter, test-key/domain restrictions, exact provider verification, raw timestamped or explicitly selected legacy signature, durable inbox and bounded worker polling.
- Atomic principal-only allocation into existing verified_payments/wallet_entries, quote expiry/policy/obligation/branch checks, no repeat initialization on unknown outcome; unresolved same-purpose payments resume rather than trigger another charge.
- Existing issued-invoice payment controls on web/native, approved service quote payment controls, exact wallet funding, authenticated existing invoice-request integration, native intent-only deep link and restart recovery.
- Verified posting-derived sandbox receipts through the existing invoice PDF renderer; finance collection/fee/liability report and existing reconciliation page panel with bounded displayed-row CSV and scoped exceptions. Estimated provider net is not claimed as bank settlement.
- Legacy credit refund safety hold for provider-funded payments; refund completion itself remains unimplemented.

Executed evidence: [test report](11-sandbox-test-report.md). Full suite363 tests:349 pass,14 skip,0 fail; all14 PostgreSQL tests separately passed on disposable localhost PostgreSQL. Focused10 payment tests,2 policy/link tests, matrix validation, web/mobile typecheck and Next production build pass. No official merchant transaction, live funds, signed-device/visual acceptance or full staging rollout is claimed.

**Still required engineering:** original checkout Paystack selection plus governed canonical invoice issuance; complete assisted progressive profile journey; service invoice lifecycle; committed vehicle-stock doorstep supplementary obligations; independently approved provider refunds, reversals and chargebacks; authoritative settlement/payout matching; full reconciliation investigation/exports/alerting; native receipt history and offline/status recovery acceptance; comprehensive82 scenario completion and26 gates. Existing cylinder/branch/capacity/field operational launch gates remain applicable.

**External blockers:** merchant test account/key/webhook setup; verified merchant fee/tax/rounding/channel schedule; provider/legal customer fee pass-through and prepaid store-credit permissions; official messaging/template delivery; staging hosting, independent finance/owner/operations sign-offs. The user requested account setup guidance: [setup instructions](16-test-account-setup.md). These external blockers do not conceal the engineering gaps above.

Gate results: PAY-01 audit/baseline PASS; PAY-04 deterministic configured-fee engine PASS; PAY-25 no unauthorised live activation PASS. All other gates retained BLOCKED pending their actual engineering/provider/operational acceptance; see [full traceability](14-traceability-matrix.md). Do not infer a commercial readiness percentage from passing source checks.

Files: new core apps/web/lib/payments/{policy,paystack-provider,runtime,orchestrator,webhooks,documents,reporting}.ts; API app/api/payments/paystack/[operation]/route.ts; payment-return page; shared web/native hosted payment and finance UI; existing governance, invoices, service/wallet/request UI, financial reports, worker and mobile link adapters; migration057; .env.example variable names; focused tests and this documentation set. No package dependencies added, no sidebar or role picker replacement, no source cleanup/commit/deployment.

Rollback preserves additive schema and all posted history. Disable new quotes through approved DB policy while keeping reconciliation available for unresolved attempts. Local synthetic concurrency and existing encrypted backup regressions passed; staging activation/rollback and actual process-crash recovery remain explicit gates. See12-runbook.
