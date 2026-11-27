"use client";
import React, { useEffect, useRef, useState } from "react";
import { api } from "./ui";
import { FieldCaption } from "./field-caption";
import { FormInput } from "./password-input";

type Customer = {
  id: string;
  name: string;
  public_customer_id: string;
  branch_id: string | null;
  branch_name: string | null;
};
export function RewardsCustomerFields({
  value,
  scope,
  branches,
  lockedScope,
  onChange,
  onScopeChange,
  onSelected,
  directAddition = false,
}: {
  value: any;
  scope: string;
  branches: any[];
  lockedScope: boolean;
  onChange: (value: any) => void;
  onScopeChange: (scope: string) => Promise<void>;
  onSelected: (customer: Customer | null) => void;
  directAddition?: boolean;
}) {
  const [query, setQuery] = useState(""),
    [customers, setCustomers] = useState<Customer[]>([]),
    [selected, setSelected] = useState<Customer | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [searched, setSearched] = useState(false),
    [hasMore, setHasMore] = useState(false);
  const revision = useRef(0),
    live = useRef(true);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
      revision.current++;
    };
  }, []);
  useEffect(() => {
    if (!value.customerId || selected?.id === value.customerId) return;
    const ticket = ++revision.current;
    setBusy(true);
    api(
      "rewards.customers?scope=" +
        encodeURIComponent(scope) +
        "&customerId=" +
        encodeURIComponent(value.customerId),
    )
      .then((r) => {
        if (live.current && ticket === revision.current) {
          setSelected(r.customers[0] || null);
          if (!r.customers.length) setError("Select an active customer again.");
        }
      })
      .catch((e) => {
        if (live.current && ticket === revision.current) setError(e.message);
      })
      .finally(() => {
        if (live.current && ticket === revision.current) setBusy(false);
      });
  }, [value.customerId, scope, selected?.id]);
  useEffect(() => { onSelected(selected); }, [selected, onSelected]);
  async function search() {
    const ticket = ++revision.current;
    setBusy(true);
    setError("");
    setCustomers([]);
    setSearched(false);
    try {
      const r = await api(
        "rewards.customers?scope=" +
          encodeURIComponent(scope) +
          "&query=" +
          encodeURIComponent(query.trim()),
      );
      if (!live.current || ticket !== revision.current) return;
      setCustomers(r.customers);
      setHasMore(r.hasMore);
      setSearched(true);
    } catch (e: any) {
      if (live.current && ticket === revision.current) setError(e.message);
    } finally {
      if (live.current && ticket === revision.current) setBusy(false);
    }
  }
  async function selectCustomer(c: Customer) {
    if (busy) return;
    setBusy(true);
    setError("");
    revision.current++;
    try {
      if (c.branch_id && c.branch_id !== scope) {
        if (lockedScope)
          throw Error(
            "This request belongs to another branch. Select a customer in this branch or create a new adjustment.",
          );
        await onScopeChange(c.branch_id);
      }
      if (!live.current) return;
      setSelected(c);
      setCustomers([]);
      setSearched(false);
      onChange({
        ...value,
        customerId: c.id,
        customerPublicId: c.public_customer_id,
        assignBranchId: c.branch_id ? undefined : scope,
      });
    } catch (e: any) {
      if (live.current) setError(e.message);
    } finally {
      if (live.current) setBusy(false);
    }
  }
  async function changeBranch(next: string) {
    setBusy(true);
    setError("");
    revision.current++;
    try {
      await onScopeChange(next);
      if (live.current) {
        setCustomers([]);
        setSearched(false);
        onChange({
          ...value,
          assignBranchId:
            selected?.branch_id == null && selected ? next : undefined,
        });
      }
    } catch (e: any) {
      if (live.current) setError(e.message);
    } finally {
      if (live.current) setBusy(false);
    }
  }
  const branchName = branches.find((b) => b.id === scope)?.name || scope;
  return (
    <div className="reward-customer-picker" aria-busy={busy} style={{ gridColumn: "1 / -1", display: "grid", gap: 12, minWidth: 0 }}>
      <label>
        <FieldCaption required>
          Find customer by name or public customer ID
        </FieldCaption>
        <FormInput
          value={query}
          disabled={busy}
          placeholder="e.g. GY or EGC-…"
          onChange={(e) => {
            revision.current++;
            setBusy(false);
            setQuery(e.target.value);
            setCustomers([]);
            setSearched(false);
            setError("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (query.trim().length >= 2 && !busy) void search();
            }
          }}
        />
      </label>
      <button
        type="button"
        className="button secondary"
        disabled={busy || query.trim().length < 2}
        onClick={search}
      >
        Find customer
      </button>
      {busy && <p role="status">Loading customer details…</p>}
      {error && <p role="alert">{error}</p>}
      {searched && !customers.length && (
        <p role="status">
          No active customers found. Check the name or public customer ID.
        </p>
      )}
      {hasMore && customers.length > 0 && (
        <p>
          More matches are available. Enter a more specific name or the full
          customer ID.
        </p>
      )}
      {customers.length > 0 && (
        <ul aria-label="Matching customers">
          {customers.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className="button secondary"
                style={{ width: "100%", whiteSpace: "normal", overflowWrap: "anywhere", textAlign: "left" }}
                disabled={
                  busy ||
                  Boolean(lockedScope && c.branch_id && c.branch_id !== scope)
                }
                onClick={() => selectCustomer(c)}
              >
                {c.name} · {c.public_customer_id} ·{" "}
                {c.branch_name || "No branch assigned"}
              </button>
            </li>
          ))}
        </ul>
      )}
      {selected && (
        <div className="notice" style={{ display: "block", overflowWrap: "anywhere" }}>
          <strong>Selected customer: {selected.name}</strong>
          <p>{selected.public_customer_id}</p>
        </div>
      )}
      <label>
        <FieldCaption required>Customer branch</FieldCaption>
        <select
          value={scope}
          disabled={busy || lockedScope || Boolean(selected?.branch_id)}
          onChange={(e) => void changeBranch(e.target.value)}
        >
          {!branches.some((b) => b.id === scope) && (
            <option value={scope}>{scope}</option>
          )}
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </label>
      {selected && (
        <p>
          {selected.branch_id
            ? `This customer already belongs to ${selected.branch_name || branchName}.`
            : `Assign this customer to ${branchName} ${directAddition ? "when you confirm Add points. Nothing changes until you confirm." : "when the points adjustment is approved. Nothing changes until approval."}`}
        </p>
      )}

    </div>
  );
}
