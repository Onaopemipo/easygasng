# Gas-order empty-cylinder availability

| Requirement | Source and controls | Verification |
| --- | --- | --- |
| GAS-CYL-01 · Show unavailable empty cylinders during gas-order review | A selected-area quotation checks the published branch product against registered company cylinders of the matching size with current inspections. Active allocations and vehicle custody exclude individual serials. Checkout still locks and reserves the eligible serials. A refill-only quote uses bulk gas stock. | GAS-CYL-G01 passed locally. Tests covered unavailable, reservable and already-reserved cylinders, refill-only quotes, and vehicle custody. |

Implementation, local API verification and local gate coverage are each 1/1. Web type checking and 20 targeted tests passed. Hosted verification, live stock review and installed-app checks remain open. The commercial production NO-GO still applies.

[Machine-readable matrix](gas-cylinder-availability-rtm.json) · [Executed checks](gas-cylinder-availability-evidence.txt)
