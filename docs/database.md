# Database and migrations

Existing users, orders, order items, verified payments, wallet/reward entries, stock movements, cylinder events, approvals and support records are retained. New migrations add entities and constraints; no customer, stock or revenue fixtures are seeded into the business database.

| Version | Changes |
|---|---|
| 012 / 013 | Fulfilment timestamp, serialised sale allocations and restricted grants |
| 014 / 015 | Service catalogue, qualifications, slots, bookings/events, quote revisions/decisions, materials, reports, acknowledgement, feedback, cash verification, incidents and service payment/refund references |
| 016 / 017 | Categories, SKU/parent variants/specification JSON, archiving, validated media storage, linked checkout and reviewed recommendation events |
| 018 / 019 | Service image targets, legal publication, specific compatibility evidence, service follow-ups, service reminder preference; forward recommendation dedupe correction |
| 020 / 021 | Governed bundles and immutable checkout bundle snapshots |

Official CLI incremental files are `supabase/migrations/20261029150247_professional_services_and_integrity.sql` and `20261029150950_governed_service_bundles.sql`, following the three original migrations. `database/bootstrap.sql` is a generated **new-install alternative**; never apply bootstrap plus the same migrations, or apply bootstrap to an existing business database. `npm run db:export` regenerates it from source migrations and seed code.

Bookings reference actual customer, service, slot and technician records. Slots are revalidated against current qualification, branch, duration and overlapping reservations. Quotes and customer decisions are append-only. Reports freeze the checklist version, findings and invoice. Materials separately track reserved, issued, used, damaged and returned units. Service payments reference a booking instead of an order with an exclusive-target constraint. Refund requests use the existing controlled credit ledger.

Cylinder allocations refer to an order or POS sale, with a partial unique index preventing multiple active allocations for a serial. Cancelled reservations release allocations. Fulfilment requires eligible allocated serials. Old orders without allocations fail closed at delivery and need operational review.

Tests validate the fresh private-schema bootstrap, incremental upgrade from the previous catalogue version, RLS on all business tables, anonymous denial and real service operations under `easygas_server`. These tests run in PGlite, not a hosted multi-connection PostgreSQL service. Apply staging migrations, security/performance advisors, concurrent acceptance and restore drills before managed deployment.

Staff management follow-up: restricted policy **022** grants only invitation token/expiry/inviter column updates. The official CLI file is `20261029154521_staff_invitation_management.sql`; apply it after the preceding five migration files for managed deployments. No tables or business data were deleted.
