import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
const root = "docs/deployment/evidence/20261119-order-sidebar/";
test("OSREL-BROWSER: actual hosted desktop/mobile observations verify modal tabs, one-dialog invoice/actions and sidebar visibility", async () => {
  const { observations, interactions } = JSON.parse(await readFile(root + "browser-checks.json", "utf8"));
  const find = (name) => { const r = observations.find((r) => r.name === name); assert.ok(r, name); return r; };
  for (const name of ["order-desktop", "order-mobile"]) {
    const r = find(name); assert.equal(r.dialogCount, 1); assert.equal(r.forms, 0);
    assert.equal(r.tabs, 4); assert.ok(r.dialog.height < 550); assert.ok(r.dialog.width <= r.viewport.width);
    assert.equal(r.horizontalOverflow, false);
  }
  for (const name of ["invoice-desktop", "status-desktop", "history-desktop", "invoice-mobile"])
    assert.equal(find(name).dialogCount, 1, name);
  for (const name of ["sidebar-desktop", "sidebar-next-desktop", "sidebar-reload-desktop", "sidebar-compact", "sidebar-mobile"])
    assert.equal(find(name).activeVisible, true, name);
  assert.equal(find("sidebar-next-desktop").scrollTop, find("sidebar-desktop").scrollTop);
  assert.equal(find("sidebar-reload-desktop").scrollTop, find("sidebar-next-desktop").scrollTop);
  for (const name of ["items-read", "history-read", "private-photo-read", "invoice-read", "contextual-status", "draft-keep-discard", "mobile-items", "mobile-history", "mobile-escape-focus"])
    assert.ok(interactions.some((r) => r.name === name && r.passed === true), name);
  for (const file of ["order-desktop.jpg", "order-mobile.jpg", "sidebar-desktop.jpg", "sidebar-mobile.jpg"])
    assert.ok((await stat(root + file)).size > 10000);
});
