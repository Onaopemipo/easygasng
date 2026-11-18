# Wallet order payments

Card, Cash on delivery and Wallet share the existing order and payment records. Checkout shows the signed-in balance and the selected branch's approved methods. Confirming Wallet pays the complete server-calculated total once. Insufficient funds roll back the order and stock reservation. Card and Cash leave the wallet unchanged.

| Requirement | Status |
| --- | --- |
| WALLET-ORDER-R01 · web choices, balance and branch scope | Verified locally in Chrome and HTTP checks |
| WALLET-ORDER-R02 · exact debit, replay and concurrency | Verified with PostgreSQL and committed browser orders |
| WALLET-ORDER-R03 · native choices and secure card continuation | Both platforms compiled/exported; iOS gas wallet payment and invoice verified; Android/device continuation checks open |
| WALLET-ORDER-R04 · governed demo enablement and release | Approved enablement and stable demo rollout verified; sandbox funding probe limitation recorded |

Coverage: 4/4 implemented, 3/4 verified; critical 2/2; routes 3/4; gates 3/4. No untested requirement is excluded. Native installed-device and commercial production gates remain open.

[Requirement mappings](wallet-order-rtm.json) · [Executed evidence](wallet-order-evidence.txt)

Source `2224688` passed [web and native CI](https://github.com/Onaopemipo/easygasng/actions/runs/44228881958), including 743 web tests with zero skips. Deployment `dpl_Dgvn7MrBfRpp3f42tXi6A4CBXEhu` is Ready at the [synthetic demo](https://easygas-client-demo.vercel.app). Fulfilment remains enabled and Paystack remains sandbox-only.

The additional hosted funded-wallet test was not completed: a sandbox top-up initialization stayed pending without a checkout URL or credit. Its reference was retained for reconciliation; no second charge or payment success was inferred. Local real-PostgreSQL/browser and installed iOS wallet payments passed, including the paid EasyGas invoice. Installed Android and the remaining native checkout variants remain open.
