import { allow, AppError, type Actor } from "./auth";
import { one, type SQL } from "./db";
import { audit } from "./governance";

export function driverAvailabilityWritesEnabled() {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.EASYGAS_FIELD_OPERATIONS_ENABLED === "true"
  );
}

export async function setDriverAvailability(
  tx: SQL,
  actor: Actor,
  driverId: string,
  available: boolean,
  staffReason?: string,
) {
  if (!driverAvailabilityWritesEnabled())
    throw new AppError(
      503,
      "Driver mutations require operational release approval.",
    );
  const driver = await one(
    tx,
    "SELECT id,role,branch_id,active FROM users WHERE id=$1 FOR UPDATE",
    [driverId],
  );
  if (!driver) throw new AppError(404, "Driver account not found.");
  if (staffReason !== undefined) {
    allow(actor, ["owner", "manager"]);
    if (actor.role !== "owner" && driver.branch_id !== actor.branch_id)
      throw new AppError(403, "This record belongs to another branch.");
  } else if (
    actor.id !== driver.id ||
    actor.role !== "driver" ||
    !actor.driver_delivery_only ||
    actor.branch_id !== driver.branch_id
  ) {
    throw new AppError(403, "Open a verified delivery-only session first.");
  }
  if (driver.role !== "driver" || !driver.active)
    throw new AppError(
      409,
      "Only an active driver account can change dispatch availability.",
    );
  if (
    !(await one(
      tx,
      "SELECT id FROM branches WHERE id=$1 AND active FOR UPDATE",
      [driver.branch_id],
    ))
  )
    throw new AppError(
      409,
      "An active driver branch is required to change availability.",
    );
  if (
    !available &&
    (await one(
      tx,
      "SELECT id FROM orders WHERE driver_id=$1 AND status IN ('assigned','out_for_delivery') LIMIT 1",
      [driver.id],
    ))
  )
    throw new AppError(
      409,
      "Resolve active assignments with dispatch before marking this driver unavailable.",
    );

  await tx.query(
    "UPDATE users SET driver_available=$1,driver_availability_updated_at=now() WHERE id=$2",
    [available, driver.id],
  );
  await audit(tx, actor, "driver.availability.changed", driver.id, "success", {
    available,
    ...(staffReason !== undefined
      ? { reason: staffReason, source: "staff" }
      : {}),
  });
  return { available };
}
