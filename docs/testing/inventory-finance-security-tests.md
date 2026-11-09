# Inventory and finance security tests

Synthetic accounts/stock/documents only. `tests/inventory-finance.test.ts` creates a fresh `memory://` database per test, migrates current schema and uses real dispatch/session/approval paths. No production fixtures or normal local database are used. Actual command: `npm test`; evidence: `docs/reports/inventory-finance-tests-2026-10-30.txt`. Eleven new grouped workflow tests and the additional live HTTP test are included in the complete suite. Counts in the verification report refer to test entries, not each assertion.

| ID | Conditions / role / operation | Expected and observed result | Evidence |
|---|---|---|---|
| A | Sales attempts inventory adjustment on synthetic hose stock | denied, no adjustment effect; denied event retained | A–E,M grouped test |
| B | Inventory requester attempts own restricted approval | no authority/self approval refused; stock unchanged until independent owner review | A–E,M |
| C | Assigned Lagos manager tampers branch to another isolated branch | denied before data/movement returned | G,H,L,N,O |
| D | Inventory submits identical receipt twice, then changed quantity | one credit/receipt, conflicting replay refused | A–E,M; partial purchases |
| E | Two corrections against the same ten-unit snapshot | one active reduction, second failed stale snapshot, final four units | competing-corrections test; serialized PGlite only |
| F | Sales/inventory request financial summary or profitability | denied/omitted, no cost or liability leakage | F,N and G,H,L,N,O |
| G | Live unauthenticated/forged-branch connection | HTTP401/403, no restricted snapshot | HTTP live subscription test |
| H | Suspend a manager/session during use; suspend live sales session after initial snapshot | subsequent dispatch denied; open SSE sends revoked and ends at next five-second check | G,H,L,N,O + HTTP |
| I | Finance resubmits same expense with a different reference | fingerprint recognises original; no duplicate posting | I,J,P |
| J | Finance tries to approve own expense and record before approval | both refused; independent owner approval required | I,J,P |
| K | Inventory passes quarantined cylinder without independently verified qualification | refused, quarantine retained; valid synthetic qualification allows empty inspection result | K test + workflows + shared gas |
| L | Tampered branch/sensitive financial export | denied; authorised export reuses correct scoped rows and audits | G,H,L,N,O and I,J,P |
| M | UPDATE stock movements / DELETE receipt history | immutable trigger refuses | A–E,M; existing deployment role tests |
| N | Manager requests another branch/business-wide metrics | denied; operational roles get no financial fields | F,N + G,H,L,N,O |
| O | Sales adds role to snapshot request or attempts own staff promotion | strict schema/authority refuses; role remains sales | G,H,L,N,O + original privilege tests |
| P | Repeat expense payment/reversal activation | one paid event and one append-only reversal, original evidence preserved | I,J,P; original refund/credit regressions |

Additional executed coverage: partial supplier receipts and over-receipt rejection; transfer approval/reservation/dispatch/independent partial good/damaged receiving and replay; stocktake category snapshots, blank count sheets, complete counts, independent variance approval and intervening movement refusal; approved weighted-average acquisition costs and unavailable missing basis; in-app schedules deduplicate and stop after permission loss. Original P0 branch/serial/custody/capacity regressions remain part of the suite. Existing risk-4 dual approval tests remain unchanged.

Browser: isolated QA receipt of four hose units, duplicate submit leaves four; live dashboard receives the committed receipt reference without page reload; movement report contains quantity four; stocktake count session created/opened; desktop1280/mobile390 minimum16px text and no document overflow for recorded views. See UI JSON and screenshots in the verification report. Browser tests do not claim a complete human operational acceptance or real payment transaction.

Independent PostgreSQL: guarded existing harness now also includes competing stock corrections. Requires localhost database name beginning `easygas_test`, explicit `EASYGAS_ENABLE_LOCAL_PG_TESTS=yes`, configured `EASYGAS_TEST_POSTGRES_URL` and unset `DATABASE_URL`; creates/drops only a unique synthetic test schema. **Skipped / BLOCKED** here because no disposable connection is configured. PGlite's single-connection serialisation does not prove PostgreSQL races, deadlocks, restricted production identity, network failure or proxy/load behaviour.
