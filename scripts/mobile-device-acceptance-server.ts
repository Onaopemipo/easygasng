/** Disposable loopback-only API for native acceptance. Never connects to an existing database. */
import { createServer } from "node:http";
import { writeFile,mkdir } from "node:fs/promises";
import { NextRequest } from "next/server";
import { GET, POST } from "../apps/web/app/api/[action]/route";
import { fixture } from "../tests/helpers/order-tracking-fixture";
import { fixture as serviceFixture } from "../tests/helpers/service-fixture";
import { hashPassword, id, issueSession } from "../apps/web/lib/auth";
import { one } from "../apps/web/lib/db";
const evidenceDirectory=process.env.NATIVE_ACCEPTANCE_EVIDENCE_DIR||"docs/mobile-device-acceptance/evidence";
await mkdir(evidenceDirectory,{recursive:true});
const port = Number(process.env.NATIVE_ACCEPTANCE_PORT || 3107);
if (process.env.DATABASE_URL || process.env.NODE_ENV === "production")
  throw Error(
    "Disposable device acceptance refuses external/production DB configuration",
  );
process.env.APP_URL = "http://127.0.0.1:" + port;
if (!Number.isInteger(port) || port < 1024)
  throw Error("Use an unprivileged loopback port.");
const services = await serviceFixture(),
  f = await fixture(services.db),
  password = "Native-device-fixture-123!";
f.actors.owner = services.actors.owner;
f.actors.manager = services.actors.service_manager;
f.actors.dispatcher = f.actors.manager;
f.actors.finance = services.actors.finance;
f.actors.technician = services.actors.technician;
f.actors.customer = services.actors.customer;
f.actors.commercial = services.actors.commercial;
// Qualified independent reviewers exist only in this discarded fixture; this does not add business owners to the client demo.
await f.db.query(
  "UPDATE technician_qualifications SET expires_at=now()+interval '2 hours'",
);
for (const role of [
  "owner",
  "manager",
  "finance",
  "driver",
  "technician",
  "customer",
  "commercial",
]) {
  await f.db.query(
    "UPDATE users SET name=$1,email=$2,password_hash=$3 WHERE id=$4",
    [
      "Native QA " + role,
      role + "@native.example.test",
      hashPassword(password),
      f.actors[role].id,
    ],
  );
  if (["owner", "manager", "finance"].includes(role))
    await f.call(role, "reauth", { password });
}
await f.db.query(
  "UPDATE service_slots SET starts_at=now()+interval '20 minutes',ends_at=now()+interval '80 minutes'",
);
const booking = await f.call("customer", "booking.create", services.input());
for (const status of ["confirmed", "assigned"])
  await f.call("manager", "booking.transition", {
    bookingId: booking.id,
    status,
    reason: "Synthetic QA only technician assignment",
  });
const order = await f.assigned();
await f.db.exec("UPDATE settings SET value='true' WHERE key='wallet.enabled'");
const refundOrders: Record<string, any> = {};
for (const role of ["customer", "commercial"]) {
  await f.db.query(
    "INSERT INTO wallet_entries(id,customer_id,amount_kobo,kind,reference) VALUES($1,$2,50000000,'cash_funding',$1)",
    [id(), f.actors[role].id],
  );
  const made = await f.call(role, "checkout", {
    items: [{ productId: "hose", quantity: 3 }],
    address: {
      name: "Synthetic device QA " + role,
      phone: "08012345678",
      street: "12 Synthetic Device QA Street",
      zone: "Lekki",
    },
    date: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
    window: "14:00–18:00",
    paymentMethod: "wallet",
    idempotencyKey: id(),
  });
  // Fixture label only: no physical fulfilment was performed or certified.
  await f.db.query("UPDATE orders SET status='delivered' WHERE id=$1", [
    made.id,
  ]);
  refundOrders[role] = made;
}
await f.db.query(
  "INSERT INTO notifications(id,user_id,title,body) VALUES($1,$2,'Synthetic device QA notification','Disposable on-device acceptance notification only')",
  [id(), f.actors.customer.id],
);
let fault: { action: string; mode: string; remaining: number } | null = null;
const requests: any[] = [];

(globalThis as any).easygasDb = Promise.resolve(f.db);
const evidence = {
  startedAt: new Date().toISOString(),
  mode: "Disposable PGlite memory database; real API dispatcher; no provider or physical fulfilment",
  roles: [
    "owner",
    "manager",
    "finance",
    "driver",
    "technician",
    "customer",
    "commercial",
  ],
  refundOrders: Object.fromEntries(
    Object.entries(refundOrders).map(([r, o]) => [
      r,
      { id: o.id, reference: o.reference },
    ]),
  ),
  orderReference: order.reference,
  bookingReference: booking.reference,
  port,
};
await writeFile(
  evidenceDirectory+"/fixture.json",
  JSON.stringify(evidence, null, 2) + "\n",
);
const server = createServer(async (req, res) => {
  try {
    if (req.url === "/qa/control" && req.method === "POST") {
      let body = "";
      for await (const part of req) body += part;
      const d = JSON.parse(body);
      if (d.mode === "clear") fault = null;
      else fault = { action: d.action, mode: d.mode, remaining: 1 };
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ ok: true }));
      return;
    }
    if (req.url === "/qa/readback") {
      const refunds = (
        await f.db.query(
          "SELECT id,customer_id,order_id,amount_kobo,status,requested_by,decided_by,reason FROM credit_requests WHERE kind='refund' ORDER BY created_at",
        )
      ).rows;
      const balances = (
        await f.db.query(
          "SELECT customer_id,sum(amount_kobo)::text AS balance FROM wallet_entries GROUP BY customer_id",
        )
      ).rows;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ refunds, balances, requests }));
      return;
    }
    if (req.url === "/launch") {
      res.setHeader("content-type", "text/html");
      res.end('<html><meta name="viewport" content="width=device-width, initial-scale=1"><body><h1>EasyGas native acceptance</h1><p>Disposable synthetic QA only.</p><a style="font-size:24px" href="exp://127.0.0.1:8083">Open updated EasyGas in Expo Go</a></body></html>');
      return;
    }
    if (req.url === "/health") {
      res.setHeader("content-type", "application/json");
      res.end(
        JSON.stringify({ status: "ready", mode: "isolated-native-acceptance" }),
      );
      return;
    }
    const parsed = new URL(req.url || "/", `http://127.0.0.1:${port}`),
      action = decodeURIComponent(parsed.pathname.replace(/^\/api\//, ""));
    if (
      !parsed.pathname.startsWith("/api/") ||
      !["GET", "POST"].includes(req.method || "")
    ) {
      res.statusCode = 404;
      res.end();
      return;
    }
    let body = "";
    for await (const chunk of req) {
      body += chunk;
      if (body.length > 2000000) throw Error("Request too large");
    }
    const headers = new Headers();
    for (const [k, v] of Object.entries(req.headers))
      if (v) headers.set(k, Array.isArray(v) ? v.join(",") : v);
    const request = new NextRequest(parsed, {
      method: req.method,
      headers,
      ...(req.method === "POST" ? { body: body || "{}" } : {}),
    });
    const activeFault =
      fault?.action === action && fault.remaining > 0 ? fault : null;
    if (activeFault) {
      activeFault.remaining--;
      if (activeFault.mode === "before") {
        requests.push({
          action,
          method: req.method,
          status: 503,
          fault: "before",
        });
        res.statusCode = 503;
        res.setHeader("content-type", "application/json");
        res.end(
          JSON.stringify({
            error:
              "Synthetic QA connection unavailable. Retry unchanged details.",
          }),
        );
        return;
      }
    }
    const response = await (req.method === "GET" ? GET : POST)(request, {
      params: Promise.resolve({ action }),
    });
    requests.push({
      action,
      method: req.method,
      status: response.status,
      ...(activeFault ? { fault: activeFault.mode } : {}),
    });
    await writeFile(
      evidenceDirectory+"/api-requests.json",
      JSON.stringify(requests, null, 2) + "\n",
    );
    if (activeFault?.mode === "after") {
      res.statusCode = 503;
      res.setHeader("content-type", "application/json");
      res.end(
        JSON.stringify({
          error: "Synthetic QA uncertain response. Retry unchanged details.",
        }),
      );
      return;
    }
    res.statusCode = response.status;
    response.headers.forEach((v, k) => res.setHeader(k, v));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (e: any) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: e.message }));
  }
});
server.listen(port, "127.0.0.1", () =>
  console.log(
    "Native acceptance API ready on loopback " +
      port +
      " with disposable fixtures.",
  ),
);
async function stop() {
  server.close();
  delete (globalThis as any).easygasDb;
  await f.db.close?.();
  process.exit(0);
}
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
