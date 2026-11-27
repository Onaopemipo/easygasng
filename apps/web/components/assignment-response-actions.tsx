"use client";
import { useRef, useState, type FormEvent } from "react";
import { Notice } from "./ui";

export function AssignmentResponseActions({
  send,
  declineDecision,
  done,
  disabled = false,
}: {
  send: (values: any) => Promise<any>;
  declineDecision: "rejected" | "declined";
  done?: () => void | Promise<void>;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [declining, setDeclining] = useState(false),
    [accepted, setAccepted] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [declined, setDeclined] = useState(false);
  const running = useRef(false);
  const acceptKey = useRef<string | null>(null);
  const declineKeys = useRef(new Map<string, string>());
  async function accept() {
    if (running.current || disabled || accepted) return;
    running.current = true;
    setBusy(true);
    setError("");
    try {
      acceptKey.current ??= crypto.randomUUID();
      await send({ decision: "acknowledged", operationKey: acceptKey.current });
      setAccepted(true);
      try {
        await done?.();
      } catch {
        setError("Order accepted. Refresh to see the latest status.");
      }
    } catch (e: any) {
      setError(e.message || "Could not accept order. Please retry.");
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  async function decline(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (running.current || disabled || declined || accepted) return;
    const reason = declineReason.trim();
    if (reason.length < 5) {
      setError("Enter a decline reason of at least 5 characters.");
      return;
    }
    running.current = true;
    setBusy(true);
    setError("");
    if (!declineKeys.current.has(reason))
      declineKeys.current.set(reason, crypto.randomUUID());
    try {
      await send({
        decision: declineDecision,
        reason,
        operationKey: declineKeys.current.get(reason),
      });
      setDeclined(true);
      try {
        await done?.();
      } catch {
        setError("Response recorded. Refresh to see the latest status.");
      }
    } catch (e: any) {
      setError(e.message || "Could not decline order. Please retry.");
    } finally {
      running.current = false;
      setBusy(false);
    }
  }
  return (
    <div>
      {accepted || declined ? (
        <p role="status">
          {accepted ? "Order accepted." : "Order declined. Dispatch notified."}
        </p>
      ) : (
        <>
          <button
            type="button"
            className="button"
            disabled={disabled || busy}
            onClick={() => void accept()}
          >
            {busy ? "Sending…" : "Accept order"}
          </button>{" "}
          <button
            type="button"
            className="button secondary"
            disabled={disabled || busy}
            aria-expanded={declining}
            onClick={() => setDeclining(!declining)}
          >
            Decline order
          </button>
          {declining && (
            <form onSubmit={decline}>
              <label>
                Decline reason
                <textarea
                  required
                  minLength={5}
                  maxLength={declineDecision === "rejected" ? 500 : 2000}
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  disabled={disabled || busy}
                />
              </label>
              <button
                type="submit"
                className="button secondary"
                disabled={disabled || busy}
              >
                Decline and notify dispatch
              </button>
            </form>
          )}
        </>
      )}
      {error && <Notice type="error" message={error} />}
    </div>
  );
}
