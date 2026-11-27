"use client";
import React, { useEffect, useState } from "react";
import {
  ClipboardList,
  PackagePlus,
  RefreshCw,
  Search,
  ShieldCheck,
} from "lucide-react";
import { api, Loading, Modal, Notice } from "./ui";

const allowedRoles = ["owner", "manager", "finance", "driver"];
const shortId = (id: string) => id.slice(0, 8).toUpperCase();
const count = (value: unknown) => Number(value ?? 0).toLocaleString("en-NG");
const needsReturn = (load: any) =>
  ["returning", "held"].includes(load.state) ||
  (load.driver_active === false && ["issued", "active"].includes(load.state));
type Task = {
  title: string;
  action: string;
  fields: any[];
  description: string;
  verify?: boolean;
  mapRequest?: (data: Record<string, any>) => Record<string, any>;
};

export function VehicleManifestPanel({
  user,
  Form,
}: {
  user: any;
  Form: React.ComponentType<any>;
  expanded?: boolean;
}) {
  const scope = JSON.stringify([
    user.id,
    user.role,
    user.branch_id ?? user.branchId,
  ]);
  const allowed = allowedRoles.includes(user.role);
  const stock = ["owner", "finance"].includes(user.role);
  const driver = user.role === "driver";
  const [snapshot, setSnapshot] = useState<{ scope: string; data: any } | null>(
    null,
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [task, setTask] = useState<{ scope: string; value: Task } | null>(null);
  const data = snapshot?.scope === scope ? snapshot.data : null;
  const refresh = () => setTick((n) => n + 1);
  useEffect(() => {
    setTask(null);
    setQuery("");
    setPage(1);
  }, [scope]);
  useEffect(() => {
    if (!allowed) return;
    let active = true;
    setLoading(true);
    setError("");
    api("manifest.summary")
      .then((data) => {
        if (active) setSnapshot({ scope, data });
      })
      .catch((e) => {
        if (!active) return;
        setError(e.message);
        setTask(null);
        if ([401, 403].includes(e.status)) setSnapshot(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [scope, allowed, tick]);
  const loads = data?.loads ?? [];
  const trips = data?.trips ?? [];
  const products = (data?.products ?? []).filter(
    (p: any) => Number(p.available) > 0,
  );
  // The summary exposes active-trip vehicles only. Keep this authoritative limit explicit.
  const vehicles = [
    ...new Map<string, any>(trips.map((t: any) => [t.vehicle_id, t])).values(),
  ];
  const evidence = [
    { name: "evidence", label: "Count / inspection evidence" },
    { name: "reason", label: "Reason" },
  ];
  const open = (value: Task) => setTask({ scope, value });
  const payload: Task = {
    title: "Request payload review",
    action: "fleet.vehicle.payload.request",
    verify: true,
    description:
      "Request a change to an existing vehicle’s certified product capacity. The current limit stays in place until the required safety review is approved.",
    fields: [
      {
        name: "vehicleId",
        label: "Vehicle on an active trip",
        options: vehicles.map((t: any) => ({
          value: t.vehicle_id,
          label: `${t.label} · ${t.branch_id}`,
        })),
      },
      {
        name: "physicalCapacityGrams",
        label: "Certified product capacity (grams)",
        type: "number",
      },
      {
        name: "evidence",
        label: "Capacity certificate / measurement evidence",
      },
      { name: "reason", label: "Reason for safety review" },
    ],
  };
  const issue: Task = {
    title: "Issue stock to trip",
    action: "manifest.issue",
    verify: true,
    description:
      "Record the physical products actually loaded. Use measured packed weight and exact cylinder IDs where required. Stock becomes available for delivery only after independent receipt.",
    fields: [
      {
        name: "tripId",
        label: "Active trip",
        options: trips.map((t: any) => ({
          value: t.id,
          label: `${t.label} · ${t.branch_id} · ${t.physical_capacity_grams == null ? "Capacity not configured" : `${count(t.physical_capacity_grams)} g capacity`}`,
        })),
      },
      {
        name: "productId",
        label: "Catalogue product",
        options: products.map((p: any) => ({
          value: p.id,
          label: `${p.name} · ${p.branch_id} · ${count(p.available)} available`,
        })),
      },
      { name: "quantity", label: "Units actually loaded", type: "number" },
      {
        name: "unitWeightGrams",
        label: "Packed weight per unit (grams)",
        type: "number",
      },
      {
        name: "serialIds",
        label:
          "Exact cylinder IDs, separated by commas (leave blank for accessories)",
        type: "csv",
        optional: true,
      },
      ...evidence,
    ],
  };
  const matches = loads.filter((l: any) =>
    [l.name, l.label, l.id, l.branch_id, l.state].some((v) =>
      String(v ?? "")
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
    ),
  );
  const pages = Math.max(1, Math.ceil(matches.length / 10));
  const currentPage = Math.min(page, pages);
  const rows = matches.slice((currentPage - 1) * 10, currentPage * 10);
  const currentTask = task?.scope === scope ? task.value : null;
  if (!allowed)
    return (
      <Notice
        type="error"
        message="You do not have access to vehicle product manifests."
      />
    );
  return (
    <section
      className="manifest-workspace"
      aria-label="Vehicle product manifests and returns"
    >
      <header className="fleet-heading">
        <div>
          <span className="fleet-eyebrow">VEHICLE STOCK</span>
          <h2>Product manifests</h2>
          <p>Track stock from loading to receipt and return.</p>
        </div>
        <div className="fleet-actions">
          <button
            type="button"
            className="button secondary"
            disabled={loading}
            onClick={refresh}
            aria-label="Refresh product manifests"
          >
            <RefreshCw size={17} /> Refresh
          </button>
          {stock && (
            <button
              type="button"
              className="button"
              disabled={
                !data || loading || !!error || !trips.length || !products.length
              }
              onClick={() => open(issue)}
            >
              <PackagePlus size={18} /> Issue stock
            </button>
          )}
        </div>
      </header>
      {error && <Notice type="error" message={error} />}
      {error && data && (
        <p className="muted" role="status">
          Showing the last successful snapshot. Refresh before starting a stock
          action.
        </p>
      )}
      {!data && !error && <Loading label="Loading vehicle manifests" />}
      {data && (
        <>
          <div className="manifest-guidance">
            <ShieldCheck size={19} aria-hidden="true" />
            <p>
              Vehicle stock remains part of branch stock. Independent receipt,
              measured capacity and serial checks still apply.
            </p>
          </div>
          <div className="manifest-overview">
            <div>
              <span>Active trips</span>
              <strong>{trips.length}</strong>
            </div>
            <div>
              <span>Units on vehicles</span>
              <strong>
                {count(
                  loads.reduce(
                    (sum: number, l: any) =>
                      sum + Number(l.available) + Number(l.reserved),
                    0,
                  ),
                )}
              </strong>
            </div>
            <div>
              <span>Returns needing review</span>
              <strong>{loads.filter(needsReturn).length}</strong>
            </div>
          </div>
          {stock && (
            <aside className="manifest-capacity">
              <div>
                <h3>Vehicle payload capacity</h3>
                <p>
                  Changing a certified limit? Request a separate safety review.
                  Vehicles on active trips are listed here.
                </p>
              </div>
              <button
                type="button"
                className="button secondary"
                disabled={loading || !!error || !vehicles.length}
                onClick={() => open(payload)}
              >
                Request payload review
              </button>
            </aside>
          )}
          {stock && !trips.length && (
            <div className="manifest-prerequisite" role="status">
              <strong>No active vehicle trips</strong>
              <p>
                A driver must start a suitable branch vehicle trip before stock
                can be issued or its payload reviewed here.
              </p>
              <a className="fleet-text-button" href="#driver-fleet">
                View fleet &amp; trips
              </a>
            </div>
          )}
          {stock && trips.length > 0 && !products.length && (
            <p className="manifest-prerequisite" role="status">
              No published physical products are available in your scope. Check
              branch inventory before issuing stock.
            </p>
          )}
          <div className="fleet-records">
            <div className="manifest-record-heading">
              <h3>
                Manifest records <span>{loads.length}</span>
              </h3>
              <p>Latest 100 manifests · Lagos time</p>
            </div>
            <div className="fleet-filters">
              <label className="fleet-search">
                <span className="sr-only">Search manifests</span>
                <Search size={17} aria-hidden="true" />
                <input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search product, vehicle or manifest"
                  aria-label="Search manifests"
                />
              </label>
            </div>
            {rows.length ? (
              <div
                className="fleet-table-scroll"
                role="region"
                aria-label="Manifest records, scroll horizontally if needed"
                tabIndex={0}
              >
                <table className="fleet-table manifest-table">
                  <thead>
                    <tr>
                      <th>Product / vehicle</th>
                      <th>Status</th>
                      <th>On vehicle</th>
                      <th>Reconciliation</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((l: any) => {
                      const context = [
                        {
                          name: "manifestId",
                          label: "Manifest ID",
                          value: l.id,
                          type: "hidden",
                        },
                        {
                          name: "version",
                          label: "Current manifest version",
                          value: l.version,
                          type: "hidden",
                        },
                      ];
                      const contextRequest = (d: any) => ({
                        ...d,
                        version: Number(d.version),
                      });
                      const returned = [
                        ...context,
                        {
                          name: "foundQuantity",
                          label: "Units independently found",
                          type: "number",
                        },
                        {
                          name: "saleableQuantity",
                          label: "Units inspected safe for sale",
                          type: "number",
                        },
                        {
                          name: "foundSerialIds",
                          label: "Cylinder IDs found, separated by commas",
                          type: "csv",
                          optional: true,
                        },
                        {
                          name: "saleableSerialIds",
                          label: "Safe cylinder IDs, separated by commas",
                          type: "csv",
                          optional: true,
                        },
                        ...evidence,
                      ];
                      const recordTask = (
                        title: string,
                        action: string,
                        fields: any[],
                        verify = false,
                      ) =>
                        open({
                          title,
                          action,
                          fields,
                          verify,
                          description: `${l.name} · ${l.label} · Manifest ${shortId(l.id)}. Enter observed quantities and evidence; existing independent review and custody checks apply.`,
                          mapRequest: contextRequest,
                        });
                      return (
                        <tr key={`${l.id}:${l.version}`}>
                          <td>
                            <strong>{l.name}</strong>
                            <small>
                              {l.label} · {l.branch_id}
                              <br />
                              Manifest {shortId(l.id)}
                            </small>
                          </td>
                          <td>
                            <span
                              className={`fleet-badge ${l.state === "held" ? "warning" : ""}`}
                            >
                              {l.state}
                            </span>
                          </td>
                          <td>
                            <strong>{count(l.available)} available</strong>
                            <small>{count(l.reserved)} reserved</small>
                          </td>
                          <td>
                            <small>
                              {count(l.handed)} handed over ·{" "}
                              {count(l.returned)} returned
                              <br />
                              {count(l.removed)} removed after approved review
                            </small>
                          </td>
                          <td className="manifest-record-actions">
                            <button
                              type="button"
                              className="fleet-text-button"
                              onClick={() =>
                                open({
                                  title: "Manifest details",
                                  action: "details",
                                  fields: [],
                                  description: l.id,
                                })
                              }
                              aria-label={`View manifest ${shortId(l.id)}`}
                            >
                              View details
                            </button>
                            {driver && l.state === "issued" && (
                              <button
                                type="button"
                                className="fleet-text-button"
                                disabled={loading || !!error}
                                onClick={() =>
                                  recordTask(
                                    "Acknowledge stock receipt",
                                    "manifest.acknowledge",
                                    [
                                      ...context,
                                      {
                                        name: "quantity",
                                        label: "Units actually received",
                                        type: "number",
                                      },
                                      {
                                        name: "serialIds",
                                        label:
                                          "Cylinder IDs received, separated by commas",
                                        type: "csv",
                                        optional: true,
                                      },
                                      ...evidence,
                                    ],
                                  )
                                }
                              >
                                Acknowledge receipt
                              </button>
                            )}
                            {driver &&
                              ["issued", "active", "held"].includes(
                                l.state,
                              ) && (
                                <button
                                  type="button"
                                  className="fleet-text-button"
                                  disabled={loading || !!error}
                                  onClick={() =>
                                    recordTask(
                                      "Declare stock return",
                                      "manifest.return.declare",
                                      [
                                        ...context,
                                        {
                                          name: "quantity",
                                          label: "Units actually returned",
                                          type: "number",
                                        },
                                        {
                                          name: "serialIds",
                                          label:
                                            "Cylinder IDs returned, separated by commas",
                                          type: "csv",
                                          optional: true,
                                        },
                                        ...evidence,
                                      ],
                                    )
                                  }
                                >
                                  Declare return
                                </button>
                              )}
                            {stock && needsReturn(l) && (
                              <>
                                <button
                                  type="button"
                                  className="fleet-text-button"
                                  disabled={loading || !!error}
                                  onClick={() =>
                                    recordTask(
                                      "Receive counted return",
                                      "manifest.return.receive",
                                      returned,
                                      true,
                                    )
                                  }
                                >
                                  Receive return
                                </button>
                                {["owner", "finance"].includes(user.role) && (
                                  <button
                                    type="button"
                                    className="fleet-text-button"
                                    disabled={loading || !!error}
                                    onClick={() =>
                                      recordTask(
                                        "Request discrepancy review",
                                        "manifest.return.review",
                                        returned,
                                        true,
                                      )
                                    }
                                  >
                                    Review discrepancy
                                  </button>
                                )}
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="fleet-empty">
                <ClipboardList size={30} aria-hidden="true" />
                <h3>
                  {query ? "No matching manifests" : "No product manifests yet"}
                </h3>
                <p>
                  {query
                    ? "Try another product, vehicle or reference."
                    : "Issued stock and its receipt history will appear here."}
                </p>
                {query && (
                  <button
                    type="button"
                    className="button secondary"
                    onClick={() => {
                      setQuery("");
                      setPage(1);
                    }}
                  >
                    Clear search
                  </button>
                )}
              </div>
            )}
            <div className="fleet-pagination">
              <span>
                {matches.length
                  ? `${(currentPage - 1) * 10 + 1}–${Math.min(currentPage * 10, matches.length)} of ${matches.length}`
                  : "0 records"}
              </span>
              <div>
                <button
                  type="button"
                  aria-label="Previous manifest page"
                  disabled={currentPage <= 1}
                  onClick={() => setPage(currentPage - 1)}
                >
                  ←
                </button>
                <span>
                  Page {currentPage} of {pages}
                </span>
                <button
                  type="button"
                  aria-label="Next manifest page"
                  disabled={currentPage >= pages}
                  onClick={() => setPage(currentPage + 1)}
                >
                  →
                </button>
              </div>
            </div>
          </div>
        </>
      )}
      {currentTask && (
        <Modal
          className="fleet-dialog manifest-dialog"
          title={currentTask.title}
          onClose={() => setTask(null)}
        >
          {currentTask.action === "details" ? (
            <ManifestDetails
              load={loads.find((l: any) => l.id === currentTask.description)}
            />
          ) : (
            <>
              <p className="fleet-dialog-intro">{currentTask.description}</p>
              <Form
                key={currentTask.action}
                title={currentTask.title}
                action={currentTask.action}
                fields={currentTask.fields}
                requireVerification={currentTask.verify}
                mapRequest={currentTask.mapRequest}
                onDone={() => {
                  setTask(null);
                  refresh();
                }}
              />
            </>
          )}
        </Modal>
      )}
    </section>
  );
}
function ManifestDetails({ load }: { load: any }) {
  if (!load)
    return (
      <p className="fleet-trip-detail">
        This record is no longer in the current snapshot. Close and refresh.
      </p>
    );
  return (
    <div className="fleet-trip-detail">
      <header>
        <h3>{load.name}</h3>
        <p>
          {load.label} · {load.state}
        </p>
      </header>
      <p className="fleet-reference">
        Manifest {load.id} · Version {load.version}
      </p>
      <section>
        <h4>Cylinder serials</h4>
        {load.serials?.length ? (
          <ul>
            {load.serials.map((s: any) => (
              <li key={s.serial}>
                {s.serial}: {s.state}
              </li>
            ))}
          </ul>
        ) : (
          <p>No serialised cylinder records.</p>
        )}
      </section>
      <section>
        <h4>Custody history</h4>
        {load.events?.length ? (
          <ul>
            {load.events.map((e: any, i: number) => (
              <li key={i}>
                {new Date(e.created_at).toLocaleString("en-NG", {
                  timeZone: "Africa/Lagos",
                })}{" "}
                · {e.kind} · {e.detail.reason ?? ""}
              </li>
            ))}
          </ul>
        ) : (
          <p>No custody events recorded.</p>
        )}
      </section>
    </div>
  );
}
