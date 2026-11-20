/** Disposable loopback-only API for native acceptance. Never connects to an existing database. */
import { createServer } from "node:http";
import { writeFile } from "node:fs/promises";
import { NextRequest } from "next/server";
import { GET, POST } from "../apps/web/app/api/[action]/route";
import { fixture } from "../tests/helpers/order-tracking-fixture";
import { fixture as serviceFixture } from "../tests/helpers/service-fixture";
import { hashPassword, id, issueSession } from "../apps/web/lib/auth";
import { one } from "../apps/web/lib/db";
const port = Number(process.env.NATIVE_ACCEPTANCE_PORT || 3106);
process.env.APP_URL='http://127.0.0.1:'+port;
if (!Number.isInteger(port) || port < 1024)
  throw Error("Use an unprivileged loopback port.");
const services = await serviceFixture(),
  f = await fixture(services.db),
  password = "Native-fixture-only-123!";
f.actors.owner = services.actors.owner;
f.actors.manager = services.actors.service_manager;
f.actors.dispatcher = f.actors.manager;
f.actors.finance = services.actors.finance;
f.actors.technician = services.actors.technician;
f.actors.customer = services.actors.customer;
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
(globalThis as any).easygasDb = Promise.resolve(f.db);
const evidence = {
  startedAt: new Date().toISOString(),
  mode: "Disposable PGlite memory database; real API dispatcher; no provider or physical fulfilment",
  roles: ["owner", "manager", "finance", "driver", "technician", "customer"],
  orderReference: order.reference,
  bookingReference: booking.reference,
  port,
};
await writeFile(
  "docs/native-workflows/evidence/simulator-fixture.json",
  JSON.stringify(evidence, null, 2) + "\n",
);
const server = createServer(async (req, res) => {
  try {
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
    const response = await (req.method === "GET" ? GET : POST)(request, {
      params: Promise.resolve({ action }),
    });
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
