# Customer dashboard requirements traceability

Source: [docs/traceability/easygas-customer-dashboard-rtm.json](../../docs/traceability/easygas-customer-dashboard-rtm.json). All 65 approved requirements remain represented. Status is based on actual evidence; implementation is distinct from verification. Existing production decision: **NO-GO**.

## CD-REQ-001 — Shared customer authentication

| Field | Evidence |
|---|---|
| priority | P0 |
| scope | shared |
| uiReference | docs/customer/approved-dashboard-reference-20261030.png — Shared customer authentication |
| route | Website / /account |
| implementationFiles | [apps/web/components/site.tsx](../../apps/web/components/site.tsx); [apps/web/app/[...slug]/page.tsx](../../apps/web/app/[...slug]/page.tsx); [apps/web/lib/auth.ts](../../apps/web/lib/auth.ts); [apps/web/components/ui.tsx](../../apps/web/components/ui.tsx) |
| dataSource | Existing authenticated session and shared easygas.cart; no new identity/cart store |
| securityControl | Server actor validates active unexpired/unrevoked session. Queries bind authenticated user ID; strict new read model rejects browser-supplied customer IDs. UI preferences confer no authority. |
| testIds | CD-Z; CD-E,F |
| testFiles | [tests/customer-dashboard.test.ts](../../tests/customer-dashboard.test.ts) |
| testResult | PASS (linked executed tests; see reason for any remaining verification) |
| acceptanceGate | CD-01 |
| status | VERIFIED_COMPLETE |
| reason | Source reviewed; successful targeted regression and/or browser evidence confirms the specified local behaviour. |
| evidence | [docs/testing/customer-dashboard-focused-20261030.txt](../../docs/testing/customer-dashboard-focused-20261030.txt); [docs/testing/customer-dashboard-regression-20261030.txt](../../docs/testing/customer-dashboard-regression-20261030.txt); [docs/testing/customer-dashboard-browser-20261030.json](../../docs/testing/customer-dashboard-browser-20261030.json); [docs/testing/customer-dashboard-journeys-20261030.json](../../docs/testing/customer-dashboard-journeys-20261030.json) |
| negativeTests | CD-Z; CD-E,F |
| outstandingWork | None within the documented local verification scope. |

## CD-REQ-002 — Website to dashboard navigation

| Field | Evidence |
|---|---|
| priority | P0 |
| scope | shared |
| uiReference | docs/customer/approved-dashboard-reference-20261030.png — Website to dashboard navigation |
| route | /account |
| implementationFiles | [apps/web/components/site.tsx](../../apps/web/components/site.tsx); [apps/web/app/[...slug]/page.tsx](../../apps/web/app/[...slug]/page.tsx); [apps/web/lib/auth.ts](../../apps/web/lib/auth.ts); [apps/web/components/ui.tsx](../../apps/web/components/ui.tsx) |
| dataSource | Existing authenticated session and shared easygas.cart; no new identity/cart store |
| securityControl | Server actor validates active unexpired/unrevoked session. Queries bind authenticated user ID; strict new read model rejects browser-supplied customer IDs. UI preferences confer no authority. |
| testIds | CD-Z; CD-E,F |
| testFiles | [tests/customer-dashboard.test.ts](../../tests/customer-dashboard.test.ts) |
| testResult | PASS (linked executed tests; see reason for any remaining verification) |
| acceptanceGate | CD-02 |
| status | VERIFIED_COMPLETE |
| reason | Source reviewed; successful targeted regression and/or browser evidence confirms the specified local behaviour. |
| evidence | [docs/testing/customer-dashboard-focused-20261030.txt](../../docs/testing/customer-dashboard-focused-20261030.txt); [docs/testing/customer-dashboard-regression-20261030.txt](../../docs/testing/customer-dashboard-regression-20261030.txt); [docs/testing/customer-dashboard-browser-20261030.json](../../docs/testing/customer-dashboard-browser-20261030.json); [docs/testing/customer-dashboard-journeys-20261030.json](../../docs/testing/customer-dashboard-journeys-20261030.json) |
| negativeTests | CD-Z; CD-E,F |
| outstandingWork | None within the documented local verification scope. |

## CD-REQ-003 — Dashboard to website navigation

| Field | Evidence |
|---|---|
| priority | P0 |
| scope | shared |
| uiReference | docs/customer/approved-dashboard-reference-20261030.png — Dashboard to website navigation |
| route | /account |
| implementationFiles | [apps/web/components/site.tsx](../../apps/web/components/site.tsx); [apps/web/app/[...slug]/page.tsx](../../apps/web/app/[...slug]/page.tsx); [apps/web/lib/auth.ts](../../apps/web/lib/auth.ts); [apps/web/components/ui.tsx](../../apps/web/components/ui.tsx) |
| dataSource | Existing authenticated session and shared easygas.cart; no new identity/cart store |
| securityControl | Server actor validates active unexpired/unrevoked session. Queries bind authenticated user ID; strict new read model rejects browser-supplied customer IDs. UI preferences confer no authority. |
| testIds | CD-Z; CD-E,F |
| testFiles | [tests/customer-dashboard.test.ts](../../tests/customer-dashboard.test.ts) |
| testResult | PASS (linked executed tests; see reason for any remaining verification) |
| acceptanceGate | CD-03 |
| status | VERIFIED_COMPLETE |
| reason | Source reviewed; successful targeted regression and/or browser evidence confirms the specified local behaviour. |
| evidence | [docs/testing/customer-dashboard-focused-20261030.txt](../../docs/testing/customer-dashboard-focused-20261030.txt); [docs/testing/customer-dashboard-regression-20261030.txt](../../docs/testing/customer-dashboard-regression-20261030.txt); [docs/testing/customer-dashboard-browser-20261030.json](../../docs/testing/customer-dashboard-browser-20261030.json); [docs/testing/customer-dashboard-journeys-20261030.json](../../docs/testing/customer-dashboard-journeys-20261030.json) |
| negativeTests | CD-Z; CD-E,F |
| outstandingWork | None within the documented local verification scope. |

## CD-REQ-004 — Continue Shopping navigation

| Field | Evidence |
|---|---|
| priority | P0 |
| scope | shared |
| uiReference | docs/customer/approved-dashboard-reference-20261030.png — Continue Shopping navigation |
| route | Website / dashboard |
| implementationFiles | [apps/web/components/site.tsx](../../apps/web/components/site.tsx); [apps/web/app/[...slug]/page.tsx](../../apps/web/app/[...slug]/page.tsx); [apps/web/lib/auth.ts](../../apps/web/lib/auth.ts); [apps/web/components/ui.tsx](../../apps/web/components/ui.tsx) |
| dataSource | Existing authenticated session and shared easygas.cart; no new identity/cart store |
| securityControl | Server actor validates active unexpired/unrevoked session. Queries bind authenticated user ID; strict new read model rejects browser-supplied customer IDs. UI preferences confer no authority. |
| testIds | CD-Z; CD-E,F |
| testFiles | [tests/customer-dashboard.test.ts](../../tests/customer-dashboard.test.ts) |
| testResult | PASS (linked executed tests; see reason for any remaining verification) |
| acceptanceGate | CD-03 |
| status | VERIFIED_COMPLETE |
| reason | Source reviewed; successful targeted regression and/or browser evidence confirms the specified local behaviour. |
| evidence | [docs/testing/customer-dashboard-focused-20261030.txt](../../docs/testing/customer-dashboard-focused-20261030.txt); [docs/testing/customer-dashboard-regression-20261030.txt](../../docs/testing/customer-dashboard-regression-20261030.txt); [docs/testing/customer-dashboard-browser-20261030.json](../../docs/testing/customer-dashboard-browser-20261030.json); [docs/testing/customer-dashboard-journeys-20261030.json](../../docs/testing/customer-dashboard-journeys-20261030.json) |
| negativeTests | CD-Z; CD-E,F |
| outstandingWork | None within the documented local verification scope. |

## CD-REQ-005 — Shopping cart continuity

| Field | Evidence |
|---|---|
| priority | P0 |
| scope | shared |
| uiReference | docs/customer/approved-dashboard-reference-20261030.png — Shopping cart continuity |
| route | Cart / dashboard |
| implementationFiles | [apps/web/components/site.tsx](../../apps/web/components/site.tsx); [apps/web/app/[...slug]/page.tsx](../../apps/web/app/[...slug]/page.tsx); [apps/web/lib/auth.ts](../../apps/web/lib/auth.ts); [apps/web/components/ui.tsx](../../apps/web/components/ui.tsx) |
| dataSource | Existing authenticated session and shared easygas.cart; no new identity/cart store |
| securityControl | Server actor validates active unexpired/unrevoked session. Queries bind authenticated user ID; strict new read model rejects browser-supplied customer IDs. UI preferences confer no authority. |
| testIds | CD-G,H |
| testFiles | [tests/customer-dashboard.test.ts](../../tests/customer-dashboard.test.ts) |
| testResult | PASS (linked executed tests; see reason for any remaining verification) |
| acceptanceGate | CD-04 |
| status | VERIFIED_COMPLETE |
| reason | Source reviewed; successful targeted regression and/or browser evidence confirms the specified local behaviour. |
| evidence | [docs/testing/customer-dashboard-focused-20261030.txt](../../docs/testing/customer-dashboard-focused-20261030.txt); [docs/testing/customer-dashboard-regression-20261030.txt](../../docs/testing/customer-dashboard-regression-20261030.txt); [docs/testing/customer-dashboard-browser-20261030.json](../../docs/testing/customer-dashboard-browser-20261030.json); [docs/testing/customer-dashboard-journeys-20261030.json](../../docs/testing/customer-dashboard-journeys-20261030.json) |
| negativeTests | CD-Z; CD-I,K,V,Z; CD-E,F |
| outstandingWork | None within the documented local verification scope. |

## CD-REQ-006 — Guest cart recovery

| Field | Evidence |
|---|---|
| priority | P0 |
| scope | shared |
| uiReference | docs/customer/approved-dashboard-reference-20261030.png — Guest cart recovery |
| route | Authentication / checkout |
| implementationFiles | [apps/web/components/site.tsx](../../apps/web/components/site.tsx); [apps/web/app/[...slug]/page.tsx](../../apps/web/app/[...slug]/page.tsx); [apps/web/lib/auth.ts](../../apps/web/lib/auth.ts); [apps/web/components/ui.tsx](../../apps/web/components/ui.tsx) |
| dataSource | Existing authenticated session and shared easygas.cart; no new identity/cart store |
| securityControl | Server actor validates active unexpired/unrevoked session. Queries bind authenticated user ID; strict new read model rejects browser-supplied customer IDs. UI preferences confer no authority. |
| testIds | CD-G,H |
| testFiles | [tests/customer-dashboard.test.ts](../../tests/customer-dashboard.test.ts) |
| testResult | PASS (linked executed tests; see reason for any remaining verification) |
| acceptanceGate | CD-04 |
| status | VERIFIED_COMPLETE |
| reason | Source reviewed; successful targeted regression and/or browser evidence confirms the specified local behaviour. |
| evidence | [docs/testing/customer-dashboard-focused-20261030.txt](../../docs/testing/customer-dashboard-focused-20261030.txt); [docs/testing/customer-dashboard-regression-20261030.txt](../../docs/testing/customer-dashboard-regression-20261030.txt); [docs/testing/customer-dashboard-browser-20261030.json](../../docs/testing/customer-dashboard-browser-20261030.json); [docs/testing/customer-dashboard-journeys-20261030.json](../../docs/testing/customer-dashboard-journeys-20261030.json) |
| negativeTests | CD-Z; CD-I,K,V,Z; CD-E,F |
| outstandingWork | None within the documented local verification scope. |

## CD-REQ-007 — Saved delivery location continuity

| Field | Evidence |
|---|---|
| priority | P0 |
| scope | shared |
| uiReference | docs/customer/approved-dashboard-reference-20261030.png — Saved delivery location continuity |
| route | Website / dashboard |
| implementationFiles | [apps/web/components/site.tsx](../../apps/web/components/site.tsx); [apps/web/app/[...slug]/page.tsx](../../apps/web/app/[...slug]/page.tsx); [apps/web/lib/auth.ts](../../apps/web/lib/auth.ts); [apps/web/components/ui.tsx](../../apps/web/components/ui.tsx) |
| dataSource | Existing authenticated session and shared easygas.cart; no new identity/cart store |
| securityControl | Server actor validates active unexpired/unrevoked session. Queries bind authenticated user ID; strict new read model rejects browser-supplied customer IDs. UI preferences confer no authority. |
| testIds | CD-U,Z |
| testFiles | [tests/customer-dashboard.test.ts](../../tests/customer-dashboard.test.ts) |
| testResult | PASS (linked executed tests; see reason for any remaining verification) |
| acceptanceGate | CD-04 |
| status | VERIFIED_COMPLETE |
| reason | Source reviewed; successful targeted regression and/or browser evidence confirms the specified local behaviour. |
| evidence | [docs/testing/customer-dashboard-focused-20261030.txt](../../docs/testing/customer-dashboard-focused-20261030.txt); [docs/testing/customer-dashboard-regression-20261030.txt](../../docs/testing/customer-dashboard-regression-20261030.txt); [docs/testing/customer-dashboard-browser-20261030.json](../../docs/testing/customer-dashboard-browser-20261030.json); [docs/testing/customer-dashboard-journeys-20261030.json](../../docs/testing/customer-dashboard-journeys-20261030.json) |
| negativeTests | CD-Z; CD-I,K,V,Z; CD-E,F |
| outstandingWork | None within the documented local verification scope. |

## CD-REQ-008 — Protected route redirects

| Field | Evidence |
|---|---|
| priority | P0 |
| scope | shared |
| uiReference | docs/customer/approved-dashboard-reference-20261030.png — Protected route redirects |
| route | Customer routes |
| implementationFiles | [apps/web/components/site.tsx](../../apps/web/components/site.tsx); [apps/web/app/[...slug]/page.tsx](../../apps/web/app/[...slug]/page.tsx); [apps/web/lib/auth.ts](../../apps/web/lib/auth.ts); [apps/web/components/ui.tsx](../../apps/web/components/ui.tsx) |
| dataSource | Existing authenticated session and shared easygas.cart; no new identity/cart store |
| securityControl | Server actor validates active unexpired/unrevoked session. Queries bind authenticated user ID; strict new read model rejects browser-supplied customer IDs. UI preferences confer no authority. |
| testIds | CD-D |
| testFiles | [tests/customer-dashboard.test.ts](../../tests/customer-dashboard.test.ts) |
| testResult | PASS (linked executed tests; see reason for any remaining verification) |
| acceptanceGate | CD-05 |
| status | VERIFIED_COMPLETE |
| reason | Source reviewed; successful targeted regression and/or browser evidence confirms the specified local behaviour. |
| evidence | [docs/testing/customer-dashboard-focused-20261030.txt](../../docs/testing/customer-dashboard-focused-20261030.txt); [docs/testing/customer-dashboard-regression-20261030.txt](../../docs/testing/customer-dashboard-regression-20261030.txt); [docs/testing/customer-dashboard-browser-20261030.json](../../docs/testing/customer-dashboard-browser-20261030.json); [docs/testing/customer-dashboard-journeys-20261030.json](../../docs/testing/customer-dashboard-journeys-20261030.json); [docs/testing/customer-protected-routes-20261030.json](../../docs/testing/customer-protected-routes-20261030.json) |
| negativeTests | CD-Z; CD-I,K,V,Z; CD-E,F |
| outstandingWork | None within the documented local verification scope. |

## CD-REQ-009 — Session expiry

| Field | Evidence |
|---|---|
| priority | P0 |
| scope | shared |
| uiReference | docs/customer/approved-dashboard-reference-20261030.png — Session expiry |
| route | Customer routes |
| implementationFiles | [apps/web/components/site.tsx](../../apps/web/components/site.tsx); [apps/web/app/[...slug]/page.tsx](../../apps/web/app/[...slug]/page.tsx); [apps/web/lib/auth.ts](../../apps/web/lib/auth.ts); [apps/web/components/ui.tsx](../../apps/web/components/ui.tsx) |
| dataSource | Existing authenticated session and shared easygas.cart; no new identity/cart store |
| securityControl | Server actor validates active unexpired/unrevoked session. Queries bind authenticated user ID; strict new read model rejects browser-supplied customer IDs. UI preferences confer no authority. |
| testIds | CD-E,F |
| testFiles | [tests/customer-dashboard.test.ts](../../tests/customer-dashboard.test.ts) |
| testResult | PASS (linked executed tests; see reason for any remaining verification) |
| acceptanceGate | CD-05 |
| status | VERIFIED_COMPLETE |
| reason | Source reviewed; successful targeted regression and/or browser evidence confirms the specified local behaviour. |
| evidence | [docs/testing/customer-dashboard-focused-20261030.txt](../../docs/testing/customer-dashboard-focused-20261030.txt); [docs/testing/customer-dashboard-regression-20261030.txt](../../docs/testing/customer-dashboard-regression-20261030.txt); [docs/testing/customer-dashboard-browser-20261030.json](../../docs/testing/customer-dashboard-browser-20261030.json); [docs/testing/customer-dashboard-journeys-20261030.json](../../docs/testing/customer-dashboard-journeys-20261030.json); [docs/testing/customer-protected-routes-20261030.json](../../docs/testing/customer-protected-routes-20261030.json) |
| negativeTests | CD-Z; CD-I,K,V,Z; CD-E,F |
| outstandingWork | None within the documented local verification scope. |

## CD-REQ-010 — Cross-tab logout

| Field | Evidence |
|---|---|
| priority | P0 |
| scope | shared |
| uiReference | docs/customer/approved-dashboard-reference-20261030.png — Cross-tab logout |
| route | Website / dashboard |
| implementationFiles | [apps/web/components/site.tsx](../../apps/web/components/site.tsx); [apps/web/app/[...slug]/page.tsx](../../apps/web/app/[...slug]/page.tsx); [apps/web/lib/auth.ts](../../apps/web/lib/auth.ts); [apps/web/components/ui.tsx](../../apps/web/components/ui.tsx) |
| dataSource | Existing authenticated session and shared easygas.cart; no new identity/cart store |
| securityControl | Server actor validates active unexpired/unrevoked session. Queries bind authenticated user ID; strict new read model rejects browser-supplied customer IDs. UI preferences confer no authority. |
| testIds | CD-E,F |
| testFiles | [tests/customer-dashboard.test.ts](../../tests/customer-dashboard.test.ts) |
| testResult | PASS (linked executed tests; see reason for any remaining verification) |
| acceptanceGate | CD-05 |
| status | VERIFIED_COMPLETE |
| reason | Source reviewed; successful targeted regression and/or browser evidence confirms the specified local behaviour. |
| evidence | [docs/testing/customer-dashboard-focused-20261030.txt](../../docs/testing/customer-dashboard-focused-20261030.txt); [docs/testing/customer-dashboard-regression-20261030.txt](../../docs/testing/customer-dashboard-regression-20261030.txt); [docs/testing/customer-dashboard-browser-20261030.json](../../docs/testing/customer-dashboard-browser-20261030.json); [docs/testing/customer-dashboard-journeys-20261030.json](../../docs/testing/customer-dashboard-journeys-20261030.json) |
| negativeTests | CD-Z; CD-I,K,V,Z; CD-E,F |
| outstandingWork | None within the documented local verification scope. |

## CD-REQ-011 — Approved EasyGas visual design

| Field | Evidence |
|---|---|
| priority | P1 |
| scope | dashboard |
| uiReference | docs/customer/approved-dashboard-reference-20261030.png — Approved EasyGas visual design |
| route | /account |
| implementationFiles | [apps/web/components/customer-dashboard.tsx](../../apps/web/components/customer-dashboard.tsx); [apps/web/components/customer-data.ts](../../apps/web/components/customer-data.ts); [apps/web/lib/customer-dashboard.ts](../../apps/web/lib/customer-dashboard.ts); [apps/web/app/globals.css](../../apps/web/app/globals.css) |
| dataSource | Authenticated profile, customer route configuration and UI-only per-user preferences |
| securityControl | Server actor validates active unexpired/unrevoked session. Queries bind authenticated user ID; strict new read model rejects browser-supplied customer IDs. UI preferences confer no authority. |
| testIds | CD-R |
| testFiles | [tests/customer-dashboard.test.ts](../../tests/customer-dashboard.test.ts) |
| testResult | PASS (linked executed tests; see reason for any remaining verification) |
| acceptanceGate | CD-06 |
| status | VERIFIED_COMPLETE |
| reason | Source reviewed; successful targeted regression and/or browser evidence confirms the specified local behaviour. |
| evidence | [docs/testing/customer-dashboard-focused-20261030.txt](../../docs/testing/customer-dashboard-focused-20261030.txt); [docs/testing/customer-dashboard-regression-20261030.txt](../../docs/testing/customer-dashboard-regression-20261030.txt); [docs/testing/customer-dashboard-browser-20261030.json](../../docs/testing/customer-dashboard-browser-20261030.json); [docs/testing/customer-dashboard-journeys-20261030.json](../../docs/testing/customer-dashboard-journeys-20261030.json) |
| negativeTests |  |
| outstandingWork | None within the documented local verification scope. |

## CD-REQ-012 — Official logo and brand colours

| Field | Evidence |
|---|---|
| priority | P1 |
| scope | dashboard |
| uiReference | docs/customer/approved-dashboard-reference-20261030.png — Official logo and brand colours |
| route | Customer layout |
| implementationFiles | [apps/web/components/customer-workspace.tsx](../../apps/web/components/customer-workspace.tsx); [packages/business-rules/src/customer-navigation.ts](../../packages/business-rules/src/customer-navigation.ts); [apps/web/app/globals.css](../../apps/web/app/globals.css) |
| dataSource | Authenticated profile, customer route configuration and UI-only per-user preferences |
| securityControl | Server actor validates active unexpired/unrevoked session. Queries bind authenticated user ID; strict new read model rejects browser-supplied customer IDs. UI preferences confer no authority. |
| testIds | CD-R |
| testFiles | [tests/customer-dashboard.test.ts](../../tests/customer-dashboard.test.ts) |
| testResult | PASS (linked executed tests; see reason for any remaining verification) |
| acceptanceGate | CD-06 |
| status | VERIFIED_COMPLETE |
| reason | Source reviewed; successful targeted regression and/or browser evidence confirms the specified local behaviour. |
| evidence | [docs/testing/customer-dashboard-focused-20261030.txt](../../docs/testing/customer-dashboard-focused-20261030.txt); [docs/testing/customer-dashboard-regression-20261030.txt](../../docs/testing/customer-dashboard-regression-20261030.txt); [docs/testing/customer-dashboard-browser-20261030.json](../../docs/testing/customer-dashboard-browser-20261030.json); [docs/testing/customer-dashboard-journeys-20261030.json](../../docs/testing/customer-dashboard-journeys-20261030.json) |
| negativeTests |  |
| outstandingWork | None within the documented local verification scope. |

## CD-REQ-013 — Personalised customer welcome

| Field | Evidence |
|---|---|
| priority | P1 |
| scope | dashboard |
| uiReference | docs/customer/approved-dashboard-reference-20261030.png — Personalised customer welcome |
| route | /account |
| implementationFiles | [apps/web/components/customer-workspace.tsx](../../apps/web/components/customer-workspace.tsx); [packages/business-rules/src/customer-navigation.ts](../../packages/business-rules/src/customer-navigation.ts) |
| dataSource | Authenticated profile, customer route configuration and UI-only per-user preferences |
| securityControl | Server actor validates active unexpired/unrevoked session. Queries bind authenticated user ID; strict new read model rejects browser-supplied customer IDs. UI preferences confer no authority. |
| testIds | CD-R |
| testFiles | [tests/customer-dashboard.test.ts](../../tests/customer-dashboard.test.ts) |
| testResult | PASS (linked executed tests; see reason for any remaining verification) |
| acceptanceGate | CD-06 |
| status | VERIFIED_COMPLETE |
| reason | Source reviewed; successful targeted regression and/or browser evidence confirms the specified local behaviour. |
| evidence | [docs/testing/customer-dashboard-focused-20261030.txt](../../docs/testing/customer-dashboard-focused-20261030.txt); [docs/testing/customer-dashboard-regression-20261030.txt](../../docs/testing/customer-dashboard-regression-20261030.txt); [docs/testing/customer-dashboard-browser-20261030.json](../../docs/testing/customer-dashboard-browser-20261030.json); [docs/testing/customer-dashboard-journeys-20261030.json](../../docs/testing/customer-dashboard-journeys-20261030.json) |
| negativeTests |  |
| outstandingWork | None within the documented local verification scope. |

## CD-REQ-014 — Promotional hero

| Field | Evidence |
|---|---|
| priority | P1 |
| scope | dashboard |
| uiReference | docs/customer/approved-dashboard-reference-20261030.png — Promotional hero |
| route | /account |
| implementationFiles | [apps/web/components/customer-workspace.tsx](../../apps/web/components/customer-workspace.tsx); [packages/business-rules/src/customer-navigation.ts](../../packages/business-rules/src/customer-navigation.ts) |
| dataSource | Authenticated profile, customer route configuration and UI-only per-user preferences |
| securityControl | Server actor validates active unexpired/unrevoked session. Queries bind authenticated user ID; strict new read model rejects browser-supplied customer IDs. UI preferences confer no authority. |
| testIds | CD-R |
| testFiles | [tests/customer-dashboard.test.ts](../../tests/customer-dashboard.test.ts) |
| testResult | PASS (linked executed tests; see reason for any remaining verification) |
| acceptanceGate | CD-06 |
| status | VERIFIED_COMPLETE |
| reason | Source reviewed; successful targeted regression and/or browser evidence confirms the specified local behaviour. |
| evidence | [docs/testing/customer-dashboard-focused-20261030.txt](../../docs/testing/customer-dashboard-focused-20261030.txt); [docs/testing/customer-dashboard-regression-20261030.txt](../../docs/testing/customer-dashboard-regression-20261030.txt); [docs/testing/customer-dashboard-browser-20261030.json](../../docs/testing/customer-dashboard-browser-20261030.json); [docs/testing/customer-dashboard-journeys-20261030.json](../../docs/testing/customer-dashboard-journeys-20261030.json) |
| negativeTests |  |
| outstandingWork | None within the documented local verification scope. |

## CD-REQ-015 — Workspace header

| Field | Evidence |
|---|---|
| priority | P1 |
| scope | dashboard |
| uiReference | docs/customer/approved-dashboard-reference-20261030.png — Workspace header |
| route | Customer layout |
| implementationFiles | [apps/web/components/customer-workspace.tsx](../../apps/web/components/customer-workspace.tsx); [packages/business-rules/src/customer-navigation.ts](../../packages/business-rules/src/customer-navigation.ts) |
| dataSource | Authenticated profile, customer route configuration and UI-only per-user preferences |
| securityControl | Server actor validates active unexpired/unrevoked session. Queries bind authenticated user ID; strict new read model rejects browser-supplied customer IDs. UI preferences confer no authority. |
| testIds | CD-U,Z |
| testFiles | [tests/customer-dashboard.test.ts](../../tests/customer-dashboard.test.ts) |
| testResult | PASS (linked executed tests; see reason for any remaining verification) |
| acceptanceGate | CD-06 |
| status | VERIFIED_COMPLETE |
| reason | Source reviewed; successful targeted regression and/or browser evidence confirms the specified local behaviour. |
| evidence | [docs/testing/customer-dashboard-focused-20261030.txt](../../docs/testing/customer-dashboard-focused-20261030.txt); [docs/testing/customer-dashboard-regression-20261030.txt](../../docs/testing/customer-dashboard-regression-20261030.txt); [docs/testing/customer-dashboard-browser-20261030.json](../../docs/testing/customer-dashboard-browser-20261030.json); [docs/testing/customer-dashboard-journeys-20261030.json](../../docs/testing/customer-dashboard-journeys-20261030.json) |
| negativeTests |  |
| outstandingWork | None within the documented local verification scope. |

## CD-REQ-016 — All 15 customer routes

| Field | Evidence |
|---|---|
| priority | P1 |
| scope | dashboard |
| uiReference | docs/customer/approved-dashboard-reference-20261030.png — All 15 customer routes |
| route | Customer sidebar |
| implementationFiles | [apps/web/components/customer-workspace.tsx](../../apps/web/components/customer-workspace.tsx); [packages/business-rules/src/customer-navigation.ts](../../packages/business-rules/src/customer-navigation.ts) |
| dataSource | Authenticated profile, customer route configuration and UI-only per-user preferences |
| securityControl | Server actor validates active unexpired/unrevoked session. Queries bind authenticated user ID; strict new read model rejects browser-supplied customer IDs. UI preferences confer no authority. |
| testIds | CD-R |
| testFiles | [tests/customer-dashboard.test.ts](../../tests/customer-dashboard.test.ts) |
| testResult | PASS (linked executed tests; see reason for any remaining verification) |
| acceptanceGate | CD-07 |
| status | VERIFIED_COMPLETE |
| reason | Source reviewed; successful targeted regression and/or browser evidence confirms the specified local behaviour. |
| evidence | [docs/testing/customer-dashboard-focused-20261030.txt](../../docs/testing/customer-dashboard-focused-20261030.txt); [docs/testing/customer-dashboard-regression-20261030.txt](../../docs/testing/customer-dashboard-regression-20261030.txt); [docs/testing/customer-dashboard-browser-20261030.json](../../docs/testing/customer-dashboard-browser-20261030.json); [docs/testing/customer-dashboard-journeys-20261030.json](../../docs/testing/customer-dashboard-journeys-20261030.json) |
| negativeTests |  |
| outstandingWork | None within the documented local verification scope. |

## CD-REQ-017 — Grouped sidebar

| Field | Evidence |
|---|---|
| priority | P1 |
| scope | dashboard |
| uiReference | docs/customer/approved-dashboard-reference-20261030.png — Grouped sidebar |
| route | Customer sidebar |
| implementationFiles | [apps/web/components/customer-workspace.tsx](../../apps/web/components/customer-workspace.tsx); [packages/business-rules/src/customer-navigation.ts](../../packages/business-rules/src/customer-navigation.ts) |
| dataSource | Authenticated profile, customer route configuration and UI-only per-user preferences |
| securityControl | Server actor validates active unexpired/unrevoked session. Queries bind authenticated user ID; strict new read model rejects browser-supplied customer IDs. UI preferences confer no authority. |
| testIds | CD-R |
| testFiles | [tests/customer-dashboard.test.ts](../../tests/customer-dashboard.test.ts) |
| testResult | PASS (linked executed tests; see reason for any remaining verification) |
| acceptanceGate | CD-07 |
| status | VERIFIED_COMPLETE |
| reason | Source reviewed; successful targeted regression and/or browser evidence confirms the specified local behaviour. |
| evidence | [docs/testing/customer-dashboard-focused-20261030.txt](../../docs/testing/customer-dashboard-focused-20261030.txt); [docs/testing/customer-dashboard-regression-20261030.txt](../../docs/testing/customer-dashboard-regression-20261030.txt); [docs/testing/customer-dashboard-browser-20261030.json](../../docs/testing/customer-dashboard-browser-20261030.json); [docs/testing/customer-dashboard-journeys-20261030.json](../../docs/testing/customer-dashboard-journeys-20261030.json) |
| negativeTests |  |
| outstandingWork | None within the documented local verification scope. |

## CD-REQ-018 — Expanded sidebar

| Field | Evidence |
|---|---|
| priority | P1 |
| scope | dashboard |
| uiReference | docs/customer/approved-dashboard-reference-20261030.png — Expanded sidebar |
| route | Customer layout |
| implementationFiles | [apps/web/components/customer-workspace.tsx](../../apps/web/components/customer-workspace.tsx); [packages/business-rules/src/customer-navigation.ts](../../packages/business-rules/src/customer-navigation.ts) |
| dataSource | Authenticated profile, customer route configuration and UI-only per-user preferences |
| securityControl | Server actor validates active unexpired/unrevoked session. Queries bind authenticated user ID; strict new read model rejects browser-supplied customer IDs. UI preferences confer no authority. |
| testIds | CD-R |
| testFiles | [tests/customer-dashboard.test.ts](../../tests/customer-dashboard.test.ts) |
| testResult | PASS (linked executed tests; see reason for any remaining verification) |
| acceptanceGate | CD-07 |
| status | VERIFIED_COMPLETE |
| reason | Source reviewed; successful targeted regression and/or browser evidence confirms the specified local behaviour. |
| evidence | [docs/testing/customer-dashboard-focused-20261030.txt](../../docs/testing/customer-dashboard-focused-20261030.txt); [docs/testing/customer-dashboard-regression-20261030.txt](../../docs/testing/customer-dashboard-regression-20261030.txt); [docs/testing/customer-dashboard-browser-20261030.json](../../docs/testing/customer-dashboard-browser-20261030.json); [docs/testing/customer-dashboard-journeys-20261030.json](../../docs/testing/customer-dashboard-journeys-20261030.json) |
| negativeTests |  |
| outstandingWork | None within the documented local verification scope. |

## CD-REQ-019 — Collapsed sidebar

| Field | Evidence |
|---|---|
| priority | P1 |
| scope | dashboard |
| uiReference | docs/customer/approved-dashboard-reference-20261030.png — Collapsed sidebar |
| route | Customer layout |
| implementationFiles | [apps/web/components/customer-workspace.tsx](../../apps/web/components/customer-workspace.tsx); [packages/business-rules/src/customer-navigation.ts](../../packages/business-rules/src/customer-navigation.ts) |
| dataSource | Authenticated profile, customer route configuration and UI-only per-user preferences |
| securityControl | Server actor validates active unexpired/unrevoked session. Queries bind authenticated user ID; strict new read model rejects browser-supplied customer IDs. UI preferences confer no authority. |
| testIds | CD-R |
| testFiles | [tests/customer-dashboard.test.ts](../../tests/customer-dashboard.test.ts) |
| testResult | PASS (linked executed tests; see reason for any remaining verification) |
| acceptanceGate | CD-07 |
| status | VERIFIED_COMPLETE |
| reason | Source reviewed; successful targeted regression and/or browser evidence confirms the specified local behaviour. |
| evidence | [docs/testing/customer-dashboard-focused-20261030.txt](../../docs/testing/customer-dashboard-focused-20261030.txt); [docs/testing/customer-dashboard-regression-20261030.txt](../../docs/testing/customer-dashboard-regression-20261030.txt); [docs/testing/customer-dashboard-browser-20261030.json](../../docs/testing/customer-dashboard-browser-20261030.json); [docs/testing/customer-dashboard-journeys-20261030.json](../../docs/testing/customer-dashboard-journeys-20261030.json) |
| negativeTests |  |
| outstandingWork | None within the documented local verification scope. |

## CD-REQ-020 — Mobile navigation drawer

| Field | Evidence |
|---|---|
| priority | P1 |
| scope | dashboard |
| uiReference | docs/customer/approved-dashboard-reference-20261030.png — Mobile navigation drawer |
| route | Customer layout |
| implementationFiles | [apps/web/components/customer-workspace.tsx](../../apps/web/components/customer-workspace.tsx); [packages/business-rules/src/customer-navigation.ts](../../packages/business-rules/src/customer-navigation.ts) |
| dataSource | Authenticated profile, customer route configuration and UI-only per-user preferences |
| securityControl | Server actor validates active unexpired/unrevoked session. Queries bind authenticated user ID; strict new read model rejects browser-supplied customer IDs. UI preferences confer no authority. |
| testIds | CD-R |
| testFiles | [tests/customer-dashboard.test.ts](../../tests/customer-dashboard.test.ts) |
| testResult | PASS (linked executed tests; see reason for any remaining verification) |
| acceptanceGate | CD-07 |
| status | VERIFIED_COMPLETE |
| reason | Source reviewed; successful targeted regression and/or browser evidence confirms the specified local behaviour. |
| evidence | [docs/testing/customer-dashboard-focused-20261030.txt](../../docs/testing/customer-dashboard-focused-20261030.txt); [docs/testing/customer-dashboard-regression-20261030.txt](../../docs/testing/customer-dashboard-regression-20261030.txt); [docs/testing/customer-dashboard-browser-20261030.json](../../docs/testing/customer-dashboard-browser-20261030.json); [docs/testing/customer-dashboard-journeys-20261030.json](../../docs/testing/customer-dashboard-journeys-20261030.json) |
| negativeTests |  |
| outstandingWork | None within the documented local verification scope. |

## CD-REQ-021 — Active route highlighting

| Field | Evidence |
|---|---|
| priority | P1 |
| scope | dashboard |
| uiReference | docs/customer/approved-dashboard-reference-20261030.png — Active route highlighting |
| route | Customer layout |
| implementationFiles | [apps/web/components/customer-workspace.tsx](../../apps/web/components/customer-workspace.tsx); [packages/business-rules/src/customer-navigation.ts](../../packages/business-rules/src/customer-navigation.ts) |
| dataSource | Authenticated profile, customer route configuration and UI-only per-user preferences |
| securityControl | Server actor validates active unexpired/unrevoked session. Queries bind authenticated user ID; strict new read model rejects browser-supplied customer IDs. UI preferences confer no authority. |
| testIds | CD-R |
| testFiles | [tests/customer-dashboard.test.ts](../../tests/customer-dashboard.test.ts) |
| testResult | PASS (linked executed tests; see reason for any remaining verification) |
| acceptanceGate | CD-07 |
| status | VERIFIED_COMPLETE |
| reason | Source reviewed; successful targeted regression and/or browser evidence confirms the specified local behaviour. |
| evidence | [docs/testing/customer-dashboard-focused-20261030.txt](../../docs/testing/customer-dashboard-focused-20261030.txt); [docs/testing/customer-dashboard-regression-20261030.txt](../../docs/testing/customer-dashboard-regression-20261030.txt); [docs/testing/customer-dashboard-browser-20261030.json](../../docs/testing/customer-dashboard-browser-20261030.json); [docs/testing/customer-dashboard-journeys-20261030.json](../../docs/testing/customer-dashboard-journeys-20261030.json) |
| negativeTests |  |
| outstandingWork | None within the documented local verification scope. |

## CD-REQ-022 — Navigation preference persistence

| Field | Evidence |
|---|---|
| priority | P1 |
| scope | dashboard |
| uiReference | docs/customer/approved-dashboard-reference-20261030.png — Navigation preference persistence |
| route | Customer layout |
| implementationFiles | [apps/web/components/customer-workspace.tsx](../../apps/web/components/customer-workspace.tsx); [packages/business-rules/src/customer-navigation.ts](../../packages/business-rules/src/customer-navigation.ts) |
| dataSource | Authenticated profile, customer route configuration and UI-only per-user preferences |
| securityControl | Server actor validates active unexpired/unrevoked session. Queries bind authenticated user ID; strict new read model rejects browser-supplied customer IDs. UI preferences confer no authority. |
| testIds | CD-R |
| testFiles | [tests/customer-dashboard.test.ts](../../tests/customer-dashboard.test.ts) |
| testResult | PASS (linked executed tests; see reason for any remaining verification) |
| acceptanceGate | CD-07 |
| status | VERIFIED_COMPLETE |
| reason | Source reviewed; successful targeted regression and/or browser evidence confirms the specified local behaviour. |
| evidence | [docs/testing/customer-dashboard-focused-20261030.txt](../../docs/testing/customer-dashboard-focused-20261030.txt); [docs/testing/customer-dashboard-regression-20261030.txt](../../docs/testing/customer-dashboard-regression-20261030.txt); [docs/testing/customer-dashboard-browser-20261030.json](../../docs/testing/customer-dashboard-browser-20261030.json); [docs/testing/customer-dashboard-journeys-20261030.json](../../docs/testing/customer-dashboard-journeys-20261030.json) |
| negativeTests |  |
| outstandingWork | None within the documented local verification scope. |

## CD-REQ-023 — Orders summary

| Field | Evidence |
|---|---|
| priority | P1 |
| scope | dashboard |
| uiReference | docs/customer/approved-dashboard-reference-20261030.png — Orders summary |
| route | /account |
| implementationFiles | [apps/web/components/customer-dashboard.tsx](../../apps/web/components/customer-dashboard.tsx); [apps/web/components/customer-data.ts](../../apps/web/components/customer-data.ts); [apps/web/lib/customer-dashboard.ts](../../apps/web/lib/customer-dashboard.ts) |
| dataSource | Customer-owned orders, wallet_entries, reward_entries, refill_schedules, service_bookings, notifications and verified_payments |
| securityControl | Server actor validates active unexpired/unrevoked session. Queries bind authenticated user ID; strict new read model rejects browser-supplied customer IDs. UI preferences confer no authority. |
| testIds | CD-I,K,V,Z |
| testFiles | [tests/customer-dashboard.test.ts](../../tests/customer-dashboard.test.ts) |
| testResult | PASS (linked executed tests; see reason for any remaining verification) |
| acceptanceGate | CD-08 |
| status | VERIFIED_COMPLETE |
| reason | Source reviewed; successful targeted regression and/or browser evidence confirms the specified local behaviour. |
| evidence | [docs/testing/customer-dashboard-focused-20261030.txt](../../docs/testing/customer-dashboard-focused-20261030.txt); [docs/testing/customer-dashboard-regression-20261030.txt](../../docs/testing/customer-dashboard-regression-20261030.txt); [docs/testing/customer-dashboard-browser-20261030.json](../../docs/testing/customer-dashboard-browser-20261030.json); [docs/testing/customer-dashboard-journeys-20261030.json](../../docs/testing/customer-dashboard-journeys-20261030.json) |
| negativeTests |  |
| outstandingWork | None within the documented local verification scope. |

## CD-REQ-024 — Wallet balance

| Field | Evidence |
|---|---|
| priority | P0 |
| scope | dashboard |
| uiReference | docs/customer/approved-dashboard-reference-20261030.png — Wallet balance |
| route | /account |
| implementationFiles | [apps/web/components/customer-dashboard.tsx](../../apps/web/components/customer-dashboard.tsx); [apps/web/components/customer-data.ts](../../apps/web/components/customer-data.ts); [apps/web/lib/customer-dashboard.ts](../../apps/web/lib/customer-dashboard.ts); [apps/web/lib/service.ts](../../apps/web/lib/service.ts) |
| dataSource | wallet_entries sum(amount_kobo), reward_entries sum(points), including signed adjustments; never unverified funding |
| securityControl | Server actor validates active unexpired/unrevoked session. Queries bind authenticated user ID; strict new read model rejects browser-supplied customer IDs. UI preferences confer no authority. |
| testIds | CD-L,M,Z |
| testFiles | [tests/customer-dashboard.test.ts](../../tests/customer-dashboard.test.ts) |
| testResult | PASS (linked executed tests; see reason for any remaining verification) |
| acceptanceGate | CD-08 |
| status | VERIFIED_COMPLETE |
| reason | Source reviewed; successful targeted regression and/or browser evidence confirms the specified local behaviour. |
| evidence | [docs/testing/customer-dashboard-focused-20261030.txt](../../docs/testing/customer-dashboard-focused-20261030.txt); [docs/testing/customer-dashboard-regression-20261030.txt](../../docs/testing/customer-dashboard-regression-20261030.txt); [docs/testing/customer-dashboard-browser-20261030.json](../../docs/testing/customer-dashboard-browser-20261030.json); [docs/testing/customer-dashboard-journeys-20261030.json](../../docs/testing/customer-dashboard-journeys-20261030.json) |
| negativeTests | CD-Z; CD-I,K,V,Z; CD-E,F |
| outstandingWork | None within the documented local verification scope. |

## CD-REQ-025 — EasyRewards summary

| Field | Evidence |
|---|---|
| priority | P0 |
| scope | dashboard |
| uiReference | docs/customer/approved-dashboard-reference-20261030.png — EasyRewards summary |
| route | /account |
| implementationFiles | [apps/web/components/customer-dashboard.tsx](../../apps/web/components/customer-dashboard.tsx); [apps/web/components/customer-data.ts](../../apps/web/components/customer-data.ts); [apps/web/lib/customer-dashboard.ts](../../apps/web/lib/customer-dashboard.ts); [apps/web/lib/service.ts](../../apps/web/lib/service.ts) |
| dataSource | wallet_entries sum(amount_kobo), reward_entries sum(points), including signed adjustments; never unverified funding |
| securityControl | Server actor validates active unexpired/unrevoked session. Queries bind authenticated user ID; strict new read model rejects browser-supplied customer IDs. UI preferences confer no authority. |
| testIds | CD-L,M,Z |
| testFiles | [tests/customer-dashboard.test.ts](../../tests/customer-dashboard.test.ts) |
| testResult | PASS (linked executed tests; see reason for any remaining verification) |
| acceptanceGate | CD-08 |
| status | VERIFIED_COMPLETE |
| reason | Source reviewed; successful targeted regression and/or browser evidence confirms the specified local behaviour. |
| evidence | [docs/testing/customer-dashboard-focused-20261030.txt](../../docs/testing/customer-dashboard-focused-20261030.txt); [docs/testing/customer-dashboard-regression-20261030.txt](../../docs/testing/customer-dashboard-regression-20261030.txt); [docs/testing/customer-dashboard-browser-20261030.json](../../docs/testing/customer-dashboard-browser-20261030.json); [docs/testing/customer-dashboard-journeys-20261030.json](../../docs/testing/customer-dashboard-journeys-20261030.json) |
| negativeTests | CD-Z; CD-I,K,V,Z; CD-E,F |
| outstandingWork | None within the documented local verification scope. |

## CD-REQ-026 — Next refill summary

| Field | Evidence |
|---|---|
| priority | P1 |
| scope | dashboard |
| uiReference | docs/customer/approved-dashboard-reference-20261030.png — Next refill summary |
| route | /account |
| implementationFiles | [apps/web/components/customer-dashboard.tsx](../../apps/web/components/customer-dashboard.tsx); [apps/web/components/customer-data.ts](../../apps/web/components/customer-data.ts); [apps/web/lib/customer-dashboard.ts](../../apps/web/lib/customer-dashboard.ts) |
| dataSource | Customer-owned orders, wallet_entries, reward_entries, refill_schedules, service_bookings, notifications and verified_payments |
| securityControl | Server actor validates active unexpired/unrevoked session. Queries bind authenticated user ID; strict new read model rejects browser-supplied customer IDs. UI preferences confer no authority. |
| testIds | CD-R |
| testFiles | [tests/customer-dashboard.test.ts](../../tests/customer-dashboard.test.ts) |
| testResult | PASS (linked executed tests; see reason for any remaining verification) |
| acceptanceGate | CD-08 |
| status | VERIFIED_COMPLETE |
| reason | Source reviewed; successful targeted regression and/or browser evidence confirms the specified local behaviour. |
| evidence | [docs/testing/customer-dashboard-focused-20261030.txt](../../docs/testing/customer-dashboard-focused-20261030.txt); [docs/testing/customer-dashboard-regression-20261030.txt](../../docs/testing/customer-dashboard-regression-20261030.txt); [docs/testing/customer-dashboard-browser-20261030.json](../../docs/testing/customer-dashboard-browser-20261030.json); [docs/testing/customer-dashboard-journeys-20261030.json](../../docs/testing/customer-dashboard-journeys-20261030.json) |
| negativeTests |  |
| outstandingWork | None within the documented local verification scope. |

## CD-REQ-027 — Dashboard loading states

| Field | Evidence |
|---|---|
| priority | P1 |
| scope | dashboard |
| uiReference | docs/customer/approved-dashboard-reference-20261030.png — Dashboard loading states |
| route | /account |
| implementationFiles | [apps/web/components/customer-dashboard.tsx](../../apps/web/components/customer-dashboard.tsx); [apps/web/components/customer-data.ts](../../apps/web/components/customer-data.ts); [apps/web/lib/customer-dashboard.ts](../../apps/web/lib/customer-dashboard.ts) |
| dataSource | Customer-owned orders, wallet_entries, reward_entries, refill_schedules, service_bookings, notifications and verified_payments |
| securityControl | Server actor validates active unexpired/unrevoked session. Queries bind authenticated user ID; strict new read model rejects browser-supplied customer IDs. UI preferences confer no authority. |
| testIds | CD-J |
| testFiles | [tests/customer-dashboard.test.ts](../../tests/customer-dashboard.test.ts) |
| testResult | PASS (linked executed tests; see reason for any remaining verification) |
| acceptanceGate | CD-08 |
| status | VERIFIED_COMPLETE |
| reason | Source reviewed; successful targeted regression and/or browser evidence confirms the specified local behaviour. |
| evidence | [docs/testing/customer-dashboard-focused-20261030.txt](../../docs/testing/customer-dashboard-focused-20261030.txt); [docs/testing/customer-dashboard-regression-20261030.txt](../../docs/testing/customer-dashboard-regression-20261030.txt); [docs/testing/customer-dashboard-browser-20261030.json](../../docs/testing/customer-dashboard-browser-20261030.json); [docs/testing/customer-dashboard-journeys-20261030.json](../../docs/testing/customer-dashboard-journeys-20261030.json) |
| negativeTests |  |
| outstandingWork | None within the documented local verification scope. |

## CD-REQ-028 — Empty states

| Field | Evidence |
|---|---|
| priority | P1 |
| scope | dashboard |
| uiReference | docs/customer/approved-dashboard-reference-20261030.png — Empty states |
| route | /account |
| implementationFiles | [apps/web/components/customer-dashboard.tsx](../../apps/web/components/customer-dashboard.tsx); [apps/web/components/customer-data.ts](../../apps/web/components/customer-data.ts); [apps/web/lib/customer-dashboard.ts](../../apps/web/lib/customer-dashboard.ts) |
| dataSource | Customer-owned orders, wallet_entries, reward_entries, refill_schedules, service_bookings, notifications and verified_payments |
| securityControl | Server actor validates active unexpired/unrevoked session. Queries bind authenticated user ID; strict new read model rejects browser-supplied customer IDs. UI preferences confer no authority. |
| testIds | CD-J |
| testFiles | [tests/customer-dashboard.test.ts](../../tests/customer-dashboard.test.ts) |
| testResult | PASS (linked executed tests; see reason for any remaining verification) |
| acceptanceGate | CD-08 |
| status | VERIFIED_COMPLETE |
| reason | Source reviewed; successful targeted regression and/or browser evidence confirms the specified local behaviour. |
| evidence | [docs/testing/customer-dashboard-focused-20261030.txt](../../docs/testing/customer-dashboard-focused-20261030.txt); [docs/testing/customer-dashboard-regression-20261030.txt](../../docs/testing/customer-dashboard-regression-20261030.txt); [docs/testing/customer-dashboard-browser-20261030.json](../../docs/testing/customer-dashboard-browser-20261030.json); [docs/testing/customer-dashboard-journeys-20261030.json](../../docs/testing/customer-dashboard-journeys-20261030.json) |
| negativeTests |  |
| outstandingWork | None within the documented local verification scope. |

## CD-REQ-029 — Independent widget failures

| Field | Evidence |
|---|---|
| priority | P1 |
| scope | dashboard |
| uiReference | docs/customer/approved-dashboard-reference-20261030.png — Independent widget failures |
| route | /account |
| implementationFiles | [apps/web/components/customer-dashboard.tsx](../../apps/web/components/customer-dashboard.tsx); [apps/web/components/customer-data.ts](../../apps/web/components/customer-data.ts); [apps/web/lib/customer-dashboard.ts](../../apps/web/lib/customer-dashboard.ts) |
| dataSource | Customer-owned orders, wallet_entries, reward_entries, refill_schedules, service_bookings, notifications and verified_payments |
| securityControl | Server actor validates active unexpired/unrevoked session. Queries bind authenticated user ID; strict new read model rejects browser-supplied customer IDs. UI preferences confer no authority. |
| testIds | CD-Y |
| testFiles | [tests/customer-dashboard.test.ts](../../tests/customer-dashboard.test.ts) |
| testResult | PASS (linked executed tests; see reason for any remaining verification) |
| acceptanceGate | CD-15 |
| status | VERIFIED_COMPLETE |
| reason | Source reviewed; successful targeted regression and/or browser evidence confirms the specified local behaviour. |
| evidence | [docs/testing/customer-dashboard-focused-20261030.txt](../../docs/testing/customer-dashboard-focused-20261030.txt); [docs/testing/customer-dashboard-regression-20261030.txt](../../docs/testing/customer-dashboard-regression-20261030.txt); [docs/testing/customer-dashboard-browser-20261030.json](../../docs/testing/customer-dashboard-browser-20261030.json); [docs/testing/customer-dashboard-journeys-20261030.json](../../docs/testing/customer-dashboard-journeys-20261030.json) |
| negativeTests |  |
| outstandingWork | None within the documented local verification scope. |

## CD-REQ-030 — Recent activity

| Field | Evidence |
|---|---|
| priority | P1 |
| scope | dashboard |
| uiReference | docs/customer/approved-dashboard-reference-20261030.png — Recent activity |
| route | /account |
| implementationFiles | [apps/web/components/customer-dashboard.tsx](../../apps/web/components/customer-dashboard.tsx); [apps/web/components/customer-data.ts](../../apps/web/components/customer-data.ts); [apps/web/lib/customer-dashboard.ts](../../apps/web/lib/customer-dashboard.ts) |
| dataSource | Customer-owned orders, wallet_entries, reward_entries, refill_schedules, service_bookings, notifications and verified_payments |
| securityControl | Server actor validates active unexpired/unrevoked session. Queries bind authenticated user ID; strict new read model rejects browser-supplied customer IDs. UI preferences confer no authority. |
| testIds | CD-O,Q |
| testFiles | [tests/customer-dashboard.test.ts](../../tests/customer-dashboard.test.ts) |
| testResult | PASS (linked executed tests; see reason for any remaining verification) |
| acceptanceGate | CD-09 |
| status | VERIFIED_COMPLETE |
| reason | Source reviewed; successful targeted regression and/or browser evidence confirms the specified local behaviour. |
| evidence | [docs/testing/customer-dashboard-focused-20261030.txt](../../docs/testing/customer-dashboard-focused-20261030.txt); [docs/testing/customer-dashboard-regression-20261030.txt](../../docs/testing/customer-dashboard-regression-20261030.txt); [docs/testing/customer-dashboard-browser-20261030.json](../../docs/testing/customer-dashboard-browser-20261030.json); [docs/testing/customer-dashboard-journeys-20261030.json](../../docs/testing/customer-dashboard-journeys-20261030.json) |
| negativeTests |  |
| outstandingWork | None within the documented local verification scope. |

## CD-REQ-031 — Activity links

| Field | Evidence |
|---|---|
| priority | P1 |
| scope | dashboard |
| uiReference | docs/customer/approved-dashboard-reference-20261030.png — Activity links |
| route | /account |
| implementationFiles | [apps/web/components/customer-dashboard.tsx](../../apps/web/components/customer-dashboard.tsx); [apps/web/components/customer-data.ts](../../apps/web/components/customer-data.ts); [apps/web/lib/customer-dashboard.ts](../../apps/web/lib/customer-dashboard.ts) |
| dataSource | Customer-owned orders, wallet_entries, reward_entries, refill_schedules, service_bookings, notifications and verified_payments |
| securityControl | Server actor validates active unexpired/unrevoked session. Queries bind authenticated user ID; strict new read model rejects browser-supplied customer IDs. UI preferences confer no authority. |
| testIds | CD-O,Q |
| testFiles | [tests/customer-dashboard.test.ts](../../tests/customer-dashboard.test.ts) |
| testResult | PASS (linked executed tests; see reason for any remaining verification) |
| acceptanceGate | CD-09 |
| status | VERIFIED_COMPLETE |
| reason | Source reviewed; successful targeted regression and/or browser evidence confirms the specified local behaviour. |
| evidence | [docs/testing/customer-dashboard-focused-20261030.txt](../../docs/testing/customer-dashboard-focused-20261030.txt); [docs/testing/customer-dashboard-regression-20261030.txt](../../docs/testing/customer-dashboard-regression-20261030.txt); [docs/testing/customer-dashboard-browser-20261030.json](../../docs/testing/customer-dashboard-browser-20261030.json); [docs/testing/customer-dashboard-journeys-20261030.json](../../docs/testing/customer-dashboard-journeys-20261030.json) |
| negativeTests |  |
| outstandingWork | None within the documented local verification scope. |

## CD-REQ-032 — Notification indicators

| Field | Evidence |
|---|---|
| priority | P1 |
| scope | dashboard |
| uiReference | docs/customer/approved-dashboard-reference-20261030.png — Notification indicators |
| route | Customer layout |
| implementationFiles | [apps/web/components/customer-workspace.tsx](../../apps/web/components/customer-workspace.tsx); [packages/business-rules/src/customer-navigation.ts](../../packages/business-rules/src/customer-navigation.ts) |
| dataSource | Customer-owned orders, wallet_entries, reward_entries, refill_schedules, service_bookings, notifications and verified_payments |
| securityControl | Server actor validates active unexpired/unrevoked session. Queries bind authenticated user ID; strict new read model rejects browser-supplied customer IDs. UI preferences confer no authority. |
| testIds | CD-I,K,V,Z |
| testFiles | [tests/customer-dashboard.test.ts](../../tests/customer-dashboard.test.ts) |
| testResult | PASS (linked executed tests; see reason for any remaining verification) |
| acceptanceGate | CD-09 |
| status | VERIFIED_COMPLETE |
| reason | Source reviewed; successful targeted regression and/or browser evidence confirms the specified local behaviour. |
| evidence | [docs/testing/customer-dashboard-focused-20261030.txt](../../docs/testing/customer-dashboard-focused-20261030.txt); [docs/testing/customer-dashboard-regression-20261030.txt](../../docs/testing/customer-dashboard-regression-20261030.txt); [docs/testing/customer-dashboard-browser-20261030.json](../../docs/testing/customer-dashboard-browser-20261030.json); [docs/testing/customer-dashboard-journeys-20261030.json](../../docs/testing/customer-dashboard-journeys-20261030.json) |
| negativeTests |  |
| outstandingWork | None within the documented local verification scope. |

## CD-REQ-033 — Cooking gas profiles

| Field | Evidence |
|---|---|
| priority | P1 |
| scope | dashboard |
| uiReference | docs/customer/approved-dashboard-reference-20261030.png — Cooking gas profiles |
| route | /consumption |
| implementationFiles | [apps/web/components/workflows.tsx](../../apps/web/components/workflows.tsx); [apps/web/lib/refills.ts](../../apps/web/lib/refills.ts); [apps/web/lib/accounts.ts](../../apps/web/lib/accounts.ts); [packages/business-rules/src/forecast.ts](../../packages/business-rules/src/forecast.ts) |
| dataSource | Owned consumption_profiles, refill_history and existing forecast service |
| securityControl | Server actor validates active unexpired/unrevoked session. Queries bind authenticated user ID; strict new read model rejects browser-supplied customer IDs. UI preferences confer no authority. |
| testIds | CD-Z |
| testFiles | [tests/customer-dashboard.test.ts](../../tests/customer-dashboard.test.ts) |
| testResult | PASS (linked executed tests; see reason for any remaining verification) |
| acceptanceGate | CD-10 |
| status | VERIFIED_COMPLETE |
| reason | Source reviewed; successful targeted regression and/or browser evidence confirms the specified local behaviour. |
| evidence | [docs/testing/customer-dashboard-focused-20261030.txt](../../docs/testing/customer-dashboard-focused-20261030.txt); [docs/testing/customer-dashboard-regression-20261030.txt](../../docs/testing/customer-dashboard-regression-20261030.txt); [docs/testing/customer-dashboard-browser-20261030.json](../../docs/testing/customer-dashboard-browser-20261030.json); [docs/testing/customer-dashboard-journeys-20261030.json](../../docs/testing/customer-dashboard-journeys-20261030.json) |
| negativeTests |  |
| outstandingWork | None within the documented local verification scope. |

## CD-REQ-034 — Verified refill history

| Field | Evidence |
|---|---|
| priority | P1 |
| scope | dashboard |
| uiReference | docs/customer/approved-dashboard-reference-20261030.png — Verified refill history |
| route | /consumption |
| implementationFiles | [apps/web/components/workflows.tsx](../../apps/web/components/workflows.tsx); [apps/web/lib/refills.ts](../../apps/web/lib/refills.ts); [apps/web/lib/accounts.ts](../../apps/web/lib/accounts.ts); [packages/business-rules/src/forecast.ts](../../packages/business-rules/src/forecast.ts) |
| dataSource | Owned consumption_profiles, refill_history and existing forecast service |
| securityControl | Server actor validates active unexpired/unrevoked session. Queries bind authenticated user ID; strict new read model rejects browser-supplied customer IDs. UI preferences confer no authority. |
| testIds | CD-O,Q |
| testFiles | [tests/customer-dashboard.test.ts](../../tests/customer-dashboard.test.ts) |
| testResult | PASS (linked executed tests; see reason for any remaining verification) |
| acceptanceGate | CD-10 |
| status | VERIFIED_COMPLETE |
| reason | Source reviewed; successful targeted regression and/or browser evidence confirms the specified local behaviour. |
| evidence | [docs/testing/customer-dashboard-focused-20261030.txt](../../docs/testing/customer-dashboard-focused-20261030.txt); [docs/testing/customer-dashboard-regression-20261030.txt](../../docs/testing/customer-dashboard-regression-20261030.txt); [docs/testing/customer-dashboard-browser-20261030.json](../../docs/testing/customer-dashboard-browser-20261030.json); [docs/testing/customer-dashboard-journeys-20261030.json](../../docs/testing/customer-dashboard-journeys-20261030.json) |
| negativeTests |  |
| outstandingWork | None within the documented local verification scope. |

## CD-REQ-035 — Gas purchase history chart

| Field | Evidence |
|---|---|
| priority | P1 |
| scope | dashboard |
| uiReference | docs/customer/approved-dashboard-reference-20261030.png — Gas purchase history chart |
| route | /account |
| implementationFiles | [apps/web/components/workflows.tsx](../../apps/web/components/workflows.tsx); [apps/web/lib/refills.ts](../../apps/web/lib/refills.ts); [apps/web/lib/accounts.ts](../../apps/web/lib/accounts.ts); [packages/business-rules/src/forecast.ts](../../packages/business-rules/src/forecast.ts) |
| dataSource | Owned consumption_profiles, refill_history and existing forecast service |
| securityControl | Server actor validates active unexpired/unrevoked session. Queries bind authenticated user ID; strict new read model rejects browser-supplied customer IDs. UI preferences confer no authority. |
| testIds | CD-O,Q |
| testFiles | [tests/customer-dashboard.test.ts](../../tests/customer-dashboard.test.ts) |
| testResult | PASS (linked executed tests; see reason for any remaining verification) |
| acceptanceGate | CD-10 |
| status | VERIFIED_COMPLETE |
| reason | Source reviewed; successful targeted regression and/or browser evidence confirms the specified local behaviour. |
| evidence | [docs/testing/customer-dashboard-focused-20261030.txt](../../docs/testing/customer-dashboard-focused-20261030.txt); [docs/testing/customer-dashboard-regression-20261030.txt](../../docs/testing/customer-dashboard-regression-20261030.txt); [docs/testing/customer-dashboard-browser-20261030.json](../../docs/testing/customer-dashboard-browser-20261030.json); [docs/testing/customer-dashboard-journeys-20261030.json](../../docs/testing/customer-dashboard-journeys-20261030.json) |
| negativeTests |  |
| outstandingWork | None within the documented local verification scope. |

## CD-REQ-036 — Smart refill predictions

| Field | Evidence |
|---|---|
| priority | P1 |
| scope | dashboard |
| uiReference | docs/customer/approved-dashboard-reference-20261030.png — Smart refill predictions |
| route | /refill |
| implementationFiles | [apps/web/components/workflows.tsx](../../apps/web/components/workflows.tsx); [apps/web/lib/refills.ts](../../apps/web/lib/refills.ts); [apps/web/lib/accounts.ts](../../apps/web/lib/accounts.ts); [packages/business-rules/src/forecast.ts](../../packages/business-rules/src/forecast.ts) |
| dataSource | Owned consumption_profiles, refill_history and existing forecast service |
| securityControl | Server actor validates active unexpired/unrevoked session. Queries bind authenticated user ID; strict new read model rejects browser-supplied customer IDs. UI preferences confer no authority. |
| testIds | CD-Z |
| testFiles | [tests/customer-dashboard.test.ts](../../tests/customer-dashboard.test.ts) |
| testResult | PASS (linked executed tests; see reason for any remaining verification) |
| acceptanceGate | CD-10 |
| status | VERIFIED_COMPLETE |
| reason | Source reviewed; successful targeted regression and/or browser evidence confirms the specified local behaviour. |
| evidence | [docs/testing/customer-dashboard-focused-20261030.txt](../../docs/testing/customer-dashboard-focused-20261030.txt); [docs/testing/customer-dashboard-regression-20261030.txt](../../docs/testing/customer-dashboard-regression-20261030.txt); [docs/testing/customer-dashboard-browser-20261030.json](../../docs/testing/customer-dashboard-browser-20261030.json); [docs/testing/customer-dashboard-journeys-20261030.json](../../docs/testing/customer-dashboard-journeys-20261030.json) |
| negativeTests |  |
| outstandingWork | None within the documented local verification scope. |

## CD-REQ-037 — Insufficient-data handling

| Field | Evidence |
|---|---|
| priority | P1 |
| scope | dashboard |
| uiReference | docs/customer/approved-dashboard-reference-20261030.png — Insufficient-data handling |
| route | /account |
| implementationFiles | [apps/web/components/workflows.tsx](../../apps/web/components/workflows.tsx); [apps/web/lib/refills.ts](../../apps/web/lib/refills.ts); [apps/web/lib/accounts.ts](../../apps/web/lib/accounts.ts); [packages/business-rules/src/forecast.ts](../../packages/business-rules/src/forecast.ts) |
| dataSource | Owned consumption_profiles, refill_history and existing forecast service |
| securityControl | Server actor validates active unexpired/unrevoked session. Queries bind authenticated user ID; strict new read model rejects browser-supplied customer IDs. UI preferences confer no authority. |
| testIds | CD-Z |
| testFiles | [tests/customer-dashboard.test.ts](../../tests/customer-dashboard.test.ts) |
| testResult | PASS (linked executed tests; see reason for any remaining verification) |
| acceptanceGate | CD-10 |
| status | VERIFIED_COMPLETE |
| reason | Source reviewed; successful targeted regression and/or browser evidence confirms the specified local behaviour. |
| evidence | [docs/testing/customer-dashboard-focused-20261030.txt](../../docs/testing/customer-dashboard-focused-20261030.txt); [docs/testing/customer-dashboard-regression-20261030.txt](../../docs/testing/customer-dashboard-regression-20261030.txt); [docs/testing/customer-dashboard-browser-20261030.json](../../docs/testing/customer-dashboard-browser-20261030.json); [docs/testing/customer-dashboard-journeys-20261030.json](../../docs/testing/customer-dashboard-journeys-20261030.json) |
| negativeTests |  |
| outstandingWork | None within the documented local verification scope. |

## CD-REQ-038 — Prediction confidence

| Field | Evidence |
|---|---|
| priority | P1 |
| scope | dashboard |
| uiReference | docs/customer/approved-dashboard-reference-20261030.png — Prediction confidence |
| route | /refill |
| implementationFiles | [apps/web/components/workflows.tsx](../../apps/web/components/workflows.tsx); [apps/web/lib/refills.ts](../../apps/web/lib/refills.ts); [apps/web/lib/accounts.ts](../../apps/web/lib/accounts.ts); [packages/business-rules/src/forecast.ts](../../packages/business-rules/src/forecast.ts) |
| dataSource | Owned consumption_profiles, refill_history and existing forecast service |
| securityControl | Server actor validates active unexpired/unrevoked session. Queries bind authenticated user ID; strict new read model rejects browser-supplied customer IDs. UI preferences confer no authority. |
| testIds | CD-Z |
| testFiles | [tests/customer-dashboard.test.ts](../../tests/customer-dashboard.test.ts) |
| testResult | PASS (linked executed tests; see reason for any remaining verification) |
| acceptanceGate | CD-10 |
| status | VERIFIED_COMPLETE |
| reason | Source reviewed; successful targeted regression and/or browser evidence confirms the specified local behaviour. |
| evidence | [docs/testing/customer-dashboard-focused-20261030.txt](../../docs/testing/customer-dashboard-focused-20261030.txt); [docs/testing/customer-dashboard-regression-20261030.txt](../../docs/testing/customer-dashboard-regression-20261030.txt); [docs/testing/customer-dashboard-browser-20261030.json](../../docs/testing/customer-dashboard-browser-20261030.json); [docs/testing/customer-dashboard-journeys-20261030.json](../../docs/testing/customer-dashboard-journeys-20261030.json) |
| negativeTests |  |
| outstandingWork | None within the documented local verification scope. |

## CD-REQ-039 — Customer refill feedback

| Field | Evidence |
|---|---|
| priority | P1 |
| scope | dashboard |
| uiReference | docs/customer/approved-dashboard-reference-20261030.png — Customer refill feedback |
| route | /refill |
| implementationFiles | [apps/web/components/workflows.tsx](../../apps/web/components/workflows.tsx); [apps/web/lib/refills.ts](../../apps/web/lib/refills.ts); [apps/web/lib/accounts.ts](../../apps/web/lib/accounts.ts); [packages/business-rules/src/forecast.ts](../../packages/business-rules/src/forecast.ts); [packages/business-rules/src/refill-feedback.ts](../../packages/business-rules/src/refill-feedback.ts); [database/migrations/032_customer_refill_feedback.sql](../../database/migrations/032_customer_refill_feedback.sql); [supabase/migrations/20261030030143_customer_refill_feedback_states.sql](../../supabase/migrations/20261030030143_customer_refill_feedback_states.sql) |
| dataSource | Owned consumption_profiles, refill_history and existing forecast service |
| securityControl | Server actor validates active unexpired/unrevoked session. Queries bind authenticated user ID; strict new read model rejects browser-supplied customer IDs. UI preferences confer no authority. |
| testIds | CD-N; CD-N-feedback |
| testFiles | [tests/customer-dashboard.test.ts](../../tests/customer-dashboard.test.ts); [tests/refill-feedback.test.ts](../../tests/refill-feedback.test.ts) |
| testResult | PASS: executed ownership, rate-limit, worker suppression, 24-hour boundary, verified-history and browser self-report tests. |
| acceptanceGate | CD-10 |
| status | VERIFIED_COMPLETE |
| reason | All five feedback states persist through the owned existing workflow. Self-reports suppress obsolete forecasts without creating history; snooze pauses estimated reminders for 24 hours; later verified purchases supersede the report. |
| evidence | [docs/testing/customer-dashboard-focused-20261030.txt](../../docs/testing/customer-dashboard-focused-20261030.txt); [docs/testing/customer-dashboard-regression-20261030.txt](../../docs/testing/customer-dashboard-regression-20261030.txt); [docs/testing/customer-dashboard-browser-20261030.json](../../docs/testing/customer-dashboard-browser-20261030.json); [docs/testing/customer-dashboard-journeys-20261030.json](../../docs/testing/customer-dashboard-journeys-20261030.json); [docs/screenshots/customer-refill-feedback-20261030.png](../../docs/screenshots/customer-refill-feedback-20261030.png) |
| negativeTests | CD-N |
| outstandingWork | None within local scope. External reports remain explicitly unverified; online notifications remain disconnected. |

## CD-REQ-040 — Refill reminder preferences

| Field | Evidence |
|---|---|
| priority | P1 |
| scope | dashboard |
| uiReference | docs/customer/approved-dashboard-reference-20261030.png — Refill reminder preferences |
| route | /refill |
| implementationFiles | [apps/web/components/workflows.tsx](../../apps/web/components/workflows.tsx); [apps/web/lib/refills.ts](../../apps/web/lib/refills.ts); [apps/web/lib/accounts.ts](../../apps/web/lib/accounts.ts); [packages/business-rules/src/forecast.ts](../../packages/business-rules/src/forecast.ts) |
| dataSource | Owned consumption_profiles, refill_history and existing forecast service |
| securityControl | Server actor validates active unexpired/unrevoked session. Queries bind authenticated user ID; strict new read model rejects browser-supplied customer IDs. UI preferences confer no authority. |
| testIds | CD-Z |
| testFiles | [tests/customer-dashboard.test.ts](../../tests/customer-dashboard.test.ts) |
| testResult | PASS (linked executed tests; see reason for any remaining verification) |
| acceptanceGate | CD-10 |
| status | VERIFIED_COMPLETE |
| reason | Source reviewed; successful targeted regression and/or browser evidence confirms the specified local behaviour. |
| evidence | [docs/testing/customer-dashboard-focused-20261030.txt](../../docs/testing/customer-dashboard-focused-20261030.txt); [docs/testing/customer-dashboard-regression-20261030.txt](../../docs/testing/customer-dashboard-regression-20261030.txt); [docs/testing/customer-dashboard-browser-20261030.json](../../docs/testing/customer-dashboard-browser-20261030.json); [docs/testing/customer-dashboard-journeys-20261030.json](../../docs/testing/customer-dashboard-journeys-20261030.json) |
| negativeTests |  |
| outstandingWork | None within the documented local verification scope. |

## CD-REQ-041 — Order Gas

| Field | Evidence |
|---|---|
| priority | P1 |
| scope | dashboard |
| uiReference | docs/customer/approved-dashboard-reference-20261030.png — Order Gas |
| route | Existing ordering route |
| implementationFiles | [apps/web/components/customer-dashboard.tsx](../../apps/web/components/customer-dashboard.tsx); [apps/web/components/customer-data.ts](../../apps/web/components/customer-data.ts); [apps/web/lib/customer-dashboard.ts](../../apps/web/lib/customer-dashboard.ts) |
| dataSource | Existing customer workflow route and authoritative API |
| securityControl | Server actor validates active unexpired/unrevoked session. Queries bind authenticated user ID; strict new read model rejects browser-supplied customer IDs. UI preferences confer no authority. |
| testIds | CD-R |
| testFiles | [tests/customer-dashboard.test.ts](../../tests/customer-dashboard.test.ts) |
| testResult | PASS (linked executed tests; see reason for any remaining verification) |
| acceptanceGate | CD-11 |
| status | VERIFIED_COMPLETE |
| reason | Source reviewed; successful targeted regression and/or browser evidence confirms the specified local behaviour. |
| evidence | [docs/testing/customer-dashboard-focused-20261030.txt](../../docs/testing/customer-dashboard-focused-20261030.txt); [docs/testing/customer-dashboard-regression-20261030.txt](../../docs/testing/customer-dashboard-regression-20261030.txt); [docs/testing/customer-dashboard-browser-20261030.json](../../docs/testing/customer-dashboard-browser-20261030.json); [docs/testing/customer-dashboard-journeys-20261030.json](../../docs/testing/customer-dashboard-journeys-20261030.json) |
| negativeTests |  |
| outstandingWork | None within the documented local verification scope. |

## CD-REQ-042 — Book a Service

| Field | Evidence |
|---|---|
| priority | P1 |
| scope | dashboard |
| uiReference | docs/customer/approved-dashboard-reference-20261030.png — Book a Service |
| route | /services |
| implementationFiles | [apps/web/components/customer-dashboard.tsx](../../apps/web/components/customer-dashboard.tsx); [apps/web/components/customer-data.ts](../../apps/web/components/customer-data.ts); [apps/web/lib/customer-dashboard.ts](../../apps/web/lib/customer-dashboard.ts) |
| dataSource | Existing customer workflow route and authoritative API |
| securityControl | Server actor validates active unexpired/unrevoked session. Queries bind authenticated user ID; strict new read model rejects browser-supplied customer IDs. UI preferences confer no authority. |
| testIds | CD-R |
| testFiles | [tests/customer-dashboard.test.ts](../../tests/customer-dashboard.test.ts) |
| testResult | PASS (linked executed tests; see reason for any remaining verification) |
| acceptanceGate | CD-11 |
| status | VERIFIED_COMPLETE |
| reason | Source reviewed; successful targeted regression and/or browser evidence confirms the specified local behaviour. |
| evidence | [docs/testing/customer-dashboard-focused-20261030.txt](../../docs/testing/customer-dashboard-focused-20261030.txt); [docs/testing/customer-dashboard-regression-20261030.txt](../../docs/testing/customer-dashboard-regression-20261030.txt); [docs/testing/customer-dashboard-browser-20261030.json](../../docs/testing/customer-dashboard-browser-20261030.json); [docs/testing/customer-dashboard-journeys-20261030.json](../../docs/testing/customer-dashboard-journeys-20261030.json) |
| negativeTests |  |
| outstandingWork | None within the documented local verification scope. |

## CD-REQ-043 — Wallet action

| Field | Evidence |
|---|---|
| priority | P1 |
| scope | dashboard |
| uiReference | docs/customer/approved-dashboard-reference-20261030.png — Wallet action |
| route | /wallet |
| implementationFiles | [apps/web/components/customer-dashboard.tsx](../../apps/web/components/customer-dashboard.tsx); [apps/web/components/customer-data.ts](../../apps/web/components/customer-data.ts); [apps/web/lib/customer-dashboard.ts](../../apps/web/lib/customer-dashboard.ts) |
| dataSource | Existing customer workflow route and authoritative API |
| securityControl | Server actor validates active unexpired/unrevoked session. Queries bind authenticated user ID; strict new read model rejects browser-supplied customer IDs. UI preferences confer no authority. |
| testIds | CD-R |
| testFiles | [tests/customer-dashboard.test.ts](../../tests/customer-dashboard.test.ts) |
| testResult | PASS (linked executed tests; see reason for any remaining verification) |
| acceptanceGate | CD-11 |
| status | VERIFIED_COMPLETE |
| reason | Source reviewed; successful targeted regression and/or browser evidence confirms the specified local behaviour. |
| evidence | [docs/testing/customer-dashboard-focused-20261030.txt](../../docs/testing/customer-dashboard-focused-20261030.txt); [docs/testing/customer-dashboard-regression-20261030.txt](../../docs/testing/customer-dashboard-regression-20261030.txt); [docs/testing/customer-dashboard-browser-20261030.json](../../docs/testing/customer-dashboard-browser-20261030.json); [docs/testing/customer-dashboard-journeys-20261030.json](../../docs/testing/customer-dashboard-journeys-20261030.json) |
| negativeTests |  |
| outstandingWork | None within the documented local verification scope. |

## CD-REQ-044 — View Rewards

| Field | Evidence |
|---|---|
| priority | P1 |
| scope | dashboard |
| uiReference | docs/customer/approved-dashboard-reference-20261030.png — View Rewards |
| route | /rewards |
| implementationFiles | [apps/web/components/customer-dashboard.tsx](../../apps/web/components/customer-dashboard.tsx); [apps/web/components/customer-data.ts](../../apps/web/components/customer-data.ts); [apps/web/lib/customer-dashboard.ts](../../apps/web/lib/customer-dashboard.ts) |
| dataSource | Existing customer workflow route and authoritative API |
| securityControl | Server actor validates active unexpired/unrevoked session. Queries bind authenticated user ID; strict new read model rejects browser-supplied customer IDs. UI preferences confer no authority. |
| testIds | CD-R |
| testFiles | [tests/customer-dashboard.test.ts](../../tests/customer-dashboard.test.ts) |
| testResult | PASS (linked executed tests; see reason for any remaining verification) |
| acceptanceGate | CD-11 |
| status | VERIFIED_COMPLETE |
| reason | Source reviewed; successful targeted regression and/or browser evidence confirms the specified local behaviour. |
| evidence | [docs/testing/customer-dashboard-focused-20261030.txt](../../docs/testing/customer-dashboard-focused-20261030.txt); [docs/testing/customer-dashboard-regression-20261030.txt](../../docs/testing/customer-dashboard-regression-20261030.txt); [docs/testing/customer-dashboard-browser-20261030.json](../../docs/testing/customer-dashboard-browser-20261030.json); [docs/testing/customer-dashboard-journeys-20261030.json](../../docs/testing/customer-dashboard-journeys-20261030.json) |
| negativeTests |  |
| outstandingWork | None within the documented local verification scope. |

## CD-REQ-045 — Plan a Refill

| Field | Evidence |
|---|---|
| priority | P1 |
| scope | dashboard |
| uiReference | docs/customer/approved-dashboard-reference-20261030.png — Plan a Refill |
| route | /schedules |
| implementationFiles | [apps/web/components/customer-dashboard.tsx](../../apps/web/components/customer-dashboard.tsx); [apps/web/components/customer-data.ts](../../apps/web/components/customer-data.ts); [apps/web/lib/customer-dashboard.ts](../../apps/web/lib/customer-dashboard.ts) |
| dataSource | Existing customer workflow route and authoritative API |
| securityControl | Server actor validates active unexpired/unrevoked session. Queries bind authenticated user ID; strict new read model rejects browser-supplied customer IDs. UI preferences confer no authority. |
| testIds | CD-R |
| testFiles | [tests/customer-dashboard.test.ts](../../tests/customer-dashboard.test.ts) |
| testResult | PASS (linked executed tests; see reason for any remaining verification) |
| acceptanceGate | CD-11 |
| status | VERIFIED_COMPLETE |
| reason | Source reviewed; successful targeted regression and/or browser evidence confirms the specified local behaviour. |
| evidence | [docs/testing/customer-dashboard-focused-20261030.txt](../../docs/testing/customer-dashboard-focused-20261030.txt); [docs/testing/customer-dashboard-regression-20261030.txt](../../docs/testing/customer-dashboard-regression-20261030.txt); [docs/testing/customer-dashboard-browser-20261030.json](../../docs/testing/customer-dashboard-browser-20261030.json); [docs/testing/customer-dashboard-journeys-20261030.json](../../docs/testing/customer-dashboard-journeys-20261030.json) |
| negativeTests |  |
| outstandingWork | None within the documented local verification scope. |

## CD-REQ-046 — View My Orders

| Field | Evidence |
|---|---|
| priority | P1 |
| scope | dashboard |
| uiReference | docs/customer/approved-dashboard-reference-20261030.png — View My Orders |
| route | /orders |
| implementationFiles | [apps/web/components/customer-dashboard.tsx](../../apps/web/components/customer-dashboard.tsx); [apps/web/components/customer-data.ts](../../apps/web/components/customer-data.ts); [apps/web/lib/customer-dashboard.ts](../../apps/web/lib/customer-dashboard.ts) |
| dataSource | Existing customer workflow route and authoritative API |
| securityControl | Server actor validates active unexpired/unrevoked session. Queries bind authenticated user ID; strict new read model rejects browser-supplied customer IDs. UI preferences confer no authority. |
| testIds | CD-R |
| testFiles | [tests/customer-dashboard.test.ts](../../tests/customer-dashboard.test.ts) |
| testResult | PASS (linked executed tests; see reason for any remaining verification) |
| acceptanceGate | CD-11 |
| status | VERIFIED_COMPLETE |
| reason | Source reviewed; successful targeted regression and/or browser evidence confirms the specified local behaviour. |
| evidence | [docs/testing/customer-dashboard-focused-20261030.txt](../../docs/testing/customer-dashboard-focused-20261030.txt); [docs/testing/customer-dashboard-regression-20261030.txt](../../docs/testing/customer-dashboard-regression-20261030.txt); [docs/testing/customer-dashboard-browser-20261030.json](../../docs/testing/customer-dashboard-browser-20261030.json); [docs/testing/customer-dashboard-journeys-20261030.json](../../docs/testing/customer-dashboard-journeys-20261030.json) |
| negativeTests |  |
| outstandingWork | None within the documented local verification scope. |

## CD-REQ-047 — Account Settings

| Field | Evidence |
|---|---|
| priority | P1 |
| scope | dashboard |
| uiReference | docs/customer/approved-dashboard-reference-20261030.png — Account Settings |
| route | /account-settings |
| implementationFiles | [apps/web/components/customer-workspace.tsx](../../apps/web/components/customer-workspace.tsx); [packages/business-rules/src/customer-navigation.ts](../../packages/business-rules/src/customer-navigation.ts) |
| dataSource | Existing customer workflow route and authoritative API |
| securityControl | Server actor validates active unexpired/unrevoked session. Queries bind authenticated user ID; strict new read model rejects browser-supplied customer IDs. UI preferences confer no authority. |
| testIds | CD-R |
| testFiles | [tests/customer-dashboard.test.ts](../../tests/customer-dashboard.test.ts) |
| testResult | PASS (linked executed tests; see reason for any remaining verification) |
| acceptanceGate | CD-07 |
| status | VERIFIED_COMPLETE |
| reason | Source reviewed; successful targeted regression and/or browser evidence confirms the specified local behaviour. |
| evidence | [docs/testing/customer-dashboard-focused-20261030.txt](../../docs/testing/customer-dashboard-focused-20261030.txt); [docs/testing/customer-dashboard-regression-20261030.txt](../../docs/testing/customer-dashboard-regression-20261030.txt); [docs/testing/customer-dashboard-browser-20261030.json](../../docs/testing/customer-dashboard-browser-20261030.json); [docs/testing/customer-dashboard-journeys-20261030.json](../../docs/testing/customer-dashboard-journeys-20261030.json) |
| negativeTests |  |
| outstandingWork | None within the documented local verification scope. |

## CD-REQ-048 — Support access

| Field | Evidence |
|---|---|
| priority | P1 |
| scope | dashboard |
| uiReference | docs/customer/approved-dashboard-reference-20261030.png — Support access |
| route | /help, /support |
| implementationFiles | [apps/web/components/customer-workspace.tsx](../../apps/web/components/customer-workspace.tsx); [packages/business-rules/src/customer-navigation.ts](../../packages/business-rules/src/customer-navigation.ts) |
| dataSource | Existing customer workflow route and authoritative API |
| securityControl | Server actor validates active unexpired/unrevoked session. Queries bind authenticated user ID; strict new read model rejects browser-supplied customer IDs. UI preferences confer no authority. |
| testIds | CD-R |
| testFiles | [tests/customer-dashboard.test.ts](../../tests/customer-dashboard.test.ts) |
| testResult | PASS (linked executed tests; see reason for any remaining verification) |
| acceptanceGate | CD-07 |
| status | VERIFIED_COMPLETE |
| reason | Source reviewed; successful targeted regression and/or browser evidence confirms the specified local behaviour. |
| evidence | [docs/testing/customer-dashboard-focused-20261030.txt](../../docs/testing/customer-dashboard-focused-20261030.txt); [docs/testing/customer-dashboard-regression-20261030.txt](../../docs/testing/customer-dashboard-regression-20261030.txt); [docs/testing/customer-dashboard-browser-20261030.json](../../docs/testing/customer-dashboard-browser-20261030.json); [docs/testing/customer-dashboard-journeys-20261030.json](../../docs/testing/customer-dashboard-journeys-20261030.json) |
| negativeTests |  |
| outstandingWork | None within the documented local verification scope. |

## CD-REQ-049 — Customer order isolation

| Field | Evidence |
|---|---|
| priority | P0 |
| scope | backend |
| uiReference | docs/customer/approved-dashboard-reference-20261030.png — Customer order isolation |
| route | Orders |
| implementationFiles | [apps/web/lib/service.ts](../../apps/web/lib/service.ts); [apps/web/lib/accounts.ts](../../apps/web/lib/accounts.ts); [apps/web/lib/refills.ts](../../apps/web/lib/refills.ts); [apps/web/lib/workspace.ts](../../apps/web/lib/workspace.ts); [apps/web/lib/professional-services.ts](../../apps/web/lib/professional-services.ts) |
| dataSource | Authenticated identity and ownership predicates in existing services |
| securityControl | Server actor validates active unexpired/unrevoked session. Queries bind authenticated user ID; strict new read model rejects browser-supplied customer IDs. UI preferences confer no authority. |
| testIds | CD-I,K,V,Z |
| testFiles | [tests/customer-dashboard.test.ts](../../tests/customer-dashboard.test.ts) |
| testResult | PASS (linked executed tests; see reason for any remaining verification) |
| acceptanceGate | CD-12 |
| status | VERIFIED_COMPLETE |
| reason | Source reviewed; successful targeted regression and/or browser evidence confirms the specified local behaviour. |
| evidence | [docs/testing/customer-dashboard-focused-20261030.txt](../../docs/testing/customer-dashboard-focused-20261030.txt); [docs/testing/customer-dashboard-regression-20261030.txt](../../docs/testing/customer-dashboard-regression-20261030.txt); [docs/testing/customer-dashboard-browser-20261030.json](../../docs/testing/customer-dashboard-browser-20261030.json); [docs/testing/customer-dashboard-journeys-20261030.json](../../docs/testing/customer-dashboard-journeys-20261030.json) |
| negativeTests | CD-Z; CD-I,K,V,Z; CD-E,F |
| outstandingWork | None within the documented local verification scope. |

## CD-REQ-050 — Wallet isolation

| Field | Evidence |
|---|---|
| priority | P0 |
| scope | backend |
| uiReference | docs/customer/approved-dashboard-reference-20261030.png — Wallet isolation |
| route | Wallet |
| implementationFiles | [apps/web/lib/service.ts](../../apps/web/lib/service.ts); [apps/web/lib/accounts.ts](../../apps/web/lib/accounts.ts); [apps/web/lib/refills.ts](../../apps/web/lib/refills.ts); [apps/web/lib/workspace.ts](../../apps/web/lib/workspace.ts); [apps/web/lib/professional-services.ts](../../apps/web/lib/professional-services.ts) |
| dataSource | wallet_entries sum(amount_kobo), reward_entries sum(points), including signed adjustments; never unverified funding |
| securityControl | Server actor validates active unexpired/unrevoked session. Queries bind authenticated user ID; strict new read model rejects browser-supplied customer IDs. UI preferences confer no authority. |
| testIds | CD-L,M,Z |
| testFiles | [tests/customer-dashboard.test.ts](../../tests/customer-dashboard.test.ts) |
| testResult | PASS (linked executed tests; see reason for any remaining verification) |
| acceptanceGate | CD-12 |
| status | VERIFIED_COMPLETE |
| reason | Source reviewed; successful targeted regression and/or browser evidence confirms the specified local behaviour. |
| evidence | [docs/testing/customer-dashboard-focused-20261030.txt](../../docs/testing/customer-dashboard-focused-20261030.txt); [docs/testing/customer-dashboard-regression-20261030.txt](../../docs/testing/customer-dashboard-regression-20261030.txt); [docs/testing/customer-dashboard-browser-20261030.json](../../docs/testing/customer-dashboard-browser-20261030.json); [docs/testing/customer-dashboard-journeys-20261030.json](../../docs/testing/customer-dashboard-journeys-20261030.json) |
| negativeTests | CD-Z; CD-I,K,V,Z; CD-E,F |
| outstandingWork | None within the documented local verification scope. |

## CD-REQ-051 — Loyalty isolation

| Field | Evidence |
|---|---|
| priority | P0 |
| scope | backend |
| uiReference | docs/customer/approved-dashboard-reference-20261030.png — Loyalty isolation |
| route | Rewards |
| implementationFiles | [apps/web/lib/service.ts](../../apps/web/lib/service.ts); [apps/web/lib/accounts.ts](../../apps/web/lib/accounts.ts); [apps/web/lib/refills.ts](../../apps/web/lib/refills.ts); [apps/web/lib/workspace.ts](../../apps/web/lib/workspace.ts); [apps/web/lib/professional-services.ts](../../apps/web/lib/professional-services.ts) |
| dataSource | wallet_entries sum(amount_kobo), reward_entries sum(points), including signed adjustments; never unverified funding |
| securityControl | Server actor validates active unexpired/unrevoked session. Queries bind authenticated user ID; strict new read model rejects browser-supplied customer IDs. UI preferences confer no authority. |
| testIds | CD-L,M,Z |
| testFiles | [tests/customer-dashboard.test.ts](../../tests/customer-dashboard.test.ts) |
| testResult | PASS (linked executed tests; see reason for any remaining verification) |
| acceptanceGate | CD-12 |
| status | VERIFIED_COMPLETE |
| reason | Source reviewed; successful targeted regression and/or browser evidence confirms the specified local behaviour. |
| evidence | [docs/testing/customer-dashboard-focused-20261030.txt](../../docs/testing/customer-dashboard-focused-20261030.txt); [docs/testing/customer-dashboard-regression-20261030.txt](../../docs/testing/customer-dashboard-regression-20261030.txt); [docs/testing/customer-dashboard-browser-20261030.json](../../docs/testing/customer-dashboard-browser-20261030.json); [docs/testing/customer-dashboard-journeys-20261030.json](../../docs/testing/customer-dashboard-journeys-20261030.json) |
| negativeTests | CD-Z; CD-I,K,V,Z; CD-E,F |
| outstandingWork | None within the documented local verification scope. |

## CD-REQ-052 — Gas profile isolation

| Field | Evidence |
|---|---|
| priority | P0 |
| scope | backend |
| uiReference | docs/customer/approved-dashboard-reference-20261030.png — Gas profile isolation |
| route | Consumption |
| implementationFiles | [apps/web/lib/service.ts](../../apps/web/lib/service.ts); [apps/web/lib/accounts.ts](../../apps/web/lib/accounts.ts); [apps/web/lib/refills.ts](../../apps/web/lib/refills.ts); [apps/web/lib/workspace.ts](../../apps/web/lib/workspace.ts); [apps/web/lib/professional-services.ts](../../apps/web/lib/professional-services.ts) |
| dataSource | Authenticated identity and ownership predicates in existing services |
| securityControl | Server actor validates active unexpired/unrevoked session. Queries bind authenticated user ID; strict new read model rejects browser-supplied customer IDs. UI preferences confer no authority. |
| testIds | CD-Z |
| testFiles | [tests/customer-dashboard.test.ts](../../tests/customer-dashboard.test.ts) |
| testResult | PASS (linked executed tests; see reason for any remaining verification) |
| acceptanceGate | CD-12 |
| status | VERIFIED_COMPLETE |
| reason | Source reviewed; successful targeted regression and/or browser evidence confirms the specified local behaviour. |
| evidence | [docs/testing/customer-dashboard-focused-20261030.txt](../../docs/testing/customer-dashboard-focused-20261030.txt); [docs/testing/customer-dashboard-regression-20261030.txt](../../docs/testing/customer-dashboard-regression-20261030.txt); [docs/testing/customer-dashboard-browser-20261030.json](../../docs/testing/customer-dashboard-browser-20261030.json); [docs/testing/customer-dashboard-journeys-20261030.json](../../docs/testing/customer-dashboard-journeys-20261030.json) |
| negativeTests | CD-Z; CD-I,K,V,Z; CD-E,F |
| outstandingWork | None within the documented local verification scope. |

## CD-REQ-053 — Service booking isolation

| Field | Evidence |
|---|---|
| priority | P0 |
| scope | backend |
| uiReference | docs/customer/approved-dashboard-reference-20261030.png — Service booking isolation |
| route | Bookings |
| implementationFiles | [apps/web/lib/service.ts](../../apps/web/lib/service.ts); [apps/web/lib/accounts.ts](../../apps/web/lib/accounts.ts); [apps/web/lib/refills.ts](../../apps/web/lib/refills.ts); [apps/web/lib/workspace.ts](../../apps/web/lib/workspace.ts); [apps/web/lib/professional-services.ts](../../apps/web/lib/professional-services.ts) |
| dataSource | Authenticated identity and ownership predicates in existing services |
| securityControl | Server actor validates active unexpired/unrevoked session. Queries bind authenticated user ID; strict new read model rejects browser-supplied customer IDs. UI preferences confer no authority. |
| testIds | CD-Z |
| testFiles | [tests/customer-dashboard.test.ts](../../tests/customer-dashboard.test.ts) |
| testResult | PASS (linked executed tests; see reason for any remaining verification) |
| acceptanceGate | CD-12 |
| status | VERIFIED_COMPLETE |
| reason | Source reviewed; successful targeted regression and/or browser evidence confirms the specified local behaviour. |
| evidence | [docs/testing/customer-dashboard-focused-20261030.txt](../../docs/testing/customer-dashboard-focused-20261030.txt); [docs/testing/customer-dashboard-regression-20261030.txt](../../docs/testing/customer-dashboard-regression-20261030.txt); [docs/testing/customer-dashboard-browser-20261030.json](../../docs/testing/customer-dashboard-browser-20261030.json); [docs/testing/customer-dashboard-journeys-20261030.json](../../docs/testing/customer-dashboard-journeys-20261030.json) |
| negativeTests | CD-Z; CD-I,K,V,Z; CD-E,F |
| outstandingWork | None within the documented local verification scope. |

## CD-REQ-054 — Notification isolation

| Field | Evidence |
|---|---|
| priority | P0 |
| scope | backend |
| uiReference | docs/customer/approved-dashboard-reference-20261030.png — Notification isolation |
| route | Notifications |
| implementationFiles | [apps/web/lib/service.ts](../../apps/web/lib/service.ts); [apps/web/lib/accounts.ts](../../apps/web/lib/accounts.ts); [apps/web/lib/refills.ts](../../apps/web/lib/refills.ts); [apps/web/lib/workspace.ts](../../apps/web/lib/workspace.ts); [apps/web/lib/professional-services.ts](../../apps/web/lib/professional-services.ts) |
| dataSource | Authenticated identity and ownership predicates in existing services |
| securityControl | Server actor validates active unexpired/unrevoked session. Queries bind authenticated user ID; strict new read model rejects browser-supplied customer IDs. UI preferences confer no authority. |
| testIds | CD-I,K,V,Z |
| testFiles | [tests/customer-dashboard.test.ts](../../tests/customer-dashboard.test.ts) |
| testResult | PASS (linked executed tests; see reason for any remaining verification) |
| acceptanceGate | CD-12 |
| status | VERIFIED_COMPLETE |
| reason | Source reviewed; successful targeted regression and/or browser evidence confirms the specified local behaviour. |
| evidence | [docs/testing/customer-dashboard-focused-20261030.txt](../../docs/testing/customer-dashboard-focused-20261030.txt); [docs/testing/customer-dashboard-regression-20261030.txt](../../docs/testing/customer-dashboard-regression-20261030.txt); [docs/testing/customer-dashboard-browser-20261030.json](../../docs/testing/customer-dashboard-browser-20261030.json); [docs/testing/customer-dashboard-journeys-20261030.json](../../docs/testing/customer-dashboard-journeys-20261030.json) |
| negativeTests | CD-Z; CD-I,K,V,Z; CD-E,F |
| outstandingWork | None within the documented local verification scope. |

## CD-REQ-055 — Support conversation isolation

| Field | Evidence |
|---|---|
| priority | P0 |
| scope | backend |
| uiReference | docs/customer/approved-dashboard-reference-20261030.png — Support conversation isolation |
| route | Support |
| implementationFiles | [apps/web/lib/service.ts](../../apps/web/lib/service.ts); [apps/web/lib/accounts.ts](../../apps/web/lib/accounts.ts); [apps/web/lib/refills.ts](../../apps/web/lib/refills.ts); [apps/web/lib/workspace.ts](../../apps/web/lib/workspace.ts); [apps/web/lib/professional-services.ts](../../apps/web/lib/professional-services.ts) |
| dataSource | Authenticated identity and ownership predicates in existing services |
| securityControl | Server actor validates active unexpired/unrevoked session. Queries bind authenticated user ID; strict new read model rejects browser-supplied customer IDs. UI preferences confer no authority. |
| testIds | CD-Z |
| testFiles | [tests/customer-dashboard.test.ts](../../tests/customer-dashboard.test.ts) |
| testResult | PASS (linked executed tests; see reason for any remaining verification) |
| acceptanceGate | CD-12 |
| status | VERIFIED_COMPLETE |
| reason | Source reviewed; successful targeted regression and/or browser evidence confirms the specified local behaviour. |
| evidence | [docs/testing/customer-dashboard-focused-20261030.txt](../../docs/testing/customer-dashboard-focused-20261030.txt); [docs/testing/customer-dashboard-regression-20261030.txt](../../docs/testing/customer-dashboard-regression-20261030.txt); [docs/testing/customer-dashboard-browser-20261030.json](../../docs/testing/customer-dashboard-browser-20261030.json); [docs/testing/customer-dashboard-journeys-20261030.json](../../docs/testing/customer-dashboard-journeys-20261030.json) |
| negativeTests | CD-Z; CD-I,K,V,Z; CD-E,F |
| outstandingWork | None within the documented local verification scope. |

## CD-REQ-056 — Saved address isolation

| Field | Evidence |
|---|---|
| priority | P0 |
| scope | backend |
| uiReference | docs/customer/approved-dashboard-reference-20261030.png — Saved address isolation |
| route | Customer addresses |
| implementationFiles | [apps/web/lib/service.ts](../../apps/web/lib/service.ts); [apps/web/lib/accounts.ts](../../apps/web/lib/accounts.ts); [apps/web/lib/refills.ts](../../apps/web/lib/refills.ts); [apps/web/lib/workspace.ts](../../apps/web/lib/workspace.ts); [apps/web/lib/professional-services.ts](../../apps/web/lib/professional-services.ts) |
| dataSource | Authenticated identity and ownership predicates in existing services |
| securityControl | Server actor validates active unexpired/unrevoked session. Queries bind authenticated user ID; strict new read model rejects browser-supplied customer IDs. UI preferences confer no authority. |
| testIds | CD-U,Z |
| testFiles | [tests/customer-dashboard.test.ts](../../tests/customer-dashboard.test.ts) |
| testResult | PASS (linked executed tests; see reason for any remaining verification) |
| acceptanceGate | CD-12 |
| status | VERIFIED_COMPLETE |
| reason | Source reviewed; successful targeted regression and/or browser evidence confirms the specified local behaviour. |
| evidence | [docs/testing/customer-dashboard-focused-20261030.txt](../../docs/testing/customer-dashboard-focused-20261030.txt); [docs/testing/customer-dashboard-regression-20261030.txt](../../docs/testing/customer-dashboard-regression-20261030.txt); [docs/testing/customer-dashboard-browser-20261030.json](../../docs/testing/customer-dashboard-browser-20261030.json); [docs/testing/customer-dashboard-journeys-20261030.json](../../docs/testing/customer-dashboard-journeys-20261030.json) |
| negativeTests | CD-Z; CD-I,K,V,Z; CD-E,F |
| outstandingWork | None within the documented local verification scope. |

## CD-REQ-057 — Desktop responsiveness

| Field | Evidence |
|---|---|
| priority | P1 |
| scope | dashboard |
| uiReference | docs/customer/approved-dashboard-reference-20261030.png — Desktop responsiveness |
| route | Customer layout |
| implementationFiles | [apps/web/components/customer-workspace.tsx](../../apps/web/components/customer-workspace.tsx); [packages/business-rules/src/customer-navigation.ts](../../packages/business-rules/src/customer-navigation.ts); [apps/web/app/globals.css](../../apps/web/app/globals.css) |
| dataSource | Authenticated identity and ownership predicates in existing services |
| securityControl | Server actor validates active unexpired/unrevoked session. Queries bind authenticated user ID; strict new read model rejects browser-supplied customer IDs. UI preferences confer no authority. |
| testIds | CD-R |
| testFiles | [tests/customer-dashboard.test.ts](../../tests/customer-dashboard.test.ts) |
| testResult | PASS (linked executed tests; see reason for any remaining verification) |
| acceptanceGate | CD-13 |
| status | VERIFIED_COMPLETE |
| reason | Source reviewed; successful targeted regression and/or browser evidence confirms the specified local behaviour. |
| evidence | [docs/testing/customer-dashboard-focused-20261030.txt](../../docs/testing/customer-dashboard-focused-20261030.txt); [docs/testing/customer-dashboard-regression-20261030.txt](../../docs/testing/customer-dashboard-regression-20261030.txt); [docs/testing/customer-dashboard-browser-20261030.json](../../docs/testing/customer-dashboard-browser-20261030.json); [docs/testing/customer-dashboard-journeys-20261030.json](../../docs/testing/customer-dashboard-journeys-20261030.json) |
| negativeTests |  |
| outstandingWork | None within the documented local verification scope. |

## CD-REQ-058 — Tablet responsiveness

| Field | Evidence |
|---|---|
| priority | P1 |
| scope | dashboard |
| uiReference | docs/customer/approved-dashboard-reference-20261030.png — Tablet responsiveness |
| route | Customer layout |
| implementationFiles | [apps/web/components/customer-workspace.tsx](../../apps/web/components/customer-workspace.tsx); [packages/business-rules/src/customer-navigation.ts](../../packages/business-rules/src/customer-navigation.ts); [apps/web/app/globals.css](../../apps/web/app/globals.css) |
| dataSource | Authenticated identity and ownership predicates in existing services |
| securityControl | Server actor validates active unexpired/unrevoked session. Queries bind authenticated user ID; strict new read model rejects browser-supplied customer IDs. UI preferences confer no authority. |
| testIds | CD-R |
| testFiles | [tests/customer-dashboard.test.ts](../../tests/customer-dashboard.test.ts) |
| testResult | PARTIAL: linked automated tests passed; outstanding verification is listed explicitly. |
| acceptanceGate | CD-13 |
| status | IMPLEMENTED_UNVERIFIED |
| reason | Responsive tablet CSS implemented; final tablet viewport override could not be applied to the replacement QA tab. |
| evidence | [docs/testing/customer-dashboard-focused-20261030.txt](../../docs/testing/customer-dashboard-focused-20261030.txt); [docs/testing/customer-dashboard-regression-20261030.txt](../../docs/testing/customer-dashboard-regression-20261030.txt); [docs/testing/customer-dashboard-browser-20261030.json](../../docs/testing/customer-dashboard-browser-20261030.json); [docs/testing/customer-dashboard-journeys-20261030.json](../../docs/testing/customer-dashboard-journeys-20261030.json) |
| negativeTests |  |
| outstandingWork | Run and retain an actual 1024px browser verification. |

## CD-REQ-059 — Mobile responsiveness

| Field | Evidence |
|---|---|
| priority | P1 |
| scope | dashboard |
| uiReference | docs/customer/approved-dashboard-reference-20261030.png — Mobile responsiveness |
| route | Customer layout |
| implementationFiles | [apps/web/components/customer-workspace.tsx](../../apps/web/components/customer-workspace.tsx); [packages/business-rules/src/customer-navigation.ts](../../packages/business-rules/src/customer-navigation.ts); [apps/web/app/globals.css](../../apps/web/app/globals.css) |
| dataSource | Authenticated identity and ownership predicates in existing services |
| securityControl | Server actor validates active unexpired/unrevoked session. Queries bind authenticated user ID; strict new read model rejects browser-supplied customer IDs. UI preferences confer no authority. |
| testIds | CD-R |
| testFiles | [tests/customer-dashboard.test.ts](../../tests/customer-dashboard.test.ts) |
| testResult | PASS (linked executed tests; see reason for any remaining verification) |
| acceptanceGate | CD-13 |
| status | VERIFIED_COMPLETE |
| reason | Source reviewed; successful targeted regression and/or browser evidence confirms the specified local behaviour. |
| evidence | [docs/testing/customer-dashboard-focused-20261030.txt](../../docs/testing/customer-dashboard-focused-20261030.txt); [docs/testing/customer-dashboard-regression-20261030.txt](../../docs/testing/customer-dashboard-regression-20261030.txt); [docs/testing/customer-dashboard-browser-20261030.json](../../docs/testing/customer-dashboard-browser-20261030.json); [docs/testing/customer-dashboard-journeys-20261030.json](../../docs/testing/customer-dashboard-journeys-20261030.json) |
| negativeTests |  |
| outstandingWork | None within the documented local verification scope. |

## CD-REQ-060 — Keyboard accessibility

| Field | Evidence |
|---|---|
| priority | P1 |
| scope | dashboard |
| uiReference | docs/customer/approved-dashboard-reference-20261030.png — Keyboard accessibility |
| route | Customer layout |
| implementationFiles | [apps/web/components/customer-workspace.tsx](../../apps/web/components/customer-workspace.tsx); [packages/business-rules/src/customer-navigation.ts](../../packages/business-rules/src/customer-navigation.ts); [apps/web/app/globals.css](../../apps/web/app/globals.css) |
| dataSource | Authenticated identity and ownership predicates in existing services |
| securityControl | Server actor validates active unexpired/unrevoked session. Queries bind authenticated user ID; strict new read model rejects browser-supplied customer IDs. UI preferences confer no authority. |
| testIds | CD-R |
| testFiles | [tests/customer-dashboard.test.ts](../../tests/customer-dashboard.test.ts) |
| testResult | PARTIAL: linked automated tests passed; outstanding verification is listed explicitly. |
| acceptanceGate | CD-14 |
| status | PARTIAL |
| reason | Four navigation groups verified by Space/Enter; mobile initial focus and Escape restoration verified. Full forward/backward drawer trap and all compact tooltip keyboard checks remain unverified. |
| evidence | [docs/testing/customer-dashboard-focused-20261030.txt](../../docs/testing/customer-dashboard-focused-20261030.txt); [docs/testing/customer-dashboard-regression-20261030.txt](../../docs/testing/customer-dashboard-regression-20261030.txt); [docs/testing/customer-dashboard-browser-20261030.json](../../docs/testing/customer-dashboard-browser-20261030.json); [docs/testing/customer-dashboard-journeys-20261030.json](../../docs/testing/customer-dashboard-journeys-20261030.json) |
| negativeTests |  |
| outstandingWork | Complete remaining keyboard focus-cycle checks in the final browser build. |

## CD-REQ-061 — Screen reader accessibility

| Field | Evidence |
|---|---|
| priority | P1 |
| scope | dashboard |
| uiReference | docs/customer/approved-dashboard-reference-20261030.png — Screen reader accessibility |
| route | Customer layout |
| implementationFiles | [apps/web/components/customer-workspace.tsx](../../apps/web/components/customer-workspace.tsx); [packages/business-rules/src/customer-navigation.ts](../../packages/business-rules/src/customer-navigation.ts); [apps/web/app/globals.css](../../apps/web/app/globals.css) |
| dataSource | Authenticated identity and ownership predicates in existing services |
| securityControl | Server actor validates active unexpired/unrevoked session. Queries bind authenticated user ID; strict new read model rejects browser-supplied customer IDs. UI preferences confer no authority. |
| testIds | CD-R |
| testFiles | [tests/customer-dashboard.test.ts](../../tests/customer-dashboard.test.ts) |
| testResult | PARTIAL: linked automated tests passed; outstanding verification is listed explicitly. |
| acceptanceGate | CD-14 |
| status | IMPLEMENTED_UNVERIFIED |
| reason | Semantic navigation, headings, labels, inert drawer background and actual browser accessibility tree inspected. No dedicated screen-reader session executed. |
| evidence | [docs/testing/customer-dashboard-focused-20261030.txt](../../docs/testing/customer-dashboard-focused-20261030.txt); [docs/testing/customer-dashboard-regression-20261030.txt](../../docs/testing/customer-dashboard-regression-20261030.txt); [docs/testing/customer-dashboard-browser-20261030.json](../../docs/testing/customer-dashboard-browser-20261030.json); [docs/testing/customer-dashboard-journeys-20261030.json](../../docs/testing/customer-dashboard-journeys-20261030.json) |
| negativeTests |  |
| outstandingWork | Run VoiceOver or equivalent with expanded/compact/drawer and history table. |

## CD-REQ-062 — Reduced-motion support

| Field | Evidence |
|---|---|
| priority | P1 |
| scope | dashboard |
| uiReference | docs/customer/approved-dashboard-reference-20261030.png — Reduced-motion support |
| route | Customer layout |
| implementationFiles | [apps/web/components/customer-workspace.tsx](../../apps/web/components/customer-workspace.tsx); [packages/business-rules/src/customer-navigation.ts](../../packages/business-rules/src/customer-navigation.ts); [apps/web/app/globals.css](../../apps/web/app/globals.css) |
| dataSource | Authenticated identity and ownership predicates in existing services |
| securityControl | Server actor validates active unexpired/unrevoked session. Queries bind authenticated user ID; strict new read model rejects browser-supplied customer IDs. UI preferences confer no authority. |
| testIds | CD-R |
| testFiles | [tests/customer-dashboard.test.ts](../../tests/customer-dashboard.test.ts) |
| testResult | PARTIAL: linked automated tests passed; outstanding verification is listed explicitly. |
| acceptanceGate | CD-14 |
| status | IMPLEMENTED_UNVERIFIED |
| reason | Reduced-motion CSS disables transitions/animations in the workspace; live preference override not exercised in this phase. |
| evidence | [docs/testing/customer-dashboard-focused-20261030.txt](../../docs/testing/customer-dashboard-focused-20261030.txt); [docs/testing/customer-dashboard-regression-20261030.txt](../../docs/testing/customer-dashboard-regression-20261030.txt); [docs/testing/customer-dashboard-browser-20261030.json](../../docs/testing/customer-dashboard-browser-20261030.json); [docs/testing/customer-dashboard-journeys-20261030.json](../../docs/testing/customer-dashboard-journeys-20261030.json) |
| negativeTests |  |
| outstandingWork | Verify computed motion with prefers-reduced-motion enabled. |

## CD-REQ-063 — Dashboard loading performance

| Field | Evidence |
|---|---|
| priority | P1 |
| scope | dashboard |
| uiReference | docs/customer/approved-dashboard-reference-20261030.png — Dashboard loading performance |
| route | /account |
| implementationFiles | [apps/web/components/customer-dashboard.tsx](../../apps/web/components/customer-dashboard.tsx); [apps/web/components/customer-data.ts](../../apps/web/components/customer-data.ts); [apps/web/lib/customer-dashboard.ts](../../apps/web/lib/customer-dashboard.ts) |
| dataSource | Authenticated identity and ownership predicates in existing services |
| securityControl | Server actor validates active unexpired/unrevoked session. Queries bind authenticated user ID; strict new read model rejects browser-supplied customer IDs. UI preferences confer no authority. |
| testIds | CD-63 |
| testFiles | [tests/customer-dashboard.test.ts](../../tests/customer-dashboard.test.ts) |
| testResult | PASS (linked executed tests; see reason for any remaining verification) |
| acceptanceGate | CD-15 |
| status | VERIFIED_COMPLETE |
| reason | Source reviewed; successful targeted regression and/or browser evidence confirms the specified local behaviour. |
| evidence | [docs/testing/customer-dashboard-focused-20261030.txt](../../docs/testing/customer-dashboard-focused-20261030.txt); [docs/testing/customer-dashboard-regression-20261030.txt](../../docs/testing/customer-dashboard-regression-20261030.txt); [docs/testing/customer-dashboard-browser-20261030.json](../../docs/testing/customer-dashboard-browser-20261030.json); [docs/testing/customer-dashboard-journeys-20261030.json](../../docs/testing/customer-dashboard-journeys-20261030.json) |
| negativeTests |  |
| outstandingWork | None within the documented local verification scope. |

## CD-REQ-064 — Subscription cleanup

| Field | Evidence |
|---|---|
| priority | P0 |
| scope | dashboard |
| uiReference | docs/customer/approved-dashboard-reference-20261030.png — Subscription cleanup |
| route | Customer layout |
| implementationFiles | [apps/web/components/site.tsx](../../apps/web/components/site.tsx); [apps/web/components/customer-data.ts](../../apps/web/components/customer-data.ts); [apps/web/components/customer-workspace.tsx](../../apps/web/components/customer-workspace.tsx) |
| dataSource | Authenticated identity and ownership predicates in existing services |
| securityControl | Server actor validates active unexpired/unrevoked session. Queries bind authenticated user ID; strict new read model rejects browser-supplied customer IDs. UI preferences confer no authority. |
| testIds | CD-E,F |
| testFiles | [tests/customer-dashboard.test.ts](../../tests/customer-dashboard.test.ts) |
| testResult | PASS (linked executed tests; see reason for any remaining verification) |
| acceptanceGate | CD-15 |
| status | VERIFIED_COMPLETE |
| reason | Source reviewed; successful targeted regression and/or browser evidence confirms the specified local behaviour. |
| evidence | [docs/testing/customer-dashboard-focused-20261030.txt](../../docs/testing/customer-dashboard-focused-20261030.txt); [docs/testing/customer-dashboard-regression-20261030.txt](../../docs/testing/customer-dashboard-regression-20261030.txt); [docs/testing/customer-dashboard-browser-20261030.json](../../docs/testing/customer-dashboard-browser-20261030.json); [docs/testing/customer-dashboard-journeys-20261030.json](../../docs/testing/customer-dashboard-journeys-20261030.json) |
| negativeTests | CD-Z; CD-I,K,V,Z; CD-E,F |
| outstandingWork | None within the documented local verification scope. |

## CD-REQ-065 — Error recovery

| Field | Evidence |
|---|---|
| priority | P1 |
| scope | dashboard |
| uiReference | docs/customer/approved-dashboard-reference-20261030.png — Error recovery |
| route | Customer dashboard |
| implementationFiles | [apps/web/components/customer-dashboard.tsx](../../apps/web/components/customer-dashboard.tsx); [apps/web/components/customer-data.ts](../../apps/web/components/customer-data.ts); [apps/web/lib/customer-dashboard.ts](../../apps/web/lib/customer-dashboard.ts) |
| dataSource | Authenticated identity and ownership predicates in existing services |
| securityControl | Server actor validates active unexpired/unrevoked session. Queries bind authenticated user ID; strict new read model rejects browser-supplied customer IDs. UI preferences confer no authority. |
| testIds | CD-Y |
| testFiles | [tests/customer-dashboard.test.ts](../../tests/customer-dashboard.test.ts) |
| testResult | PASS (linked executed tests; see reason for any remaining verification) |
| acceptanceGate | CD-15 |
| status | VERIFIED_COMPLETE |
| reason | Source reviewed; successful targeted regression and/or browser evidence confirms the specified local behaviour. |
| evidence | [docs/testing/customer-dashboard-focused-20261030.txt](../../docs/testing/customer-dashboard-focused-20261030.txt); [docs/testing/customer-dashboard-regression-20261030.txt](../../docs/testing/customer-dashboard-regression-20261030.txt); [docs/testing/customer-dashboard-browser-20261030.json](../../docs/testing/customer-dashboard-browser-20261030.json); [docs/testing/customer-dashboard-journeys-20261030.json](../../docs/testing/customer-dashboard-journeys-20261030.json) |
| negativeTests |  |
| outstandingWork | None within the documented local verification scope. |

## Change history

- 2026-10-30: Initial full 65-requirement mapping; unsupported feedback and unexecuted accessibility/tablet checks remain visible. No requirements removed.
- 2026-10-30: CD-REQ-039 closed using additive state-constraint migration032. Existing three states/append-only history/ownership/rate limits remain valid; two additional customer signals do not create financial or verified purchase records. Full worker and browser tests passed.
