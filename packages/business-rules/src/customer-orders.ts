export type OrderFilter = "all" | "active" | "delivered" | "cancelled";
export function orderSummary(order: any): string {
  return (
    [
      ...(order.gas_lines ?? []).map(
        (g: any) =>
          `${Number(g.grams) / 1000} kg gas · ${Number(g.capacity_grams) / 1000} kg cylinder`,
      ),
      ...(order.items ?? []).map((i: any) => `${i.quantity} × ${i.name}`),
    ].join(", ") || "Delivery order"
  );
}
export function orderMatches(order: any, filter: OrderFilter, query = "") {
  const category = ["delivered", "cancelled"].includes(order.status)
    ? order.status
    : "active";
  return (
    (filter === "all" || category === filter) &&
    `${order.reference} ${orderSummary(order)}`
      .toLocaleLowerCase()
      .includes(query.trim().toLocaleLowerCase())
  );
}
export function refundLineLabel(order: any, source: string, index: number) {
  if (source.startsWith("gas:")) {
    const gas = (order.gas_lines ?? []).find(
      (g: any) => `gas:${g.id}` === source,
    );
    return gas
      ? `${Number(gas.grams) / 1000} kg gas · ${Number(gas.capacity_grams) / 1000} kg cylinder`
      : `Gas refill ${index + 1}`;
  }
  const item = (order.items ?? []).find(
    (i: any) => `product:${i.product_id ?? i.productId}` === source,
  );
  return item?.name ?? `Order item ${index + 1}`;
}
