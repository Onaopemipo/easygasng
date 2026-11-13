import { z } from "zod";
import { allow, AppError, id, recentVerification, type Actor } from "./auth";
import { one, type SQL, type Row } from "./db";
import { audit } from "./governance";
import { gasQuote, verifyGasDispatch } from "./gas-delivery";
import { invoiceBalance } from "./invoice-corrections";
import { inventoryQualification } from "./inventory-business";
import { grams } from "../../../packages/business-rules/src/gas-pricing";

export function doorstepEnabled() {
  return (
    process.env.EASYGAS_DOORSTEP_ENABLED === "true" &&
    process.env.EASYGAS_BULK_LPG_ENABLED === "true" &&
    (process.env.NODE_ENV !== "production" ||
      process.env.EASYGAS_FIELD_OPERATIONS_ENABLED === "true")
  );
}
async function history(
  tx: SQL,
  user: Actor,
  loadId: string,
  orderId: string,
  kind: string,
  detail: unknown,
) {
  await tx.query(
    "INSERT INTO bulk_lpg_events(id,load_id,order_id,kind,actor_id,detail) VALUES($1,$2,$3,$4,$5,$6)",
    [id(), loadId, orderId, kind, user.id, JSON.stringify(detail)],
  );
  await audit(tx, user, kind, orderId, "success", detail as Row);
}
export async function doorstepExecution(
  tx: SQL,
  user: Actor,
  action: string,
  input: unknown,
) {
  if (!doorstepEnabled())
    throw new AppError(
      503,
      "Doorstep execution requires operational release approval.",
    );
  const d = z
    .object({
      orderId: z.string().uuid(),
      amendmentId: z.string().uuid(),
      cylinderId: z.string().uuid().optional(),
      lineId: z.string().uuid().optional(),
      inspections: z
        .array(
          z
            .object({
              cylinderId: z.string().uuid(),
              allowableKg: z.number().positive(),
              evidence: z.string().trim().min(10).max(1000),
            })
            .strict(),
        )
        .min(1)
        .max(10)
        .optional(),
      allowableKg: z.number().positive().optional(),
      evidence: z.string().trim().min(10).max(1000).optional(),
      loadVersion: z.number().int().positive().optional(),
      meterReadingGrams: z
        .number()
        .int()
        .nonnegative()
        .max(1_000_000_000)
        .optional(),
      amountKobo: z.number().int().positive().optional(),
      creditNoteId: z.string().uuid().optional(),
      reason: z.string().trim().min(10).max(500),
    })
    .strict()
    .parse(input);
  const o = await one(tx, "SELECT * FROM orders WHERE id=$1 FOR UPDATE", [
    d.orderId,
  ]);
  if (!o) throw new AppError(404, "Order not found.");
  allow(user, ["owner", "finance", "driver"], o.branch_id);
  if (user.role === "driver" && o.driver_id !== user.id)
    throw new AppError(404, "Order not found.");
  const m = await one(
    tx,
    "SELECT * FROM doorstep_amendments WHERE id=$1 AND order_id=$2 FOR UPDATE",
    [d.amendmentId, o.id],
  );
  if (!m || m.state !== "consented" || !m.customer_consent_at)
    throw new AppError(
      409,
      "Customer consent to this exact proposal is required.",
    );
  const attempt = await one(
    tx,
    "SELECT * FROM delivery_attempts WHERE order_id=$1 ORDER BY assignment_version DESC LIMIT 1 FOR UPDATE",
    [o.id],
  );
  const cancellation = action === "doorstep.cancel";
  const financialVerification = action === "doorstep.collection.verify";
  if (
    !cancellation &&
    !financialVerification &&
    (o.status !== "out_for_delivery" ||
      attempt?.id !== m.attempt_id ||
      attempt?.driver_id !== m.driver_id ||
      o.driver_id !== m.driver_id ||
      attempt?.state !== "arrived" ||
      Number(o.tracking_version) !== Number(m.order_version))
  )
    throw new AppError(
      409,
      "Current arrived visit and unchanged assignment/version required.",
    );
  const invoice = await one(
    tx,
    "SELECT * FROM customer_invoices WHERE order_id=$1",
    [o.id],
  );
  if (!invoice)
    throw new AppError(
      409,
      "Issue the original invoice before preparing an addition.",
    );
  const b = await invoiceBalance(tx, invoice);
  let e = await one(
    tx,
    "SELECT * FROM doorstep_execution WHERE amendment_id=$1 FOR UPDATE",
    [m.id],
  );
  let load: Row | undefined;
  if (e)
    load = await one(
      tx,
      "SELECT l.*,t.driver_id,t.ended_at,t.vehicle_id FROM bulk_lpg_loads l JOIN driver_trips t ON t.id=l.trip_id WHERE l.id=$1 FOR UPDATE OF l,t",
      [e.load_id],
    );
  else
    load = await one(
      tx,
      "SELECT l.*,t.driver_id,t.ended_at,t.vehicle_id FROM bulk_lpg_allocations a JOIN bulk_lpg_loads l ON l.id=a.load_id JOIN driver_trips t ON t.id=l.trip_id WHERE a.order_id=$1 FOR UPDATE OF l,t",
      [o.id],
    );
  if (
    !load ||
    (!financialVerification && load.ended_at) ||
    load.branch_id !== o.branch_id ||
    (!financialVerification && load.driver_id !== o.driver_id) ||
    (!financialVerification && load.acknowledged_by !== o.driver_id) ||
    (!cancellation && !financialVerification && load.state !== "active")
  )
    throw new AppError(
      409,
      "Active acknowledged vehicle custody for this visit is required.",
    );
  if (!cancellation && !financialVerification) {
    await inventoryQualification(
      tx,
      o.driver_id,
      o.branch_id,
      "bulk_lpg_dispensing",
    );
    if (
      !(await one(
        tx,
        "SELECT id FROM bulk_lpg_meters WHERE id=$1 AND active=true AND calibration_expires_at>now() FOR SHARE",
        [load.meter_id],
      ))
    )
      throw new AppError(
        409,
        "Current calibrated meter required before additional obligations or dispensing.",
      );
    if (
      !(await one(
        tx,
        "SELECT v.id FROM driver_vehicles v JOIN branches b ON b.id=v.branch_id AND b.active=true WHERE v.id=$1 AND v.branch_id=$2 AND v.active=true AND v.lpg_suitable=true AND v.capacity_grams>=$3 FOR SHARE OF v,b",
        [load.vehicle_id, o.branch_id, load.loaded_grams],
      ))
    )
      throw new AppError(
        409,
        "Current active branch and suitable vehicle capacity required.",
      );
  }
  if (action === "doorstep.prepare") {
    allow(user, ["owner", "finance"], o.branch_id);
    recentVerification(user);
    await inventoryQualification(tx, user.id, o.branch_id, "bulk_lpg_loading");
    if (
      await one(
        tx,
        "SELECT amendment_id FROM doorstep_product_execution WHERE order_id=$1 AND state='reserved'",
        [o.id],
      )
    )
      throw new AppError(
        409,
        "Resolve the current product addition before preparing more gas.",
      );
    if (e)
      throw new AppError(
        409,
        "This amendment already has a protected execution record.",
      );
    if (!d.inspections && (!d.cylinderId || !d.allowableKg || !d.evidence))
      throw new AppError(
        400,
        "Independent cylinder inspection, allowance and evidence required.",
      );
    if (
      m.proposal.items?.length ||
      !m.proposal.lines?.length ||
      (!d.inspections && m.proposal.lines.length !== 1)
    )
      throw new AppError(
        409,
        "Every gas cylinder needs an inspection; physical products need a vehicle manifest.",
      );
    if (Date.now() - new Date(m.created_at).getTime() > 15 * 60000)
      throw new AppError(
        409,
        "Proposal expired. Obtain fresh pricing and customer consent.",
      );
    if (
      b.voided ||
      b.amountDueKobo !== 0 ||
      b.overpaidKobo !== 0 ||
      b.notes.some((n: any) => n.state === "pending") ||
      o.payment_status !== "verified"
    )
      throw new AppError(
        409,
        "Settle the original current invoice and resolve all corrections before preparing an addition.",
      );
    const quote = await gasQuote(tx, m.proposal.lines, o.branch_id);
    const agreed = m.price_snapshot.quote;
    if (
      quote.priceVersion !== agreed.priceVersion ||
      quote.policyVersion !== agreed.policyVersion ||
      quote.subtotalKobo !== agreed.subtotalKobo ||
      !Number.isSafeInteger(quote.subtotalKobo) ||
      quote.subtotalKobo <= 0
    )
      throw new AppError(
        409,
        "Approved price or gas policy changed. Obtain fresh customer consent.",
      );
    const inspected = d.inspections ?? [
      {
        cylinderId: d.cylinderId!,
        allowableKg: d.allowableKg!,
        evidence: d.evidence!,
      },
    ];
    if (
      inspected.length !== quote.lines.length ||
      new Set(inspected.map((i) => i.cylinderId)).size !== inspected.length
    )
      throw new AppError(
        409,
        "Provide one distinct inspected customer cylinder for every quoted line in order.",
      );
    const prepared = [];
    // Stable cylinder lock order prevents competing inspections from reserving the same cylinder.
    for (const i of [...inspected].sort((a, b) =>
      a.cylinderId.localeCompare(b.cylinderId),
    ))
      await tx.query("SELECT id FROM cylinders WHERE id=$1 FOR UPDATE", [
        i.cylinderId,
      ]);
    for (let pos = 0; pos < inspected.length; pos++) {
      const i = inspected[pos],
        line = quote.lines[pos],
        c = await one(tx, "SELECT * FROM cylinders WHERE id=$1", [
          i.cylinderId,
        ]);
      if (
        !c ||
        c.branch_id !== o.branch_id ||
        c.customer_id !== o.customer_id ||
        c.ownership !== "customer" ||
        c.status !== "empty" ||
        Date.parse(c.test_due) <= Date.now() ||
        grams(Number(c.size_kg)) !== line.capacityGrams ||
        grams(i.allowableKg) < line.grams ||
        grams(i.allowableKg) > line.capacityGrams
      )
        throw new AppError(
          409,
          "Current customer cylinder inspection, ownership, capacity and safe allowance required.",
        );
      if (
        await one(
          tx,
          "SELECT g.id FROM order_gas_lines g JOIN orders x ON x.id=g.order_id WHERE g.cylinder_id=$1 AND x.status NOT IN ('delivered','cancelled') LIMIT 1",
          [c.id],
        )
      )
        throw new AppError(409, "Cylinder is committed to an existing refill.");
      if (
        await one(
          tx,
          "SELECT amendment_id FROM doorstep_execution WHERE state='reserved' AND (order_id=$1 OR cylinder_id=$2) UNION ALL SELECT amendment_id FROM doorstep_cylinder_lines WHERE state='reserved' AND cylinder_id=$2",
          [o.id, c.id],
        )
      )
        throw new AppError(
          409,
          "Resolve the current addition/cylinder custody before another preparation.",
        );
      prepared.push({ i, line, c });
    }
    const n = quote.lines.reduce((total: number, l: any) => total + l.grams, 0),
      c = prepared[0].c;
    if (Number(load.buffer_grams) < n)
      throw new AppError(
        409,
        "Insufficient acknowledged physical vehicle buffer.",
      );
    const noteId = id(),
      sequence = Number(
        (await one(
          tx,
          "SELECT COALESCE(max(sequence),0)+1 n FROM invoice_notes WHERE invoice_id=$1",
          [invoice.id],
        ))!.n,
      );
    await tx.query(
      "INSERT INTO invoice_notes(id,invoice_id,sequence,kind,amount_kobo,reason,requested_by) VALUES($1,$2,$3,'debit',$4,$5,$6)",
      [
        noteId,
        invoice.id,
        sequence,
        quote.subtotalKobo,
        `Doorstep ${m.id}: ${d.reason}`,
        user.id,
      ],
    );
    await tx.query(
      "INSERT INTO invoice_note_events(id,note_id,actor_id,detail) VALUES($1,$2,$3,$4)",
      [
        id(),
        noteId,
        user.id,
        JSON.stringify({
          kind: "proposed",
          amendmentId: m.id,
          additionalDeliveryKobo: 0,
        }),
      ],
    );
    await tx.query(
      "INSERT INTO doorstep_execution(amendment_id,order_id,load_id,note_id,grams,amount_kobo,cylinder_id,allowable_grams,inspected_by,inspection_evidence,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)",
      [
        m.id,
        o.id,
        load.id,
        noteId,
        n,
        quote.subtotalKobo,
        c.id,
        prepared.reduce((total, p) => total + grams(p.i.allowableKg), 0),
        user.id,
        d.inspections
          ? "Per-cylinder inspection evidence retained in doorstep_cylinder_lines"
          : d.evidence,
        new Date(new Date(m.created_at).getTime() + 15 * 60000).toISOString(),
      ],
    );
    if (d.inspections)
      for (let position = 0; position < prepared.length; position++) {
        const p = prepared[position];
        await tx.query(
          "INSERT INTO doorstep_cylinder_lines(id,amendment_id,position,cylinder_id,grams,capacity_grams,amount_kobo,allowable_grams,inspected_by,evidence) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
          [
            id(),
            m.id,
            position + 1,
            p.c.id,
            p.line.grams,
            p.line.capacityGrams,
            p.line.subtotalKobo,
            grams(p.i.allowableKg),
            user.id,
            p.i.evidence,
          ],
        );
      }
    await tx.query(
      "UPDATE bulk_lpg_loads SET buffer_grams=buffer_grams-$1,version=version+1 WHERE id=$2",
      [n, load.id],
    );
    await history(tx, user, load.id, o.id, "doorstep.reserved", {
      amendmentId: m.id,
      grams: n,
      noteId,
      additionalDeliveryKobo: 0,
    });
    return {
      ok: true,
      noteId,
      amountKobo: quote.subtotalKobo,
      message:
        "Vehicle buffer transferred to the addition. Independent invoice debit approval is required before collection or dispensing.",
    };
  }
  if (!e || e.state !== "reserved")
    throw new AppError(409, "A current reserved amendment is required.");
  const cylinderLines = (
    await tx.query(
      "SELECT * FROM doorstep_cylinder_lines WHERE amendment_id=$1 ORDER BY position FOR UPDATE",
      [m.id],
    )
  ).rows;
  const pendingLines = cylinderLines.filter((l) => l.state === "reserved");
  const remainingGrams = cylinderLines.length
    ? pendingLines.reduce((n, l) => n + Number(l.grams), 0)
    : Number(e.grams);
  const remainingKobo = cylinderLines.length
    ? pendingLines.reduce((n, l) => n + Number(l.amount_kobo), 0)
    : Number(e.amount_kobo);
  const note = b.notes.find((n: any) => n.id === e.note_id);
  if (action === "doorstep.cancel") {
    allow(user, ["owner", "finance"], o.branch_id);
    recentVerification(user);
    if (e.cash_reported_at && !e.cash_verified_at)
      throw new AppError(
        409,
        "Resolve physically reported cash with finance before cancellation.",
      );
    if (note?.state === "pending")
      throw new AppError(
        409,
        "Independently reject the pending debit first, or approve an exact linked credit for an approved debit.",
      );
    if (note?.state === "approved") {
      const credit = b.notes.find((n: any) => n.id === d.creditNoteId);
      if (
        !credit ||
        credit.kind !== "credit" ||
        credit.state !== "approved" ||
        Number(credit.amount_kobo) !== remainingKobo ||
        credit.sequence <= note.sequence
      )
        throw new AppError(
          409,
          "A separately approved exact invoice credit is required; payments are not automatically refunded.",
        );
    } else if (note?.state !== "rejected")
      throw new AppError(
        409,
        "Resolve the supplementary invoice obligation before cancellation.",
      );
    await tx.query(
      "UPDATE doorstep_cylinder_lines SET state='cancelled' WHERE amendment_id=$1 AND state='reserved'",
      [m.id],
    );
    await tx.query(
      "UPDATE doorstep_execution SET state='cancelled',credit_note_id=$1 WHERE amendment_id=$2",
      [note.state === "approved" ? d.creditNoteId : null, m.id],
    );
    await tx.query(
      "UPDATE bulk_lpg_loads SET buffer_grams=buffer_grams+$1,version=version+1 WHERE id=$2",
      [remainingGrams, load.id],
    );
    await history(tx, user, load.id, o.id, "doorstep.cancelled", {
      amendmentId: m.id,
      grams: remainingGrams,
      creditNoteId: d.creditNoteId ?? null,
      reason: d.reason,
    });
    return {
      ok: true,
      message:
        "Undispensed mass returned to vehicle buffer. Any paid credit requires separate finance refund reconciliation.",
    };
  }
  if (
    !note ||
    note.state !== "approved" ||
    Number(note.amount_kobo) !== Number(e.amount_kobo) ||
    b.voided ||
    b.notes.some(
      (n: any) =>
        n.state === "pending" ||
        (n.state === "approved" && n.sequence > note.sequence),
    ) ||
    (action !== "doorstep.collection.verify" &&
      Date.parse(e.expires_at) <= Date.now())
  )
    throw new AppError(
      409,
      "Current independently approved debit and unexpired exact-price consent required; resolve changed corrections with finance.",
    );
  if (
    await one(
      tx,
      "SELECT id FROM credit_requests WHERE order_id=$1 AND status='approved' AND kind='refund' AND invoice_excess=false LIMIT 1",
      [o.id],
    )
  )
    throw new AppError(
      409,
      "Refund reconciliation is required before supplementary collection or dispensing.",
    );
  if (action === "doorstep.collection.report") {
    allow(user, ["driver"], o.branch_id);
    if (
      o.payment_method !== "cash_on_delivery" ||
      d.amountKobo !== Number(e.amount_kobo) ||
      b.amountDueKobo !== Number(e.amount_kobo) ||
      e.cash_reported_at
    )
      throw new AppError(
        409,
        "Report only the exact outstanding cash actually collected once.",
      );
    await tx.query(
      "UPDATE doorstep_execution SET cash_reported_by=$1,cash_reported_at=now() WHERE amendment_id=$2",
      [user.id, m.id],
    );
    await history(tx, user, load.id, o.id, "doorstep.cash_reported", {
      amendmentId: m.id,
      amountKobo: Number(e.amount_kobo),
      reason: d.reason,
    });
    return {
      ok: true,
      message:
        "Cash reported. Independent finance verification is required before dispensing.",
    };
  }
  if (action === "doorstep.collection.verify") {
    allow(user, ["owner", "finance"], o.branch_id);
    recentVerification(user);
    if (
      !e.cash_reported_at ||
      e.cash_reported_by !== m.driver_id ||
      new Date(e.cash_reported_at).getTime() >
        new Date(e.expires_at).getTime() ||
      e.cash_reported_by === user.id ||
      e.cash_verified_at ||
      b.amountDueKobo !== Number(e.amount_kobo)
    )
      throw new AppError(
        409,
        "Independent verification of the exact reported outstanding cash is required.",
      );
    await tx.query(
      "INSERT INTO verified_payments(id,order_id,reference,amount_kobo,method,verified_by) VALUES($1,$2,$3,$4,'cash',$5)",
      [id(), o.id, `doorstep:${m.id}`, e.amount_kobo, user.id],
    );
    await tx.query(
      "UPDATE doorstep_execution SET cash_verified_by=$1,cash_verified_at=now() WHERE amendment_id=$2",
      [user.id, m.id],
    );
    await history(tx, user, load.id, o.id, "doorstep.cash_verified", {
      amendmentId: m.id,
      amountKobo: Number(e.amount_kobo),
      reason: d.reason,
    });
    return { ok: true };
  }
  if (action !== "doorstep.dispense")
    throw new AppError(404, "Unknown doorstep execution action.");
  allow(user, ["driver"], o.branch_id);
  await inventoryQualification(tx, user.id, o.branch_id, "bulk_lpg_dispensing");
  await inventoryQualification(
    tx,
    e.inspected_by,
    o.branch_id,
    "bulk_lpg_loading",
  );
  if (d.loadVersion !== Number(load.version))
    throw new AppError(409, "Load changed. Refresh before dispensing.");
  if (b.amountDueKobo !== 0 || b.overpaidKobo !== 0)
    throw new AppError(
      409,
      "Independently verified exact invoice settlement required before extra dispensing.",
    );
  const current = await gasQuote(tx, m.proposal.lines, o.branch_id),
    agreed = m.price_snapshot.quote;
  if (
    current.priceVersion !== agreed.priceVersion ||
    current.policyVersion !== agreed.policyVersion
  )
    throw new AppError(
      409,
      "Gas price/policy changed; finance and fresh consent review required.",
    );
  if (
    !(await one(
      tx,
      "SELECT id FROM bulk_lpg_meters WHERE id=$1 AND active=true AND calibration_expires_at>now() FOR SHARE",
      [load.meter_id],
    ))
  )
    throw new AppError(409, "Current calibrated meter required.");
  const vehicle = await one(
    tx,
    "SELECT * FROM driver_vehicles WHERE id=$1 AND branch_id=$2 AND active=true AND lpg_suitable=true FOR SHARE",
    [load.vehicle_id, o.branch_id],
  );
  if (!vehicle || Number(vehicle.capacity_grams) < Number(load.loaded_grams))
    throw new AppError(409, "Current suitable vehicle capacity required.");
  const selected = cylinderLines.length
    ? cylinderLines.find(
        (l) =>
          l.id ===
          (d.lineId ??
            (cylinderLines.length === 1 ? cylinderLines[0].id : undefined)),
      )
    : null;
  if (cylinderLines.length && (!selected || selected.state !== "reserved"))
    throw new AppError(
      409,
      "Choose a current unfilled cylinder line; completed evidence cannot be replayed with a new operation.",
    );
  const obligation = selected ?? e;
  const quotedLine = selected
    ? current.lines[Number(selected.position) - 1]
    : current.lines[0];
  const c = await one(tx, "SELECT * FROM cylinders WHERE id=$1 FOR UPDATE", [
    obligation.cylinder_id,
  ]);
  if (
    !c ||
    c.status !== "empty" ||
    c.customer_id !== o.customer_id ||
    c.branch_id !== o.branch_id ||
    c.ownership !== "customer" ||
    Date.parse(c.test_due) <= Date.now() ||
    Number(obligation.allowable_grams) < Number(obligation.grams) ||
    grams(Number(c.size_kg)) !== quotedLine.capacityGrams
  )
    throw new AppError(
      409,
      "Cylinder safety/custody changed; do not dispense.",
    );
  await verifyGasDispatch(tx, o.id);
  const delta = (d.meterReadingGrams ?? -1) - Number(load.meter_reading_grams);
  if (
    delta !== Number(obligation.grams) ||
    Number(load.dispensed_grams) + delta >
      Number(load.loaded_grams) - Number(load.buffer_grams)
  )
    throw new AppError(
      409,
      "Meter delta must exactly match the reserved supplementary mass.",
    );
  const stock = await one(
    tx,
    "UPDATE gas_stock SET grams=grams-$1,reserved_grams=reserved_grams-$1 WHERE branch_id=$2 AND grams>=$1 AND reserved_grams>=$1 RETURNING branch_id",
    [delta, o.branch_id],
  );
  if (!stock)
    throw new AppError(409, "Canonical reservation cannot be reconciled.");
  await tx.query(
    "INSERT INTO gas_stock_movements(id,branch_id,grams,kind,reference,actor_id,reason) VALUES($1,$2,$3,'fulfilled',$4,$5,$6)",
    [
      id(),
      o.branch_id,
      -delta,
      selected
        ? `doorstep:${m.id}:${selected.id}:fulfilled`
        : `doorstep:${m.id}:fulfilled`,
      user.id,
      d.reason,
    ],
  );
  await tx.query(
    "UPDATE bulk_lpg_loads SET dispensed_grams=dispensed_grams+$1,meter_reading_grams=$2,version=version+1 WHERE id=$3",
    [delta, d.meterReadingGrams, load.id],
  );
  if (selected)
    await tx.query(
      "UPDATE doorstep_cylinder_lines SET state='dispensed',meter_reading_grams=$1,recorded_by=$2,recorded_at=now() WHERE id=$3",
      [d.meterReadingGrams, user.id, selected.id],
    );
  if (!selected || pendingLines.length === 1)
    await tx.query(
      "UPDATE doorstep_execution SET state='dispensed' WHERE amendment_id=$1",
      [m.id],
    );
  await tx.query("UPDATE cylinders SET status='filled' WHERE id=$1", [c.id]);
  await tx.query(
    "INSERT INTO cylinder_events(id,cylinder_id,actor_id,previous_status,status,reason) VALUES($1,$2,$3,'empty','filled',$4)",
    [id(), c.id, user.id, `Supplementary gas fulfilled: ${m.id}`],
  );
  await history(tx, user, load.id, o.id, "doorstep.dispensed", {
    amendmentId: m.id,
    lineId: selected?.id ?? null,
    grams: delta,
    noteId: e.note_id,
    meterReadingGrams: d.meterReadingGrams,
    reason: d.reason,
  });
  return {
    ok: true,
    message:
      "Additional gas metered and canonical mass fulfilled once. Complete the original visit using its normal customer handover proof.",
  };
}
