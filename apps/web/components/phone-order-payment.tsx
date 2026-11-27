"use client";
import DeliveryPinPicker from "./delivery-pin-picker";
import {
  confirmedDeliveryPin,
  type ConfirmedDeliveryPin,
} from "../../../packages/business-rules/src/delivery-pin";
import { useCallback, useEffect, useRef, useState } from "react";
import { Notice, money } from "./ui";
import { HostedPayment } from "./hosted-payment";
import { FieldCaption } from "./field-caption";

export default function PhoneOrderPayment() {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [linkId, setLinkId] = useState("");
  const [street, setStreet] = useState("");
  const [pin, setPin] = useState<ConfirmedDeliveryPin | undefined>();
  const init = useRef(false);
  const request = useCallback(
    async (action: string, input: any = {}) => {
      const name = action.split("?")[0];
      // Only the server chooses the order/invoice being paid. No caller-selected identity or amount.
      const body = name === "quote" ? { requestKey: input.requestKey } : input;
      const r = await fetch("/api/phone-orders/" + name, {
        method: "POST",
        headers: { "content-type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ linkId, ...body }),
      });
      const result = await r.json();
      if (!r.ok)
        throw new Error(result.error ?? "Unable to load this private order.");
      return result;
    },
    [linkId],
  );
  useEffect(() => {
    if (init.current) return;
    init.current = true;
    const [id, token] = location.hash.slice(1).split(":"),
      params = new URLSearchParams(location.search),
      lid = id || params.get("link") || "";
    setLinkId(lid);
    const intent = params.get("intent");
    history.replaceState(
      null,
      "",
      location.pathname + (lid ? "?link=" + encodeURIComponent(lid) : ""),
    );
    if (!lid) {
      setError("Open the complete private order link sent by the business.");
      return;
    }
    const call = async (action: string, input: any = {}) => {
      const r = await fetch("/api/phone-orders/" + action, {
        method: "POST",
        headers: { "content-type": "application/json" },
        cache: "no-store",
        body: JSON.stringify({ linkId: lid, ...input }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      return d;
    };
    void call("view", token ? { token } : {})
      .then(async (d) => {
        setData(d);
        setStreet(d.profile?.street ?? "");
        setPin(d.profile?.deliveryPin);
        if (intent) {
          const r = await call("verify", { intentId: intent });
          setError(
            r.status === "paid"
              ? "Payment verified. Your phone order is confirmed."
              : "Payment " +
                  r.status +
                  ". The order remains unconfirmed until verification.",
          );
          setData(await call("view"));
        }
      })
      .catch((e) => setError(e.message));
  }, []);
  async function confirm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      if (
        !data.sameVisit &&
        !confirmedDeliveryPin(pin, street, data.profile.zone)
      )
        throw Error(
          "Confirm your delivery map location before continuing to payment.",
        );
      const f = new FormData(event.currentTarget);
      setData(
        await request("profile", {
          profile: {
            name: String(f.get("name")),
            email: String(f.get("email")),
            phone: String(f.get("phone")),
            street,
            ...(data.sameVisit ? {} : { deliveryPin: pin }),
            confirmed: f.get("confirmed") === "on",
          },
        }),
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main
      className="container stack product-workspace"
      style={{ padding: "40px 20px", maxWidth: 760 }}
    >
      <h1>Complete your order</h1>
      <p role="status">
        {data?.paymentStatus === "verified"
          ? "3. Order confirmed"
          : data?.profileConfirmed
            ? "2. Secure payment"
            : "1. Delivery details"}
      </p>
      <p>
        Confirm your details, then pay securely. You do not need to sign in to
        pay this order.
      </p>
      {error && <Notice message={error} />}
      {!data && !error && <p role="status">Loading your private order…</p>}
      {data && (
        <section className="panel stack">
          <h2>{data.reference}</h2>
          <p>
            Phone order · {money(data.totalKobo)} · Delivery{" "}
            {money(data.deliveryKobo)}
          </p>
          {data.gas.map((g: any, i: number) => (
            <p key={i}>
              {Number(g.grams) / 1000} kg gas, filled at your delivery address.
            </p>
          ))}
          {data.paymentStatus === "verified" ? (
            <Notice message="Payment verified. Your order is confirmed; the business will arrange fulfilment." />
          ) : (
            <>
              {!data.profileConfirmed ? (
                <form className="stack" onSubmit={confirm}>
                  <h3>
                    {data.firstTime
                      ? "Complete your basic profile"
                      : "Confirm your delivery details"}
                  </h3>
                  {["name", "email", "phone"].map((name) => (
                    <label key={name}>
                      <FieldCaption required>
                        {name === "name"
                          ? "Full name"
                          : name === "email"
                            ? "Email address"
                            : "Phone number"}
                      </FieldCaption>
                      <input
                        name={name}
                        type={
                          name === "email"
                            ? "email"
                            : name === "phone"
                              ? "tel"
                              : "text"
                        }
                        required
                        defaultValue={data.profile[name]}
                        readOnly={
                          name === "phone" ||
                          (name === "email" && !data.firstTime)
                        }
                      />
                    </label>
                  ))}
                  <label>
                    <FieldCaption required>Complete house address</FieldCaption>
                    <textarea
                      name="street"
                      required
                      minLength={8}
                      maxLength={250}
                      value={street}
                      onChange={(e) => {
                        setStreet(e.target.value);
                        setPin(undefined);
                      }}
                    />
                  </label>
                  <p>
                    Delivery area: {data.profile.zone}. Contact the business to
                    change area or an extra order’s address.
                  </p>
                  {data.sameVisit ? (
                    <p>
                      This extra order uses the original visit’s delivery
                      address and location, with no additional delivery fee.
                    </p>
                  ) : (
                    <>
                      <DeliveryPinPicker
                        street={street}
                        zone={data.profile.zone}
                        value={pin}
                        disabled={busy}
                        onChange={setPin}
                      />
                    </>
                  )}
                  <label>
                    <input name="confirmed" type="checkbox" required /> These
                    are my correct details, delivery address and map pin for
                    this order.
                  </label>
                  <button className="button" disabled={busy}>
                    {busy
                      ? "Saving…"
                      : "Confirm details and continue to payment"}
                  </button>
                </form>
              ) : (
                <>
                  <p>
                    Deliver to {data.profile.name} · {data.profile.street},{" "}
                    {data.profile.zone}.
                  </p>
                  <HostedPayment
                    purpose="order"
                    orderId={data.orderId}
                    transport={request}
                    onVerified={async () => setData(await request("view"))}
                  />
                </>
              )}
              {!data.configuration.available && (
                <Notice message="Online payment is not currently configured for this branch. Ask the business to restore its payment service. This order is still unpaid and cannot be dispatched." />
              )}
            </>
          )}
          <p>
            This link is private and gives access only to this order. Profile
            confirmation does not create a signed-in account or verify ownership
            of an email address.
          </p>
        </section>
      )}
    </main>
  );
}
