// Route visibility maps existing read-action role allowlists; these are not new grants.
export type NavigationItem = {
  id: string;
  label: string;
  href: string;
  icon: string;
  roles: readonly string[];
  readAction: string;
  scope: "branch" | "assignment" | "global";
  badgeKey?: string;
  match: "exact" | "section";
};
export type NavigationGroup = {
  id: string;
  label: string;
  items: NavigationItem[];
};
const operational = ["owner", "manager", "finance"];
const services = ["owner", "manager", "technician", "finance"];
const settings = ["owner", "manager", "finance"];
function item(
  id: string,
  label: string,
  icon: string,
  roles: readonly string[],
  readAction: string,
  badgeKey?: string,
  scope: NavigationItem["scope"] = "branch",
): NavigationItem {
  return {
    id,
    label,
    icon,
    roles,
    readAction,
    badgeKey,
    scope,
    href: id === "dashboard" ? "/admin" : `/admin/${id}`,
    match: id === "dashboard" ? "exact" : "section",
  };
}
export const adminNavigation: NavigationGroup[] = [
  {
    id: "overview",
    label: "Overview",
    items: [
      item("dashboard", "Dashboard", "House", operational, "business.snapshot"),
    ],
  },
  {
    id: "sales",
    label: "Sales & Customers",
    items: [
      item(
        "orders",
        "Orders",
        "ShoppingCart",
        ["owner", "manager", "finance"],
        "orders",
        "orders",
      ),
      item(
        "pos",
        "Retail POS",
        "Monitor",
        ["owner", "manager", "finance"],
        "pos",
      ),
      item(
        "customers",
        "Customers",
        "UsersRound",
        ["owner", "manager"],
        "customers",
      ),
      item(
        "support",
        "Support Desk",
        "Headset",
        ["owner", "manager"],
        "support.list",
        "support",
      ),
    ],
  },
  {
    id: "stock",
    label: "Products & Stock",
    items: [
      item(
        "products",
        "Products",
        "Package",
        ["owner", "manager", "finance", "technician"],
        "products.manage",
      ),
      item(
        "inventory",
        "Inventory",
        "Warehouse",
        operational,
        "business.snapshot",
        "inventory",
      ),
      item(
        "cylinders",
        "Cylinders",
        "Cylinder",
        ["owner", "manager", "finance"],
        "cylinders",
      ),
      item(
        "bundles",
        "Product & Service Bundles",
        "Layers",
        ["owner", "manager"],
        "bundles.manage",
      ),
    ],
  },
  {
    id: "delivery",
    label: "Delivery & Services",
    items: [
      item(
        "deliveries",
        "Deliveries",
        "Truck",
        ["owner", "manager", "driver"],
        "orders",
        "deliveries",
        "assignment",
      ),
      item(
        "bookings",
        "Service Bookings",
        "CalendarCheck",
        services,
        "bookings",
        "bookings",
        "assignment",
      ),
      item(
        "services",
        "Professional Services",
        "Wrench",
        services,
        "services.manage",
      ),
      item(
        "technicians",
        "Technicians",
        "HardHat",
        ["owner", "manager", "finance"],
        "services.manage",
      ),
      item(
        "quotations",
        "Quotations",
        "FileText",
        ["owner", "manager", "finance"],
        "bookings",
      ),
    ],
  },
  {
    id: "finance",
    label: "Finance & Performance",
    items: [
      item(
        "finance",
        "Wallet & Payments",
        "Wallet",
        ["owner", "finance"],
        "business.snapshot",
      ),
      item(
        "reconciliation",
        "Financial Reconciliation",
        "RefreshCw",
        ["owner", "finance"],
        "finance.summary",
        "reconciliation",
      ),
      item(
        "credits",
        "Credits & Refunds",
        "Receipt",
        ["owner", "finance"],
        "credits",
      ),
      item(
        "reports",
        "Reports & Analytics",
        "ChartNoAxesCombined",
        operational,
        "business.snapshot",
      ),
    ],
  },
  {
    id: "growth",
    label: "Growth & Engagement",
    items: [
      item(
        "campaigns",
        "Campaigns",
        "Megaphone",
        ["owner", "manager"],
        "campaigns",
      ),
      item(
        "recommendations",
        "Recommendations",
        "Lightbulb",
        ["owner", "manager"],
        "recommendations.manage",
      ),
      item(
        "testimonials",
        "Customer Testimonials",
        "Headset",
        ["owner"],
        "testimonials.manage",
        undefined,
        "global",
      ),
    ],
  },
  {
    id: "administration",
    label: "Administration & Control",
    items: [
      item(
        "staff",
        "Staff Management",
        "UsersRound",
        ["owner", "manager"],
        "staff.manage",
      ),
      item(
        "approvals",
        "Approval Centre",
        "ShieldCheck",
        settings,
        "approvals",
        "approvals",
      ),
      item("settings", "Settings", "Settings", settings, "settings"),
      item(
        "operations",
        "Operations Centre",
        "ClipboardList",
        ["owner", "manager", "finance"],
        "purchasing",
      ),
      item(
        "incidents",
        "Operational Incidents",
        "TriangleAlert",
        ["owner", "manager", "finance"],
        "incidents",
        "incidents",
      ),
      item(
        "policies",
        "Customer Policies",
        "FileCheck",
        ["owner"],
        "policies.manage",
      ),
      item(
        "audit",
        "Audit History",
        "ScrollText",
        ["owner", "finance"],
        "audit",
      ),
      item(
        "readiness",
        "Launch Readiness",
        "Rocket",
        ["owner"],
        "production.readiness",
        undefined,
        "global",
      ),
    ],
  },
];
export const navigationItems = adminNavigation.flatMap((g) => g.items);
export function activeNavigation(path: string): NavigationItem | undefined {
  const clean = path.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  return [...navigationItems]
    .sort((a, b) => b.href.length - a.href.length)
    .find(
      (i) =>
        clean === i.href ||
        (i.match === "section" && clean.startsWith(i.href + "/")),
    );
}
export function roleNavigation(role: string, branchId: string | null) {
  return adminNavigation
    .map((g) => ({
      ...g,
      items: g.items.filter(
        (i) =>
          i.roles.includes(role) &&
          (role === "owner" || Boolean(branchId)) &&
          (role !== "driver" || i.id === "deliveries") &&
          (role !== "technician" || ["bookings", "services"].includes(i.id)),
      ),
    }))
    .filter((g) => g.items.length);
}
export type NavigationPreferences = {
  collapsed: boolean;
  groups: Record<string, boolean>;
};
export function parseNavigationPreferences(
  raw: string | null,
): NavigationPreferences | null {
  try {
    if (!raw) return null;
    const p = JSON.parse(raw);
    if (
      !p ||
      typeof p.collapsed !== "boolean" ||
      !p.groups ||
      typeof p.groups !== "object" ||
      Array.isArray(p.groups)
    )
      return null;
    const groups: Record<string, boolean> = {};
    for (const g of adminNavigation) {
      if (typeof p.groups[g.id] === "boolean") groups[g.id] = p.groups[g.id];
    }
    return { collapsed: p.collapsed, groups };
  } catch {
    return null;
  }
}
export const badgeText = (count: number) =>
  count > 99 ? "99+" : String(count);

// Refreshing/stale counts are explicitly labelled as the last confirmed snapshot.
// No snapshot is persisted; authentication failure/logout still clear protected state.
export function refreshingNavigationSnapshot(previous: any) {
  return previous ? { ...previous, counterState: "loading" } : null;
}
export function failedNavigationSnapshot(previous: any) {
  if (!previous) return null;
  return previous.generatedAt
    ? { ...previous, counterState: "stale" }
    : {
        ...previous,
        counters: {},
        generatedAt: null,
        counterState: "unavailable",
      };
}
