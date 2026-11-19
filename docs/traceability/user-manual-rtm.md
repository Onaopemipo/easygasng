Edition 2 note: the original read-only audit observations below are historical. The [current remediation matrix](audit-remediation-rtm.md) records deployed corrections and remaining gates.

# Whole website audit and user manual traceability

20 November 2026. Documentation scope is complete; commercial production remains **NO-GO**. Actual-import hold, retain-all and all prior phase denominators are preserved.

4/4 bounded documentation requirements and gates verified; 1/1 critical requirement. **86/86 route surfaces inspected, not 86/86 workflows functionally accepted.** Zero exclusions. Seven findings remain in scope: five open, two blocked, zero closed.

| Requirement | Result | Actual evidence and acceptance |
| --- | --- | --- |
| UM-01 Inventory and inspect the public and customer website including special and dynamic entry points | VERIFIED_COMPLETE | All 86 inventoried route surfaces inspected in 109 recorded role-route observations plus field-workspace subviews. Eight unpublished policies and guarded/empty states remain in the route denominator; no full transactional certification claimed. Tests: UM-COVERAGE. Gate UM-G01 PASS. |
| UM-02 Audit the business workspaces and current role boundaries without changing business records | VERIFIED_COMPLETE | 15/15 selected expected HTTP results, including 9 negative controls. Current role workspaces inspected. Final normal product readbacks equal the pre-audit 13-order/ledger/inventory/gas/wallet/policy baseline. No hosted DB access or business writes. Tests: UM-ROLE-BOUNDS, UM-PRESERVATION, UM-COVERAGE, UM-FINDINGS. Gate UM-G02 PASS. |
| UM-03 Create a customised workflow manual with genuine relevant screenshots and single-owner EasyGas guidance | VERIFIED_COMPLETE | 33-page customised manual with 31 task chapters, 25 genuine screenshots, six role perspectives, linked contents and explicit single-owner 0/1 guidance. PDF and editable Word verified. Tests: UM-ARTIFACTS, UM-VISUAL. Gate UM-G03 PASS. |
| UM-04 Produce readable verified artifacts and an evidence-based audit report with complete scope accounting | VERIFIED_COMPLETE | 13-page audit with seven open/blocked findings, route appendix, evidence, responsibilities, next actions and explicit acceptance limits. All 46 final rendered pages visually reviewed; artifact integrity/coverage/matrix checks pass. Tests: UM-ARTIFACTS, UM-VISUAL, UM-FINDINGS, UM-MATRIX. Gate UM-G04 PASS. |

## Mapping and security

### UM-01

Implementation and artifact files: [docs/user-manual/build_audit.py](../../docs/user-manual/build_audit.py), [docs/user-manual/evidence/route-inventory.json](../../docs/user-manual/evidence/route-inventory.json), [docs/user-manual/evidence/route-coverage.json](../../docs/user-manual/evidence/route-coverage.json).

Authoritative source: Current deployed UI and scoped read APIs, repository route/component/workflow sources and prior named acceptance evidence.

Security controls: Existing synthetic QA identities; no credentials in deliverables; no order/payment/stock/approval/qualification mutation or live-provider transaction. Preserve role and production holds.

Executed evidence: [route-inventory.json](../../docs/user-manual/evidence/route-inventory.json), [route-coverage.json](../../docs/user-manual/evidence/route-coverage.json), [browser-audit.json](../../docs/user-manual/evidence/browser-audit.json), [subviews.json](../../docs/user-manual/evidence/subviews.json), [responsive.json](../../docs/user-manual/evidence/responsive.json), [deployment.json](../../docs/user-manual/evidence/deployment.json).

None for the bounded audit/documentation deliverable. Website remediation WEB-A01–WEB-A07 and production/native/physical/provider/full-transaction acceptance remain open and are not waived.

### UM-02

Implementation and artifact files: [scripts/audit-user-manual.mjs](../../scripts/audit-user-manual.mjs), [scripts/manual-preservation.mjs](../../scripts/manual-preservation.mjs), [docs/user-manual/findings.json](../../docs/user-manual/findings.json).

Authoritative source: Current deployed UI and scoped read APIs, repository route/component/workflow sources and prior named acceptance evidence.

Security controls: Existing synthetic QA identities; no credentials in deliverables; no order/payment/stock/approval/qualification mutation or live-provider transaction. Preserve role and production holds.

Executed evidence: [role-boundaries.json](../../docs/user-manual/evidence/role-boundaries.json), [role-boundaries.txt](../../docs/user-manual/evidence/role-boundaries.txt), [role-access.json](../../docs/user-manual/evidence/role-access.json), [business-before.json](../../docs/user-manual/evidence/business-before.json), [business-after.json](../../docs/user-manual/evidence/business-after.json), [safety-readback.json](../../docs/user-manual/evidence/safety-readback.json).

None for the bounded audit/documentation deliverable. Website remediation WEB-A01–WEB-A07 and production/native/physical/provider/full-transaction acceptance remain open and are not waived.

### UM-03

Implementation and artifact files: [docs/user-manual/build_manual.py](../../docs/user-manual/build_manual.py), [docs/user-manual/manual-content.json](../../docs/user-manual/manual-content.json), [output/manual/EasyGas-User-Manual.docx](../../output/manual/EasyGas-User-Manual.docx), [output/pdf/EasyGas-User-Manual.pdf](../../output/pdf/EasyGas-User-Manual.pdf).

Authoritative source: Current deployed UI and scoped read APIs, repository route/component/workflow sources and prior named acceptance evidence.

Security controls: Existing synthetic QA identities; no credentials in deliverables; no order/payment/stock/approval/qualification mutation or live-provider transaction. Preserve role and production holds.

Executed evidence: [artifact-validation.json](../../docs/user-manual/evidence/artifact-validation.json), [visual-review.json](../../docs/user-manual/evidence/visual-review.json).

None for the bounded audit/documentation deliverable. Website remediation WEB-A01–WEB-A07 and production/native/physical/provider/full-transaction acceptance remain open and are not waived.

### UM-04

Implementation and artifact files: [docs/user-manual/build_audit.py](../../docs/user-manual/build_audit.py), [docs/user-manual/validate_artifacts.py](../../docs/user-manual/validate_artifacts.py), [docs/user-manual/findings.json](../../docs/user-manual/findings.json), [output/pdf/EasyGas-Website-Audit.pdf](../../output/pdf/EasyGas-Website-Audit.pdf).

Authoritative source: Current deployed UI and scoped read APIs, repository route/component/workflow sources and prior named acceptance evidence.

Security controls: Existing synthetic QA identities; no credentials in deliverables; no order/payment/stock/approval/qualification mutation or live-provider transaction. Preserve role and production holds.

Executed evidence: [artifact-validation.json](../../docs/user-manual/evidence/artifact-validation.json), [visual-review.json](../../docs/user-manual/evidence/visual-review.json), [route-coverage.json](../../docs/user-manual/evidence/route-coverage.json), [validation.txt](../../docs/user-manual/evidence/validation.txt).

None for the bounded audit/documentation deliverable. Website remediation WEB-A01–WEB-A07 and production/native/physical/provider/full-transaction acceptance remain open and are not waived.

## Open website findings

| ID | Priority | Kind | Status | Outstanding work |
| --- | --- | --- | --- | --- |
| WEB-A01 | High | Business publication gap | OPEN | Prepare and review the business-approved versions in Customer Policies, complete the required approval and publication steps, then re-open every public link. Verify title, version, effective date, content and consent-linked references. |
| WEB-A02 | Medium | Reproduced product defect | OPEN | Point the shortcut to an appropriate staff help or dispatch destination, or implement narrowly scoped staff support. Preserve customer and branch isolation; do not grant technicians broad customer-support access. |
| WEB-A03 | Low | Reproduced copy defect | OPEN | Use verification-specific missing or expired link guidance, including the correct resend route. Keep reset and invitation messages scoped to their own flow. |
| WEB-A04 | High | Operational prerequisite | BLOCKED | Before another authorised synthetic journey, obtain appropriate current demo-only review and evidence for the meter and required staff qualifications. Real operation needs genuine qualified evidence, not QA placeholders. |
| WEB-A05 | Critical | Existing release decision | BLOCKED | Assign owners and evidence to every current gate, resolve incidents and complete the established release acceptance process. Preserve the actual-import hold and retain-all decisions. |
| WEB-A06 | Medium | Operating model review | OPEN | Document real maker, reviewer and executor responsibilities for the small company. Confirm how each restricted request can be processed by authorised staff without fake owners or shared identities. |
| WEB-A07 | Information | Reporting and telemetry limit | OPEN | Maintain clear unknown-state copy and train users to supply authoritative cost, stock and telemetry evidence. Complete native/device acceptance separately when needed. |

## Acceptance limits

Read-only website inspection and selected HTTP boundaries, not an exhaustive penetration test, accessibility certification, installed native/device or live-provider test. No new business transactions, stock writes, approvals, invitation consumption, password changes or qualification renewals. Representative mobile checks cover sign-in and approvals at 390 by 844 only. All eight unpublished policy pages and the technician help defect remain in coverage. The prior 19 November role acceptance and GA4 receiver evidence are historical supporting evidence, not repeated here.

## Scope history

- 2026-11-20: Scope registered for whole website read-only audit and user manual. Inventory denominators retained including untested/blocked states. No app fixes/deployment, policy activation, native build or qualification renewal inferred.
- 2026-11-20: Audit and manual completed without app changes or deployment. All 86 surfaces/4 documentation requirements retained; seven website findings stay open or blocked. Commercial NO-GO, actual-import hold, retain-all and unrelated changes preserved. Artifact hashes, final full-page visual review, 15 access checks and unchanged business readbacks recorded.

## Edition 2 remediation update

The original audit and its seven finding states above are retained as historical evidence. Current states are in [audit remediation](audit-remediation-rtm.md): five of seven findings verified within approved demo scope, one blocked and one partial; all nine phase requirements remain in the denominator. The manual remains 33 pages and 25 genuine screenshots. The audit now has a three-page remediation update followed by the original 13-page audit. Artifact hashes and full visual review have been refreshed. Commercial NO-GO, actual-import hold and retain-all remain.
