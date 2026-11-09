# Dependency-aware task and blocker register

| ID | Dependency / gap | Classification | Independent work | Closure |
|---|---|---|---|---|
| PS-B01 | Test merchant key/webhook secret and merchant dashboard access | External, sandbox E2E BLOCKED | Typed adapter, deterministic fixtures, raw signature tests, orchestration | Official sandbox transaction evidence, no mocked results claimed as provider transactions |
| PS-B02 | Merchant fee schedule, channel eligibility, dashboard automatic pass-through setting, wallet eligibility and legal/business sign-off | External/business, customer-fee/live activation BLOCKED | Generic integer fee solver, immutable policy interface, absorbed fixtures | Dated merchant-approved version, permission and double-charge check |
| PS-B03 | Existing payment core lacks attempts/events/refunds/settlements | Engineering | Additive disabled schema, current ledger adapters, tests | Atomic verified posting/concurrency/crash/role tests |
| PS-B04 | Original whole-app P0/custody/capacity/session/native offline gates | Existing engineering/verification | Isolated provider work and regression | Existing gate evidence retained; no production activation |
| PS-B05 | Real messaging/template/SMTP delivery | External + existing engineering | Existing outbox integration, failure/consent tests | Actual configured delivery, no queued=delivered claim |
| PS-B06 | Staging restore/independent finance/owner/operations sign-offs | Operational/business | Document schema/application rollback, reconciliation and state ownership | Independent restore/rollout/signed approvals |

No credentials are requested in chat. Configure server-only test credentials through local secret management when available; live keys remain unsupported until separately authorised. Do not stop fee/adapter/core engineering because sandbox access is absent. Every remaining82-scenario and26-gate item stays in scope and denominator.

## Engineering register after sandbox foundation work

| Task | State | Dependencies | Next independently executable work |
|---|---|---|---|
| Fee solver, adapter, raw webhook, atomic ledger posting |Implemented; bounded deterministic evidence passed|Merchant acceptance still separate|Additional failure/provider payload/channel fixtures|
| Existing issued invoice/web/mobile/wallet/service quote payment controls |Partial|Test account for actual hosted E2E; engineering for complete flows|Progressive profile and full service invoice; no bypass of existing approvals|
| Original product/gas/mixed checkout Paystack selection and governed invoice creation |Not implemented|Existing stock/cylinder/capacity/readiness; approved automatic issuance policy|Extract trusted shared invoice issuance, preserve manual issuer permissions, add checkout tests|
| Assisted phone profile/link workflow |Partial existing secure link integration|Configured official messaging and secure activation|Verify once-only profile/forwarded-link journey end-to-end|
| Doorstep supplemental obligation/payment |Not implemented; original commit hold retained|Actual vehicle stock/custody, same-visit policy, approved supplemental invoice|Implement and test canonical amendment commit; never substitute branch stock|
| Provider full/partial refunds and reversal/chargeback control |Not implemented; legacy provider refund fails closed|Merchant refund/fee policy and independent existing approvals|Add immutable request/attempt/final-status allocation and wallet liability holds before funding activation|
| Settlements/payouts/dispute matching |Not implemented|Provider account and actual settlement evidence|Adapter/paging/cursors/exception resolution; sandbox cannot prove actual bank settlement|
| Finance collections UI/limited CSV |Implemented, interaction/theme acceptance unexecuted|Existing finance branch authorisation|Full filters/pagination/exports and authorised exception resolution|
| Customer receipt PDF |Implemented from verified posting, shared renderer; visual acceptance outstanding|Committed canonical principal/posting|Native document history/download and receipt snapshot/notification completion|
| Production-like recovery, worker leases/alerting, native signed/device acceptance |Partial/unexecuted|Staging target/signing identities, configured provider|Retain all existing release gates; exercise actual crash/restore and role/theme journeys|

No task above is silently removed. Missing credentials do not explain unfinished engineering. Production remains NO-GO.
