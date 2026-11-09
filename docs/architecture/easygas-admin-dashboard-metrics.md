# Dashboard authority and metric contract

The admin facade extends the existing dispatch/auth/navigation stack. It does not add users, orders, bookings, stock, invoices, payment or analytics ledgers. No schema migration or privilege grant was added; schema remains through056.

`apps/web/lib/admin-dashboard.ts` supplies read-only widgets under a repeatable-read, read-only transaction started in service.ts before authentication queries. Each widget uses a savepoint; one SQL failure returns an unavailable widget, not invented zeroes. Authorization is current navigation access, branch assignment and active branch. Owners may choose an active branch or all branches; other dashboard roles cannot override their assigned branch. Independent existing action authorization remains mandatory.

| Widget | Canonical source | Meaning and period |
|---|---|---|
| Orders / statuses / trend | orders | Count distinct canonical order rows, creation date in Africa/Lagos; exact stored status taxonomy, no synthetic group labels |
| Active customers | orders + users | Distinct customer/commercial identities with non-cancelled orders created in period; not all registered accounts |
| Service bookings | service_bookings | Created in selected period |
| Eligible cylinders | cylinders + cylinder_allocations | Current company-owned filled stock without current allocation; inspection due date checked; not customer cylinders or a safety certification |
| Verified net receipts | orders/order_events, approved credit_requests, verified pos_shifts/pos_sales, completed service_bookings/service_reports/events + verified_payments | Delivered verified orders net of approved refunds; verified POS; completed services capped by invoice and verified receipts net of refunds. Completion/sale dates in Lagos. Owner/finance only. Not profit, processor settlement or audited accounting recognition |
| Operations | orders, service_bookings/service_slots | Current out-for-delivery orders and distinct drivers; current authorised in-progress technicians; appointments within selected period |
| Open incidents | operational_incidents | Current open/acknowledged; independent from date range |
| Recent orders | orders + users + order_items/products | Five per page, six fetched to establish next page, selected creation period; stable secondary ID sort; canonical detail read rechecks permissions |
| Campaign | campaigns | Latest approved record with independent approver; honest empty state if none |

All ranges are inclusive, at most 93 days, dates validated; paging max1000 on dashboard. Amounts remain integer kobo; unsafe integer results are unavailable. Previous-period percentage comparisons are deliberately omitted until their definitions and implementation are accepted. Currency is NGN. The metric definitions are visible in the UI.

Global search is separate, current permission/branch scoped, parameterised and literal-escaped for LIKE. Five records per permitted type/page (orders, customers, cylinders, service catalogue, staff), query 2–80 characters, page1–20. Sixty search requests per user/minute are enforced at the HTTP route with existing auth_attempts storage. Order results open an existing canonical order modal; other results open their existing module, not invented detail routes. Search does not expand permissions. Customer/staff identity data stays inside authorized reads.

Client uses abortable30-second foreground polling, focus/commit refresh and cleanup. Newer request generations supersede late manual/filter results. Failed refresh retains explicitly stale data;401/403 clears it. No new websocket or business-event engine. Existing shared live handlers remain. Production-size EXPLAIN/load testing remains outstanding; small-fixture timings are not a capacity certification.
