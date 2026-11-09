import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { fixture } from "./helpers/order-tracking-fixture";
import { GET, POST } from "../apps/web/app/api/[action]/route";
const context = (action: string) => ({ params: Promise.resolve({ action }) });
test("ADM-HTTP18: admin reads enforce authentication, read-only HTTP methods and a persistent per-user search budget", async () => {
  const f = await fixture();
  (globalThis as any).easygasDb = Promise.resolve(f.db);
  try {
    const get = (action: string, query: string, token?: string) =>
      GET(
        new NextRequest("http://localhost:3003/api/" + action + "?" + query, {
          headers: token
            ? { authorization: "Bearer " + token, "x-easygas-client": "native" }
            : {},
        }),
        context(action),
      );
    assert.equal((await get("admin.search", "q=customer")).status, 401);
    assert.equal(
      (await get("admin.search", "q=customer", f.actors.customer.token)).status,
      403,
    );
    const start = performance.now();
    for (let i = 0; i < 60; i++)
      assert.equal(
        (await get("admin.search", "q=customer", f.actors.owner.token)).status,
        200,
      );
    assert.equal(
      (await get("admin.search", "q=customer", f.actors.owner.token)).status,
      429,
    );
    assert.equal(
      (await get("admin.search", "q=customer", f.actors.dispatcher.token))
        .status,
      200,
    );
    const response = await POST(
      new NextRequest("http://localhost:3003/api/admin.dashboard", {
        method: "POST",
        headers: {
          authorization: "Bearer " + f.actors.owner.token,
          "x-easygas-client": "native",
          "content-type": "application/json",
        },
        body: "{}",
      }),
      context("admin.dashboard"),
    );
    assert.equal(response.status, 405);
    console.log(
      "Admin isolated HTTP search60 request total ms:",
      Math.round(performance.now() - start),
    );
  } finally {
    delete (globalThis as any).easygasDb;
    await f.db.close?.();
  }
});
