import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup as render } from "react-dom/server";
import AdminOrderDetails, {
  orderDetailActions,
  OrderStatusAction,
  OrderHistory,
} from "../apps/web/components/admin-order-details";
import {
  OrderOperations,
  OrderCommunication,
} from "../apps/web/components/order-operations";
import { fixture } from "./helpers/order-tracking-fixture";
const order: any = {
  id: "private-order-id",
  customer_id: "private-customer-id",
  reference: "EG-2026-MODAL",
  status: "delivered",
  payment_status: "verified",
  payment_method: "wallet",
  total_kobo: 1580000,
  tracking_version: 4,
  customer_name: "Synthetic customer",
  address: { street: "Synthetic street", zone: "Lekki", phone: "08012345678" },
  delivery_date: "2026-11-21",
  delivery_window: "09:00–12:00",
  gas_lines: [
    {
      id: "private-line-id",
      grams: 6000,
      capacity_grams: 6000,
      unit_price_kobo: 180000,
      subtotal_kobo: 1080000,
      inspected_at: "2026-11-19T01:00:00Z",
    },
  ],
  items: [],
  events: [],
};
const owner = { id: "owner", role: "owner" };
test("AORD-SUMMARY: completed order opens one summary dialog with four tabs, no forms, hidden IDs, prep actions or mounted history/invoice", () => {
  const html = render(
    React.createElement(AdminOrderDetails, {
      order,
      user: owner,
      onClose() {},
      onChanged() {},
    }),
  );
  assert.equal((html.match(/role="dialog"/g) ?? []).length, 1);
  assert.match(html, /Overview/);
  assert.match(html, /Items/);
  assert.match(html, /Payment/);
  assert.match(html, /History/);
  assert.match(html, /Synthetic street/);
  assert.doesNotMatch(
    html,
    /<form|private-order-id|private-customer-id|private-line-id|Add items|Confirm address|Record messaging|More actions|Invoice notes|Loading visit/,
  );
  assert.deepEqual(orderDetailActions(order, owner), []);
  const review = "Coverage evidence is still required";
  const active = render(
    React.createElement(AdminOrderDetails, {
      order: { ...order, status: "placed", operational_review: review },
      user: owner,
      onClose() {},
      onChanged() {},
    }),
  );
  assert.match(active, /Coverage evidence is still required/);
});
test("AORD-ACTIONS: status and role determine available workflows; paid/assigned orders cannot offer additions, finance cannot update delivery and only provisional customers expose messaging", () => {
  const early = {
    ...order,
    status: "placed",
    payment_status: "unpaid",
    payment_method: "cash_on_delivery",
  };
  const ids = (o: any, u: any) => orderDetailActions(o, u).map((a) => a.id);
  assert.ok(ids(early, owner).includes("additions"));
  assert.ok(ids(early, owner).includes("transition"));
  assert.ok(
    !ids({ ...early, payment_status: "verified" }, owner).includes("additions"),
  );
  assert.ok(
    !ids({ ...early, attempt: { id: "existing-attempt" } }, owner).includes(
      "additions",
    ),
  );
  assert.ok(!ids({ ...order, status: "assigned" }, owner).includes("coverage"));
  assert.deepEqual(
    ids({ ...order, status: "out_for_delivery" }, { role: "finance" }),
    [],
  );
  assert.deepEqual(ids(early, { role: "customer" }), []);
  assert.ok(
    ids(early, { role: "finance" }).every((s) => s.startsWith("inspection:")),
  );
  assert.ok(!ids(early, owner).includes("consent"));
  assert.deepEqual(ids({ ...order, customer_provisional: true }, owner), [
    "consent",
    "invite",
  ]);
});
test("AORD-FORMS: status form shows only relevant fields, communications keep context IDs hidden and private history excludes messaging forms", () => {
  const placed = render(
    React.createElement(OrderStatusAction, {
      order: { ...order, status: "placed" },
      drivers: [],
      onDone() {},
    }),
  );
  assert.doesNotMatch(placed, /name="driverId"|name="failureReason"|delivered/);
  const preparing = render(
    React.createElement(OrderStatusAction, {
      order: { ...order, status: "preparing" },
      drivers: [],
      onDone() {},
    }),
  );
  assert.match(preparing, /name="driverId"/);
  assert.doesNotMatch(preparing, /name="failureReason"/);
  for (const kind of ["consent", "invite"] as const) {
    const html = render(
      React.createElement(OrderCommunication, {
        order,
        kind,
        contextual: true,
      }),
    );
    assert.match(html, /type="hidden"/);
    assert.doesNotMatch(html, />Provisional customer ID|>Order ID/);
  }
  const history = render(
    React.createElement(OrderOperations, {
      order,
      user: owner,
      embedded: true,
      historyOnly: true,
    }),
  );
  assert.doesNotMatch(
    history,
    /channels.consent|messaging consent|completion invitation|<form/,
  );
});
test("AORD-HISTORY: timeline retains original notes with eight bounded records and lazy visit evidence", () => {
  const events = Array.from({ length: 12 }, (_, i) => ({
    version: i,
    status: "accepted",
    note: `Original history ${i}`,
    created_at: "2026-11-19T01:00:00Z",
  }));
  const html = render(
    React.createElement(OrderHistory, {
      order: {
        ...order,
        events,
        operational_review: "Original coverage review note",
      },
      user: owner,
    }),
  );
  assert.equal((html.match(/<li>/g) ?? []).length, 8);
  assert.match(html, /Original history 11/);
  assert.match(html, /Original coverage review note/);
  assert.match(html, /Page 1 of 2/);
  assert.doesNotMatch(html, /Loading visit/);
});
test("AORD-SCOPE: canonical staff provisional flag is scoped, absent from customer payloads and cannot expose another customer's order", async () => {
  const f = await fixture();
  try {
    const made = await f.make();
    let snapshot = await f.snapshot(made.id);
    assert.equal(snapshot.customer_provisional, false);
    await f.db.query("UPDATE users SET provisional=true WHERE id=$1", [
      f.actors.customer.id,
    ]);
    snapshot = await f.snapshot(made.id);
    assert.equal(snapshot.customer_provisional, true);
    await f.db.query("UPDATE users SET provisional=false WHERE id=$1", [
      f.actors.customer.id,
    ]);
    const own = (await f.call("customer", "orders", { id: made.id }))[0];
    assert.equal(Object.hasOwn(own, "customer_provisional"), false);
    assert.deepEqual(await f.call("commercial", "orders", { id: made.id }), []);
    assert.deepEqual(await f.call("driver", "orders", { id: made.id }), []);
    assert.equal(Object.hasOwn(snapshot, "delivery_code_hash"), false);
  } finally {
    await f.db.close?.();
  }
});
