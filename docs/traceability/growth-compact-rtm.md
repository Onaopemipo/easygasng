# Growth admin redesign — requirements traceability

[Machine mapping](growth-compact-rtm.json) · [Audit, source contracts and executed validation](../growth-compact/README.md)

All approved screenshot routes remain in scope. Status is bounded to local responsive web implementation and verification; hosted rollout is unperformed. Existing production NO-GO, actual-import hold, retain-all decisions, prior phase gaps and unrelated local work remain unchanged.

| Requirement | Route | Gate | Status |
| --- | --- | --- | --- |
| GROW-01 — Compact campaigns workspace with focused dialogs and bounded records | /admin/campaigns | GROW-G01 PASS | VERIFIED_COMPLETE |
| GROW-02 — Compact recommendations workspace with focused dialogs and bounded records | /admin/recommendations | GROW-G02 PASS | VERIFIED_COMPLETE |
| GROW-03 — Compact testimonials workspace with focused dialogs and bounded records | /admin/testimonials | GROW-G03 PASS | VERIFIED_COMPLETE |
| GROW-04 — Preserve canonical scope, consent, independent review, separate publication and immutable history controls across all three redesigned workspaces | /admin/campaigns, /admin/recommendations, /admin/testimonials | GROW-G04 PASS | VERIFIED_COMPLETE |

Coverage: implementation **4/4**, verification **4/4**, critical requirements **1/1**, routes **3/3**, gates **4/4**. Zero exclusions. These denominators describe this local phase; no prior requirement was removed or reclassified.

## GROW-01 — Compact campaigns workspace with focused dialogs and bounded records

Priority: P1. Scope: Local responsive admin web presentation.

Implementation and authoritative adapters: [workflows.tsx](../../apps/web/components/workflows.tsx), [easyrewards.tsx](../../apps/web/components/easyrewards.tsx), [scheduling.ts](../../apps/web/lib/scheduling.ts), [engagement-records.tsx](../../apps/web/components/engagement-records.tsx), [compact-workspace.tsx](../../apps/web/components/compact-workspace.tsx), [admin-compact.css](../../apps/web/app/admin-compact.css).

**Authoritative data:** Existing authenticated campaigns read (latest 100 scoped records), campaign.create/decide and EasyRewardsReport; canonical campaigns/campaign_recipients and actual follow-up records from scheduling.ts. Local pagination/search apply to loaded records, not full history..

**Controls:** Existing actor/role/branch checks; independent approval, recipient consent and active-account/branch eligibility rechecked at delivery, quiet hours and deduplication preserved. Create/review dialogs use existing mutation APIs; only draft creation is offered in creation flow.

**Executed evidence:** [README.md](../growth-compact/README.md), [regression.txt](../growth-compact/evidence/regression.txt), [browser-validation.txt](../growth-compact/evidence/browser-validation.txt), [browser-checks.json](../growth-compact/evidence/browser-checks.json), [build.txt](../growth-compact/evidence/build.txt), [types.txt](../growth-compact/evidence/types.txt).

**Mapped tests:** [growth-compact.test.ts](../../tests/growth-compact.test.ts), [growth-compact-browser-evidence.test.ts](../../tests/growth-compact-browser-evidence.test.ts), [campaign-return.test.ts](../../tests/campaign-return.test.ts), [scheduling.test.ts](../../tests/scheduling.test.ts). IDs: `GROW-CAMPAIGN`, `GROW-UI01`, `CRM-RETURN-01`, `CRM-BRANCH-01`.

**Result/reason:** PASS — 42/42 focused regression checks (0 failures/skips), 4/4 browser-evidence validations, six desktop/phone observations and 17 interaction checks; web build/types pass. Implemented compact default records, focused dialogs and separate secondary tabs; executed regression, local responsive browser observations and production web build/types pass.

**Outstanding:** No outstanding implementation in this bounded local three-route web phase. Hosted rollout is unperformed. Existing campaign latest-100 read scope is unchanged; no global-history claim. Native, physical/provider, Firefox and formal accessibility acceptance remain outside this phase and in prior matrices. Production NO-GO, actual-import hold, retain-all and all unrelated phase gaps remain unchanged.

Additional executed backend case: campaigns require independent approval, consent at delivery and deduplicate in-app delivery.

## GROW-02 — Compact recommendations workspace with focused dialogs and bounded records

Priority: P1. Scope: Local responsive admin web presentation.

Implementation and authoritative adapters: [recommendations.tsx](../../apps/web/components/recommendations.tsx), [catalogue.ts](../../apps/web/lib/catalogue.ts), [engagement-records.tsx](../../apps/web/components/engagement-records.tsx), [compact-workspace.tsx](../../apps/web/components/compact-workspace.tsx), [admin-compact.css](../../apps/web/app/admin-compact.css).

**Authoritative data:** recommendations.manage, products.manage and services.manage; original recommendation.propose/approve APIs and canonical recommendation_rules and recorded recommendation events in catalogue.ts. Performance displays actual loaded-rule event counters..

**Controls:** Original owner/manager proposal and independent-owner approval checks retained server-side. Incompatible rules explicitly labelled Do not recommend; unknown compatibility remains assessment-only. No automatic paid-item addition or fabricated conversion metrics.

**Executed evidence:** [README.md](../growth-compact/README.md), [regression.txt](../growth-compact/evidence/regression.txt), [browser-validation.txt](../growth-compact/evidence/browser-validation.txt), [browser-checks.json](../growth-compact/evidence/browser-checks.json), [build.txt](../growth-compact/evidence/build.txt), [types.txt](../growth-compact/evidence/types.txt).

**Mapped tests:** [growth-compact.test.ts](../../tests/growth-compact.test.ts), [growth-compact-browser-evidence.test.ts](../../tests/growth-compact-browser-evidence.test.ts), [catalogue-services-integration.test.ts](../../tests/catalogue-services-integration.test.ts). IDs: `GROW-RULE`, `GROW-UI02`.

**Result/reason:** PASS — 42/42 focused regression checks (0 failures/skips), 4/4 browser-evidence validations, six desktop/phone observations and 17 interaction checks; web build/types pass. Implemented compact default records, focused dialogs and separate secondary tabs; executed regression, local responsive browser observations and production web build/types pass.

**Outstanding:** No outstanding implementation in this bounded local three-route web phase. Hosted rollout is unperformed. Existing campaign latest-100 read scope is unchanged; no global-history claim. Native, physical/provider, Firefox and formal accessibility acceptance remain outside this phase and in prior matrices. Production NO-GO, actual-import hold, retain-all and all unrelated phase gaps remain unchanged.

Additional executed backend case: reviewed recommendations count real events, never claim unknown compatibility and disappear for unavailable products.

## GROW-03 — Compact testimonials workspace with focused dialogs and bounded records

Priority: P1. Scope: Local responsive admin web presentation.

Implementation and authoritative adapters: [testimonials.tsx](../../apps/web/components/testimonials.tsx), [testimonials.ts](../../apps/web/lib/testimonials.ts), [testimonial-schema.ts](../../apps/web/lib/testimonial-schema.ts), [engagement-records.tsx](../../apps/web/components/engagement-records.tsx), [compact-workspace.tsx](../../apps/web/components/compact-workspace.tsx), [admin-compact.css](../../apps/web/app/admin-compact.css).

**Authoritative data:** Canonical testimonials.manage/analytics/export and testimonial.detail/transition APIs in testimonials.ts; testimonial records, immutable versions and audit events. Existing supported server page size 8 and one pager; filtered CSV exports full filtered set. All eight statuses retained..

**Controls:** Canonical role/ownership, consent and withdrawal, recent authentication, latest-version moderation and independent approval retained. Approval and publication remain separate explicit actions. Detail reads use latest canonical version; moderation/history moved into review dialog, never dropped. Retention controls unchanged.

**Executed evidence:** [README.md](../growth-compact/README.md), [regression.txt](../growth-compact/evidence/regression.txt), [browser-validation.txt](../growth-compact/evidence/browser-validation.txt), [browser-checks.json](../growth-compact/evidence/browser-checks.json), [build.txt](../growth-compact/evidence/build.txt), [types.txt](../growth-compact/evidence/types.txt).

**Mapped tests:** [growth-compact.test.ts](../../tests/growth-compact.test.ts), [growth-compact-browser-evidence.test.ts](../../tests/growth-compact-browser-evidence.test.ts), [testimonials.test.ts](../../tests/testimonials.test.ts), [testimonial-postgres.test.ts](../../tests/testimonial-postgres.test.ts). IDs: `GROW-FEEDBACK`, `GROW-UI03`, `TM-MANAGEMENT`, `TM-15`, `TM-09`, `TM-11`, `TM-WITHDRAW-STALE`.

**Result/reason:** PASS — 42/42 focused regression checks (0 failures/skips), 4/4 browser-evidence validations, six desktop/phone observations and 17 interaction checks; web build/types pass. Implemented compact default records, focused dialogs and separate secondary tabs; executed regression, local responsive browser observations and production web build/types pass.

**Outstanding:** No outstanding implementation in this bounded local three-route web phase. Hosted rollout is unperformed. Existing campaign latest-100 read scope is unchanged; no global-history claim. Native, physical/provider, Firefox and formal accessibility acceptance remain outside this phase and in prior matrices. Production NO-GO, actual-import hold, retain-all and all unrelated phase gaps remain unchanged.

## GROW-04 — Preserve canonical scope, consent, independent review, separate publication and immutable history controls across all three redesigned workspaces

Priority: P0. Scope: Cross-cutting control preservation for local three-route web presentation.

Implementation and authoritative adapters: [workflows.tsx](../../apps/web/components/workflows.tsx), [recommendations.tsx](../../apps/web/components/recommendations.tsx), [testimonials.tsx](../../apps/web/components/testimonials.tsx), [scheduling.ts](../../apps/web/lib/scheduling.ts), [catalogue.ts](../../apps/web/lib/catalogue.ts), [testimonials.ts](../../apps/web/lib/testimonials.ts), [testimonial-schema.ts](../../apps/web/lib/testimonial-schema.ts), [engagement-records.tsx](../../apps/web/components/engagement-records.tsx), [compact-workspace.tsx](../../apps/web/components/compact-workspace.tsx), [admin-compact.css](../../apps/web/app/admin-compact.css).

**Authoritative data:** Existing authenticated canonical scheduling, catalogue and testimonial APIs/tables; no new backend mutation, schema migration or production-data source..

**Controls:** Existing branch/actor checks, independent approvals, consent-at-delivery, no incompatible or unverified compatibility claim, testimonial re-authentication/immutable versions/withdrawal/latest-version guards and distinct publication actions remain. Draft-close guard, Escape/focus restoration and full filtered export verified locally. Previous production/import/retention decisions remain.

**Executed evidence:** [README.md](../growth-compact/README.md), [regression.txt](../growth-compact/evidence/regression.txt), [browser-validation.txt](../growth-compact/evidence/browser-validation.txt), [browser-checks.json](../growth-compact/evidence/browser-checks.json), [build.txt](../growth-compact/evidence/build.txt), [types.txt](../growth-compact/evidence/types.txt).

**Mapped tests:** [growth-compact.test.ts](../../tests/growth-compact.test.ts), [growth-compact-browser-evidence.test.ts](../../tests/growth-compact-browser-evidence.test.ts), [campaign-return.test.ts](../../tests/campaign-return.test.ts), [scheduling.test.ts](../../tests/scheduling.test.ts), [catalogue-services-integration.test.ts](../../tests/catalogue-services-integration.test.ts), [testimonials.test.ts](../../tests/testimonials.test.ts), [testimonial-postgres.test.ts](../../tests/testimonial-postgres.test.ts). IDs: `CRM-RETURN-01`, `CRM-BRANCH-01`, `TM-02`, `TM-15`, `TM-09`, `TM-WITHDRAW-STALE`, `GROW-INTERACT`.

**Result/reason:** PASS — 42/42 focused regression checks including PostgreSQL (0 failures/skips), 4/4 browser-evidence validations; build/types pass. Canonical backends unchanged; existing negative control tests and PostgreSQL integration executed successfully. Browser review inspected/discarded drafts without delivery or publication.

**Outstanding:** No outstanding implementation in this bounded local three-route web phase. Hosted rollout is unperformed. Existing campaign latest-100 read scope is unchanged; no global-history claim. Native, physical/provider, Firefox and formal accessibility acceptance remain outside this phase and in prior matrices. Production NO-GO, actual-import hold, retain-all and all unrelated phase gaps remain unchanged.

Executed negative cases:

- CRM-RETURN-01: campaign return reporting requires paid delivered purchase, real completion time and no refund; branch reads stay scoped
- campaigns require independent approval, consent at delivery and deduplicate in-app delivery
- reviewed recommendations count real events, never claim unknown compatibility and disappear for unavailable products
- TM-02: ineligible, duplicate, ownership, consent and unsafe input are rejected
- TM-15: stale moderation cannot publish or overwrite a newer customer version
- TM-09: withdrawing published consent immediately removes public feedback and cannot be reversed by a moderator
- TM-WITHDRAW-STALE: customer consent revocation wins over a stale screen and retries have one effect

## Scope history

- 2026-11-19: Three screenshot routes retained; prior eight-workspace redesign and all production/import/retention decisions preserved.
- 2026-11-19: Added explicit cross-cutting GROW-04 preservation requirement; GROW-01–03 stable. New dialogs/tabs preserve original APIs and all eight feedback statuses. Testimonial consumer requests existing supported page size 8; campaign read remains latest 100, labelled loaded records. No backend mutations, schema or prior scope decisions changed.
- 2026-11-19: Completed bounded local implementation: 42/42 focused regression checks with PostgreSQL enabled and 0 failures/skips; six captured desktop/phone observations, 17 interaction checks and four evidence validations pass. Production web build/types pass. Hosted rollout remains unperformed; prior eight-workspace work and all NO-GO/import/retain-all holds preserved.

Matrix validation: [executed report](../growth-compact/evidence/traceability.txt). This report is linked outside row evidence to avoid self-referential validation.
