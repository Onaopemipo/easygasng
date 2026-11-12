import { NextResponse } from "next/server";
import { getDb } from "../../../lib/db";
import {
  isHostedClientDemo,
  operationalHealth,
  schemaReady,
} from "../../../lib/release-checks";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Generic status only: never disclose role, schema, incidents or credentials publicly.
export async function GET() {
  const demo = isHostedClientDemo(process.env);
  let ready = false;
  try {
    ready = await (await getDb()).transaction((tx) =>
      demo ? schemaReady(tx) : operationalHealth(tx),
    );
  } catch {}
  return NextResponse.json(
    { status: ready ? "ready" : "unavailable", ...(demo && { scope: "demo" }) },
    {
      status: ready ? 200 : 503,
      headers: { "Cache-Control": "no-store, max-age=0" },
    },
  );
}
