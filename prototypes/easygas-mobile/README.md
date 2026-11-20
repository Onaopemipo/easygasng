# EasyGas mobile app interactive prototype

Private mobile review using the actual React Native app designs, 117 original role/screen entries and working local workspaces across all 36 feature families (300 stable feature items).

Choose **Review controls → Workflows** for connected customer, business and field actions. Inside the phone, Overview shows live local readbacks; Actions opens forms; Records shows committed entities; Requests supports current-revision approval/application; Activity records local changes. Switch persona to continue a shared order, service, stock, financial or approval workflow. The fixture has one business owner and sample staff. All data persists in browser storage until Reset.

Payments, identity, messaging, qualifications, meter verification, GPS and proof are explicitly synthetic local examples. No live API fallback or real provider/device effect occurs. Sample password: `prototype-only`; sample delivery code: `123456`. Use no real credentials or personal data. The private review retains ChatGPT owner access.

The prototype imports existing mobile components and adds isolated mobile workflow components. It does not port those additions to the installed app or certify backend, provider, hardware or physical safety. Commercial production NO-GO, actual-import hold and retain-all remain unchanged.

For full operating steps, test evidence and remaining developed-app work see `docs/mobile-workflows/README.md` and `docs/traceability/mobile-acceptance-rtm.json`. The original design and acceptance reports remain history.

```sh
node prototypes/easygas-mobile/build.mjs
node --test --test-reporter=spec scripts/test-mobile-workflows.mjs scripts/test-mobile-workflow-negatives.mjs scripts/test-mobile-acceptance.mjs scripts/test-mobile-prototype.mjs
node prototypes/easygas-mobile/server.mjs
```

Open `http://127.0.0.1:3028/`. React Native's browser renderer is a review transport, not an installed binary. The source manifest records the 97 original inputs and the three existing initial-screen adapters.
