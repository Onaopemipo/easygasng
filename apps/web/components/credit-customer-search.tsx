"use client";
import { useEffect, useState } from "react";
import { api, Notice } from "./ui";
export type CreditCustomer = {
  id: string;
  name: string;
  email: string;
  contact_phone: string | null;
  public_customer_id: string | null;
  branch_id: string | null;
  credit_branch_id: string | null;
};
export default function CreditCustomerSearch({
  selected,
  onSelect,
}: {
  selected: CreditCustomer | null;
  onSelect: (customer: CreditCustomer | null) => void;
}) {
  const [query, setQuery] = useState(""),
    [results, setResults] = useState<CreditCustomer[]>([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    const ctrl = new AbortController();
    setResults([]);
    setError("");
    if (query.trim().length < 2) {
      setBusy(false);
      return () => ctrl.abort();
    }
    setBusy(true);
    const timer = setTimeout(() => {
      api(
        "credit.customers?" + new URLSearchParams({ q: query.trim() }),
        undefined,
        { signal: ctrl.signal },
      )
        .then((rows) => {
          if (!ctrl.signal.aborted) setResults(rows);
        })
        .catch((e) => {
          if (!ctrl.signal.aborted) setError(e.message);
        })
        .finally(() => {
          if (!ctrl.signal.aborted) setBusy(false);
        });
    }, 300);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query]);
  return (
    <section
      className="surface workflow-form credit-customer-search"
      aria-label="Select customer for credit or refund"
    >
      <h2>Find a customer</h2>
      <p>
        Search by name, email, phone or customer ID. Select the correct account
        before recording credit or reviewing refunds.
      </p>
      <label>
        Quick customer search
        <input
          type="search"
          autoComplete="off"
          value={query}
          placeholder="Enter at least 2 characters"
          onChange={(e) => {
            setQuery(e.target.value);
            onSelect(null);
          }}
        />
      </label>
      {error && <Notice type="error" message={error} />}
      <div role="status" aria-live="polite">
        {busy
          ? "Searching customers…"
          : !selected && query.trim().length >= 2 && !error && !results.length
            ? "No matching customers in your authorised scope."
            : ""}
      </div>
      {!selected && results.length > 0 && (
        <ul
          aria-label="Matching customers"
          style={{ listStyle: "none", padding: 0, display: "grid", gap: 8 }}
        >
          {results.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className="button secondary"
                style={{
                  width: "100%",
                  textAlign: "left",
                  whiteSpace: "normal",
                  display: "block",
                }}
                onClick={() => onSelect(c)}
              >
                <strong>{c.name}</strong>
                <br />
                {c.email}
                {c.contact_phone ? " · " + c.contact_phone : ""}
                <br />
                {c.public_customer_id || c.id} · Branch:{" "}
                {c.credit_branch_id || "Not configured"}
              </button>
            </li>
          ))}
        </ul>
      )}
      {selected && (
        <div className="surface" aria-label="Selected customer">
          <strong>{selected.name}</strong>
          <p>
            {selected.email}
            {selected.contact_phone ? " · " + selected.contact_phone : ""}
          </p>
          <p>
            Customer ID: {selected.public_customer_id || selected.id} · Branch:{" "}
            {selected.credit_branch_id || "Not configured"}
          </p>
          <button
            type="button"
            className="button secondary"
            onClick={() => {
              onSelect(null);
              setQuery("");
            }}
          >
            Change customer
          </button>
        </div>
      )}
    </section>
  );
}
