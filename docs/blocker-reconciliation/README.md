# Production blocker reconciliation — 21 November 2026

**In progress; production NO-GO remains.** [Phase matrix](../traceability/blocker-reconciliation-20261121-rtm.md). This phase investigates all nine retained high-severity operation failures and corrects stale readiness statements; it does not authorise commercial traffic, live transactions, new native binaries, safety renewals, historical import or destructive privacy actions.

## Investigation

The nine records comprise three driver sign-in failures, two driver-session restriction failures, one technician sign-in failure, one partial-refund failure and two public catalogue/testimonial failures. All are historical application failures in the isolated demo, not physical safety findings. Returned Vercel logs identify relevant failing actions/deployments; they contain no SQL stack/code. The documented 16 November field repair fixes the restricted session UPDATE sequence without wider grants; fresh dedicated sign-in, repeat restriction, scoped reads and cross-workspace/finance denials pass. The documented 19 November atomic refund INSERT repair is retained; restricted-runtime regression and original hosted successful refund evidence pass. No new refund is submitted by this phase. Original Nov9/10 logs are not returned; absence of logs does not prove those operations succeeded.

Six incidents have documented repaired failure-family evidence; three recovered paths lack returned original diagnostics and will remain acknowledged. [Reviewed individual dispositions](INCIDENT-REVIEW.md). Final actual disposition and hosted rollout evidence will be appended after normal owner-API readback. Original incidents and financial/operational history are retained.

## Corrections implemented

Readiness now shows the immutable, explicitly historical client-demo CI baseline (1,137 passing tests, build/type/audits, no mobile export) separately from commercial acceptance. It no longer claims migrations stop at056, reports intentional demo-worker disablement accurately, removes stale advisory assertions and respects the explicit retain-all policy. It remains NO-GO; evidence intake cannot flip a gate or release production. The verified baseline is not silently attributed to later source changes.

Incident details now expose scoped, paginated response history, source target and responsible role. New failure diagnostics correlate the durable incident ID with safe SQLSTATE, without logging SQL, body or credentials. Repeated same-hour failures reuse the retained diagnostic ID; a recurrence after resolution reopens the incident and appends immutable system audit evidence. No grant/schema expansion is needed. Historical release tests verify the historical committed CI source rather than freezing the working tree against all future approved changes.

Focused checks:14/14 pass, zero failures/skips. Build passes. A typecheck launched while Next regenerated its build types encountered disappearing generated files; it is rerun sequentially after the successful build. This was a validation scheduling conflict, not an application type defect. Sequential typecheck passed. Final executed results supersede that initial attempt; original output retained privately.

## Remaining owner inputs

1. Confirm the commercial launch scope: web/native channels, COD/credit/online payments, services, delivery areas and excluded capabilities.
2. Confirm the production host/domain and supply authorised platform access through the existing secure mechanism. Accept recovery objectives, backup retention and incident/on-call ownership. The demo remains synthetic.
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

The first full CI run on b2d327f registered1,147 tests:1,144 passed,3 failed,0 skipped. All three failures were retained historical source-hash guards (DRVS-PRESERVED, EXP-SOURCE-FIDELITY, NATIVE-RTM-SOURCE), not failed role/financial behaviour. An explicit eight-file web continuation now checks every incoming hash against committed ce3d915 bytes before accepting this authorised phase. Original native/prototype/build/source manifests remain unchanged. No assertion or baseline is discarded, and no test is skipped. Thirty targeted continuation/source/role regressions pass; final full CI remains pending.

Visual review of the first phone history screenshot found the persistent demo notice overlapping the dialog bottom. Scoped incident-dialog CSS now reserves notice clearance at desktop/phone/small-phone sizes. Initial screenshot and partial observation are retained; final published geometry/screenshot verification will close this follow-up.
