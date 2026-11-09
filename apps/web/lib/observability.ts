import { id } from "./auth";
import { type SQL } from "./db";
export async function recordFailure(
  tx: SQL,
  category: string,
  target: string,
  type: string,
  branchId: string | null = null,
) {
  const reference = id();
  try {
    await tx.query(
      "INSERT INTO operational_incidents(id,branch_id,severity,category,target,detail,owner_role) VALUES ($1,$2,'high',$3,$4,$5,'owner') ON CONFLICT(category,target) DO NOTHING",
      [
        reference,
        branchId,
        category,
        target,
        `Operation failed (${type}). Diagnostic reference ${reference}. Review protected server logs; no credentials or request body are included.`,
      ],
    );
  } catch {
    console.error("EasyGas incident persistence unavailable", {
      reference,
      category,
      type,
    });
  }
  return reference;
}
