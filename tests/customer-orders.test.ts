import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { OrderOperations } from "../apps/web/components/order-operations";
import { CustomerOrders } from "../apps/web/components/customer-orders";
import {
  orderMatches,
  orderSummary,
  refundLineLabel,
} from "../packages/business-rules/src/customer-orders";
const order = {
  id: "synthetic-order",
  reference: "EG-2026-QA001",
  status: "placed",
  payment_status: "unpaid",
  total_kobo: 1580000,
  delivery_date: "2026-11-21",
  delivery_window: "09:00–12:00",
  address: { street: "Synthetic street", zone: "Lekki" },
  gas_lines: [{ id: "hidden-gas-id", grams: 6000, capacity_grams: 12500 }],
  items: [{ product_id: "hidden-product-id", quantity: 1, name: "Gas hose" }],
  confirmation_code: "654321",
  events: [
    {
      status: "placed",
      created_at: "2026-11-19T01:00:00Z",
      note: "Internal event note",
    },
  ],
};
const render = (orders: any[] | null) =>
  renderToStaticMarkup(
    React.createElement(CustomerOrders, {
      tracking: {
        orders,
        error: "",
        connection: "Live updates connected",
        observed: "2026-11-19T01:00:00Z",
        refresh: async () => {},
      },
    }),
  );
test("CORD-01: search and status grouping preserve failed deliveries and all terminal orders", () => {
  assert.match(
    orderSummary(order),
    /6 kg gas · 12.5 kg cylinder, 1 × Gas hose/,
  );
  assert.equal(orderMatches(order, "active", " qa001 "), true);
  assert.equal(orderMatches(order, "all", "GAS HOSE"), true);
  assert.equal(orderMatches(order, "delivered"), false);
  assert.equal(
    orderMatches({ ...order, status: "delivery_failed" }, "active"),
    true,
  );
  assert.equal(
    orderMatches({ ...order, status: "delivered" }, "active"),
    false,
  );
  assert.equal(
    orderMatches({ ...order, status: "cancelled" }, "cancelled"),
    true,
  );
  assert.equal(orderMatches(order, "all", "unmatched"), false);
});
test("CORD-02: actual initial page bounds eight orders to six summaries without mounting sensitive details, refund forms or document library", () => {
  const html = render(
    Array.from({ length: 8 }, (_, i) => ({
      ...order,
      id: `id${i}`,
      reference: `EG-QA-${i}`,
    })),
  );
  assert.equal((html.match(/class="co-order"/g) || []).length, 6);
  assert.match(html, /1–6 of 8 orders/);
  assert.match(html, /Page 1 of 2/);
  for (const hidden of [
    "654321",
    "Internal event note",
    "Refund selected quantities",
    "Search documents",
    "Delivery confirmation code",
    "hidden-gas-id",
  ])
    assert.ok(!html.includes(hidden), hidden);
  assert.match(html, /Invoices &amp; receipts/);
});
test("CORD-03: unknown identity snapshot renders no former customer orders and empty snapshots show a clear first-order state", () => {
  assert.doesNotMatch(render(null), /EG-2026-QA001|Track order|View invoice/);
  assert.match(render([]), /Your first delivery starts here/);
});
test("CORD-04: refund labels resolve canonical source IDs privately and never expose technical IDs as customer labels", () => {
  assert.equal(
    refundLineLabel(order, "gas:hidden-gas-id", 0),
    "6 kg gas · 12.5 kg cylinder",
  );
  assert.equal(
    refundLineLabel(order, "product:hidden-product-id", 1),
    "Gas hose",
  );
  assert.equal(
    refundLineLabel(order, "gas:unknown-private-uuid", 0),
    "Gas refill 1",
  );
  assert.equal(
    refundLineLabel(order, "product:unknown-private-uuid", 1),
    "Order item 2",
  );
});

test("CORD-05: embedding visit history removes the extra disclosure while preserving the existing staff default", () => {
  const legacy = renderToStaticMarkup(
    React.createElement(OrderOperations, { order, user: { role: "driver" } }),
  );
  const embedded = renderToStaticMarkup(
    React.createElement(OrderOperations, {
      order,
      customer: true,
      embedded: true,
    }),
  );
  assert.match(legacy, /<details/);
  assert.match(legacy, /<summary>Visit changes and photo history<\/summary>/);
  assert.doesNotMatch(embedded, /<details|<summary>/);
  assert.match(embedded, /aria-label="Visit changes and photo history"/);
});
