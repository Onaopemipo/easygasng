# Admin dashboard blockers and dependency register

Production remains **NO-GO**. No deployment, actual Excel import, paid provisioning, credential reset, provider activation or store release was performed. This phase is PARTIAL overall.

| ID | Severity / outstanding work | Dependency and safe continuation |
|---|---|---|
| ADM-B01 | P1 — full visual acceptance against the approved reference, all populated charts/table pages and supporting screen variants | Local engineering/QA can continue with disposable role-scoped fixtures; do not seed illustrated customers or numbers into user data |
| ADM-B02 | P1 — complete keyboard/contrast/200% zoom/system-theme no-flash and assistive-technology acceptance | Local QA independent of hosting. Mobile drawer focus, responsive inspection and light/dark were checked; no broad accessibility certification |
| ADM-B03 | P1 — production-size dashboard/search load/EXPLAIN and measured HTTP rate-limit acceptance | Isolated production-shaped database; no unmeasured indexes/migrations added. Bounds and SQL isolation already implemented |
| ADM-B04 | P1 — all-role browser E2E, populated deep-link back/forward, notification destinations beyond orders, full refresh/event-reconnect acceptance | Existing API negatives/regressions pass; role-scoped browser fixtures and event instrumentation can proceed locally |
| ADM-B05 | P0 — existing driver/technician legacy unrestricted cash-session cutover; technician encrypted offline/revocation/evidence recovery and physical safety gates | Existing dedicated restricted shells remain; require independent engineering/operational acceptance. Dashboard work does not close these prior blockers |
| ADM-B06 | P0 — prior doorstep commit/inventory/custody/invoice/dispatch/CRM integration gaps from post-meeting scope | Continue existing modules; see post-meeting and production-completion reports. Do not create replacement ledgers |
| ADM-B07 | Release dependencies — Namecheap VPS not provisioned, production secrets/TLS/SMTP/providers, signed native/device/store and restore/RTO/RPO acceptance | Business/operations environment access and approvals; local engineering/testing above can continue |
| ADM-B08 | Explicit data hold — ambiguous payment records, stock balance, historical delivery fees and customer matches | Customer confirmation required before actual Excel import. Preview remains separate; no import approval inferred |

No requirement disappears from coverage because blocked. Existing reports and phase IDs remain authoritative; this table is not a replacement whole-platform completion score. No lint command exists in this repository: NOT_AVAILABLE, not PASS.
