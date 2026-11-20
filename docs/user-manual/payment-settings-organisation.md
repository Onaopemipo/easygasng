# Payments & Wallet: where to find each control

In **Admin → Settings**, choose **Payments & Wallet**. This single category replaces **Payments & Wallet**, **Wallet & Payments** and **Wallet**. It also brings the old integration switch into the same area.

| Section | Setting | Use it for |
| --- | --- | --- |
| Online payments | Online payments & fees | Paystack sandbox checkout, channels, fees, card wallet top-ups and their limits. Opens the Checkout / Fees / Wallet / Review editor. |
| Customer wallet | Wallet access | Verified wallet-credit spending and bank-transfer funding request availability. Bank instructions and funding approvals are still required. |
| Customer wallet | Cash & bank-transfer wallet limit | The approved cash/bank funding ceiling; bank transfers also check the resulting wallet balance. This is separate from card top-up limits. |
| Cash & settlement | Cash on delivery | Whether orders can use cash on delivery. Enabling this does not verify a payment. |
| Cash & settlement | Settlement bank details | Governed bank account metadata. Customer transfer instructions and Paystack credentials are configured separately. |
| Advanced controls | Legacy payment integration | Existing protective switch. It does not enable Paystack. Use **Open online payment settings** to configure the existing gateway policy. |

**Advanced controls** starts collapsed. Searching for the legacy switch opens it automatically. Old category names, old setting names and setting keys remain searchable. Choose the category again to clear a search.

Each card retains its existing active value/version, history and role-based actions. Renamed controls open the same setting with the same permissions and approval rules. Users see only their existing permitted controls; managers do not gain payment administration access.

The Finance sidebar’s **Wallet & Payments** entry remains the operational workspace for balances and payment records. **Settings → Payments & Wallet** is the configuration area.

[Online payment editor guide](wallet-payments-update.md) · [Audit and source mapping](../settings-categories/AUDIT.md) · [Traceability](../traceability/settings-categories-rtm.md).
