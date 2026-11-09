# Service Booking Recovery Tests

Commands: `npm test`; `node --import tsx --test tests/service-booking-recovery.test.ts`; `node --import tsx --test tests/service-booking-postgres.test.ts`. Use isolated synthetic data only. No messages or live payments sent. PGlite is real embedded PostgreSQL but serializes transactions; it does not prove independent connection concurrency.

| ID | Actual result | Evidence / remaining work |
|---|---|---|
| RC-01 | VERIFIED_COMPLETE | PASS: EO-03 |
| RC-02 | VERIFIED_COMPLETE | PASS: EO-04 |
| RC-03 | BLOCKED | PARTIAL / NOT TESTED: Independent PostgreSQL final-capacity competition and scheduling crash tests remain unexecuted. |
| RC-04 | VERIFIED_COMPLETE | PASS: RC-04 |
| RC-05 | BLOCKED | PARTIAL / NOT TESTED: Independent PostgreSQL final-capacity competition and scheduling crash tests remain unexecuted. |
| RC-06 | BLOCKED | PARTIAL / NOT TESTED: No external sender is configured; provider acknowledgement and worker lease recovery cannot be certified. |
| RC-07 | VERIFIED_COMPLETE | PASS: EO-10 |
| RC-08 | VERIFIED_COMPLETE | PASS: EO-09 |
| RC-09 | VERIFIED_COMPLETE | PASS: EO-09 |
| RC-10 | VERIFIED_COMPLETE | PASS: RC-10 |
| RC-11 | BLOCKED | PARTIAL / NOT TESTED: No external sender is configured; provider acknowledgement and worker lease recovery cannot be certified. |
| RC-12 | IMPLEMENTED_UNVERIFIED | PARTIAL / NOT TESTED: Runbooks and injected rollback exist; an actual application/database outage drill remains unperformed. |
| RC-13 | VERIFIED_COMPLETE | PASS: RC-13 |
| RC-14 | BLOCKED | PARTIAL / NOT TESTED: Unborn Git main has no known-good prior committed release/build for a genuine release rollback. |
| RC-15 | VERIFIED_COMPLETE | PASS: RC-15 |
| RC-16 | IMPLEMENTED_UNVERIFIED | PARTIAL / NOT TESTED: Controlled manual fallback is documented; a full manual request reconciliation drill remains unperformed. |
| RC-17 | VERIFIED_COMPLETE | PASS: RC-10 |
| RC-18 | VERIFIED_COMPLETE | PASS: RC-10 |
| REC01-T01 | VERIFIED_COMPLETE | PASS: EO-01 |
| REC01-T02 | VERIFIED_COMPLETE | PASS: EO-03 |
| REC01-T03 | VERIFIED_COMPLETE | PASS: EO-04 |
| REC01-T04 | VERIFIED_COMPLETE | PASS: EO-01 |
| REC01-T05 | VERIFIED_COMPLETE | PASS: EO-01 |
| REC01-T06 | BLOCKED | PARTIAL / NOT TESTED: Multi-connection PostgreSQL and true crash/disconnect verification remain unavailable. |
| REC01-T07 | BLOCKED | PARTIAL / NOT TESTED: Multi-connection PostgreSQL and true crash/disconnect verification remain unavailable. |
| REC01-T08 | VERIFIED_COMPLETE | PASS: EO-09 |
| REC01-T09 | VERIFIED_COMPLETE | PASS: EO-10 |
| REC01-T10 | IMPLEMENTED_UNVERIFIED | PARTIAL / NOT TESTED: Multi-connection PostgreSQL and true crash/disconnect verification remain unavailable. |
| REC01-T11 | VERIFIED_COMPLETE | PASS: EO-01 |
| REC01-T12 | VERIFIED_COMPLETE | PASS: RC-04 |

The PostgreSQL harness requires EASYGAS_ENABLE_LOCAL_PG_TESTS=yes and EASYGAS_TEST_POSTGRES_URL pointing to localhost/easygas_test… with DATABASE_URL unset. It creates/drops only its own random test schema. The test was executed and skipped because that environment is unavailable; this is not a pass. Injected rollback/acknowledgement errors are explicitly distinguished from OS crashes and real network failures. Logs and manual browser evidence are linked in the phase JSON matrix.
