# EasyGas order tracking implementation — 2026-11-02

Preflight **CONDITIONAL_PASS**. Core local customer/dispatch/driver tracking is implemented; the entire master prompt is **not certified complete**. Public commercial production remains **NO-GO**, and production fulfilment writes default disabled until explicitly approved/enabled. No cloud hosting, payment provider, external messaging or production-data mutation.

Reused existing orders/delivery code, staff authentication/role navigation, branch settings, stock/gas/cylinder allocation/custody, cash/finance, shared persistent business-operation results, support/incidents, notification/worker and existing native encrypted pending queue. Existing /admin/orders inspection/finance controls were preserved. New /admin/deliveries workspace does not replace the driver's assigned-work navigation.

Implemented: actual owned customer status/timestamps/price/address/window/driver details and failure/support links; authenticated SSE snapshots with re-authentication/revocation/branch/assignment checks and reconnect reconciliation; searchable dispatch queues, branch filter, current driver options/active stops, limited actual-event duration metrics; versioned assignments/attempts, exact-manifest driver pickup, arrival/help, failed attempt/physical-return restrictions, expiry/rate-limited code and complete handover; actor/payload/version operation outcomes and emergency write stop. Native pickup/arrival/help/proof/queue payloads retain stable identities and current versions and pass TypeScript; actual device testing is unexecuted.

Schema: additive 040 event/attempt/proof/outbox; 041 operation correlation, unique versions and restricted immutable evidence/outbox grants; 042 owned support-order association. Fresh bootstrap updated; local revision 42. Existing status enums and financial/custody dimensions remain separate. The operations, events/outbox and stock/cash/custody effects run in one database transaction. Persistent results give at-most-once committed business effects under tested local scenarios; no exactly-once network/worker/provider claim. Independent multi-connection PostgreSQL contention/failure verification remains BLOCKED.

GPS/ETA are explicitly unavailable; no collector, simulated positions, routing credentials, background permissions or other-stop map. Provider/privacy/retention/device activation are blocked and collection remains unimplemented. Optional photos and public share tokens were not introduced. Alternative lost-code/accessibility proof and comprehensive unsafe-return/exception workflows are restricted pending independent safety/governance work; there is no silent proof bypass.

Verification: original integrity baseline 5 pass; final affected regression **84 pass, 0 fail, 1 PostgreSQL skip (85 total)**; web/native typechecks pass; production build pass; Prettier pass; traceability 2 pass. Final full repository suite: **233 pass, 0 fail, 4 explicitly skipped PostgreSQL tests (237 total)**, recorded in docs/testing/order-tracking-all-tests-20261102.txt. Browser customer↔driver arrival and synthetic proof state synchronization passed without refresh. Missing handover failed; complete synthetic proof showed payment collected, not verified. Real driver session retained dedicated navigation and saw only assigned stops. No real cash or delivery was performed. Browser access to localhost:3004 was declined before remaining admin checks; no workaround attempted. Native device, tablet/full accessibility, production proxy/load, real process-kill and operator fallback acceptance remain unexecuted. Lint is NOT_TESTED because no lint script exists.

Traceability coverage: **20/31 applicable requirements verified locally**, all 32 IDs retained; only absent public-share-token feature is NOT_APPLICABLE. Partial/blocked/untested stay in denominators.

| Gate | Status | Reason |
|---|---|---|
| OT-G01 | PASS | Preflight recorded; local-only, unborn Git and unrelated changes preserved |
| OT-G02 | PASS | Canonical state contract, immutable versioned history and additive migration tested locally |
| OT-G03 | PASS | Owned snapshots/support, no public-token access; customer browser timeline verified |
| OT-G04 | BLOCKED | Local branch/capacity/stock checks pass; independent PostgreSQL assignment contention NOT_TESTED |
| OT-G05 | NOT_TESTED | Assigned driver web path verified, native compile passes; real device/offline lifecycle acceptance pending |
| OT-G06 | BLOCKED | Normal code/pickup/handover enforced locally; qualified physical safety and alternate-proof governance outstanding |
| OT-G07 | NOT_TESTED | Real authenticated stream revocation and browser updates pass; production proxy/load and durable delta-broker replay not certified |
| OT-G08 | NOT_TESTED | Atomic in-app outbox rollback/retry pass; actual worker process restart/deployed reliability unexecuted |
| OT-G09 | BLOCKED | Persistent outcome/stock/cash retry evidence passes locally; independent PostgreSQL failures/contention pending |
| OT-G10 | NOT_TESTED | Structured failure/help incidents and held-return restrictions implemented; qualified unsafe-return and comprehensive operational reconciliation acceptance pending |
| OT-G11 | BLOCKED | GPS/ETA disabled; no approved provider/privacy/retention/device activation and no connected collector |
| OT-G12 | NOT_TESTED | Customer/driver browser evidence exists; admin-origin access declined, mobile fix/tablet/keyboard/screen-reader acceptance incomplete |
| OT-G13 | BLOCKED | Web/native typecheck/build and affected suites pass; PostgreSQL/device/security/performance release gates and lint unavailable |
| OT-G14 | NOT_TESTED | Encrypted isolated restore/emergency stop pass; real manual fallback/owners/RPO/RTO and release rollback rehearsal unexecuted |

Remaining work/next actions: provide an explicitly disposable local PostgreSQL test target and execute TRK-17 (Docker daemon absent); perform qualified LPG/cylinder and alternate-proof/unsafe-return governance review; complete real-device queue/lifecycle and admin/tablet/accessibility checks when browser/device access is authorized; implement approved GPS/provider/privacy lifecycle before activation; exercise real worker crash/proxy load/manual fallback/restore/rollback with named owners and measured RPO/RTO; establish a reviewed source baseline. Structured failure taxonomy/severity/owner/next-action evidence is implemented; qualified unsafe-return reconciliation and alternative proof remain restricted. These are not silently excluded or claimed delivered.

Rollback: set EASYGAS_TRACKING_MUTATIONS_ENABLED=false and restart the affected runtime; retain read access and all immutable history/outcomes. Recover ambiguous writes using original operationKey; never delete audit/ledger rows or retry with a fresh identity to guess success. Keep additive migrations after committed business effects; use authorized compensation for changes. No Git reset is appropriate because the repository has no commit baseline. See the recovery runbook for backup/source compatibility and explicit operational limitations.

Documents: [preflight](../audits/easygas-order-tracking-preflight.md), [state machine](../architecture/order-delivery-state-machine.md), [events/live transport](../architecture/order-tracking-events-and-realtime.md), [permissions/privacy](../security/order-tracking-permissions-and-privacy.md), [operations/proof](../operations/dispatch-driver-proof-of-delivery.md), [recovery](../operations/order-tracking-recovery-runbook.md), [acceptance tests](../testing/order-tracking-acceptance-tests.md), [matrix](../traceability/order-tracking-rtm.md), [blocker/dependency register](order-tracking-blockers-and-tasks.md).

Phase source files (fingerprints in order-tracking-source-manifest.json; generated bootstrap contains no accounts/stock/business transactions):

- .env.example
- database/migrations/040_order_tracking.sql
- database/migrations/041_tracking_audit_hardening.sql
- database/migrations/042_tracking_support.sql
- database/bootstrap.sql
- apps/web/lib/order-tracking.ts
- apps/web/lib/tracking-stream.ts
- apps/web/lib/operations.ts
- apps/web/lib/delivery.ts
- apps/web/lib/service.ts
- apps/web/lib/db.ts
- apps/web/lib/business-operation.ts
- apps/web/lib/maintenance.ts
- apps/web/lib/refills.ts
- apps/web/components/order-tracking.tsx
- apps/web/components/site.tsx
- apps/web/components/admin.tsx
- apps/web/components/workflows.tsx
- apps/web/app/api/tracking/stream/route.ts
- apps/web/app/api/[action]/route.ts
- apps/web/app/theme.css
- apps/mobile/App.tsx
- apps/mobile/offline.ts
- packages/business-rules/src/order-tracking.ts
- scripts/export-bootstrap.ts
- scripts/prepare-tracking-qa.ts
- tests/order-tracking.test.ts
- tests/order-tracking-postgres.test.ts
- tests/helpers/order-tracking-fixture.ts
- tests/helpers/tracking-fixture.ts
- tests/integrity-regressions.test.ts
- tests/deployment.test.ts
- tests/shared-approval-gas.test.ts
- tests/platform.test.ts
- tests/commerce.test.ts

Final repository status: main still has no HEAD; root app/config/docs/database/tests remain untracked. Unrelated work preserved, no staged changes, no commits/push/deployment. Owned QA server stopped; normal 3003 server preserved.

Final custody hardening: held failed refill cylinders cannot be committed to another order through inspection or dispatch. TRK-07 covers a legacy held cross-order fixture and verifies rejected reissue preserves state/cash. apps/web/lib/gas-delivery.ts is included in the final source manifest.
