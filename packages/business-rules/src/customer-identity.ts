/** Lookup key only; neither this key nor the public customer ID proves ownership. */
export function normaliseCustomerPhone(value: string): string | null {
  const digits = value.trim().replace(/[\s().-]/g, "");
  const normal = digits.startsWith("0")
    ? "+234" + digits.slice(1)
    : digits.startsWith("234")
      ? "+" + digits
      : digits;
  return /^\+234[789][01]\d{8}$/.test(normal) ? normal : null;
}
export function publicCustomerId(value: string): string | null {
  const normal = value.trim().toUpperCase();
  return /^EGC-[A-F0-9]{32}$/.test(normal) ? normal : null;
}
