# Smart Refill client demo deployment

Vercel deployment `dpl_62q4HyhJVVKC5z2Fb8K9rbdmQ7gT` is READY and serves the stable [Smart Refill demo](https://easygas-client-demo.vercel.app/refill). The deployed source is [commit c01270c](https://github.com/Onaopemipo/easygasng/commit/c01270c97eeb794135b6a819ce7a199d0b55c540) on `codex/smart-refill-demo`.

The isolated release contains Smart Refill and its shared Cooking Gas Profiles implementation. Other pending workspace changes were excluded. Vercel used the existing demo settings and database. No database migration, live provider activation, native publication or operational production release took place.

| Verification | Result |
| --- | --- |
| Isolated release build and web/native typechecks | Passed |
| Focused tests with PostgreSQL | 19 passed, including concurrent profile writes and verified offer eligibility |
| Full isolated release suite with PostgreSQL | 683 passed, two failed and zero skipped. Both failures reproduced on unchanged baseline `54b1b15` |
| GitHub Actions | Native passed. Web failed in the test step. See the [release validation run](https://github.com/Onaopemipo/easygasng/actions/runs/43204950582) |
| Vercel candidate | Cloud build passed. The guarded guest API returned 401 and the page retained demo and no-index markers |
| Stable Vercel alias | Signed-in desktop and 390 px browser checks passed. The profile count matched the API, the creation dialog opened and closed, and Cooking Gas Profiles remained a separate route. Anonymous access returned 401 and a synthetic owner received 403 |

The baseline failures were legacy matrix files without a `gates` array and the reviewed Technician Workspace hash mismatch. The 699-test result in the local implementation report was from the shared worktree, which includes changes outside this release. Hosted QA did not submit a refill profile or supply report. The normal minified Android startup and public production remain **NO-GO**.

See the [hosted check log](evidence/demo-hosted-smoke.txt), [isolated test totals](evidence/demo-release-tests.txt) and [requirements matrix](../traceability/smart-refill-redesign-rtm.md).

The [replacement validation run](https://github.com/Onaopemipo/easygasng/actions/runs/43241741135) passed on repair commit `5cf28ca`. The web job passed 685 tests, build, typecheck and dependency audit. The native job passed. The repair was limited to CI, tests and documentation.

## Demo rollback

Promote the previous READY deployment `dpl_4VZSSkf2vQ8vrZugcaEKTnDeoPEw` in the `easygas-client-demo` project. Confirm the stable alias points to it and rerun signed-in customer checks. The rollout introduced no schema changes or data backfill.
