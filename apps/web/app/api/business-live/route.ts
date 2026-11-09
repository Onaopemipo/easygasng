import { NextRequest } from "next/server";
import { dispatch } from "../../../lib/service";
import { AppError, digest } from "../../../lib/auth";
const connections = new Map<string, number>();
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const token = req.cookies.get("easygas_session")?.value ?? null;
  const filters = Object.fromEntries(req.nextUrl.searchParams);
  let initial: any;
  try {
    initial = await dispatch("business.snapshot", token, filters);
  } catch (e) {
    return Response.json(
      {
        error:
          e instanceof AppError ? e.message : "Live information unavailable.",
      },
      {
        status: e instanceof AppError ? e.status : 400,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
  const key = digest(token ?? "");
  if ((connections.get(key) ?? 0) >= 3)
    return Response.json(
      { error: "Too many live connections. Close another dashboard tab." },
      { status: 429, headers: { "Cache-Control": "no-store" } },
    );
  connections.set(key, (connections.get(key) ?? 0) + 1);
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    const n = (connections.get(key) ?? 1) - 1;
    if (n <= 0) connections.delete(key);
    else connections.set(key, n);
  };
  const encoder = new TextEncoder();
  let timer: ReturnType<typeof setTimeout> | undefined,
    closed = false,
    last = "";
  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, value: any) => {
        if (!closed)
          controller.enqueue(
            encoder.encode(
              `event: ${event}\ndata: ${JSON.stringify(value)}\n\n`,
            ),
          );
      };
      const snapshot = (value: any) => {
        const { generatedAt, ...content } = value,
          revision = digest(JSON.stringify(content));
        if (revision !== last) {
          last = revision;
          send("snapshot", { ...value, revision });
        } else send("heartbeat", { at: new Date().toISOString() });
      };
      const stop = () => {
        if (closed) return;
        closed = true;
        release();
        if (timer) clearTimeout(timer);
        try {
          controller.close();
        } catch {}
      };
      const tick = async () => {
        if (closed) return;
        try {
          snapshot(await dispatch("business.snapshot", token, filters));
        } catch (e) {
          send("revoked", {
            message:
              "Access changed or expired. Clear cached business data and sign in again.",
          });
          stop();
          return;
        }
        if (!closed) timer = setTimeout(tick, 5000);
      };
      req.signal.addEventListener("abort", stop, { once: true });
      snapshot(initial);
      timer = setTimeout(tick, 5000);
    },
    cancel() {
      closed = true;
      release();
      if (timer) clearTimeout(timer);
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
