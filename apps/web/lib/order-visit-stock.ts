import { allocateDaily } from "./daily-delivery";
import { AppError, id, type Actor } from "./auth";
import { one, type SQL } from "./db";
import { productCustodyEvent } from "./vehicle-products";
/** Planning is read-only. All consumption is repeated under the trip/parent transaction locks. */
export async function visitStockPlan(
  tx: SQL,
  tripId: string,
  items: { productId: string; quantity: number }[],
  grams: number,
) {
  const products: any[] = [];
  for (const item of [...items].sort((a, b) =>
    a.productId.localeCompare(b.productId),
  )) {
    let remaining = item.quantity;
    const loads = (
      await tx.query(
        "SELECT * FROM vehicle_product_loads WHERE trip_id=$1 AND product_id=$2 AND state='active' AND acknowledged_by IS NOT NULL AND available>0 ORDER BY id FOR UPDATE",
        [tripId, item.productId],
      )
    ).rows;
    for (const load of loads) {
      const quantity = Math.min(remaining, Number(load.available));
      if (!quantity) continue;
      const serials = load.serialized
        ? (
            await tx.query(
              "SELECT s.cylinder_id FROM vehicle_product_serials s JOIN cylinders c ON c.id=s.cylinder_id WHERE s.load_id=$1 AND s.state='loaded' AND c.status='empty' AND c.ownership='company' AND c.customer_id IS NULL AND c.test_due>CURRENT_DATE AND NOT EXISTS(SELECT 1 FROM cylinder_allocations a WHERE a.cylinder_id=c.id AND a.state IN ('reserved','issued')) ORDER BY s.cylinder_id LIMIT $2 FOR UPDATE OF s,c",
              [load.id, quantity],
            )
          ).rows.map((s) => s.cylinder_id)
        : [];
      if (load.serialized && serials.length !== quantity)
        throw new AppError(
          409,
          "Extra cylinder stock needs current inspection and exact available vehicle serials.",
        );
      products.push({
        loadId: load.id,
        productId: item.productId,
        quantity,
        serialIds: serials,
        version: Number(load.version),
      });
      remaining -= quantity;
    }
    if (remaining)
      throw new AppError(
        409,
        "The driver does not have enough acknowledged vehicle stock for these extra products. Load and independently acknowledge the required stock before reviewing this visit order.",
      );
  }
  let gas: any = null;
  if (grams) {
    const day=await one(tx,"SELECT * FROM daily_delivery_runs WHERE trip_id=$1 AND state='active' AND opening_grams+added_grams-supplied_grams-committed_grams>=$2 FOR UPDATE",[tripId,grams]);
    if(day)gas={dailyRunId:day.id,loadId:day.id,version:Number(day.version),grams};
    else gas = await one(
      tx,
      "SELECT id,version FROM bulk_lpg_loads WHERE trip_id=$1 AND state='active' AND acknowledged_by IS NOT NULL AND buffer_grams>=$2 ORDER BY id LIMIT 1 FOR UPDATE",
      [tripId, grams],
    );
    if (!gas)
      throw new AppError(
        409,
        "The vehicle has insufficient acknowledged LPG buffer for this extra order. Load and independently acknowledge enough measured LPG before reviewing the extra order.",
      );
    if(!gas.dailyRunId)gas = { loadId: gas.id, version: Number(gas.version), grams };
  }
  return { products, gas };
}
export async function reserveVisitStock(
  tx: SQL,
  branch: string,
  plan: Awaited<ReturnType<typeof visitStockPlan>>,
) {
  for (const p of plan.products) {
    await tx.query(
      "UPDATE vehicle_product_loads SET available=available-$1,reserved=reserved+$1,version=version+1 WHERE id=$2",
      [p.quantity, p.loadId],
    );
    await tx.query(
      "UPDATE inventory SET reserved=reserved-$1 WHERE branch_id=$2 AND product_id=$3",
      [p.quantity, branch, p.productId],
    );
    if (p.serialIds.length)
      await tx.query(
        "UPDATE vehicle_product_serials SET state='reserved' WHERE load_id=$1 AND cylinder_id=ANY($2::text[])",
        [p.loadId, p.serialIds],
      );
  }
  if(plan.gas?.dailyRunId){await tx.query('UPDATE daily_delivery_runs SET committed_grams=committed_grams+$1,version=version+1 WHERE id=$2',[plan.gas.grams,plan.gas.dailyRunId]);await tx.query('UPDATE gas_stock SET reserved_grams=reserved_grams-$1 WHERE branch_id=$2',[plan.gas.grams,branch]);return;}
  if (plan.gas) {
    await tx.query(
      "UPDATE bulk_lpg_loads SET buffer_grams=buffer_grams-$1,version=version+1 WHERE id=$2",
      [plan.gas.grams, plan.gas.loadId],
    );
    await tx.query(
      "UPDATE gas_stock SET reserved_grams=reserved_grams-$1 WHERE branch_id=$2",
      [plan.gas.grams, branch],
    );
  }
}
export async function recordVisitStock(
  tx: SQL,
  user: Actor,
  orderId: string,
  plan: Awaited<ReturnType<typeof visitStockPlan>>,
) {
  for (const p of plan.products) {
    await tx.query(
      "INSERT INTO order_visit_products(order_id,load_id,quantity) VALUES($1,$2,$3)",
      [orderId, p.loadId, p.quantity],
    );
    await productCustodyEvent(
      tx,
      user,
      p.loadId,
      "visit.order_reserved",
      { quantity: p.quantity, serialIds: p.serialIds },
      orderId,
    );
  }
  for (const p of plan.products)
    await tx.query(
      "INSERT INTO stock_movements(id,branch_id,product_id,quantity,kind,reason,actor_id,reference) SELECT $1,branch_id,product_id,$2,'released','Transfer vehicle reservation to linked order',$3,$4 FROM vehicle_product_loads WHERE id=$5",
      [
        id(),
        -p.quantity,
        user.id,
        `visit:${orderId}:${p.loadId}:transfer`,
        p.loadId,
      ],
    );
  if(plan.gas?.dailyRunId){const r=await one(tx,'SELECT * FROM daily_delivery_runs WHERE id=$1',[plan.gas.dailyRunId]);await allocateDaily(tx,user,orderId,r,plan.gas.grams,false);return;}
  if (plan.gas)
    await tx.query(
      "INSERT INTO gas_stock_movements(id,branch_id,grams,kind,reference,actor_id,reason) SELECT $1,branch_id,$2,'released',$3,$4,'Transfer acknowledged buffer reservation to linked order' FROM bulk_lpg_loads WHERE id=$5",
      [
        id(),
        -plan.gas.grams,
        `visit:${orderId}:buffer-transfer`,
        user.id,
        plan.gas.loadId,
      ],
    );
  if (plan.gas) {
    await tx.query(
      "INSERT INTO bulk_lpg_allocations(order_id,load_id,grams) VALUES($1,$2,$3)",
      [orderId, plan.gas.loadId, plan.gas.grams],
    );
    await tx.query(
      "INSERT INTO bulk_lpg_events(id,load_id,order_id,kind,actor_id,detail) VALUES($1,$2,$3,'visit.order_reserved',$4,$5)",
      [
        id(),
        plan.gas.loadId,
        orderId,
        user.id,
        JSON.stringify({ grams: plan.gas.grams, fromAcknowledgedBuffer: true }),
      ],
    );
  }
}
export async function verifyVisitProducts(tx: SQL, order: any) {
  const invalid = await one(
    tx,
    "SELECT a.load_id FROM order_visit_products a JOIN vehicle_product_loads l ON l.id=a.load_id JOIN order_visit_links v ON v.order_id=a.order_id WHERE a.order_id=$1 AND (a.state<>'reserved' OR l.state<>'active' OR l.acknowledged_by IS NULL OR l.trip_id<>v.trip_id OR l.reserved<a.quantity) LIMIT 1",
    [order.id],
  );
  if (invalid)
    throw new AppError(
      409,
      "The extra order’s acknowledged vehicle product custody changed. Reconcile its manifest before pickup or handover.",
    );
}
export async function settleVisitProducts(
  tx: SQL,
  user: Actor,
  order: any,
  kind: "handed" | "returned" | "released",
) {
  const rows = (
    await tx.query(
      "SELECT a.*,l.product_id FROM order_visit_products a JOIN vehicle_product_loads l ON l.id=a.load_id WHERE a.order_id=$1 AND a.state='reserved' ORDER BY a.load_id FOR UPDATE OF a,l",
      [order.id],
    )
  ).rows;
  for (const p of rows) {
    const target = kind === "released" ? "available" : kind;
    await tx.query(
      `UPDATE vehicle_product_loads SET reserved=reserved-$1,${target}=${target}+$1,version=version+1 WHERE id=$2`,
      [p.quantity, p.load_id],
    );
    await tx.query(
      "UPDATE order_visit_products SET state=$1 WHERE order_id=$2 AND load_id=$3",
      [kind, order.id, p.load_id],
    );
    const serialState = kind === "released" ? "loaded" : kind;
    await tx.query(
      "UPDATE vehicle_product_serials SET state=$1 WHERE load_id=$2 AND cylinder_id IN (SELECT cylinder_id FROM cylinder_allocations WHERE order_id=$3)",
      [serialState, p.load_id, order.id],
    );
    if (kind === "released")
      await tx.query(
        "UPDATE inventory SET reserved=reserved+$1 WHERE branch_id=$2 AND product_id=$3",
        [p.quantity, order.branch_id, p.product_id],
      );
    await productCustodyEvent(
      tx,
      user,
      p.load_id,
      "visit.order_" + kind,
      { quantity: p.quantity },
      order.id,
    );
  }
}
