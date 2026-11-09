# Audit gap and dependency plan
| Area | Initial state | Existing authority | Plan |
|---|---|---|---|
| Identity/booking/qualification | PARTIAL | auth.ts / professional-services.ts | Reuse; technician-only workspace |
| Chargeable start | DEFECTIVE P0 | professional-services.ts | Separate assessment; server guard approval + verified payment |
| Independent quote approval | MISSING | shared governance | Extend existing change-request capability |
| Checklist/material/report | PARTIAL | canonical service actions | Recheck authorisation, retain safety/reconciliation |
| Private evidence | PARTIAL | media_assets/media routes | Reuse booking-scoped upload |
| Native 13 screens | MISSING | Services.tsx / shared theme | Extend role-specific shell |
| Offline/device/concurrency | PARTIAL | existing encrypted queue/tests | Retain pending drafts, test actual capabilities |

Do not stop independent UI/security/test work for unavailable production providers. Global driver cutover, Excel import hold and other prior NO-GO remain unchanged.
