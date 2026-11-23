# Loading performance investigation — 24 November 2026

The supplied screenshot shows the Admin Orders shell loaded while the records panel waits indefinitely. Two fresh authenticated reads of the existing client-demo Orders API returned **24 records in20.365 and20.603seconds**. In the same probe, Staff took0.727seconds and Navigation1.809seconds. [Actual hosted measurements](evidence/hosted-before.json). Only a verifier-owned demo session was created and signed out; no business records were changed.

## Cause and repair

The Orders read hydrated every selected order through sequential database round trips: gas lines, latest attempt, driver, last event, manifest items/serials/gas, delivery evidence, items and history. The trips and manifest summary endpoints had the same per-record pattern. Network latency accumulated across otherwise small queries. The shared client read transport and legacy admin records hook supplied no overall deadline, so an unresponsive request/body could leave the loader running indefinitely.

The fix batches child rows only for the already-authorised record IDs. Existing role/branch/customer filtering runs first; secret stripping, exact manifest structure, versions, delivery evidence and current customer GPS authority/freshness remain. Customer GPS checks still run through their existing privacy function when applicable. No business mutation, approval, schema or provider control changed.

The full order response is preserved. Orders no longer fetch Staff before records render; staff data is deferred until a detail opens. Shared web API **GET reads** have a20-second deadline covering headers and body, while mutation requests retain their existing transport and recovery behaviour. The admin records hook aborts obsolete requests, suppresses delayed identity results and exposes explicit **Try again**. No automatic mutation or read replay was added.

## Executed evidence

- [Published-source contract and query comparison](evidence/order-query-comparison.json):25owner-visible orders require12queries rather than205; the latest100 use10rather than803. Full responses match the actual published implementation extracted from commit `c7babcf`, including branch/customer scope, codes, driver destinations, gas, serials and evidence. Timings include an explicitly synthetic1ms delay per query and are not hosted benchmarks.
- [Fleet/manifest comparison](evidence/custody-query-comparison.json):21trips use6queries rather than26;13manifests use7rather than31. Owner, manager, finance and driver responses match the published implementation exactly. Production delivery-only driver restrictions remain.
- [Focused acceptance](evidence/focused.txt): backend custody/tracking/GPS/role controls, real shared API and hook recovery, source continuity and prior manifest redesign checks. Totals overlap with the earlier individual test logs and must not be added.
- [Types](evidence/typecheck.txt), [build](evidence/build.txt), actual browser observations and matrix validation are recorded with the final acceptance evidence.

The initial focused check caught the loading continuation being attached inside the older fleet-only source helper. It now follows the existing historical chain at the shared continuation point, with a strict five-file allowlist and exact committed baselines. The original fleet scope and all historical source maps remain intact; the native boundary test explicitly validates the later authorised web continuation. [Initial failed check](evidence/initial-focused.txt) is retained. The sensitive-action inventory was regenerated with all77stableguardIDs across34files preserved; only current line references and browser entry points changed.

No new mobile binary or export. The prior manifest redesign remains in the working tree and local preview. Hosted rollout, hosted after-timings, full production load testing, physical-device/screen-reader acceptance and existing production NO-GO/provider/import/retain-all gates remain separate.

[Manual](../user-manual/dispatch-fleet.md), [requirements matrix](../traceability/loading-performance-rtm.md).

## Publication continuation

Earlier explicit authorisation to push/deploy client-demo web/API changes remains in effect. The current phase now includes **LOAD-R04**, recorded as pending until exact-source publication, hosted timing and role checks complete. This also publishes the pending manifest redesign. Local measurements above do not establish hosted after performance; the final rollout evidence will record that separately.
