import { dispatch } from "./service";
import type { DB } from "./db";
export async function openTrackingStream({
  token,
  orderId,
  signal,
  database,
  intervalMs = 5000,
}: {
  token: string | null;
  orderId?: string | null;
  signal: AbortSignal;
  database?: DB;
  intervalMs?: number;
}) {
  const read = () =>
    dispatch("orders", token, orderId ? { id: orderId } : {}, database);
  const first = await read();
  let stopped = false,
    timer: ReturnType<typeof setTimeout> | undefined;
  return new ReadableStream<Uint8Array>({
    start(controller) {
      const started = Date.now();
      const close = () => {
        if (!stopped) {
          stopped = true;
          clearTimeout(timer);
          signal.removeEventListener("abort", close);
          try {
            controller.close();
          } catch {}
        }
      };
      signal.addEventListener("abort", close, { once: true });
      if (signal.aborted) {
        close();
        return;
      }
      const send = (orders: unknown) =>
        controller.enqueue(
          new TextEncoder().encode(
            `event: snapshot\ndata: ${JSON.stringify({ orders, observedAt: new Date().toISOString() })}\n\n`,
          ),
        );
      send(first);
      const tick = async () => {
        if (stopped) return;
        try {
          // Revalidate the captured session, current account state, branch and assignment every heartbeat.
          const orders = await read();
          if (stopped) return;
          send(orders);
          if (Date.now() - started >= 50000) {
            close();
            return;
          }
          timer = setTimeout(tick, intervalMs);
        } catch {
          close();
        }
      };
      timer = setTimeout(tick, intervalMs);
    },
    cancel() {
      stopped = true;
      clearTimeout(timer);
    },
  });
}
