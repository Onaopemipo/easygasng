"use client";
import { FieldCaption } from "./field-caption";
import { DoorstepCylinderForm } from "./doorstep-cylinder-form";
import { useState, type FormEvent } from "react";
import { api, Loading, Notice, money } from "./ui";
import { OperationForm } from "./operations-completion";
import { DoorstepActions } from "./doorstep-actions";
export function InvoiceCorrections({
  orderId,
  bookingId,
  staff = false,
  onChanged,
}: {
  orderId?: string;
  bookingId?: string;
  staff?: boolean;
  onChanged?: () => void;
}) {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [url, setUrl] = useState("");
  async function load() {
    try {
      setData(
        await api("invoice.corrections", {
          [bookingId ? "bookingId" : "orderId"]: bookingId ?? orderId,
        }),
      );
      setError("");
    } catch (e: any) {
      setError(e.message);
    }
  }
  return (
    <details
      className="panel"
      onToggle={(e) => {
        if (e.currentTarget.open) load();
      }}
    >
      <summary>Invoice notes and payment requests</summary>
      {error && <Notice type="error" message={error} />}{" "}
      {data && (
        <>
          <p>
            Effective total: {money(data.totalKobo)} · Verified paid:{" "}
            {money(data.paidKobo)} · Due: {money(data.amountDueKobo)} · Version{" "}
            {data.version}
          </p>
          {data.voided && <Notice message="This invoice has been voided." />}
          {data.notes.map((n: any) => (
            <article className="panel" key={n.id}>
              <h3>
                {n.kind} note {n.sequence}
              </h3>
              <p>
                {money(n.amount_kobo)} · {n.state} · {n.reason}
              </p>
              {staff && n.state === "pending" && (
                <OperationForm
                  title="Decide correction"
                  action="invoice.correction.decide"
                  onDone={() => {
                    load();
                    onChanged?.();
                  }}
                  fields={[
                    {
                      name: bookingId ? "bookingId" : "orderId",
                      label: bookingId ? "Booking ID" : "Order ID",
                      value: (bookingId ?? orderId)!,
                    },
                    { name: "noteId", label: "Note ID", value: n.id },
                    {
                      name: "approve",
                      label: "Approve (uncheck to reject)",
                      type: "checkbox",
                    },
                  ]}
                />
              )}
            </article>
          ))}
        </>
      )}
      {!staff && orderId && Number(data?.overpaidKobo) > 0 && (
        <OperationForm
          title="Request excess collection as purchase credit"
          action="invoice.excess.request"
          onDone={load}
          fields={[
            { name: "orderId", label: "Order ID", value: orderId },
            {
              name: "acceptWalletCredit",
              label:
                "I accept purchase wallet credit rather than a cash refund",
              type: "checkbox",
            },
            { name: "reason", label: "Reason for excess-collection review" },
          ]}
        />
      )}
      {staff && (
        <>
          <OperationForm
            title="Propose invoice correction"
            action="invoice.correction.propose"
            onDone={() => {
              load();
              onChanged?.();
            }}
            fields={[
              {
                name: bookingId ? "bookingId" : "orderId",
                label: bookingId ? "Booking ID" : "Order ID",
                value: (bookingId ?? orderId)!,
              },
              {
                name: "kind",
                label: "Note type",
                options: [
                  { value: "credit", label: "Credit note" },
                  { value: "debit", label: "Debit note" },
                  { value: "void", label: "Void unpaid invoice" },
                ],
              },
              { name: "amountKobo", label: "Amount (kobo)", type: "number" },
              { name: "reason", label: "Correction reason" },
            ]}
          />
          <p>
            A different finance or owner account must approve. Issued amounts
            are never overwritten.
          </p>
          <OperationForm
            title="Create secure payment request"
            action="invoice.request.create"
            onDone={(r) => setUrl(r.url)}
            fields={[
              {
                name: bookingId ? "bookingId" : "orderId",
                label: bookingId ? "Booking ID" : "Order ID",
                value: (bookingId ?? orderId)!,
              },
              {
                name: "channel",
                label: "Delivery channel (purpose consent required)",
                optional: true,
                options: [
                  {
                    value: "",
                    label: "Create a link for review without sending",
                  },
                  { value: "sms", label: "Send by SMS" },
                  { value: "whatsapp", label: "Send by WhatsApp" },
                ],
              },
            ]}
          />
          {url && (
            <p>
              <a href={url}>Open secure request</a> · Sign-in required. Online
              payments remain disabled.
            </p>
          )}
          <OperationForm
            title="Revoke payment requests"
            action="invoice.request.revoke"
            fields={[
              {
                name: bookingId ? "bookingId" : "orderId",
                label: bookingId ? "Booking ID" : "Order ID",
                value: (bookingId ?? orderId)!,
              },
            ]}
          />
        </>
      )}
    </details>
  );
}
export function OrderOperations({
  order,
  user,
  customer = false,
}: {
  order: any;
  user?: any;
  customer?: boolean;
}) {
  const [photos, setPhotos] = useState<any[] | null>(null),
    [amendments, setAmendments] = useState<any[]>([]),
    [doorstepReady, setDoorstepReady] = useState(false),
    [error, setError] = useState("");
  async function load() {
    try {
      const a = await api("doorstep.list", { orderId: order.id });
      setAmendments(a.amendments);
      setDoorstepReady(a.commitEnabled === true);
      if (
        customer ||
        ["owner", "manager", "driver"].includes(user?.role)
      ) {
        const p = await api("delivery.photos?orderId=" + order.id);
        setPhotos(p.photos);
      } else setPhotos([]);
      setError("");
    } catch (e: any) {
      setError(e.message);
    }
  }
  async function photo(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    f.set("orderId", order.id);
    try {
      const r = await fetch("/api/media", { method: "POST", body: f }),
        v = await r.json();
      if (!r.ok) throw new Error(v.error);
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  }
  return (
    <details
      className="panel"
      onToggle={(e) => {
        if (e.currentTarget.open) load();
      }}
    >
      <summary>Visit changes and photo history</summary>
      {error && <Notice type="error" message={error} />}{" "}
      {!photos && !error && <Loading label="Loading visit and photo history" />}
      {photos?.length === 0 && <p>No eligible photos for this order.</p>}
      <div className="product-grid">
        {photos?.map((p) => (
          <figure key={p.id}>
            <img
              src={"/api/media/" + p.id}
              alt={p.alt}
              loading="lazy"
              style={{ maxWidth: 240 }}
            />
            <figcaption>
              {new Date(p.created_at).toLocaleString()} · retained until{" "}
              {new Date(p.retain_until).toLocaleDateString()}
            </figcaption>
          </figure>
        ))}
      </div>
      {user?.role === "driver" && order.status === "out_for_delivery" && (
        <>
          <form className="panel stack" onSubmit={photo}>
            <h3>Add proof photo</h3>
            <label>
              <FieldCaption required={true}>Photo</FieldCaption>
              <input
                type="file"
                name="image"
                accept="image/jpeg,image/png,image/webp"
                required
              />
            </label>
            <label>
              <FieldCaption required={true}>Description</FieldCaption>
              <input name="alt" minLength={3} maxLength={250} required />
            </label>
            <label>
              <input type="checkbox" name="photoConsent" required /> <FieldCaption required={true}>Customer
              consented to this evidence photo.</FieldCaption>
            </label>
            <button className="button">Upload evidence</button>
          </form>
          <OperationForm
            title="Propose physical products from this vehicle"
            action="doorstep.products.propose"
            fields={[
              { name: "productId", label: "Catalogue product ID" },
              { name: "quantity", label: "Units requested", type: "number" },
            ]}
            mapRequest={(d) => ({
              orderId: order.id,
              version: Number(order.tracking_version),
              items: [{ productId: d.productId, quantity: d.quantity }],
            })}
            onDone={load}
          />
          <DoorstepCylinderForm
            orderId={order.id}
            version={Number(order.tracking_version)}
            onDone={load}
          />
        </>
      )}
      {amendments.map((m) => (
        <article key={m.id} className="panel">
          <p>
            {m.state} · Proposed {new Date(m.created_at).toLocaleString()}
          </p>
          <p>
            Added gas subtotal: {money(m.price_snapshot.quote.subtotalKobo)} ·
            Added product subtotal:{" "}
            {money(m.price_snapshot.quote.physicalSubtotalKobo)} · Additional
            delivery fee: {money(m.price_snapshot.additionalDeliveryKobo)}
          </p>
          <p>
            {m.proposal.lines
              ?.map((l: any) => `${l.kg} kg into a ${l.capacityKg} kg cylinder`)
              .join("; ")}
          </p>
          <ul>
            {m.price_snapshot.quote.physicalLines?.map((p: any) => (
              <li key={p.productId}>
                {p.name} × {p.quantity} · {money(p.unitPriceKobo)} per unit
              </li>
            ))}
          </ul>
          <p>
            {m.execution
              ? `Execution: ${m.execution.state}. Invoice debit: ${m.execution.note_state}.`
              : "Proposal only. Inspection, vehicle buffer, invoice approval and verified collection are required before fulfilment."}
          </p>
          {doorstepReady && !customer && (
            <DoorstepActions
              Form={OperationForm}
              orderId={order.id}
              amendment={m}
              user={user}
              onDone={load}
            />
          )}
          {customer && m.state === "proposed" && (
            <OperationForm
              title="Record amendment decision"
              action="doorstep.consent"
              onDone={load}
              fields={[
                { name: "orderId", label: "Order ID", value: order.id },
                { name: "amendmentId", label: "Amendment ID", value: m.id },
                {
                  name: "consent",
                  label:
                    "I consent to the proposed extra items and price (uncheck to reject)",
                  type: "checkbox",
                },
              ]}
            />
          )}
        </article>
      ))}
      {user?.role === "driver" && order.status === "assigned" && (
        <OperationForm
          title="Respond to assignment"
          action="dispatch.respond"
          fields={[
            { name: "orderId", label: "Order ID", value: order.id },
            {
              name: "version",
              label: "Current order version",
              type: "number",
              value: order.tracking_version,
            },
            {
              name: "decision",
              label: "Decision",
              options: [
                { value: "acknowledged", label: "Acknowledge" },
                {
                  value: "rejected",
                  label: "Reject and request dispatcher review",
                },
              ],
            },
            { name: "reason", label: "Reason" },
          ]}
        />
      )}{" "}
      {["owner", "manager"].includes(user?.role) && (
        <>
          <OperationForm
            title="Record requested phone messaging consent"
            action="channels.consent"
            fields={[
              {
                name: "customerId",
                label: "Provisional customer ID",
                value: order.customer_id,
              },
              {
                name: "channel",
                label: "Channel",
                options: [
                  { value: "sms", label: "SMS" },
                  { value: "whatsapp", label: "WhatsApp" },
                ],
              },
              {
                name: "purpose",
                label: "Purpose",
                options: [
                  {
                    value: "transactional",
                    label: "Order completion invitation",
                  },
                  { value: "otp", label: "Phone verification codes" },
                ],
              },
              {
                name: "enabled",
                label: "Customer explicitly requested this channel and purpose",
                type: "checkbox",
              },
              {
                name: "evidence",
                label: "Consent evidence / request reference",
              },
            ]}
          />
          <OperationForm
            title="Send secure completion invitation"
            action="phone.invite"
            fields={[
              { name: "orderId", label: "Order ID", value: order.id },
              {
                name: "channel",
                label: "Channel",
                options: [
                  { value: "sms", label: "SMS" },
                  { value: "whatsapp", label: "WhatsApp" },
                ],
              },
            ]}
          />
        </>
      )}
    </details>
  );
}
