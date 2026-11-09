import {
  documentIdentity,
  newDocumentTemplateVersion,
} from "./document-identity";
import { invoiceBalance } from "./invoice-corrections";
import { z } from "zod";
import { allow, AppError, id, recentVerification, type Actor } from "./auth";
import { one, type SQL } from "./db";
import { audit } from "./governance";
export async function invoiceAction(
  tx: SQL,
  user: Actor,
  action: string,
  input: unknown,
) {
  const d = z.object({ orderId: z.string().uuid() }).strict().parse(input);
  const order = await one(tx, "SELECT * FROM orders WHERE id=$1 FOR UPDATE", [
    d.orderId,
  ]);
  if (!order) throw new AppError(404, "Order not found.");
  const customer = ["customer", "commercial"].includes(user.role);
  if (customer) {
    if (order.customer_id !== user.id)
      throw new AppError(404, "Order not found.");
  } else allow(user, ["owner", "finance", "manager"], order.branch_id);
  let invoice = await one(
    tx,
    "SELECT * FROM customer_invoices WHERE order_id=$1",
    [order.id],
  );
  if (action === "invoice.issue") {
    allow(user, ["owner", "finance"], order.branch_id);
    recentVerification(user);
    if (order.status === "cancelled")
      throw new AppError(409, "A cancelled order cannot be newly invoiced.");
    if (!invoice) {
      const business = await documentIdentity(tx, order.branch_id);
      if (!business.address || !business.phone)
        throw new AppError(
          409,
          "Approved business contact and address must be configured before issuing an invoice.",
        );
      const customerRow = await one(
        tx,
        "SELECT name,public_customer_id FROM users WHERE id=$1",
        [order.customer_id],
      );
      const products = (
        await tx.query(
          "SELECT name,quantity,unit_price_kobo FROM order_items WHERE order_id=$1 ORDER BY product_id",
          [order.id],
        )
      ).rows;
      const gas = (
        await tx.query(
          "SELECT capacity_grams,grams,unit_price_kobo,subtotal_kobo,pricing_version FROM order_gas_lines WHERE order_id=$1 ORDER BY id",
          [order.id],
        )
      ).rows;
      const snapshot = {
        business,
        documentTemplateVersion: newDocumentTemplateVersion(),
        customer: customerRow,
        address: order.address,
        orderReference: order.reference,
        products,
        gas,
        subtotalKobo: Number(order.subtotal_kobo),
        deliveryKobo: Number(order.delivery_kobo),
        discountKobo: Number(order.reward_discount_kobo ?? 0),
        totalKobo: Number(order.total_kobo),
        taxKobo: 0,
        taxNote:
          "No additional tax charged; existing authoritative order amount retained.",
        dueDate: order.delivery_date,
        paymentMethod: order.payment_method,
      };
      if (
        snapshot.subtotalKobo +
          snapshot.deliveryKobo -
          snapshot.discountKobo !==
        snapshot.totalKobo
      )
        throw new AppError(
          409,
          "Order totals need finance reconciliation before invoice issue.",
        );
      invoice = await one(
        tx,
        "INSERT INTO customer_invoices(id,order_id,customer_id,branch_id,total_kobo,snapshot,issued_by) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *",
        [
          id(),
          order.id,
          order.customer_id,
          order.branch_id,
          order.total_kobo,
          JSON.stringify(snapshot),
          user.id,
        ],
      );
      await audit(tx, user, action, invoice!.id);
    }
  } else if (action !== "invoice.order")
    throw new AppError(404, "Unknown invoice operation.");
  if (!invoice)
    return {
      invoice: null,
      paymentRequests: {
        enabled: false,
        reason: "Online payment provider is unconnected.",
      },
    };
  const verified = Number(
    (await one(
      tx,
      "SELECT COALESCE(sum(amount_kobo),0) AS n FROM verified_payments WHERE order_id=$1",
      [order.id],
    ))!.n,
  );
  const refunded = Number(
    (await one(
      tx,
      "SELECT COALESCE(sum(amount_kobo),0) AS n FROM credit_requests WHERE order_id=$1 AND status='approved' AND kind='refund'",
      [order.id],
    ))!.n,
  );
  const paid = Math.max(0, verified - refunded),
    due = Math.max(0, Number(invoice.total_kobo) - paid),
    adjustmentRequired = order.status === "cancelled" || refunded > 0;
  const corrected = await invoiceBalance(tx, invoice);
  const hasNotes = corrected.notes.some((n) => n.state === "approved");
  return {
    invoice: {
      ...invoice,
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      notePdfAvailable: process.env.EASYGAS_DOCUMENT_TEMPLATE_V2 === "true",
      effectiveTotalKobo: corrected.totalKobo,
      overpaidKobo: corrected.overpaidKobo,
      correctionVersion: corrected.version,
      notes: corrected.notes,
      paidKobo: paid,
      amountDueKobo: corrected.voided
        ? 0
        : hasNotes
          ? corrected.amountDueKobo
          : adjustmentRequired
            ? null
            : due,
      status: corrected.voided
        ? "voided"
        : hasNotes
          ? corrected.overpaidKobo > 0
            ? "credit_balance"
            : corrected.amountDueKobo === 0 && corrected.paidKobo > 0
              ? "paid"
              : corrected.paidKobo > 0
                ? "partially_paid"
                : "adjusted"
          : adjustmentRequired
            ? "adjustment_required"
            : paid === 0
              ? "issued"
              : due === 0
                ? "paid"
                : "partially_paid",
      overdue:
        !adjustmentRequired &&
        due > 0 &&
        String(invoice.snapshot.dueDate) <
          new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" }),
    },
    paymentRequests: {
      enabled: false,
      reason:
        "Online payment provider is unconnected. No payment link or receipt is fabricated.",
    },
  };
}
