import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerHooks } from "node:module";
// Node renders the real component; Next owns CSS compilation, checked in browser.
registerHooks({
  load(url, context, nextLoad) {
    if (url.endsWith(".module.css"))
      return {
        format: "module",
        shortCircuit: true,
        source: "export default new Proxy({}, {get:(_,key)=>String(key)})",
      };
    return nextLoad(url, context);
  },
});
const { NotificationList } = await import(
  "../apps/web/components/customer-notifications"
);
import {
  notificationKind,
  notificationPreview,
  notificationTime,
  notificationDestination,
  type NotificationItem,
} from "../packages/business-rules/src/customer-notifications";
const item: NotificationItem = {
  id: "synthetic",
  title: "Delivery confirmation code",
  body: "Your delivery confirmation code is 479863. Share only after receiving all items.",
  read_at: null,
  created_at: "2026-11-19T00:00:00Z",
};
test("CNIN-UI01: actual summary list keeps delivery codes and full instructions out of initial markup", () => {
  const html = renderToStaticMarkup(
    React.createElement(NotificationList, {
      data: {
        items: [item],
        total: 1,
        unread: 1,
        filteredTotal: 1,
        page: 1,
        pageSize: 8,
        generatedAt: item.created_at,
      },
      filter: "all",
      query: "",
      busy: false,
      onOpen: () => {},
      onRead: () => {},
    }),
  );
  assert.doesNotMatch(html, /479863|Share only after receiving all items/);
  assert.match(html, /Open this message to view your code and instructions/);
  assert.match(html, /unread/);
  assert.match(html, /Mark Delivery confirmation code as read/);
  assert.equal(
    notificationPreview({
      ...item,
      title: "Account update",
      body: "Your OTP is 123456",
    }),
    "Open this message to view your code and instructions.",
  );
});
test("CNIN-UI02: notification presentation preserves sandbox/payment meaning and safe destinations", () => {
  assert.equal(
    notificationKind({
      ...item,
      title: "Sandbox payment verified",
      body: "Test-mode payment. Not a live receipt.",
    }),
    "payment",
  );
  assert.equal(
    notificationPreview({
      ...item,
      title: "Sandbox payment verified",
      body: "Test-mode payment. Not a live receipt.",
    }),
    "Test-mode payment. Not a live receipt.",
  );
  assert.equal(notificationDestination("https://example.test/"), null);
  assert.equal(notificationDestination("javascript:alert(1)"), null);
  assert.equal(
    notificationDestination("/orders?orderId=other&role=owner"),
    null,
  );
  assert.equal(
    notificationDestination(
      "/orders?orderId=11111111-1111-4111-8111-111111111111",
    ),
    "/orders?orderId=11111111-1111-4111-8111-111111111111",
  );
  assert.equal(
    notificationTime(item.created_at, Date.parse(item.created_at) + 5 * 60000),
    "5m ago",
  );
  assert.equal(notificationTime("invalid"), "Date unavailable");
});
test("CNIN-UI03: empty search and unread states remain distinct and read items have no duplicate read action", () => {
  const data = {
    items: [],
    total: 3,
    unread: 0,
    filteredTotal: 0,
    page: 1,
    pageSize: 8,
    generatedAt: item.created_at,
  };
  const render = (
    query: string,
    filter: string,
    items: NotificationItem[] = [],
  ) =>
    renderToStaticMarkup(
      React.createElement(NotificationList, {
        data: { ...data, items },
        filter,
        query,
        busy: false,
        onOpen: () => {},
        onRead: () => {},
      }),
    );
  assert.match(render("missing", "all"), /No matching notifications/);
  assert.match(render("", "unread"), /all caught up/);
  assert.match(render("", "all"), /Your inbox is ready/);
  assert.doesNotMatch(
    render("", "all", [{ ...item, read_at: item.created_at }]),
    /Mark Delivery confirmation code as read/,
  );
});
