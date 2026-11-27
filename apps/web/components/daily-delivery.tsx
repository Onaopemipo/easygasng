"use client";
import React, { useEffect, useRef, useState } from "react";
import { api, Notice } from "./ui";
export default function DailyDelivery({
  user,
  branch,
  onChange,
}: {
  user: any;
  branch: string;
  onChange: () => void;
}) {
  const [loaded, setData] = useState<any>(null),
    [options, setOptions] = useState<any>(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [revision, setRevision] = useState(0),
    [mode, setMode] = useState("");
  const pending = useRef(false),
    operation = useRef({ signature: "", key: "" });
  const selectedBranch = branch || user.branch_id || user.branchId || "lagos";
  const scope = [selectedBranch, user.id, user.role].join(":");
  const data = loaded?.scope === scope ? loaded.data : null;
  useEffect(() => {
    let live = true;
    setData(null);
    setOptions(null);
    setError("");
    Promise.all([
      api("daily.summary?branch=" + encodeURIComponent(selectedBranch)),
      api(
        "dispatch.vehicle.options?branch=" + encodeURIComponent(selectedBranch),
      ),
    ])
      .then(([d, o]) => {
        if (live) {
          setData({ scope, data: d });
          setOptions(o);
        }
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [scope, revision]);
  const run = data?.runs?.find((r: any) => r.state === "active"),
    last = data?.runs?.[0];
  const drivers =
      options?.drivers?.filter((d: any) => d.branch_id === selectedBranch) ??
      [],
    vehicles =
      options?.vehicles?.filter((v: any) => v.branch_id === selectedBranch) ??
      [];
  const expected = run
    ? (Number(run.opening_grams) +
        Number(run.added_grams) -
        Number(run.supplied_grams)) /
      1000
    : 0;
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending.current) return;
    const form = e.currentTarget,
      f = new FormData(form),
      action = run
        ? mode === "add"
          ? "daily.add"
          : "daily.close"
        : "daily.start";
    const input: any = run
      ? {
          runId: run.id,
          version: Number(run.version),
          kg: Number(f.get("kg")),
          reason: String(f.get("reason") || ""),
          ...(action === "daily.close"
            ? {
                carryForward: f.get("carryForward") === "on",
                endOdometer: Number(f.get("odometer")),
              }
            : {}),
        }
      : {
          driverId: f.get("driver"),
          vehicleId: f.get("vehicle"),
          openingKg: Number(f.get("kg")),
          startOdometer: Number(f.get("odometer")),
          scaleReference: String(f.get("scale") || ""),
        };
    const signature = JSON.stringify([action, input]);
    if (operation.current.signature !== signature)
      operation.current = { signature, key: crypto.randomUUID() };
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await api("reauth", { password: String(f.get("password")) });
      const result = await api(action, {
        ...input,
        operationKey: operation.current.key,
      });
      setMessage(result.message);
      setMode("");
      setRevision((x) => x + 1);
      onChange();
    } catch (err: any) {
      setError(err.message);
    } finally {
      const p = form.elements.namedItem("password") as HTMLInputElement;
      if (p) p.value = "";
      setBusy(false);
      pending.current = false;
    }
  }
  return (
    <section className="stack panel" aria-label="Today’s delivery day">
      <h2>Today’s deliveries</h2>
      {message && <Notice message={message} />}{" "}
      {error && <Notice type="error" message={error} />}
      {!data && !error && <p role="status">Loading today’s vehicle and gas…</p>}
      {error && (
        <button
          className="button secondary"
          onClick={() => setRevision((x) => x + 1)}
        >
          Try again
        </button>
      )}
      {run && (
        <>
          <p>
            <strong>{run.label}</strong> · {run.driver_name}
          </p>
          <dl className="dc-kpis">
            {[
              ["Opening gas", Number(run.opening_grams) / 1000],
              ["Added gas", Number(run.added_grams) / 1000],
              ["Gas supplied", Number(run.supplied_grams) / 1000],
              ["Gas on vehicle (expected)", expected],
              ["Committed to orders", Number(run.committed_grams) / 1000],
              [
                "Available for new orders",
                expected - Number(run.committed_grams) / 1000,
              ],
            ].map(([k, v]) => (
              <div key={String(k)}>
                <dt>{k}</dt>
                <dd>{v} kg</dd>
              </div>
            ))}
          </dl>
          <div className="aord-footer">
            <button
              className="button secondary"
              disabled={busy}
              onClick={() => setMode("add")}
            >
              Add gas
            </button>
            <button
              className="button"
              disabled={busy}
              onClick={() => setMode("close")}
            >
              Close delivery day
            </button>
          </div>
        </>
      )}
      {!run && last?.state === "closed" && (
        <p>
          Last day reconciled: {Number(last.closing_grams) / 1000} kg remaining
          · Difference {Number(last.variance_grams) / 1000} kg.
        </p>
      )}
      {data && options && (!run || mode) && (
        <form onSubmit={submit} className="stack">
          {!run && (
            <p>
              Use the actual gas-only weight loaded. Starting the day also marks
              the selected driver on duty. Location tracking stays off.
            </p>
          )}
          <h3>
            {!run
              ? "Start delivery day"
              : mode === "add"
                ? "Additional gas loaded"
                : "Closing reconciliation"}
          </h3>
          <fieldset disabled={busy || !data.enabled} className="stack">
            {!run && (
              <>
                <label>
                  Driver
                  <select
                    name="driver"
                    required
                    defaultValue={drivers.length === 1 ? drivers[0].id : ""}
                  >
                    <option value="">Choose driver</option>
                    {drivers.map((d: any) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Vehicle
                  <select
                    name="vehicle"
                    required
                    defaultValue={vehicles.length === 1 ? vehicles[0].id : ""}
                  >
                    <option value="">Choose vehicle</option>
                    {vehicles.map((v: any) => (
                      <option key={v.id} value={v.id}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}
            <label>
              {!run
                ? "Opening gas-only weight (kg)"
                : mode === "add"
                  ? "Additional gas loaded (kg)"
                  : "Measured remaining gas-only weight (kg)"}
              <input
                name="kg"
                type="number"
                min={!run || mode === "add" ? "0.001" : "0"}
                step="0.001"
                required
              />
            </label>
            {run && mode === "close" && (
              <>
                <p>
                  Expected remaining: <strong>{expected} kg</strong>. The
                  measured difference is retained. An Admin can confirm a
                  difference once with an explanation.
                </p>
                <label data-field-type="checkbox">
                  <input name="carryForward" type="checkbox" />
                  Carry forward orders that have not been filled
                </label>
                <label>
                  Explanation if weights differ
                  <textarea name="reason" maxLength={1000} />
                </label>
              </>
            )}
            {(!run || mode === "close") && (
              <label>
                {run ? "Ending" : "Starting"} odometer (km)
                <input
                  name="odometer"
                  type="number"
                  min="0"
                  step="0.1"
                  required
                />
              </label>
            )}
            {!run && (
              <details>
                <summary>Scale reference (optional)</summary>
                <label>
                  Scale reference
                  <input name="scale" maxLength={100} />
                </label>
              </details>
            )}
            <label>
              Your password
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </label>
            <button className="button">
              {busy
                ? "Saving…"
                : !run
                  ? "Start day"
                  : mode === "add"
                    ? "Record additional gas"
                    : "Confirm and close day"}
            </button>
            {run && (
              <button
                type="button"
                className="button secondary"
                onClick={() => setMode("")}
              >
                Keep day open
              </button>
            )}
          </fieldset>
          {!data.enabled && (
            <Notice message="Field operations are awaiting release approval." />
          )}
        </form>
      )}
    </section>
  );
}
