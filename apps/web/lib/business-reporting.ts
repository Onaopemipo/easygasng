import {
  orderEffectiveSql,
  orderNetReceiptsSql,
  orderCompletedRevenue,
} from "./order-financial-basis";
import { inventoryValuation } from "./inventory-valuation";
import { z } from "zod";
import { one, type SQL, type Row } from "./db";
import { allow, AppError, id, type Actor } from "./auth";
import { audit, notify } from "./governance";
const operational = ["owner", "manager", "finance"];
export const reportNames = [
  "sales",
  "gas",
  "products",
  "cylinders",
  "accessories",
  "valuation",
  "movements",
  "low_stock",
  "stocktakes",
  "purchases",
  "deliveries",
  "locations",
  "customers",
  "refills",
  "services",
  "technicians",
  "expenses",
  "profit",
  "payments",
  "wallet",
  "loyalty",
  "branches",
  "audit",
] as const;
const financial = new Set([
  "sales",
  "products",
  "cylinders",
  "accessories",
  "valuation",
  "purchases",
  "expenses",
  "profit",
  "payments",
  "wallet",
  "loyalty",
  "branches",
  "gas",
  "services",
  "customers",
  "locations",
  "technicians",
]);
const filterSchema = z
  .object({
    branchId: z.string().min(1).max(100).optional(),
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
    locationId: z.string().max(100).optional(),
    category: z.string().max(100).optional(),
    customerCategory: z.enum(["customer", "commercial"]).optional(),
    orderStatus: z
      .enum([
        "placed",
        "accepted",
        "preparing",
        "assigned",
        "out_for_delivery",
        "delivered",
        "failed",
        "cancelled",
      ])
      .optional(),
    paymentStatus: z
      .enum(["unpaid", "collected", "verified", "refunded"])
      .optional(),
  })
  .strict();
function scope(user: Actor, b?: string) {
  allow(user, operational);
  if (user.role !== "owner") {
    if (!user.branch_id)
      throw new AppError(403, "No authorised branch assigned.");
    if (b && b !== user.branch_id)
      throw new AppError(403, "This record belongs to another branch.");
    return user.branch_id;
  }
  return b ?? null;
}
const n = (v: any) => Number(v ?? 0);
async function data(tx: SQL, user: Actor, filters: any) {
  if (filters.from && filters.to && filters.from > filters.to)
    throw new AppError(400, "End date must follow start date.");
  const b = scope(user, filters.branchId),
    costs = ["owner", "finance"].includes(user.role),
    revenue = ["owner", "manager", "finance"].includes(user.role);
  const inventory = (
    await tx.query(
      "SELECT i.branch_id,p.id AS product_id,p.name,p.category,p.asset,p.size_kg,p.sku,i.quantity,i.reserved,i.quantity-i.reserved AS available,i.threshold,i.price_kobo FROM inventory i JOIN products p ON p.id=i.product_id WHERE ($1::text IS NULL OR i.branch_id=$1) AND p.archived=false AND p.category<>'Gas refills' ORDER BY p.name",
      [b],
    )
  ).rows;
  const gas = (
    await tx.query(
      "SELECT branch_id,grams,reserved_grams,grams-reserved_grams AS available_grams,threshold_grams FROM gas_stock WHERE ($1::text IS NULL OR branch_id=$1) ORDER BY branch_id",
      [b],
    )
  ).rows;
  const cylinders = (
    await tx.query(
      "SELECT id,serial,branch_id,size_kg,ownership,status,test_due,customer_id IS NOT NULL AS in_customer_custody FROM cylinders WHERE ($1::text IS NULL OR branch_id=$1) ORDER BY created_at DESC LIMIT 5000",
      [b],
    )
  ).rows;
  const holds = (
    await tx.query(
      "SELECT id,branch_id,product_id,gas,quantity,released,kind,reference,reason,created_at FROM stock_holds WHERE ($1::text IS NULL OR branch_id=$1) AND quantity>released ORDER BY created_at DESC",
      [b],
    )
  ).rows;
  const transfers = (
    await tx.query(
      "SELECT * FROM stock_transfers WHERE ($1::text IS NULL OR source_branch=$1 OR destination_branch=$1) ORDER BY created_at DESC LIMIT 1000",
      [b],
    )
  ).rows;
  const movements = (
    await tx.query(
      "SELECT id,branch_id,product_id,quantity,'units' AS unit,kind,reason,reference,created_at FROM stock_movements WHERE ($1::text IS NULL OR branch_id=$1) AND ($2::date IS NULL OR (created_at AT TIME ZONE 'Africa/Lagos')::date>=$2) AND ($3::date IS NULL OR (created_at AT TIME ZONE 'Africa/Lagos')::date<=$3) UNION ALL SELECT id,branch_id,NULL,grams,'grams',kind,reason,reference,created_at FROM gas_stock_movements WHERE ($1::text IS NULL OR branch_id=$1) AND ($2::date IS NULL OR (created_at AT TIME ZONE 'Africa/Lagos')::date>=$2) AND ($3::date IS NULL OR (created_at AT TIME ZONE 'Africa/Lagos')::date<=$3) ORDER BY created_at DESC LIMIT 1000",
      [b, filters.from ?? null, filters.to ?? null],
    )
  ).rows;
  const operations = (
    await tx.query(
      "SELECT o.id,o.kind,o.reference,o.branch_id,o.payload,o.applied_at,o.request_id,o.created_at,r.status AS approval_status FROM inventory_operations o LEFT JOIN change_requests r ON r.id=o.request_id WHERE ($1::text IS NULL OR o.branch_id=$1) AND ($2::boolean OR o.kind NOT IN ('expense','expense_reversal','purchase')) AND ($3::date IS NULL OR (o.created_at AT TIME ZONE 'Africa/Lagos')::date>=$3) AND ($4::date IS NULL OR (o.created_at AT TIME ZONE 'Africa/Lagos')::date<=$4) ORDER BY o.created_at DESC LIMIT 500",
      [b, costs, filters.from ?? null, filters.to ?? null],
    )
  ).rows;
  // Purchase payload contains only purchaseId; costs stay out of operations for operational staff.
  const low = inventory.filter((i) => n(i.available) <= n(i.threshold));
  const alerts: Row[] = low.map((i) => ({
    id: "stock:" + i.branch_id + ":" + i.product_id,
    severity: n(i.available) === 0 ? "high" : "warning",
    kind: "low_stock",
    reference: i.product_id,
    branch: i.branch_id,
    reason: `${i.name}: ${i.available} available units; configured threshold ${i.threshold}.`,
    href: "/admin/inventory",
  }));
  for (const g of gas)
    if (
      g.threshold_grams !== null &&
      n(g.available_grams) <= n(g.threshold_grams)
    )
      alerts.push({
        id: "gas:" + g.branch_id,
        severity: "high",
        kind: "low_gas",
        reference: g.branch_id,
        branch: g.branch_id,
        reason: `${n(g.available_grams) / 1000} kg available; threshold ${n(g.threshold_grams) / 1000} kg.`,
        href: "/admin/inventory",
      });
  for (const t of transfers)
    if (
      ["partial", "discrepancy"].includes(t.status) ||
      ["in_transit"].includes(t.status)
    )
      alerts.push({
        id: "transfer:" + t.id,
        severity: "high",
        kind: "transfer_exception",
        reference: t.id,
        branch: t.source_branch,
        reason: "Unresolved transfer: " + t.status,
        href: "/admin/inventory",
      });
  for (const h of holds)
    alerts.push({
      id: "hold:" + h.id,
      severity: "warning",
      kind: "unreconciled_return",
      reference: h.reference,
      branch: h.branch_id,
      reason: "Unsaleable held stock needs documented review.",
      href: "/admin/inventory",
    });
  const orders = (
    await tx.query(
      `SELECT ${orderEffectiveSql} AS effective_total_kobo,(${orderNetReceiptsSql}) AS net_receipts_kobo,o.id,o.reference,o.branch_id,o.status,o.payment_status,o.payment_method,o.subtotal_kobo,o.delivery_kobo,o.total_kobo,o.customer_id,o.location_id,o.location_snapshot,o.created_at,u.role AS customer_category,COALESCE((SELECT sum(c.amount_kobo) FROM credit_requests c WHERE c.order_id=o.id AND c.kind='refund' AND c.status='approved'),0) AS refunds_kobo,(SELECT max(e.created_at) FROM order_events e WHERE e.order_id=o.id AND e.status='delivered') AS delivered_at FROM orders o JOIN users u ON u.id=o.customer_id WHERE ($1::text IS NULL OR o.branch_id=$1) AND ($2::date IS NULL OR (o.created_at AT TIME ZONE 'Africa/Lagos')::date>=$2) AND ($3::date IS NULL OR (o.created_at AT TIME ZONE 'Africa/Lagos')::date<=$3) AND ($4::text IS NULL OR o.location_id=$4) AND ($5::text IS NULL OR u.role=$5) AND ($6::text IS NULL OR o.status=$6) AND ($7::text IS NULL OR o.payment_status=$7) ORDER BY o.created_at DESC LIMIT 5000`,
      [
        b,
        filters.from ?? null,
        filters.to ?? null,
        filters.locationId ?? null,
        filters.customerCategory ?? null,
        filters.orderStatus ?? null,
        filters.paymentStatus ?? null,
      ],
    )
  ).rows;
  const counts: Record<string, number> = {};
  for (const o of orders) counts[o.status] = (counts[o.status] ?? 0) + 1;
  const bookings = (
    await tx.query(
      "SELECT b.id,b.reference,b.branch_id,b.technician_id,b.status,b.snapshot,b.created_at,(r.body->>'invoiceTotalKobo')::bigint AS invoice_kobo,COALESCE((SELECT sum(p.amount_kobo) FROM verified_payments p WHERE p.booking_id=b.id),0) AS paid_kobo,COALESCE((SELECT sum(c.amount_kobo) FROM credit_requests c WHERE c.booking_id=b.id AND c.status='approved' AND c.kind='refund'),0) AS refunded_kobo FROM service_bookings b LEFT JOIN service_reports r ON r.booking_id=b.id WHERE ($1::text IS NULL OR b.branch_id=$1) AND ($2::date IS NULL OR (b.created_at AT TIME ZONE 'Africa/Lagos')::date>=$2) AND ($3::date IS NULL OR (b.created_at AT TIME ZONE 'Africa/Lagos')::date<=$3) ORDER BY b.created_at DESC LIMIT 5000",
      [b, filters.from ?? null, filters.to ?? null],
    )
  ).rows;
  const materials = ["owner", "manager", "finance"].includes(
    user.role,
  )
    ? (
        await tx.query(
          "SELECT m.id,b.reference AS booking_reference,b.branch_id,m.product_id,m.quantity,m.state,m.used,m.damaged,CASE WHEN m.state='reconciled' THEN m.quantity-COALESCE(m.used,0)-COALESCE(m.damaged,0) ELSE NULL END AS unused_returned FROM service_materials m JOIN service_bookings b ON b.id=m.booking_id WHERE ($1::text IS NULL OR b.branch_id=$1) ORDER BY b.created_at DESC LIMIT 1000",
          [b],
        )
      ).rows
    : [];
  const expenseRows = costs
    ? (
        await tx.query(
          "SELECT e.*,c.label AS category,r.status AS approval_state FROM expenses e JOIN expense_categories c ON c.id=e.category_id LEFT JOIN change_requests r ON r.id=e.approval_request_id WHERE ($1::text IS NULL OR e.branch_id=$1) AND ($2::date IS NULL OR e.expense_date>=$2) AND ($3::date IS NULL OR e.expense_date<=$3) ORDER BY e.expense_date DESC LIMIT 5000",
          [b, filters.from ?? null, filters.to ?? null],
        )
      ).rows
    : [];
  const receipts = costs
    ? (
        await tx.query(
          "SELECT * FROM stock_receipts WHERE ($1::text IS NULL OR branch_id=$1) ORDER BY created_at DESC LIMIT 5000",
          [b],
        )
      ).rows
    : [];
  const purchases = ["owner", "finance", "manager"].includes(
    user.role,
  )
    ? (
        await tx.query(
          "SELECT p.*,s.name AS supplier FROM purchase_orders p JOIN suppliers s ON s.id=p.supplier_id WHERE ($1::text IS NULL OR p.branch_id=$1) AND ($2::date IS NULL OR (p.created_at AT TIME ZONE 'Africa/Lagos')::date>=$2) AND ($3::date IS NULL OR (p.created_at AT TIME ZONE 'Africa/Lagos')::date<=$3) ORDER BY p.created_at DESC LIMIT 5000",
          [b, filters.from ?? null, filters.to ?? null],
        )
      ).rows
    : [];
  if (!costs) for (const p of purchases) delete p.unit_cost_kobo;
  const suppliers = ["owner", "manager", "finance"].includes(
    user.role,
  )
    ? (
        await tx.query(
          "SELECT id,branch_id,name,contact,active FROM suppliers WHERE ($1::text IS NULL OR branch_id=$1) ORDER BY name",
          [b],
        )
      ).rows
    : [];
  const branches = (
    await tx.query("SELECT id,name,active FROM branches ORDER BY name")
  ).rows;
  for (const e of expenseRows)
    if (["draft", "pending_approval"].includes(e.status))
      e.status =
        e.approval_state === "rejected"
          ? "rejected"
          : ["cancelled", "expired", "superseded"].includes(e.approval_state)
            ? "cancelled"
            : e.approval_state === "draft"
              ? "draft"
              : "pending_approval";
  const valuation = costs
    ? await inventoryValuation(tx, b)
    : { rows: [], totalKobo: null };
  const categories = costs
    ? (await tx.query("SELECT * FROM expense_categories ORDER BY label")).rows
    : [];
  const finance: Row = {};
  if (revenue) {
    const completed = orders.filter(
      (o) => o.status === "delivered" && o.payment_status === "verified",
    );
    const fulfilledRevenue = completed.reduce(
      (s, o) => s + orderCompletedRevenue(o),
      0,
    );
    const serviceRevenue = bookings
      .filter((o) => o.status === "completed")
      .reduce(
        (s, o) =>
          s +
          Math.max(
            0,
            Math.min(n(o.invoice_kobo), n(o.paid_kobo) - n(o.refunded_kobo)),
          ),
        0,
      );
    const pos = n(
      (
        await one(
          tx,
          "SELECT COALESCE(sum(p.total_kobo),0) AS n FROM pos_sales p JOIN pos_shifts s ON s.id=p.shift_id WHERE s.status='verified' AND ($1::text IS NULL OR s.branch_id=$1) AND ($2::date IS NULL OR (p.created_at AT TIME ZONE 'Africa/Lagos')::date>=$2) AND ($3::date IS NULL OR (p.created_at AT TIME ZONE 'Africa/Lagos')::date<=$3)",
          [b, filters.from ?? null, filters.to ?? null],
        )
      )?.n,
    );
    Object.assign(finance, {
      fulfilledRevenueKobo: fulfilledRevenue,
      serviceRevenueKobo: serviceRevenue,
      posRevenueKobo: pos,
      verifiedCompletedRevenueKobo: fulfilledRevenue + serviceRevenue + pos,
      refundsKobo: orders.reduce((s, o) => s + n(o.refunds_kobo), 0),
      historicalDeliveryChargesKobo: completed.reduce(
        (s, o) => s + n(o.delivery_kobo),
        0,
      ),
      outstandingOrderKobo: orders
        .filter(
          (o) =>
            !["cancelled"].includes(o.status) &&
            !["verified", "refunded"].includes(o.payment_status),
        )
        .reduce((s, o) => s + n(o.total_kobo), 0),
      cashAwaitingVerificationKobo: n(
        (
          await one(
            tx,
            "SELECT (SELECT COALESCE(sum(c.amount_kobo),0) FROM cash_collections c JOIN orders o ON o.id=c.order_id WHERE c.verified_at IS NULL AND ($1::text IS NULL OR o.branch_id=$1))+(SELECT COALESCE(sum(c.amount_kobo),0) FROM service_cash_collections c JOIN service_bookings b ON b.id=c.booking_id WHERE c.verified_at IS NULL AND ($1::text IS NULL OR b.branch_id=$1)) AS n",
            [b],
          )
        )?.n,
      ),
      grossProfitKobo: null,
      netProfitKobo: null,
      inventoryValueKobo: costs ? valuation.totalKobo : null,
    });
    if (costs) {
      finance.recordedExpensesKobo = expenseRows
        .filter((e) => ["recorded", "paid"].includes(e.status))
        .reduce((s, e) => s + n(e.amount_kobo), 0);
      finance.paidExpensesKobo = expenseRows
        .filter((e) => e.status === "paid")
        .reduce((s, e) => s + n(e.amount_kobo), 0);
    }
    if (user.role === "owner") {
      finance.walletLiabilityKobo = n(
        (
          await one(
            tx,
            "SELECT COALESCE(sum(amount_kobo),0) AS n FROM wallet_entries",
          )
        )?.n,
      );
      finance.loyaltyPointsOutstanding = n(
        (
          await one(
            tx,
            "SELECT COALESCE(sum(points),0) AS n FROM reward_entries",
          )
        )?.n,
      );
    }
  }
  const analytics: Row = {};
  if (revenue) {
    const lagosDate = (v: any) =>
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Africa/Lagos",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(v));
    const today = lagosDate(Date.now()),
      yesterday = lagosDate(Date.now() - 86400000),
      daily: Record<string, number> = {};
    for (const o of orders) {
      if (
        o.status === "delivered" &&
        o.payment_status === "verified" &&
        o.delivered_at
      ) {
        const day = lagosDate(o.delivered_at);
        daily[day] = (daily[day] ?? 0) + orderCompletedRevenue(o);
      }
    }
    const weekStart = lagosDate(Date.now() - 6 * 86400000),
      priorStart = lagosDate(Date.now() - 13 * 86400000);
    const week = Object.entries(daily)
        .filter(([d]) => d >= weekStart)
        .reduce((s, [, v]) => s + v, 0),
      prior = Object.entries(daily)
        .filter(([d]) => d >= priorStart && d < weekStart)
        .reduce((s, [, v]) => s + v, 0);
    const perCustomer = new Map<string, any[]>();
    for (const o of orders) {
      if (o.status === "delivered") {
        const a = perCustomer.get(o.customer_id) ?? [];
        a.push(o);
        perCustomer.set(o.customer_id, a);
      }
    }
    const deliveryTimes = orders
      .filter((o) => o.delivered_at)
      .map(
        (o) =>
          (new Date(o.delivered_at).getTime() -
            new Date(o.created_at).getTime()) /
          60000,
      )
      .filter((x) => x >= 0);
    Object.assign(analytics, {
      orderRevenueTodayKobo: daily[today] ?? 0,
      orderRevenueYesterdayKobo: daily[yesterday] ?? 0,
      orderRevenueWeekKobo: week,
      orderRevenueMonthKobo: Object.entries(daily)
        .filter(([d]) => d.startsWith(today.slice(0, 7)))
        .reduce((s, [, v]) => s + v, 0),
      orderRevenueGrowthPercent: prior
        ? Math.round(((week - prior) / prior) * 10000) / 100
        : null,
      dailyOrderRevenue: Object.entries(daily)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, amountKobo]) => ({ date, amountKobo })),
      returningCustomers: [...perCustomer.values()].filter((a) => a.length > 1)
        .length,
      repeatPurchaseRate: perCustomer.size
        ? [...perCustomer.values()].filter((a) => a.length > 1).length /
          perCustomer.size
        : null,
      averageAgreedOrderKobo: orders.length
        ? orders.reduce((s, o) => s + n(o.total_kobo), 0) / orders.length
        : null,
      averageDeliveryMinutes: deliveryTimes.length
        ? deliveryTimes.reduce((s, v) => s + v, 0) / deliveryTimes.length
        : null,
      deliveryCompletionRate: orders.length
        ? (counts.delivered ?? 0) / orders.length
        : null,
      inactiveCustomers: null,
      retentionRate: null,
      refillReminderConversion: null,
      lifetimeValueEstimate: null,
      limitations:
        "Active/inactive windows, retention cohorts, reminder attribution and lifetime-value assumptions require approved definitions; no defaults are invented. Order revenue periods use documented delivery time; legacy records without it are excluded from period totals.",
    });
  }
  const completeness = {
    orders: orders.length < 5000,
    services: bookings.length < 5000,
    expenses: expenseRows.length < 5000,
  };
  if (!completeness.orders) {
    for (const key of [
      "fulfilledRevenueKobo",
      "verifiedCompletedRevenueKobo",
      "refundsKobo",
      "historicalDeliveryChargesKobo",
      "outstandingOrderKobo",
    ])
      if (key in finance) finance[key] = null;
    for (const key of Object.keys(analytics))
      if (key !== "limitations")
        analytics[key] = Array.isArray(analytics[key]) ? [] : null;
  }
  if (!completeness.services) {
    finance.serviceRevenueKobo = null;
    finance.verifiedCompletedRevenueKobo = null;
  }
  if (!completeness.expenses) {
    finance.recordedExpensesKobo = null;
    finance.paidExpensesKobo = null;
  }
  for (const [key, value] of Object.entries(finance))
    if (
      key.endsWith("Kobo") &&
      typeof value === "number" &&
      !Number.isSafeInteger(value)
    )
      finance[key] = null;
  const recommendations = low.map((i) => {
    const recent = orders.filter(
      (o) =>
        o.status === "delivered" &&
        new Date(o.created_at).getTime() >= Date.now() - 30 * 86400000,
    ).length;
    return {
      product: i.name,
      availableUnits: n(i.available),
      thresholdUnits: n(i.threshold),
      completedOrdersLast30Days: recent,
      recommendedQuantity: null,
      reason:
        "Below configured threshold; supplier lead time and approved safety stock are required for a purchase recommendation.",
    };
  });
  const stocktakes = ["owner", "manager", "finance"].includes(user.role)
    ? (
        await tx.query(
          "SELECT s.*,COALESCE((SELECT jsonb_agg(jsonb_build_object('product_id',c.product_id,'gas',c.gas,'expected',c.expected,'counted',c.counted,'reason',c.reason,'evidence',c.evidence,'operation_id',c.operation_id) ORDER BY c.id) FROM stocktake_counts c WHERE c.stocktake_id=s.id),'[]'::jsonb) AS counts FROM stocktakes s WHERE ($1::text IS NULL OR s.branch_id=$1) ORDER BY s.created_at DESC LIMIT 100",
          [b],
        )
      ).rows
    : [];
  const schedules = (
    await tx.query(
      "SELECT * FROM report_schedules WHERE user_id=$1 AND ($2::text IS NULL OR branch_id=$2) ORDER BY created_at DESC",
      [user.id, b],
    )
  ).rows;
  const deliveries = (
    await tx.query(
      "SELECT d.id,d.schedule_id,d.scheduled_for,d.status,d.detail,d.created_at FROM report_deliveries d JOIN report_schedules s ON s.id=d.schedule_id WHERE s.user_id=$1 ORDER BY d.created_at DESC LIMIT 100",
      [user.id],
    )
  ).rows;
  const activity = (
    await tx.query(
      "SELECT id,kind AS event_type,reference,branch_id,created_at FROM (SELECT id,kind,reference,branch_id,created_at FROM stock_movements UNION ALL SELECT id,kind,reference,branch_id,created_at FROM gas_stock_movements UNION ALL SELECT e.id,'order.'||e.status,o.reference,o.branch_id,e.created_at FROM order_events e JOIN orders o ON o.id=e.order_id UNION ALL SELECT e.id,'service.'||e.status,b.reference,b.branch_id,e.created_at FROM service_booking_events e JOIN service_bookings b ON b.id=e.booking_id UNION ALL SELECT p.id,'payment.verified',p.reference,COALESCE(o.branch_id,b.branch_id),p.created_at FROM verified_payments p LEFT JOIN orders o ON o.id=p.order_id LEFT JOIN service_bookings b ON b.id=p.booking_id WHERE $2::boolean UNION ALL SELECT e.id,'expense.'||e.kind,e.reference,x.branch_id,e.created_at FROM expense_events e JOIN expenses x ON x.id=e.expense_id WHERE $2::boolean) events WHERE ($1::text IS NULL OR branch_id=$1) ORDER BY created_at DESC,id DESC LIMIT 30",
      [b, costs],
    )
  ).rows.map((e) => ({
    ...e,
    href:
      e.event_type.startsWith("payment.") || e.event_type.startsWith("expense.")
        ? "/admin/finance"
        : e.event_type.startsWith("service.")
          ? "/admin/bookings"
          : e.event_type.startsWith("order.")
            ? "/admin/orders"
            : "/admin/inventory",
  }));
  return {
    completeness,
    analytics,
    generatedAt: new Date().toISOString(),
    scope: b ?? "business",
    role: user.role,
    valuation,
    permissions: {
      costs,
      revenue,
      inventoryWrite: ["owner", "manager", "finance"].includes(user.role),
      financeWrite: costs,
    },
    inventory,
    gas,
    materials,
    stocktakes,
    cylinders: ["owner", "manager", "finance"].includes(user.role)
      ? cylinders
      : [],
    holds,
    transfers,
    movements,
    operations,
    alerts,
    recommendations,
    receipts,
    purchases,
    suppliers,
    branches,
    categories,
    expenses: expenseRows,
    schedules,
    reportDeliveries: deliveries,
    activity,
    finance,
    overview: {
      activeProducts: new Set(inventory.map((i) => i.product_id)).size,
      physicalUnits: inventory.reduce((s, i) => s + n(i.quantity), 0),
      availableUnits: inventory.reduce((s, i) => s + n(i.available), 0),
      reservedUnits: inventory.reduce((s, i) => s + n(i.reserved), 0),
      gasAvailableKg: gas.reduce((s, i) => s + n(i.available_grams) / 1000, 0),
      gasReservedKg: gas.reduce((s, i) => s + n(i.reserved_grams) / 1000, 0),
      inTransitUnits: transfers
        .filter((t) => !t.gas && ["in_transit", "partial"].includes(t.status))
        .reduce(
          (s, t) =>
            s + n(t.quantity) - n(t.received_quantity) - n(t.damaged_quantity),
          0,
        ),
      inTransitGasKg: transfers
        .filter((t) => t.gas && ["in_transit", "partial"].includes(t.status))
        .reduce(
          (s, t) =>
            s +
            (n(t.quantity) - n(t.received_quantity) - n(t.damaged_quantity)) /
              1000,
          0,
        ),
      heldUnits: holds
        .filter((h) => !h.gas)
        .reduce((s, h) => s + n(h.quantity) - n(h.released), 0),
      heldGasKg: holds
        .filter((h) => h.gas)
        .reduce((s, h) => s + (n(h.quantity) - n(h.released)) / 1000, 0),
      filledCylinders: cylinders.filter((c) => c.status === "filled").length,
      emptyCylinders: cylinders.filter((c) => c.status === "empty").length,
      unsafeCylinders: cylinders.filter((c) =>
        ["quarantined", "damaged", "inspection_due"].includes(c.status),
      ).length,
      lowStock: low.length,
      outOfStock: inventory.filter((i) => n(i.available) === 0).length,
      orders: counts,
      orderCount: orders.length,
      customerCount: new Set(orders.map((o) => o.customer_id)).size,
      serviceCounts: bookings.reduce((a: Record<string, number>, x) => {
        a[x.status] = (a[x.status] ?? 0) + 1;
        return a;
      }, {}),
    },
    // Report-only internal datasets are removed from ordinary snapshots below.
    _orders: orders,
    _bookings: bookings,
    limitations: [
      "Amounts use historical snapshots and verified completed fulfilments; revenue and cash are distinct.",
      "Profit and current inventory valuation are unavailable until a method and complete acquisition, labour, overhead and expense inputs are reconciled.",
      "Report datasets are bounded to 5,000 records; movement history to 1,000. If a calculation reaches a dataset cap, its totals are unavailable. Use narrower date ranges for complete reports.",
      "Location/order/customer/payment filters apply to orders; service and POS totals are branch/date scoped and shown separately. Inventory is current, not a reconstructed historical balance.",
      "Supplier payment status is unverified; an approved purchase is not proof of payment.",
    ],
  };
}
function publicSnapshot(d: any) {
  const { _orders, _bookings, ...safe } = d;
  return safe;
}
export async function businessReporting(
  tx: SQL,
  action: string,
  user: Actor,
  input: unknown,
): Promise<any> {
  if (action === "dashboard" && operational.includes(user.role)) {
    z.object({}).strict().parse(input);
    const s = await data(tx, user, {});
    return {
      orders: s.overview.orderCount,
      revenueKobo: s.permissions.revenue
        ? s.finance.verifiedCompletedRevenueKobo
        : null,
      pending: Object.entries(s.overview.orders)
        .filter(([state]) => !["delivered", "cancelled"].includes(state))
        .reduce((sum, [, count]) => sum + Number(count), 0),
      customers: s.overview.customerCount,
      inventory: s.overview.availableUnits,
    };
  }
  if (action === "business.snapshot") {
    const f = filterSchema.parse(input);
    return publicSnapshot(await data(tx, user, f));
  }
  if (action === "inventory") {
    allow(user, ["owner", "manager", "finance"]);
    z.object({}).strict().parse(input);
    return (
      await tx.query(
        "SELECT i.branch_id,i.product_id,i.quantity,i.reserved,i.threshold,i.price_kobo,i.published,p.name,p.asset FROM inventory i JOIN products p ON p.id=i.product_id WHERE ($1::text IS NULL OR i.branch_id=$1) ORDER BY p.name",
        [user.role === "owner" ? null : user.branch_id],
      )
    ).rows;
  }
  if (action === "business.report" || action === "business.export") {
    const d = filterSchema
      .extend({
        report: z.enum(reportNames),
        format: z.enum(["csv", "excel", "print"]).optional(),
      })
      .parse(input);
    scope(user, d.branchId);
    if (financial.has(d.report)) allow(user, ["owner", "finance"]);
    if (["wallet", "loyalty", "branches"].includes(d.report))
      allow(user, ["owner"]);
    if (
      action === "business.export" &&
      !["owner", "finance", "manager"].includes(user.role)
    )
      throw new AppError(
        403,
        "Your account does not have permission to export this report.",
      );
    if (d.report === "audit") allow(user, ["owner"]);
    if (d.report === "refills") allow(user, ["owner", "manager"]);
    const { report, format, ...filters } = d,
      s = await data(tx, user, filters);
    let rows: Row[] = [];
    const orderIds = s._orders.map((o: Row) => o.id);
    if (
      ["sales", "deliveries", "locations", "customers", "branches"].includes(
        report,
      )
    )
      rows = s._orders.map((o: Row) => ({
        reference: o.reference,
        branch: o.branch_id,
        location:
          o.location_snapshot?.name ??
          o.location_id ??
          "Historical location unavailable",
        status: o.status,
        payment: o.payment_status,
        created_at: o.created_at,
        delivered_at: o.delivered_at,
        ...(s.permissions.revenue
          ? {
              agreed_total_kobo: n(o.total_kobo),
              historical_delivery_kobo: n(o.delivery_kobo),
              refunds_kobo: n(o.refunds_kobo),
              net_verified_completed_kobo:
                o.status === "delivered" && o.payment_status === "verified"
                  ? orderCompletedRevenue(o)
                  : 0,
            }
          : {}),
      }));
    if (report === "customers") {
      const grouped = new Map<string, Row>();
      for (const o of s._orders) {
        const a = grouped.get(o.customer_id) ?? {
          customer_reference: o.customer_id,
          orders: 0,
          completed_orders: 0,
          agreed_total_kobo: 0,
          verified_completed_kobo: 0,
          first_order: o.created_at,
          last_order: o.created_at,
        };
        a.orders++;
        a.completed_orders += o.status === "delivered" ? 1 : 0;
        a.agreed_total_kobo += n(o.total_kobo);
        if (o.status === "delivered" && o.payment_status === "verified")
          a.verified_completed_kobo += orderCompletedRevenue(o);
        if (new Date(o.created_at) < new Date(a.first_order))
          a.first_order = o.created_at;
        if (new Date(o.created_at) > new Date(a.last_order))
          a.last_order = o.created_at;
        grouped.set(o.customer_id, a);
      }
      rows = [...grouped.values()].map((a) => ({
        ...a,
        returning: a.completed_orders > 1,
        average_agreed_order_kobo: a.agreed_total_kobo / a.orders,
      }));
    }
    if (report === "locations" || report === "branches") {
      const grouped = new Map<string, Row>();
      for (const o of s._orders) {
        const key =
          report === "locations"
            ? (o.location_snapshot?.name ??
              o.location_id ??
              "Historical location unlinked")
            : o.branch_id;
        const a = grouped.get(key) ?? {
          group: key,
          orders: 0,
          completed: 0,
          failed: 0,
          verified_completed_kobo: 0,
          historical_delivery_charges_kobo: 0,
        };
        a.orders++;
        a.completed += o.status === "delivered" ? 1 : 0;
        a.failed += o.status === "failed" ? 1 : 0;
        if (o.status === "delivered" && o.payment_status === "verified") {
          a.verified_completed_kobo += orderCompletedRevenue(o);
          a.historical_delivery_charges_kobo += n(o.delivery_kobo);
        }
        grouped.set(key, a);
      }
      rows = [...grouped.values()].map((a) => ({
        ...a,
        completion_rate: a.completed / a.orders,
      }));
    }
    if (["products", "cylinders", "accessories"].includes(report))
      rows = (
        await tx.query(
          "SELECT oi.order_id,o.reference,oi.name,oi.quantity,oi.unit_price_kobo,oi.quantity*oi.unit_price_kobo AS historical_line_kobo,p.category FROM order_items oi JOIN orders o ON o.id=oi.order_id JOIN products p ON p.id=oi.product_id WHERE oi.order_id=ANY($1::text[]) AND ($2::text IS NULL OR p.category=$2) ORDER BY o.created_at DESC",
          [orderIds, filters.category ?? null],
        )
      ).rows.filter(
        (r) =>
          report === "products" ||
          (report === "cylinders"
            ? /cylinder/i.test(r.category)
            : !/cylinder|refill/i.test(r.category)),
      );
    if (report === "gas")
      rows = (
        await tx.query(
          "SELECT o.reference,g.capacity_grams,g.grams,g.unit_price_kobo,g.subtotal_kobo,o.status,o.payment_status FROM order_gas_lines g JOIN orders o ON o.id=g.order_id WHERE g.order_id=ANY($1::text[]) ORDER BY o.created_at DESC",
          [orderIds],
        )
      ).rows;
    if (report === "valuation") rows = s.valuation.rows;
    if (report === "profit")
      rows = [
        {
          ...s.finance,
          classification: "unavailable",
          reason:
            "Incomplete cost of goods, labour, transport and overhead records; revenue is not profit.",
        },
      ];
    if (report === "movements") rows = s.movements;
    if (report === "low_stock") rows = s.recommendations;
    if (report === "stocktakes")
      rows = (
        await tx.query(
          "SELECT s.reference,s.branch_id,s.status AS session_status,c.product_id,c.gas,c.expected,c.counted,c.counted-c.expected AS variance,c.reason,c.evidence,r.status AS approval_state,c.created_at FROM stocktake_counts c JOIN stocktakes s ON s.id=c.stocktake_id LEFT JOIN inventory_operations o ON o.id=c.operation_id LEFT JOIN change_requests r ON r.id=o.request_id WHERE ($1::text IS NULL OR s.branch_id=$1) AND ($2::date IS NULL OR (c.created_at AT TIME ZONE 'Africa/Lagos')::date>=$2) AND ($3::date IS NULL OR (c.created_at AT TIME ZONE 'Africa/Lagos')::date<=$3) ORDER BY c.created_at DESC LIMIT 5000",
          [
            s.scope === "business" ? null : s.scope,
            filters.from ?? null,
            filters.to ?? null,
          ],
        )
      ).rows;
    if (report === "purchases") rows = s.purchases;
    if (report === "expenses") rows = s.expenses;
    if (report === "services" || report === "technicians")
      rows = s._bookings.map((b: Row) => ({
        reference: b.reference,
        branch: b.branch_id,
        status: b.status,
        technician: b.technician_id,
        invoice_kobo: b.invoice_kobo,
        verified_paid_kobo: b.paid_kobo,
        refunded_kobo: b.refunded_kobo,
      }));
    if (report === "refills")
      rows = (
        await tx.query(
          "SELECT p.id,p.label,p.customer_id,h.refilled_at,h.kg FROM consumption_profiles p JOIN refill_history h ON h.profile_id=p.id JOIN orders o ON o.id=h.order_id WHERE ($1::text IS NULL OR o.branch_id=$1) AND ($2::date IS NULL OR (h.refilled_at AT TIME ZONE 'Africa/Lagos')::date>=$2) AND ($3::date IS NULL OR (h.refilled_at AT TIME ZONE 'Africa/Lagos')::date<=$3) ORDER BY h.refilled_at DESC LIMIT 1000",
          [
            s.scope === "business" ? null : s.scope,
            filters.from ?? null,
            filters.to ?? null,
          ],
        )
      ).rows;
    if (report === "wallet")
      rows = (
        await tx.query(
          "SELECT customer_id,sum(amount_kobo) AS credit_liability_kobo FROM wallet_entries GROUP BY customer_id",
        )
      ).rows;
    if (report === "loyalty")
      rows = (
        await tx.query(
          "SELECT customer_id,sum(points) AS points_outstanding FROM reward_entries GROUP BY customer_id",
        )
      ).rows;
    if (report === "payments")
      rows = (
        await tx.query(
          "SELECT p.reference,p.amount_kobo,p.method,p.created_at,COALESCE(o.branch_id,b.branch_id) AS branch_id FROM verified_payments p LEFT JOIN orders o ON o.id=p.order_id LEFT JOIN service_bookings b ON b.id=p.booking_id WHERE ($1::text IS NULL OR COALESCE(o.branch_id,b.branch_id)=$1) AND ($2::date IS NULL OR (p.created_at AT TIME ZONE 'Africa/Lagos')::date>=$2) AND ($3::date IS NULL OR (p.created_at AT TIME ZONE 'Africa/Lagos')::date<=$3) ORDER BY p.created_at DESC LIMIT 5000",
          [
            s.scope === "business" ? null : s.scope,
            filters.from ?? null,
            filters.to ?? null,
          ],
        )
      ).rows;
    if (report === "audit")
      rows = (
        await tx.query(
          "SELECT id,actor_id,action,target,outcome,detail,created_at FROM audit_events WHERE (action LIKE 'inventory.%' OR action LIKE 'expense.%' OR action LIKE 'stock.%') AND ($1::text IS NULL OR COALESCE(detail->>'branch',detail->>'actorBranch')=$1) AND ($2::date IS NULL OR (created_at AT TIME ZONE 'Africa/Lagos')::date>=$2) AND ($3::date IS NULL OR (created_at AT TIME ZONE 'Africa/Lagos')::date<=$3) ORDER BY created_at DESC LIMIT 1000",
          [
            s.scope === "business" ? null : s.scope,
            filters.from ?? null,
            filters.to ?? null,
          ],
        )
      ).rows;
    if (action === "business.export")
      await audit(tx, user, "finance.report_exported", report, "success", {
        branch: s.scope,
        filters,
        format: format ?? "csv",
        role: user.role,
        rows: rows.length,
      });
    const orderFilters = [
      "sales",
      "gas",
      "products",
      "cylinders",
      "accessories",
      "deliveries",
      "locations",
      "customers",
      "branches",
    ].includes(report);
    const ignored = Object.keys(filters).filter((key) =>
      key === "category"
        ? !["products", "cylinders", "accessories"].includes(report)
        : [
              "locationId",
              "customerCategory",
              "orderStatus",
              "paymentStatus",
            ].includes(key)
          ? !orderFilters
          : ["from", "to"].includes(key)
            ? ["wallet", "loyalty", "valuation", "low_stock"].includes(report)
            : false,
    );
    return {
      report,
      rows,
      ignoredFilters: ignored,
      summary: s.finance,
      analytics: s.analytics,
      filters,
      scope: s.scope,
      generatedAt: s.generatedAt,
      limitations: [
        ...s.limitations,
        ...(ignored.length
          ? [
              "Filters not applicable to this report: " +
                ignored.join(", ") +
                ". Point-in-time or differently scoped records are labelled separately.",
            ]
          : []),
      ],
    };
  }
  if (action === "report.delivery") {
    const d = z.object({ id: z.string().uuid() }).strict().parse(input);
    const r = await one(
      tx,
      "SELECT d.*,s.user_id,s.branch_id,s.report FROM report_deliveries d JOIN report_schedules s ON s.id=d.schedule_id WHERE d.id=$1 AND s.user_id=$2",
      [d.id, user.id],
    );
    if (!r) throw new AppError(404, "Report delivery not found.");
    scope(user, r.branch_id);
    allow(user, ["owner", "finance", "manager"]);
    if (financial.has(r.report)) allow(user, ["owner", "finance"]);
    if (["wallet", "loyalty", "branches", "audit"].includes(r.report))
      allow(user, ["owner"]);
    if (!r.snapshot)
      throw new AppError(
        409,
        "This older availability notice has no generated snapshot. Generate the report with current filters.",
      );
    await audit(tx, user, "finance.scheduled_report_viewed", r.id, "success", {
      branch: r.branch_id,
      report: r.report,
    });
    return r.snapshot;
  }
  if (action === "business.incident.assign") {
    const d = z
      .object({
        id: z.string().uuid(),
        reviewerId: z.string().uuid(),
        reason: z.string().min(5).max(1000),
      })
      .strict()
      .parse(input);
    const incident = await one(
      tx,
      "SELECT * FROM operational_incidents WHERE id=$1 FOR UPDATE",
      [d.id],
    );
    if (!incident) throw new AppError(404, "Incident not found.");
    allow(
      user,
      ["owner", "manager", "finance"],
      incident.branch_id ?? undefined,
    );
    if (incident.branch_id === null && user.role !== "owner")
      throw new AppError(
        403,
        "Business-wide incidents require owner authority.",
      );
    if (user.role === "finance" && incident.category !== "cash_discrepancy")
      throw new AppError(
        403,
        "This incident requires operational owner review.",
      );
    const reviewer = await one(
      tx,
      "SELECT id,role,branch_id FROM users WHERE id=$1 AND active=true",
      [d.reviewerId],
    );
    if (
      !reviewer ||
      !["owner", "manager", "finance"].includes(
        reviewer.role,
      ) ||
      (reviewer.role !== "owner" && reviewer.branch_id !== incident.branch_id)
    )
      throw new AppError(
        400,
        "Choose an active authorised reviewer in this branch.",
      );
    await tx.query(
      "UPDATE operational_incidents SET assigned_reviewer_id=$1 WHERE id=$2",
      [reviewer.id, incident.id],
    );
    await tx.query(
      "INSERT INTO incident_events(id,incident_id,actor_id,status,note) VALUES($1,$2,$3,$4,$5)",
      [
        id(),
        incident.id,
        user.id,
        incident.status,
        d.reason + " · reviewer " + reviewer.id,
      ],
    );
    await audit(tx, user, "incident.assigned", incident.id, "success", {
      branch: incident.branch_id,
      reviewer: reviewer.id,
      reason: d.reason,
    });
    return { ok: true };
  }
  if (action === "expense.category") {
    allow(user, ["owner"]);
    const d = z
      .object({
        id: z.string().regex(/^[a-z0-9-]{2,60}$/),
        label: z.string().min(3).max(100),
        active: z.boolean(),
      })
      .strict()
      .parse(input);
    const old = await one(tx, "SELECT * FROM expense_categories WHERE id=$1", [
      d.id,
    ]);
    if (old && old.label !== d.label)
      throw new AppError(
        409,
        "Historical category labels are preserved. Create a new category identifier.",
      );
    await tx.query(
      "INSERT INTO expense_categories(id,label,active) VALUES($1,$2,$3) ON CONFLICT(id) DO UPDATE SET active=EXCLUDED.active",
      [d.id, d.label, d.active],
    );
    await audit(tx, user, "expense.category_changed", d.id);
    return { ok: true };
  }
  if (action === "report.schedule") {
    const d = z
      .object({
        branchId: z.string().min(1).max(100),
        report: z.enum(reportNames),
        frequency: z.enum(["daily", "weekly", "monthly"]),
      })
      .strict()
      .parse(input);
    scope(user, d.branchId);
    allow(user, ["owner", "finance", "manager"]);
    if (financial.has(d.report)) allow(user, ["owner", "finance"]);
    if (["wallet", "loyalty", "branches", "audit"].includes(d.report))
      allow(user, ["owner"]);
    const sid = id();
    await tx.query(
      "INSERT INTO report_schedules(id,branch_id,user_id,report,frequency,next_run) VALUES($1,$2,$3,$4,$5,now()+CASE $5 WHEN 'weekly' THEN interval '7 days' WHEN 'monthly' THEN interval '1 month' ELSE interval '1 day' END) ON CONFLICT DO NOTHING",
      [sid, d.branchId, user.id, d.report, d.frequency],
    );
    await audit(tx, user, "report.schedule_created", sid, "success", {
      branch: d.branchId,
      report: d.report,
      frequency: d.frequency,
    });
    return {
      id: sid,
      message:
        "Scheduled for in-app availability. External delivery is unconnected.",
    };
  }
  if (action === "report.schedule.cancel") {
    const d = z.object({ id: z.string().uuid() }).strict().parse(input);
    const r = await one(
      tx,
      "SELECT * FROM report_schedules WHERE id=$1 AND user_id=$2",
      [d.id, user.id],
    );
    if (!r) throw new AppError(404, "Schedule not found.");
    scope(user, r.branch_id);
    await tx.query("UPDATE report_schedules SET active=false WHERE id=$1", [
      r.id,
    ]);
    await audit(tx, user, "report.schedule_cancelled", r.id);
    return { ok: true };
  }
  return undefined;
}
// Invoked by the existing local worker. Delivery stores no sensitive snapshot; access is checked again when opened.
export async function runReportSchedules(tx: SQL) {
  const due = (
    await tx.query(
      "SELECT s.*,u.role,u.active AS user_active,u.branch_id AS user_branch FROM report_schedules s JOIN users u ON u.id=s.user_id WHERE s.active=true AND s.next_run<=now() ORDER BY s.next_run LIMIT 50 FOR UPDATE OF s",
    )
  ).rows;
  for (const s of due) {
    const allowed =
      s.user_active &&
      ["owner", "finance", "manager"].includes(s.role) &&
      (s.role === "owner" || s.user_branch === s.branch_id) &&
      (!financial.has(s.report) || ["owner", "finance"].includes(s.role)) &&
      (!["wallet", "loyalty", "branches", "audit"].includes(s.report) ||
        s.role === "owner");
    let snapshot: any = null;
    if (allowed) {
      const to = new Date(s.next_run),
        from = new Date(to);
      if (s.frequency === "monthly") from.setUTCMonth(from.getUTCMonth() - 1);
      else
        from.setUTCDate(from.getUTCDate() - (s.frequency === "weekly" ? 7 : 1));
      const date = (d: Date) =>
        new Intl.DateTimeFormat("en-CA", {
          timeZone: "Africa/Lagos",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(d);
      snapshot = await businessReporting(
        tx,
        "business.report",
        {
          id: s.user_id,
          role: s.role,
          branch_id: s.user_branch,
          name: "Scheduled report",
          email: "",
          session_id: "report-worker",
          verified_at: null,
        },
        {
          branchId: s.branch_id,
          report: s.report,
          from: date(from),
          to: date(new Date(to.getTime() - 86400000)),
        },
      );
    }
    const result = await tx.query(
      "INSERT INTO report_deliveries(id,schedule_id,scheduled_for,status,detail,snapshot) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING RETURNING id",
      [
        id(),
        s.id,
        s.next_run,
        allowed ? "available_in_app" : "failed",
        allowed
          ? "Generated report available in app; reauthorised at view time."
          : "Current permission no longer permits this report.",
        snapshot ? JSON.stringify(snapshot) : null,
      ],
    );
    if (allowed && result.rows.length)
      await notify(
        tx,
        s.user_id,
        "Scheduled report available",
        s.report + " report is ready to open with current permissions.",
        "report-delivery:" + result.rows[0].id,
      );
    await tx.query(
      "UPDATE report_schedules SET next_run=next_run+CASE frequency WHEN 'weekly' THEN interval '7 days' WHEN 'monthly' THEN interval '1 month' ELSE interval '1 day' END,active=$1 WHERE id=$2",
      [allowed, s.id],
    );
  }
  return due.length;
}
