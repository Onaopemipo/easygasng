# Temporary Vercel client-demo traceability

| ID | Scoped requirement | Status |
|---|---|---|
| VDEMO-01 | Separate temporary Vercel project and persistent isolated database | VERIFIED_COMPLETE |
| VDEMO-02 | Usable branded web demo and synthetic test access | VERIFIED_COMPLETE |
| VDEMO-03 | Preserve production/import/retention decisions and document teardown | VERIFIED_COMPLETE |
| VDEMO-04 | Inherit demo fulfilment defaults and keep Paystack in sandbox mode | VERIFIED_COMPLETE |

4/4 bounded temporary-demo requirements and gates passed on the actual hosted URL; this is not whole-application or production acceptance. [Detailed source, data, security, named tests and evidence](vercel-client-demo-rtm.json), [deployment/access/limits runbook](../deployment/vercel-client-demo.md). Seven local checks plus hosted VDEMO-HTTP01 pass; real browser cart addition/owner sign-in/services verified. All prior production NO-GO, real-import confirmation, retain-all and native-build decisions remain.

Persistent configuration implemented and verified 4/4 demo requirements, including 2/2 critical requirements and 4/4 gates. Five runtime endpoints verified the persistent rollout. [Hosted evidence](../deployment/evidence/20261117-demo-fulfilment-defaults.txt).

## 9 November redeployment continuation

User authorised pushing all source changes and updating the linked client demo. Git destination: `https://github.com/Onaopemipo/easygasng.git` (empty remote). Deployment `dpl_yZaERKondML9nt2b8FkMjfV8uXxT` is READY at https://easygas-client-demo.vercel.app. Cloud compilation/TypeScript and hosted sign-in, identity, access rejection, catalogue and no-index checks pass. Evidence: `docs/deployment/evidence/redeploy-20261109-build.txt` and `redeploy-20261109-hosted.txt`. Database migration verification and Git push pending; phase PARTIAL until recorded. Production NO-GO, import hold, retain-all policy and live/provider/native restrictions remain.

Migration evidence: encrypted backup authenticated/archive-readable (no restore performed); migrations070/071/072 applied to the dedicated demo only. Counts preserved:12users,2orders,0wallet entries. See `redeploy-20261109-migrations.txt`. Mobile bundle export now requires a manually authorised workflow input, preserving the user's deferred mobile-build instruction; source type checks remain automatic. Git push pending.

Final bounded push/deploy status: **VERIFIED_COMPLETE**. Initial source commit `5e5b2e0` confirmed on remote main. Hosted post-migration checks pass: owner/customer document library200, customer wallet funding200, owner wallet funding403 (customer-only control), owner dispatch centre200. Evidence `redeploy-20261109-features.txt`. Vercel cloud build READY and original hosted isolation suite1/1pass. Final evidence documentation pushed separately. This completion applies only to requested source push/demo deployment, not the broader production or feature acceptance gates; CI completion is not claimed. Presentation rollout defaultOFF and verified bank destination remain explicit configuration dependencies.

## 21 November fresh hosted continuation

[Current acceptance](role-order-acceptance-20261121-rtm.md) verifies all 11 bounded requirements/gates using fresh synthetic orders and existing accounts, including actual driver trip/assignment, gas/COD delivery, independent return/retry, refunds and invoice review. Final source `eb3913e`, Ready `dpl_Gci51BMxmVPk4mPU8gK9DQhgxsiZ`, 439 exact application files and CI 1,162 web tests plus 3 native dependency tests passed; no new mobile binaries. This historical matrix retains its original IDs, coverage and scope decisions. Broader production/native/physical/provider/import/retain-all gates remain unchanged.

## Fleet password recovery - 22 November Brisbane

[Current verification matrix](fleet-verification-rtm.md) closes four bounded gates. Actual desktop/phone, wrong-password retention and one verified QA save passed; existing22orders, ledger, inventory, vehicles and trips preserved. Final `dd5bbc7` / Ready `dpl_4itAxT5TKq2UPro9Z8FeYAVEu3hJ`,439exact app files; CI1,168web plus3native dependency tests passed, export skipped. Original requirement IDs/coverage and production NO-GO unchanged.

24November2026 continuation: [release evidence](../releases/20261124/README.md) and [PUB24 matrix](push-deploy-20261124-rtm.md) record exact-source fleet rollout at `c206b6c` / `dpl_59Y5HPQtW9ghk39TNku7J66fQgdq`,443remote source comparisons,1,226CIpasses/no skips and candidate/stable seven-role controls. Approved mobile icon source pushed only; no native binary or production gate change.
