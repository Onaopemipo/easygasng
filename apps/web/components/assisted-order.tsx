"use client";
import { useState } from "react";
import { api, Modal, Notice, money } from "./ui";
export default function AssistedOrder({
  user,
  onCreated,
}: {
  user: any;
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false),
    [query, setQuery] = useState(""),
    [matches, setMatches] = useState<any[]>([]),
    [customer, setCustomer] = useState<any>(null),
    [catalogue, setCatalogue] = useState<any>(null),
    [quote, setQuote] = useState<any>(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [key, setKey] = useState("");
  async function start() {
    setOpen(true);
    setError("");
    setCustomer(null);
    setMatches([]);
    setQuote(null);
    setKey(crypto.randomUUID());
    try {
      setCatalogue(await api("catalogue"));
    } catch (e: any) {
      setError(e.message);
    }
  }
  async function lookup() {
    setBusy(true);
    setError("");
    try {
      const r = await api("customers.lookup", { query });
      setMatches(r.customers);
      setCustomer(null);
      setQuote(null);
      if (r.duplicate)
        setMessage(
          "Multiple records match. Confirm the public customer ID; records have not been merged.",
        );
      else
        setMessage(
          r.customers.length
            ? "Select the caller’s record."
            : "No matching record. Create a provisional customer below.",
        );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function provision(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const f = new FormData(e.currentTarget);
      const c = await api("customers.provisional", {
        name: f.get("name"),
        phone: query,
        branchId: f.get("branch"),
      });
      setCustomer(c);
      setMatches([c]);
      setMessage(
        "Provisional record created. Phone ownership and account activation are not verified.",
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  function checkoutData(form: HTMLFormElement) {
    const f = new FormData(form);
    const location = catalogue?.gas?.locations?.find(
      (l: any) => l.id === f.get("location"),
    );
    if (!location) throw new Error("Choose an active delivery location.");
    const kg = Number(f.get("kg"));
    const product = String(f.get("product") || "");
    return {
      branchId: location.branch_id,
      reason: String(f.get("reason")),
      checkout: {
        items: product
          ? [{ productId: product, quantity: Number(f.get("quantity")) }]
          : [],
        gasLines: kg > 0 ? [{ capacityKg: Number(f.get("capacity")), kg }] : [],
        address: {
          name: String(f.get("name")),
          phone: String(f.get("phone")),
          street: String(f.get("street")),
          zone: location.name,
          locationId: location.id,
        },
        date: String(f.get("date")),
        window: String(f.get("window")),
        paymentMethod: "cash_on_delivery",
        instructions: String(f.get("instructions")),
        idempotencyKey: key,
      },
    };
  }
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const d = checkoutData(e.currentTarget);
      if (!quote) {
        const q = await api("order.assisted.quote", d.checkout);
        setQuote(q);
        setMessage("Review the server quote, then confirm the caller’s order.");
        return;
      }
      const q = quote;
      const r = await api("order.assisted.create", {
        customerId: customer.id,
        reason: d.reason,
        checkout: {
          ...d.checkout,
          ...(q
            ? {
                pricing: {
                  priceVersion: q.priceVersion,
                  feeVersion: q.feeVersion,
                  policyVersion: q.policyVersion,
                  totalKobo:
                    q.subtotalKobo + q.physicalSubtotalKobo + q.deliveryKobo,
                },
              }
            : {}),
        },
      });
      setMessage(
        "Order " +
          r.reference +
          " created for " +
          customer.public_customer_id +
          ". Payment remains due under the approved policy.",
      );
      setOpen(false);
      onCreated();
    } catch (e: any) {
      setError(e.message);
      setQuote(null);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {message && <Notice message={message} />}
      <button className="button" onClick={start}>
        Create phone-assisted order
      </button>
      {open && (
        <Modal
          title="Phone-assisted home delivery"
          onClose={() => setOpen(false)}
        >
          {error && <Notice type="error" message={error} />}
          <p>
            Staff attribution is recorded. This does not sign in as the customer
            or verify phone ownership. Online payments are unconnected.
          </p>
          <label>
            Caller phone or public customer ID
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setCustomer(null);
                setMatches([]);
                setQuote(null);
              }}
            />
          </label>
          <button className="button secondary" disabled={busy} onClick={lookup}>
            Find customer
          </button>
          {matches.map((c) => (
            <button
              className="button secondary"
              key={c.id}
              onClick={() => {
                setCustomer(c);
                setQuote(null);
              }}
            >
              {c.name} · {c.public_customer_id}
            </button>
          ))}
          {!customer && (
            <form onSubmit={provision}>
              <h3>New caller</h3>
              <label>
                Name
                <input required name="name" minLength={2} />
              </label>
              <label>
                Branch
                <select name="branch">
                  {(catalogue?.gas?.locations ?? [])
                    .filter(
                      (l: any) =>
                        user.role === "owner" ||
                        l.branch_id === (user.branchId ?? user.branch_id),
                    )
                    .filter(
                      (l: any, i: number, a: any[]) =>
                        a.findIndex((x) => x.branch_id === l.branch_id) === i,
                    )
                    .map((l: any) => (
                      <option key={l.branch_id} value={l.branch_id}>
                        {l.branch_id}
                      </option>
                    ))}
                </select>
              </label>
              <button className="button secondary" disabled={busy}>
                Create provisional customer
              </button>
            </form>
          )}
          {customer && (
            <form onSubmit={submit} onChange={() => setQuote(null)}>
              <h3>
                {customer.name} · {customer.public_customer_id}
              </h3>
              <label>
                Recipient name
                <input required name="name" defaultValue={customer.name} />
              </label>
              <label>
                Recipient phone
                <input
                  required
                  name="phone"
                  defaultValue={customer.contact_phone ?? query}
                />
              </label>
              <label>
                Complete house address
                <textarea name="street" required minLength={8} />
              </label>
              <label>
                Delivery location
                <select name="location" required>
                  {(catalogue?.gas?.locations ?? [])
                    .filter(
                      (l: any) =>
                        user.role === "owner" ||
                        l.branch_id === (user.branchId ?? user.branch_id),
                    )
                    .map((l: any) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Cylinder capacity (kg)
                <input
                  name="capacity"
                  type="number"
                  min="0.5"
                  step="0.5"
                  defaultValue="12.5"
                />
              </label>
              <label>
                Gas quantity (kg; 0 for products only)
                <input
                  name="kg"
                  type="number"
                  min="0"
                  step="0.5"
                  defaultValue="0"
                />
              </label>
              <label>
                Additional product
                <select name="product">
                  <option value="">None</option>
                  {(catalogue?.products ?? [])
                    .filter(
                      (p: any) => p.published && p.category !== "Gas refills",
                    )
                    .map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.name} · {money(p.price_kobo)}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Product quantity
                <input
                  name="quantity"
                  type="number"
                  min="1"
                  max="20"
                  defaultValue="1"
                />
              </label>
              <label>
                Date
                <input name="date" type="date" required />
              </label>
              <label>
                Delivery window
                <select name="window">
                  {String(catalogue?.windows ?? "")
                    .split(",")
                    .map((w) => (
                      <option key={w}>{w.trim()}</option>
                    ))}
                </select>
              </label>
              <label>
                Staff reason / caller request
                <textarea required name="reason" minLength={10} />
              </label>
              <label>
                Delivery instructions
                <textarea name="instructions" />
              </label>
              {quote && (
                <p>
                  Gas {money(quote.subtotalKobo)} + products{" "}
                  {money(quote.physicalSubtotalKobo)} + one delivery fee{" "}
                  {money(quote.deliveryKobo)} ={" "}
                  {money(
                    quote.subtotalKobo +
                      quote.physicalSubtotalKobo +
                      quote.deliveryKobo,
                  )}
                </p>
              )}
              <button className="button" disabled={busy}>
                {busy
                  ? "Checking…"
                  : quote
                    ? "Confirm quoted order"
                    : "Review and create order"}
              </button>
            </form>
          )}
        </Modal>
      )}
    </>
  );
}
