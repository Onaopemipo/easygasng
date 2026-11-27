import { AppError } from "./auth";
import { one, type SQL } from "./db";

// Bulk refills supply measured gas into the customer's cylinder at their address.
// Cylinder ownership/inspection history is not a prerequisite for this service.
export async function isDoorstepRefill(tx: SQL, orderId: string) {
  const row = await one(
    tx,
    `SELECT EXISTS(SELECT 1 FROM order_gas_lines WHERE order_id=$1)
    AND NOT EXISTS(SELECT 1 FROM order_items WHERE order_id=$1) AS refill`,
    [orderId],
  );
  return row?.refill === true;
}

export async function requireRefillPhoto(
  tx: SQL,
  order: any,
  attempt: any,
  legacyCodeVerified = false,
) {
  if (attempt.state !== "arrived")
    throw new AppError(
      409,
      "Record arrival at the customer before completing the refill.",
    );
  const photo = await one(
    tx,
    `SELECT p.id FROM delivery_photos p
    JOIN bulk_lpg_events e ON e.order_id=p.order_id AND e.kind='dispense'
    JOIN bulk_lpg_allocations a ON a.order_id=p.order_id AND a.load_id=e.load_id
    WHERE p.order_id=$1 AND p.attempt_id=$2 AND p.actor_id=$3
      AND p.consent=true AND p.retain_until>now() AND octet_length(p.data)>0
      AND a.state='dispensed' AND a.dispensed_grams=a.grams
      AND ($4::boolean OR (p.created_at>=e.created_at AND p.captured_at>=e.created_at-interval '1 minute'))
    LIMIT 1`,
    [order.id, attempt.id, order.driver_id, legacyCodeVerified],
  );
  if (!photo)
    throw new AppError(
      409,
      "Dispense the full ordered amount, then upload a current-visit refill photo before completing delivery.",
    );
}
