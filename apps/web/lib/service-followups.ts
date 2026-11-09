import { z } from "zod";
import { one, type SQL } from "./db";
import { allow, AppError, id, type Actor } from "./auth";
import { audit, notify } from "./governance";
export async function followupAction(
  tx: SQL,
  action: string,
  user: Actor,
  input: unknown,
): Promise<any> {
  if (action === "service.followups") {
    allow(user, [
      "customer",
      "commercial",
      "technician",
      "owner",
      "service_manager",
    ]);
    return (
      await tx.query(
        `SELECT f.*,b.service_id,b.branch_id,b.reference,s.name FROM service_followups f JOIN service_bookings b ON b.id=f.booking_id JOIN service_catalogue s ON s.id=b.service_id AND s.branch_id=b.branch_id WHERE ${["customer", "commercial"].includes(user.role) ? "f.customer_id=$1" : user.role === "technician" ? "b.technician_id=$1" : user.role === "owner" ? "true" : "b.branch_id=$1"} ORDER BY due_date LIMIT 200`,
        user.role === "owner"
          ? []
          : [
              ["customer", "commercial", "technician"].includes(user.role)
                ? user.id
                : user.branch_id,
            ],
      )
    ).rows;
  }
  if (action === "service.followup.create") {
    const d = z
      .object({
        bookingId: z.string().uuid(),
        dueDate: z.iso.date(),
        reason: z.string().trim().min(10).max(1000),
      })
      .strict()
      .parse(input);
    const b = await one(
      tx,
      "SELECT * FROM service_bookings WHERE id=$1 FOR UPDATE",
      [d.bookingId],
    );
    if (!b) throw new AppError(404, "Booking not found.");
    allow(user, ["owner", "service_manager", "technician"], b.branch_id);
    if (user.role === "technician" && b.technician_id !== user.id)
      throw new AppError(
        403,
        "Only your assigned appointment may be followed up.",
      );
    if (b.status !== "completed")
      throw new AppError(
        409,
        "Follow-ups require a completed, customer-acknowledged service.",
      );
    const date = new Date(d.dueDate + "T00:00:00Z");
    if (+date < Date.now() - 86400000 || +date > Date.now() + 730 * 86400000)
      throw new AppError(400, "Choose a follow-up date within two years.");
    const old = await one(
      tx,
      "SELECT id FROM service_followups WHERE booking_id=$1 AND due_date=$2 AND reason=$3",
      [b.id, d.dueDate, d.reason],
    );
    if (old) return { id: old.id };
    const fid = id();
    await tx.query(
      "INSERT INTO service_followups(id,booking_id,customer_id,due_date,reason,created_by) VALUES ($1,$2,$3,$4,$5,$6)",
      [fid, b.id, b.customer_id, d.dueDate, d.reason, user.id],
    );
    await audit(tx, user, "service.followup_recorded", fid);
    return { id: fid };
  }
  if (action === "service.followup.dismiss") {
    const d = z.object({ id: z.string().uuid() }).strict().parse(input);
    const f = await one(
      tx,
      "SELECT * FROM service_followups WHERE id=$1 FOR UPDATE",
      [d.id],
    );
    if (!f || f.customer_id !== user.id)
      throw new AppError(404, "Follow-up not found.");
    await tx.query(
      "UPDATE service_followups SET dismissed_at=COALESCE(dismissed_at,now()) WHERE id=$1",
      [d.id],
    );
    await audit(tx, user, "service.followup_dismissed", d.id);
    return { ok: true };
  }
  return undefined;
}
export async function serviceFollowupReminders(tx: SQL, hour: number) {
  const rows = (
    await tx.query(
      `SELECT f.*,COALESCE(p.service_reminders,true) AS enabled,COALESCE(p.quiet_start,21) AS start,COALESCE(p.quiet_end,8) AS finish FROM service_followups f JOIN users u ON u.id=f.customer_id LEFT JOIN communication_preferences p ON p.user_id=f.customer_id WHERE u.active=true AND f.dismissed_at IS NULL AND f.rebooked_id IS NULL AND f.due_date<=CURRENT_DATE+3 AND f.due_date>=CURRENT_DATE-30`,
    )
  ).rows;
  let count = 0;
  for (const f of rows) {
    const quiet =
      f.start === f.finish
        ? false
        : f.start < f.finish
          ? hour >= f.start && hour < f.finish
          : hour >= f.start || hour < f.finish;
    if (!f.enabled || quiet) continue;
    const sent = await one(
      tx,
      "INSERT INTO job_deliveries(key) VALUES ($1) ON CONFLICT DO NOTHING RETURNING key",
      ["service-followup:" + f.id],
    );
    if (sent) {
      await notify(
        tx,
        f.customer_id,
        "Your service follow-up is approaching",
        f.reason +
          " Review available appointments when ready. No booking or payment has been generated.",
        f.id,
      );
      count++;
    }
  }
  return count;
}
