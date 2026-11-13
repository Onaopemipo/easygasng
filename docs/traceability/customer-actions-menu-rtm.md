# Customers row Actions layout

| Requirement | Implementation and data | Controls | Verification | Status |
| --- | --- | --- | --- | --- |
| ADM-CUSTOMERS-ACTIONS-01 · Open a customer’s Actions menu without shifting the directory. Keep View details and Edit customer accessible. | [Customer directory](../../apps/web/components/customer-management.tsx) and [styles](../../apps/web/components/customer-management.css) use the existing `customers.manage` and `customers.detail` records on `/admin/customers`. | The existing customer API permissions and branch scope govern both actions. | ADM-CUSTOMERS-ACTIONS-G01 passed at 1440px and 390px using an authenticated local fixture. Table geometry, first and last row positioning, keyboard navigation, dismissal and both dialogs passed. The CM-01 API regression passed. [Executed evidence](customer-actions-menu-evidence.txt) | Verified locally |

Implementation, verification, route and gate coverage are each 1/1 for this fix. Critical requirement coverage is not applicable. The same authenticated Chrome checks passed on the stable demo URL after deploying `6978765`. The public commercial production NO-GO remains in effect.

Scope change on 13 November 2026. Added ADM-CUSTOMERS-ACTIONS-01 and its layout gate in response to the before-and-after screenshots.
