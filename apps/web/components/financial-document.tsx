"use client";
import React from "react";
import { documentBrand } from "../lib/document-brand";
import {
  documentMoney,
  financialDocument,
  type FinancialDocument,
} from "../../../packages/business-rules/src/financial-document";
export function FinancialDocumentPreview({
  invoice,
  model,
}: {
  invoice?: any;
  model?: FinancialDocument;
}) {
  const d = model ?? financialDocument(invoice);
  return (
    <article
      className="easygas-financial-document"
      aria-label={`${d.title} ${d.number}`}
    >
      <header className="document-brand-row">
        <img
          src={documentBrand.logo}
          alt="EasyGas Energy Solutions"
          width="210"
          height="70"
        />
        <p>{documentBrand.tagline}</p>
      </header>
      <div className="document-business">
        <strong>{d.business.name}</strong>
        {[
          d.business.address,
          d.business.phone,
          d.business.email,
          d.business.website,
        ]
          .filter(Boolean)
          .map((v: string, i: number) => (
            <div key={i}>{v}</div>
          ))}
      </div>
      <div className="document-heading">
        <h2>{d.title}</h2>
        <span
          className={d.verified ? "document-state verified" : "document-state"}
        >
          {d.status}
        </span>
      </div>
      {d.sandbox && (
        <strong className="document-sandbox">SANDBOX — NO LIVE FUNDS</strong>
      )}
      <dl className="document-metadata">
        <dt>{d.type === "receipt" ? "Receipt No." : "Document No."}</dt>
        <dd>{d.number}</dd>
        <dt>Date issued</dt>
        <dd>{d.issuedAt}</dd>
        {d.dueDate && (
          <>
            <dt>Due date</dt>
            <dd>{d.dueDate}</dd>
          </>
        )}
        {d.sourceReference && (
          <>
            <dt>Source reference</dt>
            <dd>{d.sourceReference}</dd>
          </>
        )}
        {d.paymentReference && d.paymentReference !== d.sourceReference && (
          <>
            <dt>Payment reference</dt>
            <dd>{d.paymentReference}</dd>
          </>
        )}
      </dl>
      <section className="document-bill-to">
        <span>Billed To</span>
        <strong>{d.customer.name ?? "Not recorded"}</strong>
        {d.customer.public_customer_id && (
          <span>{d.customer.public_customer_id}</span>
        )}
        {d.address && <span>{d.address}</span>}
      </section>
      <h3>
        {d.type === "receipt"
          ? "Payment Details"
          : d.type === "invoice"
            ? "Invoice Details"
            : "Adjustment Details"}
      </h3>
      <table>
        <thead>
          <tr>
            <th scope="col">Description</th>
            <th scope="col">Amount</th>
          </tr>
        </thead>
        <tbody>
          {d.lines.map((l, i) => (
            <tr key={i}>
              <td>{l.label}</td>
              <td>{documentMoney(l.amountKobo)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <dl className="document-totals">
        {d.totals.map((t, i) => (
          <div key={i} className={t.emphasis ? "document-total-emphasis" : ""}>
            <dt>{t.label}</dt>
            <dd>{documentMoney(t.amountKobo)}</dd>
          </div>
        ))}
      </dl>
      <aside className="document-context">
        {d.notices.map((n, i) => (
          <p key={i}>{n}</p>
        ))}
      </aside>
      <footer>
        <strong>{d.business.name}</strong>
        <span>
          {[
            d.business.registrationNumber
              ? `RC: ${d.business.registrationNumber}`
              : "",
            d.business.taxId ? `TIN: ${d.business.taxId}` : "",
          ]
            .filter(Boolean)
            .join(" | ")}
        </span>
        <span>{d.title}</span>
      </footer>
    </article>
  );
}
