# Dependency-aware tasks, blockers and release decision

Production decision: **NO-GO unchanged**. Automatic assignment disabled. Existing financial/physical safety blockers, retain-all and historical Excel import hold preserved.

| Task / gate | Dependency or blocker | Work that can continue | Acceptance required |
|---|---|---|---|
| Hosted070 rollout | Fresh hosted backup, restore proof, explicit migration release procedure | Local reads/UI/tests and backwards-compatible schema | Staging restore/rollback and runtime restricted-role checks before deployment |
| Embedded map | Approved configured provider and privacy/operational-purpose acceptance | Real consented GPS age/accuracy list and map-free UI | Provider/device accuracy and stale/offline checks; no fake ETA |
| Driver foreground contact | Source implemented, native binary build explicitly deferred | Backend/API tests, mobile typecheck | Installed approved native client and device lifecycle verification |
| Driver proof/offline/report | Existing encrypted source retained; native camera/storage/device gates unexecuted | API ownership, immutable-history and negative regression checks | Real camera denial/interruption/reconnect/logout/device accessibility |
| Bulk/physical handover | Real inspections, calibrated meter, trained roles and measured custody | Synthetic concurrency/rollback tests and operator docs | R01–R05 physical acceptance and independent operations/safety sign-off |
| Fuel entry authority | Existing driver-only measured purchase workflow | Admin review of actual trip/fuel history | Do not grant administrator/driver mobile new financial privileges merely to imitate a button |
| Bulk queue action | No approved safe bulk-assignment transaction/UI | Individual guarded manual assignment | Separate design/version/capacity/race acceptance before adding batch writes |
| Large queue performance | Current selected-day projection materialises records; readiness probes bounded250 | Narrow branch/date/search filters with truthful unavailable readiness | Production-volume query plans, latency/locking and paged aggregation acceptance |
| Operational writes / notifications | Existing OFF release flags and approved provider/channel configuration | Read-only history and local isolated tests | Independent business/ops/finance/platform sign-offs, postcommit/replay/outage acceptance |

Dependencies are not permission to bypass checks. Unknown gates remain OPEN and stay in denominators. No native build, server provisioning, live dispatch, real stock or payment edit was performed in this phase. The latest UI is local source; hosted demo has not been redeployed by this phase.
