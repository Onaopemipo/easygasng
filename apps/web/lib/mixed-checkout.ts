import { pricedBundle } from "./bundles";
import { z } from "zod";
import { one, type SQL } from "./db";
import { id, digest, allow, AppError, type Actor } from "./auth";
import { checkout, checkoutSchema } from "./operations";
import {
  professionalServiceAction,
  bookingInput,
} from "./professional-services";
import { audit } from "./governance";
export async function mixedCheckoutAction(
  tx: SQL,
  action: string,
  user: Actor,
  input: unknown,
): Promise<any> {
  if (action !== "checkout.mixed") return undefined;
  allow(user, ["customer", "commercial"]);
  const d = z
    .object({
      products: checkoutSchema.optional(),
      bundleId: z.string().uuid().optional(),
      bundleVersion: z.number().int().positive().optional(),
      bundleTotalKobo: z.number().int().nonnegative().optional(),
      appointments: z.array(bookingInput).min(1).max(5),
      idempotencyKey: z.string().uuid(),
    })
    .strict()
    .parse(input);
  await tx.query("SELECT id FROM users WHERE id=$1 FOR UPDATE", [user.id]);
  const hash = digest(
    JSON.stringify({
      ...d,
      idempotencyKey: undefined,
      products: d.products ? { ...d.products, source: undefined } : undefined,
    }),
  );
  const old = await one(
    tx,
    "SELECT * FROM commerce_checkouts WHERE customer_id=$1 AND idempotency_key=$2",
    [user.id, d.idempotencyKey],
  );
  if (old) {
    if (old.request_hash !== hash)
      throw new AppError(
        409,
        "Checkout reference reused with different contents.",
      );
    return {
      id: old.id,
      replayed: true,
      order: await one(
        tx,
        'SELECT o.id,o.reference,o.total_kobo AS "totalKobo",o.payment_status AS "paymentStatus" FROM checkout_fulfilments f JOIN orders o ON o.id=f.order_id WHERE f.checkout_id=$1',
        [old.id],
      ),
      reference: "EGC-" + old.id.slice(0, 8).toUpperCase(),
    };
  }
  const bundle = d.bundleId ? await pricedBundle(tx, d.bundleId) : null;
  if (bundle) {
    if (
      bundle.version !== d.bundleVersion ||
      bundle.totalKobo !== d.bundleTotalKobo
    )
      throw new AppError(
        409,
        "Bundle pricing changed. Review the current offer before confirming.",
      );
    if (
      bundle.branch_id !== "lagos" ||
      !d.products ||
      d.appointments.length !== 1 ||
      d.appointments[0].serviceId !== bundle.config.serviceId ||
      d.appointments[0].branchId !== bundle.branch_id ||
      d.appointments[0].serviceVersion !== bundle.serviceVersion
    )
      throw new AppError(
        409,
        "Review the current bundle service and appointment.",
      );
    const items = d.products.items;
    if (
      items.length !== bundle.products.length ||
      bundle.products.some(
        (p: any) =>
          !items.some(
            (i) => i.productId === p.productId && i.quantity === p.quantity,
          ),
      )
    )
      throw new AppError(
        409,
        "The product cart must match the approved bundle quantities exactly.",
      );
    if (
      await one(
        tx,
        "SELECT id FROM orders WHERE customer_id=$1 AND idempotency_key=$2",
        [user.id, d.products.idempotencyKey],
      )
    )
      throw new AppError(409, "A bundle requires a new linked product order.");
  }
  const cid = id();
  await tx.query(
    "INSERT INTO commerce_checkouts(id,customer_id,idempotency_key,request_hash,bundle_snapshot) VALUES ($1,$2,$3,$4,$5)",
    [
      cid,
      user.id,
      d.idempotencyKey,
      hash,
      bundle ? JSON.stringify(bundle) : null,
    ],
  );
  const result: any = {
    id: cid,
    reference: "EGC-" + cid.slice(0, 8).toUpperCase(),
    order: null,
    bookings: [],
  };
  if (d.products) {
    const order = await checkout(tx, user, d.products);
    await tx.query(
      "INSERT INTO checkout_fulfilments(checkout_id,order_id) VALUES ($1,$2)",
      [cid, order!.id],
    );
    result.order = {
      id: order!.id,
      reference: order!.reference,
      totalKobo: order!.total_kobo,
      paymentStatus: order!.payment_status,
    };
  }
  for (const appointment of d.appointments) {
    const b = await professionalServiceAction(
      tx,
      "booking.create",
      user,
      appointment,
    );
    await tx.query(
      "INSERT INTO checkout_fulfilments(checkout_id,booking_id) VALUES ($1,$2)",
      [cid, b.id],
    );
    if (bundle) {
      if (b.replayed)
        throw new AppError(409, "A bundle requires a new appointment.");
      await tx.query(
        "UPDATE service_bookings SET snapshot=jsonb_set(snapshot,'{priceKobo}',$1::jsonb)||$2::jsonb WHERE id=$3",
        [
          JSON.stringify(bundle.servicePriceKobo),
          JSON.stringify({
            bundleId: bundle.id,
            bundleVersion: bundle.version,
            bundleDiscountKobo: bundle.discountKobo,
            bundleOriginalServicePriceKobo:
              bundle.servicePriceKobo + bundle.discountKobo,
          }),
          b.id,
        ],
      );
    }
    result.bookings.push(b);
  }
  await audit(tx, user, "checkout.mixed_created", cid);
  return result;
}
