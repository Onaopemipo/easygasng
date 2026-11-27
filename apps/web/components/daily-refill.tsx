"use client";
import React, { useRef, useState } from "react";
import { Notice } from "./ui";
export default function DailyRefill({
  order,
  disabled = false,
  write,
}: {
  order: any;
  disabled?: boolean;
  write: (action: string, input: any) => Promise<any>;
}) {
  const [readings, setReadings] = useState([{ before: "", after: "" }]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const pending = useRef(false),
    key = useRef(crypto.randomUUID());
  const expected = Number(order.daily_run.grams) / 1000,
    total = readings.reduce(
      (n, r) => n + (Number(r.after) - Number(r.before)),
      0,
    );
  if (order.daily_run.supplied_grams > 0)
    return (
      <Notice
        message={`${Number(order.daily_run.supplied_grams) / 1000} kg supplied. Upload the refill photo and complete delivery.`}
      />
    );
  return (
    <section className="stack panel" aria-label="Record scale refill">
      <h3>Weigh and refill</h3>
      <p>
        Customer paid for <strong>{expected} kg</strong>. Weigh each cylinder
        before and after filling on the same scale. The difference is the gas
        supplied.
      </p>
      {order.attempt?.state !== "arrived" ? (
        <p>Confirm arrival to record the refill.</p>
      ) : (
        <form
          className="stack"
          onSubmit={async (e) => {
            e.preventDefault();
            if (pending.current) return;
            pending.current = true;
            setBusy(true);
            setError("");
            try {
              await write("daily.refill.record", {
                orderId: order.id,
                version: order.tracking_version,
                readings: readings.map((r) => ({
                  beforeKg: Number(r.before),
                  afterKg: Number(r.after),
                })),
                operationKey: key.current,
              });
            } catch (err: any) {
              setError(err.message);
            } finally {
              pending.current = false;
              setBusy(false);
            }
          }}
        >
          {readings.map((r, i) => (
            <fieldset key={i} disabled={disabled || busy}>
              <legend>Cylinder {i + 1}</legend>
              {(["before", "after"] as const).map((k) => (
                <label key={k}>
                  Weight {k} filling (kg)
                  <input
                    aria-label={`Cylinder ${i + 1} weight ${k} filling (kg)`}
                    type="number"
                    min="0"
                    step="0.001"
                    required
                    value={r[k]}
                    onChange={(e) => {
                      setReadings((old) =>
                        old.map((x, j) =>
                          j === i ? { ...x, [k]: e.target.value } : x,
                        ),
                      );
                      key.current = crypto.randomUUID();
                    }}
                  />
                </label>
              ))}
            </fieldset>
          ))}
          <p role="status">
            Gas added: {Math.round(total * 1000) / 1000} kg · Paid quantity:{" "}
            {expected} kg
          </p>
          <button
            type="button"
            className="button secondary"
            disabled={busy || disabled || readings.length >= 20}
            onClick={() => {
              setReadings((x) => [...x, { before: "", after: "" }]);
              key.current = crypto.randomUUID();
            }}
          >
            Add another cylinder
          </button>
          {error && <Notice type="error" message={error} />}
          <button className="button" disabled={busy || disabled}>
            {busy ? "Saving refill…" : "Save scale readings"}
          </button>
        </form>
      )}
    </section>
  );
}
