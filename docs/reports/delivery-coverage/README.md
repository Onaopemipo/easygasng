# Delivery area confirmation

If an area is labelled coverage pending, go to Admin → Settings → Delivery Locations and open the location's Propose Change form. Record the boundaries EasyGas has actually verified in Coverage, submit the change and follow the approval and activation status. Customers can retry the quotation after the coverage is active. If a confirmed area genuinely matches the customer's address, they can select it instead.

The full web order form now sends the chosen location to quote review. The homepage widget and full form both identify pending coverage and show the contact link. The quote and checkout retain the original server rule. The separate address confirmation, where configured, still applies before dispatch.

The isolated checkout test proved that pending coverage blocks both the quote and checkout without reserving stock. The same checkout passed after governed approval. Chromium at 390px verified the pending-area guidance. See the [backend tests](tests.txt) and [browser log](browser.txt).
