"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight } from "lucide-react";
import { AuthField } from "./auth-presentation";
import { authRequest } from "./auth-request";
import { Notice } from "./ui";
export function RecoveryRequest({
  onResult,
}: {
  onResult: (message: string) => void;
}) {
  const [email, setEmail] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const pending = useRef(false),
    lifetime = useRef<AbortController | null>(null);
  useEffect(() => {
    const c = new AbortController();
    lifetime.current = c;
    return () => c.abort();
  }, []);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    try {
      await authRequest(
        "account.recover",
        { email },
        { signal: lifetime.current?.signal },
      );
      if (!lifetime.current?.signal.aborted)
        onResult(
          "If an account exists for that email, follow the reset instructions sent to you.",
        );
    } catch (e) {
      if (!lifetime.current?.signal.aborted) setError((e as Error).message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} aria-busy={busy}>
      <AuthField
        label="Email address"
        name="email"
        type="email"
        autoComplete="email"
        autoCapitalize="none"
        spellCheck={false}
        required
        maxLength={200}
        placeholder="Enter your account email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      {error && <Notice type="error" message={error} />}
      <button className="button" disabled={busy}>
        {busy ? "Sending…" : "Send Reset Link"}
        <ArrowRight size={20} />
      </button>
    </form>
  );
}
