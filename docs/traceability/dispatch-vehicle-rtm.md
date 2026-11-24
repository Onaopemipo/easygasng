# Direct Dispatch vehicle assignment

Four requirements implemented; three locally verified, one pending hosted publication/full CI. Zero exclusions.

| Requirement | Gate | Status | Evidence |
| --- | --- | --- | --- |
| DV-R01 Direct admin trip creation | DV-G01 | VERIFIED_COMPLETE | Real trip, optional availability, driver snapshot, atomic negative cases |
| DV-R02 Simple accessible Dispatch form | DV-G02 | VERIFIED_COMPLETE | Owner/manager, phone/tablet/dark, password/retry/dirty, both blocker shortcuts |
| DV-R03 Security and concurrency | DV-G03 | VERIFIED_COMPLETE | Wrong roles/branches, revoked authority, release-off, independent PostgreSQL races, original final guards |
| DV-R04 Manual, traceability and rollout | DV-G04 | PARTIAL | Local 48 checks and six actual UI cases; hosted/CI pending |

[JSON matrix](dispatch-vehicle-rtm.json) maps actual sources, controls, test IDs and outstanding work. [Report](../dispatch-vehicle/README.md), [manual](../user-manual/dispatch-setup.md). Original production NO-GO and unrelated native/provider/physical/import/retain-all holds remain.
