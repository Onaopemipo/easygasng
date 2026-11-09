# Local runtime compatibility repair

LOCAL-R01 — VERIFIED_COMPLETE. LOCAL-G01 — PASS. Coverage1/1.

The recorded early043 schema is extended before044 without replaying the original full migration or changing balances/accounts/orders. Known partial state is tested, immutable history is preserved, and unrecognised mixed schema shapes fail closed.

Evidence: 23 passing upgrade/core rewards tests, no failures/skips; web typecheck; live health/catalogue/homepage/staff HTTP200 and unauthenticated account HTTP401. Exact sources, security controls, tests and logs are in the JSON companion.

Production NO-GO remains; this is a local runtime repair only.
