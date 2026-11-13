import { cylinderAllocationReadiness } from "./cylinder-allocation";
import { vehicleReady } from "./fleet-constraints";
import { invoiceBalance } from "./invoice-corrections";
import { z } from "zod";
import { randomInt } from "node:crypto";
import { one, type SQL } from "./db";
import { AppError, allow, id, digest, type Actor } from "./auth";
import { verifyGasDispatch } from "./gas-delivery";
import { notify, audit } from "./governance";
import { canonicalRequest } from "./business-operation";
async function settingValue(tx: SQL, key: string, scope: string) {
  return (
    await one(tx, "SELECT value FROM settings WHERE key=$1 AND scope=$2", [
      key,
      scope,
    ])
  )?.value;
}

export async function deliveryManifest(tx: SQL, orderId: string) {
  const items = (
    await tx.query(
      "SELECT product_id,quantity FROM order_items WHERE order_id=$1 ORDER BY product_id",
      [orderId],
    )
  ).rows;
  const serials = (
    await tx.query(
      "SELECT DISTINCT c.serial FROM cylinders c WHERE c.id IN (SELECT cylinder_id FROM cylinder_allocations WHERE order_id=$1 AND state='reserved' UNION SELECT cylinder_id FROM order_gas_lines WHERE order_id=$1) ORDER BY c.serial",
      [orderId],
    )
  ).rows.map((r) => r.serial);
  const gas = (
    await tx.query(
      "SELECT id,grams,capacity_grams FROM order_gas_lines WHERE order_id=$1 ORDER BY id",
      [orderId],
    )
  ).rows;
  return { items, serials, gas };
}
export async function fulfilmentReady(tx: SQL, o: any) {
  if (
    o.driver_id &&
    (process.env.NODE_ENV === "production" ||
      process.env.EASYGAS_FIELD_OPERATIONS_ENABLED === "true")
  )
    await vehicleReady(tx, o.driver_id, o.id, o.branch_id);

  const invoice = await one(
    tx,
    "SELECT * FROM customer_invoices WHERE order_id=$1",
    [o.id],
  );
  let dispatchBalance: Awaited<ReturnType<typeof invoiceBalance>> | null = null;
  if (invoice) {
    const corrected = await invoiceBalance(tx, invoice);
    dispatchBalance = corrected;
    const additions = await one(
      tx,
      "SELECT COALESCE(sum(CASE WHEN EXISTS(SELECT 1 FROM doorstep_cylinder_lines cl WHERE cl.amendment_id=e.amendment_id) THEN (SELECT COALESCE(sum(cl.amount_kobo),0) FROM doorstep_cylinder_lines cl WHERE cl.amendment_id=e.amendment_id AND cl.state='dispensed') WHEN e.state='dispensed' THEN e.amount_kobo ELSE 0 END),0) AS dispensed,count(*) FILTER(WHERE e.state='reserved') AS pending FROM doorstep_execution e WHERE order_id=$1",
      [o.id],
    );
    const products = await one(
      tx,
      "SELECT COALESCE(sum(amount_kobo) FILTER(WHERE state='handed'),0) handed,count(*) FILTER(WHERE state='reserved') pending FROM doorstep_product_execution WHERE order_id=$1",
      [o.id],
    );
    const supplementary =
      Number(additions!.dispensed) + Number(products!.handed);
    if (
      corrected.voided ||
      Number(additions!.pending) > 0 ||
      Number(products!.pending) > 0 ||
      corrected.totalKobo !== Number(o.total_kobo) + supplementary ||
      (supplementary > 0 && corrected.amountDueKobo !== 0) ||
      corrected.notes.some((n) => n.state === "pending")
    )
      throw new AppError(
        409,
        "Invoice correction requires finance and fulfilment reconciliation before dispatch or handover.",
      );
  }

  // Authoritative payment ledger, or the existing explicitly approved branch COD exception.
  // A redirect, cached order payment_status or a driver's collection report is not payment proof.
  const approvedCOD=o.payment_method === "cash_on_delivery" && (await settingValue(tx,"payment.cod",o.branch_id)) === true;
  // Legacy invoice-less orders still use the same net-payment/refund authority.
  const verified=dispatchBalance ?? await invoiceBalance(tx,invoice ?? {id:null,order_id:o.id,total_kobo:o.total_kobo});
  if(!approvedCOD && (verified.voided || verified.paidKobo < verified.totalKobo))
    throw new AppError(409,"Verified payment or an approved cash-on-delivery exception is required before dispatch.");

  const branch = await one(
    tx,
    "SELECT active FROM branches WHERE id=$1 FOR UPDATE",
    [o.branch_id],
  );
  if (!branch?.active)
    throw new AppError(409, "This fulfilment branch is not active.");
  const capacity = Number(
    await settingValue(tx, "delivery.capacity", o.branch_id),
  );
  const booked = Number(
    (await one(
      tx,
      "SELECT count(*) n FROM orders WHERE branch_id=$1 AND delivery_date=$2 AND delivery_window=$3 AND status NOT IN ('cancelled','delivery_failed')",
      [o.branch_id, o.delivery_date, o.delivery_window],
    ))!.n,
  );
  if (!Number.isFinite(capacity) || capacity <= 0 || booked > capacity)
    throw new AppError(
      409,
      "Delivery capacity requires dispatch reconciliation before fulfilment.",
    );
  await tx.query(
    "SELECT c.id FROM cylinders c WHERE c.id IN (SELECT cylinder_id FROM cylinder_allocations WHERE order_id=$1 AND state='reserved' UNION SELECT cylinder_id FROM order_gas_lines WHERE order_id=$1) ORDER BY c.id FOR UPDATE",
    [o.id],
  );
  const held = await one(
    tx,
    "SELECT g.id FROM order_gas_lines g JOIN orders other ON other.id=g.order_id WHERE g.order_id<>$1 AND g.cylinder_id IN (SELECT cylinder_id FROM order_gas_lines WHERE order_id=$1 UNION SELECT cylinder_id FROM cylinder_allocations WHERE order_id=$1 AND state='reserved') AND (other.status NOT IN ('cancelled','delivered','delivery_failed') OR EXISTS(SELECT 1 FROM delivery_attempts a WHERE a.order_id=other.id AND a.picked_up_at IS NOT NULL AND a.state IN ('picked_up','arrived','failed'))) LIMIT 1",
    [o.id],
  );
  if (held)
    throw new AppError(
      409,
      "This cylinder remains committed to another order or physical delivery custody. Reconcile its return before reissue.",
    );
  if (o.driver_id) {
    const driver = await one(
      tx,
      "SELECT id FROM users WHERE id=$1 AND role='driver' AND active=true AND branch_id=$2 FOR UPDATE",
      [o.driver_id, o.branch_id],
    );
    if (!driver)
      throw new AppError(
        409,
        "Assigned driver is no longer eligible in this branch.",
      );
  }
  await cylinderAllocationReadiness(tx, {orderId:o.id});
  const shortages = await one(
    tx,
    "SELECT i.product_id FROM order_items i LEFT JOIN inventory s ON s.product_id=i.product_id AND s.branch_id=$2 WHERE i.order_id=$1 AND (s.product_id IS NULL OR s.reserved<i.quantity OR s.quantity<s.reserved) LIMIT 1",
    [o.id, o.branch_id],
  );
  if (shortages)
    throw new AppError(
      409,
      "Reserved stock requires reconciliation before fulfilment.",
    );
  const unsafe = await one(
    tx,
    "SELECT a.id FROM cylinder_allocations a JOIN cylinders c ON c.id=a.cylinder_id WHERE a.order_id=$1 AND a.state='reserved' AND (c.branch_id<>$2 OR c.status<>'empty' OR c.ownership<>'company' OR c.customer_id IS NOT NULL OR c.test_due<=CURRENT_DATE) LIMIT 1",
    [o.id, o.branch_id],
  );
  if (unsafe)
    throw new AppError(
      409,
      "Allocated cylinder inspection or custody is no longer eligible.",
    );
  await verifyGasDispatch(tx, o.id);
}
export async function beginAttempt(tx: SQL, o: any, driverId: string) {
  const prior = await one(
    tx,
    "SELECT * FROM delivery_attempts WHERE order_id=$1 ORDER BY assignment_version DESC LIMIT 1",
    [o.id],
  );
  if (prior?.picked_up_at && !["returned", "delivered"].includes(prior.state))
    throw new AppError(
      409,
      "Physically receive and inspect the held goods/cylinders before reassignment.",
    );
  const driver = await one(
    tx,
    "SELECT id FROM users WHERE id=$1 AND branch_id=$2 AND role='driver' AND active=true AND driver_available=true FOR UPDATE",
    [driverId, o.branch_id],
  );
  if (!driver) throw new AppError(409, "Driver unavailable in this branch.");
  const capacity = Number(
    await settingValue(tx, "delivery.capacity", o.branch_id),
  );
  const count = Number(
    (await one(
      tx,
      "SELECT count(*) n FROM orders WHERE driver_id=$1 AND delivery_date=$2 AND delivery_window=$3 AND id<>$4 AND status IN ('assigned','out_for_delivery')",
      [driverId, o.delivery_date, o.delivery_window, o.id],
    ))!.n,
  );
  if (!Number.isFinite(capacity) || capacity <= count)
    throw new AppError(409, "Driver delivery capacity is fully booked.");
  await tx.query(
    "INSERT INTO delivery_attempts(id,order_id,driver_id,assignment_version,state) VALUES($1,$2,$3,$4,'assigned')",
    [id(), o.id, driverId, Number(o.tracking_version) + 1],
  );

  if (
    process.env.NODE_ENV === "production" ||
    process.env.EASYGAS_FIELD_OPERATIONS_ENABLED === "true"
  )
    await tx.query(
      "UPDATE delivery_attempts SET requires_ack=true WHERE order_id=$1 AND state='assigned'",
      [o.id],
    );
  let code: string;
  do {
    code = String(randomInt(100000, 1000000));
  } while (digest(code) === o.delivery_code_hash);
  await tx.query(
    "UPDATE orders SET delivery_code_hash=$1,delivery_code_expires_at=now()+interval '24 hours' WHERE id=$2",
    [digest(code), o.id],
  );
  await notify(
    tx,
    o.customer_id,
    "Delivery confirmation code",
    `Your delivery confirmation code is ${code}. Share it only after receiving all items.`,
    o.id,
  );
}
const movement = z
  .object({
    orderId: z.string().uuid(),
    version: z.number().int().nonnegative(),
    reason: z.string().min(5).max(500),
    manifest: z.unknown().optional(),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    window: z.string().max(50).optional(),
  })
  .strict();
export async function trackingAction(
  tx: SQL,
  user: Actor,
  action: string,
  input: unknown,
) {
  const d = movement.parse(input);
  const o = await one(tx, "SELECT * FROM orders WHERE id=$1 FOR UPDATE", [
    d.orderId,
  ]);
  if (!o) throw new AppError(404, "Order not found.");
  allow(
    user,
    ["owner", "manager", "driver", "finance"],
    o.branch_id,
  );
  if (user.role === "driver" && o.driver_id !== user.id)
    throw new AppError(403, "This delivery is assigned to another driver.");
  if (Number(o.tracking_version) !== d.version)
    throw new AppError(
      409,
      "This order changed. Refresh before retrying.",
      "TRACKING_VERSION_CONFLICT",
    );
  const a = await one(
    tx,
    "SELECT * FROM delivery_attempts WHERE order_id=$1 ORDER BY assignment_version DESC LIMIT 1 FOR UPDATE",
    [o.id],
  );
  if (action === "delivery.reschedule") {
    allow(user, ["owner", "manager"], o.branch_id);
    if (
      !["placed", "accepted", "preparing", "delivery_failed"].includes(o.status)
    )
      throw new AppError(
        409,
        "This order cannot be rescheduled in its current state.",
      );
    if (a?.picked_up_at && a.state !== "returned")
      throw new AppError(
        409,
        "Physical return reconciliation is required before rescheduling.",
      );
    if (!d.date || !d.window || d.date < new Date().toISOString().slice(0, 10))
      throw new AppError(400, "Choose a valid future date and window.");
    const windows = String(
      await settingValue(tx, "delivery.windows", o.branch_id),
    )
      .split(",")
      .map((v) => v.trim());
    if (!windows.includes(d.window))
      throw new AppError(400, "Choose a configured delivery window.");
    const branch = await one(
      tx,
      "SELECT active FROM branches WHERE id=$1 FOR UPDATE",
      [o.branch_id],
    );
    if (!branch?.active)
      throw new AppError(409, "This fulfilment branch is not active.");
    const n = Number(
      (await one(
        tx,
        "SELECT count(*) n FROM orders WHERE branch_id=$1 AND delivery_date=$2 AND delivery_window=$3 AND id<>$4 AND status NOT IN ('cancelled','delivery_failed')",
        [o.branch_id, d.date, d.window, o.id],
      ))!.n,
    );
    if (n >= Number(await settingValue(tx, "delivery.capacity", o.branch_id)))
      throw new AppError(409, "This delivery window is fully booked.");
    await tx.query(
      "UPDATE orders SET delivery_date=$1,delivery_window=$2 WHERE id=$3",
      [d.date, d.window, o.id],
    );
  } else {
    if (!a)
      throw new AppError(
        409,
        "Dispatch must assign a new verified attempt first.",
      );
    const kind = action.slice("delivery.".length);
    if (kind === "pickup") {
      allow(user, ["driver"], o.branch_id);
      if (o.status !== "assigned" || a.state !== "assigned")
        throw new AppError(409, "Only an assigned delivery can be picked up.");
      if (a.requires_ack || user.driver_delivery_only) {
        const response = await one(
          tx,
          "SELECT decision FROM dispatch_responses WHERE attempt_id=$1",
          [a.id],
        );
        if (response?.decision !== "acknowledged")
          throw new AppError(409, "Acknowledge this assignment before pickup.");
      }
      await fulfilmentReady(tx, o);
      const manifest = await deliveryManifest(tx, o.id);
      if (canonicalRequest(d.manifest) !== canonicalRequest(manifest))
        throw new AppError(
          409,
          "Confirm the complete quantities and cylinder serials against the current manifest.",
        );
      await tx.query(
        "UPDATE delivery_attempts SET state='picked_up',picked_up_at=now() WHERE id=$1",
        [a.id],
      );
    } else if (kind === "arrived") {
      allow(user, ["driver"], o.branch_id);
      if (o.status !== "out_for_delivery" || a.state !== "picked_up")
        throw new AppError(
          409,
          "Only a dispatched pickup can be marked arrived.",
        );
      await tx.query(
        "UPDATE delivery_attempts SET state='arrived',arrived_at=now() WHERE id=$1",
        [a.id],
      );
    } else if (kind === "help") {
      await tx.query(
        "INSERT INTO operational_incidents(id,branch_id,severity,category,target,detail,owner_role) VALUES($1,$2,'high','delivery_help',$3,$4,'manager') ON CONFLICT(category,target) DO NOTHING",
        [id(), o.branch_id, a.id, `Order ${o.reference}: ${d.reason}`],
      );
      await audit(tx, user, "delivery.help", o.id, "success", {
        attemptId: a.id,
        reason: d.reason,
      });
      return { ok: true, orderId: o.id, version: d.version };
    } else if (kind === "return") {
      allow(user, ["owner", "finance"], o.branch_id);
      if (
        o.status !== "delivery_failed" ||
        !a.picked_up_at ||
        a.state !== "failed"
      )
        throw new AppError(
          409,
          "Only physically held failed deliveries can be received.",
        );
      const manifest = await deliveryManifest(tx, o.id);
      if (canonicalRequest(d.manifest) !== canonicalRequest(manifest))
        throw new AppError(
          409,
          "Inspect and receive every item and serial before reconciling return.",
        );
      // Unsafe cylinders are not restocked/reissued; inspection workflow must correct them separately.
      await fulfilmentReady(tx, { ...o, driver_id: null });
      await tx.query(
        "UPDATE delivery_attempts SET state='returned',completed_at=now() WHERE id=$1",
        [a.id],
      );
    } else throw new AppError(404, "Tracking operation unavailable.");
    await tx.query(
      "INSERT INTO delivery_evidence(id,attempt_id,actor_id,kind,detail) VALUES($1,$2,$3,$4,$5)",
      [
        id(),
        a.id,
        user.id,
        kind,
        JSON.stringify({ reason: d.reason, manifest: d.manifest }),
      ],
    );
  }
  await tx.query(
    "INSERT INTO order_events(id,order_id,status,actor_id,note) VALUES($1,$2,$3,$4,$5)",
    [id(), o.id, o.status, user.id, `${action}: ${d.reason}`],
  );
  await audit(tx, user, action, o.id);
  return { ok: true, orderId: o.id, version: d.version + 1 };
}
export async function publishTrackingNotifications(tx: SQL) {
  const rows = (
    await tx.query(
      "SELECT b.*,e.status,o.customer_id,o.reference FROM order_event_outbox b JOIN order_events e ON e.id=b.event_id JOIN orders o ON o.id=b.order_id WHERE b.notified_at IS NULL ORDER BY b.created_at LIMIT 100 FOR UPDATE OF b SKIP LOCKED",
    )
  ).rows;
  for (const e of rows) {
    await notify(
      tx,
      e.customer_id,
      "Order update",
      `${e.reference}: ${e.status.replaceAll("_", " ")}. Open tracking for the committed details.`,
      e.order_id,
    );
    await tx.query(
      "UPDATE order_event_outbox SET notified_at=now() WHERE event_id=$1",
      [e.event_id],
    );
  }
  return { published: rows.length };
}
