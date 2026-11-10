# Staff same-delivery additions

[Requirements matrix](../traceability/order-additions-rtm.md) · [Repository audit](audit.md)

This feature did not previously exist. Existing phone-assisted orders create their own delivery charge; doorstep amendments concern physically governed on-site work. Both remain intact.

In staff **Orders → Details → Add to this delivery**, an owner, branch manager or sales operator chooses products and/or gas, records the customer request, reviews the authoritative additional amount and unchanged delivery charge, then confirms. The supplementary request receives an EA audit reference, and its items are added to the original customer order and fulfilment. The customer, address, delivery window and original delivery code remain unchanged. There is no independent free shipment.

One supplementary request is allowed per order. Additions close before any rider assignment or loading, not merely after departure. Any previous delivery attempt prevents reopening through a reset status. The backend checks these limits again under the original order lock; hiding the button is not the security boundary.

Only unpaid COD or card orders without prepared payment, invoice, verified funds, cash collection or reward discount can be changed. Financially committed orders must use the existing correction process. No staff wallet debit/card charge or provider activation occurs. An unpaid card order still requires customer payment and backend verification before dispatch.

Current branch prices and available stock determine the amount. Changed existing line prices are rejected rather than rewriting historical unit prices. Existing reservation ledgers and serialized-cylinder allocation are reused. Added gas has new uninspected lines and a dispatch coverage/inspection review; it cannot bypass physical-safety checks. Atomic rollback, replay fingerprinting, immutable history and a unique order constraint prevent partial/double additions. Existing cancellation releases the combined reservations.

Verification:46/46 scoped commerce, dispatch, assisted identity, bundle/service and addition regressions;1/1 real PostgreSQL separate-connection duplicate/assignment race test;9/9 final overlapping addition follow-ups; web types/build pass. The scoped counts are not summed twice for overlapping tests. An actual isolated browser component called the real dispatch/database, reviewed two extra hoses, confirmed the addition, displayed ₦7,000.00 with ₦0.00 extra delivery, and then showed its immutable history/one-addition limit. No business data, physical fulfilment or real payment was used.

Not deployed. Before hosted rollout: retain a protected database backup, apply migration074, deploy code and retest the hosted staff modal. The migration adds only immutable addition history; no seed, customer merge, invoice rewrite or historical import. Rollback stops new additions by reverting the new routes/control; retain addition records and updated order lines/totals/stock histories under the retain-all instruction. Never subtract/delete completed additions as a rollback shortcut; use governed corrections. Prior production NO-GO and all unrelated gates remain unchanged.
