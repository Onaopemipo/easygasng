# Client demo release — 10 November 2026

Target: existing linked Vercel project easygas-client-demo, https://easygas-client-demo.vercel.app and GitHub Onaopemipo/easygasng main. Approved scope is pushing pending source and deploying the client demo; not commercial production activation or a native binary build.

Includes Approval Centre pagination, individual staff privileges/migration075, credit/refund customer quick search, report empty-state cleanup and the documented partial technician workspace extension. Existing grouped navigation, customer/driver/technician identities, financial histories and production NO-GO remain. The map remains the existing explicit placeholder; a map integration was not implemented by this release.

Preflight: 26 current focused tests pass; web/mobile typechecks pass. Existing phase build and focused/real-PostgreSQL evidence is retained in the corresponding matrices. The broader staff-phase run passed625 with22 environment-dependent skips, followed by final identity-binding tests. No requirement is dropped or upgraded solely because of deployment.

Release state and post-deployment evidence will be recorded after the deployment completes. Dedicated demo target identity is checked before additive migration075. An encrypted pre-migration backup is required and verified. No credentials or local data/backup files are included in the source upload. No account password reset, privilege grant, provider activation or business setting application is authorised by this release.

## Completed deployment

Source revision: c95d7a1f783338b348bcdfb2fe5d4ebf9466f64a, pushed to origin/main. Vercel deployment dpl_FAAVDRFFFLZZJ8HPTMY2SDZiarNt is Ready and aliased to https://easygas-client-demo.vercel.app. Migration075 completed against the verified dedicated demo after an encrypted backup was created and verified with the matching PostgreSQL18 toolchain and certificate verification. Retained user/order/payment/wallet/stock counts are unchanged; no privilege overrides were introduced.

Hosted DEMO-REL-HTTP01 passed: homepage demo notice/noindex, owner/customer sign-in retaining identities, real paged approvals and nonoverlapping page2, current privilege catalogue, customer-search results and denial of customer access to staff/technician/administrative APIs. Browser verification shows the deployed Approval Centre and Page2 with19 actual records (10 +9). Evidence is in evidence/hosted-tests.txt, deployment.txt and hosted-approvals.png.

GitHub Actions Release validation for this source revision is still in progress at the final recorded check: https://github.com/Onaopemipo/easygasng/actions/runs/42770760381. This is not recorded as a CI pass. Documentation/evidence follow-up changes do not alter the deployed runtime. Native source is pushed; no native binary was built. Existing technician partial scope and all commercial production NO-GO gates remain unchanged. Embedded-map integration remains unimplemented.
