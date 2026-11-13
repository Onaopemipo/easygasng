"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { RiderMap } from "./rider-map";
import {
  Package,
  UserRound,
  Truck,
  CheckCircle2,
  TriangleAlert,
  Users,
  MapPin,
  RefreshCw,
  Plus,
  Fuel,
  ClipboardList,
  ArrowLeftRight,
  X,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { api, Notice, Loading, money } from "./ui";
import { ActionLoadingIndicator } from "./easygas-loader";
import DispatchTracking from "./order-tracking";
import { OperationsExtensions } from "./operations-completion";
import {
  lagosDate,
  type DispatchTab,
} from "../../../packages/business-rules/src/dispatch-centre";

export default function DispatchCentre({ user }: { user: any }) {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [tab, setTab] = useState<DispatchTab>("queue"),
    [date, setDate] = useState(lagosDate()),
    [q, setQ] = useState(""),
    [branch, setBranch] = useState(""),
    [area, setArea] = useState(""),
    [priority, setPriority] = useState(""),
    [windowFilter, setWindow] = useState(""),
    [page, setPage] = useState(1),
    [view, setView] = useState("centre"),
    [candidate, setCandidate] = useState<any>(null),
    [reason, setReason] = useState(""),
    [selected, setSelected] = useState(""),
    [working, setWorking] = useState(false);
  const [mapDriver, setMapDriver] = useState("");
  const [mapFreshness, setMapFreshness] = useState("");
  const [locationScope, setLocationScope] = useState("");
  const viewerScope = JSON.stringify([
    user.id,
    user.role,
    user.branchId,
    branch,
  ]);
  const fleetLocationsVisible = !error && locationScope === viewerScope;
  const mapPoints = useMemo(() => {
    if (!fleetLocationsVisible) return [];
    return (data?.drivers ?? []).flatMap((driver: any) => {
      const fix = driver.location?.lastKnown;
      if (
        !fix ||
        (mapDriver && driver.id !== mapDriver) ||
        (mapFreshness && driver.location.status !== mapFreshness)
      )
        return [];
      return [
        {
          id: driver.id,
          lat: fix.lat,
          lng: fix.lng,
          label: `${driver.name}, recorded ${new Date(fix.recordedAt).toLocaleString("en-NG", { timeZone: "Africa/Lagos" })} Lagos time, ±${Math.round(fix.accuracy)} m, ${driver.active_stops} deliveries`,
          onSelect: () => {
            const detail = document.getElementById(
              `dispatch-driver-${driver.id}`,
            );
            if (detail instanceof HTMLDetailsElement) {
              detail.open = true;
              detail.querySelector("summary")?.focus();
            }
          },
        },
      ];
    });
  }, [data, fleetLocationsVisible, mapDriver, mapFreshness]);
  const [focusedOrderId, setFocusedOrderId] = useState("");
  const [status, setStatus] = useState(""),
    [sort, setSort] = useState("oldest");
  const sequence = useRef(0),
    abort = useRef<AbortController | null>(null);
  const query = new URLSearchParams({
    date,
    q,
    branch,
    area,
    priority,
    window: windowFilter,
    tab,
    status,
    sort,
    page: String(page),
  }).toString();
  async function refresh() {
    const generation = ++sequence.current;
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    const deadline = setTimeout(() => {
      if (generation === sequence.current) {
        controller.abort();
        setError(
          "Dispatch refresh timed out. The last successful snapshot is retained; retry when connected.",
        );
        setBusy(false);
      }
    }, 10000);
    try {
      const next = await api("dispatch.centre?" + query, undefined, {
        signal: controller.signal,
      });
      if (generation === sequence.current) {
        setData(next);
        setLocationScope(viewerScope);
        setError("");
      }
    } catch (e: any) {
      if (generation === sequence.current && e.name !== "AbortError") {
        setError(e.message);
        if ([401, 403].includes(e.status)) {
          setData(null);
          setCandidate(null);
        }
      }
    } finally {
      clearTimeout(deadline);
      if (generation === sequence.current) setBusy(false);
    }
  }
  useEffect(() => {
    setData(null);
    setCandidate(null);
    refresh();
    const timer = setInterval(refresh, 30000);
    const visible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", visible);
    const offline = () => {
      sequence.current++;
      abort.current?.abort();
      setBusy(false);
      setError("Offline. Showing the last successful dispatch snapshot.");
    };
    window.addEventListener("online", visible);
    window.addEventListener("offline", offline);
    return () => {
      sequence.current++;
      abort.current?.abort();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
      window.removeEventListener("online", visible);
      window.removeEventListener("offline", offline);
    };
  }, [query, user.id, user.role, user.branchId]);
  const dialogRef = useRef<HTMLElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const pendingAssignment = useRef<{ fingerprint: string; key: string } | null>(
    null,
  );
  useEffect(() => {
    if (!candidate) return;
    const prior = openerRef.current;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setCandidate(null);
        return;
      }
      if (event.key !== "Tab") return;
      const nodes = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled),input:not(:disabled),textarea:not(:disabled),select:not(:disabled),a[href]",
        ) ?? [],
      );
      const first = nodes[0],
        last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", handler);
    return () => {
      document.removeEventListener("keydown", handler);
      prior?.focus();
    };
  }, [candidate]);
  async function choose(order: any) {
    openerRef.current = document.activeElement as HTMLElement | null;
    setError("");
    setReason("");
    setSelected("");
    const generation = sequence.current;
    try {
      const result = await api(
        "dispatch.candidates?orderId=" + encodeURIComponent(order.id),
      );
      if (generation === sequence.current) setCandidate(result);
    } catch (e: any) {
      setError(e.message);
    }
  }
  async function assign() {
    if (!candidate || !selected) return;
    setWorking(true);
    setError("");
    try {
      const fingerprint = JSON.stringify({
        identity: user.id,
        orderId: candidate.orderId,
        version: candidate.version,
        driverId: selected,
        reason,
      });
      if (pendingAssignment.current?.fingerprint !== fingerprint)
        pendingAssignment.current = { fingerprint, key: crypto.randomUUID() };
      await api(candidate.action, {
        orderId: candidate.orderId,
        driverId: selected,
        version: candidate.version,
        reason,
        operationKey: pendingAssignment.current!.key,
      });
      pendingAssignment.current = null;
      setCandidate(null);
      await refresh();
    } catch (e: any) {
      setCandidate(null);
      await refresh();
      setError(e.message);
    } finally {
      setWorking(false);
    }
  }
  function openOrderActions(orderId: string) {
    setFocusedOrderId(orderId);
    setView("history");
  }
  function changeTab(next: DispatchTab, statusFilter = "") {
    setView("centre");
    setTab(next);
    setStatus(statusFilter);
    setPage(1);
  }
  function showDrivers() {
    setView("centre");
    requestAnimationFrame(() =>
      document
        .getElementById("dispatch-drivers")
        ?.scrollIntoView({ behavior: "smooth" }),
    );
  }
  function operations(label: string) {
    setView("operations");
    requestAnimationFrame(() => {
      const root = document.getElementById("dispatch-operations");
      root?.scrollIntoView({ behavior: "smooth" });
      const details = Array.from(root?.querySelectorAll("details") ?? []).find(
        (d) => d.querySelector("summary")?.textContent?.includes(label),
      );
      if (details) details.open = true;
    });
  }
  const cards = [
    {
      label: "Ready for Dispatch",
      value: data?.kpis.ready,
      icon: Package,
      tone: "blue",
      tab: "queue",
    },
    {
      label: "Assigned",
      value: data?.kpis.assigned,
      icon: UserRound,
      tone: "amber",
      tab: "live",
    },
    {
      label: "In Transit",
      value: data?.kpis.inTransit,
      icon: Truck,
      tone: "blue",
      tab: "live",
    },
    {
      label: "Delivered Today",
      value: data?.kpis.delivered,
      icon: CheckCircle2,
      tone: "green",
      tab: "completed",
    },
    {
      label: "Failed / Exception",
      value: data?.kpis.exceptions,
      icon: TriangleAlert,
      tone: "red",
      tab: "exceptions",
    },
    {
      label: "Drivers Online",
      value: data?.kpis.driversOnline,
      icon: Users,
      tone: "purple",
      tab: null,
    },
  ];
  return (
    <div className="dispatch-centre">
      <header className="dc-heading">
        <div>
          <h1>Dispatch Centre</h1>
          <p>
            Manage deliveries, assign drivers, track progress and reconcile
            stock
          </p>
        </div>
        <div className="dc-heading-controls">
          <span className="dc-contact" aria-live="polite">
            <span className={error || !data ? "dc-dot stale" : "dc-dot"} />
            {busy
              ? <ActionLoadingIndicator label="Refreshing dispatch records" />
              : error
                ? "Updates unavailable"
                : data
                  ? "Polling updates"
                  : "Waiting for update"}
            <small>
              {data
                ? "Last checked " +
                  new Date(data.observedAt).toLocaleTimeString("en-NG", {
                    timeZone: "Africa/Lagos",
                  })
                : "Waiting for first update"}
            </small>
          </span>
          <label className="sr-only" htmlFor="dispatch-date">
            Operations date (Lagos)
          </label>
          <input
            id="dispatch-date"
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value);
              setPage(1);
            }}
          />
          <button
            className="dc-icon"
            aria-label="Refresh dispatch"
            onClick={refresh}
          >
            <RefreshCw size={19} />
          </button>
        </div>
      </header>
      {error && <Notice type="error" message={error} />}
      {!data ? (!error || busy) && <Loading page label="Loading dispatch records" /> : <>
      <div className="dc-kpis">
        {cards.map((c) => (
          <button
            key={c.label}
            className={"dc-kpi " + c.tone}
            title={
              c.label === "Drivers Online"
                ? data?.contactNote
                : c.label === "Ready for Dispatch"
                  ? data?.readinessNote
                  : "Selected Lagos date and filters"
            }
            onClick={() =>
              c.tab
                ? changeTab(
                    c.tab as DispatchTab,
                    c.label === "Assigned"
                      ? "assigned"
                      : c.label === "In Transit"
                        ? "out_for_delivery"
                        : "",
                  )
                : showDrivers()
            }
          >
            <span className="dc-kpi-icon">
              <c.icon size={27} />
            </span>
            <span>
              <strong>{c.value ?? "—"}</strong>
              <span>
                {c.label === "Delivered Today" && date !== lagosDate()
                  ? "Delivered on Date"
                  : c.label}
              </span>
            </span>
            <span aria-hidden>›</span>
          </button>
        ))}
      </div>
      {data?.kpis.ready === null && (
        <Notice type="error" message={data.readinessNote} />
      )}
      <div className="dc-workspace-tabs">
        <button
          className={view === "centre" ? "active" : ""}
          onClick={() => {
            setView("centre");
            refresh();
          }}
        >
          Dispatch overview
        </button>
        <button
          className={view === "operations" ? "active" : ""}
          onClick={() => setView("operations")}
        >
          Manifests, LPG, trips &amp; returns
        </button>
        <button
          className={view === "history" ? "active" : ""}
          onClick={() => {
            setFocusedOrderId("");
            setView("history");
          }}
        >
          Order tracking &amp; actions
        </button>
      </div>
      {view === "operations" ? (
        <section id="dispatch-operations">
          <OperationsExtensions section="deliveries" user={user} />
        </section>
      ) : view === "history" ? (
        <DispatchTracking user={user} orderId={focusedOrderId} />
      ) : (
        <>
          <div className="dc-layout">
            <section className="dc-panel dc-queue" aria-label="Dispatch orders">
              <div
                className="dc-tabs"
                role="tablist"
                aria-label="Delivery queues"
              >
                {(
                  [
                    ["queue", "Dispatch Queue"],
                    ["live", "Live Deliveries"],
                    ["completed", "Completed"],
                    ["exceptions", "Exceptions"],
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    role="tab"
                    aria-selected={tab === id}
                    className={tab === id ? "active" : ""}
                    onClick={() => changeTab(id)}
                  >
                    {label} ({data?.counts[id] ?? "—"})
                  </button>
                ))}
              </div>
              <div className="dc-filters">
                <label className="dc-search">
                  <Search size={18} />
                  <input
                    aria-label="Search orders"
                    placeholder="Search by order ID, customer or address…"
                    value={q}
                    onChange={(e) => {
                      setQ(e.target.value);
                      setPage(1);
                    }}
                  />
                </label>
                <select
                  aria-label="Branch"
                  value={branch}
                  onChange={(e) => {
                    setBranch(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All Branches</option>
                  {data?.branches.map((b: any) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                      {b.active ? "" : " (inactive)"}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Area"
                  value={area}
                  onChange={(e) => {
                    setArea(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All Areas</option>
                  {data?.areas.map((a: string) => (
                    <option key={a}>{a}</option>
                  ))}
                </select>
                <select
                  aria-label="Priority"
                  value={priority}
                  onChange={(e) => {
                    setPriority(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">Priority</option>
                  <option>Overdue</option>
                  <option>Normal</option>
                </select>
                <select
                  aria-label="Delivery window"
                  value={windowFilter}
                  onChange={(e) => {
                    setWindow(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All Windows</option>
                  {data?.windows.map((w: string) => (
                    <option key={w}>{w}</option>
                  ))}
                </select>
                <select
                  aria-label="Delivery status"
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">All Statuses</option>
                  {[
                    "accepted",
                    "preparing",
                    "assigned",
                    "out_for_delivery",
                    "delivered",
                    "delivery_failed",
                  ].map((s) => (
                    <option key={s} value={s}>
                      {s.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Sort deliveries"
                  value={sort}
                  onChange={(e) => {
                    setSort(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="oldest">Oldest first</option>
                  <option value="newest">Newest first</option>
                  <option value="customer">Customer name</option>
                </select>
              </div>
              <>
                  <div className="dc-table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Order ID</th>
                          <th>Customer</th>
                          <th>Address</th>
                          <th>Order</th>
                          <th>Payment</th>
                          <th>Priority</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.rows.map((o: any) => (
                          <tr key={o.id}>
                            <td>
                              <strong>{o.reference}</strong>
                              <small>{o.delivery_window}</small>
                              <small>{o.status.replaceAll("_", " ")}</small>
                            </td>
                            <td>{o.customer_name}</td>
                            <td>
                              <MapPin size={15} />
                              {o.address?.street}
                              <small>{o.address?.zone}</small>
                            </td>
                            <td>
                              {Number(o.gas_grams) > 0 && (
                                <span>{Number(o.gas_grams) / 1000} kg</span>
                              )}
                              {o.items?.map((i: any) => (
                                <small key={i.name}>
                                  {i.name} × {i.quantity}
                                </small>
                              ))}
                            </td>
                            <td>
                              <span
                                className={
                                  "dc-badge " +
                                  (o.paymentLabel === "Paid"
                                    ? "green"
                                    : "amber")
                                }
                              >
                                {o.paymentLabel}
                              </span>
                            </td>
                            <td>
                              <span
                                className={
                                  "dc-badge " +
                                  (o.priority === "Overdue" ? "red" : "green")
                                }
                              >
                                {o.priority}
                              </span>
                            </td>
                            <td>
                              {tab === "queue" ? (
                                <>
                                  <button
                                    className="dc-assign"
                                    onClick={() =>
                                      o.canAssign
                                        ? choose(o)
                                        : openOrderActions(o.id)
                                    }
                                  >
                                    {o.canAssign
                                      ? "Assign Driver"
                                      : "Review preparation"}
                                  </button>
                                  <button
                                    className="dc-text"
                                    onClick={() => openOrderActions(o.id)}
                                  >
                                    View details
                                  </button>
                                  {o.readiness.ready === false && (
                                    <small
                                      className="dc-blocked"
                                      title={o.readiness.reasons.join(" ")}
                                    >
                                      Blocked · review
                                    </small>
                                  )}
                                </>
                              ) : (
                                <>
                                  <span>{o.driver_name ?? "Unassigned"}</span>
                                  {o.exception && (
                                    <small className="dc-blocked">
                                      {o.exception}
                                    </small>
                                  )}
                                  {o.status === "assigned" && (
                                    <button
                                      className="dc-assign"
                                      onClick={() => choose(o)}
                                    >
                                      Reassign Driver
                                    </button>
                                  )}
                                  <button
                                    className="dc-text"
                                    onClick={() => openOrderActions(o.id)}
                                  >
                                    View tracking
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!data.rows.length && (
                      <div className="dc-empty">
                        No deliveries match this date and filters.
                      </div>
                    )}
                  </div>
                  <footer className="dc-pagination">
                    <span>
                      {data.total
                        ? `Showing ${(data.page - 1) * data.pageSize + 1}–${Math.min(data.page * data.pageSize, data.total)} of ${data.total} orders`
                        : "0 orders"}
                    </span>
                    <div>
                      <button
                        aria-label="Previous page"
                        disabled={data.page <= 1}
                        onClick={() => setPage(data.page - 1)}
                      >
                        <ChevronLeft size={17} />
                      </button>
                      <span>{data.page}</span>
                      <button
                        aria-label="Next page"
                        disabled={data.page * data.pageSize >= data.total}
                        onClick={() => setPage(data.page + 1)}
                      >
                        <ChevronRight size={17} />
                      </button>
                    </div>
                  </footer>
              </>
            </section>
            <aside className="dc-panel dc-map">
              <h2>Delivery map</h2>
              <p className="dc-muted">
                Recorded rider locations. Arrival estimates are unavailable
                here.
              </p>
              <div className="dc-filters">
                <label>
                  Driver
                  <select
                    value={mapDriver}
                    onChange={(event) => setMapDriver(event.target.value)}
                  >
                    <option value="">All visible drivers</option>
                    {data?.drivers
                      .filter((driver: any) => Number(driver.active_stops) > 0)
                      .map((driver: any) => (
                        <option key={driver.id} value={driver.id}>
                          {driver.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  Location status
                  <select
                    value={mapFreshness}
                    onChange={(event) => setMapFreshness(event.target.value)}
                  >
                    <option value="">All recorded locations</option>
                    <option value="recent_observation">
                      Recent observations
                    </option>
                    <option value="last_known_only">Last known only</option>
                  </select>
                </label>
              </div>
              <RiderMap key={viewerScope} points={mapPoints.slice(0, 50)} />
              {mapPoints.length > 50 && (
                <p className="dc-muted">
                  Showing 50 map points. Select a driver to narrow the map.
                </p>
              )}
              <div id="dispatch-drivers">
                <h2>Active Drivers ({data?.drivers.length ?? "—"})</h2>
                <p className="dc-muted">{data?.contactNote}</p>
                {data?.drivers.map((driver: any) => {
                  const d = fleetLocationsVisible
                    ? driver
                    : { ...driver, location: null };
                  return (
                    <div className="dc-driver" key={d.id}>
                      <span className="dc-avatar">{d.name.slice(0, 1)}</span>
                      <div>
                        <strong>{d.name}</strong>
                        <small>
                          {d.driver_available
                            ? "Available for assignment"
                            : "Unavailable"}{" "}
                          ·{" "}
                          {d.contact === "recent_contact"
                            ? "Recent contact"
                            : d.contact === "stale"
                              ? "Stale contact"
                              : "Contact unknown"}
                        </small>
                        <small>
                          {d.driver_last_seen_at
                            ? "Last contact " +
                              new Date(
                                d.driver_last_seen_at,
                              ).toLocaleTimeString("en-NG", {
                                timeZone: "Africa/Lagos",
                              })
                            : "No contact recorded"}
                        </small>
                      </div>
                      <span className="dc-badge green">
                        {d.active_stops} deliveries
                      </span>
                      {d.location?.lastKnown && (
                        <small className="dc-location">
                          <a
                            href={
                              "https://www.google.com/maps/search/?api=1&query=" +
                              encodeURIComponent(
                                d.location.lastKnown.lat +
                                  "," +
                                  d.location.lastKnown.lng,
                              )
                            }
                            target="_blank"
                            rel="noreferrer"
                          >
                            {d.location.status === "recent_observation" &&
                            !error &&
                            Date.now() -
                              Date.parse(d.location.lastKnown.recordedAt) <
                              120000
                              ? "Recent GPS observation"
                              : "Last known GPS · stale"}
                          </a>{" "}
                          ·{" "}
                          {Math.max(
                            0,
                            Math.floor(
                              (Date.now() -
                                Date.parse(d.location.lastKnown.recordedAt)) /
                                1000,
                            ),
                          )}
                          s old · ±{d.location.lastKnown.accuracy}m
                        </small>
                      )}
                      {!d.location?.lastKnown && <small>GPS unavailable</small>}
                      <details
                        className="dc-driver-details"
                        id={`dispatch-driver-${d.id}`}
                      >
                        <summary>View status details</summary>
                        <p>
                          Last authenticated contact:{" "}
                          {d.driver_last_seen_at
                            ? new Date(d.driver_last_seen_at).toLocaleString(
                                "en-NG",
                                { timeZone: "Africa/Lagos" },
                              ) + " (Lagos)"
                            : "Unknown"}
                        </p>
                        {d.location?.lastKnown ? (
                          <>
                            <p>
                              GPS captured:{" "}
                              {new Date(
                                d.location.lastKnown.recordedAt,
                              ).toLocaleString("en-NG", {
                                timeZone: "Africa/Lagos",
                              })}{" "}
                              (Lagos)
                            </p>
                            <p>
                              GPS received:{" "}
                              {d.location.lastKnown.receivedAt
                                ? new Date(
                                    d.location.lastKnown.receivedAt,
                                  ).toLocaleString("en-NG", {
                                    timeZone: "Africa/Lagos",
                                  })
                                : "Unknown"}
                            </p>
                            <p>
                              Accuracy: ±{d.location.lastKnown.accuracy} m.{" "}
                              {d.location.lastKnown.delayedUpload
                                ? "Delayed upload; capture time determines freshness."
                                : "Capture and receipt times are recorded separately."}
                            </p>
                          </>
                        ) : (
                          <p>
                            No authorised GPS observation is available. Location
                            is shown only during an active, consented delivery
                            trip.
                          </p>
                        )}
                      </details>
                    </div>
                  );
                })}
                {data && !data.drivers.length && (
                  <p>No active driver accounts in this scope.</p>
                )}
              </div>
            </aside>
          </div>
          <div className="dc-bottom">
            <section className="dc-panel dc-operations">
              <h2>
                {date === lagosDate()
                  ? "Today’s Operations"
                  : "Operations on " + date}
              </h2>
              <div>
                <img src="/assets/cylinder-illustration.png" alt="" />
                <dl>
                  <div>
                    <dt>Gas Loaded (Out)</dt>
                    <dd>
                      {data ? data.operations.loadedGrams / 1000 : "—"} kg
                    </dd>
                  </div>
                  <div>
                    <dt>Gas Delivered</dt>
                    <dd>
                      {data ? data.operations.deliveredGrams / 1000 : "—"} kg
                    </dd>
                  </div>
                  <div>
                    <dt>Gas Remaining (Est.)</dt>
                    <dd>
                      {data
                        ? data.operations.estimatedRemainingGrams / 1000
                        : "—"}{" "}
                      kg
                    </dd>
                  </div>
                </dl>
              </div>
              <p className="dc-muted">
                Branch scope; loading, deliveries and verified returns use the
                selected Lagos date. Order search filters do not partition
                vehicle mass. Remaining is current open-load custody, including
                held loads; it is not a physical stock verification. Held loads:{" "}
                {data?.operations.heldLoads ?? "—"}. Verified returns:{" "}
                {data ? data.operations.verifiedReturnsGrams / 1000 : "—"} kg.
                Return discrepancies recorded:{" "}
                {data?.operations.discrepancyEvents ?? "—"}.
              </p>
            </section>
            <section className="dc-panel dc-quick">
              <h2>Quick Actions</h2>
              <div>
                {[
                  {
                    label: "Create Vehicle Manifest",
                    icon: Truck,
                    open: "Vehicle product",
                  },
                  {
                    label: "Record Gas Loading",
                    icon: ClipboardList,
                    open: "Bulk LPG",
                  },
                  {
                    label: "Log Fuel Purchase",
                    icon: Fuel,
                    open: "Driver trips",
                  },
                  {
                    label: "Record Returns & Reconciliation",
                    icon: ArrowLeftRight,
                    open: "Bulk LPG",
                  },
                ].map((a) => (
                  <button key={a.label} onClick={() => operations(a.open)}>
                    <a.icon size={30} />
                    <strong>{a.label}</strong>
                  </button>
                ))}
              </div>
            </section>
          </div>
        </>
      )}
      </>}
      {candidate && (
        <div className="dc-modal-backdrop">
          <section
            className="dc-drawer"
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="assign-title"
          >
            <button
              autoFocus
              className="dc-close"
              aria-label="Close assignment"
              onClick={() => setCandidate(null)}
            >
              <X />
            </button>
            <h2 id="assign-title">
              {candidate.action === "dispatch.reassign"
                ? "Reassign a driver"
                : "Assign a driver"}
            </h2>
            <p>
              Manual selection only. All safety, payment and custody checks run
              again when you submit.
            </p>
            {!candidate.writesEnabled && (
              <Notice
                type="error"
                message="Dispatch writes remain disabled pending operational release approval."
              />
            )}
            <fieldset>
              <legend>Branch drivers</legend>
              {candidate.candidates.map((d: any) => (
                <label key={d.id} className="dc-candidate">
                  <input
                    type="radio"
                    name="driver"
                    value={d.id}
                    disabled={!d.readiness.ready}
                    checked={selected === d.id}
                    onChange={() => setSelected(d.id)}
                  />
                  <span>
                    <strong>{d.name}</strong>
                    <small>
                      {d.readiness.ready
                        ? "Eligible at last check"
                        : d.readiness.reasons.join(" ")}
                    </small>
                  </span>
                </label>
              ))}
              {!candidate.candidates.length && (
                <p>No drivers in this branch.</p>
              )}
            </fieldset>
            <label>
              Assignment reason
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                minLength={10}
                maxLength={500}
              />
            </label>
            <button
              className="primary"
              disabled={
                working ||
                !candidate.writesEnabled ||
                !selected ||
                reason.trim().length < 10
              }
              onClick={assign}
            >
              {working ? "Assigning…" : "Confirm manual assignment"}
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
