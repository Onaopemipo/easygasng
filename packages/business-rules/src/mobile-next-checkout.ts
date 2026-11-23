import { gasLine, type GasPolicy } from "./gas-pricing";
import { bookingPhone } from "./booking-contact";
export function nativeCheckoutContact(value: any) {
  const phone = bookingPhone(String(value.phone ?? ""));
  if (
    !value.name?.trim() ||
    !phone ||
    String(value.street ?? "").trim().length < 8
  )
    throw Error(
      "Check the recipient name, Nigerian mobile number and street address.",
    );
  return {
    ...value,
    name: value.name.trim(),
    phone,
    street: value.street.trim(),
  };
}
export function nativeQuoteTotal(quote: any) {
  const parts = [
    quote?.subtotalKobo,
    quote?.deliveryKobo,
    quote?.physicalSubtotalKobo ?? 0,
  ];
  if (parts.some((n) => !Number.isSafeInteger(n) || n < 0))
    throw Error("A current confirmed quote is required.");
  const total = parts.reduce((n, x) => n + x, 0);
  if (!Number.isSafeInteger(total) || total <= 0)
    throw Error("The confirmed order amount is invalid.");
  return total;
}
export function sameNativeQuote(a: any, b: any) {
  return (
    nativeQuoteTotal(a) === nativeQuoteTotal(b) &&
    ["priceVersion", "feeVersion", "policyVersion"].every((k) => a[k] === b[k])
  );
}
export function validateNativeLines(
  lines: any[],
  price: number,
  policy: GasPolicy,
) {
  if (!lines.length) throw Error("Add at least one cylinder.");
  if (lines.length > 20)
    throw Error(
      "Use at most 20 cylinders per order. Reduce the gas quantity in your cart.",
    );
  return lines.map((l) => gasLine(l.kg, l.capacityKg, price, policy));
}
export function nativeCheckoutPayload({
  lines,
  items,
  contact,
  area,
  date,
  window,
  paymentMethod,
  quote,
  key,
  rewardSelection = {},
}: any) {
  if (!area?.id || !area?.name)
    throw Error("Choose an available delivery area.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !window)
    throw Error("Choose a delivery date and time window.");
  return {
    ...rewardSelection,
    items,
    source: "MOBILE",
    address: {
      ...nativeCheckoutContact(contact),
      zone: area.name,
      locationId: area.id,
    },
    date,
    window,
    paymentMethod,
    gasLines: lines.map((line: any) => ({
      kg: Number(line.kg),
      capacityKg: Number(line.capacityKg),
    })),
    pricing: {
      priceVersion: Number.isInteger(quote.priceVersion)
        ? quote.priceVersion
        : 0,
      feeVersion: Number.isInteger(quote.feeVersion) ? quote.feeVersion : 0,
      policyVersion: Number.isInteger(quote.policyVersion)
        ? quote.policyVersion
        : 0,
      totalKobo: nativeQuoteTotal(quote),
    },
    idempotencyKey: key,
  };
}
