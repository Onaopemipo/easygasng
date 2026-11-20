/** UI affordances only; the API remains the authority for access and eligibility. */
export function ownsCustomerOrder(
  user: { id: string; role: string } | null | undefined,
  order: { customer_id?: string } | null | undefined,
): boolean {
  return (
    !!user &&
    ["customer", "commercial"].includes(user.role) &&
    !!order?.customer_id &&
    order.customer_id === user.id
  );
}

export function canRequestOrderRefund(
  user: { id: string; role: string } | null | undefined,
  order: { customer_id?: string; status?: string; payment_status?: string },
): boolean {
  return (
    ownsCustomerOrder(user, order) &&
    order.status === "delivered" &&
    order.payment_status === "verified"
  );
}

export function selectedRefundLines(
  lines: { source: string; remaining: number | string }[],
  quantities: Record<string, string>,
): { source: string; quantity: number }[] | null {
  const selected: { source: string; quantity: number }[] = [];
  const sources = new Set(lines.map((line) => line.source));
  if (Object.keys(quantities).some((source) => !sources.has(source)))
    return null;
  for (const line of lines) {
    const raw = (quantities[line.source] ?? "").trim();
    if (!raw || raw === "0") continue;
    if (!/^\d+$/.test(raw)) return null;
    const quantity = Number(raw),
      remaining = Number(line.remaining);
    if (
      !Number.isSafeInteger(quantity) ||
      quantity <= 0 ||
      quantity > 100000000 ||
      !Number.isSafeInteger(remaining) ||
      quantity > remaining
    )
      return null;
    selected.push({ source: line.source, quantity });
  }
  return selected.length > 0 && selected.length <= 50 ? selected : null;
}
