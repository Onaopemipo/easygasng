# Staff role consolidation

Implementation and verification cover all seven requirements, seven critical requirements and seven acceptance gates for the demo rollout. Hosted web and API checks and installed simulator and emulator checks passed. Commercial production remains NO-GO.

[Machine-readable matrix](staff-role-consolidation-rtm.json) · [Executed evidence](staff-role-consolidation-evidence.txt)

| Requirement | Gate | Status | Evidence and outstanding work |
| --- | --- | --- | --- |
| STAFF-ROLE01 Use exactly five staff roles throughout account assignment and access checks. | STAFF-ROLE-G01 | VERIFIED_COMPLETE | Role catalogue, PostgreSQL constraint, legacy role assignment rejection and browser Staff Management reference. No outstanding local implementation for this requirement. |
| STAFF-ROLE02 Move existing staff into the approved roles and give Administrators and Safety Officers business-wide owner access. | STAFF-ROLE-G02 | VERIFIED_COMPLETE | PostgreSQL migration preserved identities. Hosted checks verified original Administrator and Safety Officer identities with owner access. Staff in the three consolidated management roles sign in again. |
| STAFF-ROLE03 Preserve active privilege overrides and approval history during migration. | STAFF-ROLE-G03 | VERIFIED_COMPLETE | Verified override migration and historic decisions. Hosted migration recorded 11 role changes and flagged zero requests or delegations. The existing draft remained a draft. No hosted item required resubmission. |
| STAFF-ROLE04 Enforce branch boundaries for Finance and Branch Manager, with assigned workspaces for field staff. | STAFF-ROLE-G04 | VERIFIED_COMPLETE | Hosted branch access passed for Finance and Branch Manager, including HTTP 403 outside the assigned branch. Field restrictions passed in hosted APIs and installed builds. Finance Audit History requires explicit branch attribution. |
| STAFF-ROLE05 Keep independent approval and current qualifications for protected decisions. | STAFF-ROLE-G05 | VERIFIED_COMPLETE | Protected access request requires separate decisions, self-approval of an expense is rejected, and checklist review verifies qualification. No outstanding local implementation for this requirement. |
| STAFF-ROLE06 Show the consolidated roles and their authorised workspaces in the native app. | STAFF-ROLE-G06 | VERIFIED_COMPLETE | All five staff roles passed installed sign-in, role navigation and customer Wallet exclusion on iPhone 17 Pro Simulator and minified Pixel 8 emulator. Backend tests verified access restrictions. Physical-device and app-store acceptance were outside the demo scope. |
| STAFF-ROLE07 Verify the release cutover for consolidated roles. | STAFF-ROLE-G07 | VERIFIED_COMPLETE | Authenticated and archive-verified backup before schema 077 and 078. Matching Vercel deployment is READY. All 13 retained test identities signed in with their expected roles. A coordinated database restore was not exercised. Commercial production remains NO-GO. |

## Cutover and recovery

Take a pre-upgrade backup and record the deployed commit. Apply schema 078 with the matching release. Staff in Admin / Business Owner, Finance / Auditor / Inventory, and Branch Manager / Sales Rep / Dispatcher / Service Manager must sign in again. Use Audit History to identify open requests and delegations affected by the role change. Review and submit those again under the current policy.

To roll back, stop writes and coordinate the restoration of the pre-upgrade schema and data with the matching pre-upgrade code. Preserve a copy of any post-upgrade records for reconciliation before restoring. Multiple previous roles map to the same new role, so the current role value alone cannot recover the previous assignment.

The deployed demo is [EasyGas client demo](https://easygas-client-demo.vercel.app). The current deployment is `dpl_wc7sEBwrmVp1CBthWHrNKYae8gRR`. The previous deployment is `dpl_FjxuUwUMtSpqKegZjD4pERdhWShJ`. The verified encrypted archive is stored privately in `.backups/easygas-demo-pre078-20261114-cutover.egbackup`.
