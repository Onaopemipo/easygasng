import { z } from "zod";
import { one, type SQL } from "./db";
import { AppError, digest, id } from "./auth";
import { canonicalRequest } from "./business-operation";
import { audit } from "./governance";
import { confirmedDeliveryPin } from "../../../packages/business-rules/src/delivery-pin";

export const customerDeliveryPinSchema = z
  .object({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    confirmed: z.literal(true),
    addressKey: z.string().min(1).max(360),
  })
  .strict();
import {
  deliveryPinAreaError,
  type DeliveryMapArea,
} from "../../../packages/business-rules/src/delivery-pin-area";

export async function customerDeliveryMapArea(
  tx: SQL,
  address: any,
  branchId?: string,
): Promise<DeliveryMapArea> {
  const area = await one(
    tx,
    `SELECT l.name,l.city,l.state,l.country,s.value->'mapBounds' AS map_bounds FROM delivery_locations l JOIN settings s ON s.key='location.'||l.id AND s.scope=l.branch_id WHERE (($1::text IS NOT NULL AND l.id=$1) OR ($1::text IS NULL AND lower(l.name)=lower($2))) AND ($3::text IS NULL OR l.branch_id=$3) FOR SHARE OF s`,
    [address.locationId ?? null, address.zone, branchId ?? null],
  );
  if (!area)
    throw new AppError(400, "Choose an active supported delivery location.");
  return area as DeliveryMapArea;
}
export async function validateCustomerDeliveryPin(
  tx: SQL,
  address: any,
  branchId?: string,
) {
  if (address.deliveryPin === undefined) return;
  const area = await customerDeliveryMapArea(tx, address, branchId);
  if (
    address.deliveryPin !== undefined &&
    (!confirmedDeliveryPin(address.deliveryPin, address.street, address.zone) ||
      area.name.toLowerCase() !== address.zone.trim().toLowerCase())
  )
    throw new AppError(
      400,
      "Confirm the map pin for the current delivery address.",
    );
  const error = deliveryPinAreaError(address.deliveryPin, area);
  if (error) throw new AppError(400, error, "DELIVERY_PIN_OUTSIDE_AREA");
}
/** Called only inside authenticated checkout or an already-authorised private customer-link transaction. */
export async function recordCustomerDeliveryPin(
  tx: SQL,
  orderId: string,
  customerId: string,
  source: "checkout" | "private order link",
) {
  const order = await one(
    tx,
    "SELECT id,customer_id,branch_id,address FROM orders WHERE id=$1 FOR UPDATE",
    [orderId],
  );
  if (!order || order.customer_id !== customerId)
    throw new AppError(404, "Order not found.");
  await validateCustomerDeliveryPin(tx, order.address, order.branch_id);
  const pin = confirmedDeliveryPin(
    order.address.deliveryPin,
    order.address.street,
    order.address.zone,
  );
  if (!pin) return;
  const addressHash = digest(canonicalRequest(order.address));
  const prior = await one(
    tx,
    "SELECT revision,address_hash,latitude,longitude FROM dispatch_destinations WHERE order_id=$1 ORDER BY revision DESC LIMIT 1",
    [orderId],
  );
  if (
    prior?.address_hash === addressHash &&
    Number(prior.latitude) === pin.latitude &&
    Number(prior.longitude) === pin.longitude
  )
    return;
  await tx.query(
    "INSERT INTO dispatch_destinations(id,order_id,branch_id,revision,address_hash,latitude,longitude,evidence,confirmed_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)",
    [
      id(),
      order.id,
      order.branch_id,
      Number(prior?.revision ?? 0) + 1,
      addressHash,
      pin.latitude,
      pin.longitude,
      "Customer explicitly confirmed this delivery address and map pin via " +
        source,
      customerId,
    ],
  );
  await audit(
    tx,
    null,
    "customer.delivery_pin_confirmed",
    order.id,
    "success",
    { customerId, source },
  );
}
