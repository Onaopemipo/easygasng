# Customer gas ordering

1. Open Order Gas from the homepage or mobile home.
2. Select a supported cylinder capacity, enter the desired gas kg, and add further cylinders if needed.
3. Select a managed active delivery location. Choose a saved address or enter recipient, Nigerian mobile number, street, building, landmark and directions.
4. Select an available date/window and an explicitly enabled payment arrangement.
5. Review the current server quotation and its itemised gas, product and single delivery amounts.
6. Accept the displayed total to submit. If service appointments have been staged, select their inclusion; service charges and fulfilment stay separate.
7. Receive an order reference and view order history/tracking. A received order is conditional on coverage, inspection, stock and operational eligibility, not a claim of safety certification or verified cash.

Checkout validates the current branch, location, pricing versions, quantity rules, capacity, stock, payment arrangement and delivery-window capacity in a transaction. It reserves integer grams and any physical units. Idempotency prevents duplicate commitments. Unsupported locations, exhausted stock, invalid quantities or stale pricing produce actionable errors and roll back reservations and ledger writes. No customer pickup option is introduced; internal supplier and driver collection remain available.

Existing cylinder controls still apply. A new customer-owned cylinder can be recorded by authorised inventory staff in the gas filling queue; it enters quarantine. Documented inspection in Cylinders and a separate verified filling allowance are required. Existing serials must use their existing custody record. Dispatch also requires current address-coverage evidence where configured. Delivery confirmation consumes reservations once, uses the customer code and preserves cash reconciliation. Cash collection is not independent payment verification.

Customers may cancel eligible newly placed orders, releasing stock and restoring any purchase credit through the existing cancellation ledger. Refunds retain independent approval and original payment restrictions. Recurring authorisations retain a pricing snapshot and customer ceiling; changed prices stop generation for renewed review. Online payment providers remain unconnected.
