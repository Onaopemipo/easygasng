"use client";
import { AuthShell } from "./auth-presentation";
import { authRequest as api } from "./auth-request";
import { FieldCaption } from "./field-caption";
import { PASSWORD_MIN_LENGTH } from "../../../packages/business-rules/src/password-policy";

import { FormInput } from "./password-input";
import { useEffect, useState, useRef, type FormEvent } from "react";
import { Notice, money } from "./ui";
export default function PhoneCompletion() {
  const [token, setToken] = useState(""),
    [code, setCode] = useState(""),
    [order, setOrder] = useState<any>(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    const read=()=>{const raw=location.hash.slice(1);if(raw){setToken(raw);setOrder(null);setCode('');setMessage('');history.replaceState(null,'',location.pathname);}};read();window.addEventListener('hashchange',read);return()=>window.removeEventListener('hashchange',read);
  }, []);
  const submitting = useRef(false);
  async function request() {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    try {
      const r = await api("phone.otp", { token, channel: "sms" });
      setMessage(r.message);
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  async function review(e: FormEvent) {
    e.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    try {
      const r = await api("phone.review", { token, code });
      if (r.ok) setOrder(r.order);
      else setMessage(r.message);
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  async function complete(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
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
      submitting.current = false;
      setBusy(false);
    }
  }
  return (
    <AuthShell mode="link" title="Complete your EasyGas account" back="/login"
      description="Verify your phone before viewing your private order. Your existing customer account and order will be preserved.">
      {message && <Notice message={message} />}
      <button className="button" onClick={request} disabled={!token || busy}>
        Request phone verification code
      </button>
      <form className="panel stack product-form" onSubmit={review}>
        <label>
          <FieldCaption required={true}>Six-digit code</FieldCaption>
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
          <form onSubmit={complete} className="stack product-form">
            <label>
              <FieldCaption required={true}>Create a password</FieldCaption>
              <FormInput
                name="password"
                type="password"
                minLength={PASSWORD_MIN_LENGTH}
                maxLength={128}
                autoComplete="new-password"
                required
              />
            </label>
            <label>
              <FormInput type="checkbox" name="terms" required /> <FieldCaption required={true}>I accept the{" "}
              <a href="/terms">terms and conditions</a>.</FieldCaption>
            </label>
            <button className="button" disabled={busy}>
              Activate my account
            </button>
          </form>
        </section>
      )}
    </AuthShell>
  );
}
