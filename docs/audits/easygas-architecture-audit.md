# Architecture and database audit

## Actual repository map and entry points

```text
apps/web/                   Next.js web + admin + trusted server API
  app/page.tsx              Customer homepage
  app/[...slug]/page.tsx    Explicit customer route allowlist
  app/admin/layout.tsx     Server-side staff gate
  app/admin/[[...section]]/page.tsx  Admin section allowlist
  app/api/[action]/route.ts HTTP dispatcher, cookie/bearer transport
  app/icon.png              Transparent website favicon
  components/               Site, admin, shared UI and workflow forms
  lib/                      Business services and database adapter
apps/mobile/                Expo / React Native client, separate npm lockfile
  index.ts / App.tsx        Entry, state-driven navigation, API client
  Workflows.tsx             Additional forms and account/commerce screens
  offline.ts                SecureStore pending delivery-completion queue
packages/business-rules/src/forecast.ts  Shared forecast and order transitions
scripts/                    Explicit operator setup, migration, worker, backup
 database/migrations/       Incremental local schema; bootstrap has private schema
 database/policies/         Restricted trusted-server grants and RLS
supabase/migrations/        Three generated deployment migration artifacts
tests/                      Nine Node integration/security test files
docs/                       Requirements, prior claims, deployment and audit evidence
```

Root npm workspace includes **web only**; mobile uses its own package-lock. No pnpm/yarn lockfile or CI pipeline was found. No abandoned alternate frontend application was identified.

## Framework baseline

Web: Next 16.4.3, React/ReactDOM 19.2.0, TypeScript 5.9.3, Zod 4.6.7, pg 8.16.3, PGlite 0.3.14, Lucide 0.548.0. Native: Expo 58.0.21, React Native 0.88.1, React 19.3.0, expo-secure-store 58.0.2, expo-crypto 58.0.7 and safe-area-context 5.10.1. Versions come from manifests and lockfiles, not assumed support guarantees. Node engine is >=22.21.0. `npm run build`, `npm test`, root/native typechecks exist; no maintained browser/native/accessibility/load test command.

## Service and authentication boundaries

`apps/web/lib/service.ts:47` wraps dispatch in a database transaction. `accountAction`, `delegationAction`, `schedulingAction`, `commerceAction`, `refillAction`, `workspaceAction` then base actions share this boundary. `operations.ts` owns authoritative checkout/reservations/cancellation/receipts; `delivery.ts` owns code-confirmed fulfilment/COD reconciliation. `governance.ts` owns settings versions, independent reviews and activation; `delegation.ts` limits delegated approval.

`auth.ts:12` salts and hashes passwords with scrypt; tokens are random 32-byte opaque strings, SHA-256 hashed at rest, valid 12 hours. `auth.ts:46` reloads role/branch/active/revocation on each authenticated operation. `recentVerification:76` requires password verification within five minutes. Web tokens are HttpOnly, SameSite=Lax cookies (Secure in production); native uses bearer plus SecureStore. This is **custom application auth, not Supabase Auth**. No Supabase JWT identity integration or user-level database RLS is claimed.

`app/api/[action]/route.ts:51` limits JSON bodies to 32KB, restricts mutation methods, enforces provided origins and production APP_URL; server validates inputs with strict Zod schemas. This is not a global abuse/WAF limit. Native headers are a transport choice, not authority. Authentication and permissions must remain server-enforced.

## Database architecture and integrity

`db.ts:29` selects a pg pool (max 10) for DATABASE_URL, otherwise PGlite. Production refuses implicit PGlite. `db.ts:113` applies versioned transactional migrations; development hot reload may auto-upgrade local databases. Audit probes explicitly used memory databases. Persistent `.data` was not opened for audit.

Local schema versions 001,002,004,005,007,009,011 plus managed policy versions 003,006,008,010. Three Supabase artifacts cover initial private core, operations/commerce and the requested catalogue. `database/bootstrap.sql` is a new-install alternative, not an additional migration to apply twice. Isolated deployment tests actually execute its SQL, verify RLS and restricted runtime operations. They do not provision or validate a real Supabase instance.

Primary/foreign keys, integer kobo amounts, positive quantities, reserved<=quantity, unique customer+checkout key, receipt references, full-refund index and append-only triggers are real controls (`database/migrations/001_initial.sql:6`, `:17`, `:22`, `:27`; `005_commerce.sql:3`). Orders snapshot names/prices. Runtime grants restrict updates to order financial fields, audit, versions and ledgers. Constraints do not make every cross-table business invariant declarative: order totals vs line sums, ledger source semantics, state transitions, active branches and physical cylinder allocation rely on services or are missing.

Indexes exist for orders/customer/branch, notifications, approvals, sessions, support and purchases. Many relation lookups remain unindexed, e.g. `verified_payments.order_id`, `wallet_entries.customer_id`, `reward_entries.customer_id`, `refill_history.profile_id` (composite unique covers profile first), `order_events.order_id`. The latter and financial aggregates deserve EXPLAIN under realistic volume before adding indexes blindly. No query plans or production data volume were measured.

Private schema `easygas_private`, revoked PUBLIC schema access, RLS enabled, trusted `easygas_server` NOLOGIN group. Policies use true for the trusted backend; customer and branch isolation is in application code. This limits anonymous database access, but a backend-query bug can still cross branches (F02). A runtime login must not be owner/superuser/BYPASSRLS. Credentials, actual cloud grants, exposed-schema configuration and TLS were not available for verification. See [Supabase RLS documentation](https://supabase.com/docs/guides/database/postgres/row-level-security) for the separate grant/policy checks.

## Integrations and deployment

Payment methods implemented: COD plus restricted, independently verified cash-funded purchase credit. No online provider SDK, webhook or external refund handler. Email is `message_outbox`, not delivery; `accounts.ts:502` only inserts queued email. SMS/push/WhatsApp/maps APIs and error-monitoring providers absent. Address link opens an external map search; it is not driver location/ETA tracking.

Next Node runtime and explicit migration/worker commands are present. Supabase cloud remains unprovisioned under the user's local-only decision. `next.config.ts:4` uses private QA build output when requested; sets nosniff, frame deny, referrer and permission headers. No CSP/HSTS, production infrastructure as code, CI, signed native builds, EAS profiles, deployed workers or off-site managed backup evidence. Build success is independent of DATABASE_URL connectivity.

## Architecture risks

- Runtime circular dependencies: governance ↔ delegation; operations → governance → delegation → governance; operations → governance indirectly interacts with commerce via fulfilment; commerce → operations. No runtime failure observed in the test suite, but extracting audit/notify and policy access to stable lower-level modules would reduce coupling. `db.ts` dynamically imports maintenance → refills → services. Avoid adding top-level side effects.
- Large client components: site ~2165 lines, admin ~2160, workflows ~1629, mobile App ~1387. Shared core rules exist, but auth/transport/cart/date formatting/forms are duplicated across web/native; parity depends on API contracts and duplicated UI validation. Static types use many `any`s.
- Whole-dispatch transactions hold locks during authentication hashing and large response assembly. pg uses a real pool while PGlite serializes transactions; passing concurrency fixtures are not proof of managed-Postgres deadlock safety.
- Branch-wide checkout locks serialize a branch; jobs lock every branch and run all tasks in one transaction (`refills.ts:147`). Opposing paths acquire orders/requests/users before branches; deadlock risk is suspected, not reproduced on a real pg pool. Pool has no explicit connection/statement/lock timeout or retry policy.
- Orders query does per-order item/event/code lookups; dashboard reads every order into JS. Upper limits silently truncate lists/exports (orders 100, finance 500); no pagination/completeness metadata. These are growth/reporting gaps, not measured load failures.
- RLS is backend-wide rather than actor-specific. No claim of tenant isolation by database RLS.
- Baseline has no commit; no reproducible tagged release/rollback artifact. Existing docs are useful inventories, not substitute evidence.
