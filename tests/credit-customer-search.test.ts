import test from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./helpers/service-fixture";
import { id } from "../apps/web/lib/auth";
import { NextRequest } from "next/server";
import { GET, POST } from "../apps/web/app/api/[action]/route";
test("CREDIT-SEARCH01: authorised quick search matches names, email, phone and ID, excluding inactive/staff/cross-branch customers", async () => {
  const f = await fixture();
  try {
    const uid = f.actors.customer.id;
    await f.db.query(
      "UPDATE users SET name='Customer Search Fixture',contact_phone='+2348012345678' WHERE id=$1",
      [uid],
    );
    for (const q of ["Search Fixture", uid, "08012345678", "+2348012345678"]) {
      const r = await f.call("finance", "credit.customers", { q });
      assert.equal(r.length, 1);
      assert.equal(r[0].id, uid);
      assert.equal(r[0].credit_branch_id, "lagos");
      assert.ok(!("password_hash" in r[0]));
    }
    await f.db.query(
      "INSERT INTO account_addresses(id,customer_id,label,street,zone,phone) VALUES($1,$2,'Fixture','Synthetic fixture address','Ikoyi','08099999999')",
      [id(), uid],
    );
    assert.equal(
      (await f.call("finance", "credit.customers", { q: "08099999999" }))[0].id,
      uid,
    );
    const publicId = (await f.call("owner", "credit.customers", { q: uid }))[0]
      .public_customer_id;
    assert.equal(
      (await f.call("finance", "credit.customers", { q: publicId }))[0].id,
      uid,
    );
    await assert.rejects(
      () => f.call("technician", "credit.customers", { q: "Fixture" }),
      /permission|authori|access/i,
    );
    await assert.rejects(
      () => f.call("customer", "credit.customers", { q: "Fixture" }),
      /permission|authori|access/i,
    );
    await assert.rejects(() => f.call("owner", "credit.customers", { q: "a" }));
    await f.db.query(
      "INSERT INTO branches(id,name) VALUES('other','Other fixture branch')",
    );
    const other = id();
    await f.db.query(
      "INSERT INTO users(id,name,email,password_hash,role,branch_id) SELECT $1,'Other Search Fixture',$2,password_hash,'customer','other' FROM users WHERE id=$3",
      [other, other + "@example.test", uid],
    );
    assert.equal(
      (await f.call("finance", "credit.customers", { q: other })).length,
      0,
    );
    assert.equal(
      (await f.call("owner", "credit.customers", { q: other }))[0]
        .credit_branch_id,
      "other",
    );
    await assert.rejects(
      () =>
        f.call("finance", "credit.request", {
          customerId: other,
          amountKobo: 10000,
          receiptReference: "SEARCH-CROSS-BRANCH",
          reason: "Must reject customer ID tampering",
        }),
      /outside your authorised branch/,
    );
    await f.db.query("UPDATE users SET active=false WHERE id=$1", [uid]);
    assert.equal(
      (await f.call("owner", "credit.customers", { q: uid })).length,
      0,
    );
  } finally {
    await f.db.close?.();
  }
});
test("CREDIT-SELECT01: selected canonical account receives only a pending credit request; wallet and unrelated customers remain unchanged", async () => {
  const f = await fixture();
  try {
    const c = (
      await f.call("finance", "credit.customers", { q: f.actors.customer.id })
    )[0];
    const r = await f.call("finance", "credit.request", {
      customerId: c.id,
      branchId: c.credit_branch_id,
      amountKobo: 10000,
      receiptReference: "SEARCH-SELECTED-CUSTOMER",
      reason: "Fixture cash receipt requires independent verification",
    });
    const saved = (await f.call("finance", "credits")).find(
      (x: any) => x.id === r.id,
    );
    assert.equal(saved.customer_id, c.id);
    assert.equal(saved.branch_id, "lagos");
    assert.equal(saved.status, "pending");
    assert.equal((await f.call("customer", "wallet")).balanceKobo, 0);
    assert.equal((await f.call("commercial", "wallet")).balanceKobo, 0);
  } finally {
    await f.db.close?.();
  }
});
test("CREDIT-HTTP01: financial customer search is authenticated GET with strict validation and no POST mutation", async () => {
  const f = await fixture();
  (globalThis as any).easygasDb = Promise.resolve(f.db);
  const action = "credit.customers",
    ctx = { params: Promise.resolve({ action }) };
  try {
    const get = (role?: string) =>
      GET(
        new NextRequest("http://localhost:3003/api/" + action + "?q=customer", {
          headers: role
            ? { authorization: "Bearer " + f.actors[role].token }
            : {},
        }),
        ctx,
      );
    assert.equal((await get()).status, 401);
    assert.equal((await get("customer")).status, 403);
    assert.equal((await get("finance")).status, 200);
    assert.equal(
      (
        await POST(
          new NextRequest("http://localhost:3003/api/" + action, {
            method: "POST",
            headers: {
              "x-easygas-client": "native",
              "content-type": "application/json",
              authorization: "Bearer " + f.actors.finance.token,
            },
            body: "{}",
          }),
          ctx,
        )
      ).status,
      405,
    );
  } finally {
    delete (globalThis as any).easygasDb;
    await f.db.close?.();
  }
});

test("CREDIT-FORM01: real credit form submits selected canonical IDs as hidden fields and never asks staff to copy an ID", async () => {
  const React = await import("react");
  const { renderToStaticMarkup } = await import("react-dom/server");
  const { CustomerCreditRequestForm } = await import(
    "../apps/web/components/workflows"
  );
  const customer = {
    id: id(),
    name: "Fixture selected customer",
    email: "selected@example.test",
    contact_phone: null,
    public_customer_id: "EGC-FIXTURE",
    branch_id: "lagos",
    credit_branch_id: "lagos",
  };
  const html = renderToStaticMarkup(
    React.createElement(CustomerCreditRequestForm, {
      customer,
      onDone: () => {},
    }),
  );
  assert.match(
    html,
    new RegExp('name="customerId"[^>]*value="' + customer.id + '"'),
  );
  assert.match(html, /type="hidden"[^>]*name="branchId"[^>]*value="lagos"/);
  assert.ok(!html.includes("Customer account ID"));
  assert.ok(html.includes("Request independent verification"));
});
