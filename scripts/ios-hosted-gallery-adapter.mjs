// Simulator-only test transport. Never deploy or use for actual delivery evidence.
import { createServer } from "node:http";
import fs from "node:fs/promises";
import assert from "node:assert/strict";
assert.notEqual(
  process.env.NODE_ENV,
  "production",
  "Simulator test transport must never run in production",
);
const root = process.argv[2];
assert(root?.endsWith("/Easygas Smart Solution"));
const fixture = JSON.parse(
  await fs.readFile(root + "/.data/hosted-daily-flow-ios/state.json", "utf8"),
);
assert(
  fixture.branch.startsWith("qa-ios-") &&
    fixture.tag.startsWith("SANDBOX ONLY"),
);
const base = "https://easygas-client-demo.vercel.app",
  known = new Set(),
  records = [];
const evidence = root + "/.data/ios-hosted-flow/gallery-adapter-requests.json";
const allowed = new Set([
  "me",
  "login",
  "driver.login",
  "logout",
  "driver.restrict",
  "orders",
  "driver.snapshot",
  "notifications.list",
  "driver.heartbeat",
  "driver.history",
  "driver.depart",
  "driver.arrive",
  "driver.complete",
  "dispatch.respond",
  "daily.refill.record",
  "delivery.photos",
  "media",
  "status",
]);
createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://127.0.0.1:3198"),
      action = url.pathname.slice(5);
    if (!url.pathname.startsWith("/api/") || !allowed.has(action))
      throw Object.assign(Error("QA adapter endpoint not allowed"), {
        status: 403,
      });
    const chunks = [];
    let size = 0;
    for await (const c of req) {
      size += c.length;
      if (size > 8000000) throw Error("QA body too large");
      chunks.push(c);
    }
    const body = Buffer.concat(chunks);
    const token = req.headers.authorization;
    if (["login", "driver.login"].includes(action)) {
      const input = JSON.parse(body);
      if (input.identifier !== fixture.actors.today.email)
        throw Object.assign(Error("Only generated QA driver sign-in allowed"), {
          status: 403,
        });
    } else if (action !== "status") {
      if (!token?.startsWith("Bearer "))
        throw Object.assign(Error("QA driver session required"), {
          status: 401,
        });
      if (!known.has(token)) {
        const response = await fetch(base + "/api/me", {
          headers: { authorization: token, "x-easygas-client": "native" },
          signal: AbortSignal.timeout(45000),
        });
        const me = await response.json();
        if (
          !response.ok ||
          me.user?.id !== fixture.actors.today.id ||
          (me.user.branchId ?? me.user.branch_id) !== fixture.branch
        )
          throw Object.assign(Error("Only generated QA driver is permitted"), {
            status: 403,
          });
        known.add(token);
      }
    }
    const headers = {
      origin: base,
      "x-easygas-client": "native",
      ...(token ? { authorization: token } : {}),
      ...(req.headers["content-type"]
        ? { "content-type": req.headers["content-type"] }
        : {}),
    };
    const upstream = await fetch(base + url.pathname + url.search, {
      method: req.method,
      headers,
      ...(body.length ? { body } : {}),
      signal: AbortSignal.timeout(45000),
    });
    let bytes = Buffer.from(await upstream.arrayBuffer()),
      adapted = false;
    if (action === "driver.snapshot" && upstream.ok) {
      const snapshot = JSON.parse(bytes);
      assert.equal(
        snapshot.profile.user_id ??
          snapshot.profile.id ??
          fixture.actors.today.id,
        fixture.actors.today.id,
      );
      snapshot.galleryApproved = true;
      bytes = Buffer.from(JSON.stringify(snapshot));
      adapted = true;
    }
    if (action === "logout") known.delete(token);
    records.push({
      action,
      method: req.method,
      status: upstream.status,
      galleryApprovalForGeneratedTestDriver: adapted,
      at: new Date().toISOString(),
    });
    await fs.writeFile(evidence, JSON.stringify(records, null, 2));
    res.writeHead(upstream.status, {
      "content-type":
        upstream.headers.get("content-type") ?? "application/json",
      "cache-control": "private, no-store",
    });
    res.end(bytes);
  } catch (e) {
    res.writeHead(e.status ?? 502, {
      "content-type": "application/json",
      "cache-control": "no-store",
    });
    res.end(JSON.stringify({ error: e.message }));
  }
}).listen(3198, "127.0.0.1", () =>
  console.log(
    "QA gallery adapter on loopback3198; only generated QA driver; all writes forwarded to existing demo",
  ),
);
