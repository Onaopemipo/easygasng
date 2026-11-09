# Deployment, rollback and recovery

No hosted deployment or actual business migration performed. Local tests migrated disposable memory/PostgreSQL schemas; only a previously approved isolated synthetic UI dataset received one canonical unpaid invoice during browser acceptance. Its wallet/payment ledgers stayed untouched. Existing ordinary web runtime/data are not seeded.

Migration072 adds only a governed identity definition/default null setting per existing branch. No ledger/customer/invoice table rewritten, no historical number/backfill and no automatic notification. Runtime local schema marker73, canonical migration registry and generated bootstrap include072. A new branch must follow existing settings provisioning; no assumption that a missing identity setting is configured.

Before staging/production: capture tested release artefact/current template and immutable records/ledger counts, take and independently restore a backup, rehearse normal `npm run db:migrate` with managed migration credentials, then verify actual records/counts/permissions and download both historical/new types. No credentials in logs. Actual business/legal/finance signoffs and prior launch gates must pass separately. The unborn repository has no commit/image rollback identity yet; do not invent one.

New default `EASYGAS_DOCUMENT_TEMPLATE_V2=false`. After acceptance, enable it only for the authorised environment; new invoice issues/payment quotes capture template2. Historical v1/unversioned PDFs remain legacy. Rollback: disable flag and restart the normal runtime, without SQL undo or deletion; renderer tests verify legacy selection. Preserve all original snapshots, payment postings, approvals and audit history. Never mutate money to repair template failures.

Existing request/notification retries must use their canonical operation IDs and secure expiry/consent rules. No new PDF storage worker or retry state exists: PDFs generate on demand; a failure returns an error and never creates/changes a financial event. Do not claim a queued generation_failed/upload recovery workflow that is not implemented.

## Dependency-aware remaining task register

|Task|Depends on|Can continue independently|State|
|---|---|---|---|
|Actual verified legal identity and tax treatment|Business evidence + independent approval|Optional values remain omitted; renderer/security tests continue|OPEN external acceptance|
|POS/manual-credit PDF receipts; full status-filter scaling beyond100candidates|Explicit canonical verified receipt semantics; engineering|Existing operational histories unchanged|OPEN engineering|
|Document resend/attachments/secure link lifecycle|Engineering + consent/provider configuration|Preview/PDF/download work continues|OPEN engineering and provider acceptance|
|Provider refunds/chargebacks/merchant settlements|Existing payment project + merchant terms/verified outcomes|Original receipts/approved notes remain honest|BLOCKED/incomplete financial capability|
|Installed native receipt share/accessibility|User currently defers native builds|Source/typecheck continue|DEFERRED, retained|
|Staging backup/restore and rollout|User defers server work, release artefact/access|Local PostgreSQL/renderer rollback tests continue|DEFERRED, retained|
|Production volume and tagged-PDF accessibility|Engineering/performance/assistive review|Bounded100-row tests/local keyboard checks continue|OPEN|
