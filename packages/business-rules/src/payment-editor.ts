/** Display-only conversion. Canonical policy remains integer kobo / basis points. */
export function paymentDecimal(value: number | null): string {
  if (value === null) return "";
  if (!Number.isSafeInteger(value) || value < 0) return "";
  const n = BigInt(value);
  return `${n / 100n}.${String(n % 100n).padStart(2, "0")}`;
}
export function paymentUnits(
  raw: string,
  min = 0,
  max = 1e12,
  nullable = false,
): number | null {
  if (raw === "" && nullable) return null;
  if (!/^\d+(?:\.\d{1,2})?$/.test(raw))
    throw Error("Enter a number with up to two decimal places.");
  const [whole, fraction = ""] = raw.split(".");
  const n = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  if (n > BigInt(Number.MAX_SAFE_INTEGER) || n < BigInt(min) || n > BigInt(max))
    throw Error("Enter an amount within the permitted range.");
  return Number(n);
}
const labels: Record<string, string> = {
  enabled: "Sandbox checkout",
  channels: "Payment methods",
  merchantApprovalReference: "Merchant approval reference",
  providerAutomaticFees: "Paystack automatic fees",
  passThroughApproved: "Customer fee verification",
  quoteLifetimeSeconds: "Quote validity",
  walletFunding: "Wallet top-ups",
  walletMinimumKobo: "Minimum top-up",
  walletMaximumKobo: "Maximum top-up / balance",
  partialInvoices: "Partial invoice payments",
  "fee.percentageBps": "Percentage fee",
  "fee.fixedKobo": "Fixed fee",
  "fee.capKobo": "Fee cap",
  "fee.fixedWaivedBelowKobo": "Fixed-fee waiver threshold",
  "fee.maximumGrossKobo": "Maximum charge",
  "fee.rounding": "Provider rounding",
  "fee.bearer": "Fee paid by",
  "fee.version": "Fee version",
  "fee.currency": "Currency",
};
export const paymentFieldLabel = (path: string) => labels[path] ?? path;
export function paymentReviewValue(path: string, value: unknown): string {
  if (value === undefined) return "Not configured";
  if (value === null)
    return path === "fee.capKobo" ? "No cap" : "Not configured";
  if (path.endsWith("Kobo") && typeof value === "number")
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency: "NGN",
    }).format(value / 100);
  if (path === "fee.percentageBps" && typeof value === "number")
    return `${value / 100}%`;
  if (path === "quoteLifetimeSeconds" && typeof value === "number")
    return value % 60 === 0 ? `${value / 60} minutes` : `${value} seconds`;
  if (typeof value === "boolean") return value ? "Enabled" : "Disabled";
  const names: Record<string, string> = {
    card: "Card",
    bank: "Bank",
    ussd: "USSD",
    bank_transfer: "Bank transfer",
    merchant: "EasyGas",
    customer: "Customer",
    ceil: "Round up",
    floor: "Round down",
    nearest: "Nearest kobo",
    off: "Verified off",
    unknown: "Not verified",
  };
  if (Array.isArray(value))
    return value.map((v) => names[String(v)] ?? String(v)).join(", ") || "None";
  if (typeof value === "object") return "Fee schedule configured";
  return names[String(value)] ?? String(value);
}
