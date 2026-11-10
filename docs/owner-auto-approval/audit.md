# Owner automatic approval scope — 10 November 2026

User explicitly supersedes the independent-review requirement for requests submitted by the Business Owner (the screenshot account). Technical administrator remains a separate limited role. This phase extends the existing change_requests/activation workflow; it does not invent a new approval store or mark payments verified.

Implement a server-configured owner-request policy, immutable audit evidence bound to requester/revision/base version, scheduled activation and existing pending-request action. Default policy remains OFF for backward-compatible existing installations; enable it for the authorised client demo rollout. Non-owner requests retain the existing independent approval policy. Validation, recent identity verification where required, current authority, branch, stale-version, expiry, customer agreement/payment/safety/stock restrictions remain enforced at activation. Drafts stay drafts; old pending records require an explicit owner action, not a GET-side mutation or bulk backfill.

Traceability: OWNER-AUTO01 new/draft/rollback submission; OWNER-AUTO02 existing pending UX and state messaging; OWNER-AUTO03 authority/negative/activation safeguards. Production NO-GO and historical import/retain-all/native/server decisions preserved.

Repository audit confirmed every governed request is created through existing propose(); emergency disabling is already immediate and unchanged. Inventory operation metadata needs its request_id bound before automatic activation, so internal-only deferred activation is used inside that same transaction. Independent qualified safety review is modelled separately from the new automatic owner authority, rather than silently removing it.
