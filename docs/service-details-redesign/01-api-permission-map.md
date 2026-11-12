# API and authoritative data

| Contract | Data / permission |
| --- | --- |
| `services.catalogue` | Active service catalogue rows by branch. ID is the existing route identifier. Name, description, price basis and integer kobo, call-out, duration, zones, inclusions, exclusions, preparation, safety, cutoff and warranty are stored in service config. Missing details are displayed as unconfigured. Published service media uses the existing media route. |
| `services.slots` | Public legacy array remains compatible. Opt-in `view=detail` returns bounded appointment windows, service version and an aggregate reason based on branch, service configuration, independently qualified available staff and current slots. It returns no identities, qualifications or private bookings. Coverage is service-level by configured area, with no address-level or zone-specific staff inference. |
| `booking.create` | Customer/commercial only. Catalogue version, current checklist, coverage, idempotency, technician and slot locks and conflict revalidation remain authoritative. |
| `bookings`, `booking.reschedule`, `booking.cancel` | Existing owned or role-scoped reads and transitions, version and cutoff checks. |
| Quotes, invoices, reports, evidence and follow-ups | Existing `booking.quote*`, billing and payment verification, `booking.report`, service photo and acknowledgement actions, and `service.followups` remain on their original paths. |
