# Booking browser verification — 30 October 2026

Environment: isolated service-booking-browser-qa-20261030 data directory; synthetic customer/commercial/staff accounts, no real customer records or notifications. QA server port 3004, owned server stopped after testing. Normal development server on 3003 preserved.

- BK-02: direct /bookings with an invalid cookie redirected to /login?returnTo=%2Fbookings. Signing in as the synthetic customer returned to the protected page.
- BK-12: Awaiting Action showed one real fixture quote. Detail showed revision, labour/call-out, total and pending decision. Approve changed the same booking to in_progress and displayed the approved total (EGS-E8F10919); verified paid remained zero.
- BK-06/09/10: Book Again opened the existing service detail. Eligible saved QA Home populated the address. Actual slot selected, equipment entered, Review booking displayed the exact appointment/address/charges/cut-off without creating a booking. Confirm saved EGS-DF70989A in My Bookings. Rescheduling moved that same reference to the new slot. Cancellation showed cancelled while paid/refunded remained zero. No new reference was created during those changes.
- BK-16: Completed tab opened the real synthetic completed report EGS-81EC56DF, checklist outcome, invoice, report download/print controls and review form. Cancelled tab showed the original EGS-93BAB43E and Book Again.
- BK-20: at 390px a separate mobile booking used a saved address, selected an actual available appointment, reviewed and confirmed EGS-C87B31BF. It appeared as pending confirmation with zero verified payment.
- BK-18: a different, empty commercial account displayed No upcoming appointments and purposeful service-history guidance; it did not inherit the first customer's bookings.
- BK-19/24: customer website switching, public Services and Overview navigation retained the session. Empty account dashboard showed the new Next service appointment invitation. Backend integration test separately verifies a non-empty appointment uses the same authoritative ID in customer/admin/dashboard reads.
- Coverage dialog displayed only active configured Cooker Servicing/Lekki records. No additional offerings or slots were invented.
- Keyboard ArrowRight moved the selected tab and focus; Escape/modal close used existing dialog controls. Responsive widths 1560, 1024 and 390 had document scrollWidth equal to innerWidth. Mobile hero height was 303px. Exactly one header was rendered in the empty account desktop view.
- Final screenshots: customer-service-bookings-desktop-20261030.png, customer-service-bookings-tablet-20261030.png, customer-service-bookings-mobile-20261030.png, customer-service-bookings-empty-20261030.png under docs/screenshots. Desktop screenshot was recaptured from scroll top to avoid a sticky-header full-page capture artefact.

Not verified by these manual browser journeys: a dedicated screen-reader session, live Reduce Motion preference, mid-form expiry, actual OS crash/DB network disconnection, provider acknowledgements, notification worker leases or previous-release rollback. No production readiness is inferred.

Final HTTP contract recheck after operationKey/version enforcement: commercial account created EGS-931DA895 through Review → Confirm, then cancelled the same reference through the versioned UI. Both succeeded, paid/refunded remained zero. The restarted QA application retained earlier records. Final screenshot: docs/screenshots/customer-service-bookings-final-20261030.png. All QA sessions signed out, owned server stopped.
