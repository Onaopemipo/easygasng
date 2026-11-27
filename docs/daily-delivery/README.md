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
- Earlier trips are not automatically converted. Reconcile and end existing metered trips before opening a daily run on that vehicle.
- Routine notes remain optional; explanations for a measured discrepancy remain required.
- Existing field-operation gates stay enforced. Doorstep amendment/COD/real-provider settings are not automatically enabled.

The implementation was developed in an isolated worktree from `81d322a`, with the existing mobile workspace fixes preserved as prerequisites. No unrelated root working-tree edits are discarded. See the machine-readable matrix for current exact coverage and outstanding acceptance.

## Demo release

Published to https://easygas-client-demo.vercel.app from source `9a97b03`. Vercel deployment `dpl_Fz22Xpaz5CPTAiiQFS3o4nNk1MKg` is READY; downloaded source archive matched505/505 shipped files. Shared schema086 and all existing read-only gates pass. The public demo health route is ready; daily operations reject unauthenticated requests. A follow-up strengthens runtime health to require086 explicitly; its deployment is recorded in the final release evidence.

Coverage:7/7 implementation,6/7 verification,5/5 critical server controls,6/7 gates. Native physical acceptance remains partial. No new TestFlight binary was built; older installed binaries do not contain the scale forms. Use the updated mobile source/preview for this workflow until a new signed release is produced.
