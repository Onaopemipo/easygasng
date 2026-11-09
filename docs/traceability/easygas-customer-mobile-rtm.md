# Customer functionality traceability

All 12 requirements remain in denominator: 11 PARTIAL, 1 BLOCKED. No full requirement completion claimed. Gate coverage: 7 PASS / 20; 2 BLOCKED, 11 NOT_TESTED. All T01–T54 scenarios retained. See JSON for actual paths, controls, tests/evidence and outstanding work. Production NO-GO unchanged.

| ID | Requirement | Status | Evidence / remaining |
|---|---|---|---|
| CUI-01 | Home | PARTIAL | Logo, actual greeting/count, six actions, independent GET resources, refresh, honest refill state implemented; populated forecast cases and all-device fidelity remain untested. |
| CUI-02 | Order Gas | PARTIAL | Configured capacity tiles and canonical validation preserved; decimal draft typing repaired and observed. Demo business quantity policy is unconfigured; no unsafe checkout bypass. |
| CUI-03 | Checkout | BLOCKED | Existing configured COD/credit checkout retained, no enabled Paystack channels or verified payment claims. Approved merchant credentials/provider scenarios remain unavailable. |
| CUI-04 | Track Order | PARTIAL | Existing polling/evidence retained; real timeline summary added; no synthetic map/ETA. Populated native tracking/proof scenario not executed. |
| CUI-05 | Book a Service | PARTIAL | Only actual active catalogue consumed; semantic service rows and hero added. Demo catalogue empty; no screenshot services invented. |
| CUI-06 | Service Booking | PARTIAL | Existing booking/qualification/slots/quotes/status handlers retained. Populated native qualified slot/booking path not executed. |
| CUI-07 | My Cylinders | PARTIAL | Owned physical cylinders are distinct from consumption profiles; bounded read and negative ownership tests passed, including two same-size owned units. Registration requests an inspection, not physical custody mutation; physical profile-history attribution remains limited by existing model. |
| CUI-08 | Refill Plan | PARTIAL | Actual plan summaries and current create/pause/resume/cancel handlers retained; reminders are product-linked in current model. No cylinder linkage or automatic charge fabricated. |
| CUI-09 | My Wallet | PARTIAL | Ledger-based purchase-credit view with actual transactions and refresh; funding and transfers unavailable. Rewards remain a separate existing flow. Populated native ledger/redemption states not executed. |
| CUI-10 | Invoices & Receipts | PARTIAL | Actual issued invoice list, authoritative current balances and existing private PDF sharing added. No fabricated receipts; receipt-document service unavailable, native populated PDF share sheet not executed. |
| CUI-11 | Notifications | PARTIAL | Actual dated messages, unread/read operations, safe related destinations and preferences implemented. Populated native notification scenarios and provider delivery untested; channels remain off. |
| CUI-12 | My Account | PARTIAL | Stable ID/account/address/privacy/session/support handlers retained; Account tab, Back history and protected destination continuation added. Full final auth-return/cross-account native matrix pending. |

## Acceptance gates

- CUI-G01 Preflight/repository safety: PASS — Executed audit/test/build/restriction evidence supports this bounded gate; no production release certification.
- CUI-G02 Canonical data reuse: PASS — Executed audit/test/build/restriction evidence supports this bounded gate; no production release certification.
- CUI-G03 Visual fidelity all twelve screens: NOT_TESTED — Existing domain tests and partial native smoke do not certify every populated/device scenario; see T01–54.
- CUI-G04 Navigation/deep links: NOT_TESTED — Existing domain tests and partial native smoke do not certify every populated/device scenario; see T01–54.
- CUI-G05 Light/Dark/System: NOT_TESTED — Existing domain tests and partial native smoke do not certify every populated/device scenario; see T01–54.
- CUI-G06 Authentication/customer isolation: NOT_TESTED — Existing domain tests and partial native smoke do not certify every populated/device scenario; see T01–54.
- CUI-G07 Ordering/pricing: BLOCKED — Business quantity policy/stock/custody configuration not approved for demo checkout.
- CUI-G08 Paystack/invoice integrity: BLOCKED — Approved merchant/provider configuration absent; no live/sandbox payment certification.
- CUI-G09 Tracking/proof: NOT_TESTED — Existing domain tests and partial native smoke do not certify every populated/device scenario; see T01–54.
- CUI-G10 Services/booking: NOT_TESTED — Existing domain tests and partial native smoke do not certify every populated/device scenario; see T01–54.
- CUI-G11 Cylinders/refill: NOT_TESTED — Existing domain tests and partial native smoke do not certify every populated/device scenario; see T01–54.
- CUI-G12 Wallet/rewards: NOT_TESTED — Existing domain tests and partial native smoke do not certify every populated/device scenario; see T01–54.
- CUI-G13 Notifications: NOT_TESTED — Existing domain tests and partial native smoke do not certify every populated/device scenario; see T01–54.
- CUI-G14 Offline/recovery: NOT_TESTED — Existing domain tests and partial native smoke do not certify every populated/device scenario; see T01–54.
- CUI-G15 Responsive/accessibility/performance: NOT_TESTED — Existing domain tests and partial native smoke do not certify every populated/device scenario; see T01–54.
- CUI-G16 P0 security/safety: PASS — Executed audit/test/build/restriction evidence supports this bounded gate; no production release certification.
- CUI-G17 Regression/builds: PASS — Executed audit/test/build/restriction evidence supports this bounded gate; no production release certification.
- CUI-G18 Documentation/traceability: PASS — Executed audit/test/build/restriction evidence supports this bounded gate; no production release certification.
- CUI-G19 No dummy data: PASS — Executed audit/test/build/restriction evidence supports this bounded gate; no production release certification.
- CUI-G20 Release restrictions: PASS — Executed audit/test/build/restriction evidence supports this bounded gate; no production release certification.
