# Staff management follow-up — 30 October 2026

The dedicated `/admin/staff` screen previously displayed a directory without its own management buttons. It now provides Add New Staff, Add Existing Account, Verify Identity, name/email/role/branch search and per-person Edit Profile, Change Role / Branch, owner-only Suspend Staff and Reinstate Staff. Pending/accepted/expired invitations are visible with renew/revoke actions. Accepted invitees remain listed while awaiting role approval. Forms bind the selected account directly; staff IDs need not be copied.

Existing access governance remains authoritative. Invitations do not assign a staff role. Owners/managers request protected role/branch changes; independent owner/finance approval and no-self-approval rules remain. Technical administrators can invite/edit eligible staff in their branch without receiving financial or access-grant authority. Suspension/reinstatement is owner-only with recent verification and audit; old sessions stay revoked. Renewed/revoked invitation links stop working, and moved/inactive inviters cannot validate stale branch authority.

External email remains unconnected. Authorised invite/renew actions return a private 48-hour link for manual delivery and queue local email; no message was actually sent externally. Profile and invitation actions were verified through the browser in an isolated synthetic QA database. No normal business staff account was created or modified for testing.

Database policy 022 and the official-CLI incremental `20261029154521_staff_invitation_management.sql` grant only invitation token/expiry/inviter updates to the restricted backend role. Fresh bootstrap is regenerated. No hosted migration, deployment, commit or push was performed.

## Verification

- Full `npm test`: **109 passed, 0 failed, 0 skipped**, 41.66 seconds ([output](staff-test-results-2026-10-30.txt)).
- New staff suite: 3 tests passed, including restricted runtime grants, branch isolation, invitation rotation/revocation/acceptance, no immediate privilege elevation, protected-owner actions and session invalidation ([targeted output](staff-targeted-tests-2026-10-30.txt)).
- Web typecheck and production build passed ([types](staff-types-2026-10-30.txt), [build](staff-build-2026-10-30.txt)). Tooling/test TypeScript also passed. Native code was not changed in this follow-up.
- Browser: opened management buttons and invite/edit forms; verified identity; created/listed a synthetic invitation and copied-link control; persisted a profile name update. Screenshot: `docs/screenshots/staff-management-20261030.png`.

The prior 106-test implementation report and SHA256 manifest describe the preceding snapshot; this follow-up adds the three staff tests and the files below. The broader production NO-GO decision remains unchanged. See [usage and permissions](../staff-management.md).

## Source files

- `apps/web/components/staff-management.tsx`
- `apps/web/lib/staff.ts`
- `apps/web/components/admin.tsx`
- `apps/web/lib/accounts.ts`
- `apps/web/lib/service.ts`
- `apps/web/lib/db.ts`
- `apps/web/app/api/[action]/route.ts`
- `database/policies/staff-access.sql`
- `database/bootstrap.sql`
- `scripts/export-bootstrap.ts`
- `supabase/migrations/20261029154521_staff_invitation_management.sql`
- `tests/staff-management.test.ts`
