# Inventory and finance security runbook

Release remains NO-GO. Local operation only; payments and external channels remain unconnected.

For every incident: create/retain the incident reference, severity, affected branch/records and responsible reviewer; restrict the affected workflow when necessary; preserve immutable audit/ledger/approval evidence; notify the responsible authorised colleague through configured in-app channels; investigate source documents and chronology; apply a new approved correction/reversal; reconcile balances and independent verification; record resolution/false-positive explanation and preventive action. Do not erase original evidence.

| Incident | Immediate action and investigation | Authorised recovery |
|---|---|---|
| Unauthorised adjustment | Preserve denied API/audit event, identify session/role/branch and affected request | Suspend compromised account through existing staff controls; reject/cancel pending request. Never directly edit quantities. |
| Unexpected loss | Count actual unreserved/held/custody stock, compare receipts and movements | Submit documented negative correction or quarantine/write-off with independent owner review. |
| Repeated stocktake variance | Retain count sheets/session snapshots and intervening movements | Recount after reconciling movements; old/stale approvals cannot force an earlier balance. |
| Suspicious cylinder custody | Stop affected fulfilment; inspect allocation, serial, holder and test evidence | Existing recorded return/custody procedure and current independently qualified inspection; generic cylinder transfer is disabled. |
| Duplicate financial transaction | Preserve references, amounts, expense fingerprint and original events | Use original replay/reference; new approved reversal if genuinely incorrect. Do not edit wallet or verified-payment history. |
| Unauthorised refund | Retain denied event, customer consent and original payment evidence | Existing credit/refund approval path only; refund does not imply recovered physical stock. |
| Expense irregularity | Check category/payee/date/document, independent requester/approver and actual payment event | Reject/cancel pending approval, or independently approve reversal of recorded expense. Approval alone is never proof of payment. |
| Cash discrepancy | Preserve signed count, cash collections/POS shift and expected total | Independent existing cash reconciliation with explanation; do not fabricate verification or change opening balances. |
| Report export abuse | Preserve export/denied audit event and exact authorised scope | Suspend/revoke compromised account; recheck shared/downloaded copies through approved incident/privacy process. No public stored report URLs exist. |
| Compromised staff account | Suspend/revoke sessions and review outstanding approvals/delegations | Existing staff access approval and independently verified account recovery; live connection stops at next five-second recheck. |
| Live-data exposure concern | Disconnect affected session, preserve branch/role/filter evidence | Confirm server redaction and same current actor on reconnect; do not rely on client-only filtering. |
| Financial totals disagree | Compare historical order prices, single delivery fee, verified receipts, refunds, service invoice and POS cash-up separately | Reconcile source evidence, regenerate a narrower complete report. Profit remains unavailable with incomplete costs. |
| Transfer shortage/damage | Retain dispatch/partial receipt and held-damage records; assign reviewer | Destination records actual good/damaged quantities with unique references. Unresolved missing quantities remain discrepancies; no automatic stock restoration. |

Use Inventory tabs for stock, receipts, adjustments/count sessions, returns, transfers, suppliers/purchases and movement history. Reverify the password in the existing account menu before sensitive actions. Review restricted requests in Approval Centre, including complete recorded payload. A requesting owner needs another owner for independent-owner operations. Qualified inspection authority must be based on real evidence and independently recorded expiry; never copy synthetic test credentials/qualifications into business data.

Stocktake: create scoped session, print/save the audited count sheet, count every selected item and record signed evidence, submit all quantities, independently review each nonzero variance. Any intervening quantity/reservation change blocks submission/application; reconcile and recount. The session closes only after all required variance operations apply.

Daily opening checks: actual stock/serial reconciliation, available kg/units separately, pending/failed approvals, transfer discrepancies, unverified collections, expense/reversal references, live freshness and worker incidents. Run worker only under documented single-process local DB ownership. Scheduled snapshots generate in the existing worker and persist before in-app notification; failed or revoked schedules are not labelled delivered externally.

Before release: obtain the safe disposable PostgreSQL target and run independent-connection tests; approve actual operating limits, qualifications, supplier lead times/safety stock, valuation method and opening costs; reconcile liabilities/COGS/overheads; perform real operational safety, backup/restore, proxy/SSE load/TLS, privacy and affected device acceptance. No deployment or payment activation is authorised by this runbook.
