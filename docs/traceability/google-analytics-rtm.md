# Google Analytics implementation

[Machine-readable matrix](google-analytics-rtm.json) · [Implementation and verification](../analytics/README.md).

Client demo source `2eb4e17402b3be8a27e2416fd02ab32159710b01` is Ready and promoted as `dpl_3FENKwC96aryhXzA76q45pAv4heM` at [the stable demo](https://easygas-client-demo.vercel.app).

**Coverage:**4/4 implemented,3/4 verified requirements;2/2 critical requirements verified;3/4 gates passed;0 exclusions. ANALYTICS-04 remains PARTIAL because GA4 receipt/Realtime reporting cannot be verified through the available DOM-only browser tools. All four IDs stay in scope.

**Existing production NO-GO, actual-import hold and retain-all decisions remain unchanged.** Native, physical, provider, financial and unrelated acceptance evidence is preserved.

| Requirement | Priority | Status / gate | Evidence and result |
| --- | --- | --- | --- |
| ANALYTICS-01 — Load the supplied published GTM container once and use its existing GA4 destination without duplicate installation | P1 | VERIFIED_COMPLETE / ANALYTICS-G01 PASS | PASS —27/27 focused regressions;1/1 hosted browser evidence validation; desktop/phone actual consent and exclusion interactions |
| ANALYTICS-02 — Persist optional analytics consent, load no Google resources before consent and support withdrawal | P0 | VERIFIED_COMPLETE / ANALYTICS-G02 PASS | PASS —27/27 focused regressions;1/1 hosted browser evidence validation; desktop/phone actual consent and exclusion interactions |
| ANALYTICS-03 — Exclude signed-in, operational and sensitive URLs; unload tags before entering private pages | P0 | VERIFIED_COMPLETE / ANALYTICS-G03 PASS | PASS —27/27 focused regressions;1/1 hosted browser evidence validation; desktop/phone actual consent and exclusion interactions |
| ANALYTICS-04 — Verify implementation, build, client-demo deployment and receiver evidence; preserve production holds | P1 | PARTIAL / ANALYTICS-G04 OPEN | PARTIAL —local27/27, browser1/1, hosted business preservation1/1, build/types and Ready promotion pass; GA4 receiver receipt/Realtime unverified |

## Requirement mappings

### ANALYTICS-01

**Scope:** Existing EasyGas web and client demo; supplied GTM-KLJ8FM96 and G-8Y34NXQMMK. Anonymous public pages after explicit consent; no ecommerce/user identification or advertising activation.

**UI and routes:** User supplied GTM-KLJ8FM96 and G-8Y34NXQMMK,19November2026; actual desktop1280px and phone390px preference controls. /,/products,/services,/privacy; private routes excluded.

**Implementation:** [packages/business-rules/src/analytics.ts](../../packages/business-rules/src/analytics.ts), [apps/web/lib/analytics-browser.ts](../../apps/web/lib/analytics-browser.ts), [apps/web/components/google-analytics.tsx](../../apps/web/components/google-analytics.tsx), [apps/web/app/layout.tsx](../../apps/web/app/layout.tsx), [apps/web/components/workspace-link.tsx](../../apps/web/components/workspace-link.tsx), [apps/web/components/site.tsx](../../apps/web/components/site.tsx), [apps/web/app/globals.css](../../apps/web/app/globals.css).

**Authoritative sources:** Supplied public tag IDs, published Google container; URL and explicit local analytics consent only.

**Security:** No account/order/financial data in data layer; no Google loading before consent or on signed-in/private/query/token URLs; advertising consent denied.

**Executed tests:** `ANALYTICS-LOAD`, `ANALYTICS-BROWSER`. Test files: [tests/google-analytics.test.ts](../../tests/google-analytics.test.ts), [tests/google-analytics-browser.test.ts](../../tests/google-analytics-browser.test.ts).

**Evidence:** [regression.txt](../../docs/analytics/evidence/regression.txt), [browser-validation.txt](../../docs/analytics/evidence/browser-validation.txt), [browser-checks.json](../../docs/analytics/evidence/browser-checks.json), [published-container.json](../../docs/analytics/evidence/published-container.json), [stable-identity.json](../../docs/analytics/evidence/stable-identity.json).

**Acceptance:** Supplied published container version1 has the existing GA4 destination. Hosted DOM records exactly one GTM script after grant; its onReady callback confirms execution. No second gtag config or manual page-view event is added.

**Outstanding:** None for the bounded site-side requirement. Receiver/reporting evidence remains under ANALYTICS-04. Ecommerce, signed-in analytics, advertising and commercial production release are outside this scope.

### ANALYTICS-02

**Scope:** Existing EasyGas web and client demo; supplied GTM-KLJ8FM96 and G-8Y34NXQMMK. Anonymous public pages after explicit consent; no ecommerce/user identification or advertising activation.

**UI and routes:** User supplied GTM-KLJ8FM96 and G-8Y34NXQMMK,19November2026; actual desktop1280px and phone390px preference controls. /,/products,/services,/privacy; private routes excluded.

**Implementation:** [packages/business-rules/src/analytics.ts](../../packages/business-rules/src/analytics.ts), [apps/web/lib/analytics-browser.ts](../../apps/web/lib/analytics-browser.ts), [apps/web/components/google-analytics.tsx](../../apps/web/components/google-analytics.tsx), [apps/web/app/layout.tsx](../../apps/web/app/layout.tsx), [apps/web/components/workspace-link.tsx](../../apps/web/components/workspace-link.tsx), [apps/web/components/site.tsx](../../apps/web/components/site.tsx), [apps/web/app/globals.css](../../apps/web/app/globals.css).

**Authoritative sources:** Supplied public tag IDs, published Google container; URL and explicit local analytics consent only.

**Security:** No account/order/financial data in data layer; no Google loading before consent or on signed-in/private/query/token URLs; advertising consent denied.

**Executed tests:** `ANALYTICS-PRIVACY`, `ANALYTICS-REVOKE`, `ANALYTICS-BROWSER`. Test files: [tests/google-analytics.test.ts](../../tests/google-analytics.test.ts), [tests/google-analytics-browser.test.ts](../../tests/google-analytics-browser.test.ts).

**Evidence:** [regression.txt](../../docs/analytics/evidence/regression.txt), [browser-validation.txt](../../docs/analytics/evidence/browser-validation.txt), [browser-checks.json](../../docs/analytics/evidence/browser-checks.json), [published-container.json](../../docs/analytics/evidence/published-container.json), [stable-identity.json](../../docs/analytics/evidence/stable-identity.json), [consent-final-desktop.jpg](../../docs/analytics/evidence/consent-final-desktop.jpg), [consent-phone.jpg](../../docs/analytics/evidence/consent-phone.jpg).

**Acceptance:** Hosted desktop and390px phone checks pass for no-choice, essential-only, grant, saved preference, reopening settings and withdrawal. Reproduced mobile navigation overlap was corrected and retested on the final Ready source; historical defective observation retained.

**Outstanding:** None for the bounded site-side requirement. Receiver/reporting evidence remains under ANALYTICS-04. Ecommerce, signed-in analytics, advertising and commercial production release are outside this scope.

### ANALYTICS-03

**Scope:** Existing EasyGas web and client demo; supplied GTM-KLJ8FM96 and G-8Y34NXQMMK. Anonymous public pages after explicit consent; no ecommerce/user identification or advertising activation.

**UI and routes:** User supplied GTM-KLJ8FM96 and G-8Y34NXQMMK,19November2026; actual desktop1280px and phone390px preference controls. /,/products,/services,/privacy; private routes excluded.

**Implementation:** [packages/business-rules/src/analytics.ts](../../packages/business-rules/src/analytics.ts), [apps/web/lib/analytics-browser.ts](../../apps/web/lib/analytics-browser.ts), [apps/web/components/google-analytics.tsx](../../apps/web/components/google-analytics.tsx), [apps/web/app/layout.tsx](../../apps/web/app/layout.tsx), [apps/web/components/workspace-link.tsx](../../apps/web/components/workspace-link.tsx), [apps/web/components/site.tsx](../../apps/web/components/site.tsx), [apps/web/app/globals.css](../../apps/web/app/globals.css).

**Authoritative sources:** Supplied public tag IDs, published Google container; URL and explicit local analytics consent only.

**Security:** No account/order/financial data in data layer; no Google loading before consent or on signed-in/private/query/token URLs; advertising consent denied.

**Executed tests:** `ANALYTICS-PRIVACY`, `ANALYTICS-NAV`, `ANALYTICS-BROWSER`. Test files: [tests/google-analytics.test.ts](../../tests/google-analytics.test.ts), [tests/google-analytics-browser.test.ts](../../tests/google-analytics-browser.test.ts).

**Evidence:** [regression.txt](../../docs/analytics/evidence/regression.txt), [browser-validation.txt](../../docs/analytics/evidence/browser-validation.txt), [browser-checks.json](../../docs/analytics/evidence/browser-checks.json), [published-container.json](../../docs/analytics/evidence/published-container.json), [stable-identity.json](../../docs/analytics/evidence/stable-identity.json).

**Acceptance:** Hosted signed-in admin/public pages, query URLs and private navigation show no Google scripts. An excluded document remains untracked on later SPA navigation. Actual public product action reaches /gas-order without tracking; local negatives cover token/hash/checkout/account/order URLs.

**Outstanding:** None for the bounded site-side requirement. Receiver/reporting evidence remains under ANALYTICS-04. Ecommerce, signed-in analytics, advertising and commercial production release are outside this scope.

### ANALYTICS-04

**Scope:** Existing EasyGas web and client demo; supplied GTM-KLJ8FM96 and G-8Y34NXQMMK. Anonymous public pages after explicit consent; no ecommerce/user identification or advertising activation.

**UI and routes:** User supplied GTM-KLJ8FM96 and G-8Y34NXQMMK,19November2026; actual desktop1280px and phone390px preference controls. /,/products,/services,/privacy; private routes excluded.

**Implementation:** [packages/business-rules/src/analytics.ts](../../packages/business-rules/src/analytics.ts), [apps/web/lib/analytics-browser.ts](../../apps/web/lib/analytics-browser.ts), [apps/web/components/google-analytics.tsx](../../apps/web/components/google-analytics.tsx), [apps/web/app/layout.tsx](../../apps/web/app/layout.tsx), [apps/web/components/workspace-link.tsx](../../apps/web/components/workspace-link.tsx), [apps/web/components/site.tsx](../../apps/web/components/site.tsx), [apps/web/app/globals.css](../../apps/web/app/globals.css).

**Authoritative sources:** Supplied public tag IDs, published Google container; URL and explicit local analytics consent only.

**Security:** No account/order/financial data in data layer; no Google loading before consent or on signed-in/private/query/token URLs; advertising consent denied.

**Executed tests:** `ANALYTICS-CONFIG`, `ANALYTICS-DEPLOY`, `ANALYTICS-BROWSER`. Test files: [tests/google-analytics.test.ts](../../tests/google-analytics.test.ts), [tests/google-analytics-browser.test.ts](../../tests/google-analytics-browser.test.ts), [scripts/check-analytics-demo.mjs](../../scripts/check-analytics-demo.mjs).

**Evidence:** [regression.txt](../../docs/analytics/evidence/regression.txt), [browser-validation.txt](../../docs/analytics/evidence/browser-validation.txt), [browser-checks.json](../../docs/analytics/evidence/browser-checks.json), [published-container.json](../../docs/analytics/evidence/published-container.json), [stable-identity.json](../../docs/analytics/evidence/stable-identity.json), [types.txt](../../docs/analytics/evidence/types.txt), [build.txt](../../docs/analytics/evidence/build.txt), [candidate-recovery.json](../../docs/analytics/evidence/candidate-recovery.json), [source-integrity.json](../../docs/analytics/evidence/source-integrity.json), [hosted-business.txt](../../docs/analytics/evidence/hosted-business.txt), [business-before.json](../../docs/analytics/evidence/business-before.json), [business-after.json](../../docs/analytics/evidence/business-after.json), [promotion.txt](../../docs/analytics/evidence/promotion.txt).

**Acceptance:** Local27/27 regressions, TypeScript/build, final Ready deployment identity, source integrity, browser execution and unchanged business readback pass. Browser tooling does not expose collection requests or GA4 reports. Receiver receipt/Realtime is unverified; this row remains in the denominator.

**Outstanding:** Confirm receipt in GA4 Realtime for G-8Y34NXQMMK using a clean signed-out demo visit after Allow analytics. Private Google account/reporting access is unavailable; do not infer receipt from script execution. Existing production NO-GO/import/retain-all and wider acceptance gaps remain.

## Scope and execution history

- 2026-11-19: Registered supplied IDs; fetched public GTM container200 and confirmed existing G-8Y34NXQMMK destination, auto page/history/form/contact settings. Use one GTM loader, consent-first public scope, and full document navigation while tags are loaded so listeners cannot persist into private pages. No admin Google-account or live-commerce release authorisation inferred.
- 2026-11-19: Local browser proves no script before consent/essential-only, supplied GTM loads after grant and is absent after entering login. Local business API unavailable independently; no local business acceptance claimed. Browser tooling exposes DOM/tag load state but not network collection requests; GA4 receipt/Realtime reporting remains unverified without Google-account/collection diagnostics.
- 2026-11-19: First Ready analytics deployment16a0518/dpl_5Yfr3e9cUkCTU44WUSDace2JfbAr passes hosted before-consent/essential/grant/onReady/signed-in/private/query/withdrawal checks; business hashes unchanged. Actual390px phone test reproduces Cookie settings obscured by fixed mobile navigation, causing an Orders click. Added footer clearance; redeploy and repeat phone interaction before closing UI gate. Initial phone observation retained as defective, not acceptance.
- 2026-11-19: Final source2eb4e17/dpl_3FENKwC96aryhXzA76q45pAv4heM Ready and promoted.450 uploaded files exactly match Git bytes, with no env/data/build artifacts. CLI log streaming ended with fetch failed after successful compilation/types; authoritative Vercel API confirmed the same deployment READY before promotion; no duplicate deployment created.
- 2026-11-19: Final390px real interaction successfully opens preferences clear of fixed navigation, allows exactly one supplied container (onReady loaded), then withdraws with no Google scripts.1280px preference view captured. ANALYTICS-02 mobile defect closed with evidence; prior failed observation preserved.
- 2026-11-19: Actual public catalogue action to /gas-order passes without Google scripts. The older QuickOrder declaration is not mounted by the current route; no speculative cart change or new order/stock/payment was introduced.13 orders, ledger, inventory, gas and QA wallet normal product readbacks are unchanged from baseline. All four requirement IDs retained;3/4 verified,4/4 implemented,2/2 critical,3/4 gates. Receiver receipt remains PARTIAL/OPEN; no production or prior acceptance hold waived.

The readback script uses normal authenticated product HTTP reads. No hosted database access or business mutation was used for this phase. The initial local preview could not reach its existing business database; local business acceptance is not claimed. Hosted checks supply the business preservation evidence.

[Traceability schema validation](../analytics/evidence/traceability-validation.txt).
