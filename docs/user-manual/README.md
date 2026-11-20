# EasyGas website audit and user manual

Edition 2, 20 November 2026. Current website: <https://easygas-client-demo.vercel.app>.

The customised manual covers Customer, the sole Admin/business owner, Service Manager, Inventory including finance, Driver and Technician workflows. It retains 31 task chapters, linked contents and 25 genuine client-demo screenshots. Each task explains its entry point, steps, expected result and blocking conditions.

## Deliverables

- [User manual PDF](../../output/pdf/EasyGas-User-Manual.pdf) - 33 pages.
- [Editable Word manual](../../output/manual/EasyGas-User-Manual.docx).
- [Website audit PDF](../../output/pdf/EasyGas-Website-Audit.pdf) - 16 pages: current three-page remediation update plus original 13-page audit.
- [Current remediation traceability](../traceability/audit-remediation-rtm.md) and [original documentation traceability](../traceability/user-manual-rtm.md).

Edition 2 reflects deployed source `b10829a`, Ready client-demo deployment `dpl_Ewd4EFdg7QEGbaAgqxAzBZ4MBiVN`. Nine approved demo-only notices are published; Technician support and verification guidance are repaired; owner authority and unavailable financial values have clearer explanations. The user-approved synthetic qualification/meter renewal expires **19 November 2026 at 18:31:17 UTC**, or **04:31 Brisbane on 20 November**. It is not continuing or real safety certification.

## Current and historical evidence

The original audit inspected all 86 inventoried website surfaces in 109 role-route observations across six roles, plus field workspace subviews. Its [findings](findings.json), route inventory, read-only evidence and original 13 pages are preserved as history. Do not treat their earlier open statuses as the current release result.

[Current results](../audit-remediation/current-results.json), [release report](../audit-remediation/README.md) and [current matrix](../traceability/audit-remediation-rtm.json) retain all seven finding IDs. Five findings are verified within approved demo scope, WEB-A05 remains blocked and WEB-A06 remains partial. Commercial production NO-GO, real staff responsibilities, genuine safety evidence, provider/native/device acceptance, actual-import hold and retain-all remain separate.

Hosted remediation checks preserved all 13 orders, ledger, stock, gas, customer wallet, loyalty settings and 32 original approval requests. Sixteen selected role-access results matched expectations, including ten denials. The only scoped writes were the nine expressly approved demo notices and temporary synthetic QA renewal through product APIs. No hosted DB query, real transaction or new full delivery journey was performed.

All 33 final Word-rendered manual pages and 16 audit pages were opened at original rendered resolution. Contents links, title borders, screenshots, text and table layout passed review. Final Word/PDF identity and credential-text checks are in [artifact validation](evidence/artifact-validation.json) and [visual review](evidence/visual-review.json). The manual PDF is the exact final Word-rendered PDF.

## Rebuild

Use the bundled Codex Python runtime with python-docx, Pillow, ReportLab and pypdf. Run `build_manual.py`, render the Word document with the Documents skill renderer and bundled LibreOffice, copy the emitted PDF, then run `../audit-remediation/build_audit_addendum.py`. The original `build_audit.py` is the historical audit generator; it rewrites original findings and must not overwrite current remediation results. Run `validate_artifacts.py` and inspect all final changed pages. Local render files are ignored under `build/`.

`node --import tsx --test tests/user-manual.test.ts` checks original route/evidence retention, historical findings, final artifacts and matrix scope. The separate remediation tests check current deployment, approved publication, expiry and preservation evidence. Review packets and scripts do not grant permission for future publication or renewal.

Settings editor continuation (20 November): [updated task instructions and desktop/phone previews](settings-change-update.md). The focused editor/review flow replaces the long settings-change modal. This addendum preserves the existing manual and does not reissue its historical PDF/Word edition.

Wallet & Payments refinement (20 November): [current payment configuration guide](wallet-payments-update.md), including direct naira/percentage entry, compact payment methods, optional advanced rules, wallet limits and readable review. Linked screenshots show the deployed web editor. The existing PDF/Word edition remains historical.

Payment category consolidation (20 November): [Payments & Wallet organisation guide](payment-settings-organisation.md) maps the six renamed controls and distinguishes card top-up limits from cash/bank-transfer wallet limits. The three previous Settings categories now share one purpose-based category; existing permissions and financial rules are retained.

Current full Admin Settings navigation (20 November): [nine-category guide and configuration tasks](admin-settings-navigation.md). This supersedes earlier category labels in the historical manual, while retaining all 77 settings, the payment consolidation, search aliases, authority and current values. See the complete audit/mapping and traceability linked from that guide.

Current consolidated Settings acceptance: [roles, typed editors, history and exception tests](admin-settings-acceptance.md). Supplements the nine-category navigation guide; historical PDF/Word editions retained.

Native mobile Orders repair (21 November): [preview instructions and acceptance limits](mobile-orders-preview.md). Includes reloading the existing Expo Go source preview. The owner-session refund finding is now resolved by the [Orders and refunds authority addendum](native-order-refunds.md). Historical manual artifacts retained.

Current sequential mobile acceptance (21 November): [role testing and corrected behaviour](mobile-device-acceptance.md). Covers customer/commercial refunds, independent staff review, seven native component observations, seven repairs, theme and evidence-state corrections, exact older-record selection and hosted-preview restoration. No new native binary or launch waiver.
