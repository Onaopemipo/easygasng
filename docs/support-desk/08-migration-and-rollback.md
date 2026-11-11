# Migration and rollback

Apply migration `076_support_completion.sql` before deploying the web API. The same migration is included in the generated fresh database bootstrap. Existing requests, messages, and identifiers are retained. Existing tickets start without an SLA snapshot. Previous clients still receive the legacy array response and can keep using their existing payloads.

Before hosted migration, retain an encrypted pre-076 archive and verify its authentication and readability. Use the existing restricted runtime role and confirm it can read the new tables without update/delete permission on stored evidence. Use a disposable database for any restore drill.

If a release fails, promote the previous demo deployment and pause any affected SLA worker. Keep the additive schema, images, audit events, and notices so a forward fix can resume without losing records. No destructive down migration is provided under retain-all. Schema rollback and a live hosted restore were not executed.
