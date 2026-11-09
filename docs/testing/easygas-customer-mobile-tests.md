# Customer mobile test register

Baseline: 302 PASS / 12 SKIP. Regression with disposable PostgreSQL: 319 PASS / 0 FAIL / 0 SKIP. Focused new tests include CUI-DATA, CUI-NAV, CUI-SCOPE, CUI-LINK and CUI-HTTP. Test-case PASS is bounded to the stated evidence, not a full release gate.

| ID | Approved scenario | Status | Actual evidence / limitation |
|---|---|---|---|
| T01 | Git changes preserved | PASS | Unborn main preserved; source archive and onboarding/config checksums. |
| T02 | current native build | PASS | Actual iOS release simulator build; Android bundle export. No signed physical-device certification. |
| T03 | website regression | PASS | Web build and 319-test PostgreSQL-enabled regression passed. |
| T04 | authentication/session | PASS | Real isolated demo login; no credential changes. |
| T05 | cross-customer isolation | PASS | CUI-DATA plus existing server ownership negative tests. |
| T06 | all 12 screens | NOT_TESTED | All twelve populated native screens not exercised; demo policy/slots and data are absent. |
| T07 | bottom tabs and back | PASS | Bounded iOS simulator: customer tabs, nested Back and protected My Cylinders → login → intended screen observed. Android navigation not certified. |
| T08 | deep links | NOT_TESTED | CUI-LINK pure allowlist passed; native cold-start and assisted-link scenarios remain untested. |
| T09 | light | PASS | Actual light Home and account navigation observed; screenshot recorded. All populated-state contrast/device checks remain open. |
| T10 | dark | NOT_TESTED | Dark screenshots and actual native screens observed; all populated sheets not covered. |
| T11 | system | NOT_TESTED | System resolver unit passed; actual OS appearance transition not executed. |
| T12 | persisted theme/no flash | NOT_TESTED | Dark preference survived rebuild/relaunch; exhaustive no-flash/lifecycle acceptance pending. |
| T13 | reduced motion | NOT_TESTED | Existing domain controls retained; full native scenario not executed. |
| T14 | phone/tablet/keyboard/accessibility | NOT_TESTED | Physical phone/tablet, VoiceOver/TalkBack and large-text matrix not executed. |
| T15 | loading/empty/error states | NOT_TESTED | Actual empty states, GET/POST recovery and retry verified in bounded simulator; injected all-screen offline matrix pending. |
| T16 | backend pricing/fee | PASS | Executed existing regression and focused tests; see regression-final.txt and customer-tests.txt. No claim of provider/device certification. |
| T17 | decimal quantities and capacity | PASS | Actual typing 1. then 5 retained 1.5; shared gas policy validator and server checks reused. |
| T18 | inactive location rejection | PASS | Executed existing regression and focused tests; see regression-final.txt and customer-tests.txt. No claim of provider/device certification. |
| T19 | stock and cylinder custody | PASS | Executed existing regression and focused tests; see regression-final.txt and customer-tests.txt. No claim of provider/device certification. |
| T20 | cart persistence | NOT_TESTED | Existing cart persistence preserved; full native restart scenarios pending. |
| T21 | Paystack verified success | BLOCKED | Live/sandbox merchant credentials not configured; no fake Paystack channels. |
| T22 | failed/pending/reversed | BLOCKED | Provider-specific outcome scenarios not executed; existing reconciliation controls preserved. |
| T23 | duplicate webhook/ledger protection | PASS | Existing idempotency and ledger tests passed; not Paystack provider certification. |
| T24 | no client secrets | PASS | Executed existing regression and focused tests; see regression-final.txt and customer-tests.txt. No claim of provider/device certification. |
| T25 | assisted profile-link continuity | NOT_TESTED | Web-assisted identity/completion remains canonical; native one-time assisted completion not certified. |
| T26 | on-site amendment/supplementary invoice/one delivery fee | NOT_TESTED | Prior doorstep amendment/vehicle-stock completeness gap remains; not solved by UI. |
| T27 | real order events | NOT_TESTED | Backend event tests passed; populated native timeline not exercised. |
| T28 | driver ownership | PASS | Executed existing regression and focused tests; see regression-final.txt and customer-tests.txt. No claim of provider/device certification. |
| T29 | stale/offline GPS honesty | PASS | Server and UI explicitly show GPS/ETA unavailable; no fabricated map. |
| T30 | proof photo access and history | NOT_TESTED | Existing proof ownership/history tests pass; actual native populated photo flow not exercised. |
| T31 | active services only | PASS | Only actual active catalogue entries consumed; demo catalogue is empty. |
| T32 | real slots | NOT_TESTED | No qualified demo slots; native slot-selection scenario not exercised. |
| T33 | booking concurrency | PASS | Executed existing regression and focused tests; see regression-final.txt and customer-tests.txt. No claim of provider/device certification. |
| T34 | quotation approval and payment | NOT_TESTED | Existing quotation/payment domain tests pass; native service workflow not exercised with qualified fixtures. |
| T35 | cancellation/reschedule | NOT_TESTED | Existing cancellation/reschedule handlers retained; native populated scenario pending. |
| T36 | multiple cylinder profiles | PASS | Two same-capacity owned cylinders remain distinct in isolated fixture; other customer/staff reads denied. |
| T37 | refill prediction with insufficient data | PASS | Executed existing regression and focused tests; see regression-final.txt and customer-tests.txt. No claim of provider/device certification. |
| T38 | reminder consent | PASS | Executed existing regression and focused tests; see regression-final.txt and customer-tests.txt. No claim of provider/device certification. |
| T39 | wallet ledger balance | PASS | Actual zero balance/empty ledger from backend; no dummy funds. |
| T40 | concurrent redemption | PASS | Executed existing regression and focused tests; see regression-final.txt and customer-tests.txt. No claim of provider/device certification. |
| T41 | private invoice/receipt access | PASS | Existing private invoice/PDF ownership tests plus new invoice list negatives pass; native share-sheet handover remains untested. |
| T42 | notifications/read/deep link | NOT_TESTED | CUI-NAV routing and actual empty notifications verified; populated read/deep-link scenario pending. |
| T43 | SMS/WhatsApp fallback | BLOCKED | Provider SMS/official WhatsApp remain disabled/unconfigured; no delivered-message claim. |
| T44 | rewards integration | PASS | Executed existing regression and focused tests; see regression-final.txt and customer-tests.txt. No claim of provider/device certification. |
| T45 | logout cache clearing | PASS | Actual simulator sign-out removed identity/counts/history; actual reauthentication restored only current customer. Cross-account backend negatives also passed; full device matrix pending. |
| T46 | idempotent retries | PASS | Executed existing regression and focused tests; see regression-final.txt and customer-tests.txt. No claim of provider/device certification. |
| T47 | rollback on injected failure | PASS | Executed existing regression and focused tests; see regression-final.txt and customer-tests.txt. No claim of provider/device certification. |
| T48 | multi-connection PostgreSQL concurrency | PASS | Full suite executed with disposable PostgreSQL/multiple connection tests; cluster stopped afterward. |
| T49 | R01–R05 regression | PASS | Existing gas/inventory/branch/custody safety regression tests passed unchanged. |
| T50 | offline replay | NOT_TESTED | Existing secure staff queue preserved; full customer offline replay scenario pending. |
| T51 | restart/session expiry | NOT_TESTED | Session restoration observed; expiry/restart exhaustive native matrix pending. |
| T52 | no dummy content | PASS | Executed existing regression and focused tests; see regression-final.txt and customer-tests.txt. No claim of provider/device certification. |
| T53 | lint/typecheck/build | PASS | Both typechecks, web build, iOS simulator build, Android JS export passed. No lint script exists; lint is NOT_AVAILABLE, not passed. |
| T54 | real-device iOS/Android smoke tests when devices are available | NOT_TESTED | No physical-device iOS/Android smoke certification. |
