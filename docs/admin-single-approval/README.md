# One Admin approval

User-approved policy change, 27 November 2026: Admin (`owner`, including consolidated legacy Admin roles) is the final business approver. This supersedes earlier requirements for a second Admin, Finance colleague or qualified colleague to approve an Admin business request. Other staff retain their existing authority and independent review rules; a valid Admin decision completes the business approval.

An Admin's editable setting or governed operation applies after its existing review/confirmation. Saved drafts stay inactive. Existing pending requests are never approved in bulk: the Admin chooses an individual request in Approval Centre and confirms it once. A scheduled change waits for its effective date. If activation fails, resolve its evidence/version error and retry the same authorised request; do not obtain a second approval. Replayed confirmations cannot post another credit, inventory movement or configuration version.

For staff invitations, the recipient must accept and replace the temporary password. The exact selected access plan remains bound to that accepted invitation and needs one Admin decision; the customer acceptance endpoint never impersonates a freshly verified Admin session. Direct Admin grants to another staff member apply after one confirmation. Changing one's own privileges remains prohibited, rather than becoming a request waiting for another approver.

Payment receipt verification, inventory recording, actual LPG mass/meter readings, photographs, customer consent and genuine qualifications remain required where applicable. They describe actual events and evidence, not extra business approvers. Read-only controls and unsupported live-payment activation remain unavailable. Identity re-verification is the same Admin confirming their password and does not add another reviewer.

## Audit inventory

| Approval family | Authoritative implementation | Admin result |
| --- | --- | --- |
| All governed settings, access, rewards reversals, policy, service/checklist configuration, quotes, cancellations and settlements | `governance.ts`, `approval-workflow.ts`; `change_requests`, `approval_decisions`, `audit_events`, setting versions | One current, revision-bound Admin authorisation satisfies business roles/counts |
| Staff grants and accepted invitation access | `accounts.ts`, `staff.ts`, governance access activation, immutable invitation bindings | One Admin confirmation; no privileges before accepted-plan approval |
| Inventory corrections, stocktakes, purchase/transfer requests and expenses | `inventory-business.ts` and governance | Admin submissions apply once; downstream expense/transfer actions revalidate the actual approval proof |
| Bulk discrepancy, service-material and vehicle-product recovery | `bulk-lpg-recovery.ts`, `service-material-recovery.ts`, `vehicle-products.ts` | No second business reviewer; measured quantities, qualification, exact approved payload and custody locks remain |
| Credit/refund and POS reconciliation | `commerce.ts` | Admin can decide their own receipt/request once; non-Admin self-verification still denied |
| Order/service/doorstep cash | `delivery.ts`, `professional-services.ts`, `doorstep-execution.ts`, `doorstep-products.ts` | Admin can verify own recorded cash once; exact balance/evidence guards and immutable payments remain |
| Invoice corrections | `invoice-corrections.ts`, migration085 | Admin may approve own exact note; issued originals and final decisions remain immutable |
| Legacy purchases/transfers and campaigns | `workspace.ts`, `scheduling.ts` | Admin can approve own request/receipt; branch, actual receipt and lifecycle checks remain |
| Catalogue specification and recommendations | `catalogue.ts`, migration085 | One Admin review including own proposal; verified safety claims still require genuine qualification/evidence |
| Limited delegation | `delegation.ts`, navigation | Admin may approve their own bounded grant to another eligible staff member; ceiling, scope, expiry and revocation still apply |
| Incident/testimonial and other publication review | Existing operational actions and shared governance | No additional reviewer-count or Admin maker-check found; existing consent and authority retained |
| Driver/technician acceptance and customer consent | Existing field/customer workflows | Actual acceptance/consent remains a separate event; no new Admin approval added |

Web action visibility, badges, progress, source descriptions and shared/mobile explanatory copy were audited alongside backend checks. The historical two-reviewer requirement IDs and evidence are retained; their Admin portion is explicitly superseded by ASA requirements, not silently removed.

## Database and release

Migration085 replaces three blanket maker/reviewer constraints with an active-Admin-only self-review trigger for `invoice_notes`, `product_compatibility` and `recommendation_rules`. It does not rewrite existing requests, orders, balances, decisions or audit history. Other immutable/evidence/RLS guards stay installed. Both incremental migration registration and fresh bootstrap/export include085.

Local functional, browser and disposable PostgreSQL evidence is under `evidence/`. The shared Neon migration and Vercel deployment are not yet applied. Production NO-GO, actual-import hold, retain-all decisions and unrelated operational/provider/native acceptance gates remain unchanged. No mobile binary has been created for this phase.

See [requirements and acceptance](../traceability/admin-single-approval-rtm.md).

## Executed acceptance and remaining gates

191 distinct focused test names passed with no failures in the retained successful runs, including four real PostgreSQL concurrency/security cases. The actual browser payment-setting form applied version2 with no colleague decisions; the request proof and screenshot are retained. Web build, web/mobile typechecks and phase traceability validation passed. The isolated084→085 SQL rehearsal preserved counts and fingerprints for all155 canonical tables, and the restricted-runtime schema gate passed.

The initial broad suite ran1447 tests:1353 passed,58 failed,36 skipped. It was an exploratory audit run, not final release evidence. [Failure reconciliation](evidence/whole-suite-reconciliation.json) retains every failing case, identifies focused successful rechecks of superseded functional assumptions, and leaves historical release/current-source proofs plus an existing matrix metadata defect open. It also records a Node24/V8/Wasm engine failure rather than treating that run as clean. Unrelated native/provider/physical/production gates remain open.

The reviewed local dry run contains492 files against the previous490-file demo:47 changed/new uploaded paths and one reviewed bootstrap-export script excluded by the existing upload rules. Every SHA1 matches. Nothing has been uploaded, promoted or pushed, and the shared database is unchanged. [Guarded migration085](apply-migration085.sql) is ready for review; action-time browser confirmation is required before changing the shared database approval restrictions.
