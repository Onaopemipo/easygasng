# Remaining Admin Settings audit

Audited 77 current Admin-visible definitions: 71 remaining controls and six previously consolidated payment controls. There are no duplicate canonical setting keys. Confusing categories and labels came from successive feature phases. Different controls that mention the same subject often have distinct authority; no values are merged or removed.

The 17 previously displayed categories become nine purpose-based categories. All 77 controls remain in the denominator and appear exactly once. Existing payment grouping is retained. Category names in storage stay unchanged because approval and delegation logic use them.

## Findings and decisions

- Business details, opening hours and website/review content share Business & Website. Financial document identity and public contact details remain distinct, including the existing unapproved-identity fallback.
- Published policy text belongs in Policies & Terms; locked approval safeguards belong in Staff & Security. Editing wording does not change operational enforcement.
- Gas & Products separates current per-kilogram/quantity rules, current product visibility, equipment prices and legacy fixed refill prices. A selling price and storefront visibility are separate controls.
- Delivery & Dispatch brings availability, verified locations, scheduling/capacity, customer fees, internal routing estimates and recurring COD orders together. Internal cost estimates do not set customer charges. The historical area string is clearly legacy.
- Services & Safety separates offering content/pricing/availability from qualified safety checklists. Renaming never substitutes for qualified activation.
- Rewards & Retention separates the activated EasyRewards programme, points administration, consent-controlled retention campaigns and legacy reward fields. Current rewards require programme activation plus technical flags. The three old fields do not configure the current engine; points-to-wallet conversion is not enabled by changing a historical rate.
- Stock & Valuation contains the valuation method, which is separate from physical counts and selling prices. Incomplete acquisition costs remain unavailable.
- Staff & Security contains role/branch assignment and the locked approval policy. Self-promotion and existing identity/independence rules remain enforced.

## Complete mapping

| Stable key | Previous category / label | New category / section / label | Authority |
| --- | --- | --- | --- |
| document.identity | Business Details / Verified financial document identity | Business & Website / Business identity / Invoice & receipt business details | document-identity.ts / invoices.ts / service-invoices.ts |
| legal.cancellation | Business Policies / Cancellation Policy | Policies & Terms / Orders & delivery / Cancellation policy | policies.ts |
| legal.delivery | Business Policies / Delivery Policy | Policies & Terms / Orders & delivery / Delivery policy | policies.ts |
| legal.loyalty | Business Policies / Loyalty Programme Terms | Policies & Terms / Rewards & wallet terms / EasyRewards terms | policies.ts |
| legal.purchase-credit | Business Policies / Prepaid Purchase Credit Terms | Policies & Terms / Rewards & wallet terms / Prepaid wallet credit terms | policies.ts |
| legal.privacy | Business Policies / Privacy Policy | Policies & Terms / Privacy & general terms / Privacy policy | policies.ts |
| legal.refund | Business Policies / Refund Policy | Policies & Terms / Orders & delivery / Refund policy | policies.ts |
| legal.service-booking | Business Policies / Service Booking Terms | Policies & Terms / Services & warranty / Service booking terms | policies.ts |
| legal.warranty | Business Policies / Service Warranty Terms | Policies & Terms / Services & warranty / Service warranty terms | policies.ts |
| legal.terms | Business Policies / Terms and Conditions | Policies & Terms / Privacy & general terms / General terms & conditions | policies.ts |
| delivery.enabled | Delivery / Accept delivery orders | Delivery & Dispatch / Order availability / Accept delivery orders | operations.ts / scheduling.ts / order-tracking.ts / gas-delivery.ts |
| delivery.zones | Delivery / Delivery areas | Delivery & Dispatch / Legacy coverage list / Legacy delivery area list (collapsed legacy/advanced section) | operations.ts / scheduling.ts / order-tracking.ts / gas-delivery.ts |
| delivery.windows | Delivery / Delivery windows | Delivery & Dispatch / Scheduling & capacity / Bookable delivery windows | operations.ts / scheduling.ts / order-tracking.ts / gas-delivery.ts |
| delivery.capacity | Delivery / Orders per delivery window | Delivery & Dispatch / Scheduling & capacity / Order capacity per delivery window | operations.ts / scheduling.ts / order-tracking.ts / gas-delivery.ts |
| dispatch.routing | Delivery / Road routing and operating-cost policy | Delivery & Dispatch / Dispatch estimates / Dispatch route & cost estimates | dispatch-routing.ts / governance.ts |
| location.ajah | Delivery Locations / Ajah | Delivery & Dispatch / Delivery coverage locations / Ajah | gas-delivery.ts / governance.ts |
| location.lagos-island | Delivery Locations / Lagos Island | Delivery & Dispatch / Delivery coverage locations / Lagos Island | gas-delivery.ts / governance.ts |
| location.lekki | Delivery Locations / Lekki | Delivery & Dispatch / Delivery coverage locations / Lekki | gas-delivery.ts / governance.ts |
| location.66e178b6-1621-48d5-add3-12cc6550df7b | Delivery Locations / SANDBOX ONLY — Payment Test | Delivery & Dispatch / Delivery coverage locations / SANDBOX ONLY — Payment Test | gas-delivery.ts / governance.ts |
| location.victoria-island | Delivery Locations / Victoria Island | Delivery & Dispatch / Delivery coverage locations / Victoria Island | gas-delivery.ts / governance.ts |
| delivery.fee | Delivery Pricing / Flat delivery fee per order | Delivery & Dispatch / Customer delivery charges / Flat customer delivery fee | operations.ts / scheduling.ts / order-tracking.ts / gas-delivery.ts |
| gas.price_per_kg | Gas Pricing / Gas price per kilogram | Gas & Products / Gas pricing & quantities / Gas selling price per kg | preceding payment audit: docs/settings-categories/AUDIT.md |
| gas.quantity_policy | Gas Pricing / Gas quantity and cylinder sizes | Gas & Products / Gas pricing & quantities / Gas order quantities & cylinder sizes | preceding payment audit: docs/settings-categories/AUDIT.md |
| business.hours | General Business / Opening hours | Business & Website / Business identity / Branch opening hours | service.ts public config |
| payment.integration | Integrations / Payment integration enabled | Payments & Wallet / Advanced controls / Legacy payment integration (collapsed legacy/advanced section) | preceding payment audit: docs/settings-categories/AUDIT.md |
| inventory.valuation | Inventory / Inventory valuation method | Stock & Valuation / Stock valuation / Stock valuation method | inventory-valuation.ts |
| loyalty.adjustment | Loyalty / Audited points adjustment | Rewards & Retention / Points administration / Customer points adjustment | rewards.ts / reward-offers.ts / rewards-referrals.ts / governance.ts |
| loyalty.policy | Loyalty / EasyRewards policy | Rewards & Retention / EasyRewards programme / EasyRewards programme | rewards.ts / reward-offers.ts / rewards-referrals.ts / governance.ts |
| loyalty.referral_review | Loyalty / Referral risk review | Rewards & Retention / Points administration / Referral eligibility review | rewards.ts / reward-offers.ts / rewards-referrals.ts / governance.ts |
| loyalty.enabled | Loyalty / Reward earning enabled | Rewards & Retention / Legacy rewards controls / Legacy reward earning switch (collapsed legacy/advanced section) | historical migrations / workspace.ts; current engine uses rewards.ts |
| loyalty.spend_per_point | Loyalty / Spend per reward point (kobo) | Rewards & Retention / Legacy rewards controls / Legacy spend per reward point (collapsed legacy/advanced section) | historical migrations / workspace.ts; current engine uses rewards.ts |
| loyalty.credit_per_point | Loyalty / Wallet credit per redeemed point (kobo) | Rewards & Retention / Legacy rewards controls / Legacy points-to-wallet conversion rate (collapsed legacy/advanced section) | historical migrations / workspace.ts; current engine uses rewards.ts |
| crm.retention | Marketing / Retention and win-back policy | Rewards & Retention / Retention campaigns / Customer retention & win-back rules | winback-crm.ts / channel-messaging.ts |
| wallet.maximum | Payments & Wallet / Maximum purchase credit funding | Payments & Wallet / Customer wallet / Cash & bank-transfer wallet limit | preceding payment audit: docs/settings-categories/AUDIT.md |
| payment.cod | Payments & Wallet / Payment on delivery | Payments & Wallet / Cash & settlement / Cash on delivery | preceding payment audit: docs/settings-categories/AUDIT.md |
| payment.settlement | Payments & Wallet / Settlement account | Payments & Wallet / Cash & settlement / Settlement bank details | preceding payment audit: docs/settings-categories/AUDIT.md |
| price.cylinder-empty-12 | Products & Pricing / 12.5kg Empty Cylinder price | Gas & Products / Equipment & accessories / 12.5kg Empty Cylinder — selling price | governance.ts → inventory / gas-delivery.ts |
| publish.cylinder-empty-12 | Products & Pricing / 12.5kg Empty Cylinder visibility | Gas & Products / Equipment & accessories / 12.5kg Empty Cylinder — storefront visibility | governance.ts → inventory / gas-delivery.ts |
| price.refill-12 | Products & Pricing / 12.5kg Gas Refill price | Gas & Products / Legacy refill prices / 12.5kg Gas Refill — legacy fixed refill price (collapsed legacy/advanced section) | governance.ts → inventory / gas-delivery.ts |
| publish.refill-12 | Products & Pricing / 12.5kg Gas Refill visibility | Gas & Products / Gas refill storefront visibility / 12.5kg Gas Refill — storefront visibility | governance.ts → inventory / gas-delivery.ts |
| price.cylinder-empty-25 | Products & Pricing / 25kg Empty Cylinder price | Gas & Products / Equipment & accessories / 25kg Empty Cylinder — selling price | governance.ts → inventory / gas-delivery.ts |
| publish.cylinder-empty-25 | Products & Pricing / 25kg Empty Cylinder visibility | Gas & Products / Equipment & accessories / 25kg Empty Cylinder — storefront visibility | governance.ts → inventory / gas-delivery.ts |
| price.refill-25 | Products & Pricing / 25kg Gas Refill price | Gas & Products / Legacy refill prices / 25kg Gas Refill — legacy fixed refill price (collapsed legacy/advanced section) | governance.ts → inventory / gas-delivery.ts |
| publish.refill-25 | Products & Pricing / 25kg Gas Refill visibility | Gas & Products / Gas refill storefront visibility / 25kg Gas Refill — storefront visibility | governance.ts → inventory / gas-delivery.ts |
| price.cylinder-empty-50 | Products & Pricing / 50kg Empty Cylinder price | Gas & Products / Equipment & accessories / 50kg Empty Cylinder — selling price | governance.ts → inventory / gas-delivery.ts |
| publish.cylinder-empty-50 | Products & Pricing / 50kg Empty Cylinder visibility | Gas & Products / Equipment & accessories / 50kg Empty Cylinder — storefront visibility | governance.ts → inventory / gas-delivery.ts |
| price.refill-50 | Products & Pricing / 50kg Refill price | Gas & Products / Legacy refill prices / 50kg Refill — legacy fixed refill price (collapsed legacy/advanced section) | governance.ts → inventory / gas-delivery.ts |
| publish.refill-50 | Products & Pricing / 50kg Refill visibility | Gas & Products / Gas refill storefront visibility / 50kg Refill — storefront visibility | governance.ts → inventory / gas-delivery.ts |
| price.cylinder-empty-6 | Products & Pricing / 6kg Empty Cylinder price | Gas & Products / Equipment & accessories / 6kg Empty Cylinder — selling price | governance.ts → inventory / gas-delivery.ts |
| publish.cylinder-empty-6 | Products & Pricing / 6kg Empty Cylinder visibility | Gas & Products / Equipment & accessories / 6kg Empty Cylinder — storefront visibility | governance.ts → inventory / gas-delivery.ts |
| price.refill-6 | Products & Pricing / 6kg Gas Refill price | Gas & Products / Legacy refill prices / 6kg Gas Refill — legacy fixed refill price (collapsed legacy/advanced section) | governance.ts → inventory / gas-delivery.ts |
| publish.refill-6 | Products & Pricing / 6kg Gas Refill visibility | Gas & Products / Gas refill storefront visibility / 6kg Gas Refill — storefront visibility | governance.ts → inventory / gas-delivery.ts |
| price.burner | Products & Pricing / Double Burner price | Gas & Products / Equipment & accessories / Double Burner — selling price | governance.ts → inventory / gas-delivery.ts |
| publish.burner | Products & Pricing / Double Burner visibility | Gas & Products / Equipment & accessories / Double Burner — storefront visibility | governance.ts → inventory / gas-delivery.ts |
| price.hose | Products & Pricing / Gas Hose price | Gas & Products / Equipment & accessories / Gas Hose — selling price | governance.ts → inventory / gas-delivery.ts |
| publish.hose | Products & Pricing / Gas Hose visibility | Gas & Products / Equipment & accessories / Gas Hose — storefront visibility | governance.ts → inventory / gas-delivery.ts |
| price.regulator | Products & Pricing / Gas Regulator price | Gas & Products / Equipment & accessories / Gas Regulator — selling price | governance.ts → inventory / gas-delivery.ts |
| publish.regulator | Products & Pricing / Gas Regulator visibility | Gas & Products / Equipment & accessories / Gas Regulator — storefront visibility | governance.ts → inventory / gas-delivery.ts |
| price.kit | Products & Pricing / Kitchen Starter Kit price | Gas & Products / Equipment & accessories / Kitchen Starter Kit — selling price | governance.ts → inventory / gas-delivery.ts |
| publish.kit | Products & Pricing / Kitchen Starter Kit visibility | Gas & Products / Equipment & accessories / Kitchen Starter Kit — storefront visibility | governance.ts → inventory / gas-delivery.ts |
| service.cooker-installation | Professional Services / Cooker Installation | Services & Safety / Service offerings / Cooker Installation | professional-services.ts / governance.ts |
| checklist.cooker-installation | Professional Services / Cooker Installation safety checklist | Services & Safety / Safety checklists / Cooker Installation — safety checklist | professional-services.ts / governance.ts |
| service.cooker-servicing | Professional Services / Cooker Servicing | Services & Safety / Service offerings / Cooker Servicing | professional-services.ts / governance.ts |
| checklist.cooker-servicing | Professional Services / Cooker Servicing safety checklist | Services & Safety / Safety checklists / Cooker Servicing — safety checklist | professional-services.ts / governance.ts |
| service.cylinder-installation | Professional Services / Cylinder Installation | Services & Safety / Service offerings / Cylinder Installation | professional-services.ts / governance.ts |
| checklist.cylinder-installation | Professional Services / Cylinder Installation safety checklist | Services & Safety / Safety checklists / Cylinder Installation — safety checklist | professional-services.ts / governance.ts |
| service.cylinder-maintenance | Professional Services / Cylinder Maintenance | Services & Safety / Service offerings / Cylinder Maintenance | professional-services.ts / governance.ts |
| checklist.cylinder-maintenance | Professional Services / Cylinder Maintenance safety checklist | Services & Safety / Safety checklists / Cylinder Maintenance — safety checklist | professional-services.ts / governance.ts |
| service.gas-safety-check | Professional Services / Gas Safety Checks | Services & Safety / Service offerings / Gas Safety Checks | professional-services.ts / governance.ts |
| checklist.gas-safety-check | Professional Services / Gas Safety Checks safety checklist | Services & Safety / Safety checklists / Gas Safety Checks — safety checklist | professional-services.ts / governance.ts |
| security.policy | Security & Privacy / Approval policy | Staff & Security / Approval safeguards / Approval safeguards (read-only) | governance.ts / staff.ts / delegation.ts |
| security.permissions | Staff & Permissions / Staff permission change | Staff & Security / Staff access / Staff roles & branch access | governance.ts / staff.ts / delegation.ts |
| subscription.enabled | Subscriptions / Authorised recurring COD orders | Delivery & Dispatch / Recurring delivery orders / Recurring cash-on-delivery orders | scheduling.ts |
| wallet.enabled | Wallet / Purchase credit spending enabled | Payments & Wallet / Customer wallet / Wallet access | preceding payment audit: docs/settings-categories/AUDIT.md |
| payment.gateway | Wallet & Payments / Payment Gateway & Fees | Payments & Wallet / Online payments / Online payments & fees | preceding payment audit: docs/settings-categories/AUDIT.md |
| testimonials.policy | Website & Testimonials / Customer testimonials | Business & Website / Customer reviews / Customer review publication rules | testimonials.ts / media.ts |
| website.content | Website & Testimonials / Homepage & contact information | Business & Website / Public website / Homepage & public contact details | website-schema.ts / service.ts |

Unknown future settings and new location IDs are retained through namespace/category fallbacks. Old setting names, category names and canonical keys remain searchable. Search expands matching legacy disclosures. Source DTOs, permission metadata, current values/versions and edit/history action contracts are retained. No database migration or hosted business-setting mutation is required.

This phase does not delete historical controls, change reward or financial policies, renew qualifications, authorise messages or activate payment providers. Production NO-GO, actual-import hold, retain-all, native/provider/physical-operation and unrelated gates stay unchanged.

Final approval-label finding: static risk-tier badges could say “Dual approval” while the editor correctly reported server-authorised Admin automatic approval. Cards now reuse the editor's existing approval-copy helper and server `owner_auto_approval` metadata. Roles without request permission see View only; locked definitions see Read only. Risk styling and all actual approval, identity, scheduling and qualified activation controls remain unchanged. Initial release evidence is retained separately; corrected-source acceptance is repeated.
