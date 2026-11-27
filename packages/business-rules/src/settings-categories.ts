import { settingApprovalCopy } from "./setting-editor";
import {
  adminSettingsCategoryOrder,
  adminSettingsSectionOrder,
  remainingCategory,
  remainingAliases,
  remainingSettingPurpose,
  settingsCategoryDescriptions,
} from "./admin-settings-purpose";
export { settingsCategoryDescriptions };
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
const sections = adminSettingsSectionOrder;
export function settingsDisplayCategory(d: Setting): string {
  return purposes[d.key] || aliases.includes(d.category)
    ? paymentSettingsCategory
    : (remainingSettingPurpose(d)?.category ?? remainingCategory(d.category));
}
export function settingsDisplay<T extends Setting>(d: T): T {
  const purpose = purposes[d.key] ?? remainingSettingPurpose(d);
  return purpose &&
    (purpose.label !== d.label || purpose.description !== d.description)
    ? { ...d, label: purpose.label, description: purpose.description }
    : d;
}
export function settingsCategories(data: Setting[]): string[] {
  return [...new Set(data.map(settingsDisplayCategory))].sort(
    (a, b) =>
      (adminSettingsCategoryOrder.indexOf(a) < 0
        ? 100
        : adminSettingsCategoryOrder.indexOf(a)) -
        (adminSettingsCategoryOrder.indexOf(b) < 0
          ? 100
          : adminSettingsCategoryOrder.indexOf(b)) || a.localeCompare(b),
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
    ...(settingsDisplayCategory(d) === paymentSettingsCategory
      ? aliases
      : remainingAliases(settingsDisplayCategory(d))),
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
  const groups: {
    id: string;
    category: string;
    title: string;
    advanced: boolean;
    settings: T[];
  }[] = [];
  for (const d of matches) {
    const displayCategory = settingsDisplayCategory(d);
    const purpose = purposes[d.key]
      ? {
          ...purposes[d.key],
          advanced: purposes[d.key].section === "Advanced controls",
        }
      : remainingSettingPurpose(d);
    const title =
      displayCategory === paymentSettingsCategory
        ? (purpose?.section ?? "Other payment controls")
        : (purpose?.section ?? (query.trim() ? displayCategory : ""));
    const groupId = `${displayCategory}:${title}`;
    let group = groups.find((g) => g.id === groupId);
    if (!group) {
      group = {
        id: groupId,
        category: displayCategory,
        title,
        advanced: purpose?.advanced ?? false,
        settings: [],
      };
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
    const ai = sections.indexOf(a.title),
      bi = sections.indexOf(b.title);
    return (
      (ai < 0 ? 100 : ai) - (bi < 0 ? 100 : bi) ||
      a.title.localeCompare(b.title)
    );
  });
}

/** Request availability and approval wording use server metadata, never display categories. */
export function settingsApprovalBadge(
  d: {
    propose_roles: string[];
    owner_auto_approval?: boolean;
    admin_reward_add?: boolean;
    risk: number;
    value_type?: string;
  },
  role: string,
) {
  if (!d.propose_roles.length || (role !== "owner" && !d.propose_roles.includes(role)))
    return {
      label: d.propose_roles.length ? "View only" : "Read only",
      detail:
        "This setting is available for viewing and history. Existing approval rights are enforced separately.",
    };
  return settingApprovalCopy(d);
}
