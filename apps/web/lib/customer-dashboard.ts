import { z } from "zod";
import { type SQL, one } from "./db";
import { allow, type Actor } from "./auth";
export async function customerDashboard(tx: SQL, user: Actor, input: unknown) {
  allow(user, ["customer", "commercial"]);
  const { widget } = z
    .object({
      widget: z.enum([
        "navigation",
        "orders",
        "activity",
        "history",
        "appointment",
        "cylinders",
        "invoices",
      ]),
    })
    .strict()
    .parse(input);
  if (widget === "cylinders")
    return (
      await tx.query(
        "SELECT id,serial,size_kg,status,test_due,ownership FROM cylinders WHERE customer_id=$1 AND ownership='customer' ORDER BY created_at DESC,id DESC LIMIT 100",
        [user.id],
      )
    ).rows;
  if (widget === "invoices")
    return (
      await tx.query(
        "SELECT i.order_id,i.booking_id,i.invoice_number,i.issued_at,i.total_kobo,COALESCE(o.reference,b.reference) AS reference FROM customer_invoices i LEFT JOIN orders o ON o.id=i.order_id LEFT JOIN service_bookings b ON b.id=i.booking_id WHERE i.customer_id=$1 AND (o.customer_id=$1 OR b.customer_id=$1) ORDER BY i.issued_at DESC,i.id DESC LIMIT 100",
        [user.id],
      )
    ).rows;
  if (widget === "navigation") {
    const counts = await one(
      tx,
      `SELECT
      (SELECT count(*)::int FROM notifications WHERE user_id=$1 AND read_at IS NULL) AS notifications,
      (SELECT count(*)::int FROM orders WHERE customer_id=$1 AND status NOT IN ('delivered','cancelled')) AS orders,
      (SELECT count(*)::int FROM service_bookings WHERE customer_id=$1 AND status NOT IN ('completed','cancelled','failed')) AS bookings,
      (SELECT count(*)::int FROM support_requests WHERE customer_id=$1 AND status NOT IN ('closed','resolved')) AS support`,
      [user.id],
    );
    const address = await one(
      tx,
      `SELECT a.id,a.label,a.zone,a.location_id FROM account_addresses a JOIN delivery_locations l ON l.id=a.location_id JOIN branches b ON b.id=l.branch_id WHERE a.customer_id=$1 AND a.is_default AND NOT a.archived AND l.active AND l.visible AND NOT l.archived AND b.active LIMIT 1`,
      [user.id],
    );
    return { counts, address: address ?? null };
  }
  if (widget === "appointment")
    return (
      (await one(
        tx,
        "SELECT b.id,b.reference,b.status,b.snapshot->>'name' AS name,s.starts_at FROM service_bookings b JOIN service_slots s ON s.id=b.slot_id WHERE b.customer_id=$1 AND b.status NOT IN ('completed','cancelled','failed') AND s.ends_at>now() ORDER BY s.starts_at LIMIT 1",
        [user.id],
      )) ?? null
    );
  if (widget === "orders") {
    return {
      counts: (
        await tx.query(
          "SELECT status,count(*)::int AS count FROM orders WHERE customer_id=$1 GROUP BY status",
          [user.id],
        )
      ).rows,
      latest:
        (await one(
          tx,
          "SELECT reference,status,created_at FROM orders WHERE customer_id=$1 ORDER BY created_at DESC,id DESC LIMIT 1",
          [user.id],
        )) ?? null,
    };
  }
  if (widget === "activity")
    return (
      await tx.query(
        `SELECT * FROM (
    SELECT 'order:'||id AS id,'Order placed' AS title,reference AS detail,created_at,status,'/orders' AS href FROM orders WHERE customer_id=$1
    UNION ALL SELECT 'event:'||e.id,'Delivery completed',o.reference,e.created_at,e.status,'/orders' FROM order_events e JOIN orders o ON o.id=e.order_id WHERE o.customer_id=$1 AND e.status='delivered'
    UNION ALL SELECT 'booking:'||id,'Service appointment booked',reference,created_at,status,'/bookings' FROM service_bookings WHERE customer_id=$1
    UNION ALL SELECT 'reward:'||id,CASE WHEN points>0 THEN 'Reward points earned' ELSE 'Reward points adjusted' END,points::text||' points',created_at,'recorded','/rewards' FROM reward_entries WHERE customer_id=$1
    UNION ALL SELECT 'wallet:'||id,'Wallet credit received',reference,created_at,'recorded','/wallet' FROM wallet_entries WHERE customer_id=$1 AND amount_kobo>0
    UNION ALL SELECT 'notice:'||id,title,body,created_at,CASE WHEN read_at IS NULL THEN 'unread' ELSE 'read' END,'/notifications' FROM notifications WHERE user_id=$1 AND title ILIKE '%refill%'
    ) events ORDER BY created_at DESC,id DESC LIMIT 8`,
        [user.id],
      )
    ).rows;
  // Quantities are verified purchases, never measured consumption. Aggregate each order once.
  return (
    await tx.query(
      `SELECT o.id,o.reference,COALESCE(o.delivered_at,(SELECT min(e.created_at) FROM order_events e WHERE e.order_id=o.id AND e.status='delivered')) AS date,
    COALESCE((SELECT sum(g.grams)/1000.0 FROM order_gas_lines g WHERE g.order_id=o.id),0)+COALESCE((SELECT sum(i.quantity*p.size_kg) FROM order_items i JOIN products p ON p.id=i.product_id WHERE i.order_id=o.id AND p.category='Gas refills'),0) AS kg
    FROM orders o WHERE o.customer_id=$1 AND o.status='delivered' AND o.payment_status='verified' AND EXISTS(SELECT 1 FROM verified_payments v WHERE v.order_id=o.id)
    AND (o.delivered_at IS NOT NULL OR EXISTS(SELECT 1 FROM order_events e WHERE e.order_id=o.id AND e.status='delivered'))
    AND (EXISTS(SELECT 1 FROM order_gas_lines g WHERE g.order_id=o.id) OR EXISTS(SELECT 1 FROM order_items i JOIN products p ON p.id=i.product_id WHERE i.order_id=o.id AND p.category='Gas refills'))
    ORDER BY date DESC,o.id DESC LIMIT 12`,
      [user.id],
    )
  ).rows;
}
