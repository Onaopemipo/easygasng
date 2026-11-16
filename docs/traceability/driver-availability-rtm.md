# Driver availability and staff onboarding

[Machine-readable requirements](driver-availability-rtm.json) · [Local test evidence](driver-availability-evidence.txt)

| Requirement | Implementation and verification |
| --- | --- |
| DRIVER-AVAIL-R01 | The approved activation of an active account into the Driver role sets the stored preference to available and records the change. Existing drivers keep their choices. Local approval and opt-out regression passed. |
| DRIVER-AVAIL-R02 | Authorised staff can change the preference from Drivers → Manage. The driver’s Home switch remains available. Both paths use the same active branch, assignment and release checks. Backend and type checks passed. Authenticated Chromium verified the owner action at 1440 px and branch manager action at 390 px. |

Both requirements and both acceptance gates passed locally. Hosted rollout remains open; no existing preference was reset and no migration is needed. Availability does not verify GPS, assign a delivery, or bypass dispatch checks. Public Commercial Production remains NO-GO.

This phase adds a new default and a directory action to the existing driver management scope. The broader dispatch test run found one unrelated hash mismatch for the previously edited payment orchestrator. The functional dispatch safety checks passed.
