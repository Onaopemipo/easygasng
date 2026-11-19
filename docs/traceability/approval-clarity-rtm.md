# Approval Centre clarity and single-owner policy

[Machine matrix](approval-clarity-rtm.json) · [Implementation and verification](../approval-clarity/README.md).

**Coverage:**3/3 requirements implemented and verified;2/2critical;3/3gates passed;0exclusions.

Final source `35ed307b0e38477ad1d70adacd87a0f02f4949a5` is Ready and promoted as `dpl_7rBejjBZL91bqowRZBUAQsekjAJL` to [the client demo](https://easygas-client-demo.vercel.app/admin/approvals).

**Scope:** Requested by and accurate current-revision approval progress. Sole-owner EasyRewards policy uses0/1; restricted dual-review requests use0/2. The existing pending request is not applied by this release. Existing production NO-GO/import/retain-all and all unrelated phase gaps remain.

| Requirement | Gate | Status | Result |
| --- | --- | --- | --- |
| APC-01 — Clearly identify Requested by and show authoritative revision-specific approval progress | APC-G01 | VERIFIED_COMPLETE / PASS | PASS —58/58 focused checks,4/4 final focused rerun, types/build, final Ready cloud build,1/1 hosted business readback and1/1 browser evidence validation; five actual hosted desktop/phone observations |
| APC-02 — Allow the sole owner to authorise their own EasyRewards business policy with verified audited owner authority; preserve restricted controls | APC-G02 | VERIFIED_COMPLETE / PASS | PASS —58/58 focused checks,4/4 final focused rerun, types/build, final Ready cloud build,1/1 hosted business readback and1/1 browser evidence validation; five actual hosted desktop/phone observations |
| APC-03 — Deploy the exact source to the client demo, verify desktop/phone and preserve existing records | APC-G03 | VERIFIED_COMPLETE / PASS | PASS —58/58 focused checks,4/4 final focused rerun, types/build, final Ready cloud build,1/1 hosted business readback and1/1 browser evidence validation; five actual hosted desktop/phone observations |

## APC-01

**Scope:** Existing Approval Centre /admin/approvals and loyalty.policy sole-owner authority; existing named request remains unapplied without its owner action.

**UI reference and route:** User reported155D9564 falsely read as approved and reiterated one admin/business owner; /admin/approvals.

**Authoritative source:** Current users, scoped change_requests, revision-bound approval_decisions and immutable owner authority audit_events; existing setting version.

**Security:** Explicit existing owner opt-in, own-request only, recent identity verification, immutable authority, expiry/version/validation and restricted review controls preserved.

**Implementation:** [apps/web/components/admin.tsx](../../apps/web/components/admin.tsx), [apps/web/lib/governance.ts](../../apps/web/lib/governance.ts), [apps/web/lib/service.ts](../../apps/web/lib/service.ts), [packages/business-rules/src/approval-progress.ts](../../packages/business-rules/src/approval-progress.ts), [apps/web/app/globals.css](../../apps/web/app/globals.css).

**Tests:** [tests/approval-clarity.test.ts](../../tests/approval-clarity.test.ts), [tests/owner-auto-approval.test.ts](../../tests/owner-auto-approval.test.ts), [tests/approval-pagination.test.ts](../../tests/approval-pagination.test.ts), [tests/shared-approval-gas.test.ts](../../tests/shared-approval-gas.test.ts), [tests/approval-clarity-browser.test.ts](../../tests/approval-clarity-browser.test.ts), [scripts/check-approval-clarity-demo.mjs](../../scripts/check-approval-clarity-demo.mjs). Executed IDs: `APC-OWNER`, `APC-PROGRESS`, `APC-SECURITY`, `APC-LABELS`, `APC-BROWSER`, `APC-DEPLOY`.

**Evidence:** [regression.txt](../../docs/approval-clarity/evidence/regression.txt), [types.txt](../../docs/approval-clarity/evidence/types.txt), [build.txt](../../docs/approval-clarity/evidence/build.txt), [final-focused.txt](../../docs/approval-clarity/evidence/final-focused.txt), [browser-validation.txt](../../docs/approval-clarity/evidence/browser-validation.txt), [browser-checks.json](../../docs/approval-clarity/evidence/browser-checks.json), [hosted-readback.txt](../../docs/approval-clarity/evidence/hosted-readback.txt), [hosted-readback.json](../../docs/approval-clarity/evidence/hosted-readback.json), [stable-identity.json](../../docs/approval-clarity/evidence/stable-identity.json), [reviewed-source-integrity.json](../../docs/approval-clarity/evidence/reviewed-source-integrity.json), [reviewed-candidate-identity.json](../../docs/approval-clarity/evidence/reviewed-candidate-identity.json), [reviewed-promotion.txt](../../docs/approval-clarity/evidence/reviewed-promotion.txt), [final-owner-row-desktop.jpg](../../docs/approval-clarity/evidence/final-owner-row-desktop.jpg), [final-owner-dialog-desktop.jpg](../../docs/approval-clarity/evidence/final-owner-dialog-desktop.jpg), [final-owner-dialog-phone.jpg](../../docs/approval-clarity/evidence/final-owner-dialog-phone.jpg).

**Acceptance:** Final hosted desktop and390px phone show Requested by, Awaiting owner approval ·0/1, and Review to open the request. Progress and current approval guidance precede the values. Retained dual-review history is displayed correctly. Isolated backend tests prove0/2→1/2→2/2, role/revision invalidation and required-role enforcement; no pending dual-review request exists in the current demo snapshot.

**Outstanding:** None for this bounded web-demo implementation. Existing request requires explicit owner approval; proposed economics and technical rewards flags remain unchanged. Pending dual-review lifecycle verified in isolated fixtures; hosted snapshot has no pending dual request. Native, production/provider/physical, actual-import and retention holds remain.

## APC-02

**Scope:** Existing Approval Centre /admin/approvals and loyalty.policy sole-owner authority; existing named request remains unapplied without its owner action.

**UI reference and route:** User reported155D9564 falsely read as approved and reiterated one admin/business owner; /admin/approvals.

**Authoritative source:** Current users, scoped change_requests, revision-bound approval_decisions and immutable owner authority audit_events; existing setting version.

**Security:** Explicit existing owner opt-in, own-request only, recent identity verification, immutable authority, expiry/version/validation and restricted review controls preserved.

**Implementation:** [apps/web/components/admin.tsx](../../apps/web/components/admin.tsx), [apps/web/lib/governance.ts](../../apps/web/lib/governance.ts), [apps/web/lib/service.ts](../../apps/web/lib/service.ts), [packages/business-rules/src/approval-progress.ts](../../packages/business-rules/src/approval-progress.ts), [apps/web/app/globals.css](../../apps/web/app/globals.css).

**Tests:** [tests/approval-clarity.test.ts](../../tests/approval-clarity.test.ts), [tests/owner-auto-approval.test.ts](../../tests/owner-auto-approval.test.ts), [tests/approval-pagination.test.ts](../../tests/approval-pagination.test.ts), [tests/shared-approval-gas.test.ts](../../tests/shared-approval-gas.test.ts), [tests/approval-clarity-browser.test.ts](../../tests/approval-clarity-browser.test.ts), [scripts/check-approval-clarity-demo.mjs](../../scripts/check-approval-clarity-demo.mjs). Executed IDs: `APC-OWNER`, `APC-PROGRESS`, `APC-SECURITY`, `APC-LABELS`, `APC-BROWSER`, `APC-DEPLOY`.

**Evidence:** [regression.txt](../../docs/approval-clarity/evidence/regression.txt), [types.txt](../../docs/approval-clarity/evidence/types.txt), [build.txt](../../docs/approval-clarity/evidence/build.txt), [final-focused.txt](../../docs/approval-clarity/evidence/final-focused.txt), [browser-validation.txt](../../docs/approval-clarity/evidence/browser-validation.txt), [browser-checks.json](../../docs/approval-clarity/evidence/browser-checks.json), [hosted-readback.txt](../../docs/approval-clarity/evidence/hosted-readback.txt), [hosted-readback.json](../../docs/approval-clarity/evidence/hosted-readback.json), [stable-identity.json](../../docs/approval-clarity/evidence/stable-identity.json), [reviewed-source-integrity.json](../../docs/approval-clarity/evidence/reviewed-source-integrity.json), [reviewed-candidate-identity.json](../../docs/approval-clarity/evidence/reviewed-candidate-identity.json), [reviewed-promotion.txt](../../docs/approval-clarity/evidence/reviewed-promotion.txt), [final-owner-row-desktop.jpg](../../docs/approval-clarity/evidence/final-owner-row-desktop.jpg), [final-owner-dialog-desktop.jpg](../../docs/approval-clarity/evidence/final-owner-dialog-desktop.jpg), [final-owner-dialog-phone.jpg](../../docs/approval-clarity/evidence/final-owner-dialog-phone.jpg).

**Acceptance:** The existing owner-authority opt-in now includes loyalty.policy as the sole owner business-policy exception. Named pending request exposes an own-owner Approve action after Review, with explicit identity and activation guidance. Isolated tests execute actual verified activation once and deny wrong owners/staff, missing verification, expiry and stale versions. Existing financial adjustments, access/payment and qualified safety tests pass. Named hosted policy stays unchanged until the owner explicitly acts.

**Outstanding:** None for this bounded web-demo implementation. Existing request requires explicit owner approval; proposed economics and technical rewards flags remain unchanged. Pending dual-review lifecycle verified in isolated fixtures; hosted snapshot has no pending dual request. Native, production/provider/physical, actual-import and retention holds remain.

## APC-03

**Scope:** Existing Approval Centre /admin/approvals and loyalty.policy sole-owner authority; existing named request remains unapplied without its owner action.

**UI reference and route:** User reported155D9564 falsely read as approved and reiterated one admin/business owner; /admin/approvals.

**Authoritative source:** Current users, scoped change_requests, revision-bound approval_decisions and immutable owner authority audit_events; existing setting version.

**Security:** Explicit existing owner opt-in, own-request only, recent identity verification, immutable authority, expiry/version/validation and restricted review controls preserved.

**Implementation:** [apps/web/components/admin.tsx](../../apps/web/components/admin.tsx), [apps/web/lib/governance.ts](../../apps/web/lib/governance.ts), [apps/web/lib/service.ts](../../apps/web/lib/service.ts), [packages/business-rules/src/approval-progress.ts](../../packages/business-rules/src/approval-progress.ts), [apps/web/app/globals.css](../../apps/web/app/globals.css).

**Tests:** [tests/approval-clarity.test.ts](../../tests/approval-clarity.test.ts), [tests/owner-auto-approval.test.ts](../../tests/owner-auto-approval.test.ts), [tests/approval-pagination.test.ts](../../tests/approval-pagination.test.ts), [tests/shared-approval-gas.test.ts](../../tests/shared-approval-gas.test.ts), [tests/approval-clarity-browser.test.ts](../../tests/approval-clarity-browser.test.ts), [scripts/check-approval-clarity-demo.mjs](../../scripts/check-approval-clarity-demo.mjs). Executed IDs: `APC-OWNER`, `APC-PROGRESS`, `APC-SECURITY`, `APC-LABELS`, `APC-BROWSER`, `APC-DEPLOY`.

**Evidence:** [regression.txt](../../docs/approval-clarity/evidence/regression.txt), [types.txt](../../docs/approval-clarity/evidence/types.txt), [build.txt](../../docs/approval-clarity/evidence/build.txt), [final-focused.txt](../../docs/approval-clarity/evidence/final-focused.txt), [browser-validation.txt](../../docs/approval-clarity/evidence/browser-validation.txt), [browser-checks.json](../../docs/approval-clarity/evidence/browser-checks.json), [hosted-readback.txt](../../docs/approval-clarity/evidence/hosted-readback.txt), [hosted-readback.json](../../docs/approval-clarity/evidence/hosted-readback.json), [stable-identity.json](../../docs/approval-clarity/evidence/stable-identity.json), [reviewed-source-integrity.json](../../docs/approval-clarity/evidence/reviewed-source-integrity.json), [reviewed-candidate-identity.json](../../docs/approval-clarity/evidence/reviewed-candidate-identity.json), [reviewed-promotion.txt](../../docs/approval-clarity/evidence/reviewed-promotion.txt), [final-owner-row-desktop.jpg](../../docs/approval-clarity/evidence/final-owner-row-desktop.jpg), [final-owner-dialog-desktop.jpg](../../docs/approval-clarity/evidence/final-owner-dialog-desktop.jpg), [final-owner-dialog-phone.jpg](../../docs/approval-clarity/evidence/final-owner-dialog-phone.jpg).

**Acceptance:** Final Ready451-file exact-source candidate35ed307 promoted to the stable client-demo alias. Actual desktop/phone checks and normal product API readback pass. All32 existing requests/decisions and the rewards policy,13orders,ledger,inventory,gas and QA wallet match baseline. No final approve/withdraw action, economic or technical flag activation, native build or wider production launch performed.

**Outstanding:** None for this bounded web-demo implementation. Existing request requires explicit owner approval; proposed economics and technical rewards flags remain unchanged. Pending dual-review lifecycle verified in isolated fixtures; hosted snapshot has no pending dual request. Native, production/provider/physical, actual-import and retention holds remain.

## Scope and execution history

- 2026-11-19: User explicitly requests Requested by/progress, demo deployment and single-admin fit. Preserve all prior phase IDs. Scope adds explicit sole-owner authority for loyalty.policy only under existing opt-in; no automatic application of the named existing pending request. Financial operations, access/payment and qualified safety controls retain their current approval rules. Dual-review requests retain0/2; owner EasyRewards uses0/1.
- 2026-11-19: Registered APC-01–03 before implementation. The user’s single-owner clarification explicitly changes loyalty.policy owner-authority eligibility only; original captured policies/decisions remain. Earlier ER/OWNER-AUTO matrices gain a continuation link with all prior stable IDs and denominators preserved.
- 2026-11-19: 58/58 governance/rewards regressions, build/types pass. The first test attempted to rewrite an immutable decision and was correctly blocked; corrected fixture uses actual request-changes/revise/submit transitions. Final4/4 rerun passes. No immutability guard was relaxed.
- 2026-11-19: Hosted initial readback assumed a pending dual-review fixture existed; none exists. Replaced this fixture assumption with the existing independently approved payment record521B825E, confirmed2/2and preserved hosted history. Pending0/2 lifecycle remains exercised by isolated tests. No artificial hosted financial request or second Admin created.
- 2026-11-19: UI followups distinguish Review from actual final Approve, put approval progress/guidance first, preserve sentence case, and show outstanding-review warnings only for open requests. Interim0ede0af/3a5fd76 candidates unpromoted;49ff045 briefly promoted, then final35ed307/dpl_7rBejjBZL91bqowRZBUAQsekjAJL replaced it. Final actual UI evidence is exclusively35ed307. Archive preparation buffer overflow was resolved by writing the Git archive to a temporary file;451 uploaded files matched final Git bytes and no local env/data/build artifacts were uploaded.
- 2026-11-19: Final named request pending0/1can_owner_apply true, zero decisions. Normal product readback preserves all32requests, policyversion/value,13orders,ledger,inventory,gas andwallet. Finaldesktop and390px phone pass, viewport restored.3/3requirements andgates,2/2critical,0exclusions. Existing production NO-GO, actual-import hold, retain-all and all unrelated gaps unchanged.

[Matrix validation](../approval-clarity/evidence/traceability-validation.txt).
