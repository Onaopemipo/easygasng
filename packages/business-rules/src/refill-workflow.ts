/** Presentation only. The server derives the same scope from canonical order lines. */
export function isDoorstepRefillOrder(order: any) {
  const gas = order?.gas_lines ?? order?.manifest?.gas ?? [];
  const items = order?.items ?? order?.manifest?.items ?? [];
  return gas.length > 0 && items.length === 0;
}
