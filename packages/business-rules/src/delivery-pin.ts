export type DeliveryPoint = { latitude: number; longitude: number };
export type ConfirmedDeliveryPin = DeliveryPoint & {
  confirmed: true;
  addressKey: string;
};
export function deliveryAddressKey(street = "", zone = "") {
  return [street, zone]
    .map((v) => v.trim().toLowerCase().replace(/\s+/g, " "))
    .join("|");
}
export function deliveryPoint(value: any): DeliveryPoint | null {
  if (
    typeof value?.latitude !== "number" ||
    typeof value?.longitude !== "number"
  )
    return null;
  const { latitude, longitude } = value;
  return Number.isFinite(latitude) &&
    Math.abs(latitude) <= 90 &&
    Number.isFinite(longitude) &&
    Math.abs(longitude) <= 180
    ? { latitude, longitude }
    : null;
}
export function confirmedDeliveryPin(
  value: any,
  street: string,
  zone: string,
): ConfirmedDeliveryPin | null {
  const point = deliveryPoint(value);
  return point &&
    value.confirmed === true &&
    street.trim().length >= 8 &&
    zone.trim() &&
    value.addressKey === deliveryAddressKey(street, zone)
    ? { ...point, confirmed: true, addressKey: value.addressKey }
    : null;
}
/** Parse only coordinates from known full map links. Never fetch a caller-supplied URL. */
export function parseDeliveryPoint(value: string): DeliveryPoint | null {
  let text = value.trim();
  if (/^https?:/i.test(text)) {
    try {
      const u = new URL(text);
      if (
        u.protocol !== "https:" ||
        !/^(www\.)?(google\.com|maps\.google\.com|maps\.apple\.com|openstreetmap\.org)$/.test(
          u.hostname,
        )
      )
        return null;
      text =
        u.searchParams.get("query") ||
        u.searchParams.get("q") ||
        u.searchParams.get("ll") ||
        "";
      if (u.searchParams.has("mlat") && u.searchParams.has("mlon"))
        text = u.searchParams.get("mlat") + "," + u.searchParams.get("mlon");
      if (!text)
        text =
          decodeURIComponent(u.pathname).match(
            /@(-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?)/,
          )?.[1] ?? "";
    } catch {
      return null;
    }
  }
  const match = text.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  return match
    ? deliveryPoint({ latitude: Number(match[1]), longitude: Number(match[2]) })
    : null;
}
