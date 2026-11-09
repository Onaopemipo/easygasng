# Inventory and finance security verification

30 October 2026. **Local implementation verified with limitations; commercial production remains NO-GO.** This is not an independent security certification or complete acceptance of every master-prompt feature.

## 1. Executive summary

Implemented inventory/stocktake/transfer/purchase/expense/reporting/live-dashboard controls by extending existing inventory, finance, approval, audit and session authorities. Fixed operational dashboard revenue exposure, broad purchasing cost responses, direct unapproved transfer dispatch, and passed cylinder inspection without independently verified qualifications. Restricted operations fail closed under missing/stale authority or stock evidence. No new financial payment provider, hosting, production access or customer notification was activated.

Known limitations remain: independent PostgreSQL races/restricted production identity; actual safety/stock/cost/finance acceptance; unsupported advanced behavioural monitoring and defined cohort/reminder/reorder inputs. See section7 and the implementation report. Preflight CONDITIONAL_PASS permits local work, not release.

## 2. Repository baseline

Unborn `main`, no HEAD commit, one worktree; all application files already untracked. No reset/clean/checkout/discard/commit/push. Source inspection, overlap preservation, scope/environment/P0 review and decision are recorded in `../audits/easygas-inventory-dashboard-preflight.md` before tests/code changes. Existing web/native, ledgers, serial custody and shared approvals preserved. No source-control diff against a commit exists; the scoped source manifest records actual paths/SHA256.

## 3. Implemented controls and files

- `apps/web/lib/inventory-business.ts`: strict operations, current role/branch/verification, real receipts, immutable operation evidence, qualified release, stocktake sessions/counts, staged transfer/partial receipt, shared purchase approval and expense controls.
- `apps/web/lib/business-reporting.ts`: least-privilege fields, authoritative scoped calculations, refund-safe totals, separate kg/units, relevant filters and explicit ignored-filter notices, cap/precision unavailable values, audited exports and private scheduled report snapshots with current download checks.
- `apps/web/lib/inventory-valuation.ts`: explicitly approved moving weighted average from complete acquisition movements; no selling-price substitution or invented opening costs. Unknown basis/unsafe aggregate precision returns unavailable.
- `apps/web/lib/inventory-monitoring.ts`: deterministic incident signals using existing incidents; review, not fraud verdict. The existing worker invokes monitoring and schedule generation.
- `apps/web/app/api/business-live/route.ts`: scoped authenticated SSE, five-second revalidation, committed snapshot hashing/heartbeat, connection cleanup/limit. `components/business-centre.tsx`: readable inventory/finance/reporting/dashboard views, cache clearing, fallback refresh and actionable workflows.
- Existing `auth.ts`, `governance.ts`, `approval-workflow.ts`, stock/credit/payment/service/cylinder workflows remain the security authorities. Governance adds operation validation/application in its existing activation savepoint and retains current independent/dual policy enforcement. Existing `workspace.ts`, `operations.ts`, `financial-reports.ts`, `service.ts`, `refills.ts`, admin/forms/readiness/migration/bootstrap updated only as needed.

Complete paths are in `inventory-finance-source-manifest-2026-10-30.json`; detailed permission matrix is `../security/inventory-finance-permissions.md`. New branches do not copy one-time operation settings, start with zero gas and require their own valuation method configuration.

## 4. Actual verification

Full command `npm test`: **133 test entries;132 passed;0 failed;1 skipped**, evidence `inventory-finance-tests-2026-10-30.txt`. Subsequent source refinements were checked by final targeted suites: **23/23**, purchasing/branch regressions **25/25**, and the focused count-report assertion **1/1**. These overlap the full suite and are not added to its total. Final web build and web/native type checks exited0. No native source architecture was changed; no new signed/device certification is claimed.

| Test area | Executed local entries / coverage | Result | Evidence |
|---|---|---|---|
| Inventory authorisation, branch isolation, stock adjustments | grouped A–E,M and G,H,L,N,O; competing correction test | PASS local | final targeted; full suite |
| Receipts/purchases/transfers | partial purchases, controlled transfer, original workflows/runtime role | PASS local | final targeted; purchasing regression |
| Finance/expense approvals and reversals | F,N and I,J,P; original finance/refund/dual approval suite | PASS local | full/final targeted |
| Live security | actual HTTP initial/forged branch/heartbeat dedup/open-session suspension | PASS local | HTTP entry in final targeted (10-second run) |
| Revocation/privilege escalation | grouped G,H,L,N,O and original staff/auth tests | PASS local | full/final targeted |
| Immutable database records/RLS | original all-private-tables RLS check; added denied writes to receipts/expense events/counts/report snapshots/operation payload | PASS local | deployment entry in final targeted |
| Count sessions and valuation | complete/stale multi-item counts, approved method/missing costs, actual counted report rows | PASS local | final targeted and count-report log |
| Concurrent operations | PGlite competing correction and original wallet/checkout serialisation | PASS only for embedded serialisation | full/final targeted |
| Independent multi-connection PostgreSQL | guarded harness present; explicit disposable target absent | SKIPPED / BLOCKED | one skip in full log |
| Browser | synthetic receipt/replay/live activity/report/count-session views; desktop1280/mobile390 | verified scoped flows only | UI JSON/screenshots |

Scenario-by-scenario roles/conditions/attempts/observed results A–P: `../testing/inventory-finance-security-tests.md`. No unexecuted scenario is called passed. Some advanced master-prompt metrics and behavioural rules remain unavailable/unimplemented as explicitly documented.

## 5. Database verification

PGlite's PostgreSQL engine with fresh in-memory fixtures and an isolated persistent QA database; managed bootstrap tested with the restricted `easygas_server` role and an anonymous role. Private schema/RLS/column grants, immutable triggers, uniqueness, receipt bounds and stock constraints were exercised. No production records used. Existing inventory/grams/wallet authorities preserved; additions are operation/receiving/held-condition/expense/report/count evidence.

Local additive schemas028 and030, policies029/031, CLI-generated managed migration `20261029205117_inventory_dashboard_finance.sql`, regenerated bootstrap. No hosted migration applied. Local upgrade runner now requires schema030; managed application still requires explicit migration. Known legacy received purchase quantities are derived from their existing received state; no unknown stock/cost is backfilled.

Row locks, conditional balance updates, reference uniqueness, applied-once operations and shared savepoints protect the source design. Real independent connection locking/deadlock/network/commit ambiguity, managed advisor and production login/TLS verification remain **BLOCKED/NOT_TESTED**. The guarded test accepts only an explicitly enabled local `easygas_test…` database and unset production `DATABASE_URL`; no configured target was available. Embedded serialisation does not substitute for that acceptance.

## 6. Findings

| Ref | Severity | Root cause / impact | Remediation and actual status |
|---|---|---|---|
| IF01 | high | Legacy dashboard returned revenue to operational roles | new scoped field redaction and legacy dashboard routed through same calculations; before regression failed (`0` instead of omitted/null), final test passes |
| IF02 | high | Legacy transfer creation immediately deducted/dispatched without governed approval/reservation | shared approval → reserve → current-authority dispatch → independent receiving; replay/partial/damage tests pass |
| IF03 | high | Inspection role alone could pass a quarantined cylinder | fresh password + current independently verified cylinder_inspection qualification; K test fails safely before real fixture evidence and succeeds after synthetic verification |
| IF04 | medium | Legacy purchasing exposed acquisition costs to operational purchasing roles | server cost redaction, role-aware legacy UI and finance-only cost responses; direct API test passes |
| IF05 | medium | New-branch template would copy one-time business-operation settings/valuation selection | exclude operation keys, explicitly unconfigured valuation and zero gas; branch regression passes |
| IF06 | gap | Expense controls and multi-item stocktake/partial transfer evidence absent | implemented with original governance/ledgers; local workflow/security tests pass; business/PG acceptance remains open |
| IF07 | gap | No suitable live scoped business dashboard | authenticated committed SSE with revalidation/dedup/fallback; actual HTTP and isolated browser flows pass; proxy/load/TLS not tested |

No exploitable credentials, real customer information or unsafe operational fixtures are included. Missing test targets/business rules are not represented as resolved vulnerabilities.

## 7. Release gates and outstanding risks

Statuses below apply to this local verification scope only; a local PASS is not commercial release approval.

| Gate | Status | Evidence / limitation |
|---|---|---|
| SEC-01 inventory permissions | PASS local | authenticated operations + direct denial tests |
| SEC-02 branch isolation | PASS local; PostgreSQL acceptance BLOCKED | forged API/live/export scope refused |
| SEC-03 adjustment approvals | PASS local | independent owner, immutable evidence/stale counts/replay |
| SEC-04 transfers | PASS local; serial transfer excluded | reserve/dispatch/partial receipt/damage/replay |
| SEC-05 quarantine | PASS local; physical acceptance open | current independent qualification, no generic cylinder release |
| SEC-06 financial reporting | PASS local | role/branch/precision/cap safeguards |
| SEC-07 expenses | PASS local | duplicate detection/independent approval/payment/reversal |
| SEC-08 refunds/reversals | PASS local | new expense reversals + existing credit/refund regressions |
| SEC-09 live subscriptions | PASS local; infrastructure NOT_TESTED | real HTTP tests, no raw unrestricted stream |
| SEC-10 revocation | PASS local | current-session dispatch/SSE revalidation; five-second bound |
| SEC-11 privilege escalation | PASS local | original and new forged-role/self-promotion tests |
| SEC-12 audit integrity | PASS local; privileged ops acceptance open | restricted role + immutable evidence; DB owners remain privileged |
| SEC-13 independent concurrent stock | BLOCKED | no disposable multi-connection PostgreSQL target |
| SEC-14 duplicate money/stock | PASS local; independent races BLOCKED | reference/fingerprint/unique-event tests |
| SEC-15 sensitive exports | PASS local server/serialization; complete browser download/production delivery acceptance NOT_TESTED | generation and scheduled download permission checks, shared escaping helpers; no public links |
| SEC-16 complete monitoring | NOT_TESTED / OPEN for full requested scope | stocktake/conflict dedup/assignment tested; additional unusual behaviour/financial alert definitions and all rule-specific cases remain open |

Existing R01–R05 P0 serial/branch/inactive fulfilment/capacity/custody regressions pass locally; independent PostgreSQL and real operations acceptance remain required. Historical blocker register is preserved, not silently certified closed.

## 8. Operational handover and next actions

Documentation produced: preflight; inventory/finance permission matrix; inventory/financial/live/approval/fraud/audit controls; A–P tests; implementation report; this verification; `../operations/inventory-finance-security-runbook.md`. Existing README/inventory/limitations updated. Use the manifest for exact changed files/migrations and all proof artifacts.

Next: configure an explicitly disposable PostgreSQL test target and run guarded races/restricted-role/failure checks; independently approve actual qualification records, physical counts, opening costs/valuation method and any manager limits; reconcile liabilities/COGS/expenses/supplier invoices and payables; define supplier lead time/safety stock, customer cohorts/reminder attribution and behavioural-alert thresholds before adding definitive metrics. Implement/accept remaining serial-specific transfer procedures and additional requested monitoring. Perform real safety, restore/rollback, proxy/SSE load/TLS/privacy/device acceptance under an approved release scope. No deployment or payment activation is authorised. **Current production recommendation: NO-GO.**
