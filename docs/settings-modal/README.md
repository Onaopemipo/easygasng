# Settings change editor

The long generic settings dialog is now a compact editor followed by review. The title names the setting. Branch, version and approval status stay above the tabs; actions stay below a single scrolling body.

Staff access uses an existing account email lookup, readable name/email and current role, a role selector and the assigned branch. The review shows current and proposed roles. Raw account IDs remain internal. Payment settings use Checkout / Fees / Wallet / Review; EasyRewards uses Points / Services / Offers / Review. Offers expand individually. Scheduling is optional and collapsed. Save draft reviews an inactive draft; it does not activate a change.

Choose **Review change**, check the values and reason, then confirm using the final action. Review does not submit. If the server requires recent identity verification, the same review asks for the password and then retries the unchanged proposal. Failed verification preserves the draft. Cancel, close and Escape use the existing discard confirmation; closing is blocked during a write.

Server role/branch permissions, independent approval where required, single-owner automatic approval eligibility, version checks, scheduling and activation controls remain authoritative. No approval policy has been relaxed. The Approval Centre outer layout is unchanged; its draft/revision editor reuses the same configuration flow.

[Traceability](../traceability/settings-modal-rtm.md) · [Audit](AUDIT.md) · [Browser acceptance](evidence/browser-checks.json) · [Authoritative local readback](evidence/browser-api-confirmation.json).

The initial broad run executed 1,081 tests: 1,051 passed, 28 skipped and two historical source-fidelity checks failed because the approved UI files changed. Both checks were updated to validate an explicit continuation against the unchanged original baselines and passed in the focused rerun. The initial log is retained as history. The skipped PostgreSQL/device/operational cases are not claimed as settings acceptance or production readiness.

Final demo deployment and browser verification are recorded below. No mobile build/export/install is part of this phase. Production NO-GO, actual-import hold and retain-all remain unchanged.

Post-promotion UI verification caught a demo-specific overlap: the fixed synthetic-data notice covered the bottom edge of the settings footer. The first release’s passing API results and UI defect are retained under `evidence/release/initial-5d7ca4b/`. The follow-up reserves notice space without hiding or changing that notice; actual local bounds pass at 1280×720, 390×844 and 320×568. The final follow-up cleared SMOD-G06 through stable browser verification.


Verified demo release: source `3aa98df5a422eb67cb5de61eec209f3a117f731d`, Ready `dpl_84mTYGPNbPFoQYtoFjrU5ZSZxmbz`, promoted to <https://easygas-client-demo.vercel.app/admin/settings>. All 428 actual upload files match committed source bytes; private data, mobile source/binaries, prototypes, tests and operator files were excluded. Candidate and stable each passed 20 six-role hosted checks. All 77 settings, 42 approval requests, staff roles, orders, inventory, ledger, published policies and NO-GO gate snapshots match the original before-state.

Actual stable UI passed desktop 1280×720 and phones 390×844 and 320×568. Footer/notice bounds and screenshots are in [stable browser evidence](evidence/release/stable-browser.json). An initial read-only CLI connection timeout was retained; a fresh read-only rerun passed. No hosted proposal or financial/access mutation was submitted. All four original native artifact hashes, sizes and modification times remained identical. No mobile binary/export/install was created.

All six phase requirements and gates are verified within this bounded scope. The existing Approval Centre outer layout and untested business-setting/device/provider journeys are not claimed as new acceptance. The master production decision remains NO-GO, with actual-import hold and retain-all unchanged.

[Updated manual task instructions](../user-manual/settings-change-update.md). Original PDF/Word editions and historical prototype bundles remain unchanged. Rollback identifiers: immediate prior `dpl_BRcpYnw78Z9AT3G6QnayiNNDTSG5` (initial UI overlap recorded); pre-phase verified release `dpl_6T2z5s4xnjmpeWMBfwTgMoMZUhaw`. No database migration was part of this phase.
