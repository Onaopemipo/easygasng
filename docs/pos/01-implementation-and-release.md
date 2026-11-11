# Retail POS implementation and acceptance

The existing /admin/pos sidebar route and staff sign-in are unchanged.
The web workspace includes four scoped KPIs, open till/active till, quick
actions, contextual cash sale and cash-up forms, and searchable recent receipts.
The staff account area of the existing native app uses the same API with
bottom sheets and the existing owner/manager/sales/finance role boundary.
Native cash entry is single-line; web uses existing multi-line sale support.

Today means midnight to midnight Africa/Lagos. Sales sum committed cash
receipts, not approved revenue. Stock impact sums recorded item units separately
from receipt totals; expected till cash is opening float plus committed cash
sales. Naira is parsed into integer kobo. A branch must be active to open a till
or post a new sale; a locked cashier prevents concurrent opens. A sale replay
returns the original receipt without deducting stock again. An identical
cash-up retry returns the original count result; changed counts are rejected.
Independent password verification and zero-variance checks remain authoritative.

Baseline: nine commerce tests. Combined 65 regressions and real PostgreSQL
POS-PG01 passed; web build and web/native type checks passed. Isolated browser
verified closed/empty, a synthetic 12575-kobo till, zero sales and the 390px
cash-up sheet. No browser sale, real payment, native build or deployment.
Receipts are the existing latest-100 scope. Paystack/wallet/split POS settlement,
LPG retail filling, provider refunds, advanced reports, printing, signed-device
acceptance, staging and independent release approval remain open.

No migration or production setting change. Existing callers can ignore the
additive summary fields. Roll back the UI before removing the extended read
response. Never delete committed sales, receipts, till records or stock movements;
use existing independent finance/stock controls for discrepancies.
