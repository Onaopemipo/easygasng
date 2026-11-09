import test from "node:test";
import assert from "node:assert/strict";
import { fixture } from "./helpers/order-tracking-fixture";
import { id } from "../apps/web/lib/auth";
import {
  notificationTarget,
  lagosDay,
} from "../packages/business-rules/src/customer-mobile";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
test("CUI-DATA: physical cylinders and issued invoices are canonical, owned, read-only and reject staff/identity injection", async () => {
  const f = await fixture();
  try {
    for (const role of ["customer", "customer", "commercial"])
      await f.db.query(
        "INSERT INTO cylinders(id,branch_id,serial,size_kg,ownership,status,test_due,customer_id) VALUES($1,'lagos',$1,12.5,'customer','inspection_due','2027-01-01',$2)",
        [id(), f.actors[role].id],
      );
    const mine = await f.call("customer", "customer.dashboard", {
      widget: "cylinders",
    });
    const other = await f.call("commercial", "customer.dashboard", {
      widget: "cylinders",
    });
    assert.equal(mine.length, 2);
    assert.equal(new Set(mine.map((c: any) => c.id)).size, 2);
    assert.equal(other.length, 1);
    assert.notEqual(mine[0].id, other[0].id);
    assert.equal(mine[0].status, "inspection_due");
    await assert.rejects(() =>
      f.call("driver", "customer.dashboard", { widget: "cylinders" }),
    );
    await assert.rejects(() =>
      f.call("customer", "customer.dashboard", {
        widget: "cylinders",
        customerId: f.actors.commercial.id,
      }),
    );
    const order = await f.make();
    await f.db.query(
      "INSERT INTO customer_invoices(id,order_id,customer_id,branch_id,total_kobo,snapshot,issued_by) VALUES($1,$2,$3,'lagos',$4,'{}',$5)",
      [
        id(),
        order.id,
        f.actors.customer.id,
        order.totalKobo ?? 350000,
        f.actors.owner.id,
      ],
    );
    const docs = await f.call("customer", "customer.dashboard", {
      widget: "invoices",
    });
    assert.equal(docs.length, 1);
    assert.equal(docs[0].order_id, order.id);
    assert.ok(docs[0].issued_at);
    assert.deepEqual(
      await f.call("commercial", "customer.dashboard", { widget: "invoices" }),
      [],
    );
    await assert.rejects(() =>
      f.call("commercial", "invoice.order", { orderId: order.id }),
    );
  } finally {
    await f.db.close();
  }
});
test("CUI-NAV: notification targets are allowlisted and never execute external links or malformed order identifiers", () => {
  const uuid = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  assert.deepEqual(
    notificationTarget({ title: "Order out for delivery", related_id: uuid }),
    { screen: "orders", id: uuid },
  );
  assert.equal(
    notificationTarget({ title: "Order", related_id: "https://evil.test" }),
    null,
  );
  assert.equal(
    notificationTarget({ title: "https://evil.test", related_id: uuid }),
    null,
  );
  assert.deepEqual(notificationTarget({ title: "Service confirmed" }), {
    screen: "bookings",
  });
  assert.equal(lagosDay("invalid"), "Date unavailable");
});
test("CUI-SCOPE: onboarding is preserved and later authorised driver-GPS launch delta is explicit", async () => {
  const manifest = await readFile(
    "docs/audits/customer-mobile-evidence/preserved-onboarding.sha256",
    "utf8",
  );
  const laterPhase = JSON.parse(
    await readFile(
      "docs/audits/customer-mobile-evidence/offline-gps-authorised-launch-change.json",
      "utf8",
    ),
  );
  assert.deepEqual(Object.keys(laterPhase.changes), ["apps/mobile/app.json"]);
  assert.equal(laterPhase.requirement, "GPS-R01");
  for (const line of manifest.trim().split("\n")) {
    const [hash, path] = line.split(/\s+/);
    assert.equal(
      createHash("sha256")
        .update(await readFile(path))
        .digest("hex"),
      laterPhase.changes[path]?.sha256 ?? hash,
      path,
    );
  }
});
test("CUI-LINK: native destinations are allowlisted, reject credential URLs and retain only validated owned-order selectors", async () => {
  const { customerMobileLink } = await import(
    "../packages/business-rules/src/customer-mobile"
  );
  const uuid = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  assert.deepEqual(customerMobileLink("easygas://orders?orderId=" + uuid), {
    screen: "orders",
    id: uuid,
  });
  assert.deepEqual(customerMobileLink("easygas://cylinders"), {
    screen: "cylinders",
  });
  for (const value of [
    "https://evil.test",
    "easygas://admin",
    "easygas://orders?token=secret",
    "easygas://u:p@orders",
    "easygas://orders#activation",
    "easygas://orders?orderId=other",
    "easygas://profile/../orders",
    "easygas://orders?redirect=https://evil.test",
  ])
    assert.equal(customerMobileLink(value), null, value);
});
test("CUI-HTTP: customer read resources use GET-compatible query actions instead of forbidden POST bodies", async () => {
  const { customerReadAction } = await import(
    "../packages/business-rules/src/customer-mobile"
  );
  assert.equal(customerReadAction("me"), "me");
  assert.equal(customerReadAction("refill.profiles"), "refill.profiles");
  assert.equal(
    customerReadAction("customer.dashboard", { widget: "cylinders" }),
    "customer.dashboard?widget=cylinders",
  );
  assert.equal(
    customerReadAction("customer.dashboard", { widget: "invoices" }),
    "customer.dashboard?widget=invoices",
  );
});
