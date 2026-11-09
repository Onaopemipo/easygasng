import { one, type SQL } from "./db";
import { id, AppError, type Actor } from "./auth";
export async function allocateCylinders(
  tx: SQL,
  user: Actor,
  branch: string,
  items: { productId: string; quantity: number }[],
  reference: { orderId?: string; saleId?: string },
) {
  for (const item of items) {
    const p = await one(
      tx,
      "SELECT category,size_kg FROM products WHERE id=$1",
      [item.productId],
    );
    if (p?.category !== "Empty cylinders") continue;
    const units = (
      await tx.query(
        "SELECT c.id FROM cylinders c WHERE c.branch_id=$1 AND c.size_kg=$2 AND c.status='empty' AND c.ownership='company' AND c.customer_id IS NULL AND c.test_due>CURRENT_DATE AND NOT EXISTS(SELECT 1 FROM cylinder_allocations a WHERE a.cylinder_id=c.id AND a.state IN ('reserved','issued')) AND NOT EXISTS(SELECT 1 FROM vehicle_product_serials v WHERE v.cylinder_id=c.id AND v.state IN ('loaded','reserved')) ORDER BY c.id LIMIT $3 FOR UPDATE OF c",
        [branch, p.size_kg, item.quantity],
      )
    ).rows;
    if (units.length !== item.quantity)
      throw new AppError(
        409,
        "Not enough inspected empty cylinders are available for allocation.",
      );
    for (const c of units)
      await tx.query(
        "INSERT INTO cylinder_allocations(id,cylinder_id,order_id,sale_id,state) VALUES ($1,$2,$3,$4,'reserved')",
        [id(), c.id, reference.orderId ?? null, reference.saleId ?? null],
      );
  }
}
/** Shared readiness authority for dispatch and final physical issue. No stock mutation. */
export async function cylinderAllocationReadiness(
  tx: SQL,
  reference: { orderId?: string; saleId?: string },
) {
  const required = Number(
    (await one(
      tx,
      reference.orderId
        ? "SELECT COALESCE(sum(i.quantity),0) AS n FROM order_items i JOIN products p ON p.id=i.product_id WHERE i.order_id=$1 AND (p.category='Empty cylinders' OR lower(i.name) LIKE '%empty%cylinder%')"
        : "SELECT COALESCE(sum(i.quantity),0) AS n FROM pos_items i JOIN products p ON p.id=i.product_id WHERE i.sale_id=$1 AND (p.category='Empty cylinders' OR lower(i.name) LIKE '%empty%cylinder%')",
      [reference.orderId ?? reference.saleId],
    ))!.n,
  );
  const allocatedCount = Number(
    (await one(
      tx,
      "SELECT count(*) AS n FROM cylinder_allocations WHERE order_id=$1 OR sale_id=$2",
      [reference.orderId ?? null, reference.saleId ?? null],
    ))!.n,
  );
  // Allocation history and the original line name survive later catalogue edits.
  const requiredSerials = Math.max(required, allocatedCount);
  const rows = (
    await tx.query(
      "SELECT c.*,a.id AS allocation FROM cylinder_allocations a JOIN cylinders c ON c.id=a.cylinder_id WHERE (a.order_id=$1 OR a.sale_id=$2) AND a.state='reserved' ORDER BY c.id FOR UPDATE OF c,a",
      [reference.orderId ?? null, reference.saleId ?? null],
    )
  ).rows;
  if (rows.length !== requiredSerials)
    throw new AppError(
      409,
      "Serialised cylinder allocation is incomplete. Review the sale before fulfilment.",
    );
  for (const c of rows) {
    if (
      c.status !== "empty" ||
      c.customer_id ||
      Date.parse(c.test_due) <= Date.now()
    )
      throw new AppError(
        409,
        "An allocated cylinder is no longer eligible. Arrange inspection or replacement before fulfilment.",
      );
  }
  return rows;
}
export async function issueCylinders(
  tx: SQL,
  user: Actor,
  reference: { orderId?: string; saleId?: string },
  customerId: string | null,
) {
  const rows = await cylinderAllocationReadiness(tx, reference);
  for (const c of rows) {
    await tx.query(
      "UPDATE cylinders SET status='sold',ownership='customer',customer_id=$1 WHERE id=$2",
      [customerId, c.id],
    );
    await tx.query(
      "UPDATE cylinder_allocations SET state='issued' WHERE id=$1",
      [c.allocation],
    );
    await tx.query(
      "INSERT INTO cylinder_events(id,cylinder_id,actor_id,previous_status,status,reason) VALUES ($1,$2,$3,'empty','sold',$4)",
      [
        id(),
        c.id,
        user.id,
        "Sale allocation " + (reference.orderId ?? reference.saleId),
      ],
    );
  }
}
