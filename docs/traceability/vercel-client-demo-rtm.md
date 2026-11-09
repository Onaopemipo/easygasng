# Temporary Vercel client-demo traceability

| ID | Scoped requirement | Status |
|---|---|---|
| VDEMO-01 | Separate temporary Vercel project and persistent isolated database | VERIFIED_COMPLETE |
| VDEMO-02 | Usable branded web demo and synthetic test access | VERIFIED_COMPLETE |
| VDEMO-03 | Preserve production/import/retention decisions and document teardown | VERIFIED_COMPLETE |

3/3 bounded temporary-demo requirements and gates passed on the actual hosted URL; this is not whole-application or production acceptance. [Detailed source, data, security, named tests and evidence](vercel-client-demo-rtm.json), [deployment/access/limits runbook](../deployment/vercel-client-demo.md). Seven local checks plus hosted VDEMO-HTTP01 pass; real browser cart addition/owner sign-in/services verified. All prior production NO-GO, real-import confirmation, retain-all and native-build decisions remain.

## 9 November redeployment continuation

User authorised pushing all source changes and updating the linked client demo. Git destination: `https://github.com/Onaopemipo/easygasng.git` (empty remote). Deployment `dpl_yZaERKondML9nt2b8FkMjfV8uXxT` is READY at https://easygas-client-demo.vercel.app. Cloud compilation/TypeScript and hosted sign-in, identity, access rejection, catalogue and no-index checks pass. Evidence: `docs/deployment/evidence/redeploy-20261109-build.txt` and `redeploy-20261109-hosted.txt`. Database migration verification and Git push pending; phase PARTIAL until recorded. Production NO-GO, import hold, retain-all policy and live/provider/native restrictions remain.

Migration evidence: encrypted backup authenticated/archive-readable (no restore performed); migrations070/071/072 applied to the dedicated demo only. Counts preserved:12users,2orders,0wallet entries. See `redeploy-20261109-migrations.txt`. Mobile bundle export now requires a manually authorised workflow input, preserving the user's deferred mobile-build instruction; source type checks remain automatic. Git push pending.
