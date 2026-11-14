"use client";
import { FieldCaption } from "./field-caption";
import { useState } from "react";
import { hasConfirmedDeliveryCoverage } from "../../../packages/business-rules/src/delivery-coverage";
import { api, Modal, Notice, money } from "./ui";

type DeliveryLocation = {
  id: string;
  name: string;
  branch_id: string;
  coverage: string | null;
};

const coverageHelp =
  "Choose a confirmed area that matches the caller’s address. If the correct area is pending, ask a Business Owner to confirm its boundary in Settings → Delivery Locations.";

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
    [locationId, setLocationId] = useState(""),
    [coverageChanged, setCoverageChanged] = useState(false),
    [quote, setQuote] = useState<any>(null),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [loadingCatalogue, setLoadingCatalogue] = useState(false),
    [key, setKey] = useState("");

  const locations = (
    (catalogue?.gas?.locations ?? []) as DeliveryLocation[]
  ).filter(
    (location) =>
      user.role === "owner" ||
      location.branch_id === (user.branchId ?? user.branch_id),
  );
  const selectedLocation = locations.find(
    (location) => location.id === locationId,
  );
  const locationConfirmed = hasConfirmedDeliveryCoverage(
    selectedLocation?.coverage,
  );
  const hasPendingLocations = locations.some(
    (location) => !hasConfirmedDeliveryCoverage(location.coverage),
  );

  function start() {
    setOpen(true);
    setCustomer(null);
    setMatches([]);
    setCatalogue(null);
    setLocationId("");
    setKey(crypto.randomUUID());
    void loadCatalogue();
  }
  async function loadCatalogue() {
    setError("");
    setQuote(null);
    setLoadingCatalogue(true);
    try {
      setCatalogue(await api("catalogue"));
      setCoverageChanged(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoadingCatalogue(false);
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
    const location = selectedLocation;
    if (!location || !locationConfirmed || coverageChanged) {
      throw new Error(coverageHelp);
    }
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
      if (e.code === "DELIVERY_COVERAGE_PENDING") {
        setCoverageChanged(true);
      } else {
        setError(e.message);
      }
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
            <FieldCaption required={true}>Caller phone or public customer ID</FieldCaption>
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
                <FieldCaption required={true}>Name</FieldCaption>
                <input required name="name" minLength={2} />
              </label>
              <label>
                <FieldCaption required={true}>Branch</FieldCaption>
                <select name="branch">
                  {[
                    ...new Set(locations.map((location) => location.branch_id)),
                  ].map((branch) => (
                    <option key={branch} value={branch}>
                      {branch}
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
                <FieldCaption required={true}>Recipient name</FieldCaption>
                <input required name="name" defaultValue={customer.name} />
              </label>
              <label>
                <FieldCaption required={true}>Recipient phone</FieldCaption>
                <input
                  required
                  name="phone"
                  defaultValue={customer.contact_phone ?? query}
                />
              </label>
              <label>
                <FieldCaption required={true}>Complete house address</FieldCaption>
                <textarea name="street" required minLength={8} />
              </label>
              <label>
                <FieldCaption required={true}>Delivery location</FieldCaption>
                <select
                  name="location"
                  value={selectedLocation?.id ?? ""}
                  disabled={busy || loadingCatalogue}
                  onChange={(event) => {
                    setLocationId(event.target.value);
                    setCoverageChanged(false);
                    setError("");
                  }}
                  aria-describedby={
                    hasPendingLocations || coverageChanged
                      ? "assisted-coverage-help"
                      : undefined
                  }
                  required
                >
                  <option value="">
                    {loadingCatalogue
                      ? "Loading delivery areas…"
                      : "Choose a confirmed delivery area"}
                  </option>
                  {locations.map((location) => {
                    const confirmed = hasConfirmedDeliveryCoverage(
                      location.coverage,
                    );
                    return (
                      <option
                        key={location.id}
                        value={location.id}
                        disabled={!confirmed}
                      >
                        {location.name}
                        {confirmed ? "" : " (coverage pending)"}
                      </option>
                    );
                  })}
                </select>
              </label>
              {(hasPendingLocations || coverageChanged) && (
                <div id="assisted-coverage-help">
                  <Notice
                    type={coverageChanged ? "error" : undefined}
                    message={
                      coverageChanged
                        ? `Coverage for this area has changed. Refresh the delivery areas. ${coverageHelp}`
                        : coverageHelp
                    }
                  />
                </div>
              )}
              {(!catalogue || hasPendingLocations || coverageChanged) && (
                <button
                  type="button"
                  className="button secondary"
                  disabled={busy || loadingCatalogue}
                  onClick={loadCatalogue}
                >
                  Refresh delivery areas
                </button>
              )}
              <label>
                <FieldCaption required={false}>Cylinder capacity (kg)</FieldCaption>
                <input
                  name="capacity"
                  type="number"
                  min="0.5"
                  step="0.5"
                  defaultValue="12.5"
                />
              </label>
              <label>
                <FieldCaption required={false}>Gas quantity (kg; 0 for products only)</FieldCaption>
                <input
                  name="kg"
                  type="number"
                  min="0"
                  step="0.5"
                  defaultValue="0"
                />
              </label>
              <label>
                <FieldCaption required={false}>Additional product</FieldCaption>
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
                <FieldCaption required={false}>Product quantity</FieldCaption>
                <input
                  name="quantity"
                  type="number"
                  min="1"
                  max="20"
                  defaultValue="1"
                />
              </label>
              <label>
                <FieldCaption required={true}>Date</FieldCaption>
                <input name="date" type="date" required />
              </label>
              <label>
                <FieldCaption required={true}>Delivery window</FieldCaption>
                <select name="window">
                  {String(catalogue?.windows ?? "")
                    .split(",")
                    .map((w) => (
                      <option key={w}>{w.trim()}</option>
                    ))}
                </select>
              </label>
              <label>
                <FieldCaption required={true}>Staff reason / caller request</FieldCaption>
                <textarea required name="reason" minLength={10} />
              </label>
              <label>
                <FieldCaption required={false}>Delivery instructions</FieldCaption>
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
              <button
                className="button"
                disabled={
                  busy ||
                  loadingCatalogue ||
                  !locationConfirmed ||
                  coverageChanged
                }
              >
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
