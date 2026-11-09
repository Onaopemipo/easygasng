# Test evidence — 6 November2026

Status: deterministic integration tests PASS; official merchant sandbox E2E BLOCKED. User needs account setup instructions; no credentials received, configured or used. No network charge/Paystack merchant transaction is claimed.

| Execution | Result | Evidence |
|---|---|---|
| Pre-edit full suite |350 total,337 pass,13 explicit PostgreSQL skips,0 fail|evidence/baseline-tests.txt|
| Pre-edit web/mobile typecheck and build |PASS|evidence/baseline-typecheck.txt; baseline-mobile-typecheck.txt; baseline-build.txt|
| Final full suite |363 total,349 pass,14 PostgreSQL skips,0 fail|evidence/regression-final.txt|
| Disposable PostgreSQL regressions, separately enabled |14 pass,0 skip,0 fail (the14 skipped cases above)|evidence/postgres-regression.txt|
| Focused Paystack fee/provider/orchestration |10 pass,0 fail|evidence/core-tests.txt|
| Policy and native link negative tests |2 pass,0 fail|evidence/policy-tests.txt|
| Independent PostgreSQL Paystack concurrency/rollback |1 pass,0 fail; also included in PostgreSQL regression14|evidence/postgres-tests.txt|
| All phase RTM validator |2 pass,0 fail|evidence/traceability-tests.txt|
| Web/native TypeScript and Next production build |PASS|evidence/latest-typecheck.txt; mobile-typecheck.txt; latest-build.txt|
| Lint |Not run: no repository lint command exists|package.json|
| Official Paystack sandbox, signed-device UI, staging rollout/restore |BLOCKED/UNEXECUTED; not inferred from mocks/build|all82 scenarios/26 gates retained|

Do not sum overlapping test executions as distinct scenarios. Latest bounded ledger/report/fee/UI additions were additionally typechecked/built; mocks are isolated memory databases or disposable localhost PostgreSQL schemas. No original business database or customers used as fixtures.

PAY-FEE checks zero/threshold±1/cap/above-cap/large amounts/three rounding policies against exhaustive smallest-gross search. PAY-POST credits principal once and verifies fee/report/receipt separation; PAY-ZERO-EFFECT uses a fresh initialized fixture for each wrong amount/currency/environment/attempt/email and checks zero posting/wallet effects. PAY-RECOVERY lost initialize response does not make a second charge. PAY-RESUME persists abandonment; PAY-EXPIRY rejects expired prepared quotes before HTTP. PAY-INVOICE uses the existing issuer/invoice/balance and exact principal ledger, unchanged snapshot, no wallet side effect. PAY-SIGNATURE tests raw bytes/freshness/rotation/no downgrade. PAY-POLICY rejects unapproved pass-through, automatic fee double-charge settings, live mode and secret fields; PAY-LINK rejects amount/success/duplicate-ID links.

PAY-PG-CONCURRENCY uses distinct pool connections, concurrent quote/init/reconcile, exactly one provider initialization/ledger effect, and injected throw after wallet insertion but before immutable posting commit. Rollback leaves zero wallet/posting records; retry yields one committed wallet credit/posting/audit. This is transaction failure injection, NOT an actual OS process-kill drill or staging financial recovery test.

First post-change regression detected an invalid acceptanceGate reference in the new RTM; corrected and validator rerun. Preserve earlier evidence/regression-tests.txt as failed historical evidence; final logs are separate. First PostgreSQL test assertion used audit_log rather than actual audit_events; corrected test and rerun. No production feature declared complete from these repairs.
