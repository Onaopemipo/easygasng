"use client";
import { useRef, useState, type FormEvent } from "react";
import { api, Notice } from "./ui";
export function DoorstepCylinderForm({
  orderId,
  version,
  amendment,
  onDone,
}: {
  orderId: string;
  version?: number;
  amendment?: any;
  onDone: () => void;
}) {
  const [count, setCount] = useState<number>(Number(amendment?.proposal.lines.length ?? 1)),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const pending = useRef<{ fingerprint: string; key: string } | null>(null);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const form = new FormData(event.currentTarget),
        rows = Array.from({ length: count }, (_, i) =>
          amendment
            ? {
                cylinderId: String(form.get("cylinder" + i)),
                allowableKg: Number(form.get("allowance" + i)),
                evidence: String(form.get("evidence" + i)),
              }
            : {
                capacityKg: Number(form.get("capacity" + i)),
                kg: Number(form.get("quantity" + i)),
              },
        );
      const data = amendment
        ? {
            orderId,
            amendmentId: amendment.id,
            inspections: rows,
            reason: String(form.get("reason")),
          }
        : { orderId, version, lines: rows };
      const fingerprint = JSON.stringify(data);
      if (pending.current?.fingerprint !== fingerprint)
        pending.current = { fingerprint, key: crypto.randomUUID() };
      await api(amendment ? "doorstep.prepare" : "doorstep.gas.propose", {
        ...data,
        operationKey: pending.current!.key,
      });
      pending.current = null;
      onDone();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="panel stack" onSubmit={submit}>
      <h3>
        {amendment
          ? "Inspect each customer cylinder"
          : "Propose gas for this visit"}
      </h3>
      {Array.from({ length: count }, (_, i) => (
        <fieldset key={i} className="stack">
          <legend>
            Cylinder {i + 1}
            {amendment
              ? ` · ${amendment.proposal.lines[i].kg} kg into ${amendment.proposal.lines[i].capacityKg} kg capacity`
              : ""}
          </legend>
          {amendment ? (
            <>
              <label>
                Customer cylinder ID
                <input name={"cylinder" + i} required />
              </label>
              <label>
                Independently verified allowable fill (kg)
                <input
                  name={"allowance" + i}
                  type="number"
                  min="0.001"
                  step="0.001"
                  required
                />
              </label>
              <label>
                Inspection evidence
                <input
                  name={"evidence" + i}
                  minLength={10}
                  maxLength={1000}
                  required
                />
              </label>
            </>
          ) : (
            <>
              <label>
                Cylinder capacity (kg)
                <input
                  name={"capacity" + i}
                  type="number"
                  min="0.001"
                  step="0.001"
                  required
                />
              </label>
              <label>
                Gas required (kg)
                <input
                  name={"quantity" + i}
                  type="number"
                  min="0.001"
                  step="0.001"
                  required
                />
              </label>
            </>
          )}
        </fieldset>
      ))}
      {!amendment && (
        <div className="button-row">
          <button
            type="button"
            className="button secondary"
            disabled={busy || count >= 10}
            onClick={() => setCount((n) => n + 1)}
          >
            Add cylinder
          </button>
          <button
            type="button"
            className="button secondary"
            disabled={busy || count <= 1}
            onClick={() => setCount((n) => n - 1)}
          >
            Remove last cylinder
          </button>
        </div>
      )}
      {amendment && (
        <label>
          Preparation evidence and reason
          <input name="reason" minLength={10} maxLength={500} required />
        </label>
      )}
      {error && <Notice type="error" message={error} />}
      <button className="button" disabled={busy}>
        {busy
          ? "Saving…"
          : amendment
            ? "Reserve inspected gas"
            : "Request customer consent"}
      </button>
    </form>
  );
}
