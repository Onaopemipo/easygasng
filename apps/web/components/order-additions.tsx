"use client";
import { EasyGasLoader } from "./easygas-loader";
import { useEffect, useState } from "react";
import { api, Notice } from "./ui";
import { paymentMoney as money } from "./hosted-payment";
export default function OrderAdditions({
  order,
  user,
  onChanged,
}: {
  order: any;
  user: any;
  onChanged: () => void;
}) {
  const [data, setData] = useState<any>(null),
    [catalogue, setCatalogue] = useState<any>(null),
    [open, setOpen] = useState(false),
    [items, setItems] = useState([{ productId: "", quantity: 1 }]),
    [kg, setKg] = useState(""),
    [capacity, setCapacity] = useState("12.5"),
    [reason, setReason] = useState(""),
    [quote, setQuote] = useState<any>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [requestKey] = useState(() => crypto.randomUUID());
  const allowed = ["owner", "manager"].includes(user.role);
  async function load() {
    try {
      setData(await api("order.additions", { orderId: order.id }));
    } catch (e: any) {
      setError(e.message);
    }
  }
  useEffect(() => {
    if (allowed) void load();
  }, [order.id, allowed]);
  if (!allowed) return null;
  const payload = {
    orderId: order.id,
    items: items.filter((i) => i.productId),
    gasLines: kg ? [{ capacityKg: Number(capacity), kg: Number(kg) }] : [],
  };
  async function start() {
    setError("");
    try {
      setCatalogue({ products: data.products });
      setOpen(true);
    } catch (e: any) {
      setError(e.message);
    }
  }
  async function run(confirm: boolean) {
    setBusy(true);
    setError("");
    try {
      if (confirm) {
        await api("order.addition.create", {
          ...payload,
          reason,
          requestKey,
          quoteHash: quote.quoteHash,
        });
        setOpen(false);
        setQuote(null);
        await load();
        onChanged();
      } else setQuote(await api("order.addition.quote", payload));
    } catch (e: any) {
      setError(e.message);
      setQuote(null);
      await load();
    } finally {
      setBusy(false);
    }
  }
  function edit() {
    setQuote(null);
    setError("");
  }
  return (
    <section className="surface workflow-form order-additions">
      <h3>Add to this delivery</h3>
      <p>
        One staff-only supplementary request, before rider assignment or
        loading. Same customer, address and delivery window; no extra delivery
        fee. Paid or invoiced orders require the existing correction process.
      </p>
      {error && <Notice type="error" message={error} />}
      {!data && !error && <EasyGasLoader size="sm" variant="section" label="Checking whether additions are available" />}
      {data?.blockedReason && <p>{data.blockedReason}</p>}
      {data?.history?.map((a: any) => (
        <div className="order-addition-history" key={a.id}>
          <strong>
            Supplementary request EA-{a.id.slice(0, 8).toUpperCase()}
          </strong>
          <p>
            {money(a.amount_kobo)} added · Extra delivery {money(0)}
          </p>
          <p>{a.reason}</p>
        </div>
      ))}
      {data?.eligible && !open && (
        <button className="button secondary" type="button" onClick={start}>
          Add products or gas
        </button>
      )}
      {open && (
        <form
          className="workflow-form"
          onSubmit={(e) => {
            e.preventDefault();
            void run(false);
          }}
          onChange={edit}
        >
          {items.map((line, i) => (
            <div key={i} className="service-actions">
              <label>
                Product {i + 1}
                <select
                  value={line.productId}
                  onChange={(e) =>
                    setItems(
                      items.map((v, j) =>
                        j === i ? { ...v, productId: e.target.value } : v,
                      ),
                    )
                  }
                >
                  <option value="">No physical product</option>
                  {catalogue?.products
                    ?.filter((p: any) => p.category !== "Gas refills")
                    .map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Quantity {i + 1}
                <input
                  type="number"
                  min="1"
                  max="20"
                  required
                  value={line.quantity}
                  onChange={(e) =>
                    setItems(
                      items.map((v, j) =>
                        j === i
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
                  onClick={() => {
                    edit();
                    setItems(items.filter((_, j) => j !== i));
                  }}
                >
                  Remove product {i + 1}
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            disabled={items.length >= 30 || busy}
            onClick={() => {
              edit();
              setItems([...items, { productId: "", quantity: 1 }]);
            }}
          >
            Add another product
          </button>
          <label>
            Additional gas (kg, optional)
            <input
              type="number"
              min="0.001"
              step="0.001"
              value={kg}
              onChange={(e) => setKg(e.target.value)}
            />
          </label>
          <label>
            Cylinder capacity (kg)
            <input
              type="number"
              min="0.001"
              step="0.001"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
            />
          </label>
          <label>
            Customer request and reason
            <input
              required
              minLength={10}
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <button className="button secondary" disabled={busy}>
            Review supplementary request
          </button>
          {quote && (
            <div>
              <p>
                Additional items: {money(quote.amountKobo)} · Additional
                delivery: {money(0)}
              </p>
              <p>
                Updated order total:{" "}
                <strong>{money(quote.newTotalKobo)}</strong>.{" "}
                {quote.paymentMethod === "card"
                  ? "The customer must complete verified card payment before dispatch."
                  : "Payment remains due on delivery."}
              </p>
              <button
                className="button"
                type="button"
                disabled={busy || reason.trim().length < 10}
                onClick={() => void run(true)}
              >
                {busy
                  ? "Saving…"
                  : "Confirm addition with no extra delivery fee"}
              </button>
            </div>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setOpen(false);
              setQuote(null);
            }}
          >
            Cancel
          </button>
        </form>
      )}
    </section>
  );
}
