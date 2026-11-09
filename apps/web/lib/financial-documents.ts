import { z } from "zod";
import { allow, AppError, type Actor } from "./auth";
import { type SQL, one } from "./db";
import { invoiceAction } from "./invoices";
import { serviceInvoiceAction } from "./service-invoices";
import { paymentReceipt } from "./payments/documents";
import { financialDocument } from "../../../packages/business-rules/src/financial-document";
import { audit } from "./governance";
export async function financialDocuments(tx: SQL, user: Actor, input: unknown) {
  allow(user, ["customer", "commercial", "owner", "finance"]);
  const d = z
    .object({
      search: z.string().trim().max(100).default(""),
      type: z.enum(["all", "invoice", "receipt"]).default("all"),
      status: z
        .enum([
          "all",
          "Unpaid invoice",
          "Partially paid invoice",
          "Paid invoice",
          "Voided invoice",
          "Reconciliation required",
          "Payment Verified",
        ])
        .default("all"),
      branchId: z.string().min(1).max(100).optional(),
      from: z.iso.date().optional(),
      to: z.iso.date().optional(),
      page: z.coerce.number().int().positive().max(100000).default(1),
    })
    .strict()
    .parse(input);
  if (d.from && d.to && d.from > d.to)
    throw new AppError(400, "Choose an ordered date range.");
  const customer = ["customer", "commercial"].includes(user.role);
  if (
    d.branchId &&
    (customer || user.role !== "owner") &&
    d.branchId !== user.branch_id
  )
    throw new AppError(403, "Documents belong to your authorised scope.");
  const branch = customer
    ? null
    : user.role === "owner"
      ? (d.branchId ?? null)
      : user.branch_id;
  if (!customer && user.role !== "owner" && !branch)
    throw new AppError(403, "A finance branch is required.");
  const sql = `WITH documents AS (
 SELECT i.id,'invoice'::text AS type,i.order_id,i.booking_id,NULL::text AS intent_id,i.invoice_number AS number,i.issued_at AS issued_at,i.customer_id,i.branch_id,COALESCE(o.reference,b.reference,'') AS reference,COALESCE(i.snapshot->'customer'->>'name','') AS customer_name
 FROM customer_invoices i LEFT JOIN orders o ON o.id=i.order_id LEFT JOIN service_bookings b ON b.id=i.booking_id
 UNION ALL
 SELECT p.id,'receipt',NULL,NULL,i.id,'TEST-'||p.id,p.created_at,i.customer_id,i.branch_id,p.provider_reference,COALESCE(i.quote->'documentSnapshot'->'customer'->>'name',u.name,'') FROM payment_postings p JOIN payment_intents i ON i.id=p.intent_id JOIN users u ON u.id=i.customer_id
 ) SELECT * FROM documents WHERE ($1::text IS NULL OR customer_id=$1) AND ($2::text IS NULL OR branch_id=$2) AND ($3='all' OR type=$3) AND ($4='' OR position(lower($4) IN lower(number||' '||reference||' '||customer_name))>0) AND ($5::date IS NULL OR (issued_at AT TIME ZONE 'Africa/Lagos')::date >= $5::date) AND ($6::date IS NULL OR (issued_at AT TIME ZONE 'Africa/Lagos')::date <= $6::date)`;
  const args = [
    customer ? user.id : null,
    branch,
    d.type,
    d.search,
    d.from ?? null,
    d.to ?? null,
  ];
  const count = Number(
    (await one(tx, `SELECT count(*) n FROM (${sql}) q`, args))!.n,
  );
  // Status comes from the canonical source adapters, not a duplicate SQL money/state engine.
  // Fail explicitly when that read budget is exceeded; never filter only a page and fake counts.
  if (d.status !== "all" && count > 100)
    throw new AppError(
      409,
      "Narrow the date, branch or search range to100 or fewer documents before filtering by status.",
    );
  const selected = (
    await tx.query(
      sql +
        ` ORDER BY issued_at DESC,id DESC LIMIT ${d.status === "all" ? 20 : 100} OFFSET $7`,
      [...args, d.status === "all" ? (d.page - 1) * 20 : 0],
    )
  ).rows;
  const rows = [];
  for (const r of selected) {
    const invoice =
      r.type === "receipt"
        ? await paymentReceipt(tx, user, r.intent_id)
        : r.booking_id
          ? (
              await serviceInvoiceAction(tx, user, "invoice.service", {
                bookingId: r.booking_id,
              })
            ).invoice
          : (
              await invoiceAction(tx, user, "invoice.order", {
                orderId: r.order_id,
              })
            ).invoice;
    if (!invoice) continue;
    const model = financialDocument(invoice);
    rows.push({
      id: r.id,
      type: r.type,
      number: r.number,
      model,
      downloadUrl:
        r.type === "receipt"
          ? `/api/payments/paystack/receipt?format=pdf&intentId=${r.intent_id}`
          : `/api/invoices/${r.booking_id ?? r.order_id}${r.booking_id ? "?source=service" : ""}`,
    });
  }
  await audit(tx, user, "documents.list_viewed", user.id, "success", {
    branch,
    type: d.type,
    page: d.page,
  });
  const filtered =
    d.status === "all" ? rows : rows.filter((r) => r.model.status === d.status);
  return {
    rows:
      d.status === "all"
        ? filtered
        : filtered.slice((d.page - 1) * 20, d.page * 20),
    total: d.status === "all" ? count : filtered.length,
    page: d.page,
    pageSize: 20,
    branches: customer
      ? []
      : (
          await tx.query(
            "SELECT id,name FROM branches WHERE ($1::text IS NULL OR id=$1) ORDER BY name",
            [user.role === "owner" ? null : user.branch_id],
          )
        ).rows,
  };
}
