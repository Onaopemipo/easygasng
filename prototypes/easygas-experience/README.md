# EasyGas Interactive Experience

An isolated interactive design prototype of the current EasyGas website: public access and six signed-in personas, all 86 audited routes, 36 workflow families and 300 named features.

## Review

Start at `/experience`. Choose a role card or use **View as**. **Guide & features** offers search, five connected journeys, the complete screen directory and local activity. The existing EasyGas menus, forms, tabs, dialogs, responsive layouts and themes are retained.

- **Order to delivery:** create a local order, accept, prepare, assign, travel, arrive, deliver and inspect reconciliation. The same reference follows the roles. Payment rejection and expired calibration stop their affected steps.
- **Service request to completion:** customer request, manager assignment, technician assessment, quotation/work authority, completion, customer acknowledgement and settlement, with a shared local booking.
- **Cancellation and refund:** cancel the sample order, credit the local wallet once, and inspect the customer's balance.
- **Owner governance** and **stock custody** are guided design walkthroughs with local activity records. They do not claim transactional or physical execution.

Reset returns the prototype to its initial synthetic data. Data stays in this browser and is never sent to the client demo. The persona switcher is a review tool, not production authentication. Generic source-form submissions record interaction previews; they do not recreate the entire server workflow. Real payments, credentials, messages, GPS, camera capture, qualification issuance and calibration are guarded or simulated. Original production NO-GO, import hold and retain-all decisions remain.

## Local build

From the EasyGas repository root:

```sh
node prototypes/easygas-experience/build.mjs
node scripts/test-experience-prototype.mjs
node prototypes/easygas-experience/server.mjs
```

Preview: `http://127.0.0.1:3027/experience`.

`build.mjs` imports the actual application UI and CSS, replaces only the Next navigation adapter, and bundles a local synthetic data adapter. `source-manifest.json` records the source hashes. See `docs/prototype/AUDIT.md`, `feature-coverage.json` and `route-coverage.json` for audit coverage and verification limits.

The private Sites deployment uses the checked-in `.openai/hosting.json` identity and prebuilt static `dist/`. No runtime credentials or database connection are required.
