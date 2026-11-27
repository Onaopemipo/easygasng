# Daily scale-based delivery implementation

28 November 2026. Routine gas delivery now uses one office-opened daily run, automatic allocation to incoming orders, driver before/after scale readings, current photo and office gas-only closing reconciliation. Existing metered custody and product records remain available. Production NO-GO and unrelated gates remain unchanged.

The scale records the same cylinder before/after filling; its weight increase is the paid gas supplied. Opening/closing vehicle figures are gas-only weights. Office daily start/add/close require recent password verification. Admin confirms a discrepancy once, with an explanation; another approver is not required.

Implementation: [backend](../../apps/web/lib/daily-delivery.ts), [additive schema086](../../database/migrations/086_daily_delivery.sql), [office form](../../apps/web/components/daily-delivery.tsx), [native form](../../apps/mobile/DailyRefill.tsx), [manual](../user-manual/daily-delivery.md), [traceability](../traceability/daily-delivery-rtm.md).

Evidence under `evidence/` includes executed service journeys, phone-payment extras, portable-scale quantities/multiple cylinders, current photos, existing custody regressions, actual PostgreSQL locking and forced RLS, web/native renderer recovery, typechecks, production web compilation and iOS JavaScript export. This is not a new signed iOS/TestFlight binary or a physical scale/camera acceptance claim.

Migration086 was applied transactionally to the existing demo, with before/after hashes confirming ten existing operational tables were unchanged. No opening, calibration or refill measurements were inserted in the hosted business data. The runtime remains unable to perform DDL/delete or update immutable measurement history; read-only gates082–086 pass.

Scope changes and operational details:
- One active run per branch. Multiple orders per run; physical gas is reserved once, debited on actual scale supply, and never debited again at delivery completion.
- Added gas is an increment, not an edited opening weight. Closed measurements and histories cannot be rewritten.
- Only unsupplied ordinary orders can carry forward with payment/reservation retained. Complete/cancel same-visit extras first; resolve actual mixed product returns separately.
- Earlier trips are not automatically converted. Reconcile any open metered custody before opening a daily run; an existing trip can be reused without rewriting its reconciled history.
- Routine notes remain optional; explanations for a measured discrepancy remain required.
- Existing field-operation gates stay enforced. Doorstep amendment/COD/real-provider settings are not automatically enabled.

The implementation was developed in an isolated worktree from `81d322a`, with the existing mobile workspace fixes preserved as prerequisites. No unrelated root working-tree edits are discarded. See the machine-readable matrix for current exact coverage and outstanding acceptance.

## Demo release and limits

Published to https://easygas-client-demo.vercel.app. Latest deployment/source commit and downloaded-source verification are recorded in [deployment evidence](evidence/deployment.json) and [source evidence](evidence/source-verification.json). All505 uploaded source files matched the tested release archive. Public demo health and authentication-denial checks pass; shared read-only schema gates082–086 pass. No hosted opening/closing/refill measurements or operational settings were invented or changed.

The browser completed office opening → assignment (modal stayed open) → driver acceptance/departure/arrival →6kg scale supply → actual private PNG upload →delivery →94kg office close/trip end. Daily office buttons now wait for actual driver start/refill/photo. Background refresh preserves entered closing figures; failed reads disable saving. Earlier setup/trip management is expandable.

An unresolved earlier vehicle load blocks daily start. After genuine reconciliation, the current trip can be reused; executed DAY06 proves the earlier metered load row remains unchanged through a complete daily refill and close.

Coverage:7/7 implementation,6/7 verification,5/5 critical server controls and6/7 gates. Actual native device acceptance remains partial. Current scale saves require connectivity; a failed save keeps readings on the open screen for retry. Full offline scale/photo queueing is not verified. No new TestFlight binary was built: older installed binaries do not contain these scale forms. Use the updated native source/preview or the deployed driver web workspace until a new signed release is produced. Existing production NO-GO and unrelated holds remain.

## Start Day and old-form repair —28 November2026

User-reported acceptance reopened DAY-01. The screenshot vehicle is saved as30kg; the current run has a genuine25kg opening, with23kg incorrectly committed to six unassigned queue entries while the12.5kg assigned order has no allocation. No measurements are fabricated or changed. The repair shows capacity in kg, separates unavailable/wrong-branch vehicles from overweight errors, prioritises assigned orders at opening, and removes every per-order meter/load form from the normal daily order modal (including old action deep links). Existing metered allocations expose historical-custody guidance only.

`daily.order.attach` is an office-only, branch/privilege-scoped, password-reverified, idempotent reservation recovery. It restores accidentally linked unassigned orders to ordinary branch reservations, atomically transfers the target reservation to the active driver/day, rejects physical handover/mixed/foreign/stale/unpaid contexts, and preserves weights/physical stock/payment history. No schema or permission-grant change is needed. Tests include the deployed failure shape through scale refill/photo/completion/closing, rendered capacity and old-link routing, and real PostgreSQL concurrent attach/refill and RLS checks. See `evidence/start-day-fix/` for executed proof; rollout verification is recorded separately.
