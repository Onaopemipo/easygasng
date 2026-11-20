import { id } from "./auth";
import { audit } from "./governance";
import { type SQL } from "./db";
export async function recordFailure(
  tx: SQL,
  category: string,
  target: string,
  type: string,
  branchId: string | null = null,
) {
  let reference = id();
  const safeType = /^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(type) ? type : "unknown";
  try {
    const result = await tx.query(
      `INSERT INTO operational_incidents(id,branch_id,severity,category,target,detail,owner_role)
       VALUES ($1,$2,'high',$3,$4,$5,'owner')
       ON CONFLICT(category,target) DO UPDATE SET status=CASE
         WHEN operational_incidents.status='resolved' THEN 'open' ELSE operational_incidents.status END
       RETURNING id`,
      [
        reference,
        branchId,
        category,
        target,
        `Operation failed (${safeType}). Diagnostic reference ${reference}. Review protected server logs; no credentials or request body are included.`,
      ],
    );
    reference = result.rows[0].id;
    await audit(tx, null, "incident.failure_observed", reference, "success", {
      category,
      type: safeType,
    });
  } catch {
    console.error("EasyGas incident persistence unavailable", {
      reference,
      category,
      type: safeType,
    });
  }
  return reference;
}
