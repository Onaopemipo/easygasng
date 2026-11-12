# Customer service booking visibility

SBV-001 VERIFIED_COMPLETE for discovery only: customer navigation now says Book a Service; /services shows Browse services & book and View my bookings. Existing route and menu position retained.

Validation: six public-header tests pass; TypeScript passes; local browser verifies heading, links and honest empty state. [Evidence](../reports/service-booking-visibility/tests.txt).

Local services.catalogue returns an empty array. Real appointments remain unavailable until approved active services, areas, pricing, checklists, qualified staff and slots are configured. No data or permissions activated. Production NO-GO is preserved. [Machine-readable matrix](service-booking-visibility-rtm.json).

SBV-002 scopes the public catalogue to public reads for signed-in staff. The server test confirms catalogue access for a restricted technician and an owner, and denial of management access for the restricted session. All 14 focused checks passed. Hosted browser acceptance remains open.
