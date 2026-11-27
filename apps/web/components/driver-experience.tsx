"use client";
import { AssignmentResponseActions } from "./assignment-response-actions";
import { FieldCaption } from "./field-caption";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  CalendarDays,
  ChevronRight,
  CircleCheck,
  Clock3,
  MapPin,
  Package,
  Radio,
  Truck,
  UserRound,
  House,
  ClipboardList,
  History,
  ArrowUpRight,
  Headphones,
  ShieldCheck,
  RefreshCw,
  Wifi,
  Navigation,
  Inbox,
} from "lucide-react";
import {
  assignmentLabel,
  driverDate,
  driverHistoryAction,
  driverNavigation,
  driverOrderAddress,
  driverOutcomes,
  type DriverHistory,
  type DriverHistoryRow,
} from "../../../packages/business-rules/src/driver-experience";
import {
  driverAssignmentSummary,
  driverAssignmentTone,
  driverContactLabel,
  driverInitials,
  driverMetric,
  driverNextAction,
  driverNextAssignment,
} from "../../../packages/business-rules/src/driver-presentation";
import { useTheme } from "./theme-provider";
import { ActionForm } from "./workflows";
import { api, Loading, Notice, Modal } from "./ui";
import DriverTripControls from "./driver-trip-controls";
import DriverDeliveryControls from "./driver-delivery-controls";
import DriverLPGControls, { lpgReadiness } from "./driver-lpg-controls";
import styles from "./driver-experience.module.css";

const tabs = ["Home", "Orders", "History", "Profile"] as const;
type Tab = (typeof tabs)[number];
const emptyFilters = { from: "", to: "", outcome: "", page: 1 };

export default function DriverExperience({ userId }: { userId: string }) {
  const appearance = useTheme();
  const [tab, setTab] = useState<Tab>("Home");
  const [data, setData] = useState<{
    snapshot: any;
    orders: any[];
    bulk: any;
    confirmedAt: string;
  } | null>(null);
  const [ready, setReady] = useState(false);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState("");
  const [completionMessage, setCompletionMessage] = useState("");
  const [connectionError, setConnectionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [supportOpen, setSupportOpen] = useState(false);
  const [tripOpen, setTripOpen] = useState(false);
  const [tripBusy, setTripBusy] = useState(false);
  const tripWriting = useRef(false);
  const listScroll = useRef(0);
  const historyScroll = useRef(0);
  const [historySearch, setHistorySearch] = useState("");
  const [notes, setNotes] = useState("");
  const [orderFilter, setOrderFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(emptyFilters);
  const [history, setHistory] = useState<DriverHistory | null>(null);
  const [historyError, setHistoryError] = useState("");
  const [historyRetry, setHistoryRetry] = useState(0);
  const [record, setRecord] = useState<DriverHistoryRow | null>(null);
  const [proof, setProof] = useState<any[] | null>(null);
  const [proofError, setProofError] = useState("");
  const request = useRef<AbortController | null>(null);
  const operation = useRef(new Map<string, string>());
  const writing = useRef(false);

  const refresh = useCallback(async (initialize = false) => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const timeout = setTimeout(
      () =>
        controller.abort(
          new Error("Request timed out. Retry to confirm assignments."),
        ),
      15000,
    );
    try {
      if (initialize)
        await api("driver.restrict", {}, { signal: controller.signal });
      const [snapshot, orders, bulk] = await Promise.all([
        api("driver.snapshot", undefined, { signal: controller.signal }),
        api("orders?active=1", undefined, { signal: controller.signal }),
        api("bulk.summary", undefined, { signal: controller.signal }),
      ]);
      if (controller.signal.aborted) return;
      setData({
        snapshot,
        orders,
        bulk,
        confirmedAt: new Date().toISOString(),
      });
      setStale(false);
      setConnectionError("");
      setReady(true);
    } catch (e: any) {
      if (controller.signal.aborted && request.current !== controller) return;
      if ([401, 403].includes(e.status)) {
        setData(null);
        setHistory(null);
        setRecord(null);
        setProof(null);
        setSelected(null);
        setReady(false);
      }
      setStale(true);
      setConnectionError(
        controller.signal.aborted
          ? "The connection timed out. Retry to confirm assignments."
          : e.message,
      );
    } finally {
      clearTimeout(timeout);
    }
  }, []);

  useEffect(() => {
    setCompletionMessage("");
    setTripOpen(false);
    setData(null);
    setHistory(null);
    setRecord(null);
    setProof(null);
    setSelected(null);
    setReady(false);
    operation.current.clear();
    void refresh(true);
    function reconnect() {
      void refresh();
    }
    function disconnect() {
      setStale(true);
    }
    window.addEventListener("online", reconnect);
    window.addEventListener("offline", disconnect);
    const interval = setInterval(() => {
      if (document.visibilityState === "visible" && !writing.current)
        void refresh();
    }, 30000);
    return () => {
      clearInterval(interval);
      request.current?.abort();
      request.current = null;
      window.removeEventListener("online", reconnect);
      window.removeEventListener("offline", disconnect);
    };
  }, [refresh, userId]);

  useEffect(() => {
    if (!ready || stale || tab !== "History") return;
    const controller = new AbortController();
    setHistory(null);
    setHistoryError("");
    const timeout = setTimeout(() => {
      setHistoryError("History timed out. Retry to confirm your records.");
      controller.abort();
    }, 15000);
    api(driverHistoryAction(filters), undefined, { signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) setHistory(result);
      })
      .catch((e: any) => {
        if (!controller.signal.aborted) {
          setHistoryError(e.message);
          if ([401, 403].includes(e.status)) {
            setData(null);
            setHistory(null);
            setRecord(null);
            setProof(null);
            setSelected(null);
            setReady(false);
            setConnectionError(
              "Driver access has changed. Sign in again or contact dispatch.",
            );
          }
        }
      })
      .finally(() => clearTimeout(timeout));
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [ready, stale, tab, filters, historyRetry]);

  useEffect(() => {
    setProof(null);
    setProofError("");
    if (!record?.has_proof || !ready || stale) return;
    const controller = new AbortController();
    const params = new URLSearchParams({
      orderId: record.order_id,
      attemptId: record.id,
    });
    const timeout = setTimeout(() => {
      setProofError("Evidence timed out. Refresh to retry.");
      controller.abort();
    }, 15000);
    api("delivery.photos?" + params, undefined, { signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) setProof(result.photos);
      })
      .catch((e: any) => {
        if (!controller.signal.aborted) {
          setProofError(e.message);
          if ([401, 403].includes(e.status)) {
            setData(null);
            setHistory(null);
            setRecord(null);
            setProof(null);
            setSelected(null);
            setReady(false);
            setConnectionError(
              "Driver access has changed. Sign in again or contact dispatch.",
            );
          }
        }
      })
      .finally(() => clearTimeout(timeout));
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [record, ready, stale]);

  async function write(action: string, input: Record<string, unknown>) {
    if (writing.current || !ready || stale) return;
    writing.current = true;
    setBusy(true);
    setError("");
    setCompletionMessage("");
    request.current?.abort();
    const signature = action + JSON.stringify(input);
    const key = operation.current.get(signature) ?? crypto.randomUUID();
    operation.current.set(signature, key);
    try {
      await api(action, { ...input, operationKey: key });
      operation.current.delete(signature);
      if (action === "driver.complete") {
        setSelected(null);
        setRecord(null);
        setTab("History");
        setFilters(emptyFilters);
        setHistorySearch("");
        setHistoryRetry((n) => n + 1);
        setCompletionMessage(
          "Delivery completed. The confirmed handover is in History.",
        );
      }
      await refresh();
    } catch (e: any) {
      setError(e.message);
      if ([401, 403, 409].includes(e.status) || !e.status) await refresh();
    } finally {
      writing.current = false;
      setBusy(false);
    }
  }

  function switchTab(next: Tab) {
    setCompletionMessage("");
    setTab(next);
    setSelected(null);
    setRecord(null);
    setNotes("");
  }

  const snapshot = data?.snapshot;
  const orders = data?.orders ?? [];
  const current = orders.find((row) => row.id === selected);
  const response = (id: string) =>
    snapshot?.responses.find((row: any) => row.order_id === id)?.decision;
  const next = driverNextAssignment(orders, snapshot?.responses ?? []);
  const openAssignment = (id: string) => {
    listScroll.current = window.scrollY;
    setNotes("");
    switchTab("Orders");
    setSelected(id);
  };
  const backToList = () => {
    setSelected(null);
    requestAnimationFrame(() =>
      window.scrollTo({ top: listScroll.current, behavior: "instant" }),
    );
  };
  const icons = [House, ClipboardList, History, UserRound];
  const descriptions: Record<Tab, string> = {
    Home: "Your delivery overview. Clear priorities for the road ahead.",
    Orders: "Review and manage your assigned deliveries.",
    History: "Closed delivery attempts and authorised evidence.",
    Profile: "Your account, preferences and delivery support.",
  };
  const filtered = orders.filter(
    (row) =>
      (orderFilter === "all" ||
        assignmentLabel(row.status, row.attempt?.state, response(row.id)) !==
          "Assigned") &&
      [row.reference, row.customer_name, driverOrderAddress(row.address)]
        .join(" ")
        .toLowerCase()
        .includes(search.trim().toLowerCase()),
  );

  return (
    <section className={styles.workspace}>
      <header className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>EASYGAS · DRIVER WORKSPACE</span>
          <h1>
            {tab === "Home" && snapshot ? (
              <>
                Good to see you, <span>{snapshot.profile.name}</span>
              </>
            ) : (
              tab
            )}
          </h1>
          <p>{descriptions[tab]}</p>
        </div>
        <button
          type="button"
          className="button secondary"
          disabled={busy || tripBusy}
          onClick={() => {
            setError("");
            void refresh(!ready);
          }}
        >
          <RefreshCw size={16} aria-hidden="true" /> Refresh
        </button>
      </header>
      <nav aria-label="Driver workspace" className={styles.tabs}>
        {tabs.map((name, i) => {
          const Icon = icons[i];
          return (
            <button
              key={name}
              type="button"
              aria-pressed={tab === name}
              onClick={() => switchTab(name)}
            >
              <Icon size={18} aria-hidden="true" />
              {name}
            </button>
          );
        })}
      </nav>
      {error && <Notice type="error" message={error} />}
      {completionMessage && <Notice message={completionMessage} />}
      {connectionError && !data && (
        <Notice type="error" message={connectionError} />
      )}
      {stale && data && (
        <Notice message="Connection unconfirmed. Reconnect to confirm assignments and make updates." />
      )}
      {!data ? (
        !connectionError && <Loading />
      ) : tab === "Home" ? (
        <div className={styles.dashboard}>
          <section className={styles.availability}>
            <div className={styles.sectionTitle}>
              <span className={styles.lightIcon}>
                <Truck size={27} aria-hidden="true" />
              </span>
              <button
                type="button"
                role="switch"
                aria-label="Available for dispatch"
                aria-checked={snapshot.profile.driver_available}
                disabled={busy || stale}
                className={styles.switch}
                onClick={() =>
                  void write("driver.availability", {
                    available: !snapshot.profile.driver_available,
                  })
                }
              >
                <span />
              </button>
            </div>
            <h2>
              {snapshot.profile.driver_available
                ? "Available for dispatch"
                : "Assignments paused"}
            </h2>
            <p>
              {stale
                ? "Reconnect to confirm availability."
                : snapshot.profile.driver_available
                  ? "Ready to receive new assignments."
                  : "Turn on availability when you're ready."}
            </p>
            <small>Availability does not establish GPS or online status.</small>
          </section>
          <div className={styles.primary}>
            <div
              className={styles.metrics}
              aria-label="Authoritative delivery counts"
            >
              {[
                [
                  "New assignments",
                  snapshot.metrics?.newAssignments,
                  Package,
                  "green",
                ],
                ["In progress", snapshot.metrics?.inProgress, Truck, "blue"],
                [
                  "Completed today",
                  snapshot.metrics?.completedToday,
                  CircleCheck,
                  "amber",
                ],
              ].map(([label, value, Icon, tone]: any) => (
                <section className={styles.metric} data-tone={tone} key={label}>
                  <span className={styles.icon}>
                    <Icon size={22} aria-hidden="true" />
                  </span>
                  <strong>{driverMetric(value, !stale)}</strong>
                  <span>{label}</span>
                </section>
              ))}
            </div>
            <section className={`${styles.card} ${styles.next}`}>
              <div className={styles.sectionTitle}>
                <h2>
                  <Truck size={21} aria-hidden="true" /> Next delivery
                </h2>
                <span className={styles.caption}>
                  From your current assignments
                </span>
              </div>
              {next ? (
                <>
                  <Assignment
                    order={next}
                    decision={response(next.id)}
                    stale={stale}
                    compact
                  />
                  <div className={styles.actions}>
                    <button
                      className="button"
                      onClick={() => openAssignment(next.id)}
                    >
                      {driverNextAction(next, response(next.id))}
                      <ArrowUpRight size={17} aria-hidden="true" />
                    </button>
                    <button
                      className="button secondary"
                      onClick={() => openAssignment(next.id)}
                    >
                      View order
                    </button>
                  </div>
                </>
              ) : (
                <div className={styles.empty}>
                  <Inbox size={36} aria-hidden="true" />
                  <h3>
                    {stale
                      ? "Assignments need confirmation"
                      : "You're up to date"}
                  </h3>
                  <p>
                    {stale
                      ? "Reconnect to see your next delivery."
                      : "Your next assigned delivery will appear here. Keep availability up to date for dispatch."}
                  </p>
                </div>
              )}
            </section>
            <section className={styles.card}>
              <div className={styles.sectionTitle}>
                <h2>
                  <ClipboardList size={21} aria-hidden="true" /> Assigned
                  deliveries
                </h2>
                <button
                  className={styles.textButton}
                  onClick={() => switchTab("Orders")}
                >
                  View all <ChevronRight size={16} aria-hidden="true" />
                </button>
              </div>
              {orders.length ? (
                <>
                  <div className={styles.deliveryList}>
                    {orders.slice(0, 4).map((row) => (
                      <button
                        key={row.id}
                        className={styles.deliveryRow}
                        onClick={() => openAssignment(row.id)}
                      >
                        <span className={styles.icon}>
                          <Package size={21} aria-hidden="true" />
                        </span>
                        <span>
                          <strong>{row.reference}</strong>
                          <small>
                            {driverOrderAddress(row.address) ||
                              "Destination unavailable"}
                          </small>
                        </span>
                        <span
                          className={styles.status}
                          data-tone={driverAssignmentTone(
                            assignmentLabel(
                              row.status,
                              row.attempt?.state,
                              response(row.id),
                            ),
                          )}
                        >
                          {assignmentLabel(
                            row.status,
                            row.attempt?.state,
                            response(row.id),
                          )}
                        </span>
                        <ChevronRight size={16} aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                  <p className={styles.caption}>
                    Showing {Math.min(4, orders.length)} of {orders.length}{" "}
                    loaded assignments
                    {orders.length === 100 ? " (100-record limit)" : ""}. Totals
                    above come from the server.
                  </p>
                </>
              ) : (
                <p>
                  {stale
                    ? "Reconnect to check assignments."
                    : "No current assignments. Dispatch will assign work to your account."}
                </p>
              )}
            </section>
          </div>
          <aside
            className={styles.secondary}
            aria-label="Availability and trip status"
          >
            <section className={styles.card}>
              <h2>
                <Radio size={20} aria-hidden="true" /> Connection &amp; location
              </h2>
              <dl className={styles.signals}>
                <div>
                  <dt>Backend</dt>
                  <dd>{stale ? "Unconfirmed" : "Connected"}</dd>
                </div>
                <div>
                  <dt>Foreground contact</dt>
                  <dd>
                    {driverContactLabel(snapshot.profile.driver_last_seen_at)}
                  </dd>
                </div>
                <div>
                  <dt>GPS permission</dt>
                  <dd>Managed in driver app</dd>
                </div>
                <div>
                  <dt>Location consent</dt>
                  <dd>
                    {stale
                      ? "Unavailable"
                      : snapshot.trip
                        ? snapshot.trip.location_consent
                          ? "Granted for this trip"
                          : "Off for this trip"
                        : "No active trip"}
                  </dd>
                </div>
                <div>
                  <dt>Last GPS location</dt>
                  <dd>Unavailable</dd>
                </div>
              </dl>
              <p className={styles.caption}>
                Backend confirmed {driverDate(data.confirmedAt)} WAT
              </p>
            </section>
            <section className={styles.card}>
              <h2>
                <Navigation size={20} aria-hidden="true" /> Current trip
              </h2>
              {stale ? (
                <p>Reconnect to confirm your trip.</p>
              ) : snapshot.trip ? (
                <>
                  <p>{snapshot.trip.vehicle_label || "Vehicle unavailable"}</p>
                  <span className={styles.status}>Active trip</span>
                  <p className={styles.caption}>
                    Location sharing is{" "}
                    {snapshot.trip.location_consent
                      ? "consented for this trip"
                      : "off"}
                    . GPS position and ETA are unavailable.
                  </p>
                  {next && (
                    <>
                      <h3>Delivery activity · {next.reference}</h3>
                      <ol className={styles.timeline}>
                        {(next.events ?? [])
                          .slice(-4)
                          .map((event: any, index: number) => (
                            <li key={event.id ?? index}>
                              <span>
                                {String(event.status).replaceAll("_", " ")}
                              </span>
                              <small>{driverDate(event.created_at)} WAT</small>
                            </li>
                          ))}
                      </ol>
                    </>
                  )}
                </>
              ) : (
                <div className={styles.empty}>
                  <Navigation size={28} aria-hidden="true" />
                  <p>No active trip</p>
                  <small>
                    Start a trip here before dispatch assigns deliveries.
                  </small>
                </div>
              )}
              <DriverLPGControls
                bulk={data.bulk}
                disabled={busy || stale}
                write={write}
              />
              <button
                type="button"
                className="button"
                disabled={busy || stale}
                onClick={() => setTripOpen(true)}
              >
                {snapshot.trip ? "Manage trip" : "Start trip"}
              </button>
            </section>
            <section className={styles.card}>
              <h2>
                <Headphones size={20} aria-hidden="true" /> Here to help
              </h2>
              <p>Need help with an assignment? Contact dispatch for support.</p>
              <button
                className="button secondary"
                onClick={() => {
                  switchTab("Profile");
                  setSupportOpen(true);
                }}
              >
                Contact dispatch support
              </button>
            </section>
          </aside>
        </div>
      ) : tab === "Orders" ? (
        <>
          {selected ? (
            <section className={styles.card}>
              <button className="button secondary" onClick={backToList}>
                Back to orders
              </button>
              {current ? (
                <>
                  <Assignment
                    order={current}
                    decision={response(current.id)}
                    stale={stale}
                  />
                  {current.status === "assigned" &&
                    current.attempt?.state === "assigned" &&
                    current.assignment_response_open &&
                    !response(current.id) && (
                      <AssignmentResponseActions
                        key={current.id + ":" + current.tracking_version}
                        disabled={busy || stale}
                        done={refresh}
                        declineDecision="rejected"
                        send={(values) =>
                          api("dispatch.respond", {
                            orderId: current.id,
                            version: current.tracking_version,
                            ...values,
                          })
                        }
                      />
                    )}
                  {current.attempt?.state === "assigned" &&
                    !current.assignment_response_open &&
                    !response(current.id) && (
                      <p>
                        Ask dispatch to renew this assignment before responding.
                      </p>
                    )}
                  <DriverLPGControls
                    bulk={data.bulk}
                    order={current}
                    disabled={busy || stale}
                    write={write}
                  />
                  <DriverDeliveryControls
                    lpg={lpgReadiness(current, data.bulk)}
                    key={`${current.id}:${current.attempt?.id}`}
                    order={current}
                    decision={response(current.id)}
                    disabled={busy || stale}
                    write={write}
                    refresh={async () => {
                      setError("");
                      await refresh();
                    }}
                  />
                </>
              ) : (
                <p>This assignment is no longer in your current orders.</p>
              )}
            </section>
          ) : (
            <>
              <div className={styles.filters}>
                <label>
                  Search assignments
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </label>
                <label>
                  Status
                  <select
                    value={orderFilter}
                    onChange={(event) => setOrderFilter(event.target.value)}
                  >
                    <option value="all">All assigned</option>
                    <option value="progress">In progress</option>
                  </select>
                </label>
              </div>
              <div className={styles.grid}>
                {filtered.map((row) => (
                  <article key={row.id} className={styles.card}>
                    <Assignment
                      order={row}
                      decision={response(row.id)}
                      stale={stale}
                    />
                    <button
                      className="button"
                      onClick={() => openAssignment(row.id)}
                    >
                      {driverNextAction(row, response(row.id))}{" "}
                      <ChevronRight size={17} />
                    </button>
                  </article>
                ))}
              </div>
              {!filtered.length && (
                <p>
                  {stale
                    ? "Reconnect to check assignments."
                    : "No matching assignments."}
                </p>
              )}
              {orders.length === 100 && (
                <p>
                  Showing up to 100 current assignments. Contact dispatch for
                  older assigned records.
                </p>
              )}
            </>
          )}
        </>
      ) : tab === "History" ? (
        record ? (
          <section className={styles.card}>
            <button
              className="button secondary"
              onClick={() => {
                setRecord(null);
                requestAnimationFrame(() =>
                  window.scrollTo({
                    top: historyScroll.current,
                    behavior: "instant",
                  }),
                );
              }}
            >
              Back to history
            </button>
            <h2>{record.reference}</h2>
            <p>
              {driverOutcomes[record.outcome]} · {driverDate(record.closed_at)}{" "}
              WAT
            </p>
            {proofError && <Notice type="error" message={proofError} />}
            {record.has_proof &&
              !stale &&
              (proof
                ? proof.map((image) => (
                    <figure key={image.id}>
                      {/* Same-origin authenticated evidence uses the existing retention check. */}
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/api/media/${image.id}`} alt={image.alt} />
                      <figcaption>
                        {driverDate(image.captured_at)} WAT
                      </figcaption>
                    </figure>
                  ))
                : !proofError && <Loading />)}
          </section>
        ) : (
          <>
            <section className={styles.card}>
              <div className={styles.sectionTitle}>
                <h2>
                  <History size={21} aria-hidden="true" /> Delivery history
                </h2>
                <p className={styles.caption}>Closed assignments only</p>
              </div>
              <form
                className={styles.filters}
                onSubmit={(event: FormEvent<HTMLFormElement>) => {
                  event.preventDefault();
                  const fields = new FormData(event.currentTarget);
                  setFilters({
                    from: String(fields.get("from")),
                    to: String(fields.get("to")),
                    outcome: String(fields.get("outcome")),
                    page: 1,
                  });
                }}
              >
                <label>
                  From (Lagos)
                  <input name="from" type="date" defaultValue={filters.from} />
                </label>
                <label>
                  To (Lagos)
                  <input name="to" type="date" defaultValue={filters.to} />
                </label>
                <label>
                  Final outcome
                  <select name="outcome" defaultValue={filters.outcome}>
                    <option value="">All outcomes</option>
                    {Object.entries(driverOutcomes).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="button secondary" type="submit">
                  Apply filters
                </button>
              </form>
              <label>
                Find reference on this page
                <input
                  type="search"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                />
              </label>
            </section>
            {historyError && <Notice type="error" message={historyError} />}
            {historyError && (
              <button
                className="button secondary"
                onClick={() => setHistoryRetry((n) => n + 1)}
              >
                Retry history
              </button>
            )}
            {stale ? (
              <p>Reconnect to confirm delivery history.</p>
            ) : history ? (
              <>
                <section className={styles.card}>
                  <h2>
                    <CircleCheck size={20} /> {history.delivered} completed
                    deliveries in this period
                  </h2>
                </section>
                <div className={styles.grid}>
                  {history.rows
                    .filter((row) =>
                      row.reference
                        .toLowerCase()
                        .includes(historySearch.trim().toLowerCase()),
                    )
                    .map((row) => (
                      <button
                        type="button"
                        className={styles.historyRow}
                        key={row.id}
                        onClick={() => {
                          historyScroll.current = window.scrollY;
                          setRecord(row);
                        }}
                      >
                        <Package size={20} />
                        <span>
                          <strong>{row.reference}</strong>
                          <small>{driverDate(row.closed_at)} WAT</small>
                        </span>
                        <span
                          className={styles.status}
                          data-tone={driverAssignmentTone(
                            driverOutcomes[row.outcome],
                          )}
                        >
                          {driverOutcomes[row.outcome]}
                        </span>
                        <ChevronRight size={18} />
                      </button>
                    ))}
                </div>
                {!history.rows.length && (
                  <p>No closed deliveries match these filters.</p>
                )}
                <div className={styles.actions}>
                  <button
                    className="button secondary"
                    disabled={history.page <= 1}
                    onClick={() =>
                      setFilters((old) => ({ ...old, page: old.page - 1 }))
                    }
                  >
                    Previous
                  </button>
                  <span>
                    Page {history.page} · {history.total} closed records
                  </span>
                  <button
                    className="button secondary"
                    disabled={history.page * history.pageSize >= history.total}
                    onClick={() =>
                      setFilters((old) => ({ ...old, page: old.page + 1 }))
                    }
                  >
                    Next
                  </button>
                </div>
              </>
            ) : (
              !historyError && <Loading />
            )}
          </>
        )
      ) : (
        <div className={styles.grid}>
          <section className={styles.card}>
            <div className={styles.identity}>
              <span className={styles.avatar} aria-hidden="true">
                {driverInitials(snapshot.profile.name)}
              </span>
              <div>
                <span className={styles.status}>Driver</span>
                <h2>{snapshot.profile.name}</h2>
                <p>{snapshot.profile.branch_name}</p>
              </div>
            </div>
            <p>
              Driver · {snapshot.profile.branch_name} ·{" "}
              {snapshot.profile.active ? "Active" : "Inactive"}
            </p>
            <p>{snapshot.profile.email}</p>
            {snapshot.profile.contact_phone && (
              <p>{snapshot.profile.contact_phone}</p>
            )}
            <details>
              <summary>Edit personal information</summary>
              <fieldset className={styles.formGroup} disabled={stale || busy}>
                <ActionForm
                  title="Edit your name"
                  action="account.update"
                  fields={[
                    {
                      name: "name",
                      label: "Your name",
                      value: snapshot.profile.name,
                      required: true,
                    },
                  ]}
                  onDone={() => void refresh()}
                />
              </fieldset>
            </details>
          </section>
          <section className={styles.card}>
            <h2>Vehicle and location</h2>
            {!stale && snapshot.trip?.vehicle_label ? (
              <p>
                {snapshot.trip.vehicle_label} ·{" "}
                {Number(snapshot.trip.capacity_grams) / 1000} kg capacity
              </p>
            ) : (
              <p>No confirmed trip vehicle.</p>
            )}
            <p>
              Start and end duty trips here. Device permissions and encrypted
              GPS recording are managed separately in the driver app.
            </p>
            <button
              type="button"
              className="button secondary"
              disabled={busy || stale}
              onClick={() => setTripOpen(true)}
            >
              Manage trip
            </button>
          </section>
          <section className={styles.card}>
            <h2>Account security</h2>
            <details>
              <summary>Change password</summary>
              <fieldset className={styles.formGroup} disabled={stale || busy}>
                <ActionForm
                  title="Change your password"
                  action="account.password"
                  fields={[
                    {
                      name: "currentPassword",
                      label: "Current password",
                      type: "password",
                      required: true,
                    },
                    {
                      name: "newPassword",
                      label: "New password",
                      type: "password",
                      required: true,
                    },
                  ]}
                />
              </fieldset>
            </details>
            {appearance.enabled && (
              <label>
                Colour theme
                <select
                  value={appearance.theme}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (
                      value === "light" ||
                      value === "dark" ||
                      value === "system"
                    )
                      appearance.setTheme(value);
                  }}
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="system">System</option>
                </select>
              </label>
            )}
            <p>Use the workspace header for notifications and sign-out.</p>
          </section>
          <section className={styles.card}>
            <h2>Help &amp; support</h2>
            <details
              open={supportOpen}
              onToggle={(e) => setSupportOpen(e.currentTarget.open)}
            >
              <summary>Contact dispatch support</summary>
              <fieldset className={styles.formGroup} disabled={stale || busy}>
                <ActionForm
                  title="Delivery support request"
                  action="support.create"
                  fields={[
                    { name: "subject", label: "Subject", required: true },
                    {
                      name: "message",
                      label: "Describe the delivery issue",
                      type: "textarea",
                      required: true,
                    },
                  ]}
                />
              </fieldset>
            </details>
          </section>
        </div>
      )}
      {tripOpen && (
        <Modal
          title="Manage duty trip"
          onClose={() => {
            if (!tripWriting.current) setTripOpen(false);
          }}
        >
          <DriverTripControls
            key={userId}
            disabled={stale || busy}
            onDone={() => refresh()}
            onBusy={(value) => {
              tripWriting.current = value;
              setTripBusy(value);
            }}
          />
        </Modal>
      )}
    </section>
  );
}

function Assignment({
  order,
  decision,
  stale,
  compact = false,
}: {
  order: any;
  decision?: string;
  stale: boolean;
  compact?: boolean;
}) {
  const directions = !stale && driverNavigation(order.destination);
  return (
    <>
      <h2 className={compact ? styles.orderReference : undefined}>
        <Package size={20} aria-hidden="true" /> {order.reference}
      </h2>
      <p
        className={styles.status}
        data-tone={driverAssignmentTone(
          assignmentLabel(order.status, order.attempt?.state, decision),
        )}
      >
        {assignmentLabel(order.status, order.attempt?.state, decision)}
      </p>
      {order.customer_name && (
        <p>
          <UserRound size={17} /> {order.customer_name}
        </p>
      )}
      {driverOrderAddress(order.address) && (
        <p>
          <MapPin size={17} /> {driverOrderAddress(order.address)}
        </p>
      )}
      <p>
        <CalendarDays size={17} />{" "}
        {[order.delivery_date, order.delivery_window]
          .filter(Boolean)
          .join(" · ")}
      </p>
      {driverAssignmentSummary(order).map((line, index) => (
        <p key={index}>
          <Package size={17} aria-hidden="true" /> {line}
        </p>
      ))}
      {order.last_update && (
        <p>
          <Clock3 size={17} /> Updated {driverDate(order.last_update)} WAT
        </p>
      )}
      {directions && (
        <a
          href={directions}
          className="button secondary"
          target="_blank"
          rel="noopener noreferrer"
        >
          Navigate
        </a>
      )}
    </>
  );
}
