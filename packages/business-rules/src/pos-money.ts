/** Parse a naira input without floating-point multiplication or rounding. */
export function nairaToKobo(raw: unknown): number {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!/^\d{1,8}(?:\.\d{1,2})?$/.test(value))
    throw new Error("Enter a naira amount with up to two decimal places.");
  const [whole, decimal = ""] = value.split(".");
  const amount = Number(whole) * 100 + Number(decimal.padEnd(2, "0"));
  if (amount > 1_000_000_000) throw new Error("Amount exceeds the supported limit.");
  return amount;
}
