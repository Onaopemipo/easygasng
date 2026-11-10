# Individual staff privileges

The staff page now separates individual privileges from the existing role/branch change workflow. Open Staff Management → staff actions → Manage Roles & Privileges. Verify your password when prompted, search the privilege list, choose Use role default / Grant access / Revoke access, enter a business reason and save. The existing role and branch workflow is retained in a separate expandable section. Unsaved selections use the existing branded discard confirmation.

## Authority and scope

The server catalogue in packages/business-rules/src/staff-privileges.ts defines 25 named operation groups and their exact action coverage. Ordinary operational grants (for example customer records or stock receipts) extend a business staff member's permitted operations without changing their role. Protected finance, approvals, dispatch, service and staff authority still requires the existing approved role and technical qualifications. The Business Owner manages protected privileges and users across branches; a technical Administrator manages ordinary operational privileges for other accounts in their branch. Managers keep the existing role-request workflow. Nobody can edit their own privileges. Customer/commercial and field-only identities cannot acquire additional business authority through these grants; an approved staff role is required. Explicit revocations can restrict existing role permissions.

This is an operation permission layer, not a replacement for business eligibility. Other operations outside the 25 catalogue groups continue using their existing role controls; this phase does not claim an arbitrary permission editor for every API route. Branch/assignment scope, independent finance decisions, current safety qualifications, payment verification and production safety blockers are preserved. Granting a read operation does not grant its corresponding write operation or global owner scope. Existing grouped navigation is filtered from the same overrides; the sidebar definitions and routes remain unchanged.

## Data and enforcement

Migration075 adds staff_privilege_overrides and staff_privilege_versions. Current overrides are read from authoritative storage on every authenticated backend request. Named operations enforce deny before routing; a grant may satisfy only the documented non-owner role allowlist for that operation. The canonical actor role is never impersonated. Role/branch identity changes invalidate additional grants permanently until reviewed again, increment the editor version and leave denials in force. Reverting a role/branch move cannot silently restore an old grant. Concurrent saves lock the target account and reject stale versions. Current authority is rechecked on cached operation recovery as well.

Every privilege change records immutable audit history with actor, target, previous overrides, requested changes, reason, role/branch and version. Resetting current overrides does not remove audit history. Invalid batches roll back all writes. The restricted server database role receives only required table privileges under existing RLS conventions. No accounts, role defaults, financial ledgers or existing approval records are migrated/reset.

## Executed evidence

- Initial repository audit and staff baseline: 3 staff tests passed; web types passed.
- Broad regression: 647 tests executed, 625 passed, 22 environment-dependent tests skipped, 0 failed. This run preceded the final identity-binding hardening; the final hardening was then verified by the focused and PostgreSQL suites below. The earlier run caught an approval-search raw-input regression and formatting-sensitive order-addition contract from the prior page work; both were corrected and compatibility tests passed without weakening the existing contracts.
- Final focused suite: 24 passed, 0 failed, including 8 named privilege scenarios, existing staff runtime permissions, owner/safety governance and service governance.
- Real disposable PostgreSQL: 1 passed, 0 failed; independent connections race the same revision, exactly one save commits, stale save fails, and revocation blocks an existing session.
- Web typecheck and production build pass. Compatibility checks passed for shared password visibility and same-delivery order additions.
- Local isolated browser fixture: opened the actual staff action menu and individual editor, verified password reauthentication, searched privileges, selected an unsaved grant and reason, saw Save enable, tested the branded discard confirmation and reopened unchanged authoritative access. Existing role/branch form remains accessible. Desktop1536px and mobile390px viewport checked; mobile document width375px, no horizontal overflow in the editor. No privilege grant, role change or financial transaction was committed through browser UI. API integration tests perform grant/revoke/reset against isolated test accounts. No hosted demo account was changed.

## Release

Local source only; not pushed, deployed or applied to the hosted database. Apply migration075 using the existing migration/maintenance flow before releasing this source. Bootstrap and bootstrap generator include the same migration. No new secrets or live provider activation. Rolling code back leaves the new tables and audit history intact; do not delete privilege history. Prior production NO-GO, native build deferral, import hold and all other phase matrices remain unchanged. Physical-device and production launch acceptance are not claimed.

Deployment update — 10 November 2026: web changes are now pushed and deployed to the existing client demo at source c95d7a1. Earlier local-only statements describe the original verification stage. See [release evidence](../releases/20261110-demo/report.md). Production NO-GO and other outstanding gates remain unchanged.
