import { z } from "zod";
import { allow, AppError, id, recentVerification, type Actor } from "./auth";
import { one, type SQL } from "./db";
import { audit } from "./governance";
import { enforceStaffPrivilege } from "./staff-privileges";
import { requiredBusinessOperation } from "./business-operation";
import { setDriverAvailability } from "./driver-availability";

export function dispatchVehicleWritesEnabled() {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.EASYGAS_FIELD_OPERATIONS_ENABLED === "true"
  );
}

/** Staff authority stays with the real actor; no driver session or GPS consent is created. */
export async function dispatchVehicle(
  tx: SQL,
  user: Actor,
  action: string,
  input: unknown,
) {
  allow(user, ["owner", "manager"]);
  enforceStaffPrivilege(user, "dispatch.centre");
  if (action === "dispatch.vehicle.options") {
    const d = z
      .object({ branch: z.string().max(100).default("") })
      .strict()
      .parse(input ?? {});
    if (d.branch) allow(user, ["owner", "manager"], d.branch);
    const branch = d.branch || (user.role === "owner" ? "" : user.branch_id);
    const branches = (
      await tx.query(
        "SELECT id,name,active FROM branches WHERE ($1::boolean OR id=$2) ORDER BY name,id",
        [user.role === "owner", user.branch_id],
      )
    ).rows;
    if (d.branch && !branches.some((b) => b.id === d.branch))
      throw new AppError(404, "Branch not found.");
    const drivers = (
      await tx.query(
        `SELECT u.id,u.name,u.branch_id,u.driver_available,
      t.id AS trip_id,v.label AS vehicle_label FROM users u
      LEFT JOIN driver_trips t ON t.driver_id=u.id AND t.ended_at IS NULL
      LEFT JOIN driver_vehicles v ON v.id=t.vehicle_id
      WHERE u.role='driver' AND u.active AND ($1::boolean OR u.branch_id=$2)
      AND ($3='' OR u.branch_id=$3) ORDER BY u.name,u.id`,
        [user.role === "owner", user.branch_id, branch],
      )
    ).rows;
    const vehicles = (
      await tx.query(
        `SELECT v.id,v.label,v.branch_id,v.capacity_grams,t.id AS trip_id
      FROM driver_vehicles v JOIN branches b ON b.id=v.branch_id AND b.active
      LEFT JOIN driver_trips t ON t.vehicle_id=v.id AND t.ended_at IS NULL
      WHERE v.active AND v.lpg_suitable AND v.capacity_grams>0
      AND ($1::boolean OR v.branch_id=$2) AND ($3='' OR v.branch_id=$3) ORDER BY v.label,v.id`,
        [user.role === "owner", user.branch_id, branch],
      )
    ).rows;
    return {
      branches,
      drivers,
      vehicles,
      writesEnabled: dispatchVehicleWritesEnabled(),
      canSetAvailability: user.privilege_overrides?.["staff.manage"] !== "deny",
    };
  }
  if (action !== "dispatch.vehicle.assign")
    throw new AppError(400, "Unsupported vehicle action.");
  recentVerification(user);
  if (!dispatchVehicleWritesEnabled())
    throw new AppError(
      503,
      "Field operations require operational release approval.",
    );
  if ((input as any)?.makeAvailable === true)
    enforceStaffPrivilege(user, "staff.driver.availability");
  return requiredBusinessOperation(tx, user, action, input, async (clean) => {
    const d = z
      .object({
        driverId: z.string().uuid(),
        vehicleId: z.string().uuid(),
        startOdometer: z.number().finite().nonnegative().max(10000000),
        makeAvailable: z.boolean(),
      })
      .strict()
      .parse(clean);
    if (d.makeAvailable)
      enforceStaffPrivilege(user, "staff.driver.availability");
    // Match driver self-start lock order, so admin/self-start and vehicle races serialize.
    const driver = await one(
      tx,
      "SELECT id,name,role,branch_id,active,driver_available FROM users WHERE id=$1 FOR UPDATE",
      [d.driverId],
    );
    if (!driver) throw new AppError(404, "Driver not found.");
    allow(user, ["owner", "manager"], driver.branch_id);
    if (driver.role !== "driver" || !driver.active)
      throw new AppError(409, "Choose an active driver account.");
    if (
      !(await one(
        tx,
        "SELECT id FROM branches WHERE id=$1 AND active FOR UPDATE",
        [driver.branch_id],
      ))
    )
      throw new AppError(409, "Choose a driver in an active branch.");
    if (
      await one(
        tx,
        "SELECT id FROM driver_trips WHERE driver_id=$1 AND ended_at IS NULL",
        [driver.id],
      )
    )
      throw new AppError(
        409,
        "This driver already has an active trip. Review and reconcile that trip before assigning another vehicle.",
      );
    // Availability uses its existing role/branch/audit controls, explicitly requested by the checkbox.
    if (d.makeAvailable && !driver.driver_available)
      await setDriverAvailability(
        tx,
        user,
        driver.id,
        true,
        "Dispatch confirmed this driver is on duty while assigning a vehicle.",
      );
    const vehicle = await one(
      tx,
      "SELECT * FROM driver_vehicles WHERE id=$1 FOR UPDATE",
      [d.vehicleId],
    );
    if (
      !vehicle ||
      vehicle.branch_id !== driver.branch_id ||
      !vehicle.active ||
      !vehicle.lpg_suitable ||
      Number(vehicle.capacity_grams) <= 0
    )
      throw new AppError(
        409,
        "Choose an active LPG-suitable vehicle with approved capacity in the driver's branch.",
      );
    if (
      await one(
        tx,
        "SELECT id FROM driver_trips WHERE vehicle_id=$1 AND ended_at IS NULL",
        [vehicle.id],
      )
    )
      throw new AppError(
        409,
        "This vehicle is already on an active trip. Choose another vehicle or reconcile the existing trip.",
      );
    const tripId = id();
    await tx.query(
      "INSERT INTO driver_trips(id,driver_id,vehicle_id,branch_id,start_odometer,location_consent) VALUES($1,$2,$3,$4,$5,false)",
      [tripId, driver.id, vehicle.id, driver.branch_id, d.startOdometer],
    );
    await audit(tx, user, action, tripId, "success", {
      driverId: driver.id,
      vehicleId: vehicle.id,
      branchId: driver.branch_id,
      startOdometer: d.startOdometer,
      makeAvailable: d.makeAvailable,
      locationConsent: false,
    });
    return {
      id: tripId,
      driverId: driver.id,
      vehicleId: vehicle.id,
      available: d.makeAvailable || driver.driver_available,
      message: `${vehicle.label} assigned to ${driver.name}. Trip started. Location sharing is off.`,
    };
  });
}
