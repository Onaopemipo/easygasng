# EasyGas Energy Solutions

A locally runnable platform with expanded operating workflows: responsive customer website, business workspace, shared PostgreSQL operations and an Expo native client, based on the supplied EasyGas references.

**The complete master brief is not finished and this is not a production-ready release.** The current delivered scope is in [the implementation report](docs/reports/easygas-implementation-report.md), with [test evidence](docs/reports/easygas-test-results.md), [feature verification](docs/reports/easygas-feature-verification.md) and [outstanding work](docs/reports/easygas-outstanding-work.md). The original requirement files are preserved in `docs/requirements-*.md`.

## Start locally

Requires Node.js 22.21+ and npm. From this repository:

```sh
npm ci
cp .env.example apps/web/.env.local
npm run setup
npm run dev
```

Open [EasyGas](http://127.0.0.1:3003). `npm run setup` silently prompts for credentials for three distinct authorised people: the owner, branch manager and finance officer. It runs only before any staff account exists. No default owner, customer or staff credentials are seeded. Customer registration is available on the website.

Run account setup **before** starting the server. The persistent local development database is `.data/postgres`; only one process may open it at a time. Stop the server before running a database command. A process lock prevents accidental simultaneous access. Do not remove an active lock. PostgreSQL is used through PGlite locally; a managed PostgreSQL connection is required for production.

The catalogue includes the eight cylinder/refill products and prices supplied on 29 October 2026. Other accessories remain draft/unpriced. **No stock quantities are invented.** Ordering and cash-on-delivery remain disabled until configured. Before conducting a real local sale:

1. Review all product details and safety requirements against actual products.
2. Review the supplied cylinder/refill prices. Future changes and remaining accessory prices use **Settings → Products & Pricing**, with independent approval.
3. The eight requested products are visible; publish any remaining products through the governed settings workflow.
4. Record actual goods receipts in **Inventory** with unique supplier references.
5. Review delivery coverage, windows and fees. The manager proposes activation; the owner independently approves.
6. If cash-on-delivery is permitted by the business, finance proposes it and the owner approves. Online payment providers remain unconnected by user choice.

A customer order reserves inventory and keeps its agreed item prices. Dispatch can accept, prepare and assign the order to a registered driver. Staff permissions are changed through **Staff & Permissions**, with two independent approvals. The driver confirms pickup and uses the customer's confirmation code only after delivery. Cash remains `collected`, rather than `verified`, until a separate finance actor verifies receipt of the cash.

A requester cannot approve their own controlled change. Restricted changes must remain pending when there are not enough eligible independent approvers; initial setup does not bypass this rule.

## Product and professional service expansion — 30 October

The shared backend now connects service appointments, independently verified qualifications/slots, quotation approval, materials reconciliation, immutable safety reports/acknowledgement, private photos/PDF, restricted-credit deposits/cash/refund requests, follow-ups and linked product/service checkout. Catalogue tools add variants/SKUs/specifications/images, exact reviewed compatibility, assessment recommendations and independently approved service bundles. Four services remain draft until actual business/safety configuration. Owner readiness is at `/admin/readiness`; no external provider or production deployment is activated. See [service testing](docs/testing.md).

## Expanded workflows

Account recovery/verification, addresses, sessions, privacy export, support conversations, catalogue editing, supplier purchasing, inspections/custody, branch transfers, staff invitations/suspension, POS/cash-up, verified purchase credit, wallet checkout/refunds, rewards conversion, refill profiles, authorised recurring COD, consent-aware campaigns, notification inboxes, bounded delegation and maintenance are connected locally.

**If a server was already running before this update, stop it and restart `npm run dev` to apply the new migrations.** Initial team setup must not be rerun when staff already exist.

Follow the [local test guide](docs/local-testing.md) for routes, role-separated journeys, email preview, worker and encrypted backup/restore commands. See [production readiness](docs/production-readiness.md) for release blockers.

## Native application

The mobile project has its own lockfile and dependency installation because its Expo SDK uses a different React version:

```sh
cd apps/mobile
npm ci --workspaces=false
cp .env.example .env
npm start
```

Set `EXPO_PUBLIC_API_URL` to your server origin. `127.0.0.1` is only suitable where the simulator can reach that host. Physical-device testing needs a reachable server and an explicitly configured network binding; the web server binds to loopback by default. Use HTTPS for deployment. Session tokens are stored in Expo SecureStore. Web and mobile use identical protected API operations. No app-store binary has been signed or published.

## Verification

```sh
npm run typecheck
npm test
npm run build
```

For the native project, run `npm run typecheck` there. iOS and Android JavaScript/Hermes exports were built; device and simulator testing remains outstanding. Test fixtures are isolated from business data. `scripts/prepare-browser-qa.ts` creates an explicitly named test account only in `.data/browser-qa`; never run a public server against it.

## Database and deployment

The user selected **Philip 2 Acc → BytesNGigs** for future Supabase hosting. Supabase refused project creation because the organisation has reached its active-free-project limit. **No EasyGas cloud project was created, no existing PTI project was changed, and the user subsequently chose to keep EasyGas local.**

The future migrations are `20261029091616_easygas_private_core.sql`, `20261029104023_operations_and_commerce.sql`, and `20261029113454_requested_product_catalogue.sql` under `supabase/migrations`, generated through the official Supabase CLI. Apply the three in order, or use `database/bootstrap.sql` for a new installation; do not apply both approaches to the same schema. They create an unexposed `easygas_private` schema with RLS, no public schema usage and a `NOLOGIN` trusted-server group. No Supabase public/anonymous key grants access to the business tables. See [deployment notes](docs/deployment.md) before using it.

Secrets belong in ignored environment files or a deployment secret manager. No database or payment credentials are included in this repository.

### Gas pricing, delivery and shared approvals

Open `/gas-order` for delivery-only gas quantities and `/admin/settings` for governed pricing, coverage and limits. See [the administrator guide](docs/guides/gas-pricing-delivery-settings.md), [the shared approval architecture](docs/architecture/shared-approval-workflow.md), and [implementation verification](docs/reports/easygas-gas-pricing-delivery-implementation.md). Prices start at ₦1,800/kg plus one ₦5,000 delivery fee; operational quantity limits and real gas stock must be configured before ordering. Online payments remain disconnected and production remains NO-GO.

### Inventory, live dashboard and finance

`/admin/inventory` manages receipts, count sessions/variances, controlled adjustments, returns, transfers and suppliers/purchases. `/admin/finance` records independently approved expenses and payment evidence. `/admin/reports` provides scoped exports and in-app scheduled snapshots. The existing Approval Centre governs restricted effects; no separate approval engine or saleable stock ledger was added. Read [implementation and limitations](docs/reports/easygas-inventory-dashboard-implementation.md) and [security verification](docs/reports/easygas-inventory-finance-security-verification.md). Commercial production remains NO-GO; payments remain unconnected.

### Administration navigation

The grouped administration sidebar uses one seven-group/28-route contract, scoped counters, persisted compact mode and an accessible mobile drawer. Driver and technician navigation stays task-specific. See [navigation architecture](docs/navigation/easygas-admin-navigation.md), [route matrix](docs/navigation/easygas-route-matrix.md) and [local implementation/acceptance report](docs/reports/easygas-navigation-implementation.md). Public production release remains **NO-GO**.

Customer workspace architecture and executed evidence: [customer dashboard](docs/customer/customer-dashboard-architecture.md), [65-requirement traceability matrix](docs/traceability/easygas-customer-dashboard-rtm.md), [coverage](docs/reports/easygas-customer-dashboard-coverage.md). All future phases must follow [mandatory phase traceability](docs/traceability/README.md).

Driver phase audit, partial implementation and acceptance status: [Driver traceability](docs/driver/requirements-traceability.md), [operations and dependency register](docs/driver/driver-operations-runbook.md). Production NO-GO remains unchanged.

Technician app phase: [traceability](docs/traceability/easygas-technician-rtm.md), audit-before-implementation and backend chargeable-work approval/payment guard. Status PARTIAL / NO-GO; full UI/offline/device gates remain.
