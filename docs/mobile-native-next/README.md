# Approved Mobile Next native adoption

The user approved the private Mobile Next design and requested native implementation end to end on 23 November 2026. Baseline: `f52bf9bdd6eef3e0d057207491ffde4a80a3f6f2`. Approved design: `42c4911e1ebe7f5783e00bb7d3ad0584c88434e7`, [private review link](https://easygas-mobile-next.philipmuyiwa.chatgpt.site).

## Implemented source

The actual React Native entry now uses the approved system typography, transparent logo, Lucide artwork, palette, shared header, stable role tabs, rounded cards, focused sheets and reduced-motion transitions. Customer Home, account/directory, product/cart, three-step refill/delivery/review, order tracking, wallet, services/appointments, quotations and feedback use real APIs. Business workspaces use Overview/Actions/Activity; record inspection and operational forms open individually. Driver and technician Today/Work/Profile use the same shell while retaining their existing trip, job, qualification, proof, offline custody and authorisation controllers.

An encrypted account-bound journal retains the exact checkout payload and key before a write. A lost response is recoverable after remount; retries do not silently create another order. Guests resume checkout after sign-in, and guest memory is cleared at other account/session transitions. Server quotation changes require another review. Product-only checkout now has a server quote using the existing gas.quote route; empty gas-and-product requests still fail validation.

Payment review provides explicit consent to exact server totals. Recovery is scoped by account and order/invoice/service target; the server status DTO now returns those target IDs. Pending attempts are verified with the native bearer session on entry/foreground. Concurrent checks coalesce per intent, stale results cannot overwrite another return, and terminal attempts return to a fresh quote review. Only the approved hosted checkout origin can be opened. No prototype business engine or simulated paid state is imported into the shipped app.

The customer cancellation design is connected to the existing owned-order support request, rather than creating an unauthorised direct cancellation API. It clearly states the order stays active pending an authorised operations decision. Customer feedback preserves draft, independent review and explicit publication/photo consent.

## Executed acceptance and limits

- [Core real API/component acceptance](evidence/core-acceptance.txt): 161 checks passed, covering the new pending checkout/relaunch/price-change flow, encrypted recovery, payment return/consent/target binding, existing role-scoped workspace reads/writes and Paystack authority/ledger regressions.
- [Historical source compatibility](evidence/source-compatibility.txt): 73 checks passed through additive committed-source continuations. Original prototypes, native artifact proofs and NO-GO records remain retained.
- Mobile and web TypeScript checks passed during implementation. Both iOS and Android development JavaScript bundles compiled through the actual native entry; this is not a signed binary build or installation.
- The full regression passed 1,180/1,209 tests, zero failures, with 29 independent PostgreSQL concurrency checks skipped locally. Those skipped checks remain open until a disposable PostgreSQL/CI run executes them. After the final source refinements, 159 focused API/component checks and 18 latest phase checks passed. The latter include all seven actual role snapshots, gas and product checkout, invalid policy/stock, price changes, retry/relaunch and cart limits. The unconfigured gas-policy check also fixed a UI issue that had replaced the customer quantity with zero instead of explaining the missing business rule.
- Native device visual acceptance is still open. Device Hub became accessible after the user's help, but the selected old Expo project could not connect. A disposable local API and updated Expo launcher are available for the next check. [Observed connection state](evidence/simulator-connection.png) is an environment failure, not a current-source design acceptance screenshot.

The [latest phase checks](evidence/phase-acceptance.txt), [focused acceptance](evidence/final-acceptance.txt), [full regression](evidence/regression-final.txt) and [bundle record](evidence/development-bundles.json) retain the exact execution scope.

The source implementation must not be represented as an updated TestFlight/Google Play installation. No new signed mobile binary, store upload, live payment, real fulfilment, hosted safety renewal, schema migration or production activation has occurred in this phase. Backend continuation deployment and current-source role/phone/tablet/keyboard/accessibility/physical/provider checks remain acceptance gates until independently evidenced.

## Traceability and operating guide

[10-requirement matrix](../traceability/mobile-native-next-rtm.md) · [300 retained feature leaves](feature-acceptance.json) · [native user guide](../user-manual/mobile-native-next.md).

All 36 families, 300 leaves and 117 historic screen entries remain in their denominators; the original 286 partial and 14 externally blocked leaves are preserved. Existing production NO-GO, actual import hold and retain-all decisions are preserved. Route existence, shared styles or passing older operational tests alone do not individually accept a redesigned native feature.
