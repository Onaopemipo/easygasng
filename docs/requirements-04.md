# PART 19.6 — SETTINGS OWNERSHIP, APPROVAL WORKFLOWS & GOVERNANCE

## Objective

Implement a secure, role-based settings management and approval system for EasyGas Energy Solutions.

The system must clearly establish:

1. Who owns each business setting.
2. Who can view a setting.
3. Who can propose changes.
4. Who can approve or reject changes.
5. Which changes can take effect immediately.
6. Which changes require independent approval.
7. How approved changes become active.
8. How previous settings are restored.
9. How all decisions are recorded and audited.

Do not implement a system where every employee with access to the Settings menu can freely modify business rules.

Settings ownership must be enforced across the website, administration dashboard, staff application, and all business operations.

---

## 1. Settings Ownership Matrix

Implement the following default ownership and approval rules.

| Settings category | Responsible owner | Who can propose | Required approval |
|---|---|---|---|
| Business identity and registration | Business Owner | Owner, authorised Manager | Business Owner |
| Contact information | Branch Manager / Owner | Manager | Manager for branch details; Owner for company-wide details |
| Product catalogue | Sales / Inventory Manager | Authorised Sales or Inventory Staff | Branch Manager |
| Product selling prices | Business Owner | Branch Manager | Owner or authorised independent pricing approver |
| Promotional discounts | Sales Manager | Marketing / Sales Manager | Branch Manager within limits; Owner above limits |
| Delivery zones and fees | Operations Manager | Dispatcher / Branch Manager | Branch Manager within limits; Owner for company-wide changes |
| Inventory thresholds | Inventory Manager | Inventory Officer | Branch Manager |
| Stock adjustment policies | Business Owner | Inventory Manager | Owner |
| Cylinder deposit amounts | Business Owner | Finance Officer | Owner |
| Cylinder safety policies | Safety / Compliance Officer | Authorised Operations Staff | Designated Safety Approver; Owner for material policy changes |
| Payment methods | Finance Officer | Finance Officer | Owner |
| Bank account details | Business Owner | Finance Officer | Independent authorised financial approver |
| Wallet funding limits | Finance Officer | Finance Officer | Owner |
| Wallet transaction policies | Business Owner | Finance Officer | Owner |
| Loyalty rules | Marketing Manager | Marketing Manager | Branch Manager within budget; Owner above budget |
| Referral rewards | Marketing Manager | Marketing Manager | Owner or authorised budget approver |
| Smart refill reminder timing | Operations / Customer Experience Manager | Authorised Manager | Manager within approved policy |
| Smart refill prediction policies | Business Owner | Operations Manager | Owner |
| Scheduled refill rules | Operations Manager | Operations Manager | Owner for material financial changes |
| Customer communication templates | Customer Experience Manager | Marketing / Support Staff | Customer Experience Manager |
| Bulk marketing campaigns | Marketing Manager | Marketing Staff | Marketing Manager within limits; Owner above limits |
| Staff permissions | Business Owner | Branch Manager | Owner or delegated independent access approver |
| Branch creation or closure | Business Owner | Business Owner | Owner; additional approval if configured |
| Financial reporting policies | Finance Officer | Finance Officer | Owner |
| Security settings | Business Owner / Security Administrator | Security Administrator | Owner or designated independent security approver |
| Payment integrations | Finance Officer / Technical Administrator | Authorised Administrator | Owner and Finance approval where financial impact exists |
| Website content | Marketing Manager | Content Editor | Marketing Manager |
| Privacy and customer data policies | Privacy / Compliance Owner | Authorised Compliance Staff | Owner and designated Compliance Approver |

These are default roles. The business must be able to delegate approval authority within controlled limits.

A platform administrator must not automatically receive permission to approve business financial decisions.

---

## 2. Approval Classification

Every configurable setting must have an approval classification.

### Level 1 — Routine Changes

Low-risk operational changes.

Examples:

- Updating branch opening hours.
- Editing a product description.
- Updating an FAQ.
- Changing a non-financial contact detail.
- Adjusting a stock alert threshold within approved limits.

**Behaviour:**

- Authorised owner can save directly.
- Changes take effect immediately.
- Previous values are preserved.
- Changes are recorded in the audit history.

### Level 2 — Manager Approval

Changes affecting branch operations, customer experience, or controlled business expenditure.

Examples:

- Changing branch delivery fees within approved limits.
- Updating product availability.
- Changing promotional offers within an approved budget.
- Modifying delivery schedules.
- Changing customer notification frequency within approved policy.

**Behaviour:**

- Staff member submits a change request.
- Appropriate manager receives notification.
- Manager reviews previous and proposed values.
- Manager approves or rejects.
- Approved changes are applied.
- Requester receives the decision.

### Level 3 — Business Owner Approval

Changes with significant financial, operational, or customer impact.

Examples:

- Changing gas selling prices outside delegated limits.
- Modifying cylinder deposit amounts.
- Increasing wallet funding limits.
- Changing refund approval thresholds.
- Introducing new loyalty liabilities.
- Changing company-wide delivery policies.
- Enabling new payment methods.
- Creating or closing branches.

**Behaviour:**

- Request requires an explanation.
- System identifies the appropriate approver.
- Owner reviews business impact.
- Owner approves or rejects.
- Sensitive changes may require additional identity verification.
- Approved changes become active at the configured time.
- Complete decision history is retained.

### Level 4 — Restricted / Dual Approval

Changes presenting elevated financial, security, or compliance risk.

Examples:

- Changing the bank account receiving customer payments.
- Modifying payment settlement destinations.
- Increasing high-value refund limits.
- Changing financial approval permissions.
- Disabling important financial safeguards.
- Changing security policies that affect privileged access.
- Modifying financial transaction controls.
- Activating a new payment integration that can move money.

**Behaviour:**

- Requester cannot approve their own request.
- Two distinct authorised individuals must approve.
- Approvers must satisfy the required roles.
- Additional identity verification is required.
- Approval must occur before activation.
- The change must be checked again immediately before activation.
- All actions must be recorded.

If EasyGas does not yet have two eligible approvers, restricted changes must remain pending until a valid second approver is appointed.

Never automatically bypass dual approval because the business is small.

---

## 3. Approval Workflow

Implement the following end-to-end process.

### Step 1 — Change Requested

An authorised employee opens a settings page and proposes a change.

The system captures:

- Setting name.
- Current value.
- Proposed value.
- Requester.
- Requester's role.
- Branch or business-wide scope.
- Reason for change.
- Expected effective date.
- Supporting documents where applicable.

The live setting must remain unchanged.

### Step 2 — Risk Classification

The system determines:

- Change category.
- Risk level.
- Financial impact.
- Required approver roles.
- Whether dual approval applies.
- Whether additional verification is necessary.
- Whether the change can be scheduled.

The requester must not be able to reduce the approval level by modifying the request.

### Step 3 — Approval Request Created

Create a unique approval reference.

Set status to `PENDING_APPROVAL`.

Notify eligible approvers.

Display the request in a dedicated Approval Centre.

### Step 4 — Review

Approvers must see:

- Current value.
- Proposed value.
- Reason for change.
- Requester.
- Affected branches.
- Affected customers or operations.
- Estimated financial impact where calculable.
- Required approval level.
- Previous related changes.
- Supporting evidence.

Provide:

- Approve.
- Reject.
- Request Changes.

Require a reason for rejection.

### Step 5 — Decision

If approved:

- Record the approver.
- Record approval timestamp.
- Record approval comments.
- Verify that the approver remains authorised.
- Confirm all required approvals have been obtained.

If rejected:

- Preserve the current setting.
- Record rejection reason.
- Notify the requester.
- Retain the request history.

If changes are requested:

- Return the request for revision.
- Preserve the review history.
- Invalidate previous approvals when material details change.

### Step 6 — Activation

After all required approvals:

1. Revalidate the proposed value.
2. Confirm the current setting has not changed unexpectedly.
3. Check that the change remains permitted.
4. Apply immediately or schedule activation.
5. Record the previous and new values.
6. Notify affected services.
7. Confirm successful activation.

If activation fails, do not mark the change as active.

### Step 7 — Completion

Notify the requester and relevant stakeholders.

Record the final status and effective date.

---

## 4. Approval Statuses

Implement the following statuses:

| Status | Meaning |
|---|---|
| Draft | Request is being prepared |
| Pending Approval | Awaiting required approval |
| Changes Requested | Requester must revise |
| Partially Approved | Some required approvals received |
| Approved | All approvals received |
| Scheduled | Approved and awaiting activation |
| Applying | Approved change is being activated |
| Active | Change successfully applied |
| Rejected | Request declined |
| Cancelled | Request withdrawn |
| Expired | Approval window elapsed |
| Failed | Activation failed |
| Superseded | Replaced by a newer approved request |
| Rolled Back | Previous setting restored through an authorised change |

Do not treat approval as proof of successful activation.

---

## 5. Approval Centre — Web Interface

Create a dedicated **Approvals** module in the business administration dashboard.

### Approval Centre Overview

Display:

- Pending approvals.
- Requests awaiting my decision.
- High-risk requests.
- Overdue requests.
- Recently approved changes.
- Rejected requests.
- Scheduled changes.
- Failed activations.

### Approval Request Table

Include:

- Request reference.
- Setting category.
- Requested change.
- Requester.
- Branch.
- Risk level.
- Current status.
- Required approvers.
- Submission date.
- Proposed effective date.
- Actions.

### Request Detail Screen

Show a side-by-side comparison.

**Current Setting**

Example: Delivery fee — ₦1,500

**Proposed Setting**

Example: Delivery fee — ₦2,000

**Reason**

Increased transportation costs.

**Business Impact**

Delivery fees will increase by ₦500 for affected future orders.

**Approval Required**

Branch Manager, assuming the increase is within delegated limits.

Provide clearly distinguished approval and rejection actions.

Use the approved EasyGas SaaS design system.

---

## 6. Approval Notifications

Notify appropriate users when:

- A request is submitted.
- A request requires their approval.
- A request is approved.
- A request is rejected.
- Changes are requested.
- A request is approaching expiry.
- A request becomes overdue.
- A scheduled change is activated.
- Activation fails.
- A rollback is completed.

Use in-app notifications as the primary channel.

Support email or other configured channels for important approvals.

Never include sensitive payment credentials or confidential customer information in notification content.

---

## 7. Delegation & Approval Limits

Implement controlled delegation.

The Business Owner may assign approval responsibilities to eligible managers.

Each delegation must specify:

- Delegated role or named person.
- Settings categories covered.
- Branch scope.
- Financial limits.
- Start date.
- Expiry date.
- Whether further delegation is permitted.
- Who authorised the delegation.

Delegated approval must never exceed the authority of the person granting it.

Delegation must not bypass required independent approval.

Temporary delegations must expire automatically.

Changes to financial or security approval authority must themselves require the appropriate higher-level approval.

---

## 8. Separation of Duties

Enforce these rules:

1. A requester cannot approve their own restricted change.
2. One person cannot satisfy both approvals in a dual-approval process.
3. A finance officer cannot independently change and approve settlement bank details.
4. Staff cannot increase their own permissions.
5. Branch managers cannot grant themselves business-wide access.
6. Refund initiators cannot approve their own refunds when independent approval is required.
7. Technical administrators cannot bypass business approvals.
8. A user who loses approval authority cannot approve pending requests.
9. Approval decisions cannot be edited after submission.
10. An approved request cannot be silently modified before activation.

Enforce these restrictions in server-side operations and data access controls.

---

## 9. Setting Version History & Rollback

Every approved change must create a permanent version record.

Record:

- Setting identifier.
- Previous value.
- New value.
- Previous version.
- New version.
- Request reference.
- Requester.
- Approvers.
- Approval timestamps.
- Activation timestamp.
- Reason for change.
- Affected business scope.
- Rollback reference where applicable.

### Rollback

Allow authorised administrators to request restoration of a previous setting.

Rollback must:

- Create a new change request.
- Follow the required approval policy.
- Preserve the original history.
- Validate that the previous value is still valid.
- Avoid reversing completed financial transactions.
- Apply only to future operations where appropriate.

Example:

If a gas price changes from ₦15,000 to ₦16,000 and is later restored to ₦15,000, previously confirmed orders must retain their original agreed prices.

Do not rewrite historical sales records.

---

## 10. Emergency Changes

Implement a controlled emergency change procedure for genuine operational or security incidents.

Examples:

- Disabling a compromised payment integration.
- Suspending a compromised staff account.
- Stopping sales of a potentially unsafe cylinder batch.
- Temporarily disabling ordering in an affected delivery zone.

Emergency actions must be restricted to a predefined allowlist of protective actions.

Requirements:

- Explicit emergency permission.
- Mandatory reason.
- Additional identity verification where feasible.
- Immediate notification to the owner and relevant approvers.
- Complete audit record.
- Time-limited effect where appropriate.
- Mandatory post-action review.

Emergency access must not permit unauthorised bank account changes, wallet balance adjustments, or transfer of customer funds.

A protective emergency action may be immediate, but restoring normal operations must follow the appropriate approval process.

---

## 11. Settings Data & Approval Records

Implement persistent records for:

### Settings Definitions

- Setting key.
- Category.
- Description.
- Value type.
- Validation rules.
- Default value.
- Allowed scope.
- Risk classification.
- Required approval policy.

### Active Settings

- Setting identifier.
- Current value.
- Current version.
- Business or branch scope.
- Effective date.
- Last changed by.

### Change Requests

- Request reference.
- Requested setting.
- Previous value.
- Proposed value.
- Requester.
- Reason.
- Risk classification.
- Status.
- Submission date.
- Requested effective date.
- Current setting version at submission.

### Approval Decisions

- Request reference.
- Approver.
- Approver role.
- Decision.
- Decision reason.
- Timestamp.
- Verification status.

### Delegations

- Delegator.
- Delegate.
- Permission scope.
- Financial limits.
- Effective dates.
- Status.

### Audit Events

- Actor.
- Action.
- Target record.
- Previous state.
- New state.
- Timestamp.
- Outcome.
- Related request.

Use transaction-safe updates and prevent conflicting approvals from producing inconsistent settings.

Approval records must be tamper-resistant and access-controlled.

---

## 12. Approval Policy Configuration

Create an owner-controlled Approval Policy screen.

Allow configuration of:

- Approval thresholds.
- Required approver roles.
- Dual-approval requirements.
- Approval expiry periods.
- Escalation rules.
- Delegation limits.
- Notification preferences.
- Emergency permissions.

Do not allow a user to weaken an approval policy and immediately use the weakened policy to approve their own pending request.

Approval policy changes must follow a higher-level protected approval process.

Pending requests must be reassessed when relevant policies or approver permissions change.

---

## 13. Approval Workflow Acceptance Criteria

The implementation is complete only when:

- [ ] Every configurable setting has an identified owner.
- [ ] Every setting has a defined risk classification.
- [ ] Authorised users can propose changes.
- [ ] Unauthorised users cannot submit restricted changes.
- [ ] Routine changes follow their permitted direct-save process.
- [ ] Controlled changes create approval requests.
- [ ] Current settings remain active until approved changes are applied.
- [ ] Approval routing selects the correct authorised roles.
- [ ] Self-approval is prevented where independent approval is required.
- [ ] Dual approval requires two distinct authorised people.
- [ ] Approval permissions are checked again when a decision is submitted.
- [ ] Material request revisions invalidate previous approvals.
- [ ] Rejected requests never change active settings.
- [ ] Expired approvals cannot be reused.
- [ ] Concurrent changes are detected.
- [ ] Approved changes are validated again before activation.
- [ ] Failed activations do not appear successful.
- [ ] Financial and security changes receive additional protection.
- [ ] Delegation respects authority and expiry limits.
- [ ] All approval decisions are permanently recorded.
- [ ] Previous setting versions remain accessible to authorised users.
- [ ] Rollbacks follow the appropriate approval process.
- [ ] Historical financial transactions remain unchanged.
- [ ] Emergency actions are limited to approved protective operations.
- [ ] Approval notifications are delivered or failures are recorded.
- [ ] The Approval Centre works on desktop and tablet.
- [ ] All workflows use real persisted data.
- [ ] Automated tests cover approvals, rejections, delegations, concurrent requests, privilege escalation, rollback, and activation failures.

---

## 14. Mandatory Automated Test Scenarios

Create tests proving the following:

**Scenario A — Routine Setting**

A branch manager changes an authorised branch opening time.

Expected: The change saves immediately, the new value becomes active, and an audit event is created.

**Scenario B — Product Price Approval**

A sales attendant proposes a gas price change requiring manager approval.

Expected: The existing price remains active until an authorised independent approver approves the change.

**Scenario C — Bank Account Change**

A finance officer requests a change to the business settlement account.

Expected: The request requires two distinct authorised approvals and additional verification before activation.

**Scenario D — Self-Approval Attempt**

A requester attempts to approve their own restricted change.

Expected: The server rejects the action even if the request is manually submitted.

**Scenario E — Permission Revocation**

An approver loses approval authority while a request is pending.

Expected: The user can no longer approve the request.

**Scenario F — Concurrent Changes**

Two administrators request different changes to the same setting.

Expected: The system detects the version conflict and prevents an outdated request from silently overwriting a newer active value.

**Scenario G — Rejected Change**

An owner rejects a proposed wallet policy change.

Expected: The existing wallet policy remains unchanged and the rejection is recorded.

**Scenario H — Rollback**

An authorised administrator requests restoration of a previous delivery fee.

Expected: A new approved setting version is created without modifying historical customer orders.

**Scenario I — Emergency Protection**

An authorised security administrator disables a compromised payment integration.

Expected: The protective action takes effect, an audit event is recorded, and the required stakeholders are notified.

**Scenario J — Priv