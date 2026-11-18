# Wallet order payments

Card, Cash on delivery and Wallet share the existing order and payment records. Checkout shows the signed-in balance and the selected branch's approved methods. Confirming Wallet pays the complete server-calculated total once. Insufficient funds roll back the order and stock reservation. Card and Cash leave the wallet unchanged.

| Requirement | Status |
| --- | --- |
| WALLET-ORDER-R01 · web choices, balance and branch scope | Verified locally in Chrome and HTTP checks |
| WALLET-ORDER-R02 · exact debit, replay and concurrency | Verified with PostgreSQL and committed browser orders |
| WALLET-ORDER-R03 · native choices and secure card continuation | Source compiled/exported; installed interaction unverified |
| WALLET-ORDER-R04 · governed demo enablement and release | Wallet enabled through approval; rollout pending |

Coverage: 4/4 implemented, 2/4 verified; critical 2/2; routes 3/4; gates 2/4. No untested requirement is excluded. Native installed-device and commercial production gates remain open.

[Requirement mappings](wallet-order-rtm.json) · [Executed evidence](wallet-order-evidence.txt)
