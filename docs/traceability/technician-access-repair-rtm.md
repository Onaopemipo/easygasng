# Technician access repair

[Machine-readable matrix](technician-access-repair-rtm.json) · [Executed evidence and rollback](technician-access-repair-evidence.txt)

| Requirement | Acceptance |
| --- | --- |
| TECH-ACCESS-R01 · Technician web workspace opens after sign-in | Hosted Chrome reached assigned bookings and the service catalogue. Management and finance remained restricted. |
| TECH-ACCESS-R02 · Technician sign-in and initialization work under the restricted database role | Staged and stable hosted login, repeated initialization and assigned-jobs API passed. |
| TECH-ACCESS-R03 · Shared session changes preserve driver access boundaries | Dedicated and shared login, scoped delivery APIs, access denials and the delivery workspace passed. |

All three gates passed for the Vercel demo access repair. The earlier DEMO-LOGIN02 failures remain in historical evidence. Installed app and commercial production acceptance remain open.
