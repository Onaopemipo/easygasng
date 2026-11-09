# Local API recovery — 2 November 2026

The local server returned HTTP500 even on /api/health. Direct migration diagnostics identified SQLSTATE42P01: reward_referrals was absent. The local database recorded migration043 from an early development revision, containing reward_entry_details/jobs but not the final order discount/referral tables. Migration044 therefore failed atomically before serving the API. Customer-facing errors correctly withheld internal SQL details.

A guarded additive 043c compatibility repair now runs before044. It extends only the recognised early schema shape; normal completed043 databases are recorded as compatible without replaying their schema. Mixed/unrecognised shapes fail closed for operator review. Original migration043 remains unchanged. Existing customer IDs, immutable reward entries, legacy monetary redemptions, balances and orders are preserved. New settings defaults do not activate earning, redemption or payments. Fresh bootstrap output includes the compatibility marker; the local hot-reload migration cache advances so running development installations pick up the repair.

The development server was stopped to avoid a second embedded database owner, the migration completed successfully, and the server was restarted on the original127.0.0.1:3003 address. HTTP checks: homepage200, catalogue200, health200, staff page200; unauthenticated /api/me401. No alternate-origin browser action or privileged account switching was used. The dev server is left running. Production NO-GO and prior release blockers are unchanged.

Regression fixture constructs the actual revision42 schema, applies the early043 prefix and retains the043 marker, inserts synthetic existing points/redemption records, then applies the compatibility/dependent migrations twice. It checks identity/history preservation, final schema and continued append-only enforcement. The existing core rewards regressions also run; logs and final outcome are mapped in the matrix.

See [traceability](../traceability/local-runtime-repair-rtm.md) and [HTTP evidence](../testing/local-web-smoke-20261102.txt).
