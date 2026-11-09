# Service booking recovery readiness

**Production NO-GO.** Core local safeguards are implemented, but recovery acceptance is not complete. There is no claim of exactly-once network delivery, universal all-client effects, provider settlement or notification delivery.

| Gate | Status | Evidence / outstanding work |
|---|---|---|
| REC-01 | BLOCKED | Multi-connection PostgreSQL and true crash/disconnect verification remain unavailable. |
| REC-01-EO | BLOCKED | Generic keyed web operations pass local tests; legacy unkeyed callers and true PostgreSQL crash/restart remain outside the proven guarantee. |
| REC-02 | BLOCKED | Independent PostgreSQL final-capacity competition and scheduling crash tests remain unexecuted. |
| REC-03 | PASS | Implemented and verified in local integration/browser evidence; no production clearance inferred. |
| REC-04 | PASS | Implemented and verified in local integration/browser evidence; no production clearance inferred. |
| REC-05 | PASS | Implemented and verified in local integration/browser evidence; no production clearance inferred. |
| REC-06 | BLOCKED | No external sender is configured; provider acknowledgement and worker lease recovery cannot be certified. |
| REC-07 | PASS | Implemented and verified in local integration/browser evidence; no production clearance inferred. |
| REC-08 | BLOCKED | Unborn Git main has no known-good prior committed release/build for a genuine release rollback. |
| REC-09 | BLOCKED | Local encrypted restore passed; scheduled/off-site supervised backup and production restoration remain unprovisioned. |
| REC-10 | NOT_TESTED | Runbooks and injected rollback exist; an actual application/database outage drill remains unperformed. |
| REC-11 | NOT_TESTED | Controlled manual fallback is documented; a full manual request reconciliation drill remains unperformed. |
| REC-12 | NOT_TESTED | Application negative permission tests pass; operator-level restore/deployment access review still needs an operational drill. |
| REC-13 | BLOCKED | Critical environment-dependent recovery evidence remains missing. |

Local evidence: persisted keyed result replay, canonical payload/actor conflicts, transaction rollback after outbox writes, failed/concurrent versioned rescheduling, material reservation rollback and one issue, interrupted report publication, failed safety outcome rejection, wallet/refund rollback, consent and quiet-hour scheduling, immutable restricted-role result storage, failed additive DDL rollback and encrypted isolated backup restoration.

Environment blockers: no running disposable local PostgreSQL/Docker server; no prior Git release; no external delivery/provider or supervised production backup infrastructure. Local restore verifies counts and relationships in a fresh PGlite instance; it is not a production restore certificate. No business RPO/RTO has been approved. Manual fallback and operator runbooks are delivered; full operational drills remain outstanding.
