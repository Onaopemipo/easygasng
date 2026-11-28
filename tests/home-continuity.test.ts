import test from "node:test";
import assert from "node:assert/strict";
import { createPublicHomeCache } from "../packages/business-rules/src/public-home-cache";
import { retainedPublicHomeNavigation } from "../packages/business-rules/src/home-navigation";
const home = {
  products: [],
  windows: ["14:00–18:00"],
  gas: { locations: [] },
  website: { heroHeading: "Synthetic public homepage" },
  testimonials: [],
};
test("HOME-CACHE only public catalogue fields survive; session/profile/cart/address/form state and browser storage are not retained", () => {
  const c = createPublicHomeCache();
  assert.equal(c.read(), null);
  const original = {
    ...home,
    user: { id: "private" },
    token: "secret",
    cart: [{ id: "private-item" }],
    address: { street: "private" },
    password: "private",
    orders: [{ id: "private-order" }],
  };
  const saved = c.remember(original);
  assert.equal(saved.website.heroHeading, "Synthetic public homepage");
  for (const k of ["user", "token", "cart", "address", "password", "orders"])
    assert.equal(saved[k], undefined);
  assert.notEqual(saved, original);
});
test("HOME-UPDATES repeat publication does not loop subscribers, fresh server content replaces the snapshot and malformed reads cannot erase it", () => {
  const c = createPublicHomeCache();
  let calls = 0;
  const off = c.subscribe(() => calls++);
  const a = c.remember(home);
  assert.equal(calls, 1);
  c.remember(home);
  c.remember(a);
  assert.equal(calls, 1);
  const b = c.remember({
    ...home,
    website: { heroHeading: "Fresh public home" },
  });
  assert.equal(calls, 2);
  assert.equal(c.read(), b);
  c.remember(null);
  c.remember({ user: { role: "owner" } });
  assert.equal(c.read(), b);
  off();
  c.remember({ ...home, website: { heroHeading: "Another home" } });
  assert.equal(calls, 2);
});
test("HOME-PRIVACY only a same-origin plain public→Home link avoids a hard reload; private/query/hash/credential/external transitions retain isolation", () => {
  for (const from of [
    "/",
    "/products",
    "/products/refill-6",
    "/services",
    "/about",
    "/help",
  ])
    assert.equal(
      retainedPublicHomeNavigation("https://example.test" + from, "/"),
      true,
      from,
    );
  for (const [from, to] of [
    ["/account", "/"],
    ["/orders", "/"],
    ["/admin", "/"],
    ["/login", "/"],
    ["/products?customer=private", "/"],
    ["/products#private", "/"],
    ["/products", "/?token=private"],
    ["/products", "/#private"],
    ["/products", "https://other.test/"],
    ["/products", "https://name:secret@example.test/"],
    ["/products", "/checkout"],
    ["/products", "javascript:alert(1)"],
  ])
    assert.equal(
      retainedPublicHomeNavigation("https://example.test" + from, to),
      false,
      from + "→" + to,
    );
  assert.equal(retainedPublicHomeNavigation("not-a-url", "/"), false);
});
