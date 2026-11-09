# Rollback and recovery

Do not deploy, commit, push or modify hosted services from this handover. Preserve the untracked working tree and take a reviewed source snapshot before any future release. The current branch is `main` with no initial commit.

Before database changes, capture a protected backup and record schema versions, row counts, stock/reservations, pending appointments/materials, verified tender and prepaid liabilities. Restore to a separate staging database and validate it before applying incremental migrations. Never run the new-install bootstrap over an existing database. No destructive down migration is supplied.

For a failed transactional migration, verify PostgreSQL rolled back its changes and inspect `schema_migrations` before retry. For an already committed migration, use a reviewed forward correction, or restore the pre-release backup into a separate target with writes disabled and reconcile post-backup transactions before switching. Do not blindly drop service tables: financial, material and customer history may already reference them. Application rollback is only safe when the old build understands the expanded schema/constraints and cannot bypass serial allocation or safety controls.

For business settings, submit a versioned governed rollback proposal through existing history/approval controls. It creates another reviewed version; it does not erase immutable evidence. Temporarily disable an affected sale/service through authorised governance rather than rewrite receipts or safety reports.

Local recovery commands are documented in `local-testing.md`: stop the single-process embedded database owner, create/verify an encrypted snapshot and restore only to a new empty `.data/restores/<name>` directory. Automated tests decrypt and open an isolated restore. Managed PITR/off-site backup, recovery objectives, responsible people and a production restore drill remain required.

After recovery verify login/revocation, owned orders/bookings, paid-versus-due totals, quote/report immutability, slot/cylinder/material reservations and notification idempotency. Keep public writes disabled until finance/operations approve reconciliation. Never replay uncertain financial operations without their original idempotency key and ledger review.
