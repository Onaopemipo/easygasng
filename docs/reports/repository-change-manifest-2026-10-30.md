# Repository integrity and change manifest

Start/final branch: **main**. Start/final commit: **none; unborn HEAD**. The entire application was already untracked. No commit, push, merge, deployment or cloud provisioning was performed. No baseline file was deleted; all previous `docs/audits/` artifacts are byte-for-byte unchanged within the captured baseline.

The SHA256 baseline covered `apps`, `database`, `docs`, `packages`, `scripts` and `tests`, excluding generated dependencies/builds/data. It did **not** cover root files or `supabase`; those are explicitly classified from observed operations and prior evidence, rather than falsely called newly created. This manifest excludes its own hashes and generated caches.

Counts in the hashed scope: **89 created**, **36 modified**, **93 preserved**, **0 missing**. [The JSON manifest](repository-change-manifest-2026-10-30.json) contains exact final source hashes, verification results, dependencies and preserved file inventory.

## New CLI migrations

- `supabase/migrations/20261029150247_professional_services_and_integrity.sql`
- `supabase/migrations/20261029150950_governed_service_bundles.sql`

The three preceding Supabase migration files were pre-existing and preserved. Application migrations 012/014/016/018/020 and their restricted access policies are listed below. Bootstrap was regenerated and tested. No destructive down migration was introduced.

## Dependencies

Web adds direct sharp 0.35.5, already transitively installed. Native adds expo-image-picker 58.0.10, expo-print 58.0.8 and expo-sharing 58.0.21. Both relevant lockfiles were updated; no forced Expo major downgrade or unsupported vulnerability override occurred. Web audit: 0 known vulnerabilities; native: 8 aggregate advisories remain.

## Modified root files outside baseline

- `README.md`
- `.env.example`
- `.gitignore`
- `package-lock.json`

README/environment/ignore changes document the handover and ignore generated CLI metadata. Root package.json and the three original Supabase migrations were not intentionally edited, but their pre-change SHA256 was not captured in this folder-scoped baseline.

## Created files in captured scope

- `apps/mobile/CombinedCheckout.tsx`
- `apps/mobile/Onboarding.tsx`
- `apps/mobile/Services.tsx`
- `apps/mobile/assets/app-icon.png`
- `apps/mobile/assets/easygas-logo-hd.png`
- `apps/mobile/assets/flame-transparent.png`
- `apps/mobile/metro.config.cjs`
- `apps/web/app/api/media/[id]/route.ts`
- `apps/web/app/api/media/route.ts`
- `apps/web/components/bundles.tsx`
- `apps/web/components/catalogue-tools.tsx`
- `apps/web/components/combined-checkout.tsx`
- `apps/web/components/compatibility.tsx`
- `apps/web/components/image-upload.tsx`
- `apps/web/components/policies.tsx`
- `apps/web/components/professional-services.tsx`
- `apps/web/components/readiness.tsx`
- `apps/web/components/recommendations.tsx`
- `apps/web/components/reconciliation.tsx`
- `apps/web/components/service-followups.tsx`
- `apps/web/lib/bundles.ts`
- `apps/web/lib/catalogue.ts`
- `apps/web/lib/cylinder-allocation.ts`
- `apps/web/lib/financial-reports.ts`
- `apps/web/lib/media.ts`
- `apps/web/lib/mixed-checkout.ts`
- `apps/web/lib/observability.ts`
- `apps/web/lib/policies.ts`
- `apps/web/lib/professional-services.ts`
- `apps/web/lib/readiness.ts`
- `apps/web/lib/service-followups.ts`
- `apps/web/lib/service-schema.ts`
- `database/migrations/012_integrity.sql`
- `database/migrations/014_professional_services.sql`
- `database/migrations/016_catalogue_media.sql`
- `database/migrations/018_service_governance.sql`
- `database/migrations/020_bundles.sql`
- `database/policies/bundles-access.sql`
- `database/policies/catalogue-access.sql`
- `database/policies/integrity-access.sql`
- `database/policies/service-governance-access.sql`
- `database/policies/services-access.sql`
- `docs/architecture.md`
- `docs/database.md`
- `docs/features.md`
- `docs/inventory-cylinders.md`
- `docs/known-limitations.md`
- `docs/notifications.md`
- `docs/operations.md`
- `docs/payments-wallet.md`
- `docs/products-services.md`
- `docs/refill-predictions.md`
- `docs/release-notes-2026-10-30.md`
- `docs/reports/browser-observations-2026-10-30.json`
- `docs/reports/easygas-feature-verification.md`
- `docs/reports/easygas-implementation-report.md`
- `docs/reports/easygas-outstanding-work.md`
- `docs/reports/easygas-production-readiness.md`
- `docs/reports/easygas-security-verification.md`
- `docs/reports/easygas-test-results.md`
- `docs/reports/implementation-baseline-2026-10-30.json`
- `docs/reports/mobile-dependency-audit-2026-10-30.json`
- `docs/reports/module-verification-2026-10-30.txt`
- `docs/reports/native-export-2026-10-30.txt`
- `docs/reports/native-typecheck-2026-10-30.txt`
- `docs/reports/restoration-verification-2026-10-30.txt`
- `docs/reports/test-results-2026-10-30.txt`
- `docs/reports/tooling-typecheck-2026-10-30.txt`
- `docs/reports/web-build-2026-10-30.txt`
- `docs/reports/web-dependency-audit-2026-10-30.json`
- `docs/reports/web-typecheck-2026-10-30.txt`
- `docs/roles-permissions.md`
- `docs/rollback.md`
- `docs/screenshots/home-mobile-20261030.png`
- `docs/screenshots/production-readiness-20261030.png`
- `docs/screenshots/services-booking-desktop-20261030.png`
- `docs/screenshots/services-booking-mobile-20261030.png`
- `docs/screenshots/services-staff-desktop-20261030.png`
- `docs/security.md`
- `docs/service-booking.md`
- `docs/testing.md`
- `packages/business-rules/src/service-report.ts`
- `scripts/prepare-services-browser-qa.ts`
- `tests/bundles.test.ts`
- `tests/catalogue-services-integration.test.ts`
- `tests/helpers/service-fixture.ts`
- `tests/integrity-regressions.test.ts`
- `tests/professional-services.test.ts`
- `tests/service-governance.test.ts`

## Modified files in captured scope

- `apps/mobile/App.tsx`
- `apps/mobile/Workflows.tsx`
- `apps/mobile/app.json`
- `apps/mobile/package-lock.json`
- `apps/mobile/package.json`
- `apps/web/app/[...slug]/page.tsx`
- `apps/web/app/admin/[[...section]]/page.tsx`
- `apps/web/app/api/[action]/route.ts`
- `apps/web/app/globals.css`
- `apps/web/app/layout.tsx`
- `apps/web/components/admin.tsx`
- `apps/web/components/site.tsx`
- `apps/web/components/ui.tsx`
- `apps/web/components/workflows.tsx`
- `apps/web/lib/accounts.ts`
- `apps/web/lib/commerce.ts`
- `apps/web/lib/db.ts`
- `apps/web/lib/delivery.ts`
- `apps/web/lib/governance.ts`
- `apps/web/lib/maintenance.ts`
- `apps/web/lib/operations.ts`
- `apps/web/lib/refills.ts`
- `apps/web/lib/service.ts`
- `apps/web/lib/workspace.ts`
- `apps/web/next-env.d.ts`
- `apps/web/package.json`
- `database/bootstrap.sql`
- `docs/deployment.md`
- `docs/implementation-status.md`
- `docs/local-testing.md`
- `docs/production-readiness.md`
- `docs/verification.md`
- `scripts/export-bootstrap.ts`
- `tests/backups.test.ts`
- `tests/catalogue-import.test.ts`
- `tests/http.test.ts`

## Verification and remaining integrity issues

106 tests passed, 0 failed/skipped. Web/native/tooling TypeScript, web production optimisation and both Hermes exports passed; exact logs are retained in the test report. No signed native build, hosted migration or remote advisor/production acceptance was performed. No source baseline can be identified by commit until a separately authorised initial review/commit. Credentials/business data/generated artifacts were not committed. Existing normal localhost:3003 server was preserved; only the isolated QA server/tab were closed.
