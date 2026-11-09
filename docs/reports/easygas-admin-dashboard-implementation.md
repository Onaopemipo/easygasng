# Admin dashboard implementation — PARTIAL / production NO-GO

The audit and baseline preceded source edits. Existing single sign-in is preserved: users authenticate once and the server derives their stored active role/branch. The pictured role-selection and arbitrary role-switch controls were explicitly excluded. No account, order, payment, delivery, technician or inventory system was replaced.

The approved composition is implemented in the existing web admin: forest sidebar, accessible existing logo, grouped navigation, welcome/date/period controls, six canonical KPI tiles, trend/status/operations, recent orders and existing-workflow quick actions. Light/dark surfaces and mobile drawer are reused. Values and campaigns come from existing records; empty data remains empty. Prior-period percentages and illustrated identities are not fabricated. Supporting Orders/POS/Customers/Staff/Bookings keep working modules; full mockup fidelity and all populated/role/device acceptance are still partial.

Read-only dashboard queries use canonical tables, current session/branch/module authority, one repeatable-read snapshot and per-widget savepoints. Verified net receipts retain existing finance semantics; unverified collections are excluded. Global search now finds bounded authorized order/customer/cylinder/service/staff records, with literal wildcard escaping and a tested60/user/min HTTP budget. Notifications have full unread counts and permission-checked order links. Other notification destinations remain an engineering gap. Search results except orders open existing module workspaces.

## Evidence and coverage
- Baseline332 tests:319 pass,13 skip,0 fail.
- Full isolated PostgreSQL regression340/340 pass,0 fail/skip; financial, inventory, approval, customer, driver, technician, independent concurrency and encrypted restore checks retained.
- Targeted dashboard/navigation18/18 pass; additional HTTP budget/read-only/auth test1/1 pass. HTTP60-request small-fixture total257ms is not a production load claim.
- Web typecheck/build and unchanged mobile typecheck pass. No lint script exists, recorded NOT_AVAILABLE.
- Browser owner render29/29 actual routes, exact six business groups plus pinned Dashboard; collapse/mobile focus, live search, date/branch filter and light/dark checks. This is not29 completed business workflows.
- [Traceability](../traceability/easygas-admin-dashboard-rtm.md):20/20 stable requirement/gate IDs retained,5 bounded gates verified,15 partial. All56 requested scenarios retained;2 genuinely inapplicable. Scope changes and unresolved work are explicit.

## Files and integration
New: apps/web/lib/admin-dashboard.ts, components/admin-overview.tsx, components/admin-search.tsx; tests/admin-dashboard.test.ts and admin-dashboard-http.test.ts.
Changed: apps/web/lib/service.ts, lib/navigation.ts, app/api/[action]/route.ts, components/admin.tsx, app/theme.css. Documentation under architecture/security/testing/recovery/reports/traceability and docs/admin-dashboard/evidence. No migration or new runtime grants. Database remains through056; native customer/driver/technician source unchanged this phase.

[Metrics](../architecture/easygas-admin-dashboard-metrics.md), [login/security](../security/easygas-unified-business-login.md), [route/role matrix](../traceability/easygas-admin-route-permission-matrix.md), [executed scenarios](../testing/easygas-admin-dashboard-verification.md), [rollback](../recovery/easygas-admin-dashboard-rollback.md), [blocker/dependency register](easygas-admin-dashboard-blockers.md).

## Release and next actions
Production remains **NO-GO**. Existing legacy field-session cash cutover, encrypted offline/revocation recovery, physical safety/device acceptance, incomplete doorstep/invoice/dispatch integration, hosting/signing/provider/restore gates and explicit Excel payment/stock/fee/customer matching hold remain. These are not made complete by a dashboard redesign. Local visual/role/accessible/load acceptance can continue independently of provisioning. No deployment, live provider activation, messages, actual import, credential reset, role grant, destructive Git or release-state change occurred. Unborn main and16 untracked top-level entries preserved; source snapshot retained for reviewed recovery.
