# Owner Settings audit and configuration manual

Audit date: 24 November 2026. Application source: `ad0400c` on `codex/authentication-redesign`. This phase is documentation and read-only audit; it does not implement the open product findings, activate settings or certify commercial operation.

## Deliverables

- [Comprehensive Owner setup manual](../user-manual/owner-settings-complete.md): all nine categories, every current field family, approval/history/error handling, dependency-ordered setup, fleet/driver operations, order/service journeys, technical hand-off, troubleshooting and acceptance sign-off.
- [Printable manual](../../output/pdf/EasyGas-Owner-Settings-Configuration-Manual.pdf): searchable text, contents, page numbers and outline bookmarks; visual rendering checked. The Markdown remains editable source.
- [77-key register](setting-register.json): 76 current local controls plus one historical labelled demo location, with no exclusions. Every key maps to its configuration section/action and authoritative role/type metadata.
- [Traceability](../traceability/owner-settings-manual-rtm.md): five bounded audit/documentation requirements. Product defects, real business setup and commercial acceptance remain separate and open.

## Audit scope and method

Read current UI, category/setting/editor helpers, server governance, validators and operational consumers. Obtain an authenticated read-only local settings inventory using a disposable synthetic Owner, then revoke the audit session. Navigate all nine categories in an isolated browser, inspect the document identity editor without saving, verify empty-search behavior and a 390px layout, and revoke that browser's own session. No other browser session was controlled.

The inventory covers 4 Business & Website, 9 Policies & Terms, 26 Gas & Products, 11 Delivery & Dispatch, 10 Services & Safety, 6 Payments & Wallet, 7 Rewards & Retention, 1 Stock & Valuation and 2 Staff & Security controls (76). The earlier demo inventory adds one labelled sandbox location (77 retained). That extra location was not fabricated in the local database and its current hosted state was not rechecked. Dynamic future settings are handled by the existing namespace fallbacks; they are not claimed as inspected records.

Current role/scoped definitions and downstream validators are the authority, not historical labels or screenshots. Local Owner auto-approval metadata is false; the 20 November historical demo snapshot recorded true for eligible controls. This is a configuration difference, not proof of an authorisation regression. The guide teaches checking current metadata and independent activation requirements.

All nine category groups and counts were observed in the current local browser. Every editor family/field was source-audited and relevant existing component/contract tests were executed; only the document editor was opened in this phase's browser. No fresh positive proposal/approval, setting restoration or complete operational journey was performed. Existing journey evidence is linked as historical companion material, not presented as a new real fulfilment pass.

## Findings retained for follow-up

| ID | Severity | Evidence and consequence | Recommended improvement / current workaround |
| --- | --- | --- | --- |
| OSA-01 | Medium | `admin.tsx` Settings takes data scope from query/user/default, but the small section badge uses `user.branchId ?? "Lagos"`. Source-confirmed risk of a misleading branch label for Owner cross-branch navigation; not reproduced with a second branch in this browser run. | Derive all labels from selected scope and provide a clear selector. Until fixed verify Settings branch, editor branch and request scope. |
| OSA-02 | Medium | `setting-change-form.tsx` has unconditional independent-owner website helper copy; `governance.ts` has conditional Owner auto-approval. Some fallback badge/footer wording compresses distinct risk and qualification requirements. | Use the current server's decision/progress metadata consistently. Keep protected and qualified review distinct; never promise blanket automatic approval. |
| OSA-03 | Medium | `setting-change-form.tsx`, payment/editor helpers and schemas expose mixed naira/kobo/percent/basis-point entry. Valid raw numbers can express an unintended amount even when schemas reject malformed values. | Standardise human-facing units with exact conversions and comprehensive review. Manual explicitly identifies each current unit. |
| OSA-04 | Medium | Points helper in `setting-change-form.tsx` says referral bonuses and services are excluded. Its referral toggle and `RewardsPolicyFields` Services/Offers plus `rewards-schema.ts` support gated current features. | Update helper text to current eligibility. Guide uses actual policy/runtime and technical enablement requirements. |
| OSA-05 | Medium, investigation required | `admin.tsx` renders `GasDeliveryAdmin` inside a native HTML details element. The mounted component's effect immediately reads locations, stock and inspections while collapsed. This is confirmed source behavior; no new hosted latency benchmark or precise speed gain was measured. | Load on expansion/use bounded cached data, then benchmark. Do not claim the user-reported latency is fully diagnosed by this read pattern alone. |
| OSA-06 | High for multi-branch rollout | `service.ts` public catalogue/home service previews include `lagos`; `readiness.ts` gateway check is Lagos-specific and several checks are global counts; `governance.ts` policy activation updates shared `legal_documents` by kind. | Define intentional shared versus branch authority and accept all intended public/customer branches before multi-branch launch. Single branch cards/readiness cannot certify that rollout. |
| OSA-07 | Medium | Settings taxonomy and Dispatch's branch-only checklist have no complete Owner onboarding view across providers, workers, staff independence, safety credentials, stock and release evidence. | Add server-derived setup checklist with direct actions and explicit unknown/disabled/blocked states. Manual now supplies the dependency order and responsibility/evidence worksheet. |

All seven findings remain **OPEN**, none excluded. They describe source/UI concerns and capability limits, not a newly demonstrated privilege bypass or payment loss. No production repair or release readiness is inferred. Paystack sandbox-only support, independent approvals, qualification/custody checks and locked safeguards are intentional current constraints to preserve, not bugs to remove.

## Executed evidence

- [Current runtime inventory](evidence/current-inventory.json), [browser observations](evidence/browser-observations.json), desktop/payments/phone screenshots.
- [Focused tests](evidence/focused-tests.txt): 82 total, **80 passed, 0 failed, 2 skipped**. The skipped TC-PG and DV-PG require explicit disposable PostgreSQL and do not establish fresh concurrency acceptance. Suites exercise setting mapping/permissions/review/currency/date, Owner approval, services, rewards/testimonials and Dispatch setup/trip controls using isolated fixtures. No new live/provider/physical acceptance claimed.
- Documentation/traceability tests: **6 passed, 0 failed, 0 skipped**, in `evidence/documentation-tests.txt`. Manual/register/source-path/PDF validation and complete 30-page PDF visual review are recorded separately under `evidence/`. Traceability validator results remain distinct; overlapping suites are not added into a unique application-wide count.

## What the Owner cannot complete in Settings alone

Genuine accounts/independent reviewers, product/gas receipts and costs, cylinders, actual qualifications/calibration, vehicles/trips/custody, individual order payment/inspection/proof, service technician assignment/materials and actual finance reconciliation live in their own workflows. Secure deployment/database/TLS, providers, customer transfer instructions, worker supervision, backups/restore, monitoring and technical feature gates require technical ownership. The manual separates these tasks and defines the check at each hand-off.

A live Paystack path is unsupported by the current runtime: only test mode with synthetic payment data and test keys is accepted. No bank/provider details, secret values, business prices or legal wording are invented. Readiness intentionally retains NO-GO. Existing original production NO-GO, actual-import hold, retain-all, authentication/native/physical/provider/scale/independent-review gates remain authoritative. Audit source immutability is recorded in `evidence/source-fingerprints.json`.

## Rebuild

Use the bundled Codex Python runtime to run `docs/owner-settings-audit/build_manual.py`. It reads the current Markdown and writes only the dedicated PDF, leaving older user-manual editions intact. Render with Poppler, inspect every page's layout, validate text/links/counts and record fresh artifact hashes after changes. `verify_manual.py` performs structural/content checks without changing business data. No new mobile binary or deployment is part of this phase.
