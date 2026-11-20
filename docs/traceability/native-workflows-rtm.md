# Native workflow port traceability

Status: PARTIAL. Production NO-GO, actual-import hold and retain-all remain.

All 36 feature families and 300 leaf IDs are retained. None is claimed fully accepted solely from a route, form render or prototype test. [Detailed leaf acceptance](../native-workflows/feature-acceptance.json). [Implementation and evidence](../native-workflows/README.md).

| Requirement | Native coverage | Status | Gate |
|---|---|---|---|
| FEATURE-01 | Discover and compare | PARTIAL | NATIVE-G01 |
| FEATURE-02 | Order and checkout | PARTIAL | NATIVE-G01 |
| FEATURE-03 | Shopping cart | PARTIAL | NATIVE-G01 |
| FEATURE-04 | My orders | PARTIAL | NATIVE-G01 |
| FEATURE-05 | Account and privacy | PARTIAL | NATIVE-G01 |
| FEATURE-06 | Purchase credit and wallet | PARTIAL | NATIVE-G01 |
| FEATURE-07 | Customer service visits | PARTIAL | NATIVE-G01 |
| FEATURE-08 | Rewards and refill planning | PARTIAL | NATIVE-G01 |
| FEATURE-09 | Customer support | PARTIAL | NATIVE-G01 |
| FEATURE-10 | Business dashboard | PARTIAL | NATIVE-G02 |
| FEATURE-11 | Order management | PARTIAL | NATIVE-G02 |
| FEATURE-12 | Retail point of sale | PARTIAL | NATIVE-G02 |
| FEATURE-13 | Customer management | PARTIAL | NATIVE-G02 |
| FEATURE-14 | Support desk | PARTIAL | NATIVE-G02 |
| FEATURE-15 | Catalogue and bundles | PARTIAL | NATIVE-G02 |
| FEATURE-16 | Inventory management | PARTIAL | NATIVE-G02 |
| FEATURE-17 | Cylinder records | PARTIAL | NATIVE-G02 |
| FEATURE-18 | Dispatch and driver management | PARTIAL | NATIVE-G03 |
| FEATURE-19 | Driver workspace | PARTIAL | NATIVE-G03 |
| FEATURE-20 | Professional services | PARTIAL | NATIVE-G03 |
| FEATURE-21 | Technician workspace | PARTIAL | NATIVE-G03 |
| FEATURE-22 | Staff and qualifications | PARTIAL | NATIVE-G03 |
| FEATURE-23 | Quotations | PARTIAL | NATIVE-G03 |
| FEATURE-24 | Finance workspace | PARTIAL | NATIVE-G02 |
| FEATURE-25 | Financial reconciliation | PARTIAL | NATIVE-G02 |
| FEATURE-26 | Credits and refunds | PARTIAL | NATIVE-G02 |
| FEATURE-27 | Reports and analytics | PARTIAL | NATIVE-G02 |
| FEATURE-28 | Campaigns | PARTIAL | NATIVE-G02 |
| FEATURE-29 | Recommendations | PARTIAL | NATIVE-G02 |
| FEATURE-30 | Testimonials | PARTIAL | NATIVE-G02 |
| FEATURE-31 | Approvals and settings | PARTIAL | NATIVE-G02 |
| FEATURE-32 | Operations centre | PARTIAL | NATIVE-G02 |
| FEATURE-33 | Governance and incidents | PARTIAL | NATIVE-G02 |
| FEATURE-34 | Policies and legal information | PARTIAL | NATIVE-G02 |
| FEATURE-35 | Identity and entry links | PARTIAL | NATIVE-G02 |
| FEATURE-36 | Global navigation and appearance | PARTIAL | NATIVE-G02 |

| Gate | Result | Reason |
|---|---|---|
| NATIVE-G01 | PARTIAL | Native account-entry port and API security checks executed; provider delivery and exhaustive customer device acceptance remain. |
| NATIVE-G02 | PARTIAL | 25 native workspaces and 97 action forms; all permitted tabs load over real HTTP. Representative writes have canonical readback. Every leaf interaction is not individually device-accepted. |
| NATIVE-G03 | PARTIAL | Existing driver/technician APIs passed broad regression; simulator assignment acknowledgement and pickup guard tested. Physical fulfilment, locked/background/replay and all exceptions need device acceptance. |
| NATIVE-G04 | PASS | Bounded six-role API/renderer boundary tests and stale, expired, duplicate, cross-branch, self-review, offline/unknown-outcome negatives executed; no production/concurrency certification implied. |
| NATIVE-G05 | PASS | Native/web types, iOS simulator build, Android APK/bundle and 9 rendered native/API checks pass, including role-filtered report schedules and all 97 forms. Six iOS roles observed; report/share-sheet and invalid-link checks recorded on the installed acceptance build. Final schedule/role-enum delta rebuilt and component/API-tested; Android visual/device/provider acceptance is not claimed. |
| NATIVE-G06 | BLOCKED | No signed physical-device/store release, live provider acceptance, physical gas/meter/cylinder certification or independent PostgreSQL concurrency acceptance completed. Existing production NO-GO remains. |

Implementation coverage: 36 families represented, with completeness limited as described in each row; 25 native workspace modules. Verification: 0/36 fully accepted, 300 individual leaves retained, 14 existing external blocks retained. Critical coverage: 4/4 rows have negative tests, 0/4 full operational acceptance. Gate coverage: 2/6 pass, 3 partial, 1 blocked. No requirements excluded.

Executed: 136 focused native/API/logic checks, 9 component/API checks (97 registered forms), 69 report/role permission checks, 6 installed iOS personas; full regression 1,042 pass/28 existing skips. Android APK build/install/launch passed; Android visual/physical-device acceptance remains open. [Simulator observations](../native-workflows/evidence/simulator-observations.json) and [source/build hashes](../native-workflows/evidence/build-manifest.json).

Final source checks: [162 targeted passes](../native-workflows/evidence/final-targeted.txt), [9 component/API passes](../native-workflows/evidence/component-test.txt), [3 native traceability passes](../native-workflows/evidence/matrix-validation.txt). Counts overlap with the broad regression and do not constitute 300 individually completed device acceptances.

Deployment follow-up: source commit is complete; deployment with “no new build” is pending build-scope clarification. [Artifact inspection and current deployment](../native-workflows/NO-BUILD-DEPLOYMENT.md). No new build or release acceptance is claimed.
