import { orderRevenueSql } from "./order-financial-basis";
import { z } from "zod";
import { one, type SQL } from "./db";
import { AppError, type Actor } from "./auth";
import { navigationAccess } from "./navigation";
const filters = z
  .object({
    from: z.iso.date(),
    to: z.iso.date(),
    branchId: z.string().min(1).max(100).optional(),
    page: z.coerce.number().int().min(1).max(1000).default(1),
  })
  .strict();
export async function adminDashboard(tx: SQL, user: Actor, input: unknown) {
  const d = filters.parse(input);
  const span = (Date.parse(d.to) - Date.parse(d.from)) / 86400000;
  if (span < 0 || span > 92)
    throw new AppError(400, "Select a date range of at most 93 days.");
  const access = await navigationAccess(tx, user);
  if (!access.allowed.includes("dashboard"))
    throw new AppError(403, "Your account has no dashboard access.");
  if (user.role !== "owner" && d.branchId && d.branchId !== user.branch_id)
    throw new AppError(403, "This dashboard belongs to another branch.");
  const branch = user.role === "owner" ? (d.branchId ?? null) : user.branch_id;
  if (
    branch &&
    !(await one(tx, "SELECT id FROM branches WHERE id=$1 AND active=true", [
      branch,
    ]))
  )
    throw new AppError(403, "Choose an active authorised branch.");
  const p = [branch, d.from, d.to],
    can = (id: string) => access.allowed.includes(id),
    errors: Record<string, string> = {};
  let sequence = 0;
  // Savepoints isolate read-widget failures inside the existing request transaction.
  async function widget<T>(
    name: string,
    available: boolean,
    read: () => Promise<T>,
  ): Promise<T | null> {
    if (!available) return null;
    const save = "admin_widget_" + sequence++;
    await tx.exec("SAVEPOINT " + save);
    try {
      const value = await read();
      await tx.exec("RELEASE SAVEPOINT " + save);
      return value;
    } catch {
      await tx.exec("ROLLBACK TO SAVEPOINT " + save);
      await tx.exec("RELEASE SAVEPOINT " + save);
      errors[name] = "Unavailable. Retry or contact operations.";
      return null;
    }
  }
  const orderPeriod =
    "($1::text IS NULL OR o.branch_id=$1) AND (o.created_at AT TIME ZONE 'Africa/Lagos')::date BETWEEN $2::date AND $3::date";
  const orderStats = await widget("orders", can("orders"), async () => {
    const rows = (
      await tx.query(
        "SELECT o.status,count(*)::int AS count FROM orders o WHERE " +
          orderPeriod +
          " GROUP BY o.status ORDER BY o.status",
        p,
      )
    ).rows;
    return {
      count: rows.reduce((n, r) => n + Number(r.count), 0),
      statuses: rows,
    };
  });
  const trend = await widget(
    "trend",
    can("orders"),
    async () =>
      (
        await tx.query(
          "SELECT (o.created_at AT TIME ZONE 'Africa/Lagos')::date::text AS date,count(*)::int AS count FROM orders o WHERE " +
            orderPeriod +
            " GROUP BY 1 ORDER BY 1",
          p,
        )
      ).rows,
  );
  const customers = await widget("customers", can("customers"), async () =>
    Number(
      (await one(
        tx,
        "SELECT count(DISTINCT o.customer_id)::int AS count FROM orders o JOIN users u ON u.id=o.customer_id WHERE " +
          orderPeriod +
          " AND o.status<>'cancelled' AND u.role IN ('customer','commercial')",
        p,
      ))!.count,
    ),
  );
  const services = await widget("services", can("bookings"), async () =>
    Number(
      (await one(
        tx,
        "SELECT count(*)::int AS count FROM service_bookings b WHERE ($1::text IS NULL OR b.branch_id=$1) AND (b.created_at AT TIME ZONE 'Africa/Lagos')::date BETWEEN $2::date AND $3::date",
        p,
      ))!.count,
    ),
  );
  const cylinders = await widget("cylinders", can("cylinders"), async () =>
    Number(
      (await one(
        tx,
        "SELECT count(*)::int AS count FROM cylinders c WHERE ($1::text IS NULL OR c.branch_id=$1) AND c.status='filled' AND c.ownership='company' AND c.customer_id IS NULL AND c.test_due>=(now() AT TIME ZONE 'Africa/Lagos')::date AND NOT EXISTS(SELECT 1 FROM cylinder_allocations a WHERE a.cylinder_id=c.id AND a.state IN ('reserved','issued')) AND NOT EXISTS(SELECT 1 FROM vehicle_product_serials s WHERE s.cylinder_id=c.id AND s.state IN ('loaded','reserved'))",
        [branch],
      ))!.count,
    ),
  );
  const incidents = await widget("incidents", can("incidents"), async () =>
    Number(
      (await one(
        tx,
        "SELECT count(*)::int AS count FROM operational_incidents WHERE ($1::text IS NULL OR branch_id=$1) AND status IN ('open','acknowledged')",
        [branch],
      ))!.count,
    ),
  );
  const operations = await widget(
    "operations",
    can("orders") || can("bookings"),
    async () => ({
      deliveries: can("deliveries")
        ? Number(
            (await one(
              tx,
              "SELECT count(*)::int AS count FROM orders WHERE ($1::text IS NULL OR branch_id=$1) AND status='out_for_delivery'",
              [branch],
            ))!.count,
          )
        : null,
      drivers: can("deliveries")
        ? Number(
            (await one(
              tx,
              "SELECT count(DISTINCT driver_id)::int AS count FROM orders WHERE ($1::text IS NULL OR branch_id=$1) AND status='out_for_delivery'",
              [branch],
            ))!.count,
          )
        : null,
      appointments: can("bookings")
        ? Number(
            (await one(
              tx,
              "SELECT count(*)::int AS count FROM service_bookings b JOIN service_slots s ON s.id=b.slot_id WHERE ($1::text IS NULL OR b.branch_id=$1) AND (s.starts_at AT TIME ZONE 'Africa/Lagos')::date BETWEEN $2::date AND $3::date AND b.status NOT IN ('cancelled','failed')",
              p,
            ))!.count,
          )
        : null,
      technicians: can("bookings")
        ? Number(
            (await one(
              tx,
              "SELECT count(DISTINCT technician_id)::int AS count FROM service_bookings WHERE ($1::text IS NULL OR branch_id=$1) AND status='in_progress' AND work_phase='authorised'",
              [branch],
            ))!.count,
          )
        : null,
    }),
  );
  const recent = await widget("recent", can("orders"), async () => {
    const rows = (
      await tx.query(
        "SELECT o.id,o.reference,o.status,o.total_kobo,o.created_at,u.name AS customer,driver.name AS driver,COALESCE((SELECT string_agg(i.quantity::text||' × '||p.name,', ' ORDER BY p.name) FROM order_items i JOIN products p ON p.id=i.product_id WHERE i.order_id=o.id),'View item details') AS items FROM orders o JOIN users u ON u.id=o.customer_id LEFT JOIN users driver ON driver.id=o.driver_id WHERE " +
          orderPeriod +
          " ORDER BY o.created_at DESC,o.id DESC LIMIT 6 OFFSET $4",
        [...p, (d.page - 1) * 5],
      )
    ).rows;
    return { rows: rows.slice(0, 5), hasMore: rows.length > 5, page: d.page };
  });
  const revenue = await widget(
    "revenue",
    ["owner", "finance"].includes(user.role),
    async () => {
      const r = await one(
        tx,
        `SELECT
 (SELECT COALESCE(sum(${orderRevenueSql}),0) FROM orders o WHERE ($1::text IS NULL OR o.branch_id=$1) AND o.status='delivered' AND o.payment_status='verified' AND (SELECT (max(e.created_at) AT TIME ZONE 'Africa/Lagos')::date FROM order_events e WHERE e.order_id=o.id AND e.status='delivered') BETWEEN $2::date AND $3::date)
 +(SELECT COALESCE(sum(p.total_kobo),0) FROM pos_sales p JOIN pos_shifts s ON s.id=p.shift_id WHERE ($1::text IS NULL OR s.branch_id=$1) AND s.status='verified' AND (p.created_at AT TIME ZONE 'Africa/Lagos')::date BETWEEN $2::date AND $3::date)
 +(SELECT COALESCE(sum(GREATEST(0,LEAST((r.body->>'invoiceTotalKobo')::bigint,COALESCE((SELECT sum(p.amount_kobo) FROM verified_payments p WHERE p.booking_id=b.id),0)-COALESCE((SELECT sum(c.amount_kobo) FROM credit_requests c WHERE c.booking_id=b.id AND c.status='approved' AND c.kind='refund'),0)))),0) FROM service_bookings b JOIN service_reports r ON r.booking_id=b.id WHERE ($1::text IS NULL OR b.branch_id=$1) AND b.status='completed' AND (SELECT (max(e.created_at) AT TIME ZONE 'Africa/Lagos')::date FROM service_booking_events e WHERE e.booking_id=b.id AND e.status='completed') BETWEEN $2::date AND $3::date) AS kobo`,
        p,
      );
      const value = Number(r!.kobo);
      if (!Number.isSafeInteger(value) || value < 0)
        throw new Error("Financial aggregate requires review.");
      return value;
    },
  );
  const campaign = await widget("campaign", can("campaigns"), async () =>
    one(
      tx,
      "SELECT title,body FROM campaigns WHERE ($1::text IS NULL OR branch_id=$1) AND status='approved' AND approved_by IS NOT NULL ORDER BY created_at DESC LIMIT 1",
      [branch],
    ),
  );
  return {
    scope: {
      branchId: branch,
      label: branch ?? "All authorised branches",
      from: d.from,
      to: d.to,
      timeZone: "Africa/Lagos",
    },
    branches:
      user.role === "owner"
        ? (
            await tx.query(
              "SELECT id,name FROM branches WHERE active=true ORDER BY name LIMIT 200",
            )
          ).rows
        : [],
    generatedAt: new Date().toISOString(),
    orders: orderStats,
    trend,
    customers,
    services,
    cylinders,
    incidents,
    operations,
    recent,
    revenue,
    campaign,
    errors,
    allowed: access.allowed,
  };
}
export async function adminSearch(tx: SQL, user: Actor, input: unknown) {
  const d = z
    .object({
      q: z.string().trim().min(2).max(80),
      page: z.coerce.number().int().min(1).max(20).default(1),
    })
    .strict()
    .parse(input);
  const access = await navigationAccess(tx, user),
    can = (s: string) => access.allowed.includes(s),
    branch = user.role === "owner" ? null : user.branch_id;
  const query = "%" + d.q.replace(/[\\%_]/g, "\\$&") + "%",
    p = [branch, query, (d.page - 1) * 5],
    results: any[] = [];
  const add = async (type: string, module: string, sql: string) => {
    if (!can(module)) return;
    for (const row of (await tx.query(sql, p)).rows)
      results.push({
        ...row,
        type,
        href:
          "/admin/" + module + (type === "Order" ? "?orderId=" + row.id : ""),
      });
  };
  await add(
    "Order",
    "orders",
    "SELECT id,reference AS label,status AS detail FROM orders WHERE ($1::text IS NULL OR branch_id=$1) AND reference ILIKE $2 ESCAPE '\\' ORDER BY created_at DESC,id LIMIT 5 OFFSET $3",
  );
  await add(
    "Customer",
    "customers",
    "SELECT id,name AS label,email AS detail FROM users WHERE role IN ('customer','commercial') AND ($1::text IS NULL OR branch_id=$1) AND (name ILIKE $2 ESCAPE '\\' OR email ILIKE $2 ESCAPE '\\' OR contact_phone ILIKE $2 ESCAPE '\\') ORDER BY name,id LIMIT 5 OFFSET $3",
  );
  await add(
    "Cylinder",
    "cylinders",
    "SELECT id,serial AS label,status AS detail FROM cylinders WHERE ($1::text IS NULL OR branch_id=$1) AND serial ILIKE $2 ESCAPE '\\' ORDER BY serial,id LIMIT 5 OFFSET $3",
  );
  await add(
    "Service",
    "services",
    "SELECT id,name AS label,branch_id AS detail FROM service_catalogue WHERE ($1::text IS NULL OR branch_id=$1) AND name ILIKE $2 ESCAPE '\\' ORDER BY name,id LIMIT 5 OFFSET $3",
  );
  await add(
    "Staff",
    "staff",
    "SELECT id,name AS label,role AS detail FROM users WHERE role NOT IN ('customer','commercial') AND ($1::text IS NULL OR branch_id=$1) AND (name ILIKE $2 ESCAPE '\\' OR email ILIKE $2 ESCAPE '\\') ORDER BY name,id LIMIT 5 OFFSET $3",
  );
  return {
    results,
    page: d.page,
    mayHaveMore: results.length >= 5,
    generatedAt: new Date().toISOString(),
  };
}
