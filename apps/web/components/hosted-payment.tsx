"use client";
import React, { useEffect, useRef, useState } from "react";
import { api, money, Notice } from "./ui";
async function pay(action: string, input?: unknown) {
  const r = await fetch("/api/payments/paystack/" + action, {
    method: input === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json" },
    ...(input === undefined ? {} : { body: JSON.stringify(input) }),
    cache: "no-store",
  });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error ?? "Payment request failed.");
  return d;
}
export function HostedPayment({
  purpose,
  invoiceId,
  bookingId,
  amountKobo,
}: {
  purpose: "invoice" | "wallet" | "service";
  invoiceId?: string;
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
    pay("configuration")
      .then((c) => live && setConfig(c))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
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
                : "Invoice / service amount"}
            </dt>
            <dd>{money(quote.quote.baseKobo)}</dd>
            <dt>Payment processing charge</dt>
            <dd>{money(quote.quote.customerFeeKobo)}</dd>
            <dt>Total to pay</dt>
            <dd>
              <strong>{money(quote.quote.grossKobo)}</strong>
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
            I accept this amount and the separately disclosed processing charge.
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
    [busy, setBusy] = useState(false);
  async function load() {
    setFunding(await api("wallet.funding"));
  }
  useEffect(() => {
    load().catch((e) => setError(e.message));
    pay("configuration")
      .then(setConfig)
      .catch(() => {});
  }, []);
  const parsed = /^\d+(\.\d{1,2})?$/.test(amount)
    ? Math.round(Number(amount) * 100)
    : 0;
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
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
        `Transfer request ${r.status}. Your wallet is credited only after the business confirms receipt.`,
      );
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section id="top-up" className="surface stack">
      <h2>Top up your wallet</h2>
      <p>
        Choose bank transfer for business approval, or card for automatic credit
        after payment verification.
      </p>
      {error && <Notice type="error" message={error} />}{" "}
      {message && <p role="status">{message}</p>}
      <label>
        Payment method
        <select
          value={method}
          onChange={(e) => {
            setMethod(e.target.value);
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
        Amount (NGN)
        <input
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Enter top-up amount"
        />
      </label>
      {method === "card" ? (
        config?.available &&
        config.walletFunding &&
        config.channels?.includes("card") ? (
          parsed > 0 && (
            <HostedPayment key={parsed} purpose="wallet" amountKobo={parsed} />
          )
        ) : (
          <p>
            Card top-up is currently unavailable. Payment activation and
            approved card funding settings are required.
          </p>
        )
      ) : funding?.bank ? (
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
            reference. A submitted reference is not proof of payment. No balance
            is added until owner/finance verifies actual receipt.
          </p>
          <label>
            Sender name
            <input name="sender" required minLength={2} maxLength={150} />
          </label>
          <label>
            Bank transaction reference
            <input
              name="reference"
              required
              minLength={5}
              maxLength={80}
              pattern="[A-Za-z0-9-]+"
            />
          </label>
          <label>
            Transfer date
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
            {busy ? "Submitting…" : "Submit transfer for approval"}
          </button>
        </form>
      ) : (
        <p>
          Bank-transfer funding is unavailable until EasyGas configures its
          receiving bank account.
        </p>
      )}
      <h3>Bank-transfer requests</h3>
      {funding?.requests?.length ? (
        funding.requests.map((r: any) => (
          <div className="cart-row" key={r.id}>
            <span>
              {r.receipt_reference}
              <small>
                {new Date(r.created_at).toLocaleString()} · {r.status}
              </small>
            </span>
            <strong>{money(r.amount_kobo)}</strong>
          </div>
        ))
      ) : (
        <p>No bank-transfer requests.</p>
      )}
    </section>
  );
}
export function PaymentReturn() {
  const [intent, setIntent] = useState(""),
    [result, setResult] = useState<any>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    const v = new URLSearchParams(location.search).get("intent");
    if (v && /^[a-f0-9-]{36}$/i.test(v)) setIntent(v);
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
  return (
    <main className="container page stack">
      <h1>Payment verification</h1>
      <p>
        A return from checkout does not prove payment. EasyGas checks the
        provider and ledger independently.
      </p>
      {error && <Notice type="error" message={error} />}{" "}
      {result && (
        <p role="status">
          {result.status === "paid"
            ? "Sandbox payment verified and posted once."
            : `Payment ${result.status}. Do not make another payment until this attempt is reconciled.`}
        </p>
      )}
      <button className="button" disabled={!intent || busy} onClick={check}>
        Verify payment status
      </button>
      {result?.status === "paid" && (
        <a
          className="button secondary"
          href={
            "/api/payments/paystack/receipt?format=pdf&intentId=" +
            encodeURIComponent(intent)
          }
        >
          Download sandbox payment receipt
        </a>
      )}
      {intent && (
        <a
          className="button secondary"
          href={"easygas://payment?intentId=" + encodeURIComponent(intent)}
        >
          Return to EasyGas mobile app
        </a>
      )}
      <a href="/wallet">View wallet balance</a>
      <a href="/orders">My orders and invoices</a>
    </main>
  );
}
