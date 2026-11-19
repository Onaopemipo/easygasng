"use client";
import React, { useEffect, useState } from "react";
import { api, Empty, Loading, Modal, money, Notice } from "./ui";
import { RecordPages } from "./compact-workspace";
import { ActionForm } from "./workflows";

export function CashCollectionTable({
  rows,
  userId,
  onReview,
}: {
  rows: any[];
  userId?: string;
  onReview: (row: any) => void;
}) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Order</th>
            <th>Collector</th>
            <th>Amount</th>
            <th>Status</th>
            <th>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.reference}</td>
              <td>{row.collector}</td>
              <td>{money(row.amount_kobo)}</td>
              <td>
                {row.verified_at ? "Verified" : "Awaiting reconciliation"}
              </td>
              <td>
                {!row.verified_at &&
                  (row.collector_id === userId ? (
                    <span>Another finance reviewer required</span>
                  ) : (
                    <button
                      type="button"
                      className="text-link"
                      disabled={!userId}
                      onClick={() => onReview(row)}
                    >
                      Review cash receipt
                    </button>
                  ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CashReconciliation({
  user,
  refresh = 0,
  onChange,
}: {
  user?: { id: string };
  refresh?: number;
  onChange?: () => void;
}) {
  const [rows, setRows] = useState<any[] | null>(null),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0),
    [selected, setSelected] = useState<any>(null),
    [verified, setVerified] = useState(false),
    [busy, setBusy] = useState(false),
    [showAll, setShowAll] = useState(false),
    [q, setQ] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setError("");
    api("cash.collections", undefined, { signal: controller.signal })
      .then(setRows)
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [refresh, revision]);
  function review(row: any) {
    setSelected(row);
    setVerified(false);
    setError("");
  }
  const filtered = (rows ?? []).filter(
    (row) =>
      (showAll || !row.verified_at) &&
      `${row.reference} ${row.collector}`
        .toLowerCase()
        .includes(q.trim().toLowerCase()),
  );
  return (
    <section className="surface">
      <div className="section-heading">
        <div>
          <h2>Order cash reconciliation</h2>
          <p>
            Verify recorded collections against receipts. A different finance
            reviewer must confirm each collection.
          </p>
        </div>
        <button
          type="button"
          className="button secondary"
          disabled={busy}
          onClick={() => setRevision((v) => v + 1)}
        >
          Refresh cash records
        </button>
      </div>
      {error && !selected && <Notice type="error" message={error} />}
      <div className="compact-toolbar">
        <input
          type="search"
          aria-label="Search cash receipts"
          placeholder="Search order or collector…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <label>
          <input
            type="checkbox"
            checked={showAll}
            onChange={(e) => setShowAll(e.target.checked)}
          />{" "}
          Include verified collections
        </label>
      </div>
      {!rows ? (
        <Loading />
      ) : !filtered.length ? (
        <Empty title="No cash receipts to review">
          Recorded collections appear here when they need independent
          verification.
        </Empty>
      ) : (
        <RecordPages rows={filtered}>
          {(visible) => (
            <CashCollectionTable
              rows={visible}
              userId={user?.id}
              onReview={review}
            />
          )}
        </RecordPages>
      )}
      {selected && (
        <Modal
          title="Verify cash receipt"
          onClose={() => {
            if (!busy) setSelected(null);
          }}
        >
          <p>
            <strong>{selected.reference}</strong> ·{" "}
            {money(selected.amount_kobo)}
          </p>
          <p>Recorded by {selected.collector}.</p>
          {error && <Notice type="error" message={error} />}
          {!verified ? (
            <ActionForm
              contextual
              action="reauth"
              title="Verify your identity"
              submit="Verify identity"
              fields={[
                {
                  name: "password",
                  label: "Current password",
                  type: "password",
                },
              ]}
              onDone={() => setVerified(true)}
            />
          ) : (
            <button
              type="button"
              className="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  await api("cash.reconcile", { id: selected.id });
                  setSelected(null);
                  setRevision((v) => v + 1);
                  onChange?.();
                } catch (e: any) {
                  setError(e.message);
                  if (e.code === "REAUTH_REQUIRED") setVerified(false);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {busy ? "Confirming…" : "Confirm receipt of cash"}
            </button>
          )}
        </Modal>
      )}
    </section>
  );
}
