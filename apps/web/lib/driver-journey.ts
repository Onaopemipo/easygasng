import { z } from "zod";
import { one, type SQL } from "./db";
import { allow, AppError, type Actor } from "./auth";
import { canonicalRequest } from "./business-operation";
import { deliveryManifest, trackingAction } from "./order-tracking";
import { transitionOrder } from "./operations";

/** Runs within one existing business-operation transaction. No physical receipt is invented. */
export async function departDelivery(tx: SQL, user: Actor, input: unknown) {
  allow(user, ["driver"]);
  const d = z
    .object({
      orderId: z.uuid(),
      version: z.number().int().nonnegative(),
      loadConfirmed: z.literal(true),
      manifest: z.unknown(),
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
    throw new AppError(404, "Assigned order not found.");
  if (
    order.status !== "assigned" ||
    Number(order.tracking_version) !== d.version
  )
    throw new AppError(
      409,
      "This order changed. Refresh before starting delivery.",
    );
  const attempt = await one(
    tx,
    "SELECT * FROM delivery_attempts WHERE order_id=$1 ORDER BY assignment_version DESC LIMIT 1 FOR UPDATE",
    [order.id],
  );
  if (!attempt || !["assigned", "picked_up"].includes(attempt.state))
    throw new AppError(409, "Refresh the current delivery assignment.");
  if (
    canonicalRequest(d.manifest) !==
    canonicalRequest(await deliveryManifest(tx, order.id))
  )
    throw new AppError(
      409,
      "The vehicle load for this order changed. Review it before starting.",
    );
  if (attempt.state === "assigned")
    await trackingAction(tx, user, "delivery.pickup", {
      orderId: order.id,
      version: d.version,
      manifest: d.manifest,
      reason:
        "Driver explicitly confirmed the displayed vehicle load before departure",
    });
  const current = await one(
    tx,
    "SELECT tracking_version FROM orders WHERE id=$1",
    [order.id],
  );
  await transitionOrder(tx, user, {
    id: order.id,
    status: "out_for_delivery",
    version: Number(current!.tracking_version),
    note: "Driver confirmed vehicle load and started delivery",
  });
  return {
    ok: true,
    orderId: order.id,
    status: "out_for_delivery",
    version: Number(
      (await one(tx, "SELECT tracking_version FROM orders WHERE id=$1", [
        order.id,
      ]))!.tracking_version,
    ),
  };
}
