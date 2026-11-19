# EasyGas mobile app interactive prototype

This is the corrected **mobile app** prototype. It uses the actual React Native customer, owner, operations, inventory, driver and technician screens, plus explicitly labelled proposed mobile workspaces for business features currently delegated to a browser.

The review has 117 persona/screen entries, 20 proposed mobile workspaces and five connected journeys. Use the app's bottom tabs and back buttons to explore. **Review controls** switches personas, opens the screen directory, starts journeys and resets local data. On desktop the app sits in a phone frame; on a phone it fills the viewport. iPhone/Android frame choices are review presentations, not installed binaries.

- Existing screens retain the app's native layout, typography, icons, branding, sheets, dialogs and themes.
- Proposed business screens use the same mobile components and clearly say **Proposed mobile screen**. Inventory, purchasing, customer records, catalogue/bundles, quotations, reconciliation, credit requests, growth, incidents, policies, reports, equipment and readiness are covered.
- Delivery, service and refund journeys keep shared local references and state across roles. Rejected payment and expired calibration block their affected examples.
- The actual mobile checkout can create a local sample order. Profile/address/preferences, support messages, till/sale/cash-up, reports and concept-review records also maintain local prototype state. Other forms record a local interaction preview.
- The fixture has one representative business owner and sample staff. It does not change the real staff directory or any approval rules.

All records are synthetic and stay in the browser. There is no network fallback, live login, real payment, message, GPS, camera capture, qualification, calibration or production activation. The private review link uses ChatGPT access control. Existing commercial production NO-GO, actual-import hold, retain-all and native/physical/provider acceptance limits remain unchanged.

## Local preview

From the EasyGas repository root:

```sh
npm install --prefix prototypes/easygas-mobile
node prototypes/easygas-mobile/build.mjs
node --test --test-reporter=spec scripts/test-mobile-prototype.mjs
node prototypes/easygas-mobile/server.mjs
```

Open `http://127.0.0.1:3028/`. The build uses React Native's browser renderer only as a review transport. It imports the mobile app source and applies three entry-screen adapters; it does not render the website UI. Expo/device capabilities are local review adapters. `source-manifest.json` records original file hashes.

See `docs/mobile-prototype/AUDIT.md` and `docs/traceability/mobile-experience-prototype-rtm.json` for coverage, evidence and limits.
