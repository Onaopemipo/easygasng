import { z } from "zod";
import { allow, AppError, digest, id, type Actor } from "./auth";
import { one, type SQL, type Row } from "./db";
import { checkoutSchema, settingValue } from "./operations";
import { gasQuote } from "./gas-delivery";
import { allocateCylinders } from "./cylinder-allocation";
import { audit, notify } from "./governance";
const roles = ["owner", "manager", "sales"];
const target = z.object({ orderId: z.string().uuid() }).strict();
const lines = target.extend({
  items: checkoutSchema.shape.items,
  gasLines: checkoutSchema.shape.gasLines,
});
const submit = lines.extend({
  reason: z.string().trim().min(10).max(500),
  requestKey: z.string().uuid(),
  quoteHash: z.string().length(64),
});

async function cutoff(tx: SQL, o: Row) {
  if (
    !(await one(tx, "SELECT id FROM branches WHERE id=$1 AND active=true", [
      o.branch_id,
    ]))
  )
    throw new AppError(409, "This branch is not accepting additions.");
  if (!["placed", "accepted", "preparing"].includes(o.status) || o.driver_id)
    throw new AppError(
      409,
      "Additions close before rider assignment. Create a separate delivery instead.",
    );
  if (
    !["cash_on_delivery", "card"].includes(o.payment_method) ||
    o.payment_status !== "unpaid" ||
    Number(o.reward_discount_kobo ?? 0)
  )
    throw new AppError(
      409,
      "Only unpaid cash-on-delivery or card orders can be extended before payment preparation. Use the existing financial correction process for paid or discounted orders.",
    );
  const locked = await one(
    tx,
    `SELECT
    EXISTS(SELECT 1 FROM delivery_attempts WHERE order_id=$1) OR
    EXISTS(SELECT 1 FROM bulk_lpg_allocations WHERE order_id=$1) OR
    EXISTS(SELECT 1 FROM customer_invoices WHERE order_id=$1) OR
    EXISTS(SELECT 1 FROM payment_intents WHERE order_id=$1) OR
    EXISTS(SELECT 1 FROM verified_payments WHERE order_id=$1) OR
    EXISTS(SELECT 1 FROM cash_collections WHERE order_id=$1) AS blocked`,
    [o.id],
  );
  if (locked?.blocked)
    throw new AppError(
      409,
      "This order already has dispatch, loading or financial records. Additions are closed.",
    );
  if (await one(tx, "SELECT id FROM order_additions WHERE order_id=$1", [o.id]))
    throw new AppError(
      409,
      "This delivery already has its one permitted supplementary request.",
    );
  if (
    !(await settingValue(tx, "delivery.enabled", o.branch_id)) ||
    (o.payment_method === "cash_on_delivery" &&
      !(await settingValue(tx, "payment.cod", o.branch_id)))
  )
    throw new AppError(
      409,
      "Delivery or cash-on-delivery ordering is currently unavailable.",
    );
}
async function priced(tx: SQL, o: Row, d: z.infer<typeof lines>) {
  const gasLines = [...(d.gasLines ?? [])],
    physical = [];
  const seen = new Set<string>();
  for (const item of [...d.items].sort((a, b) =>
    a.productId.localeCompare(b.productId),
  )) {
    if (seen.has(item.productId))
      throw new AppError(400, "Combine duplicate products before review.");
    seen.add(item.productId);
    const p = await one(
      tx,
      `SELECT p.*,i.price_kobo,i.published,i.quantity-i.reserved AS available FROM products p JOIN inventory i ON i.product_id=p.id WHERE p.id=$1 AND i.branch_id=$2 FOR UPDATE OF i`,
      [item.productId, o.branch_id],
    );
    if (
      !p ||
      p.archived ||
      !p.published ||
      !Number(p.price_kobo) ||
      !(await one(
        tx,
        "SELECT name FROM product_categories WHERE name=$1 AND active=true",
        [p.category],
      ))
    )
      throw new AppError(409, "A requested product is unavailable.");
    if (p.category === "Gas refills") {
      for (let i = 0; i < item.quantity; i++)
        gasLines.push({ capacityKg: Number(p.size_kg), kg: Number(p.size_kg) });
    } else {
      if (Number(p.available) < item.quantity)
        throw new AppError(409, "Insufficient available stock.");
      const old = await one(
        tx,
        "SELECT quantity,unit_price_kobo FROM order_items WHERE order_id=$1 AND product_id=$2",
        [o.id, item.productId],
      );
      if (Number(old?.quantity ?? 0) + item.quantity > 20)
        throw new AppError(
          409,
          "Use at most twenty units of each product per delivery.",
        );
      if (old && Number(old.unit_price_kobo) !== Number(p.price_kobo))
        throw new AppError(
          409,
          "An existing product price has changed. Use a separate order to preserve the original price record.",
        );
      physical.push(item);
    }
  }
  const existing = await one(
    tx,
    "SELECT count(*)::int n FROM order_gas_lines WHERE order_id=$1",
    [o.id],
  );
  if (gasLines.length + Number(existing?.n ?? 0) > 20)
    throw new AppError(400, "Use at most twenty gas cylinders per delivery.");
  if (!physical.length && !gasLines.length)
    throw new AppError(400, "Choose at least one product or gas refill.");
  const count = await one(
    tx,
    "SELECT count(*)::int n FROM (SELECT product_id FROM order_items WHERE order_id=$1 UNION SELECT unnest($2::text[])) p",
    [o.id, physical.map((i) => i.productId)],
  );
  if (Number(count?.n ?? 0) > 30)
    throw new AppError(
      400,
      "Use at most thirty physical product lines per delivery.",
    );
  const q = await gasQuote(tx, gasLines, o.branch_id, physical);
  const amountKobo = q.subtotalKobo + q.physicalSubtotalKobo;
  if (
    !Number.isSafeInteger(amountKobo) ||
    amountKobo <= 0 ||
    Number(o.total_kobo) + amountKobo > 100000000
  )
    throw new AppError(
      400,
      "The supplementary amount exceeds supported limits.",
    );
  const snapshot = {
    orderId: o.id,
    orderVersion: o.tracking_version,
    originalTotalKobo: Number(o.total_kobo),
    deliveryKobo: Number(o.delivery_kobo),
    additionalDeliveryKobo: 0,
    paymentMethod: o.payment_method,
    amountKobo,
    newTotalKobo: Number(o.total_kobo) + amountKobo,
    physicalLines: q.physicalLines,
    gasLines: q.lines,
    gasPriceKobo: q.priceKobo,
    gasPriceVersion: q.priceVersion,
    policyVersion: q.policyVersion,
  };
  return { ...snapshot, quoteHash: digest(JSON.stringify(snapshot)) };
}
export async function orderAdditions(
  tx: SQL,
  user: Actor,
  action: string,
  input: unknown,
) {
  allow(user, roles);
  const raw = target.passthrough().parse(input);
  // Same parent row is locked by assignment/departure, invoicing and payment preparation.
  const o = await one(tx, "SELECT * FROM orders WHERE id=$1 FOR UPDATE", [
    raw.orderId,
  ]);
  if (!o) throw new AppError(404, "Order not found.");
  allow(user, roles, o.branch_id);
  if (action === "order.additions") {
    target.parse(input);
    const history = (
      await tx.query(
        "SELECT id,actor_id,reason,snapshot,amount_kobo,created_at FROM order_additions WHERE order_id=$1 ORDER BY created_at",
        [o.id],
      )
    ).rows;
    let blockedReason = "";
    try {
      await cutoff(tx, o);
    } catch (e) {
      if (!(e instanceof AppError)) throw e;
      blockedReason = e.message;
    }
    const products = (
      await tx.query(
        "SELECT p.id,p.name,p.category FROM products p JOIN inventory i ON i.product_id=p.id WHERE i.branch_id=$1 AND i.published=true AND p.archived=false AND EXISTS(SELECT 1 FROM product_categories c WHERE c.name=p.category AND c.active=true) ORDER BY p.name",
        [o.branch_id],
      )
    ).rows;
    return { history, products, eligible: !blockedReason, blockedReason };
  }
  if (action !== "order.addition.quote" && action !== "order.addition.create")
    throw new AppError(404, "Unknown addition action.");
  const d =
    action === "order.addition.create"
      ? submit.parse(input)
      : lines.parse(input);
  if (action === "order.addition.create") {
    const s = d as z.infer<typeof submit>;
    const previous = await one(
      tx,
      "SELECT * FROM order_additions WHERE actor_id=$1 AND request_key=$2",
      [user.id, s.requestKey],
    );
    if (previous) {
      if (
        previous.order_id !== o.id ||
        previous.request_hash !== digest(JSON.stringify(s))
      )
        throw new AppError(
          409,
          "This addition reference was used with different contents.",
        );
      return {
        id: previous.id,
        orderId: o.id,
        replayed: true,
        amountKobo: Number(previous.amount_kobo),
      };
    }
  }
  await cutoff(tx, o);
  await tx.query(
    "SELECT key FROM settings WHERE scope=$1 AND key IN ('gas.price_per_kg','gas.quantity_policy','delivery.fee') ORDER BY key FOR UPDATE",
    [o.branch_id],
  );
  const q = await priced(tx, o, d);
  if (action === "order.addition.quote") return q;
  const s = d as z.infer<typeof submit>;
  if (q.quoteHash !== s.quoteHash)
    throw new AppError(
      409,
      "The order or prices changed. Review a fresh supplementary quote.",
    );
  const aid = id();
  await allocateCylinders(tx, user, o.branch_id, q.physicalLines, {
    orderId: o.id,
  });
  for (const item of q.physicalLines) {
    await tx.query(
      "INSERT INTO order_items(order_id,product_id,name,quantity,unit_price_kobo) VALUES($1,$2,$3,$4,$5) ON CONFLICT(order_id,product_id) DO UPDATE SET quantity=order_items.quantity+EXCLUDED.quantity",
      [o.id, item.productId, item.name, item.quantity, item.unitPriceKobo],
    );
    const reserved = await one(
      tx,
      "UPDATE inventory SET reserved=reserved+$1 WHERE branch_id=$2 AND product_id=$3 AND quantity-reserved>=$1 RETURNING product_id",
      [item.quantity, o.branch_id, item.productId],
    );
    if (!reserved)
      throw new AppError(409, "Stock changed. Review availability again.");
    await tx.query(
      "INSERT INTO stock_movements(id,branch_id,product_id,quantity,kind,reason,actor_id,reference) VALUES($1,$2,$3,$4,'reserved',$5,$6,$7)",
      [
        id(),
        o.branch_id,
        item.productId,
        item.quantity,
        s.reason,
        user.id,
        `${aid}:reserve:${item.productId}`,
      ],
    );
  }
  if (q.gasLines.length) {
    const grams = q.gasLines.reduce((sum, l) => sum + l.grams, 0);
    if (
      !(await one(
        tx,
        "UPDATE gas_stock SET reserved_grams=reserved_grams+$1 WHERE branch_id=$2 AND grams-reserved_grams>=$1 RETURNING branch_id",
        [grams, o.branch_id],
      ))
    )
      throw new AppError(409, "Insufficient verified gas stock.");
    for (const line of q.gasLines)
      await tx.query(
        "INSERT INTO order_gas_lines(id,order_id,capacity_grams,grams,unit_price_kobo,subtotal_kobo,pricing_version) VALUES($1,$2,$3,$4,$5,$6,$7)",
        [
          id(),
          o.id,
          line.capacityGrams,
          line.grams,
          q.gasPriceKobo,
          line.subtotalKobo,
          q.gasPriceVersion,
        ],
      );
    await tx.query(
      "INSERT INTO gas_stock_movements(id,branch_id,grams,kind,reference,actor_id,reason) VALUES($1,$2,$3,'reserved',$4,$5,$6)",
      [id(), o.branch_id, grams, `${aid}:reserved`, user.id, s.reason],
    );
    await tx.query(
      "UPDATE orders SET operational_review='Confirm supplementary gas cylinder inspection and actual address coverage before dispatch.' WHERE id=$1",
      [o.id],
    );
  }
  await tx.query(
    "UPDATE orders SET subtotal_kobo=subtotal_kobo+$1,total_kobo=total_kobo+$1 WHERE id=$2",
    [q.amountKobo, o.id],
  );
  await tx.query(
    "INSERT INTO order_additions(id,order_id,actor_id,request_key,request_hash,reason,snapshot,amount_kobo) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
    [
      aid,
      o.id,
      user.id,
      s.requestKey,
      digest(JSON.stringify(s)),
      s.reason,
      JSON.stringify(q),
      q.amountKobo,
    ],
  );
  await tx.query(
    "INSERT INTO order_events(id,order_id,status,actor_id,note) VALUES($1,$2,$3,$4,$5)",
    [
      id(),
      o.id,
      o.status,
      user.id,
      `Supplementary request ${aid}; no additional delivery fee. ${s.reason}`,
    ],
  );
  await audit(tx, user, "order.addition.created", o.id, "success", {
    additionId: aid,
    amountKobo: q.amountKobo,
    additionalDeliveryKobo: 0,
    reason: s.reason,
  });
  await notify(
    tx,
    o.customer_id,
    "Items added to your delivery",
    `${o.reference} has a supplementary request. Your delivery fee is unchanged. ${o.payment_method === "card" ? "Complete verified card payment from My Orders before dispatch." : "The updated order remains payable on delivery."}`,
    o.id,
  );
  return {
    id: aid,
    orderId: o.id,
    amountKobo: q.amountKobo,
    totalKobo: q.newTotalKobo,
    additionalDeliveryKobo: 0,
  };
}
