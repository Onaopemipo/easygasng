import contractsJson from "./native-workflow-contracts.json";
export type NativeField = {
  name: string;
  type: string;
  required: boolean;
  format?: string;
  value?: any;
  options?: any[];
  fields?: NativeField[];
  item?: NativeField;
  min?: number;
  max?: number;
  integer?: boolean;
  nullable?: boolean;
};
export type NativeContract = {
  fields: NativeField[];
  source: string;
  line?: number;
};
export const nativeContracts = contractsJson as unknown as Record<
  string,
  NativeContract
>;
export type Workspace = {
  title: string;
  access: string;
  roles: string[];
  reads: Record<string, string>;
  actions: string[];
  recordActions?: string[];
  destination?: string;
};
const business = ["owner", "manager", "finance"],
  manage = ["owner", "manager"];
export const nativeWorkspaces: Record<string, Workspace> = {
  inventory: {
    title: "Inventory",
    access: "inventory",
    roles: business,
    reads: {
      Stock: "inventory.workspace",
      Movements: "inventory.movements",
      Stocktakes: "business.snapshot",
    },
    actions: [
      "inventory.receipt",
      "inventory.stocktake.create",
      "inventory.stocktake.submit",
      "inventory.stocktake",
      "inventory.adjust",
      "inventory.quarantine",
      "inventory.release",
      "inventory.return",
      "inventory.disposition",
      "inventory.threshold",
      "transfer.create",
      "transfer.dispatch",
      "transfer.receive",
      "transfer.cancel",
    ],
  },
  products: {
    title: "Products & specifications",
    access: "products",
    roles: business,
    reads: { Products: "catalogue.manage", Compatibility: "products.manage" },
    actions: [
      "product.save",
      "product.metadata",
      "category.save",
      "compatibility.propose",
      "compatibility.review",
    ],
    recordActions: ["setting.propose"],
  },
  cylinders: {
    title: "Cylinder records",
    access: "cylinders",
    roles: business,
    reads: { Cylinders: "cylinders" },
    actions: [
      "cylinder.create",
      "cylinder.inspect",
      "cylinder.custody",
      "cylinder.fill",
    ],
  },
  purchasing: {
    title: "Purchasing",
    access: "inventory",
    roles: business,
    reads: {
      Purchases: "purchasing",
      Suppliers: "purchasing",
      Transfers: "transfers",
    },
    actions: [
      "supplier.create",
      "supplier.update",
      "purchase.create",
      "purchase.update",
      "inventory.receipt",
      "transfer.create",
      "transfer.dispatch",
      "transfer.receive",
      "transfer.cancel",
    ],
  },
  credits: {
    title: "Credits & refunds",
    access: "credits",
    roles: ["owner", "finance"],
    reads: { Requests: "credits?view=workspace", Documents: "documents.list" },
    actions: ["credit.request", "credit.decide", "invoice.excess.request"],
  },
  reconciliation: {
    title: "Financial reconciliation",
    access: "reconciliation",
    roles: ["owner", "finance"],
    reads: {
      Documents: "finance",
      Collections: "cash.collections",
      Expenses: "business.snapshot",
    },
    actions: [
      "cash.reconcile",
      "invoice.correction.propose",
      "invoice.correction.decide",
      "invoice.request.create",
      "invoice.request.revoke",
      "expense.create",
      "expense.record",
      "expense.pay",
      "expense.reverse",
      "expense.category",
      "booking.cash.verify",
    ],
  },
  campaigns: {
    title: "Customer campaigns",
    access: "campaigns",
    roles: manage,
    reads: { Campaigns: "campaigns" },
    actions: ["campaign.create", "campaign.decide"],
  },
  rewards: {
    title: "Rewards reconciliation",
    access: "reports",
    roles: business,
    reads: {
      Ledger: "rewards.report",
      Offers: "rewards.report",
      Referrals: "rewards.report",
      "Posting queue": "rewards.report",
    },
    actions: ["rewards.retry"],
  },
  recommendations: {
    title: "Recommendations",
    access: "recommendations",
    roles: manage,
    reads: { Rules: "recommendations.manage" },
    actions: ["recommendation.propose", "recommendation.approve"],
  },
  testimonials: {
    title: "Customer testimonials",
    access: "testimonials",
    roles: ["owner"],
    reads: {
      Submissions: "testimonials.manage",
      Analytics: "testimonials.analytics",
    },
    actions: ["testimonial.transition"],
  },
  incidents: {
    title: "Incidents",
    access: "incidents",
    roles: manage,
    reads: { Incidents: "incidents?view=workspace" },
    actions: ["incident.update"],
  },
  policies: {
    title: "Policies",
    access: "policies",
    roles: ["owner"],
    reads: { Policies: "policies.manage" },
    actions: ["setting.propose", "setting.rollback"],
  },
  branches: {
    title: "Branches & coverage",
    access: "settings",
    roles: ["owner"],
    reads: { Branches: "branches", Coverage: "delivery.locations.manage" },
    actions: ["branch.create", "delivery.location.create", "setting.propose"],
  },
  mail: {
    title: "Message delivery",
    access: "settings",
    roles: ["owner"],
    reads: { Outbox: "mail.status" },
    actions: ["mail.retry", "mail.reconcile"],
  },
  deliveries: {
    title: "Dispatch & custody",
    access: "deliveries",
    roles: manage,
    reads: {
      Dispatch: "dispatch.centre",
      Drivers: "tracking.drivers",
      Fleet: "fleet.summary",
      Trips: "fleet.summary",
      Custody: "bulk.summary",
      Products: "manifest.summary",
    },
    actions: [
      "dispatch.assign",
      "bulk.load.issue",
      "bulk.load.recover",
      "fleet.vehicle.create",
    ],
  },
  customers: {
    title: "Customer records",
    access: "customers",
    roles: manage,
    reads: { Customers: "customers.manage", Followups: "crm.followups" },
    actions: [
      "customers.create",
      "customers.update",
      "crm.followup.create",
      "crm.followup.outcome",
    ],
  },
  bundles: {
    title: "Product & service bundles",
    access: "bundles",
    roles: manage,
    reads: { Bundles: "bundles.manage" },
    actions: ["bundle.create", "bundle.propose"],
  },
  quotations: {
    title: "Service quotations",
    access: "bookings",
    roles: [...business, "technician"],
    reads: { Appointments: "bookings" },
    actions: [],
    destination: "bookings",
  },
  services: {
    title: "Services & scheduling",
    access: "services",
    roles: manage,
    reads: {
      Services: "services.manage",
      Slots: "services.manage",
      Appointments: "bookings",
    },
    actions: [
      "services.propose",
      "services.checklist.propose",
      "services.slot.create",
      "services.slot.block",
      "booking.transition",
      "booking.quote",
      "booking.quote.request_review",
      "booking.quote.decide",
      "booking.cash.verify",
    ],
    destination: "bookings",
  },
  reports: {
    title: "Reports & analytics",
    access: "reports",
    roles: business,
    reads: { Schedules: "business.snapshot" },
    actions: ["report.schedule", "report.schedule.cancel"],
  },
  equipment: {
    title: "Equipment & qualifications",
    access: "technicians",
    roles: business,
    reads: {
      Meters: "bulk.summary",
      Qualifications: "services.manage",
      Team: "technicians.workspace",
    },
    actions: [
      "bulk.meter.register",
      "bulk.meter.recalibrate",
      "bulk.meter.retire",
      "technician.qualify",
      "technician.revoke",
    ],
  },
  readiness: {
    title: "Release readiness",
    access: "settings",
    roles: ["owner"],
    reads: { Gates: "production.readiness", Reviews: "production.readiness" },
    actions: ["readiness.review"],
  },
  approvals: {
    title: "Approval Centre",
    access: "approvals",
    roles: business,
    reads: { Requests: "approvals?view=paged" },
    actions: [
      "approval.submit",
      "approval.edit",
      "approval.cancel",
      "approval.retry",
      "approval.revise",
      "approval.owner_apply",
      "approval.decide",
      "approval.activate",
    ],
  },
  settings: {
    title: "Business controls",
    access: "settings",
    roles: business,
    reads: { Controls: "settings" },
    actions: ["setting.propose", "setting.rollback"],
  },
  staff: {
    title: "Staff & access",
    access: "staff",
    roles: ["owner"],
    reads: { Staff: "staff.manage", Delegations: "delegations" },
    actions: [
      "staff.invite",
      "staff.edit",
      "staff.suspend",
      "staff.reinstate",
      "staff.access.request",
      "staff.privileges.save",
      "delegation.request",
      "delegation.decide",
      "delegation.revoke",
    ],
  },
};
export const nativeActionLabels: Record<string, string> = {
  "inventory.receipt": "Receive stock",
  "inventory.stocktake.create": "Start stocktake",
  "inventory.stocktake.submit": "Submit counted quantities",
  "inventory.stocktake": "Record counted stock",
  "inventory.adjust": "Request stock adjustment",
  "inventory.quarantine": "Quarantine goods",
  "inventory.release": "Request release from hold",
  "inventory.return": "Record returned goods",
  "inventory.disposition": "Review held goods",
  "inventory.threshold": "Set stock threshold",
  "transfer.create": "Request transfer",
  "transfer.dispatch": "Dispatch approved transfer",
  "transfer.receive": "Receive dispatched transfer",
  "transfer.cancel": "Cancel transfer",
  "supplier.create": "Add supplier",
  "supplier.update": "Update supplier",
  "purchase.create": "Request purchase",
  "purchase.update": "Update purchase",
  "product.save": "Create or update product",
  "product.metadata": "Edit product specifications",
  "category.save": "Save category",
  "compatibility.propose": "Propose compatibility evidence",
  "compatibility.review": "Review compatibility",
  "cylinder.create": "Register cylinder",
  "cylinder.inspect": "Record cylinder inspection",
  "cylinder.custody": "Record custody",
  "cylinder.fill": "Record cylinder fill",
  "credit.request": "Request customer credit",
  "credit.decide": "Review credit or refund",
  "invoice.correction.propose": "Propose invoice correction",
  "invoice.correction.decide": "Review invoice correction",
  "invoice.excess.request": "Request excess-collection review",
  "invoice.request.create": "Create payment request",
  "invoice.request.revoke": "Revoke payment request",
  "cash.reconcile": "Independently reconcile cash",
  "campaign.create": "Create campaign draft",
  "campaign.decide": "Review campaign",
  "recommendation.propose": "Propose recommendation",
  "recommendation.approve": "Review recommendation",
  "testimonial.transition": "Review publication status",
  "incident.update": "Update incident",
  "branch.create": "Add branch",
  "delivery.location.create": "Propose delivery location",
  "bundle.create": "Create bundle draft",
  "bundle.propose": "Submit bundle revision",
  "booking.transition": "Schedule or assign appointment",
  "booking.quote": "Draft assessed quotation",
  "booking.quote.request_review": "Submit quotation for review",
  "booking.quote.decide": "Review quotation",
  "booking.cash.verify": "Verify service collection",
  "report.schedule": "Schedule in-app report",
  "report.schedule.cancel": "Cancel report schedule",
  "mail.retry": "Authorise message retry",
  "mail.reconcile": "Reconcile interrupted delivery",
  "approval.owner_apply": "Apply eligible owner request",
  "approval.decide": "Review current request",
  "approval.activate": "Activate approved request",
  "setting.propose": "Propose controlled change",
  "setting.rollback": "Request historical rollback",
  "staff.privileges.save": "Change individual privileges",
  "rewards.retry": "Retry eligible reward posting",
};
const ownerOnly =
  /^(readiness\.|mail\.|branch\.create|category\.save|product\.metadata|recommendation\.approve|compatibility\.review|testimonial\.|staff\.|delegation\.|technician\.|bulk\.meter\.|bundle\.create|approval\.owner_apply)/;
export function actionRoles(action: string): string[] {
  return ownerOnly.test(action)
    ? ["owner"]
    : /^(credit\.|invoice\.|expense\.|cash\.|rewards\.retry|booking\.cash\.verify)/.test(
          action,
        )
      ? ["owner", "finance"]
      : /^(campaign\.create|campaign\.decide|recommendation\.propose|services\.|booking\.|crm\.|bundle\.)/.test(
            action,
          )
        ? manage
        : business;
}
export function visibleWorkspaces(role: string, allowed: readonly string[]) {
  return Object.entries(nativeWorkspaces).filter(
    ([, w]) => w.roles.includes(role) && allowed.includes(w.access),
  );
}
export function workspaceActions(key: string, role: string) {
  return [
    ...(nativeWorkspaces[key]?.actions || []),
    ...(nativeWorkspaces[key]?.recordActions || []),
  ].filter((a) => nativeContracts[a] && actionRoles(a).includes(role));
}
const pathKeys: Record<string, string> = {
  inventory: "inventory",
  purchasing: "purchasing",
  products: "products",
  cylinders: "cylinders",
  credits: "credits",
  reconciliation: "reconciliation",
  finance: "reconciliation",
  campaigns: "campaigns",
  recommendations: "recommendations",
  testimonials: "testimonials",
  incidents: "incidents",
  policies: "policies",
  branches: "branches",
  reports: "reports",
  deliveries: "deliveries",
  customers: "customers",
  bundles: "bundles",
  quotations: "quotations",
  services: "services",
  settings: "settings",
  staff: "staff",
  rewards: "rewards",
  approvals: "approvals",
  technicians: "equipment",
};
export function nativeInternalDestination(path: string) {
  if (
    !path.startsWith("/") ||
    path.startsWith("//") ||
    /[\\\u0000-\u001f]/.test(path)
  )
    return null;
  const u = new URL(path, "https://easygas.invalid");
  if (u.pathname === "/orders" || u.pathname.startsWith("/orders/"))
    return {
      screen: "orders",
      orderId:
        u.searchParams.get("id") || u.pathname.split("/")[2] || undefined,
    };
  if (u.pathname === "/bookings" || u.pathname.startsWith("/bookings/"))
    return { screen: "bookings" };
  const key = u.pathname.split("/")[2];
  if (u.pathname === "/admin/orders" || u.pathname.startsWith("/admin/orders/"))
    return {
      screen: "orders",
      orderId:
        u.searchParams.get("id") ||
        u.searchParams.get("orderId") ||
        u.pathname.split("/")[3] ||
        undefined,
    };
  if (key === "support") return { screen: "support" };
  if (key === "pos") return { screen: "retail-pos" };
  if (key === "audit") return { screen: "owner-audit" };
  if (pathKeys[key])
    return {
      screen: "workspace:" + pathKeys[key],
      scope: Object.fromEntries(
        [...u.searchParams].filter(([k]) =>
          ["branchId", "from", "to"].includes(k),
        ),
      ),
    };
  return null;
}
const get = (v: any, path: string) =>
  path.split(".").reduce((x, k) => x?.[k], v);
export function nativeRequest(action: string, values: Record<string, any>) {
  const contract = nativeContracts[action];
  if (!contract)
    throw Error("This action has no reviewed native API contract.");
  function cast(f: NativeField, value: any, path: string): any {
    if (value === "" || value === undefined || value === null) {
      if (f.nullable) return null;
      if (!f.required) return undefined;
      throw Error("Complete " + fieldLabel(path) + ".");
    }
    if (f.type === "object") {
      const o: any = {};
      for (const child of f.fields || []) {
        const v = cast(child, value?.[child.name], path + "." + child.name);
        if (v !== undefined) o[child.name] = v;
      }
      return o;
    }
    if (f.type === "array") {
      if (!Array.isArray(value))
        throw Error(fieldLabel(path) + " requires rows.");
      if (
        (f.min !== undefined && value.length < f.min) ||
        (f.max !== undefined && value.length > f.max)
      )
        throw Error(fieldLabel(path) + " has an invalid number of rows.");
      return value.map((v, i) => cast(f.item!, v, path + "." + i));
    }
    if (f.type === "number") {
      let n = Number(value);
      if (!Number.isFinite(n))
        throw Error("Enter a valid " + fieldLabel(path) + ".");
      if (/Kobo$/.test(f.name)) {
        const kobo = n * 100;
        if (Math.abs(kobo - Math.round(kobo)) > 0.000001)
          throw Error(
            fieldLabel(path) + " supports at most two decimal places.",
          );
        n = Math.round(kobo);
        if (!Number.isSafeInteger(n))
          throw Error(fieldLabel(path) + " is too large.");
      }
      if (f.integer && !Number.isSafeInteger(n))
        throw Error(fieldLabel(path) + " must be whole.");
      if (
        (f.min !== undefined && n < f.min) ||
        (f.max !== undefined && n > f.max)
      )
        throw Error(fieldLabel(path) + " is outside the allowed range.");
      return n;
    }
    if (f.type === "checkbox") {
      if (typeof value !== "boolean")
        throw Error("Choose " + fieldLabel(path) + ".");
      return value;
    }
    if (f.type === "json") {
      try {
        return typeof value === "string" ? JSON.parse(value) : value;
      } catch {
        throw Error(fieldLabel(path) + " is not valid structured data.");
      }
    }
    const text = String(value).trim();
    if (f.options && !f.options.map(String).includes(text))
      throw Error("Choose a valid " + fieldLabel(path) + ".");
    if (f.required && !text) throw Error("Complete " + fieldLabel(path) + ".");
    if (
      (f.min !== undefined && text.length < f.min) ||
      (f.max !== undefined && text.length > f.max)
    )
      throw Error(fieldLabel(path) + " is outside the allowed length.");
    return text;
  }
  const body: any = {};
  function unflatten(object: any) {
    const result: any = {};
    for (const [key, value] of Object.entries(object)) {
      const keys = key.split(".");
      let node = result;
      keys.forEach((k, i) => {
        if (i === keys.length - 1) node[k] = value;
        else node = node[k] ??= /^\d+$/.test(keys[i + 1]) ? [] : {};
      });
    }
    return result;
  }
  const expanded = { ...values, ...unflatten(values) };
  for (const f of contract.fields) {
    const v = cast(f, get(expanded, f.name), f.name);
    if (v !== undefined) body[f.name] = v;
  }
  if (values.operationKey) body.operationKey = values.operationKey;
  return body;
}
export function fieldLabel(name: string) {
  const labels: Record<string, string> = {
    id: "Record",
    branchId: "Branch",
    customerId: "Customer",
    supplierId: "Supplier",
    productId: "Product",
    gas: "Bulk gas (quantity in kg)",
    receivedDate: "Date received (YYYY-MM-DD)",
    receivingPassed: "Receiving inspection passed",
    version: "Current revision",
    scope: "Branch",
    key: "Controlled setting",
    unitCostKobo: "Unit acquisition cost (₦)",
    amountKobo: "Amount (₦)",
    reason: "Reason",
    evidence: "Evidence reference",
    acceptWalletCredit: "Customer accepts purchase credit",
    workerStopped: "Original sender has stopped",
    acknowledgePossibleDuplicate: "I have reviewed the duplicate-send risk",
  };
  return (
    labels[name] ||
    name
      .replace(/Kobo$/, " (₦)")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/[_.]/g, " ")
      .replace(/^./, (x) => x.toUpperCase())
  );
}
export function nativeRows(value: any, key?: string): any[] {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  const keys = key
    ? [key]
    : [
        "rows",
        "items",
        "products",
        "orders",
        "customers",
        "suppliers",
        "transfers",
        "documents",
        "requests",
        "messages",
        "gates",
        "people",
        "meters",
        "entries",
        "schedules",
        "stocktakes",
        "expenses",
        "policies",
        "documents",
        "incidents",
        "campaigns",
        "rules",
        "staff",
        "drivers",
        "qualifications",
        "locations",
      ];
  return [...new Set(keys)].flatMap((k) =>
    Array.isArray(value[k]) ? value[k] : [],
  );
}
/** Select the collection actually represented by a tab; never mix reference data into its records. */
export function nativeWorkspaceRows(tab: string, data: any): any[] {
  const collections: Record<string, string> = {
    Ledger: "ledger",
    Offers: "offers",
    Referrals: "referrals",
    "Posting queue": "jobs",
    Stock: "rows",
    Movements: "rows",
    Stocktakes: "stocktakes",
    Products: "products",
    Compatibility: "products",
    Purchases: "orders",
    Suppliers: "suppliers",
    Expenses: "expenses",
    Schedules: "schedules",
    Services: "services",
    Slots: "slots",
    Qualifications: "qualifications",
    Team: "people",
    Fleet: "vehicles",
    Trips: "trips",
    Custody: "loads",
    Followups: "followups",
    Reviews: "reviews",
    Staff: "people",
  };
  const key = collections[tab];
  return key && data && !Array.isArray(data)
    ? nativeRows(data, key)
    : nativeRows(data);
}
export const nativeActionRecordSources: Record<string, [string, string?]> = {
  "supplier.update": ["purchasing", "suppliers"],
  "purchase.update": ["purchasing", "orders"],
  "inventory.stocktake.submit": ["business.snapshot", "stocktakes"],
  "transfer.dispatch": ["transfers"],
  "transfer.receive": ["transfers"],
  "transfer.cancel": ["transfers"],
  "credit.decide": ["credits?view=workspace", "rows"],
  "cash.reconcile": ["cash.collections"],
  "expense.record": ["business.snapshot", "expenses"],
  "expense.pay": ["business.snapshot", "expenses"],
  "expense.reverse": ["business.snapshot", "expenses"],
  "cylinder.inspect": ["cylinders"],
  "cylinder.custody": ["cylinders"],
  "cylinder.fill": ["cylinders"],
  "campaign.decide": ["campaigns"],
  "recommendation.approve": ["recommendations.manage"],
  "bundle.propose": ["bundles.manage"],
  "services.slot.block": ["services.manage", "slots"],
  "testimonial.transition": ["testimonials.manage", "rows"],
  "incident.update": ["incidents?view=workspace", "rows"],
  "mail.retry": ["mail.status", "messages"],
  "mail.reconcile": ["mail.status", "messages"],
  "delegation.decide": ["delegations"],
  "delegation.revoke": ["delegations"],
  "technician.revoke": ["services.manage", "qualifications"],
  ...Object.fromEntries(
    [
      "submit",
      "edit",
      "cancel",
      "retry",
      "revise",
      "owner_apply",
      "decide",
      "activate",
    ].map((a) => ["approval." + a, ["approvals?view=paged", "rows"]]),
  ),
};
