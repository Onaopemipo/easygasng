"use client";
import { FieldCaption } from "./field-caption";
import { FormInput } from "./password-input";
import { VehicleManifestPanel } from "./vehicle-manifest-panel";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { api, Notice, money } from "./ui";
import { DoorstepActions } from "./doorstep-actions";
export function OperationForm({
  action,
  title,
  fields,
  onDone,
  mapRequest,
}: {
  action: string;
  title: string;
  fields: {
    name: string;
    label: string;
    type?: string;
    value?: string | number | boolean;
    optional?: boolean;
    options?: { value: string; label: string }[];
  }[];
  onDone?: (r: any) => void;
  mapRequest?: (data: Record<string, any>) => Record<string, any>;
}) {
  const [error, setError] = useState(""),
    [result, setResult] = useState<any>(null),
    [busy, setBusy] = useState(false);
  const pending = useRef<{ fingerprint: string; key: string } | null>(null);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget),
      data: any = {};
    try {
      for (const field of fields) {
        const raw = String(f.get(field.name) ?? "");
        if (field.optional && raw === "") continue;
        data[field.name] =
          field.type === "csv"
            ? raw
                .split(",")
                .map((value) => value.trim())
                .filter(Boolean)
            : field.type === "number"
              ? Number(raw)
              : field.type === "checkbox"
                ? raw === "on"
                : field.type === "datetime-local"
                  ? new Date(raw).toISOString()
                  : raw;
      }
      const request = mapRequest ? mapRequest(data) : data;
      const fingerprint = JSON.stringify(request);
      if (pending.current?.fingerprint !== fingerprint)
        pending.current = { fingerprint, key: crypto.randomUUID() };
      const r = await api(action, {
        ...request,
        operationKey: pending.current!.key,
      });
      setResult(r);
      pending.current = null;
      onDone?.(r);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="panel stack product-form" onSubmit={submit}>
      <h3>{title}</h3>
      {fields.map((f) => (
        <label key={f.name} data-field-type={f.type ?? "text"}>
          {f.type !== "hidden" && <FieldCaption required={f.type !== "checkbox" && !f.optional}>{f.label}</FieldCaption>}
          {f.options ? (
            <select
              name={f.name}
              defaultValue={typeof f.value === "boolean" ? undefined : f.value}
              required={!f.optional}
            >
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : (
            <FormInput
              name={f.name}
              type={f.type === "csv" ? "text" : (f.type ?? "text")}
              defaultChecked={
                f.type === "checkbox" ? Boolean(f.value) : undefined
              }
              defaultValue={typeof f.value === "boolean" ? undefined : f.value}
              required={f.type !== "checkbox" && !f.optional}
              step={f.type === "number" ? "any" : undefined}
            />
          )}
        </label>
      ))}
      {error && <Notice type="error" message={error} />}
      <button className="button" disabled={busy}>
        {busy ? "Saving…" : title}
      </button>
      {result && (
        <Notice
          message={
            result.message ??
            (result.queued
              ? "Queued; delivery is not yet confirmed."
              : "Saved. Refresh the current record before the next action.")
          }
        />
      )}
    </form>
  );
}
export function FleetPanel({ user }: { user: any }) {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [version, setVersion] = useState(0);
  useEffect(() => {
    api("fleet.summary")
      .then(setData)
      .catch((e) => setError(e.message));
  }, [version]);
  const refresh = () => setVersion((v) => v + 1);
  return (
    <details className="panel">
      <summary>Driver trips, vehicle and fuel records</summary>
      {error && <Notice type="error" message={error} />}
      <p>
        GPS records show observed locations only. Fuel purchases and estimated
        usage are reported separately.
      </p>
      {user.role === "owner" && (
        <OperationForm
          title="Register vehicle"
          action="fleet.vehicle.create"
          onDone={refresh}
          fields={[
            {
              name: "branchId",
              label: "Branch ID",
              value: user.branch_id ?? "lagos",
            },
            { name: "label", label: "Vehicle registration / label" },
            {
              name: "physicalCapacityGrams",
              label: "Approved physical product payload capacity (grams)",
              type: "number",
              optional: true,
            },
            {
              name: "estimatedLitresPer100km",
              label: "Measured estimated fuel use (litres per100km)",
              type: "number",
              optional: true,
            },
            {
              name: "capacityGrams",
              label: "Approved gas capacity (grams)",
              type: "number",
            },
            {
              name: "lpgSuitable",
              label: "Verified suitable for LPG transport",
              type: "checkbox",
            },
          ]}
        />
      )}
      {user.role === "driver" && data && (
        <>
          <OperationForm
            title="Start duty trip"
            action="trip.start"
            onDone={refresh}
            fields={[
              {
                name: "vehicleId",
                label: "Vehicle",
                options: data.vehicles
                  .filter((v: any) => v.active)
                  .map((v: any) => ({ value: v.id, label: v.label })),
              },
              {
                name: "startOdometer",
                label: "Start odometer (km)",
                type: "number",
              },
              {
                name: "locationConsent",
                label: "Allow location capture during this active trip",
                type: "checkbox",
              },
            ]}
          />
          {data.trips
            .filter((t: any) => !t.ended_at)
            .map((t: any) => (
              <section key={t.id}>
                <p>Active trip: {t.id}</p>
                <TripInputs trip={t} onDone={refresh} />
              </section>
            ))}
        </>
      )}
      {data?.trips.map((t: any) => (
        <article className="panel" key={t.id}>
          <h3>{t.label}</h3>
          <p>
            {t.ended_at ? "Ended" : "Active"} ·{" "}
            {t.connectivity.replaceAll("_", " ")}
          </p>
          <p>
            GPS status:{" "}
            {t.location?.status?.replaceAll("_", " ") ?? "unavailable"}. This is
            not a live position.
          </p>
          {t.location?.lastKnown && (
            <p>
              Last recorded:{" "}
              {new Date(t.location.lastKnown.recordedAt).toLocaleString(
                "en-NG",
                { timeZone: "Africa/Lagos" },
              )}{" "}
              (Lagos) · {t.location.lastKnown.lat}, {t.location.lastKnown.lng} ·
              accuracy ±{t.location.lastKnown.accuracy} m ·{" "}
              {t.location.lastKnown.ageSeconds} seconds old
              {t.location.lastKnown.delayedUpload
                ? " · uploaded after an offline delay"
                : ""}
              . Received:{" "}
              {new Date(t.location.lastKnown.receivedAt).toLocaleString(
                "en-NG",
                { timeZone: "Africa/Lagos" },
              )}
              .
            </p>
          )}
          {!!t.location?.history?.length && (
            <details>
              <summary>
                Recorded GPS history ({t.location.history.length}
                {t.location.historyTruncated
                  ? " most recent points"
                  : " points"}
                )
              </summary>
              <p>
                Observations only; gaps are not interpolated and uploads are not
                live positions.
              </p>
              <ol>
                {t.location.history.map((p: any, i: number) => (
                  <li key={i}>
                    {new Date(p.recordedAt).toLocaleString("en-NG", {
                      timeZone: "Africa/Lagos",
                    })}{" "}
                    (Lagos) · {p.lat}, {p.lng} · ±{p.accuracy} m
                  </li>
                ))}
              </ol>
            </details>
          )}
          <p>
            Odometer: {t.metrics.odometerKm ?? "Not ended"} km · GPS observed:{" "}
            {t.metrics.gpsObservedKm} km · Gaps: {t.metrics.gaps} · Rejected
            points: {t.metrics.rejected}
          </p>
          <p>
            Estimated litres:{" "}
            {t.metrics.estimatedLitres ?? "No approved estimate rate"}
          </p>
          {t.fuelPurchases.map((p: any, i: number) => (
            <p key={i}>
              {p.litres} litres purchased · {money(p.costKobo)} · {p.receipt}
            </p>
          ))}
        </article>
      ))}
    </details>
  );
}
function TripInputs({ trip, onDone }: { trip: any; onDone: () => void }) {
  const [error, setError] = useState("");
  const pendingFuel = useRef<{ fingerprint: string; request: any } | null>(
    null,
  );
  async function fuel(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    try {
      const fingerprint = JSON.stringify([
        trip.id,
        fd.get("litres"),
        fd.get("cost"),
        fd.get("receipt"),
      ]);
      if (
        !pendingFuel.current ||
        pendingFuel.current.fingerprint !== fingerprint
      ) {
        const request = {
          tripId: trip.id,
          operationKey: crypto.randomUUID(),
          events: [
            {
              id: crypto.randomUUID(),
              sequence: trip.nextSequence,
              kind: "fuel",
              recordedAt: new Date().toISOString(),
              payload: {
                litres: Number(fd.get("litres")),
                costKobo: Math.round(Number(fd.get("cost")) * 100),
                receipt: String(fd.get("receipt")),
              },
            },
          ],
        };
        pendingFuel.current = { fingerprint, request };
      }
      await api("trip.sync", pendingFuel.current.request);
      pendingFuel.current = null;
      onDone();
    } catch (e: any) {
      setError(e.message);
    }
  }
  return (
    <>
      <form className="panel stack" onSubmit={fuel}>
        <h3>Fuel purchase</h3>
        <label>
          <FieldCaption required={true}>Litres</FieldCaption>
          <FormInput type="number" name="litres" step="0.01" min="0.01" required />
        </label>
        <label>
          <FieldCaption required={true}>Cost (₦)</FieldCaption>
          <FormInput type="number" name="cost" min="1" required />
        </label>
        <label>
          <FieldCaption required={true}>Receipt reference</FieldCaption>
          <FormInput name="receipt" minLength={5} required />
        </label>
        <button className="button">Record purchase</button>
        {error && <Notice type="error" message={error} />}
      </form>
      <OperationForm
        title="End trip"
        action="trip.end"
        onDone={onDone}
        fields={[
          { name: "tripId", label: "Trip ID", value: trip.id },
          { name: "endOdometer", label: "End odometer (km)", type: "number" },
        ]}
      />
    </>
  );
}
export function BulkLPGPanel({ user }: { user: any }) {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [tick, setTick] = useState(0);
  useEffect(() => {
    let current = true;
    api("bulk.summary")
      .then((value) => {
        if (current) setData(value);
      })
      .catch((e) => {
        if (current) setError(e.message);
      });
    return () => {
      current = false;
    };
  }, [tick]);
  const refresh = () => setTick((v) => v + 1);
  const staff = ["owner", "finance"].includes(user.role);
  return (
    <details className="panel">
      <summary>Bulk LPG loading, dispensing and returns</summary>
      {error && <Notice type="error" message={error} />}
      <p>
        All measurements are mass in grams. Vehicle LPG remains included in
        branch stock. Buffer is reserved and cannot be sold as an unapproved
        doorstep addition.
      </p>
      {data && !data.enabled && (
        <p>
          Operational release approval is required before custody changes.
          History remains available.
        </p>
      )}
      {data?.enabled && user.role === "owner" && (
        <OperationForm
          title="Register calibrated mass meter"
          action="bulk.meter.register"
          onDone={refresh}
          fields={[
            { name: "vehicleId", label: "Vehicle ID" },
            { name: "serial", label: "Meter serial" },
            {
              name: "calibrationReference",
              label: "Calibration evidence reference",
            },
            {
              name: "calibrationExpiresAt",
              label: "Calibration expiry",
              type: "datetime-local",
            },
          ]}
        />
      )}
      {data?.enabled && staff && (
        <OperationForm
          title="Issue measured LPG load"
          action="bulk.load.issue"
          onDone={refresh}
          fields={[
            { name: "tripId", label: "Active trip ID" },
            { name: "meterId", label: "Calibrated meter ID" },
            {
              name: "grams",
              label: "Physically loaded mass (grams)",
              type: "number",
            },
            {
              name: "meterReadingGrams",
              label: "Initial cumulative meter reading (grams)",
              type: "number",
            },
            {
              name: "orderIds",
              label:
                "Assigned order IDs, separated by commas (optional buffer-only load)",
              type: "csv",
              optional: true,
            },
            { name: "reason", label: "Loading evidence and reason" },
          ]}
        />
      )}
      {data?.enabled &&
        user.role === "owner" &&
        data?.meters?.map((meter: any) => (
          <details className="panel" key={meter.id}>
            <summary>
              Meter {meter.serial} — {meter.label}
            </summary>
            <p>
              {meter.active ? "Active" : "Retired"} · Calibration expires{" "}
              {new Date(meter.calibration_expires_at).toLocaleString()}
            </p>
            <p>Evidence: {meter.calibration_reference}</p>
            {meter.active &&
              ["recalibrate", "retire"].map((operation) => (
                <OperationForm
                  key={`${operation}:${meter.calibration_expires_at}:${meter.calibration_reference}`}
                  title={
                    operation === "retire"
                      ? "Retire unsafe meter"
                      : "Record renewed calibration"
                  }
                  action={`bulk.meter.${operation}`}
                  onDone={refresh}
                  fields={[
                    { name: "meterId", label: "Meter ID", value: meter.id },
                    {
                      name: "expectedCalibrationExpiresAt",
                      label: "Current certificate expiry",
                      value: new Date(
                        meter.calibration_expires_at,
                      ).toISOString(),
                    },
                    {
                      name: "expectedCalibrationReference",
                      label: "Current calibration reference",
                      value: meter.calibration_reference,
                    },
                    ...(operation === "recalibrate"
                      ? [
                          {
                            name: "calibrationReference",
                            label: "New calibration evidence reference",
                          },
                          {
                            name: "calibrationExpiresAt",
                            label: "New expiry",
                            type: "datetime-local",
                          },
                        ]
                      : []),
                    { name: "reason", label: "Evidence and reason" },
                  ]}
                />
              ))}
          </details>
        ))}
      {data?.loads.map((load: any) => {
        const context = [
          { name: "loadId", label: "Load ID", value: load.id },
          {
            name: "version",
            label: "Current load version",
            value: load.version,
            type: "number",
          },
        ];
        return (
          <article className="panel" key={load.id}>
            <h3>
              {load.label} · {load.state}
            </h3>
            <p>
              Load {load.id} · Meter {load.meter_id} · Trip {load.trip_id}
            </p>
            <p>
              {Number(load.loaded_grams) / 1000} kg loaded ·{" "}
              {Number(load.dispensed_grams) / 1000} kg dispensed ·{" "}
              {Number(load.buffer_grams) / 1000} kg reserved buffer
            </p>
            {load.state === "held" && (
              <Notice
                type="error"
                message="Return discrepancy recorded. Custody and trip closure are held for independent physical and financial review; no stock adjustment has been invented."
              />
            )}
            <ul>
              {load.allocations.map((a: any) => (
                <li key={a.order_id}>
                  {a.reference} · {Number(a.grams) / 1000} kg · {a.state}
                </li>
              ))}
            </ul>
            {data.enabled &&
              user.role === "driver" &&
              load.state === "active" &&
              load.allocations
                .filter(
                  (a: any) =>
                    a.state === "allocated" &&
                    a.payment_method === "cash_on_delivery",
                )
                .map((allocation: any) => (
                  <OperationForm
                    key={`${allocation.order_id}-cash`}
                    title={`Record actual cash collected · ${allocation.reference}`}
                    action="bulk.collection.record"
                    onDone={refresh}
                    fields={[
                      ...context,
                      {
                        name: "orderId",
                        label: "Order ID",
                        value: allocation.order_id,
                      },
                      {
                        name: "amountKobo",
                        label: "Cash actually collected (kobo)",
                        type: "number",
                      },
                      { name: "reason", label: "Collection evidence" },
                    ]}
                  />
                ))}
            {data.enabled &&
              user.role === "driver" &&
              load.state === "issued" && (
                <OperationForm
                  key={`${load.id}-${load.version}-ack`}
                  title="Acknowledge measured load"
                  action="bulk.load.acknowledge"
                  onDone={refresh}
                  fields={[
                    ...context,
                    {
                      name: "returnGrams",
                      label: "Independently observed loaded mass (grams)",
                      type: "number",
                    },
                    {
                      name: "meterReadingGrams",
                      label: "Observed cumulative meter reading (grams)",
                      type: "number",
                    },
                    { name: "reason", label: "Measurement evidence" },
                  ]}
                />
              )}
            {data.enabled &&
              user.role === "driver" &&
              load.state === "active" &&
              load.allocations.some((a: any) => a.state === "allocated") && (
                <OperationForm
                  key={`${load.id}-${load.version}-dispense`}
                  title="Record authorised metered dispensing"
                  action="bulk.dispense"
                  onDone={refresh}
                  fields={[
                    ...context,
                    {
                      name: "orderId",
                      label: "Reserved order",
                      options: load.allocations
                        .filter((a: any) => a.state === "allocated")
                        .map((a: any) => ({
                          value: a.order_id,
                          label: a.reference,
                        })),
                    },
                    {
                      name: "meterReadingGrams",
                      label: "New cumulative mass meter reading (grams)",
                      type: "number",
                    },
                    { name: "reason", label: "Dispensing evidence" },
                  ]}
                />
              )}
            {data.enabled &&
              user.role === "driver" &&
              ["issued", "active"].includes(load.state) && (
                <OperationForm
                  key={`${load.id}-${load.version}-return`}
                  title="Declare measured LPG return"
                  action="bulk.return.declare"
                  onDone={refresh}
                  fields={[
                    ...context,
                    {
                      name: "returnGrams",
                      label: "Physically returned mass (grams)",
                      type: "number",
                    },
                    { name: "reason", label: "Return evidence" },
                  ]}
                />
              )}
            {data.enabled && staff && load.state === "returning" && (
              <OperationForm
                key={`${load.id}-${load.version}-receive`}
                title="Independently receive LPG return"
                action="bulk.return.receive"
                onDone={refresh}
                fields={[
                  ...context,
                  {
                    name: "returnGrams",
                    label: "Independently measured returned mass (grams)",
                    type: "number",
                  },
                  { name: "reason", label: "Receipt evidence" },
                ]}
              />
            )}
            {data.enabled && staff && load.state === "held" && (
              <OperationForm
                key={`${load.id}-${load.version}-recovery`}
                title="Submit measured discrepancy recovery for independent approval"
                action="bulk.recovery.request"
                onDone={refresh}
                fields={[
                  ...context,
                  {
                    name: "returnGrams",
                    label: "Fresh physically measured returned mass (grams)",
                    type: "number",
                  },
                  {
                    name: "observedAt",
                    label: "Time of fresh measurement",
                    type: "datetime-local",
                  },
                  {
                    name: "evidence",
                    label: "Measurement and investigation evidence reference",
                  },
                  {
                    name: "reason",
                    label: "Explain measured variance and proposed recovery",
                  },
                ]}
              />
            )}
            <details>
              <summary>Custody history</summary>
              <ul>
                {load.events.map((e: any, i: number) => (
                  <li key={i}>
                    {e.created_at} · {e.kind}
                  </li>
                ))}
              </ul>
            </details>
            {data.doorstepEnabled &&
              load.amendments?.map((m: any) => (
                <section className="panel" key={m.id}>
                  <h3>Consented doorstep addition</h3>
                  <DoorstepActions
                    Form={OperationForm}
                    orderId={m.order_id}
                    amendment={m}
                    user={user}
                    onDone={refresh}
                  />
                </section>
              ))}
          </article>
        );
      })}
    </details>
  );
}
export function DispatchPanel() {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [tick, setTick] = useState(0);
  useEffect(() => {
    api("dispatch.board")
      .then(setData)
      .catch((e) => setError(e.message));
  }, [tick]);
  return (
    <details className="panel">
      <summary>Area dispatch and driver recommendations</summary>
      {error && <Notice type="error" message={error} />}
      <p>
        Recommendations do not bypass payment, stock, cylinder or capacity
        checks. Automatic assignment is disabled.
      </p>
      {data?.orders.map((o: any) => (
        <article className="panel" key={o.id}>
          <h3>
            {o.reference} · {o.area}
          </h3>
          <p>
            {o.delivery_date} · {o.delivery_window}
          </p>
          <details>
            <summary>Confirm destination and calculate a road plan</summary>
            <p>
              Verify the pin against the complete delivery address. Routing uses
              current consented GPS and approved operating rates; it does not
              change the customer’s fee.
            </p>
            <OperationForm
              title="Confirm destination pin"
              action="dispatch.destination.confirm"
              onDone={() => setTick((v) => v + 1)}
              fields={[
                { name: "orderId", label: "Order ID", value: o.id },
                {
                  name: "version",
                  label: "Order version",
                  type: "number",
                  value: o.tracking_version,
                },
                {
                  name: "revision",
                  label: "Destination revision",
                  type: "number",
                  value: o.destination?.revision ?? 0,
                },
                {
                  name: "latitude",
                  label: "Verified latitude",
                  type: "number",
                  value: o.destination?.latitude,
                },
                {
                  name: "longitude",
                  label: "Verified longitude",
                  type: "number",
                  value: o.destination?.longitude,
                },
                {
                  name: "evidence",
                  label: "How the address and pin were verified",
                },
              ]}
            />
            {o.recommendations.length > 0 && (
              <OperationForm
                title="Calculate road plan"
                action="dispatch.route.estimate"
                onDone={() => setTick((v) => v + 1)}
                fields={[
                  { name: "orderId", label: "Order ID", value: o.id },
                  {
                    name: "driverId",
                    label: "Eligible driver",
                    options: o.recommendations
                      .filter((r: any) => r.eligible)
                      .map((r: any) => ({ value: r.driverId, label: r.name })),
                  },
                ]}
              />
            )}
            {o.routeEstimates?.map((e: any) => (
              <p key={e.id}>
                Estimate {e.id}: {(Number(e.metres) / 1000).toFixed(1)} km ·{" "}
                {Math.ceil(Number(e.seconds) / 60)} minutes driving · ₦
                {(Number(e.operating_kobo) / 100).toLocaleString()} planned
                operating cost · {e.plan.lateStops} late stops · expires{" "}
                {new Date(e.expires_at).toLocaleTimeString()}. Revalidated on
                assignment.
              </p>
            ))}
          </details>
          {o.recommendations.length ? (
            <OperationForm
              title="Assign eligible driver"
              action={
                o.status === "assigned"
                  ? "dispatch.reassign"
                  : "dispatch.assign"
              }
              onDone={() => setTick((v) => v + 1)}
              fields={[
                { name: "orderId", label: "Order ID", value: o.id },
                {
                  name: "version",
                  label: "Current order version",
                  type: "number",
                  value: o.tracking_version,
                },
                {
                  name: "driverId",
                  label: "Driver",
                  options: o.recommendations
                    .filter((r: any) => r.eligible)
                    .map((r: any) => ({
                      value: r.driverId,
                      label: `${r.name} · ${r.remainingGrams / 1000} kg capacity remaining`,
                    })),
                },
                { name: "reason", label: "Assignment reason" },
                {
                  name: "routeEstimateId",
                  label:
                    "Road estimate ID (optional; omit for audited manual dispatch)",
                  optional: true,
                },
              ]}
            />
          ) : (
            <p>
              No suitable active driver trip. Start a verified vehicle trip
              before enhanced assignment.
            </p>
          )}
        </article>
      ))}
    </details>
  );
}
export function CRMPanel({ user }: { user: any }) {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [tick, setTick] = useState(0),
    [query, setQuery] = useState(""),
    [search, setSearch] = useState(""),
    [loadingMore, setLoadingMore] = useState(false);
  const generation = useRef(0);
  useEffect(() => {
    const tag = ++generation.current,
      controller = new AbortController();
    setData(null);
    setError("");
    api(
      "crm.summary?" + new URLSearchParams({ q: query, limit: "50" }),
      undefined,
      { signal: controller.signal },
    )
      .then((r) => {
        if (tag === generation.current) setData(r);
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => {
      controller.abort();
      generation.current++;
    };
  }, [tick, query]);
  return (
    <details className="panel">
      <summary>Retention and win-back follow-ups</summary>
      {error && <Notice type="error" message={error} />}
      <p>
        Segments use delivered, payment-verified orders. Low-data customers are
        not classified as dormant. Marketing requires separate channel consent.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setQuery(search.trim());
          setTick((v) => v + 1);
        }}
      >
        <label>
          Search customer name or ID
          <FormInput value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>
        <button className="button secondary">Search</button>
      </form>
      {data?.customers.map((c: any) => (
        <article className="panel" key={c.id}>
          <h3>
            {c.name} · {c.public_customer_id}
          </h3>
          <p>
            {c.segment.replaceAll("_", " ")} · {c.completed_orders} qualifying
            orders
          </p>
          <OperationForm
            title="Schedule follow-up"
            action="crm.followup.create"
            onDone={() => setTick((v) => v + 1)}
            fields={[
              { name: "customerId", label: "Customer ID", value: c.id },
              { name: "ownerId", label: "Follow-up staff ID", value: user.id },
              {
                name: "dueAt",
                label: "Next contact date",
                type: "datetime-local",
              },
              { name: "nextAction", label: "Next action" },
            ]}
          />
          {Number(c.pending_winbacks) > 0 && (
            <OperationForm
              title="Cancel unsent win-back messages"
              action="crm.winback.cancel"
              onDone={() => setTick((v) => v + 1)}
              fields={[
                { name: "customerId", label: "Customer ID", value: c.id },
                { name: "reason", label: "Cancellation reason" },
              ]}
            />
          )}
          {["at_risk", "dormant"].includes(c.segment) && (
            <OperationForm
              title="Queue consented win-back"
              action="crm.winback.queue"
              fields={[
                { name: "customerId", label: "Customer ID", value: c.id },
                {
                  name: "channel",
                  label: "Channel",
                  options: [
                    { value: "sms", label: "SMS" },
                    { value: "whatsapp", label: "WhatsApp" },
                  ],
                },
              ]}
            />
          )}
        </article>
      ))}
      {data?.hasMore && (
        <button
          className="button secondary"
          disabled={loadingMore}
          onClick={async () => {
            const tag = generation.current;
            setLoadingMore(true);
            try {
              const next = await api(
                "crm.summary?" +
                  new URLSearchParams({
                    q: query,
                    after: data.nextCursor,
                    limit: "50",
                  }),
              );
              if (tag !== generation.current) return;
              setData((old: any) => ({
                ...next,
                customers: [...old.customers, ...next.customers],
                followups: old.followups,
                followupsHasMore: old.followupsHasMore,
                followupsNextCursor: old.followupsNextCursor,
              }));
            } catch (e: any) {
              setError(e.message);
            } finally {
              setLoadingMore(false);
            }
          }}
        >
          Load more customers
        </button>
      )}
      <p>
        Follow-ups in your authorised scope, ordered by due date. Load more to
        review earlier or later records.
      </p>
      {data?.followups.map((f: any) => (
        <article key={f.id} className="panel">
          <h3>{f.customer_name}</h3>
          <p>
            {f.next_action} · {new Date(f.due_at).toLocaleString()}
          </p>
          {f.outcome ? (
            <p>{f.outcome}</p>
          ) : (
            <OperationForm
              title="Record follow-up outcome"
              action="crm.followup.outcome"
              onDone={() => setTick((v) => v + 1)}
              fields={[
                { name: "followupId", label: "Follow-up ID", value: f.id },
                { name: "outcome", label: "Outcome" },
              ]}
            />
          )}
        </article>
      ))}
      {data?.followupsHasMore && (
        <button
          className="button secondary"
          disabled={loadingMore}
          onClick={async () => {
            const tag = generation.current;
            setLoadingMore(true);
            try {
              const page = await api(
                "crm.followups?" +
                  new URLSearchParams({
                    q: query,
                    after: data.followupsNextCursor,
                    limit: "100",
                  }),
              );
              if (tag === generation.current)
                setData((old: any) => ({
                  ...old,
                  followups: [...old.followups, ...page.followups],
                  followupsHasMore: page.hasMore,
                  followupsNextCursor: page.nextCursor,
                }));
            } catch (e: any) {
              if (tag === generation.current) setError(e.message);
            } finally {
              setLoadingMore(false);
            }
          }}
        >
          Load more follow-ups
        </button>
      )}
    </details>
  );
}
export function OperationsExtensions({
  section,
  user,
}: {
  section: string;
  user: any;
}) {
  if (section === "deliveries")
    return (
      <>
        {["owner", "manager", "finance", "driver"].includes(user.role) && (
          <VehicleManifestPanel user={user} Form={OperationForm} />
        )}
        {["owner", "manager", "finance", "driver"].includes(
          user.role,
        ) && <BulkLPGPanel user={user} />}
        {["owner", "manager"].includes(user.role) && (
          <DispatchPanel />
        )}
        {["owner", "manager", "finance", "driver"].includes(
          user.role,
        ) && <FleetPanel user={user} />}
      </>
    );
  if (
    section === "customers" &&
    ["owner", "manager"].includes(user.role)
  )
    return <CRMPanel user={user} />;
  return null;
}

export function ChannelPreferences() {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState("");
  function load() {
    api("channels.preferences")
      .then(setData)
      .catch((e) => setError(e.message));
  }
  useEffect(load, []);
  return (
    <details className="panel">
      <summary>SMS and WhatsApp consent</summary>
      <p>
        Choose each purpose independently. Marketing is optional. Turning a
        purpose off cancels its pending messages.
      </p>
      {error && <Notice type="error" message={error} />}{" "}
      {data &&
        ["sms", "whatsapp"].flatMap((channel) =>
          ["transactional", "otp", "refill", "marketing"].map((purpose) => {
            const current = data.consents.find(
              (c: any) => c.channel === channel && c.purpose === purpose,
            );
            return (
              <OperationForm
                key={`${channel}:${purpose}:${current?.version ?? 0}`}
                action="channels.consent"
                title={`Update ${channel} ${purpose} consent`}
                onDone={load}
                fields={[
                  { name: "channel", label: "Channel", value: channel },
                  { name: "purpose", label: "Purpose", value: purpose },
                  {
                    name: "enabled",
                    label: `Allow ${purpose} messages on ${channel}`,
                    type: "checkbox",
                    value: current?.enabled ?? false,
                  },
                  {
                    name: "evidence",
                    label: "Preference record",
                    value: "Customer changed consent in account settings",
                  },
                ]}
              />
            );
          }),
        )}
    </details>
  );
}
