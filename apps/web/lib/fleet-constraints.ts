import { one, type SQL } from "./db";
import { AppError } from "./auth";
export async function vehicleReady(
  tx: SQL,
  driverId: string,
  orderId: string,
  branchId: string,
) {
  await tx.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [driverId]);
  const t = await one(
    tx,
    "SELECT t.*,v.capacity_grams,v.lpg_suitable,v.active FROM driver_trips t JOIN driver_vehicles v ON v.id=t.vehicle_id WHERE t.driver_id=$1 AND t.ended_at IS NULL FOR UPDATE OF t,v",
    [driverId],
  );
  if (!t?.active || !t.lpg_suitable || t.branch_id !== branchId)
    throw new AppError(
      409,
      "Driver needs an active suitable vehicle trip in the fulfilment branch.",
    );
  const grams = Number(
    (
      await one(
        tx,
        "SELECT COALESCE(sum(x.grams),0) AS n FROM (SELECT o.id,(SELECT COALESCE(sum(g.grams),0) FROM order_gas_lines g WHERE g.order_id=o.id)+(SELECT COALESCE(sum(i.quantity*i.gas_grams_per_unit),0) FROM order_items i WHERE i.order_id=o.id AND i.gas_grams_per_unit IS NOT NULL) AS grams FROM orders o WHERE (o.driver_id=$1 AND o.status IN ('assigned','out_for_delivery')) OR o.id=$2) x",
        [driverId, orderId],
      )
    )?.n ?? 0,
  );
  const extraCustody = Number(
    (
      await one(
        tx,
        "SELECT COALESCE(sum(l.buffer_grams+(SELECT COALESCE(sum(e.grams-(SELECT COALESCE(sum(cl.grams),0) FROM doorstep_cylinder_lines cl WHERE cl.amendment_id=e.amendment_id AND cl.state='dispensed')),0) FROM doorstep_execution e WHERE e.load_id=l.id AND e.state='reserved')),0) AS n FROM bulk_lpg_loads l WHERE l.trip_id=$1 AND l.state<>'reconciled'",
        [t.id],
      )
    )?.n ?? 0,
  );
  if (grams + extraCustody > Number(t.capacity_grams))
    throw new AppError(409, "Vehicle gas capacity exceeded.");
  return t;
}
