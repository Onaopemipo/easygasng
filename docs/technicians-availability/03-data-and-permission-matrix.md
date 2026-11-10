# Data and permission matrix

| Ability | Authorised role / scope | Canonical source / enforcement |
|---|---|---|
| Directory/KPIs/schedule | owner selected/all branches; service_manager, safety_officer, inventory, finance own branch | technicians.workspace strict input, allow(), scoped SQL; field/customer/technical administrator denied |
| Invite colleague | owner; existing technical administrator uses Staff Management | staff.invite, duplicate identity and pending-invitation detection, reauth, existing access approval |
| Edit name/access/status | owner here; existing administrator/manager via Staff Management | staff.edit/security.permissions; no new identity system or implicit qualification |
| Verify/revoke | owner/safety_officer current authorised branch, recent identity verification, distinct subject | technician.qualify/revoke; evidence, expiry, current verifier role and immutable audit; self-review rejected |
| Create/block slot | owner/service_manager authorised branch | services.slot.create/block, active service/branch, qualified active available technician, canonical row lock and overlap check |
| Field availability and qualifications | own technician only | existing technician.snapshot/availability/jobs and restricted session capabilities; no admin destination in field shell |

Directory exposes no email/phone/customer address. Qualification evidence reference text is returned only to owner/safety_officer; other readers get null. KPIs are server-derived; summary is branch-scoped and deliberately independent of directory search/page. Active is account status. On Assignment uses non-terminal current/ongoing bookings. Available Today requires enabled assignment availability, an eligible future Lagos-day slot and no overlapping booking/current assignment. Connectivity is never inferred. Pending reservations are labelled reserved rather than confirmed or paid.

Owner automatic business approvals from the earlier explicitly approved phase remain intact; they do not grant self-verification or remove the backend service payment/quote/work gates.
