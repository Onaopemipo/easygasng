"use client";
import React, { useEffect, useState } from "react";
import { ProductHeading } from "./product-workspace";
import { DocumentLibrary } from "./document-library";
import PaystackReconciliation from "./paystack-reconciliation";
import CashReconciliation from "./cash-reconciliation";
import {
  RecordPages,
  WorkspaceDialog,
  WorkspaceTabs,
} from "./compact-workspace";
import { api, money, Notice, Loading, Empty } from "./ui";

export default function Reconciliation({ user }: { user?: { id: string } }) {
  const [data, setData] = useState<any>(null),
    [rows, setRows] = useState<any[]>([]),
    [cursor, setCursor] = useState<string | null>(null),
    [error, setError] = useState(""),
    [pageError, setPageError] = useState(""),
    [busy, setBusy] = useState(false),
    [tab, setTab] = useState("documents"),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    setData(null);
    setPageError("");
    Promise.all([
      api("finance.summary", undefined, { signal: controller.signal }),
      api("finance.ledger", undefined, { signal: controller.signal }),
    ])
      .then(([s, l]) => {
        setData(s);
        setRows(l.rows);
        setCursor(l.nextCursor);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [revision]);
  if (error)
    return (
      <>
        <Notice type="error" message={error} />
        <button
          className="button secondary"
          onClick={() => setRevision((v) => v + 1)}
        >
          Retry reconciliation
        </button>
      </>
    );
  if (!data) return <Loading />;
  return (
    <section className="product-workspace reconciliation-workspace admin-compact">
      <ProductHeading
        eyebrow="FINANCE & PERFORMANCE"
        title="Financial reconciliation"
        description="Review verified payments, documents and outstanding liabilities."
      />
      <div
        className="compact-metrics"
        role="region"
        aria-label="Reconciliation totals"
        tabIndex={0}
      >
        {[
          ["Product revenue", data.productRevenueKobo],
          ["POS revenue", data.posRevenueKobo],
          ["Completed service revenue", data.serviceRevenueKobo],
          ["Unverified cash", data.unverifiedCashKobo],
          ["Purchase-credit liability", data.walletLiabilityKobo],
        ].map(([label, value]) => (
          <article className="surface" key={label}>
            <h3>{label}</h3>
            <strong>{value === null ? "Owner-only" : money(value)}</strong>
          </article>
        ))}
      </div>
      <div className="compact-toolbar">
        <WorkspaceTabs
          label="Reconciliation workspace"
          value={tab}
          onChange={setTab}
          tabs={[
            ["documents", "Invoices & receipts"],
            ["ledger", "Payment ledger"],
            ["cash", "Cash reconciliation"],
            ["services", "Service costs"],
            ["collections", "Paystack collections"],
          ]}
        />
        <WorkspaceDialog
          title="Reconciliation scope"
          trigger="About these figures"
        >
          <p>
            Outstanding reward points:{" "}
            {data.rewardPointsOutstanding ?? "Owner-only consolidated view"}
          </p>
          {data.limitations.map((l: string) => (
            <p key={l}>{l}</p>
          ))}
          <p>
            Verified payments exclude unverified cash. Payment collection alone
            is not a completed sale or bank settlement.
          </p>
        </WorkspaceDialog>
      </div>
      {tab === "documents" && <DocumentLibrary compact pageSize={8} />}
      {tab === "collections" && <PaystackReconciliation />}
      {tab === "cash" && <CashReconciliation user={user} refresh={revision} onChange={() => setRevision(v => v + 1)} />}
      {tab === "services" && (
        <section className="surface">
          <h2>Service invoices &amp; material costs</h2>
          {!data.services.length ? (
            <Empty title="No service costs yet">
              Recorded service invoices and material costs will appear here.
            </Empty>
          ) : (
            <RecordPages rows={data.services}>
              {(visible) => (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        {[
                          "Booking",
                          "Status",
                          "Invoice",
                          "Verified paid",
                          "Refunded",
                          "Material cost",
                        ].map((h) => (
                          <th key={h}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((b: any) => (
                        <tr key={b.id}>
                          <td>{b.reference}</td>
                          <td>{b.status.replaceAll("_", " ")}</td>
                          <td>{money(b.invoiced_kobo)}</td>
                          <td>{money(b.paid_kobo)}</td>
                          <td>{money(b.refunded_kobo)}</td>
                          <td>{money(b.recorded_material_cost_kobo)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </RecordPages>
          )}
        </section>
      )}
      {tab === "ledger" && (
        <section className="surface">
          <h2>Verified payment ledger</h2>
          <p>
            Payments include purchase credit. Revenue is recognised separately.
          </p>
          {!rows.length ? (
            <Empty title="No verified payments yet">
              Verified payment records will appear here.
            </Empty>
          ) : (
            <RecordPages rows={rows}>
              {(visible) => (
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        {[
                          "Reference",
                          "Order / booking",
                          "Method",
                          "Amount",
                          "Date · Lagos",
                        ].map((h) => (
                          <th key={h}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((r) => (
                        <tr key={r.id}>
                          <td>{r.reference}</td>
                          <td>
                            {r.order_reference ?? r.booking_reference ?? "—"}
                          </td>
                          <td>{r.method.replaceAll("_", " ")}</td>
                          <td>{money(r.amount_kobo)}</td>
                          <td>
                            {new Intl.DateTimeFormat("en-NG", {
                              dateStyle: "medium",
                              timeStyle: "short",
                              timeZone: "Africa/Lagos",
                            }).format(new Date(r.created_at))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </RecordPages>
          )}
          {pageError && <Notice type="error" message={pageError} />}
          {cursor && (
            <button
              className="button secondary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setPageError("");
                try {
                  const l = await api(
                    "finance.ledger?after=" + encodeURIComponent(cursor),
                  );
                  setRows((previous) => [...previous, ...l.rows]);
                  setCursor(l.nextCursor);
                } catch (e: any) {
                  setPageError(e.message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Loading…" : "Load more ledger records"}
            </button>
          )}
        </section>
      )}
    </section>
  );
}
