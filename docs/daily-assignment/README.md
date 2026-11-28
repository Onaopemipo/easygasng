# One-step daily assignment —28 November2026

The order modal now offers **Reassign to today’s driver** when an older assigned order differs from the active delivery-day driver. It assigns that canonical driver and reserves the paid gas quantity in one atomic transaction, then refreshes the same open modal to **Awaiting driver start**. Older same-driver assignments can use **Continue with today’s driver** to repair their missing reservation in one action. No password/reservation form is shown for either shortcut; they retain the same protected Dispatch authority as ordinary driver assignment. Password verification for physical opening/additional/closing weights remains.

Normal order.transition assignment and dispatch.reassign also reserve daily gas atomically while a delivery day is active. Current-day driver choices exclude other drivers for gas-only daily orders. Insufficient gas, stale order/day, inactive/unavailable/wrong-branch driver, unpaid phone order, revoked privilege, missing identity, release holds and started/physically handed deliveries cannot be bypassed. Retries keep their original operation key. Assigning an order never changes opening or physical gas weights; duplicate ordinary branch reservations transfer to the day rather than double-counting stock.

The common older-order attachment logic is reused, including repair of premature queued allocations. Product/mixed and earlier metered custody are retained. Before a day is started, the existing trip/legacy assignment and day-start attachment behaviour remains; an active daily run is required for the shortcut. No schema changes or native binary changes.

A related extra-order regression was found and repaired: gas catalogue fetchedAt (a changing presentation timestamp) was included in a same-visit quote hash. It is now excluded from that hash; all prices, versions, quantities, visit and stock constraints are still compared. Existing fee-free, prepayment and stale-stock/price negative tests pass.

## Executed evidence

- [44 targeted checks](evidence/regression.txt): daily full paid refill/photo/completion/closing, ordinary and direct assignment, legacy repair, roles/payment/stale/stock negatives, actual rendered form retry/double-click behaviour, modal continuity, extra-order stock/price/cancellation and price regression:44 passed,0 failed,0 skipped.
- [6 final security checks](evidence/security.txt) include explicit production/field and tracking release denial plus revoked protected Dispatch authority; all pass.
- [Real PostgreSQL](evidence/postgres.txt):2 passed, including concurrent reassign/different-key requests, same-key replay, competing orders, physical stock preservation, and daily refill concurrency/RLS. Each suite creates/drops its own disposable local database.
- [Browser acceptance](evidence/browser-verification.json): signed into an isolated local QA Admin account, opened the actual order modal, clicked the direct action, and observed updated driver, gas-reserved message, unchanged open dialog and next action. [Database checks](evidence/browser-database.json) show one12.5kg allocation,25kg opening unchanged and one audit event. [Before](evidence/before-reassign.jpg)/[after](evidence/after-reassign.jpg).
- [Types](evidence/typecheck.txt) and [production build](evidence/build.txt) passed.
- [Broader Dispatch checks](evidence/dispatch-regression.txt) retain two pre-existing failures: DDI-AUDIT01 technician historical source hash and DDI-READ04 old accepted-order preparation expectation. Both reproduce unchanged at baseline2a7d8fe in a clean worktree ([baseline](evidence/baseline-dispatch.txt)); no native implementation or dispatch preparation semantics were changed in this phase. These remain in broader coverage denominators and production NO-GO is preserved.

## Release

Demo source verification, promotion and hosted security probes pending. No hosted operational order or measured weights have been changed by testing. [Traceability](../traceability/daily-assignment-rtm.md).
