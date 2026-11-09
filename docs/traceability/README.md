# Required EasyGas phase traceability

For every implementation phase, create a machine-readable JSON matrix and a readable Markdown companion under docs/traceability. Start with the approved requirements, unique stable IDs, priority, scope, UI reference, route(s) and acceptance gates. Add actual implementation paths, authoritative data sources, security controls, named tests, executed results/evidence, implementation status, reason and outstanding work as delivery proceeds.

Statuses: VERIFIED_COMPLETE, IMPLEMENTED_UNVERIFIED, PARTIAL, UI_ONLY, BACKEND_ONLY, DEFECTIVE, NOT_IMPLEMENTED, BLOCKED, NOT_APPLICABLE. A verified status requires successful executed evidence. Critical security requirements need negative tests. Blocked requirements require a reason. Never mark an entire requirement verified based only on a source file or route existing.

Report implementation, verification, critical requirement, route and gate coverage separately. Only genuinely NOT_APPLICABLE requirements leave denominators. Preserve changes and affected requirements/tests/gates in a change log. Completion reports must link the matrix and list remaining gaps. Run the phase matrix validation before completion; customer dashboard validation is in tests/customer-traceability.test.ts.

Order tracking phase: [matrix](order-tracking-rtm.md) and [implementation report](../reports/easygas-order-tracking-implementation.md). Local core tracking is implemented; PostgreSQL/device/GPS/physical-safety/remaining browser and operational gates remain open. Production NO-GO is unchanged.

EasyRewards phase: [matrix](easyrewards-rtm.md), [implementation report](../reports/easyrewards-implementation.md) and [dependency register](../reports/easyrewards-blockers-and-tasks.md). Completion continuation is behind OFF flags; 33/38 verified, 3 implemented-unverified and 2 partial. All 38 requirements remain in scope and production NO-GO is preserved.

Production web + signed-native continuation: [matrix](production-release-rtm.md) and [release report/runbook](../reports/production-release-20261102.md). All 14 continuation requirements remain in scope, alongside previous phase matrices. Technical controls do not override the existing production NO-GO or authorize live hosting, providers or programme activation.

Local API compatibility recovery: [matrix](local-runtime-repair-rtm.md) and [report](../reports/local-runtime-repair-20261102.md). Repairs the known early recorded rewards043 schema before044; preserves all existing histories and production NO-GO.

Current whole-app production blocker audit: [closure matrix](whole-app-production-audit-rtm.md) and [audit](../audits/production-20261102/report.md). Two reproduced defects explicitly downgrade PR-R01 and PR-R05; all prior IDs and outstanding requirements remain. The 12 audit blocker-closure rows are not a fabricated whole-app completion percentage.

Mobile UI design: [matrix](mobile-ui-design-rtm.md) and [screen specifications](../design/mobile-ui/SCREEN_SPECIFICATION.md). 99 prototype screen designs; native implementation and production NO-GO remain separate.

Customer service booking visibility: [matrix](service-booking-visibility-rtm.md). Booking entry clarified; local active catalogue is empty and service activation remains outstanding.

Consolidated post-meeting operations: [matrix](post-meeting-requirements-matrix.md) and [implementation report](../reports/post-meeting-implementation-report.md). Broad brief remains incomplete; verified foundations are not full acceptance. Production NO-GO remains.

## Excel audit and migration preview — 5 November 2026

See [requirements matrix](easygas-excel-migration-rtm.md) and [machine-readable matrix](easygas-excel-migration-rtm.json). Audit/preview only; customer payment, stock, fee and identity confirmations remain blocked. Actual import is not approved. [Verification report](../reports/easygas-excel-import-verification.md).

Operations completion continuation (5 November): updates the existing PM-R00–PM-R16 matrix without dropping requirements or G01–G24 gates. Current status is PARTIAL/production NO-GO; schema through051. Public visual guards were checked after unlocking; authenticated and signed-device acceptance remains outstanding. See [current report](../reports/post-meeting-implementation-report.md).

Production completion continuation (5 November 2026): Namecheap VPS selected but not provisioned; existing mobile owner identified and separate EasyGas EAS project linked. Existing matrices updated for TLS/SMTP fixes, private PDFs, dispatch escalation, retention suppression and native startup fixes. See [current report](../reports/production-completion-20261105.md) and [dependency register](../reports/production-completion-tasks-20261105.md). Status remains PARTIAL / NO-GO; unfinished engineering is not reclassified as external blockers.

Mobile backend connection: [matrix](mobile-backend-rtm.md) and [run instructions](../operations/mobile-local-backend.md). Bounded iOS simulator connection verified against the existing local backend; separate EasyGas Local identifier, unchanged production HTTPS guard, no credential changes. Previous production NO-GO/gates and import hold remain.

Local test account handover: [matrix](demo-accounts-rtm.md), [operation/data switch instructions](../operations/mobile-demo-accounts.md). Nine roles verified against isolated demo data; original local database and passwords preserved. Previous production NO-GO/gates/import hold remain.

Reference-led customer native redesign: [matrix](easygas-mobile-rtm.md), [report](../reports/easygas-mobile-implementation.md). Existing business modules retained; visual/native acceptance remains partial and all 40 scenarios/18 gates remain tracked. Production NO-GO unchanged.

Customer functionality consolidation: [matrix](easygas-customer-mobile-rtm.md), [report](../reports/easygas-customer-mobile-implementation.md). Twelve-screen scope excludes onboarding/splash; existing identities/models reused. Full native acceptance remains PARTIAL; production NO-GO and prior holds preserved.

Technician app phase: [traceability](easygas-technician-rtm.md), audit-before-implementation and backend chargeable-work approval/payment guard. Status PARTIAL / NO-GO; full UI/offline/device gates remain.

Approved admin dashboard continuation: [matrix](easygas-admin-dashboard-rtm.md), [implementation report](../reports/easygas-admin-dashboard-implementation.md). One existing sign-in, no role picker;29 existing routes preserved. Scope is PARTIAL and production NO-GO/import holds remain.

Inventory consolidation: [requirements](easygas-inventory-rtm.md), [implementation](../reports/easygas-inventory-implementation.md), [control traceability](../reports/easygas-inventory-traceability.md). All56 scenarios/22 gates retained; PARTIAL, production NO-GO/import hold unchanged.

Technician four-screen consolidation: [matrix](technician-four-screen-rtm.md), [implementation report](../reports/technician-mobile-final-implementation.md) and [dependency/blocker register](../reports/technician-mobile-blockers.md). All74 scenarios/23 gates retained. Actual scoped summaries/paged jobs/history/profile implemented; PARTIAL, offline/device/signing/production gates and prior NO-GO/import hold remain.

Authorised local shopping setup: [matrix](shopping-demo-rtm.md).3 bounded requirements verified: isolated audited synthetic stock, independent demo gas-policy approval and actual cart addition. Prices, payment/delivery flags, real data/import hold and production NO-GO unchanged.

Paystack sandbox integration: [matrix](paystack-rtm.md), [implementation report](../payments/paystack/15-final-implementation-report.md), [test-account setup](../payments/paystack/16-test-account-setup.md). Full18 requirement sections,82 scenarios and26 gates retained. Tested fee/verification/ledger foundations are PARTIAL overall; refunds/reversals/settlements/checkout/amendment engineering and official merchant/native/staging acceptance remain. Live activation unsupported/OFF; existing production NO-GO and Excel import hold preserved.

Complete non-payment production continuation (6 November2026): [matrix](production-end-to-end-rtm.md), [audit](../production-completion/00-audit-and-scope.md), [implementation report](../production-completion/implementation-report.md). All11 scope areas and prior matrices retained. Production role scoping, encrypted technician replay/photo drafts and bounded CRM reporting/search advanced; overall PARTIAL. Bulk LPG dispensed on-site is confirmed. Bulk custody and service/dispatch/retention engineering, full native/provider/staging acceptance and prior NO-GO/import holds remain. Fresh simulator sign-in/navigation/reconnection, local Docker build/isolation/release rejection and GPS recency negative tests now have bounded evidence.

Bulk LPG custody continuation (6 November 2026): [matrix](bulk-lpg-custody-rtm.md), [implementation and operating flow](../production-completion/bulk-lpg-implementation.md). Existing branch/ledger/order systems retained; original-order load, acknowledgement, metered dispensing, independent cash verification and returns implemented. All8 requirements and4 gates retained, PARTIAL. Supplementary doorstep execution, discrepancy recovery and full physical/native/staging acceptance remain open; production NO-GO and import holds preserved.

8 November non-payment delivery package: [deliverables and dependencies](../production-completion/DELIVERY.md). Updates existing E2E-01–11 and BULK-R02 rather than creating duplicate systems or dropping scope. Meter renewal/retirement advanced; overall implementation remains PARTIAL and previous NO-GO/import holds remain.

Governed bulk return recovery (8 November): existing E2E-01/BULK-R05/R07 updated for fresh measured discrepancy investigation, shared independent approval and atomic mass/custody recovery. Distinct operation kind059, qualified-maker revalidation, bounded negative tests and real PostgreSQL concurrency/rollback evidence added. [Operating and rollback guide](../production-completion/discrepancy-recovery.md). Full production scope remains PARTIAL / NO-GO.

Doorstep gas execution continuation: existing E2E-01/02 and BULK-R06/07/08 now map migration060 and the original-order consent/inspection/buffer/debit/verified-cash/metered fulfilment path. [Implementation, operating sequence and outstanding scope](../production-completion/doorstep-implementation.md). Original proof-based completion supports previously independently verified COD; no generic driver sales/finance privileges granted. Overall PARTIAL; physical-product, multi-cylinder, exception and device/staging gates and previous NO-GO/import holds remain.

8 November unified service-invoice and operations continuation: existing E2E-02/03/05/06 and PM-R03/05/10/11/12 mappings now cover schema061, approved quotation/report sources, shared immutable service invoices/notes/review links, actual-material/excess-refund reconciliation, physical vehicle-custody capacity and unsent win-back cancellation/branch message privacy. [Implementation and acceptance limits](../production-completion/service-invoices-implementation.md). User deferred mobile builds and server deployment; no corresponding requirement/gate was dropped. Complete-scope status remains PARTIAL / production NO-GO; Excel import hold unchanged.

EasyGas email/invoice branding (8 November): [matrix](document-branding-rtm.md) and [machine-readable coverage](document-branding-rtm.json). Shared SMTP HTML/CID logo and order/service/sandbox PDF renderer branded; existing snapshots, ownership checks and uncertain-send controls preserved. Four targeted tests, web types/build and three-page PDF visual inspection passed. Mailbox and authenticated web visual acceptance remain open; production NO-GO/import hold unchanged.

8 November saved service drafts, dispute review and retain-all continuation: existing E2E-02/08, PM-R03/06, PR-R11 and AUD-B03 updated. [Operating report and remaining work](../production-completion/draft-dispute-retention.md), [explicit retention instruction](../operations/record-retention.md). Saved revisions, source-bound issue, canonical customer dispute holds and non-destructive retained disposition tested; full request remains PARTIAL/NO-GO. Server/mobile deferrals and actual-import hold unchanged.

Offline driver GPS (8 November): [matrix](offline-driver-location-rtm.md), [operating guide](../operations/offline-driver-location.md). Existing trips/encrypted queue extended; offline GPS records locally and uploads when the foreground app reconnects. Dispatch sees timestamped last-known/history, never fabricated live positions.27/27 focused checks and web/native types/web build pass. New native build and actual background/locked/airplane-mode/device acceptance remain blocked/deferred; production NO-GO/import hold unchanged.

9 November remaining-feature continuation: existing E2E-02/03/04/05 mappings updated for governed road/deadline/cost planning, shared finance-reviewed pre-work cancellations, GPS receipt/conflict recovery and follow-up pagination beyond200. [Report](../production-completion/remaining-features-20261109.md), [task register](../production-completion/remaining-feature-task-register.md). Full six-area request remains PARTIAL; physical-product/multi-cylinder doorstep engineering, remaining service/physical/native/channel/scale acceptance and customer-approved historical import remain open. Prior NO-GO/import/retain-all/build/deployment decisions remain.

9 November approved completion continuation: [execution and dependency register](../production-completion/approved-completion-execution.md). Existing E2E-01/02, BULK-R06–08 and applicable PM IDs updated for064–069; all denominators/holds preserved.434/434 broad and13/13 focused pass; full operational/provider/device/release scope remains PARTIAL / NO-GO.

Temporary Vercel client demo (9 November): [matrix](vercel-client-demo-rtm.md), [deployment/runbook](../deployment/vercel-client-demo.md).3/3 bounded demo requirements verified on https://easygas-client-demo.vercel.app using a separate Neon Free database and synthetic accounts/stock/services. Original full-app/production gates and NO-GO/import/retention decisions remain; no native build.

Inventory badge refresh repair (9 November): [matrix](inventory-badge-rtm.md). INV-BADGE-01 verified with13/13 checks, actual component rendering and hosted refresh/navigation; last confirmed counters stay visible with explicit updating/stale labels. Original RM scope/auth/production decisions preserved.

Password visibility: [matrix](password-visibility-rtm.md). Shared web controls deployed and browser verified; native source updated/typechecked, native runtime remains unverified with no build requested. Prior NO-GO/import holds unchanged.

Dispatch Centre and existing driver integration (9 November): [requirements,84 scenarios and26 gates](dispatch-driver-integration-rtm.md), [audit](../dispatch-driver/01-repository-audit.md), [evidence](../dispatch-driver/07-test-and-acceptance-evidence.md) and [dependency-aware blockers](../dispatch-driver/09-open-blockers-and-production-gates.md). Core scoped overview/guards/foreground contact implemented; complete-scope acceptance remains PARTIAL, with production NO-GO, automatic assignment OFF, deferred native/server work and Excel import hold preserved.460-test full regression passes after the shared serial-readiness refinement, followed by18 overlapping dispatch/private-photo/read-budget checks. No hosted rollout or real fulfilment performed.

Customer wallet top-ups (9November2026): [matrix](wallet-topups-rtm.md), [configuration and operating flow](../wallet-topups/README.md). Existing wallet/independent credit approval/Paystack retained; manual bank requests cannot credit until business approval, card principal auto-posts after authenticated backend verification.27 automated backend/payment/HTTP and4 rendering/regression checks pass; branch bank configuration, browser and actual merchant acceptance open. No live activation, native build or hosted rollout; prior production NO-GO and import/retention decisions preserved.

Approved invoice/receipt documents (9November2026): [matrix](easygas-invoicing-rtm.md), [audit](../easygas-invoicing/01-repository-audit.md), [implementation report](../easygas-invoicing/11-final-implementation-report.md) and [dependency/rollback register](../easygas-invoicing/08-deployment-rollback-recovery.md).18scope rows,80scenarios and26gates retained. Versioned new-document PDF/preview, governed optional identity, canonical invoice/verified receipt separation and existing-route private document library implemented;92focused,46application,3independent PostgreSQL checks and74overlapping final followups pass. Full brief remains PARTIAL: POS/manual-credit PDF/resend/provider refund/settlement, production-volume/native/assistive/staging and business/legal/finance gates remain. Default new-template flagOFF; legacy PDF snapshots preserved, no hosted/live activation or native build. Prior NO-GO, retain-all and actual import hold unchanged.

9 November client-demo redeployment: see the [existing VDEMO matrix](vercel-client-demo-rtm.md) and JSON continuation for deployment/push evidence. This advances the hosted rollout only; prior implementation scope denominators and production NO-GO remain unchanged.

CI repair (9November2026): [matrix](ci-repair-rtm.md), [machine mapping](ci-repair-rtm.json). CI-01/02 retain both web regression and mobile dependency gates. Local repair verified; hosted rerun status recorded there. No native build or operational release implied.

Approved central loader (9November2026): [matrix](central-loader-rtm.md), [machine mapping](central-loader-rtm.json), [audit](../loader/00-repository-audit.md).18sections/50scenarios/28gates retained; native/device and broader acceptance remain explicit. NO-GO unchanged; no deployment/native build implied.
