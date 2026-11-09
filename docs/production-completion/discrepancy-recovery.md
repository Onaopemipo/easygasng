# Governed bulk LPG discrepancy recovery

8 November 2026. Existing E2E-01/BULK-R05 continuation. Production remains NO-GO; actual Excel import hold unchanged. This is one completed backend workflow with existing administration controls, not completion of the eleven-area production request.

## Operating flow

1. The assigned driver declares physically measured returned grams. Independent qualified inventory staff records receipt. Any disagreement with the canonical expected remainder holds the load and trip; it never automatically adjusts stock.
2. In the existing administration deliveries panel, qualified inventory staff records a fresh measured return, observation time, investigation evidence reference and reason. The backend requires the current held load version, recent verification and a current independently verified `bulk_lpg_loading` qualification. Future/pre-discrepancy/older-than-24-hour observations are rejected. The driver cannot submit or approve recovery.
3. The request uses the existing protected `inventory_operations`, setting definition, change request and Approval Centre. The reviewer sees expected/observed/buffer quantities, canonical stock snapshot and investigation evidence in existing Business operation details. Submission changes no stock, mass, collection or trip status.
4. An independently verified owner, distinct from requester, driver and original return receiver, reviews the evidence. Existing approval expiry, revision, authority and self-approval controls remain authoritative. Before activation, current maker qualifications, exact held-load version, current branch balances, measurement age and release flags are checked again.
5. In one transaction, the measured variance changes canonical branch-owned mass, only the remaining vehicle buffer reservation is released, unused allocations become returned, and the load becomes reconciled. Original driver declaration, issued mass, meter readings and discrepancy event remain unchanged. Separate canonical adjustment/release movements and immutable recovery/audit events bind the operation, request, evidence and actors. Undelivered order reservations remain intact.
6. Trip closure still runs its existing active-delivery and custody checks. Reconciliation does not represent an order as delivered or a cash collection as verified.

Expired/changed evidence or stock leaves activation FAILED in the existing Approval Centre with stock/custody unchanged. Request a fresh independent review against the new state. A fresh request has a new operation identity; if several are submitted, only the current load version can activate. Transport retries with the same business operation key return the original receipt. Owner retry cannot apply a reconciled load again.

Drivers see their own measured return history, not the full branch balance snapshot used in inventory approval. No extra customer/stock/payment system, balance seed, automatic shrinkage, invented certificate or monetary expense was created. Positive or negative measured variance requires the same independent evidence and approval; quantities cannot breach surviving canonical reservations.

## Schema and rollout

Migration059 adds `bulk_return_recovery` to the existing protected operation kinds. No new balance table, opening stock or account is introduced. Current runtime migration list, readiness requirements, generated bootstrap and local upgrade sentinel include059. The operation is deliberately distinct from generic adjustment, preventing older code from applying its mass correction separately from custody release.

Keep bulk/field flags OFF until physical, browser and release acceptance passes. Existing generic approval screens are reused. Rebuild and qualify the image after source review; previously built images are not evidence for this continuation. Apply additive migration with the migration principal after a checkpoint; run runtime checks under the restricted principal.

Rollback is not permission to execute pending recoveries with older code. Stop approval/worker processing and retain encrypted records, operation receipts and held-load evidence. Do not activate recovery operations on a build that does not understand their operation kind; reconcile request/application/custody state before resuming. Do not roll back financial/stock records or release reservations to clear a hold. An already applied correction must not be undone by replay or by restoring a stale database over newer events.

## Evidence and remaining acceptance

`evidence/recovery-focused-final.txt` exercises successful recovery, self/role controls, stale versions/balances, disabled flags, expired qualifications, old/future observations, reservation limits and safe fresh review. `evidence/recovery-postgres.txt` runs independent PostgreSQL connections: one concurrent recovery approval effect and forced abort restoring both mass and custody. Existing inventory-finance tests are included in `evidence/recovery-tests.txt`.

The full regression, production build, web types and traceability logs are recorded separately. Browser form interaction, real physical measurements/certifications, restricted production-role recovery activation, staged deployment and independent operations acceptance remain open. Supplementary doorstep obligations/consent/payment/cylinder execution and other production work remain unfinished.

Final recorded totals:385/385 broad PostgreSQL-enabled tests passed,0 skips/failures;13/13 focused checks and1/1 PostgreSQL concurrency/forced-abort rerun cover the final extra vehicle-capacity guard. Build, web types and2/2 matrix checks pass. These are overlapping executions, not proof of production deployment or full business acceptance.
