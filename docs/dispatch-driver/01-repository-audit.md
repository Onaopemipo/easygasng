# Dispatch Centre and existing driver integration — repository preflight

9 November 2026. Existing repository, unborn main, no HEAD; entire application is untracked user work. No reset/clean/rebuild of working modules authorised. Captured status and preservation hashes in evidence. No lint script exists. Web/mobile baseline typechecks and production webpack build pass; full baseline suite completed before source implementation:443 total,424passed,19skipped,0failed (`evidence/baseline-tests.txt`). No mobile build or server provisioning in this phase.

## Existing ownership and reuse

| Capability / route | Existing implementation and authority | Classification / action |
| --- | --- | --- |
| Grouped shell, 29 routes | admin.tsx, admin-navigation.tsx; business-rules/admin-navigation.ts | Preserve grouping/order/roles/footer/collapse; hash baseline |
| /admin/deliveries | order-tracking.tsx DispatchTracking, OperationsExtensions | Redesign workspace only; retain driver web view and all existing operational forms in secondary views |
| /admin/orders /inventory /cylinders /operations | Existing admin/stock/cylinder/workflow modules | Preserve URLs and records; link/reuse rather than duplicate |
| Orders / delivery assignment/events | operations.ts, order-tracking.ts, driver-operations.ts; orders, order_events, delivery_attempts, dispatch_responses | Canonical state and exactly-once business operations already exist |
| Driver Home/Orders/History/Profile | mobile/DriverWorkspace.tsx, DriverPhoto, DriverProof, DriverPhotoHistory; shared auth | Preserve approved minimal presentation and quick actions; source integration only |
| Customer/technician | Existing independent workspaces and restricted-session modules | No redesign or privilege changes |
| LPG / physical custody / supplements | bulk-lpg, vehicle-products, doorstep-execution, cylinder-allocation, fleet-constraints | Canonical mass/serial ledgers and governed recovery; never bypass safety |
| Trips/fuel/location | driver-operations; driver_trips, trip_events; trip-metrics and encrypted field queue | Reuse measured provenance; late-uploaded old GPS must not become current |
| Realtime / notifications | tracking SSE with per-heartbeat revalidation; order_event_outbox, notification/message workers | Reuse versioned orders, conservative polling for aggregated dashboard; no fake WebSocket connection |
| Payment / invoices | verified_payments, customer_invoices, invoice_notes, Paystack service | No fee/policy changes; verified ledger or explicitly approved COD exception only |
| Photo storage/history | delivery-photos, private media delivery; append-only history and encrypted drafts | Preserve order+attempt binding and retention; unknown device/security gates stay open |
| Platform | Next16.4.3/React19.2 web; Expo58/RN0.88 mobile; TS; raw parameterised PostgreSQL/PGlite adapter | No ORM, no replacement backend, no duplicate DB |
| Schema | migrations001–069, explicit managed migrations; roles/RLS and immutable record triggers | Presence is a proven gap; additive070 proposal only after documented compatibility/restore approach |

## Findings and safety boundaries

- Current dispatch presentation derives statistics from `/orders` capped at100. Cannot be called a complete business aggregate. Add a scoped aggregate/paged read contract.
- Availability is persisted, but enhanced/legacy assignment checks do not consistently reject `driver_available=false`. Fix canonical assignment paths and recommendations, including reassignments, without allowing online/GPS to substitute for availability.
- No durable driver contact heartbeat exists. Add separate last-contact metadata; never overload availability timestamp or captured GPS time.
- Existing delivery_code_expires_at is the24-hour authorisation authority. Preserve old unacknowledged-attempt escalation and reject acknowledgement after that authorisation expires; no invented10-minute deadline.
- No approved map tile/embed provider is configured. Real authorised location list and external map links are possible; embedded map must be explicitly unavailable, no invented map/ETA/pins.
- R01 serial/inspection, R02 branch checkout, R03 inactive branches, R04 capacity, R05 custody/reissue checks exist in canonical modules and targeted tests. They must pass; read UI may expose blockers, never assert cleared by route existence.
- Manual COD is an existing explicitly governed exception (`payment.cod`); label it Approved COD, never Paid. Other unpaid obligations block dispatch.
- Existing production field/bulk/tracking/doorstep flags are OFF and stay OFF. Auto-assignment is hardcoded OFF and stays OFF. No real assignments, external messages, live Paystack, physical inspection assertions or ledger edits authorised.
- Device/photo/offline/provider/restore and independent operational sign-off remain separate gates. Production NO-GO and historical import hold are unchanged.

## Dependency-aware execution

Baseline → scoped contracts/readiness definitions → safety guards and additive presence metadata → read aggregates/candidates → approved workspace → existing mobile heartbeat/ack integration → canonical manifests/trips/returns and notifications → tests/visual/recovery evidence. Map provider, native device/build and operational release can remain blocked while read-only dashboard, source integration and isolated tests progress.

Migration compatibility and rollback: see06. Authoritative contracts/state: see03. Every approved requirement,84 scenarios and26 gates remains in the phase traceability register; no unknown gate is passed by assumption.

Final audit delta: a missing-serial fixture exposed that completeness was formerly enforced only by final issue. The existing issueCylinders check was extracted and reused earlier in fulfilmentReady. A red/green regression and460-test full rerun confirm the refinement without new ledger writes or alternative cylinder models. See03/07.
