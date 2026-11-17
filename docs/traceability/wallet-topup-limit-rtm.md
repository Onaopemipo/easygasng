# Wallet top-up amount limit repair

The gateway caps the full charge. The previous displayed maximum allowed a NGN 100,000 principal before adding fees, causing fee quotation to fail. The demo now permits a NGN 98,400 principal whose total with fees fits the NGN 100,000 cap.

| Requirement | Gate | Status |
| --- | --- | --- |
| WALLET-TOPUP-R01 · derive the payable principal from fees and validate it before creating payment records | WALLET-TOPUP-G01 · fee boundary, negative, hosted browser and sandbox funding checks | Verified on demo |

Coverage includes one implemented and verified requirement, one verified critical requirement, three verified routes and one passed gate. Desktop and mobile wallet forms accepted supported amounts and prevented oversized funding. A hosted sandbox payment charged NGN 1,015.23, credited NGN 1,000 exactly once and generated the matching EasyGas receipt.

The separate native dependency audit failure is resolved by the [reviewed mobile security repair](mobile-dependency-audit-rtm.md). Its historical failure remains in the evidence. Commercial production remains NO-GO.

[Implementation and security mappings](wallet-topup-limit-rtm.json) · [Evidence](wallet-topup-limit-evidence.txt)
