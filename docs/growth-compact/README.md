# Growth admin cleanup — audit and verification

Implemented the requested Campaigns, Recommendations and Testimonials redesign from the three screenshots. The audit found oversized headings and empty states, inline forms displacing records, repeated zero-value summaries, and secondary reporting mixed into daily work. Default views now prioritise eight records per page, a clear primary action and short contextual guidance. The screenshots are visual references; their UI text does not provide separate task instructions.

| Page | Result | Preview |
| --- | --- | --- |
| Campaigns | Compact history with search/status filters; New campaign and record review dialogs; Rewards reconciliation tab | [Desktop](evidence/campaigns-desktop.jpg), [phone](evidence/campaigns-mobile.jpg) |
| Recommendations | Compact rules with readable safety/status labels; proposal and review dialogs; Performance tab | [Desktop](evidence/recommendations-desktop.jpg), [phone](evidence/recommendations-mobile.jpg) |
| Testimonials | Feedback list with excerpts, consent, selection and export; filter/review dialogs; versions/history within review; Analytics tab | [Desktop](evidence/testimonials-desktop.jpg), [phone](evidence/testimonials-mobile.jpg) |

Long messages, full original feedback, evidence, audit history and operational rules remain available on demand. All eight testimonial states are retained through filters and Analytics. Approval and publication remain separate actions. Campaign counts describe loaded records: the existing latest-100 source limit is unchanged, and the UI makes no global-history claim. Recommendation performance uses recorded events, with completed appointments separate from selections/bookings. Testimonial pagination uses the canonical server page size of eight; filtered export covers the full filtered set.

Existing campaign consent, quiet-hour and independent-approval rules; recommendation safety and independent review; and testimonial consent, history, separate publication, re-authentication and retention controls are preserved. Canonical backend APIs and schemas are unchanged by this phase. No campaign was approved/delivered or testimonial published during browser acceptance. Backend tests exercise transitions only in isolated synthetic fixtures.

Executed validation:

- [42/42 focused regression checks](evidence/regression.txt), zero failures or skips, including the PostgreSQL testimonial integration, existing campaign/recommendation/testimonial control negatives, prior compact-workspace rendering and password-input conventions.
- [Four browser-evidence validation checks](evidence/browser-validation.txt) pass. These validate saved observations; they are not an independent automated browser run.
- [Six actual browser observations and 17 interaction checks](evidence/browser-checks.json): 1440×1000 desktop and 390×844 phone on all three pages; eight rows with no forms/dialogs mounted by default and no page overflow. The three measured phone dialogs fit the viewport. Escape restores trigger focus, dirty drafts require explicit discard, and phone dark mode is readable.
- Testimonial CSV exported [all 10 filtered fixture records](evidence/testimonials-export.csv) while eight were visible; selection, second-page records, empty filters, history and analytics were also inspected.
- [Production web build](evidence/build.txt), [TypeScript](evidence/types.txt) and [requirements-matrix validation](evidence/traceability.txt) pass.

The focused regression command was:

```sh
EASYGAS_ENABLE_LOCAL_PG_TESTS=yes EASYGAS_TEST_POSTGRES_URL=postgresql://127.0.0.1:55473/easygas_test_holistic node --import tsx --test --test-concurrency=1 --test-reporter=spec tests/growth-compact.test.ts tests/admin-compact.test.ts tests/password-visibility.test.ts tests/campaign-return.test.ts tests/scheduling.test.ts tests/catalogue-services-integration.test.ts tests/testimonials.test.ts tests/testimonial-postgres.test.ts
```

Local acceptance preview: run `node --import tsx scripts/prepare-growth-compact-qa.ts`, then `node scripts/preview-growth-compact.mjs` from the repository root. Both refuse production/database-URL environments. The preview binds only to `127.0.0.1:3115` and uses a disposable synthetic database and private ignored `.data/growth-compact-qa.json` login/configuration. Fixtures include 10 draft campaigns, 10 inactive rules and 10 unpublished testimonials; each testimonial uses a separate synthetic customer to preserve submission limits.

[Traceability matrix](../traceability/growth-compact-rtm.md): four of four bounded local requirements verified, one of one critical requirement, three of three routes and four of four acceptance gates; zero exclusions. Hosted rollout is unperformed. Physical/provider/native/Firefox/formal accessibility and broader production acceptance are unclaimed and remain in prior matrices. The previous eight-workspace local redesign and all existing production NO-GO, actual-import hold and retain-all decisions are preserved.

## Hosted release — 19 November 2026

All redesigned routes in this phase are now deployed and verified on the client demo. [Release report, exact deployment and hosted screenshots](../deployment/20261119-admin-redesign-release.md), [release matrix](../traceability/admin-redesign-demo-release-rtm.md). This addendum supersedes the earlier local-only rollout status without changing original phase denominators or wider production/import/retention decisions.
