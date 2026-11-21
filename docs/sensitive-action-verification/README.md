# Whole-web sensitive-action verification audit — 22 November 2026

The vehicle-only repair exposed a wider missing-recovery pattern. The shared `ActionForm` and custom components could correctly receive `403 REAUTH_REQUIRED` from the server but offer only an error. Existing settings, staff, account and operation forms already have some inline verification; those remain useful and unchanged.

The common web API client now offers a compact **Verify your identity** dialog whenever the server explicitly requires verification. It handles both mutations and protected reads (notably individual staff privileges). No verification field is added to ordinary actions that do not need it.

## Audit boundary and retained denominator

[Reproducible inventory](inventory.json) records **77 actual guard sites across 34 server modules**, **370 browser API/form entry points**, and **11 direct fetch sites**. `node scripts/audit-sensitive-actions.mjs` regenerates source locations. Every guard stays in the denominator, including conditional governance, delegated approval and recovery helpers. Context literals are discovery candidates, not a count of completed business workflows.

| Purpose | Audited guard families | Recovery |
| --- | --- | --- |
| Accounts and privacy | Account export, privacy requests, staff invitations and suspension, phone activation | Existing inline controls plus shared recovery |
| Staff and authority | Staff edits, availability, reinstatement, access and individual privileges; delegation and approvals | Shared POST and protected GET recovery; server authority unchanged |
| Payments and finance | Cash reconciliation, credit decisions, POS verification, invoices/corrections/payment requests, expenses and service settlements | Original amount, revision and operation identity retained |
| Inventory and catalogue | Product import, adjustments, stocktakes, quarantine/disposition, transfers, purchase approvals, compatibility and recommendations | Same branch, qualification and approval controls |
| Delivery and physical safety | Fleet/payload, dispatch destination, cylinder inspection, gas receipts/intake, manifests, bulk meter/loading/returns and material recovery | Existing fleet field retained; shared fallback for other guarded requests |
| Services and governance | Technician qualifications, dispute/cancellation reviews, service cash verification, emergency controls, readiness reviews | Verification cannot approve policy or safety evidence |
| Communications and rewards | SLA policy, mail retry/reconciliation, moderation, scheduled campaigns, reward exports/retries and jobs | Password verification does not enable providers or jobs |

The 11 separate fetch sites were reviewed: workspace/search/export reads, media uploads and hosted-payment endpoints. They do not call `recentVerification` outside the shared dispatch endpoint. Hosted checkout retains its separate consent/quote/provider controls. Ordinary API calls, including dynamic action names, all benefit from the shared recovery; this does not depend on a manually maintained sensitive-action allowlist.

## Request and security behaviour

1. The first request still reaches the normal server checks. Only explicit `403 REAUTH_REQUIRED` opens recovery. Network failure, role denial, validation failure and uncertain outcomes never cause a retry.
2. The dialog has a required masked Current password field, Show password, Enter submission, Cancel/Escape, focus trapping and return focus. Password is cleared immediately on submission and never added to the business payload, operation key, queue metadata or browser storage.
3. Wrong passwords and verification throttling stay in the dialog. Cancel or page/account changes stop continuation. Only one password challenge can be outstanding; a second action is not queued for later execution.
4. **Verify and continue** verifies normally, checks the same account/role/branch/session, and sends the exact originally serialized request once. It preserves versions, monetary values and existing idempotency keys. Later edits do not alter the captured request.
5. The server compares an opaque session marker on the continuation request, closing a session-switch race between browser checking and dispatch. The marker is a SHA-256 comparison value with a separate namespace; it is not a session credential or a permission grant. Normal authentication, CSRF, role, branch and all business guards still run.
6. A second expiry or business rejection is returned to the original screen. No automatic loop, password persistence, arbitrary network replay, safety extension or privilege grant was introduced.

## Acceptance status

Focused suite: 26/26 passed, including actual rendered dialog/transport coverage for all77 inventoried rejection sites and actual service controls for all seven canonical roles. These are verification UX and security-boundary checks, not a rerun of all end-to-end physical/business workflows. Local fixture writes are isolated; production controls are retained.

Hosted candidate/stable release, browser acceptance, final full CI and manual screenshots are pending. See the [phase matrix](../traceability/sensitive-action-verification-rtm.md). Production NO-GO, external/provider/physical/signed-native gates, actual-import hold and retain-all remain unchanged. No new mobile binary/export/install is authorised or performed.
