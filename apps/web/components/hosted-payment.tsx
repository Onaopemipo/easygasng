"use client";
import { FieldCaption } from "./field-caption";
import { ActionLoadingIndicator } from "./easygas-loader";
import React, { useEffect, useRef, useState } from "react";
import { api, money, Notice } from "./ui";
async function pay(action: string, input?: unknown, signal?: AbortSignal) {
  const r = await fetch("/api/payments/paystack/" + action, {
    method: input === undefined ? "GET" : "POST",
    signal,
    headers: { "Content-Type": "application/json" },
    ...(input === undefined ? {} : { body: JSON.stringify(input) }),
    cache: "no-store",
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error ?? "Payment request failed.");
  return d;
}
/** Gateway charges are disclosed to the kobo before exact-amount consent. */
export const paymentMoney = (kobo: number) =>
  new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(kobo / 100);
export function HostedPayment({
  purpose,
  invoiceId,
  orderId,
  bookingId,
  amountKobo,
}: {
  purpose: "invoice" | "wallet" | "service" | "order";
  invoiceId?: string;
  orderId?: string;
  bookingId?: string;
  amountKobo?: number;
}) {
  const [config, setConfig] = useState<any>(null),
    [quote, setQuote] = useState<any>(null),
    [accepted, setAccepted] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [pending, setPending] = useState(false);
  const key = useRef<string | null>(null);
  useEffect(() => {
    let live = true;
    pay(purpose === "wallet" ? "configuration?purpose=wallet" : "configuration")
      .then((c) => live && setConfig(c))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [purpose]);
  if (!config?.available || (purpose === "wallet" && !config.walletFunding))
    return null;
  async function review() {
    setBusy(true);
    setError("");
    try {
      key.current ??= crypto.randomUUID();
      const q = await pay("quote", {
        purpose,
        ...(invoiceId ? { invoiceId } : {}),
        ...(orderId ? { orderId } : {}),
        ...(bookingId ? { bookingId } : {}),
        ...(amountKobo ? { amountKobo } : {}),
        requestKey: key.current,
      });
      setQuote(q);
      setPending(q.status !== "quoted");
      setAccepted(false);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function proceed() {
    if (!quote || !accepted || busy) return;
    setBusy(true);
    setError("");
    try {
      const r = await pay("initialize", {
        intentId: quote.id,
        acceptedGrossKobo: quote.quote.grossKobo,
        acceptedPolicyVersion: quote.quote.gatewayPolicyVersion,
      });
      if (r.checkoutUrl) {
        const u = new URL(r.checkoutUrl);
        if (u.origin !== "https://checkout.paystack.com")
          throw new Error("Hosted checkout address was rejected.");
        window.location.assign(u.href);
      } else setPending(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function verify() {
    setBusy(true);
    try {
      const r = await pay("verify", { intentId: quote.id });
      setError(
        r.status === "paid"
          ? "Sandbox payment verified. Refresh your ledger to see the posted principal."
          : `Payment ${r.status}; no additional charge was started.`,
      );
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="surface stack">
      <h3>Paystack sandbox payment</h3>
      <p>Test mode only. This is not a live-money payment.</p>
      {error && <Notice message={error} />}{" "}
      {!quote ? (
        <button
          type="button"
          className="button"
          disabled={busy}
          onClick={review}
        >
          Review payment and processing charge
        </button>
      ) : (
        <>
          <dl>
            <dt>
              {purpose === "wallet"
                ? "Wallet credit amount"
                : purpose === "order"
                  ? "Order amount"
                  : "Invoice / service amount"}
            </dt>
            <dd>{paymentMoney(quote.quote.baseKobo)}</dd>
            <dt>Payment processing charge</dt>
            <dd>{paymentMoney(quote.quote.customerFeeKobo)}</dd>
            <dt>Total to pay</dt>
            <dd>
              <strong>{paymentMoney(quote.quote.grossKobo)}</strong>
            </dd>
          </dl>
          <p>
            Quote expires {new Date(quote.expiresAt).toLocaleString()}. Wallet
            funding credits only the requested principal.
          </p>
          <label>
            <input
              type="checkbox"
              checked={accepted}
              disabled={pending}
              onChange={(e) => setAccepted(e.target.checked)}
            />
            <FieldCaption required={true}>I accept this amount and the separately disclosed processing charge.</FieldCaption>
          </label>
          {pending ? (
            <>
              <p>
                Verification pending. Do not start another charge because a
                response is delayed.
              </p>
              <button
                type="button"
                className="button secondary"
                disabled={busy}
                onClick={verify}
              >
                Check payment status
              </button>
            </>
          ) : (
            <button
              type="button"
              className="button"
              disabled={busy || !accepted}
              onClick={proceed}
            >
              {busy && (
                <ActionLoadingIndicator label="Preparing payment checkout" />
              )}
              Continue to Paystack sandbox
            </button>
          )}
        </>
      )}
    </section>
  );
}
export function WalletFunding() {
  const [config, setConfig] = useState<any>(null),
    [funding, setFunding] = useState<any>(null),
    [method, setMethod] = useState("bank"),
    [amount, setAmount] = useState(""),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [ready, setReady] = useState(false),
    [review, setReview] = useState(false);
  const loadController = useRef<AbortController | null>(null),
    loadRevision = useRef(0);
  async function load() {
    const revision = ++loadRevision.current;
    loadController.current?.abort();
    const controller = new AbortController();
    loadController.current = controller;
    const timeout = setTimeout(() => controller.abort(), 15000);
    setReady(false);
    setError("");
    const [bank, card] = await Promise.allSettled([
      api("wallet.funding", undefined, { signal: controller.signal }),
      pay("configuration?purpose=wallet", undefined, controller.signal),
    ]).finally(() => clearTimeout(timeout));
    if (revision !== loadRevision.current) return;
    setFunding(bank.status === "fulfilled" ? bank.value : null);
    setConfig(card.status === "fulfilled" ? card.value : null);
    if (bank.status === "rejected" && card.status === "rejected")
      setError("Payment methods could not be loaded. Please retry.");
    setReady(true);
  }
  useEffect(() => {
    void load();
    return () => {
      loadRevision.current++;
      loadController.current?.abort();
    };
  }, []);
  const parsed = /^\d+(\.\d{1,2})?$/.test(amount.trim())
    ? Math.round(Number(amount) * 100)
    : 0;
  const branchRequired = funding?.branchRequired || config?.branchRequired;
  const branchUnavailable =
    funding?.branchUnavailable || config?.branchUnavailable;
  const available =
    method === "bank"
      ? !!funding?.enabled && !!funding?.bank
      : !!config?.available &&
        !!config?.walletFunding &&
        config?.channels?.includes("card");
  const minimum =
    method === "card" ? Number(config?.walletMinimumKobo ?? 1) : 1;
  const maximum = Number(
    (method === "card" ? config?.walletMaximumKobo : funding?.maximumKobo) ??
      100000000,
  );
  const validAmount =
    Number.isSafeInteger(parsed) &&
    parsed >= minimum &&
    parsed <= maximum &&
    parsed > 0;
  const reason = !ready
    ? "Loading payment methods…"
    : branchUnavailable
      ? "Wallet funding is unavailable for your assigned branch. Contact support."
      : branchRequired
        ? "Add a supported delivery address to enable wallet top-ups."
        : !available
          ? method === "bank"
            ? funding
              ? "Bank-transfer funding is unavailable until EasyGas configures its receiving bank account."
              : "Bank-transfer details could not be loaded. Retry payment methods."
            : config
              ? "Card top-up is currently unavailable."
              : "Card availability could not be checked. Retry payment methods."
          : !validAmount
            ? amount
              ? `Enter an amount between ${paymentMoney(minimum)} and ${paymentMoney(maximum)}.`
              : "Enter an amount to continue."
            : "";
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || !validAmount || !available) return;
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const r = await api("wallet.transfer.request", {
        amountKobo: parsed,
        receiptReference: String(fd.get("reference")),
        senderName: String(fd.get("sender")),
        transferDate: String(fd.get("date")),
      });
      setMessage(
        `Transfer request ${r.status}. Your wallet is credited after EasyGas confirms receipt.`,
      );
      setReview(false);
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section id="top-up" className="surface stack wallet-funding">
      <h2>Top up your wallet</h2>
      <p>
        Bank transfers require approval. Card payments are credited after
        verification.
      </p>
      {error && <Notice type="error" message={error} />}
      {message && <p role="status">{message}</p>}
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault();
          if (ready && available && validAmount) setReview(true);
        }}
      >
        <label>
          <FieldCaption required={true}>Payment method</FieldCaption>
          <select
            value={method}
            onChange={(e) => {
              setMethod(e.target.value);
              setReview(false);
              setError("");
              setMessage("");
            }}
          >
            <option value="bank">Bank transfer · approval required</option>
            <option value="card">
              Credit / debit card · automatic verification
            </option>
          </select>
        </label>
        <label>
          <FieldCaption required={true}>Amount (NGN)</FieldCaption>
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setReview(false);
            }}
            placeholder="Enter top-up amount"
            required
          />
        </label>
        {!ready ? <ActionLoadingIndicator label="Loading payment methods" /> : reason && (
          <p className="muted" role="status">
            {reason}
          </p>
        )}
        {branchUnavailable && (
          <a className="text-link" href="/support">
            Contact support
          </a>
        )}
        {branchRequired && (
          <a className="text-link" href="/account-settings">
            Set delivery address
          </a>
        )}
        <div className="service-actions">
          <button
            className="button"
            type="submit"
            disabled={!ready || !available || !validAmount || busy}
          >
            Continue
          </button>
          {ready && (!available || error || branchRequired) && (
            <button
              type="button"
              className="button secondary"
              onClick={() => void load()}
            >
              Retry payment methods
            </button>
          )}
        </div>
      </form>
      {review &&
        available &&
        validAmount &&
        (method === "card" ? (
          <HostedPayment key={parsed} purpose="wallet" amountKobo={parsed} />
        ) : (
          <form className="stack" onSubmit={submit}>
            <dl>
              <dt>Bank</dt>
              <dd>{funding.bank.bankName}</dd>
              <dt>Account name</dt>
              <dd>{funding.bank.accountName}</dd>
              <dt>Account number</dt>
              <dd>{funding.bank.accountNumber}</dd>
            </dl>
            <p>
              Transfer to this account, then submit the exact bank transaction
              reference. A submitted reference is not proof of payment. No
              balance is added until owner/finance verifies actual receipt.
            </p>
            <label>
              <FieldCaption required={true}>Sender name</FieldCaption>
              <input name="sender" required minLength={2} maxLength={150} />
            </label>
            <label>
              <FieldCaption required={true}>Bank transaction reference</FieldCaption>
              <input
                name="reference"
                required
                minLength={5}
                maxLength={80}
                pattern="[A-Za-z0-9-]+"
              />
            </label>
            <label>
              <FieldCaption required={true}>Transfer date</FieldCaption>
              <input
                type="date"
                name="date"
                required
                max={new Date().toISOString().slice(0, 10)}
              />
            </label>
            <button
              className="button"
              disabled={busy || parsed <= 0 || parsed > funding.maximumKobo}
            >
              {busy && (
                <ActionLoadingIndicator label="Submitting transfer for approval" />
              )}
              {busy ? "Submitting…" : "Submit transfer for approval"}
            </button>
          </form>
        ))}
      {!!funding?.requests?.length && (
        <details className="wallet-transfer-history">
          <summary>Bank-transfer requests ({funding.requests.length})</summary>
          {funding.requests.map((r: any) => (
            <div className="cart-row" key={r.id}>
              <span>
                {r.receipt_reference}
                <small>
                  {new Date(r.created_at).toLocaleString()} · {r.status}
                </small>
              </span>
              <strong>{paymentMoney(r.amount_kobo)}</strong>
            </div>
          ))}
        </details>
      )}
    </section>
  );
}
function paymentDestination(purpose: string) {
  switch (purpose) {
    case "wallet": return { href: "/wallet", label: "Go to my wallet" };
    case "service": return { href: "/bookings", label: "Go to my appointments" };
    case "order":
    case "invoice": return { href: "/orders", label: "Go to my orders" };
    default: return { href: "/", label: "Return to EasyGas website" };
  }
}

export function PaymentReturn() {
  const [intent, setIntent] = useState(""),
    [result, setResult] = useState<{ status: string; purpose: string } | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [stay, setStay] = useState(false);
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const v = query.get("intent");
    setStay(query.get("client") === "native");
    if (v && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(v)) setIntent(v);
    else setError("Open the original payment return link.");
  }, []);
  async function check() {
    setBusy(true);
    try {
      setResult(await pay("verify", { intentId: intent }));
      setError("");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (intent) void check();
  }, [intent]);
  const paid = result?.status === "paid";
  const destination = paymentDestination(paid ? result.purpose : "");
  useEffect(() => {
    if (!paid || stay) return;
    const timer = window.setTimeout(() => window.location.replace(destination.href), 6000);
    return () => window.clearTimeout(timer);
  }, [paid, stay, destination.href]);

  return (
    <main className="container page payment-return">
      <h1>Payment verification</h1>
      {error && <Notice type="error" message={error} />}
      {result && (
        <p role="status">
          {paid
            ? "Sandbox payment verified."
            : `Payment ${result.status}. Do not make another payment until this attempt is reconciled.`}
        </p>
      )}
      {paid && !stay && <p>You’ll return to EasyGas in a few seconds.</p>}
      <div className="payment-return-actions">
        <a className="button" href={destination.href}>
          {destination.label}
        </a>
        {!paid && intent && (
          <button className="button secondary" disabled={busy} onClick={check}>
            {busy && <ActionLoadingIndicator label="Verifying payment with provider" />}
            {busy ? "Verifying payment…" : "Verify payment status"}
          </button>
        )}
        {paid && (
          <a
            className="button secondary"
            href={"/api/payments/paystack/receipt?format=pdf&intentId=" + encodeURIComponent(intent)}
            onClick={() => setStay(true)}
          >
            Download sandbox receipt
          </a>
        )}
        {paid && !stay && (
          <button className="button secondary" onClick={() => setStay(true)}>
            Stay on this page
          </button>
        )}
        {intent && (
          <a
            className="button secondary"
            href={"easygas://payment?intentId=" + encodeURIComponent(intent)}
            onClick={() => setStay(true)}
          >
            Return to EasyGas mobile app
          </a>
        )}
      </div>
    </main>
  );
}

/** Display only the existing gateway capability; the backend rechecks branch policy. */
export function useCardCheckout(identity?: string) {
  const [available, setAvailable] = useState(false);
  useEffect(() => {
    let active = true;
    setAvailable(false);
    pay("configuration")
      .then((c) => {
        if (active) setAvailable(!!c.available && c.channels?.includes("card"));
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [identity]);
  return available;
}
export function OrderCardPayment({ order }: { order: any }) {
  if (
    order?.payment_method !== "card" ||
    order.payment_status === "verified" ||
    ["cancelled", "failed", "returned", "delivered"].includes(order.status)
  )
    return null;
  return (
    <section className="stack order-card-payment">
      <h3>Complete credit / debit card payment</h3>
      <p>
        Your order is unpaid until Paystack verification succeeds. Dispatch
        remains blocked. Review the processing fee before continuing.
      </p>
      <HostedPayment purpose="order" orderId={order.id} />
      <p>
        If finance has already issued an invoice, use View invoice to pay its
        reviewed balance.
      </p>
    </section>
  );
}
