"use client";
import { useEffect, useRef, useState } from "react";
import { api, Notice } from "./ui";
import { ActionForm } from "./workflows";
import { FieldCaption } from "./field-caption";
export default function OrderCylinderInspection({
  line,
  onDone,
}: {
  line: any;
  onDone: () => void;
}) {
  const [rows, setRows] = useState<any[] | null>(null),
    [selected, setSelected] = useState(line.cylinder_id ?? ""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [tick, setTick] = useState(0),
    [message, setMessage] = useState(""),
    [needsVerification, setNeedsVerification] = useState(false);
  const pending = useRef<{ signature: string; key: string } | null>(null),
    writing = useRef(false);
  useEffect(() => {
    let live = true;
    setError("");
    api("gas.cylinders?lineId=" + encodeURIComponent(line.id))
      .then((r) => {
        if (live) setRows(r);
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [line.id, tick]);
  const cylinder = rows?.find((c) => c.id === selected);
  async function submit(e: React.FormEvent<HTMLFormElement>, action: string) {
    e.preventDefault();
    if (writing.current) return;
    writing.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    const f = new FormData(e.currentTarget);
    let input: any;
    if (action === "gas.cylinder.intake")
      input = {
        lineId: line.id,
        serial: String(f.get("serial")),
        sizeKg: Number(line.capacity_grams) / 1000,
        testDue: String(f.get("testDue")),
        reason: String(f.get("reason")),
      };
    else if (action === "cylinder.inspect")
      input = {
        id: selected,
        passed: f.get("passed") === "true",
        nextDue: String(f.get("nextDue")),
        notes: String(f.get("notes")),
      };
    else
      input = {
        lineId: line.id,
        cylinderId: selected,
        allowableKg: Number(f.get("allowableKg")),
        reason: String(f.get("reason")),
      };
    const signature = action + JSON.stringify(input);
    if (pending.current?.signature !== signature)
      pending.current = { signature, key: crypto.randomUUID() };
    try {
      const result = await api(action, {
        ...input,
        operationKey: pending.current.key,
      });
      pending.current = null;
      if (action === "gas.cylinder.intake") {
        setSelected(result.id);
        setMessage(
          "Customer cylinder registered in quarantine. Record its physical inspection next.",
        );
      } else if (action === "cylinder.inspect")
        setMessage(
          "Inspection recorded. A passed inspection still needs a verified filling allowance for this order.",
        );
      else {
        onDone();
        return;
      }
      setTick((v) => v + 1);
    } catch (e: any) {
      setError(e.message);
      setNeedsVerification(
        e.code === "REAUTH_REQUIRED" ||
          (e.status === 403 && /verify your password/i.test(e.message)),
      );
    } finally {
      writing.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="stack">
      <p>
        Choose the physical cylinder by its marked serial number. EasyGas links
        its internal ID automatically; the ID is generated when the cylinder is
        registered.
      </p>
      {error && <Notice type="error" message={error} />}
      {message && <Notice message={message} />}
      <details open={needsVerification || undefined}>
        <summary>Verify identity for cylinder actions</summary>
        <ActionForm
          action="reauth"
          title="Verify your password for cylinder actions"
          fields={[
            {
              name: "password",
              label: "Current password",
              type: "password",
              autoComplete: "current-password",
            },
          ]}
          submit="Verify password"
          onDone={() => {
            setNeedsVerification(false);
            setError("");
            setMessage(
              "Identity verified. Your cylinder details are retained; retry the original action.",
            );
          }}
        />
      </details>
      {rows === null ? (
        <button
          className="button secondary"
          onClick={() => setTick((v) => v + 1)}
        >
          Load cylinder records
        </button>
      ) : (
        <label>
          <FieldCaption required>
            Cylinder serial / size / condition
          </FieldCaption>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            disabled={busy}
          >
            <option value="">Choose customer's cylinder</option>
            {rows.map((c) => (
              <option key={c.id} value={c.id} disabled={c.committed}>
                {c.serial} · {c.size_kg} kg · {c.status.replaceAll("_", " ")}
                {c.committed ? " · committed to another order" : ""}
              </option>
            ))}
          </select>
        </label>
      )}
      {cylinder && (
        <>
          <p>
            Next documented test: {String(cylinder.test_due).slice(0, 10)}.
            Compare the marked serial and capacity with the actual cylinder.
          </p>
          <details>
            <summary>Record physical cylinder inspection</summary>
            <form
              className="stack product-form"
              onSubmit={(e) => submit(e, "cylinder.inspect")}
              key={selected}
            >
              <fieldset disabled={busy || cylinder.committed} className="stack">
                <label>
                  <FieldCaption required>Inspection result</FieldCaption>
                  <select name="passed" required>
                    <option value="">Choose result</option>
                    <option value="true">Passed physical inspection</option>
                    <option value="false">Failed — quarantine</option>
                  </select>
                </label>
                <label>
                  <FieldCaption required>
                    Next documented test date
                  </FieldCaption>
                  <input type="date" name="nextDue" required />
                </label>
                <label>
                  <FieldCaption required>Inspection evidence</FieldCaption>
                  <textarea
                    name="notes"
                    minLength={5}
                    maxLength={1000}
                    required
                  />
                </label>
                <p>
                  A passing result requires a current cylinder-inspection
                  qualification and recent identity verification.
                </p>
                <button className="button">Save cylinder inspection</button>
              </fieldset>
            </form>
          </details>
          <form
            className="stack product-form"
            onSubmit={(e) => submit(e, "gas.inspection.record")}
          >
            <fieldset
              disabled={
                busy ||
                cylinder.committed ||
                cylinder.status !== "empty" ||
                Date.parse(cylinder.test_due) <= Date.now()
              }
              className="stack"
            >
              <label>
                <FieldCaption required>
                  Verified allowable additional fill (kg)
                </FieldCaption>
                <input
                  name="allowableKg"
                  type="number"
                  min={Number(line.grams) / 1000}
                  max={Number(line.capacity_grams) / 1000}
                  step="0.001"
                  required
                />
              </label>
              <label>
                <FieldCaption required>
                  Residual gas, inspection and custody evidence
                </FieldCaption>
                <textarea
                  name="reason"
                  minLength={10}
                  maxLength={1000}
                  required
                />
              </label>
              <button className="button">Save order filling eligibility</button>
            </fieldset>
            {cylinder.status !== "empty" && (
              <p>
                The cylinder must pass physical inspection before its filling
                eligibility can be saved.
              </p>
            )}
          </form>
        </>
      )}
      <details>
        <summary>Register an unrecorded customer cylinder</summary>
        <form
          className="stack product-form"
          onSubmit={(e) => submit(e, "gas.cylinder.intake")}
        >
          <p>
            Use the serial marked on the actual{" "}
            {Number(line.capacity_grams) / 1000} kg cylinder. Registration
            generates an internal ID and places it in quarantine until
            inspected. Do not invent or duplicate a serial.
          </p>
          <fieldset disabled={busy} className="stack">
            <label>
              <FieldCaption required>Marked cylinder serial</FieldCaption>
              <input name="serial" minLength={4} maxLength={80} required />
            </label>
            <label>
              <FieldCaption required>Documented next test date</FieldCaption>
              <input type="date" name="testDue" required />
            </label>
            <label>
              <FieldCaption required>
                Physical cylinder and customer custody evidence
              </FieldCaption>
              <textarea
                name="reason"
                minLength={10}
                maxLength={1000}
                required
              />
            </label>
            <button className="button secondary">
              Register customer cylinder
            </button>
          </fieldset>
        </form>
      </details>
    </div>
  );
}
