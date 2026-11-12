# Business-rule preservation

| Feature | Before and after |
| --- | --- |
| Public and native entry | Existing route, homepage compact widget and native role routing. |
| Gas quantities | Existing integer grams and kobo rules. Web controls now use the shared policy stepper. |
| Location and saved addresses | Existing area inference, selected location, saved/default address and recipient fields. Additional address fields use disclosure. |
| Date and delivery window | Existing inputs and server capacity checks. Grouped with payment. |
| Active gas and delivery prices | Existing branch catalogue and quote. Estimated and quoted totals are visually distinct. |
| Physical items and staged appointments | Cart products remain in checkout. Included products link to cart. Existing staged service selection and mixed checkout remain. |
| Rewards and wallets | Existing selectors, checkout discounts and wallet authorisation. Summary notes that eligible discounts apply at checkout. |
| COD and Paystack | Existing web arrangements and hosted payment component, with authoritative payment state. Native retains its existing COD and purchase-credit options. |
| Stock, custody, finance and approvals | Existing backend operations and transaction boundaries. |
| Confirmation, tracking and account | Existing reference and tracking flow, guest handoff, public header and role navigation. |

Relevant code includes apps/web/components/gas-order.tsx, apps/mobile/GasOrder.tsx, packages/business-rules/src/gas-pricing.ts, apps/web/lib/operations.ts and apps/web/lib/gas-delivery.ts. The traceability matrix keeps all 20 preservation items.
