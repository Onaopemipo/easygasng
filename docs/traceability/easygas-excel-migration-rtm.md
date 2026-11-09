# Excel migration requirements traceability

Current phase: audit, reconciliation and preview only. Source SHA256761854f961474cfb7789cddf4d9e16759796581bff8cc420253d9ceb32e1c380. No import approved;0 target writes. Verified preview requirements do not close blocked broad import gates.

| Requirement | Actual implementation / field mapping | Status | Gate | Outstanding |
|---|---|---|---|---|
| XLS-REQ-01 Repository audit and baseline | docs/audits/easygas-excel-preflight.md; see A:AA dictionary/provenance | VERIFIED_COMPLETE | IM-01 | Customer confirmation and separate staged importer/governance/security implementation; visual review remains manual |
| XLS-REQ-02 Workbook discovery, raw/cache/formula/format handling | docs/migration/easygas-workbook-data-dictionary.md; see A:AA dictionary/provenance | VERIFIED_COMPLETE | IM-02 | Customer confirmation and separate staged importer/governance/security implementation; visual review remains manual |
| XLS-REQ-03 Row classification and stable source/event provenance | docs/migration/easygas-row-classification.md; see A:AA dictionary/provenance | VERIFIED_COMPLETE | IM-03 | Customer confirmation and separate staged importer/governance/security implementation; visual review remains manual |
| XLS-REQ-04 Customer review candidates; no automatic identity matching | docs/migration/easygas-customer-matching.md; see A:AA dictionary/provenance | VERIFIED_COMPLETE | IM-04 | Customer confirmation and separate staged importer/governance/security implementation; visual review remains manual |
| XLS-REQ-05 Mechanical stock bridge and unresolved physical cutover | docs/migration/easygas-inventory-reconciliation.md; see A:AA dictionary/provenance | VERIFIED_COMPLETE | IM-06 | Customer confirmation and separate staged importer/governance/security implementation; visual review remains manual |
| XLS-REQ-06 Recorded finance reconciliation without debt/settlement inference | docs/migration/easygas-financial-reconciliation.md; see A:AA dictionary/provenance | VERIFIED_COMPLETE | IM-07 | Customer confirmation and separate staged importer/governance/security implementation; visual review remains manual |
| XLS-REQ-07 Refill/dormant exclusions and consent boundaries | docs/migration/easygas-refill-history.md; see A:AA dictionary/provenance | VERIFIED_COMPLETE | IM-09 | Customer confirmation and separate staged importer/governance/security implementation; visual review remains manual |
| XLS-REQ-08 Private zero-write preview and downloadable exception/review files | scripts/easygas_excel_preview.py; see A:AA dictionary/provenance | IMPLEMENTED_UNVERIFIED | IM-14 | Customer confirmation and separate staged importer/governance/security implementation; visual review remains manual |
| XLS-REQ-09 Actual import approval/commit and row-to-target persistence | docs/migration/easygas-import-runbook.md; see A:AA dictionary/provenance | BLOCKED | IM-11 | Obtain customer resolutions, then separately review exact writes/approvals, concurrency and restoration before any import |
| XLS-REQ-10 Posted stock/finance effects with independent cutover approval | docs/migration/easygas-import-runbook.md; see A:AA dictionary/provenance | BLOCKED | IM-06 | Obtain customer resolutions, then separately review exact writes/approvals, concurrency and restoration before any import |
| XLS-REQ-11 Committed historical orders/customer/profile/CRM integration | docs/migration/easygas-import-runbook.md; see A:AA dictionary/provenance | BLOCKED | IM-05 | Obtain customer resolutions, then separately review exact writes/approvals, concurrency and restoration before any import |
| XLS-REQ-12 Actual importer concurrency/crash recovery/compensation/restore | docs/migration/easygas-import-runbook.md; see A:AA dictionary/provenance | BLOCKED | IM-12 | Obtain customer resolutions, then separately review exact writes/approvals, concurrency and restoration before any import |
| XLS-REQ-13 Current preview tests, report and traceability | docs/testing/easygas-excel-migration-tests.md; see A:AA dictionary/provenance | IMPLEMENTED_UNVERIFIED | IM-18 | Customer confirmation and separate staged importer/governance/security implementation; visual review remains manual |

## IM-01–18 gates

| Gate | Scope | Status | Reason |
|---|---|---|---|
| IM-01 | preflight | PASS | Verified for current read-only preview scope |
| IM-02 | workbook/formula audit | PASS | Verified for current read-only preview scope |
| IM-03 | classification/provenance | PASS | Verified for current read-only preview scope |
| IM-04 | customer identity approval | BLOCKED | Actual import and customer approvals explicitly withheld; review documents expose unresolved decisions |
| IM-05 | historical orders | BLOCKED | Actual import and customer approvals explicitly withheld; review documents expose unresolved decisions |
| IM-06 | inventory/cutover | BLOCKED | Actual import and customer approvals explicitly withheld; review documents expose unresolved decisions |
| IM-07 | financial reconciliation/sign-off | BLOCKED | Actual import and customer approvals explicitly withheld; review documents expose unresolved decisions |
| IM-08 | accessory/service accounting | BLOCKED | Actual import and customer approvals explicitly withheld; review documents expose unresolved decisions |
| IM-09 | refill history | BLOCKED | Actual import and customer approvals explicitly withheld; review documents expose unresolved decisions |
| IM-10 | dormant analytics | BLOCKED | Actual import and customer approvals explicitly withheld; review documents expose unresolved decisions |
| IM-11 | review/approval workflow | BLOCKED | Actual import and customer approvals explicitly withheld; review documents expose unresolved decisions |
| IM-12 | exactly-once/concurrency | BLOCKED | Actual import and customer approvals explicitly withheld; review documents expose unresolved decisions |
| IM-13 | recovery/reimport | BLOCKED | Actual import and customer approvals explicitly withheld; review documents expose unresolved decisions |
| IM-14 | privacy/permissions | NOT_TESTED | Partial filesystem/structural/baseline evidence; full admin role, device, PostgreSQL or visual/build acceptance not yet complete |
| IM-15 | no import side effects | PASS | Verified for current read-only preview scope |
| IM-16 | existing modules/P0 regressions | NOT_TESTED | Partial filesystem/structural/baseline evidence; full admin role, device, PostgreSQL or visual/build acceptance not yet complete |
| IM-17 | actual workbook/client sign-off | BLOCKED | Actual import and customer approvals explicitly withheld; review documents expose unresolved decisions |
| IM-18 | documentation/build | NOT_TESTED | Partial filesystem/structural/baseline evidence; full admin role, device, PostgreSQL or visual/build acceptance not yet complete |

All13 requirement rows,50 test scenarios and18 gates remain in their denominators. Full-import completion is not claimed. [Machine-readable matrix](easygas-excel-migration-rtm.json). Prior NO-GO decisions and unrelated work are preserved.
