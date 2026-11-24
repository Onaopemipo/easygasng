# Whole-web sensitive-action verification audit — 22 November 2026

The vehicle-only repair exposed a wider missing-recovery pattern. The shared `ActionForm` and custom components could correctly receive `403 REAUTH_REQUIRED` from the server but offer only an error. Existing settings, staff, account and operation forms already have some inline verification; those remain useful and unchanged.

The common web API client now offers a compact **Verify your identity** dialog whenever the server explicitly requires verification. It handles both mutations and protected reads (notably individual staff privileges). No verification field is added to ordinary actions that do not need it.

## Audit boundary and retained denominator

[Reproducible inventory](inventory.json) records **79 actual guard sites across 36 server modules**, **371 browser API/form entry points**, and **10 direct fetch sites**. `node scripts/audit-sensitive-actions.mjs` regenerates source locations. Every guard stays in the denominator, including conditional governance, delegated approval and recovery helpers. Direct password checks were also reviewed: sign-in, invitation/reset entry and account password change already have their own required password fields; account password change still requires the current password and revokes existing sessions. Context literals are discovery candidates, not a count of completed business workflows.

| Purpose | Audited guard families | Recovery |
| --- | --- | --- |
| Accounts and privacy | Account export, privacy requests, staff invitations and suspension, phone activation | Existing inline controls plus shared recovery |
| Staff and authority | Staff edits, availability, reinstatement, access and individual privileges; delegation and approvals | Shared POST and protected GET recovery; server authority unchanged |
| Payments and finance | Cash reconciliation, credit decisions, POS verification, invoices/corrections/payment requests, expenses and service settlements | Original amount, revision and operation identity retained |
| Inventory and catalogue | Product import, adjustments, stocktakes, quarantine/disposition, transfers, purchase approvals, compatibility and recommendations | Same branch, qualification and approval controls |
| Delivery and physical safety | Fleet/payload, dispatch destination, cylinder inspection, gas receipts/intake, manifests, bulk meter/loading/returns and material recovery | Existing fleet field retained; shared fallback for other guarded requests |
| Services and governance | Technician qualifications, dispute/cancellation reviews, service cash verification, emergency controls, readiness reviews | Verification cannot approve policy or safety evidence |
| Communications and rewards | SLA policy, mail retry/reconciliation, moderation, scheduled campaigns, reward exports/retries and jobs | Password verification does not enable providers or jobs |

All 11 fetch call sites were reviewed: one is the shared API client; the other ten handle workspace/search/export reads, media uploads and hosted-payment endpoints. No separate browser transport bypasses a recent-password guard outside the shared dispatch endpoint. Hosted checkout retains its separate consent/quote/provider controls. Ordinary API calls, including dynamic action names, all benefit from the shared recovery; this does not depend on a manually maintained sensitive-action allowlist.

## Request and security behaviour

1. The first request still reaches the normal server checks. Only explicit `403 REAUTH_REQUIRED` opens recovery. Network failure, role denial, validation failure and uncertain outcomes never cause a retry.
2. The dialog has a required masked Current password field, Show password, native form validation, Cancel/Escape, focus trapping and return focus. Password is cleared immediately on submission and never added to the business payload, operation key, queue metadata or browser storage.
3. Wrong passwords and verification throttling stay in the dialog. Cancel or page/account changes stop continuation. Only one password challenge can be outstanding; a second action is not queued for later execution.
4. **Verify and continue** verifies normally, checks the same account/role/branch/session, and sends the exact originally serialized request once. It preserves versions, monetary values and existing idempotency keys. Later edits do not alter the captured request.
5. The server compares an opaque session marker on the continuation request, closing a session-switch race between browser checking and dispatch. The marker is a SHA-256 comparison value with a separate namespace; it is not a session credential or a permission grant. Normal authentication, CSRF, role, branch and all business guards still run.
6. A second expiry or business rejection is returned to the original screen. No automatic loop, password persistence, arbitrary network replay, safety extension or privilege grant was introduced.

## Acceptance status

Focused suite: 26/26 passed, including actual rendered dialog/transport coverage for all77 inventoried rejection sites and actual service controls for all seven canonical roles. These are verification UX and security-boundary checks, not a rerun of all end-to-end physical/business workflows. Local fixture writes are isolated; production controls are retained.

Final source `dbf7353bf3553a5aedf52369c3098f6809bd7568` is Ready on `dpl_H5STrxVa3PUyb9166mbG2UzmGreh`, promoted to [the client demo](https://easygas-client-demo.vercel.app). Exact440-file export/dry-run bytes match committed source. Initial candidate and initial/final stable each passed13distinct identities; the final focus-only candidate passed its2identity smoke check, with unchanged server/transport bytes proven separately. Actual browser checks cover all7canonical roles, shared POST recovery, protected privilege GET, wrong-password focus, Cancel/Escape, busy Shift+Tab, required input, visibility toggle and390px light/dark layout. Both manual screenshots are current published UI. [Final exact-source CI44919152786](https://github.com/Onaopemipo/easygasng/actions/runs/44919152786) passed all1,174web tests and3native dependency tests; build, types and dependency audits passed. Mobile export was skipped. See the [phase matrix](../traceability/sensitive-action-verification-rtm.md). Production NO-GO, external/provider/physical/signed-native gates, actual-import hold and retain-all remain unchanged. No new mobile binary/export/install is authorised or performed.

Browser follow-up found a keyboard defect after wrong-password rejection: focus was attempted while the field was disabled. The dialog now focuses after the enabled render and excludes disabled inputs from its Tab loop. A renderer regression checks that focus occurs only after re-enabling; published follow-up now passes. Initial API acceptance remains evidence for the unchanged server and transport; final release identity is recorded separately.

## Evidence and boundaries

[Coverage](evidence/coverage.json), [browser checks](evidence/browser-verification.json), [final stable checks](evidence/stable-release.json), [source integrity](evidence/source-integrity.json), [focus source invariance](evidence/focus-source-invariance.json), [findings](findings.json), [native preservation](evidence/native-preservation.json) and [matrix](../traceability/sensitive-action-verification-rtm.json). Initial and final1,174-test CI runs both passed; final focus source is independently recorded in [CI evidence](evidence/ci-validation.json).

The published API pass changes only normal authentication/audit metadata. Hosted business requests are deliberately invalid, denied or read-only; no branch, vehicle, stock, invoice, payment, approval, privilege or safety record was created or modified. Correct-password browser continuation uses existing `lagos` and reaches the retained duplicate-branch409. Existing22orders, inventory, ledger and fleet snapshots match before/after. Qualifications were not renewed, and native artifacts retain their hashes/timestamps. All13own API sessions were revoked and returned401; the QA browser is signed out with light theme/default viewport restored.

Browser Enter-key injection was not accepted as test evidence; the labelled submit button is verified and is the manual instruction. This phase does not claim physical-device/native/provider/business-policy acceptance or completion of all370 discovery call sites as separate business workflows. All77 password guard sites remain in scope.

All5 [verification findings](findings.json) and all6 bounded requirements/gates are now verified. [Final business preservation](evidence/final-preservation.json), [session cleanup](evidence/session-cleanup.json) and [browser cleanup](evidence/browser-cleanup.json) complete the evidence. No outstanding work in this bounded verification UX scope; existing broader production and feature holds remain separate.

Direct Dispatch vehicle assignment (24 November 2026) adds a fresh-password guard to the owner/manager trip action. Its form shows Current password before submission and preserves the shared verification/idempotency behavior; explicit availability also retains staff authority. [DV evidence](../dispatch-vehicle/README.md). Historical acceptance counts remain recorded above.

Inventory generation now retains the original guard-site IDs when another module adds a guard. All previous 77 identities remain matched to committed history; the Dispatch vehicle guard is SVERIFY-SITE-078. Repeated regeneration produces the same inventory.

Admin trip management adds `SVERIFY-SITE-079` in `dispatch-trip.ts` for end/change; IDs 001–078 remain stable. Both operations use the existing own-password form and server verification, role/branch/privilege, release, version, operation identity and canonical reconciliation controls. See the [trip phase matrix](../traceability/dispatch-trip-rtm.md).
