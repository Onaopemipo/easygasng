# Customer dashboard verification — 30 October 2026

Only isolated local datasets were used. The original port3003/PID29740 server was preserved. QA used the existing navigation fixture for empty-account route checks, then .data/customer-dashboard-browser-qa-20261030-v2 for populated accounts. The first separate fixture preparation stopped at an unsupported Ikoyi address; the v2 fixture uses the actual active Lekki location. Background jobs were disabled in browser servers. Synthetic qualification/history/stock/ledger records exist only inside these QA datasets. No real customer order, payment, stock movement, email or external notification was created.

## Commands and actual results

| Check | Executed command | Result / evidence |
|---|---|---|
| Full regression | npm test | 166 entries: 165 passed, 0 failed, 1 pre-existing managed-environment skip; customer-dashboard-regression-20261030.txt |
| Focused customer + feedback | node --import tsx --test tests/customer-dashboard.test.ts tests/refill-feedback.test.ts | 15/15 passed; customer-dashboard-focused-20261030.txt |
| RTM validation | node --import tsx --test tests/customer-traceability.test.ts | 2/2 passed; customer-dashboard-traceability-20261030.txt |
| Web types | npm run typecheck | Passed; customer-dashboard-types-20261030.txt |
| Formatting | npx prettier --check (phase source files) | Passed; customer-dashboard-format-20261030.txt |
| Build | EASYGAS_PREVIEW=true npm run build | Exit0 using isolated .next-qa; customer-dashboard-build-20261030.txt |
| Bootstrap export | npm run db:export | Generated reviewed bootstrap with migration032; no database connection/application |
| Lint | Existing repository commands inspected | NOT_APPLICABLE: no lint script/configuration; not described as a lint pass |

Migration032 broadens only the feedback-state check. It was generated for the managed mirror with installed Supabase CLI, exercised through local migrations and the browser QA dataset. No hosted project or hosted advisor test was run. The existing immutable feedback trigger initially caught a test fixture trying to change a timestamp; the fixture was corrected to insert separate historical records instead. No integrity trigger was disabled.

## Scenario A–Z mapping

| Scenario | Result | Actual evidence / limit |
|---|---|---|
| A Website → Dashboard | PASS | Public account menu to /account, same signed-in QA customer |
| B Dashboard → Website | PASS | Existing Back to Website links; same identity and saved default location |
| C Guest → Login → Dashboard | PASS | New invalid QA session redirected to safe login; normal login restored account |
| D Protected redirects | PASS | 15 protected customer/checkout URLs redirected to safe return destinations, zero private headings; unsafe return tests passed |
| E Expiry/revocation | PASS (bounded) | Backend expired/revoked sessions denied; browser current-session revocation cleared account content. No real-time external token-provider integration introduced |
| F Cross-tab logout | PASS | Public-tab logout cleared protected second tab and returned it to login |
| G Cart continuity | PASS | Synthetic Gas Hose quantity1 preserved across public/dashboard/cart |
| H Guest cart login | PASS | Same item/quantity restored at /checkout after sign-in; no extra cart created |
| I Customer identity | PASS | Customer A populated records versus commercial customer B zero metrics; negative API ownership tests |
| J Empty account | PASS | Zero metrics, useful empty activity/history/refill states, no fabricated records |
| K Orders | PASS | Actual status aggregate tests, populated/empty browser displays |
| L Wallet | PASS | Signed ledger and reversal tests; browser NGN8560 matched isolated ledger; unconnected funding explicit |
| M Loyalty | PASS | Issued points/adjustments isolated; browser1250 matched fixture. No configured tier exists to invent |
| N Forecast/feedback | PASS (existing supported attribution) | Existing forecast regressions plus all5 states, 24-hour boundary, worker suppression, ownership/rate limit, immutable history, later verified-purchase supersession; browser self-report persisted |
| O Purchase chart | PASS | Verified delivered/payment-evidenced owned quantities only; populated chart + accessible data table; exclusions tested |
| P Quick actions | PASS | Existing destinations and unconnected-funding informational action; all destination pages loaded |
| Q Recent activity | PASS | Actual source-event ordering/unique IDs and links verified; positive browser fixture |
| R 15 routes | PASS | All15 loaded with one correct active link and no overflow at1560/390 |
| S Compact | PASS (bounded) | Width/margin76px, all15 links, persistence after reload; complete compact keyboard-tooltip pass outstanding |
| T Mobile | PARTIAL |390px dialog role, inert content, initial close focus and Escape restoration passed; full Tab loop/backdrop/route-dismiss matrix outstanding |
| U Location | PASS | Active owned default persisted in both headers and checkout; inactive/other-user default rejected |
| V Notifications | PASS | Actual unread aggregate/read isolation and browser counters |
| W Responsive | PARTIAL | Desktop1560 and mobile390 all routes passed;1024 tablet not executed successfully after viewport tooling ceased applying to replacement tabs |
| X Accessibility | PARTIAL | Keyboard group Space/Enter, labels/AX tree, initial focus/Escape,15px floor passed; full focus loop, screen-reader and live reduced-motion checks outstanding |
| Y Source failure | PASS | Read-model outage test; temporary local HTTP/WebSocket proxy isolated refill503 while other widgets/navigation worked; source restored and Retry recovered with no reload |
| Z Direct API isolation | PASS | Strict new widget input, role and identity binding; existing reads cannot widen ownership with supplied customer IDs; address/notification negatives and regression suites |

Browser data: customer-dashboard-browser-20261030.json, customer-dashboard-journeys-20261030.json, customer-protected-routes-20261030.json. Screenshots are under docs/screenshots/customer-dashboard-* and customer-refill-feedback-20261030.png. The temporary failure proxy and owned QA servers were stopped, viewport override reset and QA browser sessions signed out.

Local PGlite order-summary timing: 10 samples, see the focused log for actual median/max. This is a small local read-model measurement, not production throughput, navigation latency or load certification. Full page loading and independent skeletons were observed; no production Core Web Vitals claim is made.

This phase is not fully accepted until remaining CD-13/CD-14 verification is complete. Public commercial production remains NO-GO for the separate blocker register.
