# Website audit remediation release

20 November 2026. The client demo now runs exact application source `b10829aa447a7ae5bd430a73f9644e2feca854a6` on Ready deployment `dpl_Ewd4EFdg7QEGbaAgqxAzBZ4MBiVN` at <https://easygas-client-demo.vercel.app>. Previous Ready deployment `dpl_7rBejjBZL91bqowRZBUAQsekjAJL` remains the rollback reference. No schema or environment change was needed.

## Implemented and verified

- WEB-A01: published the exact nine user-approved **demo-only** notices through existing owner authority. Normal public API reads verified content hashes, version 2 and effective publication; every public page was reopened. Dates display Lagos time. Commercial policies are still a separate production gate.
- WEB-A02: Technician Home Contact support opens `/contact`. The actual staff click succeeds and customer conversation access remains denied.
- WEB-A03: email verification now explains verification links and routes users to Account & privacy for a resend. Isolated tests cover valid tokens, expiry, wrong purpose and replay. No external recovery message was sent during remediation.
- WEB-A04: the approved synthetic QA renewal covers four existing labelled accounts and the existing sandbox meter. Independent verification, recent identity checks and current meter evidence remain enforced. Wrong-role recalibration and a past expiry were rejected. Expired/stale guards passed in isolated tests. No new full hosted delivery journey was performed.
- WEB-A07: dashboard, finance and inventory explain that unavailable profit/value means incomplete cost evidence. The manual preserves unknown GPS/ETA and native/device limits.

Policy publication and the temporary renewal were explicitly approved in this chat after the exact [notice packet](POLICY-REVIEW.md) and [renewal packet](RENEWAL-REVIEW.md) were prepared. Those review packets remain unchanged as the approval record. Executed results are [current-results.json](current-results.json), [policy publication](evidence/policy-publication.json) and [renewal](evidence/qa-renewal.json).

**Renewal expiry:** 19 November 2026 at **18:31:17.495 UTC**, **19:31 Lagos**, or **04:31 Brisbane on 20 November**. There is no automatic extension. Later synthetic use requires a fresh authorised renewal. Real operation requires genuine qualifications and physical calibration evidence.

## Still open

WEB-A05 remains **BLOCKED**: commercial production NO-GO, nine unresolved high/critical incidents and existing provider, monitoring, restore, privacy, physical, native/device and release evidence gaps remain. Actual-import hold and retain-all are unchanged.

WEB-A06 is **PARTIAL**: UI/readiness now explicitly supports one Admin/business owner. Eligible public policy publication uses the existing sole-owner authority. Real company maker, reviewer and executor responsibilities for restricted actions still need confirmation by the owner. Existing QA reviewer accounts are not a real staffing arrangement. No new Admin, shared identity or bypass was introduced.

All seven original findings and both release/documentation requirements remain in the [traceability matrix](../traceability/audit-remediation-rtm.md): **7/9 verified**, **0/1 critical commercial requirement verified**, **zero exclusions**. Five findings are verified only within the explicitly approved demo scope; this is not commercial release acceptance.

## Verification evidence

The focused [acceptance suite](evidence/acceptance-tests.txt) passed 15/15 checks, including token, authority, meter and exact hosted-evidence validation. Build and sequential typecheck passed; cloud build and stable Ready identity were read back. [Hosted verification](evidence/hosted-readback.json) returned all 16 expected role results, including ten denials. It preserved all 13 original orders, ledger, inventory, gas, customer wallet, effective loyalty policy and all 32 original approval requests. Only the nine approved policy changes and explicitly approved synthetic safety evidence were written through normal product APIs. No hosted DB connection or direct query was used.

[Browser evidence](evidence/browser-checks.json) records affected public pages and staff flows. Desktop captures verify policy publication, technician contact, verification guidance, financial notes and readiness. The 390 by 844 privacy capture was visually checked. Verification guidance was observed in the phone DOM; its first screenshot caught a transient loading state and is not counted as accepted visual evidence. Viewport overrides were reset and the existing owner workspace restored.

The initial wider regression found five test/evidence-maintenance failures: a word-count assertion, missing RTM route/log mappings, two stale earlier redesign hash chains and an old inline Approve label expectation. Actual existing source was compared byte-for-byte to the previously deployed reviewed revision before recording those continuations. Historical hashes remain retained. Rechecks passed. The final full suite passed **829 tests with zero failures**, with **28 skipped** out of 857 registered tests, as recorded in [regression-final.txt](evidence/regression-final.txt). The separately rerun final acceptance suite passed 15/15 and matrix/document suite 6/6. Skipped PostgreSQL tests remain untested, not counted as passes. PDF fixtures regenerated by tests are unrelated to this release and are not included.

## Updated documentation

- [User manual PDF](../../output/pdf/EasyGas-User-Manual.pdf) and [editable Word](../../output/manual/EasyGas-User-Manual.docx): Edition 2, 33 pages, 31 linked task chapters and 25 genuine screenshots.
- [Website audit PDF](../../output/pdf/EasyGas-Website-Audit.pdf): three current remediation pages followed by the unchanged original 13-page audit. Historical open findings remain visible as history.
- [Artifact integrity](../user-manual/evidence/artifact-validation.json) and [visual review](../user-manual/evidence/visual-review.json): every final manual and audit page inspected. Two final corrected manual pages were reopened; the other 31 rendered PNG hashes matched their reviewed versions. The manual PDF is the exact final Word-rendered PDF.

Use the bundled Codex Python runtime to rebuild the manual and `build_audit_addendum.py`. The original `docs/user-manual/build_audit.py` rebuilds historical findings and must not be used to overwrite current remediation status. Review packets and renewal/publication scripts are not standing authorisation to repeat writes.
