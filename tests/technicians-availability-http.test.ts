import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { fixture } from "./helpers/service-fixture";
import { GET, POST } from "../apps/web/app/api/[action]/route";
test("TAV-HTTP: directory uses bounded authenticated GET, rejects field access and POST, and enforces branch scope", async () => {
  const f = await fixture();
  (globalThis as any).easygasDb = Promise.resolve(f.db);
  const action = "technicians.workspace",
    context = { params: Promise.resolve({ action }) };
  try {
    const get = (role?: string, q = "") =>
      GET(
        new NextRequest("http://localhost:3003/api/" + action + "?" + q, {
          headers: role
            ? {
                authorization: "Bearer " + f.actors[role].token,
                "x-easygas-client": "native",
              }
            : {},
        }),
        context,
      );
    assert.equal((await get()).status, 401);
    assert.equal((await get("technician")).status, 403);
    assert.equal((await get("customer")).status, 403);
    assert.equal((await get("service_manager", "branchId=other")).status, 403);
    assert.equal((await get("owner", "page=0")).status, 400);
    const r = await get("owner", "page=1&status=active");
    assert.equal(r.status, 200);
    assert.equal((await r.json()).summary.active, 1);
    assert.equal(
      (
        await POST(
          new NextRequest("http://localhost:3003/api/" + action, {
            method: "POST",
            headers: {
              authorization: "Bearer " + f.actors.owner.token,
              "x-easygas-client": "native",
              "content-type": "application/json",
            },
            body: "{}",
          }),
          context,
        )
      ).status,
      405,
    );
    await f.db.query(
      "UPDATE auth_attempts SET attempts=120 WHERE key IS NOT NULL",
    );
    assert.equal((await get("owner")).status, 429);
  } finally {
    delete (globalThis as any).easygasDb;
    await f.db.close?.();
  }
});
