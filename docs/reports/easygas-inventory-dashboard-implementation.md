# Inventory, dashboard and finance implementation

30 October 2026. Authorised local extension; **commercial production remains NO-GO**. Preflight decision: **CONDITIONAL_PASS**, recorded in `docs/audits/easygas-inventory-dashboard-preflight.md` before implementation/tests. No hosting, online payments, production data, external notifications, deployment, commits or pushes were performed.

## Implemented

- Inventory centre: scoped persisted kg/unit balances, reservations/held quantities, product/SKU/category search/sort/pagination, product movement detail, service material status, low-stock review, acquisition receipt history for finance, and separate gas/physical metrics.
- Evidence-based receipts and supplier profiles/purchases, conservative independent-owner approval and partial receiving. Purchase is never treated as stock before actual verification. Duplicate references and over-receipts fail safely. Acquisition costs remain distinct from approved selling prices.
- Corrections, stocktakes, thresholds, returns, qualified held releases, supplier return/write-off disposition and protected quarantine use the original authorities. Multi-item stocktake sessions capture branch/category/gas snapshots, print count sheets, require all selected quantities and independently approve each variance. Concurrent/intervening stock changes require reconciliation/recount.
- Transfers extend existing rows: request → independent approval/reserve → dispatch → in transit → independent destination partial good/damaged receiving → completed/discrepancy. Damaged stock is held; missing quantities remain visible. Generic serialised-cylinder transfers are fail-closed pending an approved serial custody procedure.
- Shared canonical approvals retain policy snapshots, independent/dual decisions, current authority checks, scheduling/expiry, savepoint failure/retry, history and existing rollback. One-time operations cannot manufacture inverse physical/financial events through settings rollback. Complete business payload is reviewable in Approval Centre; one-time settings stay out of ordinary Settings editing.
- Expenses: draft/submission/independent approval/recording/payment evidence/approved reversal, duplicate matching, immutable event history, configurable category labels and no payment adapter. Actual payment verification is independent of requester and approval.
- Live scoped SSE dashboard with authenticated five-second rechecks, deduplicated committed snapshots, heartbeats/reconnection, cache clearing and authenticated fallback refresh. No raw database/public financial event stream. Three connections/token/application-instance limit.
- Reports centre: 23 report types covering recorded sales/gas/products/cylinders/accessories, valuation, movements, low stock, stocktake variances, purchases, delivery/location/customer data, refill history, service/technician records, expenses/profit availability, payments/wallet/loyalty/branch/audit. Relevant branch/date/order/location/payment/category filters, audited CSV/Excel XML/print-to-PDF and private scheduled in-app report snapshots; current authority rechecked when opened.
- Weighted-average valuation uses an explicitly approved method and complete historical acquisition movements, never selling prices. Missing opening costs/uncosted returns or transfers produce unavailable valuation. Profit remains unavailable with incomplete COGS/labour/overhead inputs.
- Deterministic exception incidents reuse the existing incident infrastructure. Additional unusual-behaviour/fraud thresholds remain unimplemented and explicitly listed in `docs/security/fraud-exception-monitoring.md`; no invented policy values.

## Preserved controls and boundaries

Existing orders/historical prices, single historical delivery fee, bulk reservations, POS, material reconciliation, customer wallet/verified cash/refund ledger, safety/serial custody, staff/session revocation and existing governance are reused. Legacy fixed-unit refill receipts/transfers cannot manipulate bulk gas. Customer web/native use the same authenticated authoritative APIs; no new mobile architecture/admin-native app is introduced.

Restricted operations use conservative owner approval because manager quantity/value limits are not supplied. Inventory cost/financial access is restricted; branch permissions apply on the server and when exporting/live refreshing. Original private-schema model and managed migration chain are extended. Actual qualification evidence must be independently verified; synthetic tests do not provision real qualifications.

## Database and source

Local migrations028 and030; managed policies029/031. Existing supplier/purchase/transfer/gas records are extended; new evidence, expense, schedule and count-session tables are additive. No opening stock/cost backfill is invented. CLI-generated managed migration `supabase/migrations/20261029205117_inventory_dashboard_finance.sql` bundles the change and policies. Bootstrap/local migration runner/readiness updated. Never apply managed/bootstrap SQL to production without the separate release/migration review.

Source files and SHA256 evidence are listed in `inventory-finance-source-manifest-2026-10-30.json`. Because Git has no initial commit and all application files were already untracked, this is a scoped source inventory, not a commit diff.

## Verification and remaining work

See `easygas-inventory-finance-security-verification.md` for final actual checks and release gates; `inventory-finance-tests-2026-10-30.txt`, build/typecheck logs and UI JSON/screenshots for evidence. Independent multi-connection PostgreSQL remains blocked. The stocktake browser fixture is an open synthetic count session; the receipt contains four synthetic hose units only in the isolated QA database.

Remaining: production-like PostgreSQL restricted-role/race/failure acceptance, business approval of valuation/opening stock/costs/qualified personnel and any manager limits; complete COGS/expenses/payables reconciliation; configured supplier lead time/safety stock for quantified reorder recommendations; defined retention/cohort/refill-attribution policy for unavailable advanced customer metrics; serial-specific transfer/return procedures beyond existing custody; additional configured behavioural monitoring; real operational safety, backup/restore/proxy/load/privacy/device acceptance. External reports require configured channels; current delivery is in-app only. These are not represented as complete or passed. No release decision changed.
