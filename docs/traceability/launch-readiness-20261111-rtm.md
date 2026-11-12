# Production acceptance continuation

Production NO-GO. All six gates remain open and in coverage. See [acceptance and operator handoff](../releases/20261111-readiness/launch-gates.md) and [machine-readable traceability](launch-readiness-20261111-rtm.json).

## 13 November 2026 evidence refresh

All six gates remain pending. The focused PostgreSQL suite passed 53 tests and the provider safety suite passed four, with zero failures or skips. See the [Excel test sheet](../../outputs/easygas-qa/EasyGas%20Test%20Sheet.xlsx) for the gate checklist and owner inputs.

- **Hosting and recovery.** Commit 6a7522c passed isolated Compose with hostname TLS, restricted PostgreSQL role, migrations and a healthy worker. Fresh tests restored encrypted data locally and rejected overwrite, tampering and wrong keys. Confirm the Namecheap VPS is provisioned, provide the staging hostname and approved access, and identify the backup destination and recovery targets.
- **Live payments.** Fresh Paystack fixture tests passed checkout and webhook safeguards, duplicate posting, rollback and invoice allocation. The live-mode rejection guard still passes. Confirm the live merchant account and authorised test budget, channels and fee policy. Provide access through the approved secret store.
- **Operations.** Fresh isolated tests passed driver assignment and branch restrictions, custody and finance workflows, independent review and offline GPS replay. The native quote reached review on both simulators. Nominate operations, safety and finance signers. Confirm the test branch, staff roles, equipment, cylinders and approved field scenarios.
- **Messaging and routing.** Four provider safety tests passed, covering SMTP duplicate-send fencing, interrupted-send reconciliation and TLS verification. Local routing contract and PostgreSQL destination revision tests passed. Choose approved SMTP, SMS/WhatsApp and routing accounts. Confirm sender identity, allowed test recipients, templates and reference routes. Provide access through the approved secret store.
- **Historical data.** The local source matched the previously audited hash. Replayed the same 5 Nov cutoff and target snapshot. Results matched exactly: 282 rows, 1,456 exceptions, 361 proposals on hold and zero business writes. Confirm whether the audited workbook is the intended import revision. Approve receipt allocations, stock and cutoff, historical delivery fees and row-level customer matches before exact import approval.
- **Mobile and final release.** Exact commit 6a7522c passed hosted web and native CI in run 43239151679. Hosted native export was skipped. Local native exports and both simulator quote journeys passed. Demo public routes returned 200. Demo /api/status returned 503. Confirm the release candidate and provide approved Apple and Android signing access, physical test devices and the independent release reviewer.

The hosted demo readiness probe now returns HTTP 200 with demo scope. See the [demo readiness matrix](demo-readiness-rtm.md). Commercial staging readiness and all six launch gates remain pending.
