# Wallet top-up amount limit repair

The branch gateway caps the full charge. The advertised wallet maximum previously allowed a principal equal to that full charge cap, causing fee quotation to throw an unexpected error.

| Requirement | Gate | Status |
| --- | --- | --- |
| WALLET-TOPUP-R01 · derive the payable principal from fees and validate it before creating payment records | WALLET-TOPUP-G01 · fee boundary, negative, hosted browser and sandbox funding checks | Implemented, acceptance running |

Coverage includes one implemented requirement, zero verified requirements and zero of one gates passed. The one critical requirement remains in the denominator. Commercial production remains NO-GO.

[Implementation and security mappings](wallet-topup-limit-rtm.json) · [Evidence](wallet-topup-limit-evidence.txt)
