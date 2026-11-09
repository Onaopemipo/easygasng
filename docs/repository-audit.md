# Repository audit — 29 October 2026

## Initial state
The workspace contained only an uninitialised-content Git repository, on `main`, with no commits, staged files, working files, environment configuration, framework, database or integrations. There was no existing application or business data to preserve. No AGENTS.md was present at inspection. Next.js subsequently generated `apps/web/AGENTS.md`; its bundled documentation was read.

## Implementation structure
- `apps/web`: Next.js App Router, TypeScript, responsive customer and business interfaces, server API.
- `apps/mobile`: Expo / React Native customer and assigned-driver client using the same API.
- `packages/business-rules`: shared order state graph and explainable forecasting.
- `database/migrations`: PostgreSQL schema and guarded empty-install rollback.
- `tests`: PostgreSQL-backed workflow and authorisation acceptance tests.
- `docs/requirements-*`: verbatim supplied requirement files, retained as scope references.

The browser receives no database credentials. Accounts, sessions, orders, stock reservations, approvals, version history and notifications share one database. Development uses persistent PGlite (PostgreSQL in-process) to run locally without credentials. Production refuses this fallback and requires `DATABASE_URL` to a managed PostgreSQL instance. The supplied preferred PostgreSQL architecture is retained; no external service or unrelated Supabase project was modified.

## Reuse and brand assets
The supplied screenshot is retained unchanged as the source of the logo, displayed through a CSS viewport. Generated hero and cylinder illustrations are explicitly identified as illustrative and must be replaced/approved before launch. The logo itself was not redrawn. Original mobile and dashboard references guide interface composition, not customer or financial data.

## Risks and dependencies
No verified company product photography, approved selling prices, stock receipts, production database, authorised owner identity, settlement details, provider credentials, public policy text, mobile signing credentials or deployment target were supplied. These cannot be fabricated. Every reference catalogue product begins with null selling price, zero stock and unpublished sale status. Delivery ordering and payment-on-delivery begin disabled. No sample customers, balances or transactions are seeded.

The entire 30-part brief is larger than the implemented release. See `implementation-status.md` for precise capabilities and gaps. The Part 19.6 acceptance gates are not all complete; do not treat the later safety/compliance or production certification as passed.

## Sequence
1. Empty-repository audit and requirement preservation.
2. Shared PostgreSQL data model and trusted server session authority.
3. Customer storefront based on supplied visual composition.
4. Transactional ordering, inventory reservations and receipt records.
5. Independent settings approvals, versions, rollback and emergency protection.
6. Business workspace and native shared-API client.
7. Automated acceptance checks, production build, visual QA and operational documentation.
8. Remaining business modules and provider integration only after required configuration and acceptance gates.
