# Release and rollback

1. Keep customer sharing and both embedded map flags off for the baseline rollout. Confirm the effective production configuration without printing key values.
2. In an isolated environment, confirm approved map IDs and key restrictions, map loading/error behavior, separate signed native builds, driver consent, offline reconnect, permission withdrawal and role-scoped tests. Complete the release gates before the operator enables sharing.
3. To stop customer sharing, disable `EASYGAS_CUSTOMER_RIDER_GPS_ENABLED` and restart the server environment as needed. Connected sessions remove the location on the next authorised snapshot, and UI expiry covers interrupted sessions.
4. To remove the provider UI, deploy a web build with the web flag off. Distribute a native build with its map flag off. During a native rollback, server-side customer sharing can be stopped immediately without waiting for store distribution.
5. Roll back application artifacts if required. This phase adds no tables or migration. Preserve recorded trip events, operation results, delivery history and withdrawal audit records. Existing routing remains governed separately.

Production stays NO-GO. No deployment, real device acceptance or provider activation occurred in this phase.
