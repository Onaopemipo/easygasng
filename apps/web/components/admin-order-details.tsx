"use client";
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
import OrderCylinderInspection from "./order-cylinder-inspection";
import { orderTransitions } from "../../../packages/business-rules/src/forecast";
import { deliveryFailureReasons } from "../../../packages/business-rules/src/order-tracking";

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
  if (["owner", "finance"].includes(user.role) && early.includes(order.status))
    for (const line of order.gas_lines ?? [])
      rows.push({
        id: "inspection:" + line.id,
        label: `Inspect ${Number(line.grams) / 1000} kg cylinder`,
      });
  if (
    ["owner", "manager"].includes(user.role) &&
    order.customer_provisional === true
  )
    rows.push(
      { id: "consent", label: "Record messaging consent" },
      { id: "invite", label: "Send account completion link" },
    );
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
}: {
  order: any;
  user: any;
  drivers?: any[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [tab, setTab] = useState("overview"),
    [view, setView] = useState(""),
    [dirty, setDirty] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const actions = orderDetailActions(order, user);
  const next = (orderTransitions[order.status] ?? []).find(
    (s) => s !== "delivered" && s !== "cancelled",
  );
  const primary =
    actions.find((a) => a.id === "complete") ??
    (next ? actions.find((a) => a.id === "transition") : undefined);
  const action = actions.find((a) => a.id === view);
  const title = view === "invoice" ? "Order invoice" : action?.label;
  async function back() {
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
    setView("");
  }
  useEffect(() => {
    if (view) heading.current?.focus();
  }, [view]);
  return (
    <Modal
      title={order.reference}
      className="admin-order-dialog"
      onClose={onClose}
    >
      <div className="aord-status">
        <span className={`status ${order.status}`}>{text(order.status)}</span>
        <span className="aord-total">{money(order.total_kobo)}</span>
      </div>
      {order.operational_review &&
        !["delivered", "cancelled"].includes(order.status) && (
          <Notice type="error" message={order.operational_review} />
        )}
      {view ? (
        <div
          className="aord-action-view"
          data-unsaved={dirty ? "true" : undefined}
          onChangeCapture={() => setDirty(true)}
        >
          <button
            className="text-link aord-back"
            type="button"
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
              onDone={onChanged}
            />
          )}
          {view === "complete" && (
            <DeliveryCompletion order={order} onDone={onChanged} />
          )}
          {view === "additions" && (
            <OrderAdditions compact order={order} user={user} onChanged={onChanged} />
          )}
          {view === "coverage" && (
            <ActionForm
              action="delivery.coverage.confirm"
              title="Confirm actual address coverage"
              fields={[
                {
                  name: "orderId",
                  label: "Order",
                  type: "hidden",
                  value: order.id,
                },
                {
                  name: "reason",
                  label: "Verified address, boundary and operational evidence",
                },
              ]}
              onDone={onChanged}
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
            {tab === "overview" && <OrderOverview order={order} />}
            {tab === "items" && (
              <section>
                <h3>Order items</h3>
                <RecordPages
                  rows={[
                    ...(order.gas_lines ?? []).map((g: any) => ({
                      id: g.id,
                      name: `Gas refill · ${Number(g.grams) / 1000} kg`,
                      detail: `${Number(g.capacity_grams) / 1000} kg cylinder · ${money(g.unit_price_kobo)}/kg · Inspection ${g.inspected_at ? "recorded" : "required before dispatch"}`,
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
              {primary && (
                <button className="button" onClick={() => setView(primary.id)}>
                  {primary.id === "transition" ? labels[next!] : primary.label}
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
}: {
  order: any;
  drivers: any[];
  onDone: () => void;
}) {
  const allowed = (orderTransitions[order.status] ?? []).filter(
    (s) => s !== "delivered",
  );
  const [status, setStatus] = useState(
      allowed.find((s) => s !== "cancelled") ?? "",
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <form
      className="stack"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        const f = new FormData(e.currentTarget);
        try {
          await api("order.transition", {
            id: order.id,
            operationKey: crypto.randomUUID(),
            version: Number(order.tracking_version),
            status,
            note: String(f.get("note")),
            ...(status === "assigned"
              ? { driverId: String(f.get("driverId")) }
              : {}),
            ...(status === "delivery_failed"
              ? { failureReason: String(f.get("failureReason")) }
              : {}),
          });
          onDone();
        } catch (e: any) {
          setError(e.message);
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
          onChange={(e) => setStatus(e.target.value)}
        >
          {allowed.map((s) => (
            <option value={s} key={s}>
              {labels[s] ?? text(s)}
            </option>
          ))}
        </select>
      </label>
      {status === "assigned" && (
        <label>
          <FieldCaption required>Driver</FieldCaption>
          <select name="driverId" required defaultValue="">
            <option value="" disabled>
              Choose a driver
            </option>
            {drivers
              .filter((d) => d.role === "driver" && d.active)
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
          </select>
        </label>
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
      <label>
        <FieldCaption required>Operational note</FieldCaption>
        <FormInput name="note" required minLength={5} maxLength={500} />
      </label>
      {error && <Notice type="error" message={error} />}
      <button className="button" disabled={busy}>
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
            code: d.code,
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
        Ask for the customer's code after handing over every item. Cash
        collection remains unverified until an independent finance officer
        reconciles it.
      </p>
      <Link className="button secondary" href="/admin/deliveries">
        Open dispatch and pickup verification
      </Link>
      <label>
        <FormInput type="checkbox" name="handover" required />
        <FieldCaption required={true}>
          I checked all quantities and cylinder serials and handed over every
          item.
        </FieldCaption>
      </label>
      <label>
        <FieldCaption required={true}>Customer confirmation code</FieldCaption>
        <FormInput
          name="code"
          inputMode="numeric"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          autoComplete="off"
        />
      </label>
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
