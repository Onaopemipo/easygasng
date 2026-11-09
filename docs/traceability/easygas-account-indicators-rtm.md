# Account indicator repair — 30 October 2026

ACI-01 / ACI-G01 — VERIFIED_COMPLETE / PASS (1 of 1 requirements, critical requirements and gates verified).

The existing Firefox account reproduced a PostgreSQL42703 error because `account_addresses.is_default` was missing. Migration023 had already been recorded on the older database, so modifying that historical migration could not repair it. Additive migration038 restores the field and unique active-default index;039 restores only the existing server update capability. The migration runner and generated bootstrap include both versions. Local development revision39 triggers an upgrade on the existing connection; managed/production upgrades remain explicit.

No existing address is deleted, rewritten or selected as default. The regression recreates the legacy schema, confirms the original failure, upgrades it, verifies saved address contents and actual counters, selects an owned address, replays the upgrade and confirms the choice persists. It rejects duplicate defaults and another customer's address access/forged customer identity. Existing dashboard and testimonial suites also pass (28 tests). Browser verification confirmed the original account warning disappeared and the endpoint returned actual zero counters and no default address. Temporary diagnostics were removed.

Implementation, evidence and security negatives are mapped in `easygas-account-indicators-rtm.json`. Screenshot: `docs/screenshots/easygas-account-indicators-fixed-20261030.png`. Existing production NO-GO remains unchanged. No hosted migration or deployment occurred. The original account page and normal development server remain open.
