import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { fixture } from "./helpers/order-tracking-fixture";
import { GET, POST } from "../apps/web/app/api/[action]/route";
test("BULK-HTTP01: actual read handler enforces GET, authentication, staff/driver scope and disabled release configuration", async () => {
  const f = await fixture(),
    previous = process.env.EASYGAS_BULK_LPG_ENABLED;
  (globalThis as any).easygasDb = Promise.resolve(f.db);
  process.env.EASYGAS_BULK_LPG_ENABLED = "false";
  const context = { params: Promise.resolve({ action: "bulk.summary" }) };
  const request = (token?: string) =>
    new NextRequest("http://localhost:3003/api/bulk.summary", {
      headers: token
        ? { authorization: "Bearer " + token, "x-easygas-client": "native" }
        : {},
    });
  try {
    assert.equal((await GET(request(), context)).status, 401);
    assert.equal(
      (await GET(request(f.actors.customer.token), context)).status,
      403,
    );
    for (const role of ["owner", "driver", "inventory"]) {
      const response = await GET(request(f.actors[role].token), context);
      assert.equal(response.status, 200);
      const body = await response.json();
      assert.equal(body.enabled, false);
      assert.deepEqual(body.loads, []);
    }
    const response = await POST(
      new NextRequest("http://localhost:3003/api/bulk.summary", {
        method: "POST",
        headers: {
          authorization: "Bearer " + f.actors.owner.token,
          "x-easygas-client": "native",
          "content-type": "application/json",
        },
        body: "{}",
      }),
      context,
    );
    assert.equal(response.status, 405);
    assert.equal(
      Number(
        (await f.db.query("SELECT count(*) n FROM bulk_lpg_loads")).rows[0].n,
      ),
      0,
    );
  } finally {
    delete (globalThis as any).easygasDb;
    if (previous === undefined) delete process.env.EASYGAS_BULK_LPG_ENABLED;
    else process.env.EASYGAS_BULK_LPG_ENABLED = previous;
    await f.db.close?.();
  }
});
