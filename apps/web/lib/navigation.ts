import { z } from "zod";
import { one, type SQL } from "./db";
import { AppError, type Actor } from "./auth";
import {staffPrivileges,isBusinessStaff} from "../../../packages/business-rules/src/staff-privileges";
import { roleNavigation } from "../../../packages/business-rules/src/admin-navigation";
export const counterDescriptions: Record<string, string> = {
  orders: "New orders awaiting acceptance",
  support: "Open or in-progress support requests",
  inventory:
    "Physical product and bulk gas balances at or below configured thresholds",
  deliveries: "Accepted or preparing orders awaiting a driver",
  bookings: "Service appointments awaiting confirmation or assignment",
  reconciliation:
    "Unverified order/service cash collections and submitted POS cash discrepancies",
  approvals: "Unexpired requests awaiting your independent decision",
  incidents: "Open or acknowledged operational incidents",
};
export async function navigationAccess(tx: SQL, user: Actor) {
  const groups = roleNavigation(user.role, user.branch_id);
  if (!groups.length)
    throw new AppError(
      403,
      "This account does not have administration workspace access.",
      "FORBIDDEN",
    );
  const branch = await one(
    tx,
    "SELECT id,name,active FROM branches WHERE id=$1",
    [user.branch_id],
  );
  if (user.role !== "owner" && !branch?.active)
    throw new AppError(
      403,
      "No active authorised branch assigned.",
      "BRANCH_FORBIDDEN",
    );
  const definitions = await one(
    tx,
    "SELECT count(*) AS count FROM setting_definitions d JOIN settings s ON s.key=d.key WHERE s.scope=$1 AND d.view_roles @> $2::jsonb",
    [user.branch_id ?? "lagos", JSON.stringify([user.role])],
  );
  let allowed = groups
    .flatMap((g) => g.items)
    .filter(
      (i) =>
        !["settings", "approvals"].includes(i.id) ||
        Number(definitions?.count) > 0,
    )
    .map((i) => i.id);
  for (const p of staffPrivileges) {
    const effect=user.privilege_overrides?.[p.id];
    if(effect==='deny') allowed=allowed.filter(id=>!p.routes?.includes(id));
    if(effect==='grant'&&p.grantRole&&isBusinessStaff(user.role)&&user.branch_id) allowed.push(...(p.routes??[]));
  }
  allowed=[...new Set(allowed)];
  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      branchId: user.branch_id,
    },
    branch: branch ? { id: branch.id, name: branch.name } : null,
    allowed,
  };
}
// Read-only aggregates; input cannot override authenticated scope or role.
export async function navigationSnapshot(tx: SQL, user: Actor, input: unknown) {
  const d = z.object({ branchId: z.string().optional() }).strict().parse(input);
  if (d.branchId && d.branchId !== user.branch_id)
    throw new AppError(
      403,
      "Navigation uses your authenticated workspace branch.",
      "BRANCH_FORBIDDEN",
    );
  const access = await navigationAccess(tx, user),
    global = user.role === "owner",
    b = global ? null : user.branch_id,
    counters: Record<string, number> = {};
  async function count(key: string, sql: string, params: any[] = [b]) {
    if (!access.allowed.includes(key)) return;
    const r = await one(tx, sql, params);
    counters[key] = Number(r?.count ?? 0);
  }
  // Roles without action authority get no misleading badge even when they can read a module.
  if (["owner", "manager", "dispatcher"].includes(user.role))
    await count(
      "orders",
      "SELECT count(*) AS count FROM orders WHERE status='placed' AND ($1::text IS NULL OR branch_id=$1)",
    );
  await count(
    "support",
    "SELECT count(*) AS count FROM support_requests WHERE status IN ('open','in_progress') AND ($1::text IS NULL OR branch_id=$1)",
  );
  await count(
    "inventory",
    `SELECT (SELECT count(*) FROM inventory i JOIN products p ON p.id=i.product_id WHERE p.archived=false AND p.category<>'Gas refills' AND i.quantity-i.reserved<=i.threshold AND ($1::text IS NULL OR i.branch_id=$1))+(SELECT count(*) FROM gas_stock WHERE threshold_grams IS NOT NULL AND grams-reserved_grams<=threshold_grams AND ($1::text IS NULL OR branch_id=$1)) AS count`,
  );
  if (user.role !== "driver")
    await count(
      "deliveries",
      "SELECT count(*) AS count FROM orders WHERE status IN ('accepted','preparing') AND driver_id IS NULL AND ($1::text IS NULL OR branch_id=$1)",
    );
  if (["owner", "service_manager"].includes(user.role))
    await count(
      "bookings",
      "SELECT count(*) AS count FROM service_bookings WHERE (status='pending_confirmation' OR (status='confirmed' AND technician_id IS NULL)) AND ($1::text IS NULL OR branch_id=$1)",
    );
  await count(
    "reconciliation",
    `SELECT (SELECT count(*) FROM cash_collections c JOIN orders o ON o.id=c.order_id WHERE c.verified_by IS NULL AND ($1::text IS NULL OR o.branch_id=$1))+(SELECT count(*) FROM service_cash_collections c JOIN service_bookings s ON s.id=c.booking_id WHERE c.verified_by IS NULL AND ($1::text IS NULL OR s.branch_id=$1))+(SELECT count(*) FROM pos_shifts WHERE status='submitted' AND counted_kobo IS DISTINCT FROM expected_kobo AND ($1::text IS NULL OR branch_id=$1)) AS count`,
  );
  await count(
    "incidents",
    "SELECT count(*) AS count FROM operational_incidents WHERE status IN ('open','acknowledged') AND ($1::text IS NULL OR branch_id=$1)",
  );
  await count(
    "approvals",
    `SELECT count(*) AS count FROM change_requests r JOIN setting_definitions d ON d.key=r.key WHERE ($1::text IS NULL OR r.scope=$1) AND d.view_roles @> $2::jsonb AND r.status IN ('pending_approval','partially_approved') AND r.expires_at>now() AND r.requester_id<>$3 AND (d.value_type<>'access' OR r.proposed_value->>'userId' IS DISTINCT FROM $3) AND NOT EXISTS(SELECT 1 FROM approval_decisions a WHERE a.request_id=r.id AND a.revision=r.revision AND a.approver_id=$3) AND (d.approve_roles @> $2::jsonb OR (d.risk=2 AND d.value_type IN ('boolean','integer') AND d.category NOT IN ('Staff & Permissions','Security','Payments & Wallet') AND (d.key='delivery.capacity' OR d.key LIKE 'publish.%') AND EXISTS(SELECT 1 FROM approval_delegations a JOIN users g ON g.id=a.grantor_id JOIN users v ON v.id=a.reviewed_by WHERE a.delegate_id=$3 AND $4 IN ('manager','sales','inventory','dispatcher') AND a.scope=$5 AND a.setting_key=d.key AND a.scope=r.scope AND a.status='approved' AND a.starts_at<=now() AND a.expires_at>now() AND g.active=true AND v.active=true AND v.role='owner' AND a.reviewed_by<>a.grantor_id AND a.grantor_id<>r.requester_id AND g.role IN ('owner','manager') AND d.approve_roles @> jsonb_build_array(g.role) AND (g.role='owner' OR g.branch_id=r.scope) AND (a.maximum_value IS NULL OR jsonb_typeof(r.proposed_value)='boolean' OR (jsonb_typeof(r.proposed_value)='number' AND (r.proposed_value::text)::numeric<=a.maximum_value))))) AND (d.value_type<>'checklist' OR $4<>'safety_officer' OR EXISTS(SELECT 1 FROM technician_qualifications q JOIN users v ON v.id=q.verified_by WHERE q.user_id=$3 AND q.code='safety_review' AND q.expires_at>now() AND v.active=true AND v.role IN ('owner','safety_officer')))`,
    [b, JSON.stringify([user.role]), user.id, user.role, user.branch_id],
  );
  return {
    ...access,
    counters,
    counterDescriptions,
    generatedAt: new Date().toISOString(),
    unreadNotifications: Number(
      (await one(
        tx,
        "SELECT count(*)::int count FROM notifications WHERE user_id=$1 AND read_at IS NULL",
        [user.id],
      ))!.count,
    ),
    notifications: (
      await tx.query(
        `SELECT n.id,n.title,n.body,n.read_at,n.created_at,n.related_id,
          CASE WHEN $3::boolean AND EXISTS(SELECT 1 FROM orders o WHERE o.id::text=n.related_id::text AND ($2::text IS NULL OR o.branch_id=$2))
          THEN '/admin/orders?orderId=' || n.related_id::text END AS href
          FROM notifications n WHERE n.user_id=$1 ORDER BY n.created_at DESC LIMIT 30`,
        [
          user.id,
          b,
          access.allowed.includes("orders") &&
            !["driver", "technician"].includes(user.role),
        ],
      )
    ).rows,
  };
}
