import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";

test("ROLEACC-UI: actual hosted role workflows cover nine functional routes, eight responsive routes and bounded completed-order dialogs", async () => {
  const root = "docs/deployment/evidence/20261119-role-acceptance/";
  const evidence = JSON.parse(await readFile(root + "browser-evidence.json", "utf8"));
  assert.equal(evidence.method, "Actual hosted CUA browser interaction; no mocked UI or hidden browser API calls");
  const pairs = [
    ["customer-failed-order-desktop", "customer-orders-phone", "/orders"],
    ["tracking-desktop-return-history", "tracking-phone-return-history", "/track"],
    ["sales-completed-modal-desktop", "sales-order-modal-phone", "/admin/orders"],
    ["driver-gas-completed-history", "driver-phone-retry-completed-history", "/admin/deliveries"],
    ["dispatcher-final-desktop", "dispatcher-final-phone", "/admin/deliveries"],
    ["finance-final-desktop", "finance-final-phone", "/admin/finance"],
    ["finance-refund-approved", "credits-final-phone", "/admin/credits"],
    ["inventory-final-desktop", "inventory-final-phone", "/admin/inventory"],
    ["public-home-desktop-final", "public-home-phone-final", "/"],
  ];
  assert.equal(new Set(pairs.map((p) => p[2])).size, 8);
  for (const [desktop, phone, route] of pairs) {
    for (const [name, width] of [[desktop, 1440], [phone, 390]] as const) {
      const observation = evidence.observations.find((o: any) => o.name === name);
      assert.ok(observation, name);
      assert.equal(observation.url, route, name + " actual route");
      assert.equal(observation.viewport.width, width);
      assert.equal(observation.horizontalOverflow, false, name + " settled page width");
      assert.ok(observation.headings.length > 0);
      assert.ok((await stat(root + name + ".jpg")).size > 1000);
    }
  }
  const cash = evidence.observations.find((o: any) => o.name === "finance-cod-verified");
  assert.equal(cash.url, "/admin/reconciliation");
  assert.equal(cash.horizontalOverflow, false);
  assert.equal(cash.viewport.width, 1440);
  assert.ok((await stat(root + "finance-cod-verified.jpg")).size > 1000);
  assert.equal(new Set([...pairs.map(p => p[2]), cash.url]).size, 9);
  assert.equal(evidence.completedOrder.dialogCount, 1);
  assert.equal(evidence.completedOrder.forms, 0);
  assert.equal(evidence.completedOrder.tabs, 4);
  assert.equal(evidence.completedOrder.activeSidebarVisible, true);
  assert.ok(evidence.actions.includes("Restricted driver phone retry pickup, arrival, labelled proof and handover"));
  assert.ok(evidence.actions.includes("Separate finance UI identity verification and cash/refund approval"));
});
