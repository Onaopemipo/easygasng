"use client";
import React from "react";
import {ProductHeading} from "./product-workspace";
import {DocumentLibrary} from "./document-library";
import PaystackReconciliation from "./paystack-reconciliation";
import { useEffect, useState } from "react";
import { api, money, Notice, Loading } from "./ui";
export default function Reconciliation() {
  const [data, setData] = useState<any>(null),
    [rows, setRows] = useState<any[]>([]),
    [cursor, setCursor] = useState<string | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    Promise.all([api("finance.summary"), api("finance.ledger")])
      .then(([s, l]) => {
        setData(s);
        setRows(l.rows);
        setCursor(l.nextCursor);
      })
      .catch((e) => setError(e.message));
  }, []);
  if (error) return <Notice type="error" message={error} />;
  if (!data) return <Loading />;
  return (
    <section className="product-workspace reconciliation-workspace">
      <ProductHeading eyebrow="FINANCE & PERFORMANCE" title="Financial reconciliation" description="Review verified revenue, purchase-credit liabilities and the payment ledger." />
      <DocumentLibrary/>
      <div className="service-grid">
        {[
          ["Verified product revenue", data.productRevenueKobo],
          ["Verified POS revenue", data.posRevenueKobo],
          ["Verified completed service revenue", data.serviceRevenueKobo],
          ["Cash awaiting independent verification", data.unverifiedCashKobo],
          ["Consolidated purchase-credit liability", data.walletLiabilityKobo],
        ].map(([label, value]) => (
          <div className="surface" key={label}>
            <h3>{label}</h3>
            <strong>
              {value === null ? "Owner-only consolidated view" : money(value)}
            </strong>
          </div>
        ))}
      </div>
      <p>
        Outstanding reward points:{" "}
        {data.rewardPointsOutstanding ?? "Owner-only consolidated view"}
      </p>
      {data.limitations.map((l: string) => (
        <p key={l} className="muted">
          {l}
        </p>
      ))}
      <h2>Service invoices and recorded material costs</h2>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Booking</th>
              <th>Status</th>
              <th>Invoice</th>
              <th>Verified paid</th>
              <th>Refunded</th>
              <th>Recorded material cost</th>
            </tr>
          </thead>
          <tbody>
            {data.services.map((b: any) => (
              <tr key={b.id}>
                <td>{b.reference}</td>
                <td>{b.status}</td>
                <td>{money(b.invoiced_kobo)}</td>
                <td>{money(b.paid_kobo)}</td>
                <td>{money(b.refunded_kobo)}</td>
                <td>{money(b.recorded_material_cost_kobo)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <PaystackReconciliation />
      <h2>Verified payment ledger</h2>
      <p>
        Load the next page to review more records. These entries do not include
        unverified cash or pretend that a payment is a completed sale.
      </p>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Reference</th>
              <th>Order / booking</th>
              <th>Method</th>
              <th>Amount</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.reference}</td>
                <td>{r.order_reference ?? r.booking_reference}</td>
                <td>{r.method}</td>
                <td>{money(r.amount_kobo)}</td>
                <td>{new Date(r.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {cursor && (
        <button
          className="button secondary"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const l = await api(
                "finance.ledger?after=" + encodeURIComponent(cursor),
              );
              setRows([...rows, ...l.rows]);
              setCursor(l.nextCursor);
            } catch (e: any) {
              setError(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          Load next ledger page
        </button>
      )}
    </section>
  );
}
