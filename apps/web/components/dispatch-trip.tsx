"use client";
import React, { useEffect, useRef, useState } from "react";
import { api, Modal, Notice } from "./ui";
import { OperationForm } from "./operations-completion";
import { confirmAction } from "./app-dialog";

type Trip = {
  id: string;
  branch_id: string;
  driver_name: string;
  vehicle_label: string;
  start_odometer: number;
  version: number;
  ended_at?: string | null;
};
type Options = {
  branches: { id: string; name: string; active: boolean }[];
  trips: Trip[];
  vehicles: { id: string; label: string; branch_id: string }[];
  writesEnabled: boolean;
};
type Review = {
  trip: Trip;
  reconciliation: {
    clear: boolean;
    blockers: {
      code: string;
      title: string;
      count: number;
      destination: string;
    }[];
  };
  writesEnabled: boolean;
  canChange: boolean;
};

export default function DispatchTripManagement({
  branch,
  initialTripId = "",
  onClose,
  onDone,
  onResolve,
}: {
  branch: string;
  initialTripId?: string;
  onClose: () => void;
  onDone: (result: any) => void;
  onResolve: (destination: string) => void;
}) {
  const [options, setOptions] = useState<Options | null>(null),
    [review, setReview] = useState<Review | null>(null);
  const [error, setError] = useState(""),
    [reviewError, setReviewError] = useState("");
  const [scope, setScope] = useState(branch),
    [tripId, setTrip] = useState(initialTripId),
    [mode, setMode] = useState("");
  const [revision, setRevision] = useState(0);
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    let current = true;
    setOptions(null);
    setError("");
    const timer = setTimeout(() => controller.abort(), 10000);
    api("dispatch.trip.options", undefined, { signal: controller.signal })
      .then((data) => {
        if (!current || controller.signal.aborted) return;
        setOptions(data);
        const preferred = data.trips.find((t: Trip) => t.id === tripId);
        const selectedBranch =
          preferred?.branch_id ??
          (data.branches.some((b: any) => b.id === scope)
            ? scope
            : data.branches.length === 1
              ? data.branches[0].id
              : "");
        setScope(selectedBranch);
        const trips = data.trips.filter(
          (t: Trip) => t.branch_id === selectedBranch,
        );
        setTrip(preferred?.id ?? (trips.length === 1 ? trips[0].id : ""));
      })
      .catch((e) => {
        if (current)
          setError(
            controller.signal.aborted
              ? "Trip options timed out. Try again."
              : e.message,
          );
      })
      .finally(() => clearTimeout(timer));
    return () => {
      current = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [revision]);
  useEffect(() => {
    const controller = new AbortController();
    let current = true;
    setReview(null);
    setReviewError("");
    if (!tripId)
      return () => {
        current = false;
        controller.abort();
      };
    const timer = setTimeout(() => controller.abort(), 10000);
    api(
      "dispatch.trip.review?tripId=" + encodeURIComponent(tripId),
      undefined,
      { signal: controller.signal },
    )
      .then((data) => {
        if (current && !controller.signal.aborted) setReview(data);
      })
      .catch((e) => {
        if (current)
          setReviewError(
            controller.signal.aborted
              ? "Reconciliation check timed out. Refresh the trip."
              : e.message,
          );
      })
      .finally(() => clearTimeout(timer));
    return () => {
      current = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [tripId, revision]);
  async function discard() {
    if (container.current?.querySelector('[data-submit-pending="true"]'))
      return false;
    if (!container.current?.querySelector('[data-unsaved="true"]')) return true;
    return confirmAction("Discard the unsaved trip entries?", {
      title: "Discard trip changes?",
      confirmLabel: "Discard changes",
      cancelLabel: "Keep editing",
      destructive: true,
    });
  }
  const trips = options?.trips.filter((t) => t.branch_id === scope) ?? [];
  const vehicles =
    options?.vehicles.filter((v) => v.branch_id === review?.trip.branch_id) ??
    [];
  const currentReview = review?.trip.id === tripId ? review : null;
  return (
    <Modal
      title="Manage driver trip"
      className="dispatch-vehicle-dialog dispatch-trip-dialog"
      onClose={onClose}
    >
      <div ref={container}>
        <p className="fleet-dialog-intro">
          End a trip or change its vehicle here. All delivery and vehicle
          custody must be reconciled first. Driver availability stays unchanged.
        </p>
        {error && <Notice type="error" message={error} />}
        {!options && !error && <p role="status">Loading active trips…</p>}
        <div className="dispatch-trip-selectors">
          {options && (
            <>
              <label>
                Branch
                <select
                  value={scope}
                  disabled={options.branches.length <= 1}
                  onChange={async (e) => {
                    const value = e.target.value;
                    if (await discard()) {
                      setScope(value);
                      setTrip("");
                      setMode("");
                    }
                  }}
                >
                  <option value="">Choose a branch</option>
                  {options.branches.map((b) => (
                    <option value={b.id} key={b.id}>
                      {b.name}
                      {!b.active ? " · inactive" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Driver / current vehicle
                <select
                  value={tripId}
                  onChange={async (e) => {
                    const value = e.target.value;
                    if (await discard()) {
                      setTrip(value);
                      setMode("");
                    }
                  }}
                >
                  <option value="">Choose an active trip</option>
                  {trips.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.driver_name} · {t.vehicle_label}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
        </div>
        <button
          type="button"
          className="button secondary dispatch-trip-refresh"
          onClick={async () => {
            if (await discard()) setRevision((n) => n + 1);
          }}
        >
          Refresh trips & checks
        </button>
        {options && scope && !trips.length && (
          <p role="status">
            No active trips in this branch. Use Assign vehicle to driver to
            start one.
          </p>
        )}
        {tripId && !currentReview && !reviewError && (
          <p role="status">Checking current reconciliation…</p>
        )}
        {reviewError && <Notice type="error" message={reviewError} />}
        {currentReview && (
          <>
            <p className="dispatch-trip-reading">
              {currentReview.trip.vehicle_label} · Starting odometer:{" "}
              <strong>
                {Number(currentReview.trip.start_odometer).toLocaleString()} km
              </strong>
            </p>
            {currentReview.trip.ended_at ? (
              <Notice message="This trip has already ended. Refresh trips to continue." />
            ) : (
              <>
                {!currentReview.reconciliation.clear ? (
                  <section
                    className="dispatch-trip-blockers"
                    aria-label="Required reconciliation"
                  >
                    <h3>Resolve before continuing</h3>
                    {currentReview.reconciliation.blockers.map((b) => (
                      <article key={b.code}>
                        <strong>
                          {b.title} ({b.count})
                        </strong>
                        <button
                          type="button"
                          className="button secondary"
                          onClick={() => onResolve(b.destination)}
                        >
                          Review{" "}
                          {b.destination === "manifests"
                            ? "product manifests"
                            : b.destination === "lpg"
                              ? "LPG custody"
                              : "delivery orders"}
                        </button>
                      </article>
                    ))}
                    <p>
                      Authorised operations or finance staff must complete the
                      existing reconciliation workflow. This form cannot clear
                      custody records.
                    </p>
                  </section>
                ) : (
                  <Notice message="Reconciliation clear. These checks run again when you confirm." />
                )}
                {(!options?.writesEnabled || !currentReview.writesEnabled) && (
                  <Notice
                    type="error"
                    message="Trip changes are disabled by operational release controls."
                  />
                )}
                <div className="dispatch-trip-modes">
                  <button
                    type="button"
                    className={mode === "end" ? "button" : "button secondary"}
                    aria-pressed={mode === "end"}
                    disabled={
                      !currentReview.reconciliation.clear ||
                      !options?.writesEnabled ||
                      !currentReview.writesEnabled
                    }
                    onClick={async () => {
                      if (await discard()) setMode("end");
                    }}
                  >
                    End trip
                  </button>
                  <button
                    type="button"
                    className={
                      mode === "change" ? "button" : "button secondary"
                    }
                    aria-pressed={mode === "change"}
                    disabled={
                      !currentReview.reconciliation.clear ||
                      !options?.writesEnabled ||
                      !currentReview.writesEnabled ||
                      !currentReview.canChange
                    }
                    onClick={async () => {
                      if (await discard()) setMode("change");
                    }}
                  >
                    Change vehicle
                  </button>
                </div>
                {!currentReview.canChange && (
                  <p className="muted">
                    Changing vehicles requires an active driver in the same
                    active branch. A reconciled trip can still be ended.
                  </p>
                )}
                {mode === "change" && !vehicles.length && (
                  <p role="status">
                    No available suitable replacement vehicle in this branch.
                    Review Fleet & trips to register or release a vehicle.
                  </p>
                )}
                {mode &&
                  options?.writesEnabled &&
                  currentReview.writesEnabled &&
                  currentReview.reconciliation.clear &&
                  (mode === "end" ||
                    (currentReview.canChange && vehicles.length > 0)) && (
                    <OperationForm
                      key={
                        tripId +
                        ":" +
                        currentReview.trip.version +
                        ":" +
                        mode +
                        ":" +
                        revision
                      }
                      title={mode === "end" ? "End trip" : "Change vehicle"}
                      action={
                        mode === "end"
                          ? "dispatch.trip.end"
                          : "dispatch.trip.change"
                      }
                      requireVerification
                      onDone={onDone}
                      mapRequest={(d) => ({ ...d, version: Number(d.version) })}
                      fields={[
                        {
                          name: "tripId",
                          label: "Trip",
                          type: "hidden",
                          value: tripId,
                        },
                        {
                          name: "version",
                          label: "Version",
                          type: "hidden",
                          value: Number(currentReview.trip.version),
                        },
                        ...(mode === "change"
                          ? [
                              {
                                name: "vehicleId",
                                label: "Replacement vehicle",
                                value: "",
                                options: [
                                  {
                                    value: "",
                                    label: "Choose a different vehicle",
                                  },
                                  ...vehicles.map((v) => ({
                                    value: v.id,
                                    label: v.label,
                                  })),
                                ],
                              },
                            ]
                          : []),
                        {
                          name: "endOdometer",
                          label: "Current vehicle ending odometer (km)",
                          type: "number",
                        },
                        ...(mode === "change"
                          ? [
                              {
                                name: "startOdometer",
                                label:
                                  "Replacement vehicle starting odometer (km)",
                                type: "number",
                              },
                            ]
                          : []),
                      ]}
                    />
                  )}
                {mode === "change" && (
                  <p className="muted">
                    The old trip ends only if the replacement can start.
                    Location sharing is off on the new trip.
                  </p>
                )}
              </>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
