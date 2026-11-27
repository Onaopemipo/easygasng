# Default Lagos user branch

[Machine-readable matrix](lagos-default-rtm.json) · [Operating guide](../user-manual/default-user-branch.md) · [Reviewed migration084](../lagos-default/apply-migration084.sql).

Implementation is ready and locally verified. Shared demo migration and publishing are pending action-time confirmation: assigning the six missing customer profiles changes Lagos staff visibility. No shared data has been changed by this phase yet. Existing explicit branch assignments are preserved.

| Requirement | Implementation and authoritative data | Executed acceptance | Status / remaining gate |
|---|---|---|---|
| LAG-01 | Shared default helper; register/customer/phone-order creation and invitation schemas; users.branch_id and active branches | LAG-MIGRATE/REGISTER/CREATE/STAFF/CHOICE; real staff/customer forms | Implemented-unverified; published behaviour pending |
| LAG-02 | Migration084, bootstrap, atomic owner wrapper; users and audit_events | LAG-MIGRATE/GUARD/OPERATOR, all business-table checks, repeat/changed-count rejection | Partial; six shared missing branches still pending |
| LAG-03 | Customers update/edit; Admin-only active destination; immutable audit; existing staff governance | LAG-EDIT; real browser save/reopen; staff isolation/privilege regression | Implemented-unverified; demo rollout pending |
| LAG-04 | Bounded490-file release and read-only build gate; operating guide | 55/55 regression, zero skipped; web types and build pass; actual Customers/staff browser checks | Partial; candidate/stable/schema readback and final release-evidence reconciliation pending |

Coverage: 4/4 implemented, 0/4 fully verified against rollout gates; 0/3 critical fully verified; 0/4 overall gates closed. All five routes mapped, two local browser routes verified, no hosted browser acceptance yet. No requirements excluded. Local verification is not a whole-system release decision.

Security: public registration cannot supply a role or branch. Manager defaults cannot cross their scope. Only Admin can move customer/commercial accounts to an active branch. Existing accounts keep explicit assignments. Staff moves retain Roles & Access approval and grant invalidation. Existing order fulfilment branches, identities, balances and financial history are preserved; the migration produces per-account audits and normal privilege-version trigger effects.

Evidence: [55-case regression](../lagos-default/evidence/regression.txt), [operator migration test](../lagos-default/evidence/operator-migration-test.txt), [types](../lagos-default/evidence/typecheck.txt), [build](../lagos-default/evidence/build.txt), [actual local browser acceptance](../lagos-default/evidence/local-browser.json), [prepared source manifest](../lagos-default/evidence/release-source.json).

Production NO-GO and all unrelated physical/provider/native/import/retain-all holds remain unchanged. No mobile binary, real-provider message, reward addition or payment is part of this change.
