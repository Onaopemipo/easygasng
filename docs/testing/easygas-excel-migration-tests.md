# Excel audit verification — 5 November 2026

Scope: read-only audit, reconciliation and preview. Actual import is withheld. No application or schema changes.

Executed evidence:
- Baseline: 294 tests, 283 passed, 0 failed, 11 PostgreSQL-dependent skipped (`../audits/excel-evidence/baseline.txt`).
- Python: 11 tests passed through the Node wrapper; formula-only exclusion, date systems, phone preservation, candidate-only identity, mixed events, stock cutoff, malformed receipts, stable provenance, effect exclusion and output escaping (`../../tests/excel/test_preview.py`).
- Node wrapper: 2 passed, 0 failed (`../audits/excel-evidence/validation.txt`).
- Independent read-only openpyxl calculation agrees with eight primary controls (`../audits/excel-evidence/independent-check.json`).
- Isolated target copy: read-only transaction, write guard rejected, logical counts unchanged (`../audits/excel-evidence/target-readonly-summary.json`). Disposable copy removed after extraction.
- HTML structure/CSP/local links and original hash checked (`../audits/excel-evidence/preview-qa.json`). Browser security refused local-file opening: visual QA NOT_TESTED; no bypass attempted.

Full MIG-01 through MIG-50 acceptance remains in the denominator. The following are evidence subsets, not declarations that broad importer scenarios passed:

| MIG IDs | Executed subset | Broader acceptance |
|---|---|---|
| 01–05 | Workbook, formula/cache, date and phone reading | Preview subset PASS |
| 06–08 | Candidate-only matching, no name merge | Customer identity decisions BLOCKED |
| 09 | No actual historical order persistence | BLOCKED |
| 10–12 | Source mixed-event/mass/price interpretation | Customer semantics BLOCKED |
| 13–17 | Future/undated stock and historical fee diagnostics | Physical balance and fees BLOCKED |
| 18–20 | Numeric receipt parsing, malformed/blank exclusion | Settlement confirmation BLOCKED |
| 21–25 | Stable preview provenance/IDs and no commit | Actual importer idempotency/approval NOT_TESTED |
| 26–28 | No target import performed | BLOCKED |
| 29–39 | No stock/financial/reward/message/refill/dispatch/custody effects; uncertain history excluded | Actual committed integration NOT_TESTED |
| 40–41 | No actual importer recovery/concurrency | BLOCKED |
| 42–43 | CSV/HTML escaping | Full admin permission/device QA NOT_TESTED |
| 44–46 | No actual commit/recovery | BLOCKED |
| 47–48 | Actual workbook totals and stock cutoff diagnostics | Customer acceptance BLOCKED |
| 49–50 | Baseline and documentation | Final production build/release acceptance NOT_TESTED |

No production-ready, signed-native, crash-recovery or live database-import acceptance is inferred from these preview tests.
