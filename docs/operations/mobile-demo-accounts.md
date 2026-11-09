# Local demo account handover

The user requested test accounts. The running local backend at port3003 now uses the explicitly isolated `.data/mobile-demo-accounts` directory. The prior `.data/postgres` dataset is preserved and untouched. **EasyGas Local** and web `/login` use this test backend. Emails end in `@demo.easygas.invalid`; all users are named Demo and belong to Lagos. These are not real staff/customer identities.

Roles: customer, owner, manager, finance, sales, inventory, dispatcher and driver; technician is also provided. All nine credentials were verified through actual `/api/login` and `/api/me` calls. No customer order, stock receipt or payment was generated. Seed catalogue/configuration does not establish real stock or business/safety approval.

Credentials are in `.data/mobile-demo-credentials.json`, ignored by Git and mode0600. Do not copy them into tracked documentation or reuse them for production. The script refuses production, hosted DATABASE_URL configuration, unidentified existing users and credential mismatches; it never resets passwords. Stop the local server before rerunning `node --import tsx scripts/prepare-mobile-demo.ts`.

Current server command from repository root:

```sh
EASYGAS_DATA_DIR="$PWD/.data/mobile-demo-accounts" EASYGAS_BACKGROUND_JOBS=false EASYGAS_EMAIL_ENABLED=false EASYGAS_SMS_ENABLED=false EASYGAS_WHATSAPP_ENABLED=false npm run dev
```

To return to the preserved regular local data, stop this demo server and run normal `npm run dev` without the demo data-directory override. Do not attempt to combine both databases or run two PGlite owners against one directory. Demo modifications remain separate from regular local data. Do not migrate this fixture dataset to hosting. Production NO-GO and the Excel import hold remain unchanged.

## Shopping test stock — explicitly authorised 6 November 2026

`node --import tsx scripts/prepare-shopping-demo.ts` connects only to the existing loopback server after verifying its listening PID owns the isolated `.data/mobile-demo-accounts` lock and the protected manifest identifies that exact fixture directory. Production/DATABASE_URL configurations are refused. Uses existing synthetic credentials privately; no password changes. Signs out its own temporary sessions.

Four published empty-cylinder SKUs each receive20 test units through `inventory.receipt`, and bulk gas receives1,000kg through `gas.stock.receive`. Receipt references/reasons explicitly identify synthetic DEMO-SHOPPING data. Stable references make re-running idempotent; they do not replenish consumed units automatically. Costs/suppliers are not fabricated. Local quantity policy0.5–50kg in0.5kg increments is proposed by demo manager and approved independently by demo owner through the existing governance APIs, only when unset. These are test limits, not business safety approvals.

Accessories without prices/publication remain disabled. Existing sale prices are unchanged. Delivery/payment flags remain unchanged, so adding to cart does not establish checkout readiness. No order/payment was submitted. The cart check added one6kg empty cylinder in the local browser; it can be removed normally. No Excel import or business database migration is performed. This fixture must never be deployed or imported into production. Production NO-GO remains.
