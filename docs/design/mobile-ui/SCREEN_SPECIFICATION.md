# EasyGas mobile experience — screen specifications

Approved deliverable: an interactive design prototype and screen specifications, dated 2 November 2026. This is a design handoff using fictional fixtures, not a connected native application or a production release. Existing production NO-GO decisions remain unchanged.

## Open and review

Open http://127.0.0.1:3010/ for the interactive studio or http://127.0.0.1:3010/gallery.html for the overview. If the local server is stopped, run `python3 -m http.server 3010 --bind 127.0.0.1 --directory docs/design/mobile-ui` from the repository. The static index also opens directly from disk.

Choose Customer, Driver, Technician or Business. Select any screen in the inventory, then test the on-screen controls. Switch light/dark appearance, 360/390/430 px width and populated/empty/loading/error/offline/restricted state. Business role selection changes visible destinations. Reset restores the fixture journey. All prices, people, balances, dates and statuses are examples. Forms change only in-memory design state; reload resets them.

## Information architecture

99 distinct screens: 39 customer screens, 5 authentication screens, 10 driver screens, 10 technician screens and 35 business screens. All 15 current customer navigation routes and all 29 administration navigation destinations have a design relationship. Additional business screens cover contextual details, editing, approval review, import, verification and a role-filtered mobile workspace.

Customer navigation: Home, Shop, Activity, Services, Account. Driver navigation: Today, Deliveries, Sync, Account. Technician navigation: Today, Agenda, Reports, Account. Shared security/help screens retain the field role's navigation. Business navigation uses only allowed destinations, with More opening its role-filtered workspace. Desktop tables become record cards and contextual actions.

## Visual foundations and components

Use semantic tokens, not inverted screenshots. Light surfaces: background #f7f9f5, cards #ffffff, ink #142b20, secondary text #66786c, border #e5ece4, brand #006336. Dark surfaces: background #081e17, cards #102d23, ink #eef7ef, secondary text #b4c8b9, border #2b4c3c, brand #8ddd9d. Amber denotes attention; red denotes danger; green requires a meaningful status label rather than colour alone.

Body, labels, metadata and navigation have a 15 px floor; headings use 17/19/28 px. Controls provide 44 px minimum touch targets. Use the existing HD brand image and product assets. Cards have rounded borders and clear spacing; a single prominent primary action anchors each step. Inputs have persistent labels, keyboard focus and validation feedback. Sheets trap focus, close with Escape and return focus to their trigger. Long content scrolls inside the phone; bottom navigation stays available. Reduced-motion preferences are respected. Phone safe-area treatment is illustrative and must use native platform insets during implementation.

Reusable components: role header, bottom tabs, record cards, product tiles, category chips, labelled form fields, quantity stepper, money summary, status pill, timeline, confirmation sheet, error/retry panel, skeleton, empty state, offline notice, restricted state and toast. Native font scaling, screen-reader ordering, keyboard avoidance and real hardware safe areas require device validation.

## Customer journey contracts

- Onboarding: welcome → sign in/register → email verification; recovery has a distinct email confirmation step. Production auth must use the existing session service and verified backend responses.
- Shopping: search/category → product details → basket → checkout → confirmation → order details/tracking. Gas ordering captures cylinder capacity, half-kilogram quantity and delivery location; totals update without moving surrounding layout. The server must authoritatively quote price, stock, coverage, fees and eligibility before order placement. Full-address entry proposes a location; a customer confirms it rather than trusting an ambiguous match.
- Tracking: order status and timeline, assignment details and support. No fictional live GPS marker or guaranteed ETA. Refunds are requests, not immediate money movements.
- Services: catalogue → service details → booking → appointment → quotation decision → report. Customer approval of changed quotation and acknowledgement of completed work remain separate from technician submission.
- Wallet/credit/rewards: balance and ledger, eligibility, offer details and request outcomes. Online payments remain unavailable. Prototype sample rewards never activate the real programme or alter its OFF flags.
- Cooking profiles/refill plans: purchase-history estimates, editable profile, reminders, recurring preferences and Smart Refill. Do not imply a live cylinder sensor. Account includes addresses, sessions, privacy, preferences, notifications, policies and support conversations.

## Driver journey contracts

Today → assigned deliveries → task details → pickup → whole-order handover. The proof UI asks for the complete delivery, exact cash amount where applicable and customer code. No partial handover or proof override. Failed delivery branches to issue/return guidance. Drivers cannot certify warehouse receipt or restock their own returns. Offline proof stays pending until server verification; optimistic local submission must not label an order delivered. Assignment scope is enforced by the API, never by menu hiding alone.

## Technician journey contracts

Today/agenda → assigned job → safety checklist → materials/quotation → report. Unsafe conditions stop work and expose escalation. Customer quotation approval precedes changed work. Material issue, usage and return remain reconciled records. Submitting a report does not forge customer acknowledgement. History and account remain field-focused.

## Business journey contracts

Dashboard and role-filtered workspace expose existing modules without forcing an administration sidebar onto field staff. Record cards support details and contextual edit. Import shows template download, sample validation and a review stage. Staff invitations create no staff privileges automatically. Sensitive edits require temporary reauthentication; approval review uses the shared independent-review capability. No self-approval or role-grant shortcut. Financial reconciliation, returns and launch readiness retain explicit gates.

## Screen-level contract

The inventory below assigns a stable requirement ID to every screen. Each title describes its primary task; the interactive screen is the authoritative visual/action specification. Route/API columns identify existing integration relationships, not proof that those integrations are connected here. Read actions and write operations must be resolved to existing typed backend contracts when implementing native clients; do not invent endpoints from these labels.

Each screen supports six review states: populated, empty, loading, error with retry, offline and restricted. Error must preserve existing records; restricted must not expose sensitive record content; offline must not confirm a business effect. Back returns to the originating journey; tab navigation preserves persona. Authentication failures and stale quotes must require refresh/reauthentication in the connected app.


| Requirement | Screen | Workspace / group | Existing web route | Data/action relationship |
|---|---|---|---|---|
| MUI-001 | `c-home` — Your EasyGas | customer / Overview | `/account` | customer.dashboard |
| MUI-002 | `c-shop` — Shop essentials | customer / Shopping | `/products` | catalogue |
| MUI-003 | `c-product` — Product details | customer / Shopping | `/products` | catalogue |
| MUI-004 | `c-gas` — Order cooking gas | customer / Shopping | `/gas-order` | gas.catalogue; gas.quote; checkout |
| MUI-005 | `c-cart` — Your basket | customer / Shopping | `/cart` | catalogue |
| MUI-006 | `c-checkout` — Checkout | customer / Shopping | `/checkout` | checkout; rewards.checkout-outcome |
| MUI-007 | `c-addresses` — Delivery addresses | customer / Account & support | `/account-settings` | account.profile |
| MUI-008 | `c-addressform` — Add an address | customer / Account & support | `/account-settings` | address.save |
| MUI-009 | `c-confirmation` — Order received | customer / Shopping | `/orders` | orders |
| MUI-010 | `c-orders` — My orders | customer / Orders & credit | `/orders` | orders |
| MUI-011 | `c-order` — Order details | customer / Orders & credit | `/orders` | orders |
| MUI-012 | `c-track` — Track your delivery | customer / Orders & credit | `/track` | orders; tracking stream |
| MUI-013 | `c-refund` — Request a refund | customer / Orders & credit | `/orders` | refund.lines; refund.request |
| MUI-014 | `c-services` — Professional services | customer / Services | `/services` | services.catalogue |
| MUI-015 | `c-service` — Service details | customer / Services | `/services` | services.catalogue |
| MUI-016 | `c-book` — Book a service | customer / Services | `/services` | services.slots; booking.create |
| MUI-017 | `c-bookings` — My appointments | customer / Services | `/bookings` | bookings |
| MUI-018 | `c-booking` — Appointment details | customer / Services | `/bookings` | bookings; booking.reschedule |
| MUI-019 | `c-quote` — Your quotation | customer / Services | `/bookings` | booking.quote.decide |
| MUI-020 | `c-report` — Service report | customer / Services | `/bookings` | bookings; booking.acknowledge |
| MUI-021 | `c-wallet` — My wallet | customer / Orders & credit | `/wallet` | wallet |
| MUI-022 | `c-credit` — Credit & redemption | customer / Orders & credit | `/purchase-credit` | credits |
| MUI-023 | `c-rewards` — EasyRewards | customer / Rewards & plans | `/rewards` | rewards.summary; rewards.offers |
| MUI-024 | `c-offer` — Reward details | customer / Rewards & plans | `/rewards` | rewards.offers; checkout |
| MUI-025 | `c-profiles` — Cooking gas profiles | customer / Rewards & plans | `/consumption` | refill.profiles |
| MUI-026 | `c-profile` — Your cooking profile | customer / Rewards & plans | `/consumption` | refill.profiles; refill.feedback |
| MUI-027 | `c-plans` — Refill plans | customer / Rewards & plans | `/schedules` | schedules |
| MUI-028 | `c-recurring` — Recurring orders | customer / Rewards & plans | `/recurring` | schedule.authorisations |
| MUI-029 | `c-smart` — Smart Refill | customer / Rewards & plans | `/refill` | refill.profiles; rewards.smart-offers |
| MUI-030 | `c-notices` — Notifications | customer / Account & support | `/notifications` | me; notifications.read |
| MUI-031 | `c-account` — Your account | customer / Account & support | `/account-settings` | account.profile |
| MUI-032 | `c-personal` — Personal details | customer / Account & support | `/account-settings` | account.update |
| MUI-033 | `c-security` — Security & sessions | customer / Account & support | `/account-settings` | account.profile; account.password |
| MUI-034 | `c-privacy` — Account & privacy | customer / Account & support | `/account-settings` | account.export; privacy.request |
| MUI-035 | `c-preferences` — Your preferences | customer / Account & support | `/account-settings` | preferences.save |
| MUI-036 | `c-help` — Help & safety | customer / Account & support | `/help` | policies |
| MUI-037 | `c-support` — Support conversations | customer / Account & support | `/support` | support.list |
| MUI-038 | `c-thread` — Your conversation | customer / Account & support | `/support` | support.reply |
| MUI-039 | `c-policies` — Customer policies | customer / Account & support | `/help` | policies |
| MUI-040 | `a-welcome` — More cooking. Less worry. | customer / Getting started | `/login` | login; register; account.recover; account.verify |
| MUI-041 | `a-login` — Welcome back | customer / Getting started | `/login` | login; register; account.recover; account.verify |
| MUI-042 | `a-register` — Create your account | customer / Getting started | `/register` | login; register; account.recover; account.verify |
| MUI-043 | `a-recover` — Reset your password | customer / Getting started | `/recover` | login; register; account.recover; account.verify |
| MUI-044 | `a-verify` — Check your email | customer / Getting started | `/verify` | login; register; account.recover; account.verify |
| MUI-045 | `d-home` — Today’s route | driver / Field workspace | `/orders` | orders; delivery.pickup; delivery.complete; delivery.help; delivery.return |
| MUI-046 | `d-tasks` — Assigned deliveries | driver / Field workspace | `/orders` | orders; delivery.pickup; delivery.complete; delivery.help; delivery.return |
| MUI-047 | `d-job` — Delivery details | driver / Field workspace | `/orders` | orders; delivery.pickup; delivery.complete; delivery.help; delivery.return |
| MUI-048 | `d-pickup` — Confirm collection | driver / Field workspace | `/orders` | orders; delivery.pickup; delivery.complete; delivery.help; delivery.return |
| MUI-049 | `d-proof` — Complete delivery | driver / Field workspace | `/orders` | orders; delivery.pickup; delivery.complete; delivery.help; delivery.return |
| MUI-050 | `d-issue` — Delivery issue | driver / Field workspace | `/orders` | orders; delivery.pickup; delivery.complete; delivery.help; delivery.return |
| MUI-051 | `d-return` — Return reconciliation | driver / Field workspace | `/orders` | orders; delivery.pickup; delivery.complete; delivery.help; delivery.return |
| MUI-052 | `d-offline` — Pending sync | driver / Field workspace | `/orders` | orders; delivery.pickup; delivery.complete; delivery.help; delivery.return |
| MUI-053 | `d-support` — Dispatch support | driver / Field workspace | `/orders` | orders; delivery.pickup; delivery.complete; delivery.help; delivery.return |
| MUI-054 | `d-account` — Driver account | driver / Field workspace | `/orders` | orders; delivery.pickup; delivery.complete; delivery.help; delivery.return |
| MUI-055 | `t-home` — Your workday | technician / Field workspace | `/bookings` | bookings; booking.start; booking.quote; service.material.issue; service.material.usage; service.material.return; booking.report |
| MUI-056 | `t-agenda` — Your appointments | technician / Field workspace | `/bookings` | bookings; booking.start; booking.quote; service.material.issue; service.material.usage; service.material.return; booking.report |
| MUI-057 | `t-job` — Job details | technician / Field workspace | `/bookings` | bookings; booking.start; booking.quote; service.material.issue; service.material.usage; service.material.return; booking.report |
| MUI-058 | `t-checklist` — Safety checklist | technician / Field workspace | `/bookings` | bookings; booking.start; booking.quote; service.material.issue; service.material.usage; service.material.return; booking.report |
| MUI-059 | `t-quote` — Prepare a quotation | technician / Field workspace | `/bookings` | bookings; booking.start; booking.quote; service.material.issue; service.material.usage; service.material.return; booking.report |
| MUI-060 | `t-materials` — Job materials | technician / Field workspace | `/bookings` | bookings; booking.start; booking.quote; service.material.issue; service.material.usage; service.material.return; booking.report |
| MUI-061 | `t-report` — Submit your report | technician / Field workspace | `/bookings` | bookings; booking.start; booking.quote; service.material.issue; service.material.usage; service.material.return; booking.report |
| MUI-062 | `t-safety` — Report a safety concern | technician / Field workspace | `/bookings` | bookings; booking.start; booking.quote; service.material.issue; service.material.usage; service.material.return; booking.report |
| MUI-063 | `t-history` — Completed jobs | technician / Field workspace | `/bookings` | bookings; booking.start; booking.quote; service.material.issue; service.material.usage; service.material.return; booking.report |
| MUI-064 | `t-account` — Technician account | technician / Field workspace | `/bookings` | bookings; booking.start; booking.quote; service.material.issue; service.material.usage; service.material.return; booking.report |
| MUI-065 | `b-dashboard` — Dashboard | business / Overview | `/admin` | business.snapshot |
| MUI-066 | `b-orders` — Orders | business / Sales & Customers | `/admin/orders` | orders |
| MUI-067 | `b-pos` — Retail POS | business / Sales & Customers | `/admin/pos` | pos |
| MUI-068 | `b-customers` — Customers | business / Sales & Customers | `/admin/customers` | customers |
| MUI-069 | `b-support` — Support Desk | business / Sales & Customers | `/admin/support` | support.list |
| MUI-070 | `b-products` — Products | business / Products & Stock | `/admin/products` | products.manage |
| MUI-071 | `b-inventory` — Inventory | business / Products & Stock | `/admin/inventory` | business.snapshot |
| MUI-072 | `b-cylinders` — Cylinders | business / Products & Stock | `/admin/cylinders` | cylinders |
| MUI-073 | `b-bundles` — Product & Service Bundles | business / Products & Stock | `/admin/bundles` | bundles.manage |
| MUI-074 | `b-deliveries` — Deliveries | business / Delivery & Services | `/admin/deliveries` | orders |
| MUI-075 | `b-bookings` — Service Bookings | business / Delivery & Services | `/admin/bookings` | bookings |
| MUI-076 | `b-services` — Professional Services | business / Delivery & Services | `/admin/services` | services.manage |
| MUI-077 | `b-technicians` — Technicians | business / Delivery & Services | `/admin/technicians` | services.manage |
| MUI-078 | `b-quotations` — Quotations | business / Delivery & Services | `/admin/quotations` | bookings |
| MUI-079 | `b-finance` — Wallet & Payments | business / Finance & Performance | `/admin/finance` | business.snapshot |
| MUI-080 | `b-reconciliation` — Financial Reconciliation | business / Finance & Performance | `/admin/reconciliation` | finance.summary |
| MUI-081 | `b-credits` — Credits & Refunds | business / Finance & Performance | `/admin/credits` | credits |
| MUI-082 | `b-reports` — Reports & Analytics | business / Finance & Performance | `/admin/reports` | business.snapshot |
| MUI-083 | `b-campaigns` — Campaigns | business / Growth & Engagement | `/admin/campaigns` | campaigns |
| MUI-084 | `b-recommendations` — Recommendations | business / Growth & Engagement | `/admin/recommendations` | recommendations.manage |
| MUI-085 | `b-testimonials` — Customer Testimonials | business / Growth & Engagement | `/admin/testimonials` | testimonials.manage |
| MUI-086 | `b-staff` — Staff Management | business / Administration & Control | `/admin/staff` | staff.manage |
| MUI-087 | `b-approvals` — Approval Centre | business / Administration & Control | `/admin/approvals` | approvals |
| MUI-088 | `b-settings` — Settings | business / Administration & Control | `/admin/settings` | settings |
| MUI-089 | `b-operations` — Operations Centre | business / Administration & Control | `/admin/operations` | purchasing |
| MUI-090 | `b-incidents` — Operational Incidents | business / Administration & Control | `/admin/incidents` | incidents |
| MUI-091 | `b-policies` — Customer Policies | business / Administration & Control | `/admin/policies` | policies.manage |
| MUI-092 | `b-audit` — Audit History | business / Administration & Control | `/admin/audit` | audit |
| MUI-093 | `b-readiness` — Launch Readiness | business / Administration & Control | `/admin/readiness` | production.readiness |
| MUI-094 | `b-detail` — Record details | business / Contextual flows | `/admin` | Scoped read actions |
| MUI-095 | `b-edit` — Create or edit a record | business / Contextual flows | `/admin` | Existing governed mutation actions |
| MUI-096 | `b-review` — Review approval | business / Contextual flows | `/admin` | approval.decide |
| MUI-097 | `b-import` — Import products | business / Contextual flows | `/admin` | product.import |
| MUI-098 | `b-verify` — Verify your password | business / Contextual flows | `/admin` | reauth |
| MUI-099 | `b-workspace` — Your mobile workspace | business / Overview | `/admin` | navigation |

## Validation and acceptance

Five executed design tests cover the 99-screen inventory, all six rendered states, navigation targets, field-role preservation, business allowlists, absence of live API calls, payment/GPS limitations and declared accessibility foundations. Browser inspection exercised all 99 screens in light at 390 px and dark at 360 px: 198 renders, no phone horizontal overflow and no inspected text below 15 px. See `logic-validation.txt` and `browser-validation.json`. These are prototype checks; they are not signed-device, WCAG certification or backend acceptance evidence.

## Native implementation handoff and outstanding work

Use the existing Expo application and shared business rules as implementation starting points. Translate prototype components into native primitives and navigation; retain existing service, checkout, gas-order and rewards contracts rather than duplicating business logic. Replace fictional data with authenticated reads, implement mutation validation/idempotency, permission checks, secure storage, retry/sync, notifications, actual device capabilities and server-authoritative outcomes. Validate with VoiceOver/TalkBack, large text, keyboard, low connectivity and signed builds on physical devices.

Contextual business edit forms and policy copy illustrate structure, not every field-level business rule or approved legal text. CSV import here is a sample interaction; the real import service remains authoritative. This deliverable does not resolve production database, payment, privacy erasure, TLS, email retry or operational launch blockers. Existing audit and release matrices retain their original denominators and NO-GO decisions.

The dependency order is design review → native component/navigation implementation → authenticated read integration → controlled write integration → offline/device testing → signed release verification. Backend or provider blockers do not prevent reviewing visual design, tokens, navigation and static states.
