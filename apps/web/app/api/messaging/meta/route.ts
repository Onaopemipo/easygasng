import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import {
  verifyMetaSignature,
  recordMetaWebhook,
} from "../../../../lib/channel-messaging";
import { getDb } from "../../../../lib/db";
export const runtime = "nodejs";
export async function GET(req: NextRequest) {
  const s = process.env.META_WEBHOOK_VERIFY_TOKEN,
    t = req.nextUrl.searchParams.get("hub.verify_token") ?? "";
  if (
    !s ||
    s.length < 24 ||
    Buffer.byteLength(s) !== Buffer.byteLength(t) ||
    !timingSafeEqual(Buffer.from(s), Buffer.from(t)) ||
    req.nextUrl.searchParams.get("hub.mode") !== "subscribe"
  )
    return new NextResponse("Forbidden", { status: 403 });
  return new NextResponse(req.nextUrl.searchParams.get("hub.challenge") ?? "", {
    headers: { "Cache-Control": "no-store" },
  });
}
export async function POST(req: NextRequest) {
  const secret = process.env.META_APP_SECRET;
  if (!secret) return new NextResponse("Not configured", { status: 503 });
  const reader = req.body?.getReader();
  if (!reader) return new NextResponse("Bad request", { status: 400 });
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  while (true) {
    const r = await reader.read();
    if (r.done) break;
    bytes += r.value.length;
    if (bytes > 256000) {
      await reader.cancel();
      return new NextResponse("Too large", { status: 413 });
    }
    chunks.push(r.value);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (
    !verifyMetaSignature(
      raw,
      req.headers.get("x-hub-signature-256") ?? "",
      secret,
    )
  )
    return new NextResponse("Forbidden", { status: 403 });
  try {
    const body = JSON.parse(raw),
      db = await getDb();
    return NextResponse.json(
      await db.transaction((tx) => recordMetaWebhook(tx, body)),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return new NextResponse("Webhook could not be processed", { status: 400 });
  }
}
