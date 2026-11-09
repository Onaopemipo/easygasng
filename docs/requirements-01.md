# CODEX MASTER IMPLEMENTATION PROMPT
## EasyGas Energy Solutions — Complete Web & Mobile Platform

### ROLE & OBJECTIVE

Act as a senior software architect, product engineer, mobile developer, security engineer, database specialist, and quality assurance lead.

Your assignment is to **design, build, integrate, test, and prepare for production a complete EasyGas Energy Solutions platform**.

The solution must cover:

1. Customer mobile application for iOS and Android.
2. Customer-facing responsive website.
3. Business administration web application.
4. Staff and delivery driver mobile experience.
5. Retail sales and inventory management.
6. Cylinder ownership, exchange, and tracking.
7. Secure customer payments and prepaid gas credit.
8. Loyalty, referrals, and promotions.
9. Intelligent gas consumption predictions and refill reminders.
10. Scheduled refills and commercial customer accounts.
11. Business reporting, financial controls, and operational insights.
12. Notifications, customer support, and business automation.

**Do not create a collection of disconnected screens or a demonstration application. Build one cohesive product with real, working business processes.**

All customer orders, stock movements, payments, rewards, delivery activities, and customer information must remain consistent across the entire platform.

---

# PART 1 — MANDATORY REPOSITORY INSPECTION

Before implementing anything:

1. Inspect the complete repository structure.
2. Identify the existing application framework, dependencies, database, authentication, deployment configuration, and implemented features.
3. Review the current Git branch and working tree.
4. Identify modified, staged, and untracked files.
5. Inspect existing environment configuration without exposing secret values.
6. Identify reusable components, business rules, database structures, and existing integrations.
7. Identify unfinished features, broken workflows, duplicated logic, and architectural risks.
8. Determine whether the repository is a single application, multiple applications, or a monorepo.

Produce a concise repository audit containing:

- Existing implementation.
- Missing functionality.
- Reusable components.
- Technical risks.
- Proposed implementation structure.
- Database migration requirements.
- Integration dependencies.
- Implementation sequence.

### Repository protection rules

- Never overwrite existing work without understanding it.
- Never delete or revert unrelated changes.
- Do not silently replace working features.
- Preserve existing business data.
- Use reversible database migrations.
- Never expose credentials or private configuration.
- Never use mock data in production workflows.
- Do not assume an empty repository.
- If the repository is empty, establish the recommended project structure before implementation.

After inspection, proceed with implementation. Do not stop after producing an audit unless a critical blocker prevents safe progress.

---

# PART 2 — BRAND & DESIGN AUTHORITY

## Company identity

**Company:** EasyGas Energy Solutions  
**Industry:** Cooking gas retail, cylinder sales, refills, and delivery  
**Primary market:** Nigeria  
**Currency:** Nigerian Naira (NGN / ₦)  
**Brand promise:** Affordable | Flexible | Committed  
**Customer slogan:** More Cooking, Less Worry.

Use the supplied official EasyGas logo as the primary branding authority.

### Brand colours

Extract the exact colours from the provided logo wherever possible.

Use the following as provisional design references:

| Colour | Reference |
|---|---|
| Deep Green | #07592E |
| Primary Green | #087A36 |
| Lime Green | #91C900 |
| Flame Orange | #FF7900 |
| Dark Text | #10251C |
| White | #FFFFFF |
| Soft Green Background | #F2F8F1 |
| Light Neutral | #F7F9F7 |

The official logo takes precedence over these approximate values.

Do not redesign the logo, substitute another brand, or alter its proportions.

### Design direction

The platform must feel like a premium, modern SaaS product and a trustworthy consumer service.

Use:

- Beautifully balanced layouts.
- Generous but controlled spacing.
- Rounded cards and refined surfaces.
- Clean typography.
- Subtle shadows.
- High-quality product imagery.
- Clear visual hierarchy.
- Meaningful micro-interactions.
- Smooth navigation.
- Responsive components.
- Professional charts and reporting.
- Thoughtful empty, loading, success, and error states.

Avoid:

- Generic admin templates.
- Excessive gradients.
- Overcrowded dashboards.
- Decorative animations that slow the application.
- Inconsistent iconography.
- Unnecessary modal windows.
- Large amounts of text on transactional screens.
- Hardcoded demonstration values.

Use real EasyGas product imagery where supplied. Any generated or placeholder images must be clearly identified and must not be mistaken for verified company assets.

---

# PART 3 — RECOMMENDED APPLICATION STRUCTURE

Implement the platform as a maintainable collection of connected applications.

Suggested structure:

```text
easygas/
  apps/
    web/
      customer website
      business dashboard
      staff web portal
    mobile/
      customer application
      staff and driver experiences
  packages/
    ui/
    types/
    validation/
    business-rules/
    notifications/
    payments/
    forecasting/
    configuration/
  services/
    scheduled-jobs/
  database/
    migrations/
    policies/
    seeds/
  docs/
  tests/
```

Use the existing repository architecture if it is already suitable.

### Preferred technologies

Unless the existing repository provides a compelling alternative:

- Next.js App Router for the web platform.
- TypeScript throughout.
- React Native with Expo for mobile.
- Tailwind CSS for web styling.
- A consistent mobile styling system.
- PostgreSQL for transactional business data.
- Supabase where appropriate for managed database and authentication services.
- Secure server-side business operations.
- A licensed Nigerian payment provider supporting the required payment methods.
- Firebase Cloud Messaging or an equivalent service for push notifications.
- A suitable email provider.
- Approved SMS and WhatsApp messaging providers.
- Google Maps or another suitable mapping provider.

Do not introduce unnecessary architectural complexity.

Use one authoritative source for orders, inventory, customer balances, and financial transactions.

All important business operations must be validated on the server.

---

# PART 4 — USER ROLES & ACCESS CONTROL

Implement these roles:

| Role | Responsibilities |
|---|---|
| Business Owner | Complete business oversight and configuration |
| Branch Manager | Manage assigned branch operations |
| Sales Attendant | Record sales and assist customers |
| Inventory Officer | Manage stock and cylinder movements |
| Dispatcher | Assign and monitor deliveries |
| Delivery Driver | Fulfil assigned deliveries |
| Finance Officer | Review payments, expenses, and reconciliations |
| Customer | Purchase gas and manage personal account |
| Commercial Customer | Manage business purchases and supply arrangements |
| Platform Administrator | Restricted technical and operational administration |

### Requirements

- Shared authentication where appropriate.
- Determine user permissions after authentication.
- No role selection before login.
- Restrict access to authorised functions.
- Enforce branch-level data restrictions.
- Protect financial actions with additional verification where appropriate.
- Record important administrative actions.
- Prevent employees from accessing unrelated customer information.
- Support staff account suspension and deactivation.
- Provide secure session expiry and logout.
- Expired sessions must redirect users to the sign-in screen, not an unrelated verification screen.

Permissions must be enforced in server operations and database access, not only by hiding menu items.

---

# PART 5 — CUSTOMER MOBILE APPLICATION

Implement the approved mobile designs as the visual reference.

The application must support both iOS and Android.

## 5.1 Splash & Onboarding

Create a premium branded opening experience.

Sequence:

1. Display the EasyGas flame.
2. Reveal the EasyGas wordmark.
3. Animate the brand elements smoothly.
4. Transition into the onboarding or home experience.

Use a short, polished animation without unnecessarily delaying access.

Onboarding should communicate:

- Fast gas delivery.
- Convenient ordering.
- Smart refill reminders.
- Secure payments.
- Customer rewards.

Returning authenticated users should not repeatedly see onboarding.

## 5.2 Authentication

Implement:

- Email registration.
- Phone number registration where supported.
- Secure password login.
- Password recovery.
- Phone or email verification.
- Optional biometric sign-in after initial authentication.
- Secure session persistence.
- Logout.
- Account deletion.
- Customer profile management.

Support Nigerian telephone number formats and appropriate validation.

Never store passwords or sensitive payment information directly in the application.

## 5.3 Customer Home Dashboard

Implement the approved home screen with:

- Personalised greeting.
- Current delivery location.
- Notification indicator.
- Estimated gas remaining.
- Expected refill date.
- Primary Order Gas action.
- Track Order shortcut.
- Wallet shortcut.
- Rewards shortcut.
- Customer support.
- Scheduled refill card.
- Popular products.
- Recommended products.
- Current promotions.

All information must come from actual customer and business records.

If the customer has no purchase history, display a useful onboarding state instead of inventing a gas estimate.

## 5.4 Product Catalogue

Support:

- Gas refills.
- Filled cylinders.
- Empty cylinders where sold.
- Cylinder exchanges.
- Gas cookers.
- Burners.
- Gas hoses.
- Regulators.
- Accessories.
- Product bundles.

Each product must have:

- Name.
- Description.
- Category.
- Images.
- Price.
- Availability.
- Variants where applicable.
- Quantity controls.
- Safety information where relevant.

Product availability and prices must be controlled from the business dashboard.

## 5.5 Product Details

Create a refined product detail screen.

Include:

- Product photography.
- Product name.
- Current price.
- Available sizes.
- Product description.
- Availability.
- Delivery eligibility.
- Quantity selector.
- Add to Cart.
- Related products.
- Reviews where verified reviews are enabled.

Customers must not be able to purchase unavailable products.

## 5.6 Shopping Cart

Implement:

- Add items.
- Remove items.
- Change quantities.
- View item totals.
- Apply eligible promotions.
- View delivery charges.
- View discounts.
- See the final payable amount.

Cart contents should persist appropriately across sessions.

Validate pricing and stock again at checkout.

## 5.7 Checkout

Implement a guided checkout process:

**Step 1 — Delivery Address**

- Select saved address.
- Add new address.
- Validate delivery coverage.
- Show applicable delivery fees.

**Step 2 — Delivery Schedule**

- Choose available delivery date.
- Choose available delivery window.
- Add delivery instructions.

**Step 3 — Payment**

- Confirm order summary.
- Select payment method.
- Apply wallet credit where eligible.
- Redeem permitted rewards.
- Confirm final amount.

**Step 4 — Confirmation**

- Display order reference.
- Display confirmed payment status.
- Show expected delivery window.
- Provide Track Order action.

Do not confirm payment until the payment provider has verified it.

## 5.8 Order Tracking

Implement the following order states:

1. Order placed.
2. Payment confirmed or approved payment-on-delivery.
3. Order accepted.
4. Preparing order.
5. Assigned to driver.
6. Out for delivery.
7. Delivered.

Also support:

- Cancelled.
- Delivery failed.
- Returned.
- Refunded.
- Partially refunded.

Show a delivery map when tracking information is available.

Customers should see the assigned driver's permitted contact details and relevant delivery updates.

Never fabricate live driver locations or arrival times.

## 5.9 Customer Wallet

Implement the approved wallet interface.

Features:

- Available gas-purchase credit.
- Credit history.
- Add funds through approved payment channels.
- Use credit toward eligible purchases.
- Refund handling.
- Transaction receipts.
- Scheduled top-ups where supported.
- Wallet activity notifications.

The initial wallet must be restricted to permitted EasyGas purchases and must not support unrestricted transfers or cash withdrawals unless separately approved and legally supported.

All balances must be calculated from verified financial records.

## 5.10 Loyalty & Rewards

Implement:

- Reward points.
- Loyalty tiers.
- Eligible purchase rewards.
- Referral rewards.
- Redeemable offers.
- Reward history.
- Tier progression.
- Expiry rules.
- Promotion conditions.

Example tiers:

- Bronze.
- Silver.
- Gold.
- Platinum.

All thresholds and rewards must be configurable by authorised business administrators.

Prevent duplicate rewards, self-referral abuse, and rewards on refunded purchases.

## 5.11 Smart Refill Reminders

Implement the approved refill prediction screen.

Display:

- Customer's cylinder size.
- Last verified refill.
- Estimated remaining gas.
- Predicted refill date.
- Confidence indicator.
- Reorder button.
- Remind Me Later.
- Customer feedback.

Customer feedback options:

- Still have enough gas.
- Gas is almost empty.
- Gas has finished.
- Already refilled elsewhere.

The system must explain that gas levels are estimates based on purchase history.

Do not represent estimated gas levels as physical sensor readings.

## 5.12 Customer Profile

Include:

- Personal information.
- Saved addresses.
- Order history.
- Payment methods.
- Wallet.
- Rewards.
- Refill reminders.
- Scheduled deliveries.
- Household cylinders.
- Notification preferences.
- Customer support.
- Privacy settings.
- Account deletion.
- Logout.

---

# PART 6 — CUSTOMER-FACING WEBSITE

Implement the approved EasyGas website design.

The website must be responsive across desktop, tablet, and mobile.

## 6.1 Homepage

Create the approved visual composition featuring:

- Official EasyGas logo.
- Clean navigation.
- Delivery location selector.
- Search.
- Shopping cart.
- Login and registration.
- Premium hero section.
- Cooking gas delivery message.
- Order Now action.
- Track Order action.
- Quick ordering panel.
- Product categories.
- Popular products.
- Service benefits.
- How It Works.
- EasyGas mobile application promotion.
- Loyalty programme promotion.
- Commercial supply section.
- Customer support.
- Footer.

Use the brand message:

**Cooking gas delivered to your door.**

Supporting message:

**Fast. Safe. Reliable.**

## 6.2 Quick Order

Allow customers to:

1. Choose gas cylinder size.
2. Select refill, exchange, or cylinder purchase.
3. Enter delivery address.
4. Select delivery window.
5. View price and delivery fee.
6. Add to cart.
7. Complete checkout.

The website must use the same products, pricing, inventory, orders, and customer records as the mobile application.

## 6.3 Website Pages

Implement:

- Home.
- Products.
- Product Details.
- Cart.
- Checkout.
- Order Tracking.
- How It Works.
- About EasyGas.
- Business Supply.
- Customer Account.
- Order History.
- Wallet.
- Rewards.
- Refill Scheduling.
- Contact.
- Help & FAQs.
- Privacy Policy.
- Terms and Conditions.
- Delivery and Refund Policies.

Ensure customer account features work across web and mobile.

## 6.4 Search & Discovery

Support product search, filtering, categories, and product availability.

Show meaningful results and empty states.

Do not display unavailable products as immediately purchasable.

---

# PART 7 — BUSINESS ADMINISTRATION DASHBOARD

Implement the approved SaaS dashboard design.

Use the EasyGas green-and-orange identity with a professional, clean interface.

## 7.1 Dashboard Overview

Display:

- Today's revenue.
- Total orders.
- Pending deliveries.
- Active customers.
- Available cylinders.
- Low-stock alerts.
- Outstanding payments.
- Customer credit liabilities.
- Customers due for refill.
- Recent transactions.
- Sales trends.
- Top products.
- Delivery performance.
- Operational alerts.

Every dashboard figure must come from real records.

All cards must lead to their corresponding detailed screens.

## 7.2 Dashboard Navigation

Implement these modules:

1. Dashboard.
2. Orders.
3. Customers.
4. Products.
5. Inventory.
6. Cylinders.
7. Deliveries.
8. Point of Sale.
9. Wallet & Payments.
10. Loyalty & Rewards.
11. Scheduled Refills.
12. Commercial Accounts.
13. Marketing.
14. Reports & Analytics.
15. Suppliers.
16. Staff Management.
17. Branch Management.
18. Safety & Compliance.
19. Settings.

Use clear navigation groups and avoid overcrowding the sidebar.

---

# PART 8 — ORDER & SALES MANAGEMENT

Implement complete order management.

Features:

- Create orders.
- Edit eligible draft orders.
- View orders.
- Search and filter.
- Assign fulfilment branch.
- Confirm payment.
- Reserve inventory.
- Assign delivery.
- Cancel orders.
- Process approved refunds.
- Generate receipts.
- View order history.
- Record customer support notes.

Every order must have a unique reference.

Implement clear rules for status transitions.

Do not allow an order to be delivered before it has been appropriately accepted and dispatched.

Prevent duplicate fulfilment and duplicate payment processing.

---

# PART 9 — RETAIL POINT OF SALE

Build a dedicated sales interface for physical EasyGas locations.

Features:

- Fast product selection.
- Barcode or product search.
- Cylinder size selection.
- Customer lookup.
- Walk-in customer sales.
- Gas refill sales.
- Cylinder exchanges.
- Quantity adjustment.
- Discounts with permissions.
- Cash payments.
- Bank transfer payments.
- Supported electronic payments.
- Receipt generation.
- Sales reversal.
- Cashier shift reconciliation.

The POS must work well on desktop computers and tablets.

Support carefully controlled offline order capture where necessary.

Offline payments must not be marked as verified without appropriate confirmation.

---

# PART 10 — INVENTORY & CYLINDER MANAGEMENT

## 10.1 Inventory

Implement:

- Product stock levels.
- Gas quantities.
- Stock receipts.
- Stock adjustments.
- Supplier purchases.
- Stock transfers.
- Stock reservations.
- Low-stock alerts.
- Stocktaking.
- Inventory history.
- Stock valuation.
- Branch-level inventory.

Every inventory movement must be recorded.

Prevent negative stock unless a specifically authorised business process permits it.

## 10.2 Cylinder Management

Support:

- Cylinder sizes.
- Cylinder identification.
- Filled cylinders.
- Empty cylinders.
- Customer-owned cylinders.
- Company-owned cylinders.
- Supplier-owned cylinders.
- Cylinder exchanges.
- Cylinder deposits.
- Deposit refunds.
- Returned cylinders.
- Damaged cylinders.
- Missing cylinders.
- Inspection records.
- Test-date information where applicable.
- Cylinder custody history.

The system must distinguish the physical cylinder from the gas contained within it.

A cylinder exchange must update the appropriate cylinder and gas records without counting the same stock twice.

## 10.3 Supplier Management

Implement:

- Supplier profiles.
- Purchase orders.
- Goods received.
- Supplier invoices.
- Purchase history.
- Supplier balances.
- Reorder recommendations.

---

# PART 11 — DELIVERY & DRIVER OPERATIONS

## 11.1 Dispatch Dashboard

Implement:

- Pending deliveries.
- Driver availability.
- Delivery assignment.
- Delivery zones.
- Delivery fees.
- Route planning.
- Delivery status.
- Failed deliveries.
- Completed deliveries.
- Delivery performance.

## 11.2 Driver Mobile Experience

Create a dedicated role-based experience.

Screens