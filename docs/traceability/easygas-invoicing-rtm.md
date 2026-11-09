# Invoice and receipt requirements traceability

Overall PARTIAL / production NO-GO unchanged.18 scope sections,80 scenarios and26 gates retained; no NOT_APPLICABLE exclusions. Counts below describe bounded evidence, not whole-platform production readiness.

## INV-DOC-01 — Preflight repository audit and baseline

Status: VERIFIED_COMPLETE; gate G01. Audit and baseline completed before implementation; prior untracked work and all release holds preserved.

Data: Existing customer_invoices immutable issued snapshot/sequence; approved invoice_notes; verified_payments/refunds; payment_postings + immutable intent quote; existing users,branches,governed document.identity/website.content. No new financial ledger.

Controls: Authenticated own/role/branch reads; recent independent financial approval; server-verified posting/evidence; immutable history; exact integer kobo; trusted local assets; private/no-store PDFs; sandbox and activation gates preserved.

Implementation: `docs/easygas-invoicing/01-repository-audit.md`, `docs/easygas-invoicing/06-test-evidence.md`

Executed tests: `tests/financial-document.test.ts`, `tests/financial-document-pdf.test.ts`, `tests/financial-document-integration.test.ts`, `tests/paystack-orchestration.test.ts`, `tests/paystack-postgres.test.ts`, `tests/service-invoices-postgres.test.ts`. PASS:92 focused tests,46 application regression tests,3 independent PostgreSQL checks;74 overlapping final followups. Web/native types and web build recorded separately; no native build or live merchant call.

Outstanding: None for audit-only scope.

## INV-DOC-02 — Discovery matrix and canonical source reuse

Status: PARTIAL; gate G02. Bounded existing-module implementation and local evidence delivered; complete specification acceptance is not met. Missing engineering and provider/legal/device/staging gates remain in denominator.

Data: Existing customer_invoices immutable issued snapshot/sequence; approved invoice_notes; verified_payments/refunds; payment_postings + immutable intent quote; existing users,branches,governed document.identity/website.content. No new financial ledger.

Controls: Authenticated own/role/branch reads; recent independent financial approval; server-verified posting/evidence; immutable history; exact integer kobo; trusted local assets; private/no-store PDFs; sandbox and activation gates preserved.

Implementation: `docs/easygas-invoicing/02-route-matrix.md`, `apps/web/lib/financial-documents.ts`

Executed tests: `tests/financial-document.test.ts`, `tests/financial-document-pdf.test.ts`, `tests/financial-document-integration.test.ts`, `tests/paystack-orchestration.test.ts`, `tests/paystack-postgres.test.ts`, `tests/service-invoices-postgres.test.ts`. PASS:92 focused tests,46 application regression tests,3 independent PostgreSQL checks;74 overlapping final followups. Web/native types and web build recorded separately; no native build or live merchant call.

Outstanding: See08 dependency register,09 gate report and80-scenario registry: POS/manual-credit PDF, production-volume status-filter acceptance, document resend/attachments, provider refunds/settlements, native/device/accessibility/volume/staging and stakeholder acceptance remain.

## INV-DOC-03 — Approved visual hierarchy and versioned PDF/preview components

Status: PARTIAL; gate G03. Bounded existing-module implementation and local evidence delivered; complete specification acceptance is not met. Missing engineering and provider/legal/device/staging gates remain in denominator.

Data: Existing customer_invoices immutable issued snapshot/sequence; approved invoice_notes; verified_payments/refunds; payment_postings + immutable intent quote; existing users,branches,governed document.identity/website.content. No new financial ledger.

Controls: Authenticated own/role/branch reads; recent independent financial approval; server-verified posting/evidence; immutable history; exact integer kobo; trusted local assets; private/no-store PDFs; sandbox and activation gates preserved.

Implementation: `packages/business-rules/src/financial-document.ts`, `apps/web/lib/invoice-pdf.ts`, `apps/web/components/financial-document.tsx`, `apps/web/app/globals.css`, `apps/web/assets/fonts/NotoSans-Bold.ttf`

Executed tests: `tests/financial-document.test.ts`, `tests/financial-document-pdf.test.ts`, `tests/financial-document-integration.test.ts`, `tests/paystack-orchestration.test.ts`, `tests/paystack-postgres.test.ts`, `tests/service-invoices-postgres.test.ts`. PASS:92 focused tests,46 application regression tests,3 independent PostgreSQL checks;74 overlapping final followups. Web/native types and web build recorded separately; no native build or live merchant call.

Outstanding: See08 dependency register,09 gate report and80-scenario registry: POS/manual-credit PDF, production-volume status-filter acceptance, document resend/attachments, provider refunds/settlements, native/device/accessibility/volume/staging and stakeholder acceptance remain.

## INV-DOC-04 — Verified optional business identity and independent settings approval

Status: PARTIAL; gate G04. Bounded existing-module implementation and local evidence delivered; complete specification acceptance is not met. Missing engineering and provider/legal/device/staging gates remain in denominator.

Data: Existing customer_invoices immutable issued snapshot/sequence; approved invoice_notes; verified_payments/refunds; payment_postings + immutable intent quote; existing users,branches,governed document.identity/website.content. No new financial ledger.

Controls: Authenticated own/role/branch reads; recent independent financial approval; server-verified posting/evidence; immutable history; exact integer kobo; trusted local assets; private/no-store PDFs; sandbox and activation gates preserved.

Implementation: `apps/web/lib/document-identity.ts`, `apps/web/lib/governance.ts`, `apps/web/components/admin.tsx`, `database/migrations/072_document_identity.sql`

Executed tests: `tests/financial-document.test.ts`, `tests/financial-document-pdf.test.ts`, `tests/financial-document-integration.test.ts`, `tests/paystack-orchestration.test.ts`, `tests/paystack-postgres.test.ts`, `tests/service-invoices-postgres.test.ts`. PASS:92 focused tests,46 application regression tests,3 independent PostgreSQL checks;74 overlapping final followups. Web/native types and web build recorded separately; no native build or live merchant call.

Outstanding: See08 dependency register,09 gate report and80-scenario registry: POS/manual-credit PDF, production-volume status-filter acceptance, document resend/attachments, provider refunds/settlements, native/device/accessibility/volume/staging and stakeholder acceptance remain.

## INV-DOC-05 — Immutable document contract, states and existing numbering

Status: PARTIAL; gate G06. Bounded existing-module implementation and local evidence delivered; complete specification acceptance is not met. Missing engineering and provider/legal/device/staging gates remain in denominator.

Data: Existing customer_invoices immutable issued snapshot/sequence; approved invoice_notes; verified_payments/refunds; payment_postings + immutable intent quote; existing users,branches,governed document.identity/website.content. No new financial ledger.

Controls: Authenticated own/role/branch reads; recent independent financial approval; server-verified posting/evidence; immutable history; exact integer kobo; trusted local assets; private/no-store PDFs; sandbox and activation gates preserved.

Implementation: `apps/web/lib/invoices.ts`, `apps/web/lib/service-invoices.ts`, `apps/web/lib/payments/documents.ts`, `packages/business-rules/src/financial-document.ts`

Executed tests: `tests/financial-document.test.ts`, `tests/financial-document-pdf.test.ts`, `tests/financial-document-integration.test.ts`, `tests/paystack-orchestration.test.ts`, `tests/paystack-postgres.test.ts`, `tests/service-invoices-postgres.test.ts`. PASS:92 focused tests,46 application regression tests,3 independent PostgreSQL checks;74 overlapping final followups. Web/native types and web build recorded separately; no native build or live merchant call.

Outstanding: See08 dependency register,09 gate report and80-scenario registry: POS/manual-credit PDF, production-volume status-filter acceptance, document resend/attachments, provider refunds/settlements, native/device/accessibility/volume/staging and stakeholder acceptance remain.

## INV-DOC-06 — Exact principal, fees, totals, tax, discounts and liability semantics

Status: PARTIAL; gate G07. Bounded existing-module implementation and local evidence delivered; complete specification acceptance is not met. Missing engineering and provider/legal/device/staging gates remain in denominator.

Data: Existing customer_invoices immutable issued snapshot/sequence; approved invoice_notes; verified_payments/refunds; payment_postings + immutable intent quote; existing users,branches,governed document.identity/website.content. No new financial ledger.

Controls: Authenticated own/role/branch reads; recent independent financial approval; server-verified posting/evidence; immutable history; exact integer kobo; trusted local assets; private/no-store PDFs; sandbox and activation gates preserved.

Implementation: `packages/business-rules/src/financial-document.ts`, `packages/business-rules/src/payment-fees.ts`, `apps/web/lib/invoice-corrections.ts`, `apps/web/lib/payments/documents.ts`

Executed tests: `tests/financial-document.test.ts`, `tests/financial-document-pdf.test.ts`, `tests/financial-document-integration.test.ts`, `tests/paystack-orchestration.test.ts`, `tests/paystack-postgres.test.ts`, `tests/service-invoices-postgres.test.ts`. PASS:92 focused tests,46 application regression tests,3 independent PostgreSQL checks;74 overlapping final followups. Web/native types and web build recorded separately; no native build or live merchant call.

Outstanding: See08 dependency register,09 gate report and80-scenario registry: POS/manual-credit PDF, production-volume status-filter acceptance, document resend/attachments, provider refunds/settlements, native/device/accessibility/volume/staging and stakeholder acceptance remain.

## INV-DOC-07 — All A–K end-to-end document entry points

Status: PARTIAL; gate G11. Bounded existing-module implementation and local evidence delivered; complete specification acceptance is not met. Missing engineering and provider/legal/device/staging gates remain in denominator.

Data: Existing customer_invoices immutable issued snapshot/sequence; approved invoice_notes; verified_payments/refunds; payment_postings + immutable intent quote; existing users,branches,governed document.identity/website.content. No new financial ledger.

Controls: Authenticated own/role/branch reads; recent independent financial approval; server-verified posting/evidence; immutable history; exact integer kobo; trusted local assets; private/no-store PDFs; sandbox and activation gates preserved.

Implementation: `apps/web/components/order-invoice.tsx`, `apps/web/components/site.tsx`, `apps/web/components/reconciliation.tsx`, `apps/mobile/Invoices.tsx`, `docs/easygas-invoicing/02-route-matrix.md`

Executed tests: `tests/financial-document.test.ts`, `tests/financial-document-pdf.test.ts`, `tests/financial-document-integration.test.ts`, `tests/paystack-orchestration.test.ts`, `tests/paystack-postgres.test.ts`, `tests/service-invoices-postgres.test.ts`. PASS:92 focused tests,46 application regression tests,3 independent PostgreSQL checks;74 overlapping final followups. Web/native types and web build recorded separately; no native build or live merchant call.

Outstanding: See08 dependency register,09 gate report and80-scenario registry: POS/manual-credit PDF, production-volume status-filter acceptance, document resend/attachments, provider refunds/settlements, native/device/accessibility/volume/staging and stakeholder acceptance remain.

## INV-DOC-08 — Existing route/surface/navigation coverage

Status: PARTIAL; gate G02. Bounded existing-module implementation and local evidence delivered; complete specification acceptance is not met. Missing engineering and provider/legal/device/staging gates remain in denominator.

Data: Existing customer_invoices immutable issued snapshot/sequence; approved invoice_notes; verified_payments/refunds; payment_postings + immutable intent quote; existing users,branches,governed document.identity/website.content. No new financial ledger.

Controls: Authenticated own/role/branch reads; recent independent financial approval; server-verified posting/evidence; immutable history; exact integer kobo; trusted local assets; private/no-store PDFs; sandbox and activation gates preserved.

Implementation: `docs/easygas-invoicing/02-route-matrix.md`, `apps/web/components/document-library.tsx`, `apps/web/lib/financial-documents.ts`, `apps/web/app/api/invoices/[orderId]/route.ts`

Executed tests: `tests/financial-document.test.ts`, `tests/financial-document-pdf.test.ts`, `tests/financial-document-integration.test.ts`, `tests/paystack-orchestration.test.ts`, `tests/paystack-postgres.test.ts`, `tests/service-invoices-postgres.test.ts`. PASS:92 focused tests,46 application regression tests,3 independent PostgreSQL checks;74 overlapping final followups. Web/native types and web build recorded separately; no native build or live merchant call.

Outstanding: See08 dependency register,09 gate report and80-scenario registry: POS/manual-credit PDF, production-volume status-filter acceptance, document resend/attachments, provider refunds/settlements, native/device/accessibility/volume/staging and stakeholder acceptance remain.

## INV-DOC-09 — Paystack verified posting, webhook and permission integrity

Status: PARTIAL; gate G09. Bounded existing-module implementation and local evidence delivered; complete specification acceptance is not met. Missing engineering and provider/legal/device/staging gates remain in denominator.

Data: Existing customer_invoices immutable issued snapshot/sequence; approved invoice_notes; verified_payments/refunds; payment_postings + immutable intent quote; existing users,branches,governed document.identity/website.content. No new financial ledger.

Controls: Authenticated own/role/branch reads; recent independent financial approval; server-verified posting/evidence; immutable history; exact integer kobo; trusted local assets; private/no-store PDFs; sandbox and activation gates preserved.

Implementation: `apps/web/lib/payments/orchestrator.ts`, `apps/web/lib/payments/paystack-provider.ts`, `apps/web/lib/payments/webhooks.ts`, `apps/web/lib/payments/documents.ts`, `apps/web/app/api/payments/paystack/[operation]/route.ts`

Executed tests: `tests/financial-document.test.ts`, `tests/financial-document-pdf.test.ts`, `tests/financial-document-integration.test.ts`, `tests/paystack-orchestration.test.ts`, `tests/paystack-postgres.test.ts`, `tests/service-invoices-postgres.test.ts`. PASS:92 focused tests,46 application regression tests,3 independent PostgreSQL checks;74 overlapping final followups. Web/native types and web build recorded separately; no native build or live merchant call.

Outstanding: See08 dependency register,09 gate report and80-scenario registry: POS/manual-credit PDF, production-volume status-filter acceptance, document resend/attachments, provider refunds/settlements, native/device/accessibility/volume/staging and stakeholder acceptance remain.

## INV-DOC-10 — Admin search/filter/download/resend and diagnostics

Status: PARTIAL; gate G17. Bounded existing-module implementation and local evidence delivered; complete specification acceptance is not met. Missing engineering and provider/legal/device/staging gates remain in denominator.

Data: Existing customer_invoices immutable issued snapshot/sequence; approved invoice_notes; verified_payments/refunds; payment_postings + immutable intent quote; existing users,branches,governed document.identity/website.content. No new financial ledger.

Controls: Authenticated own/role/branch reads; recent independent financial approval; server-verified posting/evidence; immutable history; exact integer kobo; trusted local assets; private/no-store PDFs; sandbox and activation gates preserved.

Implementation: `apps/web/components/document-library.tsx`, `apps/web/lib/financial-documents.ts`, `apps/web/components/reconciliation.tsx`, `apps/web/components/admin.tsx`

Executed tests: `tests/financial-document.test.ts`, `tests/financial-document-pdf.test.ts`, `tests/financial-document-integration.test.ts`, `tests/paystack-orchestration.test.ts`, `tests/paystack-postgres.test.ts`, `tests/service-invoices-postgres.test.ts`. PASS:92 focused tests,46 application regression tests,3 independent PostgreSQL checks;74 overlapping final followups. Web/native types and web build recorded separately; no native build or live merchant call.

Outstanding: See08 dependency register,09 gate report and80-scenario registry: POS/manual-credit PDF, production-volume status-filter acceptance, document resend/attachments, provider refunds/settlements, native/device/accessibility/volume/staging and stakeholder acceptance remain.

## INV-DOC-11 — Customer and installed mobile document history/download/share

Status: PARTIAL; gate G16. Bounded existing-module implementation and local evidence delivered; complete specification acceptance is not met. Missing engineering and provider/legal/device/staging gates remain in denominator.

Data: Existing customer_invoices immutable issued snapshot/sequence; approved invoice_notes; verified_payments/refunds; payment_postings + immutable intent quote; existing users,branches,governed document.identity/website.content. No new financial ledger.

Controls: Authenticated own/role/branch reads; recent independent financial approval; server-verified posting/evidence; immutable history; exact integer kobo; trusted local assets; private/no-store PDFs; sandbox and activation gates preserved.

Implementation: `apps/mobile/Invoices.tsx`, `apps/web/components/site.tsx`, `apps/web/components/document-library.tsx`, `apps/web/components/order-invoice.tsx`

Executed tests: `tests/financial-document.test.ts`, `tests/financial-document-pdf.test.ts`, `tests/financial-document-integration.test.ts`, `tests/paystack-orchestration.test.ts`, `tests/paystack-postgres.test.ts`, `tests/service-invoices-postgres.test.ts`. PASS:92 focused tests,46 application regression tests,3 independent PostgreSQL checks;74 overlapping final followups. Web/native types and web build recorded separately; no native build or live merchant call.

Outstanding: See08 dependency register,09 gate report and80-scenario registry: POS/manual-credit PDF, production-volume status-filter acceptance, document resend/attachments, provider refunds/settlements, native/device/accessibility/volume/staging and stakeholder acceptance remain.

## INV-DOC-12 — Backward compatibility, no backfill and migration safety

Status: PARTIAL; gate G21. Bounded existing-module implementation and local evidence delivered; complete specification acceptance is not met. Missing engineering and provider/legal/device/staging gates remain in denominator.

Data: Existing customer_invoices immutable issued snapshot/sequence; approved invoice_notes; verified_payments/refunds; payment_postings + immutable intent quote; existing users,branches,governed document.identity/website.content. No new financial ledger.

Controls: Authenticated own/role/branch reads; recent independent financial approval; server-verified posting/evidence; immutable history; exact integer kobo; trusted local assets; private/no-store PDFs; sandbox and activation gates preserved.

Implementation: `apps/web/lib/invoice-pdf-legacy.ts`, `apps/web/lib/invoice-pdf.ts`, `apps/web/lib/db.ts`, `database/migrations/072_document_identity.sql`, `database/bootstrap.sql`, `scripts/export-bootstrap.ts`

Executed tests: `tests/financial-document.test.ts`, `tests/financial-document-pdf.test.ts`, `tests/financial-document-integration.test.ts`, `tests/paystack-orchestration.test.ts`, `tests/paystack-postgres.test.ts`, `tests/service-invoices-postgres.test.ts`. PASS:92 focused tests,46 application regression tests,3 independent PostgreSQL checks;74 overlapping final followups. Web/native types and web build recorded separately; no native build or live merchant call.

Outstanding: See08 dependency register,09 gate report and80-scenario registry: POS/manual-credit PDF, production-volume status-filter acceptance, document resend/attachments, provider refunds/settlements, native/device/accessibility/volume/staging and stakeholder acceptance remain.

## INV-DOC-13 — At least80 explicit scenarios across all8 requested groups

Status: PARTIAL; gate G24. Bounded existing-module implementation and local evidence delivered; complete specification acceptance is not met. Missing engineering and provider/legal/device/staging gates remain in denominator.

Data: Existing customer_invoices immutable issued snapshot/sequence; approved invoice_notes; verified_payments/refunds; payment_postings + immutable intent quote; existing users,branches,governed document.identity/website.content. No new financial ledger.

Controls: Authenticated own/role/branch reads; recent independent financial approval; server-verified posting/evidence; immutable history; exact integer kobo; trusted local assets; private/no-store PDFs; sandbox and activation gates preserved.

Implementation: `tests/financial-document.test.ts`, `tests/financial-document-pdf.test.ts`, `tests/financial-document-integration.test.ts`, `docs/easygas-invoicing/06-test-evidence.md`

Executed tests: `tests/financial-document.test.ts`, `tests/financial-document-pdf.test.ts`, `tests/financial-document-integration.test.ts`, `tests/paystack-orchestration.test.ts`, `tests/paystack-postgres.test.ts`, `tests/service-invoices-postgres.test.ts`. PASS:92 focused tests,46 application regression tests,3 independent PostgreSQL checks;74 overlapping final followups. Web/native types and web build recorded separately; no native build or live merchant call.

Outstanding: See08 dependency register,09 gate report and80-scenario registry: POS/manual-credit PDF, production-volume status-filter acceptance, document resend/attachments, provider refunds/settlements, native/device/accessibility/volume/staging and stakeholder acceptance remain.

## INV-DOC-14 — All26 acceptance gates with actual reviewer/evidence

Status: PARTIAL; gate G25. Bounded existing-module implementation and local evidence delivered; complete specification acceptance is not met. Missing engineering and provider/legal/device/staging gates remain in denominator.

Data: Existing customer_invoices immutable issued snapshot/sequence; approved invoice_notes; verified_payments/refunds; payment_postings + immutable intent quote; existing users,branches,governed document.identity/website.content. No new financial ledger.

Controls: Authenticated own/role/branch reads; recent independent financial approval; server-verified posting/evidence; immutable history; exact integer kobo; trusted local assets; private/no-store PDFs; sandbox and activation gates preserved.

Implementation: `docs/easygas-invoicing/09-acceptance-gates.md`, `docs/easygas-invoicing/08-deployment-rollback-recovery.md`

Executed tests: `tests/financial-document.test.ts`, `tests/financial-document-pdf.test.ts`, `tests/financial-document-integration.test.ts`, `tests/paystack-orchestration.test.ts`, `tests/paystack-postgres.test.ts`, `tests/service-invoices-postgres.test.ts`. PASS:92 focused tests,46 application regression tests,3 independent PostgreSQL checks;74 overlapping final followups. Web/native types and web build recorded separately; no native build or live merchant call.

Outstanding: See08 dependency register,09 gate report and80-scenario registry: POS/manual-credit PDF, production-volume status-filter acceptance, document resend/attachments, provider refunds/settlements, native/device/accessibility/volume/staging and stakeholder acceptance remain.

## INV-DOC-15 — Dependency-ordered incremental execution without activation

Status: PARTIAL; gate G26. Bounded existing-module implementation and local evidence delivered; complete specification acceptance is not met. Missing engineering and provider/legal/device/staging gates remain in denominator.

Data: Existing customer_invoices immutable issued snapshot/sequence; approved invoice_notes; verified_payments/refunds; payment_postings + immutable intent quote; existing users,branches,governed document.identity/website.content. No new financial ledger.

Controls: Authenticated own/role/branch reads; recent independent financial approval; server-verified posting/evidence; immutable history; exact integer kobo; trusted local assets; private/no-store PDFs; sandbox and activation gates preserved.

Implementation: `docs/easygas-invoicing/01-repository-audit.md`, `docs/easygas-invoicing/08-deployment-rollback-recovery.md`, `apps/web/lib/document-identity.ts`

Executed tests: `tests/financial-document.test.ts`, `tests/financial-document-pdf.test.ts`, `tests/financial-document-integration.test.ts`, `tests/paystack-orchestration.test.ts`, `tests/paystack-postgres.test.ts`, `tests/service-invoices-postgres.test.ts`. PASS:92 focused tests,46 application regression tests,3 independent PostgreSQL checks;74 overlapping final followups. Web/native types and web build recorded separately; no native build or live merchant call.

Outstanding: See08 dependency register,09 gate report and80-scenario registry: POS/manual-credit PDF, production-volume status-filter acceptance, document resend/attachments, provider refunds/settlements, native/device/accessibility/volume/staging and stakeholder acceptance remain.

## INV-DOC-16 — Rollback and financial recovery preservation

Status: PARTIAL; gate G22. Bounded existing-module implementation and local evidence delivered; complete specification acceptance is not met. Missing engineering and provider/legal/device/staging gates remain in denominator.

Data: Existing customer_invoices immutable issued snapshot/sequence; approved invoice_notes; verified_payments/refunds; payment_postings + immutable intent quote; existing users,branches,governed document.identity/website.content. No new financial ledger.

Controls: Authenticated own/role/branch reads; recent independent financial approval; server-verified posting/evidence; immutable history; exact integer kobo; trusted local assets; private/no-store PDFs; sandbox and activation gates preserved.

Implementation: `apps/web/lib/invoice-pdf-legacy.ts`, `apps/web/lib/invoice-pdf.ts`, `docs/easygas-invoicing/08-deployment-rollback-recovery.md`

Executed tests: `tests/financial-document.test.ts`, `tests/financial-document-pdf.test.ts`, `tests/financial-document-integration.test.ts`, `tests/paystack-orchestration.test.ts`, `tests/paystack-postgres.test.ts`, `tests/service-invoices-postgres.test.ts`. PASS:92 focused tests,46 application regression tests,3 independent PostgreSQL checks;74 overlapping final followups. Web/native types and web build recorded separately; no native build or live merchant call.

Outstanding: See08 dependency register,09 gate report and80-scenario registry: POS/manual-credit PDF, production-volume status-filter acceptance, document resend/attachments, provider refunds/settlements, native/device/accessibility/volume/staging and stakeholder acceptance remain.

## INV-DOC-17 — Eleven required reports plus actual code/evidence

Status: PARTIAL; gate G02. Bounded existing-module implementation and local evidence delivered; complete specification acceptance is not met. Missing engineering and provider/legal/device/staging gates remain in denominator.

Data: Existing customer_invoices immutable issued snapshot/sequence; approved invoice_notes; verified_payments/refunds; payment_postings + immutable intent quote; existing users,branches,governed document.identity/website.content. No new financial ledger.

Controls: Authenticated own/role/branch reads; recent independent financial approval; server-verified posting/evidence; immutable history; exact integer kobo; trusted local assets; private/no-store PDFs; sandbox and activation gates preserved.

Implementation: `docs/easygas-invoicing/01-repository-audit.md`, `docs/easygas-invoicing/02-route-matrix.md`, `docs/easygas-invoicing/03-data-contract-and-money-rules.md`, `docs/easygas-invoicing/04-document-design-spec.md`, `docs/easygas-invoicing/05-security-and-permissions.md`, `docs/easygas-invoicing/06-test-evidence.md`, `docs/easygas-invoicing/07-reconciliation-and-exceptions.md`, `docs/easygas-invoicing/08-deployment-rollback-recovery.md`, `docs/easygas-invoicing/09-acceptance-gates.md`, `docs/easygas-invoicing/10-requirements-traceability.md`, `docs/easygas-invoicing/11-final-implementation-report.md`

Executed tests: `tests/financial-document.test.ts`, `tests/financial-document-pdf.test.ts`, `tests/financial-document-integration.test.ts`, `tests/paystack-orchestration.test.ts`, `tests/paystack-postgres.test.ts`, `tests/service-invoices-postgres.test.ts`. PASS:92 focused tests,46 application regression tests,3 independent PostgreSQL checks;74 overlapping final followups. Web/native types and web build recorded separately; no native build or live merchant call.

Outstanding: See08 dependency register,09 gate report and80-scenario registry: POS/manual-credit PDF, production-volume status-filter acceptance, document resend/attachments, provider refunds/settlements, native/device/accessibility/volume/staging and stakeholder acceptance remain.

## INV-DOC-18 — Definition of done: full financial/platform/operational acceptance

Status: PARTIAL; gate G25. Bounded existing-module implementation and local evidence delivered; complete specification acceptance is not met. Missing engineering and provider/legal/device/staging gates remain in denominator.

Data: Existing customer_invoices immutable issued snapshot/sequence; approved invoice_notes; verified_payments/refunds; payment_postings + immutable intent quote; existing users,branches,governed document.identity/website.content. No new financial ledger.

Controls: Authenticated own/role/branch reads; recent independent financial approval; server-verified posting/evidence; immutable history; exact integer kobo; trusted local assets; private/no-store PDFs; sandbox and activation gates preserved.

Implementation: `docs/easygas-invoicing/11-final-implementation-report.md`, `docs/easygas-invoicing/09-acceptance-gates.md`

Executed tests: `tests/financial-document.test.ts`, `tests/financial-document-pdf.test.ts`, `tests/financial-document-integration.test.ts`, `tests/paystack-orchestration.test.ts`, `tests/paystack-postgres.test.ts`, `tests/service-invoices-postgres.test.ts`. PASS:92 focused tests,46 application regression tests,3 independent PostgreSQL checks;74 overlapping final followups. Web/native types and web build recorded separately; no native build or live merchant call.

Outstanding: See08 dependency register,09 gate report and80-scenario registry: POS/manual-credit PDF, production-volume status-filter acceptance, document resend/attachments, provider refunds/settlements, native/device/accessibility/volume/staging and stakeholder acceptance remain.

## Scenario register (all80)

|ID|Group|Scenario|State|Evidence / outstanding|
|---|---|---|---|---|
|INV-S001|baseline|Existing invoice issue/number unchanged|PASS|PM-T11 docs/easygas-invoicing/evidence/targeted-tests.txt|
|INV-S002|baseline|Customer own invoice access|PASS|CUI-DATA docs/easygas-invoicing/evidence/application-regression.txt|
|INV-S003|baseline|Driver restricted APIs unchanged|PASS|DR-INTEGRATION-01 docs/easygas-invoicing/evidence/application-regression.txt|
|INV-S004|baseline|Technician summary/jobs scope|PASS|TF-DATA docs/easygas-invoicing/evidence/application-regression.txt|
|INV-S005|baseline|Grouped sidebar29 routes|PASS|RM-01–05,12,13 docs/easygas-invoicing/evidence/application-regression.txt|
|INV-S006|baseline|Customer read HTTP compatibility|PASS|CUI-HTTP docs/easygas-invoicing/evidence/application-regression.txt|
|INV-S007|baseline|Wallet exact principal/replay|PASS|PAY-POST docs/easygas-invoicing/evidence/final-followup.txt; docs/easygas-invoicing/evidence/targeted-tests.txt|
|INV-S008|baseline|Service approval/work gates|PASS|SINV-06 docs/easygas-invoicing/evidence/targeted-tests.txt|
|INV-S009|baseline|POS regression|PASS|OPS-T03 docs/easygas-invoicing/evidence/application-regression.txt|
|INV-S010|baseline|No financial side effect from document reads|PASS|DOC-LIBRARY docs/easygas-invoicing/evidence/final-followup.txt; docs/easygas-invoicing/evidence/targeted-tests.txt|
|INV-S011|pdf|A4|PASS|DOC-PDF-A4 docs/easygas-invoicing/evidence/final-followup.txt; docs/easygas-invoicing/evidence/targeted-tests.txt|
|INV-S012|pdf|RECEIPT|PASS|DOC-PDF-RECEIPT docs/easygas-invoicing/evidence/final-followup.txt; docs/easygas-invoicing/evidence/targeted-tests.txt|
|INV-S013|pdf|LONG-ID|PASS|DOC-PDF-LONG-ID docs/easygas-invoicing/evidence/final-followup.txt; docs/easygas-invoicing/evidence/targeted-tests.txt|
|INV-S014|pdf|LONG-NAME|PASS|DOC-PDF-LONG-NAME docs/easygas-invoicing/evidence/final-followup.txt; docs/easygas-invoicing/evidence/targeted-tests.txt|
|INV-S015|pdf|LONG-ADDRESS|PASS|DOC-PDF-LONG-ADDRESS docs/easygas-invoicing/evidence/final-followup.txt; docs/easygas-invoicing/evidence/targeted-tests.txt|
|INV-S016|pdf|NAIRA|PASS|DOC-PDF-NAIRA docs/easygas-invoicing/evidence/final-followup.txt; docs/easygas-invoicing/evidence/targeted-tests.txt|
|INV-S017|pdf|OPTIONAL-IDENTITY|PASS|DOC-PDF-OPTIONAL-IDENTITY docs/easygas-invoicing/evidence/final-followup.txt; docs/easygas-invoicing/evidence/targeted-tests.txt|
|INV-S018|pdf|MULTIPAGE|PASS|DOC-PDF-MULTIPAGE docs/easygas-invoicing/evidence/final-followup.txt; docs/easygas-invoicing/evidence/targeted-tests.txt|
|INV-S019|pdf|LONG-ITEM|PASS|DOC-PDF-LONG-ITEM docs/easygas-invoicing/evidence/final-followup.txt; docs/easygas-invoicing/evidence/targeted-tests.txt|
|INV-S020|pdf|CREDIT-NOTE|PASS|DOC-PDF-CREDIT-NOTE docs/easygas-invoicing/evidence/final-followup.txt; docs/easygas-invoicing/evidence/targeted-tests.txt|
|INV-S021|pdf|MAX-AMOUNT|PASS|DOC-PDF-MAX-AMOUNT docs/easygas-invoicing/evidence/final-followup.txt; docs/easygas-invoicing/evidence/targeted-tests.txt|
|INV-S022|pdf|UNICODE|PASS|DOC-PDF-UNICODE docs/easygas-invoicing/evidence/final-followup.txt; docs/easygas-invoicing/evidence/targeted-tests.txt|
|INV-S023|semantics|UNPAID|PASS|DOC-STATE-UNPAID docs/easygas-invoicing/evidence/final-followup.txt; docs/easygas-invoicing/evidence/targeted-tests.txt|
|INV-S024|semantics|FALSE-PAID-FLAG|PASS|DOC-STATE-FALSE-PAID-FLAG docs/easygas-invoicing/evidence/final-followup.txt; docs/easygas-invoicing/evidence/targeted-tests.txt|
|INV-S025|semantics|PARTIAL|PASS|DOC-STATE-PARTIAL docs/easygas-invoicing/evidence/final-followup.txt; docs/easygas-invoicing/evidence/targeted-tests.txt|
|INV-S026|semantics|PAID|PASS|DOC-STATE-PAID docs/easygas-invoicing/evidence/final-followup.txt; docs/easygas-invoicing/evidence/targeted-tests.txt|
|INV-S027|semantics|ZERO-DUE-UNPAID|PASS|DOC-STATE-ZERO-DUE-UNPAID docs/easygas-invoicing/evidence/final-followup.txt; docs/easygas-invoicing/evidence/targeted-tests.txt|
|INV-S028|semantics|VOID|PASS|DOC-STATE-VOID docs/easygas-invoicing/evidence/final-followup.txt; docs/easygas-invoicing/evidence/targeted-tests.txt|
|INV-S029|semantics|UNKNOWN-BALANCE|PASS|DOC-STATE-UNKNOWN-BALANCE docs/easygas-invoicing/evidence/final-followup.txt; docs/easygas-invoicing/evidence/targeted-tests.txt|
|INV-S030|semantics|OVERDUE|PASS|DOC-STATE-OVERDUE docs/easygas-invoicing/evidence/final-followup.txt; docs/easygas-invoicing/evidence/targeted-tests.txt|
|INV-S031|semantics|ADJUSTED|PASS|DOC-STATE-ADJUSTED docs/easygas-invoicing/evidence/final-followup.txt; docs/easygas-invoicing/evidence/targeted-tests.txt|
|INV-S032|semantics|CREDIT-BALANCE|PASS|DOC-STATE-CREDIT-BALANCE docs/easygas-invoicing/evidence/final-followup.txt; docs/easygas-invoicing/evidence/targeted-tests.txt|
|INV-S033|money|Zero kobo|PASS|DOC-MONEY-0 docs/easygas-invoicing/evidence/final-followup.txt; docs/easygas-invoicing/evidence/targeted-tests.txt|
|INV-S034|money|One kobo|PASS|DOC-MONEY-1 docs/easygas-invoicing/evidence/final-followup.txt; docs/easygas-invoicing/evidence/targeted-tests.txt|
|INV-S035|money|Ninety-nine kobo|PASS|DOC-MONEY-99 docs/easygas-invoicing/evidence/final-followup.txt; docs/easygas-invoicing/evidence/targeted-tests.txt|
|INV-S036|money|Exact whole naira|PASS|DOC-MONEY-100 docs/easygas-invoicing/evidence/final-followup.txt; docs/easygas-invoicing/evidence/targeted-tests.txt|
|INV-S037|money|Receipt two decimal places|PASS|DOC-MONEY-700508 docs/easygas-invoicing/evidence/final-followup.txt; docs/easygas-invoicing/evidence/targeted-tests.txt|
|INV-S038|money|Safe maximum integer formatting|PASS|DOC-MONEY-1000000000000 docs/easygas-invoicing/evidence/final-followup.txt; docs/easygas-invoicing/evidence/targeted-tests.txt|
|INV-S039|money|Fee gross-up minimality/rounding|PASS|PAY-FEE docs/easygas-invoicing/evidence/targeted-tests.txt|
|INV-S040|money|Fee threshold and caps|PASS|PAY-FEE docs/easygas-invoicing/evidence/targeted-tests.txt|
|INV-S041|money|Wallet liability vs processing fee|PASS|DOC-RECEIPT docs/easygas-invoicing/evidence/final-followup.txt; docs/easygas-invoicing/evidence/targeted-tests.txt|
|INV-S042|money|Partial verified invoice payments|PASS|PM-T11 docs/easygas-invoicing/evidence/targeted-tests.txt|
|INV-S043|money|Overpaid invoice balance|PASS|DOC-STATE-CREDIT-BALANCE docs/easygas-invoicing/evidence/final-followup.txt; docs/easygas-invoicing/evidence/targeted-tests.txt|
|INV-S044|money|Approved tax policy and real tax fields|NOT_TESTED|OPEN: actual business/legal policy not supplied |
|INV-S045|security|No posting cannot issue receipt|PASS|DOC-RECEIPT-DENY-posting docs/easygas-invoicing/evidence/final-followup.txt; docs/easygas-invoicing/evidence/targeted-tests.txt|
|INV-S046|security|No wallet/payment ledger ID cannot issue receipt|PASS|DOC-RECEIPT-DENY-ledger docs/easygas-invoicing/evidence/final-followup.txt; docs/easygas-invoicing/evidence/targeted-tests.txt|
|INV-S047|security|Pending status cannot issue receipt|PASS|DOC-RECEIPT-DENY-state docs/easygas-invoicing/evidence/final-followup.txt; docs/easygas-invoicing/evidence/targeted-tests.txt|
|INV-S048|security|Wrong environment|PASS|DOC-RECEIPT-DENY-environment docs/easygas-invoicing/evidence/final-followup.txt; docs/easygas-invoicing/evidence/targeted-tests.txt|
|INV-S049|security|Wrong gross|PASS|DOC-RECEIPT-DENY-gross docs/easygas-invoicing/evidence/final-followup.txt; docs/easygas-invoicing/evidence/targeted-tests.txt|
|INV-S050|security|Wrong principal|PASS|DOC-RECEIPT-DENY-principal docs/easygas-invoicing/evidence/final-followup.txt; docs/easygas-invoicing/evidence/targeted-tests.txt|
|INV-S051|security|Nonzero receipt due|PASS|DOC-RECEIPT-DENY-due docs/easygas-invoicing/evidence/final-followup.txt; docs/easygas-invoicing/evidence/targeted-tests.txt|
|INV-S052|security|Zero verified paid|PASS|DOC-RECEIPT-DENY-paid docs/easygas-invoicing/evidence/final-followup.txt; docs/easygas-invoicing/evidence/targeted-tests.txt|
|INV-S053|security|Forged signed events/amount/currency|PASS|PAY-ZERO-EFFECT docs/easygas-invoicing/evidence/final-followup.txt; docs/easygas-invoicing/evidence/targeted-tests.txt|
|INV-S054|security|Raw bytes/timestamp/replay/rotation|PASS|PAY-SIGNATURE docs/easygas-invoicing/evidence/application-regression.txt|
|INV-S055|security|Foreign/anonymous/driver document access|PASS|INV-PDF01 docs/easygas-invoicing/evidence/targeted-tests.txt|
|INV-S056|security|Markup/customer injection|PASS|DOC-ESCAPE docs/easygas-invoicing/evidence/final-followup.txt; docs/easygas-invoicing/evidence/targeted-tests.txt|
|INV-S057|workflow|Customer web order invoice preview/library|PASS|DOC-LIBRARY docs/easygas-invoicing/evidence/final-followup.txt; docs/easygas-invoicing/evidence/targeted-tests.txt|
|INV-S058|workflow|Installed mobile receipt share/download|NOT_TESTED|OPEN: native build/device deferred |
|INV-S059|workflow|Phone assisted order document integration|PARTIAL|PARTIAL: existing order invoice reuse; dedicated assisted browser flow not exercised |
|INV-S060|workflow|POS PDF receipt integration|NOT_TESTED|OPEN: canonical verified POS PDF not implemented |
|INV-S061|workflow|Service quote/report invoice and corrections|PASS|SINV-01 docs/easygas-invoicing/evidence/targeted-tests.txt|
|INV-S062|workflow|Doorstep add-on note/no second delivery charge|PARTIAL|PARTIAL: existing invoice note integration retained; physical workflow acceptance open |
|INV-S063|workflow|Recurring order issued documents|PARTIAL|PARTIAL: existing per-order invoice retained; occurrence document acceptance not exercised |
|INV-S064|workflow|Wallet top-up verified receipt|PASS|DOC-POSTING-SNAPSHOT docs/easygas-invoicing/evidence/final-followup.txt; docs/easygas-invoicing/evidence/targeted-tests.txt|
|INV-S065|workflow|Provider refund confirmation|NOT_TESTED|OPEN: provider refund capability incomplete; no fake confirmation |
|INV-S066|workflow|Secure document resend/notification attachments|NOT_TESTED|OPEN: dedicated resend/attachment capability incomplete |
|INV-S067|recovery|Independent PostgreSQL posting race/rollback|PASS|PAY-PG-CONCURRENCY docs/easygas-invoicing/evidence/postgres-tests.txt|
|INV-S068|recovery|Independent PostgreSQL invoice issue/rollback|PASS|SINV-PG01 docs/easygas-invoicing/evidence/postgres-tests.txt|
|INV-S069|recovery|Independent approvals concurrency|PASS|multi-connection PostgreSQL docs/easygas-invoicing/evidence/postgres-tests.txt|
|INV-S070|recovery|Renderer feature-flag rollback|PASS|DOC-ROLLBACK docs/easygas-invoicing/evidence/final-followup.txt; docs/easygas-invoicing/evidence/targeted-tests.txt|
|INV-S071|recovery|Later business/customer edits preserve receipt|PASS|DOC-POSTING-SNAPSHOT docs/easygas-invoicing/evidence/final-followup.txt; docs/easygas-invoicing/evidence/targeted-tests.txt|
|INV-S072|recovery|Provider fee mismatch/uncertain init|PASS|PAY-RECOVERY docs/easygas-invoicing/evidence/final-followup.txt; docs/easygas-invoicing/evidence/targeted-tests.txt|
|INV-S073|recovery|Actual merchant settlement and partial refund reconciliation|NOT_TESTED|OPEN: verified provider outcomes/settlement capability not available |
|INV-S074|recovery|Storage failure/release restore rehearsal|PARTIAL|PARTIAL: on-demand PDF no storage worker; staged backup/restore not executed |
|INV-S075|accessibility/performance|Keyboard modal containment/Escape focus|PASS|BROWSER-KEYBOARD docs/easygas-invoicing/evidence/browser-verification.json|
|INV-S076|accessibility/performance|Tagged PDF/actual screen-reader review|NOT_TESTED|OPEN: tagged PDF/assistive review not completed |
|INV-S077|accessibility/performance|Phone390 responsive preview|PASS|BROWSER-PHONE docs/easygas-invoicing/evidence/browser-verification.json|
|INV-S078|accessibility/performance|Light print palette/contrast review|PASS|BROWSER-CONTRAST docs/easygas-invoicing/evidence/browser-verification.json|
|INV-S079|accessibility/performance|Bounded PDF generation time/size|PASS|DOC-PDF-A4 docs/easygas-invoicing/evidence/final-followup.txt; docs/easygas-invoicing/evidence/targeted-tests.txt|
|INV-S080|accessibility/performance|100-row table repeated header/performance|PASS|DOC-PDF-MULTIPAGE docs/easygas-invoicing/evidence/final-followup.txt; docs/easygas-invoicing/evidence/targeted-tests.txt|

## Gates

|ID|Gate|Status|Reviewer/date|Evidence / remaining|
|---|---|---|---|---|
|G01|Baseline captured; expected unborn/untracked repository documented|PASS|Codex only /2026-11-09|docs/easygas-invoicing/evidence/baseline-tests.txt; None for this bounded technical gate; separate production gates remain.|
|G02|Actual route/schema/source audit|PASS|Codex only /2026-11-09|docs/easygas-invoicing/evidence/targeted-tests.txt; None for this bounded technical gate; separate production gates remain.|
|G03|Approved design visual parity|PARTIAL|Codex only /2026-11-09|docs/easygas-invoicing/evidence/browser-verification.json; See08 dependency register and09 gate report; missing engineering/provider/legal/device/staging acceptance retained.|
|G04|Actual business identity and no fabricated optional legal details|PARTIAL|Codex only /2026-11-09|docs/easygas-invoicing/evidence/targeted-tests.txt; See08 dependency register and09 gate report; missing engineering/provider/legal/device/staging acceptance retained.|
|G05|Invoice versus verified-receipt semantics|PASS|Codex only /2026-11-09|docs/easygas-invoicing/evidence/targeted-tests.txt; None for this bounded technical gate; separate production gates remain.|
|G06|Historical snapshot immutability|PASS|Codex only /2026-11-09|docs/easygas-invoicing/evidence/final-followup.txt; None for this bounded technical gate; separate production gates remain.|
|G07|Authoritative money/fees and policy|PARTIAL|Codex only /2026-11-09|docs/easygas-invoicing/evidence/targeted-tests.txt; See08 dependency register and09 gate report; missing engineering/provider/legal/device/staging acceptance retained.|
|G08|Committed verified posting only|PASS|Codex only /2026-11-09|docs/easygas-invoicing/evidence/targeted-tests.txt; None for this bounded technical gate; separate production gates remain.|
|G09|Webhook auth/idempotency|PASS|Codex only /2026-11-09|docs/easygas-invoicing/evidence/postgres-tests.txt; None for this bounded technical gate; separate production gates remain.|
|G10|Wallet principal/liability correctness|PASS|Codex only /2026-11-09|docs/easygas-invoicing/evidence/targeted-tests.txt; None for this bounded technical gate; separate production gates remain.|
|G11|All service/phone/POS/add-on integrations|PARTIAL|Codex only /2026-11-09|docs/easygas-invoicing/evidence/application-regression.txt; See08 dependency register and09 gate report; missing engineering/provider/legal/device/staging acceptance retained.|
|G12|Provider refund confirmation and credit notes|BLOCKED|Codex only /2026-11-09|docs/easygas-invoicing/evidence/targeted-tests.txt; See08 dependency register and09 gate report; missing engineering/provider/legal/device/staging acceptance retained.|
|G13|Independent approvals|PASS|Codex only /2026-11-09|docs/easygas-invoicing/evidence/postgres-tests.txt; None for this bounded technical gate; separate production gates remain.|
|G14|RBAC/customer/branch isolation|PASS|Codex only /2026-11-09|docs/easygas-invoicing/evidence/targeted-tests.txt; None for this bounded technical gate; separate production gates remain.|
|G15|PDF rendering and full accessibility|PARTIAL|Codex only /2026-11-09|docs/easygas-invoicing/evidence/final-followup.txt; See08 dependency register and09 gate report; missing engineering/provider/legal/device/staging acceptance retained.|
|G16|Customer and installed mobile download|PARTIAL|Codex only /2026-11-09|docs/easygas-invoicing/evidence/mobile-types.txt; See08 dependency register and09 gate report; missing engineering/provider/legal/device/staging acceptance retained.|
|G17|Document resend/notification lifecycle|BLOCKED|Codex only /2026-11-09|; See08 dependency register and09 gate report; missing engineering/provider/legal/device/staging acceptance retained.|
|G18|Actual merchant settlement reconciliation|BLOCKED|Codex only /2026-11-09|; See08 dependency register and09 gate report; missing engineering/provider/legal/device/staging acceptance retained.|
|G19|Audit trail|PASS|Codex only /2026-11-09|docs/easygas-invoicing/evidence/targeted-tests.txt; None for this bounded technical gate; separate production gates remain.|
|G20|Existing unique numbering/idempotent issue|PASS|Codex only /2026-11-09|docs/easygas-invoicing/evidence/postgres-tests.txt; None for this bounded technical gate; separate production gates remain.|
|G21|Staging migration dry run|PARTIAL|Codex only /2026-11-09|docs/easygas-invoicing/evidence/postgres-tests.txt; See08 dependency register and09 gate report; missing engineering/provider/legal/device/staging acceptance retained.|
|G22|Release backup/restore/rollback|PARTIAL|Codex only /2026-11-09|docs/easygas-invoicing/evidence/final-followup.txt; See08 dependency register and09 gate report; missing engineering/provider/legal/device/staging acceptance retained.|
|G23|Production performance/security|PARTIAL|Codex only /2026-11-09|docs/easygas-invoicing/evidence/final-followup.txt; See08 dependency register and09 gate report; missing engineering/provider/legal/device/staging acceptance retained.|
|G24|Regression across all installed apps|PARTIAL|Codex only /2026-11-09|docs/easygas-invoicing/evidence/application-regression.txt; See08 dependency register and09 gate report; missing engineering/provider/legal/device/staging acceptance retained.|
|G25|Business/legal/finance signoff|BLOCKED|Codex only /2026-11-09|; See08 dependency register and09 gate report; missing engineering/provider/legal/device/staging acceptance retained.|
|G26|No unapproved live activation|PASS|Codex only /2026-11-09|docs/easygas-invoicing/evidence/application-regression.txt; None for this bounded technical gate; separate production gates remain.|

See[operating/recovery/dependency register](../easygas-invoicing/08-deployment-rollback-recovery.md) and[final report](../easygas-invoicing/11-final-implementation-report.md). Machine-readable matrix carries individual evidence paths. No live activation or productionGO inferred.
