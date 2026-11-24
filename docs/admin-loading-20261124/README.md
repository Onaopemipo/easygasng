# Web admin loading follow-up — 24 November 2026

The user clarified that delays affect web admin pages. Native source and TestFlight 0.1.0 (4) are unchanged; no new mobile binary is part of this repair.

Fresh verifier-owned hosted reads reproduced Dashboard about 4.1 seconds, finance summary 3.1 seconds, Approvals 2.5 seconds, Orders 1.9 seconds and shared navigation 1.7 seconds. Dedicated repeated before samples measured Dashboard 4,109/4,085 ms and Navigation 1,763/1,800 ms. Only temporary QA sessions/read-only hosted data were used; business snapshots remain unchanged.

## Implemented controls

Navigation combines the existing permitted badge queries in one parameterised statement after preserving the exact role/branch/privilege rules. Access/branch metadata use a single read. Dashboard combines normal aggregate widgets under one savepoint. Its original independent per-widget savepoints remain the fallback after a real SQL failure; receipts definitions and safe-integer/nonnegative checks remain unchanged. Recent financial rows retain their original query/types and pagination.

Dashboard's direct fetch had bypassed the shared deadline. It now uses the existing shared GET transport, including the 20-second header/body deadline, cancellation, explicit Refresh recovery and fail-closed revoked access. No response cache, automatic mutation replay, authentication, schema or business-setting change was introduced.

## Executed evidence so far

- Actual full committed baseline `2b289be` contracts match across all seven canonical role outcomes, empty/populated date and branch scopes and recent-order pages. Owner Dashboard internal database round trips **36 → 8** (37 → 9 with explicit branch validation); Navigation **12 → 4**. These are measured query/command counts on disposable PGlite, not hosted timing claims.
- A real failing SQL statement in the combined Dashboard read rolls back to its savepoint and retains the original canonical widget response. Existing isolated-widget, financial receipt, role, privilege, branch and delegation checks pass.
- The actual Dashboard component recovers from a stalled response body, enables explicit Refresh and clears old content on access revocation.
- **54 focused tests pass**, zero failures/skips, including original historical-source assertions and shared password dialog recovery. Source continuations accept only the three reviewed existing files against their committed baselines; the new aggregate module is separately hashed. Original manifests/assertions remain.

[Query comparison](evidence/query-comparison.json), [focused output](evidence/focused.txt), [hosted before probes](evidence/before-hosted.json), [matrix](../traceability/admin-loading-20261124-rtm.md). Five actual isolated browser observations passed, including stable timeout, branch/Orders navigation and explicit recovery. Own account signed out and own server stopped. Exact-source CI/candidate/stable publication remains pending. Original production NO-GO and native/provider/physical/import/retain-all holds remain unchanged.

The browser also exposed repeated polling after timeout; automatic Dashboard polling now stops after a failed read until explicit Refresh or a changed filter. Successful normal polling is retained. A pre-existing read-loader test registered its first test before async component setup; under parallel compilation its cleanup could delete the bundle early. Test registration now follows setup, retaining every original assertion/ID. Local type checking was repeated sequentially after the build to avoid generated-types deletion races. Final focused/build/type outputs pass.
