# EasyGas holistic website audit and prototype

20 November 2026 · current web source and read-only client-demo snapshots.

The audit covers 86 routes, 36 workflow families and 300 named features, across public access and all 6 signed-in roles. The prototype imports 160 existing UI/business-rule files rather than approximating the project with unrelated screens.

## Design and interaction audit

| Area | Finding | Prototype treatment |
|---|---|---|
| Whole-system orientation | The production menu is role-specific; no single screen explains all users and hand-offs. | New experience hub, six persona cards, searchable feature guide, complete 86-screen directory. |
| Multi-role work | Customer, inventory, operations, field staff and owner see different parts of the same work. | Five guided journeys, automatic persona changes, shared references and live local readback. |
| Order details | Latest compact Overview, Items, Payment and History design is already present. | Reused actual component, contextual actions and focused subviews. |
| Sidebar | Latest active-item reveal/scroll continuity is present. | Actual navigation component retained, including role scopes and collapse. |
| Long workspaces | Latest tab/dialog redesigns are present in finance, services, growth and customer settings. | Reused all existing screen/tab/form layouts and CSS. |
| Empty and unavailable states | No active rewards policy, incomplete cost evidence and some empty histories are genuine snapshot states. | Preserved as unavailable/empty; no invented production revenue, profit or entitlement. |
| Sole business owner | Owner authority and restricted independent review are separate mechanisms. | One owner persona, retained eligibility rules and dedicated governance walkthrough. |
| Identity and payments | Bare activation/invitation/provider URLs need their original tokens. | Exact missing-link screens retained; no credential or live provider flow. |
| Field safety | Demo qualifications/calibration are time-bounded evidence, not physical certification. | Normal/expired scenarios are explicitly synthetic; no actual renewal, location or proof created. |
| Review ergonomics | A guide must not obscure the real action dialog. | Prototype modal stacking corrected; native reset confirmation replaced with accessible source dialog. |

## Complete feature map

| Stable ID | Feature family | Entry | Role | Named features |
|---|---|---|---|---:|
| FEATURE-01 | Discover and compare | / | Website visitor | 9 |
| FEATURE-02 | Order and checkout | /gas-order | Customer | 10 |
| FEATURE-03 | Shopping cart | /cart | Customer | 5 |
| FEATURE-04 | My orders | /orders | Customer | 8 |
| FEATURE-05 | Account and privacy | /account-settings | Customer | 10 |
| FEATURE-06 | Purchase credit and wallet | /wallet | Customer | 8 |
| FEATURE-07 | Customer service visits | /bookings | Customer | 8 |
| FEATURE-08 | Rewards and refill planning | /rewards | Customer | 8 |
| FEATURE-09 | Customer support | /support | Customer | 5 |
| FEATURE-10 | Business dashboard | /admin | Admin / business owner | 7 |
| FEATURE-11 | Order management | /admin/orders | Service Manager | 11 |
| FEATURE-12 | Retail point of sale | /admin/pos | Inventory | 8 |
| FEATURE-13 | Customer management | /admin/customers | Service Manager | 7 |
| FEATURE-14 | Support desk | /admin/support | Service Manager | 8 |
| FEATURE-15 | Catalogue and bundles | /admin/products | Admin / business owner | 8 |
| FEATURE-16 | Inventory management | /admin/inventory | Inventory | 12 |
| FEATURE-17 | Cylinder records | /admin/cylinders | Inventory | 7 |
| FEATURE-18 | Dispatch and driver management | /admin/deliveries | Service Manager | 10 |
| FEATURE-19 | Driver workspace | /admin/deliveries | Driver | 13 |
| FEATURE-20 | Professional services | /admin/services | Service Manager | 12 |
| FEATURE-21 | Technician workspace | /admin/bookings | Technician | 11 |
| FEATURE-22 | Staff and qualifications | /admin/technicians | Service Manager | 6 |
| FEATURE-23 | Quotations | /admin/quotations | Service Manager | 7 |
| FEATURE-24 | Finance workspace | /admin/finance | Admin / business owner | 8 |
| FEATURE-25 | Financial reconciliation | /admin/reconciliation | Inventory | 8 |
| FEATURE-26 | Credits and refunds | /admin/credits | Admin / business owner | 7 |
| FEATURE-27 | Reports and analytics | /admin/reports | Admin / business owner | 8 |
| FEATURE-28 | Campaigns | /admin/campaigns | Service Manager | 9 |
| FEATURE-29 | Recommendations | /admin/recommendations | Service Manager | 6 |
| FEATURE-30 | Testimonials | /admin/testimonials | Admin / business owner | 8 |
| FEATURE-31 | Approvals and settings | /admin/approvals | Admin / business owner | 10 |
| FEATURE-32 | Operations centre | /admin/operations | Admin / business owner | 8 |
| FEATURE-33 | Governance and incidents | /admin/incidents | Admin / business owner | 8 |
| FEATURE-34 | Policies and legal information | /admin/policies | Admin / business owner | 6 |
| FEATURE-35 | Identity and entry links | /login | Website visitor | 8 |
| FEATURE-36 | Global navigation and appearance | /account | Customer | 8 |

## Evidence and limits

- `feature-coverage.json` maps every named feature to actual source and prototype interaction coverage. `route-coverage.json` retains all 86 routes and observed role results. Route existence is not treated as functional acceptance.
- `evidence/read-capture.json` and `parameterised-reads.json` record read-only demo source results. Forbidden and missing-parameter responses remain represented. No safety/policy renewal or publication was repeated.
- `evidence/model-tests.json` records nine executed local-model checks: roles, cross-role delivery, payment rejection, expired calibration, refund idempotency, service hand-off, denied operations, no network forwarding and reset/persistence.
- Guided delivery, service and refund journeys mutate shared local records. Governance/stock walkthroughs record local activity; original form submissions otherwise provide interaction previews. They do not implement the full transactional backend.
- Real payments, messages, account credentials, GPS, media capture, legal decisions and qualified physical operation remain simulated or blocked. Commercial NO-GO, actual-import hold and retain-all remain unchanged.
- Every backend mutation, browser/device combination, assistive technology and native app is outside this bounded prototype acceptance; these are not silently counted as passed.
