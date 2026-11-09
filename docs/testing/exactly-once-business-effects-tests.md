# Exactly Once Business Effects Tests

Commands: `npm test`; `node --import tsx --test tests/service-booking-recovery.test.ts`; `node --import tsx --test tests/service-booking-postgres.test.ts`. Use isolated synthetic data only. No messages or live payments sent. PGlite is real embedded PostgreSQL but serializes transactions; it does not prove independent connection concurrency.

| ID | Actual result | Evidence / remaining work |
|---|---|---|
| EO-01 | VERIFIED_COMPLETE | PASS: EO-01 |
| EO-02 | BLOCKED | PARTIAL / NOT TESTED: Generic keyed web operations pass local tests; legacy unkeyed callers and true PostgreSQL crash/restart remain outside the proven guarantee. |
| EO-03 | PARTIAL | PARTIAL / NOT TESTED: Injected pre-commit interruption rolled back all effects; an actual OS process kill during PostgreSQL commit remains unperformed. |
| EO-04 | VERIFIED_COMPLETE | PASS: EO-04 |
| EO-05 | VERIFIED_COMPLETE | PASS: EO-01 |
| EO-06 | VERIFIED_COMPLETE | PASS: EO-01 |
| EO-07 | BLOCKED | PARTIAL / NOT TESTED: Generic keyed web operations pass local tests; legacy unkeyed callers and true PostgreSQL crash/restart remain outside the proven guarantee. |
| EO-08 | BLOCKED | PARTIAL / NOT TESTED: Generic keyed web operations pass local tests; legacy unkeyed callers and true PostgreSQL crash/restart remain outside the proven guarantee. |
| EO-09 | VERIFIED_COMPLETE | PASS: EO-09 |
| EO-10 | VERIFIED_COMPLETE | PASS: EO-10 |
| EO-11 | VERIFIED_COMPLETE | PASS: EO-10 |
| EO-12 | BLOCKED | PARTIAL / NOT TESTED: Generic keyed web operations pass local tests; legacy unkeyed callers and true PostgreSQL crash/restart remain outside the proven guarantee. |
| EO-13 | IMPLEMENTED_UNVERIFIED | PARTIAL / NOT TESTED: Generic keyed web operations pass local tests; legacy unkeyed callers and true PostgreSQL crash/restart remain outside the proven guarantee. |
| EO-14 | PARTIAL | PARTIAL / NOT TESTED: Lost commit acknowledgement was injected after a real local commit; real PostgreSQL connection failure during COMMIT remains unperformed. |
| EO-15 | PARTIAL | PARTIAL / NOT TESTED: Operation results have no expiry and are immutable; an artificial expired-key legacy replay drill remains unperformed. |

The PostgreSQL harness requires EASYGAS_ENABLE_LOCAL_PG_TESTS=yes and EASYGAS_TEST_POSTGRES_URL pointing to localhost/easygas_test… with DATABASE_URL unset. It creates/drops only its own random test schema. The test was executed and skipped because that environment is unavailable; this is not a pass. Injected rollback/acknowledgement errors are explicitly distinguished from OS crashes and real network failures. Logs and manual browser evidence are linked in the phase JSON matrix.
