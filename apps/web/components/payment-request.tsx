"use client";
import { useEffect, useState } from "react";
import { HostedPayment } from "./hosted-payment";
import { api, Notice, money } from "./ui";
export default function PaymentRequest() {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState("");
  useEffect(() => {
    const parts = location.hash.slice(1).split(":");
    const service = parts[0] === "service";
    const [orderId, token] = service ? parts.slice(1) : parts;
    history.replaceState(null, "", location.pathname);
    if (!orderId || !token) {
      setError("Open the complete request link from your message.");
      return;
    }
    api("invoice.request.view", {
      [service ? "bookingId" : "orderId"]: orderId,
      token,
    })
      .then(setData)
      .catch((e) =>
        setError(
          e.status === 401
            ? "Sign in to your customer account, then reopen the original invoice link."
            : e.message,
        ),
      );
  }, []);
  return (
    <main
      className="container stack product-workspace"
      style={{ padding: "48px 20px" }}
    >
      <h1>Invoice payment request</h1>
      {error && (
        <>
          <Notice type="error" message={error} />
          <a className="button" href="/login">
            Sign in
          </a>
        </>
      )}
      {data ? (
        <section className="panel">
          <h2>{data.invoiceNumber}</h2>
          <p>Version {data.version} · NGN</p>
          <p>
            Amount due: <strong>{money(data.amountDueKobo)}</strong>
          </p>
          <p>{data.message}</p>
          <p>Configured method: {data.paymentMethod}</p>
          {data.onlinePaymentsEnabled && data.amountDueKobo > 0 && (
            <HostedPayment purpose="invoice" invoiceId={data.invoiceId} />
          )}
          <a className="button" href={data.bookingId ? "/bookings" : "/orders"}>
            View bookings, orders and invoice history
          </a>
        </section>
      ) : (
        !error && <p>Checking your invoice request…</p>
      )}
    </main>
  );
}
