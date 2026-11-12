# Cooking Gas Profiles traceability

Production decision remains NO-GO. All 65 scenarios and 30 gates remain in scope.

[Repository audit](../cooking-gas-profiles-redesign/00-repository-audit.md) · [API map](../cooking-gas-profiles-redesign/01-api-permissions-map.md) · [Executed evidence](../cooking-gas-profiles-redesign/04-test-results.md) · [Rollback](../cooking-gas-profiles-redesign/05-rollback.md) · [JSON](cooking-gas-profiles-redesign-rtm.json)

## Requirements

| ID | Requirement | Status | Evidence and outstanding work |
| --- | --- | --- | --- |
| CGP-001 | Repository audit and baseline | VERIFIED_COMPLETE | Audit and baseline recorded. |
| CGP-002 | Preserve routes, shell and navigation | VERIFIED_COMPLETE | Existing web entries and customer shell verified with authenticated Chromium. The native entry remains the customer account and Smart Refill navigation. |
| CGP-003 | Authoritative overview counts | VERIFIED_COMPLETE | Authoritative count and missing-source handling verified. |
| CGP-004 | Smart Refill eligibility and redemption | VERIFIED_COMPLETE | Approved offer, verified history, expiry, opt-out and budget tests passed. |
| CGP-005 | Verified history and estimate semantics | VERIFIED_COMPLETE | Verified history and insufficient-history cases passed. |
| CGP-006 | Supply editing and conflict recovery | VERIFIED_COMPLETE | Confirmed save, reset, stale conflict, throttling and independent PostgreSQL concurrency passed. |
| CGP-007 | Contextual profile creation | VERIFIED_COMPLETE | Browser creation, refill-product validation and concurrent duplicate prevention passed. |
| CGP-008 | Responsive and accessible web design | PARTIAL | Browser viewport, keyboard, dialog and theme checks passed. Screen-reader audit remains open. |
| CGP-009 | Native design and device acceptance | PARTIAL | Native types and both exports passed. iPhone 17 Pro and the unminified Pixel 8 variant passed the core profile flow. Minified Android release startup remains blocked. |
| CGP-010 | Session isolation and offline handling | PARTIAL | Account and role isolation and offline web recovery passed. Device accessibility and broader connectivity cases remain open. |
| CGP-011 | Non-regression and release evidence | PARTIAL | The full automated suite and rollback review passed. Native release and production gates remain open. |

## Scenarios

| ID | Check | Status |
| --- | --- | --- |
| CGP-T01 | route loads for authorised customer | [PASS](../cooking-gas-profiles-redesign/evidence/browser.txt) |
| CGP-T02 | existing sidebar intact | [PASS](../cooking-gas-profiles-redesign/evidence/browser.txt) |
| CGP-T03 | header/search/location/cart/theme intact | [PASS](../cooking-gas-profiles-redesign/evidence/browser.txt) |
| CGP-T04 | direct link and refresh | [PASS](../cooking-gas-profiles-redesign/evidence/browser.txt) |
| CGP-T05 | real profile count | [PASS](../cooking-gas-profiles-redesign/evidence/browser.txt) |
| CGP-T06 | missing count unavailable | [PASS](../cooking-gas-profiles-redesign/evidence/focused.txt) |
| CGP-T07 | real zero count | [PASS](../cooking-gas-profiles-redesign/evidence/browser.txt) |
| CGP-T08 | recurring count distinct from profiles | [PASS](../cooking-gas-profiles-redesign/evidence/focused.txt) |
| CGP-T09 | no unsupported recurring metric | [PASS](../cooking-gas-profiles-redesign/evidence/focused.txt) |
| CGP-T10 | eligible offers count | [PASS](../cooking-gas-profiles-redesign/evidence/full-regression.txt) |
| CGP-T11 | no approved offers | [PASS](../cooking-gas-profiles-redesign/evidence/browser.txt) |
| CGP-T12 | opted-out offers hidden | [PASS](../cooking-gas-profiles-redesign/evidence/full-regression.txt) |
| CGP-T13 | expired offers hidden | [PASS](../cooking-gas-profiles-redesign/evidence/full-regression.txt) |
| CGP-T14 | profile list stable IDs | [PASS](../cooking-gas-profiles-redesign/evidence/browser.txt) |
| CGP-T15 | one profile | [PASS](../cooking-gas-profiles-redesign/evidence/browser.txt) |
| CGP-T16 | multiple profiles | [PASS](../cooking-gas-profiles-redesign/evidence/browser.txt) |
| CGP-T17 | empty profile state | [PASS](../cooking-gas-profiles-redesign/evidence/browser.txt) |
| CGP-T18 | actual cylinder capacity | [PASS](../cooking-gas-profiles-redesign/evidence/browser.txt) |
| CGP-T19 | missing cylinder details | NOT RUN |
| CGP-T20 | supply options from backend | [PASS](../cooking-gas-profiles-redesign/evidence/browser.txt) |
| CGP-T21 | current supply preselected | [PASS](../cooking-gas-profiles-redesign/evidence/browser.txt) |
| CGP-T22 | supply validation | [PASS](../cooking-gas-profiles-redesign/evidence/focused.txt) |
| CGP-T23 | save success | [PASS](../cooking-gas-profiles-redesign/evidence/browser.txt) |
| CGP-T24 | save failure | [PASS](../cooking-gas-profiles-redesign/evidence/browser.txt) |
| CGP-T25 | duplicate save prevented | [PASS](../cooking-gas-profiles-redesign/evidence/focused.txt) |
| CGP-T26 | local cancel/reset | [PASS](../cooking-gas-profiles-redesign/evidence/browser.txt) |
| CGP-T27 | concurrent edit conflict | [PASS](../cooking-gas-profiles-redesign/evidence/focused.txt) |
| CGP-T28 | deleted profile while editing | NOT RUN |
| CGP-T29 | cross-user profile read denied | [PASS](../cooking-gas-profiles-redesign/evidence/browser.txt) |
| CGP-T30 | cross-user profile write denied | [PASS](../cooking-gas-profiles-redesign/evidence/focused.txt) |
| CGP-T31 | staff/driver/technician isolation | [PASS](../cooking-gas-profiles-redesign/evidence/focused.txt) |
| CGP-T32 | session expired | [PASS](../cooking-gas-profiles-redesign/evidence/focused.txt) |
| CGP-T33 | role revoked | NOT RUN |
| CGP-T34 | add profile modal | [PASS](../cooking-gas-profiles-redesign/evidence/browser.txt) |
| CGP-T35 | add profile validation | NOT RUN |
| CGP-T36 | add profile server success | [PASS](../cooking-gas-profiles-redesign/evidence/browser.txt) |
| CGP-T37 | add profile duplicate handling | [PASS](../cooking-gas-profiles-redesign/evidence/focused.txt) |
| CGP-T38 | profile limits preserved | [PASS](../cooking-gas-profiles-redesign/evidence/full-regression.txt) |
| CGP-T39 | supported cylinder sizes | [PASS](../cooking-gas-profiles-redesign/evidence/focused.txt) |
| CGP-T40 | insufficient verified history | [PASS](../cooking-gas-profiles-redesign/evidence/browser.txt) |
| CGP-T41 | two qualifying verified refills | [PASS](../cooking-gas-profiles-redesign/evidence/full-regression.txt) |
| CGP-T42 | unverified purchase excluded | [PASS](../cooking-gas-profiles-redesign/evidence/full-regression.txt) |
| CGP-T43 | cancelled/refunded records according to existing eligibility | NOT RUN |
| CGP-T44 | multi-cylinder eligibility semantics | [PASS](../cooking-gas-profiles-redesign/evidence/full-regression.txt) |
| CGP-T45 | no sensor claim | [PASS](../cooking-gas-profiles-redesign/evidence/browser.txt) |
| CGP-T46 | missing estimate unavailable | [PASS](../cooking-gas-profiles-redesign/evidence/full-regression.txt) |
| CGP-T47 | estimate basis/last update | [PARTIAL](../cooking-gas-profiles-redesign/evidence/browser.txt) |
| CGP-T48 | Smart Refill links | [PASS](../cooking-gas-profiles-redesign/evidence/browser.txt) |
| CGP-T49 | rewards and refill plans preserved | [PASS](../cooking-gas-profiles-redesign/evidence/browser.txt) |
| CGP-T50 | recurring orders preserved | [PASS](../cooking-gas-profiles-redesign/evidence/browser.txt) |
| CGP-T51 | notifications/consent preserved | [PASS](../cooking-gas-profiles-redesign/evidence/full-regression.txt) |
| CGP-T52 | web desktop 1440 | [PASS](../cooking-gas-profiles-redesign/evidence/browser.txt) |
| CGP-T53 | web tablet 768/1024 | [PASS](../cooking-gas-profiles-redesign/evidence/browser.txt) |
| CGP-T54 | mobile web 320/375/390 | [PASS](../cooking-gas-profiles-redesign/evidence/browser.txt) |
| CGP-T55 | iOS layout/safe area | [PASS](../cooking-gas-profiles-redesign/evidence/ios-runtime.txt) |
| CGP-T56 | Android layout/back | [PARTIAL](../cooking-gas-profiles-redesign/evidence/android-runtime.txt) |
| CGP-T57 | light/dark/system | [PARTIAL](../cooking-gas-profiles-redesign/evidence/browser.txt) |
| CGP-T58 | keyboard and focus | [PASS](../cooking-gas-profiles-redesign/evidence/browser.txt) |
| CGP-T59 | screen-reader accordion/dialog | NOT RUN |
| CGP-T60 | offline/stale/retry | [PASS](../cooking-gas-profiles-redesign/evidence/browser.txt) |
| CGP-T61 | financial ledger non-regression | [PASS](../cooking-gas-profiles-redesign/evidence/full-regression.txt) |
| CGP-T62 | inventory/cylinder custody non-regression | [PASS](../cooking-gas-profiles-redesign/evidence/full-regression.txt) |
| CGP-T63 | customer order/checkout non-regression | [PASS](../cooking-gas-profiles-redesign/evidence/full-regression.txt) |
| CGP-T64 | existing production readiness and RTM validator | [PASS](../cooking-gas-profiles-redesign/evidence/full-regression.txt) |
| CGP-T65 | rollback and source diff verified | [PASS](../cooking-gas-profiles-redesign/05-rollback.md) |

## Acceptance gates

| ID | Check | Status |
| --- | --- | --- |
| CGP-G01 | repository audit recorded | [PASS](../cooking-gas-profiles-redesign/04-test-results.md) |
| CGP-G02 | baseline tests recorded | [PASS](../cooking-gas-profiles-redesign/04-test-results.md) |
| CGP-G03 | `/consumption` route preserved | [PASS](../cooking-gas-profiles-redesign/evidence/browser.txt) |
| CGP-G04 | customer shell intact | [PASS](../cooking-gas-profiles-redesign/evidence/browser.txt) |
| CGP-G05 | profile ownership server enforced | [PASS](../cooking-gas-profiles-redesign/evidence/full-regression.txt) |
| CGP-G06 | profile count authoritative | [PASS](../cooking-gas-profiles-redesign/evidence/full-regression.txt) |
| CGP-G07 | recurring count not conflated | [PASS](../cooking-gas-profiles-redesign/evidence/full-regression.txt) |
| CGP-G08 | Smart Refill eligibility correct | [PASS](../cooking-gas-profiles-redesign/evidence/full-regression.txt) |
| CGP-G09 | no fabricated offers | [PASS](../cooking-gas-profiles-redesign/evidence/full-regression.txt) |
| CGP-G10 | no sensor claims | [PASS](../cooking-gas-profiles-redesign/evidence/full-regression.txt) |
| CGP-G11 | verified delivery history rule preserved | [PASS](../cooking-gas-profiles-redesign/evidence/full-regression.txt) |
| CGP-G12 | no false estimates | [PASS](../cooking-gas-profiles-redesign/evidence/full-regression.txt) |
| CGP-G13 | current supply selection preserved | [PASS](../cooking-gas-profiles-redesign/evidence/browser.txt) |
| CGP-G14 | save server-confirmed | [PASS](../cooking-gas-profiles-redesign/evidence/browser.txt) |
| CGP-G15 | add profile functional | [PASS](../cooking-gas-profiles-redesign/evidence/browser.txt) |
| CGP-G16 | profile edit/concurrency safe | [PASS](../cooking-gas-profiles-redesign/evidence/full-regression.txt) |
| CGP-G17 | no lost existing fields | [PASS](../cooking-gas-profiles-redesign/evidence/browser.txt) |
| CGP-G18 | desktop layout matches approved direction | [PASS](../cooking-gas-profiles-redesign/evidence/browser.txt) |
| CGP-G19 | mobile web | [PASS](../cooking-gas-profiles-redesign/evidence/browser.txt) |
| CGP-G20 | native iOS | [PASS](../cooking-gas-profiles-redesign/evidence/ios-runtime.txt) |
| CGP-G21 | native Android | [PARTIAL](../cooking-gas-profiles-redesign/04-test-results.md) |
| CGP-G22 | light/dark/system | [PARTIAL](../cooking-gas-profiles-redesign/04-test-results.md) |
| CGP-G23 | accessible controls | [PARTIAL](../cooking-gas-profiles-redesign/04-test-results.md) |
| CGP-G24 | offline/stale/empty/error states | [PARTIAL](../cooking-gas-profiles-redesign/04-test-results.md) |
| CGP-G25 | cross-role security | [PASS](../cooking-gas-profiles-redesign/evidence/full-regression.txt) |
| CGP-G26 | rewards/recurring/refill regression | [PASS](../cooking-gas-profiles-redesign/evidence/full-regression.txt) |
| CGP-G27 | financial and inventory regression | [PASS](../cooking-gas-profiles-redesign/evidence/full-regression.txt) |
| CGP-G28 | full tests/build evidence | [PASS](../cooking-gas-profiles-redesign/04-test-results.md) |
| CGP-G29 | RTM and rollback complete | [PASS](../cooking-gas-profiles-redesign/04-test-results.md) |
| CGP-G30 | explicit production GO/NO-GO with platform-wide blockers preserved | [NO-GO](../cooking-gas-profiles-redesign/06-final-report.md) |
