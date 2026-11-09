# EasyGas Excel preflight — 5 November 2026

**CONDITIONAL_PASS: audit/reconciliation/zero-write preview only. Actual import REQUIRES_APPROVAL and is not approved.** The user's current instruction narrows the attached implementation brief: no customer identity, order, stock, payment, invoice, wallet, rewards, dispatch or messaging write is authorised. No import approval or commit capability will be enabled in this phase. Production NO-GO, local hosting and disconnected online payments remain unchanged.

Git main has unborn HEAD; no staged or tracked unstaged changes, all project paths untracked. Preserve all source files. Full status evidence: excel-evidence/preflight.json. No reset/clean/commit/push. Baseline `npm test`:294 total,283 PASS,0 FAIL,11 SKIP (PostgreSQL-dependent cases). Evidence: excel-evidence/baseline.txt. Skipped cases remain unverified; no imported target effects require concurrency execution in this preview-only phase.

Workbook opened as a ZIP/XML document only, with formula and saved cache stored separately. Original is not modified, recalculated or executed. No macros or external-link content is executed. SHA256761854f961474cfb7789cddf4d9e16759796581bff8cc420253d9ceb32e1c380. Two visible sheets; workbook uses1900 date system; no hidden rows/merged cells found in first discovery; two hidden defined names retained. Formula-only rows excluded from business proposals. Further findings are in migration documents.

## Actual reusable repository capabilities

| Capability | Actual model/service | Status / constraint |
|---|---|---|
| Identity | users/public_customer_id/contact_phone; account_addresses; customer-management.ts; assisted-ordering.ts | IMPLEMENTED: opaque IDs, scoped lookup, provisional records. Historical match requires human review; no verified phone inferred from a saved address |
| Customers/orders/POS | customer-management.ts; operations.ts checkout; commerce.ts; Orders/POS UI | IMPLEMENTED live transactions; CONFLICT: checkout reprices, reserves stock and sends notifications, so it must not receive historical rows |
| Gas/inventory/cylinders | gas_stock_movements, stock_movements; inventory-business.ts; cylinder-allocation.ts | IMPLEMENTED immutable approved stock/custody controls. Historical mass does not prove physical stock/cylinder ownership; cutover approval required |
| Finance/payments/invoices | verified_payments, credit_requests, wallet_entries, customer_invoices; invoices.ts/financial-reports.ts | IMPLEMENTED live verified ledger and issued invoice snapshots; PARTIAL full lifecycle. Source receipts cannot be passed to verified settlement or invoice issue |
| Refill/rewards/CRM | consumption_profiles/refill_history; refills.ts; forecast.ts; rewards*.ts; business-reporting.ts | IMPLEMENTED verified-delivery predicates; PARTIAL dormant CRM. Uncertain historical records must not train forecasts, send messages or earn rewards |
| Imports | workspace.ts product.import; product-import.ts | IMPLEMENTED master-product import only; MISSING historical staged transaction importer. Reuse validation/governance, not a second identity/ledger pipeline |
| Approvals/security | approval-workflow.ts/governance.ts; auth.ts allow/recentVerification; branch/customer ownership | IMPLEMENTED common workflow; MISSING exact historical batch/row resolution contracts. Preview cannot grant authority |
| Provenance/idempotency | business_operation_results; immutable events/audit; unique request references | Reuse later. This phase generates stable source row/event IDs and no target INSERTs, approvals or commit endpoints |
| Backups/recovery | scripts/postgres-backup.ts, service recovery and post-meeting runbooks | Existing isolated restore evidence retained. No new target restore or production readiness claim made |
| Native/customer reports | apps/mobile/App.tsx/Services.tsx/EasyRewards.tsx; customer-dashboard/refills | Existing functionality preserved; historical display needs explicit provenance/confidence before future integration |

## Scope, dependencies and rollback

Audit outputs containing names/phones/addresses/source cells are restricted to ignored .data/excel-preview with mode0700 directories/0600 files, never apps/web/public or versioned docs. Versioned reports contain aggregates, code and cell references only. The preview tool reads files and writes review artefacts, has no DB connector or business mutation. No schema migration, app-route change, target import or provider activation is needed.

For target matching/counts use only a read-only transaction against an isolated consistent local database copy, without getDb/migrate/maintenance. Record its fingerprint and original-target hashes; never use spreadsheet names to select a customer automatically. If target capture fails, mark matches and target reconciliation BLOCKED rather than guessing.

After customer confirms payments, unit semantics/physical stock and cutoff, fee history and row-level customer decisions, prepare a separately reviewed staging/approval migration and exact writes. Future commits require immutable provenance, file hash/version/row/event uniqueness, branch/customer authority, independent finance/stock approval, recoverable chunks, quarantine from live side effects and compensating recovery. No destructive rollback of posted events.
