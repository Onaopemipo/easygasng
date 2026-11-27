# Default Lagos user branch

[Machine-readable matrix](lagos-default-rtm.json) · [Operating guide](../user-manual/default-user-branch.md) · [Reviewed migration084](../lagos-default/apply-migration084.sql).

Published to the [existing demo](https://easygas-client-demo.vercel.app). User approved shared migration and push/deploy. Migration084 committed successfully, fills six missing customer branches with audit records, and preserves explicit existing branches and all other business data through transaction assertions. No points or wallet amounts were added.

| Requirement | Actual implementation / authoritative data | Executed acceptance | Status |
|---|---|---|---|
| LAG-01 | Shared default helper; register/customer/phone-order creation and staff invitation schemas; users.branch_id, active branches | LAG-MIGRATE/REGISTER/CREATE/STAFF/CHOICE; actual customer/staff default forms; hosted schema/default and lookup | Verified complete |
| LAG-02 | Migration084, bootstrap, atomic owner wrapper; users, audit_events, normal privilege-version trigger | LAG-MIGRATE/GUARD/OPERATOR; shared INSERT6, preservation DO, COMMIT and084/zero-missing/six-audit readback | Verified complete |
| LAG-03 | Customers update/edit; Admin-only active destination; audit; staff governance | LAG-EDIT; actual local save/reopen, staff controls and hosted denied transfer/invalid branch tests | Verified complete |
| LAG-04 | Read-only build gate; bounded490-file upload; pushed source9951623; manual and evidence | 55/55 regression,11/11 focused pushed-source cases, web types/build,8 hosted checks, all source hashes matched | Verified complete |

Coverage:4/4 requirements,3/3 critical requirements and4/4 bounded gates verified. All five routes mapped; two local browser routes verified; eight candidate/stable API checks pass. No hosted browser mutation is claimed: actual form save/reopen was isolated, and hosted probes submit only invalid/denied business mutations. No requirements excluded. This is not a whole-system completion percentage.

Security: public registration cannot supply role or branch. Manager defaults cannot cross scope. Only Admin moves customer/commercial accounts to active branches. Staff moves retain Roles & Access approval and grant invalidation. Existing order fulfilment branches, identities, balances and financial history remain; migration adds six audit records and expected privilege-version trigger effects.

Evidence: [regression](../lagos-default/evidence/regression.txt), [operator test](../lagos-default/evidence/operator-migration-test.txt), [shared migration](../lagos-default/evidence/migration-verification.json), [authoritative readback](../lagos-default/evidence/migration-result.json), [types](../lagos-default/evidence/typecheck.txt), [build](../lagos-default/evidence/hosted-build.txt), [actual local browser](../lagos-default/evidence/local-browser.json), [pushed source tests](../lagos-default/evidence/pushed-source-tests.txt), [candidate](../lagos-default/evidence/candidate-hosted.json), [stable](../lagos-default/evidence/stable-hosted.json), [source hashes](../lagos-default/evidence/release-source.json), [Git push](../lagos-default/evidence/git-push.json).

Release `dpl_3YuDqESnCgxz2Wc1zQ57uwLHdxpe`:490 files,9 changed existing,3 added,478 unchanged from `dpl_Coy1nPuwgY6Zt9xADSu8AZGQYqsE`. No environment change or mobile binary. Current-source checks use an explicit verified successor for RADD/RSEL without rewriting historical evidence or dropping stable IDs.

Production NO-GO and all unrelated physical/provider/native/import/retain-all holds remain. No outstanding work within this bounded phase.
