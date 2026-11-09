# Preservation and migration risk plan

Only additive tables/columns/indexes/settings definitions, default OFF. Do not drop/change existing money types, IDs, verified history, wallet entries or invoices. New provider attempts must reference existing economic obligations and principal allocations, with separate processing-fee amounts and provider variance exceptions. No backfill of historical transactions to Paystack paid.

Locks: financial obligation and customer wallet before posting; unique provider reference, receipt digest and economic posting key. Multiple attempts must not allocate more than current obligation; late/mismatched/double payments become investigation exceptions, never silently lost. External HTTPS never inside retried SQL transaction. Test/live separation and callback allowlist mandatory.

Fee risk: waiver thresholds can make net(gross) discontinuous, so binary search across the entire domain is unsafe. Solve monotone policy intervals separately and choose globally smallest valid integer gross. Merchant automatic fee setting must be confirmed OFF before application gross-up; otherwise double charging risk blocks activation. Actual fees are reconciliation evidence, not retroactive invoice edits.

Current refunds create purchase credit; provider refund must not also leave spendable credit. Wallet funding is liability, not sales revenue. Gateway test receipts must not be represented as actual merchant funds. Preserve immutable fee/invoice policy snapshots. Migration tests use disposable schemas; staging/production migration/backup/restore require separate operational gates. Existing original/demo local databases remain separate. Production NO-GO and Excel import hold unchanged.
