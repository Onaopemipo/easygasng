import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { GET, POST } from "../apps/web/app/api/[action]/route";
import { fixture } from "./helpers/order-tracking-fixture";
import { id } from "../apps/web/lib/auth";
test("CRM-HTTP01: summary and paged follow-ups use actual authenticated GET handlers; mutations and private reads remain separated", async () => {
  const f = await fixture();
  const g = globalThis as any,
    old = g.easygasDb,
    version = g.easygasLocalVersion,
    jobs = process.env.EASYGAS_BACKGROUND_JOBS;
  try {
    g.easygasDb = Promise.resolve(f.db);
    g.easygasLocalVersion = 73;
    process.env.EASYGAS_BACKGROUND_JOBS = "false";
    await f.db.query(
      "INSERT INTO crm_followups(id,customer_id,branch_id,owner_id,next_action,due_at,created_by) VALUES($1,$2,'lagos',$3,'Synthetic HTTP follow-up',now(),$3)",
      [id(), f.actors.customer.id, f.actors.owner.id],
    );
    for (const action of ["crm.summary", "crm.followups"]) {
      const r = await GET(
        new NextRequest(
          `http://localhost:3003/api/${action}?q=Synthetic&limit=1`,
          { headers: { authorization: "Bearer " + f.actors.owner.token } },
        ),
        { params: Promise.resolve({ action }) },
      );
      assert.equal(r.status, 200);
      assert.match(r.headers.get("cache-control")!, /no-store/);
      assert.equal((await r.json()).followups.length, 1);
      const foreign = await GET(
        new NextRequest(`http://localhost:3003/api/${action}`, {
          headers: { authorization: "Bearer " + f.actors.customer.token },
        }),
        { params: Promise.resolve({ action }) },
      );
      assert.equal(foreign.status, 403);
      const post = await POST(
        new NextRequest(`http://localhost:3003/api/${action}`, {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-easygas-client": "native",
            authorization: "Bearer " + f.actors.owner.token,
          },
          body: "{}",
        }),
        { params: Promise.resolve({ action }) },
      );
      assert.equal(post.status, 405);
    }
  } finally {
    g.easygasDb = old;
    g.easygasLocalVersion = version;
    if (jobs === undefined) delete process.env.EASYGAS_BACKGROUND_JOBS;
    else process.env.EASYGAS_BACKGROUND_JOBS = jobs;
    await f.db.close?.();
  }
});
