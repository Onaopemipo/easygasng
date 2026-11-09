# Inventory and cylinder controls

Product inventory stores branch quantity/reserved counters and immutable movements. Checkout locks and reserves eligible published stock; cancellation releases once; fulfilment consumes once. POS deducts immediately inside the sale transaction. Approved supplier receipts and independently received transfers reuse the existing movement controls.

Empty-cylinder sales now require enough company-owned empty serials of the correct size, without custody or another active allocation and with a future documented inspection date. Fulfilment rechecks those serials and marks sale ownership/customer custody; POS performs allocation and issue atomically. Failure rolls back sale and inventory changes. Generic custody cannot replace another holder without a return or bypass an active sale allocation. Cancelled orders release their serial reservations. Already sold serials are excluded from the maintenance status-expiry rewrite.

These controls close the reproduced unallocated-sale/custody defects for empty-cylinder sales. They do not implement a complete physical refill/exchange/deposit/recall system or bulk gas tank mass ledger. Existing historical orders without serial allocations fail closed; operations must review and allocate through an approved recovery workflow rather than fabricate history. Physical stock and eligible serial counts must be reconciled by operations before launch.

Service materials follow separate reservation → issue → usage → unused return/reconciliation records, with unit price and actual cost snapshots. Bounded usage/damage/returns and replay checks prevent duplicate stock changes. The job cannot be reported complete while materials remain unresolved. A technician's report does not automatically manufacture stock or assign compatibility.

## Inventory and finance extension — 30 October 2026

Bulk gas now has authoritative integer-gram stock/reservations and append-only movements; the older absence of a bulk mass ledger described above is historical. Inventory centre, governed adjustments/count sessions, partial purchases/transfers, held returns and complete-input acquisition valuation extend the same authorities. Passed cylinder inspection now requires a current independently verified `cylinder_inspection` qualification. See `security/inventory-controls.md` and `reports/easygas-inventory-dashboard-implementation.md`; generic cylinder transfers remain fail-closed.
