"use client";
import { operationNoteRequired } from "../../../packages/business-rules/src/operation-notes";

import { isDoorstepRefillOrder } from "../../../packages/business-rules/src/refill-workflow";
import ConfirmDeliveryAddress from "./confirm-delivery-address";
import PhoneOrderPaymentActions from "./phone-order-payment-actions";
import React, { useEffect, useRef, useState } from "react";
import Link from "./workspace-link";
import { Check } from "lucide-react";
import { Modal, Notice, api, money } from "./ui";
import { WorkspaceTabs, RecordPages } from "./compact-workspace";
import { confirmAction } from "./app-dialog";
import { FormInput } from "./password-input";
import { FieldCaption } from "./field-caption";
import { ActionForm } from "./workflows";
import { OrderOperations, OrderCommunication } from "./order-operations";
import OrderInvoice from "./order-invoice";
import OrderAdditions from "./order-additions";
import SameVisitOrder from "./same-visit-order";
import OrderCylinderInspection from "./order-cylinder-inspection";
import OrderLPGSetup from "./order-lpg-setup";
import DailyDelivery from "./daily-delivery";
import { LPGSetupAccess } from "./lpg-setup-access";
import { orderTransitions } from "../../../packages/business-rules/src/forecast";
import { deliveryFailureReasons } from "../../../packages/business-rules/src/order-tracking";
import {
  DriverAssignmentChoices,
  useAssignmentCandidates,
} from "./driver-assignment";

const early = ["placed", "accepted", "preparing"];
const labels: Record<string, string> = {
  accepted: "Accept order",
  preparing: "Prepare order",
  assigned: "Assign driver",
  out_for_delivery: "Start delivery",
  delivery_failed: "Report failed delivery",
  cancelled: "Cancel order",
};
export type OrderAction = { id: string; label: string };
/** Presentation choices only. Every write still passes the original server controls. */
export function orderDetailActions(order: any, user: any): OrderAction[] {
  const rows: OrderAction[] = [];
  if (order.gas_lines?.length && order.driver_id && ["assigned", "out_for_delivery"].includes(order.status)) {
    if (!order.daily_run && user.role === "owner") rows.push({id: "meter-calibration", label: "Renew meter calibration"});
    if (!order.daily_run && ["owner", "finance"].includes(user.role)) rows.push({id: "lpg-load", label: "Issue LPG load"});
  }
  if (
    ["owner", "manager"].includes(user.role) &&
    ["assigned", "out_for_delivery"].includes(order.status) &&
    !order.visit_link
  )
    rows.push({ id: "extra-visit", label: "Extra order for this visit" });
  if (
    ["owner", "manager"].includes(user.role) &&
    (orderTransitions[order.status] ?? []).some((s) => s !== "delivered")
  )
    rows.push({ id: "transition", label: "Update status" });
  if (
    order.status === "out_for_delivery" &&
    ["owner", "manager", "driver"].includes(user.role)
  )
    rows.unshift({ id: "complete", label: "Confirm delivery" });
  if (
    ["owner", "manager"].includes(user.role) &&
    early.includes(order.status)
  ) {
    if (
      order.payment_status === "unpaid" &&
      ["card", "cash_on_delivery"].includes(order.payment_method) &&
      !order.driver_id &&
      !order.attempt
    )
      rows.push({ id: "additions", label: "Add items" });
    if (order.gas_lines?.length)
      rows.push({ id: "coverage", label: "Confirm address coverage" });
  }
  if (
    ["owner", "manager"].includes(user.role) &&
    order.customer_provisional === true
  )
    rows.push(
      { id: "consent", label: "Record messaging consent" },
      { id: "invite", label: "Send account completion link" },
    );
  if (
    ["owner", "manager"].includes(user.role) &&
    order.order_source === "PHONE_ASSISTED" &&
    order.payment_status !== "verified" &&
    !["delivered", "cancelled", "delivery_failed"].includes(order.status)
  )
    rows.unshift({ id: "phone-payment", label: "Send payment link" });
  return rows;
}
const text = (v: any) => String(v ?? "Not recorded").replaceAll("_", " ");
const at = (v: any) =>
  v
    ? new Intl.DateTimeFormat("en-GB", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Africa/Lagos",
      }).format(new Date(v))
    : "Not recorded";
export function OrderOverview({ order }: { order: any }) {
  return (
    <div className="aord-overview">
      <section>
        <h3>Customer</h3>
        <strong>
          {order.customer_name ?? order.address?.name ?? "Customer"}
        </strong>
        <p>{order.address?.phone ?? "No phone recorded"}</p>
        <p>
          {[order.address?.street, order.address?.zone]
            .filter(Boolean)
            .join(", ")}
        </p>
      </section>
      <section>
        <h3>Delivery</h3>
        <strong>
          {order.delivery_date
            ? new Intl.DateTimeFormat("en-GB", {
                dateStyle: "medium",
                timeZone: "Africa/Lagos",
              }).format(new Date(order.delivery_date + "T12:00:00Z"))
            : "Date not recorded"}{" "}
          · {order.delivery_window}
        </strong>
        <p>Lagos time</p>
        <p>
          {order.driver?.name
            ? `Driver: ${order.driver.name}`
            : "Driver not assigned"}
        </p>
      </section>
      <section className="aord-wide aord-order-line">
        <span>
          {[
            (order.items ?? []).length
              ? `${order.items.reduce((n: number, r: any) => n + Number(r.quantity), 0)} product unit(s)`
              : null,
            order.gas_lines?.length
              ? `${order.gas_lines.reduce((n: number, g: any) => n + Number(g.grams), 0) / 1000} kg gas`
              : null,
          ]
            .filter(Boolean)
            .join(" · ") || "No items recorded"}
        </span>
        <span>Payment: {text(order.payment_status)}</span>
      </section>
    </div>
  );
}
export default function AdminOrderDetails({
  order,
  user,
  drivers = [],
  onClose,
  onChanged,
  initialAction = "",
}: {
  order: any;
  user: any;
  drivers?: any[];
  onClose: () => void;
  onChanged: (options?: { keepOpen?: boolean }) => void;
  initialAction?: string;
}) {
  const [tab, setTab] = useState("overview"),
    [view, setView] = useState(initialAction),
    [dirty, setDirty] = useState(false),
    [notice, setNotice] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const actionBody = useRef<HTMLDivElement>(null);
  const [lpgPending, setLpgPending] = useState(false);
  const [lpgRefresh, setLpgRefresh] = useState(0);
  const [extraOrder, setExtraOrder] = useState<any>(null);
  const actions = orderDetailActions(order, user);
  const next = (orderTransitions[order.status] ?? []).find(
    (s) => s !== "delivered" && s !== "cancelled",
  );
  const primary =
    actions.find((a) => a.id === "phone-payment") ??
    actions.find((a) => a.id === "complete") ??
    (next ? actions.find((a) => a.id === "transition") : undefined);
  const awaitingDriver = Boolean(order.daily_run && ((order.status === 'assigned' && order.attempt?.state!=='picked_up') || (order.status === 'out_for_delivery' && !order.daily_run.photo_ready)));
  const waitingLabel = order.status === 'assigned' ? 'Awaiting driver start' : Number(order.daily_run?.supplied_grams)>0 ? 'Awaiting refill photo' : 'Awaiting driver refill';
  const action = actions.find((a) => a.id === view);
  const title = view === "invoice" ? "Order invoice" : action?.label;
  function statusUpdated(status: string) {
    setDirty(false);
    setView("");
    setTab("overview");
    setNotice(
      status === "assigned"
        ? "Driver assigned. You can continue with this order."
        : status === "out_for_delivery"
          ? "Delivery started. You can continue with this order."
          : status === "delivered"
            ? "Delivery completed."
            : status === "cancelled"
              ? "Order cancelled."
              : `Order status updated to ${text(status)}.`,
    );
    onChanged({ keepOpen: true });
  }
  async function back(nextView = "") {
    if (lpgPending || actionBody.current?.querySelector('[data-submit-pending="true"]')) return;
    if (
      dirty &&
      !(await confirmAction(
        "Discard this unsaved action and return to the order?",
        {
          title: "Discard unsaved changes?",
          confirmLabel: "Discard changes",
          cancelLabel: "Keep editing",
          destructive: true,
        },
      ))
    )
      return;
    setDirty(false);
    setView(nextView);
  }
  useEffect(() => {
    if (view) heading.current?.focus();
  }, [view]);
  if (extraOrder)
    return (
      <AdminOrderDetails
        order={extraOrder}
        user={user}
        drivers={drivers}
        onClose={() => {
          setExtraOrder(null);
          onChanged();
        }}
        onChanged={(options) => {
          void api("orders?id=" + encodeURIComponent(extraOrder.id)).then(
            (rows) => {
              if (rows[0]) setExtraOrder(rows[0]);
            },
          );
          onChanged(options);
        }}
      />
    );
  return (
    <Modal
      title={order.reference}
      className="admin-order-dialog"
      onClose={onClose}
      busy={lpgPending}
    >
      <div className="aord-status">
        <span className={`status ${order.status}`}>{text(order.status)}</span>
        <span className="aord-total">{money(order.total_kobo)}</span>
        <button type="button" className="button secondary" disabled={lpgPending} onClick={async () => {
          if (lpgPending) return;
          const lpg = ["meter-calibration", "lpg-load"].includes(view);
          if (lpg && dirty && !(await confirmAction("Discard the unsaved LPG details and refresh this order?", {title: "Discard unsaved changes?", confirmLabel: "Discard and refresh", destructive: true}))) return;
          if (lpg) { setDirty(false); setLpgRefresh(n => n + 1); }
          onChanged({ keepOpen: true });
        }}>
          Refresh order
        </button>
      </div>
      {notice && <Notice message={notice} />}
      {order.visit_link && (
        <div className="assignment-preparation">
          <strong>Extra order for {order.visit_link.parent_reference}</strong>
          <p>
            Same customer visit · no additional delivery fee · original driver
            and trip retained.
          </p>
        </div>
      )}
      {order.extra_orders?.length > 0 && (
        <p>
          {order.extra_orders.length} linked extra order(s):{" "}
          {order.extra_orders.map((o: any) => o.reference).join(", ")}
        </p>
      )}
      {order.operational_review &&
        view !== "transition" &&
        !["delivered", "cancelled"].includes(order.status) && (
          <Notice type="error" message={order.operational_review} />
        )}
      {view ? (
        <div
          ref={actionBody}
          className="aord-action-view"
          data-unsaved={dirty ? "true" : undefined}
          onChangeCapture={() => setDirty(true)}
        >
          <button
            className="text-link aord-back"
            type="button"
            disabled={lpgPending}
            onClick={() => void back()}
          >
            ← Back to order
          </button>
          <h3 ref={heading} tabIndex={-1}>
            {title}
          </h3>
          {view === "transition" && (
            <OrderStatusAction
              order={order}
              drivers={drivers}
              onResolveOrder={(action) => void back(action)}
              lpgActions={actions.filter(a => ["meter-calibration", "lpg-load"].includes(a.id))}
              onDone={statusUpdated}
            />
          )}
          {(view === "meter-calibration" || view === "lpg-load") && (
            <OrderLPGSetup key={JSON.stringify([order.id, order.branch_id, order.driver_id, order.tracking_version, lpgRefresh])}
              order={order} user={user} mode={view === "meter-calibration" ? "calibration" : "load"}
              onAction={(action) => void back(action)} onPendingChange={setLpgPending}
              onDraftReset={() => setDirty(false)}
              onSaved={(kind) => {
                setDirty(false);
                setNotice(kind === "calibration" ? "Meter calibration renewed. Record the actual LPG load below."
                  : "LPG load issued. The driver must check its actual measurements and confirm receipt before starting delivery.");
                if (kind === "calibration") setView("lpg-load");
                onChanged({keepOpen: true});
              }} />
          )}
          {view === "complete" && (
            <DeliveryCompletion
              order={order}
              onDone={() => statusUpdated("delivered")}
            />
          )}
          {view === "additions" && (
            <OrderAdditions
              compact
              order={order}
              user={user}
              onChanged={onChanged}
            />
          )}
          {view === "extra-visit" && (
            <SameVisitOrder
              order={order}
              onCreated={async (id) => {
                const rows = await api("orders?id=" + encodeURIComponent(id));
                if (!rows[0])
                  throw new Error("Extra order unavailable. Refresh Orders.");
                setDirty(false);
                setExtraOrder(rows[0]);
              }}
            />
          )}
          {view === "coverage" && (
            <ConfirmDeliveryAddress
              order={order}
              onDone={() => {
                setDirty(false);
                onChanged({ keepOpen: true });
              }}
            />
          )}
          {view.startsWith("inspection:") && (
            <OrderCylinderInspection
              line={order.gas_lines.find(
                (g: any) => "inspection:" + g.id === view,
              )}
              onDone={onChanged}
            />
          )}
          {(view === "consent" || view === "invite") && (
            <OrderCommunication
              order={order}
              kind={view}
              contextual
              onDone={() => setDirty(false)}
            />
          )}
          {view === "phone-payment" && (
            <PhoneOrderPaymentActions
              orderId={order.id}
              onSaved={() => setDirty(false)}
            />
          )}
          {view === "invoice" && (
            <OrderInvoice
              orderId={order.id}
              canIssue={["owner", "finance"].includes(user.role)}
              embedded
            />
          )}
        </div>
      ) : (
        <>
          <WorkspaceTabs
            label="Order details"
            value={tab}
            onChange={setTab}
            tabs={[
              ["overview", "Overview"],
              ["items", "Items"],
              ["payment", "Payment"],
              ["history", "History"],
            ]}
          />
          <div className="aord-tab-content">
            {tab === "overview" && <>
              <OrderOverview order={order} />
              {order.daily_run && <Notice message={`Daily vehicle gas is reserved for this order. ${order.status==='assigned' ? 'The driver accepts and starts delivery in their app. Refresh this order to see their progress.' : order.daily_run.photo_ready ? 'Scale refill and current photo are recorded. Delivery can be completed.' : Number(order.daily_run.supplied_grams)>0 ? 'Scale refill recorded; waiting for the driver to upload the refill photo.' : 'The driver records before/after scale weights at the customer, then uploads the refill photo.'}`} />}
              {!order.daily_run && order.gas_lines?.length>0 && ['owner','manager'].includes(user.role) && !['delivered','cancelled'].includes(order.status) && <DailyDelivery user={user} branch={order.branch_id} onChange={()=>onChanged({keepOpen:true})}/>}

              {!order.daily_run && order.gas_lines?.length > 0 && order.driver_id && ["assigned", "out_for_delivery"].includes(order.status) && <LPGSetupAccess role={user.role} />}
              {actions.some(a => ["meter-calibration", "lpg-load"].includes(a.id)) && <section className="stack panel" aria-label="Vehicle LPG actions">
                <h3>Earlier metered workflow</h3>
                <p>Use only for an existing metered trip. For daily weighed delivery, start the day using the actual opening gas weight above.</p>
                <div className="aord-footer">{actions.filter(a => ["meter-calibration", "lpg-load"].includes(a.id)).map(a =>
                  <button type="button" className="button secondary" key={a.id} onClick={() => setView(a.id)}>{a.label}</button>)}</div>
              </section>}
            </>}
            {tab === "items" && (
              <section>
                <h3>Order items</h3>
                <RecordPages
                  rows={[
                    ...(order.gas_lines ?? []).map((g: any) => ({
                      id: g.id,
                      name: `Gas refill · ${Number(g.grams) / 1000} kg`,
                      detail: `${Number(g.capacity_grams) / 1000} kg cylinder · ${money(g.unit_price_kobo)}/kg · Supplied at the customer’s address from the vehicle tank`,
                      amount: g.subtotal_kobo,
                    })),
                    ...(order.items ?? []).map((i: any) => ({
                      id: i.product_id,
                      name: `${i.quantity} × ${i.name}`,
                      detail: "Product",
                      amount: Number(i.unit_price_kobo) * Number(i.quantity),
                    })),
                  ]}
                >
                  {(rows) => (
                    <div className="aord-items">
                      {rows.map((r) => (
                        <div key={r.id}>
                          <span>
                            <strong>{r.name}</strong>
                            <small>{r.detail}</small>
                          </span>
                          <strong>{money(r.amount)}</strong>
                        </div>
                      ))}
                    </div>
                  )}
                </RecordPages>
              </section>
            )}
            {tab === "payment" && (
              <section>
                <h3>Payment summary</h3>
                <dl className="aord-facts">
                  <div>
                    <dt>Order total</dt>
                    <dd>{money(order.total_kobo)}</dd>
                  </div>
                  <div>
                    <dt>Method</dt>
                    <dd>{text(order.payment_method)}</dd>
                  </div>
                  <div>
                    <dt>Payment status</dt>
                    <dd>{text(order.payment_status)}</dd>
                  </div>
                </dl>
                {["owner", "finance", "manager"].includes(user.role) && (
                  <button
                    className="button secondary"
                    onClick={() => setView("invoice")}
                  >
                    View invoice
                  </button>
                )}
              </section>
            )}
            {tab === "history" && <OrderHistory order={order} user={user} />}
          </div>
          {actions.length > 0 && (
            <footer className="aord-footer">
              {actions.some((a) => a.id === "extra-visit") && (
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setView("extra-visit")}
                >
                  Extra order for this visit
                </button>
              )}
              {primary && (
                <button className="button" disabled={awaitingDriver} onClick={() => setView(primary.id)}>
                  {awaitingDriver ? waitingLabel : primary.id === "transition" ? labels[next!] : primary.label}
                </button>
              )}
              <select
                aria-label="More order actions"
                value=""
                onChange={(e) => {
                  if (e.target.value) setView(e.target.value);
                }}
              >
                <option value="">More actions…</option>
                {actions
                  .filter((a) => a.id !== primary?.id)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label}
                    </option>
                  ))}
                {primary?.id === "transition" && (
                  <option value="transition">Other status changes</option>
                )}
              </select>
            </footer>
          )}
        </>
      )}
    </Modal>
  );
}
export function OrderHistory({ order, user }: { order: any; user: any }) {
  const [view, setView] = useState("timeline");
  return (
    <section className="aord-history">
      <WorkspaceTabs
        label="Order history"
        value={view}
        onChange={setView}
        tabs={[
          ["timeline", "Timeline"],
          ["evidence", "Visit evidence"],
        ]}
      />
      {view === "timeline" ? (
        <>
          {order.operational_review && (
            <section className="aord-recorded-note">
              <h3>Recorded operational note</h3>
              <p>{order.operational_review}</p>
            </section>
          )}
          <dl className="aord-facts">
            <div>
              <dt>Created · Lagos</dt>
              <dd>{at(order.created_at)}</dd>
            </div>
            <div>
              <dt>Last update · Lagos</dt>
              <dd>{at(order.last_update)}</dd>
            </div>
          </dl>
          {(order.events ?? []).length ? (
            <RecordPages rows={[...(order.events ?? [])].reverse()}>
              {(rows) => (
                <ol className="aord-timeline">
                  {rows.map((e: any, i: number) => (
                    <li key={e.version ?? i}>
                      <strong>{text(e.status)}</strong>
                      <time>{at(e.created_at)}</time>
                      <p>{e.note}</p>
                    </li>
                  ))}
                </ol>
              )}
            </RecordPages>
          ) : (
            <p>No status history recorded.</p>
          )}
        </>
      ) : (
        <OrderOperations order={order} user={user} embedded historyOnly />
      )}
    </section>
  );
}
export function OrderStatusAction({
  order,
  drivers,
  onDone,
  onResolveOrder,
  lpgActions = [],
}: {
  order: any;
  drivers: any[];
  onDone: (status: string) => void;
  onResolveOrder?: (action: string) => void;
  lpgActions?: OrderAction[];
}) {
  const allowed = (orderTransitions[order.status] ?? []).filter(
    (s) => s !== "delivered",
  );
  const [status, setStatus] = useState(
      allowed.find((s) => s !== "cancelled") ?? "",
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState("");
  const candidates = useAssignmentCandidates(
    order.id,
    Number(order.tracking_version),
    status === "assigned",
  );
  const driverReady = Boolean(
    candidates.data?.writesEnabled &&
      candidates.data.candidates.some(
        (d) => d.id === selectedDriver && d.readiness.ready === true,
      ),
  );
  return (
    <form
      className="stack"
      onSubmit={async (e) => {
        e.preventDefault();
        if (status === "assigned" && (!driverReady || candidates.loading))
          return;
        setBusy(true);
        setError("");
        const f = new FormData(e.currentTarget);
        try {
          await api("order.transition", {
            id: order.id,
            operationKey: crypto.randomUUID(),
            version:
              status === "assigned"
                ? candidates.data!.version
                : Number(order.tracking_version),
            status,
            note: String(f.get("note") ?? ""),
            ...(status === "assigned"
              ? { driverId: String(f.get("driverId")) }
              : {}),
            ...(status === "delivery_failed"
              ? { failureReason: String(f.get("failureReason")) }
              : {}),
          });
          onDone(status);
        } catch (e: any) {
          setError(e.message);
          if (status === "assigned") {
            setSelectedDriver("");
            await candidates.refresh();
          }
        } finally {
          setBusy(false);
        }
      }}
    >
      <label>
        <FieldCaption required>Next status</FieldCaption>
        <select
          required
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setSelectedDriver("");
            setError("");
          }}
        >
          {allowed.map((s) => (
            <option value={s} key={s}>
              {labels[s] ?? text(s)}
            </option>
          ))}
        </select>
      </label>
      {status === "assigned" && (
        <>
          <input type="hidden" name="driverId" value={selectedDriver} />
          <DriverAssignmentChoices
            onResolveOrder={onResolveOrder}
            data={candidates.data}
            loading={candidates.loading}
            error={candidates.error}
            selected={selectedDriver}
            onSelect={setSelectedDriver}
            disabled={busy}
            onRefresh={() => {
              setSelectedDriver("");
              void candidates.refresh();
            }}
          />
        </>
      )}
      {status === "delivery_failed" && (
        <label>
          <FieldCaption required>Failure category</FieldCaption>
          <select name="failureReason">
            {deliveryFailureReasons.map((r) => (
              <option key={r} value={r}>
                {text(r)}
              </option>
            ))}
          </select>
        </label>
      )}
      {status === "out_for_delivery" && lpgActions.length > 0 && <section className="stack" aria-label="Resolve vehicle gas readiness">
        <p>Set up the vehicle’s gas load without closing this order.</p>
        <div className="aord-footer">{lpgActions.map(a => <button type="button" className="button secondary" key={a.id}
          disabled={busy} onClick={() => onResolveOrder?.(a.id)}>{a.label}</button>)}</div>
      </section>}
      <label>
        <FieldCaption required={operationNoteRequired("order.transition", "note", {status})}>
          {["cancelled", "delivery_failed"].includes(status) ? "Reason and next-step details" : "Operational note"}
        </FieldCaption>
        <FormInput name="note" required={operationNoteRequired("order.transition", "note", {status})} minLength={operationNoteRequired("order.transition", "note", {status}) ? 5 : undefined} maxLength={500} />
      </label>
      {error && <Notice type="error" message={error} />}
      {order.daily_run && status==='out_for_delivery' && order.attempt?.state!=='picked_up' && <Notice message="The driver accepts and starts delivery in their app. Refresh this order after they start."/>}
      <button
        className="button"
        disabled={
          busy ||
          (order.daily_run && status==='out_for_delivery' && order.attempt?.state!=='picked_up') ||
          (status === "assigned" && (candidates.loading || !driverReady))
        }
      >
        {busy ? "Saving…" : (labels[status] ?? "Update order")}
      </button>
    </form>
  );
}
function DeliveryCompletion({
  order,
  onDone,
}: {
  order: any;
  onDone: () => void;
}) {
  const refill = isDoorstepRefillOrder(order);
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <form
      className="proposal-context"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const d = Object.fromEntries(new FormData(e.currentTarget));
        try {
          await api("delivery.complete", {
            orderId: order.id,
            operationKey: crypto.randomUUID(),
            version: order.tracking_version,
            handover: d.handover === "on",
            ...(refill ? {} : { code: d.code }),
            collectedKobo: ["wallet", "card"].includes(order.payment_method)
              ? 0
              : Math.round(Number(d.amount) * 100),
          });
          onDone();
        } catch (e: any) {
          setError(e.message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3>Confirm delivery</h3>
      <p>
        {refill
          ? "Confirm the full ordered gas quantity was supplied at the customer's address and the driver uploaded a current-visit refill photo."
          : "Ask for the customer's code after handing over every item."}{" "}
        Cash collection remains unverified until an independent finance officer reconciles it.
      </p>
      <Link className="button secondary" href="/admin/deliveries">
        Open dispatch and pickup verification
      </Link>
      <label>
        <FormInput type="checkbox" name="handover" required />
        <FieldCaption required={true}>
          {refill
            ? "I confirmed the full ordered gas quantity was supplied and current-visit photo evidence was recorded."
            : "I checked all quantities and cylinder serials and handed over every item."}
        </FieldCaption>
      </label>
      {!refill && <label>
        <FieldCaption required={true}>Customer confirmation code</FieldCaption>
        <FormInput
          name="code"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          autoComplete="off"
        />
      </label>}
      <label>
        {["wallet", "card"].includes(order.payment_method) ? (
          "Prepaid order — collect no cash"
        ) : (
          <FieldCaption required={true}>
            Cash actually collected (₦)
          </FieldCaption>
        )}
        <FormInput
          name="amount"
          type="number"
          min="0"
          step="0.01"
          defaultValue={
            ["wallet", "card"].includes(order.payment_method) ? 0 : undefined
          }
          readOnly={["wallet", "card"].includes(order.payment_method)}
          required
        />
      </label>
      {error && <Notice message={error} type="error" />}
      <button className="button full" disabled={busy}>
        {["wallet", "card"].includes(order.payment_method)
          ? "Confirm prepaid delivery"
          : "Record Delivery & Cash Collection"}{" "}
        <Check size={17} />
      </button>
    </form>
  );
}
