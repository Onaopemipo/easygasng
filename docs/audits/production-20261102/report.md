# EasyGas production blocker audit — 2 November 2026

**Decision: NO-GO for the requested web plus signed iOS/Android release.** This is a repository-wide release audit, not penetration-test, legal, LPG-safety or app-store certification. Passing code tests does not supply the missing business data, infrastructure or field acceptance. No production code/configuration was fixed or activated during this audit; only audit reproductions and records were added. Production and local customer data were not used as test fixtures.

The recent local HTTP500/schema043 issue is repaired and is **not** an outstanding blocker. The local homepage/catalogue/health respond successfully. Several older reports still say independent PostgreSQL tests could not run; that statement is superseded by executed evidence below. Their deployment/physical/recovery acceptance gates remain open.

## Evidence and scope

Re-read authentication/session/origin and API dispatch, customer/privacy, staff/branch permissions, catalogue/media, gas pricing/checkout, delivery proof/returns, finance/refunds/rewards, service recovery, reporting, email worker, backup/release checks, Docker/nginx/CI and native config/offline handling. Enumerated existing route/module/test and traceability inventories. This is source and automated/integration evidence across the app; final visual/device workflows and live infrastructure are explicitly not certified.

- Current regression: **279 passed, 0 failed, 0 skipped**, with explicitly isolated local PostgreSQL. Includes independent tracking/approval/service/reward races, restricted server RLS/public access negatives, encrypted restore and worker SIGTERM. [Log](regression.txt).
- Isolated production-mode **preview-directory** web compilation passed; the regular local dev server was left running. Web/native TypeScript checks passed. [Build](build.txt), [web types](web-types.txt), [native types](native-types.txt). This is not a tested production container or signed native binary.
- Fresh npm runtime dependency audits: web **0** findings; native **12 affected package entries, all moderate, 0 high/critical**, propagated from glob/minimatch advisories. These are toolchain exposure and not proof of an exploitable mobile-runtime issue. Native CI currently audits at moderate, so it will fail until resolved or explicitly governed risk acceptance changes the gate. [Web audit](web-dependencies.json), [native audit](native-dependencies.json).
- Two targeted reproductions both confirmed defects. Their green assertions demonstrate the **bad behaviour**; they are not successful security acceptance. [Reproductions](defect-reproductions.txt).
- Current release preflight rejects 6 of 7 environment checks (preview check passes). It stops before managed database checks because this is the local environment. [Preflight](preflight.txt).
- Public runtime snapshot: 12 catalogue products, all reported availability0, ordering/COD/wallet false, minimum/maximum/increment/precision gas policy unset, zero publicly available services. This describes the local configured data, not an assertion about unknown production stock. [Snapshot](public-runtime.json).
- Owned test database was dropped and its PostgreSQL loopback process stopped after tests. No changes to the normal running business database, no messages sent, no hosted resources, signing or deployment. Previous browser-origin refusal was preserved; no alternate-origin bypass.

## Confirmed code defects

### AUD-B01 — P1 security: TLS preflight can approve disabled certificate verification

Source: `apps/web/lib/release-checks.ts:42` and installed pg-connection-string parser. With DATABASE_URL containing `sslmode=require&uselibpqcompat=true`, and PGSSLMODE=verify-full in the environment, every environment check can pass. The actual parsed Node PostgreSQL SSL configuration has rejectUnauthorized=false. The URL overrides the effective environment policy, but the guard accepts either value. The database check only asks whether TLS is active; encryption alone cannot prove certificate/hostname verification. No live interception was performed and no production database is connected.

Reproduction AUD-01 in `tests/production-audit-findings.test.ts` asserts both preflight approval and the real parser's disabled verification using synthetic credentials. Before deployment, validate the *effective* parsed TLS settings, reject conflicting/insecure URL overrides, and test valid verified TLS, bad CA and wrong hostname against an isolated TLS-enabled server. Owner: backend/platform. Existing PR-R01 has been changed from VERIFIED_COMPLETE to DEFECTIVE; historical positive tests remain recorded.

### AUD-B02 — P1 email integrity: retry can duplicate an in-flight email

Source: `apps/web/lib/transactional-mail.ts:89` and `:174`. A worker labels its durable claim failed before it starts network I/O. The owner UI/API treats that state as retryable immediately. While the first transport is still sending, an authenticated/recently verified owner can acknowledge retry, requeue the same ID, and another worker can send it a second time. Explicit duplicate acknowledgement is required, so this is not an anonymous/unauthorised replay; nevertheless a healthy in-flight message is falsely presented as failed and needs no retry. No money or point duplication is implied.

Reproduction AUD-02 holds the first injected transport open, performs the actual authorised retry API, and observes two sends of the same message ID before releasing the first. Before SMTP activation, distinguish active leased sends from uncertain/terminal outcomes; enforce claim ownership/lease fencing on retry and result commits; test concurrent workers, timeout, crash and owner retry. Preserve manual review for genuinely uncertain sends—SMTP does not provide exactly-once delivery. Owner: backend/communications. PR-R05 is now DEFECTIVE; its existing privacy/backoff/expiration positives remain valid.

## Launch blocker register

| ID | Priority / type | Blocker and practical consequence | Required exit evidence / owner |
|---|---|---|---|
| AUD-B01 | P1 / confirmed defect | Conflicting TLS settings can pass the production guard without certificate verification. | Fix effective TLS validation; negative CA/hostname/override tests. Backend/platform. |
| AUD-B02 | P1 / confirmed defect | An in-flight email looks failed and can be retried concurrently. | Lease/fencing and race/crash/retry acceptance before enabling SMTP. Backend/communications. |
| AUD-B03 | P0 / missing implementation + policy | Privacy deletion only creates a pending request; controlled retention/erasure fulfilment is absent. | Approved data classification/retention rules, verified authority, tested PII/free-text/media/backup handling and financial/safety retention exceptions. Business/privacy/backend. |
| AUD-B04 | P0 / actual local operating configuration | Ordering, COD and purchase-credit spending are disabled; all public product availability is0; gas quantity rules are null; no public services. Customers cannot complete the advertised core purchase/service journey in this configuration. | Approve actual quantity/price/location/capacity policies; reconcile real stock/serials; configure independent approvers and qualified services; run stocked checkout/fulfilment/refund acceptance. Business/stock/finance/service owner. Do not fabricate stock or bypass approvals. |
| AUD-B05 | P0 / infrastructure | No proven production HTTPS origin, restricted verified-TLS DB identity or supervised deployment in this workspace; current configuration is local. | Authorised provisioned environment, secrets, DNS/certificates, migration/runtime separation, deployment-specific RLS/TLS tests and restart acceptance. Platform/owner. Local-only decision remains until explicitly changed. |
| AUD-B06 | P0 for selected native scope / distribution | No accepted signed distribution binaries/store configuration/device signoff. Existing EAS login and Apple Development identity do not establish App Store/Play distribution readiness. | Confirm bundle/package ownership, EAS project, distribution credentials, signed Android/iOS builds, store privacy/data-safety declarations and device acceptance. Mobile/owner. |
| AUD-B07 | P1 / dependency release gate | 12 moderate native toolchain affected-package entries remain; CI's moderate gate blocks them. Web has zero current findings. | Upstream-compatible fixes or explicit documented security risk disposition; re-audit, align Expo and re-export/rebuild. Do not force the suggested incompatible Expo downgrade. Mobile/security. |
| AUD-B08 | P1 / release integrity | Git HEAD is unborn and source is untracked; there is no reviewed immutable release/rollback baseline or executed hosted CI run. A SHA-shaped string is not a reviewed artifact. | Reviewed versioned source, CI evidence bound to actual revision, reproducible artifact and compatible app/database rollback drill. Release owner. No commit/push authorised by this audit. |
| AUD-B09 | P1 / continuity | Isolated encrypted PostgreSQL restore passes, but scheduled/off-site retention/PITR, production RPO/RTO/owners, restored runtime ACLs and actual cutover/rollback are unaccepted. Restore tools deliberately omit ownership/grants. | Test restored DB using restricted runtime after reviewed grants; reconcile ledger/stock/jobs; prove off-site restoration and accepted RPO/RTO on the intended platform. Operations/platform/finance. |
| AUD-B10 | P0 / business and physical acceptance | Approved customer policies, finance cash/credit/refund reconciliation, actual LPG inspections/custody/returns, technician qualifications and independent authority are not certified by fixtures. | Named business/finance/qualified safety/service owners approve real configuration and operating/fallback procedures with evidence. No software test grants physical certification. |
| AUD-B11 | P1 / untested experiences | Final full web/admin/responsive/theme/a11y and physical iOS/Android lifecycle/offline/secure-store/account-switch acceptance remain unverified. Native exports/types alone are insufficient. | Reviewed scenario-based acceptance, signed real-device builds, interrupted-request/revocation/reassignment recovery and accessibility evidence. QA/mobile/operations. |
| AUD-B12 | P1 / deployment/security/performance acceptance | Docker daemon unavailable, nginx runtime untested, hosted CI not executed; external alerts/on-call, SSE/proxy behaviour, load/abuse limits and independent security review remain unproven. | Actual container/proxy/TLS/SSE/load/outage tests, actionable redacted diagnostics, alerts and response ownership. Verify global auth budget under expected legitimate load. Platform/security. |

## Area-by-area assessment

| Area | What is actually evidenced | Remaining release boundary |
|---|---|---|
| Public site/search/addresses/themes | Existing implementation, compilation and regression checks; local public APIs healthy. | Final visual/mobile/a11y/content acceptance; stock/configuration currently prevents sales. |
| Customer dashboard/account/support | Ownership/session/branch restrictions, account export and support persistence have tests. | Privacy fulfilment, verified recovery email and final browser/device acceptance. |
| Staff/roles/approvals | Shared independent approval controls, invitations, suspension/reinstatement and restricted role tests. | Real role holders/independent approvers and access review; source UI does not prove staff provisioning. |
| Products/import/inventory | Catalogue/import/price snapshots, stock/valuation/count/transfer and authority tests. | Real counts/units/serial reconciliation, approved sellable policy/media and returns operating acceptance. |
| Gas/delivery/tracking | Pricing/one fee/gram reservation/custody/code/return and independent contention tests. | Quantity policy unset; real stock/capacity and qualified physical acceptance; approved failure fallback. Partial physical delivery remains unavailable. |
| Professional services | Booking/material/report/acknowledgement/cash/refund/recovery tests including PG contention. | No public active services locally; genuine qualifications/availability/policy/field signoff and final client/device acceptance. |
| Cash/credit/refunds | Immutable verified transactions, partial financial refunds and replay/clawback tests. | Actual finance reconciliation and accepted exception procedures; current tender/spending switches disabled. Provider refunds/bank settlement not connected. |
| Rewards/referrals | Approved-fixture policy, offers/budgets/refund/referral/service/Smart forecast tests. | Real approved economics still absent and flags OFF; do not activate from fixtures. Final native/browser acceptance and physical partial handover remain open. |
| POS/suppliers/commercial | Basic tested POS till/supplier receipt/report foundations. | Scope conditional: full offline POS, POS reversal/variance settlement, accounts payable/commercial contracts/credit controls are not completed merely by roles/menu entries. Exclude unimplemented capabilities from launch promises or finish their own scope. |
| Reports/analytics | Scoped reports, immutable source reconciliation/export and safe formatting tested subsets. | Finance metric/cost completeness and actual reconciliation acceptance; not a full certified accounting system. |
| Notifications | In-app state and SMTP adapter/backoff/privacy tests; sender remains OFF. | AUD-B02 plus verified sender/DNS/inbox/provider-outage acceptance; no live SMS/WhatsApp/push provider. |
| Native staff/customer | Role-specific code preserved; compatible Expo patch, exports and TypeScript evidence. | Distribution signing, moderate advisories, secure-store/offline/lifecycle/device/a11y acceptance. |
| Infrastructure/recovery/security | Source preflight/health/worker/backup/container/CI controls; actual local PG restore and worker SIGTERM tests. | AUD-B01, deployment-specific privileges/TLS, container/CI execution, off-site recovery/load/monitoring/security acceptance and source baseline. |

## Conditional capabilities — do not confuse these with universal launch blockers

Online payments remain deliberately disconnected. Their absence is not a blocker for an explicitly approved COD/verified-credit release, but online payment advertising, electronic debits, provider refunds or settlement require their own real integration and verification. Likewise GPS/live ETA, partial physical deliveries, alternate delivery proof, multi-tenant hosting, household accounts, offline POS, advanced tiers/expiry, WhatsApp ordering and commercial credit/contracts must remain unavailable/unadvertised until independently completed and accepted. Existing timeline tracking is implemented; GPS tracking is not. Finance/operations must accept the safe all-items proof/failure/return/reschedule path if alternate proof/partial handover is excluded.

Because the user explicitly selected web **and signed native apps**, native signing/dependency/device gates are part of this release, rather than silently deferred.

## Corrections to older blocker reports

- “No PostgreSQL binaries/independent tests available” is obsolete. This audit executed the current suite with real local PostgreSQL; concurrency/tooling availability is cleared locally. Deployment-specific scale/role/TLS/outage evidence is still separate.
- “Partial financial refunds, offer budgets, referral review and Smart offer code are absent” is obsolete; current implementation/tests exist. Partial **physical** handover is still unimplemented and fails closed.
- “No SMTP adapter exists” is obsolete; code exists, but sender activation/acceptance and AUD-B02 remain blockers.
- “The local site always returns HTTP500 due to043” is resolved; the compatibility fix is tested. The incident is evidence that migration markers alone are insufficient upgrade acceptance.
- Older phase matrices are historical acceptance snapshots with some unresolved/stale rows; do not sum their verified counts into a fabricated whole-app completion percentage. Stable requirement IDs and outstanding denominators are preserved. This audit updates the directly contradicted production-release rows and supplements all prior scope with its own register.

## Dependency-aware closure order

1. Fix AUD-B01 and AUD-B02; complete privacy policy/fulfilment design and implementation (AUD-B03). These can proceed without production hosting or signing accounts.
2. In parallel, owner/finance/operations supply actual sellable policies, stock, qualifications, notices, recovery objectives and independent approvers (AUD-B04/B10). Do not simply flip switches.
3. Establish reviewed source/artifacts/CI, provision the explicitly authorised infrastructure, configure verified sender and off-site recovery, then execute deployment/security/load/drill acceptance (AUD-B05/B08/B09/B12).
4. Mobile team resolves/disposes advisories, confirms store/project/distribution identities, builds signed binaries and executes real-device acceptance (AUD-B06/B07/B11). This can progress alongside platform work.
5. Run the final stocked web/native end-to-end cases against the actual reviewed release, reconcile finances/stock and obtain independent business/safety/finance/platform/mobile release approval. Keep GO decision separate from technical preflight.

No production readiness claim, percentage-based GO or automatic activation is justified by this audit. The two defect reproductions are expected to stop passing once corrected and should then become prevention regressions.
