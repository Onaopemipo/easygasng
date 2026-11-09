# Technician acceptance evidence

Full baseline:324 tests /312 pass /12 skip /0 fail. Latest local regression before the last added negative test:328 /316 pass /12 skip /0 fail. Targeted changed regressions:39 pass /0 fail. Five critical technician tests pass; separate real PostgreSQL TECH-T56 concurrency test passes. Web/mobile types and web/iOS simulator builds pass. Full PostgreSQL regression is recorded separately when complete.

Simulator: existing local technician account signed into the dedicated app; Home, actual empty Jobs, Profile and dark/system appearance verified. No mockup jobs or identities were seeded. No physical camera/job-completion route was verified because the isolated demo technician has no assigned jobs. This does not prevent isolated API security testing.

| Scenario | Approved requirement | Full scenario status | Evidence / remaining work |
|---|---|---|---|
| T01 | auth valid technician | NOT_TESTED | Retained in denominator; whole-scenario acceptance not claimed. |
| T02 | wrong role rejected | NOT_TESTED | Retained in denominator; whole-scenario acceptance not claimed. |
| T03 | revoked session | NOT_TESTED | Retained in denominator; whole-scenario acceptance not claimed. |
| T04 | branch/qualification restriction | NOT_TESTED | Retained in denominator; whole-scenario acceptance not claimed. |
| T05 | real home counts | NOT_TESTED | Retained in denominator; whole-scenario acceptance not claimed. |
| T06 | availability toggle | NOT_TESTED | Retained in denominator; whole-scenario acceptance not claimed. |
| T07 | offline toggle pending | NOT_TESTED | Retained in denominator; whole-scenario acceptance not claimed. |
| T08 | assigned jobs scoped | NOT_TESTED | Retained in denominator; whole-scenario acceptance not claimed. |
| T09 | accept assignment | NOT_TESTED | Retained in denominator; whole-scenario acceptance not claimed. |
| T10 | decline reason | NOT_TESTED | Retained in denominator; whole-scenario acceptance not claimed. |
| T11 | concurrent reassignment | NOT_TESTED | Retained in denominator; whole-scenario acceptance not claimed. |
| T12 | stale assignment rejected | NOT_TESTED | Retained in denominator; whole-scenario acceptance not claimed. |
| T13 | customer details scoped | NOT_TESTED | Retained in denominator; whole-scenario acceptance not claimed. |
| T14 | map/dial actions | NOT_TESTED | Retained in denominator; whole-scenario acceptance not claimed. |
| T15 | assessment draft | NOT_TESTED | Retained in denominator; whole-scenario acceptance not claimed. |
| T16 | assessment photo | NOT_TESTED | Retained in denominator; whole-scenario acceptance not claimed. |
| T17 | unsafe finding escalation | NOT_TESTED | Retained in denominator; whole-scenario acceptance not claimed. |
| T18 | quotation draft | NOT_TESTED | Retained in denominator; whole-scenario acceptance not claimed. |
| T19 | unauthorised price rejected | NOT_TESTED | Retained in denominator; whole-scenario acceptance not claimed. |
| T20 | quote revision/version | NOT_TESTED | Retained in denominator; whole-scenario acceptance not claimed. |
| T21 | self-approval rejected | NOT_TESTED | Retained in denominator; whole-scenario acceptance not claimed. |
| T22 | customer approval required | NOT_TESTED | Retained in denominator; whole-scenario acceptance not claimed. |
| T23 | invoice linkage | NOT_TESTED | Retained in denominator; whole-scenario acceptance not claimed. |
| T24 | Paystack verified payment | NOT_TESTED | Retained in denominator; whole-scenario acceptance not claimed. |
| T25 | fake payment rejected | NOT_TESTED | Retained in denominator; whole-scenario acceptance not claimed. |
| T26 | pending payment blocks work | PASS | TECH-T26: unpaid start/report/material-use blocked; actual authorised payment path succeeds. |
| T27 | change quote for extra work | NOT_TESTED | Retained in denominator; whole-scenario acceptance not claimed. |
| T28 | valid state transitions | NOT_TESTED | Retained in denominator; whole-scenario acceptance not claimed. |
| T29 | invalid transition rejected | NOT_TESTED | Retained in denominator; whole-scenario acceptance not claimed. |
| T30 | service checklist required | NOT_TESTED | Retained in denominator; whole-scenario acceptance not claimed. |
| T31 | failed safety check blocks completion | NOT_TESTED | Retained in denominator; whole-scenario acceptance not claimed. |
| T32 | not-applicable reason | NOT_TESTED | Retained in denominator; whole-scenario acceptance not claimed. |
| T33 | material availability | NOT_TESTED | Retained in denominator; whole-scenario acceptance not claimed. |
| T34 | duplicate material use once | NOT_TESTED | Retained in denominator; whole-scenario acceptance not claimed. |
| T35 | insufficient stock rejected | NOT_TESTED | Retained in denominator; whole-scenario acceptance not claimed. |
| T36 | returns/custody | NOT_TESTED | Retained in denominator; whole-scenario acceptance not claimed. |
| T37 | proof upload validation | NOT_TESTED | Retained in denominator; whole-scenario acceptance not claimed. |
| T38 | private evidence access | NOT_TESTED | Retained in denominator; whole-scenario acceptance not claimed. |
| T39 | offline photo sync | NOT_TESTED | Retained in denominator; whole-scenario acceptance not claimed. |
| T40 | completion prerequisites | NOT_TESTED | Retained in denominator; whole-scenario acceptance not claimed. |
| T41 | duplicate completion idempotent | NOT_TESTED | Retained in denominator; whole-scenario acceptance not claimed. |
| T42 | completed report customer/admin visibility | NOT_TESTED | Retained in denominator; whole-scenario acceptance not claimed. |
| T43 | history isolation | NOT_TESTED | Retained in denominator; whole-scenario acceptance not claimed. |
| T44 | notification deduplication | NOT_TESTED | Retained in denominator; whole-scenario acceptance not claimed. |
| T45 | profile permissions | NOT_TESTED | Retained in denominator; whole-scenario acceptance not claimed. |
| T46 | offline conflict recovery | NOT_TESTED | Retained in denominator; whole-scenario acceptance not claimed. |
| T47 | logout cache wipe | NOT_TESTED | Retained in denominator; whole-scenario acceptance not claimed. |
| T48 | accessibility | NOT_TESTED | Retained in denominator; whole-scenario acceptance not claimed. |
| T49 | responsive/device lifecycle | NOT_TESTED | Retained in denominator; whole-scenario acceptance not claimed. |
| T50 | full booking→assessment→quote→invoice→payment→service→proof→report end-to-end | NOT_TESTED | Retained in denominator; whole-scenario acceptance not claimed. |
| T51 | existing customer booking regression | NOT_TESTED | Retained in denominator; whole-scenario acceptance not claimed. |
| T52 | admin approvals regression | NOT_TESTED | Retained in denominator; whole-scenario acceptance not claimed. |
| T53 | inventory/cylinder P0 regression | NOT_TESTED | Retained in denominator; whole-scenario acceptance not claimed. |
| T54 | finance/Paystack regression | NOT_TESTED | Retained in denominator; whole-scenario acceptance not claimed. |
| T55 | no demo data | NOT_TESTED | Retained in denominator; whole-scenario acceptance not claimed. |
| T56 | production-like multi-connection PostgreSQL concurrency | PASS | TECH-T56: independent local PostgreSQL connections; denied unpaid starts, one paid work event from duplicate keys. |

Final evidence supersedes the preliminary counts: `docs/technician/evidence/final-regression-tests.txt` records332/332 PASS, zero skip/fail with isolated PostgreSQL enabled. The current native build was installed and restored the existing local technician session. Photos/current visit and assignment-response guards were additionally verified by TECH-T40 and TECH-T09. Whole-scenario visual/offline/device states above remain unchanged unless explicitly supported.
