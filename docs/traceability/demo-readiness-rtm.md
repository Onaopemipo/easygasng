# Hosted client demo readiness

The old deployment returned HTTP 503 because the database had all required
migrations through 076 but its maintenance heartbeat was stale. The synthetic
demo intentionally runs with background jobs disabled.

| Requirement | Acceptance gate | Executed evidence | Status |
| --- | --- | --- | --- |
| DEMO-STATUS-R01 | DEMO-STATUS-G01 | PR-02, PR-DEMO-STATUS and HTTP 200 with demo scope on the candidate and public alias | VERIFIED_COMPLETE |
| DEMO-STATUS-R02 | DEMO-STATUS-G02 | PR-01, PR-02 and PR-DEMO-STATUS cover the commercial worker and release guards | VERIFIED_COMPLETE |

Implementation 2/2. Verified 2/2. Critical requirements 2/2. Route coverage
1/1. Scoped acceptance gates 2/2.

The current demo deployment is `dpl_HVW4uqRU3tpNAmvp53B1fziobd4C`. The prior
deployment `dpl_62q4HyhJVVKC5z2Fb8K9rbdmQ7gT` is the alias rollback target.

No owner input is required for the demo repair. Commercial hosting still
requires the staging hostname, approved access and the production worker probe.
Production remains NO-GO. All six [launch gates](launch-readiness-20261111-rtm.md)
remain pending.

[Machine-readable matrix](demo-readiness-rtm.json) ·
[Hosted probe](../../outputs/easygas-qa/evidence/demo-readiness-hosted.txt) ·
[Targeted tests](../../outputs/easygas-qa/evidence/demo-readiness-tests.txt)
