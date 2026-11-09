# Staff management

Open **Business Workspace → Staff Management** (`/admin/staff`). The page now provides its own controls instead of a directory with invitation/suspension forms hidden under Business Operations.

- **Add New Staff:** enter the colleague's name, email and active branch. Verify identity first. The invitation expires in 48 hours. Its private link can be copied for manual delivery while external email remains unconnected; queuing a message is not proof of sending.
- **Add Existing Account:** owners/managers/administrators can find an exact registered email and submit an access request without recreating the account.
- **Edit Profile:** update the selected colleague's name with a reason. No copying account IDs is required.
- **Manage Roles & Privileges:** owners/managers/administrators submit the existing protected access proposal. Independent owner/finance approvals and recipient/requester separation remain enforced. Technical administrators can request role-based privileges for other users in their branch. They cannot change their own access, approve requests, or bypass independent owner/finance approvals.
- **Suspend Staff / Reinstate Staff:** owner-only, recently verified actions with a recorded reason. Suspension revokes sessions immediately. Reinstatement preserves the existing role and leaves old sessions revoked; the colleague must sign in again. Owners and self-suspension are protected.
- **Resend / Renew Invitation:** owners and same-branch administrators rotate the private token, invalidate old links, cancel obsolete queued messages and generate a fresh invitation.
- **Revoke Invitation:** invalidates the outstanding link and cancels its pending local messages. Accepted invitations must be managed through the resulting account.

Owners manage all branches. Administrators and branch managers see their branch's eligible staff/invitations. Administrators may invite, renew/revoke and edit non-owner staff names in their branch; managers may edit eligible profiles and request role changes. Administrators may also look up an existing same-branch account and request role/branch access changes. Privileges follow predefined roles; arbitrary per-user permission overrides and custom role creation are not supported. The page includes a role privileges reference. Customers and unrelated roles cannot access these staff-management APIs. Accepted invitations remain visible as awaiting staff-role approval rather than disappearing from the directory.

No new staff privilege, default password, real colleague account or external email was created during implementation. Browser acceptance used synthetic localhost QA data to create/list an invitation and persist a profile edit. Tests also exercise expired/replaced/revoked links, protected-owner/branch checks, access requests without immediate elevation, session revocation on suspension/reinstatement and the private-schema restricted runtime.

A local incremental migration adds only UPDATE privileges for invitation token/expiry/inviter columns: `supabase/migrations/20261029154521_staff_invitation_management.sql`, application policy version 022. Production migration remains a separately authorised operation; no hosted database was changed. Fresh bootstrap includes these grants.

## Administrator role management — 30 October 2026

Administrators can use **Manage Roles & Privileges** for another active account in their branch, or **Add Existing Account** with an exact email. Requests are visible on the staff page with their status; non-owners see only their own requests. The shared access governance validates administrator proposal authority again at activation. Required owner/finance reviewers, recipient/requester separation, fresh identity verification, session revocation and branch enforcement remain unchanged. No existing user was elevated during implementation.

Validation: staff and service-governance suites passed (9 tests); the staff suite and TypeScript checks were repeated after request-status UI additions. Browser QA verified the role/branch dialog against isolated synthetic data.

## Staff directory redesign — 30 October 2026

The staff screen now follows the supplied reference within the existing workspace shell. The sidebar and shared header are unchanged. Summary cards use actual staff/invitation counts; searchable rows include unaccepted invitations, status/branch/role filters, selection, six-row pagination, role badges and contextual row actions. More Actions preserves exact-account lookup, password verification, privilege reference, request history and the Approval Centre link. Sensitive actions still use the existing forms and backend approval controls; selection does not bypass per-account approval.

Last Login comes from the latest successful `auth.signed_in` audit event (Lagos time), with a dash for missing historical events. Invitation roles show Not assigned because invitations do not grant staff access. Expired invitations remain manageable. No sample people or fabricated login times were added.

Validation: TypeScript and all three staff-management tests passed. Browser QA verified pagination, pending-invitation filtering/actions, search empty state and clear filters on isolated synthetic records. At 390px the document width is 390px; the wide table scrolls inside its container. Form, body and table text remain at least 16px. Screenshots: `docs/screenshots/staff-redesign-desktop-20261030.png` and `docs/screenshots/staff-redesign-mobile-20261030.png`.
