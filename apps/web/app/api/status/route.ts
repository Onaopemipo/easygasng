import { NextResponse } from "next/server";
import { getDb } from "../../../lib/db";
import { operationalHealth } from "../../../lib/release-checks";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Generic status only: never disclose role, schema, incidents or credentials publicly.
export async function GET() {
  let ready = false;
  try {
    ready = await (await getDb()).transaction((tx) => operationalHealth(tx));
  } catch {}
  return NextResponse.json(
    { status: ready ? "ready" : "unavailable" },
    {
      status: ready ? 200 : 503,
      headers: { "Cache-Control": "no-store, max-age=0" },
    },
  );
}
