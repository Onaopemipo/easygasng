/** Disposable loopback-only daily delivery acceptance. Never deploy this fixture. */
import "next/dist/server/node-environment.js";
import { createServer } from "node:http";
import { mkdir, writeFile } from "node:fs/promises";
import { NextRequest } from "next/server";
import { GET, POST } from "../apps/web/app/api/[action]/route";
import { POST as media } from "../apps/web/app/api/media/route";
import { setup } from "../tests/helpers/daily-delivery-fixture";
import { one, localSchemaRevision } from "../apps/web/lib/db";
if (process.env.DATABASE_URL || process.env.NODE_ENV === "production")
  throw Error("Disposable loopback QA only");
const f = await setup();
const day = await f.start(),
  order = await f.make();
for (const status of ["accepted", "preparing", "assigned"])
  await f.transition(order, status);
if (process.env.EASYGAS_QA_UNLINKED === "true") {
  await f.db.query(
    "UPDATE daily_delivery_allocations SET state='released' WHERE order_id=$1",
    [order.id],
  );
  await f.db.query(
    "UPDATE daily_delivery_runs SET committed_grams=committed_grams-6000,version=version+1 WHERE id=$1",
    [day.id],
  );
  await f.db.query(
    "UPDATE gas_stock SET reserved_grams=reserved_grams+6000 WHERE branch_id='lagos'",
  );
}

process.env.APP_URL = "http://127.0.0.1:3167";
process.env.EASYGAS_DRIVER_GALLERY_APPROVED = "true";
(globalThis as any).easygasDb = Promise.resolve(f.db);
(globalThis as any).easygasLocalVersion = localSchemaRevision;
const evidence = "docs/daily-delivery/evidence/ios-daily";
await mkdir(evidence, { recursive: true });
const requests: any[] = [];
let failUpload = false;
async function state() {
  return {
    order: await f.snapshot(order.id),
    day: await f.summary(),
    stock: await one(
      f.db,
      "SELECT grams,reserved_grams FROM gas_stock WHERE branch_id='lagos'",
    ),
    trip: await one(f.db, "SELECT ended_at FROM driver_trips WHERE id=$1", [
      (await f.summary()).trip_id,
    ]),
    refills: (
      await f.db.query(
        "SELECT readings,supplied_grams,recorded_at FROM daily_delivery_refills WHERE order_id=$1",
        [order.id],
      )
    ).rows,
    photos: (
      await f.db.query(
        "SELECT alt,consent,octet_length(data) bytes,created_at FROM delivery_photos WHERE order_id=$1",
        [order.id],
      )
    ).rows,
    legacyLoads: Number(
      (await one(f.db, "SELECT count(*) n FROM bulk_lpg_loads"))?.n,
    ),
    legacyMeters: Number(
      (await one(f.db, "SELECT count(*) n FROM bulk_lpg_meters"))?.n,
    ),
    requests,
  };
}
createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", process.env.APP_URL);
    res.setHeader("Cache-Control", "no-store");
    if (url.pathname === "/qa/session") {
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          user: (await f.call("driver", "me")).user,
          token: f.actors.driver.token,
        }),
      );
      return;
    }
    if (url.pathname === "/qa/state") {
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify(await state()));
      return;
    }
    if (url.pathname === "/qa/reserve" && req.method === "POST") {
      await f.run("owner", "daily.order.attach", {
        orderId: order.id,
        version: (await f.snapshot(order.id)).tracking_version,
      });
      res.end("{}");
      return;
    }
    if (url.pathname === "/qa/fail-upload" && req.method === "POST") {
      failUpload = true;
      res.end("{}");
      return;
    }
    if (url.pathname === "/qa/evidence" && req.method === "POST") {
      await writeFile(
        evidence + "/server-readback.json",
        JSON.stringify(await state(), null, 2),
      );
      res.end("{}");
      return;
    }
    if (!url.pathname.startsWith("/api/")) {
      res.statusCode = 404;
      res.end();
      return;
    }
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const c of req) {
      size += c.length;
      if (size > 9 * 1024 * 1024) throw Error("Upload too large");
      chunks.push(Buffer.from(c));
    }
    const body = Buffer.concat(chunks),
      headers = new Headers();
    for (const [k, v] of Object.entries(req.headers))
      if (v) headers.set(k, Array.isArray(v) ? v.join(",") : v);
    const request = new NextRequest(url, {
        method: req.method,
        headers,
        ...(body.length ? { body } : {}),
        duplex: "half",
      } as any),
      action = decodeURIComponent(url.pathname.slice(5));
    let response: Response;
    if (action === "media" && failUpload) {
      failUpload = false;
      response = Response.json(
        { error: "Synthetic first upload unavailable" },
        { status: 503 },
      );
    } else
      response =
        action === "media"
          ? await media(request)
          : await (req.method === "POST" ? POST : GET)(request, {
              params: Promise.resolve({ action }),
            });
    const bytes = Buffer.from(await response.arrayBuffer());
    requests.push({
      action,
      status: response.status,
      at: new Date().toISOString(),
      ...(req.method === "POST" && action !== "media"
        ? { input: JSON.parse(body.toString() || "{}") }
        : {}),
      ...(response.status >= 400 ? { error: bytes.toString() } : {}),
    });
    res.statusCode = response.status;
    response.headers.forEach((v, k) => res.setHeader(k, v));
    res.end(bytes);
  } catch (e: any) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: e.message }));
  }
}).listen(3167, "127.0.0.1", () =>
  console.log(
    "Disposable daily iOS API ready on3167; " +
      order.reference +
      "; no legacy meter/load records.",
  ),
);
