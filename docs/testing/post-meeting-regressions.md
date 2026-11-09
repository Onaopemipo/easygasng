> Current continuation status: migrations050/051 and partial operations functionality are described in [the current report](../reports/post-meeting-implementation-report.md) and [operations runbook](../operations/operations-completion-runbook.md). Earlier entries below are retained history. Production NO-GO and Excel import hold are unchanged. Public visual guard checks passed after unlock; authenticated/device acceptance is still outstanding.

# Post-meeting test register

Environment: isolated in-memory PGlite plus disposable loopback PostgreSQL on55439, never production. Synthetic fixture data only in disposable tests. All T01–T50 remain in the denominator. Existing regression evidence is not automatically full acceptance of the expanded client scenario. PASS on T11 covers numbering/immutability, not the unimplemented invoice correction lifecycle. T44 covers current/new tested endpoints, not unimplemented endpoints. T47 covers current duplicate identity/invoice/proof and assignment, not unimplemented amendment concurrency.

Commands: `npm test` (baseline); `EASYGAS_ENABLE_LOCAL_PG_TESTS=yes EASYGAS_TEST_POSTGRES_URL=<disposable-local-url> npm test`; same environment with `node --import tsx --test --test-concurrency=1 tests/deployment.test.ts tests/post-meeting-*.test.ts tests/production-release.test.ts`; `npm run typecheck`; `npm run typecheck --prefix apps/mobile`; `npm run build`. No lint script exists in this repository; no lint pass is claimed.

Expected: identity/finance effects commit once with ownership/isolation and immutable history; compile/build succeed; missing client capabilities remain NOT_TESTED/BLOCKED. Actual logs are in `docs/audits/post-meeting-evidence/`. Final focused evidence includes PM-T08 legacy retry, PM-T10 branch quote review and PM-T18 restricted-role plus early048 upgrade checks. Earlier failed runs were corrected by refreshing generated bootstrap and forced RLS; failing attempt logs are retained, not acceptance evidence.

| Test | Scenario | Result | Actual / evidence / outstanding |
|---|---|---|---|
| T01 | customer ID uniqueness/lookup | PASS | PM-T01 |
| T02 | duplicate customer handling | PASS | PM-T01 |
| T03 | provisional-to-verified continuity | NOT_TESTED | Expanded scenario not accepted end to end. Existing subset regression may pass; see requirements/gaps. |
| T04 | invitation expiry/replay | NOT_TESTED | Expanded scenario not accepted end to end. Existing subset regression may pass; see requirements/gaps. |
| T05 | OTP ownership | NOT_TESTED | Expanded scenario not accepted end to end. Existing subset regression may pass; see requirements/gaps. |
| T06 | optional profile fields | NOT_TESTED | Expanded scenario not accepted end to end. Existing subset regression may pass; see requirements/gaps. |
| T07 | returning customer setup skip | NOT_TESTED | Expanded scenario not accepted end to end. Existing subset regression may pass; see requirements/gaps. |
| T08 | cart/session continuity | NOT_TESTED | Expanded scenario not accepted end to end. Existing subset regression may pass; see requirements/gaps. |
| T09 | assisted order audit | PASS | PM-T09 |
| T10 | dynamic pricing/one fee | NOT_TESTED | Expanded scenario not accepted end to end. Existing subset regression may pass; see requirements/gaps. |
| T11 | invoice immutability/number | PASS | PM-T11 |
| T12 | payment link version/amount/expiry | NOT_TESTED | Expanded scenario not accepted end to end. Existing subset regression may pass; see requirements/gaps. |
| T13 | signed webhook dedup | BLOCKED | Live provider/permissions not configured; missing internal contract also remains |
| T14 | no screenshot as payment | NOT_TESTED | Expanded scenario not accepted end to end. Existing subset regression may pass; see requirements/gaps. |
| T15 | unconnected provider safe state | PASS | PM-T11 |
| T16 | at-door amendment/one fee | NOT_TESTED | Expanded scenario not accepted end to end. Existing subset regression may pass; see requirements/gaps. |
| T17 | delta invoice consent | NOT_TESTED | Expanded scenario not accepted end to end. Existing subset regression may pass; see requirements/gaps. |
| T18 | van stock failure | NOT_TESTED | Expanded scenario not accepted end to end. Existing subset regression may pass; see requirements/gaps. |
| T19 | concurrent amendment | NOT_TESTED | Expanded scenario not accepted end to end. Existing subset regression may pass; see requirements/gaps. |
| T20 | dispatch area eligibility | NOT_TESTED | Expanded scenario not accepted end to end. Existing subset regression may pass; see requirements/gaps. |
| T21 | override/capacity revalidation | NOT_TESTED | Expanded scenario not accepted end to end. Existing subset regression may pass; see requirements/gaps. |
| T22 | driver acknowledgement | NOT_TESTED | Expanded scenario not accepted end to end. Existing subset regression may pass; see requirements/gaps. |
| T23 | illegal transitions | NOT_TESTED | Expanded scenario not accepted end to end. Existing subset regression may pass; see requirements/gaps. |
| T24 | realtime isolation | NOT_TESTED | Expanded scenario not accepted end to end. Existing subset regression may pass; see requirements/gaps. |
| T25 | photo upload security | NOT_TESTED | Expanded scenario not accepted end to end. Existing subset regression may pass; see requirements/gaps. |
| T26 | historic photos/latest pointer | NOT_TESTED | Expanded scenario not accepted end to end. Existing subset regression may pass; see requirements/gaps. |
| T27 | OTP and custody | NOT_TESTED | Expanded scenario not accepted end to end. Existing subset regression may pass; see requirements/gaps. |
| T28 | offline replay | NOT_TESTED | Expanded scenario not accepted end to end. Existing subset regression may pass; see requirements/gaps. |
| T29 | no fake GPS | NOT_TESTED | Expanded scenario not accepted end to end. Existing subset regression may pass; see requirements/gaps. |
| T30 | background tracking stop | BLOCKED | Live provider/permissions not configured; missing internal contract also remains |
| T31 | distance/GPS gaps | NOT_TESTED | Expanded scenario not accepted end to end. Existing subset regression may pass; see requirements/gaps. |
| T32 | fuel calculations | NOT_TESTED | Expanded scenario not accepted end to end. Existing subset regression may pass; see requirements/gaps. |
| T33 | multiple cylinder profiles | NOT_TESTED | Expanded scenario not accepted end to end. Existing subset regression may pass; see requirements/gaps. |
| T34 | preliminary forecast | PASS | PM-T34 |
| T35 | external refill feedback | NOT_TESTED | Expanded scenario not accepted end to end. Existing subset regression may pass; see requirements/gaps. |
| T36 | reminder opt-out | NOT_TESTED | Expanded scenario not accepted end to end. Existing subset regression may pass; see requirements/gaps. |
| T37 | dormant segmentation | NOT_TESTED | Expanded scenario not accepted end to end. Existing subset regression may pass; see requirements/gaps. |
| T38 | marketing consent | NOT_TESTED | Expanded scenario not accepted end to end. Existing subset regression may pass; see requirements/gaps. |
| T39 | technician quote approval | NOT_TESTED | Expanded scenario not accepted end to end. Existing subset regression may pass; see requirements/gaps. |
| T40 | invoice/payment/work gate | NOT_TESTED | Expanded scenario not accepted end to end. Existing subset regression may pass; see requirements/gaps. |
| T41 | service safety/materials | NOT_TESTED | Expanded scenario not accepted end to end. Existing subset regression may pass; see requirements/gaps. |
| T42 | SMS/WhatsApp failure | BLOCKED | Live provider/permissions not configured; missing internal contract also remains |
| T43 | outbox dedup | NOT_TESTED | Expanded scenario not accepted end to end. Existing subset regression may pass; see requirements/gaps. |
| T44 | privilege escalation | PASS | PM-T01/09/18 |
| T45 | P0 R01–R05 fail-safe and valid success | NOT_TESTED | Expanded scenario not accepted end to end. Existing subset regression may pass; see requirements/gaps. |
| T46 | crash recovery | NOT_TESTED | Expanded scenario not accepted end to end. Existing subset regression may pass; see requirements/gaps. |
| T47 | multi-connection concurrency | PASS | PM-T47 + TRK-17 |
| T48 | responsive/accessibility | NOT_TESTED | Expanded scenario not accepted end to end. Existing subset regression may pass; see requirements/gaps. |
| T49 | typecheck/build/regression | PASS | Web/mobile typecheck, web build, PostgreSQL-enabled regression (see logs) |
| T50 | backup/rollback rehearsal | NOT_TESTED | Expanded scenario not accepted end to end. Existing subset regression may pass; see requirements/gaps. |

T50 remains NOT_TESTED for complete compatible application rollback; isolated encrypted backup PR-03 passed. Browser customer public ID display passed; full admin positive and device/a11y acceptance remain NOT_TESTED.

Final executed totals: full PostgreSQL-enabled regression294 pass/0 fail/0 skip; later targeted22 pass/0 fail/0 skip; traceability2 pass/0 fail; web/mobile typechecks and build exit0. These totals are tests, not proof that all50 expanded scenarios or all17 requirement rows are complete.
