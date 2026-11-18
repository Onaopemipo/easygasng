# Canonical API and permissions

- GET technician.snapshot: technician/current active branch; own profile, availability, qualifications, own summary, preferences and unread count. Additive own daily/next-job read projection only.
- GET technician.jobs: strict q/filter(all,assigned,in_progress,completed,past)/page/from/to/location/intent query; actor IDs cannot be supplied.20 rows/page plus total/hasMore/generatedAt/timeZone.
- GET bookings?id=<id>: existing scoped full booking hydration (snapshot/checklist/events/quotes/billing/materials/report/images); inaccessible assignment omitted.
- POST technician.availability: available:boolean and shared operationKey envelope, own account only; active visit guard. Does not grant qualification or permission.
- Existing BookingCard/Appointment: booking.assignment.respond, booking.transition(en_route,in_progress,failed), assessment, quote/review, booking.work.start, material usage, report and retained media. Canonical schemas/version/idempotency/transaction authority remain. No new transition names.
- Profile uses existing account.update(name only), preferences.save, account password and logout/session controls. Qualification is read-only; verifier remains independent owner under current consolidated-role backend. Design Safety Officer terminology does not change actual access.
- Notifications use existing recipient-bound tray/native inbox. Support uses existing support.create or /support. No fake guidelines resource, signature or generic incident console; incident/report actions stay in job.
- Completed badge requires server completed after report/customer acknowledgement. Offline encrypted queue is pending until server confirms; no web offline queue invented.

Authoritative implementation: apps/web/lib/professional-services.ts, technician-mobile.ts, technician-session.ts, service.ts; apps/web/components/professional-services.tsx; apps/mobile/Services.tsx and field-queue.ts. No wallet/Paystack/driver/stock/custody setting change.
