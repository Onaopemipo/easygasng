/** UI metadata mirrored from business-reporting.ts and checked against its real HTTP permissions. */
export const nativeReportNames = [
  "sales",
  "gas",
  "products",
  "cylinders",
  "accessories",
  "valuation",
  "movements",
  "low_stock",
  "stocktakes",
  "purchases",
  "deliveries",
  "locations",
  "customers",
  "refills",
  "services",
  "technicians",
  "expenses",
  "profit",
  "payments",
  "wallet",
  "loyalty",
  "branches",
  "audit",
];
const financial = new Set([
  "sales",
  "products",
  "cylinders",
  "accessories",
  "valuation",
  "purchases",
  "expenses",
  "profit",
  "payments",
  "wallet",
  "loyalty",
  "branches",
  "gas",
  "services",
  "customers",
  "locations",
  "technicians",
]);
export function nativeReportsForRole(role: string) {
  if (role === "owner") return [...nativeReportNames];
  if (role === "finance")
    return nativeReportNames.filter(
      (report) =>
        !["wallet", "loyalty", "branches", "audit", "refills"].includes(report),
    );
  if (role === "manager")
    return nativeReportNames.filter(
      (report) => !financial.has(report) && report !== "audit",
    );
  return [];
}
export function nativeReportFilterKeys(report: string) {
  return [
    "branchId",
    ...(["wallet", "loyalty", "valuation", "low_stock"].includes(report)
      ? []
      : ["from", "to"]),
    ...(["products", "cylinders", "accessories"].includes(report)
      ? ["category"]
      : []),
    ...([
      "sales",
      "gas",
      "products",
      "cylinders",
      "accessories",
      "deliveries",
      "locations",
      "customers",
      "branches",
    ].includes(report)
      ? ["locationId", "customerCategory", "orderStatus", "paymentStatus"]
      : []),
  ];
}
export function nativeReportRequest(
  values: Record<string, any>,
  scope: Record<string, string> = {},
) {
  if (!nativeReportNames.includes(values.report))
    throw Error("Choose an available report.");
  const merged = { ...scope, ...values };
  return Object.fromEntries(
    ["report", ...nativeReportFilterKeys(values.report)]
      .filter((k) => merged[k] !== undefined && merged[k] !== "")
      .map((k) => [k, merged[k]]),
  );
}
