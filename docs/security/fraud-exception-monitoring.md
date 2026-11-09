# Fraud and exception monitoring

Signals request investigation; none declares fraud or automatically changes stock, money, staff authority or customer access. Reuses `operational_incidents`, immutable `incident_events` and existing incidents UI. The local worker invokes `inventoryExceptions`; incidents deduplicate by category/target. Each has unique ID, branch, severity, source target, time, owner role, open/acknowledged/resolved state, optional assigned reviewer and resolution notes/events.

| Rule | Trigger and required data | Severity / responsible reviewer | Resolution |
|---|---|---|---|
| transfer_discrepancy | Existing transfer is partial or has damaged/unreconciled quantities | high / owner; scoped operational review | Match dispatch, actual receipts and held damage. Record missing receipt; do not silently complete. |
| cash_discrepancy | Submitted POS counted cash differs from recorded expected cash | high / owner or scoped finance | Preserve count/transactions; use independent reconciliation and reason. |
| stocktake_variance | Submitted stocktake delta is nonzero | medium / owner | Verify signed counts, intervening movements and shared independent approvals. |
| unsafe_cylinder_allocation | Active serial reservation has damage/quarantine/inspection-due status or expired test date | critical / owner with qualified safety personnel | Stop affected fulfilment, investigate serial/custody, follow qualified inspection and original cancellation/allocation controls. |
| protected_operation_denied | A stock/transfer/purchase/expense conflict was refused and recorded as a security event in the last 30-day review window | medium / owner | Inspect original immutable event and operation; duplicate retries may be harmless. No automatic disciplinary conclusion. |
| live_low_stock | Current unreserved physical units at/below configured threshold, or gas below explicitly configured threshold | warning/high / scoped inventory | Review actual available quantity and approved procurement; unknown lead time/safety stock produces no invented reorder quantity. |
| live_held_stock | Unreleased held return/quarantine exists | warning / inventory with qualified reviewer | Condition evidence and independently approved release/disposition; never directly overwrite a balance. |

Notifications: dashboard low-stock/exception cards are current authenticated views; persisted incidents appear in the existing incident centre. External email/SMS/WhatsApp is not connected. An owner may assign an active authorised reviewer using `business.incident.assign`; use existing `incident.update` for acknowledgement/resolution with notes. Existing role restrictions still apply to resolution. Retain false-positive explanations in incident events instead of deleting evidence.

Additional requested analytics—unusual discount/write-off frequency, repeated refunds by employee, unexpected liability changes, business-approved high-value thresholds and supplier deadlines—need approved definitions and reconciliation context. Existing rejection/duplicate/approval/wallet/refund safeguards remain active; these additional behaviour-based detection rules are **not claimed implemented**. No deadline or fraud threshold is invented. Review raw authorised audit/financial reports for these cases until configured rules exist.
