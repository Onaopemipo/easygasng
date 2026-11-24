import { z } from "zod";
import { allow, AppError, type Actor } from "./auth";
import { one, type SQL } from "./db";

/** Read-only branch prerequisites. This is never an order eligibility or release approval. */
export async function dispatchSetup(tx: SQL, user: Actor, input: unknown) {
  allow(user, ["owner", "manager"]);
  const { branch: requested } = z
    .object({ branch: z.string().max(100).default("") })
    .strict()
    .parse(input ?? {});
  if (requested && user.role !== "owner" && requested !== user.branch_id)
    throw new AppError(403, "Branch access denied.");
  const branches = (
    await tx.query(
      "SELECT id,name,active FROM branches WHERE ($1::boolean OR id=$2) ORDER BY name,id",
      [user.role === "owner", user.branch_id],
    )
  ).rows;
  const branchId =
    requested ||
    (user.role !== "owner"
      ? user.branch_id
      : branches.length === 1
        ? branches[0].id
        : "");
  const branch = branches.find((b) => b.id === branchId) ?? null;
  if (requested && !branch) throw new AppError(404, "Branch not found.");
  const result = {
    branches,
    branch,
    checkedAt: new Date().toISOString(),
    canReviewDrivers: user.privilege_overrides?.["staff.manage"] !== "deny",
    canRegisterVehicle: user.role === "owner",
    canReviewRelease: user.role === "owner",
  };
  if (!branch) return { ...result, counts: null, checks: null };
  const drivers = await one(
    tx,
    `SELECT count(*)::int total,
    count(*) FILTER(WHERE u.active AND u.driver_available)::int available,
    count(*) FILTER(WHERE u.active AND u.driver_available AND EXISTS (
      SELECT 1 FROM driver_trips t JOIN driver_vehicles v ON v.id=t.vehicle_id
      WHERE t.driver_id=u.id AND t.ended_at IS NULL AND t.branch_id=$1
        AND v.branch_id=$1 AND v.active AND v.lpg_suitable AND v.capacity_grams>0
    ))::int on_trip FROM users u WHERE u.role='driver' AND u.branch_id=$1`,
    [branch.id],
  );
  const vehicles = await one(
    tx,
    `SELECT count(*)::int total,
    count(*) FILTER(WHERE active AND lpg_suitable AND capacity_grams>0)::int approved
    FROM driver_vehicles WHERE branch_id=$1`,
    [branch.id],
  );
  const settings = (
    await tx.query(
      "SELECT key,value FROM settings WHERE scope=$1 AND key IN ('delivery.enabled','delivery.capacity','delivery.windows')",
      [branch.id],
    )
  ).rows;
  const value = (key: string) => settings.find((s) => s.key === key)?.value;
  const capacity = Number(value("delivery.capacity"));
  const windows = value("delivery.windows");
  const coverage = await one(
    tx,
    `SELECT count(*)::int total FROM delivery_locations
    WHERE branch_id=$1 AND active AND visible AND NOT archived AND length(trim(coverage))>0`,
    [branch.id],
  );
  return {
    ...result,
    counts: {
      drivers: drivers!.total,
      availableDrivers: drivers!.available,
      driversOnTrips: drivers!.on_trip,
      vehicles: vehicles!.total,
      approvedVehicles: vehicles!.approved,
    },
    checks: {
      branchActive: branch.active,
      driversAvailable: drivers!.available > 0,
      vehiclesApproved: vehicles!.approved > 0,
      activeTrips: drivers!.on_trip > 0,
      deliveryEnabled: value("delivery.enabled") === true,
      deliveryCapacity: Number.isFinite(capacity) && capacity > 0,
      deliveryWindows: typeof windows === "string" && windows.split(",").some((window) => window.trim().length > 0),
      coverageConfigured: coverage!.total > 0,
      assignmentEnabled:
        process.env.EASYGAS_TRACKING_MUTATIONS_ENABLED !== "false" &&
        (process.env.NODE_ENV !== "production" ||
          process.env.EASYGAS_TRACKING_MUTATIONS_ENABLED === "true") &&
        (process.env.NODE_ENV !== "production" ||
          process.env.EASYGAS_FIELD_OPERATIONS_ENABLED === "true"),
    },
  };
}
