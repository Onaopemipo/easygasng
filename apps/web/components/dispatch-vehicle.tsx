"use client";
import React, { useEffect, useRef, useState } from "react";
import { api, Modal, Notice } from "./ui";
import { OperationForm } from "./operations-completion";
import { confirmAction } from "./app-dialog";

type Options = {
  branches: { id: string; name: string; active: boolean }[];
  drivers: {
    id: string;
    name: string;
    branch_id: string;
    driver_available: boolean;
    trip_id: string | null;
    vehicle_label: string | null;
  }[];
  vehicles: {
    id: string;
    label: string;
    branch_id: string;
    capacity_grams: number;
    trip_id: string | null;
  }[];
  writesEnabled: boolean;
  canSetAvailability: boolean;
};

export default function DispatchVehicleAssignment({
  branch,
  onClose,
  onDone,
  onManageTrip,
}: {
  branch: string;
  onClose: () => void;
  onDone: (result: any) => void;
  onManageTrip?: (tripId: string) => void;
}) {
  const [data, setData] = useState<Options | null>(null),
    [error, setError] = useState("");
  const [selectedBranch, setBranch] = useState(branch),
    [revision, setRevision] = useState(0);
  const container = useRef<HTMLDivElement>(null);
  const [showExisting, setShowExisting] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    let current = true;
    setData(null);
    setError("");
    const timeout = setTimeout(() => controller.abort(), 10000);
    api("dispatch.vehicle.options", undefined, { signal: controller.signal })
      .then((result) => {
        if (!current || controller.signal.aborted) return;
        setData(result);
        const active = result.branches.filter((b: any) => b.active);
        setBranch((old) =>
          active.some((b: any) => b.id === old)
            ? old
            : active.length === 1
              ? active[0].id
              : "",
        );
      })
      .catch((e) => {
        if (current)
          setError(
            controller.signal.aborted
              ? "Vehicle options timed out. Try again."
              : e.message,
          );
      })
      .finally(() => clearTimeout(timeout));
    return () => {
      current = false;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [revision]);
  async function canDiscard() {
    if (container.current?.querySelector('[data-submit-pending="true"]'))
      return false;
    if (!container.current?.querySelector('[data-unsaved="true"]')) return true;
    return confirmAction(
      "Your assignment has not been saved. Discard these entries?",
      {
        title: "Discard assignment changes?",
        confirmLabel: "Discard changes",
        cancelLabel: "Keep editing",
        destructive: true,
      },
    );
  }
  const drivers =
    data?.drivers.filter((d) => d.branch_id === selectedBranch && !d.trip_id) ??
    [];
  const vehicles =
    data?.vehicles.filter(
      (v) => v.branch_id === selectedBranch && !v.trip_id,
    ) ?? [];
  const active = data?.branches.filter((b) => b.active) ?? [];
  return (
    <Modal
      title="Assign vehicle to driver"
      className="dispatch-vehicle-dialog"
      onClose={onClose}
    >
      <div ref={container}>
        <p className="fleet-dialog-intro">
          Choose a driver and vehicle to start their duty trip. You can assign
          deliveries afterwards. Location sharing stays off.
        </p>
        {error && (
          <>
            <Notice type="error" message={error} />
            <button
              className="button secondary"
              onClick={() => setRevision((n) => n + 1)}
            >
              Retry vehicle options
            </button>
          </>
        )}
        {!data && !error && (
          <p role="status">Checking drivers and available vehicles…</p>
        )}
        {data && (
          <>
            <div className="dispatch-vehicle-toolbar">
              <label>
                Branch
                <select
                  value={selectedBranch}
                  disabled={active.length <= 1}
                  onChange={async (e) => {
                    const value = e.target.value;
                    if (await canDiscard()) setBranch(value);
                  }}
                >
                  <option value="">Choose a branch</option>
                  {active.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="button secondary"
                onClick={async () => {
                  if (await canDiscard()) setRevision((n) => n + 1);
                }}
              >
                Refresh options
              </button>
            </div>
        {!active.length && <p role="status">No active branch is available. Ask the business owner to review branch access.</p>}
            {!data.writesEnabled && (
              <Notice
                type="error"
                message="Vehicle assignment is disabled by operational release controls."
              />
            )}
            {selectedBranch && !drivers.length && (
              <p role="status">
                No active driver without a trip is available in this branch.
                Review existing trips or add an active driver in Drivers.
              </p>
            )}
            {selectedBranch && !vehicles.length && (
              <p role="status">
                No available LPG-suitable vehicle with approved capacity in this
                branch. Review Fleet & trips to register a vehicle or reconcile
                an existing trip.
              </p>
            )}
            {data.writesEnabled &&
              selectedBranch &&
              drivers.length > 0 &&
              vehicles.length > 0 && (
                <>
                  <OperationForm
                    key={selectedBranch + ":" + revision}
                    title="Assign vehicle"
                    action="dispatch.vehicle.assign"
                    requireVerification
                    onDone={onDone}
                    mapRequest={(values) => ({
                      ...values,
                      makeAvailable: data.canSetAvailability
                        ? values.makeAvailable
                        : false,
                    })}
                    fields={[
                      {
                        name: "driverId",
                        label: "Driver",
                        value: "",
                        options: [
                          { value: "", label: "Choose a driver" },
                          ...drivers.map((d) => ({
                            value: d.id,
                            label:
                              d.name +
                              (d.driver_available
                                ? " · Available"
                                : " · Off duty"),
                          })),
                        ],
                      },
                      {
                        name: "vehicleId",
                        label: "Vehicle",
                        value: "",
                        options: [
                          { value: "", label: "Choose a vehicle" },
                          ...vehicles.map((v) => ({
                            value: v.id,
                            label: `${v.label} · ${Number(v.capacity_grams) / 1000} kg capacity`,
                          })),
                        ],
                      },
                      {
                        name: "startOdometer",
                        label: "Starting odometer (km)",
                        type: "number",
                      },
                      ...(data.canSetAvailability
                        ? [
                            {
                              name: "makeAvailable",
                              label:
                                "I confirm the driver is on duty — mark available for deliveries",
                              type: "checkbox",
                              value: true,
                            },
                          ]
                        : []),
                    ]}
                  />
                  {!data.canSetAvailability && (
                    <p className="muted">
                      Driver availability stays unchanged. Ask an authorised
                      administrator to update an off-duty driver.
                    </p>
                  )}
                </>
              )}
            {data.drivers.some(
              (d) => d.branch_id === selectedBranch && d.trip_id,
            ) && (
              <div className="dispatch-vehicle-existing">
                <button type="button" aria-expanded={showExisting} onClick={() => setShowExisting(value => !value)}>Drivers already on a trip</button>
                <ul hidden={!showExisting}>
                  {data.drivers
                    .filter((d) => d.branch_id === selectedBranch && d.trip_id)
                    .map((d) => (
                      <li key={d.id}>
                        {d.name} · {d.vehicle_label ?? "Assigned vehicle"}
                        {onManageTrip && <button type="button" className="button secondary" onClick={async () => { if (await canDiscard()) onManageTrip(d.trip_id!); }}>Manage trip</button>}
                      </li>
                    ))}
                </ul>
                <p hidden={!showExisting}>
                  Reconcile and end the current trip before changing vehicles.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
