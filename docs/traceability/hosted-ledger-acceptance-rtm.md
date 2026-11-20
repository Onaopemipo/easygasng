# Hosted ledger endpoint and role acceptance

[Machine-readable matrix](hosted-ledger-acceptance-rtm.json) · [Report and executed evidence](../hosted-ledger-acceptance/README.md)

| ID | Requirement / gate | Status | Evidence |
| --- | --- | --- | --- |
| HLED-01 | Correct endpoint, complete stable pagination / G01 | VERIFIED COMPLETE / PASS | Hosted 10 rows at limit 1 and 500; independent snapshot matches |
| HLED-02 | Seven roles, anonymous, method/input restrictions / G02 | VERIFIED COMPLETE / PASS | Owner/finance 200; five denied roles and two restricted workspace sessions 403; anonymous 401; strict inputs 400; wrong method 405 |
| HLED-03 | Branch/cursor isolation and source preservation / G03 | PARTIAL | Hosted financial state unchanged; local restricted-server two-branch/tied-cursor pass. Hosted foreign-branch payment unavailable, untested |
| HLED-04 | Repair tooling and reconcile prior gap / G04 | VERIFIED COMPLETE / PASS | Corrected verifier uses complete `finance.ledger` pagination; prior 405 retained as history |

Coverage: implemented **4/4**, verified requirements **3/4** plus **1 partial**, gates **3/4** plus **1 partial**, roles **7/7**, original hosted business endpoints **4/4**, expanded hosted checks **29/30** plus **1 unavailable**, local branch-isolation **1/1**, hosted foreign-branch case **0/1**. No exclusions or silent denominator reductions.

Five targeted acceptance tests and six service-source regressions pass. All implementation/source/security/test mappings are in the JSON. Hosted QA transactions were read-only; own auth sessions revoked and normal audit writes expected. No app deployment or native build was needed. Production NO-GO, actual-import hold, retain-all and unrelated release gates remain.
