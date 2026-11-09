import { z } from "zod";
import { allow, AppError, id, digest, type Actor } from "./auth";
import { one, type SQL } from "./db";
import { audit } from "./governance";
import { createHash } from "node:crypto";
export async function photoOrder(
  tx: SQL,
  user: Actor,
  orderId: string,
  write = false,
) {
  const o = await one(
    tx,
    "SELECT * FROM orders WHERE id=$1" + (write ? " FOR UPDATE" : ""),
    [orderId],
  );
  if (!o) throw new AppError(404, "Order not found.");
  if (["customer", "commercial"].includes(user.role)) {
    if (write || o.customer_id !== user.id)
      throw new AppError(404, "Order not found.");
  } else {
    allow(
      user,
      write ? ["driver"] : ["owner", "manager", "dispatcher", "driver"],
      o.branch_id,
    );
    if (user.role === "driver" && o.driver_id !== user.id)
      throw new AppError(404, "Order not found.");
  }
  return o;
}
export async function attachDeliveryPhoto(
  tx: SQL,
  user: Actor,
  orderId: string,
  data: Buffer,
  alt: string,
  consent: boolean,
  capturedAt?: string,
) {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.EASYGAS_FIELD_OPERATIONS_ENABLED !== "true"
  )
    throw new AppError(
      503,
      "Proof uploads require operational release approval.",
    );
  const o = await photoOrder(tx, user, orderId, true);
  if (!consent)
    throw new AppError(
      400,
      "Record customer consent before taking or uploading a photo.",
    );
  if (!["out_for_delivery", "delivered"].includes(o.status))
    throw new AppError(409, "Photos must belong to an active assigned visit.");
  const a = await one(
    tx,
    "SELECT * FROM delivery_attempts WHERE order_id=$1 AND driver_id=$2 AND state IN ('picked_up','arrived','delivered') ORDER BY assignment_version DESC LIMIT 1",
    [o.id, user.id],
  );
  if (!a) throw new AppError(409, "Verified pickup required.");
  const capture = capturedAt ? Date.parse(capturedAt) : Date.now();
  if (
    !Number.isFinite(capture) ||
    capture < new Date(a.created_at).getTime() - 60000 ||
    capture > Date.now() + 60000 ||
    (a.completed_at &&
      (!capturedAt || capture > new Date(a.completed_at).getTime()))
  )
    throw new AppError(
      409,
      "Photo capture time is outside this delivery attempt.",
    );
  if (data.length > 4000000 || alt.length < 3 || alt.length > 250)
    throw new AppError(400, "Image or label is invalid.");
  const days = z.coerce
    .number()
    .int()
    .min(1)
    .max(365)
    .parse(process.env.EASYGAS_PROOF_RETENTION_DAYS ?? 30);
  if (
    process.env.NODE_ENV === "production" &&
    !process.env.EASYGAS_PROOF_RETENTION_DAYS
  )
    throw new AppError(
      503,
      "Approve proof-photo retention before production uploads.",
    );
  const hash = createHash("sha256").update(data).digest("hex");
  const prior = await one(
    tx,
    "SELECT id FROM delivery_photos WHERE order_id=$1 AND sha256=$2",
    [o.id, hash],
  );
  if (prior)
    return { id: prior.id, url: "/api/media/" + prior.id, replayed: true };
  if (
    Number(
      (
        await one(
          tx,
          "SELECT count(*) AS n FROM delivery_photos WHERE order_id=$1",
          [o.id],
        )
      )?.n,
    ) >= 12
  )
    throw new AppError(409, "Maximum twelve evidence photos per order.");
  const mid = id();
  await tx.query(
    "INSERT INTO delivery_photos(id,order_id,attempt_id,actor_id,data,sha256,alt,consent,retain_until,captured_at) VALUES($1,$2,$3,$4,$5,$6,$7,true,$8,$9)",
    [
      mid,
      o.id,
      a.id,
      user.id,
      data,
      hash,
      alt,
      new Date(capture + days * 86400000).toISOString(),
      new Date(capture).toISOString(),
    ],
  );
  await audit(tx, user, "delivery.photo.uploaded", mid);
  return { id: mid, url: "/api/media/" + mid };
}
export async function deliveryPhotoHistory(
  tx: SQL,
  user: Actor,
  input: unknown,
) {
  const d = z.object({ orderId: z.string().uuid() }).strict().parse(input);
  await photoOrder(tx, user, d.orderId);
  return {
    photos: (
      await tx.query(
        "SELECT id,order_id,alt,captured_at,created_at,retain_until FROM delivery_photos WHERE order_id=$1 AND retain_until>now() ORDER BY created_at DESC,id DESC",
        [d.orderId],
      )
    ).rows,
  };
}
export async function latestDeliveryPhoto(
  tx: SQL,
  user: Actor,
  customerId = user.id,
) {
  if (["customer", "commercial"].includes(user.role)) {
    if (customerId !== user.id) throw new AppError(404, "Customer not found.");
  } else {
    allow(user, ["owner", "manager", "dispatcher"]);
    const c = await one(tx, "SELECT branch_id FROM users WHERE id=$1", [
      customerId,
    ]);
    if (!c) throw new AppError(404, "Customer not found.");
    allow(user, ["owner", "manager", "dispatcher"], c.branch_id);
  }
  return one(
    tx,
    "SELECT p.id,p.alt,p.captured_at,p.created_at,p.retain_until,p.order_id,o.reference FROM delivery_photos p JOIN orders o ON o.id=p.order_id JOIN delivery_attempts a ON a.id=p.attempt_id AND a.state='delivered' WHERE o.customer_id=$1 AND o.status='delivered' AND p.retain_until>now() AND ($2::boolean OR o.branch_id=$3) ORDER BY p.captured_at DESC,p.id DESC LIMIT 1",
    [
      customerId,
      ["owner", "customer", "commercial"].includes(user.role),
      user.branch_id,
    ],
  );
}
/** Business instruction 2026-11-08: retain all records, including expired proof bytes.
 * Access/consent expiry remains separate and cannot be bypassed by this hold.
 */
export async function purgeExpiredProof(_tx: SQL, user: Actor) {
  allow(user, ["owner"]);
  return { purged: 0, retentionHold: true, policy: "retain-all-20261108" };
}
