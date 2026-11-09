# EasyGas master repository audit and implementation gap analysis

Audit date: **29 October 2026, Australia/Brisbane**. Scope: existing local repository, its web/admin/API/native source, migrations/policies, requirements and safe isolated execution. No implementation, redesign, deployment or live business-data changes were performed.

**Conclusion: substantial local foundation; NOT ready for full commercial production.** The repository builds and 79 existing tests pass, but additional probes reproduce six API control/data defects and a mobile layout defect. Many complete business workflows and operational release gates remain incomplete. Neither all-green tests nor a screen/table/setting name establishes end-to-end completion.

## Executive findings

- **Critical safety-control gap F03:** serialised-cylinder products can be delivered with zero physical cylinder records; inspection/quarantine/custody modules do not gate allocation at sale/dispatch.
- **High F01/F02/F04/F06:** inactive branch accepts orders; other-branch staff can create Lagos orders; current cylinder custody can be replaced without return; failed-delivery reassignment overbooks capacity.
- **Medium F05/F07:** refill history uses payment-verification timestamps instead of fulfilment; mobile homepage document width reaches1686px at390px viewport.
- Core safeguards are real: server prices, reservation/deduction/cancel transactions, owned customer data, opaque hashed sessions, current-role checks, independent approvals/dual approval, immutable ledgers, code-confirmed delivery, independent COD/credit verification, replay protection, local restore and consent-bound recurrence.
- Missing/incomplete release capabilities include provider email/recovery and other external notifications, physical exchanges/deposits/bulk gas accounting, commercial contracts/credit/invoices, full POS returns/offline/variance, complete liabilities/cost reporting, privacy erasure/policies, durable monitored production workers/backup/restore/CI and native release/device readiness.
- Online payments remain **intentionally disconnected**, cloud hosting deferred under the user's local-only decision. Missing optional AutoPilot/SmartSaver/WhatsApp/dispatch intelligence is assessed separately from core defects.

## Deliverable map

[Baseline](baseline-2026-10-29.json), [architecture/database](easygas-architecture-audit.md), [55-group feature matrix](easygas-feature-matrix.md), [security and reproductions](easygas-security-and-integrity.md), [forecast analysis](easygas-refill-prediction-audit.md), [15 advanced features](easygas-advanced-feature-gaps.md), [workflow/test/build evidence](easygas-verification.md), [business risks](easygas-business-risk-assessment.md), [25-risk register](easygas-risk-register.md), [production blockers](easygas-production-blockers.md), [remediation](easygas-risk-remediation-plan.md).

## Phase 0 — baseline and safety

main branch, **no initial commit** (HEAD does not resolve), one main worktree. Application tree is untracked; no staged/committed application baseline. No Git clean/reset/staging/commit performed. Root and native npm lockfiles; root workspace web only. Environment file paths/key names recorded without values; DATABASE_URL not supplied to audit. Existing deployment/database/audit docs discovered, including older `docs/repository-audit.md`; none overwritten. New audit deliverables were placed under previously absent `docs/audits/`.

All execution writes were synthetic/in-memory or generated build/audit artifacts. No install, production DB query/write, live provider request, credential rotation, outbound communication, financial transaction/refund or deployment. Temporary browser preview isolated at3004 and stopped. Existing business server not used for test transactions or stopped. Native export went to /tmp.

## Phases 1–2 — actual architecture and classification

Next.js Node application serves customer, staff and action API. Expo/RN client consumes same API. Shared package contains interval forecast and order transition rules; most business logic is trusted-server TypeScript backed by pg/PGlite. Supabase is a prepared private-schema deployment target, not a provisioned live backend or Supabase Auth implementation. See architecture report for entry points, connections, circular dependencies and source-size/coupling risks.

The feature matrix uses all specified status definitions, explicitly limits VERIFIED COMPLETE to tested bounded behaviors, and supplies intent, code/services, persistence, tests, gaps/impact and next action for every audited group. Parent-module completion is not inferred from narrow API acceptance. Unknown device/cloud behavior is IMPLEMENTED — UNVERIFIED or BLOCKED. Optional features have original-scope relationships and effort/dependencies separately.

## Phase 3 — customer website

Public homepage/catalogue/information/contact/auth/empty-cart routes inspected in code and isolated browser. Original HD logo, colours, hero, quick order/track links, categories, contact/footer, rewards/account and honest native-app promotion present. Current physical location is a Lagos service-area link, not GPS/branch selection. Mobile navigation toggles; mobile homepage fails layout width F07. Full UI shopping with stocked fixture was not executed during this audit; API authoritative price/stock/quantity/order persistence is tested separately. Product prices include all eight supplied refill/empty-cylinder prices; stock remains zero in default catalogue, so product-card add buttons disable. Development shows four additional drafts; production filters publication.

Cart is local persistence with client controls and server checkout revalidation. Discounts/tax/current-price acknowledgement and complete browser failure/retry acceptance are unfinished or unverified. Customer account has owned profile/addresses/orders/credit/rewards/schedules/support/notifications; recovery token machinery works but no email sender. Privacy/terms explicitly warn unpublished, delivery/refund policy awaiting approval, no standalone refund page. Business supply is a marketing/contact page, not B2B contracts. See route-observations JSON for sample rendering; transient loading observations are not classified as failures.

## Phase 4 — native customer/driver/staff experience

Real Expo source, secure token/cart storage, customer shopping/account forms and driver delivery/pending-sync screens. No fabricated user balances/history found in reviewed source; estimate UI points to cooking profile. State-based screen navigation, no implemented onboarding/animated splash, no verified deep-link handler, biometric/phone/social verification or push provider. Sessions clear on401 in code. Offline feature is a secure pending-completion queue, not full offline ordering/POS/dispatch. Source uses screenshot-crop native logo, unlike new web original. Typecheck and offline iOS/Android JS exports pass; actual device layouts, safe area/keyboard/tablet/startup/memory/lifecycle/queue behavior not measured. App config lacks bundle/package identifiers, release icons/splash/build profiles/signing/store evidence.

## Phase 5 — business administration

Metrics derive from actual records; verified-delivered order revenue plus verified POS shifts, pending orders, customers and available product counts. Low-stock data comes from inventory; no fabricated charts/GPS/customer lists accepted as real features. Complete liability/profit/cost/receivable/forecast reporting missing. Core orders/transitions/assignment/cash/credits, scoped customer/staff/product/inventory and separate operations tools exist. Catalogue metadata owner-managed, prices/publication governed; no upload/media/variants/archive lifecycle. POS cash receipt/stock/independent cash-up API works locally; UI single-line and lacks customer linkage, exchanges/offline/returns/electronic tender/variance resolution. Invitations initially unprivileged, roles independently governed, suspension revokes sessions; reinstatement/email delivery incomplete.

## Phase 6 — stock and cylinders

Product counts/reservations and audited movements are protected by constraints/transactions/references, with tests for oversell, cancel/replay/receipt/transfer. No bulk kg tank ledger, serial-to-sale allocation, deposits/exchanges/recalls/incident/stocktake reconciliation. Inspection/quarantine/current-custody records exist but F03/F04 break complete physical lifecycle. Refund credit does not invent stock return. Physical training, qualified inspection and LPG compliance cannot be inferred from fields/checkboxes. Inventory loss/fraud is a potential consequence, not observed loss.

## Phase 7 — fulfilment

Configured zones/windows/fee and atomic checkout capacity; active same-branch driver selection, assigned-only driver access, status timeline and code-confirmed exact COD/prepaid delivery. Independent finance reconciliation. F06 reactivation exceeds capacity; driver duty/vehicle capacity, route/navigation/location/ETA, full failed-delivery/code-renewal/reschedule and offline conflict handling incomplete. No live notifications delivered; in-app records only. Single row locks/unique collections prevent local duplicate completion; real pg race/device proof outstanding.

## Phase 8 — prediction

Adaptive weighted interval calculation, minimum verified history, sparse-data/estimate disclaimer and separate customer/product profile. Mandatory ten scenarios are individually assessed in the prediction report: seven deterministic utility cases executed, remaining external-refill/opt-out/stale reminder cases explicitly source-inspected gaps. F05 wrong time provenance; feedback not used, same-size multi-cylinder attribution unsupported, no historical model outputs/error calibration/conversion metrics. Daily dedupe/quiet hours are real but external delivery and obsolete-notification cancellation are not implemented.

## Phases 9–11 — money, loyalty, recurrence and communications

Internal credit is restricted cash-funded purchase credit, not a bank savings account or enabled online funding. Unique sources, independent review, ledger append-only, customer lock/insufficient-funds checks, cancellation/refund controls and reward earning/reversal are exercised locally. No provider initiation/webhook/refund/settlement or partial payment. Finance books/funding settlement/clawback still incomplete. Base loyalty points/configured conversion exist; tiers/expiry/referrals/streaks/personalised offers absent. Schedules pause/cancel; separate explicit consent authorises capped recurring COD with occurrences/dedupe/failure records, no external debit. In-app campaigns require independent review, opt-in, quiet hours and recipient dedupe. Queued email/outbox tables and preference screens are not channel delivery/retry integrations.

## Phase 12 — settings ownership and governance

| Requested settings category | Current finding |
|---|---|
| General business | Opening hours setting; contact/logo/content are code/assets, no governed complete business profile |
| Products/pricing | Dynamic branch price and publication definitions, independently approved; no variants/media policy |
| Delivery | Fee/zones/windows/enable/capacity; no express/driver/route/neighbourhood policies |
| Inventory/cylinders | Hardcoded/default per-inventory threshold; no comprehensive adjustment/inspection/deposit/reconciliation settings |
| Payments/wallet | COD/integration flag/settlement metadata/maximum cash credit/spending flag; no actual provider connector |
| Loyalty | Enable/spend-per-point/conversion; no tiers/referral/expiry policy |
| Refill intelligence | Fixed algorithm thresholds; no governed forecast parameters/history policy |
| Scheduled refills | Enable flag and per-customer authorisation; no full recurring commercial/electronic billing rules |
| Notifications | Customer preferences/campaign approval; no business channel/template/retry policy administration |
| Staff permissions | Governed role+branch change; limited delegation; full permission matrix/policy editing locked |
| Website content | Source-code pages/assets; no CMS approval/version workflow |
| Branches | Owner create, defaults copied; no complete active-state/customer fulfilment governance |
| Reports | Restricted queries/CSV; no full metrics/tax/retention/export policy catalogue |
| Security | Reauth and fixed policy protections; policy setting not editable, no MFA/session timeout editor |
| Integrations | Protective integration flag, no external credential/provider activation workflow |

Implemented definitions carry owner/risk/scope/roles/value validation and settings versions; immutable request decisions/audit. Levels1–4, self-approval protection, revisions/rejections/scheduled activation/rollback/emergency disable/current authority checks have tests. Some settings categories absent, other business fields hardcoded; therefore “every sensitive setting governed” cannot be claimed. Limited delegation only Level2 publication/capacity; not unrestricted financial delegation. Direct crafted API escalation cases are in security report.

## Phase 13 — commercial accounts

Commercial role and normal shopping eligibility are not contracts, company tenancy, negotiated prices, bulk account credit, statements, invoices or multi-location delegated permissions. Dedicated schema/services/UI/test suite absent. Do not launch commercial account-credit promises; ordinary prepaid/COD customer use is a distinct scope.

## Phase 14 — advanced features

Fifteen proposed differentiators assessed in separate table with status, original/enhancement/optional relationship, reusable sources, missing work/DB/integrations/security, value, phase, complexity and effort. No new module implemented. AutoPilot is basic reporting/signals rather than predictive interactive recommendations; Demand Radar is thresholds rather than seven/14/30-day validated demand planning. Optional innovations do not outrank confirmed integrity defects.

## Phases 15–17 — end-to-end, database and security

Workflow A purchase, B POS, C reminder, D wallet, E exchange, F restricted setting are evaluated step by step in verification report. A/B/C/D are partial, E absent, F implemented subset locally verified. No full-platform browser+native+provider end-to-end pass claimed.

Schema tests execute keys/constraints/grants/RLS/immutability and real service operations. Private trusted server role has cross-branch DB access by design, so app permission bugs still matter. Six safe API reproductions retained. Fifteen requested security scenarios mapped to executed tests/source/limitations in security report. No confirmed wallet overdraft/double refund/self-promotion exploit was found; no claim of comprehensive penetration certification. No production credentials or customer data disclosed.

## Phase 18 — performance and UX

Browser layout measured at desktop/tablet/mobile: F07 mobile overflow. Some labels/skip links/loading/error states exist; no accessibility conformance audit or screen-reader/native device evidence. Large source/CSS modules and shared-state navigation complicate parity; whole-record dashboard aggregation/N+1 queries/global worker locks and list truncation merit measured load/EXPLAIN before launch. No fabricated p95, throughput, CWV, memory/startup or crash rate. Browser dev-server request timings are not production benchmarks.

## Phases 19–20 — test/build/release readiness

79/79 existing tests, web/native TypeScript and production web build pass. Fresh offline native JS exports for iOS/Android pass. Detailed command/output/classification in verification report. No coverage percentage or maintained deployed-browser/native/accessibility/load suite. PGlite tests cannot prove real pg concurrent locking. Build-ready locally is true; deployment-ready/operationally-ready/production-certified is false or unverified. Missing environment/HTTPS/database/worker/backup/monitoring/legal/stock/native identity/signing/device gates recorded, without deployment.

## Phase 21 — dependencies and integration contracts

| Integration/provider | Configuration / purpose | Verified operations | Failure handling / missing activation requirements |
|---|---|---|---|
| PostgreSQL/PGlite | Local app uses embedded pg; managed adapter/migrations prepared | Isolated migrations/restricted-role services and local restore | Managed provisioning/TLS/grants/backups/races/alerts not verified; user local-only decision |
| Payment provider | None selected/connected in app | No external payment tested | Need authorised provider sandbox, server verification/webhook idempotency, refunds/settlement/outage telemetry before any online-payment claim |
| Restricted credit/COD | Internal methods, disabled by default until business enablement | Actual isolated debit/credit/cash/replay/refund tests | Human treasury reconciliation, operating policy and legal/provider model review |
| Email | Outbox/local operator preview | Queue/token/expiry/revocation | No sender/delivery receipts/retries/alerts; recovery blocked for public use |
| SMS/WhatsApp/push | No runtime providers | None | Selection, credentials, consent/templates/webhook/security/delivery/failure tests required |
| Maps/location | Public address search link only | Link source/UI visible | No navigation/live driver/ETA/routing integration or permission/recovery validation |
| Error/health monitoring | Basic DB health and console error type | API/service test evidence | External alerts, job freshness, incident response and secret-safe telemetry missing |
| Native build/store | Installed Expo, no release profiles/identities | Typecheck + JS export | Compatible advisory remediation, signed builds/device/store acceptance |

Fresh root audit:0 advisories. Native:8 aggregate dependency entries (3 high/5 low), including Zod constrained-collection memory exhaustion and deepmerge prototype poisoning; exploitability vs build-tool use unverified. No forced Expo downgrade, install or upgrade. Newer registry versions listed in raw outdated JSON; no unsupported/unused package claim without proof. Runtime circular dependencies and duplicated UI/auth/cart validation documented in architecture report; no abandoned alternate app established. Ongoing costs unknown, not invented.

## Phase 22 — business consequence and decision

Separate assessment considers owner/customers/sales/managers/inventory/drivers/finance/commercial/support/compliance, with revenue leakage, stock/safety, retention/prediction, wallet, delivery, fraud, continuity, privacy, commercial reporting, third parties and scaling. Register distinguishes inherent/current residual/target risk and hypothetical vs confirmed consequences. Financial exposure cannot be quantified from synthetic tests or absent audited business data. No Nigerian compliance claim made; specialist review domains linked to official sources.

## Audit completion and open verification gates

Requested audit domains and deliverables are covered; unknowns have explicit limitations rather than fabricated acceptance. Reports/probes add no missing feature implementation. Before production, close affected P0/P1 findings, approve release scope, execute managed pg/browser/native/provider/physical-operation/security/load acceptance and obtain accountable business/finance/privacy/platform signoff. Keep local hosting and payments disconnected until separately authorised. A follow-up implementation effort should start from reproduced findings and targeted regression cases, not visual expansion.
