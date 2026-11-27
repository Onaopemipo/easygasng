import { availableTanker } from "./tanker-orders";
import { one, type SQL } from "./db";
import { AssignmentRequirementError } from "./assignment-requirement-error";
import {
  assignmentIssue,
  type AssignmentIssue,
} from "../../../packages/business-rules/src/assignment-requirements";
export async function vehicleReady(
  tx: SQL,
  driverId: string,
  orderId: string,
  branchId: string,
) {
  await tx.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [driverId]);
  const t = await one(
    tx,
    "SELECT t.*,v.capacity_grams,v.lpg_suitable,v.active,v.branch_id AS vehicle_branch_id FROM driver_trips t JOIN driver_vehicles v ON v.id=t.vehicle_id WHERE t.driver_id=$1 AND t.ended_at IS NULL FOR UPDATE OF t,v",
    [driverId],
  );
  if (!t)
    throw new AssignmentRequirementError([
      assignmentIssue("DRIVER_TRIP_REQUIRED"),
    ]);
  const issues: AssignmentIssue[] = [];
  if (t.branch_id !== branchId)
    issues.push(assignmentIssue("TRIP_BRANCH_MISMATCH"));
  if (!t.active) issues.push(assignmentIssue("VEHICLE_INACTIVE"));
  if (!t.lpg_suitable) issues.push(assignmentIssue("VEHICLE_LPG_UNVERIFIED"));
  if (t.vehicle_branch_id !== branchId)
    issues.push(assignmentIssue("VEHICLE_BRANCH_MISMATCH"));
  if (issues.length) throw new AssignmentRequirementError(issues);
  const grams = Number(
    (
      await one(
        tx,
        "SELECT COALESCE(sum(x.grams),0) AS n FROM (SELECT o.id,(SELECT COALESCE(sum(g.grams),0) FROM order_gas_lines g WHERE g.order_id=o.id)+(SELECT COALESCE(sum(i.quantity*i.gas_grams_per_unit),0) FROM order_items i WHERE i.order_id=o.id AND i.gas_grams_per_unit IS NOT NULL) AS grams FROM orders o WHERE (o.driver_id=$1 AND o.status IN ('assigned','out_for_delivery')) OR o.id=$2) x",
        [driverId, orderId],
      )
    )?.n ?? 0,
  );
  let extraCustody = Number(
    (
      await one(
        tx,
        "SELECT COALESCE(sum(l.buffer_grams+(SELECT COALESCE(sum(e.grams-(SELECT COALESCE(sum(cl.grams),0) FROM doorstep_cylinder_lines cl WHERE cl.amendment_id=e.amendment_id AND cl.state='dispensed')),0) FROM doorstep_execution e WHERE e.load_id=l.id AND e.state='reserved')),0) AS n FROM bulk_lpg_loads l WHERE l.trip_id=$1 AND l.state<>'reconciled'",
        [t.id],
      )
    )?.n ?? 0,
  );
  const allocation = await one(
    tx,
    "SELECT a.*,l.trip_id FROM bulk_lpg_allocations a JOIN bulk_lpg_loads l ON l.id=a.load_id WHERE a.order_id=$1 AND a.state IN ('allocated','dispensed')",
    [orderId],
  );
  if (allocation && allocation.trip_id !== t.id)
    throw new AssignmentRequirementError([
      {
        code: "TANKER_CUSTODY_MISMATCH",
        title: "This order’s gas is reserved on another tanker",
        resolution:
          "Choose the driver on the tanker carrying this order’s gas, or reconcile the existing tank allocation before changing vehicles.",
        responsible: "Dispatch",
        help: "fleet",
      },
    ]);
  const requested = Number(
    (await one(
      tx,
      "SELECT COALESCE(sum(grams),0) n FROM order_gas_lines WHERE order_id=$1",
      [orderId],
    ))!.n,
  );
  if (
    !allocation &&
    requested &&
    (await availableTanker(tx, branchId, requested, driverId))
  )
    extraCustody -= requested;
  if (grams + extraCustody > Number(t.capacity_grams))
    throw new AssignmentRequirementError([
      {
        code: "VEHICLE_CAPACITY_EXCEEDED",
        title: `Vehicle gas capacity exceeded: ${(grams + extraCustody) / 1000} kg required, ${Number(t.capacity_grams) / 1000} kg approved`,
        resolution:
          "This includes the order, other assigned deliveries and extra physical LPG custody. Choose another eligible vehicle/driver, or reconcile existing deliveries and custody before refreshing. Do not increase the approved capacity just to clear the check.",
        responsible: "Dispatch / authorised operations staff",
        help: "fleet",
      },
    ]);
  return t;
}
