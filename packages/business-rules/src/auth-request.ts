/** Authentication requests settle once. Never retries or treats a timeout as success. */
export function withAuthDeadline<T>(
  send: (signal: AbortSignal) => Promise<T>,
  signal?: AbortSignal,
  timeoutMs = 20000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    let settled = false;
    let timer: ReturnType<typeof setTimeout>;
    const finish = (done: (v: any) => void, value: any) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", cancel);
      done(value);
    };
    const cancel = () => {
      controller.abort();
      finish(
        reject,
        Object.assign(new Error("Authentication was cancelled."), {
          name: "AbortError",
        }),
      );
    };
    timer = setTimeout(() => {
      finish(
        reject,
        Object.assign(
          new Error(
            "We couldn’t confirm whether this request completed. Try signing in or request a fresh account link before retrying.",
          ),
          { code: "AUTH_TIMEOUT", status: 408 },
        ),
      );
      controller.abort();
    }, timeoutMs);
    signal?.addEventListener("abort", cancel, { once: true });
    if (signal?.aborted) {
      cancel();
      return;
    }
    Promise.resolve()
      .then(() => {
        if (controller.signal.aborted)
          throw Object.assign(new Error("Cancelled"), { name: "AbortError" });
        return send(controller.signal);
      })
      .then(
        (v) => finish(resolve, v),
        (e) => finish(reject, e),
      );
  });
}
export const isAuthenticationAction = (action: string) =>
  [
    "me",
    "login",
    "register",
    "phone.login",
    "driver.login",
    "technician.login",
    "account.recover",
    "account.reset",
    "account.verify",
    "invitation.accept",
    "phone.otp",
    "phone.review",
    "phone.complete",
  ].includes(action);
