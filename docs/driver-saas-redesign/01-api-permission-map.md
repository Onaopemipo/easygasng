# Existing API and permission map

| Surface | Actual authority | Rules retained |
| --- | --- | --- |
| Driver web route | admin.tsx + navigation.access, `/admin/deliveries` | Driver role/branch menu; existing shell and header unchanged |
| Native shell | App.tsx / DriverWorkspace.tsx | Same identity/session, four tabs, dedicated driver deep-link allowlist |
| Initial restriction | driver.restrict | Restricts current session, does not grant new permissions |
| Home | driver.snapshot, orders?active=1 | Authenticated own branch/attempt; full scoped metrics; loaded orders capped at 100 |
| Availability | driver.availability | Existing runtime release gate; current authority; no optimistic success |
| Backend / heartbeat | snapshot.profile.driver_last_seen_at; native driver.heartbeat | Fresh/stale/unknown independent of availability, GPS and last successful UI refresh |
| Trip / permissions | snapshot.trip; driver.location; expo-location read permissions; DriverTripTracking | Only own active trip; explicit trip consent; OS permission lifecycle; no new tracking enablement |
| Assignment response | dispatch.respond | Owned attempt, version, reason, deadline, stable operation key |
| Pickup / progress | delivery.pickup, order.transition, delivery.arrived | Existing payment/stock/serial/custody/capacity/trip/ownership guards |
| Completion | DriverProof, DriverPhoto, driver.complete | Private retained proof, exact items, verified payment, customer OTP, full handover, server reread |
| Offline | field-queue, offline, driver-location, trip.sync | Encrypted user queue; no false completion; GPS-only restricted trip sync; conflicts retained |
| Closed history | driver.history; delivery.photos?orderId&attemptId | Own branch/attempt; closed-only; 20-row paging; proof only where currently permitted; no old customer contact exposure |
| Profile | snapshot.profile; account.update; account.password | Only authorised personal name edit; role/branch/verification/vehicle read-only |
| Appearance / alerts | existing web/mobile theme; notifications.list/read; support.create | Existing preference store and authorised actions; no fake opt-out of required alerts |

Unsupported visual items: claiming unassigned jobs, QR scan, rating, earnings, administrative documents/vehicle editing, fabricated total cylinders, map or ETA, language switch and notification/sync-disable switches. Omit these controls. Read-only history metadata and absent verification remain clearly limited. Source modules and APIs stay canonical.
