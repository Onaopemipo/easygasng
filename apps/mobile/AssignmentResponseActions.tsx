import { randomUUID } from "expo-crypto";
import React, { useRef, useState } from "react";
import { Button, Copy, type CustomerAPI } from "./CustomerUI";
import { NativeForm } from "./Workflows";

export default function AssignmentResponseActions({
  api,
  action,
  input,
  onDone,
  disabled = false,
}: {
  api: CustomerAPI;
  action: "dispatch.respond" | "booking.assignment.respond";
  input: Record<string, any>;
  onDone?: () => void | Promise<void>;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [declining, setDeclining] = useState(false),
    [accepted, setAccepted] = useState(false);
  const running = useRef(false);
  const acceptKey = useRef<string | null>(null);
  const declineKeys = useRef(new Map<string, string>());
  async function accept() {
    if (running.current || disabled || accepted) return;
    running.current = true;
    setBusy(true);
    setError("");
    try {
      acceptKey.current ??= randomUUID();
      await api(action, {
        ...input,
        decision: "acknowledged",
        operationKey: acceptKey.current,
      });
      setAccepted(true);
      try {
        await onDone?.();
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
  return (
    <>
      {accepted ? (
        <Copy>Order accepted.</Copy>
      ) : (
        <>
          <Button
            label={busy ? "Accepting…" : "Accept order"}
            disabled={disabled || busy}
            onPress={() => void accept()}
          />
          <Button
            label="Decline order"
            secondary
            disabled={disabled || busy}
            onPress={() => setDeclining(!declining)}
          />
          {declining && (
            <NativeForm
              api={async (_, values) => {
                if (running.current || disabled)
                  throw new Error(
                    "A response is already being sent or is unavailable.",
                  );
                running.current = true;
                setBusy(true);
                const signature = JSON.stringify(values);
                if (!declineKeys.current.has(signature))
                  declineKeys.current.set(signature, randomUUID());
                try {
                  return await api(action, {
                    ...input,
                    ...values,
                    operationKey: declineKeys.current.get(signature),
                    decision:
                      action === "dispatch.respond" ? "rejected" : "declined",
                  });
                } finally {
                  running.current = false;
                  setBusy(false);
                }
              }}
              action="assignment.decline"
              title="Reason for declining"
              fields={[
                { name: "reason", label: "Decline reason", required: true },
              ]}
              submitLabel="Decline and notify dispatch"
              disabled={disabled || busy}
              onDone={() => {
                void Promise.resolve(onDone?.()).catch(() =>
                  setError(
                    "Response recorded. Refresh to see the latest status.",
                  ),
                );
              }}
            />
          )}
        </>
      )}
      {error ? <Copy>{error}</Copy> : null}
    </>
  );
}
