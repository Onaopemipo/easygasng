import { NextRequest } from "next/server";
import { openTrackingStream } from "../../../../lib/tracking-stream";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const token =
    req.cookies.get("easygas_session")?.value ??
    req.headers.get("authorization")?.replace(/^Bearer /, "") ??
    null;
  try {
    const body = await openTrackingStream({
      token,
      orderId: req.nextUrl.searchParams.get("id"),
      signal: req.signal,
    });
    return new Response(body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "private, no-store, no-transform",
        Vary: "Cookie, Authorization",
        "X-Accel-Buffering": "no",
      },
    });
  } catch {
    return Response.json(
      {
        error:
          "Tracking unavailable. Sign in with access to these orders and retry.",
      },
      { status: 401 },
    );
  }
}
