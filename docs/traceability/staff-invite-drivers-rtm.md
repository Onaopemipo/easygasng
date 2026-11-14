# Staff invitation access and Drivers directory

| ID | Requirement | Gate | Local acceptance |
| --- | --- | --- | --- |
| STAFF-INV-01 | Invite a staff member with one of the five roles, its defaults and custom privileges | STAFF-INV-G01 | Chrome completed the invitation form, role change and inline identity verification. |
| STAFF-INV-02 | Submit accepted invitations for independent approval and activate the exact approved plan | STAFF-INV-G02 | Restricted database runtime proved pending access, independent approval, applied grant and denial, and replay rejection. |
| DRIVER-NAV-01 | Add Drivers beside Technicians; show real, scoped driver and assignment records | DRIVER-NAV-G01 | Navigation/API negatives, scoped records and browser acceptance at 1440px and 390px. |

Local scope: 3/3 implemented and verified; 2/2 critical requirements, 3/3 workspace routes and 3/3 local gates verified. See the [machine-readable matrix](staff-invite-drivers-rtm.json) and [test evidence](staff-invite-drivers-evidence.txt). The archived mobile prototype keeps its original 99 screens; the new web route is included here and in the product UI audit. Related rules remain in the [staff privileges matrix](staff-privileges-rtm.md) and the [role consolidation matrix](staff-role-consolidation-rtm.md).

Deployment: back up the target database, apply additive migration 079 with the schema owner, then deploy matching code with the existing restricted runtime. Verify Staff Management, Approval Centre and Drivers as an owner, and only branch-scoped Drivers as a manager. To roll back, redeploy the prior code and keep the added columns and records; do not drop invitation or approval history. If a request becomes stale under the existing branch access version check, review and resubmit access from Staff Management and review individual privileges before granting them. No provider confirmation or release to the hosted demo is claimed here. Commercial production remains NO-GO.

14 November release checkpoint: GitHub source `75f524a` pushed and the Vercel candidate built. The stable demo is healthy on its previous release. Vercel authenticator verification is required before the backup and migration `079`; `STAFF-INV-G03` remains open.
