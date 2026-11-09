# EASYGAS ENERGY SOLUTIONS
## CODEX MASTER IMPLEMENTATION PROMPT — CONTINUATION
### Parts 11–30 | Complete Implementation, Integration, Testing & Production Readiness

---

# PART 11 — DELIVERY & DRIVER OPERATIONS (CONTINUED)

## 11.2 Driver Mobile Experience

Build a dedicated mobile experience for delivery drivers, using the same EasyGas design system.

Drivers must authenticate through the shared authentication system and automatically receive the appropriate interface based on their assigned permissions.

### Driver screens

1. Driver Dashboard
2. Available and Assigned Deliveries
3. Delivery Details
4. Route and Navigation
5. Customer Contact
6. Pickup Confirmation
7. Delivery Progress
8. Proof of Delivery
9. Payment Collection
10. Failed Delivery
11. Delivery History
12. Earnings and Performance, where applicable
13. Driver Profile
14. Notifications

### Driver dashboard

Display:

- Driver's name and availability status.
- Today's assigned deliveries.
- Completed deliveries.
- Pending deliveries.
- Next delivery destination.
- Current delivery progress.
- Customer contact shortcut.
- Navigation shortcut.
- Outstanding cash collections.
- Important operational alerts.

### Delivery workflow

Implement the following process:

1. Customer places an order.
2. The business verifies the order and applicable payment requirements.
3. Inventory is reserved.
4. The dispatcher assigns an eligible driver.
5. The driver receives an assignment notification.
6. The driver accepts the assignment where required.
7. The driver confirms collection of the correct products.
8. The order is marked as out for delivery.
9. The customer receives a dispatch notification.
10. The driver navigates to the delivery address.
11. The customer receives appropriate progress updates.
12. The driver confirms delivery.
13. The customer provides a delivery confirmation code or another approved form of confirmation.
14. Any required payment collection is recorded.
15. The order is marked as delivered.
16. Inventory, payment, and delivery records are reconciled.
17. The customer receives a receipt and may submit feedback.

### Delivery verification

Support:

- Customer confirmation code.
- Customer signature where appropriate.
- Delivery photograph with customer consent.
- Delivery timestamp.
- Driver identification.
- Delivered items and quantities.
- Cylinder exchange confirmation.
- Cash collection record.
- Delivery exceptions.

Do not require photographs of customers or private premises unless justified and consented to.

### Failed deliveries

Support:

- Customer unavailable.
- Incorrect address.
- Customer cancellation.
- Unsafe delivery conditions.
- Vehicle breakdown.
- Product issue.
- Other documented reasons.

A failed delivery must not automatically be treated as a completed sale.

Implement appropriate stock, refund, payment, and rescheduling workflows.

### Delivery location

Use location services only with appropriate permissions.

Customers should see live tracking only when supported by real location data.

Never generate fictional driver movements or arrival estimates.

### Driver connectivity

Support temporary loss of connectivity.

Allow safe local capture of:

- Delivery notes.
- Delivery status requests.
- Customer confirmation details.
- Proof of delivery.

Synchronise when connectivity returns.

Prevent duplicate delivery completion or financial transactions during synchronisation.

---

# PART 12 — INTELLIGENT GAS REFILL PREDICTION

This is a flagship feature of EasyGas.

Implement it as a complete business capability, not simply a percentage indicator on the customer dashboard.

## 12.1 Objectives

The system must:

- Learn from customer purchase history.
- Estimate likely refill intervals.
- Predict upcoming refill dates.
- Notify customers before expected depletion.
- Encourage convenient reordering.
- Improve predictions using customer feedback.
- Help EasyGas anticipate future demand.
- Identify customers who may need follow-up.
- Provide measurable business outcomes.

## 12.2 Customer consumption profile

Maintain a consumption profile for each eligible customer and cylinder arrangement.

Include:

- Customer identifier.
- Cylinder size.
- Number of cylinders.
- Last verified refill date.
- Refill quantity.
- Historical refill dates.
- Historical refill intervals.
- Average consumption interval.
- Customer usage category.
- Optional household size.
- Customer-reported usage changes.
- Customer feedback.
- Prediction confidence.
- Predicted next refill date.
- Reminder preferences.

Support customers who own multiple cylinders.

Do not assume every cylinder is consumed at the same rate.

## 12.3 Initial prediction approach

Start with a reliable, explainable forecasting method.

For customers with no purchase history:

- Do not invent a personalised consumption pattern.
- Offer an optional customer-provided estimate.
- Use clearly labelled general estimates only when suitable.
- Display low prediction confidence.

For customers with one verified purchase:

- Establish an initial refill record.
- Request optional usage information.
- Avoid presenting an exact remaining-gas measurement.

For customers with repeated purchases:

- Calculate refill intervals.
- Identify unusual intervals.
- Give greater relevance to recent verified purchases where appropriate.
- Adjust estimates using actual customer feedback.
- Account for different cylinder sizes and refill quantities.

For customers with substantial historical data:

- Use more refined forecasting where validation demonstrates improved accuracy.
- Account for seasonal changes and customer-specific behaviour.
- Monitor prediction quality.

## 12.4 Prediction outputs

Produce:

- Estimated next refill date.
- Estimated days until refill.
- Estimated remaining percentage, where a defensible calculation is possible.
- Prediction confidence.
- Reason for prediction.
- Date of last prediction update.

All customer-facing estimates must be clearly labelled.

A forecast must never be presented as an actual physical gas measurement unless a supported and verified measuring device supplies that information.

## 12.5 Reminder automation

Support configurable reminder stages.

Example:

- Seven days before predicted refill.
- Three days before predicted refill.
- On the predicted refill date.
- Optional follow-up after the expected date.

Administrators must be able to configure reminder intervals.

Respect customer communication preferences and applicable messaging rules.

Prevent repeated or excessive notifications.

## 12.6 Customer feedback

Allow customers to select:

- Still have plenty of gas.
- Gas is almost empty.
- Gas has finished.
- I have already refilled.
- Remind me later.
- Stop these reminders.

Use verified feedback to improve future predictions.

Record prediction changes for auditing and performance analysis.

## 12.7 Automatic forecast updates

Recalculate forecasts when:

- A verified refill is completed.
- A customer reports a significant usage change.
- A relevant cylinder is added or removed.
- A scheduled refill is completed.
- The customer provides meaningful consumption feedback.

Do not reset forecasts merely because a customer places an order that is later cancelled.

## 12.8 Business prediction dashboard

Create a dedicated management screen showing:

- Customers likely to need gas soon.
- Predicted refill demand.
- Upcoming expected refill dates.
- Customers overdue for expected refills.
- Reminder delivery status.
- Reminder-to-order conversion.
- Repeat purchase trends.
- Forecast accuracy.
- Estimated future gas demand.

Allow authorised staff to send approved reminders to eligible customers.

## 12.9 Forecast quality

Track:

- Average refill-date prediction error.
- Percentage of predictions within an agreed tolerance.
- Number of customers with sufficient history.
- Number of customers with low-confidence predictions.
- Reminder conversion rate.
- Customer feedback rate.
- Forecast recalculation failures.

Do not claim the prediction model is accurate without measured evidence.

---

# PART 13 — CUSTOMER WALLET & PAYMENT MANAGEMENT

Build a secure financial system supporting EasyGas purchases.

## 13.1 Wallet model

The initial wallet must function as restricted prepaid EasyGas purchase credit, subject to the selected payment provider and applicable Nigerian requirements.

Do not implement unrestricted money transfers, customer-to-customer transfers, or cash withdrawals without explicit approval and the necessary regulatory arrangements.

## 13.2 Wallet capabilities

Implement:

- Wallet balance.
- Verified wallet funding.
- Wallet purchase deductions.
- Partial wallet payments.
- Wallet transaction history.
- Eligible refunds.
- Transaction references.
- Payment receipts.
- Wallet activity notifications.
- Administrative reconciliation.

Support scheduled top-ups only where the payment provider and customer authorisation permit them.

## 13.3 Financial integrity

The wallet must use a proper transaction ledger.

Do not store the wallet as an independently editable balance.

Every movement must record:

- Transaction reference.
- Customer.
- Amount.
- Currency.
- Transaction type.
- Related order or payment.
- Transaction status.
- Timestamp.
- Authorised actor or system process.
- Reversal reference where applicable.

Implement safeguards against:

- Duplicate credits.
- Duplicate debits.
- Negative balances.
- Unverified payments.
- Replayed payment notifications.
- Concurrent spending of the same funds.
- Unauthorised administrative adjustments.

## 13.4 Payment methods

Support payment methods appropriate to the Nigerian market and selected provider, potentially including:

- Bank transfer.
- Debit or credit card.
- Approved online payment methods.
- Wallet credit.
- Cash on delivery where permitted.
- Cash at a physical outlet.

Use the payment provider's supported methods and verification process.

Never store full card details or sensitive payment credentials.

## 13.5 Payment lifecycle

Implement:

1. Payment initiated.
2. Payment awaiting confirmation.
3. Payment verified.
4. Payment failed.
5. Payment cancelled.
6. Refund requested.
7. Refund approved.
8. Refund processing.
9. Refund completed.
10. Reconciliation completed.

A successful checkout screen must not be treated as proof of payment.

Verify payment status through trusted server-side provider information.

## 13.6 Finance dashboard

Display:

- Total verified payments.
- Payments awaiting confirmation.
- Cash collections.
- Wallet credits issued.
- Wallet credit liabilities.
- Refunds.
- Outstanding balances.
- Payment failures.
- Reconciliation exceptions.

Support downloadable financial reports.

## 13.7 Financial controls

Implement:

- Role-based refund approval.
- Limits on manual adjustments.
- Reason codes for corrections.
- Full transaction histories.
- Separation of payment initiation and approval where appropriate.
- Daily reconciliation.
- Exception reporting.

All financial records must be auditable.

---

# PART 14 — LOYALTY, REWARDS & REFERRALS

## 14.1 Loyalty programme

Implement a configurable EasyGas rewards programme.

Support:

- Reward points.
- Membership tiers.
- Purchase rewards.
- Referral rewards.
- Promotional bonuses.
- Reward redemption.
- Reward expiry.
- Reward history.
- Customer eligibility.
- Reward campaign management.

## 14.2 Membership tiers

Provide configurable tiers:

- Bronze.
- Silver.
- Gold.
- Platinum.

Do not hardcode spending thresholds or reward values.

Administrators must be able to configure:

- Qualification criteria.
- Points earned.
- Redemption requirements.
- Tier benefits.
- Expiry periods.
- Promotional eligibility.

## 14.3 Referral system

Each eligible customer may receive a unique referral code or link.

Implement:

1. Customer shares referral.
2. New customer registers.
3. Referral attribution is recorded.
4. New customer completes the required qualifying action.
5. The system validates eligibility.
6. Approved rewards are issued.
7. Both parties receive applicable notifications.

Prevent:

- Self-referrals.
- Repeated referral claims.
- Duplicate rewards.
- Rewards for cancelled or refunded qualifying orders.
- Abuse through multiple accounts.

## 14.4 Rewards marketplace

Create a rewards screen where customers can view available benefits.

Examples:

- Delivery discounts.
- Accessory discounts.
- Promotional gas purchase discounts.
- Special customer offers.

Only display rewards configured by the business.

## 14.5 Loyalty financial controls

Track:

- Points issued.
- Points redeemed.
- Points expired.
- Outstanding reward obligations.
- Promotional costs.
- Campaign conversion.

Support appropriate reversal of rewards when qualifying purchases are refunded.

---

# PART 15 — SUBSCRIPTIONS & SCHEDULED GAS REFILLS

Implement recurring gas supply arrangements.

## 15.1 Scheduled refill plans

Allow customers to schedule refills:

- Weekly.
- Every two weeks.
- Every four weeks.
- Every six weeks.
- On a selected date.
- Using a recommended interval.

Customers must be able to:

- Create a schedule.
- Review the next delivery.
- Change delivery dates.
- Pause a schedule.
- Resume a schedule.
- Cancel a schedule.
- Update the delivery address.
- Update the cylinder size.
- View scheduled order history.

## 15.2 Smart refill plans

Allow customers to opt into prediction-assisted scheduling.

Workflow:

1. Customer enables Smart Refill.
2. System estimates the next refill date.
3. Customer receives a suggested delivery date.
4. Customer reviews the proposed order.
5. Customer confirms the order.
6. The system processes payment and fulfilment according to the selected arrangement.

Do not automatically charge or dispatch an order based solely on an uncertain prediction.

## 15.3 Recurring payment authorisation

Where automatic payments are offered:

- Obtain explicit customer authorisation.
- Explain the charging arrangement.
- Provide advance notifications where required.
- Allow cancellation.
- Handle failed payments.
- Prevent duplicate charges.
- Maintain authorisation records.

## 15.4 Commercial supply arrangements

Support:

- Business customer accounts.
- Negotiated pricing.
- Bulk orders.
- Scheduled deliveries.
- Multiple delivery addresses.
- Approved credit terms.
- Account statements.
- Invoices.
- Purchase approvals where required.
- Outstanding balance tracking.

Commercial customers must only access their own business records.

---

# PART 16 — CUSTOMER RELATIONSHIP MANAGEMENT

Build a complete customer management module.

## 16.1 Customer profiles

Store appropriate customer information including:

- Name.
- Contact details.
- Verified phone or email.
- Saved addresses.
- Customer category.
- Purchase history.
- Preferred cylinder sizes.
- Delivery preferences.
- Loyalty status.
- Wallet status.
- Scheduled refills.
- Communication preferences.
- Customer support history.

## 16.2 Customer segmentation

Support segments such as:

- New customers.
- Active customers.
- Repeat customers.
- High-value customers.
- Customers due for refill.
- Customers who have stopped ordering.
- Commercial customers.
- Loyalty members.
- Customers with outstanding balances.

## 16.3 Customer retention

Create a customer retention dashboard.

Display:

- Returning customer rate.
- Customers inactive for configurable periods.
- Customers who respond to reminders.
- Repeat purchase frequency.
- Average customer spending.
- Customer lifetime value estimates.
- Customer acquisition sources where known.

## 16.4 Customer support

Implement:

- Support requests.
- Order complaints.
- Delivery complaints.
- Payment disputes.
- Refund requests.
- Product enquiries.
- Support status tracking.
- Staff assignment.
- Internal notes.
- Resolution history.

Customer-facing support must show only appropriate information.

---

# PART 17 — MARKETING & CUSTOMER COMMUNICATION

Build an integrated communication centre.

## 17.1 Communication channels

Support configured channels such as:

- In-app notifications.
- Mobile push notifications.
- Email.
- SMS.
- WhatsApp Business messaging.

Only activate channels with valid provider configuration.

## 17.2 Notification types

Implement:

- Registration verification.
- Order confirmation.
- Payment confirmation.
- Order cancellation.
- Delivery assignment.
- Delivery progress.
- Delivery completion.
- Refund updates.
- Wallet transactions.
- Loyalty rewards.
- Refill reminders.
- Scheduled delivery reminders.
- Support responses.
- Promotional campaigns.

## 17.3 Marketing campaigns

Allow authorised administrators to:

- Create campaigns.
- Select eligible audiences.
- Choose communication channels.
- Schedule messages.
- Preview messages.
- Review estimated messaging costs where available.
- Send approved campaigns.
- Monitor delivery status.
- Review campaign performance.

## 17.4 Communication safeguards

Implement:

- Customer consent records.
- Channel preferences.
- Unsubscribe controls.
- Duplicate prevention.
- Quiet-hour settings where appropriate.
- Message rate limits.
- Delivery failure handling.
- Approved message templates.
- Audit history.

Separate essential transactional messages from optional marketing communications.

## 17.5 Automation

Support configurable automations for:

- Upcoming refill reminders.
- Abandoned carts, where consent and policy permit.
- Inactive customer reactivation.
- Loyalty milestone notifications.
- Scheduled delivery reminders.
- Low-stock alerts to staff.
- Daily business summaries.
- Outstanding commercial payment reminders.

All automated messages must be traceable to a valid business event or configured schedule.

---

# PART 18 — BUSINESS REPORTING & OPERATIONAL INTELLIGENCE

Build a complete reporting centre.

## 18.1 Sales reports

Include:

- Daily sales.
- Weekly sales.
- Monthly sales.
- Revenue by product.
- Revenue by cylinder size.
- Revenue by branch.
- Revenue by customer category.
- Revenue by payment method.
- Discounts and refunds.
- Average order value.

## 18.2 Profitability reports

Calculate profitability using recorded business costs.

Include:

- Product purchase costs.
- Selling prices.
- Discounts.
- Delivery expenses.
- Payment processing costs.
- Refunds.
- Gross profit.
- Estimated contribution margins where sufficient data exists.

Clearly distinguish revenue, gross profit, and net profit.

Do not display net profit unless the required expenses have been captured.

## 18.3 Inventory reports

Include:

- Available gas stock.
- Filled cylinder stock.
- Empty cylinder stock.
- Cylinder exchanges.
- Damaged cylinders.
- Stock adjustments.
- Stock losses.
- Supplier purchases.
- Low-stock items.
- Stock movement history.

## 18.4 Delivery reports

Include:

- Total deliveries.
- Completed deliveries.
- Failed deliveries.
- Average delivery duration.
- Delivery cost.
- Driver performance.
- Delivery zone performance.
- Customer delivery ratings.

## 18.5 Customer reports

Include:

- New customers.
- Active customers.
- Returning customers.
- Inactive customers.
- Purchase frequency.
- Customer spending.
- Refill prediction performance.
- Customer retention.
- Loyalty participation.

## 18.6 Business insights

Generate actionable observations based on actual data.

Examples:

- A particular cylinder size is approaching its reorder threshold.
- A delivery zone has unusually high failed deliveries.
- A group of customers may require refills soon.
- A product has declining sales.
- A commercial customer has overdue payments.
- A promotional campaign is generating repeat orders.

Every insight must provide:

- Supporting data.
- Relevant period.
- Explanation.
- Suggested action.
- Confidence or limitations where applicable.

Do not fabricate financial outcomes or customer behaviour.

## 18.7 Report exports

Support:

- CSV exports.
- Excel exports.
- PDF reports.
- Printable summaries.

Apply role permissions to all report exports.

---

# PART 19 — STAFF, BRANCH & BUSINESS SETTINGS

## 19.1 Staff management

Implement:

- Staff registration.
- Staff invitations.
- Role assignment.
- Branch assignment.
- Account activation.
- Account suspension.
- Permission management.
- Staff activity history.

## 19.2 Branch management

Support:

- Branch creation.
- Branch addresses.
- Branch operating hours.
- Branch inventory.
- Branch employees.
- Branch delivery zones.
- Branch sales.
- Branch reporting.
- Stock transfers.

## 19.3 Business settings

Allow authorised administrators to configure:

- Business name.
- Official logo.
- Business contact information.
- Business addresses.
- Operating