import { serviceInvoiceSource } from "./service-invoice-source";
import { paystackAvailability } from "./payments/runtime";
import { appOrigin } from "./request-origin";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import {
  allow,
  AppError,
  digest,
  id,
  recentVerification,
  type Actor,
} from "./auth";
import { one, type SQL } from "./db";
import { audit } from "./governance";
import { enqueueChannel } from "./channel-messaging";
export async function invoiceBalance(tx: SQL, invoice: any) {
  const sourceColumn = invoice.booking_id ? "booking_id" : "order_id";
  const sourceId = invoice.booking_id ?? invoice.order_id;
  const notes = (
    await tx.query(
      "SELECT * FROM invoice_notes WHERE invoice_id=$1 ORDER BY sequence",
      [invoice.id],
    )
  ).rows;
  const active = notes.filter((n) => n.state === "approved");
  const adjustment = active.reduce(
    (s, n) => s + (n.kind === "debit" ? 1 : -1) * Number(n.amount_kobo),
    0,
  );
  const verified = Number(
    (
      await one(
        tx,
        `SELECT COALESCE(sum(amount_kobo),0) AS n FROM verified_payments WHERE ${sourceColumn}=$1`,
        [sourceId],
      )
    )?.n ?? 0,
  );
  const refunded = Number(
    (
      await one(
        tx,
        `SELECT COALESCE(sum(amount_kobo),0) AS n FROM credit_requests WHERE ${sourceColumn}=$1 AND status='approved' AND kind='refund'`,
        [sourceId],
      )
    )?.n ?? 0,
  );
  const total = Number(invoice.total_kobo) + adjustment,
    paid = Math.max(0, verified - refunded),
    version = 1 + active.length;
  return {
    notes,
    totalKobo: total,
    paidKobo: paid,
    amountDueKobo: Math.max(0, total - paid),
    overpaidKobo: Math.max(0, paid - total),
    version,
    voided: active.some((n) => n.kind === "void"),
  };
}
export async function invoiceCorrections(
  tx: SQL,
  user: Actor,
  action: string,
  input: unknown,
) {
  const d = z
    .object({
      orderId: z.string().uuid().optional(),
      bookingId: z.string().uuid().optional(),
      kind: z.enum(["credit", "debit", "void"]).optional(),
      amountKobo: z.number().int().positive().max(1000000000).optional(),
      reason: z.string().trim().min(10).max(1000).optional(),
      noteId: z.string().uuid().optional(),
      approve: z.boolean().optional(),
      acceptWalletCredit: z.literal(true).optional(),
      token: z
        .string()
        .regex(/^[a-f0-9]{64}$/)
        .optional(),
      channel: z.enum(["sms", "whatsapp"]).optional(),
    })
    .strict()
    .refine(
      (d) => Boolean(d.orderId) !== Boolean(d.bookingId),
      "Choose exactly one invoice source.",
    )
    .parse(input);
  const sourceColumn = d.bookingId ? "booking_id" : "order_id";
  const o = await one(
    tx,
    `SELECT * FROM ${d.bookingId ? "service_bookings" : "orders"} WHERE id=$1 FOR UPDATE`,
    [d.bookingId ?? d.orderId],
  );
  if (!o) throw new AppError(404, "Order not found.");
  const customer = ["customer", "commercial"].includes(user.role);
  if (customer) {
    if (o.customer_id !== user.id) throw new AppError(404, "Order not found.");
  } else
    allow(
      user,
      [
        "owner",
        "finance",
        "manager",
        ...(d.bookingId ? ["manager"] : []),
      ],
      o.branch_id,
    );
  const inv = await one(
    tx,
    `SELECT * FROM customer_invoices WHERE ${sourceColumn}=$1`,
    [o.id],
  );
  if (!inv) throw new AppError(409, "Issue the original invoice first.");
  let b = await invoiceBalance(tx, inv);
  if (action === "invoice.excess.request") {
    if (!customer || !d.orderId || d.acceptWalletCredit !== true || !d.reason)
      throw new AppError(
        403,
        "The owning customer must explicitly accept purchase credit and give a reason.",
      );
    if (
      b.voided ||
      !Number.isSafeInteger(b.overpaidKobo) ||
      b.overpaidKobo <= 0 ||
      b.notes.some((n) => n.state === "pending") ||
      (await one(
        tx,
        "SELECT amendment_id FROM doorstep_execution WHERE order_id=$1 AND state='reserved' UNION ALL SELECT amendment_id FROM doorstep_product_execution WHERE order_id=$1 AND state='reserved'",
        [o.id],
      ))
    )
      throw new AppError(
        409,
        "Resolve pending fulfilment/invoice obligations and confirm an actual excess collection first.",
      );
    const prior = await one(
      tx,
      "SELECT id,invoice_excess FROM credit_requests WHERE order_id=$1 AND kind='refund' AND status='pending'",
      [o.id],
    );
    if (prior) {
      if (!prior.invoice_excess)
        throw new AppError(
          409,
          "Another refund requires finance review first.",
        );
      return { id: prior.id };
    }
    const requestId = id();
    await tx.query(
      "INSERT INTO credit_requests(id,customer_id,order_id,amount_kobo,kind,requested_by,reason,branch_id,invoice_excess,invoice_excess_snapshot) VALUES($1,$2,$3,$4,'refund',$2,$5,$6,true,$7)",
      [
        requestId,
        user.id,
        o.id,
        b.overpaidKobo,
        d.reason,
        o.branch_id,
        JSON.stringify({
          invoiceId: inv.id,
          invoiceVersion: b.version,
          totalKobo: b.totalKobo,
          paidKobo: b.paidKobo,
          overpaidKobo: b.overpaidKobo,
        }),
      ],
    );
    await audit(tx, user, action, requestId);
    return {
      id: requestId,
      amountKobo: b.overpaidKobo,
      status: "pending",
      refundMethod: "purchase_credit",
    };
  }
  let serviceSourceKey: string | null = null;
  if (["invoice.request.create", "invoice.request.view"].includes(action)) {
    const refunds = await one(
      tx,
      `SELECT id FROM credit_requests WHERE ${sourceColumn}=$1 AND status='approved' AND kind='refund' AND invoice_excess=false LIMIT 1`,
      [o.id],
    );
    if (d.bookingId) {
      const source = await serviceInvoiceSource(tx, o);
      serviceSourceKey = source?.key ?? null;
      if (!source || source.totalKobo !== b.totalKobo)
        throw new AppError(
          409,
          "Reconcile the service scope/report and invoice before requesting payment.",
        );
    }
    if (
      (o.status === "cancelled" &&
        !(d.bookingId && serviceSourceKey?.startsWith("settlement:"))) ||
      refunds
    )
      throw new AppError(
        409,
        "Cancellation or refund requires finance reconciliation before a payment request.",
      );
  }

  if (action === "invoice.correction.propose") {
    allow(user, ["owner", "finance"], o.branch_id);
    recentVerification(user);
    if (!d.kind || !d.amountKobo || !d.reason)
      throw new AppError(400, "Choose note type, amount and reason.");
    if (b.voided) throw new AppError(409, "Voided invoice cannot be adjusted.");
    if (d.kind === "void" && (b.paidKobo > 0 || d.amountKobo !== b.totalKobo))
      throw new AppError(
        409,
        "Void requires no verified settlement and exactly the current total. Use a credit note/refund review otherwise.",
      );
    if (d.kind === "credit" && d.amountKobo > b.totalKobo)
      throw new AppError(409, "Credit exceeds invoice total.");
    const seq = Number(
      (
        await one(
          tx,
          "SELECT COALESCE(max(sequence),0)+1 AS n FROM invoice_notes WHERE invoice_id=$1",
          [inv.id],
        )
      )?.n,
    );
    const nid = id();
    await tx.query(
      "INSERT INTO invoice_notes(id,invoice_id,sequence,kind,amount_kobo,reason,requested_by) VALUES($1,$2,$3,$4,$5,$6,$7)",
      [nid, inv.id, seq, d.kind, d.amountKobo, d.reason, user.id],
    );
    await tx.query(
      "INSERT INTO invoice_note_events(id,note_id,actor_id,detail) VALUES($1,$2,$3,$4)",
      [
        id(),
        nid,
        user.id,
        JSON.stringify({
          kind: "proposed",
          amountKobo: d.amountKobo,
          reason: d.reason,
        }),
      ],
    );
    await audit(tx, user, action, nid);
    return { noteId: nid, state: "pending" };
  }
  if (action === "invoice.correction.decide") {
    allow(user, ["owner", "finance"], o.branch_id);
    recentVerification(user);
    if (!d.noteId || d.approve === undefined)
      throw new AppError(400, "Select a pending note and decision.");
    const n = await one(
      tx,
      "SELECT * FROM invoice_notes WHERE id=$1 AND invoice_id=$2 FOR UPDATE",
      [d.noteId, inv.id],
    );
    if (!n || n.state !== "pending")
      throw new AppError(409, "Note is no longer pending.");
    if (n.requested_by === user.id)
      throw new AppError(403, "Independent finance/owner decision required.");
    if (
      d.approve &&
      (b.voided ||
        (n.kind !== "debit" && Number(n.amount_kobo) > b.totalKobo) ||
        (n.kind === "void" &&
          (b.paidKobo > 0 || Number(n.amount_kobo) !== b.totalKobo)))
    )
      throw new AppError(
        409,
        "Invoice changed; this note needs a fresh proposal.",
      );
    await tx.query(
      "UPDATE invoice_notes SET state=$1,approved_by=$2,decided_at=now() WHERE id=$3",
      [d.approve ? "approved" : "rejected", user.id, n.id],
    );
    await tx.query(
      "INSERT INTO invoice_note_events(id,note_id,actor_id,detail) VALUES($1,$2,$3,$4)",
      [
        id(),
        n.id,
        user.id,
        JSON.stringify({ kind: d.approve ? "approved" : "rejected" }),
      ],
    );
    if (d.approve)
      await tx.query(
        "UPDATE invoice_payment_requests SET revoked_at=now() WHERE invoice_id=$1 AND revoked_at IS NULL",
        [inv.id],
      );
    await audit(tx, user, action, n.id);
    b = await invoiceBalance(tx, inv);
  } else if (action === "invoice.request.create") {
    allow(user, ["owner", "finance"], o.branch_id);
    recentVerification(user);
    if (
      b.voided ||
      b.amountDueKobo <= 0 ||
      b.notes.some((n) => n.state === "pending")
    )
      throw new AppError(
        409,
        "Resolve pending corrections or settlement before requesting payment.",
      );
    const raw = randomBytes(32).toString("hex"),
      rid = id(),
      expires = new Date(Date.now() + 24 * 3600000).toISOString();
    await tx.query(
      "INSERT INTO invoice_payment_requests(id,invoice_id,invoice_version,token_hash,amount_kobo,expires_at,created_by,service_source_key) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
      [
        rid,
        inv.id,
        b.version,
        digest(raw),
        b.amountDueKobo,
        expires,
        user.id,
        serviceSourceKey,
      ],
    );
    const url = new URL("/payment-request", appOrigin());
    url.hash = `${d.bookingId ? "service:" : ""}${o.id}:${raw}`;
    if (d.channel)
      await enqueueChannel(tx, {
        userId: o.customer_id,
        channel: d.channel,
        purpose: "transactional",
        body: `Your EasyGas invoice is ready. Sign in to review: ${url}`,
        dedupe: `invoice-request:${rid}`,
        template: process.env.META_INVOICE_TEMPLATE,
        expiresAt: expires,
      });
    await audit(tx, user, action, rid);
    return {
      requestId: rid,
      url: String(url),
      expiresAt: expires,
      onlinePaymentsEnabled: false,
    };
  } else if (action === "invoice.request.view") {
    if (!customer) throw new AppError(403, "Customer sign-in required.");
    if (!d.token) throw new AppError(400, "Payment request token required.");
    const r = await one(
      tx,
      "SELECT * FROM invoice_payment_requests WHERE invoice_id=$1 AND token_hash=$2",
      [inv.id, digest(d.token)],
    );
    if (
      !r ||
      r.revoked_at ||
      new Date(r.expires_at).getTime() <= Date.now() ||
      r.invoice_version !== b.version ||
      (d.bookingId && r.service_source_key !== serviceSourceKey) ||
      Number(r.amount_kobo) !== b.amountDueKobo ||
      b.voided ||
      b.notes.some((n) => n.state === "pending")
    )
      throw new AppError(
        409,
        "Payment request expired or changed. Ask finance for a new request.",
      );
    return {
      invoiceId: inv.id,
      invoiceNumber: inv.invoice_number,
      ...b,
      currency: "NGN",
      onlinePaymentsEnabled:
        !d.bookingId && (await paystackAvailability(tx, o.branch_id)).available,
      bookingId: d.bookingId ?? null,
      paymentMethod: d.bookingId
        ? "Existing verified service payment channels"
        : o.payment_method,
      message:
        "Review the current invoice balance and any separately disclosed processing charge. A screenshot or browser return does not verify payment.",
    };
  } else if (action === "invoice.request.revoke") {
    allow(user, ["owner", "finance"], o.branch_id);
    recentVerification(user);
    await tx.query(
      "UPDATE invoice_payment_requests SET revoked_at=now() WHERE invoice_id=$1 AND revoked_at IS NULL",
      [inv.id],
    );
    await audit(tx, user, action, inv.id);
  } else if (
    action !== "invoice.corrections" &&
    action !== "invoice.correction.decide"
  )
    throw new AppError(404, "Unknown invoice action.");
  return { ...b, invoiceNumber: inv.invoice_number };
}
