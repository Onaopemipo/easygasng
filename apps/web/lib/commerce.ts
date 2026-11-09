import { invoiceBalance } from "./invoice-corrections";
import { serviceRefundAllowance } from "./service-refunds";
import { reverseServiceRewards } from "./reward-services";
import {
  partialRefundInput,
  prepareRefund,
  refundFingerprint,
  applyAllocatedRefund,
  refundSourceLines,
} from "./reward-refunds";
import { reverseOrderRewards, restoreOrderDiscount } from "./rewards";
import { allocateCylinders, issueCylinders } from "./cylinder-allocation";
import { z } from "zod";
import { one, type SQL } from "./db";
import {
  id,
  digest,
  allow,
  AppError,
  recentVerification,
  type Actor,
} from "./auth";
import { audit, notify } from "./governance";
import { settingValue } from "./operations";
const uuid = z.string().uuid();
export { enqueueReward as awardRewards } from "./rewards";
export async function commerceAction(
  tx: SQL,
  action: string,
  user: Actor,
  input: unknown,
): Promise<any> {
  if (action === "credits") {
    const customer = ["customer", "commercial"].includes(user.role);
    if (!customer) allow(user, ["owner", "finance"]);
    return (
      await tx.query(
        `SELECT c.*,u.name AS customer_name,o.reference AS order_reference FROM credit_requests c JOIN users u ON u.id=c.customer_id LEFT JOIN orders o ON o.id=c.order_id WHERE ${customer ? "c.customer_id=$1" : user.role === "owner" ? "true" : "c.branch_id=$1"} ORDER BY c.created_at DESC LIMIT 100`,
        customer ? [user.id] : user.role === "owner" ? [] : [user.branch_id],
      )
    ).rows;
  }
  if (action === "credit.request") {
    const d = z
      .object({
        branchId: z.string().min(1).max(100).optional(),
        customerId: uuid,
        amountKobo: z.number().int().positive().max(100000000),
        receiptReference: z.string().trim().min(5).max(100),
        reason: z.string().trim().min(10).max(1000),
      })
      .strict()
      .parse(input);
    allow(user, ["owner", "finance"]);
    recentVerification(user);
    const customer = await one(
      tx,
      "SELECT id,branch_id FROM users WHERE id=$1 AND active=true AND role IN ('customer','commercial')",
      [d.customerId],
    );
    if (!customer) throw new AppError(404, "Active customer not found.");
    const branch = d.branchId ?? user.branch_id ?? "lagos";
    allow(user, ["owner", "finance"], branch);
    if (
      !(await one(tx, "SELECT id FROM branches WHERE id=$1 AND active=true", [
        branch,
      ]))
    )
      throw new AppError(400, "Choose an active branch.");
    const existing = await one(
      tx,
      "SELECT * FROM credit_requests WHERE receipt_reference=$1",
      [d.receiptReference],
    );
    if (existing) {
      if (
        existing.customer_id === d.customerId &&
        Number(existing.amount_kobo) === d.amountKobo &&
        existing.requested_by === user.id
      )
        return { id: existing.id };
      throw new AppError(409, "Receipt reference already used.");
    }
    const rid = id();
    await tx.query(
      "INSERT INTO credit_requests(id,customer_id,amount_kobo,kind,requested_by,reason,receipt_reference,branch_id) VALUES ($1,$2,$3,'cash_funding',$4,$5,$6,$7)",
      [
        rid,
        d.customerId,
        d.amountKobo,
        user.id,
        d.reason,
        d.receiptReference,
        branch,
      ],
    );
    await audit(tx, user, "credit.cash_requested", rid);
    return { id: rid };
  }
  if (action === "refund.lines") {
    const d = z.object({ orderId: uuid }).strict().parse(input);
    const o = await one(
      tx,
      "SELECT * FROM orders WHERE id=$1 AND customer_id=$2",
      [d.orderId, user.id],
    );
    if (!o) throw new AppError(404, "Order not found.");
    const source = await refundSourceLines(tx, o);
    const approved = (
      await tx.query(
        "SELECT refund_lines FROM credit_requests WHERE order_id=$1 AND kind='refund' AND status='approved' AND invoice_excess=false",
        [o.id],
      )
    ).rows;
    return source.lines.map((l) => ({
      ...l,
      remaining:
        Number(l.units) -
        approved.reduce(
          (n, p) =>
            n +
            (p.refund_lines?.lines ?? [])
              .filter((x: any) => x.source === l.source)
              .reduce((n: number, x: any) => n + Number(x.units), 0),
          0,
        ),
    }));
  }
  if (action === "refund.request") {
    const d = z
      .object({
        orderId: uuid,
        lines: partialRefundInput.optional(),
        idempotencyKey: uuid.optional(),
        reason: z.string().trim().min(10).max(1000),
        acceptWalletCredit: z.literal(true),
      })
      .strict()
      .parse(input);
    const o = await one(
      tx,
      "SELECT * FROM orders WHERE id=$1 AND customer_id=$2 FOR UPDATE",
      [d.orderId, user.id],
    );
    if (!o) throw new AppError(404, "Order not found.");
    if (o.payment_status !== "verified" || o.status !== "delivered")
      throw new AppError(
        409,
        "Only delivered orders with verified payments can be reviewed for a refund. Cancel an eligible pending order instead.",
      );
    const fingerprint = refundFingerprint(d.lines, d.reason);
    if (d.idempotencyKey) {
      const old = await one(
        tx,
        "SELECT id,refund_fingerprint FROM credit_requests WHERE customer_id=$1 AND refund_operation_key=$2",
        [user.id, d.idempotencyKey],
      );
      if (old) {
        if (old.refund_fingerprint !== fingerprint)
          throw new AppError(
            409,
            "Refund operation key conflicts with this request.",
          );
        return { id: old.id };
      }
    }
    const existing = await one(
      tx,
      "SELECT id FROM credit_requests WHERE order_id=$1 AND kind='refund' AND status='pending'",
      [o.id],
    );
    if (existing) {
      if (d.lines || d.idempotencyKey)
        throw new AppError(
          409,
          "Another refund is awaiting independent review.",
        );
      return { id: existing.id };
    }
    const allocation = await prepareRefund(tx, o, d.lines);
    const rid = id();
    await tx.query(
      "INSERT INTO credit_requests(id,customer_id,order_id,amount_kobo,kind,requested_by,reason,branch_id) VALUES ($1,$2,$3,$4,'refund',$2,$5,$6)",
      [rid, user.id, o.id, allocation.amountKobo, d.reason, o.branch_id],
    );
    await tx.query(
      "UPDATE credit_requests SET refund_lines=$1,refund_fingerprint=$2,refund_operation_key=$3 WHERE id=$4",
      [
        JSON.stringify(allocation.snapshot),
        fingerprint,
        d.idempotencyKey ?? null,
        rid,
      ],
    );
    await audit(tx, user, "refund.requested", rid);
    return { id: rid };
  }
  if (action === "credit.decide") {
    const d = z
      .object({
        id: uuid,
        decision: z.enum(["approved", "rejected"]),
        reason: z.string().trim().min(10).max(1000),
      })
      .strict()
      .parse(input);
    const c = await one(
      tx,
      "SELECT * FROM credit_requests WHERE id=$1 FOR UPDATE",
      [d.id],
    );
    if (!c) throw new AppError(404, "Credit request not found.");
    allow(user, ["owner", "finance"]);
    recentVerification(user);
    if (c.requested_by === user.id)
      throw new AppError(
        403,
        "A different finance approver must verify the credit.",
      );
    const o = c.order_id
      ? await one(tx, "SELECT * FROM orders WHERE id=$1 FOR UPDATE", [
          c.order_id,
        ])
      : null;
    const cu = await one(
      tx,
      "SELECT branch_id FROM users WHERE id=$1 FOR UPDATE",
      [c.customer_id],
    );
    if (user.role !== "owner" && c.branch_id !== user.branch_id)
      throw new AppError(403, "Credit belongs to another branch.");
    if (c.status !== "pending") {
      if (c.status === d.decision) return { ok: true };
      throw new AppError(409, "Credit request has already been decided.");
    }
    if (c.invoice_excess && d.decision === "approved") {
      const invoice =
        o &&
        (await one(tx, "SELECT * FROM customer_invoices WHERE order_id=$1", [
          o.id,
        ]));
      const bal = invoice && (await invoiceBalance(tx, invoice)),
        snapshot = c.invoice_excess_snapshot;
      if (
        !o ||
        o.customer_id !== c.customer_id ||
        !bal ||
        bal.voided ||
        bal.notes.some((n) => n.state === "pending") ||
        snapshot?.invoiceId !== invoice!.id ||
        snapshot.invoiceVersion !== bal.version ||
        snapshot.totalKobo !== bal.totalKobo ||
        snapshot.paidKobo !== bal.paidKobo ||
        Number(c.amount_kobo) !== bal.overpaidKobo ||
        bal.overpaidKobo <= 0 ||
        (await one(
          tx,
          "SELECT amendment_id FROM doorstep_execution WHERE order_id=$1 AND state='reserved' UNION ALL SELECT amendment_id FROM doorstep_product_execution WHERE order_id=$1 AND state='reserved'",
          [o.id],
        ))
      )
        throw new AppError(
          409,
          "Invoice or fulfilment changed; obtain a fresh excess-collection review.",
        );
    }
    if (c.booking_id) {
      const service = await one(
        tx,
        "SELECT id,customer_id,status FROM service_bookings WHERE id=$1 FOR UPDATE",
        [c.booking_id],
      );
      const paid = Number(
        (await one(
          tx,
          "SELECT COALESCE(sum(amount_kobo),0) AS n FROM verified_payments WHERE booking_id=$1",
          [c.booking_id],
        ))!.n,
      );
      if (
        !service ||
        service.customer_id !== c.customer_id ||
        !["cancelled", "failed", "completed"].includes(service.status) ||
        Number(c.amount_kobo) > paid ||
        (d.decision === "approved" &&
          service &&
          Number(c.amount_kobo) >
            (await serviceRefundAllowance(
              tx,
              {
                id: service.id,
                status: service.status,
              },
              c.service_refund_scope,
            )))
      )
        throw new AppError(409, "The service is not eligible for this refund.");
    }
    if (
      d.decision === "approved" &&
      c.kind === "refund" &&
      (await one(
        tx,
        "SELECT id FROM verified_payments WHERE method='paystack_test' AND (order_id=$1 OR booking_id=$2) LIMIT 1",
        [c.order_id ?? null, c.booking_id ?? null],
      ))
    )
      throw new AppError(
        409,
        "Provider-funded refunds require the dedicated provider refund workflow; no purchase credit was created.",
      );
    if (d.decision === "approved") {
      if (o && o.payment_status !== "verified")
        throw new AppError(
          409,
          "The order is no longer eligible for a refund.",
        );
      const max = Number(
        (await settingValue(tx, "wallet.maximum", c.branch_id)) ?? 100000000,
      );
      if (
        ["cash_funding", "bank_transfer"].includes(c.kind) &&
        Number(c.amount_kobo) > max
      )
        throw new AppError(
          409,
          "The credit exceeds the configured funding limit.",
        );
      if (c.kind === "bank_transfer") {
        if (!(await settingValue(tx, "wallet.enabled", c.branch_id)))
          throw new AppError(409, "Wallet funding is disabled.");
        const balance = Number(
          (await one(
            tx,
            "SELECT COALESCE(sum(amount_kobo),0) n FROM wallet_entries WHERE customer_id=$1",
            [c.customer_id],
          ))!.n,
        );
        if (balance + Number(c.amount_kobo) > max)
          throw new AppError(
            409,
            "Credit would exceed the approved wallet balance limit.",
          );
      }
      if (Number(c.amount_kobo) > 0)
        await tx.query(
          "INSERT INTO wallet_entries(id,customer_id,amount_kobo,kind,reference) VALUES ($1,$2,$3,$4,$5)",
          [id(), c.customer_id, c.amount_kobo, c.kind, `credit:${c.id}`],
        );
      if (c.booking_id && c.service_refund_scope !== "excess")
        await reverseServiceRewards(tx, c.booking_id, c.id);
      if (o && !c.invoice_excess) {
        const allocated = await applyAllocatedRefund(tx, o, c);
        if (!allocated) {
          await reverseOrderRewards(tx, o.id);
          await restoreOrderDiscount(tx, o.id);
        }
        const previous = Number(
          (await one(
            tx,
            "SELECT COALESCE(sum(amount_kobo),0) n FROM credit_requests WHERE order_id=$1 AND kind='refund' AND status='approved' AND invoice_excess=false",
            [o.id],
          ))!.n,
        );
        if (previous + Number(c.amount_kobo) >= Number(o.total_kobo))
          await tx.query(
            "UPDATE orders SET payment_status='refunded' WHERE id=$1",
            [o.id],
          );
      }
      await notify(
        tx,
        c.customer_id,
        c.kind === "refund" ? "Refund credited" : "Purchase credit verified",
        Number(c.amount_kobo) > 0
          ? `${Number(c.amount_kobo) / 100} NGN has been credited to your purchase wallet.`
          : "Reward points were restored; no monetary wallet credit was created.",
        c.id,
      );
    }
    await tx.query(
      "UPDATE credit_requests SET status=$1,decided_by=$2,decided_at=now() WHERE id=$3",
      [d.decision, user.id, c.id],
    );
    await audit(tx, user, `credit.${d.decision}`, c.id, "success", {
      reason: d.reason,
    });
    return { ok: true };
  }
  if (action === "pos") {
    allow(user, ["owner", "manager", "sales", "finance"]);
    return {
      products: (
        await tx.query(
          "SELECT p.*,i.price_kobo,i.published,i.quantity-i.reserved AS available FROM products p JOIN inventory i ON i.product_id=p.id WHERE i.branch_id=$1 AND p.category<>'Gas refills' ORDER BY p.name",
          [user.branch_id ?? "lagos"],
        )
      ).rows,
      shifts: (
        await tx.query(
          `SELECT s.*,u.name AS cashier FROM pos_shifts s JOIN users u ON u.id=s.cashier_id WHERE ${user.role === "owner" ? "true" : user.role === "sales" ? "s.cashier_id=$1" : "s.branch_id=$1"} ORDER BY s.created_at DESC LIMIT 100`,
          user.role === "owner"
            ? []
            : [user.role === "sales" ? user.id : user.branch_id],
        )
      ).rows,
      sales: (
        await tx.query(
          `SELECT s.*,sh.branch_id,sh.cashier_id FROM pos_sales s JOIN pos_shifts sh ON sh.id=s.shift_id WHERE ${user.role === "owner" ? "true" : user.role === "sales" ? "sh.cashier_id=$1" : "sh.branch_id=$1"} ORDER BY s.created_at DESC LIMIT 100`,
          user.role === "owner"
            ? []
            : [user.role === "sales" ? user.id : user.branch_id],
        )
      ).rows,
    };
  }
  if (action === "pos.open") {
    const d = z
      .object({
        branchId: z.string().max(100),
        openingKobo: z.number().int().min(0).max(100000000),
      })
      .strict()
      .parse(input);
    allow(user, ["owner", "manager", "sales"], d.branchId);
    if (
      await one(
        tx,
        "SELECT id FROM pos_shifts WHERE cashier_id=$1 AND status='open'",
        [user.id],
      )
    )
      throw new AppError(409, "Close your current shift first.");
    const sid = id();
    await tx.query(
      "INSERT INTO pos_shifts(id,branch_id,cashier_id,opening_kobo) VALUES ($1,$2,$3,$4)",
      [sid, d.branchId, user.id, d.openingKobo],
    );
    await audit(tx, user, "pos.shift_opened", sid);
    return { id: sid };
  }
  if (action === "pos.sale") {
    const d = z
      .object({
        shiftId: uuid,
        items: z
          .array(
            z
              .object({
                productId: z.string().max(100),
                quantity: z.number().int().min(1).max(100),
              })
              .strict(),
          )
          .min(1)
          .max(30),
        tenderedKobo: z.number().int().positive().max(1000000000),
        idempotencyKey: uuid,
      })
      .strict()
      .parse(input);
    const shift = await one(
      tx,
      "SELECT * FROM pos_shifts WHERE id=$1 FOR UPDATE",
      [d.shiftId],
    );
    if (!shift) throw new AppError(404, "Shift not found.");
    allow(user, ["owner", "manager", "sales"], shift.branch_id);
    if (shift.cashier_id !== user.id)
      throw new AppError(403, "Only the shift cashier can record its sales.");
    const hash = digest(JSON.stringify(d));
    const prior = await one(
      tx,
      "SELECT * FROM pos_sales WHERE shift_id=$1 AND idempotency_key=$2",
      [shift.id, d.idempotencyKey],
    );
    if (prior) {
      if (prior.request_hash !== hash)
        throw new AppError(
          409,
          "Sale key already used for a different receipt.",
        );
      return prior;
    }
    await tx.query("SELECT id FROM branches WHERE id=$1 FOR UPDATE", [
      shift.branch_id,
    ]);
    if (shift.status !== "open")
      throw new AppError(409, "This shift is closed.");
    if (new Set(d.items.map((i) => i.productId)).size !== d.items.length)
      throw new AppError(400, "Combine duplicate product lines.");
    let total = 0;
    const items = [];
    for (const item of [...d.items].sort((a, b) =>
      a.productId.localeCompare(b.productId),
    )) {
      const p = await one(
        tx,
        "SELECT p.name,p.archived,p.category,i.* FROM inventory i JOIN products p ON p.id=i.product_id WHERE i.branch_id=$1 AND i.product_id=$2 FOR UPDATE OF i",
        [shift.branch_id, item.productId],
      );
      if (
        p?.archived ||
        !p?.published ||
        !p.price_kobo ||
        p.quantity - p.reserved < item.quantity
      )
        throw new AppError(
          409,
          "A product is unavailable, unpriced or has insufficient stock.",
        );
      if (p.category === "Gas refills")
        throw new AppError(
          409,
          "Gas refills require a delivery order and verified cylinder filling checks. Use gas ordering.",
        );
      total += Number(p.price_kobo) * item.quantity;
      items.push({ ...item, name: p.name, price: Number(p.price_kobo) });
    }
    if (d.tenderedKobo < total)
      throw new AppError(400, "Cash tendered must cover the sale total.");
    const sale = id(),
      reference = `POS-${sale.slice(0, 8).toUpperCase()}`;
    await tx.query(
      "INSERT INTO pos_sales(id,shift_id,reference,idempotency_key,request_hash,total_kobo,tendered_kobo) VALUES ($1,$2,$3,$4,$5,$6,$7)",
      [
        sale,
        shift.id,
        reference,
        d.idempotencyKey,
        hash,
        total,
        d.tenderedKobo,
      ],
    );
    for (const item of items) {
      await tx.query(
        "INSERT INTO pos_items(sale_id,product_id,name,quantity,unit_price_kobo) VALUES ($1,$2,$3,$4,$5)",
        [sale, item.productId, item.name, item.quantity, item.price],
      );
      await tx.query(
        "UPDATE inventory SET quantity=quantity-$1 WHERE branch_id=$2 AND product_id=$3",
        [item.quantity, shift.branch_id, item.productId],
      );
      await tx.query(
        "INSERT INTO stock_movements(id,branch_id,product_id,quantity,kind,reason,actor_id,reference) VALUES ($1,$2,$3,$4,'pos_sale',$5,$6,$7)",
        [
          id(),
          shift.branch_id,
          item.productId,
          -item.quantity,
          reference,
          user.id,
          `${sale}:${item.productId}`,
        ],
      );
    }
    await audit(tx, user, "pos.sale_recorded", sale);
    await allocateCylinders(tx, user, shift.branch_id, items, { saleId: sale });
    await issueCylinders(tx, user, { saleId: sale }, null);
    return {
      id: sale,
      reference,
      total_kobo: total,
      change_kobo: d.tenderedKobo - total,
    };
  }
  if (action === "pos.close") {
    const d = z
      .object({
        shiftId: uuid,
        countedKobo: z.number().int().min(0).max(1000000000),
        note: z.string().min(5).max(1000),
      })
      .strict()
      .parse(input);
    const s = await one(tx, "SELECT * FROM pos_shifts WHERE id=$1 FOR UPDATE", [
      d.shiftId,
    ]);
    if (!s || s.cashier_id !== user.id)
      throw new AppError(404, "Your shift was not found.");
    if (s.status !== "open")
      throw new AppError(409, "This shift was already submitted.");
    const total = Number(
        (await one(
          tx,
          "SELECT COALESCE(sum(total_kobo),0) AS n FROM pos_sales WHERE shift_id=$1",
          [s.id],
        ))!.n,
      ),
      expected = Number(s.opening_kobo) + total;
    await tx.query(
      "UPDATE pos_shifts SET counted_kobo=$1,expected_kobo=$2,note=$3,status='submitted',closed_at=now() WHERE id=$4",
      [d.countedKobo, expected, d.note, s.id],
    );
    await audit(tx, user, "pos.shift_submitted", s.id, "success", {
      varianceKobo: d.countedKobo - expected,
    });
    return {
      ok: true,
      expectedKobo: expected,
      varianceKobo: d.countedKobo - expected,
    };
  }
  if (action === "pos.verify") {
    const d = z.object({ shiftId: uuid }).strict().parse(input);
    const s = await one(tx, "SELECT * FROM pos_shifts WHERE id=$1 FOR UPDATE", [
      d.shiftId,
    ]);
    if (!s) throw new AppError(404, "Shift not found.");
    allow(user, ["owner", "finance"], s.branch_id);
    recentVerification(user);
    if (s.cashier_id === user.id)
      throw new AppError(
        403,
        "A different finance approver must verify this shift.",
      );
    if (s.status === "verified") return { ok: true };
    if (s.status !== "submitted")
      throw new AppError(409, "Submit the shift first.");
    if (Number(s.counted_kobo) !== Number(s.expected_kobo))
      throw new AppError(
        409,
        "Resolve the cash variance through a documented finance investigation before verification.",
      );
    await tx.query(
      "UPDATE pos_shifts SET status='verified',verified_by=$1 WHERE id=$2",
      [user.id, s.id],
    );
    await audit(tx, user, "pos.shift_verified", s.id);
    return { ok: true };
  }
  return undefined;
}
