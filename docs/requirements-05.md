## Scenario J — Privilege Escalation Attempt

Purpose: Confirm that EasyGas employees, managers, administrators, and compromised accounts cannot obtain authority beyond their assigned permissions, interfere with approval controls, or access protected business configurations.

### Test Procedure

Execute the following security tests, beginning with an authenticated Sales Attendant account that is permitted to view products and record sales.

1. Restricted page access: Enter the direct URL of a protected financial settings page and attempt to retrieve its information.
2. Role impersonation: Submit a settings change request containing a role identifier with greater authority than the authenticated user possesses.
3. Unauthorised promotion: Attempt to change the account's assigned role to Branch Manager or Business Owner.
4. Approval bypass: Send an approval request directly to the server for a restricted change without having the necessary approval rights.
5. Policy manipulation: Attempt to downgrade a setting's approval classification from Dual Approval to Routine Approval.
6. Permission delegation: Try granting financial approval authority to another employee without having permission to do so.
7. Cross-branch access: Request access to settings and records belonging to a branch outside the user's authorised scope.
8. Session misuse: Attempt to reuse an approval token or authenticated session previously associated with another authorised employee.
9. Revoked authority: Submit an approval after the account's approval permissions have been withdrawn.
10. Identity manipulation: Modify request information to impersonate the original requester or an eligible approver.
11. Alternative access paths: Repeat restricted operations through mobile application requests to determine whether web restrictions can be circumvented.

### Required System Behaviour

Every attempted operation must be evaluated against the user's actual permissions.

The system must deny unauthorised requests without exposing protected information or altering business records. A rejected attempt must not change the user's role, activate a setting, or produce an approval that the system considers valid.

Approval levels must remain enforceable, and employees must not be able to expand their authority or access another branch's restricted information.

Expired, invalid, or revoked sessions must not authorise protected actions. Requests that falsify the identity of a requester or approver must also be rejected.

Significant suspicious activity must be captured in security audit records, with repeated attempts subject to the configured security protections. These safeguards must not interfere with legitimate operations that fall within a user's assigned permissions.

### Implementation Rules

Enforce the following protections throughout the application:

- Never accept a client-provided role, branch identifier, or approval permission as proof of authority.
- Establish identity and effective permissions using trusted server-side authentication and authorisation records.
- Recheck permissions whenever a protected operation is attempted.
- Prohibit administrators from independently approving increases to their own privileges.
- Require separate, authorised approval when privileged access is modified.
- Prevent unauthorised editing or deletion of approval histories.
- Apply identical permission rules to the website, mobile applications, and direct service requests.
- Do not permit technical administrators to override business approval requirements solely because they possess application administration privileges.

### Automated Acceptance Checklist

Codex must implement automated tests confirming each of the following outcomes.

- Attempts to modify roles without permission fail.
- Protected settings cannot be accessed through direct URLs by unauthorised users.
- Fabricated approval submissions are refused.
- Employees cannot grant themselves additional privileges.
- Approval policies cannot be altered without the required authority.
- Users cannot access another branch's restricted records.
- Withdrawn permissions prevent subsequent protected actions.
- Expired sessions cannot authorise sensitive operations.
- Manipulated requests cannot circumvent server-side permission checks.
- Significant security violations produce appropriate audit records.
- Rejected operations leave protected settings, financial information, and approval states unchanged.
- Security checks pass across all supported web and mobile workflows.

### Completion Requirement — Settings Ownership and Approvals

The EasyGas settings module must operate as a controlled system of business authority, rather than simply providing different employees with access to configuration pages.

Being able to view a setting must never imply permission to modify, approve, or activate it.

Every sensitive action must undergo an independent permission check. Approval decisions must be linked to the authorised individuals who made them, and each activated configuration change must be traceable to its approved request.

Codex must verify that settings ownership, approval routing, separation of duties, audit history, rollback controls, and privilege escalation protections all function correctly.

Do not advance to Part 20 — Safety, Compliance & Audit Management until every acceptance gate in this section has passed.