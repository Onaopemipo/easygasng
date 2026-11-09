# Admin verification — 6 November 2026

Baseline before edits: npm test **332 total,319 pass,13 skipped,0 fail** (PostgreSQL disabled). Final isolated PostgreSQL-enabled run: **340 total,340 pass,0 skip,0 fail**,232.45s. New dashboard plus navigation targeted run:18 pass. Additional HTTP budget/auth/read-only test:1 pass (http-tests.txt),60 successful calls then429, independent actor remains200. No production database, real customer records, provider or message sender used. Fixture identities are synthetic in disposable databases.

Commands/evidence under docs/admin-dashboard/evidence:
- `npm test` → baseline-tests.txt.
- `EASYGAS_ENABLE_LOCAL_PG_TESTS=yes EASYGAS_TEST_POSTGRES_URL=postgresql://127.0.0.1:57419/easygas_test_operations npm test` → full-regression-tests.txt. This cluster belongs to the isolated test workflow; not the demo application or production DB.
- `node --import tsx --test --test-concurrency=1 tests/admin-dashboard.test.ts tests/navigation.test.ts` → dashboard-tests.txt.
- `npm run typecheck`, `npm run build`, `npx tsc --noEmit -p apps/mobile/tsconfig.json` → corresponding evidence logs. No lint script exists.

New tests: ADM-BIZ01 canonical counts/status/zero state; ADM-AUTH03 forged role/customer/cross-branch/inactive branch; ADM-SEARCH12 allowed records and literal wildcard/injection; ADM-REL01 injected widget failure; ADM-FILTER03 invalid/range/page rejection; ADM-BIZ02 unverified cash excluded and independently reconciled receipts match finance; ADM-AUTH01 actual owner/administrator/sales through one login; ADM-NOTIFY12 >30 unread and cross-branch order-link exclusion. Existing suite exercises financial integrity, stock/idempotency, independent approvals, driver/technician service-work gates, session expiry/revocation, HTTP isolation, PostgreSQL independent-connection concurrency, encrypted restore and current customer APIs.

Browser: existing isolated local owner, no fabricated orders/metrics inserted. All29 actual registry URLs rendered headings without build/module errors (routes.json); this proves render/navigation, not full mutation acceptance. Exact six business groups and pinned Overview; Customer Testimonials retained. Search Demo returns existing authorized demo identities. Sidebar collapse/expand, mobile drawer open/close and focus restoration checked; light/dark toggle, Lagos branch and7-day period checked. Empty chart/table states are honest; populated visual scenarios remain open. Width measurements cover1440,1280,1024,768,390,360,320. Resize-transition observations in responsive.json are raw, not a false blanket no-overflow assertion; settled390 and320 rechecked separately. See browser-verification.md for final checks and screenshots. System-theme, full all-role browser suites, load and signed-device checks remain unverified.

All56 scenarios below remain in scope (only genuinely inapplicable exclusions). PARTIAL means automated supporting evidence does not certify the full requested browser/operational acceptance. Do not interpret a regression suite pass as every scenario passing.

| Scenario | Required behavior | Status | Evidence / remaining |
|---|---|---|---|
| AUTH-01 | Shared login works for owner/admin/staff without pre-login role selection. | PASS | Targeted/new tests, full regression and/or browser evidence; see executed scope below |
| AUTH-02 | Staff lands on authorized workspace only. | PARTIAL | full-regression-tests.txt + targeted dashboard-tests.txt; remaining browser/operational acceptance in blocker register |
| AUTH-03 | Owner/admin sees only effective authorized modules. | PASS | Targeted/new tests, full regression and/or browser evidence; see executed scope below |
| AUTH-04 | Multiple-role context switch (if applicable) cannot escalate privileges. | NOT_APPLICABLE | Canonical single role; no multi-role switch exists or was introduced |
| AUTH-05 | Forged role/context fails server-side. | PASS | Targeted/new tests, full regression and/or browser evidence; see executed scope below |
| AUTH-06 | Direct unauthorized route fails safely. | PARTIAL | full-regression-tests.txt + targeted dashboard-tests.txt; remaining browser/operational acceptance in blocker register |
| AUTH-07 | Direct unauthorized API/export fails safely. | PARTIAL | full-regression-tests.txt + targeted dashboard-tests.txt; remaining browser/operational acceptance in blocker register |
| AUTH-08 | Cross-branch customer/order access denied. | PASS | Targeted/new tests, full regression and/or browser evidence; see executed scope below |
| AUTH-09 | Suspended staff loses access promptly. | PARTIAL | full-regression-tests.txt + targeted dashboard-tests.txt; remaining browser/operational acceptance in blocker register |
| AUTH-10 | Session expiry returns to sign-in and safe redirect. | PARTIAL | full-regression-tests.txt + targeted dashboard-tests.txt; remaining browser/operational acceptance in blocker register |
| AUTH-11 | Sensitive approval rejects self-approval and insufficient privileges. | PARTIAL | full-regression-tests.txt + targeted dashboard-tests.txt; remaining browser/operational acceptance in blocker register |
| AUTH-12 | Search/realtime data cannot cross permission boundaries. | PASS | Targeted/new tests, full regression and/or browser evidence; see executed scope below |
| UI-01 | All 27 specified grouped routes plus Dashboard render or report explicit blocker (count actual registry entries programmatically). | PASS | Targeted/new tests, full regression and/or browser evidence; see executed scope below |
| UI-02 | Correct grouping and ordering. | PASS | Targeted/new tests, full regression and/or browser evidence; see executed scope below |
| UI-03 | Sidebar collapse/expand and active route. | PARTIAL | full-regression-tests.txt + targeted dashboard-tests.txt; remaining browser/operational acceptance in blocker register |
| UI-04 | Mobile drawer opens/closes and restores focus. | PARTIAL | full-regression-tests.txt + targeted dashboard-tests.txt; remaining browser/operational acceptance in blocker register |
| UI-05 | Deep links, refresh, back/forward. | PARTIAL | full-regression-tests.txt + targeted dashboard-tests.txt; remaining browser/operational acceptance in blocker register |
| UI-06 | Light/dark/system mode and no flash. | PARTIAL | full-regression-tests.txt + targeted dashboard-tests.txt; remaining browser/operational acceptance in blocker register |
| UI-07 | KPI cards real data or honest empty state. | PASS | Targeted/new tests, full regression and/or browser evidence; see executed scope below |
| UI-08 | Order trend filter and timezone. | PARTIAL | full-regression-tests.txt + targeted dashboard-tests.txt; remaining browser/operational acceptance in blocker register |
| UI-09 | Order status chart matches authoritative taxonomy. | PARTIAL | full-regression-tests.txt + targeted dashboard-tests.txt; remaining browser/operational acceptance in blocker register |
| UI-10 | Recent orders pagination and click-through. | PARTIAL | full-regression-tests.txt + targeted dashboard-tests.txt; remaining browser/operational acceptance in blocker register |
| UI-11 | Quick actions route and enforce permissions. | PARTIAL | full-regression-tests.txt + targeted dashboard-tests.txt; remaining browser/operational acceptance in blocker register |
| UI-12 | Notifications and unread counts reflect real events. | PARTIAL | full-regression-tests.txt + targeted dashboard-tests.txt; remaining browser/operational acceptance in blocker register |
| UI-13 | Search handles no results and access restrictions. | PASS | Targeted/new tests, full regression and/or browser evidence; see executed scope below |
| UI-14 | Desktop/tablet/mobile responsive and accessibility verification. | PARTIAL | full-regression-tests.txt + targeted dashboard-tests.txt; remaining browser/operational acceptance in blocker register |
| BIZ-01 | Dashboard order count matches scoped source. | PASS | Targeted/new tests, full regression and/or browser evidence; see executed scope below |
| BIZ-02 | Verified revenue calculation matches finance policy. | PARTIAL | full-regression-tests.txt + targeted dashboard-tests.txt; remaining browser/operational acceptance in blocker register |
| BIZ-03 | Date/branch filters consistently apply to widgets. | PARTIAL | full-regression-tests.txt + targeted dashboard-tests.txt; remaining browser/operational acceptance in blocker register |
| BIZ-04 | Customer counts deduplicate identities. | PARTIAL | full-regression-tests.txt + targeted dashboard-tests.txt; remaining browser/operational acceptance in blocker register |
| BIZ-05 | Cylinder status counts respect custody. | PARTIAL | full-regression-tests.txt + targeted dashboard-tests.txt; remaining browser/operational acceptance in blocker register |
| BIZ-06 | Phone-assisted order workflow remains intact. | PARTIAL | full-regression-tests.txt + targeted dashboard-tests.txt; remaining browser/operational acceptance in blocker register |
| BIZ-07 | POS unauthorized branch rejected. | PARTIAL | full-regression-tests.txt + targeted dashboard-tests.txt; remaining browser/operational acceptance in blocker register |
| BIZ-08 | Inactive branch fulfillment rejected. | PARTIAL | full-regression-tests.txt + targeted dashboard-tests.txt; remaining browser/operational acceptance in blocker register |
| BIZ-09 | Order amendment preserves original lines and one eligible delivery fee. | PARTIAL | full-regression-tests.txt + targeted dashboard-tests.txt; remaining browser/operational acceptance in blocker register |
| BIZ-10 | Driver assignment and manual override revalidate capacity. | PARTIAL | full-regression-tests.txt + targeted dashboard-tests.txt; remaining browser/operational acceptance in blocker register |
| BIZ-11 | Proof-of-delivery evidence stays linked to historical order. | PARTIAL | full-regression-tests.txt + targeted dashboard-tests.txt; remaining browser/operational acceptance in blocker register |
| BIZ-12 | Technician quote→approval→payment→work gate enforced. | PARTIAL | full-regression-tests.txt + targeted dashboard-tests.txt; remaining browser/operational acceptance in blocker register |
| BIZ-13 | Paystack duplicate webhook posts payment once. | PARTIAL | full-regression-tests.txt + targeted dashboard-tests.txt; remaining browser/operational acceptance in blocker register |
| BIZ-14 | Refund and wallet records remain reconciled. | PARTIAL | full-regression-tests.txt + targeted dashboard-tests.txt; remaining browser/operational acceptance in blocker register |
| BIZ-15 | Inventory movements cannot duplicate or go negative. | PARTIAL | full-regression-tests.txt + targeted dashboard-tests.txt; remaining browser/operational acceptance in blocker register |
| BIZ-16 | Customer testimonials require consent and moderation. | PARTIAL | full-regression-tests.txt + targeted dashboard-tests.txt; remaining browser/operational acceptance in blocker register |
| BIZ-17 | No fake records or metrics are present. | PASS | Targeted/new tests, full regression and/or browser evidence; see executed scope below |
| BIZ-18 | Existing customer/driver/technician clients pass API contract tests. | PARTIAL | full-regression-tests.txt + targeted dashboard-tests.txt; remaining browser/operational acceptance in blocker register |
| REL-01 | Widget partial failure isolation. | PASS | Targeted/new tests, full regression and/or browser evidence; see executed scope below |
| REL-02 | Realtime reconnect and event dedupe. | PARTIAL | full-regression-tests.txt + targeted dashboard-tests.txt; remaining browser/operational acceptance in blocker register |
| REL-03 | Polling cleanup and bounded request rates. | PARTIAL | full-regression-tests.txt + targeted dashboard-tests.txt; remaining browser/operational acceptance in blocker register |
| REL-04 | Stale data clearly marked. | PARTIAL | full-regression-tests.txt + targeted dashboard-tests.txt; remaining browser/operational acceptance in blocker register |
| REL-05 | Concurrent updates do not lose authorized state. | PARTIAL | full-regression-tests.txt + targeted dashboard-tests.txt; remaining browser/operational acceptance in blocker register |
| REL-06 | Ambiguous payment outcomes reconcile before mutation. | PARTIAL | full-regression-tests.txt + targeted dashboard-tests.txt; remaining browser/operational acceptance in blocker register |
| REL-07 | Backup/restore procedure tested in isolated environment where available. | PARTIAL | full-regression-tests.txt + targeted dashboard-tests.txt; remaining browser/operational acceptance in blocker register |
| REL-08 | Migration rollback/forward-fix tested. | NOT_APPLICABLE | No schema migration in this phase; prior additive schema and hold preserved |
| REL-09 | No production notifications sent in tests. | PASS | Targeted/new tests, full regression and/or browser evidence; see executed scope below |
| REL-10 | Existing unrelated Git changes preserved. | PASS | Targeted/new tests, full regression and/or browser evidence; see executed scope below |
| REL-11 | Lint, typecheck, unit/integration, build execute and record results. | PARTIAL | full-regression-tests.txt + targeted dashboard-tests.txt; remaining browser/operational acceptance in blocker register |
| REL-12 | No unsafe release-state change. | PASS | Targeted/new tests, full regression and/or browser evidence; see executed scope below |
