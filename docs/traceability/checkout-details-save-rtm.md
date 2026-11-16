# Save delivery details with customer consent

| Requirement | Implementation and authoritative data | Verification |
| --- | --- | --- |
| CHECKOUT-SAVE-R01 · Web consent | Cart, gas and linked product checkout display an optional prompt after order confirmation. The prompt presents new or changed delivery details derived from the order and customer profile. Each checkbox starts unchecked. | G01 passed. Mobile Chrome verified gas save, skip, phone-only updates and future prefill, plus cart skip. Desktop Chrome verified phone-only saving after a linked request with both a product and appointment. |
| CHECKOUT-SAVE-R02 · Account update and access | The server verifies the signed-in customer owns the order and reads the delivery details from that order. It writes only the consented changes and audits the fields selected. A preferred delivery phone is stored separately from the verified sign-in number. | G02 passed. Automated coverage includes ownership, staff rejection, preview without consent, selective updates, replay, stale snapshots, unchanged order data and preserved sign-in identity. |
| CHECKOUT-SAVE-R03 · Native consent | Native cart, gas and linked product checkout send the confirmed order ID to the same backend. The prompt offers the applicable choices and retry after save failure. Responses are scoped to the current account. | G03 open. Native TypeScript and shared logic passed. Installed iOS and Android journeys are pending. |

Implementation **3/3**. Verified requirements **2/3**. Critical requirements **1/1 locally verified**. Runtime route coverage **3/3 web, 0/3 native**. Gates **2/4 passed**. Hosted rollout and migration 080 are pending under G04. Commercial production remains NO-GO.

[Machine-readable matrix](checkout-details-save-rtm.json) · [Executed evidence](checkout-details-save-evidence.txt) · [Previous checkout prefill phase](checkout-delivery-rtm.md)
