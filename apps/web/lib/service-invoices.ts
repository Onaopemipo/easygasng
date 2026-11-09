import {
  documentIdentity,
  newDocumentTemplateVersion,
} from "./document-identity";
import { serviceDocument } from "../../../packages/business-rules/src/service-document";
import { serviceInvoiceSource } from "./service-invoice-source";
import { z } from "zod";
import { allow, AppError, id, recentVerification, type Actor } from "./auth";
import { one, type SQL } from "./db";
import { audit } from "./governance";
import { invoiceBalance } from "./invoice-corrections";

// Same invoice numbering, immutable snapshots, corrections and verified ledger as orders.
export async function serviceInvoiceAction(
  tx: SQL,
  user: Actor,
  action: string,
  input: unknown,
) {
  const saving = action === "invoice.service.draft.save";
  const issueInput = action === "invoice.service.issue";
  const parsed: any = saving
    ? z
        .object({
          bookingId: z.string().uuid(),
          expectedRevision: z.coerce.number().int().min(0),
          dueDate: z.iso.date(),
          customerNote: z.string().trim().max(2000).default(""),
          reason: z.string().trim().min(10).max(1000),
        })
        .strict()
        .parse(input)
    : issueInput
      ? z
          .object({
            bookingId: z.string().uuid(),
            expectedDraftRevision: z.number().int().positive().optional(),
          })
          .strict()
          .parse(input)
      : z.object({ bookingId: z.string().uuid() }).strict().parse(input);
  const { bookingId } = parsed;
  const b = await one(
    tx,
    "SELECT * FROM service_bookings WHERE id=$1 FOR UPDATE",
    [bookingId],
  );
  if (!b) throw new AppError(404, "Service booking not found.");
  const customer = ["customer", "commercial"].includes(user.role);
  if (customer) {
    if (b.customer_id !== user.id)
      throw new AppError(404, "Service booking not found.");
  } else
    allow(
      user,
      ["owner", "finance", "service_manager", "manager"],
      b.branch_id,
    );
  let invoice = await one(
    tx,
    "SELECT * FROM customer_invoices WHERE booking_id=$1",
    [b.id],
  );
  const slot = await one(
    tx,
    "SELECT starts_at FROM service_slots WHERE id=$1",
    [b.slot_id],
  );
  const source = await serviceInvoiceSource(tx, b);
  const report = source?.report;
  // Internal draft notes/history are visible only to invoice-authorised finance staff.
  const canDraft = ["owner", "finance"].includes(user.role);
  const saved =
    canDraft || issueInput
      ? await one(
          tx,
          "SELECT *,due_date::text AS due_date FROM service_invoice_drafts WHERE booking_id=$1 ORDER BY revision DESC LIMIT 1",
          [b.id],
        )
      : null;
  if (saving) {
    allow(user, ["owner", "finance"], b.branch_id);
    recentVerification(user);
    if (invoice)
      throw new AppError(
        409,
        "Issued invoices cannot be edited. Use independently approved corrections.",
      );
    if (
      !source ||
      !Number.isSafeInteger(source.totalKobo) ||
      source.totalKobo <= 0
    )
      throw new AppError(
        409,
        "Current approved service scope is required before saving a draft.",
      );
    const d = parsed as {
      expectedRevision: number;
      dueDate: string;
      customerNote: string;
      reason: string;
    };
    if (Number(saved?.revision ?? 0) !== d.expectedRevision)
      throw new AppError(
        409,
        "Draft changed. Reload the current revision before saving.",
      );
    const revision = d.expectedRevision + 1;
    const row = await one(
      tx,
      "INSERT INTO service_invoice_drafts(id,booking_id,revision,source_key,source_total_kobo,due_date,customer_note,reason,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *,due_date::text AS due_date",
      [
        id(),
        b.id,
        revision,
        source.key,
        source.totalKobo,
        d.dueDate,
        d.customerNote,
        d.reason,
        user.id,
      ],
    );
    await audit(tx, user, action, b.id, "success", {
      revision,
      sourceKey: source.key,
      reason: d.reason,
    });
    return { draft: true, collectible: false, savedRevision: row };
  }

  if (action === "invoice.service.draft") {
    return {
      draft: true,
      ...(canDraft
        ? {
            savedRevision: saved,
            stale: Boolean(
              saved &&
                (!source ||
                  saved.source_key !== source.key ||
                  Number(saved.source_total_kobo) !== source.totalKobo),
            ),
            revisions: (
              await tx.query(
                "SELECT revision,source_key,source_total_kobo,due_date::text AS due_date,customer_note,reason,created_by,created_at FROM service_invoice_drafts WHERE booking_id=$1 ORDER BY revision DESC LIMIT 100",
                [b.id],
              )
            ).rows,
          }
        : {}),
      bookingId: b.id,
      reference: b.reference,
      quoteId: source?.quote?.id ?? null,
      reportId: report?.id ?? null,
      totalKobo: source?.totalKobo ?? null,
      currency: "NGN",
      collectible: false,
      final: source?.final ?? false,
      reason:
        "Preview only. Existing quotation approvals and verified-payment conditions remain required before work.",
    };
  }
  if (action === "invoice.service.issue") {
    allow(user, ["owner", "finance"], b.branch_id);
    recentVerification(user);
    if (!invoice) {
      if (!source)
        throw new AppError(
          409,
          "Current approved service scope or successful documented work is required before invoice issue.",
        );
      if (
        saved &&
        ((parsed as { expectedDraftRevision?: number })
          .expectedDraftRevision !== Number(saved.revision) ||
          saved.source_key !== source.key ||
          Number(saved.source_total_kobo) !== source.totalKobo)
      )
        throw new AppError(
          409,
          "Review and save the current approved scope, then issue its exact draft revision.",
        );
      const total = source.totalKobo;
      if (!Number.isSafeInteger(total) || total <= 0)
        throw new AppError(
          409,
          "Service total requires finance reconciliation.",
        );
      const business = await documentIdentity(tx, b.branch_id);
      if (!business.address || !business.phone)
        throw new AppError(
          409,
          "Approved business contact and address must be configured before issuing an invoice.",
        );
      const customerRow = await one(
        tx,
        "SELECT name,public_customer_id FROM users WHERE id=$1",
        [b.customer_id],
      );
      const snapshot = {
        business,
        documentTemplateVersion: newDocumentTemplateVersion(),
        customer: customerRow,
        address: b.address,
        orderReference: b.reference,
        serviceReference: b.reference,
        reportId: report?.id ?? null,
        report: report?.body ? serviceDocument(report.body) : null,
        quoteId: source.quote?.id ?? null,
        quote: source.quote ?? null,
        finalAtIssue: source.final,
        products: [
          {
            name:
              b.snapshot.name +
              (source.key.startsWith("settlement:")
                ? " — independently reviewed exception settlement; service not certified complete"
                : source.final
                  ? " — completed service and reconciled materials"
                  : " — authorised scope, subject to final reconciliation"),
            quantity: 1,
            unit_price_kobo: total,
          },
        ],
        gas: [],
        subtotalKobo: total,
        deliveryKobo: 0,
        discountKobo: 0,
        totalKobo: total,
        taxKobo: 0,
        taxNote:
          "Includes recorded service labour, callout and materials. No additional delivery charge or tax has been added.",
        dueDate: saved
          ? String(saved.due_date).slice(0, 10)
          : new Date(slot!.starts_at).toLocaleDateString("en-CA", {
              timeZone: "Africa/Lagos",
            }),
        paymentMethod: "Verified service ledger",
        draftRevision: saved ? Number(saved.revision) : null,
        customerNote: saved?.customer_note ?? "",
      };
      invoice = await one(
        tx,
        "INSERT INTO customer_invoices(id,booking_id,customer_id,branch_id,total_kobo,snapshot,issued_by) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *",
        [
          id(),
          b.id,
          b.customer_id,
          b.branch_id,
          total,
          JSON.stringify(snapshot),
          user.id,
        ],
      );
      await audit(tx, user, action, invoice!.id);
    }
  } else if (action !== "invoice.service")
    throw new AppError(404, "Unknown service invoice operation.");
  if (!invoice) return { invoice: null };
  const bal = await invoiceBalance(tx, invoice);
  const pending = bal.notes.some((n) => n.state === "pending");
  const refundReview = await one(
    tx,
    "SELECT id FROM credit_requests WHERE booking_id=$1 AND status='approved' AND kind='refund' AND service_refund_scope='service' LIMIT 1",
    [b.id],
  );
  const financialReviewReconciled =
    Boolean(refundReview) &&
    bal.totalKobo === 0 &&
    bal.paidKobo === 0 &&
    !pending;
  const adjustmentRequired = refundReview
    ? !financialReviewReconciled
    : !source || bal.totalKobo !== source.totalKobo;
  return {
    invoice: {
      ...invoice,
      snapshot: {
        ...invoice.snapshot,
        report: serviceDocument(invoice.snapshot?.report),
      },
      id: invoice.id,
      invoice_number: invoice.invoice_number,
      notePdfAvailable: process.env.EASYGAS_DOCUMENT_TEMPLATE_V2 === "true",
      effectiveTotalKobo: bal.totalKobo,
      correctionVersion: bal.version,
      notes: bal.notes,
      paidKobo: bal.paidKobo,
      overpaidKobo: bal.overpaidKobo,
      amountDueKobo: bal.voided
        ? 0
        : adjustmentRequired || pending
          ? null
          : bal.amountDueKobo,
      status: bal.voided
        ? "voided"
        : adjustmentRequired || pending
          ? "adjustment_required"
          : financialReviewReconciled
            ? "refunded"
            : bal.overpaidKobo > 0
              ? "credit_balance"
              : bal.amountDueKobo === 0
                ? "paid"
                : bal.paidKobo > 0
                  ? "partially_paid"
                  : "issued",
      overdue: false,
      financialReviewReconciled,
      finalReconciled: Boolean(
        source?.final &&
          bal.totalKobo === source.totalKobo &&
          !pending &&
          !adjustmentRequired,
      ),
      reconciliationKobo: refundReview
        ? -bal.totalKobo
        : source
          ? source.totalKobo - bal.totalKobo
          : null,
    },
    paymentRequests: {
      enabled: false,
      reason: "Service online invoice payment activation remains disabled.",
    },
  };
}
