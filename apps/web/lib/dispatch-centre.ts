import { orderTransitions } from "../../../packages/business-rules/src/forecast";
import { tripLocationEvidence } from "../../../packages/business-rules/src/trip-metrics";
import { audit } from "./governance";
import { z } from "zod";
import { allow, AppError, type Actor } from "./auth";
import { one, type SQL } from "./db";
import { fulfilmentReady } from "./order-tracking";
import { invoiceBalance } from "./invoice-corrections";
import { vehicleReady } from "./fleet-constraints";
import {
  dispatchTab,
  dispatchOrderTab,
  dispatchPriority,
  lagosDate,
  driverContact,
} from "../../../packages/business-rules/src/dispatch-centre";

// Roll back even successful probes: read requests must never consume stock or create events.
async function probe(tx: SQL, work: () => Promise<void>) {
  await tx.query("SAVEPOINT dispatch_probe");
  try {
    await work();
    return { ready: true as boolean | null, reasons: [] as string[] };
  } catch (e) {
    if (!(e instanceof AppError)) throw e;
    return { ready: false as boolean | null, reasons: [e.message] };
  } finally {
    await tx.query("ROLLBACK TO SAVEPOINT dispatch_probe");
    await tx.query("RELEASE SAVEPOINT dispatch_probe");
  }
}
export async function dispatchCentre(
  tx: SQL,
  user: Actor,
  action: string,
  input: unknown,
) {
  allow(user, ["owner", "manager"]);
  if (action === "dispatch.candidates") {
    const d = z.object({ orderId: z.string().uuid() }).strict().parse(input);
    const order = await one(tx, "SELECT * FROM orders WHERE id=$1", [
      d.orderId,
    ]);
    if (!order) throw new AppError(404, "Order not found.");
    allow(user, ["owner", "manager"], order.branch_id);
    if (!["accepted", "preparing", "assigned"].includes(order.status))
      throw new AppError(
        409,
        "Order is not eligible for assignment in this state.",
      );
    if (
      order.status !== "assigned" &&
      !orderTransitions[order.status]?.includes("assigned")
    )
      throw new AppError(
        409,
        "Complete order preparation before selecting a driver.",
      );
    const drivers = (
      await tx.query(
        "SELECT id,name,driver_available,active,branch_id FROM users WHERE role='driver' AND branch_id=$1 ORDER BY name,id",
        [order.branch_id],
      )
    ).rows;
    const candidates = [];
    for (const driver of drivers) {
      const readiness = await probe(tx, async () => {
        if (driver.id === order.driver_id)
          throw new AppError(
            409,
            "Already assigned; select a different eligible driver for reassignment.",
          );
        if (!driver.active || !driver.driver_available)
          throw new AppError(409, "Driver is inactive or unavailable.");
        await fulfilmentReady(tx, { ...order, driver_id: driver.id });
        await vehicleReady(tx, driver.id, order.id, order.branch_id);
      });
      candidates.push({ ...driver, readiness });
    }
    return {
      orderId: order.id,
      action:
        order.status === "assigned" ? "dispatch.reassign" : "dispatch.assign",
      version: Number(order.tracking_version),
      candidates,
      automaticAssignmentEnabled: false,
      writesEnabled:
        process.env.EASYGAS_TRACKING_MUTATIONS_ENABLED !== "false" &&
        (process.env.NODE_ENV !== "production" ||
          process.env.EASYGAS_TRACKING_MUTATIONS_ENABLED === "true") &&
        (process.env.NODE_ENV !== "production" ||
          process.env.EASYGAS_FIELD_OPERATIONS_ENABLED === "true"),
    };
  }
  const d = z
    .object({
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .default(lagosDate()),
      branch: z.string().max(100).default(""),
      area: z.string().max(150).default(""),
      q: z.string().max(150).default(""),
      tab: z
        .enum(["queue", "live", "completed", "exceptions"])
        .default("queue"),
      priority: z.enum(["", "Overdue", "Normal"]).default(""),
      window: z.string().max(100).default(""),
      status: z
        .enum([
          "",
          "accepted",
          "preparing",
          "assigned",
          "out_for_delivery",
          "delivered",
          "delivery_failed",
        ])
        .default(""),
      sort: z.enum(["oldest", "newest", "customer"]).default("oldest"),
      page: z.coerce.number().int().min(1).max(100000).default(1),
      pageSize: z.coerce.number().int().min(5).max(50).default(10),
    })
    .strict()
    .parse(input);
  if (
    Number.isNaN(Date.parse(d.date + "T00:00:00Z")) ||
    new Date(d.date + "T00:00:00Z").toISOString().slice(0, 10) !== d.date
  )
    throw new AppError(400, "Choose a valid date.");
  if (d.branch && user.role !== "owner" && d.branch !== user.branch_id)
    throw new AppError(403, "Branch access denied.");
  const branches = (
    await tx.query(
      "SELECT id,name,active FROM branches WHERE ($1::boolean OR id=$2) ORDER BY name",
      [user.role === "owner", user.branch_id],
    )
  ).rows;
  const all = (
    await tx.query(
      `SELECT o.*,u.name customer_name,dr.name driver_name,
    (SELECT r.decision FROM delivery_attempts a LEFT JOIN dispatch_responses r ON r.attempt_id=a.id WHERE a.order_id=o.id ORDER BY a.assignment_version DESC LIMIT 1) driver_response,
    (SELECT jsonb_agg(jsonb_build_object('name',i.name,'quantity',i.quantity)) FROM order_items i WHERE i.order_id=o.id) items,
    (SELECT COALESCE(sum(g.grams),0) FROM order_gas_lines g WHERE g.order_id=o.id) gas_grams
    FROM orders o JOIN users u ON u.id=o.customer_id LEFT JOIN users dr ON dr.id=o.driver_id
    WHERE ($1::boolean OR o.branch_id=$2) AND ($3='' OR o.branch_id=$3)
    AND ((o.status='delivered' AND (o.delivered_at AT TIME ZONE 'Africa/Lagos')::date=$4::date)
      OR (o.status<>'delivered' AND o.delivery_date=$4::text))
    ORDER BY o.delivery_date,o.created_at,o.id`,
      [user.role === "owner", user.branch_id, d.branch, d.date],
    )
  ).rows;
  const areas = [
    ...new Set(
      all.map((o) =>
        String(o.address?.zone ?? o.address?.area ?? "Unresolved"),
      ),
    ),
  ].sort();
  const windows = [...new Set(all.map((o) => o.delivery_window))].sort();
  const q = d.q.trim().toLocaleLowerCase();
  const scope = all.filter(
    (o) =>
      (!d.area ||
        (o.address?.zone ?? o.address?.area ?? "Unresolved") === d.area) &&
      (!d.window || o.delivery_window === d.window) &&
      (!d.status || o.status === d.status) &&
      (!d.priority ||
        dispatchPriority(
          { delivery_date: String(o.delivery_date), status: String(o.status) },
          lagosDate(),
        ) === d.priority) &&
      (!q ||
        [
          o.reference,
          o.customer_name,
          o.address?.street,
          o.address?.zone,
          o.address?.area,
        ]
          .join(" ")
          .toLocaleLowerCase()
          .includes(q)),
  );
  const queue = scope.filter(
    (o) =>
      dispatchOrderTab({
        status: String(o.status),
        driver_response: o.driver_response,
        delivery_code_expires_at: o.delivery_code_expires_at,
      }) === "queue",
  );
  // A safety probe has bounded lock/work cost. Never replace an incomplete readiness count with a guessed number.
  let ready: number | null = queue.length > 250 ? null : 0;
  for (const o of ready === null ? [] : queue) {
    if (!orderTransitions[o.status]?.includes("assigned")) {
      o.readiness = {
        ready: false,
        reasons: ["Complete order preparation before assignment."],
      };
      continue;
    }
    o.readiness = await probe(tx, () =>
      fulfilmentReady(tx, { ...o, driver_id: null }),
    );
    if (ready !== null && o.readiness.ready) ready++;
  }
  const counts = {
    queue: queue.length,
    live: scope.filter(
      (o) =>
        dispatchOrderTab({
          status: String(o.status),
          driver_response: o.driver_response,
          delivery_code_expires_at: o.delivery_code_expires_at,
        }) === "live",
    ).length,
    completed: scope.filter(
      (o) =>
        dispatchOrderTab({
          status: String(o.status),
          driver_response: o.driver_response,
          delivery_code_expires_at: o.delivery_code_expires_at,
        }) === "completed",
    ).length,
    exceptions: scope.filter(
      (o) =>
        dispatchOrderTab({
          status: String(o.status),
          driver_response: o.driver_response,
          delivery_code_expires_at: o.delivery_code_expires_at,
        }) === "exceptions",
    ).length,
  };
  scope.sort((a, b) =>
    d.sort === "customer"
      ? String(a.customer_name).localeCompare(String(b.customer_name)) ||
        String(a.id).localeCompare(String(b.id))
      : (d.sort === "newest" ? -1 : 1) *
          (new Date(a.created_at).getTime() -
            new Date(b.created_at).getTime()) ||
        String(a.id).localeCompare(String(b.id)),
  );
  const filtered = scope.filter(
      (o) =>
        dispatchOrderTab({
          status: String(o.status),
          driver_response: o.driver_response,
          delivery_code_expires_at: o.delivery_code_expires_at,
        }) === d.tab,
    ),
    total = filtered.length;
  const page = Math.min(d.page, Math.max(1, Math.ceil(total / d.pageSize)));
  const rows = filtered.slice((page - 1) * d.pageSize, page * d.pageSize);
  for (const o of rows) {
    const invoice = await one(
      tx,
      "SELECT * FROM customer_invoices WHERE order_id=$1",
      [o.id],
    );
    const balance = invoice ? await invoiceBalance(tx, invoice) : null;
    const paid = balance && !balance.voided && balance.amountDueKobo === 0;
    const cod = await one(
      tx,
      "SELECT value FROM settings WHERE key='payment.cod' AND scope=$1",
      [o.branch_id],
    );
    o.paymentLabel = paid
      ? "Paid"
      : o.payment_method === "cash_on_delivery" && cod?.value === true
        ? "Approved COD"
        : "Payment review";
    o.priority = dispatchPriority(
      { delivery_date: String(o.delivery_date), status: String(o.status) },
      lagosDate(),
    );
    o.readiness ??= {
      ready: null,
      reasons: [
        "Final assignment revalidates stock, payment, branch, vehicle and physical custody.",
      ],
    };
  }
  const driverRows = (
    await tx.query(
      `SELECT u.id,u.name,u.branch_id,u.driver_available,u.driver_last_seen_at,
        stops.active_stops,point.payload,point.recorded_at,point.created_at AS received_at
      FROM users u JOIN branches b ON b.id=u.branch_id AND b.active
      CROSS JOIN LATERAL (
        SELECT count(*) active_stops FROM orders o
        WHERE o.driver_id=u.id AND o.branch_id=u.branch_id AND o.status IN ('assigned','out_for_delivery')
      ) stops
      LEFT JOIN driver_trips t ON stops.active_stops>0 AND t.driver_id=u.id AND t.branch_id=u.branch_id
        AND t.ended_at IS NULL AND t.location_consent
      LEFT JOIN LATERAL (
        SELECT e.payload,e.recorded_at,e.created_at FROM trip_events e
        WHERE e.trip_id=t.id AND e.actor_id=u.id AND e.kind='gps' AND e.recorded_at>=t.started_at
        ORDER BY e.recorded_at DESC,e.sequence DESC LIMIT 1
      ) point ON true
      WHERE u.role='driver' AND u.active AND ($1::boolean OR u.branch_id=$2) AND ($3='' OR u.branch_id=$3)
      ORDER BY u.name,u.id`,
      [user.role === "owner", user.branch_id, d.branch],
    )
  ).rows;
  let locationReads = 0;
  const now = Date.now();
  const drivers = driverRows.map(
    ({ payload, recorded_at, received_at, ...driver }) => {
      const contact = driverContact(
        driver.driver_last_seen_at
          ? new Date(driver.driver_last_seen_at).toISOString()
          : null,
      );
      const evidence = tripLocationEvidence(
        recorded_at
          ? [
              {
                ...payload,
                recordedAt: new Date(recorded_at).toISOString(),
                receivedAt: new Date(received_at).toISOString(),
              },
            ]
          : [],
        now,
        true,
        false,
      );
      if (evidence.lastKnown) locationReads++;
      return {
        id: driver.id,
        name: driver.name,
        branch_id: driver.branch_id,
        driver_available: driver.driver_available,
        driver_last_seen_at: driver.driver_last_seen_at,
        active_stops: driver.active_stops,
        contact,
        location: {
          status: evidence.lastKnown?.delayedUpload
            ? "last_known_only"
            : evidence.status,
          lastKnown: evidence.lastKnown,
          live: false,
        },
      };
    },
  );
  if (locationReads)
    await audit(
      tx,
      user,
      "dispatch.location.read",
      user.branch_id ?? "all-branches",
      "success",
      {
        purpose: "Active delivery operations",
        drivers: locationReads,
      },
    );
  const mass = await one(
    tx,
    `SELECT COALESCE(sum(loaded_grams) FILTER(WHERE (created_at AT TIME ZONE 'Africa/Lagos')::date=$4::date),0) loaded,
    COALESCE(sum(loaded_grams-dispensed_grams) FILTER(WHERE state IN ('issued','active','returning','held')),0) remaining,
    count(*) FILTER(WHERE state='held') held FROM bulk_lpg_loads WHERE ($1::boolean OR branch_id=$2) AND ($3='' OR branch_id=$3)`,
    [user.role === "owner", user.branch_id, d.branch, d.date],
  );
  const delivered = await one(
    tx,
    `SELECT COALESCE(sum(a.dispensed_grams+(SELECT COALESCE(sum(CASE WHEN EXISTS(SELECT 1 FROM doorstep_cylinder_lines cl WHERE cl.amendment_id=e.amendment_id) THEN (SELECT COALESCE(sum(cl.grams),0) FROM doorstep_cylinder_lines cl WHERE cl.amendment_id=e.amendment_id AND cl.state='dispensed') WHEN e.state='dispensed' THEN e.grams ELSE 0 END),0) FROM doorstep_execution e WHERE e.order_id=o.id)),0) grams FROM bulk_lpg_allocations a JOIN orders o ON o.id=a.order_id WHERE a.state='fulfilled' AND o.status='delivered' AND (o.delivered_at AT TIME ZONE 'Africa/Lagos')::date=$4::date AND ($1::boolean OR o.branch_id=$2) AND ($3='' OR o.branch_id=$3)`,
    [user.role === "owner", user.branch_id, d.branch, d.date],
  );
  const returns = await one(
    tx,
    `SELECT COALESCE(sum((e.detail->>'observedGrams')::bigint) FILTER(WHERE e.kind IN ('return.received','return.recovered')),0) grams,count(*) FILTER(WHERE e.kind='return.discrepancy') discrepancies FROM bulk_lpg_events e JOIN bulk_lpg_loads l ON l.id=e.load_id WHERE e.kind IN ('return.received','return.recovered','return.discrepancy') AND (e.created_at AT TIME ZONE 'Africa/Lagos')::date=$4::date AND ($1::boolean OR l.branch_id=$2) AND ($3='' OR l.branch_id=$3)`,
    [user.role === "owner", user.branch_id, d.branch, d.date],
  );
  return {
    observedAt: new Date().toISOString(),
    date: d.date,
    branches,
    areas,
    windows,
    rows: rows.map((o) => ({
      id: o.id,
      reference: o.reference,
      customer_name: o.customer_name,
      address: {
        street: o.address?.street,
        zone: o.address?.zone,
        area: o.address?.area,
      },
      status: o.status,
      branch_id: o.branch_id,
      driver_id: o.driver_id,
      driver_name: o.driver_name,
      tracking_version: o.tracking_version,
      delivery_date: o.delivery_date,
      delivery_window: o.delivery_window,
      items: o.items,
      gas_grams: Number(o.gas_grams),
      paymentLabel: o.paymentLabel,
      priority: o.priority,
      readiness: o.readiness,
      canAssign: orderTransitions[o.status]?.includes("assigned") ?? false,
      driver_response: o.driver_response,
      exception:
        o.driver_response === "rejected"
          ? "Driver declined"
          : o.status === "assigned" &&
              new Date(o.delivery_code_expires_at).getTime() <= Date.now()
            ? "Assignment expired"
            : o.status === "delivery_failed"
              ? "Delivery failed"
              : null,
    })),
    total,
    page,
    pageSize: d.pageSize,
    counts,
    kpis: {
      ready,
      assigned: scope.filter(
        (o) =>
          o.status === "assigned" &&
          o.driver_response !== "rejected" &&
          new Date(o.delivery_code_expires_at).getTime() > Date.now(),
      ).length,
      inTransit: scope.filter((o) => o.status === "out_for_delivery").length,
      delivered: counts.completed,
      exceptions: counts.exceptions,
      driversOnline: drivers.filter((d) => d.contact === "recent_contact")
        .length,
    },
    readinessNote:
      ready === null
        ? "Readiness requires a narrower filter; no partial count shown."
        : "Ready before driver selection; final assignment revalidates all controls.",
    drivers,
    contactNote:
      "Online means foreground contact within90 seconds. Unknown/stale contact is separate from availability and GPS.",
    operations: {
      loadedGrams: Number(mass?.loaded ?? 0),
      deliveredGrams: Number(delivered?.grams ?? 0),
      estimatedRemainingGrams: Number(mass?.remaining ?? 0),
      heldLoads: Number(mass?.held ?? 0),
      verifiedReturnsGrams: Number(returns?.grams ?? 0),
      discrepancyEvents: Number(returns?.discrepancies ?? 0),
    },
    automaticAssignmentEnabled: false,
  };
}
