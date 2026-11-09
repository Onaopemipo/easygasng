"use client";
import { FormInput } from "./password-input";
import { useEffect, useState, type FormEvent } from "react";
import { api, Notice, money } from "./ui";
export default function PhoneCompletion() {
  const [token, setToken] = useState(""),
    [code, setCode] = useState(""),
    [order, setOrder] = useState<any>(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    const read=()=>{const raw=location.hash.slice(1);if(raw){setToken(raw);setOrder(null);setCode('');setMessage('');history.replaceState(null,'',location.pathname);}};read();window.addEventListener('hashchange',read);return()=>window.removeEventListener('hashchange',read);
  }, []);
  async function request() {
    setBusy(true);
    try {
      const r = await api("phone.otp", { token, channel: "sms" });
      setMessage(r.message);
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function review(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api("phone.review", { token, code });
      if (r.ok) setOrder(r.order);
      else setMessage(r.message);
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function complete(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      const r = await api("phone.complete", {
        token,
        code,
        password: String(f.get("password")),
        termsAccepted: f.get("terms") === "on",
      });
      if (r.ok) location.assign("/account");
      else setMessage(r.message);
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main
      className="container stack"
      style={{ maxWidth: 640, padding: "48px 20px" }}
    >
      <h1>Complete your EasyGas account</h1>
      <p>
        Verify your phone before viewing your private order. Your existing
        customer account and order will be preserved.
      </p>
      {message && <Notice message={message} />}
      <button className="button" onClick={request} disabled={!token || busy}>
        Request phone verification code
      </button>
      <form className="panel stack" onSubmit={review}>
        <label>
          Six-digit code
          <FormInput
            value={code}
            onChange={(e) => setCode(e.target.value)}
            inputMode="numeric"
            pattern="[0-9]{6}"
            autoComplete="one-time-code"
            required
          />
        </label>
        <button className="button" disabled={busy || !token}>
          Review my order
        </button>
      </form>
      {order && (
        <section className="panel stack">
          <h2>{order.reference}</h2>
          <p>
            {order.status} · {money(order.total_kobo)}
          </p>
          <p>
            {order.address.street}, {order.address.zone}
          </p>
          <form onSubmit={complete} className="stack">
            <label>
              Create a password
              <FormInput
                name="password"
                type="password"
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
                required
              />
            </label>
            <label>
              <FormInput type="checkbox" name="terms" required /> I accept the{" "}
              <a href="/terms">terms and conditions</a>.
            </label>
            <button className="button" disabled={busy}>
              Activate my account
            </button>
          </form>
        </section>
      )}
    </main>
  );
}
