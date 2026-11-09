# Technician blockers and dependency-aware task register

6 November 2026. Production NO-GO, prior whole-app P0s and Excel migration hold remain. All74 scenarios/23 gates retained.

| ID | Gap | Type / dependency | Work that can continue | Closure evidence |
|---|---|---|---|---|
| TF-B01 | Durable encrypted technician photo/job queue, causal replay, revocation/crash/storage recovery | Engineering; reuse field-queue/SecureStore after technician-specific policy | UI/read/API regression/docs | T58–T66 device failures/retries and no double effects |
| TF-B02 | Remaining populated-job interaction, small/large screens and assistive technologies | Verification; preview resumed after unlock and four final captures completed | Automated tests, docs/build | Actual final-build captures and native scenarios; no seeded production data |
| TF-B03 | Physical camera denial/upload, background/process death, sensitive evidence sign-out retention | Device/engineering, depends B01 for replay | Existing server guards/tests | Device recordings plus private storage/audit evidence |
| TF-B04 | Signed production iOS/Android, hosting/TLS/providers and operational drills | Release/external plus prior engineering gates | Local build/regression and release preparation | Existing launch gate sign-offs, never inferred from simulator build |
| TF-B05 | Legacy unrestricted field-session financial cutover and prior safety controls | Existing P0 business/security engineering | Scoped technician reads, UI, negative tests | Previously required migration/cutover and finance/physical-safety evidence |
| TF-B06 | Independent restore/rollback rehearsal | Operational verification | Preserve source archive and no-schema rollback instructions | Independent operator/test restore result |
| TF-B07 | Orange hero/avatar/staff-code authority | Visual/data source; approved existing green-cylinder + initials fallback used | Existing screens remain usable | Approved source assets/identity fields; never fabricate TECH-014/avatar |

B01/B03/B05 are not merely missing credentials or external blockers. No paid services, real customer notifications, data import or production rollout authorised by this report. Final source edits preserve prior modules; Home photo/report routes currently open the complete selected workflow rather than section-focused scroll.

## 6 November production continuation

TF-B01 now has implemented encrypted technician mutation/photo persistence and receipt-first replay in the existing field store, plus version/assignment conflict holds and a pending-records UI. Production role scope applies to legacy tokens too. Native export and fresh iOS simulator build passed; bounded recovery/negative tests passed. B01/B03 remain PARTIAL for actual filesystem/process-death/camera/background/signed-device acceptance and offline snapshot/review UX. No prior scenario/gate removed. Current evidence: docs/production-completion/evidence/; matrix: production-end-to-end-rtm.json. Mac unlocked: fresh simulator installation, isolated demo sign-in and Home/Jobs/Profile navigation passed. Actual queued-photo/process-death/background/physical-device acceptance is still outstanding.
