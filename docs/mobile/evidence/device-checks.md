# Executed simulator checks — 5 November 2026

Device: iPhone 17 Pro / iOS 26.5, separate com.easygasng.customer.local app, existing isolated demo dataset. Outbound providers off. No real customer records changed and no order/payment submitted.

- PASS: actual release simulator build and launch.
- PASS: existing demo driver session retained its Home/Products/Deliveries/Cart/More navigation and assigned-delivery entry.
- PASS: sign-out cleared driver session and showed guest customer Home.
- PASS: customer Home compact hero/actions; working light/dark quick switch.
- PASS: real demo customer authentication using existing credentials; no new identity/auth implementation.
- PASS: authenticated invoice list returned honest no-invoices state.
- PASS: account hub displayed the server's real demo customer ID, not the reference ID.
- PASS: appearance radio controls saved dark preference; account and Home rendered dark.
- PASS: configured capacities 3/6/12.5/25/50 rendered from gas catalogue; default selected capacity did not become gas quantity. Actual server price/flat fee displayed. Existing missing quantity-policy guard prevented checkout, rather than inventing approval.
- NOT_TESTED: final installed build's accessibility-label and introduction-replay refinements: Mac locked during last check. Build/typecheck passed; final UI recheck requires unlock.
- NOT_TESTED: full MOB-01–40 scenarios, Android, physical devices, VoiceOver/TalkBack, lifecycle/performance, all-screen contrast, provider/payment and production release acceptance.

Screenshots home-light.png, home-dark.png, account-light.png, account-dark.png and gas-order-dark.png are real simulator observations. They precede the final small accessibility/replay and Back to Home refinements; do not claim them as proof of those later controls.
