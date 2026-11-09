# Customer Service Booking Tests

Commands: `npm test`; `node --import tsx --test tests/service-booking-recovery.test.ts`; `node --import tsx --test tests/service-booking-postgres.test.ts`. Use isolated synthetic data only. No messages or live payments sent. PGlite is real embedded PostgreSQL but serializes transactions; it does not prove independent connection concurrency.

| ID | Actual result | Evidence / remaining work |
|---|---|---|
| BK-01 | VERIFIED_COMPLETE | PASS: browser/existing regression evidence |
| BK-02 | VERIFIED_COMPLETE | PASS: browser/existing regression evidence |
| BK-03 | VERIFIED_COMPLETE | PASS: browser/existing regression evidence |
| BK-04 | VERIFIED_COMPLETE | PASS: browser/existing regression evidence |
| BK-05 | BLOCKED | PARTIAL / NOT TESTED: Required independent PostgreSQL connection tests cannot run without an enabled disposable local server. |
| BK-06 | VERIFIED_COMPLETE | PASS: EO-01 |
| BK-07 | VERIFIED_COMPLETE | PASS: EO-01 |
| BK-08 | VERIFIED_COMPLETE | PASS: EO-01 |
| BK-09 | VERIFIED_COMPLETE | PASS: RC-04 |
| BK-10 | VERIFIED_COMPLETE | PASS: RC-04 |
| BK-11 | VERIFIED_COMPLETE | PASS: browser/existing regression evidence |
| BK-12 | VERIFIED_COMPLETE | PASS: EO-09 |
| BK-13 | VERIFIED_COMPLETE | PASS: EO-09 |
| BK-14 | VERIFIED_COMPLETE | PASS: RC-10 |
| BK-15 | VERIFIED_COMPLETE | PASS: RC-10 |
| BK-16 | VERIFIED_COMPLETE | PASS: browser/existing regression evidence |
| BK-17 | VERIFIED_COMPLETE | PASS: browser/existing regression evidence |
| BK-18 | VERIFIED_COMPLETE | PASS: browser/existing regression evidence |
| BK-19 | VERIFIED_COMPLETE | PASS: browser/existing regression evidence |
| BK-20 | VERIFIED_COMPLETE | PASS: browser/existing regression evidence |
| BK-21 | VERIFIED_COMPLETE | PASS: browser/existing regression evidence |
| BK-22 | PARTIAL | PARTIAL / NOT TESTED: Shared session invalidation remains in place; sign-out and secure login return were browser-verified, but mid-form expiry recovery was not separately exercised. |
| BK-23 | PARTIAL | PARTIAL / NOT TESTED: Durable in-app/outbox tests pass; external delivery/worker acknowledgement handling is intentionally unconnected. |
| BK-24 | VERIFIED_COMPLETE | PASS: EO-01 |
| BK-25 | VERIFIED_COMPLETE | PASS: browser/existing regression evidence |

The PostgreSQL harness requires EASYGAS_ENABLE_LOCAL_PG_TESTS=yes and EASYGAS_TEST_POSTGRES_URL pointing to localhost/easygas_test… with DATABASE_URL unset. It creates/drops only its own random test schema. The test was executed and skipped because that environment is unavailable; this is not a pass. Injected rollback/acknowledgement errors are explicitly distinguished from OS crashes and real network failures. Logs and manual browser evidence are linked in the phase JSON matrix.
