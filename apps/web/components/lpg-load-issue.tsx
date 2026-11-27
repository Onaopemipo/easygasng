"use client";
import { useRef, useState } from "react";
import { api, Notice } from "./ui";
import { FieldCaption } from "./field-caption";
export default function LPGLoadIssue({
  data,
  onDone,
  contextOrderId,
  onNeedCalibration,
  onPendingChange,
}: {
  data: any;
  onDone: () => void;
  contextOrderId?: string;
  onNeedCalibration?: () => void;
  onPendingChange?: (pending: boolean) => void;
}) {
  const [selectedOrderId, setOrderId] = useState("");
  const orderId = contextOrderId ?? selectedOrderId;
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef<{
      signature: string;
      key: string;
      observedAt: string;
    } | null>(null),
    writing = useRef(false);
  const order = data.orders?.find((o: any) => o.id === orderId),
    recovery = order?.status === "out_for_delivery";
  const trips =
    data.trips?.filter((t: any) => t.driver_id === order?.driver_id) ?? [];
  const [tripId, setTripId] = useState("");
  const trip = trips.find((t: any) => t.id === tripId) ?? trips[0];
  const meters =
    data.meters?.filter(
      (m: any) =>
        m.vehicle_id === trip?.vehicle_id &&
        m.active &&
        Date.parse(m.calibration_expires_at) > Date.now(),
    ) ?? [];
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (writing.current || !trip || !order) return;
    writing.current = true;
    setBusy(true);
    onPendingChange?.(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const input: any = {
      tripId: trip.id,
      meterId: String(f.get("meterId")),
      grams: Number(f.get("grams")),
      meterReadingGrams: Number(f.get("reading")),
      orderIds: [order.id],
      reason: String(f.get("reason")),
      ...(contextOrderId ? {orderContext: {orderId: contextOrderId, tripId: trip.id, version: Number(order.tracking_version)}} : {}),
    };
    const signature = JSON.stringify({
      ...input,
      recoveryVersion: recovery ? order.tracking_version : null,
    });
    if (pending.current?.signature !== signature)
      pending.current = {
        signature,
        key: crypto.randomUUID(),
        observedAt: new Date().toISOString(),
      };
    if (recovery)
      input.recovery = {
        orderId: order.id,
        version: Number(order.tracking_version),
        attemptId: order.attempt_id,
        observedAt: pending.current.observedAt,
        notDispensed: true,
      };
    try {
      await api(recovery ? "bulk.load.recover" : "bulk.load.issue", {
        ...input,
        operationKey: pending.current.key,
      });
      pending.current = null;
      setDirty(false);
      onDone();
      if (!contextOrderId) setOrderId("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      writing.current = false;
      setBusy(false);
      onPendingChange?.(false);
    }
  }
  return (
    <form className="panel stack product-form" onSubmit={submit}
      onChange={() => setDirty(true)} data-unsaved={dirty ? "true" : undefined}
      data-submit-pending={busy ? "true" : undefined}>
      <h3>Issue vehicle LPG load</h3>
      {!contextOrderId && <p>
        Select the reserved order and active driver trip. Use physical mass and
        calibrated meter readings; internal IDs are linked automatically.
      </p>}
      <fieldset disabled={busy} className="stack">
        {contextOrderId ? <p><strong>{order?.reference ?? "Order unavailable"}</strong> · {Number(order?.grams ?? 0) / 1000} kg reserved</p> : <label>
          <FieldCaption required>Reserved gas order</FieldCaption>
          <select
            value={orderId}
            onChange={(e) => {
              setOrderId(e.target.value);
              setTripId("");
            }}
            required
          >
            <option value="">Choose order</option>
            {data.orders?.map((o: any) => (
              <option key={o.id} value={o.id}>
                {o.reference} · {Number(o.grams) / 1000} kg ·{" "}
                {o.status === "out_for_delivery"
                  ? "Missing custody recovery"
                  : "Assigned"}
              </option>
            ))}
          </select>
        </label>}
        {order && (
          <>
            {!trips.length ? (
              <Notice
                type="error"
                message="This driver needs an active trip without an existing LPG load. Reconcile existing vehicle custody before issuing another load."
              />
            ) : (
              contextOrderId ? <p><strong>Vehicle:</strong> {trip.label} · {trip.driver_name}</p> : <label>
                <FieldCaption required>Vehicle / active trip</FieldCaption>
                <select
                  value={trip?.id ?? ""}
                  onChange={(e) => setTripId(e.target.value)}
                >
                  {trips.map((t: any) => (
                    <option value={t.id} key={t.id}>
                      {t.label} · {t.driver_name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              <FieldCaption required>Calibrated mass meter</FieldCaption>
              <select name="meterId" required key={`${trip?.id}:${meters.map((m: any) => m.id + m.calibration_expires_at).join(",")}`}
                defaultValue={contextOrderId && meters.length === 1 ? meters[0].id : ""}>
                <option value="">Choose current meter</option>
                {meters.map((m: any) => (
                  <option value={m.id} key={m.id}>
                    {m.serial} · calibration valid until{" "}
                    {new Date(m.calibration_expires_at).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </label>
            {!meters.length && (
              <div><p>
                No current calibrated meter for this vehicle. Register or renew
                it through the qualified meter workflow first.
              </p>{onNeedCalibration && <button type="button" className="button secondary" onClick={onNeedCalibration}>Renew meter calibration</button>}</div>
            )}
            {recovery && (
              <Notice
                type="error"
                message="Recover missing LPG custody: this delivery has already departed. Record only the actual gas currently on the vehicle, before any dispensing. The existing arrival/pickup history is preserved and this late custody entry is audited. If gas was already dispensed, stop and request an independent incident review."
              />
            )}
            <label>
              <FieldCaption required>
                {recovery
                  ? "Currently observed vehicle LPG mass (g)"
                  : "Physically loaded LPG mass (g)"}
              </FieldCaption>
              <input
                name="grams"
                type="number"
                min={Number(order.grams)}
                max="1000000000"
                step="1"
                required
              />
            </label>
            <label>
              <FieldCaption required>
                Current cumulative mass meter reading (g)
              </FieldCaption>
              <input
                name="reading"
                type="number"
                min="0"
                max="1000000000"
                step="1"
                required
              />
            </label>
            <label>
              <FieldCaption required>
                {recovery
                  ? "Recovery reason and fresh measurement evidence"
                  : "Loading evidence"}
              </FieldCaption>
              <textarea name="reason" minLength={10} maxLength={500} required />
            </label>
            {recovery && (
              <label data-field-type="checkbox">
                <input type="checkbox" required />
                <span>
                  I independently verified current custody and no gas has yet
                  been dispensed for this order.
                </span>
              </label>
            )}
            <button className="button" disabled={!trip || !meters.length}>
              {busy
                ? "Saving…"
                : recovery
                  ? "Recover missing LPG custody"
                  : "Issue measured LPG load"}
            </button>
          </>
        )}
      </fieldset>
      {error && <Notice type="error" message={error} />}
    </form>
  );
}
