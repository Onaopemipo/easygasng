import { type SQL } from "./db";
// Moving weighted average over the existing movement authority. No second stock/cost balance is stored.
export async function inventoryValuation(tx: SQL, branch: string | null) {
  const policies = (
    await tx.query(
      "SELECT scope,value FROM settings WHERE key='inventory.valuation' AND ($1::text IS NULL OR scope=$1)",
      [branch],
    )
  ).rows;
  const rows = (
    await tx.query(
      "SELECT i.branch_id,i.product_id,p.name,i.quantity AS on_hand,'units' AS unit FROM inventory i JOIN products p ON p.id=i.product_id WHERE p.archived=false AND p.category<>'Gas refills' AND ($1::text IS NULL OR i.branch_id=$1) UNION ALL SELECT branch_id,NULL,'Bulk gas',grams,'grams' FROM gas_stock WHERE ($1::text IS NULL OR branch_id=$1)",
      [branch],
    )
  ).rows;
  const results = [];
  for (const stock of rows) {
    const policy = policies.find((p) => p.scope === stock.branch_id)?.value;
    if (policy !== "weighted_average") {
      results.push({
        ...stock,
        value_kobo: null,
        classification: "unavailable",
        reason:
          "An inventory valuation method has not been independently approved.",
      });
      continue;
    }
    const gas = stock.unit === "grams";
    const movements = (
      await tx.query(
        gas
          ? "SELECT m.grams AS quantity,m.kind,r.unit_cost_kobo,m.created_at,m.id FROM gas_stock_movements m LEFT JOIN stock_receipts r ON r.reference=m.reference AND r.branch_id=m.branch_id AND r.gas=true WHERE m.branch_id=$1 AND m.kind NOT IN ('reserved','released') ORDER BY m.created_at,m.id"
          : "SELECT m.quantity,m.kind,r.unit_cost_kobo,m.created_at,m.id FROM stock_movements m LEFT JOIN stock_receipts r ON r.reference=m.reference AND r.branch_id=m.branch_id AND r.product_id=m.product_id WHERE m.branch_id=$1 AND m.product_id=$2 AND m.kind NOT IN ('reserved','released') ORDER BY m.created_at,m.id",
        gas ? [stock.branch_id] : [stock.branch_id, stock.product_id],
      )
    ).rows;
    const opening =
      BigInt(stock.on_hand) -
      movements.reduce((s, m) => s + BigInt(m.quantity), 0n);
    let qty = opening,
      cost = 0n,
      complete = opening === 0n;
    const unit = gas ? 1000n : 1n;
    for (const m of movements) {
      const change = BigInt(m.quantity);
      if (change > 0n) {
        if (m.unit_cost_kobo === null || m.unit_cost_kobo === undefined) {
          complete = false;
        } else cost += (BigInt(m.unit_cost_kobo) * change + unit / 2n) / unit;
        qty += change;
      } else if (change < 0n) {
        if (qty <= 0n || qty + change < 0n) complete = false;
        else cost -= (cost * -change + qty / 2n) / qty;
        qty += change;
      }
    }
    if (
      qty !== BigInt(stock.on_hand) ||
      qty < 0n ||
      cost < 0n ||
      cost > BigInt(Number.MAX_SAFE_INTEGER)
    )
      complete = false;
    // Unknown opening/return/transfer acquisition cost is never replaced by a selling price.
    results.push({
      ...stock,
      value_kobo: complete ? Number(cost) : null,
      classification: complete ? "calculated_complete_inputs" : "unavailable",
      reason: complete
        ? "Moving weighted average from complete recorded acquisition costs."
        : "Opening quantities, uncosted receipts, returns or transfers prevent a complete cost basis.",
    });
  }
  const total = results.reduce((n, r) => n + BigInt(r.value_kobo ?? 0), 0n);
  return {
    method: "Per-branch approved policy",
    rows: results,
    totalKobo:
      results.every((r) => r.value_kobo !== null) &&
      total <= BigInt(Number.MAX_SAFE_INTEGER)
        ? Number(total)
        : null,
  };
}
