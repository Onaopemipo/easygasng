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

Local functional, browser and disposable PostgreSQL evidence is under `evidence/`. The explicitly authorised shared Neon migration and Vercel deployment are now applied; see the rollout evidence below. Production NO-GO, actual-import hold, retain-all decisions and unrelated operational/provider/native acceptance gates remain unchanged. No mobile binary has been created for this phase.

See [requirements and acceptance](../traceability/admin-single-approval-rtm.md).

## Executed acceptance and remaining gates

191 distinct focused test names passed with no failures in the retained successful runs, including four real PostgreSQL concurrency/security cases. The actual browser payment-setting form applied version2 with no colleague decisions; the request proof and screenshot are retained. Web build, web/mobile typechecks and phase traceability validation passed. The isolated084→085 SQL rehearsal preserved counts and fingerprints for all 155 canonical tables, and the restricted-runtime schema gate passed.

The initial broad suite ran1447 tests:1353 passed,58 failed,36 skipped. It was an exploratory audit run, not final release evidence. [Failure reconciliation](evidence/whole-suite-reconciliation.json) retains every failing case, identifies focused successful rechecks of superseded functional assumptions, and leaves historical release/current-source proofs plus an existing matrix metadata defect open. It also records a Node24/V8/Wasm engine failure rather than treating that run as clean. Unrelated native/provider/physical/production gates remain open.

The initial 492-file dry run is retained as historical evidence. Vercel rejected an overlong build command and found unrelated authentication imports before promotion; both were corrected in the isolated release. The final 493-file package uses a short sequential runner that retains all four schema guards. Published authentication components remain intact, and the original authentication work remains in its worktree.

## Published demo acceptance — 27 November 2026

Migration085 committed using the existing Neon SQL Editor and preserved counts and fingerprints for all 155 canonical tables. The server build independently verified schemas082–085, exact Admin-only self-review guards, immutable-history protection and restricted-runtime grants. All493 uploaded source files match pushed commit `8c8829cde22f8ef3318d03552f9cfef534bcc853` on `codex/admin-single-approval`.

Deployment `dpl_Ccmz2843ctyDHaYJkTSsHZtAwjNT` is Ready and promoted to [the demo](https://easygas-client-demo.vercel.app). Candidate and stable API acceptance confirm one Admin authority across mutable settings; locked definitions, staff authority and self-privilege restrictions remain. A clearly labelled acceptance request recorded the existing opening-hours value without changing it: version 1→2, one Admin audit proof, no colleague decisions, stale replay409 and no extra version. Stable readback checked that exact audit proof. All three test sessions were revoked after each run.

Orders, bookings, customer identities/branches, reward balances, stock, finance ledger, fleet and LPG custody hashes were unchanged by the hosted acceptance checks. COD remains off. No messages, payments or physical measurements were fabricated, and no mobile binary was built. Four additional isolated release runs passed 71 tests; types and the actual hosted production build passed.

The exploratory1447-test run is retained unchanged. Of its 58 failed cases,30 have successful focused rechecks;27 historical source/CI proof checks and one prior matrix metadata defect remain open, with 36 original skips retained. These are not represented as passing CI. The completed Admin demo rollout does not remove existing public commercial production NO-GO, native, provider, import or physical-evidence holds.

Proofs: [shared migration](evidence/shared-migration085.json), [exact source](evidence/release-source.json), [candidate acceptance](evidence/candidate-hosted.json), [stable acceptance](evidence/stable-hosted.json), [stable alias](evidence/stable-alias.json), [resolved candidate failures](evidence/release-attempts.json), [retained broad gaps](evidence/whole-suite-reconciliation.json).
