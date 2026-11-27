import { deliveryPoint, type DeliveryPoint } from "./delivery-pin";

export type DeliveryMapBounds = {
  south: number;
  north: number;
  west: number;
  east: number;
};
export type DeliveryMapArea = {
  name: string;
  city?: string;
  state?: string;
  country?: string;
  map_bounds?: unknown;
};
/** Coarse locality guards, NOT street-level service boundaries. See docs/delivery-pin-area/README.md. */
const localityBounds: Record<string, DeliveryMapBounds> = {
  "victoria island": {
    south: 6.3900279,
    north: 6.4700279,
    west: 3.3859904,
    east: 3.4659904,
  },
  "lagos island": {
    south: 6.4384386,
    north: 6.4695637,
    west: 3.379692,
    east: 3.4645246,
  },
  lekki: { south: 6.38, north: 6.56, west: 3.43, east: 3.65 },
  ajah: {
    south: 6.4294716,
    north: 6.5094716,
    west: 3.5223861,
    east: 3.6023861,
  },
};
export function validDeliveryMapBounds(value: any): value is DeliveryMapBounds {
  return (
    !!value &&
    ["south", "north", "west", "east"].every(
      (k) => typeof value[k] === "number" && Number.isFinite(value[k]),
    ) &&
    value.south >= -90 &&
    value.north <= 90 &&
    value.west >= -180 &&
    value.east <= 180 &&
    value.south < value.north &&
    value.west < value.east
  );
}
export function deliveryAreaBounds(
  area: DeliveryMapArea | string,
): DeliveryMapBounds | null {
  const a = typeof area === "string" ? { name: area } : area;
  if (!a) return null;
  // An explicitly configured but invalid boundary must never silently use a default.
  if (a.map_bounds != null)
    return validDeliveryMapBounds(a.map_bounds) ? a.map_bounds : null;
  if (
    (a.city && a.city.toLowerCase().trim() !== "lagos") ||
    (a.state && a.state.toLowerCase().trim() !== "lagos") ||
    (a.country && !["nigeria", "ng"].includes(a.country.toLowerCase().trim()))
  )
    return null;
  return localityBounds[a.name?.toLowerCase().trim()] ?? null;
}
export function deliveryPinAreaError(
  point: unknown,
  area: DeliveryMapArea | string,
): string {
  const name = typeof area === "string" ? area : area?.name;
  if (!name?.trim())
    return "Choose your delivery area before confirming the map pin.";
  if (!deliveryPoint(point)) return "Choose a valid delivery map location.";
  const bounds = deliveryAreaBounds(area);
  if (!bounds)
    return `Map coverage for ${name} is not configured. Contact EasyGas before confirming this location.`;
  const p = point as DeliveryPoint;
  return p.latitude >= bounds.south &&
    p.latitude <= bounds.north &&
    p.longitude >= bounds.west &&
    p.longitude <= bounds.east
    ? ""
    : `This map pin is outside ${name}. Move the pin to your delivery address in ${name}, or select the correct delivery area. Use current location only when you are at the delivery address.`;
}
