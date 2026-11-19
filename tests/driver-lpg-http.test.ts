import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { fixture } from "./helpers/order-tracking-fixture";
import { GET, POST } from "../apps/web/app/api/[action]/route";
import { id } from "../apps/web/lib/auth";
test("DLPG-HTTP01: actual cylinder discovery read handler permits scoped staff GET and rejects public, customer and POST access", async () => {
  const f = await fixture();
  (globalThis as any).easygasDb = Promise.resolve(f.db);
  try {
    const o = await f.make(),
      line = id();
    await f.db.query(
      "INSERT INTO order_gas_lines(id,order_id,capacity_grams,grams,unit_price_kobo,subtotal_kobo,pricing_version) VALUES($1,$2,6000,6000,180000,1080000,1)",
      [line, o.id],
    );
    const context = { params: Promise.resolve({ action: "gas.cylinders" }) };
    const read = (token?: string) =>
      new NextRequest(
        "http://localhost:3003/api/gas.cylinders?lineId=" + line,
        {
          headers: token
            ? { authorization: "Bearer " + token, "x-easygas-client": "native" }
            : {},
        },
      );
    assert.equal((await GET(read(), context)).status, 401);
    assert.equal(
      (await GET(read(f.actors.customer.token), context)).status,
      403,
    );
    assert.equal((await GET(read(f.actors.owner.token), context)).status, 200);
    const post = await POST(
      new NextRequest("http://localhost:3003/api/gas.cylinders", {
        method: "POST",
        headers: {
          authorization: "Bearer " + f.actors.owner.token,
          "x-easygas-client": "native",
          "content-type": "application/json",
        },
        body: JSON.stringify({ lineId: line }),
      }),
      context,
    );
    assert.equal(post.status, 405);
  } finally {
    delete (globalThis as any).easygasDb;
    await f.db.close?.();
  }
});

test("DLPG-HTTP02: actual registration POST preserves reauthentication and canonical operation replay without duplicating cylinder IDs", async () => {
  const f = await fixture();
  (globalThis as any).easygasDb = Promise.resolve(f.db);
  try {
    const o = await f.make(),
      line = id();
    await f.db.query(
      "INSERT INTO order_gas_lines(id,order_id,capacity_grams,grams,unit_price_kobo,subtotal_kobo,pricing_version) VALUES($1,$2,6000,6000,180000,1080000,1)",
      [line, o.id],
    );
    const context = {
      params: Promise.resolve({ action: "gas.cylinder.intake" }),
    };
    const body = {
      lineId: line,
      serial: "HTTP-MARKED-" + id(),
      sizeKg: 6,
      testDue: "2030-01-01",
      reason: "Synthetic documented physical cylinder intake",
      operationKey: id(),
    };
    const post = () =>
      POST(
        new NextRequest("http://localhost:3003/api/gas.cylinder.intake", {
          method: "POST",
          headers: {
            authorization: "Bearer " + f.actors.owner.token,
            "x-easygas-client": "native",
            "content-type": "application/json",
          },
          body: JSON.stringify(body),
        }),
        context,
      );
    let r = await post();
    assert.equal(r.status, 403);
    assert.equal((await r.json()).code, "REAUTH_REQUIRED");
    await f.call("owner", "reauth", { password: "Tracking-fixture-only-123!" });
    r = await post();
    assert.equal(r.status, 200);
    const first = await r.json();
    r = await post();
    assert.equal(r.status, 200);
    assert.equal((await r.json()).id, first.id);
    assert.equal(
      (
        await f.db.query("SELECT id FROM cylinders WHERE serial=$1", [
          body.serial,
        ])
      ).rows.length,
      1,
    );
  } finally {
    delete (globalThis as any).easygasDb;
    await f.db.close?.();
  }
});
