# Admin dashboard recovery

No database migration or data import was introduced. Do not drop schema, restore an old ledger over new transactions, reset/clean the unborn repository or replace customer/driver/technician applications.

Before changes, source-only `.data/admin-dashboard-preflight-source.tgz` captured the affected admin shell, service, navigation, CSS and registry. All16 original untracked top-level entries remain. Review and extract any recovery copy to a separate directory first; compare files manually and restore only this phase's changes. Existing unrelated technician/driver/governance work takes precedence over bulk snapshot replacement. New admin-dashboard.ts/admin-overview.tsx/admin-search.tsx should be removed only as part of an explicit reviewed source rollback, after restoring their callers. Do not overwrite secrets or data directories.

Restart the local web process and run typecheck, build and the isolated suite after a reviewed source rollback. Existing encrypted backup/restore integration and PostgreSQL recovery tests passed in this phase's full suite. This is not a production restore or release rehearsal. Approved business RTO/RPO, production encrypted backup destination, environment restoration and operator signoff remain outstanding. Search rate-budget rows are harmless namespaced existing auth_attempts records; do not delete shared authentication lockouts.

Production NO-GO, disabled live providers and Excel ambiguity/import hold remain unchanged. Preserve authoritative payments, custody, evidence, approvals and operation identities throughout any forward fix or rollback.
