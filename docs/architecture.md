# EasyGas architecture — 30 October 2026

The website and business workspace are Next.js 16 / React 19 clients of one server-side action dispatcher. The Expo 58 / React Native 0.88 client uses the same `/api/<action>` endpoints and authoritative records. There is no separate mobile business database. Shared forecast, governance and escaped service-report formatting live in `packages/business-rules`.

`apps/web/lib/service.ts` authenticates opaque sessions and dispatches accounts, commerce, catalogue, professional services, linked checkout, follow-ups, governance, reporting and operational actions inside a database transaction. Web uses an HttpOnly session cookie; native uses a SecureStore bearer token. Roles and branch membership are reread from persisted users.

Development uses one-process PGlite. Production requires a PostgreSQL connection and explicit migrations; it refuses an implicit local database. Managed tables belong to `easygas_private`, with RLS and a restricted trusted-server group. This is application authentication, not a claim that Supabase Auth or public Data API policies protect individual customers. Application checks enforce customer/assignment/branch scope.

Products reserve and consume inventory through orders/POS. Services reserve named technician slots and maintain separate quotes, materials and reports. `commerce_checkouts` links the two without pretending delivery and service have the same completion or payment status. Each component retains price/configuration snapshots.

External payments and messaging are unconnected. In-app notifications are real database records; external outbox records are not proof of delivery. Maintenance runs in-process or via the existing worker. A supervised production runtime, workers, backups and alerts remain unprovisioned. See `reports/easygas-production-readiness.md`.
