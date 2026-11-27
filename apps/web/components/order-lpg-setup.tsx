"use client";
import { useEffect, useRef, useState } from "react";
import { api, Notice } from "./ui";
import { OperationForm } from "./operations-completion";
import LPGLoadIssue from "./lpg-load-issue";
import { FieldCaption } from "./field-caption";
import { confirmAction } from "./app-dialog";

export default function OrderLPGSetup({
  order,
  user,
  mode,
  onAction,
  onSaved,
  onPendingChange,
  onDraftReset,
}: {
  order: any;
  user: any;
  mode: "calibration" | "load";
  onAction: (action: string) => void;
  onSaved: (kind: "calibration" | "load") => void;
  onPendingChange: (pending: boolean) => void;
  onDraftReset?: () => void;
}) {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [revision, setRevision] = useState(0),
    [pending, setPending] = useState(false),
    [meterId, setMeterId] = useState("");
  const section = useRef<HTMLElement>(null);
  const scope = JSON.stringify([
    order.id,
    order.branch_id,
    order.driver_id,
    order.tracking_version,
    order.status,
  ]);
  useEffect(() => {
    let live = true;
    setData(null);
    setError("");
    api("bulk.summary?orderId=" + encodeURIComponent(order.id))
      .then((value) => {
        if (
          value.orderId !== order.id ||
          (value.currentTrip &&
            (value.currentTrip.driver_id !== order.driver_id ||
              value.currentTrip.branch_id !== order.branch_id))
        )
          throw new Error(
            "Order or vehicle context changed. Refresh this order’s gas readiness.",
          );
        if (live) setData({ scope, value });
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [scope, revision]);
  const current = data?.scope === scope ? data.value : null;
  const trip = current?.currentTrip;
  const meters =
    current?.meters?.filter(
      (m: any) => m.active && m.vehicle_id === trip?.vehicle_id,
    ) ?? [];
  const meter =
    meters.find((m: any) => m.id === meterId) ??
    (meters.length === 1 ? meters[0] : null);
  const load = current?.loads?.find(
    (l: any) =>
      l.trip_id === trip?.id &&
      l.driver_id === order.driver_id &&
      l.branch_id === order.branch_id,
  );
  const allocation = load?.allocations?.find(
    (a: any) =>
      a.order_id === order.id && !["released", "returned"].includes(a.state),
  );
  function saving(value: boolean) {
    setPending(value);
    onPendingChange(value);
  }
  async function refresh() {
    if (pending) return;
    if (
      section.current?.querySelector('[data-unsaved="true"]') &&
      !(await confirmAction(
        "Discard the unsaved measurements and refresh this order’s LPG setup?",
        {
          title: "Discard unsaved changes?",
          confirmLabel: "Discard and refresh",
          destructive: true,
        },
      ))
    )
      return;
    onDraftReset?.();
    setRevision((n) => n + 1);
  }
  function saved(kind: "calibration" | "load") {
    setRevision((n) => n + 1);
    onSaved(kind);
  }
  return (
    <section
      className="stack"
      ref={section}
      aria-label="Order vehicle LPG setup"
    >
      <p>
        <strong>{order.reference}</strong> ·{" "}
        {Number(
          (order.gas_lines ?? []).reduce(
            (n: number, g: any) => n + Number(g.grams),
            0,
          ),
        ) / 1000}{" "}
        kg
      </p>
      <button
        type="button"
        className="button secondary"
        disabled={pending || (!current && !error)}
        onClick={() => void refresh()}
      >
        Refresh gas readiness
      </button>
      {error && <Notice type="error" message={error} />}
      {!current && !error && (
        <p role="status">Checking this order’s vehicle, meter and gas load…</p>
      )}
      {current && !current.enabled && (
        <Notice
          type="error"
          message="LPG custody changes are disabled pending operational release approval."
        />
      )}
      {current && !trip && (
        <Notice
          type="error"
          message="Assign this driver a suitable branch vehicle and start the trip before recording its meter or load. Return to the order to review the assignment."
        />
      )}
      {current?.orderStatus &&
        !["assigned", "out_for_delivery"].includes(current.orderStatus) && (
          <Notice message="This order no longer needs new vehicle gas setup. Return to the order to review its current status." />
        )}
      {current?.enabled &&
        trip &&
        (!current.orderStatus ||
          ["assigned", "out_for_delivery"].includes(current.orderStatus)) && (
          <>
            <p>
              <strong>Driver:</strong> {trip.driver_name}
              <br />
              <strong>Vehicle:</strong> {trip.label}
            </p>
            {mode === "calibration" ? (
              user.role !== "owner" ? (
                <Notice
                  type="error"
                  message="An authorised, qualified Business Owner must renew meter calibration."
                />
              ) : (
                <>
                  {meters.length > 1 && (
                    <label>
                      <FieldCaption required>Vehicle meter</FieldCaption>
                      <select
                        value={meterId}
                        disabled={pending}
                        onChange={(e) => setMeterId(e.target.value)}
                      >
                        <option value="">Choose the vehicle meter</option>
                        {meters.map((m: any) => (
                          <option key={m.id} value={m.id}>
                            {m.serial}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  {!meters.length && (
                    <Notice
                      type="error"
                      message="This vehicle has no active registered meter. The Business Owner must register its actual calibrated meter in Dispatch before it can be renewed."
                    />
                  )}
                  {meter && (
                    <>
                      <p>
                        <strong>Meter:</strong> {meter.serial}
                        <br />
                        Current calibration expires{" "}
                        {new Date(meter.calibration_expires_at).toLocaleString(
                          "en-GB",
                          { timeZone: "Africa/Lagos" },
                        )}{" "}
                        Lagos time.
                      </p>
                      {load &&
                      load.meter_id === meter.id &&
                      load.state !== "reconciled" ? (
                        <Notice
                          type="error"
                          message="Reconcile this meter’s existing LPG custody before replacing its calibration evidence. Its load and return obligations remain in place."
                        />
                      ) : (
                        <OperationForm
                          key={`${scope}:${revision}:${meter.id}:${meter.calibration_expires_at}:${meter.calibration_reference}`}
                          action="bulk.meter.recalibrate"
                          mapRequest={(values) => ({
                            ...values,
                            orderContext: {
                              orderId: order.id,
                              tripId: trip.id,
                              version: Number(
                                current.orderVersion ?? order.tracking_version,
                              ),
                            },
                          })}
                          title="Renew meter calibration"
                          onPendingChange={saving}
                          onDone={() => saved("calibration")}
                          fields={[
                            {
                              name: "meterId",
                              label: "",
                              type: "hidden",
                              value: meter.id,
                            },
                            {
                              name: "expectedCalibrationExpiresAt",
                              label: "",
                              type: "hidden",
                              value: new Date(
                                meter.calibration_expires_at,
                              ).toISOString(),
                            },
                            {
                              name: "expectedCalibrationReference",
                              label: "",
                              type: "hidden",
                              value: meter.calibration_reference,
                            },
                            {
                              name: "calibrationReference",
                              label: "New calibration evidence reference",
                            },
                            {
                              name: "calibrationExpiresAt",
                              label: "New calibration expiry (your local time)",
                              type: "datetime-local",
                            },
                            {
                              name: "reason",
                              label: "Calibration evidence and reason",
                            },
                          ]}
                        />
                      )}
                    </>
                  )}
                </>
              )
            ) : !["owner", "finance"].includes(user.role) ? (
              <Notice
                type="error"
                message="An authorised, qualified owner or finance colleague must issue the measured load."
              />
            ) : allocation ? (
              <>
                <Notice
                  message={
                    load.state === "issued"
                      ? "LPG load issued for this order. The assigned driver must independently check the loaded mass and starting meter reading, then confirm receipt in Trip & custody → LPG. Refresh here after confirmation."
                      : load.state === "active" &&
                          load.acknowledged_by === order.driver_id
                        ? "The driver confirmed load receipt. They can check this order’s allocated load and start delivery."
                        : "This order already has a gas allocation. Its current custody requires review before delivery."
                  }
                />
                <p>
                  Allocated gas: {Number(allocation.grams) / 1000} kg · Load
                  status: {load.state.replaceAll("_", " ")}
                </p>
              </>
            ) : load ? (
              <Notice
                type="error"
                message="This trip already has an LPG load. Review its available stock and existing allocation or same-visit extra-order workflow; do not issue a duplicate physical load."
              />
            ) : current.orders?.some((o: any) => o.id === order.id) ? (
              <LPGLoadIssue
                key={`${scope}:${revision}`}
                data={current}
                contextOrderId={order.id}
                onPendingChange={saving}
                onDone={() => saved("load")}
                onNeedCalibration={
                  user.role === "owner"
                    ? () => onAction("meter-calibration")
                    : undefined
                }
              />
            ) : (
              <Notice
                type="error"
                message="This order is not awaiting a new LPG allocation. Refresh the order to review its current status and custody."
              />
            )}
          </>
        )}
    </section>
  );
}
