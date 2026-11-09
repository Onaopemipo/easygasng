# Executed verification

Pre-edit baseline:25/25 invoice/branding/service/Paystack/fee tests, web types and web build passed. Evidence: baseline-tests.txt, baseline-types.txt, baseline-build.txt. No lint script is configured; no lint pass is invented.

Current focused run:92/92 passed,0failed/skipped. Command:

```
node --import tsx --test --test-concurrency=1 tests/financial-document.test.ts tests/financial-document-pdf.test.ts tests/financial-document-integration.test.ts tests/paystack-orchestration.test.ts tests/post-meeting-invoices.test.ts tests/invoice-pdf.test.ts tests/service-invoices.test.ts tests/service-invoices-http.test.ts tests/document-brand.test.ts tests/service-document-privacy.test.ts tests/payment-fees.test.ts tests/wallet-topups.test.ts
```

Evidence: targeted-tests.txt. Final overlapping follow-up74/74 passes after renderer/reference refinements; final-followup.txt. Includes exact minor units, unpaid/partial/paid/void/unknown semantics, absent/mismatched receipt evidence, quote/identity safety, escaping, immutable snapshot, approved notes,12 rendering variants, legacy flag rollback, real GET/PDF auth and independent settings approval. No runtime provider secret or actual transaction used. These overlapping runs are not added to a misleading unique coverage percentage.

Application preservation:46/46 passed (application-regression.txt): customer-mobile, driver-workspace, technician-four-screen, navigation, operations-completion, service-invoice-drafts, paystack-provider, paystack-policy, password-visibility. Independent PostgreSQL:3/3 passed (postgres-tests.txt) using disposable loopback PostgreSQL16 schemas with multiple connections: exactly-once posting/aborted rollback; independent approvals; immutable invoice issue/replay/rollback. No remote/production DB used.

Final commands: `npm run typecheck`, `npx tsc --noEmit -p apps/mobile/tsconfig.json`, `npm run build`; logs web-types.txt, mobile-types.txt, build.txt. Native typecheck is not a mobile build. Generated bootstrap reviewed by registry test and local migrations; no managed migration executed. `tests/customer-traceability.test.ts` validates phase matrices in traceability.txt.

PDF QA: invoice, receipt, approved credit note and100-row multipage PDF fixtures rendered by Poppler and inspected. Naira visible, full identifiers wrap, optional legal fields omitted, normal totals grouped and repeated multi-page table header preserved. Bounds:12 PDF variants each under15sec and2MB in isolated tests,1000-line/250k model cap. This is not production-load or tagged-PDF accessibility certification.

Browser QA: browser-verification.json and screenshots. Synthetic canonical unpaid issue/list/preview, search-empty/exact, desktop15px minimum,390px responsive, keyboard containment/Escape focus. No fabricated production UI fixture or real customer data. Existing grouped sidebar retained.

All80 requested scenario rows retained:69 bounded PASS,4PARTIAL,7NOT_TESTED. This differs from number of executable tests: a tested renderer/money invariant does not establish a provider, native or business workflow scenario.12/26 gates have bounded technical PASS;10PARTIAL and4BLOCKED remain. See09 and machine-readable matrix. Missing engineering/device/provider/legal/staging work is explicitly retained.

Final renderer follow-up:13/13 PDF cases passed after the long-business-footer safeguard; normal invoice/receipt single-page checks and long legal-name rendering are included. See pdf-tests.txt and pdf-visual-review.json. Native receipt summary now uses the shared exact two-decimal formatter; native types passed, device runtime remains deferred.
