# Roles, scope and independent approval

| Role | Relevant authority |
|---|---|
| Customer / commercial | Own shopping, bookings, quotation decisions, reports, acknowledgement, feedback, permitted credit payments and refund requests. The commercial role does not implement a B2B credit platform. |
| Sales / manager | Existing branch-limited product operations; staff cannot submit Lagos checkout from another branch. |
| Inventory | Branch receipts, approved service material issue/return and existing cylinder operations. Cannot approve customer quotations or declare technical service success. |
| Dispatcher / driver | Existing scoped assignments and assigned delivery completion. No unrestricted customer export or finance approval. |
| Service manager | Branch service proposals, appointment confirmation/rescheduling, qualified slots, quotations workspace, material coordination, assessment recommendations and follow-ups. |
| Technician | Assigned branch jobs only; current independently verified qualification required for technical actions. Quotes, actual materials usage and checklist/report submission. Cannot approve own quote for the customer or verify own cash. |
| Safety officer | Branch safety review, independently recorded qualifications, specific compatibility review and safety incident handling. Checklist approval also requires current `safety_review` qualification. |
| Finance | Independent verified cash/credit/refund workflows and scoped reconciliation. No alteration of immutable receipts/reports. |
| Owner | Global business administration, appropriate proposals/independent approvals, policy publication and readiness view. Cannot self-approve restricted proposals. |
| Administrator | Technical administration within existing allowlists. Does not inherit owner/finance/safety authority. |

Service configuration, bundles and published policies use versioned governance and an independent owner review with recent password verification. Safety checklists require independent owner and qualified safety-review approval. Qualification evidence must be verified independently; revocation/expiry prevents subsequent eligibility. No actual staff qualification or safety checklist was invented.

Database runtime identity is not an application role. `easygas_server` is a NOLOGIN trusted backend group, never a browser identity. Keep runtime and migration credentials separate. Immutable ledgers/history cannot be rewritten by ordinary application operations. New-role menus improve task access; some older menus remain broader than backend permissions and return an explicit denial where unavailable.

## Staff management update

The dedicated `/admin/staff` page now supports invitations, exact existing-account lookup, profile editing, role/branch approval requests and owner-only suspension/reinstatement, plus invitation renewal/revocation. Same-branch technical administrators can invite and edit non-owner staff display names, and request role-based access for other same-branch users, but cannot activate role grants, suspend/reinstate staff or approve protected business access. See [staff management](staff-management.md).

## Shared gas and delivery governance — 30 October 2026

Gas rate changes may be proposed by owners, branch managers and finance; the flat fee by owners, managers and dispatchers; quantity rules by owners, managers and inventory; and locations by owners, managers and dispatchers. All these protected changes require an independent owner approval and applicable verification. Existing stronger financial/security rules remain in force. Each branch scope is enforced by the server, and current authority is rechecked at activation.

Owners and inventory staff with recent identity verification can receive documented bulk gas, register customer-cylinder intakes in quarantine and record verified filling allowances. Owners, managers and dispatchers can confirm actual-address coverage in their scope; withdrawn-location fulfilment needs owner review. Gas reports are available to owners, finance and branch managers, with non-owners restricted to their branch. Inventory's filling queue excludes order addresses and payment details. These capabilities reuse the existing approval, audit, stock and delivery protections.
