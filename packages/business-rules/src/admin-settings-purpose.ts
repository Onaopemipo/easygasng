/** Display taxonomy only. Canonical server keys/categories/authorities must remain intact. */
type Setting = {
  key: string;
  category: string;
  label: string;
  description: string;
};
export type SettingsPurpose = {
  category: string;
  section: string;
  label: string;
  description: string;
  advanced?: boolean;
};
export const adminSettingsCategoryOrder = [
  "Business & Website",
  "Policies & Terms",
  "Gas & Products",
  "Delivery & Dispatch",
  "Services & Safety",
  "Payments & Wallet",
  "Rewards & Retention",
  "Stock & Valuation",
  "Staff & Security",
];
const categoryAliases: Record<string, string> = {
  "Business Details": "Business & Website",
  "General Business": "Business & Website",
  "Website & Testimonials": "Business & Website",
  "Business Policies": "Policies & Terms",
  Delivery: "Delivery & Dispatch",
  "Delivery Locations": "Delivery & Dispatch",
  "Delivery Pricing": "Delivery & Dispatch",
  Subscriptions: "Delivery & Dispatch",
  "Gas Pricing": "Gas & Products",
  "Products & Pricing": "Gas & Products",
  "Professional Services": "Services & Safety",
  Loyalty: "Rewards & Retention",
  Marketing: "Rewards & Retention",
  Inventory: "Stock & Valuation",
  "Security & Privacy": "Staff & Security",
  "Staff & Permissions": "Staff & Security",
};
export const remainingCategory = (category: string) =>
  categoryAliases[category] ?? category;
export const remainingAliases = (category: string) =>
  Object.keys(categoryAliases).filter(
    (key) => categoryAliases[key] === category,
  );
export const settingsCategoryDescriptions: Record<string, string> = {
  "Business & Website":
    "Manage business details, public website content and customer review rules.",
  "Policies & Terms":
    "Manage published customer policy text. Operational settings and existing approval checks remain separate.",
  "Gas & Products":
    "Manage current gas pricing, cylinder quantities and storefront product prices and visibility.",
  "Delivery & Dispatch":
    "Manage delivery availability, coverage, scheduling, customer charges and internal dispatch estimates.",
  "Services & Safety":
    "Manage service offerings and qualified safety checklists as separate controls.",
  "Payments & Wallet":
    "Manage online checkout, customer wallet access, cash payments and settlement details.",
  "Rewards & Retention":
    "Manage EasyRewards economics, points administration and consent-controlled retention campaigns.",
  "Stock & Valuation":
    "Configure how existing stock movements and complete acquisition costs are valued. Physical stock is managed in Inventory.",
  "Staff & Security":
    "Manage staff role/branch access and inspect the locked approval safeguards.",
};
const entries: Record<string, [string, string, string, boolean?]> = {
  "document.identity": [
    "Business identity",
    "Invoice & receipt business details",
    "Verified legal/contact details for new financial documents. Existing issued documents retain their original identity snapshot.",
  ],
  "business.hours": [
    "Business identity",
    "Branch opening hours",
    "Customer-facing opening hours for this branch. Delivery windows are configured separately.",
  ],
  "website.content": [
    "Public website",
    "Homepage & public contact details",
    "Homepage copy and public contacts. Document identity, prices, stock and delivery coverage have separate controls.",
  ],
  "testimonials.policy": [
    "Customer reviews",
    "Customer review publication rules",
    "Consent, eligibility and moderation rules for customer reviews and photos. Withdrawing consent still removes publication access.",
  ],
  "delivery.enabled": [
    "Order availability",
    "Accept delivery orders",
    "Allow delivery ordering only after stock, prices and verified coverage checks pass.",
  ],
  "delivery.windows": [
    "Scheduling & capacity",
    "Bookable delivery windows",
    "Available delivery time windows, used by scheduling and rescheduling. Branch opening hours are separate.",
  ],
  "delivery.capacity": [
    "Scheduling & capacity",
    "Order capacity per delivery window",
    "Maximum active orders for each delivery date/window. Existing branch locking prevents overbooking.",
  ],
  "delivery.fee": [
    "Customer delivery charges",
    "Flat customer delivery fee",
    "Fee for each eligible physical delivery order. Service call-outs and internal dispatch cost estimates are separate.",
  ],
  "dispatch.routing": [
    "Dispatch estimates",
    "Dispatch route & cost estimates",
    "Internal route-planning rates and stop allowances. Estimates do not change customer delivery fees or bypass route approval checks.",
  ],
  "subscription.enabled": [
    "Recurring delivery orders",
    "Recurring cash-on-delivery orders",
    "Generate recurring orders only with explicit customer consent and a customer-set price ceiling. This does not authorise automatic payment debits.",
  ],
  "delivery.zones": [
    "Legacy coverage list",
    "Legacy delivery area list",
    "Historical area list retained. Use Delivery coverage locations for current coverage and verify each actual address.",
    true,
  ],
  "gas.price_per_kg": [
    "Gas pricing & quantities",
    "Gas selling price per kg",
    "Selling price per kilogram for new gas quotations. Historic fixed refill prices are separate legacy controls.",
  ],
  "gas.quantity_policy": [
    "Gas pricing & quantities",
    "Gas order quantities & cylinder sizes",
    "Minimum/maximum quantity, increment, precision and supported cylinder capacities required before gas ordering opens.",
  ],
  "inventory.valuation": [
    "Stock valuation",
    "Stock valuation method",
    "Value existing stock movements using approved costing rules. Missing acquisition costs keep valuation unavailable; this does not change physical stock.",
  ],
  "loyalty.policy": [
    "EasyRewards programme",
    "EasyRewards programme",
    "Current points, discounts, referrals and eligible-offer rules. An activated approved policy and separate technical enablement flags are still required.",
  ],
  "loyalty.adjustment": [
    "Points administration",
    "Customer points adjustment",
    "One immutable, evidenced points adjustment per approved request. This does not transfer money into a wallet.",
  ],
  "loyalty.referral_review": [
    "Points administration",
    "Referral eligibility review",
    "Hold, clear or block a referral with evidence and independent review. A shared address alone is not proof of fraud.",
  ],
  "crm.retention": [
    "Retention campaigns",
    "Customer retention & win-back rules",
    "Inactivity thresholds and message budgets for retention campaigns. Existing consent, suppression and sending controls still apply.",
  ],
  "loyalty.enabled": [
    "Legacy rewards controls",
    "Legacy reward earning switch",
    "Historical control retained. Current EasyRewards earning uses the activated EasyRewards programme and technical issuance flag; this switch does not enable that engine.",
    true,
  ],
  "loyalty.spend_per_point": [
    "Legacy rewards controls",
    "Legacy spend per reward point",
    "Historical earning rate retained. Configure current earning economics in EasyRewards programme.",
    true,
  ],
  "loyalty.credit_per_point": [
    "Legacy rewards controls",
    "Legacy points-to-wallet conversion rate",
    "Historical wallet conversion rate retained. Current EasyRewards uses checkout discounts; this does not enable a points-to-wallet transfer.",
    true,
  ],
  "security.permissions": [
    "Staff access",
    "Staff roles & branch access",
    "Change an existing account’s role and branch through the existing protected access workflow. Self-promotion remains prohibited.",
  ],
  "security.policy": [
    "Approval safeguards",
    "Approval safeguards (read-only)",
    "Locked approval policy for this release. Client input cannot downgrade protected approval rules.",
  ],
};
const legalSections: Record<string, string> = {
  delivery: "Orders & delivery",
  refund: "Orders & delivery",
  cancellation: "Orders & delivery",
  "service-booking": "Services & warranty",
  warranty: "Services & warranty",
  loyalty: "Rewards & wallet terms",
  "purchase-credit": "Rewards & wallet terms",
  privacy: "Privacy & general terms",
  terms: "Privacy & general terms",
};
const legalLabels: Record<string, string> = {
  delivery: "Delivery policy",
  refund: "Refund policy",
  cancellation: "Cancellation policy",
  "service-booking": "Service booking terms",
  warranty: "Service warranty terms",
  loyalty: "EasyRewards terms",
  "purchase-credit": "Prepaid wallet credit terms",
  privacy: "Privacy policy",
  terms: "General terms & conditions",
};
export function remainingSettingPurpose(d: Setting): SettingsPurpose | null {
  const category = remainingCategory(d.category),
    entry = entries[d.key];
  if (entry)
    return {
      category,
      section: entry[0],
      label: entry[1],
      description: entry[2],
      advanced: entry[3] ?? false,
    };
  if (d.key.startsWith("location."))
    return {
      category: "Delivery & Dispatch",
      section: "Delivery coverage locations",
      label: d.label,
      description:
        "Delivery location visibility, boundary and address-confirmation rules. A listed location alone does not confirm an actual delivery address.",
    };
  if (d.key.startsWith("legal.")) {
    const key = d.key.slice(6);
    return {
      category: "Policies & Terms",
      section: legalSections[key] ?? "Other customer policies",
      label: legalLabels[key] ?? d.label,
      description:
        "Published customer policy text, subject to existing publication and approval checks. This text does not change operational settings.",
    };
  }
  if (d.key.startsWith("checklist."))
    return {
      category: "Services & Safety",
      section: "Safety checklists",
      label: d.label.replace(/ safety checklist$/i, "") + " — safety checklist",
      description:
        "Required service inspection/safety steps. Existing qualified-review and activation checks remain enforced.",
    };
  if (d.key.startsWith("service."))
    return {
      category: "Services & Safety",
      section: "Service offerings",
      label: d.label,
      description:
        "Service description, price and availability. Safety inspection steps are configured separately in Safety checklists.",
    };
  if (d.key.startsWith("price.")) {
    const product = d.label.replace(/ price$/i, "");
    if (d.key.startsWith("price.refill-"))
      return {
        category: "Gas & Products",
        section: "Legacy refill prices",
        label: product + " — legacy fixed refill price",
        description:
          "Historical fixed-fill price retained. New gas quotations use Gas selling price per kg and the approved quantity rules.",
        advanced: true,
      };
    return {
      category: "Gas & Products",
      section: "Equipment & accessories",
      label: product + " — selling price",
      description:
        "Selling price for future product orders. Confirmed order prices remain unchanged; storefront visibility is a separate control.",
    };
  }
  if (d.key.startsWith("publish.")) {
    const product = d.label.replace(/ visibility$/i, "");
    return {
      category: "Gas & Products",
      section: d.key.startsWith("publish.refill-")
        ? "Gas refill storefront visibility"
        : "Equipment & accessories",
      label: product + " — storefront visibility",
      description:
        "Show or hide this product in the customer catalogue. Visibility does not verify stock, safety or delivery coverage.",
    };
  }
  if (category !== d.category || adminSettingsCategoryOrder.includes(category))
    return {
      category,
      section: "Other controls",
      label: d.label,
      description: d.description,
    };
  return null;
}
export const adminSettingsSectionOrder = [
  "Business identity",
  "Public website",
  "Customer reviews",
  "Orders & delivery",
  "Services & warranty",
  "Rewards & wallet terms",
  "Privacy & general terms",
  "Gas pricing & quantities",
  "Gas refill storefront visibility",
  "Equipment & accessories",
  "Order availability",
  "Delivery coverage locations",
  "Scheduling & capacity",
  "Customer delivery charges",
  "Dispatch estimates",
  "Recurring delivery orders",
  "Service offerings",
  "Safety checklists",
  "Online payments",
  "Customer wallet",
  "Cash & settlement",
  "EasyRewards programme",
  "Points administration",
  "Retention campaigns",
  "Stock valuation",
  "Staff access",
  "Approval safeguards",
  "Other controls",
  "Other payment controls",
  "Legacy coverage list",
  "Legacy refill prices",
  "Legacy rewards controls",
  "Advanced controls",
];
