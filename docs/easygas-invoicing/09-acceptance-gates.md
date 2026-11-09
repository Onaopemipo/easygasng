# Acceptance gates — 9 November2026

Overall PARTIAL / production NO-GO. Reviewer is Codex local automated/visual review only; independent business/legal/finance signoffs were not given. PASS refers to the stated bounded technical gate; it is not a release approval. All26 gates retained.

|Gate|Requirement|State|Evidence|Remaining work|
|---|---|---|---|---|
|G01|Baseline captured; expected unborn/untracked repository documented|PASS|docs/easygas-invoicing/evidence/baseline-tests.txt|None for this bounded technical gate; separate production gates remain.|
|G02|Actual route/schema/source audit|PASS|docs/easygas-invoicing/evidence/targeted-tests.txt|None for this bounded technical gate; separate production gates remain.|
|G03|Approved design visual parity|PARTIAL|docs/easygas-invoicing/evidence/browser-verification.json|See08 dependency register and09 gate report; missing engineering/provider/legal/device/staging acceptance retained.|
|G04|Actual business identity and no fabricated optional legal details|PARTIAL|docs/easygas-invoicing/evidence/targeted-tests.txt|See08 dependency register and09 gate report; missing engineering/provider/legal/device/staging acceptance retained.|
|G05|Invoice versus verified-receipt semantics|PASS|docs/easygas-invoicing/evidence/targeted-tests.txt|None for this bounded technical gate; separate production gates remain.|
|G06|Historical snapshot immutability|PASS|docs/easygas-invoicing/evidence/final-followup.txt|None for this bounded technical gate; separate production gates remain.|
|G07|Authoritative money/fees and policy|PARTIAL|docs/easygas-invoicing/evidence/targeted-tests.txt|See08 dependency register and09 gate report; missing engineering/provider/legal/device/staging acceptance retained.|
|G08|Committed verified posting only|PASS|docs/easygas-invoicing/evidence/targeted-tests.txt|None for this bounded technical gate; separate production gates remain.|
|G09|Webhook auth/idempotency|PASS|docs/easygas-invoicing/evidence/postgres-tests.txt|None for this bounded technical gate; separate production gates remain.|
|G10|Wallet principal/liability correctness|PASS|docs/easygas-invoicing/evidence/targeted-tests.txt|None for this bounded technical gate; separate production gates remain.|
|G11|All service/phone/POS/add-on integrations|PARTIAL|docs/easygas-invoicing/evidence/application-regression.txt|See08 dependency register and09 gate report; missing engineering/provider/legal/device/staging acceptance retained.|
|G12|Provider refund confirmation and credit notes|BLOCKED|docs/easygas-invoicing/evidence/targeted-tests.txt|See08 dependency register and09 gate report; missing engineering/provider/legal/device/staging acceptance retained.|
|G13|Independent approvals|PASS|docs/easygas-invoicing/evidence/postgres-tests.txt|None for this bounded technical gate; separate production gates remain.|
|G14|RBAC/customer/branch isolation|PASS|docs/easygas-invoicing/evidence/targeted-tests.txt|None for this bounded technical gate; separate production gates remain.|
|G15|PDF rendering and full accessibility|PARTIAL|docs/easygas-invoicing/evidence/final-followup.txt|See08 dependency register and09 gate report; missing engineering/provider/legal/device/staging acceptance retained.|
|G16|Customer and installed mobile download|PARTIAL|docs/easygas-invoicing/evidence/mobile-types.txt|See08 dependency register and09 gate report; missing engineering/provider/legal/device/staging acceptance retained.|
|G17|Document resend/notification lifecycle|BLOCKED||See08 dependency register and09 gate report; missing engineering/provider/legal/device/staging acceptance retained.|
|G18|Actual merchant settlement reconciliation|BLOCKED||See08 dependency register and09 gate report; missing engineering/provider/legal/device/staging acceptance retained.|
|G19|Audit trail|PASS|docs/easygas-invoicing/evidence/targeted-tests.txt|None for this bounded technical gate; separate production gates remain.|
|G20|Existing unique numbering/idempotent issue|PASS|docs/easygas-invoicing/evidence/postgres-tests.txt|None for this bounded technical gate; separate production gates remain.|
|G21|Staging migration dry run|PARTIAL|docs/easygas-invoicing/evidence/postgres-tests.txt|See08 dependency register and09 gate report; missing engineering/provider/legal/device/staging acceptance retained.|
|G22|Release backup/restore/rollback|PARTIAL|docs/easygas-invoicing/evidence/final-followup.txt|See08 dependency register and09 gate report; missing engineering/provider/legal/device/staging acceptance retained.|
|G23|Production performance/security|PARTIAL|docs/easygas-invoicing/evidence/final-followup.txt|See08 dependency register and09 gate report; missing engineering/provider/legal/device/staging acceptance retained.|
|G24|Regression across all installed apps|PARTIAL|docs/easygas-invoicing/evidence/application-regression.txt|See08 dependency register and09 gate report; missing engineering/provider/legal/device/staging acceptance retained.|
|G25|Business/legal/finance signoff|BLOCKED||See08 dependency register and09 gate report; missing engineering/provider/legal/device/staging acceptance retained.|
|G26|No unapproved live activation|PASS|docs/easygas-invoicing/evidence/application-regression.txt|None for this bounded technical gate; separate production gates remain.|

Critical engineering: provider refund/settlement confirmation, POS/manual-credit PDF semantics, document resend/attachments and production-volume/status-filter work. External/deferred acceptance: actual verified identity/tax policy, merchant sandbox walkthrough, native/device/assistive review, staged backup/restore/deployment and stakeholder signoff. These are separate dependencies; neither set silently removes the other from scope.
