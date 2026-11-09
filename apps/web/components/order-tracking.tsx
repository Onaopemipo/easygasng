"use client";
import { OrderCardPayment } from "./hosted-payment";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { OrderOperations } from "./order-operations";
import OrderInvoice from "./order-invoice";
import { orderTransitions } from "../../../packages/business-rules/src/forecast";
import { api, money, Notice, Loading } from "./ui";
import {
  trackingLabels,
  deliveryDelayed,
  trackingEventLabel,
  deliveryFailureReasons,
  reconcileTracking,
} from "../../../packages/business-rules/src/order-tracking";
export function useTrackingOrders(
  enabled: boolean,
  orderId = "",
  identity = "",
) {
  const [orders, setOrders] = useState<any[] | null>(null),
    [error, setError] = useState(""),
    [connection, setConnection] = useState("Connecting"),
    [observed, setObserved] = useState("");
  const live = useRef(true);
  const generation = useRef(0);
  async function refresh() {
    const requestGeneration = generation.current;
    try {
      const next = await api(
        orderId ? `orders?id=${encodeURIComponent(orderId)}` : "orders",
      );
      if (live.current && requestGeneration === generation.current) {
        setOrders((prior) => reconcileTracking(prior ?? [], next));
        setError("");
        setObserved(new Date().toISOString());
      }
    } catch (e: any) {
      if (live.current && requestGeneration === generation.current)
        setError(e.message);
    }
  }
  useEffect(() => {
    if (!enabled) return;
    live.current = true;
    const ownGeneration = ++generation.current;
    setOrders(null);
    refresh();
    const stream = new EventSource(
      `/api/tracking/stream${orderId ? `?id=${encodeURIComponent(orderId)}` : ""}`,
    );
    stream.addEventListener("snapshot", (event) => {
      if (ownGeneration !== generation.current) return;
      try {
        const value = JSON.parse((event as MessageEvent).data);
        setOrders((prior) => reconcileTracking(prior ?? [], value.orders));
        setObserved(value.observedAt);
        setConnection("Live updates connected");
        setError("");
      } catch {
        setConnection("Update unavailable — refresh tracking");
      }
    });
    stream.onerror = () =>
      setConnection(
        navigator.onLine
          ? "Reconnecting — displayed status may be stale"
          : "Offline — displayed status may be stale",
      );
    const offline = () =>
      setConnection("Offline — displayed status may be stale");
    globalThis.window.addEventListener("offline", offline);
    return () => {
      live.current = false;
      generation.current++;
      stream.close();
      globalThis.window.removeEventListener("offline", offline);
      setOrders(null);
    };
  }, [enabled, orderId, identity]);
  return { orders, error, connection, observed, refresh };
}
export function TrackingConnection({
  tracking,
}: {
  tracking: ReturnType<typeof useTrackingOrders>;
}) {
  return (
    <div className="surface tracking-connection">
      <span role="status">
        {tracking.connection}
        {tracking.observed
          ? ` · Last checked ${new Date(tracking.observed).toLocaleTimeString("en-NG")}`
          : ""}
      </span>
      <button className="button secondary" onClick={tracking.refresh}>
        Refresh tracking
      </button>
      {tracking.error && <Notice type="error" message={tracking.error} />}
    </div>
  );
}
export function TrackingDetails({
  order,
  staff = false,
}: {
  order: any;
  staff?: boolean;
}) {
  return (
    <section aria-label="Delivery tracking details">
      {!staff && <><OrderCardPayment order={order}/><OrderInvoice orderId={order.id} /><OrderOperations order={order} customer/></>}
      <p>
        <strong>{trackingLabels[order.status] ?? order.status}</strong> ·
        Payment: {order.payment_status}
      </p>
      <p>
        Assigned driver: {order.driver?.name ?? "Awaiting assignment"} · Last
        order update:{" "}
        {new Date(order.last_update ?? order.created_at).toLocaleString(
          "en-NG",
          { timeZone: "Africa/Lagos" },
        )}{" "}
        (Lagos time)
      </p>
      {deliveryDelayed(order) && (
        <Notice message="The scheduled delivery window has passed. Contact dispatch for an update; no revised ETA has been confirmed." />
      )}
      {order.attempt && (
        <p>Delivery attempt: {order.attempt.state.replaceAll("_", " ")}</p>
      )}
      <p className="muted">
        Live driver location and ETA unavailable. Your scheduled delivery window
        is shown above.
      </p>
      {order.status === "delivery_failed" && (
        <Notice message="Delivery was unsuccessful. Contact support to arrange the next step; a new delivery is not confirmed until dispatch accepts it." />
      )}
      {!staff && (
        <Link
          className="button secondary"
          href={`/support?orderId=${encodeURIComponent(order.id)}`}
        >
          Report an issue or request a delivery change
        </Link>
      )}
    </section>
  );
}
export default function DispatchTracking({ user, orderId = "" }: { user: any; orderId?: string }) {
  const tracking = useTrackingOrders(
      true,
      orderId,
      `${user.id}:${user.role}:${user.branchId ?? user.branch_id}`,
    ),
    [filter, setFilter] = useState("all"),
    [query, setQuery] = useState(""),
    [branch, setBranch] = useState("all"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [drivers, setDrivers] = useState<any[]>([]);
  const pending = useRef<{ fingerprint: string; key: string } | null>(null);
  const driver = user.role === "driver";
  useEffect(() => {
    if (!driver)
      api("tracking.drivers")
        .then(setDrivers)
        .catch(() => setDrivers([]));
  }, [driver]);
  async function mutate(action: string, payload: any) {
    const fingerprint = JSON.stringify({ action, payload });
    if (pending.current?.fingerprint !== fingerprint)
      pending.current = { fingerprint, key: crypto.randomUUID() };
    setBusy(true);
    setError("");
    try {
      await api(action, { ...payload, operationKey: pending.current.key });
      pending.current = null;
      await tracking.refresh();
    } catch (e: any) {
      try {
        const outcome = await api(
          `tracking.operation?key=${encodeURIComponent(pending.current!.key)}`,
        );
        if (outcome.status === "COMMITTED") {
          pending.current = null;
          await tracking.refresh();
          return;
        }
      } catch {}
      setError(
        e.message +
          " The operation identity is retained for retry; refresh before starting a different operation.",
      );
    } finally {
      setBusy(false);
    }
  }
  const orders =
    tracking.orders?.filter(
      (o) => branch === "all" || o.branch_id === branch,
    ) ?? null;
  const completed = orders?.filter((o) => o.status === "delivered") ?? [];
  const durations = completed
    .map((o) => {
      const start = o.events.find((e: any) => e.status === "out_for_delivery"),
        end = o.events.find((e: any) => e.status === "delivered");
      return start && end
        ? Date.parse(end.created_at) - Date.parse(start.created_at)
        : NaN;
    })
    .filter(Number.isFinite);
  const queues = [
    "all",
    "placed",
    "accepted",
    "preparing",
    "unassigned",
    "delayed",
    "assigned",
    "out_for_delivery",
    "delivery_failed",
    "returns",
    "delivered",
    "cancelled",
  ];
  return (
    <div className="page">
      <h1>{driver ? "My delivery stops" : "Dispatch centre"}</h1>
      <p>
        {driver
          ? "Only deliveries assigned to you are shown. Pickup and proof are verified by the server."
          : "Committed orders, assignment, failed attempts and return reconciliation."}
      </p>
      <TrackingConnection tracking={tracking} />
      {!driver && (
        <>
          <label>
            Branch filter
            <select value={branch} onChange={(e) => setBranch(e.target.value)}>
              <option value="all">All permitted branches</option>
              {[
                ...new Set<string>(
                  (tracking.orders ?? []).map((o) => o.branch_id),
                ),
              ].map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </label>
          <p>
            Most recent permitted orders (maximum 100): {orders?.length ?? 0}.
            Completed: {completed.length}. Recorded dispatch-to-delivery
            average:{" "}
            {durations.length
              ? `${Math.round(durations.reduce((n, v) => n + v, 0) / durations.length / 60000)} minutes (${durations.length} deliveries)`
              : "Unavailable — no completed event pairs"}
            .
          </p>
          <Link href="/admin/incidents">Review delivery exceptions</Link>
        </>
      )}

      {error && <Notice type="error" message={error} />}
      <label>
        Search orders
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Reference or customer"
        />
      </label>
      <div
        className="tracking-queues"
        role="group"
        aria-label="Dispatch queues"
      >
        {queues.map((q) => (
          <button
            className={`button ${filter === q ? "" : "secondary"}`}
            key={q}
            onClick={() => setFilter(q)}
          >
            {trackingLabels[q] ?? q.replaceAll("_", " ")} (
            {orders?.filter(
              (o) =>
                q === "all" ||
                (q === "delayed" && deliveryDelayed(o)) ||
                (q === "unassigned" &&
                  !o.driver_id &&
                  !["delivered", "cancelled"].includes(o.status)) ||
                (q === "returns" &&
                  o.status === "delivery_failed" &&
                  o.attempt?.picked_up_at &&
                  o.attempt.state !== "returned") ||
                o.status === q,
            ).length ?? 0}
            )
          </button>
        ))}
      </div>
      {!orders ? (
        <Loading />
      ) : !orders.length ? (
        <p>No assigned orders.</p>
      ) : (
        orders
          .filter(
            (o) =>
              (filter === "all" ||
                (filter === "delayed" && deliveryDelayed(o)) ||
                (filter === "unassigned" &&
                  !o.driver_id &&
                  !["delivered", "cancelled"].includes(o.status)) ||
                (filter === "returns" &&
                  o.status === "delivery_failed" &&
                  o.attempt?.picked_up_at &&
                  o.attempt.state !== "returned") ||
                o.status === filter) &&
              `${o.reference} ${o.customer_name}`
                .toLowerCase()
                .includes(query.toLowerCase()),
          )
          .map((o) => (
            <article key={o.id} className="surface workflow-form tracking-stop">
              <h2>
                {o.reference} · {trackingLabels[o.status] ?? o.status}
              </h2>
              <p>
                {o.customer_name} · {o.address.street}, {o.address.zone}
              </p>
              <p>
                {o.delivery_date} · {o.delivery_window} · {money(o.total_kobo)}
              </p>
              <TrackingDetails order={o} staff />
              <details>
                <summary>Items, cylinder serials and event history</summary>
                <p>
                  Check every quantity and serial against the physical load.
                </p>
                <pre
                  style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
                >
                  {JSON.stringify(o.manifest, null, 2)}
                </pre>
                {o.events.map((e: any, i: number) => (
                  <p key={i}>
                    {trackingEventLabel(e)} ·{" "}
                    {new Date(e.created_at).toLocaleString("en-NG")} · {e.note}
                  </p>
                ))}
              </details>
              {[
                "owner",
                "manager",
                "dispatcher",
                "driver",
                "inventory",
              ].includes(user.role) &&
                !["delivered", "cancelled"].includes(o.status) && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const values = Object.fromEntries(
                        new FormData(e.currentTarget),
                      );
                      const action = String(values.action);
                      const payload: any = {
                        orderId: o.id,
                        version: o.tracking_version,
                        reason: values.reason,
                      };
                      if (action === "order.transition") {
                        delete payload.orderId;
                        delete payload.reason;
                        payload.id = o.id;
                        payload.note = values.reason;
                        payload.status = values.status;
                        if (values.status === "delivery_failed")
                          payload.failureReason = values.failureReason;
                        if (values.driverId) payload.driverId = values.driverId;
                      } else if (action === "delivery.complete") {
                        delete payload.reason;
                        payload.code = values.code;
                        payload.handover = values.handover === "on";
                        payload.collectedKobo =
                          ["wallet", "card"].includes(o.payment_method)
                            ? 0
                            : Math.round(Number(values.cash) * 100);
                      } else if (
                        ["delivery.pickup", "delivery.return"].includes(action)
                      )
                        payload.manifest = o.manifest;
                      else if (action === "delivery.reschedule") {
                        payload.date = values.date;
                        payload.window = values.window;
                      }
                      mutate(action, payload);
                    }}
                  >
                    <label>
                      Action
                      <select name="action">
                        <option value="order.transition">
                          {driver
                            ? "Update assigned delivery"
                            : "Update status / assign"}
                        </option>
                        <option value="delivery.help">
                          Request dispatch help
                        </option>
                        {o.status === "assigned" &&
                          o.attempt?.state === "assigned" && (
                            <option value="delivery.pickup">
                              Confirm physical pickup
                            </option>
                          )}
                        {o.status === "out_for_delivery" && (
                          <>
                            {o.attempt?.state === "picked_up" && (
                              <option value="delivery.arrived">
                                Mark arrived
                              </option>
                            )}
                            <option value="delivery.complete">
                              Verify complete handover
                            </option>
                          </>
                        )}
                        {!driver && (
                          <>
                            <option value="delivery.reschedule">
                              Reschedule delivery
                            </option>
                            <option value="delivery.return">
                              Receive and inspect physical return
                            </option>
                          </>
                        )}
                      </select>
                    </label>
                    <label>
                      Next status
                      <select name="status">
                        {(orderTransitions[o.status] ?? [])
                          .filter(
                            (s) =>
                              s !== "delivered" &&
                              (!driver ||
                                [
                                  "out_for_delivery",
                                  "delivery_failed",
                                ].includes(s)),
                          )
                          .map((s) => (
                            <option key={s} value={s}>
                              {trackingLabels[s]}
                            </option>
                          ))}
                      </select>
                    </label>
                    {!driver && (
                      <label>
                        Assign driver
                        <select name="driverId">
                          <option value="">Choose when assigning</option>
                          {drivers
                            .filter(
                              (d) =>
                                d.role === "driver" &&
                                d.active &&
                                d.branch_id === o.branch_id,
                            )
                            .map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.name} ({d.active_stops} active stops)
                              </option>
                            ))}
                        </select>
                      </label>
                    )}
                    <label>
                      Failure category (when reporting unsuccessful delivery)
                      <select name="failureReason" defaultValue="other">
                        {deliveryFailureReasons.map((r) => (
                          <option key={r} value={r}>
                            {r.replaceAll("_", " ")}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Operational reason / failure details
                      <textarea
                        name="reason"
                        required
                        minLength={5}
                        maxLength={500}
                      />
                    </label>
                    <details>
                      <summary>Handover proof / reschedule fields</summary>
                      <label>
                        Customer one-time delivery code
                        <input
                          name="code"
                          autoComplete="off"
                          inputMode="numeric"
                          pattern="[0-9]{6}"
                          maxLength={6}
                        />
                      </label>
                      <label>
                        {["wallet", "card"].includes(o.payment_method) ? "Prepaid order — collect no cash" : "Cash actually collected (₦)"}
                        <input name="cash" type="number" min="0" step="0.01" defaultValue={["wallet", "card"].includes(o.payment_method) ? 0 : undefined} readOnly={["wallet", "card"].includes(o.payment_method)} />
                      </label>
                      <label>
                        <input type="checkbox" name="handover" />I physically
                        checked every quantity and serial and handed over all
                        items. No partial delivery.
                      </label>
                      {!driver && (
                        <>
                          <label>
                            New delivery date
                            <input name="date" type="date" />
                          </label>
                          <label>
                            Configured delivery window
                            <input
                              name="window"
                              placeholder="Use the configured delivery window"
                            />
                          </label>
                        </>
                      )}
                    </details>
                    <button className="button" disabled={busy}>
                      Submit for server verification
                    </button>
                  </form>
                )}
              {driver && (
                <a
                  className="button secondary"
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.address.street + ", " + o.address.zone)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open navigation
                </a>
              )}
            </article>
          ))
      )}
    </div>
  );
}
