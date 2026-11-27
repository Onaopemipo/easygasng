import { availableDaily, takeDaily, allocateDaily, dailyAllocation } from "./daily-delivery";
import { AppError, id, type Actor } from "./auth";
import { one, type SQL } from "./db";

/** Only measured, acknowledged, active tanker stock can be promised. */
export async function availableTanker(
  tx: SQL,
  branch: string,
  grams: number,
  driver?: string,
  lock = false,
) {
  const daily=await availableDaily(tx,branch,grams,driver,lock);if(daily)return daily;
  return one(
    tx,
    `SELECT l.*,t.driver_id FROM bulk_lpg_loads l
    JOIN driver_trips t ON t.id=l.trip_id AND t.ended_at IS NULL AND t.branch_id=l.branch_id
    JOIN users u ON u.id=t.driver_id AND u.active AND u.driver_available AND u.branch_id=l.branch_id
    JOIN driver_vehicles v ON v.id=t.vehicle_id AND v.active AND v.lpg_suitable AND v.branch_id=l.branch_id
    JOIN bulk_lpg_meters m ON m.id=l.meter_id AND m.vehicle_id=t.vehicle_id AND m.active AND m.calibration_expires_at>now()
    WHERE l.branch_id=$1 AND l.state='active' AND l.acknowledged_by=t.driver_id AND l.buffer_grams>=$2
      AND ($3::text IS NULL OR t.driver_id=$3) ORDER BY l.created_at,l.id LIMIT 1${lock ? " FOR UPDATE OF l,t,v" : ""}`,
    [branch, grams, driver ?? null],
  );
}

/** The caller already holds the branch/order transaction; no extra gas is created. */
export async function takeTankerBuffer(
  tx: SQL,
  branch: string,
  grams: number,
  driver?: string,
) {
  const daily=await takeDaily(tx,branch,grams,driver);if(daily)return daily;
  const tank = await availableTanker(tx, branch, grams, driver, true);
  if (!tank) return;
  await tx.query(
    "UPDATE bulk_lpg_loads SET buffer_grams=buffer_grams-$1,version=version+1 WHERE id=$2",
    [grams, tank.id],
  );
  return tank;
}

export async function recordTankerAllocation(
  tx: SQL,
  user: Actor,
  orderId: string,
  tank: any,
  grams: number,
  releaseDuplicateOrderReservation: boolean,
) {
  if(tank.daily_run_id)return allocateDaily(tx,user,orderId,tank,grams,releaseDuplicateOrderReservation);
  if (releaseDuplicateOrderReservation) {
    const released = await one(
      tx,
      "UPDATE gas_stock SET reserved_grams=reserved_grams-$1 WHERE branch_id=$2 AND reserved_grams>=$1 RETURNING branch_id",
      [grams, tank.branch_id],
    );
    if (!released)
      throw new AppError(
        409,
        "The order and tanker stock reservations need reconciliation.",
      );
  }
  const allocation = await one(
    tx,
    `INSERT INTO bulk_lpg_allocations(order_id,load_id,grams) VALUES($1,$2,$3)
    ON CONFLICT(order_id) DO UPDATE SET load_id=excluded.load_id,grams=excluded.grams,dispensed_grams=0,state='allocated'
    WHERE bulk_lpg_allocations.state IN ('released','returned') RETURNING order_id`,
    [orderId, tank.id, grams],
  );
  if (!allocation)
    throw new AppError(
      409,
      "This order already has active tanker custody. Refresh before assigning.",
    );
  await tx.query(
    "INSERT INTO gas_stock_movements(id,branch_id,grams,kind,reference,actor_id,reason) VALUES($1,$2,$3,'released',$4,$5,'Transfer acknowledged tanker buffer reservation to order')",
    [
      id(),
      tank.branch_id,
      -grams,
      `refill:${orderId}:${tank.id}:buffer-transfer`,
      user.id,
    ],
  );
  await tx.query(
    "INSERT INTO bulk_lpg_events(id,load_id,order_id,kind,actor_id,detail) VALUES($1,$2,$3,'order.allocated',$4,$5)",
    [
      id(),
      tank.id,
      orderId,
      user.id,
      JSON.stringify({ grams, fromAcknowledgedTank: true }),
    ],
  );
}

export async function reserveTankerForAssignment(
  tx: SQL,
  user: Actor,
  order: any,
  driverId: string,
) {
  const grams = Number(
    (await one(
      tx,
      "SELECT COALESCE(sum(grams),0) n FROM order_gas_lines WHERE order_id=$1",
      [order.id],
    ))!.n,
  );
  if (!grams) return;
  const assignedDaily=await dailyAllocation(tx,order.id);if(assignedDaily){if(assignedDaily.driver_id!==driverId||assignedDaily.run_state!=="active")throw new AppError(409,"This order belongs to another delivery day. Contact the office.");return;}
  const prior = await one(
    tx,
    "SELECT a.*,t.driver_id FROM bulk_lpg_allocations a JOIN bulk_lpg_loads l ON l.id=a.load_id JOIN driver_trips t ON t.id=l.trip_id WHERE a.order_id=$1 AND a.state IN ('allocated','dispensed')",
    [order.id],
  );
  if (prior) {
    if (prior.driver_id !== driverId)
      throw new AppError(
        409,
        "This order’s gas is on another tanker. Select that tanker’s driver or reconcile its gas custody first.",
      );
    return;
  }
  const tank = await takeTankerBuffer(tx, order.branch_id, grams, driverId);
  if (tank) await recordTankerAllocation(tx, user, order.id, tank, grams, true);
}
