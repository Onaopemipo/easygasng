"use client";
import React, {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type FormEvent,
} from "react";
import {
  Package,
  Plus,
  Search,
  RefreshCw,
  ArrowUpRight,
  CalendarDays,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Truck,
  CheckCircle2,
  Clock3,
  ReceiptText,
} from "lucide-react";
import Link from "./workspace-link";
import { api, money, Modal, Notice, Loading } from "./ui";
import { confirmAction, appDialogActive } from "./app-dialog";
import { DocumentLibrary } from "./document-library";
import OrderInvoice from "./order-invoice";
import { OrderOperations } from "./order-operations";
import { OrderCardPayment } from "./hosted-payment";
import {
  CustomerRiderPosition,
  type useTrackingOrders,
} from "./order-tracking";
import {
  customerOrderStage,
  orderMatches,
  orderSummary,
  refundLineLabel,
  type OrderFilter,
} from "../../../packages/business-rules/src/customer-orders";
import {
  deliveryDelayed,
  trackingLabels,
  trackingEventLabel,
} from "../../../packages/business-rules/src/order-tracking";

const terminal = (order: any) =>
  ["delivered", "cancelled"].includes(order.status);
const date = (value: string) =>
  value
    ? new Date(
        String(value).slice(0, 10) + "T12:00:00+01:00",
      ).toLocaleDateString("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Africa/Lagos",
      })
    : "To be confirmed";
const time = (value: string) =>
  new Date(value).toLocaleString("en-NG", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Africa/Lagos",
  });

function OrdersDialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // A successful mutation can remove its focused submit button.
    const recoverFocus = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || appDialogActive()) return;
      const dialog = document.querySelector('.co-dialog [role="dialog"]');
      const targets = Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          "button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]",
        ) ?? [],
      );
      if (
        targets.length &&
        !targets.includes(document.activeElement as HTMLElement)
      ) {
        event.preventDefault();
        (event.shiftKey ? targets[targets.length - 1] : targets[0]).focus();
      }
    };
    document.addEventListener("keydown", recoverFocus, true);
    return () => {
      document.removeEventListener("keydown", recoverFocus, true);
      document.body.style.overflow = overflow;
    };
  }, []);
  return (
    <Modal className="co-dialog" title={title} onClose={onClose}>
      {children}
    </Modal>
  );
}

function RefundRequest({ order }: { order: any }) {
  const [scope, setScope] = useState("all"),
    [lines, setLines] = useState<any[] | null>(null),
    [quantities, setQuantities] = useState<Record<string, string>>({}),
    [reason, setReason] = useState(""),
    [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [done, setDone] = useState(false);
  const operation = useRef({ fingerprint: "", key: "" });
  const success = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (done)
      success.current
        ?.closest('[role="dialog"]')
        ?.querySelector<HTMLButtonElement>("button")
        ?.focus();
  }, [done]);
  useEffect(() => {
    let live = true;
    api(`refund.lines?orderId=${encodeURIComponent(order.id)}`)
      .then((r) => {
        if (live) setLines(r);
      })
      .catch((e) => {
        if (live) setError(e.message);
      });
    return () => {
      live = false;
    };
  }, [order.id]);
  const selected = Object.entries(quantities)
    .filter(([, q]) => Number(q) > 0)
    .map(([source, q]) => ({ source, quantity: Number(q) }));
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (
      busy ||
      !consent ||
      !lines ||
      reason.trim().length < 10 ||
      (scope === "selected" && !selected.length)
    )
      return;
    const payload = {
      orderId: order.id,
      reason: reason.trim(),
      acceptWalletCredit: true,
      ...(scope === "selected" ? { lines: selected } : {}),
    };
    const fingerprint = JSON.stringify(payload);
    if (operation.current.fingerprint !== fingerprint)
      operation.current = { fingerprint, key: crypto.randomUUID() };
    setBusy(true);
    setError("");
    try {
      await api("refund.request", {
        ...payload,
        idempotencyKey: operation.current.key,
      });
      setDone(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (done)
    return (
      <div className="co-success" role="status" ref={success}>
        <CheckCircle2 size={36} />
        <h3>Request received</h3>
        <p>
          Your refund is awaiting independent finance review. Approved refunds
          are issued as purchase credit.
        </p>
      </div>
    );
  return (
    <form
      className="co-refund"
      onSubmit={submit}
      data-unsaved={Boolean(
        reason || consent || Object.values(quantities).some(Boolean),
      )}
    >
      <p className="co-muted">
        {order.reference} · {money(order.total_kobo)}
      </p>
      <p>
        Approved refunds are issued as purchase credit. Amounts are calculated
        from your confirmed order.
      </p>
      <fieldset disabled={busy}>
        <legend>What would you like refunded?</legend>
        <label className="co-radio">
          <input
            type="radio"
            name="scope"
            value="all"
            checked={scope === "all"}
            onChange={() => setScope("all")}
          />
          Entire remaining order
        </label>
        <label className="co-radio">
          <input
            type="radio"
            name="scope"
            value="selected"
            checked={scope === "selected"}
            onChange={() => setScope("selected")}
          />
          Selected quantities
        </label>
      </fieldset>
      {!lines && !error && <Loading />}
      {scope === "selected" &&
        lines?.map((line, index) => (
          <label key={line.source}>
            {refundLineLabel(order, line.source, index)}
            <small className="co-muted">
              {line.remaining}{" "}
              {line.source.startsWith("gas:") ? "grams" : "units"} available
            </small>
            <input
              type="number"
              min={0}
              max={line.remaining}
              step={1}
              disabled={busy}
              value={quantities[line.source] ?? ""}
              onChange={(e) =>
                setQuantities({ ...quantities, [line.source]: e.target.value })
              }
            />
          </label>
        ))}
      <label>
        Reason <span aria-hidden="true">*</span>
        <textarea
          required
          minLength={10}
          maxLength={1000}
          rows={3}
          disabled={busy}
          placeholder="Tell us what went wrong (at least 10 characters)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
      <label className="co-radio">
        <input
          type="checkbox"
          required
          disabled={busy}
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        I accept purchase credit if approved.
      </label>
      <p className="co-muted co-small">
        Delivery fees are included only in a full remaining-order request. A
        refund request does not record a physical cylinder return.
      </p>
      {error && <Notice type="error" message={error} />}
      <button
        className="button"
        disabled={
          busy ||
          !lines ||
          !consent ||
          reason.trim().length < 10 ||
          (scope === "selected" && !selected.length)
        }
      >
        {busy ? "Submitting…" : "Submit refund request"}
      </button>
    </form>
  );
}

export function CustomerOrders({
  tracking,
  orderId = "",
  track = false,
}: {
  tracking: ReturnType<typeof useTrackingOrders>;
  orderId?: string;
  track?: boolean;
}) {
  const [view, setView] = useState("orders"),
    [filter, setFilter] = useState<OrderFilter>("all"),
    [query, setQuery] = useState(""),
    [page, setPage] = useState(1),
    [selectedId, setSelectedId] = useState<string | null>(null),
    [mode, setMode] = useState("details"),
    [detailTab, setDetailTab] = useState("overview"),
    [reveal, setReveal] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function repeatOrder(order: any) {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const draft = await api("account.repeat-order", {orderId:order.id});
      if (sessionStorage.getItem("easygas.gasDraft")) throw new Error("A checkout is already saved. Finish or clear it before ordering again.");
      sessionStorage.setItem("easygas.gasDraft",JSON.stringify(draft));
      window.location.assign("/gas-order");
    } catch(e:any) {setError(e.message);} finally {setBusy(false);}
  }
  const cancelKeys = useRef<Record<string, string>>({});
  const opened = useRef(false),
    trigger = useRef<HTMLElement | null>(null);
  const orders = tracking.orders;
  const selected = orders?.find((o) => o.id === selectedId);
  useEffect(() => {
    if (!opened.current && orders?.length && (orderId || track)) {
      setSelectedId((orders.find((o) => o.id === orderId) ?? orders[0]).id);
      opened.current = true;
    }
  }, [orders, orderId, track]);
  // The dialog always resolves against the current authorised snapshot, including revocations.
  function open(order: any, event: React.MouseEvent<HTMLButtonElement>) {
    trigger.current = event.currentTarget;
    setSelectedId(order.id);
    setMode("details");
    setDetailTab("overview");
    setReveal(false);
    setError("");
  }
  function close() {
    setSelectedId(null);
    setError("");
    trigger.current?.focus();
  }
  async function cancel() {
    if (!selected || busy) return;
    const order = selected;
    if (
      !(await confirmAction(
        `Cancel ${order.reference}? This request is checked against the latest order status.`,
        {
          title: "Cancel this order?",
          confirmLabel: "Cancel order",
          cancelLabel: "Keep order",
          destructive: true,
        },
      ))
    )
      return;
    setBusy(true);
    setError("");
    try {
      await api("order.transition", {
        id: order.id,
        version: order.tracking_version,
        operationKey: (cancelKeys.current[
          `${order.id}:${order.tracking_version}`
        ] ??= crypto.randomUUID()),
        status: "cancelled",
        note: "Cancelled by the customer before acceptance.",
      });
      await tracking.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  const matching = (orders ?? []).filter((o) => orderMatches(o, filter, query));
  const pages = Math.max(1, Math.ceil(matching.length / 6)),
    currentPage = Math.min(page, pages);
  const live =
    tracking.connection === "Live updates connected" && !tracking.error;
  return (
    <div className="container page customer-orders-workspace">
      <header className="co-heading">
        <div>
          {orderId ? (
            <Link href="/orders" className="co-all-orders">
              <ChevronLeft size={13} />
              Back to all orders
            </Link>
          ) : (
            <span className="co-eyebrow">YOUR EASYGAS</span>
          )}
          <h1>My Orders</h1>
          <p>Manage deliveries, track progress and find your receipts.</p>
        </div>
        <Link href="/products" className="button">
          <Plus size={17} />
          New order
        </Link>
      </header>
      <div className="co-topline">
        <nav className="co-view-switch" aria-label="Orders workspace">
          <button
            aria-pressed={view === "orders"}
            onClick={() => setView("orders")}
          >
            <Package size={17} />
            Orders{orders && <span>{orders.length}</span>}
          </button>
          <button
            aria-pressed={view === "documents"}
            onClick={() => setView("documents")}
          >
            <ReceiptText size={17} />
            Invoices & receipts
          </button>
        </nav>
        <div className="co-connection">
          <span className={`co-dot ${live ? "live" : ""}`} />
          <span
            role="status"
            title={
              tracking.observed
                ? `Last checked ${time(tracking.observed)} (Lagos)`
                : undefined
            }
          >
            {tracking.connection}
          </span>
          <button
            className="icon-button"
            onClick={tracking.refresh}
            aria-label="Refresh orders"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>
      {tracking.error && <Notice type="error" message={tracking.error} />}
      {view === "documents" ? (
        <DocumentLibrary compact />
      ) : (
        <section className="co-panel" aria-label="Your orders">
          <div className="co-toolbar">
            <div className="co-filters" aria-label="Filter orders">
              {(
                [
                  ["all", "All orders"],
                  ["active", "Active"],
                  ["delivered", "Delivered"],
                  ["cancelled", "Cancelled"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  aria-pressed={filter === value}
                  onClick={() => {
                    setFilter(value);
                    setPage(1);
                  }}
                >
                  {label}
                  {orders && (
                    <span>
                      {orders.filter((o) => orderMatches(o, value)).length}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <label className="co-search">
              <Search size={17} />
              <input
                aria-label="Search orders"
                placeholder="Search orders…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
              />
            </label>
          </div>
          {!orders ? (
            <div className="co-empty">
              {tracking.error ? (
                <p>Orders could not be loaded. Refresh to try again.</p>
              ) : (
                <Loading />
              )}
            </div>
          ) : !matching.length ? (
            <div className="co-empty">
              <Package size={38} />
              <h2>
                {orders.length
                  ? "No matching orders"
                  : "Your first delivery starts here"}
              </h2>
              <p>
                {orders.length
                  ? "Try another search or filter."
                  : "Your orders and delivery updates will appear here."}
              </p>
              {orders.length ? (
                <button
                  className="button secondary"
                  onClick={() => {
                    setQuery("");
                    setFilter("all");
                    setPage(1);
                  }}
                >
                  Clear filters
                </button>
              ) : (
                <Link href="/products" className="button">
                  Explore products
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className="co-list">
                {matching
                  .slice((currentPage - 1) * 6, currentPage * 6)
                  .map((order) => (
                    <article className="co-order" key={order.id}>
                      <div
                        className={`co-package ${terminal(order) ? "complete" : ""}`}
                      >
                        {order.status === "delivered" ? (
                          <CheckCircle2 size={23} />
                        ) : (
                          <Package size={23} />
                        )}
                      </div>
                      <div className="co-order-main">
                        <div className="co-order-title">
                          <h2>{order.reference}</h2>
                          <span className={`co-badge ${order.status}`}>
                            {trackingLabels[order.status] ??
                              order.status.replaceAll("_", " ")}
                          </span>
                        </div>
                        <p className="co-product">{orderSummary(order)}</p>
                        <div className="co-delivery">
                          <span>
                            <CalendarDays size={14} />
                            {date(order.delivery_date)}
                            {!terminal(order) && ` · ${order.delivery_window}`}
                          </span>
                          <span>
                            <MapPin size={14} />
                            {order.address?.zone || "Delivery address on file"}
                          </span>
                          {deliveryDelayed(order) && (
                            <span className="co-delayed">
                              <Clock3 size={14} />
                              Delivery update needed
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="co-order-amount">
                        <strong>{money(order.total_kobo)}</strong>
                        <span
                          className={`co-payment ${order.payment_status === "verified" ? "paid" : ""}`}
                        >
                          {order.payment_status === "verified"
                            ? "Payment verified"
                            : `Payment ${order.payment_status.replaceAll("_", " ")}`}
                        </span>
                      </div>
                      <div className="co-order-actions">
                        <button
                          className={
                            terminal(order) ? "button secondary" : "button"
                          }
                          onClick={(e) => open(order, e)}
                        >
                          {terminal(order) ? "View details" : "Track order"}
                          <ArrowUpRight size={15} />
                        </button>
                        <OrderInvoice orderId={order.id} />
                      </div>
                    </article>
                  ))}
              </div>
              <footer className="co-pagination">
                <span>
                  {(currentPage - 1) * 6 + 1}–
                  {Math.min(currentPage * 6, matching.length)} of{" "}
                  {matching.length} orders
                </span>
                <div>
                  <button
                    className="icon-button"
                    disabled={currentPage <= 1}
                    aria-label="Previous orders page"
                    onClick={() => setPage(currentPage - 1)}
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span>
                    Page {currentPage} of {pages}
                  </span>
                  <button
                    className="icon-button"
                    disabled={currentPage >= pages}
                    aria-label="Next orders page"
                    onClick={() => setPage(currentPage + 1)}
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </footer>
            </>
          )}
        </section>
      )}
      {selected && (
        <OrdersDialog
          key={`${selected.id}:${mode}`}
          title={mode === "refund" ? "Request a refund" : "Order details"}
          onClose={close}
        >
          {mode === "refund" ? (
            <RefundRequest order={selected} />
          ) : (
            <>
              <div className="co-detail-heading">
                <div>
                  <strong>{selected.reference}</strong>
                  <p>{orderSummary(selected)}</p>
                </div>
                <span className={`co-badge ${selected.status}`}>
                  {customerOrderStage(selected)}
                </span>
              </div>
              <div
                className="co-detail-tabs"
                aria-label="Order detail sections"
              >
                {[
                  ["overview", "Overview"],
                  ["updates", "Delivery updates"],
                  ["history", "Visit & photo history"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    aria-pressed={detailTab === value}
                    onClick={() => setDetailTab(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {error && <Notice type="error" message={error} />}
              {detailTab === "overview" && (
                <div className="co-overview">
                  <dl className="co-detail-grid">
                    <div>
                      <dt>Delivery address</dt>
                      <dd>
                        {selected.address?.street}
                        <br />
                        {selected.address?.zone}
                      </dd>
                    </div>
                    <div>
                      <dt>
                        {terminal(selected)
                          ? "Scheduled delivery"
                          : "Delivery window"}
                      </dt>
                      <dd>
                        {date(selected.delivery_date)}
                        <br />
                        {selected.delivery_window} (Lagos)
                      </dd>
                    </div>
                    <div>
                      <dt>Order total</dt>
                      <dd>{money(selected.total_kobo)}</dd>
                    </div>
                    <div>
                      <dt>Payment</dt>
                      <dd>
                        {selected.payment_status === "verified"
                          ? "Verified"
                          : selected.payment_status.replaceAll("_", " ")}
                      </dd>
                    </div>
                  </dl>
                  <OrderCardPayment order={selected} />
                  {!terminal(selected) && (
                    <>
                      <div className="co-driver">
                        <Truck size={21} />
                        <div>
                          <strong>
                            {selected.driver?.name ??
                              "Awaiting driver assignment"}
                          </strong>
                          <small>
                            {selected.attempt?.state === "arrived"
                              ? "Driver has arrived"
                              : "Your delivery team"}
                          </small>
                        </div>
                      </div>
                      {deliveryDelayed(selected) && (
                        <Notice message="Your scheduled delivery window has passed. Contact support for an update; no revised ETA is confirmed." />
                      )}
                      {selected.status === "delivery_failed" && (
                        <Notice message="Delivery was unsuccessful. Contact support to arrange the next step. A new delivery requires dispatch confirmation." />
                      )}
                      {selected.status === "out_for_delivery" &&
                        selected.driver && (
                          <CustomerRiderPosition fix={selected.gps?.fix} />
                        )}
                      {selected.confirmation_code && (
                        <div className="co-code">
                          <div>
                            <strong>Delivery confirmation code</strong>
                            <p>Share only after you receive all your items.</p>
                          </div>
                          <button
                            className="button secondary"
                            aria-expanded={reveal}
                            onClick={() => setReveal(!reveal)}
                          >
                            {reveal ? "Hide code" : "Show code"}
                          </button>
                          {reveal && (
                            <output>{selected.confirmation_code}</output>
                          )}
                        </div>
                      )}
                    </>
                  )}
                  <div className="co-detail-actions">
                    <Link
                      className="button secondary"
                      href={`/support?orderId=${encodeURIComponent(selected.id)}`}
                    >
                      Get help or change delivery
                    </Link>
                    {terminal(selected) && <button className="button" disabled={busy} onClick={()=>repeatOrder(selected)}>Order again</button>}
                    {selected.status === "delivered" &&
                      selected.payment_status === "verified" && (
                        <>
                          <button
                            className="button secondary"
                            onClick={() => setMode("refund")}
                          >
                            Request refund
                          </button>
                          <Link
                            className="button secondary"
                            href={`/account-settings?testimonialOrder=${encodeURIComponent(selected.id)}#testimonials`}
                          >
                            Share your experience
                          </Link>
                        </>
                      )}
                    {selected.status === "placed" && (
                      <button
                        className="co-cancel"
                        disabled={busy}
                        onClick={cancel}
                      >
                        {busy ? "Cancelling…" : "Cancel order"}
                      </button>
                    )}
                  </div>
                </div>
              )}
              {detailTab === "updates" && (
                <div className="co-updates">
                  <p className="co-muted co-small">
                    All times are shown in Lagos time.
                  </p>
                  <ol>
                    {(selected.events ?? []).map(
                      (event: any, index: number) => (
                        <li key={event.id ?? index}>
                          <span className="co-event-dot" />
                          <div>
                            <strong>{trackingEventLabel(event)}</strong>
                            <time dateTime={event.created_at}>
                              {time(event.created_at)}
                            </time>
                          </div>
                        </li>
                      ),
                    )}
                  </ol>
                  {!selected.events?.length && <p>No delivery updates yet.</p>}
                </div>
              )}
              {detailTab === "history" && (
                <div className="co-history">
                  <OrderOperations order={selected} customer embedded />
                </div>
              )}
            </>
          )}
        </OrdersDialog>
      )}
    </div>
  );
}
