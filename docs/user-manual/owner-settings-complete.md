# EasyGas Owner Settings and End-to-End Setup Manual

Edition 1 - 24 November 2026 | Source baseline: `ad0400c` | Audience: Owner/Admin and authorised setup staff

## 1. Start here

This manual explains every current **Business settings** category, how to change a setting safely, the setup required outside Settings, and the checks needed to operate from customer registration through payment, fulfilment, reconciliation and trip closure. In the interface, **Admin** is the business owner role; the canonical server role is `owner`.

**Important status:** this is a configuration and operating guide, not confirmation that EasyGas is ready for commercial production. The existing production **NO-GO**, actual historical-import hold and retain-all instruction remain. The website used for previous demonstrations contains synthetic data. Paystack in this codebase supports isolated **sandbox/test payments only**; there is no supported live-payment activation setting. Never use synthetic qualifications, stock, bank receipts or demonstration acceptance as evidence of real operational readiness.

The audit inspected the current source and a disposable local Owner session. It found **76 current fixture controls across nine categories**, plus **one historical labelled sandbox location** retained from the prior 77-control demo inventory. Appendix A lists every key, including that historical location. New products, services and locations can add more cards. No hosted settings, provider switches or operational records were changed during this audit. Current hosted values and provider accounts were not re-certified.

### How to use the guide

1. Follow the setup sequence in section 2 before turning on ordering or bookings.
2. Use sections 4-12 as the field reference for the nine categories.
3. Use sections 13-16 to connect staff, stock, Dispatch, services, payments and technical infrastructure.
4. Run the acceptance checklist in section 17 using isolated test data first. Resolve the exact blockers rather than bypassing them.
5. Record owners and evidence in the sign-off worksheet. Production release requires the separate business, finance, qualified safety, technical and user approvals.

### What the Owner must supply

Verified legal/contact details; real branch names; genuine coverage boundaries; reviewed policies; approved selling prices and delivery fees; supported gas quantities; real stock receipts and acquisition costs; named staff with independent reviewers; valid qualifications and calibrated equipment; approved vehicles and payload evidence; bank details checked by finance; provider ownership and sender approvals; backup/monitoring responsibilities. This guide intentionally does not invent any of these business decisions.

## 2. Configure in dependency order

| Stage | Responsible person | Work to complete | Evidence before moving on |
| --- | --- | --- | --- |
| 1. Environment and branch | Technical administrator + Owner | Correct backend/public HTTPS origin, database/schema, active branch, secure Owner access. Keep demo and business data separate. | Correct environment and branch identified; restore and security plan assigned. |
| 2. People and approval coverage | Owner + finance/safety leads | Invite staff, activate accounts, approve roles/branch privileges; provide different people for independent reviews. | Each required role can sign in; a single person with several job labels is not treated as independent. |
| 3. Identity and terms | Owner + business reviewers | Business/document identity, public contacts, hours, reviewed and effective customer policies. | New document preview and public policy/contact checks match verified facts. |
| 4. Sellable stock and gas | Inventory/finance + qualified staff | Genuine stock receipts, serials, acquisition costs, meters and qualifications; approved prices, gas quantity rules and product visibility. | Available stock is positive and supported; valuation is complete or honestly unavailable. |
| 5. Coverage and scheduling | Owner/authorised manager | Delivery locations and boundaries, address-confirmation mode, windows, capacity and flat fee. | A real supported address and available window can be quoted in the intended branch. |
| 6. Payment method | Finance + independent approvers + technical administrator | Select supported wallet/COD/test-online path, verified bank funding instructions if used, and reconciliation responsibility. | A test payment is verified by the server/ledger; redirects and reported transfers never substitute for verification. |
| 7. Fleet and Dispatch | Owner + authorised manager + driver | Suitable vehicle, capacities, on-duty available driver, active trip, assignment controls and genuine gas/product custody. | Dispatch checklist and the particular order's eligibility both pass. |
| 8. Service bookings | Service manager + qualified reviewer + technician | Approved checklist first, then active offering, pricing/coverage and qualified available technician. | An isolated booking can progress through quote/approval, work, report, invoice and materials reconciliation. |
| 9. Optional programmes | Owner + finance/marketing | Rewards, offers, recurring COD, retention messaging, reviews and route estimates only if actually needed. | Each programme has its own policy, technical enablement and consent/acceptance evidence. |
| 10. End-to-end acceptance | All accountable roles | Successful and failed order journeys, independent cash/return checks, trip end, support/refund and infrastructure recovery. | Written evidence and unresolved items reviewed; commercial release separately authorised. |

Stages 4-7 are linked. Setting **Accept delivery orders** to Enabled does not create stock, a driver, a vehicle or payment configuration. A green branch checklist does not certify every order. Do not open an incomplete route to customers simply because a toggle can be saved.

## 3. Navigate, edit, approve and recover

Open **Admin -> Settings**. The page title is **Business settings**. Check **Settings branch** before editing. Owner links can specify a branch using the request scope; other staff remain branch restricted. If a small badge disagrees with the page's scope, stop and check the editor's branch and request scope. This audit found that the small badge uses the user's branch rather than always reflecting the selected scope.

Use **Search settings** for the current title, a previous title/category, or the stable key in Appendix A. Select a category to clear search. Legacy sections start collapsed; matching searches expose them. **Gas stock, pricing and delivery tools** is an additional expandable operational panel, not a tenth category.

The management shortcuts above Settings link to existing workspaces: **Business Controls** is this page; **Reports & Branches** opens the Branch Performance report; **Approval Review** opens approval decisions; **Roles & Access** opens staff role/branch/individual privileges; **Audit History** opens the immutable action record. They grant no additional permission. Actual branch records are reviewed in Operations Centre.

Every card shows the active value and version, permitted actions, ownership metadata and history. **View only** means your account cannot propose; **Read only** identifies a locked definition. Viewing does not grant edit or approval rights. **Verify Identity** and inline password confirmation use your own current password, never the driver's or another approver's password.

### Make a change safely

1. Open **Edit Setting**, **Propose Change** or the appropriate named action. Check the branch, active version and approval guidance.
2. Enter the intended values, respecting the units printed on each field. A blank value is not automatically zero.
3. Enter a meaningful **Reason for change** (server minimum five characters; use a useful operational explanation).
4. If needed choose **Schedule for later**. Editor times use **Africa/Lagos**. The proposed activation date must be within the server's six-day scheduling horizon; requests expire after seven days. A legal policy's public effective date is a different field.
5. Choose **Review change**. Check the full configuration, reason, timing and before/after values. Review alone saves nothing.
6. Use the final confirmation action. If **Confirm it's you** appears, enter your current password and use **Verify & submit**. A recent verification can be reused only while the server permits it.
7. Check the returned request state in **Approval Centre**. Do not assume that a saved or approved request is already active.
8. Refresh the setting and check the new active version and the downstream screen before declaring the configuration complete.

### Understand approval states

| State or badge | Meaning and next action |
| --- | --- |
| Draft | Inactive and outside the approval queue. Resume it in Approval Centre, review, then submit when ready. **Save draft** has its own review and final confirmation. |
| Routine change | Eligible low-risk requests can activate under the existing routine policy. Check the resulting active version. |
| Automatic approval | Available only when the deployment's Owner auto-approval policy is enabled and the server marks this definition eligible. It does not bypass identity, scheduling, version, qualification or safety checks. |
| Pending / partially approved | Obtain the displayed missing independent decisions. The requester cannot be their own independent reviewer. |
| Approved / scheduled | Approved authority exists; activation may still be waiting for its time or other checks. The current value stays in use until activation succeeds. |
| Active | This version has been applied. Verify the actual downstream behavior as well. |
| Failed / conflicted / expired | Read the reason. Refresh and review current state; obtain a new review/request when required. Do not repeatedly submit stale values. |
| Returned / rejected / cancelled | Follow the request's actual permitted actions. A returned revision needs correction and new review; a rejection is not activation. |

The local audit environment has Owner auto-approval **off**, whereas the earlier demo inventory recorded it **on** for eligible settings. Approval requirements must therefore be read from the current server/card, not copied from a screenshot. Protected payment, privilege and finance operations retain their independent controls. Safety checklists additionally require a genuine qualified independent reviewer even when Owner business approval is automatic.

### Restore a prior value

Open the history icon, inspect the version, then use **Request restoration of previous value** if your role permits proposals. Restoration is a new governed change, not deletion of history. Current validation, branch, identity, version and approval/activation rules still apply. Pending or failed restoration leaves the current value in use. Historic values that no longer pass validation need a corrected new proposal.

### Recover from errors

Wrong password: correct verification in the same form; review any retained entries. Version conflict: preserve your intended values, refresh, and compare against the current version before submitting again. Session expired/revoked: sign in with your own account and recheck authority. An uncertain timeout may have saved the request: inspect Approval Centre/history before retrying. Closing an edited form asks before discarding; a pending submission blocks dismissal. Never record passwords, account links or codes in the reason/evidence fields.

## 4. Business & Website

Four controls separate public appearance, financial document identity, opening hours and customer-review rules.

### Invoice & receipt business details - `document.identity`

Enter **Legal business name**, **Registered/business address**, **Business phone** and **Verification evidence reference**. Optional verified email, HTTPS website, registration/RC number and tax identifier may remain empty if unavailable; do not invent them. Use plain text. The optional website must be approved HTTPS without credentials, query or fragment. Check the unapproved identity preview, submit through the normal review, and verify a newly issued synthetic document.

This affects **new** documents; previously issued invoices/receipts preserve their snapshots. The document renderer has an explicit fallback/warning until a valid approved identity is available. Document template selection is also a separate technical flag. Public website contacts do not replace this legal identity.

### Branch opening hours - `business.hours`

Use a single 24-hour range, for example `09:00-18:00`, with end after start. This example is formatting guidance, not the approved business hours. This field is customer-facing information; delivery bookable windows and their capacity are separate. The current validator does not accept an overnight range whose end precedes its start; ask for a product change if split or overnight operating hours are needed.

### Homepage & public contact details - `website.content`

Configure hero heading, emphasis, subheading and service heading; choose an allowed existing hero image asset; verify primary/secondary Nigerian phone numbers, public address, optional email, Instagram and Linktree URLs. Phone format is international `+234...` within the supported mobile pattern. Social links must be HTTPS on `www.instagram.com` and `linktr.ee` respectively. Arbitrary image uploads and arbitrary social hosts are not supported by this editor.

The schema limits these plain-text heading/contact fields to 3-150 characters and forbids HTML markup. Use one of the two existing hero image paths shown in the audit source reference; an uploaded filename will be rejected. After activation inspect public Home, contacts and service links. Editing copy changes no price, stock or coverage setting.

### Customer review publication rules - `testimonials.policy`

Configure programme availability, separately consented photos, minimum/maximum text length, public display count, per-customer daily limit, in-app notifications, review-retention interval, photo size and formats. Limits: minimum length 20-500; maximum 100-2,000 and not below minimum; public count 1-30; daily limit 1-10; retention review 90-3,650 days; photo 1-8 MB; accepted formats JPEG, PNG or WebP, at least one. Moderation is mandatory and cannot be disabled.

Retention days trigger review, **not automatic deletion**. Text publication consent and photo consent are separate. To show a review publicly, complete the eligible customer's submission/consent, Owner moderation/approval and the distinct **Publish** action in **Customer Testimonials**. Approval alone does not publish. See the current [testimonial guide](testimonials.md) for state-specific controls. Do not publish a customer's content merely to test configuration.

## 5. Policies & Terms

Nine policy cards are retained: delivery, refund, cancellation, service booking, service warranty, EasyRewards, prepaid wallet credit, privacy and general terms. Stable keys are `legal.delivery`, `legal.refund`, `legal.cancellation`, `legal.service-booking`, `legal.warranty`, `legal.loyalty`, `legal.purchase-credit`, `legal.privacy`, `legal.terms`.

For each, open **Content**, set a title (3-150 characters), and enter reviewed policy text (up to 20,000 characters). In **Publication**, choose visibility and a Lagos effective date. A published policy needs at least 100 trimmed characters and a non-null effective date. Future-effective text is not returned by the public effective-policy endpoint until its date arrives. Drafts publish nothing.

The business must review wording for its actual services and responsibilities. This manual does not supply or certify legal policy text. Policy publication does not configure refunds, delivery fees, wallet access, safety or message consent by itself. Test the policy a customer actually sees, including checkout/service acceptance references where applicable.

**Multiple branches:** policy publication currently writes to the shared legal-document record by policy kind. Its request is scoped, but the published document is not a separate per-branch copy. Treat policy text as business-wide. Obtain a technical review before attempting different policy wording by branch.

## 6. Gas & Products

There are 26 current cards: two current gas controls, twelve product selling-price cards and twelve product visibility cards. Four of the price cards are legacy fixed-refill controls; they remain listed explicitly in Appendix A.

### Gas selling price per kg - `gas.price_per_kg`

Enter the approved price in **naira per kilogram** in the money editor. Values are stored as integer kobo. New gas quotes use this price and current quantities; old issued financial snapshots do not become editable when the price changes. An example such as NGN 1,800.29 corresponds to 180029 kobo, not 1,800,290. Check the full review and a fresh quote after activation; do not treat the example as the business price.

### Gas order quantities & cylinder sizes - `gas.quantity_policy`

Set **Minimum quantity (kg)**, **Maximum quantity (kg)**, **Quantity increment (kg)**, **Decimal places**, and the comma-separated list of supported **Cylinder capacities (kg)**. Complete all operational quantity rules before enabling gas ordering, even where the editor allows an unconfigured blank. Minimum must not exceed maximum. Kilograms allow up to three decimal places; precision is 0-3; capacities must be distinct, positive and no more than 50 entries. Quantity/capacity values are bounded by the schema at 1,000 kg.

Choose values approved by the business and qualified safety staff. A nominal cylinder capacity is not permission to fill: real eligibility still requires current inspection, appropriate headroom and equipment/custody checks. Test minimum, maximum, increment and precision boundaries in isolated checkout, including one invalid quantity.

### Product selling price and storefront visibility

Each catalogue product has two separate cards: `price.<product-id>` and `publish.<product-id>`. Current products include empty cylinders (6 kg, 12.5 kg, 25 kg and 50 kg), corresponding refill entries, Double Burner, Gas Hose, Gas Regulator and Kitchen Starter Kit. The exact ID for 12.5 kg entries ends in `-12`; use the card label rather than guessing an ID from a capacity.

For equipment/accessories, approve a valid naira price first, then request storefront visibility. Server activation requires a positive approved price before publication. Receive real stock through Inventory; a price or visibility toggle adds no stock. Confirm the customer sees only the intended branch item and can select no more than its actual availability. Some public catalogue/service-preview paths currently assume Lagos; full multi-branch customer storefront acceptance is an open audit finding, not a guaranteed capability of these controls.

For gas refills, new gas quotations use the per-kg and quantity policy. The four old fixed-refill `price.refill-*` cards are **legacy**, not the current gas-pricing master. Their paired `publish.refill-*` controls still affect storefront visibility; do not confuse a historical price with a redundant visibility control. Existing inventory publication constraints still apply, so investigate a price prerequisite error rather than bypassing it.

## 7. Delivery & Dispatch

Eleven current fixture cards plus the retained historical sandbox location cover ordering, scheduling, fees, route estimates, recurrence and coverage. Driver/vehicle records are configured outside these cards.

### Accept delivery orders - `delivery.enabled`

Enable only after stock, gas/product prices, supported quantities, verified coverage, payment route, delivery windows/capacity and operational staffing are ready. Confirm a fresh customer quote. Switching this on cannot by itself make a blocked order assignable.

### Bookable delivery windows - `delivery.windows`

Enter comma-separated 24-hour ranges, for example `09:00-13:00,14:00-18:00`. Each end must follow its start. Keep them aligned with the real staffed delivery schedule; opening hours are a separate display setting. Check the customer calendar and rescheduling screen. Do not assume overnight or overlapping windows have extra validation just because the string is accepted; use distinct non-overlapping operational windows.

### Order capacity per delivery window - `delivery.capacity`

Choose a whole number from 1-10,000 representing maximum active orders for each delivery date/window. Set it to actual dispatch capacity, not a desired sales target. Existing branch locking prevents overbooking. Test the last available slot and a further order in disposable data; cancel/reschedule only through the guarded workflow.

### Flat customer delivery fee - `delivery.fee`

Enter the approved **naira per eligible physical delivery order**, between NGN 0 and NGN 10,000 under the current definition. A zero fee is deliberate free delivery, not missing configuration. The fee is charged once for that order/visit according to the existing checkout rules. A professional-service call-out charge and route-planning fuel estimate are separate.

### Delivery coverage locations - `location.<id>`

For an existing location configure name, city, state, country, **Confirmed delivery boundary**, description, display order, active, visible and archived. The fulfilment branch is fixed to the request scope. Archived locations must be inactive and hidden; archived and active cannot both be true. Display order is a whole number from 0-10,000.

Choose coverage handling carefully: **Staff confirms each actual address before dispatch** retains per-order checks; **Owner-approved coverage of the entire named area** requires genuine Owner approval that the whole named area is serviceable. A short location name is not a geofence or proof of a deliverable street address. A non-empty, genuinely confirmed boundary is required for ordering, even though the raw location schema permits an empty string. A changed location version can require new coverage confirmation for an existing order.

To add a location, expand **Gas stock, pricing and delivery tools -> Manage gas stock, delivery locations and reports -> Add delivery location**. Enter the real branch and coverage evidence, then follow proposal/approval. The seeded Ajah, Lagos Island, Lekki and Victoria Island entries must not be assumed to cover every actual address. The historical **SANDBOX ONLY - Payment Test** entry must not be reused as a real business delivery area.

### Dispatch route & cost estimates - `dispatch.routing`

Configure enabled status, **Fuel cost per litre (kobo)**, **Other operating cost per kilometre (kobo)**, **Allowance per stop (minutes)** and **Maximum road snap distance (metres)**. All must be explicitly configured before enabling. Fuel is positive; other operating rate can be zero; stop allowance 0-240 minutes; snap distance positive up to 1,000 m. These currency fields currently use **kobo**, unlike the naira money editor.

The feature also needs the separately enabled trusted routing processor, approved destination pins, recent consented driver GPS and an explicit vehicle fuel-use rate where required for fuel estimates. Do not treat straight-line distance, old GPS or odometer estimates as live road evidence. The estimate changes neither the customer delivery fee nor the order's eligibility.

### Recurring cash-on-delivery orders - `subscription.enabled`

This permits the existing recurring COD flow, not automatic card or wallet debits. Each customer must explicitly consent and set a price ceiling. Price, availability, location/window and payment checks still run when an order is generated. Confirm the supervised scheduling worker is running; a saved toggle without jobs will not reliably generate due orders. Test a price above the ceiling and a missed/invalid window before opening the programme.

### Legacy delivery area list - `delivery.zones`

This historical comma-separated area string is read-only in the current definition. Use current delivery locations and actual-address rules instead. A legacy value is not sufficient coverage evidence.

## 8. Services & Safety

Five service offerings and five separate safety checklists currently cover Cooker Installation, Cooker Servicing, Cylinder Installation, Cylinder Maintenance and Gas Safety Checks. Each offering has a `service.<id>` card and a `checklist.<id>` card. Availability, pricing, qualifications and safety are separate responsibilities.

### Configure and approve the checklist first

Open the service's **Safety checklist**. Add 1-40 steps; each needs a stable unique ID, a clear label (5-250 characters), and Required/Optional. Keep IDs when retaining an existing check. IDs use lowercase letters/digits/underscore/hyphen in the supported pattern; at least one step must be mandatory.

Submit for governance and independent **qualified safety review**. The current reviewer requirement checks a current `safety_review` qualification, independently verified by an active Owner; expired or self-verified qualifications are insufficient. Owner business approval does not replace that qualified decision. Confirm the active checklist version before opening the service for bookings.

### Configure the service offering

| Editor area | Fields and configuration rule |
| --- | --- |
| Service | Name 3-100 characters, description 10-2,000, active/availability, service areas, estimated duration 15-480 minutes. At least one area is required when active. |
| Pricing | Pricing model: fixed, starting, quote, labour/materials or custom. Service price is nullable; fixed active service requires an explicit price. Price range NGN 0-1,000,000; call-out NGN 0-100,000. Enter naira; blank is unconfigured while zero means no charge. State inclusions and exclusions, each at least five characters. |
| Requirements | Required qualification code, preparation, safety instructions, warranty and cancellation notice. Qualification code uses the server's lowercase identifier pattern. Cancellation notice is 0-168 hours. Instructions/warranty must be substantive, at least five characters. |

An active service cannot activate until its safety checklist exists and has an approved version. Create/verify technician qualifications and availability in the service/staff operational tools. A typed qualification code is not evidence that a person actually holds it.

After activation, test the public service description, areas and price display; create an isolated booking; assign a qualified available technician; progress the quotation/customer approval, report, materials, invoice and independent review path. Do not represent a quote-based estimate as a final fixed invoice. Service warranty text and the global published warranty policy should agree, but editing one does not automatically update the other.

## 9. Payments & Wallet

All six controls are in this category. The **Wallet & Payments** sidebar workspace is for actual balances/records; Settings is for configuration. No setting below makes live Paystack processing supported.

### Online payments & fees - `payment.gateway`

| Tab | What to enter | Dependencies and check |
| --- | --- | --- |
| Checkout | Sandbox enablement, supported channels (card, bank, USSD, bank transfer), merchant approval reference, provider automatic-fee status. | Server test configuration and real sandbox merchant acceptance. Automatic fees must be verified off; at least one channel, an explicit fee policy and a non-empty approval reference are required to enable checkout. |
| Quote timing | Quote validity 60-1,800 seconds. | Prices/fees can change; expired quotes must be refreshed. |
| Fees | Merchant/customer fee bearer, percentage, fixed fee and optional cap. Percentage 1.50 means 1.50%; money fields use naira. | Customer fee pass-through needs merchant permission. A blank cap is no cap; zero cap is a zero cap. |
| Advanced fee rules | Fixed-fee waiver threshold, maximum total charge and provider rounding. | Match approved provider rules. Illustrative quotes do not constitute issued payment quotes. |
| Wallet | Sandbox card top-ups, minimum and maximum top-up/balance controls, partial invoice payments. | Minimum must not exceed maximum. Current policy bounds card minimum/maximum to positive amounts up to NGN 1,000,000; fee/principal limits can lower the effective permitted amount. |
| Review | Actual before/after values, reason, timing and full configuration. | Submit through protected finance/Owner approval; inspect active version and a new sandbox quote. |

Do not put API keys in these fields. Server-only sandbox credentials, data classification, callback origin and explicit webhook signature mode are configured by the technical administrator. Use labelled test accounts with a provider-acceptable email. A browser return saying success is not a payment receipt: authenticated server verification or accepted signed webhooks must reconcile the original payment once. Do not pay again while the result is uncertain; inspect the order/payment record first.

### Wallet access - `wallet.enabled`

Controls verified purchase-credit spending and the bank-transfer funding request path. Enabling requires a supported active customer funding branch, configured bank instructions and the existing funding approval/reconciliation process. This does not invent a wallet balance or approve a reported transfer.

### Cash & bank-transfer wallet limit - `wallet.maximum`

Enter the approved naira funding ceiling: NGN 100-1,000,000 under the current definition. Bank requests also check the resulting wallet balance. This is distinct from the card top-up limits inside Online payments & fees. Test both the amount and resulting-balance limits without real money.

### Cash on delivery - `payment.cod`

Enable only if actual collection and independent cash verification can be performed. COD remains unpaid until the applicable cash-verification workflow completes. A driver's delivery completion, a recorded collection and a finance-confirmed receipt are distinct states. The restricted driver workspace does not gain finance or product-COD collection/verification privileges from this toggle.

### Settlement bank details - `payment.settlement`

Enter bank name, account holder and exactly 10 account-number digits, checked against verified business evidence. The setting has protected Owner/finance review. It stores governed settlement metadata; it does **not** configure Paystack credentials or customer wallet funding instructions.

For customer bank-transfer instructions, the technical administrator must separately configure the approved branch-keyed `EASYGAS_WALLET_BANK_ACCOUNTS` object with bankName, accountName and accountNumber. Confirm customer Wallet displays that branch's approved destination and finance independently verifies actual receipt before granting credit. Do not copy unverified demo bank values.

### Legacy payment integration - `payment.integration`

This is an advanced protective compatibility control. Turning it true is explicitly rejected by the current server. Use **Open online payment settings** for sandbox configuration. Live merchant activation needs a separate supported implementation and acceptance; changing this old switch cannot provide it.

## 10. Rewards & Retention

Seven cards cover the current programme, two evidenced one-time operations, retention and three historical fields. Rewards are optional; order fulfilment should not depend on activating them.

### EasyRewards programme - `loyalty.policy`

The **Points / Services / Offers** editor configures the current policy. Points fields currently use integer **kobo** and **basis points** where labelled, not naira/ordinary percentages: 100 kobo = NGN 1; 2,000 basis points = 20%. Check units individually.

| Area | Configure and validate |
| --- | --- |
| Points | Enable earning, checkout discounts and first qualifying referral bonus independently. Spend per point: 100-100,000,000 kobo; discount per point: 1-10,000 kobo; minimum checkout points 1-1,000,000; maximum discount 1-10,000 basis points; eligible product categories (1-30 non-empty entries); referral points 0-100,000, positive if referrals enabled. |
| Services | Service earning toggle and explicit eligible service IDs, up to 50. Use actual active catalogue IDs and qualifying verified service completion/payment rules. Selecting a service does not relax its safety or billing gates. |
| Offers | Up to 30 offers, with stable unique lowercase ID, title, description, points cost, funded kobo budget, per-customer usage cap, frequency, start/expiry, Smart Refill eligibility and active status. Expiry must follow start; active offers must meet minimum points and fund at least one claim. |

Service earning covers qualifying verified completed labour; call-outs and materials do not earn points. Offer date inputs currently require the labelled ISO date/time format. Offer budgets are consumed by committed redemptions; refunds do not replenish them.

Offer points cost is 1-1,000,000; budget 1-100,000,000,000 kobo; per-customer cap 1-100 uses; frequency 1-365 days. Smart Refill is an offer eligibility flag, not permission to debit a customer automatically.

Policy activation alone is insufficient: technical issuance and redemption flags are separate and require acceptance. Referral awards and earning require their current qualifying purchase controls; they are not a blanket sign-up bonus. The base engine has no general points expiry, membership tiers or welcome-bonus setting. Current checkout discounts are not a points-to-wallet transfer. Do not follow stale helper copy suggesting referrals and services are always excluded: use the actual current policy fields and runtime qualification rules.

### Customer points adjustment - `loyalty.adjustment`

This is an **evidenced one-time correction**, not a recurring global programme value. Select the correct customer UUID, a nonzero whole adjustment from -1,000,000 to 1,000,000 points, a reason of at least ten characters and evidence of at least ten characters. Review the branch/customer and obtain protected independent decisions. It posts an immutable points correction once; it does not move money into a wallet. Check history before resubmitting an uncertain request.

### Referral eligibility review - `loyalty.referral_review`

Enter the actual attribution UUID, Hold/Clear/Block decision and evidence/reason of at least ten characters. Independent review and branch ownership still apply. A shared address alone is not fraud evidence. This changes the eligible referral review record, not all referrals.

### Customer retention & win-back rules - `crm.retention`

Configure enabled status, **At-risk threshold** (7-365 days), **Dormant threshold** (8-730 days, greater than at-risk), monthly message budget in kobo (0-100,000,000), and conservative per-message cost ceiling in kobo (0-100,000). Enabling requires both budgets positive. Use approved budgets and actual provider costs.

The CRM policy does not grant marketing consent or send messages by itself. Staff must use the campaign flow with current consent, suppression/opt-out, approved templates and provider availability. The technical sending controls, encryption key and supervised jobs remain separate. Verify a controlled sandbox recipient and suppression/cancellation cases first; never send a marketing test to real customers without authorisation.

### Historical rewards fields

`loyalty.enabled`, `loyalty.spend_per_point` and `loyalty.credit_per_point` remain searchable in **Legacy rewards controls**. They are not the current programme master. The old monetary fields use the ordinary money editor in naira despite historical key/label references to kobo. A historic conversion rate does not activate points-to-wallet conversion. Leave historical controls alone unless there is a reviewed compatibility requirement.

## 11. Stock & Valuation

### Stock valuation method - `inventory.valuation`

Choose **Unconfigured** or **Weighted average of complete recorded acquisition costs**. This uses existing stock movements and receipt costs. It changes neither physical counts nor selling prices. A selling price is not an acquisition cost.

Before using weighted average, finance/inventory must verify opening quantities, receipt unit costs, movements, returns/transfers and the agreement between movements and on-hand balance. Unknown opening/receipt/return costs or inconsistent quantity keep valuation **unavailable**; the system does not substitute zero or sales revenue. Reconcile the source through authorised Inventory/Purchasing workflows, retaining history. Do not directly edit a database balance to make the report look complete.

Physical gas receipt, product receiving, cylinder serial registration, allocation and vehicle custody take place in operational workspaces. The expandable Settings gas tools include **Receive verified bulk gas**, inspection and location/report actions; these are real operational writes with their own role/evidence checks, not harmless display preferences.

## 12. Staff & Security

### Staff roles & branch access - `security.permissions`

Use this protected editor to change an **existing active account**. Enter the person's email, choose **Find account**, verify name/current role, then select the intended role. The assigned branch comes from the request scope. Your own account and inactive accounts cannot be used for self-promotion. The receiving person cannot independently approve their own access request.

Staff creation/invitations, individual privilege overrides and activation are separate Staff tools. Use separate named accounts and least-privilege permissions. Role/branch changes revoke affected existing sessions; the person must sign in again to receive current access. A manager's title is not unrestricted cross-branch authority.

| Canonical role / interface label | Operational responsibility |
| --- | --- |
| owner / Admin | Business configuration, eligible Owner decisions, staff oversight, vehicles and release review. Does not waive independence/safety/finance controls. |
| manager / Service Manager | Branch sales/dispatch/service operations within role and individual privileges. Has seven Settings categories in the earlier live audit, not universal payment administration. |
| finance / Inventory | Inventory, payments, cash/credit and financial reviews within branch/privileges. Has eight Settings categories in the earlier audit; view permission is not proposal permission. |
| driver | Assigned deliveries/trips, duty availability, independent custody acknowledgement and consented GPS. No Admin Settings workspace. |
| technician | Assigned service work and qualified reviews only where actually authorised. No Admin Settings workspace. |
| customer / commercial | Own account, orders, bookings, wallet and consent. No staff Settings authority. |

### Approval safeguards (read-only) - `security.policy`

The release locks this definition. Server validation rejects attempts to weaken the approval policy. Do not look for a UI setting to remove a second approver, override qualification, self-approve privileges or clear custody. Resolve the missing authorised person/evidence instead. If business governance must change, it needs a separately reviewed product/security change.

## 13. Configure staff, stock, equipment and Dispatch outside Settings

### Branch and staff readiness

Use **Operations Centre -> Branches** to review active branches. Owners with multiple branches choose the intended branch; managers operate within their assigned branch. Invite/create and activate driver, manager, finance and technician accounts using the authorised Staff/Drivers tools. Review any individual privilege denial: changing a category or availability checkbox cannot bypass it.

Provide different actual people for independent cash verification, stock/LPG receipt, protected approvals and qualified safety review. Do not give everyone Owner privileges to avoid configuration work. Confirm each person can reach their actual workspace and that an unauthorised role cannot.

### Physical stock and equipment

Receive genuine products/gas with supplier/physical evidence, approved counts and complete acquisition costs where valuation is needed. Register exact cylinder serials and genuine inspection status; reserve/allocate only the appropriate branch stock. Verify the loader/driver's required current qualifications and the meter's actual calibration/inspection. Settings capacity values and QA qualifications are not safety certificates.

### Register a vehicle

Open **Deliveries -> Fleet & trips -> Register vehicle** as Owner. Select the real branch; enter registration/label, positive approved gas capacity, genuine physical-product payload capacity when carrying goods, and measured fuel-use rate if route cost estimates are needed. Confirm LPG suitability only with genuine evidence. Some operational forms use **grams** and some displays use **kg**: 1 kg = 1,000 g. Enter the field's printed unit. Verify your own current password and check the vehicle record.

A manager can review fleet/trips but cannot use Owner-only registration. A vehicle must be active, in the order's branch, suitable and available before trip assignment. Physical product payload and approved gas capacity are different limits.

### Assign a vehicle and start a driver trip as Admin

1. Open **Deliveries -> Dispatch setup checklist** and choose the fulfilment branch.
2. Resolve Branch, Drivers, Vehicles and Operational readiness using the direct links. Choose **Refresh setup** after another person completes a prerequisite.
3. Choose **Assign vehicle to driver**. Select an active branch driver without an active trip and an available suitable branch vehicle.
4. Enter the actual starting odometer. Confirm on-duty availability only if the driver is truly on duty; otherwise retain the existing availability.
5. Enter your own current password and use **Verify and assign vehicle**. Driver sign-in is not required for the Admin action. It creates a trip, not a permanent vehicle-account relationship.
6. Confirm the driver sees that same active trip and availability reflects actual duty. GPS sharing remains off unless the driver personally gives consent.

Drivers or vehicles already on a trip cannot be assigned a second active trip. Use **Manage trip** to reconcile/end/change vehicles; do not create duplicates. Existing idempotent retry/error guidance remains in the [Dispatch guide](dispatch-setup.md).

### Assign a specific order

Prepare the order and confirm actual-address coverage, approved payment/COD exception, current invoice balance, price, stock, cylinder inspection and applicable gas/product custody. Open assignment in Orders or Dispatch. Ready drivers appear first; expand **Blocked drivers** to see exact reasons and responsible people. Resolve them, **Refresh eligibility**, then select a ready driver and enter the reason. The server rechecks everything; a stale green option cannot override a current blocker.

## 14. Run an order through delivery, reconciliation and trip end

Use this sequence for training in an isolated environment before real operations. Exact proof/stock/payment requirements depend on the order; follow the current server's blockers.

| Step | Person and action | Required result |
| --- | --- | --- |
| 1. Customer checkout | Select actual quantities, supported cylinder, verified location/address, recipient/phone and available delivery date/window. Sign in when needed; review the current quote and consent. | One order with the correct branch, current quoted amount and explicit payment state. |
| 2. Payment and invoice | Use a supported wallet/COD or authorised sandbox checkout. Finance resolves invoice corrections and required verification. | Server ledger/payment proof is authoritative; an online redirect or screenshot does not mark it paid. |
| 3. Prepare and inspect | Authorised sales/operations prepares; qualified inventory checks cylinder/gas eligibility and exact pickup manifest. Confirm coverage for this address/current location version where required. | No unresolved stock, payment, safety or address blocker. |
| 4. Dispatch | Assign a ready driver with current trip. Driver acknowledges assignment. | Current order/driver/trip match; no duplicate or cross-branch custody. |
| 5. Load and acknowledge | Qualified loader issues actual gas mass/start cumulative meter reading and/or product manifest. Driver independently checks and acknowledges custody. | Actual measured load within capacities, exact serials, current calibration and independent acknowledgement. |
| 6. Travel and fulfil | Driver confirms inspected pickup, starts delivery, records actual arrival and correct cumulative dispensing evidence for gas. | The full authorised quantity is accounted for; stale/incorrect readings are rejected. |
| 7. Proof and handover | Upload relevant current-attempt proof with consent, use the customer's private handover code and attest full handover. | Confirmed current visit, not a reused prior-attempt photo. Driver history records completion. |
| 8. Cash | Authorised operations records actual cash handover; a different authorised finance account independently verifies receipt. | Collected and verified are separate. The collector cannot verify their own cash. |
| 9. Product/LPG returns | Declare genuine remaining mass/counts, including zero where applicable; independent qualified/authorised receiver receives and reconciles. | A declaration alone does not clear custody; no unresolved discrepancy or held goods. |
| 10. End/change trip | Admin/authorised manager opens **Deliveries -> Manage trips**, refreshes reconciliation, enters ending odometer and own password. | Trip ends only after required physical reconciliation and assignment blockers clear. Vehicle becomes available; duty availability stays unchanged. |

For **Change vehicle**, also select the replacement and enter its actual starting odometer, separately from the old vehicle's ending reading. Old-trip closure and new-trip creation are atomic; if reconciliation or replacement validation fails, the old trip remains. Custody is never silently transferred. GPS stops for the ended trip and remains off on the new trip until personal driver consent. Ending a trip does not certify unrelated finance work.

### Failed delivery, cancellation and retry

Record the genuine failure reason. Goods remain in driver custody until independent exact return receipt. Do not reassign or cancel held stock as if it had already returned. Once returned, reschedule/reassign through the existing order workflow; the retry retains attempt history and must not create another wallet debit/reservation for the original order. Collect fresh current-attempt proof at the new visit.

For customer cancellation/refund, use the actual permitted order/refund action. A refund request is not credit; finance review remains separate. A financial refund does not return physical goods. Issued invoices require governed correction/void/credit-note workflows and independent approval; never overwrite an issued snapshot. See the detailed [order-to-delivery guide](order-to-delivery.md).

## 15. Run a service from booking through settlement

1. Confirm service checklist activation, offering/areas/pricing, current qualified technician and actual availability.
2. Customer chooses the supported service, address/time and requirements; confirm the appointment rather than treating a request as a guaranteed slot.
3. Authorised manager assigns an eligible technician. The technician records required inspection/diagnosis and prepares the actual quotation/materials under existing authority.
4. Obtain required internal review and customer acceptance before chargeable work. A starting/quote price is not a final approved charge.
5. Perform work only within qualified scope; complete mandatory checklist items, consented evidence and the report. Record actual material use and return/reconcile unused materials.
6. Issue the appropriate service invoice and review actual paid/verified balance. Return excess amounts/refunds through governed finance approval, not a manual balance edit.
7. Complete customer report/review delivery using the authorised channel and confirm follow-up/warranty arrangements. Resolve disputes, safety findings and invoice corrections before closing related holds.

Do not enable bookings while mandatory safety activation or genuine qualifications are missing. Use the service-workflow manual/evidence referenced in the audit for detailed exceptional recovery; this configuration guide does not authorise bypasses.

## 16. Technical administrator hand-off

The following are deployment tasks, **not switches that the Owner can finish from Settings**. Keep secrets in the deployment secret manager. Values and credentials are deliberately omitted. Naming a flag here is not authorisation to enable it or an assertion that acceptance is complete.

| Capability | Technical configuration and evidence required |
| --- | --- |
| Core backend | Canonical `APP_URL` HTTPS origin, dedicated PostgreSQL `DATABASE_URL` with verified TLS, all required schema versions (through 081; 026 was never issued), least-privilege runtime, deployment revision and web/API health checks. Run the repository release checks for the exact candidate. |
| Background work | Production web uses `EASYGAS_BACKGROUND_JOBS=false` with a separately supervised `npm run worker` process. Verify current heartbeat, restart, scheduling, retries and uncertain-send recovery. The client demo deliberately has jobs disabled and is not proof of a production worker outage. |
| Owner approval mode | `EASYGAS_OWNER_AUTO_APPROVAL` controls eligible Owner business changes. Read current server metadata. Do not enable this to bypass protected access/payment or qualified safety review. |
| Transactional email | `EASYGAS_EMAIL_ENABLED`, verified SMTP sender/host/user/password and TLS port 465 or required STARTTLS 587. Test real recovery/invitation/document delivery to approved recipients, failures and provider monitoring. A generic recovery response is not delivery evidence. |
| SMS/WhatsApp | Applicable `EASYGAS_SMS_ENABLED`/`EASYGAS_WHATSAPP_ENABLED`, approved Termii/Meta credentials/sender/templates/webhook verification, message encryption key, separate transactional/marketing consent and suppression. Verify controlled provider acceptance before sending. |
| Customer bank funding | Branch-keyed `EASYGAS_WALLET_BANK_ACCOUNTS` with finance-verified destination. Confirm branch mapping and independent receipt checks. Settlement metadata alone does not populate it. |
| Paystack sandbox only | `EASYGAS_PAYSTACK_ENABLED=true`, mode `test`, payment data class `synthetic`, server-only `PAYSTACK_TEST_SECRET_KEY`, canonical callback origin and explicit webhook signature mode/secrets. Verify quote/fees, return, signed webhook, duplicate/replay and ledger reconciliation in the isolated environment. Live credentials are rejected/unsupported. |
| Assignment and field operations | Production requires `EASYGAS_TRACKING_MUTATIONS_ENABLED` and the field-operation gate `EASYGAS_FIELD_OPERATIONS_ENABLED` as applicable, plus actual branch/driver/vehicle/order eligibility. Do not use a flag as a substitute for physical safety acceptance. |
| Bulk LPG / doorstep additions | Applicable `EASYGAS_BULK_LPG_ENABLED`, `EASYGAS_DOORSTEP_ENABLED` and production field-operation gate. Genuine metering, calibration, qualified people, reserved mass, customer consent, payment and custody reconciliation remain mandatory. |
| Road estimates | `EASYGAS_ROAD_ROUTING_ENABLED`, approved HTTPS `EASYGAS_OSRM_ORIGIN`, processor/privacy review, activated routing policy, verified destination pins and required recent consented GPS/vehicle fuel rate. |
| Rewards | `EASYGAS_REWARDS_ISSUANCE_ENABLED` and `EASYGAS_REWARDS_REDEMPTION_ENABLED` separately, with the activated programme and tested qualification/referral/offer/discount ledgers. Legacy reward switches do not replace these gates. |
| Documents | Applicable `EASYGAS_DOCUMENT_TEMPLATE_V2` for new snapshots; verify approved business identity and output. Existing documents remain immutable. |
| Media and driver location | Approved storage/private access, supported image validation, proof-retention review and retain-all handling. Customer rider GPS/map flags are separate; driver consent, recency, branch/ownership and privacy checks remain. |
| Backups and incidents | Encrypted managed/off-site backup, protected separate backup key, empty approved restore target, a demonstrated restore drill, health/error alerting and named on-call ownership. Do not restore older customer/session data to roll back presentation. |
| Web and native acceptance | Correct environment URLs and supported link origins/schemes; web and signed physical iOS/Android checks, store privacy/permissions, lifecycle/offline/assistive acceptance. A deployed web configuration does not rebuild an installed mobile app. |

Use the Owner **Readiness** workspace as an evidence checklist. The code deliberately returns a **NO-GO recommendation** and includes measured as well as unverified/manual gates. Logging a readiness review or turning every UI control on does not grant production authorisation. Some current overview checks are Lagos-specific or global counts; review every intended branch and the exact release evidence separately.

## 17. Acceptance checklist and sign-off

Run software training tests only in isolated synthetic data; provider tests require approved recipients/sandbox access. Physical procedures require genuine qualified people and equipment. Mark each row Pass, Blocked or Not tested and attach evidence; do not drop an untested row.

| Gate | Acceptance evidence required | Accountable person |
| --- | --- | --- |
| Branch/access | Correct active branch; approved staff can access only intended workspaces; cross-branch/unauthorised role denied; changed role requires fresh sign-in. | Owner/security lead |
| Governance | Draft remains inactive; review does not submit; wrong password retains work; independent approval enforced; schedule/version conflict/failed activation/history restoration behave correctly. | Owner + independent reviewer |
| Business and terms | Verified public/document identity; new document reflects approved version; old snapshot unchanged; all needed effective public terms visible. | Owner/business reviewer |
| Product/gas quote | Correct price/quantity/increment/capacity/fee; unsupported quantity and insufficient stock rejected; customer sees only published supported stock. | Sales + inventory |
| Schedule/coverage | Actual address and branch supported; invalid/expired window and full capacity rejected; location-version change handled. | Dispatch |
| Payment/wallet | Correct branch destination/limits; reported bank transfer gives no credit before finance verification; sandbox callback/webhook verified once; duplicate/uncertain payment creates no double posting. | Finance + technical lead |
| Driver/trip | Admin assigns without driver sign-in; own-password guard; unavailable/cross-branch/already-used vehicle rejected; GPS consent remains personal. | Owner/Dispatch |
| Delivery | Valid payment/COD exception, invoice, stock, inspections, load acknowledgement, pickup, arrival, metering, fresh proof and code required in sequence. | Dispatch + driver + qualified inventory |
| Return/retry | Failure retains custody; independent exact return required; new attempt/new proof; no repeated original charge/reservation. | Inventory + Dispatch |
| Reconciliation/closure | Collector cannot verify own cash; remaining goods/LPG independently received; trip blocked until required reconciliation; atomic vehicle change and genuine odometers verified. | Finance + qualified receiver + Admin |
| Services | Qualified checklist activation then booking/technician/quote/customer approval/report/materials/invoice; expired qualification or incomplete mandatory check blocked. | Service/safety lead |
| Optional programmes | Consented recurring COD/ceiling; rewards policy plus technical flags; correct limits and reversal; marketing suppression and review/photo consent/publication checked. | Owner + finance/marketing |
| Operations/recovery | Supervised jobs, backup restore, provider outages, monitoring, support and incident responsibility demonstrated. | Technical/operations leads |
| Native/accessibility | Current supported devices, installed builds, links/provider returns, keyboard, large text, VoiceOver/TalkBack and lifecycle accepted for intended scope. | QA/product lead |
| Release decision | All unresolved requirements retained; business, finance, qualified safety and technical reviews complete; explicit commercial release authorisation recorded. | Owner + authorised release decision-maker |

### Sign-off worksheet

For each intended branch record: environment/candidate revision; actual branch ID; configuration key/version/request ID; accountable operator; independent approver where required; evidence date/link; acceptance result; open blocker; named person and target date to resolve it. Keep credentials, personal codes and private customer photos out of shared worksheets. Record conditional features as deliberately disabled with a reason, rather than implying they passed.

### Daily opening and closing

Opening: check branch/ordering/service availability, actual stock, due appointments/windows, current qualifications/calibration, available staff/vehicles/trips, provider/worker health and incidents. During operations refresh eligibility and current quotes after changes. Closing: reconcile cash, goods and LPG; investigate discrepancies; end/change eligible trips; match duty availability; review unresolved requests, returns, refunds, follow-ups and job/provider failures. Preserve all records under the existing retention instruction.

## 18. Troubleshooting

| Symptom | Check and action |
| --- | --- |
| Setting is missing or has no edit action | Correct branch and role, individual privileges and View only/Read only status. Do not assume all Settings readers can propose. |
| Owner request is waiting for someone else | Read current badge/Approval Centre. Auto-approval flag may be off; protected finance/access/safety decisions still need genuine independent reviewers. |
| Approved but old value remains | Check activation time, failed activation reason, current version, requester authority, qualification and worker/heartbeat. Approval is distinct from activation. |
| Gas order unavailable | Positive per-kg price; fully configured quantity policy; genuine available gas; supported/inspected cylinder; published availability and delivery/location/window/fee configuration. |
| Area appears but cannot be ordered | Genuine non-empty confirmed boundary, active/visible/non-archived area, active branch and current coverage request. Name alone is insufficient. |
| Driver list empty/blocked | Active branch driver, on-duty availability, suitable available vehicle and active trip; assignment flags and order-specific payment/stock/inspection/custody conditions. Expand blockers and refresh. |
| Cannot register vehicle | Owner-only registration, active branch, true capacities/suitability/evidence and recent own-password verification. |
| Cannot end trip/change vehicle | Unreconciled manifest/LPG, held goods/cylinders or assigned/in-transit work. Independently receive exact returns; refresh; choose a free suitable replacement. |
| Online payment is unavailable | Sandbox only; server test configuration, approved gateway policy, channels/fees/reference, webhook/callback and provider availability. The legacy switch cannot enable it. |
| Paid in provider, app still pending | Preserve original reference; inspect authenticated verification/ledger/provider return. Do not repeat payment to fix a display delay. Escalate uncertain provider status. |
| Bank transfer destination missing | Wallet enabled, active funding branch and separately configured branch-keyed bank instructions. Settlement account setting is not sufficient. |
| Customer reported payment, no wallet credit | Expected until authorised independent finance verifies actual receipt; inspect pending funding request and balance limits. |
| Service cannot be made active | Approved checklist/version, required areas and fixed price where applicable; real technician qualifications and availability. |
| Rewards still disabled | Activated current programme plus technical issuance/redemption flags and qualifying transaction. Legacy controls do not enable it. |
| Valuation unavailable | Missing/inconsistent acquisition costs or movement/opening balance. Reconcile evidenced source records; never substitute selling price. |
| No recovery email, recurring order or message | Generic recovery confirmation is not delivery. Check provider configuration/approved sender, consent, suppressed recipient, worker and failure record. |
| Review approved but not public | Separate Publish action, current consent and moderation/eligibility. Photos need their own consent. |
| Page appears stuck/stale | Check error/timeout and use the existing Refresh/retry action; avoid repeated writes. Record route/time and exact error for support. Settings gas tools currently issue reads even while collapsed; see audit finding OSA-05. |

## Appendix A. Complete setting register

The register below preserves all 77 keys from the earlier Owner inventory. **Current** means inspected through the current local runtime, not re-certified hosted business values. **Historical only** means the labelled sandbox location was absent locally and remains in the denominator. Approval metadata is environment dependent; use each current card and Approval Centre. Numeric currency values in the storage API are kobo; enter the unit printed in the editor.

### Business & Website register

| Setting and key | Configuration reference | Audit scope |
| --- | --- | --- |
| Branch opening hours - `business.hours` | Section 4 - 24-hour opening range, separate from delivery slots. | Current local |
| Invoice & receipt business details - `document.identity` | Section 4 - Verified legal/contact details and evidence; new document snapshots only. | Current local |
| Customer review publication rules - `testimonials.policy` | Section 4 - Consent, moderation, photo/text limits; publish each eligible review separately. | Current local |
| Homepage & public contact details - `website.content` | Section 4 - Approved public copy, contacts and supported asset/social URLs. | Current local |

### Policies & Terms register

| Setting and key | Configuration reference | Audit scope |
| --- | --- | --- |
| Cancellation policy - `legal.cancellation` | Section 5 - Content and Publication; reviewed effective text, not operational switches. | Current local |
| Delivery policy - `legal.delivery` | Section 5 - Content and Publication; reviewed effective text, not operational switches. | Current local |
| EasyRewards terms - `legal.loyalty` | Section 5 - Content and Publication; reviewed effective text, not operational switches. | Current local |
| Privacy policy - `legal.privacy` | Section 5 - Content and Publication; reviewed effective text, not operational switches. | Current local |
| Prepaid wallet credit terms - `legal.purchase-credit` | Section 5 - Content and Publication; reviewed effective text, not operational switches. | Current local |
| Refund policy - `legal.refund` | Section 5 - Content and Publication; reviewed effective text, not operational switches. | Current local |
| Service booking terms - `legal.service-booking` | Section 5 - Content and Publication; reviewed effective text, not operational switches. | Current local |
| General terms & conditions - `legal.terms` | Section 5 - Content and Publication; reviewed effective text, not operational switches. | Current local |
| Service warranty terms - `legal.warranty` | Section 5 - Content and Publication; reviewed effective text, not operational switches. | Current local |

### Gas & Products register

| Setting and key | Configuration reference | Audit scope |
| --- | --- | --- |
| Gas selling price per kg - `gas.price_per_kg` | Section 6 - Approved naira per kg for new quotations. | Current local |
| Gas order quantities & cylinder sizes - `gas.quantity_policy` | Section 6 - Min/max/increment/precision and distinct cylinder capacities. | Current local |
| Double Burner — selling price - `price.burner` | Section 6 - Approve a naira selling price; receive real stock separately. | Current local |
| 12.5kg Empty Cylinder — selling price - `price.cylinder-empty-12` | Section 6 - Approve a naira selling price; receive real stock separately. | Current local |
| 25kg Empty Cylinder — selling price - `price.cylinder-empty-25` | Section 6 - Approve a naira selling price; receive real stock separately. | Current local |
| 50kg Empty Cylinder — selling price - `price.cylinder-empty-50` | Section 6 - Approve a naira selling price; receive real stock separately. | Current local |
| 6kg Empty Cylinder — selling price - `price.cylinder-empty-6` | Section 6 - Approve a naira selling price; receive real stock separately. | Current local |
| Gas Hose — selling price - `price.hose` | Section 6 - Approve a naira selling price; receive real stock separately. | Current local |
| Kitchen Starter Kit — selling price - `price.kit` | Section 6 - Approve a naira selling price; receive real stock separately. | Current local |
| 12.5kg Gas Refill — legacy fixed refill price - `price.refill-12` | Section 6 - Legacy fixed refill price; new gas quotations use per-kg pricing. | Current local |
| 25kg Gas Refill — legacy fixed refill price - `price.refill-25` | Section 6 - Legacy fixed refill price; new gas quotations use per-kg pricing. | Current local |
| 50kg Refill — legacy fixed refill price - `price.refill-50` | Section 6 - Legacy fixed refill price; new gas quotations use per-kg pricing. | Current local |
| 6kg Gas Refill — legacy fixed refill price - `price.refill-6` | Section 6 - Legacy fixed refill price; new gas quotations use per-kg pricing. | Current local |
| Gas Regulator — selling price - `price.regulator` | Section 6 - Approve a naira selling price; receive real stock separately. | Current local |
| Double Burner — storefront visibility - `publish.burner` | Section 6 - Set publication after approved price; verify real availability. | Current local |
| 12.5kg Empty Cylinder — storefront visibility - `publish.cylinder-empty-12` | Section 6 - Set publication after approved price; verify real availability. | Current local |
| 25kg Empty Cylinder — storefront visibility - `publish.cylinder-empty-25` | Section 6 - Set publication after approved price; verify real availability. | Current local |
| 50kg Empty Cylinder — storefront visibility - `publish.cylinder-empty-50` | Section 6 - Set publication after approved price; verify real availability. | Current local |
| 6kg Empty Cylinder — storefront visibility - `publish.cylinder-empty-6` | Section 6 - Set publication after approved price; verify real availability. | Current local |
| Gas Hose — storefront visibility - `publish.hose` | Section 6 - Set publication after approved price; verify real availability. | Current local |
| Kitchen Starter Kit — storefront visibility - `publish.kit` | Section 6 - Set publication after approved price; verify real availability. | Current local |
| 12.5kg Gas Refill — storefront visibility - `publish.refill-12` | Section 6 - Set publication after approved price; verify real availability. | Current local |
| 25kg Gas Refill — storefront visibility - `publish.refill-25` | Section 6 - Set publication after approved price; verify real availability. | Current local |
| 50kg Refill — storefront visibility - `publish.refill-50` | Section 6 - Set publication after approved price; verify real availability. | Current local |
| 6kg Gas Refill — storefront visibility - `publish.refill-6` | Section 6 - Set publication after approved price; verify real availability. | Current local |
| Gas Regulator — storefront visibility - `publish.regulator` | Section 6 - Set publication after approved price; verify real availability. | Current local |

### Delivery & Dispatch register

| Setting and key | Configuration reference | Audit scope |
| --- | --- | --- |
| Order capacity per delivery window - `delivery.capacity` | Section 7 - Actual maximum orders per date/window. | Current local |
| Accept delivery orders - `delivery.enabled` | Section 7 - Open ordering only after connected operational setup. | Current local |
| Flat customer delivery fee - `delivery.fee` | Section 7 - Flat naira customer order delivery charge, not route cost. | Current local |
| Bookable delivery windows - `delivery.windows` | Section 7 - Comma-separated supported 24-hour ranges. | Current local |
| Legacy delivery area list - `delivery.zones` | Section 7 - Read-only legacy area string; use actual governed locations. | Current local |
| Dispatch route & cost estimates - `dispatch.routing` | Section 7 - Kobo fuel/operating rates, stop minutes and road snap; processor/GPS gates separate. | Current local |
| SANDBOX ONLY — Payment Test - `location.66e178b6-1621-48d5-add3-12cc6550df7b` | Section 7 - Coverage boundary, branch, address handling, active/visible/archive. | Historical only |
| Ajah - `location.ajah` | Section 7 - Coverage boundary, branch, address handling, active/visible/archive. | Current local |
| Lagos Island - `location.lagos-island` | Section 7 - Coverage boundary, branch, address handling, active/visible/archive. | Current local |
| Lekki - `location.lekki` | Section 7 - Coverage boundary, branch, address handling, active/visible/archive. | Current local |
| Victoria Island - `location.victoria-island` | Section 7 - Coverage boundary, branch, address handling, active/visible/archive. | Current local |
| Recurring cash-on-delivery orders - `subscription.enabled` | Section 7 - Consented recurring COD with ceiling and scheduled worker. | Current local |

### Services & Safety register

| Setting and key | Configuration reference | Audit scope |
| --- | --- | --- |
| Cooker Installation — safety checklist - `checklist.cooker-installation` | Section 8 - Mandatory uniquely identified steps and qualified independent review. | Current local |
| Cooker Servicing — safety checklist - `checklist.cooker-servicing` | Section 8 - Mandatory uniquely identified steps and qualified independent review. | Current local |
| Cylinder Installation — safety checklist - `checklist.cylinder-installation` | Section 8 - Mandatory uniquely identified steps and qualified independent review. | Current local |
| Cylinder Maintenance — safety checklist - `checklist.cylinder-maintenance` | Section 8 - Mandatory uniquely identified steps and qualified independent review. | Current local |
| Gas Safety Checks — safety checklist - `checklist.gas-safety-check` | Section 8 - Mandatory uniquely identified steps and qualified independent review. | Current local |
| Cooker Installation - `service.cooker-installation` | Section 8 - Service/Pricing/Requirements; approved checklist first. | Current local |
| Cooker Servicing - `service.cooker-servicing` | Section 8 - Service/Pricing/Requirements; approved checklist first. | Current local |
| Cylinder Installation - `service.cylinder-installation` | Section 8 - Service/Pricing/Requirements; approved checklist first. | Current local |
| Cylinder Maintenance - `service.cylinder-maintenance` | Section 8 - Service/Pricing/Requirements; approved checklist first. | Current local |
| Gas Safety Checks - `service.gas-safety-check` | Section 8 - Service/Pricing/Requirements; approved checklist first. | Current local |

### Payments & Wallet register

| Setting and key | Configuration reference | Audit scope |
| --- | --- | --- |
| Cash on delivery - `payment.cod` | Section 9 - COD permission; actual cash needs independent verification. | Current local |
| Online payments & fees - `payment.gateway` | Section 9 - Sandbox Checkout/Fees/Wallet and protected review; server test setup separate. | Current local |
| Legacy payment integration - `payment.integration` | Section 9 - Legacy protective switch; cannot activate Paystack. | Current local |
| Settlement bank details - `payment.settlement` | Section 9 - Verified bank metadata; does not set transfer instructions. | Current local |
| Wallet access - `wallet.enabled` | Section 9 - Verified credit spending/funding; branch bank and approval prerequisites. | Current local |
| Cash & bank-transfer wallet limit - `wallet.maximum` | Section 9 - Naira cash/bank ceiling, separate card controls. | Current local |

### Rewards & Retention register

| Setting and key | Configuration reference | Audit scope |
| --- | --- | --- |
| Customer retention & win-back rules - `crm.retention` | Section 10 - Thresholds and kobo budgets; providers, marketing consent and suppression separate. | Current local |
| Customer points adjustment - `loyalty.adjustment` | Section 10 - One-time customer UUID/points/reason/evidence correction. | Current local |
| Legacy points-to-wallet conversion rate - `loyalty.credit_per_point` | Section 10 - Legacy; does not enable points-to-wallet conversion. | Current local |
| Legacy reward earning switch - `loyalty.enabled` | Section 10 - Legacy; current engine uses activated programme. | Current local |
| EasyRewards programme - `loyalty.policy` | Section 10 - Current Points/Services/Offers; approved version and technical flags. | Current local |
| Referral eligibility review - `loyalty.referral_review` | Section 10 - Attribution UUID/decision/evidence; branch and independent review. | Current local |
| Legacy spend per reward point - `loyalty.spend_per_point` | Section 10 - Legacy rate, ordinary naira money editor; not current programme. | Current local |

### Stock & Valuation register

| Setting and key | Configuration reference | Audit scope |
| --- | --- | --- |
| Stock valuation method - `inventory.valuation` | Section 11 - Weighted-average complete acquisition costs; no count/price change. | Current local |

### Staff & Security register

| Setting and key | Configuration reference | Audit scope |
| --- | --- | --- |
| Staff roles & branch access - `security.permissions` | Section 12 - Existing active account and request branch; protected independent access approval. | Current local |
| Approval safeguards (read-only) - `security.policy` | Section 12 - Locked read-only approval safeguards. | Current local |

## Appendix B. Audit findings and improvements still open

The audit is complete as documentation; the following product issues and limitations have **not** been repaired or re-certified by writing this manual. They remain in the findings register.

| ID | Severity / classification | Finding and required follow-up |
| --- | --- | --- |
| OSA-01 | Medium - UI scope defect | The small Settings branch badge uses the signed-in user's branch or Lagos, while data/editor scope can come from the URL. Bind all branch labels to the selected scope and add a clear Owner branch selector. Until fixed, verify the Settings branch text and editor/request scope. |
| OSA-02 | Medium - inconsistent approval copy | The current server calculates Owner auto-approval, but some editor helper/footer copy still states independent Owner approval categorically. Make all wording use current server metadata; qualified safety/protected decisions must remain explicit. |
| OSA-03 | Medium - money-unit friction | Ordinary money, services and payment editors use naira/percent; routing, retention and current rewards still expose kobo/basis points. Standardise entry/display with exact conversion and review summaries. Until then use each printed unit. |
| OSA-04 | Medium - stale rewards helper | The Points helper says referrals/services are excluded, while the current schema/editor supports gated referrals/services/offers. Replace with accurate eligibility/flag guidance. |
| OSA-05 | Medium - possible loading overhead | The gas-tools component mounts and issues location/stock/inspection reads even while its enclosing details is collapsed. Defer on expansion or use the existing bounded cached reads; measure before claiming a speed gain. This audit did not benchmark hosted latency. |
| OSA-06 | High for multi-branch rollout - scope limitation | Public catalogue/service-preview queries and readiness payment checks contain Lagos assumptions; published legal documents are shared by kind. Before multi-branch launch, establish intended global versus branch-specific authority and test all public/customer paths. Do not claim each branch is fully configured from branch-scoped cards alone. |
| OSA-07 | Medium - incomplete onboarding/status visibility | Settings does not show one complete dependency checklist for providers, worker, qualifications, stock, independent reviewers and release acceptance. Dispatch has its own scoped checklist. Add an Owner configuration checklist with links and server-derived readiness, retaining honest unknown/disabled states. |

Paystack sandbox-only support, locked approval safeguards and disabled-until-approved release gates are **intentional constraints**, not instructions to remove security checks. The absence of a live-payment activation path is a capability limitation to plan around. Required commercial acceptance remains open.

## Appendix C. Source and companion references

This manual follows current source rather than relying on route existence. The audit folder records runtime metadata, source fingerprints, browser observations, tests and rendering checks.

| Authority | What was checked |
| --- | --- |
| `apps/web/components/admin.tsx`, `gas-delivery-admin.tsx`, `setting-change-form.tsx`, `setting-content-fields.tsx` | Current navigation, all editors, gas tools, history, scope and identity handoffs. |
| `packages/business-rules/src/settings-categories.ts`, `admin-settings-purpose.ts`, `setting-editor.ts`, `payment-editor.ts` | Nine categories, stable keys, search/legacy behavior, review and exact units. |
| `apps/web/lib/service.ts`, `governance.ts`, `staff.ts`, `staff-privileges.ts` | Role-filtered settings API, version/identity/approval/activation, policy/access and session effects. |
| `apps/web/lib/gas-delivery-config.ts`, `gas-delivery.ts`, `scheduling.ts`, `dispatch-setup.ts` | Coverage/quantity validation and actual order/scheduling/setup checks. |
| `apps/web/lib/dispatch-routing-schema.ts`, `dispatch-routing.ts`, `fleet-constraints.ts`, `driver-operations.ts` | Routing units, fleet/trip authority and physical readiness. |
| `apps/web/lib/service-schema.ts`, `professional-services.ts`, `policies.ts`, `document-identity.ts`, `website-schema.ts`, `testimonial-schema.ts` | Actual service/safety/policy/document/website/review field contracts. Allowed website hero assets are `/assets/easygas-cooking-hero-v1.webp` and `/assets/delivery-illustration.png`. |
| `apps/web/lib/payments/policy.ts`, `payments/runtime.ts`, `wallet-funding.ts`, `packages/business-rules/src/payment-fees.ts` | Sandbox-only gateway, fee/limit semantics and separate branch bank instructions. |
| `apps/web/lib/rewards-schema.ts`, `rewards.ts`, `operations-schema.ts`, `inventory-valuation.ts`, `readiness.ts`, `release-checks.ts` | Current programme qualification, budgets, complete-input valuation and production acceptance limits. |

Current companion guides: [Settings navigation](admin-settings-navigation.md), [Settings acceptance](admin-settings-acceptance.md), [change review](settings-change-update.md), [payments](wallet-payments-update.md), [Dispatch setup](dispatch-setup.md), [order-to-delivery](order-to-delivery.md), [testimonials](testimonials.md), [authentication](authentication.md).

Audit and traceability: [audit report](../owner-settings-audit/README.md), [77-key machine-readable register](../owner-settings-audit/setting-register.json), [OSM matrix](../traceability/owner-settings-manual-rtm.md). Earlier PDF/Word user manuals remain historical; this is the current dedicated Owner configuration edition.
