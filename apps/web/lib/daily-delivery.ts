import { z } from "zod";
import { one, type SQL } from "./db";
import { allow, AppError, id, recentVerification, type Actor } from "./auth";
import { audit } from "./governance";
import { enforceStaffPrivilege } from "./staff-privileges";
import { setDriverAvailability } from "./driver-availability";
import { fulfilmentReady } from "./order-tracking";
import { grams } from "../../../packages/business-rules/src/gas-pricing";
const uid = z.string().uuid();
const kg = z
  .number()
  .finite()
  .min(0)
  .max(1000000)
  .refine(
    (n) =>
      Number.isSafeInteger(n * 1000) ||
      Math.abs(n * 1000 - Math.round(n * 1000)) < 0.000001,
    "Use kg with at most three decimal places.",
  );
const mass = (n: number) => grams(n);
export async function dailyAllocation(tx: SQL, orderId: string) {
  return one(
    tx,
    "SELECT a.*,r.trip_id,r.driver_id,r.branch_id,r.vehicle_id,r.state run_state FROM daily_delivery_allocations a JOIN daily_delivery_runs r ON r.id=a.run_id WHERE a.order_id=$1 AND a.state<>'released'",
    [orderId],
  );
}
export async function availableDaily(
  tx: SQL,
  branch: string,
  quantity: number,
  driver?: string,
  lock = false,
) {
  return one(
    tx,
    `SELECT r.*,r.id AS daily_run_id FROM daily_delivery_runs r JOIN driver_trips t ON t.id=r.trip_id AND t.ended_at IS NULL JOIN users u ON u.id=r.driver_id AND u.active AND u.driver_available AND u.branch_id=r.branch_id JOIN driver_vehicles v ON v.id=r.vehicle_id AND v.active AND v.lpg_suitable JOIN branches b ON b.id=r.branch_id AND b.active WHERE r.branch_id=$1 AND r.state='active' AND r.opening_grams+r.added_grams-r.supplied_grams-r.committed_grams>=$2 AND ($3::text IS NULL OR r.driver_id=$3)${lock ? " FOR UPDATE OF r,t,v" : ""}`,
    [branch, quantity, driver ?? null],
  );
}
export async function takeDaily(
  tx: SQL,
  branch: string,
  quantity: number,
  driver?: string,
) {
  const r = await availableDaily(tx, branch, quantity, driver, true);
  if (!r) return;
  await tx.query(
    "UPDATE daily_delivery_runs SET committed_grams=committed_grams+$1,version=version+1 WHERE id=$2",
    [quantity, r.id],
  );
  return r;
}
export async function allocateDaily(
  tx: SQL,
  user: Actor,
  orderId: string,
  run: any,
  quantity: number,
  releaseDuplicate: boolean,
) {
  if (releaseDuplicate) {
    const row = await one(
      tx,
      "UPDATE gas_stock SET reserved_grams=reserved_grams-$1 WHERE branch_id=$2 AND reserved_grams>=$1 RETURNING branch_id",
      [quantity, run.branch_id],
    );
    if (!row)
      throw new AppError(
        409,
        "The order stock reservation changed. Refresh and try again.",
      );
  }
  await tx.query(
    "INSERT INTO daily_delivery_allocations(id,run_id,order_id,grams) VALUES($1,$2,$3,$4)",
    [id(), run.id, orderId, quantity],
  );
  await audit(tx, user, "daily.order_reserved", orderId, "success", {
    runId: run.id,
    grams: quantity,
  });
}
/** Stock was debited when the scale supply was recorded; completion must never debit it twice. */
export async function settleDaily(
  tx: SQL,
  user: Actor,
  orderId: string,
  quantity: number,
  kind: "released" | "fulfilled",
) {
  const a = await dailyAllocation(tx, orderId);
  if (!a) return undefined;
  if (Number(a.grams) !== quantity)
    throw new AppError(
      409,
      "The daily allocation differs from the order. Contact the office.",
    );
  const r = await one(
    tx,
    "SELECT * FROM daily_delivery_runs WHERE id=$1 FOR UPDATE",
    [a.run_id],
  );
  if (kind === "fulfilled") {
    if (a.state !== "supplied" || Number(a.supplied_grams) !== quantity)
      throw new AppError(
        409,
        "Record the paid gas quantity using before and after scale readings first.",
      );
    await tx.query(
      "UPDATE daily_delivery_allocations SET state='fulfilled' WHERE id=$1",
      [a.id],
    );
  } else {
    if (Number(a.supplied_grams) > 0)
      throw new AppError(
        409,
        "Gas already supplied cannot be released by cancelling. Contact the office for payment/refill review.",
      );
    if (r?.state !== "active")
      throw new AppError(
        409,
        "This delivery day is closed. Refresh the order.",
      );
    await tx.query(
      "UPDATE daily_delivery_runs SET committed_grams=committed_grams-$1,version=version+1 WHERE id=$2 AND committed_grams>=$1",
      [quantity, r.id],
    );
    await tx.query(
      "UPDATE daily_delivery_allocations SET state='released' WHERE id=$1",
      [a.id],
    );
  }
  await audit(tx, user, "daily.order_" + kind, orderId, "success", {
    runId: a.run_id,
    grams: quantity,
  });
  return true;
}
export async function dailyDelivery(
  tx: SQL,
  user: Actor,
  action: string,
  input: unknown,
) {
  if (action === "daily.summary") {
    const d = z
      .object({ branch: z.string().max(100).optional() })
      .strict()
      .parse(input);
    allow(user, ["owner", "manager", "finance", "driver"], d.branch);
    enforceStaffPrivilege(
      user,
      user.role === "driver" ? "daily.refill.record" : "orders",
    );
    const branch =
      user.role === "owner" ? d.branch || user.branch_id : user.branch_id;
    const rows = (
      await tx.query(
        `SELECT r.*,v.label,u.name driver_name,t.start_odometer FROM daily_delivery_runs r JOIN driver_vehicles v ON v.id=r.vehicle_id JOIN users u ON u.id=r.driver_id JOIN driver_trips t ON t.id=r.trip_id WHERE r.branch_id=$1 AND ($2::text IS NULL OR r.driver_id=$2) ORDER BY r.opened_at DESC LIMIT 30`,
        [branch, user.role === "driver" ? user.id : null],
      )
    ).rows;
    return {
      runs: rows,
      enabled:
        process.env.NODE_ENV !== "production" ||
        process.env.EASYGAS_FIELD_OPERATIONS_ENABLED === "true",
    };
  }
  if (
    process.env.NODE_ENV === "production" &&
    process.env.EASYGAS_FIELD_OPERATIONS_ENABLED !== "true"
  )
    throw new AppError(
      503,
      "Field operations require operational release approval.",
    );
  if (action === "daily.refill.record") {
    allow(user, ["driver"]);
    const d = z
      .object({
        orderId: uid,
        version: z.number().int().nonnegative(),
        readings: z
          .array(z.object({ beforeKg: kg, afterKg: kg }).strict())
          .min(1)
          .max(20),
      })
      .strict()
      .parse(input);
    const o = await one(tx, "SELECT * FROM orders WHERE id=$1 FOR UPDATE", [
      d.orderId,
    ]);
    if (!o || o.driver_id !== user.id || o.branch_id !== user.branch_id)
      throw new AppError(404, "Assigned order not found.");
    if (
      o.status !== "out_for_delivery" ||
      Number(o.tracking_version) !== d.version
    )
      throw new AppError(
        409,
        "The order changed. Refresh before recording the refill.",
      );
    const attempt = await one(
      tx,
      "SELECT * FROM delivery_attempts WHERE order_id=$1 ORDER BY assignment_version DESC LIMIT 1 FOR UPDATE",
      [o.id],
    );
    if (
      !attempt ||
      attempt.driver_id !== user.id ||
      attempt.state !== "arrived"
    )
      throw new AppError(
        409,
        "Confirm arrival at this customer before recording scale readings.",
      );
    await fulfilmentReady(tx, o);
    const a = await dailyAllocation(tx, o.id);
    if (!a || a.state !== "allocated" || a.driver_id !== user.id)
      throw new AppError(
        409,
        "This order needs an active daily gas allocation. Contact the office.",
      );
    const r = await one(
      tx,
      "SELECT r.* FROM daily_delivery_runs r JOIN driver_trips t ON t.id=r.trip_id AND t.ended_at IS NULL WHERE r.id=$1 AND r.state='active' FOR UPDATE OF r",
      [a.run_id],
    );
    if (!r)
      throw new AppError(
        409,
        "The delivery day has ended. Contact the office.",
      );
    const readings = d.readings.map((x) => ({
      beforeGrams: mass(x.beforeKg),
      afterGrams: mass(x.afterKg),
    }));
    if (readings.some((x) => x.afterGrams <= x.beforeGrams))
      throw new AppError(
        400,
        "Weight after filling must be greater than weight before filling.",
      );
    const supplied = readings.reduce(
      (n, x) => n + x.afterGrams - x.beforeGrams,
      0,
    );
    if (supplied !== Number(a.grams))
      throw new AppError(
        409,
        `These readings show ${supplied / 1000} kg added; this customer paid for ${Number(a.grams) / 1000} kg. Check the actual readings or contact the office. Delivery is not completed.`,
      );
    const stock = await one(
      tx,
      "UPDATE gas_stock SET grams=grams-$1,reserved_grams=reserved_grams-$1 WHERE branch_id=$2 AND grams>=$1 AND reserved_grams>=$1 RETURNING branch_id",
      [supplied, r.branch_id],
    );
    if (!stock)
      throw new AppError(409, "Gas stock changed. Contact the office.");
    await tx.query(
      "INSERT INTO daily_delivery_refills(id,allocation_id,order_id,attempt_id,run_id,actor_id,readings,supplied_grams) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
      [
        id(),
        a.id,
        o.id,
        attempt.id,
        r.id,
        user.id,
        JSON.stringify(readings),
        supplied,
      ],
    );
    await tx.query(
      "UPDATE daily_delivery_allocations SET state='supplied',supplied_grams=grams WHERE id=$1",
      [a.id],
    );
    await tx.query(
      "UPDATE daily_delivery_runs SET supplied_grams=supplied_grams+$1,committed_grams=committed_grams-$1,version=version+1 WHERE id=$2",
      [supplied, r.id],
    );
    await tx.query(
      "INSERT INTO gas_stock_movements(id,branch_id,grams,kind,reference,actor_id,reason) VALUES($1,$2,$3,'fulfilled',$4,$5,'Actual scale-measured refill')",
      [id(), r.branch_id, -supplied, "daily:" + a.id + ":supply", user.id],
    );
    await audit(tx, user, action, o.id, "success", {
      runId: r.id,
      readings,
      suppliedGrams: supplied,
      attemptId: attempt.id,
    });
    return {
      ok: true,
      suppliedKg: supplied / 1000,
      message:
        "Gas supplied recorded. Take the refill photo, then complete delivery.",
    };
  }
  allow(user, ["owner", "manager"]);
  enforceStaffPrivilege(user, "dispatch.centre");
  recentVerification(user);
  if (action === "daily.start") {
    const d = z
      .object({
        driverId: uid,
        vehicleId: uid,
        openingKg: kg.refine((n) => n > 0),
        scaleReference: z.string().trim().max(100).default(""),
        startOdometer: z.number().finite().min(0).max(10000000).optional(),
      })
      .strict()
      .parse(input);
    const driver = await one(
      tx,
      "SELECT * FROM users WHERE id=$1 AND role='driver' AND active FOR UPDATE",
      [d.driverId],
    );
    if (!driver) throw new AppError(404, "Driver not found.");
    allow(user, ["owner", "manager"], driver.branch_id);
    if (
      !(await one(
        tx,
        "SELECT id FROM branches WHERE id=$1 AND active FOR UPDATE",
        [driver.branch_id],
      ))
    )
      throw new AppError(409, "The driver branch is inactive.");
    const vehicle = await one(
      tx,
      "SELECT * FROM driver_vehicles WHERE id=$1 AND branch_id=$2 AND active AND lpg_suitable FOR UPDATE",
      [d.vehicleId, driver.branch_id],
    );
    if (!vehicle || mass(d.openingKg) > Number(vehicle.capacity_grams))
      throw new AppError(
        409,
        "Choose a suitable vehicle and an opening gas weight within its capacity.",
      );
    if (
      await one(
        tx,
        "SELECT id FROM daily_delivery_runs WHERE branch_id=$1 AND state='active'",
        [driver.branch_id],
      )
    )
      throw new AppError(
        409,
        "A delivery day is already open for this branch. Refresh today’s run.",
      );
    const trips = (
      await tx.query(
        "SELECT * FROM driver_trips WHERE (driver_id=$1 OR vehicle_id=$2) AND ended_at IS NULL FOR UPDATE",
        [driver.id, vehicle.id],
      )
    ).rows;
    if (
      trips.some(
        (t) => t.driver_id !== driver.id || t.vehicle_id !== vehicle.id,
      )
    )
      throw new AppError(
        409,
        "The driver or vehicle is on another trip. Reconcile that trip first.",
      );
    let trip = trips[0];
    if (
      trip &&
      (await one(
        tx,
        "SELECT id FROM bulk_lpg_loads WHERE trip_id=$1 UNION ALL SELECT id FROM vehicle_product_loads WHERE trip_id=$1 AND state<>'reconciled'",
        [trip.id],
      ))
    )
      throw new AppError(
        409,
        "Reconcile the earlier vehicle custody before starting this daily run.",
      );
    if (!trip) {
      if (d.startOdometer === undefined)
        throw new AppError(
          400,
          "Enter the starting odometer for this vehicle.",
        );
      trip = { id: id() };
      await tx.query(
        "INSERT INTO driver_trips(id,driver_id,vehicle_id,branch_id,start_odometer,location_consent) VALUES($1,$2,$3,$4,$5,false)",
        [trip.id, driver.id, vehicle.id, driver.branch_id, d.startOdometer],
      );
    }
    if (!driver.driver_available) {
      enforceStaffPrivilege(user, "staff.driver.availability");
      await setDriverAvailability(
        tx,
        user,
        driver.id,
        true,
        "Office started the delivery day and confirmed driver on duty.",
      );
    }
    const opening = mass(d.openingKg),
      runId = id();
    let linked = 0;
    const orders = (
      await tx.query(
        `SELECT o.id,(SELECT sum(grams) FROM order_gas_lines g WHERE g.order_id=o.id) grams FROM orders o WHERE o.branch_id=$1 AND o.status IN ('placed','accepted','preparing','assigned') AND (o.driver_id IS NULL OR o.driver_id=$2) AND EXISTS(SELECT 1 FROM order_gas_lines g WHERE g.order_id=o.id) AND NOT EXISTS(SELECT 1 FROM order_items i WHERE i.order_id=o.id) AND NOT EXISTS(SELECT 1 FROM daily_delivery_allocations a WHERE a.order_id=o.id AND a.state<>'released') AND NOT EXISTS(SELECT 1 FROM bulk_lpg_allocations a WHERE a.order_id=o.id AND a.state IN ('allocated','dispensed')) ORDER BY o.created_at,o.id FOR UPDATE OF o`,
        [driver.branch_id, driver.id],
      )
    ).rows;
    const attach = orders.filter((o) => {
      const q = Number(o.grams);
      if (linked + q > opening) return false;
      linked += q;
      return true;
    });
    const stock = await one(
      tx,
      "UPDATE gas_stock SET reserved_grams=reserved_grams+$1 WHERE branch_id=$2 AND grams-reserved_grams>=$1 AND reserved_grams>=$3 RETURNING branch_id",
      [opening - linked, driver.branch_id, linked],
    );
    if (!stock)
      throw new AppError(
        409,
        "Opening gas exceeds recorded stock after other reservations. Review the actual gas receipts and outstanding orders.",
      );
    await tx.query(
      "INSERT INTO daily_delivery_runs(id,trip_id,branch_id,driver_id,vehicle_id,opening_grams,committed_grams,scale_reference,opened_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",
      [
        runId,
        trip.id,
        driver.branch_id,
        driver.id,
        vehicle.id,
        opening,
        linked,
        d.scaleReference,
        user.id,
      ],
    );
    for (const o of attach)
      await tx.query(
        "INSERT INTO daily_delivery_allocations(id,run_id,order_id,grams) VALUES($1,$2,$3,$4)",
        [id(), runId, o.id, o.grams],
      );
    await tx.query(
      "INSERT INTO daily_delivery_weights(id,run_id,kind,grams,actor_id) VALUES($1,$2,'opening',$3,$4)",
      [id(), runId, opening, user.id],
    );
    await audit(tx, user, action, runId, "success", {
      openingGrams: opening,
      tripId: trip.id,
      driverId: driver.id,
      vehicleId: vehicle.id,
      linkedOrders: attach.length,
    });
    return {
      id: runId,
      message: "Delivery day started. Assign paid orders as they arrive.",
    };
  }
  const d = z
    .object({
      runId: uid,
      version: z.number().int().positive(),
      kg: kg,
      reason: z.string().trim().max(1000).default(""),
      carryForward: z.boolean().default(false),
      endOdometer: z.number().finite().min(0).max(10000000).optional(),
    })
    .strict()
    .parse(input);
  const r = await one(
    tx,
    "SELECT * FROM daily_delivery_runs WHERE id=$1 FOR UPDATE",
    [d.runId],
  );
  if (!r) throw new AppError(404, "Delivery day not found.");
  allow(user, ["owner", "manager"], r.branch_id);
  if (r.state !== "active" || Number(r.version) !== d.version)
    throw new AppError(
      409,
      "The day’s gas figures changed. Refresh before saving.",
    );
  const vehicle = await one(
    tx,
    "SELECT capacity_grams FROM driver_vehicles WHERE id=$1",
    [r.vehicle_id],
  );
  if (action === "daily.add") {
    const n = mass(d.kg);
    if (
      n <= 0 ||
      Number(r.opening_grams) +
        Number(r.added_grams) -
        Number(r.supplied_grams) +
        n >
        Number(vehicle?.capacity_grams)
    )
      throw new AppError(
        400,
        "Enter a positive additional gas weight within the vehicle capacity.",
      );
    const row = await one(
      tx,
      "UPDATE gas_stock SET reserved_grams=reserved_grams+$1 WHERE branch_id=$2 AND grams-reserved_grams>=$1 RETURNING branch_id",
      [n, r.branch_id],
    );
    if (!row)
      throw new AppError(
        409,
        "Record the actual stock receipt first; additional gas exceeds available stock.",
      );
    await tx.query(
      "UPDATE daily_delivery_runs SET added_grams=added_grams+$1,version=version+1 WHERE id=$2",
      [n, r.id],
    );
    await tx.query(
      "INSERT INTO daily_delivery_weights(id,run_id,kind,grams,actor_id,reason) VALUES($1,$2,'addition',$3,$4,$5)",
      [id(), r.id, n, user.id, d.reason],
    );
    await audit(tx, user, action, r.id, "success", { grams: n });
    return { ok: true, message: "Additional gas recorded." };
  }
  if (action !== "daily.close")
    throw new AppError(400, "Unsupported daily action.");
  const actual = mass(d.kg),
    expected =
      Number(r.opening_grams) +
      Number(r.added_grams) -
      Number(r.supplied_grams),
    variance = actual - expected;
  if (actual > Number(vehicle?.capacity_grams))
    throw new AppError(
      400,
      "Closing gas exceeds vehicle capacity. Check the measured gas-only weight.",
    );
  if (variance !== 0 && (user.role !== "owner" || d.reason.length < 5))
    throw new AppError(
      409,
      "A weight difference requires one Admin confirmation and an explanation. Enter the actual measured closing weight.",
    );
  const unfinished = (
    await tx.query(
      "SELECT a.*,o.status FROM daily_delivery_allocations a JOIN orders o ON o.id=a.order_id WHERE a.run_id=$1 AND a.state IN ('allocated','supplied') ORDER BY a.order_id FOR UPDATE OF a,o",
      [r.id],
    )
  ).rows;
  if (unfinished.some((a) => Number(a.supplied_grams) > 0))
    throw new AppError(
      409,
      "Complete the photo and delivery for supplied orders before closing the day.",
    );
  if (unfinished.length && !d.carryForward)
    throw new AppError(
      409,
      "Choose carry forward for unfinished orders, or complete them before closing.",
    );
  if (
    await one(
      tx,
      "SELECT id FROM vehicle_product_loads WHERE trip_id=$1 AND state<>'reconciled' UNION ALL SELECT id FROM bulk_lpg_loads WHERE trip_id=$1 AND state<>'reconciled'",
      [r.trip_id],
    )
  )
    throw new AppError(
      409,
      "Reconcile the vehicle’s other stock before closing.",
    );
  if (
    unfinished.length &&
    (await one(
      tx,
      "SELECT order_id FROM order_visit_links WHERE order_id=ANY($1::text[]) LIMIT 1",
      [unfinished.map((a) => a.order_id)],
    ))
  )
    throw new AppError(
      409,
      "Complete or cancel unfinished same-visit extra orders before closing; their original visit cannot be carried to another day.",
    );
  if (
    await one(
      tx,
      "SELECT id FROM orders WHERE driver_id=$1 AND status IN ('assigned','out_for_delivery') AND id<>ALL($2::text[]) LIMIT 1",
      [r.driver_id, unfinished.map((a) => a.order_id)],
    )
  )
    throw new AppError(
      409,
      "Resolve the driver’s other active deliveries before closing.",
    );
  if (
    unfinished.length &&
    (await one(
      tx,
      "SELECT order_id FROM order_items WHERE order_id=ANY($1::text[]) LIMIT 1",
      [unfinished.map((a) => a.order_id)],
    ))
  )
    throw new AppError(
      409,
      "Resolve physical product handovers or returns before carrying mixed orders forward.",
    );
  const trip = await one(
    tx,
    "SELECT * FROM driver_trips WHERE id=$1 FOR UPDATE",
    [r.trip_id],
  );
  if (!trip || trip.ended_at)
    throw new AppError(
      409,
      "The vehicle trip changed. Refresh before closing.",
    );
  if (
    d.endOdometer === undefined ||
    d.endOdometer < Number(trip.start_odometer)
  )
    throw new AppError(
      400,
      "Enter the actual ending odometer, at least the starting reading.",
    );
  let carry = 0;
  for (const a of unfinished) {
    carry += Number(a.grams);
    await tx.query(
      "UPDATE daily_delivery_allocations SET state='released' WHERE id=$1",
      [a.id],
    );
    await tx.query(
      "UPDATE delivery_attempts SET state='returned' WHERE order_id=$1 AND state IN ('assigned','picked_up','arrived','failed')",
      [a.order_id],
    );
    const next = ["assigned", "out_for_delivery"].includes(a.status)
      ? "preparing"
      : a.status;
    await tx.query(
      "UPDATE orders SET status=$2,driver_id=NULL WHERE id=$1 AND status NOT IN ('delivered','cancelled')",
      [a.order_id, next],
    );
    await tx.query(
      "INSERT INTO order_events(id,order_id,status,actor_id,note) VALUES($1,$2,$3,$4,'Unfilled order carried forward at daily close; payment retained and gas reservation preserved')",
      [id(), a.order_id, next, user.id],
    );
  }
  const stock = await one(
    tx,
    "UPDATE gas_stock SET grams=grams+$1,reserved_grams=reserved_grams-$2+$3 WHERE branch_id=$4 AND reserved_grams>=$2 AND grams+$1>=reserved_grams-$2+$3 RETURNING branch_id",
    [variance, expected, carry, r.branch_id],
  );
  if (!stock)
    throw new AppError(
      409,
      "Closing weight would consume stock promised to other orders. Review the actual weights and reservations.",
    );
  await tx.query(
    "INSERT INTO gas_stock_movements(id,branch_id,grams,kind,reference,actor_id,reason) VALUES($1,$2,$3,'released',$4,$5,$6)",
    [
      id(),
      r.branch_id,
      -expected + carry,
      "daily:" + r.id + ":close",
      user.id,
      d.reason || "Closing gas returned to available stock",
    ],
  );
  if (variance)
    await tx.query(
      "INSERT INTO gas_stock_movements(id,branch_id,grams,kind,reference,actor_id,reason) VALUES($1,$2,$3,'adjustment',$4,$5,$6)",
      [
        id(),
        r.branch_id,
        variance,
        "daily:" + r.id + ":variance",
        user.id,
        d.reason,
      ],
    );
  await tx.query(
    "INSERT INTO daily_delivery_weights(id,run_id,kind,grams,actor_id,reason) VALUES($1,$2,'closing',$3,$4,$5)",
    [id(), r.id, actual, user.id, d.reason],
  );
  await tx.query(
    "UPDATE daily_delivery_runs SET closing_grams=$1,variance_grams=$2,closed_by=$3,closed_at=now(),state='closed',committed_grams=0,version=version+1 WHERE id=$4",
    [actual, variance, user.id, r.id],
  );
  await tx.query(
    "UPDATE driver_trips SET ended_at=now(),end_odometer=$1,location_consent=false,version=version+1 WHERE id=$2",
    [d.endOdometer, trip.id],
  );
  await audit(tx, user, action, r.id, "success", {
    openingGrams: r.opening_grams,
    addedGrams: r.added_grams,
    suppliedGrams: r.supplied_grams,
    expectedGrams: expected,
    closingGrams: actual,
    varianceGrams: variance,
    reason: d.reason,
    carriedOrders: unfinished.map((a) => a.order_id),
  });
  return {
    ok: true,
    expectedKg: expected / 1000,
    closingKg: actual / 1000,
    varianceKg: variance / 1000,
    carriedOrders: unfinished.length,
    message: "Delivery day reconciled and closed.",
  };
}
