> Current continuation status: migrations050/051 and partial operations functionality are described in [the current report](../reports/post-meeting-implementation-report.md) and [operations runbook](../operations/operations-completion-runbook.md). Earlier entries below are retained history. Production NO-GO and Excel import hold are unchanged. Public visual guard checks passed after unlock; authenticated/device acceptance is still outstanding.

# Post-meeting rollout and rollback

Production decision: NO-GO. Local hosting remains selected. No production migration/deployment or provider activation performed. There is no committed Git HEAD; establish a reviewed, recoverable source baseline before release. Do not use destructive Git cleanup.

047/048/049 are additive. Existing users receive public IDs without changing login IDs or credentials. Source metadata defaults LEGACY for older inserts; invoice rows are independent and immutable. Regenerated bootstrap is for a NEW EMPTY database only, never an upgrade of a populated installation. Existing installations use the versioned migration runner. Test migration twice and preserve public IDs. New readiness requires through049.

Before any managed rollout: take encrypted logical backup, verify archive, restore to a new empty isolated database, record inventory/financial totals, apply migrations and run restricted-role positive/negative checks. These migrations must not be run against live hosting without the review/backup gate. Local isolated PostgreSQL PR-03 tested backup tamper/wrong-key/overwrite rejection and restoration; this does not prove a production backup or full newer-ledger restoration.

On application regression: disable affected new entry points via a reviewed compatible build; retain additive columns, invoice snapshots and committed customer/order history. Never drop047/048/049 or overwrite newer payments to undo an application bug. Do not restore an old backup over live newer business effects. Reconcile ambiguous assisted orders by customer+idempotency key and issued invoices by order ID; no blind repeat or manual balance edits. A complete old-app rollback rehearsal remains outstanding.
