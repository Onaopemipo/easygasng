# Compact ordering release and rollback

No database migration, seed change, new permission, production configuration,
native export or deployment was performed. Existing production NO-GO and prior
launch gates remain. Do not use synthetic QA prices or stock as release inputs.

The optional locationId in gas.quote is additive; callers that omit it keep
their existing quotation behaviour. Deploy the compatible API before clients
that submit locationId. Roll back those clients before rolling back the API.
Revert the compact-order code as a unit to return to the prior layout. Keep all
orders, price snapshots, payment attempts, stock and audit history intact.
No restore, refund, payment reversal or stock replay is part of this UI rollback.

Before release: review the named tests and browser evidence; test signed native
builds on physical devices, actual operating policies, assisted flows and
provider-dependent scenarios. Staging rollback, UAT and explicit release
approval are open.
