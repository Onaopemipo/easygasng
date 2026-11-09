# Remaining business-feature task register — 9 November 2026

User requests complete implementation of the six retained non-payment feature areas. All prior E2E/PM/GPS requirements remain; production NO-GO, actual Excel-import hold, mobile-build and server-deployment deferrals remain. This is an execution register, not a completion claim.

| Task | Requirement | Dependencies | Current work / acceptance |
|---|---|---|---|
| REM-01 | E2E-01/02 physical-product and multi-cylinder doorstep execution | Existing original order/consent/immutable invoice notes, actual vehicle manifests and independent stock custody | Migrations064–067 implement individually inspected/metered cylinders, partial gas credit, physical payload/serial manifests, original-order handover and governed actual returns. AC-01 operational/browser and physical/device acceptance remain open; no real stock invented. |
| REM-02 | E2E-02 service cancellation/void/changed-scope recovery | Existing drafts, quotes, dispute holds, reports, credits/refunds | Shared finance-reviewed pre-work late/on-site cancellation implemented and tested; issued/report/payment histories preserved. Migrations068–069 add actual failed/stopped-work ceiling, customer-consented dual-approved settlement and material recovery. Chargeable/changed-scope/void/failed-work full operational acceptance remains open; see AC-01. |
| REM-03 | E2E-03 road/deadline/cost recommendations | Confirmed destination coordinates; current consented GPS; approved cost policy; configured road-routing processor | Implemented guarded coordinates, immutable OSRM road/deadline/cost evidence, shared finance-approved rates, scoped web controls and estimate-bound assignment; fixture/real-PG revision tests pass. Provider, business-rate and browser acceptance remain open. |
| REM-04 | E2E-04/GPS-R01–04 offline recovery | Existing encrypted queues/operation receipts, new native build and phones for acceptance | Source-only GPS receipt-first recovery now holds conflicted trips independently; bounded recovery tests/native types pass. Actual OS/background/storage acceptance remains deferred with builds. |
| REM-05 | E2E-05/06 CRM/channel lifecycle/scale | Existing campaigns/consent/budgets and official provider accounts/templates | Follow-up pagination removes the200-record visibility ceiling with equal-time/branch cursor tests. Complete lifecycle/scale/official provider acceptance remains open; no real messages or invented attribution. |
| REM-06 | E2E-07 historical migration | Customer-confirmed ambiguous payments/stock/fees/matches | Preview/reconciliation only; actual import remains prohibited. |

REM-01/02/03/05 engineering does not depend on purchasing hosting. REM-03 external routing is disabled until a trusted provider is explicitly configured; no actual customer/GPS coordinates are sent during fixture tests. REM-04 cannot be represented as installed-device acceptance by typechecks. Retain-all record instruction continues.

Approved continuation dependencies and actual acceptance limits are tracked in [AC-01–05](approved-completion-execution.md). Final broad434/434 and targeted13/13 pass; all prior gates remain.
