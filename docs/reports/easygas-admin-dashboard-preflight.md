# Admin dashboard preflight — 6 November 2026

Audit completed before source edits. Branch main, unborn HEAD; 16 top-level entries are untracked, including all earlier customer/driver/technician changes. Preserve them. No reset/clean/commit/deploy/provider activation/import is authorised. Framework: Next16.4.3, React19, TypeScript5.9, canonical PostgreSQL/PGlite. npm test/typecheck/build are available; no lint script exists. Executed baseline:332 total,319 pass,13 skipped,zero fail in docs/admin-dashboard/evidence/baseline-tests.txt. Previous technician phase PostgreSQL332/332 is prior supporting evidence, not this phase certification.

| Feature | Audit classification | Actual authority / risk |
|---|---|---|
| Shared sign-in | EXISTS_UNVERIFIED this phase | site.tsx Auth, auth.ts/service.ts; existing login has no Admin/Staff choice; server navigation.access restricts landing |
| Role/branch routes | EXISTS_UNVERIFIED | admin layout/catchall page, navigation.ts, typed packages/business-rules/src/admin-navigation.ts; no arbitrary role context switching |
| Grouped sidebar | PARTIAL visual | admin-navigation.tsx; typed registry already includes all six requested groups plus pinned Dashboard; preserve paths/roles |
| Dashboard | PARTIAL | admin.tsx actually mounts BusinessCentre overview, not the legacy Dashboard component; business-reporting.ts loads bounded collections but overview has no requested date-scoped composition |
| Revenue | EXISTS_UNVERIFIED | financial-reports.ts verified delivered order net receipts, verified POS and completed service receipts; no gross-sale relabeling |
| Global search | MISSING functional | header admin-search is a link to Orders, not cross-module search |
| Notifications | PARTIAL | navigation snapshot actual notifications; read action/polling/auth cleanup exist; record destinations need scoped linking |
| Theme/responsive | PARTIAL | existing ThemeToggle/global tokens, sidebar preferences/mobile focus management; new approved forest surfaces require verification |
| Modules | EXISTS_UNVERIFIED | catchall Admin selects existing order/POS/customer/stock/cylinder/booking/quote/finance/growth/governance components; no rewrite justified |
| Realtime | EXISTS_UNVERIFIED | business-live SSE and navigation30s polling, auth checks, event cleanup; new date-scoped dashboard may use bounded measured polling |
| Safety/payment | EXISTS_UNVERIFIED phase-wide | Existing R01–05, driver/technician phase guard and historical ledgers must remain intact |

Visual reference: forest sidebar approximately19% of desktop width, white header approximately64px, welcome band, six colour KPI tiles, trend/status/operations three-column row, recent orders/actions/retention lower row. Actual data, accessible15px minimum text, empty/error states override illustrated values. Supporting modules already have established functional UI; adapt shell and shared styling only.

Plan: preserve single-login and exact registry; add read-only bounded dashboard/search facades over canonical tables with navigation-derived authority; build approved dashboard composition, actual filters/charts/pagination/actions; replace header link with accessible scoped search; forest sidebar style; preserve notifications/themes/module routes. No schema migration expected unless measured query evidence justifies one. Audit all actual route count programmatically. Run negative isolation tests, P0 and cross-client regressions, build and real browser checks. Existing production NO-GO and Excel/import/provider/native holds remain.
