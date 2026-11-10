import { z } from "zod";
import { allow, AppError, type Actor } from "./auth";
import { one, type SQL } from "./db";
import { audit } from "./governance";
import { completeDelivery } from "./delivery";
import { invoiceBalance } from "./invoice-corrections";
const allowed = new Set([
  "me",
  // The web shell still applies role/branch navigation checks to these reads.
  "navigation.access",
  "navigation",
  "orders",
  "logout",
  "reauth",
  "account.profile",
  "account.update",
  "account.password",
  "preferences.save",
  "notifications.read",
  "support.list",
  "support.create",
  "support.reply",
  "driver.snapshot",
  "driver.heartbeat",
  "driver.location",
  "manifest.summary",
  "manifest.acknowledge",
  "manifest.return.declare",
  "trip.start",
  "trip.end",
  "trip.sync",
  "driver.restrict",
  "driver.availability",
  "driver.complete",
  "dispatch.respond",
  "delivery.pickup",
  "delivery.arrived",
  "delivery.help",
  "order.transition",
  "tracking.operation",
  "delivery.photos",
  "bulk.summary",
  "bulk.load.acknowledge",
  "bulk.dispense",
  "bulk.collection.record",
  "bulk.return.declare",
  "doorstep.list",
  "doorstep.gas.propose",
  "doorstep.products.propose",
  "doorstep.products.collection.report",
  "doorstep.products.handover",
  "doorstep.collection.report",
  "doorstep.dispense",
]);
export function driverSessionPermission(
  user: Actor,
  action: string,
  input: any,
) {
  if (!user.driver_delivery_only) return;
  if (!allowed.has(action))
    throw new AppError(
      403,
      "This session is limited to delivery work. Contact dispatch for sales, cash, stock or financial changes.",
    );
  if (
    action === "trip.sync" &&
    (!Array.isArray(input?.events) ||
      input.events.some((e: any) => e.kind !== "gps"))
  )
    throw new AppError(
      403,
      "This driver session may synchronise only consented GPS points.",
    );
  if (
    action === "order.transition" &&
    !["out_for_delivery", "delivery_failed"].includes(input?.status)
  )
    throw new AppError(
      403,
      "Only authorised delivery progression or a recorded failure is permitted.",
    );
}
export async function driverWorkspace(
  tx: SQL,
  user: Actor,
  action: string,
  input: unknown,
) {
  allow(user, ["driver"]);
  if (action === "driver.restrict") {
    z.object({}).strict().parse(input);
    await tx.query(
      "UPDATE sessions SET driver_delivery_only=true WHERE id=$1 AND user_id=$2",
      [user.session_id, user.id],
    );
    await audit(tx, user, "driver.session.restricted", user.session_id);
    return { ok: true };
  }
  if (!user.driver_delivery_only)
    throw new AppError(403, "Open a verified delivery-only session first.");
  if (action === "driver.location") {
    z.object({}).strict().parse(input);
    const trip = await one(
      tx,
      "SELECT t.*,(SELECT COALESCE(max(e.sequence),0)+1 FROM trip_events e WHERE e.trip_id=t.id) AS next_sequence FROM driver_trips t WHERE t.driver_id=$1 AND t.branch_id=$2 AND t.ended_at IS NULL",
      [user.id, user.branch_id],
    );
    return {
      trip: trip ? { ...trip, nextSequence: Number(trip.next_sequence) } : null,
      vehicles: (
        await tx.query(
          "SELECT id,label FROM driver_vehicles WHERE branch_id=$1 AND active=true AND lpg_suitable=true ORDER BY label",
          [user.branch_id],
        )
      ).rows,
    };
  }
  if (action === "driver.heartbeat") {
    z.object({}).strict().parse(input);
    const active=await one(tx,"SELECT id FROM branches WHERE id=$1 AND active=true",[user.branch_id]);
    if(!active) throw new AppError(409,"Driver branch is inactive.");
    await tx.query("UPDATE users SET driver_last_seen_at=now() WHERE id=$1 AND active=true AND (driver_last_seen_at IS NULL OR driver_last_seen_at<now()-interval '15 seconds')",[user.id]);
    return {observedAt:(await one(tx,"SELECT driver_last_seen_at FROM users WHERE id=$1",[user.id]))?.driver_last_seen_at};
  }
  if (action === "driver.snapshot") {
    z.object({}).strict().parse(input);
    const profile = await one(
      tx,
      "SELECT id,name,email,contact_phone,driver_available,driver_availability_updated_at,driver_last_seen_at FROM users WHERE id=$1",
      [user.id],
    );
    const responses = (
      await tx.query(
        "SELECT a.order_id,r.decision FROM delivery_attempts a JOIN orders o ON o.id=a.order_id LEFT JOIN dispatch_responses r ON r.attempt_id=a.id WHERE a.driver_id=$1 AND o.driver_id=$1 AND a.state='assigned' ORDER BY a.created_at DESC LIMIT 100",
        [user.id],
      )
    ).rows;
    return {
      profile,
      responses,
      gps: { status: "unavailable", lastUpdated: null },
      proofRequired: true,
      galleryApproved: process.env.EASYGAS_DRIVER_GALLERY_APPROVED === "true",
      paymentCollection: false,
    };
  }
  if (
    process.env.NODE_ENV === "production" &&
    process.env.EASYGAS_FIELD_OPERATIONS_ENABLED !== "true"
  )
    throw new AppError(
      503,
      "Driver mutations require operational release approval.",
    );
  if (action === "driver.availability") {
    const d = z.object({ available: z.boolean() }).strict().parse(input);
    await tx.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [user.id]);
    const active = await one(
      tx,
      "SELECT id FROM branches WHERE id=$1 AND active=true FOR UPDATE",
      [user.branch_id],
    );
    if (!active)
      throw new AppError(409, "Your branch is inactive. Contact dispatch.");
    if (
      !d.available &&
      (await one(
        tx,
        "SELECT id FROM orders WHERE driver_id=$1 AND status IN ('assigned','out_for_delivery') LIMIT 1",
        [user.id],
      ))
    )
      throw new AppError(
        409,
        "Contact dispatch to reconcile active assignments before going unavailable.",
      );
    await tx.query(
      "UPDATE users SET driver_available=$1,driver_availability_updated_at=now() WHERE id=$2",
      [d.available, user.id],
    );
    await audit(tx, user, "driver.availability.changed", user.id, "success", {
      available: d.available,
    });
    return { available: d.available };
  }
  if (action === "driver.complete") {
    if (
      process.env.EASYGAS_TRACKING_MUTATIONS_ENABLED === "false" ||
      (process.env.NODE_ENV === "production" &&
        process.env.EASYGAS_TRACKING_MUTATIONS_ENABLED !== "true")
    )
      throw new AppError(
        503,
        "Delivery completion is disabled pending operational approval.",
      );
    const d = z
      .object({
        orderId: z.string().uuid(),
        version: z.number().int().nonnegative(),
        code: z.string().regex(/^\d{6}$/),
        handover: z.literal(true),
      })
      .strict()
      .parse(input);
    const order = await one(tx, "SELECT * FROM orders WHERE id=$1 FOR UPDATE", [
      d.orderId,
    ]);
    if (
      !order ||
      order.driver_id !== user.id ||
      order.branch_id !== user.branch_id
    )
      throw new AppError(404, "Assigned delivery not found.");
    let verifiedCash = false;
    if (
      order.payment_method === "cash_on_delivery" &&
      order.payment_status === "verified"
    ) {
      const cash = await one(
        tx,
        "SELECT * FROM cash_collections WHERE order_id=$1 AND collector_id=$2 AND verified_at IS NOT NULL",
        [order.id, user.id],
      );
      const invoice = await one(
        tx,
        "SELECT * FROM customer_invoices WHERE order_id=$1",
        [order.id],
      );
      const balance = invoice ? await invoiceBalance(tx, invoice) : null;
      verifiedCash = Boolean(
        cash &&
          Number(cash.amount_kobo) === Number(order.total_kobo) &&
          balance &&
          !balance.voided &&
          balance.amountDueKobo === 0 &&
          balance.overpaidKobo === 0,
      );
    }
    if (
      !(
        (["wallet", "card"].includes(order.payment_method) &&
          order.payment_status === "verified") ||
        verifiedCash
      )
    )
      throw new AppError(
        409,
        "Payment needs authorised operations review. This driver app cannot collect cash or change payment.",
      );
    const attempt = await one(
      tx,
      "SELECT * FROM delivery_attempts WHERE order_id=$1 ORDER BY assignment_version DESC LIMIT 1 FOR UPDATE",
      [order.id],
    );
    if (
      !attempt ||
      attempt.driver_id !== user.id ||
      attempt.state !== "arrived"
    )
      throw new AppError(
        409,
        "Verified arrival at the current assigned visit is required.",
      );
    const proof = await one(
      tx,
      "SELECT id FROM delivery_photos WHERE order_id=$1 AND attempt_id=$2 AND actor_id=$3 AND consent=true AND retain_until>now() AND octet_length(data)>0 LIMIT 1",
      [order.id, attempt.id, user.id],
    );
    if (!proof)
      throw new AppError(
        409,
        "Upload an authorised proof photo for this delivery attempt before completion.",
      );
    return completeDelivery(tx, user, {
      ...d,
      collectedKobo: verifiedCash ? Number(order.total_kobo) : 0,
    });
  }
  throw new AppError(404, "Unknown driver action.");
}
