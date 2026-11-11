# Retail POS preflight — 11 November 2026

Base 834e701 with uncommitted compact order and Support Desk work preserved.
Existing /admin/pos, grouped sidebar, npm web/Expo apps, schema 075. Existing
commerce.ts handlers open/sell/close/verify, pos_shifts/sales/items and stock
movements are authoritative. Cash only: Paystack and wallet POS settlement are
not enabled and must not be represented as supported. Existing sale path locks
the shift/branch/inventory, verifies cashier and tender, deduplicates by key,
and allocates/issues cylinders in the same transaction. Cash-up sums committed
sales plus opening float; finance verifies independently after reauthentication.

Gaps: raw branch ID and kobo fields, truncated receipt list unsuitable for KPI
totals, active till choice includes other cashiers, no authorised native POS
entry. The unified mobile sign-in and existing staff account area can expose
the same API for authorised roles without new login or tabs. Design: existing
summary data with scoped Lagos-day aggregates and permitted branch choices,
contextual sale/cash-up forms, receipt search and transparent cash-only state.
No new payment method, schema, financial ledger, role grants or production
changes. Keep payment/refund/returns/physical and production gates open.
