# Inventory, dashboard and finance preflight

Date: 30 October 2026. Decision: **CONDITIONAL_PASS** for isolated local implementation and verification. Public commercial production remains **NO-GO**.

## 1. Repository baseline

Root: `/Users/philipog/Documents/ChatGPT/Easygas Smart Solution`; branch `main`; no initial commit (`git rev-parse --verify HEAD` fails as expected). All application files are untracked; no staged or tracked modifications, one worktree. Existing work is the baseline and must be preserved. No reset, clean, checkout, commit, push or deployment is authorised. npm workspaces: Next.js web, separate Expo mobile, shared business rules, SQL migrations, node:test/tsx tests. Local schema is 027; managed migrations and bootstrap are separate deliverables.

## 2. Authorised scope

Inventory operations, suppliers/purchases, stocktakes/returns, operational dashboard, authoritative finance/expense reporting, security, shared approvals, tests and documentation. Payments, hosting, deployment, unrelated services/catalogue/auth redesign are excluded. Delivery only, configured ₦1,800/kg and one configured ₦5,000 fee/order, four initial coverage locations, historical snapshots and existing safety gates are protected. No business stock, costs, operating limits, valuation method or qualifications will be invented.

## 3. Existing controls and gaps

- Physical authority: `inventory` quantity/reserved and append-only `stock_movements`; `operations.receiveStock`, checkout/cancellation/fulfilment; POS and service materials use these same counters.
- Gas authority: `gas_stock` integer grams/reservations and append-only `gas_stock_movements`; versioned pricing, physical intake/inspection, dispatch checks. No second balance source permitted.
- Cylinders: serial eligibility, allocations, inspections, custody, quarantine and immutable events. Existing inspection role permissions do not prove qualifications; releasing quarantine needs stronger qualified checks within this assignment.
- Suppliers/purchases already exist. Current purchase receipt is all-or-nothing; direct transfer dispatch has no approval/reservation phase. Extend these entities rather than replace their history.
- Finance: immutable verified payments, cash collections, wallet/reward entries, credit/refund requests, POS shifts, service invoices/material snapshots. `financialReports` exists. No expense register or explicit cost valuation selection exists; profit cannot be definitive. Never overwrite balances or completed transactions.
- Governance: `governance.ts`, shared canonical state graph, policy snapshots, independent/revocable decisions, recent verification, savepoint-safe activation and audit. Extend through domain handlers.
- Access: authenticated actor is reloaded each dispatch, current account/session checks, role and branch allowlists; private-schema server-only RLS policies. Existing `purchasing` returns acquisition costs to all purchasing roles and `dashboard` returns revenue to non-finance operational roles: verified source-level gaps requiring regression tests and corrections.
- No suitable scoped live subscription exists. Implement local-compatible committed-data polling with server authorisation each request, no client-only filtering. Do not claim WebSocket infrastructure.

## 4. Production blockers

`docs/audits/easygas-production-blockers.md` remains authoritative. R01/F03 serial eligibility; R02/F02 branch checkout; R03/F01 inactive branch; R04/F06 delivery capacity; R05/F04 custody/reissue: source controls and `tests/integrity-regressions.test.ts`, shared gas tests exist, but their current execution and independent PostgreSQL verification are pending. Inventory changes may affect reservations, transfers and fulfilment. Run these regressions before changing these paths, preserve fail-closed behaviour. Physical safety acceptance, operational reconciliation, restore/load/privacy/native acceptance remain open.

## 5. Environment readiness

Local PGlite disposable `memory://` available with installed dependencies and synthetic fixtures; existing normal local server/database must not be used for tests. Separate persistent QA database available. No disposable multi-connection PostgreSQL URL configured (presence checked without printing secrets). Independent connection/race and managed restricted-role tests are **BLOCKED** until a guarded local disposable database is configured. No staging/production access authorised. External payments/messaging remain unconnected. Local worker exists; do not send real notifications. Build into isolated `.next-qa` only after stopping owned QA server.

## 6. Change impact and gap analysis

| Change | Classification | Modules/entities | Required verification |
|---|---|---|---|
| Scope/redaction for inventory/dashboard/reports | Controlled modification | service, reporting, API, admin | role/branch tampering, revoked sessions, exports |
| Receipt evidence/cost history, partial purchase receipt | High risk, explicitly in scope | operations/workspace, existing purchases/stock movements plus receipt metadata | replay, inspection, over-receipt, cost authority |
| Adjustment/stocktake/expense approval handlers | High risk, explicitly in scope | governance shared activation, additive request metadata | self/dual approval, stale stock, replay, rollback/failure |
| Transfer reserve/dispatch/partial receiving | High risk, explicitly in scope | existing stock_transfers, inventory/gas ledgers | source/destination roles, reservations, shortages/replay |
| Inventory views/analytics/alerts/exports/live refresh | Safe extension with sensitive access | new server/UI modules extending existing records | verified calculations, no units mixing/PII/cost leakage, reconnect |
| Valuation/profit | Conditional, business inputs absent | recorded receipt costs and approved policy | null unavailable values until complete; no selling-price valuation |
| Schema | Additive migration only | existing entities plus operation/evidence/expense records | migrate fresh/upgrade, immutable constraints, private policies |

The safe test environment and explicit scope permit high-risk local implementation after applicable regression coverage. No production data or operation is authorised. Corrections must append movements; refunds never restore physical stock automatically.

## 7. Decision and acceptance checklist

**CONDITIONAL_PASS**. Repository, existing modifications, scope, inventory/finance/governance/permissions, P0 register, environment, tests, migration and integrity implications inspected. This report records the gate before code changes or tests. Permitted: isolated regression baseline, additive implementation, synthetic tests/build/UI checks, truthful handover. Blocked: independent PostgreSQL acceptance without a disposable URL; definitive valuation/profit absent approved method/complete costs; external delivery without configured channels. No additional approval needed for the authorised local work. Any verified incompatible overlap must stop only that affected change. All original files/history/business records remain preserved; no unrelated changes authorised.
