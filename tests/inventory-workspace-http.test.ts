import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { fixture } from "./helpers/order-tracking-fixture";
import { GET, POST } from "../apps/web/app/api/[action]/route";
test("INV-017HTTP: read/export permissions, limits and mutation method boundary are enforced at HTTP", async () => {
  const f = await fixture();
  (globalThis as any).easygasDb = Promise.resolve(f.db);
  const context = (action: string) => ({ params: Promise.resolve({ action }) });
  try {
    const get = (action: string, token?: string, q = "") =>
      GET(
        new NextRequest("http://localhost:3003/api/" + action + "?" + q, {
          headers: token
            ? { authorization: "Bearer " + token, "x-easygas-client": "native" }
            : {},
        }),
        context(action),
      );
    assert.equal((await get("inventory.workspace")).status, 401);
    assert.equal(
      (await get("inventory.workspace", f.actors.customer.token)).status,
      403,
    );
    assert.equal(
      (await get("inventory.workspace", f.actors.owner.token, "page=10001"))
        .status,
      400,
    );
    for (let i = 0; i < 6; i++)
      assert.equal(
        (await get("inventory.export", f.actors.owner.token)).status,
        200,
      );
    assert.equal(
      (await get("inventory.export", f.actors.owner.token)).status,
      429,
    );
    const r = await POST(
      new NextRequest("http://localhost:3003/api/inventory.workspace", {
        method: "POST",
        headers: {
          authorization: "Bearer " + f.actors.owner.token,
          "x-easygas-client": "native",
          "content-type": "application/json",
        },
        body: "{}",
      }),
      context("inventory.workspace"),
    );
    assert.equal(r.status, 405);
  } finally {
    delete (globalThis as any).easygasDb;
    await f.db.close?.();
  }
});
