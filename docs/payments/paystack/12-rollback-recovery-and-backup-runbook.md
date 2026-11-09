# Rollout, recovery and rollback

Before staging: take existing supported DB backup, verify checksum, restore to a disposable staging target, compare immutable invoice/wallet/payment/audit counts and totals, apply additive057 there, exercise old app/client compatibility and new API. Do not run fixture tests against business data. Local preflight source archive: `.data/paystack-preflight-source.tgz`; this is a source rollback aid, NOT a verified database backup.

Safe business rollback: independently approve gateway.enabled=false to prevent new quotes. Preserve server test credentials/worker for verification of already initialized attempts; do not discard inbox/attempt/posting history. Restore application UI only after compatibility check; leave additive schema and committed financial history in place. Never down-migrate by dropping money tables. If ledger state differs, stop affected collections and investigate without automatic balancing credits.

On initialization timeout: keep same reference; never retry initialize on an uncertain attempt. On posting abort: transaction rolls back wallet/payment/posting/audit/notification together; polling safely retries verification. PAY-PG-CONCURRENCY proves injected abort before posting + concurrent subsequent reconciliation, not actual server kill or production restore. Database commit acknowledgement loss requires the unique-key replay path and operational drill.

Staging backup restore, actual process crash, reconciliation drain, schema/application rollback and signed operational acceptance remain UNEXECUTED; PAY-20 blocked. Existing production NO-GO and Excel-import confirmation hold unchanged.
