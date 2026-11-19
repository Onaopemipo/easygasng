# EasyGas website audit and user manual

Edition 1, 20 November 2026. Current website: <https://easygas-client-demo.vercel.app>.

The customised manual covers Customer, the sole Admin/business owner, Service Manager, Inventory including finance, Driver and Technician workflows. It includes 31 task chapters, linked contents and 25 genuine client-demo screenshots. Each task explains the entry point, steps, expected result and blocking conditions. The separate audit distinguishes reproduced defects, unpublished customer information, operational prerequisites and existing release holds.

## Deliverables

- [User manual PDF](../../output/pdf/EasyGas-User-Manual.pdf) - 33 pages.
- [Editable Word manual](../../output/manual/EasyGas-User-Manual.docx).
- [Website audit PDF](../../output/pdf/EasyGas-Website-Audit.pdf) - 13 pages.
- [Requirements traceability](../traceability/user-manual-rtm.md) and [machine-readable matrix](../traceability/user-manual-rtm.json).

The relative output links above are from this directory; final files also appear under the repository `output` directory. The audit baseline is source `35ed307b0e38477ad1d70adacd87a0f02f4949a5`, deployment `dpl_7rBejjBZL91bqowRZBUAQsekjAJL`. A fresh Vercel read confirmed that the stable demo still resolves to that Ready deployment. No deployment was performed.

## Executed scope

All 86 inventoried route surfaces were opened, including 30 Admin routes, public/customer areas, eight product details, three service details and three special entry points. There are 109 stored role-route observations plus Driver and Technician subviews. Source inspection supplied later conditional workflow descriptions where current QA lists were empty; no fake records were created for screenshots.

[Route coverage](evidence/route-coverage.json), [browser observations](evidence/browser-audit.json), [subviews](evidence/subviews.json), [selected access boundaries](evidence/role-boundaries.json), [final business preservation](evidence/business-after.json), [artifact integrity](evidence/artifact-validation.json) and [full visual review](evidence/visual-review.json) preserve the actual evidence. Fifteen selected HTTP checks returned their expected status, including nine negative controls. The final normal product readbacks match the pre-audit 13 orders, ledger, inventory, gas, customer wallet and current loyalty policy. No hosted DB connection or direct query was used.

All 33 final Word-rendered manual pages and 13 audit pages were opened at original rendered resolution for visual inspection. Title borders, contents links, screenshot crops and table spacing were corrected before final acceptance. The manual PDF is the exact PDF emitted by the Word renderer. Its 31 contents links, topic bookmarks, 25 embedded screenshots and searchable text were checked.

## Findings remain open

[Seven findings](findings.json) remain in scope, with zero closed:

- WEB-A01 High - eight customer policy pages await business publication.
- WEB-A02 Medium - Technician Contact support opens a customer-only page and returns a permission error.
- WEB-A03 Low - missing-token email verification copy refers to a reset link.
- WEB-A04 High, blocked - active sandbox meter calibration expired at 11:53:44 UTC on 19 November. No renewal performed.
- WEB-A05 Critical, blocked - existing commercial production NO-GO and open release/incident gates remain.
- WEB-A06 Medium - confirm a workable real maker/reviewer arrangement for restricted actions under the sole-owner company structure.
- WEB-A07 Information - unavailable profit/valuation and unknown GPS/ETA need accurate interpretation; no calculation/telemetry defect established.

This is a read-only audit, not full transactional, security, accessibility, native/device, physical or live-provider certification. Valid token consumption and new financial/stock/approval/service-completion actions were not submitted. Mobile checks are representative sign-in and approvals only. Historical synthetic acceptance and GA4 receiver verification are preserved without being re-claimed as current tests. Commercial production NO-GO, actual-import hold, retain-all and unrelated work are unchanged.

## Rebuild and verification

Use the Codex bundled Python runtime with `python-docx`, Pillow, ReportLab and pypdf to run `build_manual.py`, `build_audit.py` and `validate_artifacts.py`. Render the Word document with the Documents skill `render_docx.py --emit_pdf`; use bundled LibreOffice, not desktop LibreOffice. Render the audit PDF with Poppler. After any change, inspect every final rendered page again and refresh the visual-review manifest and artifact hashes. Local render intermediates live under ignored `build/`.

`node --test tests/user-manual.test.ts` checks scope/evidence retention, open findings, artifact identity and matrix completeness. Hosted access probes were executed by `scripts/audit-user-manual.mjs`; the separate final readback is `scripts/manual-preservation.mjs`. They use existing private QA login helpers, never embed credentials in documentation, and perform no business mutations. Do not rerun hosted probes unless a new acceptance pass is needed.
