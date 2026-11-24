# Admin trip closure and vehicle change

[Authoritative JSON matrix](dispatch-trip-rtm.json). Four requirements retained, four implemented, three verified; TC-R04 remains partial pending hosted/full CI. Zero exclusions.

| Requirement | Implementation | Evidence / gate | Status |
| --- | --- | --- | --- |
| TC-R01 Admin end trip | dispatch-trip backend and dialog | TC-END, local manager browser / TC-G01 | Verified locally |
| TC-R02 Atomic vehicle replacement | locked old/new trip transaction | TC-CHANGE, TC-PG, owner browser / TC-G02 | Verified locally |
| TC-R03 Reconciliation and authority | canonical custody, version, password and scoped privilege guards | TC-CUSTODY, TC-RECEIVE, TC-AUTH / TC-G03 | Verified locally |
| TC-R04 UI, manual, publication | Dispatch controls, responsive modal, guides | TC-UI/BLOCKERS/RECOVERY/SOURCE; hosted/full CI pending / TC-G04 | Partial |

[Executed focused suite](../dispatch-trip/evidence/focused.txt), [browser checks](../dispatch-trip/evidence/browser-local.json), [manual](../user-manual/dispatch-setup.md#end-a-trip-or-change-its-vehicle-as-an-administrator). Existing production NO-GO and unrelated holds remain. No mobile binary/export.
