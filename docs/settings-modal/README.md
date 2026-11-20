# Settings change editor

The long generic settings dialog is now a compact editor followed by review. The title names the setting. Branch, version and approval status stay above the tabs; actions stay below a single scrolling body.

Staff access uses an existing account email lookup, readable name/email and current role, a role selector and the assigned branch. The review shows current and proposed roles. Raw account IDs remain internal. Payment settings use Checkout / Fees / Wallet / Review; EasyRewards uses Points / Services / Offers / Review. Offers expand individually. Scheduling is optional and collapsed. Save draft reviews an inactive draft; it does not activate a change.

Choose **Review change**, check the values and reason, then confirm using the final action. Review does not submit. If the server requires recent identity verification, the same review asks for the password and then retries the unchanged proposal. Failed verification preserves the draft. Cancel, close and Escape use the existing discard confirmation; closing is blocked during a write.

Server role/branch permissions, independent approval where required, single-owner automatic approval eligibility, version checks, scheduling and activation controls remain authoritative. No approval policy has been relaxed. The Approval Centre outer layout is unchanged; its draft/revision editor reuses the same configuration flow.

[Traceability](../traceability/settings-modal-rtm.md) · [Audit](AUDIT.md) · [Browser acceptance](evidence/browser-checks.json) · [Authoritative local readback](evidence/browser-api-confirmation.json).

The initial broad run executed 1,081 tests: 1,051 passed, 28 skipped and two historical source-fidelity checks failed because the approved UI files changed. Both checks were updated to validate an explicit continuation against the unchanged original baselines and passed in the focused rerun. The initial log is retained as history. The skipped PostgreSQL/device/operational cases are not claimed as settings acceptance or production readiness.

Demo deployment verification is recorded separately below when complete. No mobile build/export/install is part of this phase. Production NO-GO, actual-import hold and retain-all remain unchanged.
