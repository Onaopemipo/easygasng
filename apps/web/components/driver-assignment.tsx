"use client";
import React, { useCallback, useEffect, useId, useRef, useState } from "react";
import { api, Notice } from "./ui";
import {
  fulfilmentIssue,
  type AssignmentIssue,
} from "../../../packages/business-rules/src/assignment-requirements";
const styles = Object.fromEntries(
  [
    "workspace",
    "toolbar",
    "note",
    "options",
    "driver",
    "choice",
    "issues",
    "responsible",
    "help",
    "blocked",
  ].map((name) => [name, "driver-assignment-" + name]),
);

export type AssignmentCandidates = {
  orderId: string;
  reference: string;
  version: number;
  branch: { id: string; name: string };
  checkedAt: string;
  writesEnabled: boolean;
  canReviewVehicles: boolean;
  canReviewDrivers: boolean;
  orderReadiness?: {
    ready: boolean | null;
    issues: AssignmentIssue[];
    reasons: string[];
  };
  preparationActions?: { id: string; label: string }[];
  linkedVisit?: { driver_id: string; parent_order_id: string } | null;
  candidates: {
    id: string;
    name: string;
    activeOrders?: number;
    readiness: {
      ready: boolean | null;
      driverReady?: boolean | null;
      reasons: string[];
      issues?: AssignmentIssue[];
    };
  }[];
};

export function useAssignmentCandidates(
  orderId: string,
  version: number,
  enabled: boolean,
) {
  const scope = JSON.stringify([orderId, version, enabled]);
  const [snapshot, setSnapshot] = useState<{
    scope: string;
    data: AssignmentCandidates;
  } | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const generation = useRef(0);
  const request = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    const own = ++generation.current;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setSnapshot(null);
    setError("");
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const result = await api(
        "dispatch.candidates?orderId=" + encodeURIComponent(orderId),
        undefined,
        { signal: controller.signal },
      );
      if (own === generation.current && !controller.signal.aborted)
        setSnapshot({ scope, data: result });
    } catch (e: any) {
      if (own === generation.current)
        setError(
          controller.signal.aborted
            ? "Eligibility check timed out. Refresh before assigning a driver."
            : e.message,
        );
    } finally {
      clearTimeout(timeout);
      if (own === generation.current) setLoading(false);
    }
  }, [orderId, version, enabled, scope]);
  useEffect(() => {
    void refresh();
    return () => {
      generation.current++;
      request.current?.abort();
    };
  }, [refresh]);
  return {
    data: snapshot?.scope === scope ? snapshot.data : null,
    error,
    loading,
    refresh,
  };
}

/** Shared presentation; the server is the only authority for candidate eligibility. */
export function DriverAssignmentChoices({
  data,
  loading,
  error,
  selected,
  onSelect,
  onRefresh,
  disabled = false,
  onAssignVehicle,
  onResolveOrder,
}: {
  data: AssignmentCandidates | null;
  loading: boolean;
  error?: string;
  selected: string;
  onSelect: (id: string) => void;
  onRefresh: () => void;
  disabled?: boolean;
  onAssignVehicle?: () => void;
  onResolveOrder?: (action: string) => void;
}) {
  const readyDrivers =
    data?.candidates.filter(
      (d) => (d.readiness.driverReady ?? d.readiness.ready) === true,
    ) ?? [];
  const blockedDrivers =
    data?.candidates.filter(
      (d) => (d.readiness.driverReady ?? d.readiness.ready) !== true,
    ) ?? [];
  const ready = readyDrivers.length;
  const selectionHintId = useId();
  const orderPending = Boolean(
    data?.orderReadiness && data.orderReadiness.ready !== true,
  );
  const chosen = readyDrivers.find((driver) => driver.id === selected);
  return (
    <section
      className={styles.workspace}
      aria-label="Driver assignment requirements"
      aria-busy={loading}
    >
      {data?.orderReadiness && (
        <section
          className="assignment-preparation"
          aria-label="Order preparation"
        >
          <strong>1. Order preparation</strong>
          <p>
            {data.orderReadiness.ready
              ? "Ready — order payment, stock and safety checks passed."
              : "Select a ready driver below, then complete this order’s preparation before assignment."}
          </p>
          {data.orderReadiness.issues.map((issue, index) => (
            <p role="status" key={issue.code + index}>
              {issue.title}
            </p>
          ))}
          {!data.orderReadiness.ready && (
            <div className="service-actions">
              {data.preparationActions?.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  className="button secondary"
                  disabled={disabled || !onResolveOrder}
                  onClick={() => onResolveOrder?.(action.id)}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
          {!data.orderReadiness.ready && (
            <p>
              These are order requirements. Changing drivers will not resolve
              them.
            </p>
          )}
        </section>
      )}
      <div className={styles.toolbar}>
        <div>
          <strong>2. Driver readiness</strong>
          {data && (
            <p>
              Fulfilment branch: {data.branch?.name ?? data.branch?.id} ·{" "}
              {ready}/{data.candidates.length}{" "}
              {data.orderReadiness ? "drivers ready" : "eligible"}
            </p>
          )}
        </div>
        <button
          type="button"
          className="button secondary"
          disabled={disabled || loading}
          onClick={onRefresh}
        >
          {loading ? "Checking…" : "Refresh eligibility"}
        </button>
      </div>
      {loading && (
        <p role="status">
          Checking current driver, trip, vehicle and order requirements…
        </p>
      )}
      {error && <Notice type="error" message={error} />}
      {data && (
        <>
          {!data.writesEnabled && (
            <Notice
              type="error"
              message="Assignment is disabled by the current release controls. A readiness check cannot enable dispatch."
            />
          )}
          {!ready && (
            <p className={styles.blocked} role="status">
              No driver can be assigned yet. Resolve the requirements below,
              then refresh eligibility.
            </p>
          )}
          <p id={selectionHintId} className={styles.note} role="status">
            {chosen ? `${chosen.name} selected. ` : ""}
            {orderPending
              ? "Driver selection is available. Complete the order requirements above before you can assign the driver."
              : "Select a ready driver, then confirm the assignment below."}
          </p>
          <fieldset disabled={disabled || loading} className={styles.options}>
            <legend>Choose an eligible branch driver</legend>
            {readyDrivers.map((driver) => (
              <article
                className={`${styles.driver}${selected === driver.id ? " is-selected" : ""}`}
                key={driver.id}
              >
                <label className={styles.choice}>
                  <input
                    type="radio"
                    name="assignmentDriver"
                    value={driver.id}
                    checked={selected === driver.id}
                    disabled={!data.writesEnabled}
                    aria-label={driver.name}
                    aria-describedby={selectionHintId}
                    onChange={() => onSelect(driver.id)}
                  />
                  <span>
                    <strong>
                      {driver.name}
                      {selected === driver.id && (
                        <span className="driver-assignment-selected">
                          Selected
                        </span>
                      )}
                    </strong>
                    <small>
                      {driver.activeOrders
                        ? `${driver.activeOrders} active order(s) · can take another order when checks pass`
                        : "Ready for an order"}
                      {data.orderReadiness?.ready === false
                        ? " · waiting for order preparation"
                        : ""}
                    </small>
                  </span>
                </label>
              </article>
            ))}
            {blockedDrivers.length > 0 && (
              <details
                className="driver-assignment-blocked-group"
                key={data.orderId}
              >
                <summary>
                  Blocked drivers ({blockedDrivers.length})
                  <span>View requirements and next steps</span>
                </summary>
                <div className="driver-assignment-blocked-list">
                  {blockedDrivers.map((driver) => {
                    const issues = driver.readiness.issues?.length
                      ? driver.readiness.issues
                      : driver.readiness.reasons.map((r) => fulfilmentIssue(r));
                    return (
                      <article className={styles.driver} key={driver.id}>
                        <label className={styles.choice}>
                          <input
                            type="radio"
                            name="assignmentDriver"
                            value={driver.id}
                            checked={selected === driver.id}
                            disabled
                            aria-label={driver.name}
                            aria-describedby={selectionHintId}
                          />
                          <span>
                            <strong>{driver.name}</strong>
                            <small>
                              {driver.readiness.ready === true
                                ? "Eligible at last check"
                                : "Not ready for assignment"}
                            </small>
                          </span>
                        </label>
                        {issues.length > 0 && (
                          <ul className={styles.issues}>
                            {issues.map((issue, index) => (
                              <li key={issue.code + index}>
                                <strong>{issue.title}</strong>
                                <p>
                                  <span className={styles.responsible}>
                                    {issue.responsible}:
                                  </span>{" "}
                                  {issue.resolution}
                                </p>
                              </li>
                            ))}
                          </ul>
                        )}
                        {issues.some((i) => i.help === "drivers") &&
                          data.canReviewDrivers && (
                            <a href="/admin/drivers" className={styles.help}>
                              Review driver accounts and availability
                            </a>
                          )}
                        {issues.some((i) => i.help === "fleet") &&
                          data.canReviewVehicles && (
                            <a
                              href="/admin/deliveries#driver-fleet"
                              className={styles.help}
                            >
                              Review branch vehicles and trips
                            </a>
                          )}
                        {issues.some(
                          (i) => i.code === "DRIVER_TRIP_REQUIRED",
                        ) &&
                          data.canReviewVehicles && (
                            <a
                              href="/admin/deliveries#assign-vehicle"
                              className={styles.help}
                              onClick={
                                onAssignVehicle
                                  ? (e) => {
                                      e.preventDefault();
                                      onAssignVehicle();
                                    }
                                  : undefined
                              }
                            >
                              Assign vehicle to driver
                            </a>
                          )}
                      </article>
                    );
                  })}
                </div>
              </details>
            )}
            {!data.candidates.length && (
              <p>
                No driver accounts are registered in this fulfilment branch. Ask
                the business owner to review staff and branch assignments in
                Drivers.
              </p>
            )}
          </fieldset>
          {data.checkedAt && (
            <p className={styles.note}>
              Checked{" "}
              {new Date(data.checkedAt).toLocaleTimeString("en-NG", {
                timeZone: "Africa/Lagos",
              })}{" "}
              Lagos time. Trip and vehicle readiness does not replace payment,
              stock or custody checks. All requirements are checked again when
              you submit.
            </p>
          )}
        </>
      )}
    </section>
  );
}
