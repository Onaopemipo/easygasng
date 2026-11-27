"use client";
import React, { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
  Search,
  Truck,
} from "lucide-react";
import { api, Loading, Modal, Notice, money } from "./ui";
import { TripLPGOrders } from "./lpg-setup-access";

const roles = ["owner", "manager", "finance", "driver"];
const pageSize = 10;
const number = (value: unknown) =>
  Number(value).toLocaleString("en-NG", { maximumFractionDigits: 3 });
const kg = (value: unknown) =>
  value == null ? "Not configured" : `${number(Number(value) / 1000)} kg`;
const time = (value: any) =>
  value
    ? new Date(value).toLocaleString("en-NG", {
        timeZone: "Africa/Lagos",
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";
const shortId = (value: string) => value?.slice(0, 8).toUpperCase() ?? "—";

export function vehicleRegistrationRequest(data: Record<string, any>) {
  const { capacityKg, physicalCapacityKg, ...rest } = data;
  const toGrams = (value: number) => {
    const grams = value * 1000;
    if (
      !Number.isFinite(grams) ||
      Math.abs(grams - Math.round(grams)) > 0.000001
    )
      throw new Error(
        "Enter capacities in kilograms with no more than three decimal places.",
      );
    return Math.round(grams);
  };
  return {
    ...rest,
    capacityGrams: toGrams(capacityKg),
    ...(physicalCapacityKg === undefined
      ? {}
      : { physicalCapacityGrams: toGrams(physicalCapacityKg) }),
  };
}

export function FleetWorkspace({
  user,
  Form,
  TripActions,
}: {
  user: any;
  Form: React.ComponentType<any>;
  TripActions: React.ComponentType<any>;
}) {
  const scope = JSON.stringify([
    user.id,
    user.role,
    user.branch_id ?? user.branchId,
  ]);
  const [snapshot, setSnapshot] = useState<{
    scope: string;
    data: any;
    updated: string;
  } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [tab, setTab] = useState<"trips" | "vehicles">("trips");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [dialog, setDialog] = useState<"register" | "start" | string | null>(
    null,
  );
  const allowed = roles.includes(user.role);
  const data = snapshot?.scope === scope ? snapshot.data : null;
  useEffect(() => {
    setDialog(null);
    setQuery("");
    setStatus("");
    setPage(1);
  }, [scope]);
  useEffect(() => {
    if (!allowed) return;
    let active = true;
    setLoading(true);
    setError("");
    api("fleet.summary")
      .then((data) => {
        if (active)
          setSnapshot({ scope, data, updated: new Date().toISOString() });
      })
      .catch((e) => {
        if (!active) return;
        setError(e.message);
        if ([401, 403].includes(e.status)) setSnapshot(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [scope, revision, allowed]);
  const refresh = () => setRevision((n) => n + 1);
  const saved = () => {
    setDialog(null);
    refresh();
  };
  const trips = data?.trips ?? [];
  const vehicles = data?.vehicles ?? [];
  const activeTrip = trips.find(
    (t: any) => !t.ended_at && t.driver_id === user.id,
  );
  const branchName = (id: string) =>
    data?.branches?.find((b: any) => b.id === id)?.name ?? id;
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (tab === "trips" ? trips : vehicles).filter((row: any) => {
      const matches = [row.label, row.id, row.branch_id].some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(needle),
      );
      const state =
        tab === "trips"
          ? row.ended_at
            ? "ended"
            : "active"
          : row.active
            ? "active"
            : "inactive";
      return matches && (!status || state === status);
    });
  }, [data, tab, query, status]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages);
  const rows = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const trip = trips.find((t: any) => t.id === dialog);
  const startVehicles = vehicles.filter(
    (v: any) =>
      v.active &&
      v.lpg_suitable &&
      v.branch_id === (user.branch_id ?? user.branchId),
  );
  if (!allowed)
    return (
      <Notice type="error" message="You do not have access to fleet records." />
    );
  return (
    <section
      className="fleet-workspace"
      id="driver-fleet"
      aria-label="Fleet and trips"
    >
      <header className="fleet-heading">
        <div>
          <span className="fleet-eyebrow">DELIVERY OPERATIONS</span>
          <h2>Fleet &amp; trips</h2>
          <p>Vehicles, duty trips and fuel records in one place.</p>
        </div>
        <div className="fleet-actions">
          <button
            type="button"
            className="button secondary"
            onClick={refresh}
            disabled={loading}
            aria-label="Refresh fleet records"
          >
            <RefreshCw size={17} /> Refresh
          </button>
          {user.role === "owner" && (
            <button
              type="button"
              className="button"
              disabled={!data}
              onClick={() => setDialog("register")}
            >
              <Plus size={18} /> Register vehicle
            </button>
          )}
          {user.role === "driver" && !activeTrip && (
            <button
              type="button"
              className="button"
              disabled={!data || !startVehicles.length}
              onClick={() => setDialog("start")}
            >
              <Plus size={18} /> Start duty trip
            </button>
          )}
        </div>
      </header>
      {error && <Notice type="error" message={error} />}
      {error && data && (
        <p className="muted" role="status">
          Showing the last successful snapshot. Refresh to try again.
        </p>
      )}
      {!data && !error && <Loading label="Loading fleet records" />}
      {data && (
        <>
          <div className="fleet-summary" aria-label="Fleet summary">
            <div>
              <span>Registered vehicles</span>
              <strong>{vehicles.length}</strong>
            </div>
            <div>
              <span>Active trips</span>
              <strong>{trips.filter((t: any) => !t.ended_at).length}</strong>
            </div>
            <div>
              <span>Recorded trips</span>
              <strong>{trips.length}</strong>
            </div>
            <p>
              {loading
                ? "Refreshing records…"
                : `Updated ${time(snapshot?.updated)} (Lagos)`}
            </p>
          </div>
          {user.role === "driver" && !activeTrip && !startVehicles.length && (
            <Notice message="No active LPG-suitable vehicle is available in your branch. Ask the business owner to register or verify a suitable vehicle before starting a trip." />
          )}
          {activeTrip && user.role === "driver" && (
            <div className="fleet-current">
              <div>
                <strong>Your active trip · {activeTrip.label}</strong>
                <span>Started {time(activeTrip.started_at)} (Lagos)</span>
              </div>
              <button
                className="button secondary"
                onClick={() => setDialog(activeTrip.id)}
              >
                Manage trip
              </button>
            </div>
          )}
          <div className="fleet-records">
            <div className="fleet-records-top">
              <div
                className="fleet-tabs"
                role="group"
                aria-label="Fleet record type"
              >
                {(
                  [
                    ["trips", "Trips"],
                    ["vehicles", "Vehicles"],
                  ] as const
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={tab === key}
                    onClick={() => {
                      setTab(key);
                      setStatus("");
                      setPage(1);
                    }}
                    className={tab === key ? "selected" : ""}
                  >
                    {label}
                    <span>
                      {key === "trips" ? trips.length : vehicles.length}
                    </span>
                  </button>
                ))}
              </div>
              <p>
                {tab === "trips"
                  ? "Latest 100 trips · Lagos time"
                  : "Registered vehicles · capacities in kg"}
              </p>
            </div>
            <div className="fleet-filters">
              <label className="fleet-search">
                <Search size={18} />
                <span className="sr-only">Search fleet records</span>
                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder={
                    tab === "trips"
                      ? "Search vehicle, trip ID or branch"
                      : "Search registration or branch"
                  }
                />
              </label>
              <label>
                <span className="sr-only">Record status</span>
                <select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All statuses</option>
                  <option value="active">Active</option>
                  <option value={tab === "trips" ? "ended" : "inactive"}>
                    {tab === "trips" ? "Ended" : "Inactive"}
                  </option>
                </select>
              </label>
            </div>
            {!rows.length ? (
              <div className="fleet-empty">
                <Truck size={28} />
                <h3>
                  {query || status
                    ? "No matching records"
                    : tab === "trips"
                      ? "No trips recorded yet"
                      : "No vehicles registered yet"}
                </h3>
                <p>
                  {query || status
                    ? "Try a different search or clear the filters."
                    : tab === "trips"
                      ? "Trips appear here when a driver starts duty."
                      : "Registered vehicles will appear here with their approved capacities."}
                </p>
                {(query || status) && (
                  <button
                    className="button secondary"
                    onClick={() => {
                      setQuery("");
                      setStatus("");
                      setPage(1);
                    }}
                  >
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              <div
                className="fleet-table-scroll"
                tabIndex={0}
                aria-label={
                  tab === "trips"
                    ? "Trip records, scroll horizontally if needed"
                    : "Vehicle records, scroll horizontally if needed"
                }
              >
                {tab === "trips" ? (
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">Vehicle / trip</th>
                        <th scope="col">Started</th>
                        <th scope="col">Status</th>
                        <th scope="col">Distance</th>
                        <th scope="col">GPS evidence</th>
                        <th scope="col">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((t: any) => (
                        <tr key={t.id}>
                          <td>
                            <strong>{t.label}</strong>
                            <small>
                              {branchName(t.branch_id)} · Trip {shortId(t.id)}
                            </small>
                          </td>
                          <td>{time(t.started_at)}</td>
                          <td>
                            <span
                              className={`fleet-badge ${t.ended_at ? "neutral" : "good"}`}
                            >
                              {t.ended_at ? "Ended" : "Active"}
                            </span>
                          </td>
                          <td>
                            {t.metrics?.odometerKm == null
                              ? "In progress"
                              : `${number(t.metrics.odometerKm)} km`}
                          </td>
                          <td>
                            <span className="fleet-location">
                              {t.ended_at
                                ? "Trip ended"
                                : t.location?.lastKnown
                                  ? "Recorded location"
                                  : "Unavailable"}
                            </span>
                            <small>
                              {t.location?.lastKnown
                                ? `${number(t.location.lastKnown.ageSeconds)} seconds old`
                                : "No current fix"}
                            </small>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="fleet-text-button"
                              onClick={() => setDialog(t.id)}
                              aria-label={`View trip ${shortId(t.id)} for ${t.label}`}
                            >
                              View details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">Vehicle</th>
                        <th scope="col">Branch</th>
                        <th scope="col">Status</th>
                        <th scope="col">LPG capacity</th>
                        <th scope="col">Product payload</th>
                        <th scope="col">LPG suitability</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((v: any) => (
                        <tr key={v.id}>
                          <td>
                            <strong>{v.label}</strong>
                            <small>{shortId(v.id)}</small>
                          </td>
                          <td>{branchName(v.branch_id)}</td>
                          <td>
                            <span
                              className={`fleet-badge ${v.active ? "good" : "neutral"}`}
                            >
                              {v.active ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td>{kg(v.capacity_grams)}</td>
                          <td>{kg(v.physical_capacity_grams)}</td>
                          <td>
                            <span
                              className={`fleet-badge ${v.lpg_suitable ? "good" : "warning"}`}
                            >
                              {v.lpg_suitable ? "Verified" : "Not verified"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
            <footer className="fleet-pagination">
              <span>
                {filtered.length
                  ? `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, filtered.length)} of ${filtered.length}`
                  : "0 records"}
              </span>
              <div>
                <button
                  type="button"
                  aria-label="Previous fleet page"
                  disabled={currentPage <= 1}
                  onClick={() => setPage(currentPage - 1)}
                >
                  <ChevronLeft size={18} />
                </button>
                <span>
                  Page {currentPage} of {pages}
                </span>
                <button
                  type="button"
                  aria-label="Next fleet page"
                  disabled={currentPage >= pages}
                  onClick={() => setPage(currentPage + 1)}
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </footer>
          </div>
          <p className="fleet-footnote">
            GPS records are observations, not live positions. Fuel purchases and
            estimated usage are kept separate.
          </p>
        </>
      )}
      {dialog === "register" && user.role === "owner" && data && (
        <Modal
          title="Register vehicle"
          className="fleet-dialog"
          onClose={() => setDialog(null)}
        >
          <p className="fleet-dialog-intro">
            Add a vehicle with its approved capacities. Enter kilograms; records
            are stored in grams.
          </p>
          <Form
            title="Register vehicle"
            action="fleet.vehicle.create"
            requireVerification
            onDone={saved}
            mapRequest={vehicleRegistrationRequest}
            fields={[
              { name: "label", label: "Registration / vehicle name" },
              {
                name: "branchId",
                label: "Branch",
                value: user.branch_id ?? user.branchId ?? "lagos",
                options: (data.branches ?? [])
                  .filter((b: any) => b.active)
                  .map((b: any) => ({ value: b.id, label: b.name })),
              },
              {
                name: "capacityKg",
                label: "Approved LPG capacity (kg)",
                type: "number",
              },
              {
                name: "physicalCapacityKg",
                label: "Approved product payload (kg)",
                type: "number",
                optional: true,
              },
              {
                name: "estimatedLitresPer100km",
                label: "Estimated fuel use (L / 100 km)",
                type: "number",
                optional: true,
              },
              {
                name: "lpgSuitable",
                label: "Verified suitable for LPG transport",
                type: "checkbox",
              },
            ]}
          />
        </Modal>
      )}
      {dialog === "start" && user.role === "driver" && !activeTrip && data && (
        <Modal
          title="Start duty trip"
          className="fleet-dialog"
          onClose={() => setDialog(null)}
        >
          <p className="fleet-dialog-intro">
            Choose an active, LPG-suitable vehicle in your branch. The server
            checks availability before starting.
          </p>
          <Form
            title="Start duty trip"
            action="trip.start"
            onDone={saved}
            fields={[
              {
                name: "vehicleId",
                label: "Vehicle",
                options: startVehicles.map((v: any) => ({
                  value: v.id,
                  label: v.label,
                })),
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
        </Modal>
      )}
      {trip && (
        <Modal
          title="Trip details"
          className="fleet-dialog fleet-trip-dialog"
          onClose={() => setDialog(null)}
        >
          <TripLPGOrders trip={trip} user={user} />
          <TripDetail trip={trip} branchName={branchName(trip.branch_id)} />
          {user.role === "driver" &&
            trip.driver_id === user.id &&
            !trip.ended_at && (
              <div className="fleet-trip-actions">
                <TripActions trip={trip} onDone={saved} />
              </div>
            )}
        </Modal>
      )}
    </section>
  );
}

function TripDetail({
  trip: t,
  branchName,
}: {
  trip: any;
  branchName: string;
}) {
  const fix = t.location?.lastKnown;
  return (
    <div className="fleet-trip-detail">
      <header>
        <h3>{t.label}</h3>
        <p>
          {branchName} · Trip {shortId(t.id)} ·{" "}
          {t.ended_at ? "Ended" : "Active"}
        </p>
      </header>
      <dl className="fleet-detail-grid">
        <div>
          <dt>Started (Lagos)</dt>
          <dd>{time(t.started_at)}</dd>
        </div>
        <div>
          <dt>Ended (Lagos)</dt>
          <dd>{time(t.ended_at)}</dd>
        </div>
        <div>
          <dt>Odometer distance</dt>
          <dd>
            {t.metrics?.odometerKm == null
              ? "Trip in progress"
              : `${number(t.metrics.odometerKm)} km`}
          </dd>
        </div>
        <div>
          <dt>GPS observed distance</dt>
          <dd>{number(t.metrics?.gpsObservedKm ?? 0)} km</dd>
        </div>
        <div>
          <dt>Estimated fuel usage</dt>
          <dd>
            {t.metrics?.estimatedLitres == null
              ? "No approved estimate rate"
              : `${number(t.metrics.estimatedLitres)} L`}
          </dd>
        </div>
        <div>
          <dt>GPS gaps / rejected points</dt>
          <dd>
            {t.metrics?.gaps ?? 0} / {t.metrics?.rejected ?? 0}
          </dd>
        </div>
      </dl>
      <section>
        <h4>Location evidence</h4>
        <p>
          {t.location?.status?.replaceAll("_", " ") ?? "Unavailable"} ·{" "}
          {t.connectivity?.replaceAll("_", " ") ?? "Location unavailable"}
        </p>
        <p className="muted">
          Recorded observations only. This is not a live position.
        </p>
        {fix && (
          <dl className="fleet-detail-grid">
            <div>
              <dt>Last recorded (Lagos)</dt>
              <dd>{time(fix.recordedAt)}</dd>
            </div>
            <div>
              <dt>Received (Lagos)</dt>
              <dd>{time(fix.receivedAt)}</dd>
            </div>
            <div>
              <dt>Coordinates / accuracy</dt>
              <dd>
                {fix.lat}, {fix.lng} · ±{number(fix.accuracy)} m
              </dd>
            </div>
            <div>
              <dt>Age / upload</dt>
              <dd>
                {number(fix.ageSeconds)} seconds old ·{" "}
                {fix.delayedUpload
                  ? "Uploaded after offline delay"
                  : "No delayed upload reported"}
              </dd>
            </div>
          </dl>
        )}
        {!!t.location?.history?.length && (
          <details>
            <summary>
              Recorded GPS history ({t.location.history.length}
              {t.location.historyTruncated ? " most recent points" : " points"})
            </summary>
            <p>Gaps are not interpolated.</p>
            <ol>
              {t.location.history.map((p: any, i: number) => (
                <li key={i}>
                  {time(p.recordedAt)} (Lagos) · {p.lat}, {p.lng} · ±
                  {p.accuracy} m
                </li>
              ))}
            </ol>
          </details>
        )}
      </section>
      <section>
        <h4>Fuel purchases</h4>
        {t.fuelPurchases?.length ? (
          <ul className="fleet-fuel-list">
            {t.fuelPurchases.map((p: any, i: number) => (
              <li key={i}>
                <strong>
                  {number(p.litres)} L · {money(p.costKobo)}
                </strong>
                <span>Receipt: {p.receipt}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">No fuel purchases recorded for this trip.</p>
        )}
      </section>
      <details>
        <summary>Record reference</summary>
        <p className="fleet-reference">{t.id}</p>
      </details>
    </div>
  );
}
