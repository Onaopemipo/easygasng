# Default user branch: Lagos

Lagos is the initial branch for new customer accounts and new staff invitations. Existing accounts with no branch are assigned Lagos when migration084 is applied. Accounts already assigned to another branch keep their assignment.

To change a customer's branch:

1. Sign in to the business website as **Admin**.
2. Open **Customers** and search for the customer's name or public customer ID.
3. Choose the customer's **Actions → Edit customer**.
4. Choose an active **Branch**, then **Save customer**.
5. Check the branch displayed in the customer list. The change is recorded in Audit History as `customers.branch.changed`, including the previous and selected branch.

Changing a branch keeps the same account, public customer ID, wallet, reward balance and order history. Existing orders keep their original fulfilment branch. Moving a customer changes branch-scoped staff visibility; choose the branch that should manage that customer. Managers cannot move a customer between branches.

For staff, use the existing **Staff Management → Roles & Access** workflow to change an account's branch and retain the required access approvals. A staff invitation initially selects Lagos; Admin can select another active branch before sending it. An invitation alone does not activate staff privileges.

Phone-order customer creation defaults to Lagos when no branch is supplied. An explicit authorised branch selected during ordering is retained. Customer sign-up does not allow the customer to grant themselves staff access or choose an internal branch. Public delivery areas and confirmed delivery addresses remain separate from the user's managing branch.

Lagos must remain active. If it is inactive, new public sign-up stops with a clear error. Re-enable Lagos through the governed branch settings before accepting new accounts. Admin can still explicitly select a different active branch in authorised backend creation flows.

## Deployment and verification

Migration084 sets `users.branch_id`'s default to `lagos` and fills only missing values, with a per-account `users.branch.defaulted` audit event. Apply it once through the authorised database owner; the hosted application runtime does not run DDL. The reviewed demo wrapper is [apply-migration084.sql](../lagos-default/apply-migration084.sql). It expects exactly six missing customer branches, validates identity and business-table preservation atomically, and aborts if the expected data has changed. Explicit SQL NULL is retained for legacy compatibility; supported account-creation APIs always validate and persist a branch.

No mobile binary or change to existing production NO-GO, live-provider, physical calibration/loading, or import decisions is included in this phase. See [requirements and rollout status](../traceability/lagos-default-rtm.md).
