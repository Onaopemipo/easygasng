# Product UI audit — 10 November 2026

Status: implementation and visual verification in progress. Production **NO-GO** unchanged.

## Rubric

Each surface is assessed for clear page purpose and hierarchy; grouped navigation; readable real-record tables/cards; discoverable actions; responsive containment; labelled inputs and checkbox alignment; contextual empty/loading/error states; keyboard focus; theme consistency. A marketing, legal or field screen does not need dashboard furniture to be usable. No illustrative business records or authorisation shortcuts are introduced.

## Scope and evidence limits

The inventory reads every web TSX component and indexes every current public/customer/admin route plus native shell entry points. Source review is separate from browser acceptance. Dialogs, populated states, role-specific views and physical native runtime are not claimed verified merely because their route exists. Existing approved screens retain their designs. No mobile binary builds or server deployment changes.

## Findings and actions

- Retain the dedicated dashboard, inventory, dispatch, staff, technicians, customer dashboard, wallet and booking workspaces.
- Redesign legacy shared forms: consistent two-column desktop / one-column mobile fields, full-width textareas, inline checkboxes, clear actions and theme-aware focus.
- Redesign support into search/status toolbar and conversation list/detail; one empty state when no requests exist.
- Redesign notifications, campaigns, operations, credits, POS and account workspace headings. Campaign creation becomes an optional disclosure beside monitoring history.
- Bring bundles, recommendations, policy publication, reconciliation and launch gates into consistent product workspace hierarchy.
- Rename approval buttons to Approve, preserving server-authorised behaviour.

## Route inventory

| ID | Route | Disposition |
|---|---|---|
| PRODUCT-ADMIN-DASHBOARD | `/admin` | Retain existing dedicated product workspace; source audit found established hierarchy, scoped navigation and responsive layout. |
| PRODUCT-ADMIN-ORDERS | `/admin/orders` | Retain existing record workspace heading, scoped search, table and operational actions; shared control treatment refreshed. |
| PRODUCT-ADMIN-POS | `/admin/pos` | Redesign shared operational forms and workspace presentation; all original actions retained. |
| PRODUCT-ADMIN-CUSTOMERS | `/admin/customers` | Retain existing dedicated product workspace; source audit found established hierarchy, scoped navigation and responsive layout. |
| PRODUCT-ADMIN-SUPPORT | `/admin/support` | Redesign shared operational forms and workspace presentation; all original actions retained. |
| PRODUCT-ADMIN-PRODUCTS | `/admin/products` | Retain existing dedicated product workspace; source audit found established hierarchy, scoped navigation and responsive layout. |
| PRODUCT-ADMIN-INVENTORY | `/admin/inventory` | Retain existing dedicated product workspace; source audit found established hierarchy, scoped navigation and responsive layout. |
| PRODUCT-ADMIN-CYLINDERS | `/admin/cylinders` | Retain existing record workspace heading, scoped search, table and operational actions; shared control treatment refreshed. |
| PRODUCT-ADMIN-BUNDLES | `/admin/bundles` | Redesign shared operational forms and workspace presentation; all original actions retained. |
| PRODUCT-ADMIN-DELIVERIES | `/admin/deliveries` | Retain existing dedicated product workspace; source audit found established hierarchy, scoped navigation and responsive layout. |
| PRODUCT-ADMIN-BOOKINGS | `/admin/bookings` | Redesign shared operational forms and workspace presentation; all original actions retained. |
| PRODUCT-ADMIN-SERVICES | `/admin/services` | Redesign shared operational forms and workspace presentation; all original actions retained. |
| PRODUCT-ADMIN-TECHNICIANS | `/admin/technicians` | Retain existing dedicated product workspace; source audit found established hierarchy, scoped navigation and responsive layout. |
| PRODUCT-ADMIN-QUOTATIONS | `/admin/quotations` | Redesign shared operational forms and workspace presentation; all original actions retained. |
| PRODUCT-ADMIN-FINANCE | `/admin/finance` | Retain existing dedicated product workspace; source audit found established hierarchy, scoped navigation and responsive layout. |
| PRODUCT-ADMIN-RECONCILIATION | `/admin/reconciliation` | Redesign shared operational forms and workspace presentation; all original actions retained. |
| PRODUCT-ADMIN-CREDITS | `/admin/credits` | Redesign shared operational forms and workspace presentation; all original actions retained. |
| PRODUCT-ADMIN-REPORTS | `/admin/reports` | Retain existing dedicated product workspace; source audit found established hierarchy, scoped navigation and responsive layout. |
| PRODUCT-ADMIN-CAMPAIGNS | `/admin/campaigns` | Redesign shared operational forms and workspace presentation; all original actions retained. |
| PRODUCT-ADMIN-RECOMMENDATIONS | `/admin/recommendations` | Redesign shared operational forms and workspace presentation; all original actions retained. |
| PRODUCT-ADMIN-TESTIMONIALS | `/admin/testimonials` | Retain existing dedicated product workspace; source audit found established hierarchy, scoped navigation and responsive layout. |
| PRODUCT-ADMIN-STAFF | `/admin/staff` | Retain existing dedicated product workspace; source audit found established hierarchy, scoped navigation and responsive layout. |
| PRODUCT-ADMIN-APPROVALS | `/admin/approvals` | Retain existing dedicated product workspace; source audit found established hierarchy, scoped navigation and responsive layout. |
| PRODUCT-ADMIN-SETTINGS | `/admin/settings` | Retain existing dedicated product workspace; source audit found established hierarchy, scoped navigation and responsive layout. |
| PRODUCT-ADMIN-OPERATIONS | `/admin/operations` | Redesign shared operational forms and workspace presentation; all original actions retained. |
| PRODUCT-ADMIN-INCIDENTS | `/admin/incidents` | Redesign shared operational forms and workspace presentation; all original actions retained. |
| PRODUCT-ADMIN-POLICIES | `/admin/policies` | Redesign shared operational forms and workspace presentation; all original actions retained. |
| PRODUCT-ADMIN-AUDIT | `/admin/audit` | Retain existing record workspace heading, scoped search, table and operational actions; shared control treatment refreshed. |
| PRODUCT-ADMIN-READINESS | `/admin/readiness` | Redesign shared operational forms and workspace presentation; all original actions retained. |
| PRODUCT-WEB-GAS-ORDER | `/gas-order` | Retain established dedicated responsive customer workspace. |
| PRODUCT-WEB-POLICIES | `/policies` | Retain intentional branded marketing/legal layout; product dashboard furniture would obscure the page purpose. |
| PRODUCT-WEB-REFUND | `/refund` | Retain intentional branded marketing/legal layout; product dashboard furniture would obscure the page purpose. |
| PRODUCT-WEB-CANCELLATION | `/cancellation` | Retain intentional branded marketing/legal layout; product dashboard furniture would obscure the page purpose. |
| PRODUCT-WEB-SERVICE-TERMS | `/service-terms` | Retain intentional branded marketing/legal layout; product dashboard furniture would obscure the page purpose. |
| PRODUCT-WEB-WARRANTY | `/warranty` | Retain intentional branded marketing/legal layout; product dashboard furniture would obscure the page purpose. |
| PRODUCT-WEB-CREDIT-TERMS | `/credit-terms` | Retain intentional branded marketing/legal layout; product dashboard furniture would obscure the page purpose. |
| PRODUCT-WEB-LOYALTY-TERMS | `/loyalty-terms` | Retain intentional branded marketing/legal layout; product dashboard furniture would obscure the page purpose. |
| PRODUCT-WEB-SERVICES | `/services` | Retain existing branded catalogue, account/recovery or checkout layout; preserve cart, authentication and payment states. |
| PRODUCT-WEB-BOOKINGS | `/bookings` | Retain established dedicated responsive customer workspace. |
| PRODUCT-WEB-COMBINED-CHECKOUT | `/combined-checkout` | Retain established dedicated responsive customer workspace. |
| PRODUCT-WEB-NOTIFICATIONS | `/notifications` | Apply shared operational form hierarchy and readable workspace headings; site.tsx also owns account/refill-plan rendering. |
| PRODUCT-WEB-RECURRING | `/recurring` | Apply shared operational form hierarchy and readable workspace headings; site.tsx also owns account/refill-plan rendering. |
| PRODUCT-WEB-PURCHASE-CREDIT | `/purchase-credit` | Apply shared operational form hierarchy and readable workspace headings; site.tsx also owns account/refill-plan rendering. |
| PRODUCT-WEB-ACCOUNT-SETTINGS | `/account-settings` | Apply shared operational form hierarchy and readable workspace headings; site.tsx also owns account/refill-plan rendering. |
| PRODUCT-WEB-SUPPORT | `/support` | Apply shared operational form hierarchy and readable workspace headings; site.tsx also owns account/refill-plan rendering. |
| PRODUCT-WEB-CONSUMPTION | `/consumption` | Apply shared operational form hierarchy and readable workspace headings; site.tsx also owns account/refill-plan rendering. |
| PRODUCT-WEB-FORGOT-PASSWORD | `/forgot-password` | Retain existing branded catalogue, account/recovery or checkout layout; preserve cart, authentication and payment states. |
| PRODUCT-WEB-RESET-PASSWORD | `/reset-password` | Retain existing branded catalogue, account/recovery or checkout layout; preserve cart, authentication and payment states. |
| PRODUCT-WEB-VERIFY-EMAIL | `/verify-email` | Retain existing branded catalogue, account/recovery or checkout layout; preserve cart, authentication and payment states. |
| PRODUCT-WEB-ACCEPT-INVITATION | `/accept-invitation` | Retain existing branded catalogue, account/recovery or checkout layout; preserve cart, authentication and payment states. |
| PRODUCT-WEB-PRODUCTS | `/products` | Retain existing branded catalogue, account/recovery or checkout layout; preserve cart, authentication and payment states. |
| PRODUCT-WEB-HOW-IT-WORKS | `/how-it-works` | Retain intentional branded marketing/legal layout; product dashboard furniture would obscure the page purpose. |
| PRODUCT-WEB-ABOUT | `/about` | Retain intentional branded marketing/legal layout; product dashboard furniture would obscure the page purpose. |
| PRODUCT-WEB-BUSINESS | `/business` | Retain intentional branded marketing/legal layout; product dashboard furniture would obscure the page purpose. |
| PRODUCT-WEB-HELP | `/help` | Retain intentional branded marketing/legal layout; product dashboard furniture would obscure the page purpose. |
| PRODUCT-WEB-ACCOUNT | `/account` | Retain established dedicated responsive customer workspace. |
| PRODUCT-WEB-LOGIN | `/login` | Retain existing branded catalogue, account/recovery or checkout layout; preserve cart, authentication and payment states. |
| PRODUCT-WEB-REGISTER | `/register` | Retain existing branded catalogue, account/recovery or checkout layout; preserve cart, authentication and payment states. |
| PRODUCT-WEB-CART | `/cart` | Retain existing branded catalogue, account/recovery or checkout layout; preserve cart, authentication and payment states. |
| PRODUCT-WEB-CHECKOUT | `/checkout` | Retain existing branded catalogue, account/recovery or checkout layout; preserve cart, authentication and payment states. |
| PRODUCT-WEB-TRACK | `/track` | Retain established dedicated responsive customer workspace. |
| PRODUCT-WEB-ORDERS | `/orders` | Retain existing branded catalogue, account/recovery or checkout layout; preserve cart, authentication and payment states. |
| PRODUCT-WEB-WALLET | `/wallet` | Retain established dedicated responsive customer workspace. |
| PRODUCT-WEB-REWARDS | `/rewards` | Retain existing branded catalogue, account/recovery or checkout layout; preserve cart, authentication and payment states. |
| PRODUCT-WEB-SCHEDULES | `/schedules` | Apply shared operational form hierarchy and readable workspace headings; site.tsx also owns account/refill-plan rendering. |
| PRODUCT-WEB-REFILL | `/refill` | Apply shared operational form hierarchy and readable workspace headings; site.tsx also owns account/refill-plan rendering. |
| PRODUCT-WEB-PRIVACY | `/privacy` | Retain intentional branded marketing/legal layout; product dashboard furniture would obscure the page purpose. |
| PRODUCT-WEB-TERMS | `/terms` | Retain intentional branded marketing/legal layout; product dashboard furniture would obscure the page purpose. |
| PRODUCT-WEB-DELIVERY | `/delivery` | Retain intentional branded marketing/legal layout; product dashboard furniture would obscure the page purpose. |
| PRODUCT-WEB-CONTACT | `/contact` | Retain intentional branded marketing/legal layout; product dashboard furniture would obscure the page purpose. |
| PRODUCT-WEB-HOME | `/` | Retain established branded purpose-specific layout; shared service forms refreshed where present. |
| PRODUCT-WEB-PRODUCTS-DETAIL | `/products/:id` | Retain established branded purpose-specific layout; shared service forms refreshed where present. |
| PRODUCT-WEB-SERVICES-DETAIL | `/services/:id` | Retain established branded purpose-specific layout; shared service forms refreshed where present. |
| PRODUCT-WEB-ACTIVATE | `/activate` | Retain established branded purpose-specific layout; shared service forms refreshed where present. |
| PRODUCT-WEB-PAYMENT-RETURN | `/payment-return` | Retain established branded purpose-specific layout; shared service forms refreshed where present. |
| PRODUCT-WEB-PAYMENT-REQUEST | `/payment-request` | Retain established branded purpose-specific layout; shared service forms refreshed where present. |
| PRODUCT-NATIVE-CUSTOMERHOME | `native:CustomerHome` | Approved native product shell retained. Native source audit only; user deferred mobile builds. Runtime visual acceptance remains open. |
| PRODUCT-NATIVE-TECHNICIANWORKSPACE | `native:TechnicianWorkspace` | Approved native product shell retained. Native source audit only; user deferred mobile builds. Runtime visual acceptance remains open. |
| PRODUCT-NATIVE-DRIVERWORKSPACE | `native:DriverWorkspace` | Approved native product shell retained. Native source audit only; user deferred mobile builds. Runtime visual acceptance remains open. |
| PRODUCT-NATIVE-APP | `native:App` | Approved native product shell retained. Native source audit only; user deferred mobile builds. Runtime visual acceptance remains open. |
