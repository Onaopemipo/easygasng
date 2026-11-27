import { z } from "zod";
import { allow, AppError, id, recentVerification, type Actor } from "./auth";
import { one, type SQL } from "./db";
import { audit } from "./governance";
import { enforceStaffPrivilege } from "./staff-privileges";
import { requiredBusinessOperation } from "./business-operation";
import { dispatchVehicleWritesEnabled } from "./dispatch-vehicle";

// The driver's existing trip.end checks these same product/LPG/outbound records.
// Admin closure also refuses assigned deliveries and held failed-delivery custody.
export async function tripReconciliation(tx: SQL, trip: any) {
  const counts = await one(
    tx,
    `SELECT
    (SELECT count(*)::int FROM vehicle_product_loads WHERE trip_id=$1 AND state<>'reconciled') AS products,
    ((SELECT count(*)::int FROM bulk_lpg_loads WHERE trip_id=$1 AND state<>'reconciled')+(SELECT count(*)::int FROM daily_delivery_runs WHERE trip_id=$1 AND state='active')) AS lpg,
    (SELECT count(*)::int FROM orders WHERE (driver_id=$2 AND status IN ('assigned','out_for_delivery')) OR (status NOT IN ('delivered','cancelled') AND EXISTS(SELECT 1 FROM order_visit_links l WHERE l.order_id=orders.id AND l.trip_id=$1))) AS deliveries,
    (SELECT count(*)::int FROM delivery_attempts WHERE driver_id=$2 AND picked_up_at IS NOT NULL AND state NOT IN ('returned','delivered')) AS held`,
    [trip.id, trip.driver_id],
  );
  const blockers = [
    {
      code: "PRODUCT_RECONCILIATION",
      count: Number(counts!.products),
      title: "Return and reconcile vehicle product manifests",
      destination: "manifests",
    },
    {
      code: "LPG_RECONCILIATION",
      count: Number(counts!.lpg),
      title: "Receive and reconcile all bulk LPG custody",
      destination: "lpg",
    },
    {
      code: "ACTIVE_DELIVERIES",
      count: Number(counts!.deliveries),
      title: "Complete or safely reassign active deliveries",
      destination: "tracking",
    },
    {
      code: "HELD_DELIVERY_CUSTODY",
      count: Number(counts!.held),
      title: "Receive and reconcile held delivery goods and cylinders",
      destination: "tracking",
    },
  ].filter((b) => b.count > 0);
  return { clear: blockers.length === 0, blockers };
}

async function readTrip(tx: SQL, user: Actor, tripId: string) {
  const t = await one(
    tx,
    `SELECT t.*,u.name AS driver_name,u.active AS driver_active,u.branch_id AS driver_branch,
    v.label AS vehicle_label,b.name AS branch_name,b.active AS branch_active
    FROM driver_trips t JOIN users u ON u.id=t.driver_id JOIN driver_vehicles v ON v.id=t.vehicle_id JOIN branches b ON b.id=t.branch_id WHERE t.id=$1`,
    [tripId],
  );
  if (!t) throw new AppError(404, "Trip not found.");
  allow(user, ["owner", "manager"], t.branch_id);
  return t;
}

export async function dispatchTrip(
  tx: SQL,
  user: Actor,
  action: string,
  input: unknown,
) {
  allow(user, ["owner", "manager"]);
  enforceStaffPrivilege(user, "dispatch.centre");
  if (action === "dispatch.trip.options") {
    z.object({})
      .strict()
      .parse(input ?? {});
    const scope = [user.role === "owner", user.branch_id];
    const branches = (
      await tx.query(
        "SELECT id,name,active FROM branches WHERE ($1::boolean OR id=$2) ORDER BY name,id",
        scope,
      )
    ).rows;
    const trips = (
      await tx.query(
        `SELECT t.id,t.driver_id,t.vehicle_id,t.branch_id,t.start_odometer,t.version,t.started_at,
      u.name AS driver_name,v.label AS vehicle_label FROM driver_trips t JOIN users u ON u.id=t.driver_id
      JOIN driver_vehicles v ON v.id=t.vehicle_id WHERE t.ended_at IS NULL AND ($1::boolean OR t.branch_id=$2) ORDER BY u.name,t.started_at,t.id`,
        scope,
      )
    ).rows;
    const vehicles = (
      await tx.query(
        `SELECT v.id,v.label,v.branch_id,v.capacity_grams FROM driver_vehicles v
      JOIN branches b ON b.id=v.branch_id AND b.active WHERE v.active AND v.lpg_suitable AND v.capacity_grams>0
      AND ($1::boolean OR v.branch_id=$2) AND NOT EXISTS(SELECT 1 FROM driver_trips t WHERE t.vehicle_id=v.id AND t.ended_at IS NULL) ORDER BY v.label,v.id`,
        scope,
      )
    ).rows;
    return {
      branches,
      trips,
      vehicles,
      writesEnabled: dispatchVehicleWritesEnabled(),
    };
  }
  if (action === "dispatch.trip.review") {
    const d = z.object({ tripId: z.string().uuid() }).strict().parse(input);
    const trip = await readTrip(tx, user, d.tripId);
    return {
      trip,
      reconciliation: await tripReconciliation(tx, trip),
      writesEnabled: dispatchVehicleWritesEnabled(),
      canChange:
        trip.driver_active &&
        trip.branch_active &&
        trip.driver_branch === trip.branch_id,
    };
  }
  if (!["dispatch.trip.end", "dispatch.trip.change"].includes(action))
    throw new AppError(400, "Unsupported trip action.");
  recentVerification(user);
  if (!dispatchVehicleWritesEnabled())
    throw new AppError(
      503,
      "Field operations require operational release approval.",
    );
  return requiredBusinessOperation(tx, user, action, input, async (clean) => {
    const base = z.object({
      tripId: z.string().uuid(),
      version: z.number().int().nonnegative(),
      endOdometer: z.number().finite().nonnegative().max(10000000),
    });
    const change = action === "dispatch.trip.change";
    const d = (
      change
        ? base.extend({
            vehicleId: z.string().uuid(),
            startOdometer: z.number().finite().nonnegative().max(10000000),
          })
        : base
    )
      .strict()
      .parse(clean) as {
      tripId: string;
      version: number;
      endOdometer: number;
      vehicleId?: string;
      startOdometer?: number;
    };
    const observed = await readTrip(tx, user, d.tripId);
    // Fail early for open custody; final checks run again after the trip lock.
    const initial = await tripReconciliation(tx, observed);
    if (!initial.clear)
      throw new AppError(
        409,
        initial.blockers.map((b) => b.title).join(". ") + ".",
        "TRIP_RECONCILIATION_REQUIRED",
      );
    await tx.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [
      observed.driver_id,
    ]);
    const t = await one(
      tx,
      "SELECT * FROM driver_trips WHERE id=$1 FOR UPDATE",
      [d.tripId],
    );
    if (!t || t.ended_at || Number(t.version) !== d.version)
      throw new AppError(
        409,
        "Trip changed or already ended. Refresh the trip before continuing.",
        "TRIP_VERSION_CONFLICT",
      );
    allow(user, ["owner", "manager"], t.branch_id);
    if (d.endOdometer < Number(t.start_odometer))
      throw new AppError(
        400,
        "Ending odometer must be at least the trip's starting reading.",
      );
    const final = await tripReconciliation(tx, t);
    if (!final.clear)
      throw new AppError(
        409,
        final.blockers.map((b) => b.title).join(". ") + ".",
        "TRIP_RECONCILIATION_REQUIRED",
      );
    let replacement: any = null;
    if (change) {
      if (d.vehicleId === t.vehicle_id)
        throw new AppError(400, "Choose a different vehicle.");
      const driver = await one(
        tx,
        "SELECT role,active,branch_id FROM users WHERE id=$1",
        [t.driver_id],
      );
      if (
        !driver?.active ||
        driver.role !== "driver" ||
        driver.branch_id !== t.branch_id
      )
        throw new AppError(
          409,
          "An active driver in the trip's branch is required to change vehicles.",
        );
      // Vehicle registration/branch changes and starts remain protected by canonical rows.
      const branch = await one(
        tx,
        "SELECT id FROM branches WHERE id=$1 AND active FOR UPDATE",
        [t.branch_id],
      );
      if (!branch)
        throw new AppError(
          409,
          "Choose an active branch before changing vehicles.",
        );
      replacement = await one(
        tx,
        "SELECT * FROM driver_vehicles WHERE id=$1 FOR UPDATE",
        [d.vehicleId],
      );
      if (
        !replacement ||
        replacement.branch_id !== t.branch_id ||
        !replacement.active ||
        !replacement.lpg_suitable ||
        Number(replacement.capacity_grams) <= 0
      )
        throw new AppError(
          409,
          "Choose an active LPG-suitable vehicle with approved capacity in the same branch.",
        );
      if (
        await one(
          tx,
          "SELECT id FROM driver_trips WHERE vehicle_id=$1 AND ended_at IS NULL",
          [replacement.id],
        )
      )
        throw new AppError(
          409,
          "The replacement vehicle is already on a trip. Refresh and choose another vehicle.",
        );
    }
    await tx.query(
      "UPDATE driver_trips SET ended_at=now(),end_odometer=$1,location_consent=false,version=version+1 WHERE id=$2",
      [d.endOdometer, t.id],
    );
    const nextId = change ? id() : null;
    if (change) {
      await tx.query(
        "INSERT INTO driver_trips(id,driver_id,vehicle_id,branch_id,start_odometer,location_consent) VALUES($1,$2,$3,$4,$5,false)",
        [nextId, t.driver_id, replacement.id, t.branch_id, d.startOdometer],
      );
      await audit(
        tx,
        user,
        "dispatch.trip.vehicle_started",
        nextId!,
        "success",
        {
          previousTripId: t.id,
          driverId: t.driver_id,
          vehicleId: replacement.id,
          locationConsent: false,
        },
      );
    }
    await audit(tx, user, action, t.id, "success", {
      driverId: t.driver_id,
      oldVehicleId: t.vehicle_id,
      endOdometer: d.endOdometer,
      newTripId: nextId,
      newVehicleId: replacement?.id ?? null,
      startOdometer: d.startOdometer ?? null,
    });
    return {
      id: t.id,
      newTripId: nextId,
      stopLocation: true,
      message: change
        ? `Vehicle changed to ${replacement.label}. Previous trip ended and the new trip started. Location sharing is off.`
        : "Trip ended. The vehicle is now available; driver availability is unchanged.",
    };
  });
}
