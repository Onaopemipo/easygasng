# Deployment preparation

## Current decision
Keep EasyGas local. Online payment providers remain unconnected. The selected future Supabase account is **Philip 2 Acc**, organisation **BytesNGigs**. Creation of a separate EasyGas project was refused by the organisation's active-free-project limit. A $0/month quote was returned before the attempt, but no project was created. No existing PTI project was changed. Do not repeat creation or pause another project without a new user instruction.

## Future Supabase database

The official CLI generated `supabase/migrations/20261029091616_easygas_private_core.sql`. The additional CLI-generated `20261029104023_operations_and_commerce.sql` contains the local expansion. The additional `20261029113454_requested_product_catalogue.sql` contains the user-supplied eight products/prices. The new professional-services and bundle migrations are `20261029150247_professional_services_and_integrity.sql` and `20261029150950_governed_service_bundles.sql`. Apply all five in order for a new installation, or use the generated `database/bootstrap.sql` as a single new-install artifact. Do not apply both the bootstrap and the same incremental migrations. The first migration is a new-install migration, not an instruction to run against an existing unrelated application. Inspect the selected project's schemas/tables before applying. It contains only draft product/configuration records, not users or business transactions.

- All EasyGas tables are in `easygas_private`, outside the Data API's normal exposed schema.
- Public schema usage is revoked. RLS is enabled on every business table.
- `easygas_server` is a `NOLOGIN` group for trusted backend connections. Its RLS policy allows the backend to operate; it is never granted to anonymous or browser-authenticated roles.
- The Next.js API verifies opaque sessions and reads the current application role and branch from the database on every operation. This release uses application sessions, not Supabase Auth JWTs.
- A distinct backend login role must be provisioned through a secure operator process and made a member of `easygas_server`. It must not be a superuser, a schema owner or a role with `BYPASSRLS`/`CREATEROLE`.
- Keep a distinct migration credential for schema changes. Do not deploy a database owner connection as the runtime application identity.
- Do not expose the private schema through REST/GraphQL or grant its privileges to `anon`, `authenticated` or `PUBLIC`.
- Disable the Data API entirely if it is not needed. [Supabase's direct-connection security guidance](https://supabase.com/docs/guides/database/secure-data) supports a trusted-server architecture.
- Use the documented [connection method](https://supabase.com/docs/guides/database/connecting-to-postgres) for the hosting environment, TLS certificate verification and an appropriate session/transaction pool configuration. Do not disable TLS verification.

The PostgreSQL adapter sets `search_path=easygas_private,pg_catalog`. Local PGlite uses its isolated local schema. Managed schema migrations must be run explicitly before production startup. Production refuses to open a local PGlite database.

The updated application migration runner applies incremental versions through schema 020 / restricted policy 021 with separate restricted grants. Local backup/restore and an in-process maintenance timer are implemented; managed backups, monitoring and worker deployment still require production configuration.

Once a project is available, apply the reviewed migration, run the Supabase security and performance advisors, confirm that public roles cannot read protected tables, and run the service acceptance suite against an isolated hosted staging database. The current private-schema test runs in local PostgreSQL; no remote advisors or hosted concurrency/load tests have passed yet.

## Production application requirements

The complete platform is not release-ready. Finish the outstanding capabilities in `implementation-status.md`, then configure:

1. A supported Node server hosting target and runtime PostgreSQL secret.
2. A verified application HTTPS origin in `APP_URL`; production mutations refuse an unconfigured origin.
3. Business-approved product/pricing, stock, delivery areas/windows/fees and operating authority.
4. Verified staff identities and sufficient independent approvers for restricted financial/access changes.
5. Recovery/verification messaging, privacy/consent and account lifecycle controls.
6. Approved legal policies and reviewed EasyGas assets.
7. Backups, restore testing, monitoring, incident response, security/load testing and provider failure recovery.
8. Supported patches for the outstanding Expo CLI dependency advisories.

No payment provider is configured or activated in this release. Cash-on-delivery is also initially disabled. The screenshot's wallet withdrawal function was intentionally excluded because the supplied written requirements prohibit unrestricted withdrawals.

## Mobile release

A successful Expo export checks JavaScript/assets/Hermes compilation. It does not prove native signing, app-store eligibility, device compatibility, permission behaviour or offline synchronisation. Device/simulator QA, verification of the provisional Android/iOS identifiers, signing credentials and distribution remain required. The source now includes `com.easygasng.customer`, an app icon and motion-aware onboarding; registration/ownership and native OS splash behaviour are not certified. A released native build refuses an absent/non-HTTPS `EXPO_PUBLIC_API_URL`. Do not invent app-store links or claim the native app is available for download.


## 30 October implementation handover

New service, catalogue/media, integrity, policy and bundle migrations are local artifacts only. Their fresh/incremental/restricted-role tests passed in PGlite. The business database was not populated with QA stock/qualifications/services. Before any hosted operation use the [current twenty-gate readiness report](reports/easygas-production-readiness.md), [rollback plan](rollback.md), [security report](reports/easygas-security-verification.md) and [outstanding register](reports/easygas-outstanding-work.md). The preserved `docs/audits/` reports record the earlier baseline.

Environment: root `.env.example` documents `DATABASE_URL`, `EASYGAS_DATA_DIR`, `APP_URL`, `EASYGAS_BACKGROUND_JOBS` and `EASYGAS_PREVIEW`. The preview flag changes the build output directory, not database safety; explicitly select an isolated data directory for QA. `apps/mobile/.env.example` documents the public API origin, which must be a verified HTTPS host for distribution and must never contain secrets. Payment/provider secrets have not been invented or activated.

External activation checklist: approved hosting/database budget and explicit authorisation; runtime versus migration credentials; private schema/RLS and advisors; reviewed migration/restore; HTTPS origin; verified staff/independent approvers; approved stock, pricing, checklists and policies; verified transactional recovery delivery; finance reconciliation; supervised workers/health/error alerts/off-site backup; native signing/device/security acceptance; owner-approved release scope and source baseline. Online payment and customer messaging remain disabled/unconnected until separately approved and verified.

Staff-management follow-up adds a sixth incremental file, `20261029154521_staff_invitation_management.sql`, granting the columns required for renewing/revoking invitations (policy 022). The generated bootstrap includes it; existing installations use the incremental file, never both paths. No hosted migration was applied.
