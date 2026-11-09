## 19.3 Business Settings (Continued)

Allow authorised administrators to configure:

### A. General Business Information

- Business name.
- Official company logo.
- Business registration information.
- Business contact information.
- Business addresses.
- Operating hours.
- Business timezone (default: Africa/Lagos).
- Default currency (NGN).
- Business email addresses.
- Customer support telephone numbers.
- WhatsApp business contact.
- Social media links.
- Website information.
- Invoice and receipt details.
- Business policies and customer-facing terms.

Changes to important business information must be recorded in the administrative activity history.

### B. Product & Pricing Settings

Provide configurable settings for:

- Gas cylinder sizes.
- Gas refill prices.
- New cylinder prices.
- Cylinder exchange prices.
- Gas accessories.
- Product categories.
- Product availability.
- Branch-specific prices.
- Commercial customer prices.
- Bulk purchase discounts.
- Promotional pricing.
- Minimum and maximum order quantities.
- Tax settings, where applicable.
- Product visibility across web and mobile.
- Price effective dates.

**Critical requirements:**

- Product prices must not be hardcoded.
- Only authorised staff may change prices.
- Price changes must record the previous value, new value, responsible staff member, and timestamp.
- Existing confirmed orders must retain their agreed prices.
- Pricing changes must update the customer website, mobile application, and retail sales interface consistently.

### C. Delivery Configuration

Allow the business to manage:

- Delivery service areas.
- Supported states, cities, and neighbourhoods.
- Delivery zones.
- Delivery fees.
- Minimum order requirements.
- Free-delivery thresholds.
- Same-day delivery availability.
- Scheduled delivery windows.
- Delivery operating hours.
- Maximum daily delivery capacity.
- Delivery assignment rules.
- Driver availability.
- Estimated delivery preparation times.
- Failed-delivery procedures.
- Redelivery charges.
- Delivery cancellation rules.
- Delivery confirmation requirements.

The business must be able to activate or deactivate delivery areas without developer intervention.

Customers outside supported delivery areas must receive a clear explanation rather than being allowed to complete an order that cannot be fulfilled.

### D. Inventory & Cylinder Settings

Provide settings for:

- Available cylinder sizes.
- Cylinder ownership categories.
- Cylinder identification requirements.
- Cylinder deposit amounts.
- Cylinder exchange rules.
- Empty-cylinder return procedures.
- Stock reorder thresholds.
- Minimum stock quantities.
- Stock adjustment permissions.
- Damaged-cylinder procedures.
- Cylinder inspection requirements.
- Supplier information.
- Stock transfer approval rules.
- Inventory valuation preferences.
- Low-stock notification recipients.

Unsafe, damaged, or otherwise ineligible cylinders must not be available for sale or fulfilment.

### E. Payment & Wallet Settings

Allow authorised administrators to configure:

- Enabled payment methods.
- Payment provider configuration.
- Bank transfer instructions.
- Cash payment availability.
- Payment-on-delivery eligibility.
- Minimum wallet funding amount.
- Maximum permitted wallet funding amount.
- Partial wallet payment eligibility.
- Refund policies.
- Refund approval limits.
- Payment reconciliation schedules.
- Transaction notification preferences.
- Payment failure handling.
- Customer credit limits where applicable.
- Commercial account payment terms.

**Security requirements:**

- Never expose secret payment credentials in the user interface.
- Never allow administrators to directly overwrite wallet balances.
- Financial adjustments must follow an approved transaction process.
- Record all changes to payment settings.
- Require additional authorisation for sensitive financial configuration changes.
- Do not enable regulated financial services without the required provider and compliance arrangements.

### F. Loyalty & Rewards Settings

Administrators must be able to configure:

- Loyalty programme activation.
- Loyalty tier names.
- Qualification thresholds.
- Points earned per eligible purchase.
- Reward redemption rates.
- Minimum redemption thresholds.
- Reward expiry.
- Referral reward eligibility.
- Referral reward amounts.
- Birthday rewards.
- Promotional bonuses.
- Customer tier benefits.
- Reward exclusions.
- Maximum reward limits.
- Campaign start and end dates.

Changes to loyalty rules must not silently recalculate previously completed transactions.

Maintain a record of which reward rules applied to each transaction.

### G. Smart Refill Prediction Settings

Provide a dedicated configuration page for the intelligent refill reminder system.

Administrators must be able to configure:

- Prediction feature activation.
- Supported cylinder sizes.
- Initial estimation rules.
- Minimum purchase history required for personalised predictions.
- Reminder intervals.
- Prediction recalculation frequency.
- Customer feedback options.
- Low-confidence prediction handling.
- Reminder frequency limits.
- Customer opt-out preferences.
- Customer eligibility.
- Business-facing forecast alerts.
- Prediction accuracy reporting.

Example reminder configuration:

| Reminder | Default |
|---|---|
| First reminder | 7 days before predicted refill |
| Second reminder | 3 days before predicted refill |
| Final reminder | On predicted refill date |
| Follow-up | Optional and configurable |
| Customer opt-out | Always available |

These are configurable defaults, not fixed business rules.

Never send a reminder based on a prediction that has been invalidated by a more recent verified refill.

### H. Scheduled Refill Settings

Allow configuration of:

- Available refill schedules.
- Minimum scheduling notice.
- Maximum advance booking period.
- Delivery confirmation requirements.
- Schedule modification deadlines.
- Cancellation rules.
- Paused subscription handling.
- Failed payment handling.
- Automatic payment eligibility.
- Customer notification intervals.
- Commercial supply schedules.

Scheduled refills must respect inventory availability, delivery capacity, and payment requirements.

### I. Notification & Communication Settings

Provide configuration for:

- Email notifications.
- SMS notifications.
- WhatsApp notifications.
- Mobile push notifications.
- Order updates.
- Payment notifications.
- Delivery notifications.
- Refill reminders.
- Loyalty notifications.
- Promotional campaigns.
- Staff alerts.
- Daily business summaries.
- Customer communication preferences.

Administrators should be able to manage approved notification templates.

Templates must support relevant information such as:

- Customer name.
- Order reference.
- Product.
- Delivery date.
- Payment amount.
- Predicted refill date.

Implement a preview function before templates are activated.

Prevent unauthorised access to customer contact information.

### J. Staff & Access Settings

Allow authorised administrators to manage:

- Staff roles.
- Staff invitations.
- Branch assignments.
- Account activation and suspension.
- Staff access permissions.
- Financial approval permissions.
- Inventory adjustment permissions.
- Refund approval permissions.
- Session security.
- Additional account verification.
- Staff activity history.

Permissions must be enforced throughout the platform.

Changing a staff member's permissions must take effect promptly, including for existing sessions.

### K. Website & Mobile App Content Settings

Provide a simple content management area for:

- Homepage banners.
- Promotional announcements.
- Featured products.
- Product categories.
- Homepage offers.
- App promotional content.
- Business description.
- Customer testimonials.
- FAQs.
- Contact information.
- Customer support information.
- Delivery policies.
- Refund policies.
- Privacy policy.
- Terms and conditions.

The business must be able to update approved customer-facing content without changing application code.

All changes must be validated before publication.

### L. Branch & Expansion Settings

Support:

- New branch registration.
- Branch addresses.
- Branch managers.
- Branch operating hours.
- Branch delivery zones.
- Branch product availability.
- Branch-specific pricing.
- Branch inventory.
- Branch staff.
- Branch reporting.
- Branch activation and suspension.

Ensure branch employees cannot access another branch's restricted records without explicit permission.

The business owner must be able to view consolidated performance across all authorised branches.

### M. Data, Reports & Business Records

Allow administrators to configure:

- Report preferences.
- Default reporting periods.
- Business reporting timezone.
- Sales report recipients.
- Daily summary recipients.
- Financial export permissions.
- Inventory export permissions.
- Customer data export permissions.
- Data retention policies.
- Backup monitoring.
- Historical record access.
- Audit history access.

Exports containing customer or financial information must be permission-controlled and recorded.

### N. Security & Privacy Settings

Provide controls for:

- Account security.
- Additional login verification.
- Session expiry.
- Device and session management.
- Account recovery.
- Sensitive action approvals.
- Privacy notices.
- Customer consent records.
- Customer data requests.
- Account deletion requests.
- Security event monitoring.
- Administrative activity history.

Do not expose secrets, passwords, private tokens, or sensitive customer information in application logs.

### O. Integration Settings

Create a secure integrations management page.

Supported integration categories may include:

- Payment providers.
- Email services.
- SMS providers.
- WhatsApp Business.
- Push notification services.
- Maps and navigation.
- Accounting services.
- Business reporting services.

Each integration should display:

- Provider name.
- Configuration status.
- Connection health.
- Last successful activity.
- Last failure.
- Available configuration actions.

Sensitive credentials must be stored securely on the server and never displayed in full.

If an integration is unavailable, affected features must show an appropriate status and recovery guidance rather than silently failing.

---

## 19.4 Business Settings Interface Design

Build a modern settings experience consistent with the approved EasyGas SaaS dashboard.

Use grouped navigation with these primary sections:

1. General Business
2. Products & Pricing
3. Delivery
4. Inventory & Cylinders
5. Payments & Wallet
6. Loyalty & Rewards
7. Smart Refill Settings
8. Scheduled Refills
9. Notifications
10. Staff & Permissions
11. Website & App Content
12. Branches
13. Reports & Data
14. Security & Privacy
15. Integrations

### Interface requirements

- Clear section headings.
- Compact, well-organised settings forms.
- Searchable settings navigation.
- Responsive desktop and tablet layouts.
- Clear descriptions for complex options.
- Appropriate switches, dropdowns, and input controls.
- Inline validation.
- Confirmation for sensitive changes.
- Unsaved-change warnings.
- Loading and saving indicators.
- Clear success and error feedback.
- Accessible keyboard navigation.
- Consistent EasyGas branding.

Avoid placing every configuration option on one excessively long page.

Use focused settings screens and logical subsections.

---

## 19.5 Business Settings Acceptance Criteria

The implementation is complete only when:

- [ ] All settings screens use the approved EasyGas design system.
- [ ] Authorised administrators can view and update supported settings.
- [ ] Unauthorised users cannot access restricted settings.
- [ ] Settings are saved persistently.
- [ ] Changes remain after logout and login.
- [ ] Changes affecting customers appear correctly on web and mobile.
- [ ] Product pricing updates propagate consistently.
- [ ] Delivery configuration affects checkout eligibility.
- [ ] Inventory thresholds trigger the appropriate alerts.
- [ ] Loyalty changes affect future eligible transactions correctly.
- [ ] Refill reminder configuration controls actual reminder scheduling.
- [ ] Notification preferences are respected.
- [ ] Branch restrictions are enforced.
- [ ] Financial configuration changes are audited.
- [ ] Sensitive integration credentials remain protected.
- [ ] Invalid configuration values are rejected.
- [ ] Failed updates do not leave partially applied settings.
- [ ] Concurrent administrative changes are handled safely.
- [ ] Unsaved changes trigger a warning before navigation.
- [ ] All relevant settings have loading, empty, error, and success states.
- [ ] Settings are usable on supported desktop, tablet, and mobile screen sizes.
- [ ] Automated tests cover configuration changes and their business effects.

### Closing Directive for Part 19

Implement Business Settings as a fully functional operational control centre, not a collection of decorative configuration forms.

Every setting must have a defined purpose, appropriate access restrictions, persistent storage, validation, and a measurable effect on the relevant business workflow.

Do not introduce settings that appear functional but are disconnected from the actual application.

**Continue with Part 20 — Safety, Compliance & Audit Management, followed by the remaining implementation, testing, deployment, and production-readiness requirements.**