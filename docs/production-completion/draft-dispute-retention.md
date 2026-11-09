# Service draft, dispute and retain-all continuation — 8 November 2026

The complete seven-area non-payment request remains **PARTIAL / production NO-GO**. This continuation does not claim every business feature is finished. Existing requirements and gates, actual Excel import hold and deferred server deployment/mobile builds remain. No real customer, business stock, provider account, credential or financial posting was used as a test fixture.

## Repository audit and implementation

The existing booking, quotation, invoice, correction, incident and privacy systems remain authoritative. Audit found computed draft previews but no saved revision history; successful documented work had acknowledgement and refund controls but no customer-raised post-report dispute hold; the worker could still purge expired proof bytes.

Migration062 adds append-only `service_invoice_drafts` linked to the existing booking, with unique booking/revision, approved source identity/total, due date, customer note and revision reason/author. It uses forced RLS and grants the restricted server only SELECT/INSERT. Booking locks serialize saves with issue and quotation/report changes. An expected revision prevents stale edits. A stable operation identity replays one committed save. Current approved amounts cannot be edited through a draft. The exact latest revision and approved source must be reviewed before issue; issued snapshots remain immutable. Existing invoices without saved drafts retain the original issue flow. The renderer includes the saved customer note; no new invoice/customer/payment ledger exists.

Customer post-report concerns use the existing `operational_incidents` and `incident_events` records, category `service_dispute`. A rejected service acknowledgement also opens that review. Active disputes prevent further invoice requests/collection and chargeable work via authoritative source/balance checks. They cannot rewrite the report, invoice, payment, refund or reward history. Only recently verified owner/service-manager review, independent of the report author, may resolve the dispute; financial adjustments and refunds still require existing separate approvals. Repeating a positive acknowledgement cannot bypass an open dispute or issue another service reward. Resolution does not turn an unsuccessful report into a successful one.

The user explicitly instructed **all records must be retained**. The proof-purge entry point now returns a retention hold without clearing expired bytes. Customer deletion review records `retained`, audits `retain-all-20261108`, and explicitly says no deletion occurred. Existing pending deletion requests receive this disposition on renewed customer review. Owned export remains available and cannot mark deletion completed. Existing expiry/consent/branch/ownership restrictions still apply to viewing retained evidence. Retention does not restore bytes removed by an older version. See [record-retention policy](../operations/record-retention.md).

## Operating sequence

1. Finance opens the existing booking's invoice dialog, verifies their existing password and reviews the authoritative service preview.
2. Save a due date, customer-visible note and revision reason. Save again for a new immutable revision. Reopening shows the persisted revision and history.
3. If quotation/report authority changes, refresh and save the new source revision; stale issue/save fails. Once issued, use the existing independently approved correction workflow.
4. Customers can raise a concern from the report section. Operations reviews it in existing Operational Incidents. The report and financial evidence remain unchanged; any credit/refund uses existing finance controls.
5. Customers reviewing deletion see the retained disposition and can still export their owned data. Workers preserve retained proof bytes.

## Executed evidence

- `evidence/draft-revision-tests.txt`: 24 focused service/draft/dispute/refund/operations/retention checks. Includes stale edits, replay, customer/role privacy, immutable rows, changed approved scope, report preservation, blocked collection and non-destructive retention.
- `evidence/draft-revision-postgres.txt`: 2 integrated actual restricted-runtime HTTP/PDF and independent PostgreSQL cases. Includes competing draft saves, forced rollback after draft insert, RLS, invoice issue and payment-request replay. Synthetic schemas only.
- `evidence/draft-revision-browser.json`: actual isolated browser finance reauthentication/save/issue and customer retained-disposition checks; screenshots alongside it. These do not imply all-role/device acceptance.
- `evidence/draft-revision-build.txt`, `draft-revision-types.txt`, `draft-revision-traceability.txt`: production web build, web types and phase matrix validation. No mobile build.
- Broad regression logs record their exact totals. Earlier runs overlapped the retention-policy/test transition and branding-matrix format repair. Do not describe a failed intermediate run as passing or add overlapping checks as new coverage. Focused matrix validation resolves the metadata defect; final application guard changes have focused/build coverage.

## Remaining work retained in scope

- E2E-01/02: physical-product and multi-cylinder doorstep custody; every changed/failed/void/cancelled obligation and provider-funded reversal variant; complete browser, operational and physical safety acceptance.
- E2E-03: grounded destination coordinates, road routing/deadlines and operating-cost recommendations. Existing capacity/custody checks are not route predictions.
- E2E-04: full physical-device offline/restart/storage/camera/background GPS/trips/fuel acceptance and remaining recovery/review gaps.
- E2E-05/06: official SMS/WhatsApp provider templates/receipts and consented delivery acceptance, campaign/channel policy and realistic scale acceptance. No live messages sent.
- E2E-07: customer-confirmed payment ambiguity, opening stock, historical fees and identity matching; actual Excel import remains prohibited pending those confirmations.
- E2E-08: apply/verify retain-all controls during real backup/restore and independent policy acceptance; destructive erasure superseded by the business instruction, not silently dropped.
- E2E-09/10/11: deferred server/mobile work, reviewed source baseline/hosted CI and independent business/finance/safety release acceptance.

## Recovery and data preservation

The generated bootstrap includes062 but was not applied to business databases. Use the normal migration runner for an approved deployment. Do not drop saved revisions or restore a version that purges retained proof. Keep current application/policy controls before starting workers after restore. Draft rollback cannot remove issued snapshots or financial notes. Keep incident/revision/audit/operation evidence; use reviewed forward repair for defects. Synthetic preview and test PostgreSQL are stopped after verification; existing business/demo data is preserved.


Final results: `evidence/draft-revision-accepted-regression.txt` records **408/408 passed, zero failures/skips**, with disposable PostgreSQL enabled. This supersedes the intermediate branding-matrix format failure, which was repaired and separately validated2/2 before the accepted run. Final source also preserves due dates as database date text across server timezones. Focused24/24, HTTP/PostgreSQL2/2, web build/typecheck and matrix2/2 checks pass; these overlap, not additive coverage. The synthetic browser preview and disposable PostgreSQL were stopped. Full seven-area implementation and production acceptance remain incomplete; the outstanding list above is retained.
