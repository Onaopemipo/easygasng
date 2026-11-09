# Dispatch Centre / existing driver integration — traceability

NO-GO unchanged; automatic assignment disabled; no native build/server provisioning; historical import hold preserved

17 requirements:1 audit verified,16 partial. All84 scenarios and26 gates retained; no not-applicable exclusions. Scenario evidence:69 bounded PASS,12 PARTIAL,3 native/device NOT_TESTED. Acceptance gates2/26 passed; independent release sign-offs remain outstanding. Critical requirements0/8 fully accepted. These are separate measures, not a production completion percentage.

[Machine-readable register](dispatch-driver-integration-rtm.json) · [Runbook](../dispatch-driver/05-operational-runbook.md) · [Evidence](../dispatch-driver/07-test-and-acceptance-evidence.md) · [Outstanding dependencies](../dispatch-driver/09-open-blockers-and-production-gates.md)

## DDI-R00 — Visual authority and preservation

P1 · PARTIAL · gate DDI-G03 · route /admin/deliveries; existing /admin/orders,/admin/operations and driver workspace

Implementation: [dispatch-centre.tsx](../../apps/web/components/dispatch-centre.tsx), [dispatch-centre.ts](../../apps/web/lib/dispatch-centre.ts), [dispatch-centre.ts](../../packages/business-rules/src/dispatch-centre.ts), [admin.tsx](../../apps/web/components/admin.tsx), [order-tracking.tsx](../../apps/web/components/order-tracking.tsx).

Authority: Approved screenshot plus protected navigation/customer/technician/driver source SHA256 baseline.

Controls: Role/branch/assignment scoping, guarded transactions/idempotency, retained safety blockers and OFF release flags.

Executed: DDI-AUDIT01. Evidence: [dispatch-final-tests.txt](../../docs/dispatch-driver/evidence/dispatch-final-tests.txt).

Existing canonical systems extended and bounded controls verified; no full-scope production or device acceptance claimed. Outstanding: See docs/dispatch-driver/09-open-blockers-and-production-gates.md; native/device, provider, large-queue performance and independent release acceptance remain in scope.

## DDI-R01 — Repository audit and baseline

P1 · VERIFIED_COMPLETE · gate DDI-G01 · route /admin/deliveries; existing /admin/orders,/admin/operations and driver workspace

Implementation: [01-repository-audit.md](../../docs/dispatch-driver/01-repository-audit.md), [preserved-files-baseline.json](../../docs/dispatch-driver/evidence/preserved-files-baseline.json).

Authority: Existing repository, package scripts, migration registry, baseline test/type/build logs.

Controls: Role/branch/assignment scoping, guarded transactions/idempotency, retained safety blockers and OFF release flags.

Executed: DDI-AUDIT01. Evidence: [dispatch-final-tests.txt](../../docs/dispatch-driver/evidence/dispatch-final-tests.txt), [baseline-tests.txt](../../docs/dispatch-driver/evidence/baseline-tests.txt), [baseline-web-types.txt](../../docs/dispatch-driver/evidence/baseline-web-types.txt), [baseline-mobile-types.txt](../../docs/dispatch-driver/evidence/baseline-mobile-types.txt), [baseline-build.txt](../../docs/dispatch-driver/evidence/baseline-build.txt).

Audit and443-test pre-edit baseline completed; protected-file hashes and bounded driver-source delta verified. Outstanding: Independent launch acceptance is outside audit completion; all prior gates retained.

## DDI-R02 — Shared canonical domain contracts

P1 · PARTIAL · gate DDI-G05 · route /admin/deliveries; existing /admin/orders,/admin/operations and driver workspace

Implementation: [dispatch-centre.ts](../../apps/web/lib/dispatch-centre.ts), [dispatch-centre.ts](../../packages/business-rules/src/dispatch-centre.ts), [order-tracking.ts](../../apps/web/lib/order-tracking.ts), [cylinder-allocation.ts](../../apps/web/lib/cylinder-allocation.ts), [forecast.ts](../../packages/business-rules/src/forecast.ts).

Authority: Existing orders, attempts, responses, invoices, users and shared business-rule DTO helpers.

Controls: Role/branch/assignment scoping, guarded transactions/idempotency, retained safety blockers and OFF release flags.

Executed: DDI-READ04, DDI-S060. Evidence: [dispatch-final-tests.txt](../../docs/dispatch-driver/evidence/dispatch-final-tests.txt), [final-serial-guard-tests.txt](../../docs/dispatch-driver/evidence/final-serial-guard-tests.txt).

Existing canonical systems extended and bounded controls verified; no full-scope production or device acceptance claimed. Outstanding: See docs/dispatch-driver/09-open-blockers-and-production-gates.md; native/device, provider, large-queue performance and independent release acceptance remain in scope.

## DDI-R03 — Dispatch header, updates and date

P1 · PARTIAL · gate DDI-G10 · route /admin/deliveries; existing /admin/orders,/admin/operations and driver workspace

Implementation: [dispatch-centre.tsx](../../apps/web/components/dispatch-centre.tsx), [dispatch-centre.ts](../../apps/web/lib/dispatch-centre.ts), [dispatch-centre.ts](../../packages/business-rules/src/dispatch-centre.ts).

Authority: Server observedAt; validated selected date; Africa/Lagos conversion; last successful client read.

Controls: Role/branch/assignment scoping, guarded transactions/idempotency, retained safety blockers and OFF release flags.

Executed: DDI-S016. Evidence: [dispatch-final-tests.txt](../../docs/dispatch-driver/evidence/dispatch-final-tests.txt).

Existing canonical systems extended and bounded controls verified; no full-scope production or device acceptance claimed. Outstanding: See docs/dispatch-driver/09-open-blockers-and-production-gates.md; native/device, provider, large-queue performance and independent release acceptance remain in scope.

## DDI-R04 — Six authoritative KPI cards

P1 · PARTIAL · gate DDI-G06 · route /admin/deliveries; existing /admin/orders,/admin/operations and driver workspace

Implementation: [dispatch-centre.tsx](../../apps/web/components/dispatch-centre.tsx), [dispatch-centre.ts](../../apps/web/lib/dispatch-centre.ts), [dispatch-centre.ts](../../packages/business-rules/src/dispatch-centre.ts), [forecast.ts](../../packages/business-rules/src/forecast.ts).

Authority: All scoped canonical orders/status/delivered_at; current users contact; no latest100/page-derived aggregate.

Controls: Role/branch/assignment scoping, guarded transactions/idempotency, retained safety blockers and OFF release flags.

Executed: DDI-KPI01, DDI-READ01. Evidence: [dispatch-final-tests.txt](../../docs/dispatch-driver/evidence/dispatch-final-tests.txt).

Existing canonical systems extended and bounded controls verified; no full-scope production or device acceptance claimed. Outstanding: See docs/dispatch-driver/09-open-blockers-and-production-gates.md; native/device, provider, large-queue performance and independent release acceptance remain in scope.

## DDI-R05 — Tabs, search, filters and paging

P1 · PARTIAL · gate DDI-G06 · route /admin/deliveries; existing /admin/orders,/admin/operations and driver workspace

Implementation: [dispatch-centre.tsx](../../apps/web/components/dispatch-centre.tsx), [dispatch-centre.ts](../../apps/web/lib/dispatch-centre.ts), [dispatch-centre.ts](../../packages/business-rules/src/dispatch-centre.ts), [order-tracking.tsx](../../apps/web/components/order-tracking.tsx).

Authority: Scoped orders/users/address, delivery_date/window, actual state, derived priority and stable created_at/id ordering.

Controls: Role/branch/assignment scoping, guarded transactions/idempotency, retained safety blockers and OFF release flags.

Executed: DDI-READ04. Evidence: [dispatch-final-tests.txt](../../docs/dispatch-driver/evidence/dispatch-final-tests.txt).

Existing canonical systems extended and bounded controls verified; no full-scope production or device acceptance claimed. Outstanding: See docs/dispatch-driver/09-open-blockers-and-production-gates.md; native/device, provider, large-queue performance and independent release acceptance remain in scope.

## DDI-R06 — Queue, eligibility and assignment drawer

P0 · PARTIAL · gate DDI-G07 · route /admin/deliveries; existing /admin/orders,/admin/operations and driver workspace

Implementation: [dispatch-centre.tsx](../../apps/web/components/dispatch-centre.tsx), [dispatch-centre.ts](../../apps/web/lib/dispatch-centre.ts), [dispatch-centre.ts](../../packages/business-rules/src/dispatch-centre.ts), [driver-operations.ts](../../apps/web/lib/driver-operations.ts), [order-tracking.ts](../../apps/web/lib/order-tracking.ts), [cylinder-allocation.ts](../../apps/web/lib/cylinder-allocation.ts), [order-tracking.tsx](../../apps/web/components/order-tracking.tsx), [forecast.ts](../../packages/business-rules/src/forecast.ts).

Authority: Canonical orders/attempt versions; active/available branch users; trip/vehicle, reserved stock/serials, net verified payment and approved COD.

Controls: Role/branch/assignment scoping, guarded transactions/idempotency, retained safety blockers and OFF release flags.

Executed: DDI-S024, DDI-S031, DDI-DECLINE01, DDI-S084, OPS-T07, TRK-04, TRK-17, DISP-CUSTODY01, DDI-S060. Evidence: [dispatch-final-tests.txt](../../docs/dispatch-driver/evidence/dispatch-final-tests.txt), [final-tests.txt](../../docs/dispatch-driver/evidence/final-tests.txt), [final-serial-guard-tests.txt](../../docs/dispatch-driver/evidence/final-serial-guard-tests.txt).

Existing canonical systems extended and bounded controls verified; no full-scope production or device acceptance claimed. Outstanding: See docs/dispatch-driver/09-open-blockers-and-production-gates.md; native/device, provider, large-queue performance and independent release acceptance remain in scope.

## DDI-R07 — Real location/map fallback and drivers

P1 · PARTIAL · gate DDI-G10 · route /admin/deliveries; existing /admin/orders,/admin/operations and driver workspace

Implementation: [dispatch-centre.tsx](../../apps/web/components/dispatch-centre.tsx), [dispatch-centre.ts](../../apps/web/lib/dispatch-centre.ts), [dispatch-centre.ts](../../packages/business-rules/src/dispatch-centre.ts), [trip-metrics.ts](../../packages/business-rules/src/trip-metrics.ts).

Authority: Consented active matching-branch driver_trips/trip_events with capture/receipt/accuracy; users.driver_last_seen_at.

Controls: Role/branch/assignment scoping, guarded transactions/idempotency, retained safety blockers and OFF release flags.

Executed: DDI-CONTACT01. Evidence: [dispatch-final-tests.txt](../../docs/dispatch-driver/evidence/dispatch-final-tests.txt).

Existing canonical systems extended and bounded controls verified; no full-scope production or device acceptance claimed. Outstanding: See docs/dispatch-driver/09-open-blockers-and-production-gates.md; native/device, provider, large-queue performance and independent release acceptance remain in scope.

## DDI-R08 — Actual LPG operations and quick actions

P1 · PARTIAL · gate DDI-G19 · route /admin/deliveries; existing /admin/orders,/admin/operations and driver workspace

Implementation: [dispatch-centre.tsx](../../apps/web/components/dispatch-centre.tsx), [dispatch-centre.ts](../../apps/web/lib/dispatch-centre.ts), [dispatch-centre.ts](../../packages/business-rules/src/dispatch-centre.ts), [operations-completion.tsx](../../apps/web/components/operations-completion.tsx), [vehicle-manifest-panel.tsx](../../apps/web/components/vehicle-manifest-panel.tsx).

Authority: bulk_lpg_loads/allocations/events and doorstep_execution/cylinder_lines; measured returned mass and held state.

Controls: Role/branch/assignment scoping, guarded transactions/idempotency, retained safety blockers and OFF release flags.

Executed: DDI-MASS01. Evidence: [dispatch-final-tests.txt](../../docs/dispatch-driver/evidence/dispatch-final-tests.txt).

Existing canonical systems extended and bounded controls verified; no full-scope production or device acceptance claimed. Outstanding: See docs/dispatch-driver/09-open-blockers-and-production-gates.md; native/device, provider, large-queue performance and independent release acceptance remain in scope.

## DDI-R09 — Existing driver app integration and acknowledgements

P0 · PARTIAL · gate DDI-G08 · route /admin/deliveries; existing /admin/orders,/admin/operations and driver workspace

Implementation: [DriverWorkspace.tsx](../../apps/mobile/DriverWorkspace.tsx), [driver-workspace.ts](../../apps/web/lib/driver-workspace.ts), [driver-operations.ts](../../apps/web/lib/driver-operations.ts), [070_driver_contact.sql](../../database/migrations/070_driver_contact.sql), [db.ts](../../apps/web/lib/db.ts), [export-bootstrap.ts](../../scripts/export-bootstrap.ts), [bootstrap.sql](../../database/bootstrap.sql).

Authority: Existing driver identity/restricted session, dispatch_responses and nullable070 foreground contact metadata.

Controls: Role/branch/assignment scoping, guarded transactions/idempotency, retained safety blockers and OFF release flags.

Executed: DDI-CONTACT01, OPS-T07, DR-INTEGRATION-01. Evidence: [dispatch-final-tests.txt](../../docs/dispatch-driver/evidence/dispatch-final-tests.txt), [final-tests.txt](../../docs/dispatch-driver/evidence/final-tests.txt).

Existing canonical systems extended and bounded controls verified; no full-scope production or device acceptance claimed. Outstanding: See docs/dispatch-driver/09-open-blockers-and-production-gates.md; native/device, provider, large-queue performance and independent release acceptance remain in scope.

## DDI-R10 — Immutable proof/report and encrypted offline behaviour

P0 · PARTIAL · gate DDI-G11 · route /admin/deliveries; existing /admin/orders,/admin/operations and driver workspace

Implementation: [DriverProof.tsx](../../apps/mobile/DriverProof.tsx), [DriverPhotoHistory.tsx](../../apps/mobile/DriverPhotoHistory.tsx), [field-queue.ts](../../apps/mobile/field-queue.ts), [delivery-photos.ts](../../apps/web/lib/delivery-photos.ts).

Authority: Canonical private delivery photos, order/attempt binding, durable history; encrypted per-user field queue and retain-all policy.

Controls: Role/branch/assignment scoping, guarded transactions/idempotency, retained safety blockers and OFF release flags.

Executed: OPS-T04, OPS-T10, OPS-T11, DDI-PHOTO01. Evidence: [targeted-tests.txt](../../docs/dispatch-driver/evidence/targeted-tests.txt), [final-tests.txt](../../docs/dispatch-driver/evidence/final-tests.txt), [final-private-photo-tests.txt](../../docs/dispatch-driver/evidence/final-private-photo-tests.txt), [final-dispatch-followup.txt](../../docs/dispatch-driver/evidence/final-dispatch-followup.txt).

Existing canonical systems extended and bounded controls verified; no full-scope production or device acceptance claimed. Outstanding: See docs/dispatch-driver/09-open-blockers-and-production-gates.md; native/device, provider, large-queue performance and independent release acceptance remain in scope.

## DDI-R11 — Manual recommendations and safe reassignment

P0 · PARTIAL · gate DDI-G17 · route /admin/deliveries; existing /admin/orders,/admin/operations and driver workspace

Implementation: [driver-operations.ts](../../apps/web/lib/driver-operations.ts), [fleet-constraints.ts](../../apps/web/lib/fleet-constraints.ts), [order-tracking.ts](../../apps/web/lib/order-tracking.ts), [cylinder-allocation.ts](../../apps/web/lib/cylinder-allocation.ts).

Authority: Existing orders/driver_trips/vehicles, current gas demand and supplementary physical custody; expiring route estimate records.

Controls: Role/branch/assignment scoping, guarded transactions/idempotency, retained safety blockers and OFF release flags.

Executed: DDI-S024, DDI-S031, DDI-DECLINE01, DDI-S084, TRK-09, DISP-CUSTODY01, DDI-S060. Evidence: [dispatch-final-tests.txt](../../docs/dispatch-driver/evidence/dispatch-final-tests.txt), [final-tests.txt](../../docs/dispatch-driver/evidence/final-tests.txt), [final-serial-guard-tests.txt](../../docs/dispatch-driver/evidence/final-serial-guard-tests.txt).

Existing canonical systems extended and bounded controls verified; no full-scope production or device acceptance claimed. Outstanding: See docs/dispatch-driver/09-open-blockers-and-production-gates.md; native/device, provider, large-queue performance and independent release acceptance remain in scope.

## DDI-R12 — Custody, supplements, single-visit fee and returns

P0 · PARTIAL · gate DDI-G19 · route /admin/deliveries; existing /admin/orders,/admin/operations and driver workspace

Implementation: [bulk-lpg.ts](../../apps/web/lib/bulk-lpg.ts), [vehicle-products.ts](../../apps/web/lib/vehicle-products.ts), [doorstep-execution.ts](../../apps/web/lib/doorstep-execution.ts), [gas-delivery.ts](../../apps/web/lib/gas-delivery.ts), [cylinder-allocation.ts](../../apps/web/lib/cylinder-allocation.ts).

Authority: Existing branch/vehicle inclusive mass and physical product custody, serials, same-order amendments, customer consent, invoice/payment records.

Controls: Role/branch/assignment scoping, guarded transactions/idempotency, retained safety blockers and OFF release flags.

Executed: BULK-PG01, DDI-S060. Evidence: [postgres-tests.txt](../../docs/dispatch-driver/evidence/postgres-tests.txt), [final-tests.txt](../../docs/dispatch-driver/evidence/final-tests.txt), [final-serial-guard-tests.txt](../../docs/dispatch-driver/evidence/final-serial-guard-tests.txt).

Existing canonical systems extended and bounded controls verified; no full-scope production or device acceptance claimed. Outstanding: See docs/dispatch-driver/09-open-blockers-and-production-gates.md; native/device, provider, large-queue performance and independent release acceptance remain in scope.

## DDI-R13 — Trips/fuel provenance and finance boundaries

P0 · PARTIAL · gate DDI-G22 · route /admin/deliveries; existing /admin/orders,/admin/operations and driver workspace

Implementation: [driver-operations.ts](../../apps/web/lib/driver-operations.ts), [order-tracking.ts](../../apps/web/lib/order-tracking.ts), [invoice-corrections.ts](../../apps/web/lib/invoice-corrections.ts).

Authority: invoiceBalance over verified_payments and approved refunds, immutable invoices/corrections; trip_events odometer/GPS/fuel receipts.

Controls: Role/branch/assignment scoping, guarded transactions/idempotency, retained safety blockers and OFF release flags.

Executed: DDI-PAY01, DDI-PAY02, OPS-T03, OPS-PG01. Evidence: [dispatch-final-tests.txt](../../docs/dispatch-driver/evidence/dispatch-final-tests.txt), [final-tests.txt](../../docs/dispatch-driver/evidence/final-tests.txt), [final-finance-guard-tests.txt](../../docs/dispatch-driver/evidence/final-finance-guard-tests.txt).

Existing canonical systems extended and bounded controls verified; no full-scope production or device acceptance claimed. Legacy invoice-less payment also uses the same net verified-payment/refund calculation, with no new financial records. Outstanding: See docs/dispatch-driver/09-open-blockers-and-production-gates.md; native/device, provider, large-queue performance and independent release acceptance remain in scope.

## DDI-R14 — RBAC, branch privacy, realtime and recovery

P0 · PARTIAL · gate DDI-G23 · route /admin/deliveries; existing /admin/orders,/admin/operations and driver workspace

Implementation: [dispatch-centre.tsx](../../apps/web/components/dispatch-centre.tsx), [dispatch-centre.ts](../../apps/web/lib/dispatch-centre.ts), [dispatch-centre.ts](../../packages/business-rules/src/dispatch-centre.ts), [service.ts](../../apps/web/lib/service.ts), [route.ts](../../apps/web/app/api/[action]/route.ts), [tracking-stream.ts](../../apps/web/lib/tracking-stream.ts), [cylinder-allocation.ts](../../apps/web/lib/cylinder-allocation.ts), [order-tracking.tsx](../../apps/web/components/order-tracking.tsx).

Authority: Current authenticated actor role/branch/assignment, private schema/RLS, current trip consent/purpose, postcommit outbox.

Controls: Role/branch/assignment scoping, guarded transactions/idempotency, retained safety blockers and OFF release flags.

Executed: DDI-READ04, TRK-20, TRK-20S, DDI-S060, DDI-PHOTO01. Evidence: [dispatch-final-tests.txt](../../docs/dispatch-driver/evidence/dispatch-final-tests.txt), [final-tests.txt](../../docs/dispatch-driver/evidence/final-tests.txt), [final-serial-guard-tests.txt](../../docs/dispatch-driver/evidence/final-serial-guard-tests.txt), [final-private-photo-tests.txt](../../docs/dispatch-driver/evidence/final-private-photo-tests.txt), [final-dispatch-followup.txt](../../docs/dispatch-driver/evidence/final-dispatch-followup.txt).

Existing canonical systems extended and bounded controls verified; no full-scope production or device acceptance claimed. Outstanding: See docs/dispatch-driver/09-open-blockers-and-production-gates.md; native/device, provider, large-queue performance and independent release acceptance remain in scope.

## DDI-R15 — Accessibility, responsive and dark mode

P1 · PARTIAL · gate DDI-G24 · route /admin/deliveries; existing /admin/orders,/admin/operations and driver workspace

Implementation: [dispatch-centre.tsx](../../apps/web/components/dispatch-centre.tsx), [globals.css](../../apps/web/app/globals.css).

Authority: Existing theme variables and scoped CSS; actual DOM text/font widths at desktop/tablet/phone; keyboard interactions.

Controls: Role/branch/assignment scoping, guarded transactions/idempotency, retained safety blockers and OFF release flags.

Executed: bounded manual/source review; complete acceptance remains open. Evidence: [dispatch-final-tests.txt](../../docs/dispatch-driver/evidence/dispatch-final-tests.txt).

Existing canonical systems extended and bounded controls verified; no full-scope production or device acceptance claimed. Outstanding: See docs/dispatch-driver/09-open-blockers-and-production-gates.md; native/device, provider, large-queue performance and independent release acceptance remain in scope.

## DDI-R16 — Rollback, evidence and independent sign-off

P0 · PARTIAL · gate DDI-G25 · route /admin/deliveries; existing /admin/orders,/admin/operations and driver workspace

Implementation: [06-migrations-and-rollback.md](../../docs/dispatch-driver/06-migrations-and-rollback.md), [07-test-and-acceptance-evidence.md](../../docs/dispatch-driver/07-test-and-acceptance-evidence.md), [09-open-blockers-and-production-gates.md](../../docs/dispatch-driver/09-open-blockers-and-production-gates.md), [db.ts](../../apps/web/lib/db.ts), [070_driver_contact.sql](../../database/migrations/070_driver_contact.sql), [export-bootstrap.ts](../../scripts/export-bootstrap.ts), [bootstrap.sql](../../database/bootstrap.sql).

Authority: Pre070 isolated snapshot/restore, additive070 explicit managed migration, local PostgreSQL recovery/role/worker evidence and independent gate register.

Controls: Role/branch/assignment scoping, guarded transactions/idempotency, retained safety blockers and OFF release flags.

Executed: PR-03, PR-04. Evidence: [postgres-recovery-tests.txt](../../docs/dispatch-driver/evidence/postgres-recovery-tests.txt), [final-tests.txt](../../docs/dispatch-driver/evidence/final-tests.txt).

Existing canonical systems extended and bounded controls verified; no full-scope production or device acceptance claimed. Outstanding: See docs/dispatch-driver/09-open-blockers-and-production-gates.md; native/device, provider, large-queue performance and independent release acceptance remain in scope.

## All84 approved scenarios

PASS means the named bounded evidence passed, not independent physical/native/production approval. Partial and untested records remain in the denominator.

| ID | Scenario | Status | Executed evidence / reason |
|---|---|---|---|
| DDI-S001 | sidebar unchanged | PASS | DDI-AUDIT01; dispatch-final-tests.txt: sidebar SHA256 preserved |
| DDI-S002 | routes preserved | PARTIAL | Build and RM-01–13 preserve29 route destinations and navigation; all29 independent browser workflows are not certified. |
| DDI-S003 | shared auth | PASS | RM-07,10,11: existing shared authentication/current role/branch/session checks; final-tests.txt |
| DDI-S004 | customer checkout regression | PASS | Commerce wallet/COD checkout regressions; new-controls-tests.txt |
| DDI-S005 | minimal driver home | PASS | DDI-AUDIT01: driver source identical after removing only heartbeat call |
| DDI-S006 | technician regression | PASS | DDI-AUDIT01: technician workspace SHA256 unchanged |
| DDI-S007 | stock balances retained | PASS | TRK-15/TRK-31/BULK-PG01: canonical stock effects and restored histories preserved; final-tests.txt |
| DDI-S008 | finance balances retained | PASS | OPS-T02/TRK-15/PAY-PG-CONCURRENCY: immutable/net financial records and one committed posting; final-tests.txt |
| DDI-S009 | migration imports retained | PARTIAL | Existing incremental migration and bootstrap regressions pass; actual historical Excel import remains held and unapproved. |
| DDI-S010 | no screenshot fixture data | PASS | DDI-READ01/DDI-READ03: counts from canonical isolated records, no screenshot constants |
| DDI-S011 | zero orders | PASS | DDI-READ03: empty date gives zeros, unknown contact explicit |
| DDI-S012 | loading | PASS | UI-LOAD01: initial AX snapshot shows dashes/loading, not fabricated zero operations |
| DDI-S013 | API failure | PASS | UI-OUTAGE01: isolated server stopped; Updates unavailable and prior count1 retained; refresh-outage.png |
| DDI-S014 | stale updates | PASS | UI-OUTAGE01: last-success time retained and refresh recovered after restart |
| DDI-S015 | KPI consistency | PASS | DDI-READ01/DDI-KPI01/DDI-DECLINE01: scoped complete/page-independent/date/exception counts; dispatch-final-tests.txt |
| DDI-S016 | Lagos date boundary | PASS | DDI-S016/DDI-KPI01: Lagos UTC+1 boundary and actual delivery date |
| DDI-S017 | branch filter | PASS | DDI-READ02/DDI-READ04: authorised branch filters |
| DDI-S018 | search scoping | PASS | DDI-READ02/DDI-READ04: literal scoped search and IDOR denial |
| DDI-S019 | pagination | PASS | DDI-READ01:106-record full regression plus261-record capped-readiness follow-up; page53 returns final record and complete totals; final-tests.txt/final-dispatch-followup.txt |
| DDI-S020 | tab/filter persistence | PASS | UI-FILTER01: search no synthetic match retained across Live tab; search-tab-empty.png |
| DDI-S021 | valid assignment | PASS | OPS-T07: eligible active-trip manual assignment commits assigned attempt and acknowledgement; final-tests.txt |
| DDI-S022 | unauthorised branch | PASS | TRK-04/TRK-20: branch mismatch rejected without business effects; final-tests.txt |
| DDI-S023 | inactive branch | PASS | TRK-04: inactive dispatch branch fails with unchanged business effects; final-tests.txt |
| DDI-S024 | unavailable driver | PASS | DDI-S024/DDI-S024B: legacy and enhanced unavailable-driver negatives |
| DDI-S025 | vehicle capacity | PASS | DISP-CUSTODY01: extra vehicle LPG included in recommendation and final capacity guard; final-tests.txt |
| DDI-S026 | assignment race | PASS | TRK-17: independent PostgreSQL final-slot competition and duplicate proof serialization; final-tests.txt |
| DDI-S027 | authorised override | PARTIAL | OPS-T07 proves authorised manual selection; no bypass of physical/payment safety is permitted and no distinct unsafe override flow introduced. |
| DDI-S028 | unauthorised override | PASS | OPS-T07: customer dispatch.assign is rejected; final-tests.txt |
| DDI-S029 | override reason audit | PASS | OPS-T07 exact dispatch.routing_basis.detail.reason assertion; final-trip-audit-tests.txt |
| DDI-S030 | reassignment capacity | PASS | TRK-09: reassignment/rescheduling recheck capacity without reservation changes; final-tests.txt |
| DDI-S031 | expired acceptance | PASS | DDI-S031: expired assignment acknowledgement has no response effect |
| DDI-S032 | revoked driver | PASS | TRK-20: revoked/moved session cannot read or mutate prior assignment; final-tests.txt |
| DDI-S033 | accept | PASS | OPS-T07: current acknowledged response persisted after escalation; final-tests.txt |
| DDI-S034 | decline | PASS | DDI-DECLINE01: decline appears in Exceptions and repeats retain one response |
| DDI-S035 | decline reason | PASS | DDI-DECLINE01: canonical reason recorded (API source); no fabricated decline event |
| DDI-S036 | status progression | PASS | TRK-11/TRK-15: valid pickup/status/proof-backed handover uses canonical sequence; final-tests.txt |
| DDI-S037 | skipped transition | PASS | TRK-04/DR-BOUNDARY-02: skipped and invented transitions rejected; final-tests.txt |
| DDI-S038 | stale version | PASS | TRK-09/OPS-T07: stale state/assignment version rejected; final-tests.txt |
| DDI-S039 | idempotent status | PASS | TRK-15: stable retry and lost acknowledgement yield one event/business effect; final-tests.txt |
| DDI-S040 | notify after commit | PASS | TRK-18: committed outbox publication retries without duplicate in-app messages; final-tests.txt (external delivery not certified) |
| DDI-S041 | reconnect replay | PARTIAL | TRK-15 proves backend idempotent recovery; installed-native reconnect replay remains untested. |
| DDI-S042 | offline truthfulness | PARTIAL | UI-OUTAGE01 proves admin stale snapshot; native offline lifecycle acceptance remains untested. |
| DDI-S043 | own orders only | PASS | TRK-20: unrelated driver/moved branch cannot read assignment; final-tests.txt |
| DDI-S044 | admin branch scope | PASS | DDI-READ04: moved dispatcher cannot read prior-branch order/candidates |
| DDI-S045 | camera success | NOT_TESTED | Related canonical regression evidence retained in07; this exact full scenario has not been independently accepted. Device/physical/provider/staging checks remain pending and are not removed. |
| DDI-S046 | camera denied | NOT_TESTED | Related canonical regression evidence retained in07; this exact full scenario has not been independently accepted. Device/physical/provider/staging checks remain pending and are not removed. |
| DDI-S047 | invalid file | PASS | OPS-T04: invalid/active image input rejected; final-tests.txt |
| DDI-S048 | interrupted upload | PARTIAL | API proof validation/replay checks pass; real native interrupted upload/object-storage outage acceptance remains open. |
| DDI-S049 | same-key photo retry | PASS | OPS-T04: repeated same proof returns same ID, one retained photo; final-tests.txt |
| DDI-S050 | order-bound photo | PASS | OPS-T04: bound order/attempt/driver photo rejects unrelated customer; final-tests.txt |
| DDI-S051 | historical evidence | PASS | OPS-T11: retain-all preserves expired proof bytes and history without widening access; final-tests.txt |
| DDI-S052 | latest evidence pointer | PASS | DDI-PHOTO01: two canonical completed deliveries update customer latest proof; expired authenticated media URL404, foreign/anonymous denied, old bytes/history retained; final-private-photo-tests.txt and final-dispatch-followup.txt |
| DDI-S053 | report fields | PARTIAL | Existing canonical driver proof/report path retained; full driver report-required-field device acceptance remains open. |
| DDI-S054 | proof prerequisite | PARTIAL | Restricted completion/legacy-denial guards pass; exact installed-native missing-photo completion acceptance remains open. |
| DDI-S055 | offline conflict | PARTIAL | Backend stale/version and encrypted queue controls pass; actual device sync-conflict replay remains open. |
| DDI-S056 | logout queue safety | PARTIAL | Encrypted per-user queue source retained and tamper tests pass; real device logout cleanup/key-access acceptance remains open. |
| DDI-S057 | mass conversion | PASS | DDI-MASS01: canonical10000grams; UI explicit /1000kg conversion |
| DDI-S058 | load custody reservation | PASS | BULK-01/BULK-PG01: loading reserves buffer, independent acknowledgement and duplicate-load serialization; final-tests.txt |
| DDI-S059 | no stock double count | PASS | DDI-MASS01: inclusive branch stock not added to vehicle custody |
| DDI-S060 | serial missing | PASS | DDI-S060 red serial-before.txt → green final-serial-guard-tests.txt: missing reserved serials block assignment with no attempt/state effects |
| DDI-S061 | inspection missing | PARTIAL | Existing inspection/custody controls retained; exact independent uninspected-dispatch/physical acceptance remains open. |
| DDI-S062 | no reissue before return | PASS | TRK-27/TRK-07: failed held custody cannot be reissued without return; final-tests.txt |
| DDI-S063 | valid return | PASS | TRK-27/BULK-01: authorised measured return reconciles canonical custody; final-tests.txt (physical acceptance still open) |
| DDI-S064 | single delivery fee supplement | PASS | DOOR-01/DOOR-PRODUCT01: original visit shares one delivery fee and supplement obligation; final-tests.txt |
| DDI-S065 | insufficient vehicle stock | PASS | DOOR-03: insufficient physical buffer and unsafe ownership reject without custody effects; final-tests.txt |
| DDI-S066 | unpaid supplement | PASS | BULK-03/DOOR-01: invoice/payment conditions precede actual metered fulfilment; final-tests.txt |
| DDI-S067 | amendment replay | PASS | DOOR-PG01: duplicate reservation/verification/dispensing serializes; final-tests.txt |
| DDI-S068 | reconciliation mismatch | PASS | BULK-02: measured return mismatch holds custody/closure without invented adjustment; final-tests.txt |
| DDI-S069 | valid odometer | PASS | OPS-T03: measured100→110 odometer retained, estimate separate from actual receipt; final-tests.txt |
| DDI-S070 | negative distance | PASS | OPS-T03 exact endOdometer99<start100 rejection; final-trip-audit-tests.txt |
| DDI-S071 | overlapping trip | PASS | OPS-PG01: independent connections serialize vehicle trip ownership; final-tests.txt |
| DDI-S072 | fuel receipt once | PASS | OPS-T03 retries actual fuel event and asserts one fuel record; final-trip-audit-tests.txt |
| DDI-S073 | redirect not payment | PASS | DDI-PAY01: misleading cached paid status cannot authorise dispatch; provider redirect tests retained |
| DDI-S074 | payment still requires safety | PASS | Commerce prepaid wallet delivery regression: verified principal permits only canonical pickup/handover, no cash collected; final-finance-guard-tests.txt |
| DDI-S075 | IDOR | PASS | DDI-READ04/TRK-20/OPS-T04: cross-branch order/candidate/private-proof IDOR rejected; final-tests.txt |
| DDI-S076 | subscription branch scope | PASS | TRK-20S/RM-07: authenticated subscription scope/revocation revalidated; final-tests.txt |
| DDI-S077 | expired image URL | PASS | DDI-PHOTO01: two canonical completed deliveries update customer latest proof; expired authenticated media URL404, foreign/anonymous denied, old bytes/history retained; final-private-photo-tests.txt and final-dispatch-followup.txt |
| DDI-S078 | audit retention | PARTIAL | Existing immutable history/audit and protected-operation tests pass; exact full dispatch audit-field acceptance remains open. |
| DDI-S079 | transaction rollback | PASS | BULK-PG01/DOOR-PG01/MANIFEST-PG01: forced transaction rollback preserves stock/custody; final-tests.txt |
| DDI-S080 | worker replay | PASS | TRK-18/PR-08: committed notification replay and supervised worker restart retain one effect; final-tests.txt |
| DDI-S081 | native accessibility | NOT_TESTED | Related canonical regression evidence retained in07; this exact full scenario has not been independently accepted. Device/physical/provider/staging checks remain pending and are not removed. |
| DDI-S082 | desktop/tablet responsive | PASS | UI-RESP01: desktop1561/tablet768/phone390, document width matches viewport; screenshots and ui-verification.json |
| DDI-S083 | dark theme | PASS | UI-THEME01: light/dark contrast and pagination footer reviewed; screenshots |
| DDI-S084 | production flags safe | PASS | DDI-S084: production requires both explicit approvals; automatic assignment remains false |

## All26 acceptance gates

| ID | Status | Reason |
|---|---|---|
| DDI-G01 | PASS | Pre-edit audit,443-test baseline, types/build and ownership matrix recorded before source edits. |
| DDI-G02 | OPEN | OPEN: full independent operational acceptance not supplied; bounded automated/local evidence does not pass this gate by assumption. |
| DDI-G03 | PASS | Protected navigation hashes unchanged; existing29-route/navigation tests and build retained. No menu label/group/role/collapse changes. |
| DDI-G04 | OPEN | OPEN: full independent operational acceptance not supplied; bounded automated/local evidence does not pass this gate by assumption. |
| DDI-G05 | OPEN | OPEN: full independent operational acceptance not supplied; bounded automated/local evidence does not pass this gate by assumption. |
| DDI-G06 | OPEN | OPEN: full independent operational acceptance not supplied; bounded automated/local evidence does not pass this gate by assumption. |
| DDI-G07 | OPEN | OPEN: full independent operational acceptance not supplied; bounded automated/local evidence does not pass this gate by assumption. |
| DDI-G08 | OPEN | OPEN: full independent operational acceptance not supplied; bounded automated/local evidence does not pass this gate by assumption. |
| DDI-G09 | OPEN | OPEN: full independent operational acceptance not supplied; bounded automated/local evidence does not pass this gate by assumption. |
| DDI-G10 | OPEN | OPEN: full independent operational acceptance not supplied; bounded automated/local evidence does not pass this gate by assumption. |
| DDI-G11 | OPEN | OPEN: full independent operational acceptance not supplied; bounded automated/local evidence does not pass this gate by assumption. |
| DDI-G12 | OPEN | OPEN: full independent operational acceptance not supplied; bounded automated/local evidence does not pass this gate by assumption. |
| DDI-G13 | OPEN | OPEN: full independent operational acceptance not supplied; bounded automated/local evidence does not pass this gate by assumption. |
| DDI-G14 | OPEN | OPEN: full independent operational acceptance not supplied; bounded automated/local evidence does not pass this gate by assumption. |
| DDI-G15 | OPEN | OPEN: full independent operational acceptance not supplied; bounded automated/local evidence does not pass this gate by assumption. |
| DDI-G16 | OPEN | OPEN: full independent operational acceptance not supplied; bounded automated/local evidence does not pass this gate by assumption. |
| DDI-G17 | OPEN | OPEN: full independent operational acceptance not supplied; bounded automated/local evidence does not pass this gate by assumption. |
| DDI-G18 | OPEN | OPEN: full independent operational acceptance not supplied; bounded automated/local evidence does not pass this gate by assumption. |
| DDI-G19 | OPEN | OPEN: full independent operational acceptance not supplied; bounded automated/local evidence does not pass this gate by assumption. |
| DDI-G20 | OPEN | OPEN: full independent operational acceptance not supplied; bounded automated/local evidence does not pass this gate by assumption. |
| DDI-G21 | OPEN | OPEN: full independent operational acceptance not supplied; bounded automated/local evidence does not pass this gate by assumption. |
| DDI-G22 | OPEN | OPEN: full independent operational acceptance not supplied; bounded automated/local evidence does not pass this gate by assumption. |
| DDI-G23 | OPEN | OPEN: full independent operational acceptance not supplied; bounded automated/local evidence does not pass this gate by assumption. |
| DDI-G24 | OPEN | OPEN: full independent operational acceptance not supplied; bounded automated/local evidence does not pass this gate by assumption. |
| DDI-G25 | OPEN | OPEN: full independent operational acceptance not supplied; bounded automated/local evidence does not pass this gate by assumption. |
| DDI-G26 | OPEN | OPEN: full independent operational acceptance not supplied; bounded automated/local evidence does not pass this gate by assumption. |
