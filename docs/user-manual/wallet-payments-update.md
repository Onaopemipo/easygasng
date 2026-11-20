# Wallet & Payments settings · 20 November 2026

Open **Settings**, search **Payment Gateway**, then choose **Propose Change**. The editor has four steps. Changes stay in the form when you switch tabs.

| Step | What to configure |
| --- | --- |
| Checkout | Sandbox checkout, approved payment methods and the merchant approval reference. Open **Quote timing** only to change the 60–1,800 second validity period. |
| Fees | Who pays the fee, the percentage, fixed amount and cap. Enter percentages directly (1.50 means 1.50%) and money in naira (100.00 means ₦100). A blank cap means no cap; 0.00 means a zero cap. |
| Wallet | Sandbox wallet top-ups, minimum top-up, maximum top-up/balance, and partial invoice payments. Minimum must not exceed maximum. |
| Review | Read the actual before/after differences, reason and timing before choosing the final action. **Full proposed configuration** expands the complete readable summary. |

**Advanced fee rules** contains the fixed-fee waiver threshold, maximum total charge and provider rounding. These settings still use the existing merchant-approved rules. The example uses this draft’s fee rules and includes gross-up when the customer pays; it is an illustration, not an issued payment quote.

Paystack automatic fee collection must be verified off before checkout is enabled. Customer-paid fees also require the merchant permission confirmation. A merchant approval reference is required when checkout is on. Keep provider API keys on the server.

Enter a **Reason for change** and choose **Review change**, then **Submit for approval**. Opening Review does not submit. **Save draft** also opens a review and needs a separate final confirmation; the saved draft stays inactive. Optional scheduling remains under **Schedule for later**, using Lagos time. Identity verification appears only when requested by the server.

If a field is invalid, the editor opens its tab and advanced section and focuses the field. Correct that value and review again. Close, Cancel and Escape protect unsaved edits.

To test the interface without changing business configuration, edit values, switch tabs, inspect Review, then close and choose **Discard changes**. Use disposable synthetic data for saving/approval tests. This release does not change approved rates, balances, payment activation, approval authority or production NO-GO.

[Deployed desktop](../wallet-payments/evidence/release/stable-desktop.jpg) · [Phone](../wallet-payments/evidence/release/stable-phone-390.jpg) · [Traceability](../traceability/wallet-payments-rtm.md).

This is the current focused manual addendum; the historical PDF/Word editions have not been regenerated.
