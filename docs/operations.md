# Operational handover

Keep local hosting and unconnected external payments/messaging. The normal development URL is `http://127.0.0.1:3003`. An isolated QA directory/server on port 3004 was used for synthetic acceptance; its qualifications/prices/appointments are test-only and must never be imported as business records.

Before opening products: verify real approved catalogue/SKUs/photos/specifications, physical stock counts, eligible cylinder serials/inspections, coverage/windows/fees, cash procedures and active branch. Before opening a service: obtain actual qualified personnel and independent credential evidence, reviewed service config/checklist and policies, available slots, equipment/material handling and incident ownership. Draft services are intentionally not bookable.

At each shift: review reservations and upcoming work; confirm assignments/customer contact; reconcile physical materials/unused returns and delivery proof; independently verify collected cash; investigate differences instead of editing ledgers. Review customer acknowledgement/concerns and unsafe reports. Revoke expired/unreliable qualifications immediately using authorised controls. Do not present an unsafe report as a safety clearance.

Use `/admin/incidents` for authorised acknowledgement/resolution with immutable incident events. API/maintenance failures attempt redacted diagnostic incidents. Safety incidents require owner/safety handling. External uptime/error/pager integration and on-call schedules are not configured.

Use `/admin/reconciliation` for verified receipts/pending cash and owner-global liability totals. Labour/overhead/tax/accounts-payable information remains incomplete, so it is not a full accounting system. Old capped CSV is not a complete general ledger.

Maintenance serialises persisted work and uses deduplication keys. With local PGlite only one process may own a directory; never delete its live lock or start a second worker against it. For managed PostgreSQL, deploy a supervised worker, health checks, bounded retry/dead-letter procedures and tested shutdown/restart behaviour. Review pending jobs and unresolved incidents after failure. `EASYGAS_BACKGROUND_JOBS=false` disables the in-process timer.

Read `/admin/readiness` and the twenty-gate report before any release proposal. Policies require real text and independent owner approval. Publishing placeholder text does not pass operational/legal acceptance. No real stock, credentials, customer transactions or safety approvals were fabricated in this work.
