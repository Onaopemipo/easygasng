import { NextRequest, NextResponse } from "next/server";
import { phoneOrderHttp } from "../../../../lib/phone-order-http";
export const runtime = "nodejs";
export const POST = (
  req: NextRequest,
  ctx: { params: Promise<{ operation: string }> },
) => phoneOrderHttp(req, ctx);
export async function GET() {
  return NextResponse.json(
    { error: "Use the private order link." },
    { status: 405, headers: { "Cache-Control": "no-store" } },
  );
}
