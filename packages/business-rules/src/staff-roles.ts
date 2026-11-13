export const staffRoles = [
  "owner",
  "finance",
  "manager",
  "driver",
  "technician",
] as const;

export type StaffRole = (typeof staffRoles)[number];

export const accountRoles = [...staffRoles, "customer", "commercial"] as const;

export const staffRoleDetails: Record<
  StaffRole,
  { label: string; description: string }
> = {
  owner: {
    label: "Admin / Business Owner",
    description:
      "Business-wide administration, governance and qualified safety oversight.",
  },
  finance: {
    label: "Finance / Auditor / Inventory",
    description:
      "Branch finance, audit history, inventory and eligible independent reviews.",
  },
  manager: {
    label: "Branch Manager / Sales Rep / Dispatcher / Service Manager",
    description: "Branch operations, sales, dispatch and service coordination.",
  },
  driver: {
    label: "Delivery Driver",
    description: "Assigned deliveries and authorised delivery updates.",
  },
  technician: {
    label: "Service Technician",
    description:
      "Assigned jobs. Technical work requires current qualifications.",
  },
};

const previousRoles = new Map<string, StaffRole>([
  ["administrator", "owner"],
  ["safety_officer", "owner"],
  ["inventory", "finance"],
  ["auditor", "finance"],
  ["sales", "manager"],
  ["sales_rep", "manager"],
  ["dispatcher", "manager"],
  ["service_manager", "manager"],
]);

export function consolidatedRole(role: string) {
  return previousRoles.get(role) ?? role;
}

export function staffRoleLabel(role: string) {
  const canonical = consolidatedRole(role) as StaffRole;
  return staffRoleDetails[canonical]?.label ?? role;
}
