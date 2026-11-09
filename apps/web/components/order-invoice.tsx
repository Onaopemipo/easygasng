"use client";
import { FinancialDocumentPreview } from "./financial-document";
import { ActionForm } from "./workflows";
import { HostedPayment } from "./hosted-payment";
import { InvoiceCorrections } from "./order-operations";
import { useState } from "react";
import { api, Modal, Notice, money } from "./ui";
export default function OrderInvoice({
  orderId,
  bookingId,
  canIssue = false,
}: {
  orderId?: string;
  bookingId?: string;
  canIssue?: boolean;
}) {
  const [open, setOpen] = useState(false),
    [invoice, setInvoice] = useState<any>(null),
    [draft, setDraft] = useState<any>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function load(issue = false) {
    setOpen(true);
    setBusy(true);
    setError("");
    try {
      const r = await api(
        bookingId
          ? issue
            ? "invoice.service.issue"
            : "invoice.service"
          : issue
            ? "invoice.issue"
            : "invoice.order",
        {
          [bookingId ? "bookingId" : "orderId"]: bookingId ?? orderId,
          ...(issue && bookingId && draft?.savedRevision
            ? { expectedDraftRevision: Number(draft.savedRevision.revision) }
            : {}),
        },
      );
      setInvoice(r.invoice);
      if (r.invoice) setDraft(null);
      if (!r.invoice && bookingId)
        setDraft(await api("invoice.service.draft", { bookingId }));
      if (!r.invoice)
        setError(
          `Finance has not issued an invoice for this ${bookingId ? "service" : "order"} yet.`,
        );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <button className="button secondary" onClick={() => load()}>
        View invoice
      </button>
      {open && (
        <Modal
          title={bookingId ? "Service invoice" : "Order invoice"}
          onClose={() => setOpen(false)}
        >
          {error && <Notice message={error} />}
          <p>
            Payment availability depends on the approved payment configuration.
            Payment status comes from the verified ledger.
          </p>
          {draft && (
            <p>
              Service preview:{" "}
              {draft.totalKobo === null
                ? "Approved scope required"
                : money(draft.totalKobo)}
              . This preview is not an issued invoice or receipt.
            </p>
          )}
          {canIssue && (
            <ActionForm
              action="reauth"
              title="Verify your password for invoice actions"
              fields={[
                {
                  name: "password",
                  label: "Current password",
                  type: "password",
                },
              ]}
              submit="Verify password"
              onDone={() => load()}
            />
          )}
          {canIssue && bookingId && !invoice && draft && (
            <ServiceInvoiceDraftEditor
              key={draft.savedRevision?.revision ?? 0}
              bookingId={bookingId}
              draft={draft}
              onSaved={() => load()}
            />
          )}
          {canIssue && !invoice && (
            <button
              className="button"
              disabled={busy}
              onClick={() => load(true)}
            >
              Issue immutable invoice
            </button>
          )}
          {invoice && (
            <article className="issued-order-invoice">
              <FinancialDocumentPreview invoice={invoice} />
              {bookingId && (
                <p>
                  {invoice.financialReviewReconciled
                    ? "Reviewed service refund and invoice credit reconciled."
                    : invoice.finalReconciled
                      ? "Final service report reconciled."
                      : "Final service reconciliation pending."}{" "}
                  {invoice.reconciliationKobo
                    ? `Required adjustment: ${money(invoice.reconciliationKobo)}`
                    : ""}
                </p>
              )}
              <p>{invoice.snapshot.taxNote}</p>
              {invoice.snapshot.customerNote && (
                <p>{invoice.snapshot.customerNote}</p>
              )}
              {invoice.status === "paid" ? (
                <Notice message="Payment collection is recorded in the verified ledger. This invoice is not a receipt or confirmation of merchant settlement." />
              ) : null}
              <a
                className="button secondary"
                href={`/api/invoices/${bookingId ?? orderId}${bookingId ? "?source=service" : ""}`}
              >
                Download invoice PDF
              </a>
              <button
                className="button secondary"
                onClick={() => window.print()}
              >
                Print / save as PDF
              </button>
              {!bookingId && !canIssue && invoice.amountDueKobo > 0 && (
                <HostedPayment purpose="invoice" invoiceId={invoice.id} />
              )}
              {(invoice.notes ?? [])
                .filter((n: any) => n.state === "approved" && invoice.notePdfAvailable)
                .map((n: any) => (
                  <p key={n.id}>
                    <a
                      href={`/api/invoices/${bookingId ?? orderId}?${bookingId ? "source=service&" : ""}note=${encodeURIComponent(n.id)}`}
                    >
                      Download approved {n.kind} note #{n.sequence}
                    </a>{" "}
                    <small>
                      Available when the approved document template is enabled.
                    </small>
                  </p>
                ))}
              <InvoiceCorrections
                orderId={orderId}
                bookingId={bookingId}
                staff={canIssue}
                onChanged={() => load()}
              />
            </article>
          )}
        </Modal>
      )}
    </>
  );
}

function ServiceInvoiceDraftEditor({
  bookingId,
  draft,
  onSaved,
}: {
  bookingId: string;
  draft: any;
  onSaved: () => void;
}) {
  const revision = Number(draft.savedRevision?.revision ?? 0);
  const [key] = useState(() => crypto.randomUUID());
  return (
    <section className="panel stack">
      <h3>Saved invoice draft · revision {revision}</h3>
      <p>
        Prices come from the approved quotation or completed service report.
        This draft cannot collect payment or authorise work.
      </p>
      {draft.stale && (
        <Notice
          type="error"
          message="The approved service scope changed. Review the current amount and save a new revision before issue."
        />
      )}
      <ActionForm
        key={revision}
        action="invoice.service.draft.save"
        title="Save invoice draft"
        fields={[
          { name: "bookingId", label: "", type: "hidden", value: bookingId },
          {
            name: "expectedRevision",
            label: "",
            type: "hidden",
            value: revision,
          },
          { name: "operationKey", label: "", type: "hidden", value: key },
          {
            name: "dueDate",
            label: "Due date",
            type: "date",
            value: String(
              draft.savedRevision?.due_date ??
                new Date().toISOString().slice(0, 10),
            ).slice(0, 10),
          },
          {
            name: "customerNote",
            label: "Customer-visible invoice note",
            type: "textarea",
            value: draft.savedRevision?.customer_note ?? "",
            required: false,
          },
          { name: "reason", label: "Reason for this revision" },
        ]}
        submit="Save new revision"
        onDone={onSaved}
      />
      {(draft.revisions ?? []).length > 0 && (
        <details>
          <summary>Draft revision history</summary>
          <ul>
            {draft.revisions.map((r: any) => (
              <li key={r.revision}>
                Revision {r.revision} · {r.reason} · {r.created_at}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
