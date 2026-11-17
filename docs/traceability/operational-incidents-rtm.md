# Operational Incidents register

Scope: replace the always-open response forms on the web `/admin/incidents` route. The grouped administration sidebar, native experience, incident status options, and existing response audit trail are preserved. No schema migration is required. Public commercial production remains NO-GO.

| ID | Requirement and source of truth | Verification and gate | Status |
| --- | --- | --- | --- |
| ADM-INC-R01 | Browse all authorised incident statuses. Counts, filters and pagination come from incident and branch records. | ADM-INC-G01: 106 synthetic incidents tested, including an older record past the legacy 100-record cap, literal search and branch isolation. Desktop Chrome exercised pagination and filters. | Verified locally |
| ADM-INC-R02 | Per-row Actions opens the selected incident's details or available response form. | ADM-INC-G02: authenticated Chrome checks at 1440px and 390px covered stable table geometry, dismissal and focus, constrained mobile layout, dark appearance, and Finance viewing without editing. | Verified locally |
| ADM-INC-R03 | Persist authorised responses and evidence using the existing incident update action. | ADM-INC-G03: tests cover denied cross-branch and business-wide writes, Finance write denial, safety resolution authority, missing evidence, verification and persisted events. A browser test saved a dispute response after re-verification. | Verified locally |

All three scoped requirements are verified locally. The [machine-readable matrix](operational-incidents-rtm.json) maps each requirement to implementation, security controls and acceptance gates. See the [executed checks](operational-incidents-evidence.txt). Hosted demo rollout and acceptance are pending.

Rollback: revert the scoped application changes or redeploy the previous version. Previously recorded incident responses and evidence remain in the database.
