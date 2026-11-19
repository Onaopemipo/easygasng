# Compact admin workspaces — 19 November 2026

Approved scope: Support, Bookings, Services, Quotations, Finance, Reconciliation, Credits and Reports, based on the supplied screenshots. Lists should be compact, editing should use focused dialogs, and unrelated details should leave the main page. Existing business actions, permission checks, authoritative totals, export scope and approval evidence remain in place.

Audit: service catalogue duplicated public cards and inline editors; bookings expanded every record; quotations could render blank after filtering; financial details and expense forms were stacked; reconciliation combined four independent workspaces; credit search duplicated headings; reports combined filters, results and schedule forms. Support had repeated status filters and oversized metrics.

Implementation and acceptance are tracked in [the matrix](../traceability/admin-compact-rtm.md). This is web presentation scope. Previous native, provider, physical, commercial production NO-GO, actual-import and retain-all decisions remain unchanged. Hosted rollout is separate from local acceptance.

## Implemented workspaces

| Workspace | Result | Browser evidence |
| --- | --- | --- |
| Support | Compact status/search bar; bounded inbox and conversation scrolling; existing reply, attachment, assignment and SLA dialogs | [Desktop](evidence/support-desktop.jpg) · [Phone](evidence/support-mobile.jpg) |
| Bookings | Eight summary rows per page, search/status filtering, selected booking dialog and draft protection | [Desktop](evidence/bookings-desktop.jpg) · [Phone](evidence/bookings-mobile.jpg) |
| Services | One catalogue table; configuration in a dialog, with image/checklist disclosures and existing independent approvals | [Desktop](evidence/services-desktop.jpg) · [Phone](evidence/services-mobile.jpg) |
| Quotations | Focused approval queue with a real empty state after filtering | [Desktop](evidence/quotations-desktop.jpg) · [Phone](evidence/quotations-mobile.jpg) |
| Finance | Four primary metrics, overview/expense tabs, expense dialogs and secondary balance details | [Desktop](evidence/finance-desktop.jpg) · [Phone](evidence/finance-mobile.jpg) |
| Reconciliation | Separate documents, payment ledger, service-cost and Paystack views; scoped eight-row document pages | [Desktop](evidence/reconciliation-desktop.jpg) · [Phone](evidence/reconciliation-mobile.jpg) |
| Credits | Request table first; customer lookup and verification inside credit-entry dialog; one canonical eight-row pager | [Desktop](evidence/credits-desktop.jpg) · [Phone](evidence/credits-mobile.jpg) |
| Reports | Compact report selector, filter dialog, paginated results, collapsed limitations and separate scheduling view | [Desktop](evidence/reports-desktop.jpg) · [Phone](evidence/reports-mobile.jpg) |

Shared presentation is scoped to `.admin-compact`; customer and technician service paths keep their existing components. `DialogDraft` and existing contextual forms use the shared unsaved-change confirmation. Existing modal keyboard behavior is retained; focus return, Escape and explicit draft discard were checked in the browser.

Document and credit read contracts accept an integer `pageSize` from 1–20. Existing clients retain the default 20; only these redesigned staff lists request 8. Canonical status adapters, totals, branch restrictions and the document status-filter read budget remain unchanged. No schema migration or new financial, stock, delivery or service mutation API was introduced. CSV/Excel/print still use the full filtered backend result; the browser check displayed 8 records and exported all 10 synthetic records.

## Reproduce local acceptance

From the repository root, with `DATABASE_URL` unset and outside production:

```sh
node --import tsx scripts/prepare-admin-compact-qa.ts
node scripts/preview-admin-compact.mjs
```

The fixture creates a new temporary local database and writes its synthetic login configuration to ignored `.data/admin-compact-qa.json`. The preview binds only to `127.0.0.1:3114` and uses a separate build directory. Its guard checks for a database URL both before and after Next loads local environment files. No hosted data is used. Existing local previews are left running.

Acceptance used 1440×1000 and 390×844 browser viewports, with 16 final layout observations, local search/selection, modal/focus/draft checks, document and credit pagination, report generation/export and a dark-mode check. This does not claim physical-phone, native, Firefox, assistive-technology or commercial-production acceptance.

## Verification history

The initial complete regression identified one new raw search input violating the existing shared-input convention (PWD-03). The search now uses `FormInput`; its focused regression passes. A subsequent evidence validation identified an aggregate manifest retaining earlier browser observations. The manifest was reconciled with the actual final capture measurements; earlier manifests and logs are retained under `evidence/initial-*` and `evidence/intermediate-*`. These superseded artifacts do not count as successful final evidence.

The final focused suite, responsive evidence validation, web types/build and final full regression are recorded separately. The complete regression passed 815/815 with zero failures/skips (the 35 focused checks are a subset). All 9 bounded requirements, 9 gates, 8 routes and 1 critical requirement are verified. No requirement leaves a denominator. [Executed regression](evidence/full-regression.txt), [responsive validation](evidence/browser-validation.txt), [build](evidence/build.txt), [types](evidence/types.txt) and [matrix validation](evidence/traceability.txt). Hosted rollout remains unperformed; the last deployed demo and all earlier NO-GO, actual-import, retain-all, native, provider and physical acceptance decisions remain unchanged.
