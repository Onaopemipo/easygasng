"use client";
import React, { useEffect, useRef, useState } from "react";
import { CheckCircle2, Circle, RefreshCw } from "lucide-react";
import Link from "./workspace-link";
import { api, Notice } from "./ui";

export type DispatchSetupData = {
  branches: { id: string; name: string; active: boolean }[];
  branch: { id: string; name: string; active: boolean } | null;
  checkedAt: string;
  canReviewDrivers: boolean;
  canRegisterVehicle: boolean;
  canReviewRelease: boolean;
  counts: {
    drivers: number;
    availableDrivers: number;
    driversOnTrips: number;
    vehicles: number;
    approvedVehicles: number;
  } | null;
  checks: Record<string, boolean> | null;
};

export function DispatchSetupChecklist({
  data,
  loading,
  error,
  onRefresh,
  onBranch,
  onFleet,
  onAssignVehicle,
}: {
  data: DispatchSetupData | null;
  loading: boolean;
  error: string;
  onRefresh: () => void;
  onBranch: (id: string) => void;
  onFleet: () => void;
  onAssignVehicle?: () => void;
}) {
  const checks = data?.checks,
    counts = data?.counts;
  const operations =
    !!checks &&
    [
      "activeTrips",
      "deliveryEnabled",
      "deliveryCapacity",
      "deliveryWindows",
      "coverageConfigured",
      "assignmentEnabled",
    ].every((key) => checks[key]);
  const ready = [
    checks?.branchActive,
    checks?.driversAvailable,
    checks?.vehiclesApproved,
    operations,
  ].filter(Boolean).length;
  const settings =
    "/admin/settings?scope=" +
    encodeURIComponent(data?.branch?.id ?? "") +
    "&category=" + encodeURIComponent("Delivery & Dispatch");
  return (
    <section
      className="dispatch-setup"
      aria-label="Dispatch setup checklist"
      aria-busy={loading}
    >
      <header>
        <div>
          <span className="dispatch-setup-eyebrow">BEFORE YOU DISPATCH</span>
          <h2>Dispatch setup checklist</h2>
          <p>
            {data?.branch
              ? `${data.branch.name} · ${ready}/4 setup steps ready`
              : "Choose a branch to check its setup."}
          </p>
        </div>
        <div className="dispatch-setup-controls">
          {data && (
            <label>
              Setup branch
              <select
                value={data.branch?.id ?? ""}
                disabled={loading}
                onChange={(e) => onBranch(e.target.value)}
              >
                <option value="">Choose a branch</option>
                {data.branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                    {!b.active ? " · inactive" : ""}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button
            type="button"
            className="button secondary"
            disabled={loading}
            onClick={onRefresh}
          >
            <RefreshCw size={16} />
            {loading ? "Checking setup…" : "Refresh setup"}
          </button>
        </div>
      </header>
      {error && <Notice type="error" message={error} />}
      {!data && !error && (
        <p role="status">
          Checking branch, drivers, vehicles and operational prerequisites…
        </p>
      )}
      {data && !data.branch && (
        <p role="status">
          {data.branches.length
            ? "Select one branch above. Setup is checked per branch, not across the whole business."
            : "No authorised branch is assigned. Ask the business owner to review branch access."}
        </p>
      )}
      {checks && counts && (
        <div className="dispatch-setup-grid">
          {[
            {
              name: "Branch",
              ready: checks.branchActive,
              body: checks.branchActive
                ? "Active fulfilment branch."
                : "This branch is inactive. Choose an active branch or ask the business owner to review it.",
              action: (
                <Link href="/admin/operations#branches">Review branches</Link>
              ),
            },
            {
              name: "Drivers",
              ready: checks.driversAvailable,
              body: `${counts.availableDrivers} active and available · ${counts.drivers} registered.`,
              action: data.canReviewDrivers ? (
                <Link href="/admin/drivers">
                  {counts.drivers
                    ? "Manage drivers & availability"
                    : "Add a driver"}
                </Link>
              ) : (
                <p>Business owner: review driver accounts and availability.</p>
              ),
            },
            {
              name: "Vehicles",
              ready: checks.vehiclesApproved,
              body: `${counts.approvedVehicles} active, LPG-suitable vehicles with approved capacity · ${counts.vehicles} registered.`,
              action: (
                <>
                  <button type="button" className="text-link" onClick={onFleet}>
                    {data.canRegisterVehicle && !counts.approvedVehicles
                      ? "Register / review vehicles"
                      : "Review vehicles & trips"}
                  </button>
                  {!data.canRegisterVehicle && (
                    <p>Only the business owner can register a vehicle.</p>
                  )}
                </>
              ),
            },
            {
              name: "Operational readiness",
              ready: operations,
              body: `${counts.driversOnTrips} available drivers on active, suitable branch trips.`,
              action: (
                <>
                  {!checks.activeTrips && (
                    <p>
                      {onAssignVehicle ? "Assign an available vehicle to a driver here, or ask the driver to use Home → Start trip." : "Driver: open Home → Start trip, select an approved branch vehicle and enter the starting odometer."}
                    </p>
                  )}
                  {onAssignVehicle && <button type="button" className="text-link" onClick={onAssignVehicle}>Assign vehicle to driver</button>}
                  {(!checks.deliveryEnabled ||
                    !checks.deliveryCapacity ||
                    !checks.deliveryWindows ||
                    !checks.coverageConfigured) && (
                    <>
                      <ul>
                        {!checks.deliveryEnabled && (
                          <li>Delivery ordering is off.</li>
                        )}
                        {!checks.deliveryCapacity && (
                          <li>Set a positive delivery-window capacity.</li>
                        )}
                        {!checks.deliveryWindows && (
                          <li>Configure bookable delivery windows.</li>
                        )}
                        {!checks.coverageConfigured && (
                          <li>
                            Record coverage for an active delivery location.
                          </li>
                        )}
                      </ul>
                      <Link href={settings}>
                        Review delivery settings & coverage
                      </Link>
                    </>
                  )}
                  {!checks.assignmentEnabled && (
                    <>
                      <p>
                        Assignment is disabled by release controls. Setup cannot
                        enable it.
                      </p>
                      {data.canReviewRelease && (
                        <Link href="/admin/readiness">
                          Review operational release controls
                        </Link>
                      )}
                    </>
                  )}
                  <button type="button" className="text-link" onClick={onFleet}>
                    Review active trips
                  </button>
                </>
              ),
            },
          ].map((item, i) => (
            <article key={item.name}>
              <div className="dispatch-setup-step">
                {item.ready ? (
                  <CheckCircle2 size={20} aria-hidden />
                ) : (
                  <Circle size={20} aria-hidden />
                )}
                <span>0{i + 1}</span>
                <strong>{item.name}</strong>
                <span className={item.ready ? "setup-ready" : "setup-missing"}>
                  {item.ready ? "Ready" : "Needs attention"}
                </span>
              </div>
              <p>{item.body}</p>
              <div className="dispatch-setup-actions">{item.action}</div>
            </article>
          ))}
        </div>
      )}
      {data?.checkedAt && (
        <p className="dispatch-setup-footnote">
          Checked{" "}
          {new Date(data.checkedAt).toLocaleTimeString("en-NG", {
            timeZone: "Africa/Lagos",
          })}{" "}
          Lagos time. Branch setup is a prerequisite check. Each order still
          needs its own payment, address coverage, stock, capacity and
          custody checks before assignment.
        </p>
      )}
    </section>
  );
}

export default function DispatchSetup({
  user,
  branch,
  onBranch,
  onFleet,
  onAssignVehicle,
}: {
  user: any;
  branch: string;
  onBranch: (id: string) => void;
  onFleet: () => void;
  onAssignVehicle?: () => void;
}) {
  const scope = JSON.stringify([
    user.id,
    user.role,
    user.branchId ?? user.branch_id,
    branch,
  ]);
  const [snapshot, setSnapshot] = useState<{
    scope: string;
    data: DispatchSetupData;
  } | null>(null);
  const [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [revision, setRevision] = useState(0);
  const generation = useRef(0);
  useEffect(() => {
    const own = ++generation.current,
      controller = new AbortController();
    setLoading(true);
    setError("");
    setSnapshot(null);
    const timeout = setTimeout(() => controller.abort(), 10000);
    api("dispatch.setup?branch=" + encodeURIComponent(branch), undefined, {
      signal: controller.signal,
    })
      .then((data) => {
        if (own === generation.current && !controller.signal.aborted)
          setSnapshot({ scope, data });
      })
      .catch((e) => {
        if (own === generation.current)
          setError(
            controller.signal.aborted
              ? "Setup check timed out. Refresh setup to try again."
              : e.message,
          );
      })
      .finally(() => {
        clearTimeout(timeout);
        if (own === generation.current) setLoading(false);
      });
    return () => {
      generation.current++;
      clearTimeout(timeout);
      controller.abort();
    };
  }, [scope, branch, revision]);
  return (
    <DispatchSetupChecklist
      data={snapshot?.scope === scope ? snapshot.data : null}
      error={error}
      loading={loading}
      onRefresh={() => setRevision((n) => n + 1)}
      onBranch={onBranch}
      onFleet={onFleet}
      onAssignVehicle={onAssignVehicle}
    />
  );
}
