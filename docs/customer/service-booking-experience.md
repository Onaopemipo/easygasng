# Customer service booking experience

/bookings uses the existing authenticated customer workspace. It renders a green service hero, active catalogue cards, My bookings/Services switch, Upcoming/Awaiting Action/Completed/Cancelled status tabs, appointment summaries, protected detail dialogs, real follow-ups, support, help and coverage. It never renders both full public navigation and the customer sidebar. Website links, /services/<id> details and safe login returns reuse the existing identity/session flow.

Catalogue cards use approved active service_catalogue records. Missing configured imagery uses an equipment illustration, not a fabricated technician photograph or certification claim. Inactive services are not represented as available. An empty catalogue explains the approval dependency. Coverage is each active service's business-managed zones; it is not a promise of a free slot.

Select a service, review description/inclusions/preparation/charges/cut-off, choose an actual available appointment, enter equipment and address details (or an eligible saved address), then review the request before confirming. The server revalidates all information. My Bookings displays the saved reference, appointment and actual status. Payment and safety clearance remain separate. Photographs can be attached to an eligible saved booking through the existing private upload control.

Details reuse BookingCard: permitted rescheduling/cancellation, quote decisions, revised quotation history, actual timeline, verified billing, report data/print, report acknowledgement and review. Completed/cancelled cards offer Book Again. There is no fabricated GPS tracking or technician arrival estimate. Customer-facing staff information is a display name; staff contact/cost fields are removed.

Booking requests retain a non-sensitive per-customer/service idempotency key in session storage until acknowledgement. Unknown-response errors explain safe retry. /bookings can recover a saved native booking reference. Closing the browser or signing out clears browser context, so the authoritative booking list must be reviewed before starting a new request.
