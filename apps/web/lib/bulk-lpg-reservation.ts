import { AppError, id, type Actor } from "./auth";
import { one, type SQL } from "./db";

/** Called inside the existing order stock transaction, never a separate debit. */
export async function bulkReservation(
  tx: SQL,
  user: Actor,
  orderId: string,
  grams: number,
  kind: "released" | "fulfilled",
) {
  if (
    await one(
      tx,
      "SELECT amendment_id FROM doorstep_execution WHERE order_id=$1 AND (state='reserved' OR ($2::boolean AND state='dispensed')) LIMIT 1",
      [orderId, kind === "released"],
    )
  )
    throw new AppError(
      409,
      "Resolve supplementary custody and invoice obligations before original-order fulfilment or cancellation.",
    );
  const allocation = await one(
    tx,
    "SELECT * FROM bulk_lpg_allocations WHERE order_id=$1 FOR UPDATE",
    [orderId],
  );
  if (!allocation) {
    if (
      kind === "fulfilled" &&
      (process.env.EASYGAS_BULK_LPG_ENABLED === "true" ||
        process.env.NODE_ENV === "production")
    )
      throw new AppError(
        409,
        "Bulk LPG requires acknowledged vehicle custody and verified metered dispensing.",
      );
    return;
  }
  const load = await one(
    tx,
    "SELECT * FROM bulk_lpg_loads WHERE id=$1 FOR UPDATE",
    [allocation.load_id],
  );
  if (!load) throw new AppError(409, "Bulk load history is missing.");
  let retainedOnVehicle = false;
  if (Number(allocation.grams) !== grams)
    throw new AppError(
      409,
      "Bulk allocation differs from the reserved gas order.",
    );
  if (kind === "fulfilled") {
    if (
      allocation.state !== "dispensed" ||
      Number(allocation.dispensed_grams) !== grams
    )
      throw new AppError(
        409,
        "Record the complete authorised metered dispensing before delivery fulfilment.",
      );
    await tx.query(
      "UPDATE bulk_lpg_allocations SET state='fulfilled' WHERE order_id=$1",
      [orderId],
    );
  } else {
    if (Number(allocation.dispensed_grams) > 0)
      throw new AppError(
        409,
        "Dispensed LPG cannot be returned by cancelling an order. Independent physical and financial review is required.",
      );
    if (allocation.state === "released")
      throw new AppError(409, "Bulk gas allocation already released.");
    // Preserve reservation for gas physically still on the vehicle. The caller releases
    // the original order reservation immediately afterwards in this same transaction.
    if (load.state !== "reconciled" && allocation.state !== "returned") {
      await tx.query(
        "UPDATE bulk_lpg_loads SET buffer_grams=buffer_grams+$1,version=version+1 WHERE id=$2",
        [grams, load.id],
      );
      retainedOnVehicle = true;
    }
    await tx.query(
      "UPDATE bulk_lpg_allocations SET state='released' WHERE order_id=$1",
      [orderId],
    );
  }
  await tx.query(
    "INSERT INTO bulk_lpg_events(id,load_id,order_id,kind,actor_id,detail) VALUES($1,$2,$3,$4,$5,$6)",
    [
      id(),
      load.id,
      orderId,
      kind,
      user.id,
      JSON.stringify({ grams, canonicalReservation: true }),
    ],
  );
  return retainedOnVehicle;
}
