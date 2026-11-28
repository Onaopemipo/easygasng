import { createPhonePaymentLink } from "./phone-order-payments";
import { z } from "zod";
import { allow, AppError, digest, type Actor } from "./auth";
import { one, type SQL } from "./db";
import { activeVisit } from "./order-visit-context";
import {
  checkout,
  checkoutSchema,
  transitionOrder,
  settingValue,
} from "./operations";
import { gasQuote } from "./gas-delivery";
import { audit } from "./governance";
import { enforceStaffPrivilege } from "./staff-privileges";
import {
  visitStockPlan,
  reserveVisitStock,
  recordVisitStock,
} from "./order-visit-stock";
const target = z
  .object({
    parentOrderId: z.string().uuid(),
    version: z.number().int().nonnegative(),
  })
  .strict();
const cart = target.extend({
  items: checkoutSchema.shape.items,
  gasLines: checkoutSchema.shape.gasLines,
});
const create = cart.extend({
  quoteHash: z.string().length(64),
  requestKey: z.string().uuid(),
  reason: z.string().trim().min(10).max(500),
});

export async function sameVisitOrders(
  tx: SQL,
  user: Actor,
  action: string,
  input: unknown,
) {
  allow(user, ["owner", "manager"]);
  enforceStaffPrivilege(user, "order.visit.create");
  if (action === "order.visit.create") {
    const d = create.parse(input);
    await tx.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
      `same-visit:${user.id}:${d.requestKey}`,
    ]);
    const previous = await one(
      tx,
      "SELECT l.*,o.reference,o.status,o.branch_id FROM order_visit_links l JOIN orders o ON o.id=l.order_id WHERE l.actor_id=$1 AND l.request_key=$2",
      [user.id, d.requestKey],
    );
    if (previous) {
      allow(user, ["owner", "manager"], previous.branch_id);
      if (previous.request_hash !== digest(JSON.stringify(d)))
        throw new AppError(
          409,
          "This extra-order reference was used with different details.",
        );
      return {
        orderId: previous.order_id,
        reference: previous.reference,
        status: previous.status,
        replayed: true,
        paymentLink:
          previous.status === "placed"
            ? await createPhonePaymentLink(tx, user, previous.order_id)
            : undefined,
      };
    }
  }
  const d =
    action === "order.visit.context"
      ? target.parse(input)
      : action === "order.visit.create"
        ? create.parse(input)
        : cart.parse(input);
  const visit = await activeVisit(tx, user, d.parentOrderId, d.version);
  if (action === "order.visit.context")
    return {
      parentReference: visit.parent.reference,
      customerName: (await one(tx, "SELECT name FROM users WHERE id=$1", [
        visit.parent.customer_id,
      ]))!.name,
      address: visit.parent.address,
      driver: visit.driver,
      tripId: visit.trip.id,
      deliveryKobo: 0,
      capacitiesKg:
        (await settingValue(tx, "gas.quantity_policy", visit.parent.branch_id))
          ?.capacitiesKg ?? [],
      products: (
        await tx.query(
          "SELECT p.id,p.name FROM products p JOIN inventory i ON i.product_id=p.id WHERE i.branch_id=$1 AND i.published AND p.archived=false AND p.category<>'Gas refills' ORDER BY p.name",
          [visit.parent.branch_id],
        )
      ).rows,
    };
  const lines = cart.parse({
    parentOrderId: d.parentOrderId,
    version: d.version,
    items: (d as z.infer<typeof cart>).items,
    gasLines: (d as z.infer<typeof cart>).gasLines,
  });
  if (!lines.items.length && !lines.gasLines?.length)
    throw new AppError(400, "Choose at least one extra product or gas refill.");
  const q = await gasQuote(
    tx,
    lines.gasLines ?? [],
    visit.parent.branch_id,
    lines.items,
    undefined,
  );
  const stockPlan = await visitStockPlan(
    tx,
    visit.trip.id,
    lines.items,
    q.lines.reduce((sum, line) => sum + line.grams, 0),
  );
  const totalKobo = q.subtotalKobo + q.physicalSubtotalKobo;
  const snapshot = {
    parentOrderId: visit.parent.id,
    parentVersion: Number(visit.parent.tracking_version),
    driverId: visit.driver.id,
    tripId: visit.trip.id,
    customerId: visit.parent.customer_id,
    address: visit.parent.address,
    date: visit.parent.delivery_date,
    window: visit.parent.delivery_window,
    items: lines.items,
    gasLines: lines.gasLines ?? [],
    // Catalogue freshness is display metadata, not a price or visit change.
    quote: { ...q, fetchedAt: undefined },
    deliveryKobo: 0,
    totalKobo,
    stockPlan,
  };
  const quoteHash = digest(JSON.stringify(snapshot));
  if (action === "order.visit.quote") return { ...snapshot, quoteHash };
  if (action !== "order.visit.create")
    throw new AppError(404, "Unknown extra-order action.");
  const s = d as z.infer<typeof create>;
  if (s.quoteHash !== quoteHash)
    throw new AppError(
      409,
      "The visit or prices changed. Review the extra order again.",
      "PRICE_CHANGED",
    );
  await reserveVisitStock(tx, visit.parent.branch_id, stockPlan);
  const order = await checkout(
    tx,
    user,
    checkoutSchema.parse({
      items: lines.items,
      gasLines: lines.gasLines,
      pricing: {
        priceVersion: q.priceVersion,
        feeVersion: q.feeVersion,
        policyVersion: q.policyVersion,
        totalKobo,
      },
      address: visit.parent.address,
      date: visit.parent.delivery_date,
      window: visit.parent.delivery_window,
      paymentMethod: "card",
      idempotencyKey: s.requestKey,
      instructions:
        `Extra order for visit ${visit.parent.reference}. ${s.reason}`.slice(
          0,
          500,
        ),
    }),
    {
      customerId: visit.parent.customer_id,
      prepaid: true,
      reason: s.reason,
      visit: { parentOrderId: visit.parent.id, version: s.version },
      visitProducts: stockPlan.products,
    },
  );
  await tx.query(
    "INSERT INTO order_visit_links(order_id,parent_order_id,driver_id,trip_id,actor_id,reason,request_key,request_hash) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
    [
      order!.id,
      visit.parent.id,
      visit.driver.id,
      visit.trip.id,
      user.id,
      s.reason,
      s.requestKey,
      digest(JSON.stringify(s)),
    ],
  );
  await recordVisitStock(tx, user, order!.id, stockPlan);
  // Same confirmed destination on the same visit: retain its current coverage evidence
  // rather than requiring staff to confirm the identical address a second time.
  const coverage = await one(
    tx,
    `SELECT l.id,l.version FROM delivery_locations l
    JOIN audit_events a ON a.action='delivery.coverage_confirmed' AND a.target=$1
      AND a.detail->>'locationId'=l.id AND a.detail->>'locationVersion'=l.version::text
    JOIN users u ON u.id=a.actor_id AND u.active AND u.role IN ('owner','manager')
      AND (u.role='owner' OR u.branch_id=l.branch_id)
    WHERE l.id=$2 AND l.branch_id=$3 LIMIT 1`,
    [visit.parent.id, visit.parent.location_id, visit.parent.branch_id],
  );
  if (
    coverage &&
    (await one(tx, "SELECT location_id FROM orders WHERE id=$1", [order!.id]))
      ?.location_id === coverage.id
  ) {
    await audit(tx, user, "delivery.coverage_confirmed", order!.id, "success", {
      locationId: coverage.id,
      locationVersion: coverage.version,
      address: visit.parent.address,
      sourceParentOrderId: visit.parent.id,
      reason: "Unchanged confirmed address on the existing customer visit",
    });
    await tx.query("UPDATE orders SET operational_review=NULL WHERE id=$1", [
      order!.id,
    ]);
  }

  const paymentLink = await createPhonePaymentLink(tx, user, order!.id);
  const assignmentBlock =
    "Awaiting customer profile/address confirmation and verified payment. The same driver and no additional delivery fee are reserved for this visit.";
  await audit(tx, user, "order.same_visit_created", order!.id, "success", {
    parentOrderId: visit.parent.id,
    driverId: visit.driver.id,
    tripId: visit.trip.id,
    deliveryKobo: 0,
    reason: s.reason,
  });
  return {
    orderId: order!.id,
    reference: order!.reference,
    status: "placed",
    paymentLink,
    assignmentBlock,
    deliveryKobo: 0,
  };
}
