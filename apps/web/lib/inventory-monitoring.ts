import { one, type SQL } from "./db";
import { id } from "./auth";
// Deterministic exceptions from existing authorities. They are investigation signals, never fraud verdicts.
export async function inventoryExceptions(tx: SQL) {
  const candidates = (
    await tx.query(`
 SELECT 'transfer_discrepancy' AS category,id AS target,destination_branch AS branch_id,'high' AS severity,'Transfer has damaged or unreceived stock. Review dispatch and receipt evidence.' AS detail FROM stock_transfers WHERE status IN ('partial','discrepancy')
 UNION ALL SELECT 'cash_discrepancy',id,branch_id,'high','Submitted cash count differs from expected cash; independent finance reconciliation required.' FROM pos_shifts WHERE status='submitted' AND counted_kobo<>expected_kobo
 UNION ALL SELECT 'stocktake_variance',id,branch_id,'medium','A nonzero physical stocktake variance was submitted. Review the count and approval evidence.' FROM inventory_operations WHERE kind='stocktake' AND (payload->>'delta')::bigint<>0
 UNION ALL SELECT 'unsafe_cylinder_allocation',a.id,c.branch_id,'critical','An active allocation references an ineligible cylinder. Stop the affected fulfilment and review safety/custody.' FROM cylinder_allocations a JOIN cylinders c ON c.id=a.cylinder_id WHERE a.state='reserved' AND (c.status IN ('damaged','quarantined','inspection_due') OR c.test_due<=CURRENT_DATE)
 UNION ALL SELECT 'protected_operation_denied',id,detail->>'actorBranch','medium','A protected business operation was rejected. Review the immutable security event before drawing conclusions.' FROM audit_events WHERE action='security.business_conflict' AND created_at>now()-interval '30 days'
 `)
  ).rows;
  let inserted = 0;
  for (const c of candidates) {
    const r = await one(
      tx,
      "INSERT INTO operational_incidents(id,branch_id,severity,category,target,detail,owner_role) VALUES($1,$2,$3,$4,$5,$6,'owner') ON CONFLICT(category,target) DO NOTHING RETURNING id",
      [id(), c.branch_id, c.severity, c.category, c.target, c.detail],
    );
    if (r) inserted++;
  }
  return inserted;
}
