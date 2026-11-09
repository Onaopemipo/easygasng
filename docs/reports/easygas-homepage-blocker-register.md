# Homepage blocker register

Updated 2026-10-30. **NO-GO — Public Commercial Production** remains unchanged. These blockers do not stop independent local work. Runnable tasks and inherited dependencies are computed in the [task register](easygas-homepage-task-register.md). No confirmed P0 loss-of-integrity issue is being bypassed.

## HOSTED-DB

- Severity/category: P1 / Infrastructure.
- Affected requirement/component: Hosted migration, release testing and deployment.
- Root cause: Managed project quota reached; the user explicitly chose local-only development.
- Impact: prevents the affected acceptance claim, not unrelated local implementation.
- Status: OPEN.
- Decision/safe restriction: Preserve existing projects and continue local implementation.
- Owner: Business owner.
- Dependency: Production runtime.
- Safe continuation: Local PGlite and restricted-schema tests.
- Evidence: `docs/testing/easygas-homepage-regression-20261030.txt`, `docs/testing/easygas-homepage-browser-evidence.json`, and preflight.
- Next action: Do not create or pause a hosted project; obtain a separately authorised runtime.
- Closure verification: Execute reviewed migrations and managed acceptance on an approved environment.

## PG-CONCURRENCY

- Severity/category: P1 / Verification.
- Affected requirement/component: TM-15, concurrent moderation and production-like acceptance.
- Root cause: No running disposable PostgreSQL service; three environment-gated PostgreSQL checks remain skipped.
- Impact: prevents the affected acceptance claim, not unrelated local implementation.
- Status: OPEN.
- Decision/safe restriction: Do not substitute serialized PGlite for real multi-connection proof.
- Owner: Infrastructure owner.
- Dependency: Disposable PostgreSQL runtime.
- Safe continuation: Locked revisions and stale-review tests pass locally.
- Evidence: `docs/testing/easygas-homepage-regression-20261030.txt`, `docs/testing/easygas-homepage-browser-evidence.json`, and preflight.
- Next action: Provide the approved disposable test connection and execute concurrent mutation/advisor checks.
- Closure verification: Multi-connection tests pass with actual runtime grants and no lost state.

## PAYMENTS

- Severity/category: P1 / Business integration.
- Affected requirement/component: Public commercial payment acceptance.
- Root cause: The user requested payments remain unconnected.
- Impact: prevents the affected acceptance claim, not unrelated local implementation.
- Status: OPEN.
- Decision/safe restriction: Keep online providers unconnected; never label them live.
- Owner: Business owner.
- Dependency: Approved provider and credentials.
- Safe continuation: Existing configured local/COD restrictions and immutable ledgers are preserved.
- Evidence: `docs/testing/easygas-homepage-regression-20261030.txt`, `docs/testing/easygas-homepage-browser-evidence.json`, and preflight.
- Next action: Only connect a provider after a separate request and verification.
- Closure verification: Provider verification/webhook/reconciliation acceptance succeeds.

## GAS-POLICY

- Severity/category: P1 / Business configuration.
- Affected requirement/component: HP-06, HP-10 and live order acceptance.
- Root cause: Business gas quantity policy and available stock are not activated in the current installation.
- Impact: prevents the affected acceptance claim, not unrelated local implementation.
- Status: OPEN.
- Decision/safe restriction: Do not invent operational limits or stock to enable sales.
- Owner: Business owner.
- Dependency: Shared independent approval workflow.
- Safe continuation: Non-payable estimate; zero quantity/unavailable products do not show a payable total.
- Evidence: `docs/testing/easygas-homepage-regression-20261030.txt`, `docs/testing/easygas-homepage-browser-evidence.json`, and preflight.
- Next action: Propose/approve quantity limits and record real stock through existing modules.
- Closure verification: Authenticated order quote and checkout succeed with approved limits and real stock.

## FIELD-PERFORMANCE

- Severity/category: P1 / Verification.
- Affected requirement/component: HP-G08, release performance evidence.
- Root cause: No production field measurements exist; the browser read API did not expose the performance timing API.
- Impact: prevents the affected acceptance claim, not unrelated local implementation.
- Status: OPEN.
- Decision/safe restriction: Report actual evidence limits instead of manufactured LCP/INP/CLS numbers.
- Owner: Release owner.
- Dependency: Approved staging measurement environment.
- Safe continuation: Bounded homepage reads, server-rendered public content, optimized 168KB hero and preload.
- Evidence: `docs/testing/easygas-homepage-regression-20261030.txt`, `docs/testing/easygas-homepage-browser-evidence.json`, and preflight.
- Next action: Measure LCP/INP/CLS and accessibility under approved production-like conditions.
- Closure verification: Document measured targets and release sign-off.

## NATIVE-APP

- Severity/category: P2 / Optional external publication.
- Affected requirement/component: Optional native store badges.
- Root cause: No verified app-store publication links exist.
- Impact: prevents the affected acceptance claim, not unrelated local implementation.
- Status: OPEN.
- Decision/safe restriction: Use the working web account CTA; no fake store badges.
- Owner: Mobile release owner.
- Dependency: Published native apps.
- Safe continuation: Web account/rewards promotion remains functional.
- Evidence: `docs/testing/easygas-homepage-regression-20261030.txt`, `docs/testing/easygas-homepage-browser-evidence.json`, and preflight.
- Next action: Supply verified store links when published; native app implementation is outside this phase.
- Closure verification: Verified official URLs replace the coming-soon note.

Resolved during implementation: client-boundary compile error; missing anonymous-role handling in local bootstrap; dark benefit/navigation/authentication surfaces; GET-only detail request; in-app moderation reason dialog; unavailable-cart total; synthetic SKU fixture collision. Fresh browser/error records and final successful suites replace failed intermediate results.

## OS-EMULATION

- Severity/category: P2 / target-browser verification.
- Affected requirement/component: TH-07, optional System preference event behavior.
- Root cause: the browser control API does not expose colour-scheme emulation. A global desktop appearance change is outside this website implementation scope.
- Status: OPEN; resolution/listener code and unit checks are present.
- Safe continuation: explicit Light/Dark, storage fallback and cross-tab behavior are verified and independent.
- Owner/dependency: target-browser QA / approved test device.
- Next action: select System, change the OS preference on the test device and observe the root theme without losing form/cart state.
- Closure verification: both OS transitions pass and the evidence is recorded. No claim of physical OS-event verification is made in this phase.
