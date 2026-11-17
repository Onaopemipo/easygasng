# Holistic release QA — 17 November 2026

**Commercial production NO-GO.** Earlier requirement and gate identifiers carry forward. The historical import remains on hold.

| Requirement | Status | Executed evidence and remaining work |
| --- | --- | --- |
| QA-20261117-R01 · Checkout and contact consent | Verified locally | Desktop and mobile Chrome passed gas, cart and linked checkout. Selected contact changes are saved with consent. Skipped details stay with the order and saved details prefill later checkout. |
| QA-20261117-R02 · Delivery, returns, invoice and receipt | Partial | Used the application API to fulfil two browser-created accessory orders. The successful delivery produced a matching EasyGas invoice and one cash ledger entry after independent Finance reconciliation and replay. The failed delivery blocked reassignment until stock was returned. Separate simulated-provider tests verified the branded card receipt and invoice allocation. A single hosted Paystack checkout-to-fulfilment run remains open. |
| QA-20261117-R03 · Operating areas and inspected stock | Blocked | Synthetic reservation and cylinder eligibility checks passed. Record EasyGas’s actual approved boundaries and physically reconcile stock and inspected cylinders before opening real ordering. |
| QA-20261117-R04 · Five installed staff workspaces | Partial | The Android emulator passed sign-in and workspace smoke checks for all five roles. The iOS simulator passed Admin. Automated tests verified branch scope and restricted field sessions. The four remaining iOS roles and installed-app cross-branch checks are open. |
| QA-20261117-R05 · Offline tracking and technician evidence | Partial | Fixture tests verified driver location scope, consent and freshness, plus technician proof integrity. On real phones, test locked-screen capture, airplane mode, process restart, queued replay and a clearly labelled last known location in Dispatch. |
| QA-20261117-R06 · Email, routing and launch messaging | Partial | Local SMTP outbox, branded receipt and OSRM contract fixtures passed. Verify actual inbox delivery for invitation, password reset and receipt, then road routing and any SMS or WhatsApp channel selected for launch. |
| QA-20261117-R07 · Live payments | Blocked | Sandbox fixture verification, signature validation, deduplication and ledger checks passed. Live activation requires merchant approval, verified fee terms, live implementation and acceptance for webhooks, refunds, disputes and settlement. |
| QA-20261117-R08 · Operational sign-off and historical import | Blocked | Operations, safety and finance sign-off is outstanding. If Excel data becomes necessary for launch, reconcile customer matches, stock, payments and historical fees before approving the import. The retain-all instruction remains in effect. |
| QA-20261117-R09 · Local regression and dependency remediation | Verified locally | The PostgreSQL-enabled regression passed 733/733 after the Next.js update to 16.4.6. Both dependency audits reported zero findings. Web build and web/mobile typechecks passed. Hosted CI remains in the existing release gates. |

**Coverage.** Local software paths were implemented for 5/9 requirements. This phase fully verified 2/9 requirements, including 1/7 critical requirements, and passed 2/9 gates. All nine rows remain in scope. Browser checkout passed on 3/3 scoped routes at both viewport sizes. Installed role smoke checks passed for 5/5 on Android and 1/5 on iOS. The staff order journey used the cash-enabled web workflow. The delivery-only app correctly denied direct cash collection.

17 November change record. Added the nine acceptance requirements and cross-referenced existing IDs. Updated Next.js to 16.4.6 and repeated the full regression. The existing launch decision and import hold carry forward.

[Machine-readable matrix](holistic-qa-rtm.json) · [Executed evidence](../releases/20261117-holistic-qa/evidence.txt) · [Launch gates](../releases/20261111-readiness/launch-gates.md)
