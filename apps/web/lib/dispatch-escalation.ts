import { type SQL, one } from "./db";
import { allow, id, type Actor } from "./auth";
import { notify, audit } from "./governance";

// Alert only: never rotate custody, delivery codes or assignments in a timer.
export async function escalateUnacknowledgedDispatch(
  tx: SQL,
  operator: Actor,
  timeoutMinutes = 10,
) {
  allow(operator, ["owner"]);
  if (
    !Number.isInteger(timeoutMinutes) ||
    timeoutMinutes < 5 ||
    timeoutMinutes > 120
  )
    throw new Error("Invalid dispatch acknowledgement timeout");
  const attempts = (
    await tx.query(
      "SELECT a.id,a.order_id,a.driver_id,o.branch_id,o.reference FROM delivery_attempts a JOIN orders o ON o.id=a.order_id WHERE a.state='assigned' AND a.requires_ack=true AND o.status='assigned' AND o.driver_id=a.driver_id AND a.created_at<=now()-($1::int*interval '1 minute') AND NOT EXISTS(SELECT 1 FROM dispatch_responses r WHERE r.attempt_id=a.id) ORDER BY a.created_at LIMIT 100 FOR UPDATE OF a SKIP LOCKED",
      [timeoutMinutes],
    )
  ).rows;
  let escalated = 0;
  for (const a of attempts) {
    const incident = await one(
      tx,
      "INSERT INTO operational_incidents(id,branch_id,severity,category,target,detail,owner_role) VALUES($1,$2,'high','dispatch_ack_timeout',$3,$4,'dispatcher') ON CONFLICT(category,target) DO NOTHING RETURNING id",
      [
        id(),
        a.branch_id,
        a.id,
        `Assignment ${a.reference} has not been acknowledged within ${timeoutMinutes} minutes. Contact the driver and review dispatch; no reassignment was performed.`,
      ],
    );
    if (!incident) continue;
    const recipients = (
      await tx.query(
        "SELECT id FROM users WHERE active=true AND (role='owner' OR (branch_id=$1 AND role IN ('dispatcher','manager')))",
        [a.branch_id],
      )
    ).rows;
    for (const recipient of recipients)
      await notify(
        tx,
        recipient.id,
        "Driver acknowledgement overdue",
        `Review assignment ${a.reference}; the driver has not acknowledged.`,
        a.order_id,
      );
    await audit(tx, operator, "dispatch.ack_escalated", a.id, "success", {
      timeoutMinutes,
      incidentId: incident.id,
    });
    escalated++;
  }
  return { escalated, automaticReassignment: false };
}
