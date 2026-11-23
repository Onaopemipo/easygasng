/** Bound read loading, including the response body. Mutations never enter this helper. */
export function withReadDeadline<T>(
  read: (signal: AbortSignal) => Promise<T>,
  signal?: AbortSignal,
  timeoutMs = 20000,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const controller = new AbortController();
    let settled = false;
    let timer: ReturnType<typeof setTimeout>;
    const finish = (fn: (value: any) => void, value: any) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", cancel);
      fn(value);
    };
    const cancel = () => {
      controller.abort();
      finish(reject, new DOMException("The read was cancelled.", "AbortError"));
    };
    timer = setTimeout(() => {
      // Settle with a useful timeout before aborting fetch; an ignored abort cannot leave a spinner.
      finish(
        reject,
        Object.assign(new Error("Loading took too long. Please try again."), {
          code: "READ_TIMEOUT",
          status: 408,
        }),
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
          throw new DOMException("The read was cancelled.", "AbortError");
        return read(controller.signal);
      })
      .then(
        (value) => finish(resolve, value),
        (error) => finish(reject, error),
      );
  });
}
