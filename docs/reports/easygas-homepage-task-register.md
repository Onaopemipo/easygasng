# Dependency-aware homepage task register

Updated 2026-10-30. Production: **NO-GO**. Source: [JSON](easygas-homepage-task-register.json). Regenerate with `npm run tasks:homepage -- --write`. A task is runnable only when every dependency is DONE and it has no open blocker. Closing a blocker does not certify the affected task; BLOCKED tasks require reassessment before returning to TODO.

| Task | Status | Ready | Dependencies still open | Active blockers (including inherited) | Next step |
|---|---|---|---|---|---|
| PREFLIGHT | DONE | No | — | — | Preserve local-only constraints |
| DEPENDENCY-REGISTER | DONE | No | — | — | Use the register when reopening work; do not bypass prerequisites or treat closing a blocker as verification. |
| THEME | DONE | No | — | — | Maintain verified local implementation; release dependencies are tracked separately. |
| HOMEPAGE | DONE | No | — | — | Maintain verified local implementation; release dependencies are tracked separately. |
| TESTIMONIAL-SCHEMA | DONE | No | — | — | Maintain verified local implementation; release dependencies are tracked separately. |
| TESTIMONIAL-WORKFLOW | DONE | No | — | — | Maintain verified local implementation; release dependencies are tracked separately. |
| TESTIMONIAL-UI | DONE | No | — | — | Maintain verified local implementation; release dependencies are tracked separately. |
| LOCAL-QA | DONE | No | — | — | Rerun affected checks when implementation changes; production PostgreSQL and performance checks remain separate. |
| DOCUMENTATION | DONE | No | — | — | Maintain evidence and reassess only affected tasks after changes. |
| PG-ACCEPTANCE | BLOCKED | No | — | PG-CONCURRENCY | Execute the prepared TM-PG test on an explicitly enabled disposable local easygas_test database, then complete managed advisor/grant acceptance. |
| PRODUCTION | BLOCKED | No | PG-ACCEPTANCE, BUSINESS-ORDER-ACTIVATION | HOSTED-DB, PAYMENTS, FIELD-PERFORMANCE, PG-CONCURRENCY, GAS-POLICY | Resolve production prerequisites and rerun acceptance gates; no deployment authorised |
| BUSINESS-ORDER-ACTIVATION | BLOCKED | No | — | GAS-POLICY | Propose quantity policy and record available stock through existing approved business workflows, then run live-environment quote acceptance. |
| NATIVE-STORE-LINKS | BLOCKED | No | — | NATIVE-APP | Supply genuine published app links; keep the web-account CTA active meanwhile. |
| SYSTEM-PREFERENCE-CHECK | BLOCKED | No | — | OS-EMULATION | Verify an actual OS preference change while System is selected; unit resolution/listener implementation is already present. |

Open blockers are documented in [homepage blockers](easygas-homepage-blocker-register.md) and [dark-mode blockers](easygas-dark-mode-blockers.md). Independent local work continues while external production dependencies remain open.
