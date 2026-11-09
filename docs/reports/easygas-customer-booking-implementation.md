# Customer service bookings implementation — 30 October 2026

**Local interface and recovery improvements are implemented. Full acceptance is incomplete; production remains NO-GO.** The matrix retains all 70 supplied BK, RC, REC01-T and EO scenario IDs. 49/70 are locally verified, 5 partial, 12 blocked and 4 implemented but unverified. 15/18 booking gates and 4/14 recovery gates pass within the recorded local scope. Critical verification is 45/64 P0 scenarios. No blocked/untested requirement is removed from a denominator.

## Delivered customer experience

/bookings adapts the supplied reference into the existing authenticated customer workspace, with one navigation/header system. It provides the green service hero, active backend service cards, My bookings/Services switch, Upcoming/Awaiting Action/Completed/Cancelled tabs, appointment summaries, details, actual timeline, eligible rescheduling/cancellation, quotation decisions/revision history, reports/invoices, feedback, rebooking, follow-ups and support/help/coverage cards. The dashboard now shows the next actual appointment or a compact invitation. Desktop, tablet and mobile are responsive; minimum text remains 15px.

Services are never fabricated to fill five design cards. Only approved active records are displayed. Missing approved technician photography uses a cooking-equipment illustration. There is no unverified certification claim or fabricated arrival/GPS tracking. The supplied image is retained in docs/customer/service-booking-approved-reference.png.

The existing service detail/form now supports eligible saved addresses and a review step before confirmation. It preserves selected service, real slots, equipment concerns, address, call-out/price basis and cancellation terms. Private images can be attached to an eligible saved booking using the existing validated upload. My Bookings shows the saved reference and status; it does not assert payment or safety clearance.

## Reused architecture

ProfessionalServices, BookingCard, Reschedule, ServiceForm, ServiceFollowups, ImageUpload, CustomerWorkspace, Site session invalidation and safe login returns are reused. The existing professionalServiceAction, slot validation, qualification/branch checks, quote revisions, immutable report/decision history, material reconciliation, cash/wallet/refund controls, media ownership, support and notification tables remain authoritative. No parallel booking engine, customer identity, reservation system or ledger was created. Driver/technician administration experiences remain unchanged.

## Recovery changes

- Migration 033 adds business_operation_results with immutable committed results and trusted private-server access, active-slot uniqueness and optional quotation validity. It is additive and retains business history. Bootstrap and migration discovery are updated. The Supabase mirror was created by the installed CLI; no hosted migration/project was provisioned.
- A reusable businessOperation wrapper runs inside the existing dispatch transaction. Key, actor, action, canonical hash, role and branch identify the operation. Same-key retries recover the committed result; conflicting reuse rejects. No automatic key expiry exists. Pending insertion and all business effects roll back together.
- Public HTTP booking/material mutations require a UUID operationKey; public cancellation/rescheduling require a positive booking version. Updated web forms supply these. External API consumers must adopt this contract. Internal mixed checkout/legacy trusted dispatch calls retain their established natural business references and transaction protections; a universal all-module guarantee is not claimed.
- Browser key storage contains only account-scoped fingerprints and random keys. Native create identities survive navigation until acknowledgement. Unknown responses direct the customer to retry unchanged/check My Bookings. Protected outcome/native-reference reads reconcile committed requests.
- Service events transactionally create in-app updates and deduplicated pending email outbox entries respecting service consent and Lagos quiet hours. No external sender is enabled, no delivery is claimed, and no live messages were sent. A future sender must recheck preferences and reconcile uncertain provider acknowledgements independently.
- Customer read models remove staff IDs, collector identifiers, material acquisition costs and internal request hashes. Quotation validity is optional, displayed honestly and enforced when configured. Cancellation includes a stale-version check.

Exactly-once applies only to identified committed business effects inside the documented database boundaries. It does not mean exactly-once requests, worker execution, email/SMS, physical stock movement or external settlement.

## Verification

- Full regression after application changes: 177 entries, 175 passed, zero failures, two PostgreSQL environment skips. The latest additional recovery/contract tests were run separately after that regression.
- Latest focused recovery suite: 13 tests passed, zero failures. It tests same-key replay/conflicts/ownership, injected outbox failure rollback, lost commit acknowledgement, failed and competing rescheduling, stale cancellation, quotation/material rollback and replay, expired quotation rejection, interrupted report publication, failed safety evidence, permission revocation, wallet/refund failure and replay, quiet hours, failed additive DDL rollback, trusted-server/RLS operation persistence and immutable committed outcomes.
- Encrypted restoration runs in a separate PGlite instance and verifies real bookings, operation results, quotes/decisions, completed reports/acknowledgements, notifications, audit and inventory/money counts and relationships. Existing backup regressions also retain verified receipt/report history. This is local restore evidence, not supervised production/off-site recovery.
- Browser journey: secure login return; quote approval; completed/cancelled history; report controls; saved-address booking and review; same-reference reschedule/cancel; a separate mobile booking; empty commercial account; website/services/dashboard switching; coverage; keyboard tab navigation. Actual 1560, 1024 and 390 widths had no document overflow. Mobile hero measured 303px.
- Web TypeScript, Prettier and production build passed. There is no configured lint command, so none is falsely reported as run. Matrix validation passed.

Evidence: docs/testing/customer-service-booking-regression-20261030.txt, service-booking-recovery-20261030.txt, service-booking-postgres-20261030.txt, customer-service-booking-build-20261030.txt, customer-service-booking-types-20261030.txt, customer-service-booking-format-20261030.txt, service-booking-traceability-20261030.txt and customer-service-booking-browser-20261030.md. Screenshots are under docs/screenshots/customer-service-bookings-*-20261030.png.

## Outstanding acceptance and dependencies

No running disposable local PostgreSQL/Docker server was available. The guarded independent-connection harness is delivered and was explicitly skipped. Actual PostgreSQL crash, disconnect-during-COMMIT, independent capacity race and recovery drills remain open. Injected failure tests are not substituted for those results.

The repository is on unborn main with no HEAD/known-good release, so real prior-release rollback cannot be certified. No production deployment, hosting migration, online payment connection, external notification sender, supervised/off-site backup schedule, business-approved RPO/RTO or operational restart approval was introduced. Application/database outage, manual fallback reconciliation, actual pending-operation restart/expiry and dedicated screen-reader/live reduced-motion verification remain recorded as unperformed where applicable.

No verified defect remains in the executed local tests. This statement does not imply that unexecuted scenarios have no defects. Complete the independent PostgreSQL/recovery harness, establish a versioned known-good artifact, conduct operator/manual/restore drills and obtain the existing business/safety/finance launch approvals before reconsidering production NO-GO.

## Files and documentation

New main code: customer-bookings.tsx/css, service-mutation.ts, business-operation.ts, quiet-hours.ts and migration 033 (local + Supabase mirror). Modified integration: Site, ProfessionalServices, ServiceFollowups, CustomerDashboard/read model, dispatch, API route, database migration registry and bootstrap exporter/output. New tests: service-booking-recovery.test.ts and service-booking-postgres.test.ts. Isolated browser fixture: scripts/prepare-service-booking-qa.ts. No normal business records were seeded or deleted.

Customer/workflow/security: docs/customer/service-booking-experience.md; docs/workflows/service-booking-lifecycle.md; docs/security/customer-booking-permissions.md. Recovery: docs/recovery/service-booking-preflight.md, service-booking-recovery-architecture.md, service-booking-runbook.md, service-financial-inventory-recovery.md, service-deployment-database-rollback.md, service-booking-business-continuity.md. Exactly-once scope: docs/architecture/exactly-once-business-effects.md. Scenario-by-scenario results: docs/testing/customer-service-booking-tests.md, service-booking-recovery-tests.md and exactly-once-business-effects-tests.md. All 32 gates: docs/reports/easygas-service-booking-recovery-readiness.md. Requirements/source/security/evidence/outstanding work: docs/traceability/easygas-service-bookings-rtm.json and Markdown companion.

The owned browser QA server was stopped and QA tabs closed. The original port 3003 development server was preserved. No commit/reset/stash/production deployment was performed. The final source manifest records current hashes and is not a replacement for an approved known-good Git release.
