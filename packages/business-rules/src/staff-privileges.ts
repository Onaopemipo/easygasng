// Explicit operation grants. No role impersonation, global-scope grant or wildcard grant.
export type Privilege = {
  id: string;
  label: string;
  group: string;
  description: string;
  roles: readonly string[];
  grantRole?: string;
  actions: readonly string[];
  routes?: readonly string[];
};
const operational = ["owner", "manager", "finance"];
export const staffPrivileges: readonly Privilege[] = [
  {
    id: "orders.view",
    label: "View orders",
    group: "Sales & customers",
    description: "View orders within the existing branch or assignment scope.",
    roles: ["owner", "manager", "driver", "finance"],
    grantRole: "manager",
    actions: ["orders"],
    routes: ["orders"],
  },
  {
    id: "customers.view",
    label: "View customers",
    group: "Sales & customers",
    description:
      "Search customer records and view customer details in the assigned branch.",
    roles: ["owner", "manager"],
    grantRole: "manager",
    actions: ["customers", "customers.manage", "customers.detail"],
    routes: ["customers"],
  },
  {
    id: "customers.edit",
    label: "Create and edit customers",
    group: "Sales & customers",
    description:
      "Create customer records and update names; does not grant customer sign-in or financial authority.",
    roles: ["owner", "manager"],
    grantRole: "manager",
    actions: ["customers.create", "customers.update"],
  },
  {
    id: "orders.manage",
    label: "Manage order fulfilment",
    group: "Protected authority",
    description:
      "Role-required: accept orders, request linked additions and update fulfilment. Assignment, cutoff, stock and payment controls remain mandatory.",
    roles: ["owner", "manager", "driver"],
    actions: [
      "order.transition",
      "order.additions",
      "order.addition.quote",
      "order.addition.create",
    ],
  },
  {
    id: "dispatch.manage",
    label: "Manage dispatch",
    group: "Protected authority",
    description:
      "Role-required: view dispatch queues and assign drivers. Safety blockers and automatic-assignment restrictions remain in effect.",
    roles: ["owner", "manager"],
    actions: [
      "dispatch.centre",
      "drivers.workspace",
      "dispatch.candidates",
      "dispatch.assign",
      "dispatch.reassign",
    ],
    routes: ["deliveries", "drivers"],
  },
  {
    id: "bookings.manage",
    label: "Manage service appointments",
    group: "Protected authority",
    description:
      "Role-required: view and manage service appointments. Assigned-technician, quotation, payment and completion checks remain mandatory.",
    roles: ["owner", "manager", "technician", "finance"],
    actions: [
      "bookings",
      "booking.reschedule",
      "booking.cancel",
      "booking.quote",
      "booking.quote.request_review",
      "booking.quote.decide",
      "booking.work.start",
      "booking.transition",
      "booking.assessment.save",
      "booking.assignment.respond",
      "booking.report",
    ],
    routes: ["bookings", "quotations"],
  },
  {
    id: "products.view",
    label: "View product catalogue",
    group: "Products & stock",
    description: "View the internal product catalogue.",
    roles: ["owner", "manager", "finance", "technician"],
    grantRole: "finance",
    actions: ["products.manage"],
    routes: ["products"],
  },
  {
    id: "products.edit",
    label: "Manage products",
    group: "Products & stock",
    description:
      "Create and edit products. Bulk imports and governed price changes keep their existing controls.",
    roles: ["owner", "manager", "finance"],
    grantRole: "finance",
    actions: ["product.save"],
  },
  {
    id: "inventory.view",
    label: "View inventory",
    group: "Products & stock",
    description:
      "View branch stock and movement history. Valuation and exports keep their existing authority checks.",
    roles: operational,
    grantRole: "finance",
    actions: ["inventory", "inventory.workspace", "inventory.movements"],
    routes: ["inventory"],
  },
  {
    id: "inventory.receive",
    label: "Receive stock",
    group: "Products & stock",
    description:
      "Record stock receipts using existing stock and reference checks.",
    roles: ["owner", "manager", "finance"],
    grantRole: "finance",
    actions: ["inventory.receive"],
  },
  {
    id: "cylinders.view",
    label: "View cylinders",
    group: "Products & stock",
    description: "View branch cylinder records.",
    roles: ["owner", "manager", "finance"],
    grantRole: "finance",
    actions: ["cylinders"],
    routes: ["cylinders"],
  },
  {
    id: "cylinders.manage",
    label: "Manage cylinder operations",
    group: "Products & stock",
    description:
      "Inspect, fill and record cylinder custody; existing safety and stock checks still apply.",
    roles: ["owner", "manager", "finance"],
    grantRole: "finance",
    actions: ["cylinder.inspect", "cylinder.custody", "cylinder.fill"],
  },
  {
    id: "purchasing.view",
    label: "View purchasing",
    group: "Products & stock",
    description: "View branch suppliers and purchase records.",
    roles: ["owner", "manager", "finance"],
    grantRole: "finance",
    actions: ["purchasing"],
  },
  {
    id: "purchasing.manage",
    label: "Create suppliers and purchases",
    group: "Products & stock",
    description:
      "Create branch supplier and purchase records. Payment and approval authority are separate.",
    roles: ["owner", "manager", "finance"],
    grantRole: "finance",
    actions: ["supplier.create", "purchase.create"],
  },
  {
    id: "transfers.view",
    label: "View stock transfers",
    group: "Products & stock",
    description: "View branch transfer records.",
    roles: ["owner", "manager", "finance"],
    grantRole: "finance",
    actions: ["transfers"],
  },
  {
    id: "transfers.create",
    label: "Request stock transfers",
    group: "Products & stock",
    description: "Create a transfer using existing custody and stock checks.",
    roles: ["owner", "manager", "finance"],
    grantRole: "finance",
    actions: ["transfer.create"],
  },
  {
    id: "support.view",
    label: "View support requests",
    group: "Customer support",
    description: "View branch support requests.",
    roles: ["owner", "manager"],
    grantRole: "manager",
    actions: ["support.list", "support.detail"],
    routes: ["support"],
  },
  {
    id: "support.manage",
    label: "Manage support requests",
    group: "Customer support",
    description: "Reply to and update accessible support requests.",
    roles: ["owner", "manager"],
    grantRole: "manager",
    actions: ["support.reply", "support.update", "support.attachment", "support.sla.enroll", "support.sla.save", "support.sla.policy", "support.sla.scan"],
  },
  {
    id: "reports.view",
    label: "View operational reports",
    group: "Finance & reporting",
    description:
      "View operational snapshots and reports. Financial datasets, exports and owner-only reports retain their own checks.",
    roles: operational,
    grantRole: "manager",
    actions: ["business.snapshot", "business.report"],
    routes: ["reports"],
  },
  {
    id: "reports.export",
    label: "Export permitted reports",
    group: "Finance & reporting",
    description:
      "Export reports already permitted by the existing report policy.",
    roles: operational,
    actions: ["business.export", "inventory.export", "finance.export"],
  },
  {
    id: "finance.view",
    label: "View financial records",
    group: "Finance & reporting",
    description:
      "Restrict or restore role-based finance access. Granting financial authority requires an approved finance or owner role.",
    roles: ["owner", "finance"],
    actions: [
      "finance",
      "finance.summary",
      "finance.ledger",
      "cash.collections",
      "credits",
      "credit.customers",
    ],
    routes: ["finance", "reconciliation", "credits"],
  },
  {
    id: "finance.manage",
    label: "Financial transactions and verification",
    group: "Finance & reporting",
    description:
      "Role-required: financial collection, wallet confirmation and credit/refund operations retain independent review and payment verification.",
    roles: ["owner", "finance"],
    actions: [
      "cash.reconcile",
      "credit.request",
      "credit.decide",
      "pos.verify",
    ],
  },
  {
    id: "audit.view",
    label: "View Audit History",
    group: "Finance & reporting",
    description: "Review business-wide audit history as an owner, or scoped finance and inventory activity in your branch.",
    roles: ["owner", "finance"],
    actions: ["audit"],
    routes: ["audit"],
  },
  {
    id: "approvals.manage",
    label: "Governed settings and approvals",
    group: "Protected authority",
    description:
      "Role-required: setting visibility, independent approval, owner policy and qualification checks remain mandatory.",
    roles: ["owner", "manager", "finance"],
    actions: [
      "settings",
      "setting.history",
      "setting.propose",
      "setting.rollback",
      "approvals",
      "approval.decide",
      "approval.activate",
      "approval.owner_apply",
      "approval.submit",
      "approval.revise",
      "approval.withdraw",
      "emergency.disable",
    ],
    routes: ["settings", "approvals"],
  },
  {
    id: "staff.manage",
    label: "Manage staff profiles and invitations",
    group: "Protected authority",
    description:
      "Role-required. Does not grant privilege administration, role approval or authority over the Business Owner.",
    roles: ["owner", "manager"],
    actions: [
      "staff.manage",
      "staff.lookup",
      "staff.edit",
      "staff.invite",
      "staff.access.request",
      "staff.suspend",
      "staff.reinstate",
    ],
    routes: ["staff"],
  },
  {
    id: "services.manage",
    label: "Service management and qualifications",
    group: "Protected authority",
    description:
      "Role-required. Qualifications, job assignment, quotation approval and payment conditions cannot be overridden.",
    roles: ["owner", "manager"],
    actions: [
      "services.manage",
      "technicians.workspace",
      "technician.qualify",
      "technician.revoke",
      "services.slot.create",
      "services.slot.block",
    ],
    routes: ["technicians", "services"],
  },
];
export const privilegeById = new Map(staffPrivileges.map((p) => [p.id, p]));
export function privilegeForAction(action: string) {
  return staffPrivileges.find((p) => p.actions.includes(action));
}
export const isBusinessStaff = (role: string) =>
  ["owner", "manager", "finance"].includes(role);

export function canGrantStaffPrivilege(
  privilege: Privilege,
  role: string,
  branchId: string | null,
) {
  return privilege.roles.includes(role) ||
    Boolean(privilege.grantRole && isBusinessStaff(role) && branchId);
}
