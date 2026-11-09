# Theme route matrix

The following observations are actual rendered-route smoke checks. Document scroll width did not exceed client width. Protected screens used synthetic local accounts; no order was placed. Dynamic route patterns use representative real fixture IDs. Detailed modal/form/empty/loading checks are recorded separately.

| Route | Light | Dark | Overflow |
|---|---|---|---|
| /about | PASS | PASS | None |
| /accept-invitation | PASS | PASS | None |
| /account | PASS | PASS | None |
| /account-settings | PASS | PASS | None |
| /bookings | PASS | PASS | None |
| /business | PASS | PASS | None |
| /cancellation | PASS | PASS | None |
| /cart | PASS | PASS | None |
| /checkout | PASS | PASS | None |
| /combined-checkout | PASS | PASS | None |
| /consumption | PASS | PASS | None |
| /contact | PASS | PASS | None |
| /credit-terms | PASS | PASS | None |
| /delivery | PASS | PASS | None |
| /forgot-password | PASS | PASS | None |
| /gas-order | PASS | PASS | None |
| /help | PASS | PASS | None |
| /how-it-works | PASS | PASS | None |
| /login | PASS | PASS | None |
| /loyalty-terms | PASS | PASS | None |
| /notifications | PASS | PASS | None |
| /orders | PASS | PASS | None |
| /policies | PASS | PASS | None |
| /privacy | PASS | PASS | None |
| /products | PASS | PASS | None |
| /products/refill-6 | PASS | PASS | None |
| /purchase-credit | PASS | PASS | None |
| /recurring | PASS | PASS | None |
| /refill | PASS | PASS | None |
| /refund | PASS | PASS | None |
| /register | PASS | PASS | None |
| /reset-password | PASS | PASS | None |
| /rewards | PASS | PASS | None |
| /schedules | PASS | PASS | None |
| /service-terms | PASS | PASS | None |
| /services | PASS | PASS | None |
| /services/cooker-servicing | PASS | PASS | None |
| /support | PASS | PASS | None |
| /terms | PASS | PASS | None |
| /track | PASS | PASS | None |
| /verify-email | PASS | PASS | None |
| /wallet | PASS | PASS | None |
| /warranty | PASS | PASS | None |

Homepage: six saved screenshots at 1440, 768 and 390px, both themes. `/admin/testimonials`: light boundary and owner workflow verified. Driver/technician role visibility is covered by the navigation regression tests; they retain their role-specific experiences.

Scope limit: this matrix does not certify every parameter value, error condition, screen-reader interaction or production performance percentile.


## Staff theme extension — 30 October 2026

The administration light-only boundary described in the original phase is superseded. All administration and restricted staff routes now share the root theme provider and header switch. See `docs/traceability/easygas-admin-theme-rtm.md` for current scope and executed evidence. Global light-only rollback remains supported.
