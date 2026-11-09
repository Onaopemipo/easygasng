import test from "node:test";
import assert from "node:assert/strict";
import {
  publicHeaderLinks,
  publicHeaderActive,
  publicSearchResults,
} from "../packages/business-rules/src/public-header";
test("HDR-03: all seven primary links retain approved order and verified destinations", () => {
  assert.deepEqual(
    publicHeaderLinks.map((x) => x.label),
    [
      "Home",
      "Order Gas",
      "Products",
      "Book a Service",
      "How It Works",
      "About Us",
      "Help",
    ],
  );
  assert.deepEqual(
    publicHeaderLinks.map((x) => x.href),
    [
      "/",
      "/gas-order",
      "/products",
      "/services",
      "/#how-it-works",
      "/about",
      "/help",
    ],
  );
});
test("HDR-05: exact, nested and anchor matches avoid false prefixes and duplicate Home selection", () => {
  assert.equal(publicHeaderActive("/", "/products"), false);
  assert.equal(
    publicHeaderActive("/products", "/products/cylinder-empty-6"),
    true,
  );
  assert.equal(
    publicHeaderActive("/services", "/services/cooker-servicing"),
    true,
  );
  assert.equal(publicHeaderActive("/services", "/services-unsafe"), false);
  assert.equal(publicHeaderActive("/", "/", "#how-it-works"), false);
  assert.equal(
    publicHeaderActive("/#how-it-works", "/", "#how-it-works"),
    true,
  );
  assert.equal(
    publicHeaderActive("/#how-it-works", "/products", "#how-it-works"),
    false,
  );
});
test("HDR-06: public search uses actual supplied names, safely encoded IDs and real help destinations", () => {
  const rows = publicSearchResults(
    "COOK",
    [{ id: "cooker/one", name: "Cooker burner", published: true }],
    [{ id: "cook", name: "Cooker servicing" }],
  );
  assert.deepEqual(
    rows.map((r) => r.href),
    ["/products/cooker%2Fone", "/services/cook"],
  );
  assert.deepEqual(publicSearchResults("", [{ id: "x", name: "x" }], []), []);
  assert.deepEqual(publicSearchResults("not-a-real-result", [], []), []);
  assert.equal(publicSearchResults("safety", [], [])[0].href, "/help");
  assert.equal(publicSearchResults("private customer", [], []).length, 0);
});

test("HDR-23: unpublished products never enter public search results", () => {
  assert.deepEqual(
    publicSearchResults(
      "hidden",
      [{ id: "private", name: "Hidden draft", published: false }],
      [],
    ),
    [],
  );
});

test("HDR-25: explicit server-authorised preview matches the local catalogue without treating drafts as published", () => {
  const draft = { id: "hose", name: "Gas Hose", published: false };
  assert.deepEqual(publicSearchResults("Gas Hose", [draft], []), []);
  assert.deepEqual(publicSearchResults(" Gas Hose ", [draft], [], true), [
    { label: "Gas Hose", href: "/products/hose", type: "Preview product" },
  ]);
});

test("HDR-26: catalogue authorises previews only in development and production still excludes unpublished products", async () => {
  const { createDatabase, migrate } = await import("../apps/web/lib/db");
  const { dispatch } = await import("../apps/web/lib/service");
  const db = await createDatabase("memory://");
  const previous = process.env.NODE_ENV;
  try {
    await migrate(db);
    await db.query(
      "UPDATE inventory SET published=false WHERE product_id='hose'",
    );
    process.env.NODE_ENV = "development";
    const local = await dispatch("catalogue", null, {}, db);
    assert.equal(local.preview, true);
    assert.ok(
      publicSearchResults("Gas Hose", local.products, [], local.preview).some(
        (p) => p.href === "/products/hose",
      ),
    );
    process.env.NODE_ENV = "production";
    const live = await dispatch("catalogue", null, {}, db);
    assert.equal(live.preview, false);
    assert.equal(
      live.products.some((p: any) => p.id === "hose"),
      false,
    );
    assert.deepEqual(
      publicSearchResults("Gas Hose", live.products, [], live.preview),
      [],
    );
  } finally {
    if (previous === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previous;
    await db.close();
  }
});
