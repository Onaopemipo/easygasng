/** Presentation only. Never use these names for governance/authorisation. */
type Setting = {
  key: string;
  category: string;
  label: string;
  description: string;
};
export const paymentSettingsCategory = "Payments & Wallet";
const aliases = [paymentSettingsCategory, "Wallet & Payments", "Wallet"];
const purposes: Record<
  string,
  { section: string; label: string; description: string }
> = {
  "payment.gateway": {
    section: "Online payments",
    label: "Online payments & fees",
    description:
      "Configure Paystack sandbox checkout, payment methods, processing fees and card wallet top-ups. Card top-up limits are configured here.",
  },
  "wallet.enabled": {
    section: "Customer wallet",
    label: "Wallet access",
    description:
      "Allow customers to spend verified wallet credit and submit bank-transfer funding requests. Funding still requires configured bank instructions and approval.",
  },
  "wallet.maximum": {
    section: "Customer wallet",
    label: "Cash & bank-transfer wallet limit",
    description:
      "Limit approved cash and bank-transfer funding. Bank transfers also check the resulting wallet balance. Card top-up limits are separate under Online payments & fees.",
  },
  "payment.cod": {
    section: "Cash & settlement",
    label: "Cash on delivery",
    description:
      "Allow cash-on-delivery orders. Payment remains unpaid until the cash is verified.",
  },
  "payment.settlement": {
    section: "Cash & settlement",
    label: "Settlement bank details",
    description:
      "Store governed bank account metadata. This does not configure customer bank-transfer instructions or Paystack credentials.",
  },
  "payment.integration": {
    section: "Advanced controls",
    label: "Legacy payment integration",
    description:
      "Legacy protective switch; it does not enable Paystack. Use Online payments & fees for the Paystack sandbox. Existing protective-disable controls remain available.",
  },
};
const sections = [
  "Online payments",
  "Customer wallet",
  "Cash & settlement",
  "Other payment controls",
  "Advanced controls",
];
export function settingsDisplayCategory(d: Setting): string {
  return purposes[d.key] || aliases.includes(d.category)
    ? paymentSettingsCategory
    : d.category;
}
export function settingsDisplay<T extends Setting>(d: T): T {
  const purpose = purposes[d.key];
  return purpose
    ? { ...d, label: purpose.label, description: purpose.description }
    : d;
}
export function settingsCategories(data: Setting[]): string[] {
  return [...new Set(data.map(settingsDisplayCategory))].sort((a, b) =>
    a.localeCompare(b),
  );
}
export function settingMatches(d: Setting, query: string): boolean {
  const display = settingsDisplay(d);
  // Preserve old labels/category aliases as search terms, including saved operator vocabulary.
  const terms = [
    d.key,
    d.category,
    d.label,
    d.description,
    display.label,
    display.description,
    settingsDisplayCategory(d),
    ...(settingsDisplayCategory(d) === paymentSettingsCategory ? aliases : []),
  ];
  return terms.join(" ").toLowerCase().includes(query.trim().toLowerCase());
}
export function settingsGroups<T extends Setting>(
  data: T[],
  category: string,
  query: string,
) {
  const matches = data.filter(
    (d) =>
      (query.trim() || settingsDisplayCategory(d) === category) &&
      settingMatches(d, query),
  );
  const groups: { title: string; advanced: boolean; settings: T[] }[] = [];
  for (const d of matches) {
    const title =
      settingsDisplayCategory(d) === paymentSettingsCategory
        ? (purposes[d.key]?.section ?? "Other payment controls")
        : query.trim()
          ? settingsDisplayCategory(d)
          : "";
    let group = groups.find((g) => g.title === title);
    if (!group) {
      group = { title, advanced: title === "Advanced controls", settings: [] };
      groups.push(group);
    }
    group.settings.push(d);
  }
  for (const group of groups)
    group.settings.sort((a, b) => {
      const order = Object.keys(purposes);
      const ai = order.indexOf(a.key),
        bi = order.indexOf(b.key);
      return ai >= 0 && bi >= 0
        ? ai - bi
        : settingsDisplay(a).label.localeCompare(settingsDisplay(b).label);
    });
  return groups.sort((a, b) => {
    const ai = sections.indexOf(a.title), bi = sections.indexOf(b.title);
    return (ai < 0 ? 100 : ai) - (bi < 0 ? 100 : bi) || a.title.localeCompare(b.title);
  });
}
