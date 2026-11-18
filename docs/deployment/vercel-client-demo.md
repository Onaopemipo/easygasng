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

## Business Owner automatic approval rollout — 10 November

Source67d94cc, deployment dpl_AMwAo4VzXVKn7ewqvCZ7P3g8WXj6 READY at the stable demo URL. EASYGAS_OWNER_AUTO_APPROVAL enabled on this linked demo only. Existing pending requests remain unchanged until the requester uses Apply my request; new owner submissions automatically record authority and follow existing activation/scheduling. Technical administrators and staff retain their existing permissions/review requirements. Qualified safety, payment/provider, current authority, expiry/version and stock gates remain. No migration, bulk approval, price/payment/balance mutation or native build performed by rollout verification. [Scope, tests and acceptance](../owner-auto-approval/report.md), [matrix](../traceability/owner-auto-approval-rtm.json). Production NO-GO remains.

## 13 November public layout and pending fixes rollout

Git source `5179c7a659922230d8ab88e95fa4c621825fec3b` on `codex/driver-experience-redesign` includes the public 1440px layout, form contrast fixes, and demo readiness repair. The release also integrates the already deployed Smart Refill branch history and its CI fixes. Vercel built the committed source snapshot, verified it before promotion and promoted `dpl_2YCvePvu86S9a7Gs6aos7TD4x6CE` to the stable demo alias. Prior alias rollback target: `dpl_HVW4uqRU3tpNAmvp53B1fziobd4C`.

After promotion, Chrome verified all eight public destinations at 1920px and 390px, including the Home anchor. The demo health endpoint returned HTTP 200 with demo scope. Owner/customer sign-in, customer denial on the owner dashboard endpoint, the public catalogue and no-index controls passed. The 36 focused local tests and both typechecks passed. The [GitHub release validation run](https://github.com/Onaopemipo/easygasng/actions/runs/43322279192) passed both jobs. No database migration or app-store release was performed. Commercial production remains NO-GO.

Related matrices: [public website width](../traceability/public-width-1440-rtm.md), [form contrast](../traceability/form-contrast-rtm.md), and [demo readiness](../traceability/demo-readiness-rtm.md).

## 13 November Customers and dashboard fixes

Source `6978765487c56061cc48c2ce4acbdeba7f8e3c4a` was pushed to `codex/driver-experience-redesign`. Vercel built the committed snapshot and promoted `dpl_FjxuUwUMtSpqKegZjD4pERdhWShJ` to the stable demo alias after verifying demo readiness. The prior alias rollback target is `dpl_2YCvePvu86S9a7Gs6aos7TD4x6CE`.

Twelve focused local tests, the local typecheck and [GitHub Release validation](https://github.com/Onaopemipo/easygasng/actions/runs/43343661777) passed. After promotion, the stable alias passed the health and anonymous session checks. Authenticated Chrome passed both fixes at 1440px and 390px. See the [customer actions matrix](../traceability/customer-actions-menu-rtm.md) and [dashboard receipts matrix](../traceability/dashboard-receipts-contrast-rtm.md). Commercial production remains NO-GO.

## 14 November sign-in and staff-role rollout

Commit `086a1d0b6a790b05b954e05ea8dd9fc3d85ec944` is on `codex/driver-experience-redesign`. Vercel built that commit and promoted `dpl_7pmkarZ1MXXsg5A51A2nJ3nd1bcq` to the stable demo alias. The previous deployment was `dpl_wc7sEBwrmVp1CBthWHrNKYae8gRR`. The demo database already used schema 078.

Hosted Chrome confirmed the shared 1440px width for sign-in and registration across five viewport widths. The demo passed readiness, no-index and anonymous access checks. Seven existing accounts signed in with their expected identities and roles. The local PostgreSQL run passed 712 tests and found one native configuration expectation that was updated to account for the Android demo plugins. The focused rerun passed all ten checks. Local web and mobile type checks and the Vercel build passed. Commercial production remains NO-GO.

[Hosted smoke checks](evidence/redeploy-20261114-auth-hosted.txt) · [Layout evidence](../public-width-1440/evidence/auth-hosted.txt) · [GitHub release validation](https://github.com/Onaopemipo/easygasng/actions/runs/43463310860)

## 16 November driver availability and branded documents rollout

Vercel built source commit `f5fd3bc520e1e9f30eb31201d10cee3ac96f8c2f` from `codex/cinematic-customer-onboarding` and promoted deployment `dpl_6LY41UVnrAiSagVbgQygZ9HCrZ3L`. The stable demo returned the same Ready deployment and passed role/access and receipt authentication checks. Hosted driver availability writes remain behind the existing field operations gate. See [executed checks](evidence/redeploy-20261116-driver-receipts.txt) and the [demo traceability matrix](../traceability/vercel-client-demo-rtm.json).

If the demo release must be rolled back, promote the previous Ready deployment `dpl_8CNze9oNhyP7n1UhJm5q8H6AANQx` in the same Vercel project, then verify the stable alias with Vercel Inspect and check that `/api/status` returns demo readiness. This release did not migrate the demo database. Commercial production remains NO-GO.

## 17 November checkout details rollout

Source `73979cf` is on `codex/cinematic-customer-onboarding`. Vercel deployment `dpl_2mkFLAuUvEgQyzEyCueZ3SkADeok` serves the stable demo alias. An encrypted backup authenticated and its archive was readable before additive migration 080. The migration preserved the counts of users, orders and wallet entries. GitHub Release validation and all 732 local regression tests passed.

For a web rollback, use `vercel rollback dpl_6LY41UVnrAiSagVbgQygZ9HCrZ3L --yes --scope onaopemipos-projects` and verify the stable alias and `/api/status`. Leave migration 080 in place during a web rollback so saved delivery numbers are available when the new release returns. Backup verification checked archive readability. A restore drill was outside this rollout.

[Release evidence](evidence/redeploy-20261117-checkout-details.txt) · [Checkout traceability](../traceability/checkout-details-save-rtm.md)

## 17 November Operational Incidents rollout

Source `65ae678` is on `codex/cinematic-customer-onboarding`. Vercel deployment `dpl_GXGapwq4nWpKCfCJZ8GYQ88QGrfL` serves the stable demo alias. Authenticated Chrome verified the register and popup for Admin at 1440px and read-only Finance at 390px. Customer and anonymous incident access were denied.

To roll back the demo web release, use `vercel rollback dpl_2mkFLAuUvEgQyzEyCueZ3SkADeok --yes --scope onaopemipos-projects`, inspect the stable alias and check `/api/status`. This rollout required no migration. Commercial production remains NO-GO.

[Deployment evidence](evidence/redeploy-20261117-operational-incidents.txt) · [Incident traceability](../traceability/operational-incidents-rtm.md) · [GitHub Release validation](https://github.com/Onaopemipo/easygasng/actions/runs/43989158764)

## 17 November demo-only fulfilment

Deployment `dpl_GfJyTjpgWKXz1a4wnmgzwjsSeQLi` enabled field operations, tracking writes, bulk LPG and one day of proof visibility on the stable client demo. Paystack remains in test mode. To restore the previous demo settings, roll back to `dpl_GXGapwq4nWpKCfCJZ8GYQ88QGrfL`. The test order and audit history persist in the demo database. Commercial production remains NO-GO.

[Hosted sandbox order evidence](../releases/20261117-holistic-qa/paystack-demo-order.txt)

## 17 November responsive Incidents rollout

Source `59eb8a7` is on `codex/cinematic-customer-onboarding`. Deployment `dpl_54faTTn8ihHpn3UXcMnscHY9p8uU` carried the responsive layout to the stable demo alias. Chrome and Firefox at 320–1920px verified the register and Actions popup without horizontal scrolling. The deployment carried field operations, tracking writes, bulk LPG and one-day proof visibility. Paystack reports test mode and the verified synthetic order remains delivered.

The rollout used deployment-specific fulfilment overrides. The project defaults documented below now carry those settings forward. Roll back to `dpl_GfJyTjpgWKXz1a4wnmgzwjsSeQLi` to restore the prior layout with the same fulfilment settings. Commercial production remains NO-GO.

[Deployment evidence](evidence/redeploy-20261117-incidents-responsive.txt) · [Incident traceability](../traceability/operational-incidents-rtm.md) · [GitHub Release validation](https://github.com/Onaopemipo/easygasng/actions/runs/44003844326)


## Persistent demo fulfilment

The `easygas-client-demo` project's Production slot now defines `EASYGAS_FIELD_OPERATIONS_ENABLED=true`, `EASYGAS_TRACKING_MUTATIONS_ENABLED=true`, `EASYGAS_BULK_LPG_ENABLED=true` and `EASYGAS_PROOF_RETENTION_DAYS=1`. The previous Preview values and existing Paystack sandbox configuration carry forward. The standard demo deploy command inherits these project settings.

Deployment `dpl_EbG8KzgKKLA4FqVNm4qCbqs2ctof` was built without per-deployment overrides and promoted after readiness and sandbox checks. The alias confirmed runtime fulfilment, the delivered synthetic order and Incidents sizing at 320 and 1440 px. Roll back to `dpl_54faTTn8ihHpn3UXcMnscHY9p8uU` to restore the prior Ready build with its equivalent runtime settings. Future builds still inherit the project defaults after a deployment rollback.

[Configuration and hosted verification](evidence/20261117-demo-fulfilment-defaults.txt)

## 18 November mobile dependency security repair

Source `e658126` replaces vulnerable mobile glob matchers with an exact reviewed security fork. GitHub's native job passes the unchanged moderate audit, and local iOS/Android exports and dependency regressions pass. GitHub Release validation run [44191246673](https://github.com/Onaopemipo/easygasng/actions/runs/44191246673) passed both jobs, including 738/738 web tests with zero skips, web build and TypeScript.

Deployment `dpl_DL5z6veUhAVM5YaTYnMkePtLA3wr` is Ready at the stable demo alias. It inherited the permanent project settings without per-deployment overrides. Authenticated hosted checks confirm field fulfilment, tracking writes, bulk LPG, one-day proof visibility and the paid/delivered synthetic order. Paystack remains in test mode. Incidents fits at 320 and 1440 px, and Finance retains read-only actions.

To roll back this web deployment, promote `dpl_3iL3ow2UTkPmy1qveM5qSuhvcqSe` in the same project and repeat readiness and sandbox checks. No schema migration or installed phone replacement was performed. Commercial production remains NO-GO.

[Repair traceability and release evidence](../traceability/mobile-dependency-audit-rtm.md) · [Reviewed dependency](../security/mobile-glob-review.md)

## 18 November wallet order checkout rollout

Source `2224688` passed [fresh web and native Release validation](https://github.com/Onaopemipo/easygasng/actions/runs/44228881958), including 743/743 web tests with zero skips. Ready deployment `dpl_Dgvn7MrBfRpp3f42tXi6A4CBXEhu` serves the stable demo. It was built without per-deployment environment overrides; the permanent fulfilment settings above and Paystack sandbox mode were verified after promotion.

Wallet spending is enabled for Lagos through the governed `wallet.enabled` setting, approved by owner request `bbe2f535-341a-4e62-ba4d-aade1392a82d`. This lives in the demo database and persists across deployments. Card, Cash on delivery and Wallet are selectable at checkout, with the authenticated own balance. Hosted 390/1440px payment choices, access controls and Incidents layout passed.

To roll back the web build, promote prior Ready deployment `dpl_D9DFNiZmeSEmTuq8QrnkCtSCp7oY` in the same demo project and repeat readiness, fulfilment and sandbox checks. No schema migration occurred. A web rollback does not reverse the audited wallet setting or any payment/order records; use the normal governed workflow for future setting changes.

The additional hosted funded-wallet order probe was not completed: sandbox funding stayed pending without a checkout URL or credit. No test card was entered and no second charge was initialized for that reference. Actual wallet payment and the matching paid EasyGas invoice were verified using disposable PostgreSQL browser and installed iOS orders. Installed Android and remaining native variants are open. Commercial production remains NO-GO.

[Requirements and coverage](../traceability/wallet-order-rtm.md) · [Executed evidence and limitations](../traceability/wallet-order-evidence.txt)


## Driver SaaS release — 18 November2026

Explicit user authorisation covered native correction, Android checks, push and demo deployment. Source882c08d on codex/driver-saas-redesign; both fresh Release validation jobs passed. Candidate dpl_EaXJRaDgh8ocgWnPuH18TN2EqkX3 was built from a clean committed archive with no environment overrides, verified Ready/test mode/fulfilment, then promoted to the stable alias. Previous Ready dpl_Dgvn7MrBfRpp3f42tXi6A4CBXEhu is retained for web rollback.

[Release evidence](../driver-saas-redesign/07-header-android-demo-release.md) records native build/UI checks, CI, hosted six-width driver views, Incidents and checkout smoke results. Permanent Production defaults retain EASYGAS_FIELD_OPERATIONS_ENABLED=true, EASYGAS_TRACKING_MUTATIONS_ENABLED=true, EASYGAS_BULK_LPG_ENABLED=true, EASYGAS_PROOF_RETENTION_DAYS=1. Sensitive values were not exposed by env pull; authenticated candidate and stable runtime configuration confirmed Paystack environment test and available. No live keys or operational data were changed. Native binaries remain local QA builds; physical-device/production acceptance and historical import hold remain separate.


## Driver assignment alert correction — 18 November 2026

Source `47aa471` passed [fresh web and native Release validation](https://github.com/Onaopemipo/easygasng/actions/runs/44304026095):754/754 web tests with zero skips, build/types and both audits with zero vulnerabilities; native types and three dependency checks passed. Native export was skipped by the push workflow.

Ready candidate `dpl_Fodr4MdgFR2C7HYyMQR4qBM8kqfA` was built from a clean committed archive without environment overrides, runtime verified, then promoted to the stable demo. First assignments now produce an atomic private driver alert; the owner order popup exposes canonical next steps and failed-save feedback. The driver badge refreshes using existing approximately30-second/focus polling. Hosted read-only checks passed for the owner dialog and390px driver bell/privacy/fit. Reported order EG-2026-7BB8640B remained Placed, payment verified, driver null, no attempt/version1; it was not assigned by verification.

Permanent fulfilment/tracking/bulk defaults remain true, proof visibility one day, Paystack available/test and email/background jobs OFF. Rollback is previous Ready `dpl_EaXJRaDgh8ocgWnPuH18TN2EqkX3`, followed by readiness/fulfilment/sandbox checks; no schema migration or reversal of operational/financial records. Commercial production NO-GO, physical/provider acceptance and import hold remain.

[Requirements, evidence and limitations](../traceability/assignment-notifications-rtm.md) · [Release record](../assignment-notifications/evidence/release.txt)


## Driver web trips and guarded delivery — 18 November 2026

Source `c5bf616` passed [fresh web and native CI](https://github.com/Onaopemipo/easygasng/actions/runs/44310710756):756/756 web tests with zero skips, web build/types, native types/three dependency checks and both audits at zero vulnerabilities. No native bundle export or installed binary was built in this web phase.

Clean candidate `dpl_BG7raiYJy745co8FUCzaQjWnD4Qg` was runtime verified and promoted without environment overrides. Home/Profile now expose the existing own-trip start/end/consent controls. Driver Orders also exposes the existing guarded acknowledgement, manifest pickup, departure, arrival, proof and full handover path, plus failure/help. Actual complete and exception browser workflows passed against disposable local PostgreSQL. Hosted Home/Profile controls/branch vehicles/default consent and320/390/1440px fit passed without operational writes; EG-2026-7BB8640B remained Placed, verified payment, driver null/no attempt/version1.

Permanent fulfilment/tracking/bulk defaults remain true, proof retention one day, Paystack available/test and email/background jobs OFF. Rollback: previous Ready `dpl_Fodr4MdgFR2C7HYyMQR4qBM8kqfA`, followed by runtime checks; no migration or reversal of operational/financial/notification records. Commercial NO-GO and physical/provider/import holds remain.

[Requirements, evidence and operating flow](../traceability/web-driver-trips-rtm.md) · [Release record](../web-driver-trips/evidence/release.txt)
