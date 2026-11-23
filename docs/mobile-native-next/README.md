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
- The full regression passed 1,180/1,209 tests, zero failures, with 29 independent PostgreSQL concurrency checks skipped locally. The later CI runs below execute those PostgreSQL cases without skips; this local run remains historical evidence. After the final source refinements, 159 focused API/component checks and 18 latest phase checks passed. The latter include all seven actual role snapshots, gas and product checkout, invalid policy/stock, price changes, retry/relaunch and cart limits. The unconfigured gas-policy check also fixed a UI issue that had replaced the customer quantity with zero instead of explaining the missing business rule.
- [Implementation CI](evidence/ci-3377eb41.json) passed all 1,212 tests with no skips, including independent PostgreSQL concurrency and restore checks. Native and web jobs passed. This run applies to commit3377eb41; subsequent recovery refinements have separate [16-check evidence](evidence/followup-acceptance.txt).
- [17 actual current-source device observations](device-observations.json) pass using the normal native entry and disposable real API fixture: all seven representative phone roles, guest draft/sign-in/wallet checkout/canonical tracking, wrong-password recovery, dark Home, focused keyboard forms, and customer/owner tablet portrait/landscape/text-size6 checks. The calendar selection was user-assisted. Full individual-feature, Android/physical, provider and installed-distribution acceptance remains open.
- The new service-only recovery check exposed a missing server replay field. The replay now returns the original customer-owned linked appointments, rejects other roles/accounts and altered requests, and the native app recovers one booking while preserving an unrelated physical cart. Track your order passes the canonical order ID to the order screen.

The [latest phase checks](evidence/phase-acceptance.txt), [focused acceptance](evidence/final-acceptance.txt), [full regression](evidence/regression-final.txt) and [bundle record](evidence/development-bundles.json) retain the exact execution scope.

The source implementation must not be represented as an updated TestFlight/Google Play installation. No new signed mobile binary, store upload, live payment, real fulfilment, hosted safety renewal, schema migration or production activation has occurred in this phase. Corrected web/API source7e2afff is deployed to the client demo as dpl_G8rxXxwGYrFWHobgnpevrLfxf68W. Representative current-source phone/tablet/keyboard/enlarged-text results are recorded separately from the remaining individual-feature, Android/physical/provider and installed-release gates.

## Traceability and operating guide

[10-requirement matrix](../traceability/mobile-native-next-rtm.md) · [300 retained feature leaves](feature-acceptance.json) · [native user guide](../user-manual/mobile-native-next.md).

All 36 families, 300 leaves and 117 historic screen entries remain in their denominators; the original 286 partial and 14 externally blocked leaves are preserved. Existing production NO-GO, actual import hold and retain-all decisions are preserved. Route existence, shared styles or passing older operational tests alone do not individually accept a redesigned native feature.

## Hosted continuation

The corrected API passed [71 candidate seven-role checks](evidence/web-recovery-candidate-checks.json) and [71 stable checks](evidence/web-stable-checks.json). Its [439 uploaded files match committed source](evidence/web-recovery-source-integrity.json), and the [stable client-demo alias selects the same Ready deployment](evidence/web-stable-inspect.json). [Business snapshots match](evidence/web-business-unchanged.json): 23 orders, 6 credits, 12 inventory rows and the complete 17-entry ledger. Temporary test sessions were revoked.

The hosted catalogue has no purchasable physical stock. The out-of-stock product-only quote correctly returns409; a successful hosted physical purchase and successful hosted mixed replay were not executed. Their actual native component/real API fixture tests pass, and the hosted positive acceptance cases remain open. This phase did not create stock, change qualifications or commercial policy, create a hosted purchase, or activate production.

## Resumed native device acceptance

[Bounded device observations](device-observations.json) record 17 passing cases with no exclusions. The seven phone roles are customer, commercial, owner, manager, finance, driver and technician. Driver deliveries and technician jobs show assigned records only; the commercial Home shows its own order. Dismissing the driver alert does not acknowledge it, and blank acknowledgement reason prevents submission. Owner wrong-password verification fails in the sheet and the correct password returns to the current workspace. No field work, inventory action or physical delivery was manufactured.

[Canonical checkout read-back](evidence/native-checkout-readback.json) confirms one synthetic wallet order `EG-2026-2A77AA79`, ₦15,800 and 6kg, with payment Verified and delivery Placed. The user-selected 26 November / 14:00–18:00 calendar choice and entered contact/address survive sign-in. Track your order opens that same canonical order.

Four native repairs were observed and rechecked: guest Account no longer falls through to the legacy menu; verification/preferences/password fields open focused sheets; shared keyboard compensation keeps the input and Continue visible; enlarged phone text stacks the cylinder below the Home copy to avoid overlap. The default approved banner composition remains. Customer keyboard sheets passed phone and tablet portrait/landscape checks. Owner Inventory passed tablet landscape at text size6. Phone/tablet text size3 and tablet portrait were restored; disposable sessions were signed out.

[24 focused checks](evidence/device-followup-tests.txt), native typecheck and [both actual-entry development JS bundles](evidence/development-bundles.json) pass for the reviewed source. Earlier evidence commit `dbc0674` CI passed 1,214/1,214 with zero skips before the native follow-up repairs. Later CI evidence must be read with its exact commit scope. No new signed binary or store upload was created.

### Device evidence

| Actual check | Evidence |
|---|---|
| Correct customer order tracking | [Phone tracking](evidence/native-tracking-phone.png) |
| Shared keyboard repair | [Phone](evidence/native-profile-keyboard-phone-fixed.png), [tablet portrait](evidence/native-profile-keyboard-tablet-large.png), [tablet landscape](evidence/native-profile-keyboard-tablet-landscape.png) |
| Owner / manager / finance | [Owner](evidence/native-owner-phone.png), [manager](evidence/native-manager-phone.png), [finance](evidence/native-finance-phone.png) |
| Driver / technician / commercial | [Driver](evidence/native-driver-phone.png), [technician](evidence/native-technician-phone.png), [commercial clean enlarged Home](evidence/native-home-phone-large-fixed.png) |
| Current tablet shell / staff workspace | [Tablet Home](evidence/native-home-tablet.png), [Inventory landscape](evidence/native-inventory-tablet-landscape.png) |
| Enlarged phone text | [Repaired Home banner](evidence/native-home-phone-large-fixed.png), [refill/footer](evidence/native-refill-phone-large.png) |

These observations do not individually accept all 300 feature leaves. Android runtime, physical devices, maximal accessibility sizes/VoiceOver, other role/device combinations, actual provider return and installed test-store distribution remain open. The documentation gate passes; nine broader requirements/gates remain partial/pending. Existing production NO-GO and external/import/retention holds remain.
