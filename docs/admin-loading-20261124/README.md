# Web admin loading follow-up — 24 November 2026

The user clarified that delays affect web admin pages. Native source and TestFlight 0.1.0 (4) are unchanged; no new mobile binary is part of this repair.

Fresh verifier-owned hosted reads reproduced Dashboard about 4.1 seconds, finance summary 3.1 seconds, Approvals 2.5 seconds, Orders 1.9 seconds and shared navigation 1.7 seconds. Dedicated repeated before samples measured Dashboard 4,109/4,085 ms and Navigation 1,763/1,800 ms. Only temporary QA sessions/read-only hosted data were used; business snapshots remain unchanged.

## Implemented controls

Navigation combines the existing permitted badge queries in one parameterised statement after preserving the exact role/branch/privilege rules. Access/branch metadata use a single read. Dashboard combines normal aggregate widgets under one savepoint. Its original independent per-widget savepoints remain the fallback after a real SQL failure; receipts definitions and safe-integer/nonnegative checks remain unchanged. Recent financial rows retain their original query/types and pagination.

Dashboard's direct fetch had bypassed the shared deadline. It now uses the existing shared GET transport, including the 20-second header/body deadline, cancellation, explicit Refresh recovery and fail-closed revoked access. No response cache, automatic mutation replay, authentication, schema or business-setting change was introduced.

## Executed evidence

- Actual full committed baseline `2b289be` contracts match across all seven canonical role outcomes, empty/populated date and branch scopes and recent-order pages. Owner Dashboard internal database round trips **36 → 8** (37 → 9 with explicit branch validation); Navigation **12 → 4**. These are measured query/command counts on disposable PGlite, not hosted timing claims.
- A real failing SQL statement in the combined Dashboard read rolls back to its savepoint and retains the original canonical widget response. Existing isolated-widget, financial receipt, role, privilege, branch and delegation checks pass.
- The actual Dashboard component recovers from a stalled response body, enables explicit Refresh and clears old content on access revocation.
- **54 focused tests pass**, zero failures/skips, including original historical-source assertions and shared password dialog recovery. Source continuations accept only the three reviewed existing files against their committed baselines; the new aggregate module is separately hashed. Original manifests/assertions remain.

[Query comparison](evidence/query-comparison.json), [focused output](evidence/focused.txt), [hosted before probes](evidence/before-hosted.json), [matrix](../traceability/admin-loading-20261124-rtm.md). Five actual isolated browser observations passed, including stable timeout, branch/Orders navigation and explicit recovery. Own account signed out and own server stopped. Exact-source CI/candidate/stable publication passed; see the final evidence below. Original production NO-GO and native/provider/physical/import/retain-all holds remain unchanged.

The browser also exposed repeated polling after timeout; automatic Dashboard polling now stops after a failed read until explicit Refresh or a changed filter. Successful normal polling is retained. A pre-existing read-loader test registered its first test before async component setup; under parallel compilation its cleanup could delete the bundle early. Test registration now follows setup, retaining every original assertion/ID. Local type checking was repeated sequentially after the build to avoid generated-types deletion races. Final focused/build/type outputs pass.

## Published hosted measurements

Exact application `3b5f4ff5ed5e08352980ce70fa82825988bdf03f` is Ready deployment `dpl_hKVbx7NuP3GJ29GhREzWarmzujd6` on the existing [client demo](https://easygas-client-demo.vercel.app/admin). All **453 uploaded source files** match committed/exported bytes, and the four changed server/UI files were independently downloaded and compared. No schema or environment override was applied.

| Direct stable endpoint | Before median | After median | Reduction |
| --- | --- | --- | --- |
| Dashboard | 4,097 ms | 1,476 ms | 64.0% |
| Shared navigation | 1,781.5 ms | 1,005 ms | 43.6% |

[All samples and comparison](evidence/hosted-comparison.json): two before and seven after samples per endpoint. Every sample is retained, including the 2,816 ms navigation outlier; five follow-ups were added after that variance was observed. Unequal sample counts and ranges are explicit. Candidate CLI/protection timings are retained separately and excluded from this direct comparison. These are bounded demo measurements, not production load/cold-start guarantees. Other baseline Orders/finance/Approvals timings were diagnostic; this phase does not claim equivalent speedups for their unchanged endpoint implementations.

[Candidate](evidence/candidate-hosted.txt) and [stable](evidence/stable-hosted.txt) passed six groups each: seven-role read outcomes, real branch/date/anonymous denials, retained password/assignment/reconciliation guards, complete canonical navigation/dashboard response equality and preserved business snapshots. Any trip write used an asserted missing UUID and returned 404; no actual hosted trip/order/stock/payment/qualification changed. [Own seven-session cleanup](evidence/cleanup-hosted.txt) also verifies subsequent `me` reads return 401. Existing user sessions were untouched.

Five actual positive/recovery browser observations used the isolated fixture and unique QA hostname. A fresh positive hosted browser journey is not claimed; the published source proof and authenticated API checks supply hosted acceptance. See [actual local screenshots](evidence/browser-local.json), [deployment metadata](evidence/deployment.json) and [business preservation](evidence/preservation.json). Full [GitHub run45353397877](https://github.com/Onaopemipo/easygasng/actions/runs/45353397877) succeeded for exact application3b5f4ff: **1,277 web tests and3 native dependency tests passed**, zero failures/skips, plus build/types/audits. Native export was skipped. [CI evidence](evidence/ci.json) closes AL-R04/AL-G04: **4/4 requirements and gates verified**, zero exclusions. Final documentation/evidence and session-cleanup assertion changes do not alter any deployed application bytes. TestFlight4 and all original production/device/provider/physical/import/retain-all holds remain unchanged.
