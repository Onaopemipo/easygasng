# Shared approval capability, gas pricing and delivery — implementation verification

Date: 30 October 2026 (Australia/Brisbane). Release recommendation: **NO-GO**. This is a local implementation and verification report, not deployment authorisation.

## 1. Repository baseline and gap assessment

The starting branch was unborn `main`, with no commit and the existing application untracked. Existing files, the prior typography work, historical audit reports, business records and the user development server were preserved. No commit, push, hosted provisioning or payment-provider activation was performed.

The existing application already had authoritative settings, independent decisions, version history, a maintenance worker, branch permissions, financial ledgers, cylinder allocation/custody, delivery confirmation, service approval and mixed checkout. Gaps were missing saved drafts and a central transition graph, incomplete activation-failure/retry semantics, comma-separated delivery areas, fixed-quantity refill products, unit-count inventory and client flows without a versioned gas quotation. The implementation extends those systems; it does not add a competing approval engine.

## 2. Implemented functionality

| Area | Result |
|---|---|
| Shared approvals | One transition graph covers draft, review, changes requested, partial/all approval, scheduling, applying, active, rejection, cancellation, expiry, failure, supersession and approved reversal. Existing lowercase status fields retain compatibility; canonical uppercase state names and transition audit details share the same meanings. |
| Drafts and review | Save, edit, submit, request changes, revise/resubmit and withdraw; decisions remain append-only and material revisions invalidate prior decisions. Own/beneficiary approvals and fabricated identity/status/policy fields are rejected. |
| Activation | Current actor/requester authority, independent distinct decisions, policy snapshot and base version are rechecked. A savepoint protects setting and domain projection changes; failures retain the prior live value and persist failure, attempts, diagnostic type/code, audit and notifications. Authorised retry revalidates everything. |
| Scheduling and rollback | Africa/Lagos scheduling, due-time revalidation, request/setting locking and a unique request/version index. Stale approved changes become superseded. Reversal creates a new approved version and keeps historical records. Existing stronger financial/security policy is retained. |
| Gas pricing | Backend-managed initial NGN 1,800/kg, history, reasons and scheduling through the shared settings capability. Public fixed-fill estimates use the current per-kg rate; old per-product prices remain historical and cannot govern new refills. |
| Delivery fee | Backend-managed initial NGN 5,000 once per eligible physical delivery order. Products/cylinders and gas share that fee. Professional service call-outs remain separate. |
| Locations | Database-managed Lagos Island, Victoria Island, Lekki and Ajah; add, edit, activate, deactivate, archive, display order, coverage/description and branch scope. Changes use the same owner approval workflow. Historical orders remain linked and affected open orders are flagged for review. |
| Address eligibility | Active-location selection, linked saved addresses, edit/archive/default controls and unavailable-location flags. Ordering requires business coverage configuration. Gas dispatch defaults to current staff verification of the actual address; whole named-area coverage needs explicit owner-approved configuration. |
| Flexible quantities | Capacity and desired kg are separate, with decimals, manual entry, controls, shortcuts, multiple cylinders and a dynamic size guide. Web/native share integer-gram and BigInt-kobo arithmetic. Minimum/maximum/increment/precision are configurable and deliberately start unconfigured. |
| Checkout | Server quotation and confirmation reprice items, check accepted versions and total, active branch/location, payment arrangement, delivery capacity, physical stock and bulk gas. Replay-safe transactional reservations prevent duplicate commitments. Historical amounts are not recalculated. |
| Inventory and safety | Unit-specific gram stock and append-only gas movements extend the existing inventory system. Cancellation releases and delivery consumes reservations once. Customer-owned intakes enter quarantine; documented cylinder inspection, custody checks and verified additional-fill allowance are required. Existing serials cannot be registered again. |
| Product/service packages | Existing physical cart items can accompany gas, with separate cylinder purchase pricing. Staged installation/service appointments use the existing atomic mixed checkout, independent service pricing and separate completion/billing. The linked checkout exposes an Add cooking gas entry. |
| Website | Homepage calculator, backend prices/coverage, confirmed service summaries, `/gas-order`, full calculator/guide, address capture, quotation review, order gas details and tracking references. Customer pickup is not introduced; internal stock/driver collection remains. |
| Native application | Current price/fee, shared calculator, flexible multiple-cylinder ordering, active/saved locations, address details, explicit quotation, physical-cart and staged-service integration, order confirmation/history and immediate basket clearing after successful placement. Existing readable text/font scaling is retained. |
| Administration | Current-price cards, schedule/draft form, location management, real counts, bulk receipt and limited filling queue, quarantined customer intake, inspection controls, order coverage confirmation and the shared Approval Centre. |
| Reporting | Actual quantity states, historical gas subtotals, one recorded delivery fee, verified payments and outstanding balance, branch/location/day/customer groupings and filters. CSV, Excel XML and printable PDF view derive from the same rows. Formula/HTML/XML injection protections are tested. Revenue is not labelled profit. |
| Confirmed maintenance | Cylinder Maintenance is seeded as an inactive quotation-only service with no approved safety checklist. Existing service configuration and qualified checklist approvals are mandatory before booking. No unconfirmed service price or availability is published. |

## 3. Files created and modified

New shared modules are `packages/business-rules/src/approval-states.ts`, `gas-pricing.ts` and `gas-report-export.ts`; server modules are `apps/web/lib/approval-workflow.ts`, `gas-delivery-config.ts` and `gas-delivery.ts`; interfaces are `apps/web/components/gas-order.tsx`, `gas-delivery-admin.tsx` and `apps/mobile/GasOrder.tsx`.

Integration modifies the existing governance, service dispatch, ordering, delivery, commerce/POS, accounts, scheduling, refill history, mixed checkout, migration loading and readiness modules. Existing admin/site/workflow/linked checkout components and native App/Services/Workflows/CombinedCheckout consume the new capability. The API read allowlist, public route allowlist, CSS and bootstrap exporter are updated. Prior baseline tests were adapted to the confirmed business rules while preserving safety and financial assertions; dedicated gas and shared-approval tests cover the new paths.

The exact reviewed source paths and SHA-256 hashes are in [the source manifest](shared-approval-source-manifest-2026-10-30.json). The working tree remains uncommitted; the manifest is evidence for this snapshot, not a Git commit.

## 4. Database changes and configuration

- Application migration **023**: approval snapshots/lifecycle metadata, state constraint, unique activation reference, locations, integer-gram stock and append-only movements, gas lines and inspection metadata, order/location/pricing snapshots, saved/default addresses, recurring pricing snapshots and supplied initial values.
- Managed policy **024**: private-schema RLS and narrow runtime grants, preserving no DELETE and immutable audit/decision/version/financial ledgers.
- Application migration **025**: fixed-fill historical grams inferred only from explicit original line labels; previous monetary amounts are preserved. Ambiguous legacy quantities remain unclassified.
- Application migration **027**: confirmed Cylinder Maintenance as an unpublished governed draft. Existing service records are preserved.
- CLI-generated managed files: `20261029161100_shared_approvals_gas_delivery.sql`, `20261029162826_gas_reporting_snapshots.sql`, `20261029203712_cylinder_maintenance_draft.sql`. The fresh-install `database/bootstrap.sql` is regenerated.

Initial business settings are 180,000 kobo/kg and a 500,000-kobo flat fee. Named locations are active and visible, but precise coverage and actual-address eligibility are not inferred from their names. No physical gas is invented; measured bulk stock starts at zero. Operational quantity limits remain null until supplied. Initial capacities are 3, 6, 12.5, 25 and 50 kg. Online payment and external messaging adapters remain disconnected. Existing cash/credit arrangements are used only if explicitly enabled under their original policies.

## 5. Security, audit and integrity

The shared engine retains independent owner approval for gas price, fee, quantity rules and material location changes. Existing stronger dual-role, recent-verification, safety-review, delegation and access-beneficiary restrictions remain. APIs reject caller-supplied privilege/status identity, and authority is refreshed from the database. Draft revision, retries and withdrawal follow the central transition policy. The existing allowlisted emergency protective disable remains audited and cannot enable a provider.

Customer orders retain exact quantities, unit rates, subtotals, fee, total, address and location snapshots. All authoritative stock, payment and version writes occur transactionally. Filling a cylinder is not authorised solely by nominal capacity. Customer intakes are quarantined, duplicate serials are refused, active custody is retained, and inspection plus verified allowance is required. Location changes invalidate manual coverage evidence by version. Non-owner reports and operational queues are branch-scoped; inventory's queue does not expose order addresses or payment details.

## 6. Verification and actual results

| Check | Actual result |
|---|---|
| `node --import tsx --test --test-concurrency=1 tests/*.test.ts` | **120 passed, 0 failed, 1 skipped** out of 121 tests. [Full log](shared-approval-tests-2026-10-30.txt) |
| Focused shared approval/gas suite after final failure-diagnostic and reporting changes | **11 passed, 0 failed**. [Targeted log](shared-approval-targeted-tests-2026-10-30.txt) |
| Catalogue regression | **2 passed, 0 failed**. [Log](shared-approval-catalogue-regression-2026-10-30.txt) |
| Web TypeScript | Passed. [Log](shared-approval-web-typecheck-2026-10-30.txt) |
| Next production build in isolated `.next-qa` | Passed. [Log](shared-approval-web-build-2026-10-30.txt) |
| Native TypeScript | Passed. [Log](shared-approval-native-typecheck-2026-10-30.txt) |
| Android and iOS Hermes exports | Passed. [Log](shared-approval-native-export-2026-10-30.txt) |
| Independent PostgreSQL connections | **Skipped**, not passed: no explicitly enabled disposable local PostgreSQL instance. [Harness result](shared-approval-postgres-test-2026-10-30.txt) |
| Browser lifecycle | Synthetic owner created a price draft, revised it, submitted it, had no own-approval control, and withdrew it; active gas price stayed NGN 1,800. |
| Browser calculator | 7 kg + 4 kg showed NGN 19,800 gas plus one NGN 5,000 fee = NGN 24,800. The five-size guide and four initial locations rendered. Missing operational configuration kept confirmation unavailable. |
| Browser reporting | Authorised zero-row fixture report ran and CSV downloaded. Excel/print generators were unit-checked; actual Excel opening/PDF print destination was not exercised. |
| Responsive typography | Five affected pages measured at 1280px and 390px: minimum 16px and no document-width overflow. [Measurements](shared-approval-ui-checks-2026-10-30.json) |

Relevant cases cover self-approval, distinct dual approval, role revocation, policy/version checks, scheduling, failure atomicity/retry, approved rollback, duplicate activation/reservation, all four area fees, inactive-location rejection/history, saved/default addresses, cylinder intake/quarantine/inspection, delivery replay, cash remaining unverified, report totals and injection protection. Updated regression expectations include the fifth unpublished service; existing public draft visibility assertions remain unchanged. No test-coverage percentage or production concurrency guarantee is inferred.

Browser evidence: [Approval Centre](../screenshots/shared-approval-centre-20261030.png), [review/self-approval protection](../screenshots/shared-approval-review-20261030.png), [Settings](../screenshots/gas-delivery-settings-20261030.png), [calculator](../screenshots/gas-calculator-20261030.png). All browser mutations were confined to the synthetic QA database. The normal user development server was preserved.

## 7. Outstanding work, dependencies and production decision

The shared business capability and local integrations are implemented. The following gates remain before production:

1. Supply and independently approve real minimum/maximum gas quantities, increments, precision, coverage definitions and any whole-area policy; verify actual streets operationally where required.
2. Reconcile real bulk gas and physical cylinders; provide genuine inspection/qualification evidence, service terms, qualified maintenance checklist, pricing and appointment availability. Do not convert old unit stock into kg without measurement.
3. Configure a disposable local PostgreSQL test instance and run the guarded multi-connection harness, then perform managed-runtime/load/recovery acceptance. PGlite is not proof of independent connection locking or uncertain-COMMIT recovery.
4. Preserve the existing local-hosting decision and unconnected online payments. Hosted database/TLS/domain, external notifications, operational monitoring, backups/restore and deployment ownership remain separate launch gates.
5. Complete physical native-device, accessibility, signing/distribution and store acceptance. Bundle export does not verify real device behaviour.
6. Verify Excel XML interoperability, actual PDF print output and large real-data reporting. Existing finance/refill modules remain authoritative for cost/profit allocation, service reconciliation and prediction evidence; ambiguous historical kg/location data requires review rather than invented classification.
7. Obtain independent business, finance, safety, security and operations acceptance and explicit release authorisation. Existing NO-GO remains in force.

An earlier unconstrained database-test command was rejected by automatic review before any connection. The replacement harness permits only an explicitly enabled localhost `easygas_test…` database, creates a unique temporary schema and remains disabled here. No hosted data was accessed or changed.

## 8. Documentation and next actions

The requested business rules, calculator, location, customer workflow, administrator guide, data architecture, reporting, testing and release/rollback documents are under `docs/business-rules`, `docs/workflows`, `docs/guides`, `docs/architecture`, `docs/reports`, `docs/testing` and `docs/deployment`. [Shared workflow architecture](../architecture/shared-approval-workflow.md) explains extension to future governed controls. README, role guidance and known limitations link the new capability.

Review the local Settings and Approval Centre, supply the outstanding business configuration, run the separate PostgreSQL and real-device acceptance gates, and retain the current NO-GO until independently approved. No production deployment is implied by these results.
