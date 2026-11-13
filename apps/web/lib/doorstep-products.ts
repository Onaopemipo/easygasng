import { z } from "zod";
import { one, type SQL, type Row } from "./db";
import { allow, AppError, id, recentVerification, type Actor } from "./auth";
import { invoiceBalance } from "./invoice-corrections";
import { gasQuote } from "./gas-delivery";
import { canonicalRequest } from "./business-operation";
import { inventoryQualification } from "./inventory-business";
import { productCustodyEvent } from "./vehicle-products";
import { verifyDeliveryCode } from "./delivery-code";
const uid = z.string().uuid();
export async function doorstepProducts(
  tx: SQL,
  user: Actor,
  action: string,
  input: unknown,
): Promise<any> {
  if (
    process.env.EASYGAS_DOORSTEP_ENABLED !== "true" ||
    (process.env.NODE_ENV === "production" &&
      process.env.EASYGAS_FIELD_OPERATIONS_ENABLED !== "true")
  )
    throw new AppError(
      503,
      "Doorstep product operations require release approval.",
    );
  const d = z
    .object({
      orderId: uid,
      amendmentId: uid,
      reason: z.string().trim().min(10).max(1000),
      allocations: z
        .array(
          z
            .object({
              productId: z.string().min(1).max(100),
              manifestId: uid,
              serialIds: z.array(uid).max(20).default([]),
            })
            .strict(),
        )
        .min(1)
        .max(20)
        .optional(),
      amountKobo: z.number().int().positive().optional(),
      creditNoteId: uid.optional(),
      code: z
        .string()
        .regex(/^\d{6}$/)
        .optional(),
      handover: z.literal(true).optional(),
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
  if (
    !m ||
    m.state !== "consented" ||
    !m.customer_consent_at ||
    m.proposal.lines?.length ||
    !m.proposal.items?.length
  )
    throw new AppError(
      409,
      "Exact customer consent to a physical-product proposal is required.",
    );
  const recovery = [
    "doorstep.products.cancel",
    "doorstep.products.collection.verify",
  ].includes(action);
  const attempt = await one(
    tx,
    "SELECT * FROM delivery_attempts WHERE order_id=$1 ORDER BY assignment_version DESC LIMIT 1 FOR UPDATE",
    [o.id],
  );
  if (
    !recovery &&
    (o.status !== "out_for_delivery" ||
      attempt?.id !== m.attempt_id ||
      attempt?.state !== "arrived" ||
      attempt.driver_id !== m.driver_id ||
      o.driver_id !== m.driver_id ||
      Number(o.tracking_version) !== Number(m.order_version))
  )
    throw new AppError(
      409,
      "Current unchanged arrived assignment is required.",
    );
  const invoice = await one(
    tx,
    "SELECT * FROM customer_invoices WHERE order_id=$1",
    [o.id],
  );
  if (!invoice) throw new AppError(409, "Issue the original invoice first.");
  const b = await invoiceBalance(tx, invoice);
  const e = await one(
    tx,
    "SELECT * FROM doorstep_product_execution WHERE amendment_id=$1 FOR UPDATE",
    [m.id],
  );
  const t = await one(
    tx,
    e
      ? "SELECT t.*,v.active,v.physical_capacity_grams FROM driver_trips t JOIN driver_vehicles v ON v.id=t.vehicle_id WHERE t.id=$1 FOR UPDATE OF t,v"
      : "SELECT t.*,v.active,v.physical_capacity_grams FROM driver_trips t JOIN driver_vehicles v ON v.id=t.vehicle_id WHERE t.driver_id=$1 AND t.ended_at IS NULL FOR UPDATE OF t,v",
    [e ? e.trip_id : o.driver_id],
  );
  if (
    !t ||
    t.branch_id !== o.branch_id ||
    (!recovery && (t.ended_at || !t.active || t.driver_id !== o.driver_id))
  )
    throw new AppError(
      409,
      "Active acknowledged branch vehicle custody required.",
    );
  const agreed = m.price_snapshot.quote;
  // Cash/credit recovery follows the historical consented obligation even if the catalogue is retired.
  const quote = recovery
    ? agreed
    : await gasQuote(tx, [], o.branch_id, m.proposal.items);
  if (action === "doorstep.products.prepare") {
    allow(user, ["owner", "finance"], o.branch_id);
    recentVerification(user);
    await inventoryQualification(tx, user.id, o.branch_id, "inventory_safety");
    if (
      e ||
      (await one(
        tx,
        "SELECT amendment_id FROM doorstep_execution WHERE order_id=$1 AND state='reserved' UNION ALL SELECT amendment_id FROM doorstep_product_execution WHERE order_id=$1 AND state='reserved'",
        [o.id],
      ))
    )
      throw new AppError(
        409,
        "Resolve the pending supplementary obligation first.",
      );
    if (
      b.voided ||
      b.amountDueKobo ||
      b.overpaidKobo ||
      b.notes.some((n) => n.state === "pending") ||
      o.payment_status !== "verified"
    )
      throw new AppError(
        409,
        "Settle the current original invoice before preparing more goods.",
      );
    if (
      Date.now() - new Date(m.created_at).getTime() > 900000 ||
      !agreed.physicalLines ||
      canonicalRequest(quote.physicalLines) !==
        canonicalRequest(agreed.physicalLines) ||
      quote.physicalSubtotalKobo !== agreed.physicalSubtotalKobo
    )
      throw new AppError(
        409,
        "Product pricing or consent changed/expired; obtain a fresh exact proposal.",
      );
    if (
      !d.allocations ||
      d.allocations.length !== quote.physicalLines.length ||
      new Set(d.allocations.map((a) => a.productId)).size !==
        d.allocations.length
    )
      throw new AppError(
        400,
        "Choose one exact acknowledged manifest allocation for every product.",
      );
    const selected: Row[] = [];
    for (const allocation of [...d.allocations].sort((a, b) =>
      a.manifestId.localeCompare(b.manifestId),
    )) {
      const product = quote.physicalLines.find(
          (p:any) => p.productId === allocation.productId,
        ),
        load = await one(
          tx,
          "SELECT * FROM vehicle_product_loads WHERE id=$1 FOR UPDATE",
          [allocation.manifestId],
        );
      if (
        !product ||
        !load ||
        load.product_id !== product.productId ||
        load.trip_id !== t.id ||
        load.branch_id !== o.branch_id ||
        load.state !== "active" ||
        load.serialized !== (product.category === "Empty cylinders") ||
        load.acknowledged_by !== o.driver_id ||
        Number(load.available) < product.quantity
      )
        throw new AppError(
          409,
          "Actual independently acknowledged vehicle stock is insufficient or does not match this visit.",
        );
      if (
        load.serialized
          ? allocation.serialIds.length !== product.quantity ||
            new Set(allocation.serialIds).size !== product.quantity
          : allocation.serialIds.length > 0
      )
        throw new AppError(
          409,
          "Exact distinct manifested serials are required for each cylinder.",
        );
      for (const serial of [...allocation.serialIds].sort()) {
        const c = await one(
          tx,
          "SELECT c.*,s.id AS manifest_serial,s.state AS manifest_state FROM vehicle_product_serials s JOIN cylinders c ON c.id=s.cylinder_id WHERE s.load_id=$1 AND c.id=$2 FOR UPDATE OF s,c",
          [load.id, serial],
        );
        if (
          !c ||
          c.manifest_state !== "loaded" ||
          c.ownership !== "company" ||
          c.customer_id ||
          c.status !== "empty" ||
          Date.parse(c.test_due) <= Date.now() ||
          Number(c.size_kg) !== product.sizeKg
        )
          throw new AppError(
            409,
            "Manifested cylinder custody or inspection is no longer eligible.",
          );
      }
      selected.push({ load, product, allocation });
    }
    const noteId = id(),
      seq = Number(
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
        seq,
        quote.physicalSubtotalKobo,
        `Doorstep products ${m.id}: ${d.reason}`,
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
      "INSERT INTO doorstep_product_execution(amendment_id,order_id,trip_id,note_id,amount_kobo,expires_at) VALUES($1,$2,$3,$4,$5,$6)",
      [
        m.id,
        o.id,
        t.id,
        noteId,
        quote.physicalSubtotalKobo,
        new Date(new Date(m.created_at).getTime() + 900000).toISOString(),
      ],
    );
    for (const { load, product, allocation } of selected) {
      await tx.query(
        "INSERT INTO doorstep_product_lines(id,amendment_id,load_id,product_id,quantity,unit_price_kobo,name,serialized) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
        [
          id(),
          m.id,
          load.id,
          product.productId,
          product.quantity,
          product.unitPriceKobo,
          product.name,
          load.serialized,
        ],
      );
      await tx.query(
        "UPDATE vehicle_product_loads SET available=available-$1,reserved=reserved+$1,version=version+1 WHERE id=$2",
        [product.quantity, load.id],
      );
      for (const serial of allocation.serialIds)
        await tx.query(
          "UPDATE vehicle_product_serials SET state='reserved',amendment_id=$1 WHERE load_id=$2 AND cylinder_id=$3",
          [m.id, load.id, serial],
        );
      await productCustodyEvent(
        tx,
        user,
        load.id,
        "doorstep.products.reserved",
        {
          amendmentId: m.id,
          quantity: product.quantity,
          noteId,
          serialIds: allocation.serialIds,
        },
        o.id,
      );
    }
    return { ok: true, noteId, amountKobo: quote.physicalSubtotalKobo };
  }
  if (!e || e.state !== "reserved")
    throw new AppError(
      409,
      "A reserved physical-product obligation is required.",
    );
  const lines = (
    await tx.query(
      "SELECT * FROM doorstep_product_lines WHERE amendment_id=$1 ORDER BY load_id FOR UPDATE",
      [m.id],
    )
  ).rows;
  const note = b.notes.find((n) => n.id === e.note_id);
  if (action === "doorstep.products.cancel") {
    allow(user, ["owner", "finance"], o.branch_id);
    recentVerification(user);
    if (e.cash_reported_at && !e.cash_verified_at)
      throw new AppError(
        409,
        "Independently reconcile reported cash before cancelling.",
      );
    const credit = b.notes.find((n) => n.id === d.creditNoteId);
    if (
      note?.state !== "rejected" &&
      !(
        note?.state === "approved" &&
        credit?.kind === "credit" &&
        credit.state === "approved" &&
        Number(credit.amount_kobo) === Number(e.amount_kobo) &&
        credit.sequence > note.sequence
      )
    )
      throw new AppError(
        409,
        "Reject a pending debit or independently approve an exact later credit first.",
      );
    for (const line of lines) {
      await tx.query(
        "UPDATE vehicle_product_loads SET available=available+$1,reserved=reserved-$1,version=version+1 WHERE id=$2 AND reserved>=$1",
        [line.quantity, line.load_id],
      );
      await tx.query(
        "UPDATE vehicle_product_serials SET state='loaded',amendment_id=NULL WHERE load_id=$1 AND amendment_id=$2 AND state='reserved'",
        [line.load_id, m.id],
      );
      await productCustodyEvent(
        tx,
        user,
        line.load_id,
        "doorstep.products.cancelled",
        {
          amendmentId: m.id,
          quantity: line.quantity,
          creditNoteId: d.creditNoteId ?? null,
          reason: d.reason,
        },
        o.id,
      );
    }
    await tx.query(
      "UPDATE doorstep_product_lines SET state='cancelled' WHERE amendment_id=$1",
      [m.id],
    );
    await tx.query(
      "UPDATE doorstep_product_execution SET state='cancelled',credit_note_id=$1 WHERE amendment_id=$2",
      [note?.state === "approved" ? d.creditNoteId : null, m.id],
    );
    return { ok: true, refundCreated: false };
  }
  if (
    !note ||
    note.state !== "approved" ||
    Number(note.amount_kobo) !== Number(e.amount_kobo) ||
    b.voided ||
    b.notes.some(
      (n) =>
        n.state === "pending" ||
        (n.state === "approved" && n.sequence > note.sequence),
    ) ||
    (action !== "doorstep.products.collection.verify" &&
      new Date(e.expires_at).getTime() <= Date.now()) ||
    (await one(
      tx,
      "SELECT id FROM credit_requests WHERE order_id=$1 AND status='approved' AND kind='refund' AND invoice_excess=false LIMIT 1",
      [o.id],
    ))
  )
    throw new AppError(
      409,
      "Current independently approved exact obligation and unexpired consent are required.",
    );
  if (action === "doorstep.products.collection.report") {
    allow(user, ["driver"], o.branch_id);
    if (
      o.payment_method !== "cash_on_delivery" ||
      e.cash_reported_at ||
      d.amountKobo !== Number(e.amount_kobo) ||
      b.amountDueKobo !== Number(e.amount_kobo)
    )
      throw new AppError(
        409,
        "Report only the exact cash actually collected once.",
      );
    await tx.query(
      "UPDATE doorstep_product_execution SET cash_reported_by=$1,cash_reported_at=now() WHERE amendment_id=$2",
      [user.id, m.id],
    );
    for (const line of lines)
      await productCustodyEvent(
        tx,
        user,
        line.load_id,
        "doorstep.products.cash_reported",
        { amendmentId: m.id, amountKobo: e.amount_kobo, reason: d.reason },
        o.id,
      );
    return { ok: true };
  }
  if (action === "doorstep.products.collection.verify") {
    allow(user, ["owner", "finance"], o.branch_id);
    recentVerification(user);
    if (
      !e.cash_reported_at ||
      e.cash_reported_by !== m.driver_id ||
      e.cash_reported_by === user.id ||
      e.cash_verified_at ||
      new Date(e.cash_reported_at) > new Date(e.expires_at) ||
      b.amountDueKobo !== Number(e.amount_kobo)
    )
      throw new AppError(
        409,
        "Independent exact timely collection verification required.",
      );
    await tx.query(
      "INSERT INTO verified_payments(id,order_id,reference,amount_kobo,method,verified_by) VALUES($1,$2,$3,$4,'cash',$5)",
      [id(), o.id, `doorstep-products:${m.id}`, e.amount_kobo, user.id],
    );
    await tx.query(
      "UPDATE doorstep_product_execution SET cash_verified_by=$1,cash_verified_at=now() WHERE amendment_id=$2",
      [user.id, m.id],
    );
    for (const line of lines)
      await productCustodyEvent(
        tx,
        user,
        line.load_id,
        "doorstep.products.cash_verified",
        { amendmentId: m.id, amountKobo: e.amount_kobo, reason: d.reason },
        o.id,
      );
    return { ok: true };
  }
  if (action !== "doorstep.products.handover")
    throw new AppError(400, "Unknown product execution action.");
  allow(user, ["driver"], o.branch_id);
  if (
    d.handover !== true ||
    !d.code ||
    b.amountDueKobo !== 0 ||
    b.overpaidKobo !== 0 ||
    canonicalRequest(quote.physicalLines) !==
      canonicalRequest(agreed.physicalLines)
  )
    throw new AppError(
      409,
      "Confirmed full handover, current exact price and independent settlement are required.",
    );
  const heldWeight = Number(
    (await one(
      tx,
      "SELECT COALESCE(sum((available+reserved)*unit_weight_grams),0) n FROM vehicle_product_loads WHERE trip_id=$1 AND state<>'reconciled'",
      [t.id],
    ))!.n,
  );
  if (
    !t.physical_capacity_grams ||
    heldWeight > Number(t.physical_capacity_grams)
  )
    throw new AppError(
      409,
      "Current measured vehicle physical payload capacity is ineligible.",
    );
  await verifyDeliveryCode(tx, user, o, d.code);
  await inventoryQualification(
    tx,
    note.requested_by,
    o.branch_id,
    "inventory_safety",
  );
  for (const line of lines) {
    const load = await one(
      tx,
      "SELECT * FROM vehicle_product_loads WHERE id=$1 FOR UPDATE",
      [line.load_id],
    );
    if (
      !load ||
      load.state !== "active" ||
      load.trip_id !== t.id ||
      load.acknowledged_by !== user.id ||
      Number(load.reserved) < line.quantity
    )
      throw new AppError(
        409,
        "Manifest custody changed. Do not hand over goods.",
      );
    await inventoryQualification(
      tx,
      load.issued_by,
      o.branch_id,
      "inventory_safety",
    );
    const serials = (
      await tx.query(
        "SELECT c.*,s.id AS manifest_serial FROM vehicle_product_serials s JOIN cylinders c ON c.id=s.cylinder_id WHERE s.load_id=$1 AND s.amendment_id=$2 AND s.state='reserved' ORDER BY c.id FOR UPDATE OF s,c",
        [load.id, m.id],
      )
    ).rows;
    if (line.serialized && serials.length !== line.quantity)
      throw new AppError(409, "Serialized handover is incomplete.");
    for (const c of serials) {
      if (
        c.status !== "empty" ||
        c.ownership !== "company" ||
        c.customer_id ||
        Date.parse(c.test_due) <= Date.now()
      )
        throw new AppError(409, "Cylinder safety/custody changed.");
      await tx.query(
        "UPDATE cylinders SET status='sold',ownership='customer',customer_id=$1 WHERE id=$2",
        [o.customer_id, c.id],
      );
      await tx.query(
        "UPDATE vehicle_product_serials SET state='handed' WHERE id=$1",
        [c.manifest_serial],
      );
      await tx.query(
        "INSERT INTO cylinder_events(id,cylinder_id,actor_id,previous_status,status,reason) VALUES($1,$2,$3,'empty','sold',$4)",
        [id(), c.id, user.id, `Original-order doorstep products: ${m.id}`],
      );
    }
    const stock = await one(
      tx,
      "UPDATE inventory SET quantity=quantity-$1,reserved=reserved-$1 WHERE branch_id=$2 AND product_id=$3 AND quantity>=$1 AND reserved>=$1 RETURNING product_id",
      [line.quantity, o.branch_id, line.product_id],
    );
    if (!stock)
      throw new AppError(
        409,
        "Canonical branch reservation cannot reconcile handed stock.",
      );
    await tx.query(
      "INSERT INTO stock_movements(id,branch_id,product_id,quantity,kind,reason,actor_id,reference) VALUES($1,$2,$3,$4,'fulfilled',$5,$6,$7)",
      [
        id(),
        o.branch_id,
        line.product_id,
        -line.quantity,
        d.reason,
        user.id,
        `doorstep-products:${line.id}:fulfilled`,
      ],
    );
    await tx.query(
      "UPDATE vehicle_product_loads SET reserved=reserved-$1,handed=handed+$1,version=version+1 WHERE id=$2",
      [line.quantity, load.id],
    );
    await productCustodyEvent(
      tx,
      user,
      load.id,
      "doorstep.products.handed",
      {
        amendmentId: m.id,
        quantity: line.quantity,
        serialIds: serials.map((s) => s.id),
        reason: d.reason,
      },
      o.id,
    );
  }
  await tx.query(
    "UPDATE doorstep_product_lines SET state='handed' WHERE amendment_id=$1",
    [m.id],
  );
  await tx.query(
    "UPDATE doorstep_product_execution SET state='handed' WHERE amendment_id=$1",
    [m.id],
  );
  return { ok: true, originalVisitStillRequiresCompletion: true };
}
