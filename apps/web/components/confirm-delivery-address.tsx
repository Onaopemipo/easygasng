"use client";
import { useEffect, useRef, useState } from "react";
import { api, Notice } from "./ui";
export default function ConfirmDeliveryAddress({
  order,
  onDone,
}: {
  order: any;
  onDone: () => void;
}) {
  const [coverage, setCoverage] = useState<any>(null),
    [checked, setChecked] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
  const running = useRef(false),
    key = useRef<string | null>(null);
  useEffect(() => {
    let live = true;
    api("gas.catalogue?branchId=" + encodeURIComponent(order.branch_id))
      .then((c) => {
        if (live)
          setCoverage(
            c.locations?.find((l: any) => l.id === order.location_id) ?? null,
          );
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [order.id, order.location_id]);
  async function confirm() {
    if (running.current || !checked || !coverage || saved) return;
    running.current = true;
    setBusy(true);
    setError("");
    key.current ??= crypto.randomUUID();
    try {
      await api("delivery.coverage.confirm", {
        orderId: order.id,
        locationVersion: Number(coverage.version),
        reason:
          "Dispatcher explicitly reviewed the customer street address against the displayed approved delivery coverage",
        operationKey: key.current,
      });
      setSaved(true);
      onDone();
    } catch (e: any) {
      setError(e.message);
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  return (
    <section className="panel stack">
      <h3>Confirm delivery address</h3>
      <p>
        <strong>{order.address?.street}</strong>
        <br />
        {order.address?.zone}
      </p>
      {coverage ? (
        <p>Approved delivery coverage: {coverage.coverage}</p>
      ) : (
        <p>Loading approved coverage…</p>
      )}
      {error && <Notice type="error" message={error} />}
      <label>
        <input
          type="checkbox"
          checked={checked}
          disabled={busy || saved}
          onChange={(e) => setChecked(e.target.checked)}
        />{" "}
        I reviewed this address and it is within the displayed delivery
        coverage.
      </label>
      <button
        type="button"
        className="button"
        disabled={busy || !checked || !coverage || saved}
        onClick={() => void confirm()}
      >
        {busy ? "Confirming…" : saved ? "Address confirmed" : "Confirm address"}
      </button>
      {saved && (
        <Notice message="Address confirmed. You can now continue with driver assignment." />
      )}
    </section>
  );
}
