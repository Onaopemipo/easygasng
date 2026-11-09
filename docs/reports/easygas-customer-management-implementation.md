# Admin Customers implementation — 30 October 2026

Customers at `/admin/customers` now uses the supplied reference's layout: title and create button, four real-data metrics, filter panel, selectable customer table, pagination, row actions and support/report/export cards. The existing sidebar and header remain unchanged. Minimum text size is 15px. Responsive rules keep the page contained on mobile, with an internal horizontal table scroller.

Owners can manage all customers; managers can manage their assigned customers and customers with orders in their branch. All API calls re-read the authenticated actor. Detail order counts, payment totals and histories remain branch-scoped. Customer creation validates an active allowed branch and unique normalized email, forces the customer role and generates an inaccessible random password hash. Customers set their own password using the existing recovery process. No email is sent by this page; local email delivery remains unconnected. Editing changes the display name only, preventing this feature from changing login identity, privileges, consent or money. Phone is sourced from the existing saved delivery address, rather than a duplicate contact store.

Search covers names, email, phone and assigned branch. Filters cover relationship status and branch; sorting covers join date and name. Metrics use the authorized full snapshot, independent of filters. Active means enabled with at least one scoped order; inactive means enabled without orders. Suspended accounts have a separate filter. No unsupported percentage trends are displayed. Total Spent means gross verified payments in scope; refunds remain separately reported by Finance. Details show up to 50 latest scoped orders. CSV exports the filtered set or selected rows with quoting and spreadsheet-formula protection.

Validation evidence:
- Focused customer management and existing customer dashboard suites: 14 passed, zero failures.
- Traceability validator: 2 passed, zero failures.
- Web TypeScript, production build and formatting checks passed.
- Browser: create, edit, search, status filter, reset, details and CSV download passed using synthetic local QA data. Desktop 1560px and mobile 390px checked. No real customer records were created. Owned QA server stopped; normal port 3003 preserved.

The full regression log is `docs/testing/customer-management-regression-20261030.txt`. Phase requirements and remaining acceptance work are recorded in `docs/traceability/easygas-customer-management-rtm.json` and its Markdown companion. Two backend requirements are fully verified; two UI requirements retain expanded acceptance work (large-list pagination, adversarial CSV fixtures, screen-reader session). This is not a production clearance. Existing production NO-GO decisions and hosting/payment/email limitations remain.
