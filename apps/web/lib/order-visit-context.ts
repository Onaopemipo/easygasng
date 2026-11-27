import { allow, AppError, type Actor } from "./auth";
import { one, type SQL } from "./db";
import { canonicalRequest } from "./business-operation";

/** The caller supplies only a parent ID/version; customer, address, fee and driver are never client overrides. */
export async function activeVisit(
  tx: SQL,
  user: Actor,
  parentId: string,
  version?: number,
) {
  allow(user, ["owner", "manager"]);
  const parent = await one(tx, "SELECT * FROM orders WHERE id=$1 FOR UPDATE", [
    parentId,
  ]);
  if (!parent) throw new AppError(404, "Original order not found.");
  allow(user, ["owner", "manager"], parent.branch_id);
  if (version !== undefined && Number(parent.tracking_version) !== version)
    throw new AppError(
      409,
      "The original visit changed. Refresh and review the extra order.",
    );
  if (
    !["assigned", "out_for_delivery"].includes(parent.status) ||
    !parent.driver_id
  )
    throw new AppError(
      409,
      "Extra orders require a driver assigned to an active visit. A new visit uses normal delivery pricing.",
    );
  if (
    await one(tx, "SELECT order_id FROM order_visit_links WHERE order_id=$1", [
      parent.id,
    ])
  )
    throw new AppError(
      409,
      "Open the original visit order to add another extra order.",
    );
  const driver = await one(
    tx,
    "SELECT id,name FROM users WHERE id=$1 AND role='driver' AND active AND driver_available AND branch_id=$2 FOR UPDATE",
    [parent.driver_id, parent.branch_id],
  );
  const trip = await one(
    tx,
    "SELECT t.id,t.vehicle_id,v.label FROM driver_trips t JOIN driver_vehicles v ON v.id=t.vehicle_id WHERE t.driver_id=$1 AND t.ended_at IS NULL AND t.branch_id=$2 AND v.branch_id=$2 AND v.active AND v.lpg_suitable AND v.capacity_grams>0 FOR UPDATE OF t,v",
    [parent.driver_id, parent.branch_id],
  );
  const attempt = await one(
    tx,
    "SELECT id FROM delivery_attempts WHERE order_id=$1 AND driver_id=$2 AND state IN ('assigned','picked_up','arrived') ORDER BY assignment_version DESC LIMIT 1 FOR UPDATE",
    [parent.id, parent.driver_id],
  );
  if (!driver || !trip || !attempt)
    throw new AppError(
      409,
      "The original driver needs an available active suitable-vehicle trip and a current visit before an extra order can be linked.",
    );
  return { parent, driver, trip };
}

/** Recheck a linked extra order at every assignment/pickup/handover, including legacy transitions. */
export async function verifyVisitDriver(tx: SQL, order: any) {
  const link = await one(
    tx,
    "SELECT * FROM order_visit_links WHERE order_id=$1",
    [order.id],
  );
  if (!link) return;
  const parent = await one(tx, "SELECT * FROM orders WHERE id=$1", [
    link.parent_order_id,
  ]);
  const trip = await one(
    tx,
    "SELECT id FROM driver_trips WHERE id=$1 AND driver_id=$2 AND branch_id=$3 AND ended_at IS NULL",
    [link.trip_id, link.driver_id, order.branch_id],
  );
  if (
    !parent ||
    !trip ||
    parent.customer_id !== order.customer_id ||
    parent.branch_id !== order.branch_id ||
    canonicalRequest(parent.address) !== canonicalRequest(order.address) ||
    parent.delivery_date !== order.delivery_date ||
    parent.delivery_window !== order.delivery_window ||
    parent.driver_id !== link.driver_id ||
    !["assigned", "out_for_delivery", "delivered"].includes(parent.status) ||
    (order.driver_id && order.driver_id !== link.driver_id) ||
    Number(order.delivery_kobo) !== 0
  )
    throw new AppError(
      409,
      "This extra order belongs to its original customer, address, driver and trip. Resolve the original visit before dispatching; a different visit requires a normally priced order.",
      "SAME_VISIT_CHANGED",
    );
}
