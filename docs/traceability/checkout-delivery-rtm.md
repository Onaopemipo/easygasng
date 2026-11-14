# Customer checkout delivery prefill

| Requirement | Implementation and authoritative data | Verification |
| --- | --- | --- |
| CHECKOUT-PREFILL-R01 · Web | Cart, gas and linked product checkout read the current customer's saved addresses and contact from `account.profile`. The default deliverable address is preferred; another saved address or edits can be used for a single order. Existing checkout remains responsible for delivery coverage, stock and payment. | G01 passed: authenticated Chrome confirmed default and alternate addresses, phone fallback and a synthetic cash-on-delivery order using edited details. Subsequent checkout still showed saved details. Gas checkout was also checked at 390 px. |
| CHECKOUT-PREFILL-R02 · Native | Native cart, gas and linked product checkout use the same address selection and phone normalization rules and leave account records untouched. Responses are matched to the signed-in customer. | G02 open: shared logic and native TypeScript passed; installed iOS and Android checkout still needs verification. |

Implementation: **2/2**. Verified requirements: **1/2**. Critical requirements: no P0 requirements added. Route coverage: **3/3** web routes exercised and **0/3** native runtime journeys verified. Gates: **2/3** passed. Scope covers delivery fields only, including product delivery in linked checkout. The Vercel demo deployment passed G03. Hosted Chrome verified signed-in checkout with the existing test account and a saved address supplied to the browser for testing. The local cash-on-delivery check covers order submission. Commercial production remains NO-GO.

[Detailed matrix](checkout-delivery-rtm.json) · [Executed evidence](checkout-delivery-evidence.txt)
