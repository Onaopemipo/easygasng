"use client";
import PhoneOrderPaymentActions from "./phone-order-payment-actions";
import { useEffect, useState } from "react";
import { api, Notice, money } from "./ui";
import { FieldCaption } from "./field-caption";
export default function SameVisitOrder({
  order,
  onCreated,
}: {
  order: any;
  onCreated: (id: string) => Promise<void>;
}) {
  const [context, setContext] = useState<any>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [items, setItems] = useState([{ productId: "", quantity: 1 }]),
    [gas, setGas] = useState(""),
    [capacity, setCapacity] = useState(""),
    [reason, setReason] = useState("");
  const [quote, setQuote] = useState<any>(null),
    [requestKey] = useState(() => crypto.randomUUID()),
    [result, setResult] = useState<any>(null);
  const target = {
    parentOrderId: order.id,
    version: Number(order.tracking_version),
  };
  async function load() {
    setError("");
    setContext(null);
    setQuote(null);
    try {
      setContext(await api("order.visit.context", target));
    } catch (e: any) {
      setError(e.message);
    }
  }
  useEffect(() => {
    void load();
  }, [order.id, order.tracking_version]);
  async function submit(confirm: boolean) {
    setError("");
    setBusy(true);
    try {
      const cart = {
        ...target,
        items: items.filter((i) => i.productId),
        gasLines: gas
          ? [{ capacityKg: Number(capacity), kg: Number(gas) }]
          : [],
      };
      if (!confirm) setQuote(await api("order.visit.quote", cart));
      else
        setResult(
          await api("order.visit.create", {
            ...cart,
            quoteHash: quote.quoteHash,
            reason,
            requestKey,
          }),
        );
    } catch (e: any) {
      setError(e.message);
      if (e.code === "PRICE_CHANGED") setQuote(null);
    } finally {
      setBusy(false);
    }
  }
  if (result)
    return (
      <section className="stack">
        <Notice
          message={`${result.reference} created with no additional delivery fee. ${result.status === "assigned" ? "Assigned to the original driver." : "Awaiting verified customer payment before assignment."}`}
        />
        {result.paymentLink && (
          <PhoneOrderPaymentActions
            orderId={result.orderId}
            initialLink={result.paymentLink}
          />
        )}
        {result.assignmentBlock && (
          <Notice type="error" message={result.assignmentBlock} />
        )}
        <p>
          The original order and its payment are unchanged. Each order has its
          own acknowledgement, stock, payment and delivery confirmation.
        </p>
        <button
          className="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onCreated(result.orderId);
            } catch (e: any) {
              setError(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          Open extra order
          {result.status !== "assigned" ? " and finish preparation" : ""}
        </button>
        {error && <Notice type="error" message={error} />}
      </section>
    );
  return (
    <section className="stack same-visit-order">
      <p>
        Create a separate order for the same customer while their driver is on
        the way or still fulfilling the original visit.
      </p>
      {error && <Notice type="error" message={error} />}
      {!context ? (
        <button
          type="button"
          className="button secondary"
          onClick={() => void load()}
        >
          Reload visit details
        </button>
      ) : (
        <>
          <div className="assignment-preparation">
            <strong>
              {context.customerName} · {context.parentReference}
            </strong>
            <p>
              {context.address.street} · {context.address.zone}
            </p>
            <p>Driver: {context.driver.name} · existing vehicle trip</p>
            <strong>Additional delivery: {money(0)}</strong>
            <p>
              Same customer, address and visit. Extra goods are payable
              separately on delivery; customer credit is never spent by staff.
            </p>
          </div>
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              void submit(Boolean(quote));
            }}
            onChange={() => setQuote(null)}
          >
            <fieldset className="stack" disabled={busy}>
              {items.map((line, index) => (
                <div className="service-actions" key={index}>
                  <label>
                    <FieldCaption required={false}>
                      Extra product {index + 1}
                    </FieldCaption>
                    <select
                      value={line.productId}
                      onChange={(e) =>
                        setItems(
                          items.map((v, i) =>
                            i === index
                              ? { ...v, productId: e.target.value }
                              : v,
                          ),
                        )
                      }
                    >
                      <option value="">Choose product (optional)</option>
                      {context.products.map((p: any) => (
                        <option value={p.id} key={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <FieldCaption required>Quantity</FieldCaption>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      required
                      value={line.quantity}
                      onChange={(e) =>
                        setItems(
                          items.map((v, i) =>
                            i === index
                              ? { ...v, quantity: Number(e.target.value) }
                              : v,
                          ),
                        )
                      }
                    />
                  </label>
                  {items.length > 1 && (
                    <button
                      type="button"
                      className="text-link"
                      onClick={() => {
                        setItems(items.filter((_, i) => i !== index));
                        setQuote(null);
                      }}
                    >
                      Remove product {index + 1}
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                className="button secondary"
                disabled={items.length >= 30}
                onClick={() => {
                  setItems([...items, { productId: "", quantity: 1 }]);
                  setQuote(null);
                }}
              >
                Add another product
              </button>
              <div className="service-actions">
                <label>
                  <FieldCaption required={false}>Extra gas (kg)</FieldCaption>
                  <input
                    type="number"
                    min="0.001"
                    step="0.001"
                    value={gas}
                    onChange={(e) => setGas(e.target.value)}
                  />
                </label>
                <label>
                  <FieldCaption required={Boolean(gas)}>
                    Cylinder capacity (kg)
                  </FieldCaption>
                  <select
                    required={Boolean(gas)}
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                  >
                    <option value="">Choose capacity</option>
                    {context.capacitiesKg?.map((kg: number) => (
                      <option key={kg} value={kg}>
                        {kg} kg
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p>
                Extra gas is filled at the customer’s address from the vehicle
                tank. Extra goods must be physically available with acknowledged
                vehicle custody; creating an order does not load them onto the
                vehicle.
              </p>
              <label>
                <FieldCaption required>Customer request / reason</FieldCaption>
                <textarea
                  required
                  minLength={10}
                  maxLength={500}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>
              {quote && (
                <div className="assignment-preparation">
                  <p>Extra goods: {money(quote.totalKobo)}</p>
                  <p>Additional delivery: {money(0)}</p>
                  <strong>
                    Total for this new order: {money(quote.totalKobo)}
                  </strong>
                  <p>
                    The customer pays this extra phone order first. The same
                    driver is selected after verified payment and current
                    preparation checks.
                  </p>
                </div>
              )}
              <button type="submit" className="button">
                {busy
                  ? "Saving…"
                  : quote
                    ? "Create extra order · no delivery fee"
                    : "Review extra order"}
              </button>
              {quote && (
                <button
                  type="button"
                  className="text-link"
                  onClick={() => setQuote(null)}
                >
                  Edit extra items
                </button>
              )}
            </fieldset>
          </form>
        </>
      )}
    </section>
  );
}
