import { z } from "zod";
import { one, type SQL, type Row } from "./db";
import { allow, AppError, id, recentVerification, type Actor } from "./auth";
import { audit, notify, propose } from "./governance";
export async function serviceSettlements(
  tx: SQL,
  user: Actor,
  b: Row,
  action: string,
  input: unknown,
) {
  if (action === "booking.settlement.propose") {
    const d = z
      .object({
        bookingId: z.string().uuid(),
        version: z.number().int().positive(),
        amountKobo: z.number().int().nonnegative().max(100000000),
        reason: z.string().trim().min(10).max(1000),
        evidence: z.string().trim().min(10).max(1000),
      })
      .strict()
      .parse(input);
    allow(user, ["manager"], b.branch_id);
    recentVerification(user);
    if (
      !["failed", "cancelled"].includes(b.status) ||
      Number(b.version) !== d.version
    )
      throw new AppError(
        409,
        "Review the exact failed/cancelled booking revision first.",
      );
    if (
      await one(
        tx,
        "SELECT id FROM operational_incidents WHERE category='service_dispute' AND target=$1 AND status<>'resolved'",
        [b.id],
      )
    )
      throw new AppError(
        409,
        "Independently resolve the customer dispute before proposing a collectible settlement.",
      );
    if (
      await one(
        tx,
        "SELECT id FROM service_materials WHERE booking_id=$1 AND state NOT IN ('released','reconciled') LIMIT 1",
        [b.id],
      )
    )
      throw new AppError(409, "Resolve all issued/unused materials first.");
    const report = await one(
      tx,
      "SELECT * FROM service_reports WHERE booking_id=$1",
      [b.id],
    );
    if (b.work_started_at && !report)
      throw new AppError(
        409,
        "Document the actual stopped work before financial review.",
      );
    const ceiling = report ? Number(report.body.invoiceTotalKobo) : 0;
    if (!Number.isSafeInteger(ceiling) || ceiling < 0 || d.amountKobo > ceiling)
      throw new AppError(
        409,
        "Settlement cannot exceed documented authorised work/materials; an unworked cancellation can only waive charges.",
      );
    const revision = Number(
        (await one(
          tx,
          "SELECT COALESCE(max(revision),0)+1 n FROM service_exception_settlements WHERE booking_id=$1",
          [b.id],
        ))!.n,
      ),
      sid = id(),
      key = "service_settlement." + sid;
    await tx.query(
      "INSERT INTO service_exception_settlements(id,booking_id,revision,report_id,source_status,amount_kobo,ceiling_kobo,reason,evidence,proposed_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
      [
        sid,
        b.id,
        revision,
        report?.id ?? null,
        b.status,
        d.amountKobo,
        ceiling,
        d.reason,
        d.evidence,
        user.id,
      ],
    );
    await tx.query(
      'INSERT INTO setting_definitions(key,label,category,description,owner_role,risk,value_type,propose_roles,approve_roles,view_roles,required_roles,additional_verification) VALUES($1,$2,\'Professional Services\',$3,\'owner\',4,\'boolean\',\'["manager"]\',\'["owner","finance"]\',\'["owner","finance","manager"]\',\'["owner","finance"]\',true)',
      [
        key,
        b.reference + " exception settlement " + revision,
        `Review immutable settlement ${sid}: ${d.amountKobo} kobo, ceiling ${ceiling} kobo. ${d.reason}. Evidence: ${d.evidence}. Customer consent also required; never authorises work.`,
      ],
    );
    await tx.query(
      "INSERT INTO settings(key,scope,value) VALUES($1,$2,'false'::jsonb)",
      [key, b.branch_id],
    );
    const review = await propose(tx, user, {
      key,
      scope: b.branch_id,
      version: 1,
      value: true,
      reason: d.reason,
    });
    await notify(
      tx,
      b.customer_id,
      "Service settlement for your review",
      `${b.reference}: review the proposed financial settlement. The original unsuccessful service outcome remains unchanged.`,
      b.id,
    );
    await audit(tx, user, action, sid);
    return {
      id: sid,
      requestId: review.id,
      revision,
      amountKobo: d.amountKobo,
    };
  }
  const d = z
    .object({
      bookingId: z.string().uuid(),
      settlementId: z.string().uuid(),
      accepted: z.boolean(),
      notes: z.string().trim().min(10).max(1000),
    })
    .strict()
    .parse(input);
  if (
    user.id !== b.customer_id ||
    !["customer", "commercial"].includes(user.role)
  )
    throw new AppError(
      403,
      "Only the owning customer may accept settlement charges.",
    );
  const s = await one(
    tx,
    "SELECT * FROM service_exception_settlements WHERE booking_id=$1 ORDER BY revision DESC LIMIT 1",
    [b.id],
  );
  if (!s || s.id !== d.settlementId || s.source_status !== b.status)
    throw new AppError(
      409,
      "Settlement changed; review its current exact amount.",
    );
  const old = await one(
    tx,
    "SELECT accepted,notes FROM service_settlement_consents WHERE settlement_id=$1",
    [s.id],
  );
  if (old) {
    if (old.accepted === d.accepted && old.notes === d.notes)
      return { ok: true, replayed: true };
    throw new AppError(
      409,
      "Settlement decision is already recorded. Request a new reviewed revision.",
    );
  }
  await tx.query(
    "INSERT INTO service_settlement_consents(id,settlement_id,customer_id,accepted,notes) VALUES($1,$2,$3,$4,$5)",
    [id(), s.id, user.id, d.accepted, d.notes],
  );
  await audit(tx, user, action, s.id);
  return { ok: true, accepted: d.accepted, workAuthorised: false };
}
