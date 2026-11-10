import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ProductHeading,
  filterSupportTickets,
} from "../apps/web/components/product-workspace";
import { ActionForm } from "../apps/web/components/workflows";
import { readFileSync } from "node:fs";

test("PRODUCT-UI01: operational form redesign preserves labels, hidden identifiers, required controls and money precision", () => {
  const html = renderToStaticMarkup(
    React.createElement(ActionForm, {
      action: "fixture.only",
      title: "Record credit",
      submit: "Request verification",
      fields: [
        { name: "customerId", label: "", type: "hidden", value: "fixture-id" },
        { name: "amountKobo", label: "Amount received", type: "money" },
        { name: "reason", label: "Reason", type: "textarea" },
        {
          name: "consent",
          label: "Customer confirmation",
          type: "checkbox",
          value: true,
        },
        {
          name: "kind",
          label: "Type",
          options: [{ value: "cash", label: "Cash" }],
        },
      ],
    }),
  );
  assert.match(html, /product-form/);
  assert.match(html, /data-field-type="hidden"/);
  assert.match(html, /name="customerId"[^>]*value="fixture-id"/);
  assert.match(html, /step="0.01"/);
  assert.match(html, /<input(?=[^>]*name="amountKobo")(?=[^>]*required)[^>]*>/);
  assert.match(html, /<textarea name="reason" required/);
  assert.match(html, /type="checkbox"[^>]*checked/);
  assert.match(html, /name="kind" required/);
  assert.match(html, /Request verification/);
});
test("PRODUCT-UI02: support filters authorised records without mutation and combines customer, subject and status", () => {
  const records = Object.freeze([
    {
      id: "1",
      subject: "Delivery update",
      customer_name: "Ada",
      status: "open",
    },
    {
      id: "2",
      subject: "Cooker repair",
      customer_name: "Tunde",
      status: "resolved",
    },
  ]);
  assert.deepEqual(
    filterSupportTickets([...records], " ADA ", "all").map((r) => r.id),
    ["1"],
  );
  assert.deepEqual(
    filterSupportTickets([...records], "repair", "resolved").map((r) => r.id),
    ["2"],
  );
  assert.equal(filterSupportTickets([...records], "repair", "open").length, 0);
  assert.equal(filterSupportTickets([...records], "", "all").length, 2);
  assert.equal(filterSupportTickets([], "", "all").length, 0);
});
test("PRODUCT-UI03: workspace headings escape record content and describe the workspace", () => {
  const html = renderToStaticMarkup(
    React.createElement(ProductHeading, {
      eyebrow: "SUPPORT",
      title: "<script>fixture</script>",
      description: "Review requests",
    }),
  );
  assert.match(html, /<header/);
  assert.match(html, /<h1>/);
  assert.ok(!html.includes("<script>"));
  assert.match(html, /Review requests/);
});
test("PRODUCT-UI04: approval labels are Approve while backend authority and owner-apply action are retained", () => {
  const source = readFileSync("apps/web/components/admin.tsx", "utf8");
  assert.ok(source.includes('r.can_owner_apply ? "Approve" : "Review"'));
  assert.ok(source.includes('busy ? "Approving…" : "Approve"'));
  assert.ok(source.includes("approval.owner_apply"));
  assert.ok(!source.includes('"Apply request"'));
  assert.ok(!source.includes('"Apply my request"'));
});
test("PRODUCT-AUDIT01: every registered web route and native shell stays in the audit denominator", async () => {
  const matrix = JSON.parse(
    readFileSync("docs/traceability/product-ui-rtm.json", "utf8"),
  );
  const { navigationItems } = await import(
    "../packages/business-rules/src/admin-navigation"
  );
  const routes = readFileSync("apps/web/app/[...slug]/page.tsx", "utf8")
    .split("const routes = [")[1]
    .split("];")[0]
    .match(/"[a-z-]+"/g)!
    .map((s) => "/" + JSON.parse(s));
  for (const route of [
    ...routes,
    ...navigationItems.map((i) => i.href),
    "/",
    "/activate",
    "/payment-return",
    "/payment-request",
    "/products/:id",
    "/services/:id",
  ])
    assert.ok(
      matrix.requirements.some((r: any) => r.route === route),
      route,
    );
  for (const shell of [
    "CustomerHome",
    "TechnicianWorkspace",
    "DriverWorkspace",
    "App",
  ])
    assert.ok(
      matrix.requirements.some((r: any) => r.route === "native:" + shell),
    );
  assert.equal(matrix.productionDecision, "NO-GO");
  assert.ok(
    matrix.requirements.every(
      (r: any) => r.outstandingWork && r.status !== "NOT_APPLICABLE",
    ),
  );
});
