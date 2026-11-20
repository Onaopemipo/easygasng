# Production blocker reconciliation — 21 November 2026

**Reconciliation, fixes, hosted verification and final CI complete. Production NO-GO remains.** [Phase matrix](../traceability/blocker-reconciliation-20261121-rtm.md). This phase investigates all nine retained high-severity operation failures and corrects stale readiness statements; it does not authorise commercial traffic, live transactions, new native binaries, safety renewals, historical import or destructive privacy actions.

## Investigation

The nine records comprise three driver sign-in failures, two driver-session restriction failures, one technician sign-in failure, one partial-refund failure and two public catalogue/testimonial failures. All are historical application failures in the isolated demo, not physical safety findings. Returned Vercel logs identify relevant failing actions/deployments; they contain no SQL stack/code. The documented 16 November field repair fixes the restricted session UPDATE sequence without wider grants; fresh dedicated sign-in, repeat restriction, scoped reads and cross-workspace/finance denials pass. The documented 19 November atomic refund INSERT repair is retained; restricted-runtime regression and original hosted successful refund evidence pass. No new refund is submitted by this phase. Original 9–10 November logs are not returned; absence of logs does not prove those operations succeeded.

Six incidents have documented repaired failure-family evidence; three recovered paths lack returned original diagnostics and will remain acknowledged. [Reviewed individual dispositions](INCIDENT-REVIEW.md). All nine dispositions were applied through normal owner APIs and read back; one prior resolved placeholder response received a substantive evidence supplement. Original incidents and financial/operational history are retained.

## Corrections implemented

Readiness now shows the immutable, explicitly historical client-demo CI baseline (1,137 passing tests, build/type/audits, no mobile export) separately from commercial acceptance. It no longer claims migrations stop at 056, reports intentional demo-worker disablement accurately, removes stale advisory assertions and respects the explicit retain-all policy. It remains NO-GO; evidence intake cannot flip a gate or release production. The verified baseline is not silently attributed to later source changes.

Incident details now expose scoped, paginated response history, source target and responsible role. New failure diagnostics correlate the durable incident ID with safe SQLSTATE, without logging SQL, body or credentials. Repeated same-hour failures reuse the retained diagnostic ID; a recurrence after resolution reopens the incident and appends immutable system audit evidence. No grant/schema expansion is needed. Historical release tests verify the historical committed CI source rather than freezing the working tree against all future approved changes.

Focused checks: 14/14 pass, zero failures/skips. Build passes. A typecheck launched while Next regenerated its build types encountered disappearing generated files; it is rerun sequentially after the successful build. This was a validation scheduling conflict, not an application type defect. Sequential typecheck passed. Final executed results supersede that initial attempt; original output retained privately.

## Remaining owner inputs

1. Confirm the commercial launch scope: web/native channels, COD/credit/online payments, services, delivery areas and excluded capabilities.
2. Provide readiness/access for the previously selected Namecheap VPS and the production/staging hostname through the existing secure mechanism (or explicitly change that hosting choice). Accept recovery objectives, backup retention and incident/on-call ownership. The demo remains synthetic.
3. Identify actual staff/branches and restricted-action maker/reviewer/executor duties. One owner is supported; fake second owners/shared credentials are not a solution.
4. Supply reviewed commercial customer/privacy/refund/delivery terms and a retention/privacy process consistent with the existing hold.
5. Supply real counted stock/cylinder eligibility, rates/capacity, current qualified staff and genuine meter/equipment certificates for a controlled operating pilot; finance reconciles actual cash/liabilities/refunds.
6. For advertised providers, supply approved merchant/sender/channel accounts and consented acceptance scope. Recovery email delivery is needed; live payment/provider activation remains off-limits until explicitly accepted.
7. When ready, authorise signed mobile test builds and provide Apple/Android distribution identities and physical devices. The no-new-binaries instruction remains in force.
8. If launch needs historical balances, supply the latest authoritative workbook and resolve identity/stock/payment/fee ambiguities before approving an exact import. No import is authorised here.

Engineering can prepare and execute staging, worker/alert/recovery/security/concurrency/device test work once the relevant inputs are available. All original production blocker IDs, eleven E2E rows, 36 native families/300 leaves, 14 external blocks and existing matrices remain in their denominators.

The first candidate preservation check correctly stopped at changed staff-directory hashes: the whole-directory hash included last_login, which advances during authorised QA sign-in. The harness now checks exactly id/role/branch/active against the independently recorded PUB21 authority hash and reasserts every other original before snapshot. Earlier before/failure evidence is retained in the snapshot-correction record; no business baseline was reset or financial discrepancy ignored.

[Consolidated production blocker register](PRODUCTION-BLOCKERS.md) maps remaining work to the original AUD/PR/E2E/LAUNCH/NATIVE IDs and identifies owner inputs.

The complete incident register also contains one pre-existing open medium-severity synthetic delivery failure. It is retained unchanged outside the nine high/critical failure records; resolving six high records leaves four active incidents overall (three acknowledged high plus that open medium), not three total incidents.

## Final continuation registered

The first full CI run on b2d327f registered 1,147 tests: 1,144 passed, 3 failed, 0 skipped. All three failures were retained historical source-hash guards (DRVS-PRESERVED, EXP-SOURCE-FIDELITY, NATIVE-RTM-SOURCE), not failed role/financial behaviour. An explicit eight-file web continuation now checks every incoming hash against committed ce3d915 bytes before accepting this authorised phase. Original native/prototype/build/source manifests remain unchanged. No assertion or baseline is discarded, and no test is skipped. Thirty targeted continuation/source/role regressions pass; corrected full CI passed 1,148/1,148 tests, zero failures/skips.

Visual review of the first phone history screenshot found the persistent demo notice overlapping the dialog bottom. Scoped incident-dialog CSS now reserves notice clearance at desktop/phone/small-phone sizes. Initial screenshot and partial observation are retained. Final published geometry and screenshots pass: 390px dialog bottom 728 vs notice top 774 (46px clear), 320px bottom 608 vs notice top 670 (62px clear), no horizontal overflow.

## Current deployed outcome

Final source `1c296819d9351faf153bfbf5423713312d7b3a49` / Ready `dpl_EPFsgJFKDE2457trgZd7SoVvAUEg` is promoted to [the client demo](https://easygas-client-demo.vercel.app). All 436 uploaded files match committed bytes. Fifteen candidate, 15 stable and 17 final checks pass across seven existing roles, with business fingerprints unchanged and every own temporary session revoked. The only hosted business-register writes were ten reviewed incident responses; financial, stock, policy and qualification records were not changed.

All 12 original incident records remain: 8 resolved (including 2 already resolved before this phase), 3 acknowledged high failures with original causes unconfirmed, and 1 separate pre-existing open medium delivery failure. Production readiness now reports 3 unresolved high/critical incidents and stays NO-GO. New history exposes both original responses and the audit supplement. Six actual desktop/phone observations pass; the default viewport was restored and browser signed out.

[Corrected full CI](https://github.com/Onaopemipo/easygasng/actions/runs/44829055405) passed on the exact deployed revision: **1,148/1,148 tests, zero failures/skips**, web build, web typecheck and production dependency audit. Native type/dependency/audit checks passed and export is skipped. Three retained native artifacts retain their exact hashes and modification times. Earlier failed CI and phone overlap evidence remain, alongside the corrective evidence; no test/assertion or historical manifest was discarded.

Rollback is the previous Ready `dpl_G4JtL6cZKbuRnnRMdX91PQNa6ct6` (first correction), with the original pre-phase `dpl_AXjGjA3VPmKi8aqRpGBwZohyvw4a` retained as an older fallback. Rollback is application alias promotion only; retain all database/audit/incident/financial records and project configuration. Commercial hosting, signed builds, provider activation, physical safety certification, import and destructive retention changes remain unauthorised/unaccepted.

## Final acceptance and evidence

All six bounded reconciliation requirements/gates are verified, with three critical controls retained and tested. This is not six commercial production gates closed: the original AUD/PR/E2E/LAUNCH/NATIVE and WEB-A commercial limits remain. Nine original high incidents stay in the denominator: 6 resolved, 3 acknowledged unknown cause. The separate medium incident remains open; the prior placeholder response is retained beside its evidence supplement.

[CI summary](evidence/ci-test-summary.json), [jobs/steps](evidence/ci-final-jobs.json), [test log](evidence/ci-tests.txt), [build](evidence/ci-build.txt), [types](evidence/ci-types.txt), [audit](evidence/ci-dependency-audit.txt), [immutable artifact digest](evidence/ci-artifact.json). The downloaded artifact SHA256 matches GitHub's immutable digest. Fourteen focused checks and 30 continuation checks overlap the full suite; they are not additional feature coverage. Three distinct local closure checks pass separately (two data/UI, one source/CI artifact check). All six [documentation/matrix checks](evidence/documentation-final.txt) pass.

All 436 deployed files remain exact committed bytes; final follow-up changes only excluded operator/test/evidence/document paths. No new cloud application build is needed for those final records. All changes and evidence are committed/pushed on the existing branch; original 49-commit publication and earlier historical proofs are preserved. No mobile build/export/install/distribution, production cutover, provider activation, renewal, financial/stock/policy mutation, import or destructive retention action occurred.
