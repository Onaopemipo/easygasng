"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { CalendarDays, ChevronRight, CircleCheck, Clock3, MapPin, Package, Radio, Truck, UserRound } from "lucide-react";
import {
  assignmentLabel, driverDate, driverHistoryAction, driverNavigation, driverOrderAddress,
  driverOutcomes, type DriverHistory, type DriverHistoryRow,
} from "../../../packages/business-rules/src/driver-experience";
import { useTheme } from "./theme-provider";
import { ActionForm } from "./workflows";
import { api, Loading, Notice } from "./ui";
import styles from "./driver-experience.module.css";

const tabs = ["Home", "Orders", "History", "Profile"] as const;
type Tab = typeof tabs[number];
const emptyFilters = { from: "", to: "", outcome: "", page: 1 };

export default function DriverExperience({ userId }: { userId: string }) {
  const appearance = useTheme();
  const [tab, setTab] = useState<Tab>("Home");
  const [data, setData] = useState<{ snapshot: any; orders: any[]; confirmedAt: string } | null>(null);
  const [ready, setReady] = useState(false);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState("");
  const [connectionError, setConnectionError] = useState("");
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
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
    try {
      if (initialize) await api("driver.restrict", {}, { signal: controller.signal });
      const [snapshot, orders] = await Promise.all([
        api("driver.snapshot", undefined, { signal: controller.signal }),
        api("orders?active=1", undefined, { signal: controller.signal }),
      ]);
      if (controller.signal.aborted) return;
      setData({ snapshot, orders, confirmedAt: new Date().toISOString() });
      setStale(false);
      setConnectionError("");
      setReady(true);
    } catch (e: any) {
      if (controller.signal.aborted) return;
      if ([401, 403].includes(e.status)) {
        setData(null);
        setHistory(null);
        setRecord(null);
        setProof(null);
        setSelected(null);
        setReady(false);
      }
      setStale(true);
      setConnectionError(e.message);
    }
  }, []);

  useEffect(() => {
    void refresh(true);
    function reconnect() { void refresh(); }
    function disconnect() { setStale(true); }
    window.addEventListener("online", reconnect);
    window.addEventListener("offline", disconnect);
    const interval = setInterval(() => {
      if (document.visibilityState === "visible" && !writing.current) void refresh();
    }, 30000);
    return () => {
      clearInterval(interval);
      request.current?.abort();
      window.removeEventListener("online", reconnect);
      window.removeEventListener("offline", disconnect);
    };
  }, [refresh, userId]);

  useEffect(() => {
    if (!ready || stale || tab !== "History") return;
    const controller = new AbortController();
    setHistory(null);
    setHistoryError("");
    api(driverHistoryAction(filters), undefined, { signal: controller.signal })
      .then((result) => { if (!controller.signal.aborted) setHistory(result); })
      .catch((e: any) => {
        if (!controller.signal.aborted) setHistoryError(e.message);
      });
    return () => controller.abort();
  }, [ready, stale, tab, filters, historyRetry]);

  useEffect(() => {
    setProof(null);
    setProofError("");
    if (!record?.has_proof || !ready || stale) return;
    const controller = new AbortController();
    const params = new URLSearchParams({ orderId: record.order_id, attemptId: record.id });
    api("delivery.photos?" + params, undefined, { signal: controller.signal })
      .then((result) => { if (!controller.signal.aborted) setProof(result.photos); })
      .catch((e: any) => { if (!controller.signal.aborted) setProofError(e.message); });
    return () => controller.abort();
  }, [record, ready, stale]);

  async function write(action: string, input: Record<string, unknown>) {
    if (writing.current || !ready || stale) return;
    writing.current = true;
    setBusy(true);
    setError("");
    request.current?.abort();
    const signature = action + JSON.stringify(input);
    const key = operation.current.get(signature) ?? crypto.randomUUID();
    operation.current.set(signature, key);
    try {
      await api(action, { ...input, operationKey: key });
      operation.current.delete(signature);
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
    setTab(next);
    setSelected(null);
    setRecord(null);
    setNotes("");
  }

  const snapshot = data?.snapshot;
  const orders = data?.orders ?? [];
  const current = orders.find((row) => row.id === selected);
  const response = (id: string) => snapshot?.responses.find((row: any) => row.order_id === id)?.decision;
  const filtered = orders.filter((row) =>
    (orderFilter === "all" || assignmentLabel(row.status, row.attempt?.state, response(row.id)) !== "Assigned") &&
    [row.reference, row.customer_name, driverOrderAddress(row.address)].join(" ").toLowerCase().includes(search.trim().toLowerCase()),
  );

  return <section className={styles.workspace}>
    <header className={styles.hero}>
      <div><span>EasyGas Driver</span><h1>{tab}</h1></div>
      <button type="button" className="button secondary" onClick={() => { setError(""); void refresh(!ready); }}>Refresh</button>
    </header>
    <nav aria-label="Driver workspace" className={styles.tabs}>
      {tabs.map((name) => <button key={name} type="button" aria-pressed={tab === name} onClick={() => switchTab(name)}>{name}</button>)}
    </nav>
    {error && <Notice type="error" message={error} />}
    {connectionError && !data && <Notice type="error" message={connectionError} />}
    {stale && data && <Notice message="Connection unconfirmed. Reconnect to confirm assignments and make updates." />}
    {!data ? (!connectionError && <Loading />) : tab === "Home" ? (
      <div className={styles.grid}>
        <section className={styles.card}>
          <Truck aria-hidden="true" /><h2>Good to see you, {snapshot.profile.name}</h2>
          <p>{snapshot.profile.driver_available ? "Available for dispatch" : "Unavailable for new assignments"}</p>
          <button type="button" role="switch" aria-label="Available for dispatch" aria-checked={snapshot.profile.driver_available}
            className="button" disabled={busy || stale} onClick={() => void write("driver.availability", { available: !snapshot.profile.driver_available })}>
            {snapshot.profile.driver_available ? "Available" : "Unavailable"}
          </button>
        </section>
        <section className={styles.card}>
          <Radio aria-hidden="true" /><h2>Connection and location</h2>
          <p>{stale ? "Connection unconfirmed" : "Backend connected"}</p>
          <p>Last confirmed {driverDate(data.confirmedAt)} WAT</p>
          <p>GPS permissions are managed in the driver app.</p>
          <p>{stale ? "Trip consent unavailable" : snapshot.trip ? snapshot.trip.location_consent ? "Location consent granted for this trip" : "Trip location consent is off" : "No active trip"}</p>
        </section>
        <section className={styles.card}>
          <h2>At a glance</h2>
          <div className={styles.metrics}>
            {[
              ["New assignments", snapshot.metrics?.newAssignments],
              ["In progress", snapshot.metrics?.inProgress],
              ["Completed today", snapshot.metrics?.completedToday],
            ].map(([label, value]) => <div key={label}><strong>{stale ? "—" : value ?? "—"}</strong><span>{label}</span></div>)}
          </div>
        </section>
        <section className={styles.card}>
          <h2>{orders[0] ? "Next assignment" : "Assigned deliveries"}</h2>
          {orders[0] && <p>{orders[0].reference}</p>}
          <button className="button" onClick={() => { switchTab("Orders"); if (orders[0]) setSelected(orders[0].id); }}>
            {orders[0] ? "Open assignment" : "View orders"}
          </button>
        </section>
      </div>
    ) : tab === "Orders" ? (
      <>
        {selected ? (
          <section className={styles.card}>
            <button className="button secondary" onClick={() => setSelected(null)}>Back to orders</button>
            {current ? <>
              <Assignment order={current} decision={response(current.id)} stale={stale} />
              {current.status === "assigned" && current.attempt?.state === "assigned" && current.assignment_response_open && !response(current.id) && (
                <>
                  <label>Reason or acknowledgement note<textarea value={notes} onChange={(event) => setNotes(event.target.value)} minLength={5} maxLength={500} /></label>
                  <div className={styles.actions}>
                    {([["acknowledged", "Acknowledge assignment"], ["rejected", "Decline and notify dispatch"]] as const).map(([decision, label]) => (
                      <button key={decision} className={decision === "acknowledged" ? "button" : "button secondary"} type="button"
                        disabled={busy || stale || notes.trim().length < 5} onClick={() => void write("dispatch.respond", {
                          orderId: current.id, version: current.tracking_version, reason: notes.trim(), decision,
                        })}>{label}</button>
                    ))}
                  </div>
                </>
              )}
              {current.attempt?.state === "assigned" && !current.assignment_response_open && !response(current.id) &&
                <p>Ask dispatch to renew this assignment before responding.</p>}
              <p>Use the driver app for inspected pickup, trip updates and proof of delivery.</p>
            </> : <p>This assignment is no longer in your current orders.</p>}
          </section>
        ) : (
          <>
            <div className={styles.filters}>
              <label>Search assignments<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} /></label>
              <label>Status<select value={orderFilter} onChange={(event) => setOrderFilter(event.target.value)}>
                <option value="all">All assigned</option><option value="progress">In progress</option>
              </select></label>
            </div>
            <div className={styles.grid}>
              {filtered.map((row) => <article key={row.id} className={styles.card}>
                <Assignment order={row} decision={response(row.id)} stale={stale} />
                <button className="button" onClick={() => { setNotes(""); setSelected(row.id); }}>Open assignment <ChevronRight size={17} /></button>
              </article>)}
            </div>
            {!filtered.length && <p>{stale ? "Reconnect to check assignments." : "No matching assignments."}</p>}
            {orders.length === 100 && <p>Showing up to 100 current assignments. Contact dispatch for older assigned records.</p>}
          </>
        )}
      </>
    ) : tab === "History" ? (
      record ? (
        <section className={styles.card}>
          <button className="button secondary" onClick={() => setRecord(null)}>Back to history</button>
          <h2>{record.reference}</h2>
          <p>{driverOutcomes[record.outcome]} · {driverDate(record.closed_at)} WAT</p>
          {proofError && <Notice type="error" message={proofError} />}
          {record.has_proof && !stale && (proof ? proof.map((image) => (
            <figure key={image.id}>
              {/* Same-origin authenticated evidence uses the existing retention check. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/media/${image.id}`} alt={image.alt} />
              <figcaption>{driverDate(image.captured_at)} WAT</figcaption>
            </figure>
          )) : !proofError && <Loading />)}
        </section>
      ) : (
        <>
          <form className={styles.filters} onSubmit={(event: FormEvent<HTMLFormElement>) => {
            event.preventDefault();
            const fields = new FormData(event.currentTarget);
            setFilters({ from: String(fields.get("from")), to: String(fields.get("to")), outcome: String(fields.get("outcome")), page: 1 });
          }}>
            <label>From (Lagos)<input name="from" type="date" defaultValue={filters.from} /></label>
            <label>To (Lagos)<input name="to" type="date" defaultValue={filters.to} /></label>
            <label>Final outcome<select name="outcome" defaultValue={filters.outcome}>
              <option value="">All outcomes</option>{Object.entries(driverOutcomes).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select></label>
            <button className="button secondary" type="submit">Apply filters</button>
          </form>
          {historyError && <Notice type="error" message={historyError} />}
          {historyError && <button className="button secondary" onClick={() => setHistoryRetry((n) => n + 1)}>Retry history</button>}
          {stale ? <p>Reconnect to confirm delivery history.</p> : history ? (
            <>
              <section className={styles.card}><h2><CircleCheck size={20} /> {history.delivered} completed deliveries in this period</h2></section>
              <div className={styles.grid}>
                {history.rows.map((row) => <button type="button" className={styles.historyRow} key={row.id} onClick={() => setRecord(row)}>
                  <Package size={20} /><span><strong>{row.reference}</strong><small>{driverOutcomes[row.outcome]} · {driverDate(row.closed_at)} WAT</small></span><ChevronRight size={18} />
                </button>)}
              </div>
              {!history.rows.length && <p>No closed deliveries match these filters.</p>}
              <div className={styles.actions}>
                <button className="button secondary" disabled={history.page <= 1} onClick={() => setFilters((old) => ({ ...old, page: old.page - 1 }))}>Previous</button>
                <span>Page {history.page}</span>
                <button className="button secondary" disabled={history.page * history.pageSize >= history.total} onClick={() => setFilters((old) => ({ ...old, page: old.page + 1 }))}>Next</button>
              </div>
            </>
          ) : !historyError && <Loading />}
        </>
      )
    ) : (
      <div className={styles.grid}>
        <section className={styles.card}>
          <h2><UserRound size={21} /> {snapshot.profile.name}</h2>
          <p>Driver · {snapshot.profile.branch_name} · {snapshot.profile.active ? "Active" : "Inactive"}</p>
          <p>{snapshot.profile.email}</p>
          {snapshot.profile.contact_phone && <p>{snapshot.profile.contact_phone}</p>}
          <details><summary>Edit personal information</summary>
            <ActionForm title="Edit your name" action="account.update"
              fields={[{ name: "name", label: "Your name", value: snapshot.profile.name, required: true }]} onDone={() => void refresh()} />
          </details>
        </section>
        <section className={styles.card}>
          <h2>Vehicle and location</h2>
          {!stale && snapshot.trip?.vehicle_label ? <p>{snapshot.trip.vehicle_label} · {Number(snapshot.trip.capacity_grams) / 1000} kg capacity</p> : <p>No confirmed trip vehicle.</p>}
          <p>Trip consent, device permissions and encrypted delivery sync are managed in the driver app.</p>
        </section>
        <section className={styles.card}>
          <h2>Account security</h2>
          <details><summary>Change password</summary>
            <ActionForm title="Change your password" action="account.password" fields={[
              { name: "currentPassword", label: "Current password", type: "password", required: true },
              { name: "newPassword", label: "New password", type: "password", required: true },
            ]} />
          </details>
          {appearance.enabled && <label>Colour theme
            <select value={appearance.theme} onChange={(event) => {
              const value = event.target.value;
              if (value === "light" || value === "dark" || value === "system") appearance.setTheme(value);
            }}>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </label>}
          <p>Use the workspace header for notifications and sign-out.</p>
        </section>
        <section className={styles.card}>
          <h2>Help &amp; support</h2>
          <details><summary>Contact dispatch support</summary>
            <ActionForm title="Delivery support request" action="support.create" fields={[
              { name: "subject", label: "Subject", required: true },
              { name: "message", label: "Describe the delivery issue", type: "textarea", required: true },
            ]} />
          </details>
        </section>
      </div>
    )}
  </section>;
}

function Assignment({ order, decision, stale }: { order: any; decision?: string; stale: boolean }) {
  const directions = !stale && driverNavigation(order.destination);
  return <>
    <h2><Package size={20} /> {order.reference}</h2>
    <p className={styles.status}>{assignmentLabel(order.status, order.attempt?.state, decision)}</p>
    {order.customer_name && <p><UserRound size={17} /> {order.customer_name}</p>}
    {driverOrderAddress(order.address) && <p><MapPin size={17} /> {driverOrderAddress(order.address)}</p>}
    <p><CalendarDays size={17} /> {[order.delivery_date, order.delivery_window].filter(Boolean).join(" · ")}</p>
    {(order.items ?? []).map((row: any, index: number) => <p key={row.id ?? index}>{row.quantity} × {row.name}</p>)}
    {(order.gas_lines ?? []).map((row: any, index: number) => <p key={row.id ?? index}>{Number(row.grams) / 1000} kg gas</p>)}
    {order.last_update && <p><Clock3 size={17} /> Updated {driverDate(order.last_update)} WAT</p>}
    {directions && <a href={directions} className="button secondary" target="_blank" rel="noopener noreferrer">Navigate</a>}
  </>;
}
