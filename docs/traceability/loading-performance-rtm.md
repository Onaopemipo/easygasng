# Loading performance repair — 24 November 2026

Bounded web/API repair and client-demo publication: **4/4 verified**, zero exclusions. Implementation 4/4; verification 4/4; routes 2/2; gates 4/4. There are no registered P0 requirements in this phase; all four P1 rows retain security negatives. Previous feature denominators and production NO-GO remain unchanged.

| Requirement | Purpose | Executed acceptance | Gate/status |
| --- | --- | --- | --- |
| LOAD-R01 | Batch already-authorised Orders, trips and manifest child rows | LOAD-ORDERS / LOAD-CUSTODY full published-source JSON equality, bounded query counts and hosted timings | LOAD-G01 PASS / VERIFIED_COMPLETE |
| LOAD-R02 | Full GET deadline, scoped cancellation and explicit retry | LOAD-DEADLINE / LOAD-RECOVERY / LOAD-SOURCE and actual timeout → Try again → records UI | LOAD-G02 PASS / VERIFIED_COMPLETE |
| LOAD-R03 | Preserve role, branch, customer, GPS, custody and security contracts | Seven hosted roles and real foreign-ID denials; snapshots unchanged; full CI; 77 guard sites retained | LOAD-G03 PASS / VERIFIED_COMPLETE |
| LOAD-R04 | Exact-source client-demo release and hosted timing | 446 remote files match; Ready candidate promoted; hosted Orders/details/Fleet/manifests and cleanup | LOAD-G04 PASS / VERIFIED_COMPLETE |

Implementation: `apps/web/lib/order-records.ts`, `service.ts`, `driver-operations.ts`, `vehicle-products.ts`; `apps/web/components/read-deadline.ts`, `use-records-data.ts`, `ui.tsx`, `admin.tsx`. Existing role/branch filters run before batching. GET failures settle, old-scope results are ignored and mutations are never automatically replayed. Schema, approvals, stock, payment and safety controls remain unchanged.

The [JSON matrix](loading-performance-rtm.json) maps every row to actual implementation, authoritative data, security controls, named executed assertions, negative cases, gates, status and remaining work. [Report/evidence](../loading-performance/README.md), [hosted timings](../loading-performance/evidence/hosted-comparison.json), [source integrity](../loading-performance/evidence/source-integrity.json), [CI](../loading-performance/evidence/ci.json), [manual](../user-manual/dispatch-fleet.md).

The same 24-order/full-response hosted read now takes 1.840–1.985 seconds, median 1.8865 seconds versus 20.764 seconds before: 90.9% lower. Latest-100 caps remain. These are bounded demo probes, not production load/concurrency guarantees. Positive manifest forms and responsive layouts were exercised locally; hosted zero-active-trip prerequisites were observed without manufacturing stock/safety changes. Physical/assistive/native/provider, import/retain-all and production-readiness gates remain separate.
