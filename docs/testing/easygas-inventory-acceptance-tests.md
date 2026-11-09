# Inventory acceptance — all56 retained

Baseline:341 total,328 pass,13 skip,0 fail. Final disposable PostgreSQL suite:347 total,347 pass,0 skip/fail. Targeted existing+new inventory tests17/17 pass. No production data/provider or actual import used. PGlite unit fixtures are not concurrency proof; independent PostgreSQL tests run explicitly in the full suite.

Commands: `npm test` baseline; `EASYGAS_ENABLE_LOCAL_PG_TESTS=yes EASYGAS_TEST_POSTGRES_URL=postgresql://127.0.0.1:57419/easygas_test_operations npm test` final; `node --import tsx --test --test-concurrency=1 tests/inventory-workspace.test.ts tests/inventory-workspace-http.test.ts tests/inventory-finance.test.ts` focused. Evidence under docs/inventory/evidence. Web typecheck/build executed; no lint script. Browser evidence: existing demo owner only, no stock mutations submitted; real filtered CSV, seven panels, keyboard, filter Back persistence and responsive/dark checks. Rendering a form is not mutation acceptance.

PASS below certifies only its bounded executed scenario. PARTIAL/BLOCKED remain in denominator. Software safety regressions do not certify physical cylinders/field devices.

| ID | Required scenario | Observed result/environment | Status | Gate |
|---|---|---|---|---|
| INV-001 | Existing grouped sidebar remains unchanged in structure and routes. | Existing grouped navigation source unchanged; exact29-route registry regression passes. | PARTIAL | G02 |
| INV-002 | Inventory active link and expand/collapse persist. | Inventory active branch/route observed; previous sidebar collapse tests retained. | PARTIAL | G02 |
| INV-003 | Single login resolves permissions without role selection. | Existing canonical shared login unchanged; admin phase AUTH tests remain green. | PARTIAL | G02 |
| INV-004 | All seven current tabs work; deep-link/filter/back navigation works. | Seven tabs observed; query persisted Gas Hose across tabs and Products→Back; keyboard ArrowRight activates Receipts. | PARTIAL | G04 |
| INV-005 | All top actions and quick actions invoke authorized real flows. | CSV/Add Stock and operational panels verified; actual mutations tested at service/DB boundary, not all browser submissions. | PARTIAL | G03 |
| INV-006 | Search, filter, sorting, pagination, clear and export work. | Synthetic25-row paging20+5, sort/input limits, literal wildcard/injection, state/export filters; browser Gas Hose1-row CSV confirmed. | PASS | G04 |
| INV-007 | Responsive desktop/tablet/mobile and accessible keyboard/tabs/forms. | Root widths1536/1280/1024/768/390/320 fit; local table scroll; formal screenreader/zoom acceptance remains. | PARTIAL | G19 |
| INV-008 | Light/Dark/System modes have usable contrast. | Dark active tabs verified contrast fix; light/dark screenshots; System/no-flash full acceptance pending. | PARTIAL | G19 |
| INV-009 | Empty/zero/missing cost/stale/error/loading states accurate. | Actual0 units/0kg,8 reorder rows, unavailable valuation; stale/permission/code paths present, full outage browser injection not run. | PARTIAL | G03 |
| INV-010 | No mockup numbers, fabricated stock, identities, valuation or images are seeded. | No seed/import/deployment command; application keeps actual0 stock. Test identities only in disposable fixtures. | PARTIAL | G03 |
| INV-011 | kg and unit counts are not aggregated incorrectly. | Separate SQL units/grams totals, gas category only grams, no combined quantity. | PASS | G05 |
| INV-012 | Available = authoritative on-hand minus eligible reservations/holds per current semantics. | Fixture eligible10/reserved3/held2 gives onHand12/available7; gas25300/300/200 gives onHand25.5kg/available25kg; held not double-subtracted. | PASS | G05 |
| INV-013 | Receipt commits one valid movement and updates correct branch. | Existing governed receipt replay/stock-movement tests pass. | PARTIAL | G06 |
| INV-014 | Partial receipt, overreceipt and duplicate supplier reference safely handled. | Existing independent partial purchase receipts reject overreceive and duplicate mismatched references. | PARTIAL | G06 |
| INV-015 | Unauthorized receipt blocked without effects. | Existing protected mutation/branch/role tests pass; exact all-role UI acceptance pending. | PARTIAL | G06 |
| INV-016 | Adjustment requires approval and logs original/correction. | Original approval delta/stale count/movement immutability tests pass. | PARTIAL | G07 |
| INV-017 | Self-approval rejected where prohibited. | Independent request/approval tests and self-approval negatives pass. | PARTIAL | G07 |
| INV-018 | Stocktake variance reconciliation and stale-count conflict. | Existing stocktake snapshot/count-sheet/submit/stale-movement tests pass. | PARTIAL | G08 |
| INV-019 | Return condition and quarantine enforced. | Qualified hold release and supplier disposition remain; all return-source/condition browser acceptance pending. | PARTIAL | G09 |
| INV-020 | Transfer does not make stock simultaneously available in both locations. | Existing transfer source reserve/dispatch/destination receipt tests pass; full serial/vehicle path not certified. | PARTIAL | G10 |
| INV-021 | Partial/damaged transfer receipt reconciles. | Partial transfer/damage-hold/replay tests pass; exception UI acceptance incomplete. | PARTIAL | G10 |
| INV-022 | Vehicle loading/unloading and on-site additions constrained by vehicle stock. | Prior verified vehicle-stock doorstep commit/custody gap remains; no bypass. | BLOCKED | G10 |
| INV-023 | Bundles consume/reserve underlying components only once. | Existing component reservation/checkout tests pass; full inventory UI bundle acceptance pending. | PARTIAL | G12 |
| INV-024 | Service material usage and return linked to authorized service. | Existing pre-work payment/assignment/material issue guards and reconciliation tests pass; broader return/device acceptance open. | PARTIAL | G12 |
| INV-025 | Purchase orders do not increase physical stock before receipt. | Purchase does not add physical stock until independently approved valid receiving; regression passes. | PARTIAL | G06 |
| INV-026 | Movement history immutable and correction auditable. | New paged immutable history reads actor/reference/unit; original correction/append-only tests pass. Rich origin/evidence drilldown incomplete. | PARTIAL | G13 |
| INV-027 | Stock valuation unavailable when acquisition costs/policy missing. | Unconfigured/incomplete/restricted acquisition basis returns unavailable, not retail prices; tested. | PASS | G14 |
| INV-028 | Valid valuation follows approved costing method. | Approved complete acquisition10units×10000kobo yields100000; category sum equals valuation and operational role cannot read costs. | PASS | G14 |
| INV-029 | Threshold and alert counts are consistent with inventory state. | Sidebar/query reorder condition equality asserted, pending approvals separate; selected/global scope labelled. | PARTIAL | G15 |
| INV-030 | Branch-scoped access and exports cannot leak other branches. | Current branch/role/revocation + new cross-branch workspace/export negatives; no financial cost fields. | PASS | G17 |
| INV-031 | R01 serialized cylinder checkout/dispatch/returns fail safely without eligibility. | Existing eligible serial checkout/dispatch/custody tests pass; physical safety and whole affected path certification remain open. | BLOCKED | G11 |
| INV-032 | R02 unauthorized branch checkout/stock issue rejected. | Existing inactive/cross-branch checkout-before-reservation regressions pass. | PARTIAL | G11 |
| INV-033 | R03 inactive branch fulfilment rejected. | Existing inactive branch operation/fulfilment regressions pass. | PARTIAL | G11 |
| INV-034 | R04 failed delivery reassignment revalidates capacity. | Existing failed delivery reassignment cannot overbook test passes. | PARTIAL | G11 |
| INV-035 | R05 held cylinder reissue blocked until valid return/transfer. | Existing second custody issue blocked until return test passes. | BLOCKED | G11 |
| INV-036 | Concurrent reservation for last available stock allows only valid allocation. | Independent PostgreSQL competing stock corrections/final gas reservation tests pass. | PARTIAL | G18 |
| INV-037 | Duplicate receipt/transfer/issue request posts once. | Receipt/transfer replay and conflicting reference tests pass. | PARTIAL | G18 |
| INV-038 | Timeout after commit returns original operation result. | Existing operation-recovery/replay tests pass; full inventory-specific post-commit network timeout browser drill pending. | PARTIAL | G18 |
| INV-039 | Payment/webhook retries do not duplicate inventory effects. | Existing payment/webhook/idempotent commerce tests pass; no live provider activated. | PARTIAL | G12 |
| INV-040 | Customer order cancellation releases eligible reservations only. | Existing cancellation/reservation/serial allocation release tests pass. | PARTIAL | G12 |
| INV-041 | POS stock movement obeys branch permissions and payment rules. | Existing POS branch/payment/stock tests pass. | PARTIAL | G12 |
| INV-042 | Cylinder ownership, empty/filled and inspection statuses preserved. | Existing serialized ownership/inspection/custody tests pass; physical qualified acceptance not claimed. | PARTIAL | G11 |
| INV-043 | Stock movements link to delivery, service and order references. | Movement origin reference strings retained; generic complete origin/evidence navigation remains partial. | PARTIAL | G13 |
| INV-044 | Inventory reports reconcile against authoritative movement ledger. | Existing ledger/valuation/finance source reconciliation tests pass; comprehensive new origin explorer reconciliation pending. | PARTIAL | G13 |
| INV-045 | Historical import dry-run does not alter live stock. | Existing XLS preview tests confirm targetBusinessWrites0/importApprovedfalse. | PARTIAL | G16 |
| INV-046 | Approved import replay is idempotent; rejected rows remain exceptions. | Actual import explicitly held; approved importer execution not authorised or certified. | BLOCKED | G16 |
| INV-047 | Excel historical costs and delivery fees are preserved. | Historical ambiguity/fees/cost review preserved in preview; business confirmation outstanding. | BLOCKED | G16 |
| INV-048 | Failed migration or rollback leaves existing records intact. | No schema change; existing encrypted isolated restores pass, production rollback drill not performed. | PARTIAL | G20 |
| INV-049 | Event-worker failure cannot create phantom real-time stock. | No optimistic stock; read-only post-commit polling/fallback; full worker fault/reconnect test not run this phase. | PARTIAL | G15 |
| INV-050 | Role revocation during operation denies unauthorized commit. | Existing revocation/approval-revalidation negatives pass; direct scoped new read revoked account fails. | PARTIAL | G17 |
| INV-051 | Cross-branch IDOR and serial enumeration denied. | New branch IDOR read/export reject; no serial enumeration endpoint added; field-role guards precede facade. | PASS | G17 |
| INV-052 | Export protects sensitive cost data and CSV formula injection. | Formula prefix escaped; new export has no acquisition costs/customer data; roles and limits tested. | PASS | G17 |
| INV-053 | Existing products, orders, drivers, technician, wallet, finance, approvals and audit regression suites remain valid. | Final347/347 existing+new regression pass, no skip/failure. | PARTIAL | G21 |
| INV-054 | Multi-connection PostgreSQL integration tests verify concurrency and zero unintended effects. | Full disposable PostgreSQL run includes independent-connection stock/approval/service/tracking/recovery tests. | PARTIAL | G18 |
| INV-055 | Production build, typecheck, lint and targeted browser acceptance verified. | Web typecheck/build pass; no lint script; targeted browser read/navigation/download checks, full accessibility/role acceptance open. | PARTIAL | G21 |
| INV-056 | Recovery after backup restore or application rollback reconciles inventory state (only claim tested if performed). | Existing encrypted database/PG restore checks pass; production RTO/RPO/physical reconciliation drill remains open. | PARTIAL | G20 |

## All22 acceptance gates

| Gate | Scope | Status | Reason |
|---|---|---|---|
| G01 | Repository audit and baseline preservation | PASS | Executed bounded technical evidence; no release approval |
| G02 | Existing sidebar, routes, single login and permissions | PASS | Executed bounded technical evidence; no release approval |
| G03 | Approved inventory content without fabricated records | NOT_TESTED | Full applicable UI/operational acceptance not executed; supporting tests are not full gate closure |
| G04 | Stock table/search/filter/pagination/export | PASS | Executed bounded technical evidence; no release approval |
| G05 | Correct kg/unit/held/reserved/available | PASS | Executed bounded technical evidence; no release approval |
| G06 | Stock receipts and supplier purchases | NOT_TESTED | Full applicable UI/operational acceptance not executed; supporting tests are not full gate closure |
| G07 | Adjustments and independent approvals | PASS | Executed bounded technical evidence; no release approval |
| G08 | Stocktake and reconciliation | PASS | Executed bounded technical evidence; no release approval |
| G09 | Returns and condition handling | NOT_TESTED | Full applicable UI/operational acceptance not executed; supporting tests are not full gate closure |
| G10 | Branch/warehouse/vehicle transfers and custody | BLOCKED | Prior safety/vehicle or explicit historical import acceptance remains open |
| G11 | Cylinder serialization/inspection/P0 controls | BLOCKED | Prior safety/vehicle or explicit historical import acceptance remains open |
| G12 | Order/POS/delivery/service integration | BLOCKED | Prior safety/vehicle or explicit historical import acceptance remains open |
| G13 | Inventory movement ledger and history | NOT_TESTED | Full applicable UI/operational acceptance not executed; supporting tests are not full gate closure |
| G14 | Valuation policy and missing-data states | PASS | Executed bounded technical evidence; no release approval |
| G15 | Realtime alerts/reporting integrity | NOT_TESTED | Full applicable UI/operational acceptance not executed; supporting tests are not full gate closure |
| G16 | Historical Excel migration compatibility | BLOCKED | Prior safety/vehicle or explicit historical import acceptance remains open |
| G17 | Authorization/privacy/audit/anti-abuse | PASS | Executed bounded technical evidence; no release approval |
| G18 | Idempotency/concurrency/transaction safety | PASS | Executed bounded technical evidence; no release approval |
| G19 | Accessibility/responsive/themes | NOT_TESTED | Full applicable UI/operational acceptance not executed; supporting tests are not full gate closure |
| G20 | Backup/rollback/recovery | NOT_TESTED | Full applicable UI/operational acceptance not executed; supporting tests are not full gate closure |
| G21 | Regression/build checks | PASS | Executed bounded technical evidence; no release approval |
| G22 | Documentation/traceability/blockers | PASS | Executed bounded technical evidence; no release approval |
