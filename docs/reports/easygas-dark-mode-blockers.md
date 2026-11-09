# Dark mode blockers and safe continuation

See the [full blocker register](easygas-homepage-blocker-register.md) and [dependency register](easygas-homepage-task-register.md). Local theme implementation and representative browser verification are complete. Production remains NO-GO.

| ID | Severity | Cause / affected scope | Safe restriction | Owner / next step |
|---|---|---|---|---|
| FIELD-PERFORMANCE | P1 | No field metrics or exposed browser timing API; performance acceptance | Do not claim measured LCP/INP/CLS or production certification | Release owner: measure on approved staging/production tooling |
| PG-CONCURRENCY | P1 | Real PostgreSQL concurrency acceptance not executed | Keep the production gate blocked | Infrastructure owner: provide disposable PostgreSQL and run the race suite |
| HOSTED-DB | P1 | User chose local development after free-project quota exhaustion | No hosted migration/deployment | Business owner: approve a runtime separately |
| OS-EMULATION | P2 | Physical OS theme change not exposed by browser tooling | Keep TH-07 partial; explicit themes work | Target-browser QA: verify System on an approved device |
| LOGO-REVERSE | P3, SAFE_ALTERNATIVE | No separate official reversed wordmark supplied | Preserve the original HD asset on a light plate; never invert it | Brand owner may supply an official variant |

These do not authorize changing provider connections, spending, disabling review, erasing records or manufacturing reviews. The light-only environment switch provides an independent appearance rollback; see the rollback runbook.
