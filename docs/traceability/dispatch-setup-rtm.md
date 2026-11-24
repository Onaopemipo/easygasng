# Dispatch setup checklist and assignment

All four approved requirements and gates are verified; zero exclusions.

| Requirement | Gate | Status | Evidence |
| --- | --- | --- | --- |
| DS-R01 Canonical branch setup checklist | DS-G01 | VERIFIED_COMPLETE | Scoped/read-only data tests, stale recovery and responsive actual UI |
| DS-R02 Direct role-aware setup actions | DS-G02 | VERIFIED_COMPLETE | Drivers, Fleet, Branches and scoped delivery category; owner/manager checks |
| DS-R03 Ready-first/compact blocked assignment | DS-G03 | VERIFIED_COMPLETE | Orders and Dispatch actual UI, disabled blocked/unknown drivers, keyboard and final-guard negatives |
| DS-R04 Verification, documentation and hosted rollout | DS-G04 | VERIFIED_COMPLETE | 33 focused checks, five local/four hosted UI cases, 448-file source proof, preserved business snapshots and 1,248 full CI regressions |

[JSON matrix](dispatch-setup-rtm.json) maps authoritative data, implementation/security, executed test IDs and remaining work. [Report](../dispatch-setup/README.md), [manual](../user-manual/dispatch-setup.md). Original production NO-GO and broader physical/assistive/native/provider/import/retain-all holds remain.

[Full CI 45298859532](https://github.com/Onaopemipo/easygasng/actions/runs/45298859532) passes at test-only `2ccc15d`. All 448 runtime application files match Ready deployed source `8bb1627`. Final documentation/operator evidence changes require no new deployment or mobile binary.
