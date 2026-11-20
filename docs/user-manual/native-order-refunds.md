# Native Orders and refunds

21 November 2026. This addendum describes the repaired native source and current Expo Go preview. Existing installed release binaries and historical PDF/Word manuals are unchanged.

**Admin/business owner and other staff:** open **Operations → Orders** and use **View visit changes, photos and invoice** to read the authorised order details. Customer refund, extra-item consent and customer excess-refund forms are hidden. The earlier owner-session “Order not found” messages came from misplaced customer controls and are fixed. Authorised owner/finance users review submitted requests in **Workspaces → Credits & refunds**; customer submission does not imply approval or wallet credit.

**Customer or commercial account:** open your Orders. Refund actions appear only for your own delivered orders with verified payments. For a selected-quantity request:

1. Wait for refundable quantities to load. Use **Retry refundable quantities** if the lookup fails.
2. Enter at least one positive whole quantity within the remaining amount. Product quantities use units; gas quantities use grams.
3. Enter a reason of at least ten characters and select **I agree to receive an approved refund as purchase credit**.
4. Submit once. Success means **awaiting independent finance review**; it does not mean cash repayment, a physical cylinder return or immediate credit.

The button remains disabled for empty/invalid quantities, unavailable lines, missing consent or an incomplete reason. If submission fails, retrying unchanged details retains the same operation key. A successful request stays locked to prevent repeated submission. The full-order refund request remains a separate existing action with its own explicit purchase-credit consent; the server prevents conflicting pending requests.

The original repair used seven-role component/API fixtures and an owner-session iOS preview. The subsequent [sequential device acceptance](mobile-device-acceptance.md) now covers actual customer/commercial refund submissions, finance approval, owner rejection and other-role restrictions on iOS with disposable data. No hosted refund or payment was created. Historical phase evidence is retained in [the original report](../native-order-authority/README.md); current limits and follow-up are in [the device matrix](../traceability/mobile-device-acceptance-rtm.md).
