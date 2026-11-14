"use client";
import { FieldCaption } from "./field-caption";
import { bookingPhone, bookingPhoneMessage } from "../../../packages/business-rules/src/booking-contact";
import { useCardCheckout, OrderCardPayment } from "./hosted-payment";
import { RewardCheckoutField } from "./easyrewards";
import { useEffect, useState, type FormEvent } from "react";
import Link from "./workspace-link";
import { CheckoutDeliveryFields, readCheckoutDelivery } from "./checkout-delivery-fields";
import { api, money, Notice, Loading } from "./ui";
export default function CombinedCheckout({
  user,
  cart,
  catalogue,
  clearCart,
}: {
  user: any;
  cart: any[];
  catalogue: any;
  clearCart: () => void;
}) {
  const [appointments, setAppointments] = useState<any[] | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [result, setResult] = useState<any>(null),
    [key] = useState(() => crypto.randomUUID());
  const cardEnabled = useCardCheckout(user?.id);
  const storage = "easygas.serviceDrafts." + user?.id;
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(storage) ?? "[]");
      setAppointments(Array.isArray(saved) ? saved.slice(0, 5) : []);
    } catch {
      setAppointments([]);
    }
  }, [storage]);
  if (!user)
    return (
      <Link className="button" href="/login?returnTo=%2Fcombined-checkout">
        Sign in to continue
      </Link>
    );
  if (!appointments) return <Loading page />;
  if (result)
    return (
      <section className="surface">
        <h1>Your linked request is recorded</h1>
        <p>{result.reference}</p>
        <OrderCardPayment order={result.order} />
        <p>
          Product delivery and service appointments keep separate completion and
          payment records. A booking request is not a verified payment or safety
          clearance.
        </p>
        <div className="service-actions">
          <Link className="button" href="/orders">
            Product orders
          </Link>
          <Link className="button secondary" href="/bookings">
            Service appointments
          </Link>
        </div>
      </section>
    );
  const productTotal = cart.reduce(
    (n, i) =>
      n +
      Number(
        catalogue.products.find((p: any) => p.id === i.productId)?.price_kobo ??
          0,
      ) *
        i.quantity,
    0,
  );
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const values = Object.fromEntries(new FormData(e.currentTarget));
    try {
      const validatedAppointments = appointments!.map((a, i) => {
        const phone = bookingPhone(String(a.request?.address?.phone ?? ""));
        if (!phone) throw new Error(`${a.name || `Appointment ${i + 1}`}: ${bookingPhoneMessage}`);
        return { ...a.request, address: { ...a.request.address, phone } };
      });
      const payload = {
        idempotencyKey: key,
        ...(appointments![0]?.bundleId
          ? {
              bundleId: appointments![0].bundleId,
              bundleVersion: appointments![0].bundleVersion,
              bundleTotalKobo: appointments![0].bundleTotalKobo,
            }
          : {}),
        appointments: validatedAppointments,
        ...(cart.length
          ? {
              products: {
                items: cart,
                address: readCheckoutDelivery(values),
                date: values.date,
                window: values.window,
                ...(values.rewardOfferId
                  ? { rewardOfferId: String(values.rewardOfferId) }
                  : {}),
                ...(values.rewardPoints
                  ? { rewardPoints: Number(values.rewardPoints) }
                  : {}),
                paymentMethod: values.paymentMethod,
                idempotencyKey: key,
              },
            }
          : {}),
      };
      const pendingKey = "easygas.mixedPending." + user.id;
      const fingerprint = JSON.stringify({
        ...payload,
        idempotencyKey: undefined,
        products: payload.products
          ? { ...payload.products, idempotencyKey: undefined }
          : undefined,
      });
      const pending = JSON.parse(sessionStorage.getItem(pendingKey) ?? "null");
      const operationKey =
        pending?.fingerprint === fingerprint ? pending.key : key;
      payload.idempotencyKey = operationKey;
      if (payload.products) payload.products.idempotencyKey = operationKey;
      sessionStorage.setItem(
        pendingKey,
        JSON.stringify({ key: operationKey, fingerprint }),
      );
      const r = await api("checkout.mixed", payload);
      sessionStorage.removeItem(pendingKey);
      sessionStorage.removeItem(storage);
      clearCart();
      setResult(r);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <div className="page-heading">
        <span className="eyebrow">ONE REQUEST, CLEAR FULFILMENT</span>
        <h1>Products & appointments</h1>
        <Link className="button secondary" href="/gas-order">
          Add cooking gas to this linked request
        </Link>
        <p>
          Each appointment is checked again before any part of this request is
          confirmed.
        </p>
      </div>
      {error && <Notice type="error" message={error} />}
      <div className="service-grid">
        <div>
          {cart.map((i) => {
            const p = catalogue.products.find((p: any) => p.id === i.productId);
            return (
              <div className="surface" key={i.productId}>
                <h3>{p?.name ?? "Unavailable product"}</h3>
                <p>
                  {i.quantity} × {money(p?.price_kobo ?? null)}
                </p>
              </div>
            );
          })}
          {appointments.map((a, i) => (
            <div className="surface" key={a.request.idempotencyKey}>
              <h2>{a.name}</h2>
              <p>{a.label}</p>
              <label>
                <FieldCaption required={true}>Contact mobile number for {a.name}</FieldCaption>
                <input type="tel" autoComplete="tel" value={a.request?.address?.phone ?? ""}
                  aria-describedby={`appointment-phone-help-${i}`}
                  onChange={(e) => {
                    const next = appointments.map((item, j) => j === i ? {
                      ...item, request: { ...item.request, address: { ...item.request.address, phone: e.target.value } },
                    } : item);
                    sessionStorage.setItem(storage, JSON.stringify(next));
                    setAppointments(next);
                    setError("");
                  }} />
              </label>
              <p id={`appointment-phone-help-${i}`}>Use a Nigerian mobile number, for example 08012345678 or +2348012345678.</p>
              <p>
                {a.totalKobo === null
                  ? "A customer-approved quotation is required."
                  : money(a.totalKobo) + " service estimate"}
              </p>
              <button
                className="text-link"
                onClick={() => {
                  const next = appointments.filter((_, j) => j !== i);
                  sessionStorage.setItem(storage, JSON.stringify(next));
                  setAppointments(next);
                }}
              >
                Remove appointment
              </button>
            </div>
          ))}
          <Link className="button secondary" href="/services">
            Add another service
          </Link>
        </div>
        <form className="surface workflow-form" onSubmit={submit}>
          <h2>Review your request</h2>
          <p>
            Products {money(productTotal)} · Delivery{" "}
            {money(cart.length ? catalogue.deliveryFee : 0)}
          </p>
          <p>
            Services{" "}
            {appointments.some((a) => a.totalKobo === null)
              ? "include amounts requiring quotation"
              : money(appointments.reduce((n, a) => n + a.totalKobo, 0))}
            . Service payments remain separate, against approved charges.
          </p>
          {cart.length > 0 && (
            <>
              <h3>Product delivery</h3>
              <CheckoutDeliveryFields user={user} zones={catalogue.zones} />
              <label>
                <FieldCaption required={true}>Delivery date</FieldCaption>
                <input name="date" type="date" required />
              </label>
              <label>
                <FieldCaption required={true}>Delivery window</FieldCaption>
                <select name="window" required>
                  {catalogue.windows.map((w: string) => (
                    <option key={w}>{w}</option>
                  ))}
                </select>
              </label>
              <RewardCheckoutField />
              <label>
                <FieldCaption required={true}>Product payment</FieldCaption>
                <select name="paymentMethod">
                  {cardEnabled && <option value="card">Credit / debit card · Paystack sandbox</option>}
                  {catalogue.codEnabled && <option value="cash_on_delivery">Cash on delivery</option>}
                  {catalogue.walletEnabled && (
                    <option value="wallet">Verified purchase credit</option>
                  )}
                </select>
              </label>
            </>
          )}
          <p>
            Service appointments are reserved independently of product delivery.
            Completing one does not complete the other.
          </p>
          <button className="button" disabled={busy || !appointments.length}>
            {busy ? "Checking availability…" : "Confirm linked request"}
          </button>
        </form>
      </div>
    </div>
  );
}
