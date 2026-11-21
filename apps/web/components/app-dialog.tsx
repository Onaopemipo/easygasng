"use client";
import { FieldCaption } from "./field-caption";
import { FormInput } from "./password-input";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { createDialogQueue } from "../../../packages/business-rules/src/dialog-queue";
import { friendlyMessage } from "../../../packages/business-rules/src/friendly-message";
type Options = {
  title: string;
  message: string;
  kind: "alert" | "confirm" | "prompt" | "verification";
  verify?: (password: string) => Promise<unknown>;
  path?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  minimumLength?: number;
  signal?: AbortSignal;
  returnFocus?: HTMLElement | null;
};
const queue = createDialogQueue<
  Options,
  { confirmed: boolean; text?: string }
>();
let returnFocus: HTMLElement | null = null;
let providerCount = 0;
let verificationPending = false;
export async function requestSessionVerification(
  verify: (password: string) => Promise<unknown>,
  signal?: AbortSignal,
) {
  // Never queue a second business action behind another password challenge.
  if (!providerCount || verificationPending) return false;
  verificationPending = true;
  try {
    return (
      await open({
        title: "Verify your identity",
        message:
          "Confirm your password to continue this action. Your entries stay in place.",
        kind: "verification",
        confirmLabel: "Verify and continue",
        verify,
        signal,
        path: window.location.pathname,
      })
    ).confirmed;
  } finally {
    verificationPending = false;
  }
}
const open = (options: Options) => {
  if (!queue.current() && typeof document !== "undefined")
    returnFocus = document.activeElement as HTMLElement | null;
  return queue.open(
    { ...options, returnFocus },
    options.signal
      ? { signal: options.signal, cancelResult: { confirmed: false } }
      : undefined,
  );
};
export const appAlert = (
  message: string,
  title = "Unable to complete this request",
) =>
  open({
    title,
    message: friendlyMessage(message),
    kind: "alert",
    confirmLabel: "Got it",
  });
export const confirmAction = (
  message: string,
  options: Partial<Options> = {},
) =>
  open({
    title: "Please confirm",
    message,
    kind: "confirm",
    confirmLabel: "Continue",
    cancelLabel: "Cancel",
    ...options,
  }).then((r) => r.confirmed);
export const requestText = (message: string, options: Partial<Options> = {}) =>
  open({
    title: "Add review details",
    message,
    kind: "prompt",
    confirmLabel: "Submit for review",
    cancelLabel: "Cancel",
    ...options,
  }).then((r) => (r.confirmed ? (r.text ?? "") : null));
export function appDialogActive() {
  return !!queue.current();
}
export function AppDialogProvider() {
  const item = useSyncExternalStore(queue.subscribe, queue.current, () => null);
  const pathname = usePathname();
  useEffect(() => {
    providerCount++;
    const cancel = () => queue.cancelAll({ confirmed: false });
    window.addEventListener("easygas:unauthenticated", cancel);
    window.addEventListener("pagehide", cancel);
    return () => {
      providerCount--;
      window.removeEventListener("easygas:unauthenticated", cancel);
      window.removeEventListener("pagehide", cancel);
      cancel();
    };
  }, []);
  useEffect(() => {
    if (item?.options.kind === "verification" && item.options.path !== pathname)
      queue.settle(item.id, { confirmed: false });
  }, [pathname, item]);
  return item ? <Dialog key={item.id} item={item} /> : null;
}
function Dialog({
  item,
}: {
  item: NonNullable<ReturnType<typeof queue.current>>;
}) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const password = useRef<HTMLInputElement>(null);
  const submitting = useRef(false);
  const panel = useRef<HTMLElement>(null);
  const o = item.options;
  const close = (confirmed = false) =>
    queue.settle(item.id, {
      confirmed,
      ...(o.kind === "prompt" ? { text: text.trim() } : {}),
    });
  async function verify(event: React.FormEvent) {
    event.preventDefault();
    if (submitting.current || !password.current?.value) return;
    submitting.current = true;
    setBusy(true);
    setError("");
    const value = password.current.value;
    password.current.value = "";
    try {
      await o.verify?.(value);
      close(true);
    } catch (e: any) {
      setError(e.message);
      password.current?.focus();
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  useEffect(() => {
    const previous =
      o.returnFocus ?? (document.activeElement as HTMLElement | null);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const targets = () =>
      Array.from(
        panel.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled),input,textarea",
        ) ?? [],
      );
    (
      panel.current?.querySelector<HTMLElement>("[data-initial-focus]") ??
      targets()[0]
    )?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopImmediatePropagation();
        close(false);
      }
      if (e.key === "Tab") {
        const nodes = targets(),
          first = nodes[0],
          last = nodes.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
        e.stopImmediatePropagation();
      }
    };
    document.addEventListener("keydown", key, true);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", key, true);
      if (previous?.isConnected) {
        const target = previous.matches(":disabled")
          ? previous
              .closest("form")
              ?.querySelector<HTMLElement>(
                "input:not(:disabled),textarea:not(:disabled),button:not(:disabled)",
              )
          : previous;
        target?.focus();
      }
    };
  }, [item.id]);
  return createPortal(
    <div className="app-alert-backdrop" data-easygas-alert="true">
      <section
        ref={panel}
        className="app-alert"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={`app-alert-title-${item.id}`}
        aria-describedby={`app-alert-message-${item.id}`}
      >
        <span className="app-alert-brand">EasyGas</span>
        <h2 id={`app-alert-title-${item.id}`}>{o.title}</h2>
        <p id={`app-alert-message-${item.id}`}>{friendlyMessage(o.message)}</p>
        {o.kind === "verification" && (
          <form onSubmit={verify} className="stack">
            <label>
              <FieldCaption required>Current password</FieldCaption>
              <FormInput
                ref={password}
                name="verificationPassword"
                type="password"
                autoComplete="current-password"
                required
                maxLength={128}
                data-initial-focus
                disabled={busy}
              />
            </label>
            {error && <p role="alert">{error}</p>}
            <div className="app-alert-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => close(false)}
              >
                Cancel
              </button>
              <button type="submit" className="button" disabled={busy}>
                {busy ? "Verifying…" : "Verify and continue"}
              </button>
            </div>
          </form>
        )}
        {o.kind === "prompt" && (
          <>
            <label>
              <FieldCaption required={true}>Reason and evidence</FieldCaption>
              <textarea
                data-initial-focus
                value={text}
                onChange={(e) => setText(e.target.value)}
                maxLength={2000}
                minLength={o.minimumLength ?? 1}
                aria-describedby={`app-alert-help-${item.id}`}
              />
            </label>
            <small id={`app-alert-help-${item.id}`}>
              Enter at least {o.minimumLength ?? 1} characters. This does not
              bypass any required approval.
            </small>
          </>
        )}
        {o.kind !== "verification" && (
          <div className="app-alert-actions">
            {o.kind !== "alert" && (
              <button
                type="button"
                className="button secondary"
                data-initial-focus={o.kind === "confirm" ? true : undefined}
                onClick={() => close(false)}
              >
                {o.cancelLabel ?? "Cancel"}
              </button>
            )}
            <button
              type="button"
              className={`button ${o.destructive ? "app-alert-destructive" : ""}`}
              disabled={
                o.kind === "prompt" &&
                text.trim().length < (o.minimumLength ?? 1)
              }
              onClick={() => close(true)}
            >
              {o.confirmLabel ?? "Continue"}
            </button>
          </div>
        )}
      </section>
    </div>,
    document.body,
  );
}
