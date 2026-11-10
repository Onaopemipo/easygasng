# Temporary Vercel client demo — deployed 9 November 2026

Live demo: https://easygas-client-demo.vercel.app/

Sign in: https://easygas-client-demo.vercel.app/login . Owner opens /admin; customer opens /account. Private synthetic login guide: `.data/vercel-client-demo-accounts.md` (0600, excluded from upload). Existing local credentials and customer records are not copied. Do not enter real customer, payment or location data in this demonstration.

## Resources and scope

- Existing Vercel account/team: onaopemipos-projects. Separate project: easygas-client-demo (`prj_cFSaJuN9r4x93RLov1LLVO3cdVA2`).
- Ready deployment: `dpl_4RaZFWEktdHs4M231g8SN9zBcfZV`, https://easygas-client-demo-feeftrb1z-onaopemipos-projects.vercel.app . The Vercel production slot supplies the stable demo alias; this is **not** business production approval.
- Separate Neon resource: easygas-client-demo-db (`store_yB8BWPLpo18elDUP`), existing Neon integration, Free `free_v3` plan, Frankfurt `fra1`, built-in Neon Auth/realtime OFF. No paid database plan purchased. Existing Vercel account usage/billing terms still apply.
- All69 recorded migration entries applied explicitly. A restricted `easygas_demo_runtime` inherits the trusted backend role with no SET ROLE, schema ownership, superuser, CREATEROLE, CREATEDB or RLS bypass. Actual private-schema usage/no-create/no-delete/no-audit-update checks passed;146 private tables visible through normal policies.
- Integration owner credentials were pulled only to a private local temporary file for migration, then disconnected from the application. Only the restricted DATABASE_URL is installed as an application secret. No environment/database secrets are in the source bundle or access guide.
- New explicitly synthetic role accounts,80 empty-cylinder units,1,000kg demo gas and five demo services/appointment slots. Service descriptions say client demo; sample service charge NGN15,000 is synthetic. Existing reference product prices remain. Shared independent approval APIs activated only demo quantity policy, delivery/COD and service/checklist configuration. No customer, order, receipt, testimonial, qualification or historical workbook was imported from local/business data. Synthetic qualification evidence explicitly says demonstration only.

## Flags and limits

APP_URL is the stable HTTPS demo alias. EASYGAS_CLIENT_DEMO=true displays an explicit test-data/no-real-orders notice and no-index metadata; robots disallows all indexing. Background jobs, SMTP/email, SMS, WhatsApp, Paystack, road routing, field/bulk/doorstep mutations and rewards issuance/redemption remain OFF. No provider secrets configured and no customer messages or real payments sent. In-app demo records/notifications may be created normally.

This is a short-lived interactive web demonstration. It has no supervised worker or signed mobile release and is not certified for operational dispatch, physical dispensing, real payments, background/offline tracking or full production recovery. Existing production NO-GO, retained-record policy and historical-import confirmation hold remain unchanged. Keep all prior application requirements/gates in their existing matrices; only the three bounded temporary-deployment requirements are closed here.

## Deployment/reproduction

Vercel project root is apps/web; install command `cd ../.. && npm ci --include=dev` installs the repository's TypeScript/dev tooling required for its alias resolution. Build uses the existing Next webpack script. `next.config.ts` traces the monorepo and includes invoice font/logo assets. `.vercelignore` excludes all local environment files, data, backups, mobile builds, documentation/tests and operator scripts. No Git commit/reset/clean was performed on the existing untracked workspace.

Operator scripts `prepare-vercel-demo.ts` and `configure-vercel-demo.ts` require explicit dedicated-demo confirmation and private manifest paths. Bootstrap refuses an existing private schema. Provisioning generated credentials through private files, never CLI arguments/logs. PostgreSQL16+ membership INHERIT must be specified when granting the trusted role; changing the login role's INHERIT flag later does not fix an earlier non-inheriting membership. The actual cloud role was verified after applying this correction.

Redeploy only this linked demo project with `vercel deploy --prod --yes --archive=tgz --scope onaopemipos-projects`. Retain its configured restricted DATABASE_URL and HTTPS origin; do not upload `.data` or `.env` files or point it at another application's database.

## Executed acceptance

- Vercel cloud build and READY alias succeeded; local production build passed.
- Seven local deployment/security/traceability checks passed,0 failures/skips. Hosted VDEMO-HTTP01 passed: homepage200/no-index/demo notice, anonymous401, owner and customer sign-in/identity persistence, owner dashboard200, customer dashboard403, catalogue and robots.
- MANIFEST browser checks are separate earlier work. For this deployment, VDEMO-UI01 verified the live homepage/catalogue, clicked an enabled product button and observed the cart change to1 with success message; VDEMO-UI02 verified actual owner browser sign-in/dashboard; VDEMO-UI03 verified all five active demo services. Saved actual screenshots in evidence/.
- No claim is made that the entire application or every original business workflow has passed cloud/device/production acceptance. Invoice-PDF delivery and background/provider/device release acceptance are not established by this temporary deployment.

Evidence: [hosted checks](evidence/vercel-demo-hosted-tests.txt), [local checks](evidence/vercel-demo-local-tests.txt), [runtime privileges](evidence/vercel-demo-runtime.txt), [Vercel deploy](evidence/vercel-deploy.txt), [homepage screenshot](evidence/vercel-demo-home.png), [admin screenshot](evidence/vercel-demo-admin.png).

## End of demonstration

No automatic data deletion or expiry has been scheduled. When the demonstration ends, stop public access/remove the demo deployment through the Vercel project after retaining the required records. Export and retain the isolated database and audit history under the user's retain-all instruction. Do not delete the database, another app/project or historical data without a new explicit instruction. No custom-domain DNS was changed.

## 9 November inventory badge maintenance

Stable alias updated to `dpl_D8tyZ2BAGZMXp5dFQECzrz1sDKg5` (https://easygas-client-demo-jrtqtcyxh-onaopemipos-projects.vercel.app). Removes counter clearing during refresh; failed counts remain explicitly stale, fresh zero clears the badge and auth/grants remain enforced. Local/cloud build,13/13 checks, hosted access checks and actual browser refresh/navigation passed. Original launch/import/provider holds remain. See [repair traceability](../traceability/inventory-badge-rtm.md).

## Latest redeployment — 9 November 2026

User authorised source push and redeployment. Source repository: https://github.com/Onaopemipo/easygasng (main). Deployment `dpl_yZaERKondML9nt2b8FkMjfV8uXxT` is READY; stable alias unchanged. Cloud compilation and TypeScript checks passed. Before migrations070–072, an encrypted PostgreSQL18 archive of the dedicated demo schema was created privately and authenticated/archive-readability checked (not a restore drill). Migrations applied without changing counts of existing users12, orders2 or wallet entries0. No account reset, financial backfill or seed rerun.

Hosted smoke evidence is in `docs/deployment/evidence/redeploy-20261109-*.txt`. Prior provider configuration was preserved. New invoice-template rollout remains default OFF, so historical documents retain their existing presentation; bank-transfer funding requires verified business bank configuration. These remain explicit acceptance/configuration dependencies. No native build, server provisioning, live payments, automatic assignment or actual Excel import authorised by this deployment. Production NO-GO remains.

GitHub CI runs validation on push. Mobile bundle export is deferred and now requires explicit manual workflow input; mobile source type checks remain automatic. CI completion is separate from the verified Vercel cloud build and hosted smoke checks.

## Branded-loader rollout

User authorised push/deploy after local loader implementation. Source5b9deae; Vercel dpl_55FRjAMWJLcGhneF1eCEnDzx7Djh READY at stable alias https://easygas-client-demo.vercel.app. Cloud build/types and hosted smoke/auth/privilege/catalogue/no-index plus branded loader CSS/motion/theme checks pass. No schema/configuration changes or mobile builds. Source CI run42590228787 is still in progress at handover. Loader-specific traceability and deployment evidence: docs/traceability/central-loader-rtm.json, docs/loader/evidence/deployment/. Operational production NO-GO remains.

## 10 November 2026 repair rollout

Source `508f137` pushed to main. Vercel `dpl_5X2wdwR4AkJzmumsbKnDeXZ4LhWV` READY at https://easygas-client-demo.vercel.app. Includes mobile viewport/cart/card/loader corrections, wallet branch/continuation/layout repair and linked-appointment contact validation/correction. Protected encrypted backup authenticated and archive-readable (not a restore drill); migration073 applied with users13, orders2 and wallet entries0 preserved. No seeding or financial backfill. Cloud compile/types and hosted auth/access/catalogue/no-index, wallet funding/configuration and affected route checks pass. No real financial mutation performed by rollout checks.

Evidence: `docs/deployment/evidence/redeploy-20261110-*.txt`. Original physical/browser linked-confirmation, bank configuration, merchant and production gates remain open; production NO-GO/import/retention/native/server holds unchanged. CI completion is separate and not claimed.

## 10 November follow-up rollout — preparation

User requested all pending changes pushed and deployed. Includes staff same-delivery additions, minimum-eight-character password policy, friendly custom alerts, readable settings/location summaries and date-only requested effective dates with checkbox alignment. Migration074 now enables RLS and uses the existing trusted-server SELECT/INSERT policy; immutable additions remain protected. Regression repair preserves legacy phone-login failure handling without weakening new-password creation/change/reset minimums. Onboarding hash preservation records the explicitly authorised friendly-error-only change, retaining the original baseline.

Encrypted pre074 backup authenticated and archive-readable (not a restore drill); migration074 applied preserving users26/orders2/wallet entries0. No bootstrap, seed, account reset, financial backfill, payment activation or message sending. Final full-suite, rollout and hosted verification evidence will be recorded below. Previous NO-GO, native-build/server deferral, retain-all and historical import hold remain.

### Follow-up rollout verified

Source `01f1ab7` pushed to main; Vercel `dpl_2VUKcpuRv1Sr2WmFVcjf9774Kwzv` READY and aliased to https://easygas-client-demo.vercel.app. Final suite599passed/20environment-gated skips/0failures;85repair regressions pass. Web/native types, web cloud/local builds and web/native dependency audits (zero vulnerabilities) pass. Separate real PostgreSQL addition concurrency and actual restricted demo runtime SELECT/RLS/UPDATE-denial checks pass. Hosted owner/customer identity, privilege rejection, catalogue/no-index, canonical settings and guarded addition endpoint checks pass. Actual owner browser verified payment/location summaries, requested input type=date, and nine checkbox rows display:flex/order:-1; no setting proposal, approval or financial mutation submitted. Screenshots saved in evidence. Full authenticated native/mobile/physical/business acceptance remains separate; GitHub Actions completion not claimed. No native build or VPS work performed.
