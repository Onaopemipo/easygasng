# Mobile redesign preflight — 5 November 2026

Extend the Expo 58 application in apps/mobile; do not replace its business modules. Baseline: 301 passing, 12 skipped, zero failures (evidence/baseline.txt). Skips are not acceptance.

App.tsx owns existing sessions, catalogue, orders, cart and role routing. GasOrder.tsx owns the shared server quote/checkout integration; Services.tsx owns service bookings; Workflows.tsx owns account/privacy, schedules and support. OrderVisit.tsx, DriverOperations.tsx and offline.ts retain staff fulfilment and secure queue handling. Existing backend remains authoritative for identity, permissions, prices, stock, invoices and payments.

Reference analysis: eight light/dark screen pairs: splash, doorstep introduction, refill introduction, tracking introduction, sign-in, customer home, gas order and account. Image-led introductions, generous headings, compact greeting, green hero, four quick actions and five-tab customer navigation are the visual targets. Screenshot names, avatar, customer number, counts, amounts, delivery statuses and refill claims are examples, not migration data. The brief's additional service scene is a derived screen, not an attached reference.

No database migration, payment activation, fabricated customer identity, duplicate customer table, production deployment, import or credential change is authorised by this visual phase. Existing NO-GO and import holds remain. Phone/Google sign-in must reflect configured methods. Driver/technician flows must remain reachable and separate. Device and full acceptance checks remain outstanding until executed.

Git: main, unborn HEAD; no staged paths; all 16 top-level status entries were untracked. There is no clean committed reference against which to claim a complete Git diff. No reset, clean, commit or push performed. Changes are limited to mobile presentation, a pure appearance resolver/test and phase documentation; existing backend/data migrations remain untouched.

Existing source audit: apps/web/lib/accounts.ts is the profile/identity authority; apps/web/lib/service.ts routes domain actions; invoice.order remains authoritative (OrderVisit.tsx already consumed it). Existing native Services.tsx, GasOrder.tsx, CombinedCheckout.tsx, EasyRewards.tsx, OrderVisit.tsx and DriverOperations.tsx retain their domain calls. Production completion, release and post-meeting matrices remain authoritative for broader unresolved safety/finance/provider gaps. This visual pass is not a fresh certification of every schema, concurrency or rollout control.
