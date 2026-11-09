# Order and delivery states

Canonical source: packages/business-rules/src/forecast.ts (`orderTransitions`), enforced by operations.ts and delivery.ts. Customer labels in packages/business-rules/src/order-tracking.ts map placed → Order Placed, accepted → Confirmed, preparing → Preparing, assigned → Ready for Dispatch, out_for_delivery → Out for Delivery, delivery_failed → Delivery Unsuccessful, delivered → Delivered, cancelled → Cancelled. No existing enum was renamed.

Allowed order transitions: placed→accepted/cancelled; accepted→preparing/cancelled; preparing→assigned/cancelled; assigned→out_for_delivery/delivery_failed; out_for_delivery→delivery_failed or verified delivery.complete; delivery_failed→assigned/cancelled. Generic transitions cannot mark delivered. Same-status events record pickup, arrival, reschedule and physical return without inventing an order state.

Delivery attempt dimension: assigned→picked_up→arrived(optional)→delivered; assigned/picked_up/arrived→failed; failed with physical pickup→returned before reassignment/cancellation. New assignment creates a versioned attempt and fresh expiring customer code. A partial handover is blocked. Inventory/owner return attestation requires the entire manifest and existing cylinder eligibility; unsafe returns remain restricted and need qualified inspection/incident handling, not automatic restock.

Payment remains independent: cash completion records collected, not verified. Existing independent finance reconciliation and immutable ledgers are unchanged. Cylinder allocations/custody and notification outbox state remain separate records.

Every new event locks/increments the order version; previous status, actor, timestamp and operation correlation are retained. Historical rows retain their actual timestamps and NULL event versions rather than invented history. Public mutations require a current version and UUID operation identity; stale requests fail. Existing trusted internal calls retain natural protections. Orders, attempts, proofs, stock/cash/custody and outbox commit in one dispatch transaction.

Safety restrictions remain: inactive or unauthorized branches, capacity overflow, inactive/wrong-branch driver, unavailable reserved stock, invalid inspection/custody and held goods without physical return cannot proceed. Cylinder rows are locked in stable ID order. At-most-once committed effects are locally tested; independent PostgreSQL contention verification is separately BLOCKED.
