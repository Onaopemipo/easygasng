> **Current 5 November continuation:** local TLS/SMTP defects were fixed and regression-tested. Actual deployment/provider acceptance remains open. Use [the current task register](production-completion-tasks-20261105.md) and [report](production-completion-20261105.md); historical entries below are retained.

> Current continuation status: migrations050/051 and partial operations functionality are described in [the current report](../reports/post-meeting-implementation-report.md) and [operations runbook](../operations/operations-completion-runbook.md). Earlier entries below are retained history. Production NO-GO and Excel import hold are unchanged. Public visual guard checks passed after unlock; authenticated/device acceptance is still outstanding.

# Post-meeting blocker and dependency-aware task register

NO-GO remains. Missing engineering is READY, not falsely labelled an external blocker. No new policy/provider is implied by the brief.

| ID | Severity / status | Affected scope | Dependency / owner | Safe continuation / next step |
|---|---|---|---|---|
| PM-B01 | Critical / BLOCKED | Live payment links/callbacks/refunds | Client: provider selection, credentials, sandbox and explicit activation | Implement neutral contracts while disabled; do not connect a provider |
| PM-B02 | High / BLOCKED | Live SMS, OTP and official WhatsApp | Client: approved provider/account, sender, templates/consent and credentials | Engineer hashed challenge, outbox adapter and sandbox tests; no real sends |
| PM-B03 | High / READY | Progressive activation/reorder | Engineering: PM-R02 | Build possession-gated state machine against existing identity; no duplicate account |
| PM-B04 | Critical / READY | Invoice lifecycle and service invoices | Engineering + finance: PM-R03/11, approved legal/tax/partial-payment policy | Add linked corrections and work gating; never edit issued balance |
| PM-B05 | Critical / READY | At-door amendment/van stock | Engineering: visit/van/custody model then PM-B04 | Keep feature disabled until stock, capacity, consent/payment/idempotency pass |
| PM-B06 | High / READY | Dispatch/driver statuses/connectivity | Engineering: active trip/vehicle and allocation model | Preserve existing assignment controls; implement recommendations/acknowledgement |
| PM-B07 | Critical / READY | Secure proof-photo history | Engineering: object scanning/access/retention/consent policy | Implement append-only storage and authorised latest pointer; never replace history |
| PM-B08 | High / BLOCKED+READY | Background GPS/offline evidence | Engineering and client: signed devices, permission/provider/privacy policy | Implement queue/conflict states; hardware/provider acceptance separately blocked |
| PM-B09 | High / READY | Odometer/fuel accounting | Engineering: trip/vehicle schema and approved rate | Record actual purchases separately from estimates; no invented travel |
| PM-B10 | High / READY | Dormant CRM and channel win-back | Engineering: segmentation/events; client approved thresholds/budget/consent | Build real-history CRM while outbound delivery stays disabled |
| PM-B11 | Critical / OPEN DEFECT | Production TLS and SMTP retry | Existing audit AUD-01/AUD-02; engineering | Existing reproduction tests still pass by reproducing defects; they are not fixes |
| PM-B12 | High / NOT_TESTED | Native signing, device and accessibility | Client release identity/devices plus engineering tests | Typecheck is not device acceptance; preserve driver/technician nav |
| PM-B13 | Critical / BLOCKED | Production hosting/restore/release | Client/operator independent approval; local hosting selected | Use disposable databases for tests; no production deployment |

Dependency graph in words: identity → activation → authorised self-service; order → invoice/revision → amendment/payment/service work; vehicle/van/trip → safe dispatch/amendment/GPS/fuel; proof storage → evidence pointers/offline upload; real events+purpose consent → CRM messaging. Unrelated design, typed contracts and isolated tests can continue through provider blockers. All READY work remains outstanding; this register does not claim the attached brief is done.
