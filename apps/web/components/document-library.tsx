"use client";
import { SectionLoadingFallback } from "./easygas-loader";
import React, { useEffect, useRef, useState } from "react";
import { api, Notice, Modal } from "./ui";
import { FinancialDocumentPreview } from "./financial-document";
import { documentMoney } from "../../../packages/business-rules/src/financial-document";
export function DocumentLibrary({
  initialType = "all",
}: {
  initialType?: "all" | "invoice" | "receipt";
}) {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [search, setSearch] = useState(""),
    [filters, setFilters] = useState({
      search: "",
      type: initialType,
      branchId: "",
      status: "all",
      from: "",
      to: "",
      page: 1,
    }),
    [selected, setSelected] = useState<any>(null),
    [busy, setBusy] = useState(false),
    [revision, setRevision] = useState(0);
  const generation = useRef(0);
  useEffect(() => {
    const current = ++generation.current;
    setBusy(true);
    setError("");
    const q = new URLSearchParams(
      Object.entries(filters)
        .filter(([, v]) => v !== "")
        .map(([k, v]) => [k, String(v)]),
    );
    api("documents.list?" + q)
      .then((r) => {
        if (generation.current === current) setData(r);
      })
      .catch((e) => {
        if (generation.current === current) {
          setData(null);
          setSelected(null);
          setError(e.message);
        }
      })
      .finally(() => {
        if (generation.current === current) setBusy(false);
      });
    return () => {
      generation.current++;
    };
  }, [filters, revision]);
  return (
    <section
      className="surface stack document-library"
      aria-label="Invoices and payment receipts"
    >
      <h2>Invoices & Payment Receipts</h2>
      <p>
        Invoices show amounts owed. Receipts are available only for committed
        verified Paystack collections; sandbox receipts are labelled. Manual
        credits and POS records remain in their existing histories.
      </p>
      <form
        className="document-library-filters"
        onSubmit={(e) => {
          e.preventDefault();
          setFilters((v) => ({ ...v, search, page: 1 }));
        }}
      >
        <label>
          Search documents
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Number, source reference or customer"
            maxLength={100}
          />
        </label>
        <label>
          Document type
          <select
            aria-label="Document type"
            value={filters.type}
            onChange={(e) =>
              setFilters((v) => ({
                ...v,
                type: e.target.value as typeof initialType,
                page: 1,
              }))
            }
          >
            <option value="all">All documents</option>
            <option value="invoice">Invoices</option>
            <option value="receipt">Payment receipts</option>
          </select>
        </label>
        <label>
          Document status
          <select
            aria-label="Document status"
            value={filters.status}
            onChange={(e) =>
              setFilters((v) => ({ ...v, status: e.target.value, page: 1 }))
            }
          >
            {[
              "all",
              "Unpaid invoice",
              "Partially paid invoice",
              "Paid invoice",
              "Voided invoice",
              "Reconciliation required",
              "Payment Verified",
            ].map((s) => (
              <option key={s} value={s}>
                {s === "all" ? "All statuses" : s}
              </option>
            ))}
          </select>
        </label>
        {data?.branches?.length > 1 && (
          <label>
            Branch
            <select
              aria-label="Document branch"
              value={filters.branchId}
              onChange={(e) =>
                setFilters((v) => ({ ...v, branchId: e.target.value, page: 1 }))
              }
            >
              <option value="">All authorised branches</option>
              {data.branches.map((b: any) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label>
          From (Lagos)
          <input
            type="date"
            value={filters.from}
            onChange={(e) =>
              setFilters((v) => ({ ...v, from: e.target.value, page: 1 }))
            }
          />
        </label>
        <label>
          To (Lagos)
          <input
            type="date"
            value={filters.to}
            onChange={(e) =>
              setFilters((v) => ({ ...v, to: e.target.value, page: 1 }))
            }
          />
        </label>
        <button className="button secondary" disabled={busy}>
          Search
        </button>
        <button
          className="button secondary"
          type="button"
          disabled={busy}
          onClick={() => setRevision((n) => n + 1)}
        >
          Refresh
        </button>
      </form>
      {error && <Notice type="error" message={error} />}{" "}
      {busy && <SectionLoadingFallback />}
      {data && !busy && (
        <>
          <p>{data.total} matching documents</p>
          {data.rows.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Document</th>
                    <th scope="col">Status</th>
                    <th scope="col">Amount</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((r: any) => (
                    <tr key={r.id}>
                      <td>
                        {r.model.title}
                        <br />
                        {r.number}
                        <small>{r.model.issuedAt}</small>
                      </td>
                      <td>
                        {r.model.status}
                        {r.model.sandbox && <strong> · SANDBOX</strong>}
                      </td>
                      <td>
                        {documentMoney(
                          r.model.totals.find((t: any) => t.emphasis)
                            ?.amountKobo ?? null,
                        )}
                      </td>
                      <td>
                        <button
                          className="button secondary"
                          onClick={() => setSelected(r)}
                        >
                          View document
                        </button>{" "}
                        <a className="button secondary" href={r.downloadUrl}>
                          Download PDF
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p>No matching issued documents.</p>
          )}
          <nav aria-label="Document pages">
            <button
              className="button secondary"
              disabled={busy || data.page <= 1}
              onClick={() => setFilters((v) => ({ ...v, page: v.page - 1 }))}
            >
              Previous
            </button>
            <span> Page {data.page} </span>
            <button
              className="button secondary"
              disabled={busy || data.page * data.pageSize >= data.total}
              onClick={() => setFilters((v) => ({ ...v, page: v.page + 1 }))}
            >
              Next
            </button>
          </nav>
        </>
      )}
      {selected && (
        <Modal title={selected.model.title} onClose={() => setSelected(null)}>
          <div className="issued-order-invoice">
            <FinancialDocumentPreview model={selected.model} />
            <a className="button" href={selected.downloadUrl}>
              Download PDF
            </a>
            <button className="button secondary" onClick={() => window.print()}>
              Print selected document
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
