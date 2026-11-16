# EasyGas merchant-issued receipts and invoices

This phase extends the [existing EasyGas invoice and receipt scope](easygas-invoicing-rtm.md) and [branding scope](document-branding-rtm.md). The [machine-readable matrix](merchant-documents-rtm.json) maps scope, changed files, data sources, controls, and tests. Existing production NO-GO and document numbering and identity rules are preserved.

| Requirement | Acceptance | Status |
| --- | --- | --- |
| MERCHANT-DOC-R01 | G01: The existing invoice endpoint and the new merchant receipt endpoint download distinct branded PDFs. A payment must have a committed verified posting. Previous receipt links keep working. | Verified locally. Hosted and installed mobile checks are open. |
| MERCHANT-DOC-R02 | G02: When mail is enabled, a verified customer can receive an EasyGas link to their receipt after payment verification. Replay does not queue another email. The client demo and preview do not send these notices. | Verified locally with a fake provider and mail transport. Actual inbox acceptance is open. |
| MERCHANT-DOC-R03 | G03: Customers receive their payment receipt from EasyGas without a separate Paystack email. | Blocked on verification of the merchant mail channel and the Paystack merchant preference. |

Implementation and local acceptance: 2/3 requirements, 2/2 critical local requirements, 2/3 gates. The [execution log](merchant-documents-evidence.txt) records 26 passing focused regressions, a web build, asset tracing, and both type checks. Hosted and external routes were not exercised.

The Paystack Dashboard setting is under [Settings → Preferences](https://support.paystack.com/en/articles/2131010#payment-preferences). After verifying EasyGas receipt access and branded mail delivery in the intended environment, set Paystack’s transaction receipts to the business email only. Client demo email sending stays disabled. No SMTP or Paystack merchant preferences were changed here.

Rollback: revert this phase’s app changes. No schema changes are required, and historical receipt downloads still use the legacy endpoint. If merchant preferences have been changed separately, restore the prior delivery choice in Paystack as needed to retain customer receipt delivery.
