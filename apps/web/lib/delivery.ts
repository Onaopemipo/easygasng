import { verifyDeliveryCode } from "./delivery-code";
import { fulfilmentReady } from "./order-tracking";
import { gasReservation, verifyGasDispatch } from "./gas-delivery";
import { issueCylinders } from "./cylinder-allocation";
import { awardRewards } from "./commerce";
import { one, type SQL } from "./db";
import {
  allow,
  recentVerification,
  AppError,
  digest,
  id,
  type Actor,
} from "./auth";
import { audit, notify } from "./governance";
export async function completeDelivery(
  tx: SQL,
  user: Actor,
  input: {
    orderId: string;
    code: string;
    collectedKobo: number;
    version?: number;
    handover?: boolean;
  },
) {
  const o = await one(tx, "SELECT * FROM orders WHERE id=$1 FOR UPDATE", [
    input.orderId,
  ]);
  if (!o) throw new AppError(404, "Order not found.");
  allow(user, ["owner", "manager", "driver"], o.branch_id);
  if (user.role === "driver" && o.driver_id !== user.id)
    throw new AppError(403, "This delivery is assigned to another driver.");
  if (o.status === "delivered" && digest(input.code) === o.delivery_code_hash) {
    const collection = await one(
      tx,
      "SELECT collector_id,amount_kobo FROM cash_collections WHERE order_id=$1",
      [o.id],
    );
    if (
      (["wallet", "card"].includes(o.payment_method) &&
        input.collectedKobo === 0 &&
        o.payment_status === "verified") ||
      (collection?.collector_id === user.id &&
        Number(collection.amount_kobo) === input.collectedKobo)
    )
      return { ok: true, replayed: true };
  }
  if (o.status !== "out_for_delivery")
    throw new AppError(409, "Only a dispatched order can be completed.");
  if (
    input.version !== undefined &&
    input.version !== Number(o.tracking_version)
  )
    throw new AppError(
      409,
      "This order changed. Refresh before confirming delivery.",
    );
  const attempt = await one(
    tx,
    "SELECT * FROM delivery_attempts WHERE order_id=$1 ORDER BY assignment_version DESC LIMIT 1 FOR UPDATE",
    [o.id],
  );
  if (
    !attempt ||
    attempt.driver_id !== o.driver_id ||
    !["picked_up", "arrived"].includes(attempt.state)
  )
    throw new AppError(
      409,
      "A verified pickup by the current assigned driver is required.",
    );
  if (input.handover !== true)
    throw new AppError(
      400,
      "Confirm actual handover of every item and the full gas quantity. Partial delivery requires dispatch review.",
    );
  await fulfilmentReady(tx, o);
  await verifyDeliveryCode(tx, user, o, input.code);
  if (!["cash_on_delivery", "wallet", "card"].includes(o.payment_method))
    throw new AppError(
      409,
      "This delivery payment method is not yet supported.",
    );
  if (
    (o.payment_method === "cash_on_delivery" &&
      input.collectedKobo !== Number(o.total_kobo)) ||
    (["wallet", "card"].includes(o.payment_method) &&
      (input.collectedKobo !== 0 || o.payment_status !== "verified"))
  )
    throw new AppError(
      400,
      "Record the full cash amount actually collected before completing this cash-on-delivery order.",
    );
  await tx.query("SELECT id FROM branches WHERE id=$1 FOR UPDATE", [
    o.branch_id,
  ]);
  const items = (
    await tx.query(
      "SELECT * FROM order_items WHERE order_id=$1 ORDER BY product_id",
      [o.id],
    )
  ).rows;
  for (const item of items) {
    const row = await one(
      tx,
      "UPDATE inventory SET quantity=quantity-$1,reserved=reserved-$1 WHERE branch_id=$2 AND product_id=$3 AND reserved >= $1 AND quantity >= $1 RETURNING product_id",
      [item.quantity, o.branch_id, item.product_id],
    );
    if (!row)
      throw new AppError(
        409,
        "Reserved stock could not be reconciled. Contact inventory management.",
      );
    await tx.query(
      "INSERT INTO stock_movements(id,branch_id,product_id,quantity,kind,reason,actor_id,reference) VALUES ($1,$2,$3,$4,'fulfilled',$5,$6,$7)",
      [
        id(),
        o.branch_id,
        item.product_id,
        -item.quantity,
        `Delivery completed: ${o.reference}`,
        user.id,
        `${o.id}:fulfil:${item.product_id}`,
      ],
    );
  }
  await verifyGasDispatch(tx, o.id);
  await gasReservation(tx, user, o.id, "fulfilled");
  await issueCylinders(tx, user, { orderId: o.id }, o.customer_id);
  if (o.payment_method === "cash_on_delivery") {
    const priorCollection = await one(
      tx,
      "SELECT * FROM cash_collections WHERE order_id=$1 FOR UPDATE",
      [o.id],
    );
    if (
      priorCollection &&
      (priorCollection.collector_id !== user.id ||
        Number(priorCollection.amount_kobo) !== input.collectedKobo)
    )
      throw new AppError(
        409,
        "Previously recorded cash collection differs. Independent review is required.",
      );
    if (!priorCollection)
      await tx.query(
        "INSERT INTO cash_collections(id,order_id,collector_id,amount_kobo) VALUES ($1,$2,$3,$4)",
        [id(), o.id, user.id, input.collectedKobo],
      );
  }
  await tx.query(
    "UPDATE orders SET status='delivered',delivered_at=now(),payment_status=$2 WHERE id=$1",
    [
      o.id,
      o.payment_method === "wallet" || o.payment_status === "verified"
        ? "verified"
        : "collected",
    ],
  );
  await tx.query(
    "INSERT INTO order_events(id,order_id,status,actor_id,note) VALUES ($1,$2,'delivered',$3,$4)",
    [
      id(),
      o.id,
      user.id,
      o.payment_method === "wallet"
        ? "Customer code verified. Paid with purchase credit."
        : o.payment_method === "card" ? "Customer code verified. Card payment recorded in the verified ledger."
        : "Customer code verified. Cash collection recorded; independent finance reconciliation pending.",
    ],
  );
  await tx.query(
    "UPDATE delivery_attempts SET state='delivered',completed_at=now() WHERE id=$1",
    [attempt.id],
  );
  await tx.query(
    "INSERT INTO delivery_evidence(id,attempt_id,actor_id,kind,detail) VALUES($1,$2,$3,'handover',$4)",
    [
      id(),
      attempt.id,
      user.id,
      JSON.stringify({
        allItemsHandedOver: true,
        codeVerified: true,
        collectedKobo: input.collectedKobo,
      }),
    ],
  );
  await awardRewards(tx, o.id);
  await audit(tx, user, "delivery.completed", o.id);
  await notify(
    tx,
    o.customer_id,
    "Delivery completed",
    `${o.reference} has been delivered. ${o.payment_method === "wallet" ? "Paid using purchase credit." : o.payment_method === "card" ? "Card payment has been verified." : "Cash collection has been recorded."}`,
    o.id,
  );
  return { ok: true };
}
export async function reconcileCash(
  tx: SQL,
  user: Actor,
  collectionId: string,
) {
  const reference = await one(
    tx,
    "SELECT order_id FROM cash_collections WHERE id=$1",
    [collectionId],
  );
  if (!reference) throw new AppError(404, "Cash collection not found.");
  await tx.query("SELECT id FROM orders WHERE id=$1 FOR UPDATE", [
    reference.order_id,
  ]);
  const c = await one(
    tx,
    "SELECT c.*,o.branch_id,o.total_kobo,o.reference FROM cash_collections c JOIN orders o ON o.id=c.order_id WHERE c.id=$1 FOR UPDATE OF c",
    [collectionId],
  );
  if (!c) throw new AppError(404, "Cash collection not found.");
  allow(user, ["owner", "finance"], c.branch_id);
  recentVerification(user);
  if (c.collector_id === user.id)
    throw new AppError(
      403,
      "Cash collection must be reconciled by an independent finance approver.",
    );
  if (c.verified_at) return { ok: true };
  const existingPrincipal = Number(
    (await one(
      tx,
      "SELECT COALESCE(sum(amount_kobo),0) AS n FROM verified_payments WHERE order_id=$1",
      [c.order_id],
    ))!.n,
  );
  if (existingPrincipal > 0)
    throw new AppError(
      409,
      "This order already has verified principal. Review the cash against existing payments before reconciliation; do not post another full payment.",
    );
  if (Number(c.amount_kobo) !== Number(c.total_kobo))
    throw new AppError(409, "The cash amount does not match the order total.");
  await tx.query(
    "INSERT INTO verified_payments(id,order_id,reference,amount_kobo,method,verified_by) VALUES ($1,$2,$3,$4,$5,$6)",
    [id(), c.order_id, `cash:${c.order_id}`, c.amount_kobo, "cash", user.id],
  );
  await tx.query(
    "UPDATE cash_collections SET verified_by=$1,verified_at=now() WHERE id=$2",
    [user.id, c.id],
  );
  await tx.query("UPDATE orders SET payment_status='verified' WHERE id=$1", [
    c.order_id,
  ]);
  await awardRewards(tx, c.order_id);
  await audit(tx, user, "cash.reconciled", c.id);
  await notify(
    tx,
    (await one(tx, "SELECT customer_id FROM orders WHERE id=$1", [c.order_id]))!
      .customer_id,
    "Payment confirmed",
    `Payment for ${c.reference} has been independently verified.`,
    c.order_id,
  );
  return { ok: true };
}
