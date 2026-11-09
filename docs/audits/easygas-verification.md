# Workflow, tests, build and verification limits

## Commands actually executed for this audit

| Command / environment | Result |
|---|---|
| `git branch --show-current`, `git rev-parse HEAD`, `git status --short`, `git worktree list` | main, no resolvable initial commit, source tree untracked, one main worktree; baseline JSON retained |
| `npm test` | **79 passed, 0 failed, 0 skipped, 0 cancelled** in ~23.06s; nine Node test files; actual log retained |
| `npm run typecheck` | Passed, exit 0 |
| `npm run typecheck --prefix apps/mobile` | Passed, exit 0 |
| `npm run build` | Passed, exit 0. `/`, `/_not-found`, dynamic customer/admin/API routes, static `/icon.png`; actual log retained |
| `node --import tsx docs/audits/audit-probes.mts` | Passed reproduction assertions; **six confirmed defective API behaviors**, seven deterministic forecast utility cases; memory DB only |
| `npm audit --json` at root | Fresh registry result: zero known advisories; raw JSON retained |
| `npm audit --prefix apps/mobile --json` | Fresh result: eight affected dependency entries, three high/five low. These include transitive aggregate packages, **not eight distinct exploits** |
| Root/native `npm outdated --json` | Completed read-only registry comparison; pinned wanted versions equal current, newer latest versions recorded separately; no dependency updated |
| Isolated `EASYGAS_DATA_DIR=memory:// EASYGAS_BACKGROUND_JOBS=false EASYGAS_PREVIEW=true npm run dev --workspace apps/web -- --port 3004` | Started after local bind permission escalation, used only ephemeral data, stopped after browser observations |

Initial npm audit calls could not resolve registry inside the restricted sandbox; read-only approved network calls subsequently succeeded. No dependencies were installed. Build/dev artifacts and audit docs are the only generated local files; existing source/migration/configuration was not edited. Hosted pg/Supabase, provider test credentials and signed device environments were not used.

## Test catalogue and meaningful scope

| File | Count | Main coverage | Classification |
|---|---:|---|---|
| platform.test.ts | 39 | A–J governance, privileges, append-only triggers, checkout/stock/price, delivery/COD, session revocation | DB + security + business integration; includes forecast unit case |
| workflows.test.ts | 11 | Account ownership/recovery, support, products, purchasing, cylinders, transfers, profiles, staff, maintenance | DB/service integration |
| commerce.test.ts | 8 | Funding independence, wallet retries/overdraft/concurrent calls, POS, refund/rewards/prepaid delivery | DB + financial/security integration |
| http.test.ts | 7 | HTTP function invocation, cookie/bearer parity, origin/method/JSON/body size | In-process HTTP handler integration, not a deployed browser E2E suite |
| scheduling.test.ts | 5 | Recurring consent, ceilings/revocation, capacity, campaign approval/consent/dedupe | DB/service integration |
| delegation.test.ts | 3 | Grant review, limits/expiry/revocation, financial/security exclusion | DB/security integration |
| deployment.test.ts | 3 | Actual bootstrap SQL, schema grants/RLS, restricted server operations | DB permission/deployment-contract integration in PGlite |
| catalogue-import.test.ts | 2 | Exact import, no invented stock, preserved order prices/reservations, once-only upgrade | DB migration integration |
| backups.test.ts | 1 | Encrypted snapshot authentication and actual isolated DB restore | Backup/integrity integration |

No coverage instrumentation/percentage, maintained Playwright/Cypress browser E2E, mobile unit/device automation, accessibility scanner suite or performance/load suite was found or run. Some concurrency tests issue concurrent promises, but PGlite serializes transactions; this is not real pg-pool multi-session stress. Passing tests demonstrate valuable implemented safeguards without covering all master acceptance scenarios.

## Cross-module business workflows

### A — Customer purchases gas: PARTIALLY IMPLEMENTED / PARTIALLY VERIFIED

Selection/cart/zone/server total and reservation have UI/backend implementations; checkout backend controls are tested. COD has no online provider initiation and starts unpaid; wallet spending verifies its internal credit debit. Core local chain checkout → staff accept/prepare/driver assignment → dispatch → customer code → delivery stock movement → independent cash verification → verified revenue/reward entries is executed in `platform.test.ts:665` and restricted-role `deployment.test.ts:69`. No real payment or physical delivery occurred.

Notification steps create in-app records only; no provider delivery. Customer order display includes snapshots/timeline, but full receipt issuance/export through customer UI is not acceptance-tested. Refill history updates lazily by profile read/job, with F05 timestamp defect. Physical cylinder allocation absent (F03); inactive/cross-branch checkout and reactivation capacity fail F01/F02/F06. Full UI multi-device ordering/recovery not verified.

### B — Walk-in gas sale: PARTIALLY IMPLEMENTED / PARTIALLY VERIFIED

`commerce.test.ts:139`: opens shift, server prices selected lines, cash tender validation, atomic stock deduction, replay-safe receipt, independent exact cash-up. POS values contribute to revenue only after shift verification. UI exposes a simpler single-product form; API accepts multiple lines. No linked customer purchase/refill history, cylinder exchange/deposit, electronic payment, offline POS, return or cash variance resolution. Receipt record exists; real hardware/print UI unverified. Full nine-step requested workflow cannot pass as a whole.

### C — Smart reminder: PARTIALLY IMPLEMENTED

Eligible verified delivered order → profile/history ingestion → interval forecast → maintenance eligibility/quiet/opt-out → deduped in-app notification exists. Source and existing tests verify parts; audit forecast cases and F05 expose limits. Approved external notification delivery, customer-open/reorder attribution, conversion recording, external-refill reset and cancellation of obsolete notifications are missing. Utility tests do not prove reminder-to-order retention gains.

### D — Wallet purchase: PARTIALLY VERIFIED INTERNAL-CREDIT PATH; PROVIDER FUNDING BLOCKED

`commerce.test.ts:52,86,114,186,251,279`: independently reviewed cash-funded purchase credit → wallet checkout atomic debit → duplicate protection/insufficient funds → prepaid delivery/no cash → full refund credit and points reversal. Existing tests verify actual internal ledger movement in memory. No configured payment provider, funding callback/settlement, partial tender, cash/provider refund or treasury bank reconciliation. “Provider funding passed” would be false. No real financial transaction occurred.

### E — Cylinder exchange: NOT IMPLEMENTED

Serial registration, inspections and generic custody exist. No exchange eligibility/paired incoming-outgoing allocation/deposit adjustment/return confirmation operation or linked order model. F03/F04 demonstrate why separate modules cannot be counted as an exchange workflow. No exchange test passed.

### F — Restricted settings change: IMPLEMENTED SUBSET / LOCAL API VERIFIED

Existing tests execute propose → policy/role/scope check → approver in-app notification → independent single/dual approvals → live authority/version checks → active setting consumed by product/checkout services → immutable version/audit. Rejection, revision, rollback, stale/conflicting requests, scheduled activation, emergency protective disable and revocation have tests. Full original setting coverage, editable policy governance, production worker delivery and every web/native approval UX were not verified. Limited delegation is not financial delegation.

## Browser/UI observations

Public catalogue at port3004 showed all eight prices plus four draft/unpriced accessories in development; all had no stock and add buttons correctly disabled. Empty-cylinder filter narrowed to four items. Product views use illustrative art and explicit availability language. Homepage has working link destinations, quick-order controls, honest native-in-development promotion, contact/footer, menu toggle and no sample customer balances. Browser inspection was read-only; no UI stock or payment was created.

Hydrated public routes `/about`, `/how-it-works`, `/business`, `/help`, `/contact`, `/privacy`, `/terms`, `/delivery`, `/cart`, `/checkout` rendered. Checkout guest state showed sign-in. Auth/recovery/invitation routes rendered forms. Account-related guest routes were sampled; some raw snapshots caught loading/redirect transitions and **are not proof of broken routes**. No route was classified defective merely from those transient observations. `app/[...slug]/page.tsx:3` and admin allowlist were reviewed for every permitted route; a standalone refund policy route is absent. Arbitrary unknown routes use notFound. Authenticated admin workflow behavior is covered through API tests/source inspection, not a newly executed complete browser-admin walkthrough.

Measured homepage dimensions: 1280→1280 document width, 768→768, 390→1686. At mobile size the compact product strip widens the parent; F07 documented with screenshot. Tablet contact measured 768→768. These are layout measurements, not CWV, accessibility conformance or performance benchmarks. Viewport was reset and audit tab closed; temporary preview stopped.

Design differs from supplied mockups where functionality is unavailable: no fabricated customer/reviews/live map, no active app-store links, no unrestricted wallet withdrawal. Current native header still uses screenshot-based branding rather than web's new original logo (`mobile/App.tsx:318`). No native visual/device QA performed. Catalogue cylinders of different sizes share illustrative art; 25/50kg art does not establish actual dimensions/specification.

## Integration and dependency evidence

Root: zero known advisories at check time. Mobile: Zod oversized constrained collections advisory [GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5), deepmerge prototype poisoning [GHSA-gcqx-w48m-w2h4](https://github.com/advisories/GHSA-gcqx-w48m-w2h4); aggregate affected Expo packages in raw JSON. These are dependency advisories; exploitability in shipped app vs build tools needs assessment. npm suggests Expo 51.0.39 as a major-version remedy for current Expo58 tree; **not applied** because compatibility is unproven. No unsupported-package assertion was made solely because a newer version exists.

Payment adapter/callback/reconciliation, external email sender, SMS, WhatsApp, push, routing/maps and telemetry providers were not found in runtime services. No sandbox provider operation or ongoing provider cost was verifiable. Local-only database selection and unconnected payments are accepted user constraints. App API and local outbox are real implementation; successful external delivery is not.

## Fresh native JavaScript export

Executed from `apps/mobile`: `CI=1 EXPO_OFFLINE=1 node node_modules/expo/bin/cli export --platform ios --platform android --output-dir /tmp/easygas-audit-native-export`. Exit0; produced Android/iOS Hermes bundles plus metadata and the two existing assets. Actual log: `native-export-results.txt`. This verifies installed tooling can export current JavaScript for both platforms without fetching/installing packages. It is **not** a signed IPA/APK/AAB, simulator/device execution, store submission, push/deep-link acceptance or remediation of dependency advisories. The native logo remains its existing screenshot asset.
