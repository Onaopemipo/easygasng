# EasyGas production acceptance — 11 November 2026

**Production NO-GO.** All six requested launch areas remain in scope. The
[Vercel demo](https://easygas-client-demo.vercel.app) uses synthetic records.
This phase does not authorise purchases, live charges, customer messages,
historical imports or a production traffic cutover.

| Gate | Existing requirements | Evidence needed to close | Current dependency |
| --- | --- | --- | --- |
| Hosting and recovery | E2E-09, PR-R09 | On the selected host: deploy reviewed immutable image with restricted DB principal and verified hostname TLS; test domain and worker health; restore encrypted off-host backup into an empty isolated target, reconcile committed records, and rehearse compatible image rollback. | Namecheap VPS not provisioned, per owner. Local image and release checks do not establish remote recovery. |
| Live payments | PAY-R01–17, wallet top-ups | Isolate test and live keys, policy, references and webhook processing. Run merchant-funded acceptance with authorised channels and confirmed fee policy. Reconcile successful, failed, duplicated and late payments, refund/chargeback and settlement amounts against immutable ledger entries. | Live merchant account not available. Existing runtime intentionally rejects live configuration; live implementation and merchant acceptance remain open. |
| Operations | E2E-01–04, E2E-06, dispatch and invoicing matrices | Scoped customer, dispatcher, driver, technician, inventory and finance journeys across order/booking, assignment, custody and settlement. Include failed delivery, material returns, wrong-branch denial, qualified review and independent approvals. Record safety/operations/finance sign-off. | Local fixture evidence is available; real equipment, operating roles, approved scenarios and sign-off remain needed. |
| Messaging and routing | E2E-03/05, PR-R05 | Verify approved sender/domain and recovery delivery, receipt signatures and retries; test named SMS/WhatsApp templates and provider acceptance; verify road routes against known journeys and fail safely on provider outage. | Provider accounts not available. Existing outbound switches stay off. |
| Historical data | E2E-07/08 and Excel import matrix | Obtain latest authorised workbook, preview read-only, reconcile row counts and totals, resolve ambiguous identities, fees, balances and payments, approve exact import and rehearse idempotent recovery. | Workbook and reconciliations not supplied in this phase. Import hold and retain-all decision preserved. |
| Mobile and final release | E2E-10/11, PR-R08/10/14 | Hosted CI green on reviewed commit; web desktop/mobile-browser and role journeys; signed iOS/Android test builds with airplane mode, locked/background use, process restart, GPS and reconnect acceptance; release decision signed by authorised reviewers. | Demo settings UI verified on desktop and at 390px. Signed build, devices, full browser scope and final review not verified. |

Do first: qualify the local candidate, provision the VPS, and establish
production-like staging. Do not put real records, providers or transactions on
the synthetic demo. Use an approved secure secret store for credentials.
