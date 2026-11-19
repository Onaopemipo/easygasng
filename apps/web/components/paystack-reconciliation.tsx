"use client";
import { RecordPages, WorkspaceDialog } from "./compact-workspace";
import { FieldCaption } from "./field-caption";
import { useEffect, useRef, useState } from "react";
import { api, Loading, money, Notice } from "./ui";
export default function PaystackReconciliation() {
  const [from, setFrom] = useState(() =>
      new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
    ),
    [to, setTo] = useState(() =>
      new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    ),
    [purpose, setPurpose] = useState(""),
    [report, setReport] = useState<any>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(true);
  const generation = useRef(0);
  function invalidate() { generation.current++; setReport(null); setError(""); setBusy(false); }
  async function load() {
    const current = ++generation.current;
    setBusy(true);
    setReport(null);
    setError("");
    try {
      const result = await api("finance.paystack", {
          from: from + "T00:00:00Z",
          to: to + "T00:00:00Z",
          ...(purpose ? { purpose } : {}),
          limit: 200,
        });
      if (current === generation.current) setReport(result);
    } catch (e: any) {
      if (current === generation.current) setError(e.message);
    } finally {
      if (current === generation.current) setBusy(false);
    }
  }
  useEffect(() => {
    load();
    return () => { generation.current++; };
  }, []);
  function download() {
    const cell = (v: unknown) =>
      '"' +
      String(v ?? "")
        .replace(/^[=+@-]/, "'$&")
        .replaceAll('"', '""') +
      '"';
    const fields = [
      "provider_reference",
      "purpose",
      "branch_id",
      "base_kobo",
      "customer_fee_kobo",
      "gross_kobo",
      "actual_fee_kobo",
      "created_at",
    ];
    const csv = [
      fields.map(cell).join(","),
      ...report.rows.map((r: any) => fields.map((k) => cell(r[k])).join(",")),
    ].join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "easygas-sandbox-collections-displayed-rows.csv";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section className="surface stack" style={{ marginTop: 24 }}>
      <h2>Paystack sandbox collections</h2>
      <p>
        Test records only. Collections, fee recovery and wallet funding are
        separate from recognised sales. No bank settlement is inferred.
      </p>
      <form
        className="business-filters"
        onSubmit={(e) => {
          e.preventDefault();
          load();
        }}
      >
        <label>
          <FieldCaption required={true}>From (UTC)</FieldCaption>
          <input
            type="date"
            required
            value={from}
            onChange={(e) => { setFrom(e.target.value); invalidate(); }}
          />
        </label>
        <label>
          <FieldCaption required={true}>Until, exclusive (UTC)</FieldCaption>
          <input
            type="date"
            required
            value={to}
            onChange={(e) => { setTo(e.target.value); invalidate(); }}
          />
        </label>
        <label>
          <FieldCaption required={false}>Purpose</FieldCaption>
          <select value={purpose} onChange={(e) => { setPurpose(e.target.value); invalidate(); }}>
            <option value="">All purposes</option>
            <option value="invoice">Invoice</option>
            <option value="service">Service</option>
            <option value="wallet">Wallet funding</option>
          </select>
        </label>
        <button className="button secondary" disabled={busy}>
          Refresh collections
        </button>
      </form>
      {error && <Notice type="error" message={error} />}
      {busy && <Loading label="Loading reconciliation records" />}
      {report && (
        <>
          <div className="compact-metrics">
            {[
              ["Gross customer collections", report.grossCollectionsKobo],
              [
                "Obligation principal collected",
                report.obligationCollectionsKobo,
              ],
              ["Wallet funding liability", report.walletFundingLiabilityKobo],
              [
                "Recovered processing charges",
                report.recoveredProcessingChargesKobo,
              ],
              ["Known provider fees", report.knownProviderFeesKobo],
              ["Estimated provider net", report.estimatedProviderNetKobo],
            ].map(([label, value]) => (
              <div key={label} className="surface">
                <h3>{label}</h3>
                <strong>
                  {value === null ? "Not confirmed" : money(value)}
                </strong>
              </div>
            ))}
          </div>
          <p>
            {report.settlementStatus} {report.unknownFeeCount} collection(s)
            have unconfirmed provider fees.
          </p>
          <p>
            {report.count} collection(s) in scope. Showing {report.rows.length}
            {report.truncated
              ? "; narrow the date window to review remaining records."
              : "."}
          </p>
          <button
            type="button"
            className="button secondary"
            onClick={download}
            disabled={!report.rows.length}
          >
            Export loaded collections CSV (kobo)
          </button>
          <RecordPages key={`${from}:${to}:${purpose}:${report.rows[0]?.id}`} rows={report.rows}>{visible => <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  {[
                    "Reference",
                    "Purpose",
                    "Branch",
                    "Principal",
                    "Processing charge",
                    "Gross",
                    "Provider fee",
                  ].map((t) => (
                    <th key={t}>{t}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((r: any) => (
                  <tr key={r.id}>
                    <td>{r.provider_reference}</td>
                    <td>{r.purpose}</td>
                    <td>{r.branch_id}</td>
                    <td>{money(r.base_kobo)}</td>
                    <td>{money(r.customer_fee_kobo)}</td>
                    <td>{money(r.gross_kobo)}</td>
                    <td>
                      {r.actual_fee_kobo === null
                        ? "Not confirmed"
                        : money(r.actual_fee_kobo)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>}</RecordPages>
          <WorkspaceDialog title="Collection exceptions & unmatched events" trigger={`Exceptions (${report.exceptions.length})${report.unmatchedEvents?.length ? " · Unmatched events (" + report.unmatchedEvents.length + ")" : ""}`}>
          <h3>Exceptions (up to 200)</h3>
          {!report.exceptions.length ? (
            <p>No scoped exception records in this window.</p>
          ) : (
            <RecordPages rows={report.exceptions}>{visible => visible.map((e: any) => (
              <p key={e.id}>
                {e.reference} · {e.category.replaceAll("_", " ")} · {e.status}
              </p>
            ))}</RecordPages>
          )}
          {!!report.unmatchedEvents?.length && (
            <>
              <h3>Unmatched provider events — owner review</h3>
              <RecordPages rows={report.unmatchedEvents}>{visible => visible.map((e: any) => (
                <p key={e.id}>
                  {e.reference} · {e.event_type} · {e.state}
                </p>
              ))}</RecordPages>
            </>
          )}
          </WorkspaceDialog>
        </>
      )}
    </section>
  );
}
