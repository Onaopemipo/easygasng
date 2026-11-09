# EasyRewards rollback and recovery

Production remains NO-GO; no deploy, hosted migration or real account edits occurred. Before any future deployment obtain named operations/finance/recovery owners, actual backup schedule and accepted RPO/RTO. No guarantees or owner names are invented.

Emergency stop: set EASYGAS_REWARDS_ISSUANCE_ENABLED=false and EASYGAS_REWARDS_REDEMPTION_ENABLED=false, restart relevant runtime/worker, verify status with rewards.program and owned /rewards history. Disable earning/referral/redemption through independently approved policy as needed. Historical ledger and outcomes remain readable. Manual finance corrections remain governed separately; do not use them as an earning workaround.

043 is additive to existing identity/ledger but broadens order total semantics. A rollback app must understand reward_discount_kobo and the closed conversion endpoint. Do NOT run an older release that assumes total=subtotal+delivery for discounted orders or reopens point-to-wallet conversion. Keep the patched compatible release and disable flags; do not drop relations or erase entries. No destructive down migration is supplied.

Uncommitted checkout/posting rolls back atomically. A timeout after checkout may have committed: query rewards.checkout-outcome with the same authenticated customer/key, then retry identical payload/key if necessary. Do not generate a replacement identity. Queue calculation/notification failure rolls back to savepoint; retries keep source policy/lines. After five attempts the job enters review. Failed enqueue opens reward_enqueue_failure incident. Reconcile the actual event/policy with independent finance review rather than apply today's policy to old history.

Full refund/cancellation makes compensating immutable entries through the established workflow; no posted entry is edited/deleted. Already-spent awards restrict point spending and require finance review/independent adjustment. Partial-refund compensation is not implemented; keep that lifecycle disabled.

Executed local restore test upgrades the actual revision-42 schema with a historical customer/77-point ledger, encrypts a PGlite data snapshot, decrypts into an isolated instance and verifies identity, sum and append-only trigger. This is NOT an independent production PostgreSQL restore rehearsal. A real PostgreSQL multi-connection migration/restore rehearsal, latest post-backup event reconciliation, owners and recovery-time evidence remain BLOCKED. Never restore an old snapshot over newer financial events without reconciling them.

## Completion recovery evidence

PostgreSQL 17.11 now ran isolated independent-connection and restore tests. A schema containing verified orders, point awards, approved partial refunds and allocation records was dumped with pg_dump, encrypted/authenticated using the existing backup code, decrypted and restored by pg_restore into a newly created easygas_test_restore database. Restored balances, refund allocation count, completed job state and append-only triggers were verified. Test databases/schemas were then removed; no working or production database was overwritten.

The compatible rollback application must understand revisions 043–046, reduced order totals, cumulative partial refunds, points-only zero-money refund requests and service awards. Keep the additive schema and history; disable the two earning/redemption flags to stop affected activity. Do not roll back to the earlier point-to-wallet conversion endpoint. Production owners, real backup rotation and accepted RPO/RTO remain business/operations release gates; the disposable test is not a production recovery-time promise.
