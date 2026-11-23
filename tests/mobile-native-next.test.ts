import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";
import { build } from "esbuild";
import {
  nativeCheckoutContact,
  nativeQuoteTotal,
  sameNativeQuote,
  nativeCheckoutPayload,
} from "../packages/business-rules/src/mobile-next-checkout";
import { fixture } from "./helpers/order-tracking-fixture";
import { id, hashPassword, issueSession } from "../apps/web/lib/auth";
import { NextRequest } from "next/server";
import { GET, POST } from "../apps/web/app/api/[action]/route";
const req = createRequire(path.resolve("tests/native-renderer/package.json")),
  React = req("react"),
  { act, create } = req("react-test-renderer");
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "easygas-next-"));
after(() => fs.rm(tmp, { recursive: true, force: true }));
await build({
  stdin: {
    contents:
      "export * from './apps/mobile/HostedPayment';export * from './apps/mobile/CustomerCheckoutDraft';export * from './apps/mobile/MobileNextUI';export * from './apps/mobile/FinanceOverview';export * from './apps/mobile/MobileNextCatalogue';export * from './apps/mobile/MobileNextWorkspaces';export * from './apps/mobile/MobileNextFieldWork';export {default as CustomerHome} from './apps/mobile/CustomerHome';export {default as GasOrder} from './apps/mobile/GasOrder';export * as host from './tests/helpers/mobile-next-hosts';",
    resolveDir: process.cwd(),
    loader: "tsx",
  },
  outfile: path.join(tmp, "test.cjs"),
  bundle: true,
  platform: "node",
  format: "cjs",
  jsx: "automatic",
  loader: { ".png": "dataurl" },
  plugins: [
    {
      name: "hosts",
      setup(b) {
        b.onResolve({ filter: /^react(\/.*)?$/ }, (a) => ({
          path: req.resolve(a.path),
          external: true,
        }));
        b.onResolve({ filter: /^react-native-svg$/ }, () => ({
          path: path.resolve("tests/helpers/native-svg-host.tsx"),
        }));
        b.onResolve(
          {
            filter:
              /^(react-native|react-native-safe-area-context|@expo\/vector-icons|expo-.*|\.\/(theme|typography|EasyGasLoader))$/,
          },
          () => ({ path: path.resolve("tests/helpers/mobile-next-hosts.tsx") }),
        );
      },
    },
  ],
});
const m = createRequire(import.meta.url)(path.join(tmp, "test.cjs"));
const text = (t: any) =>
  JSON.stringify(t.toJSON(), (key, value) =>
    key === "source" ? "[native image]" : value,
  );
async function mount(C: any, props: any) {
  let t: any;
  await act(async () => {
    t = create(React.createElement(C, props));
  });
  return t;
}
async function click(t: any, label: string) {
  const b = t.root
    .findAllByType("Pressable")
    .find((b: any) => b.props.accessibilityLabel === label);
  assert.ok(b, label + " exists");
  assert.ok(!b.props.disabled, label + " enabled");
  await act(async () => {
    await b.props.onPress();
  });
}
function assertTextParents(tree: any, parent = "") {
  if (tree == null) return;
  if (Array.isArray(tree)) {
    tree.forEach((n) => assertTextParents(n, parent));
    return;
  }
  if (typeof tree === "string" || typeof tree === "number") {
    assert.equal(
      parent,
      "Text",
      "Native raw text must belong to Text: " + tree,
    );
    return;
  }
  assertTextParents(tree.children, tree.type);
}
test("NXT-CHECKOUT-DATA: current integer quote and normalised contact are required; changed policy cannot be silently accepted", () => {
  assert.equal(
    nativeCheckoutContact({
      name: " QA ",
      phone: "08012345678",
      street: " 12 Synthetic Road ",
    }).phone,
    "08012345678",
  );
  for (const v of [
    { name: "", phone: "08012345678", street: "long street" },
    { name: "QA", phone: "123", street: "long street" },
    { name: "QA", phone: "08012345678", street: "x" },
  ])
    assert.throws(() => nativeCheckoutContact(v));
  const q = {
    subtotalKobo: 1080000,
    deliveryKobo: 500000,
    priceVersion: 1,
    feeVersion: 2,
    policyVersion: 3,
  };
  assert.equal(nativeQuoteTotal(q), 1580000);
  for (const n of [-1, NaN, 1.1, Number.MAX_SAFE_INTEGER])
    assert.throws(() => nativeQuoteTotal({ ...q, deliveryKobo: n }));
  assert.ok(!sameNativeQuote(q, { ...q, policyVersion: 4 }));
  const p = nativeCheckoutPayload({
    lines: [{ kg: "6", capacityKg: "12.5" }],
    items: [],
    contact: { name: "QA", phone: "08012345678", street: "12 Synthetic Road" },
    area: { id: "lekki", name: "Lekki" },
    date: "2026-12-01",
    window: "14:00–18:00",
    paymentMethod: "wallet",
    quote: q,
    key: "same-request",
  });
  assert.deepEqual(p.gasLines, [{ kg: 6, capacityKg: 12.5 }]);
  assert.equal(p.idempotencyKey, "same-request");
  assert.equal(p.pricing.totalKobo, 1580000);
});
test("NXT-ENCRYPTED-RECOVERY: drafts and pending requests survive remount, reject tampering and cannot cross accounts", async () => {
  const a = "11111111-1111-4111-8111-111111111111",
    b = "22222222-2222-4222-8222-222222222222";
  m.host.files.clear();
  m.host.storage.clear();
  const r = {
    userId: a,
    pending: {
      action: "checkout",
      payload: {
        idempotencyKey: "immutable-key",
        address: { street: "Private synthetic address" },
      },
    },
  };
  await m.saveCheckoutDraft(r);
  assert.deepEqual(await m.readCheckoutDraft(a), r);
  assert.equal(await m.readCheckoutDraft(b), null);
  const file = [...m.host.files.keys()].find((k: any) =>
    k.endsWith("current.sealed"),
  )!;
  const sealed = m.host.files.get(file);
  assert.ok(!sealed.includes("Private synthetic address"));
  assert.ok(!sealed.includes("immutable-key"));
  // An interrupted atomic rename leaves a valid backup, which must be recoverable.
  m.host.files.delete(file);
  m.host.files.set(file.replace("current", "previous"), sealed);
  assert.deepEqual(await m.readCheckoutDraft(a), r);
  m.host.files.set(file, sealed.replace(/"cipher":"./, '"cipher":"z'));
  await assert.rejects(() => m.readCheckoutDraft(a));
  m.host.files.delete(file);
  m.host.storage.set(
    "easygas.checkoutKey." + b,
    m.host.storage.get("easygas.checkoutKey." + a),
  );
  m.host.files.set("/qa-private/checkout-" + b + "/current.sealed", sealed);
  await assert.rejects(() => m.readCheckoutDraft(b), /account mismatch/);
  await m.clearCheckoutDraft(a);
  assert.equal(await m.readCheckoutDraft(a), null);
});
test("NXT-PAYMENT-RETURN: overlapping foreground checks coalesce, changed intent verifies immediately and stale result cannot confirm current payment", async () => {
  const pending = new Map<string, (v: any) => void>(),
    calls: string[] = [];
  let paid = 0;
  const api = async (_: string, v: any) => {
    calls.push(v.intentId);
    return new Promise((r) => pending.set(v.intentId, r));
  };
  const t = await mount(m.NativePaymentReturn, {
    api,
    intentId: "first",
    onDone: () => paid++,
  });
  await act(async () => {
    for (const l of m.host.listeners) l("active");
  });
  assert.deepEqual(calls, ["first"]);
  await act(async () =>
    t.update(
      React.createElement(m.NativePaymentReturn, {
        api,
        intentId: "second",
        onDone: () => paid++,
      }),
    ),
  );
  assert.deepEqual(calls, ["first", "second"]);
  await act(async () => pending.get("first")!({ status: "paid" }));
  assert.equal(paid, 0);
  assert.doesNotMatch(text(t), /Payment verified/);
  await act(async () => pending.get("second")!({ status: "pending" }));
  assert.match(text(t), /still being confirmed/);
  assert.equal(paid, 0);
  assertTextParents(t.toJSON());
  await click(t, "Check again");
  await act(async () => pending.get("second")!({ status: "paid" }));
  assert.equal(paid, 1);
  assert.match(text(t), /Payment verified/);
  await act(async () => t.unmount());
});
test("NXT-PAYMENT-CONSENT: quoting never launches payment; explicit amount acceptance sends exact server values and rejects foreign checkout origins", async () => {
  for (const url of [
    "https://checkout.paystack.com/qa-test",
    "https://untrusted.invalid/charge",
  ]) {
    m.host.storage.clear();
    m.host.links.length = 0;
    const calls: any[] = [];
    const api = async (a: string, v: any) => {
      calls.push([a, v]);
      if (a.endsWith("configuration"))
        return { available: true, walletFunding: true };
      if (a.endsWith("/quote"))
        return {
          id: "intent",
          status: "quoted",
          quote: {
            baseKobo: 10000,
            customerFeeKobo: 100,
            grossKobo: 10100,
            gatewayPolicyVersion: 9,
          },
        };
      if (a.endsWith("/initialize")) return { checkoutUrl: url };
      if (a.endsWith("/verify")) return { status: "pending" };
      throw Error(a);
    };
    const t = await mount(m.NativeHostedPayment, {
      api,
      userId: "qa",
      purpose: "order",
      orderId: "one",
      autoReview: true,
    });
    assert.equal(calls.filter((c) => c[0].endsWith("initialize")).length, 0);
    assert.equal(m.host.links.length, 0);
    assertTextParents(t.toJSON());
    await click(t, "Accept total & continue");
    const init = calls.find((c) => c[0].endsWith("initialize"));
    assert.deepEqual(init[1], {
      intentId: "intent",
      acceptedGrossKobo: 10100,
      acceptedPolicyVersion: 9,
    });
    assert.equal(m.host.links.length, url.includes("untrusted") ? 0 : 1);
    if (url.includes("untrusted")) assert.match(text(t), /address rejected/);
    await act(async () => t.unmount());
  }
});
test("NXT-REAL-CHECKOUT: actual native form and bearer routes quote physical products, retain uncertain outcome and retry one server order", async () => {
  const f = await fixture();
  (globalThis as any).easygasDb = Promise.resolve(f.db);
  const requests: any[] = [];
  let lose = true;
  const transport = async (endpoint: string, input?: any) => {
    const [action, q] = endpoint.split("?");
    requests.push({ action, input });
    const r = new NextRequest(
      "http://localhost:3003/api/" + action + (q ? "?" + q : ""),
      {
        method: input === undefined ? "GET" : "POST",
        headers: {
          authorization: "Bearer " + f.actors.customer.token,
          "x-easygas-client": "native",
          "content-type": "application/json",
        },
        ...(input === undefined ? {} : { body: JSON.stringify(input) }),
      },
    );
    const response = await (input === undefined ? GET : POST)(r, {
      params: Promise.resolve({ action }),
    });
    const value = await response.json();
    if (!response.ok)
      throw Object.assign(Error(value.error), { status: response.status });
    if (action === "checkout" && lose) {
      lose = false;
      throw Error("Synthetic lost response after committed checkout");
    }
    return value;
  };
  const tasks: Promise<any>[] = [];
  const api = (a: string, d?: any) => {
    const task = transport(a, d);
    tasks.push(task);
    return task;
  };
  async function drain() {
    for (let n = 0; n < 5; n++) {
      const count = tasks.length;
      await act(async () => {
        await Promise.allSettled(tasks);
      });
      if (count === tasks.length) break;
    }
  }
  let t: any;
  try {
    m.host.storage.clear();
    m.host.files.clear();
    const gas = await api("gas.catalogue?branchId=lagos"),
      location = gas.locations.find((l: any) => l.name === "Lekki");
    assert.ok(location);
    const user = {
      id: f.actors.customer.id,
      role: "customer",
      name: "Synthetic customer",
    };
    await m.saveCheckoutDraft({
      userId: user.id,
      draft: {
        gasEnabled: false,
        lines: [],
        contact: {
          name: user.name,
          phone: "08012345678",
          street: "12 Synthetic Street",
        },
        locationId: location.id,
        date: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
        window: "14:00–18:00",
        method: "cash_on_delivery",
        key: "eb52b7cd-4374-4454-9ad7-879a2f2ad3a1",
        includeAppointments: false,
      },
    });
    let dock: any;
    function Checkout() {
      const [d, setD] = React.useState(null);
      dock = d;
      return React.createElement(
        m.NextDockContext.Provider,
        { value: setD },
        React.createElement(
          React.Fragment,
          null,
          React.createElement(m.GasOrder, {
            api,
            user,
            cart: [{ productId: "hose", quantity: 1 }],
            catalogue: {
              gas,
              products: [
                { id: "hose", category: "Accessories", price_kobo: 350000 },
              ],
            },
            gasEnabled: false,
            fromCart: true,
            done() {},
            onPlaced() {},
            viewServices() {},
          }),
          d,
        ),
      );
    }
    t = await mount(Checkout, {});
    await drain();
    assert.match(text(t), /Where should/);
    await click(t, "Review order");
    await drain();
    assert.match(text(t), /Everything/);
    assert.ok(
      requests.some(
        (r) => r.action === "gas.quote" && r.input.lines.length === 0,
      ),
    );
    await f.db.query(
      "UPDATE inventory SET price_kobo=400000 WHERE branch_id='lagos' AND product_id='hose'",
    );
    await click(t, "Confirm order");
    await drain();
    assert.match(text(t), /quotation changed/);
    assert.equal((await f.call("customer", "orders")).length, 0);
    await click(t, "Confirm order");
    await drain();
    assert.match(text(t), /Retry saved request/);
    assert.equal((await f.call("customer", "orders")).length, 1);
    const original = requests.find((r) => r.action === "checkout").input;
    assert.equal(original.pricing.totalKobo, 900000);
    assert.equal(
      original.idempotencyKey,
      "eb52b7cd-4374-4454-9ad7-879a2f2ad3a1",
    );
    assertTextParents(t.toJSON());
    await act(async () => t.unmount());
    // Remount the actual form, as after an app restart. It must recover the original pending request.
    t = await mount(Checkout, {});
    await drain();
    assert.match(text(t), /Retry saved request/);
    await click(t, "Retry saved request");
    await drain();
    assert.match(text(t), /You’re all set/);
    assert.equal((await f.call("customer", "orders")).length, 1);
    assert.deepEqual(
      requests.filter((r) => r.action === "checkout").map((r) => r.input),
      [original, original],
    );
    assertTextParents(t.toJSON());
    await assert.rejects(
      () => api("gas.quote", { lines: [], items: [], branchId: "lagos" }),
      { status: 400 },
    );
    for (const role of ["customer", "commercial", "driver"])
      for (const endpoint of [
        "production.readiness",
        "approvals?view=paged",
        "purchasing",
      ])
        await assert.rejects(
          () => f.call(role, endpoint.split("?")[0]),
          /not|permission|access|allowed|authoris|forbidden/i,
        );
  } finally {
    if (t) await act(async () => t.unmount());
    delete (globalThis as any).easygasDb;
    await f.db.close?.();
  }
});
test("NXT-PAYMENT-RECOVERY: terminal attempts get a new quote key; saved payments bound to another order fail closed", async () => {
  for (const wrongTarget of [false, true]) {
    m.host.storage.clear();
    const key = "easygas.paymentIntent.qa.order.one";
    m.host.storage.set(key, "old");
    m.host.storage.set(
      key + ".request",
      JSON.stringify({
        signature: JSON.stringify({ purpose: "order", orderId: "one" }),
        key: "old-quote-key",
      }),
    );
    const calls: any[] = [];
    const api = async (a: string, v: any) => {
      calls.push([a, v]);
      if (a.endsWith("configuration")) return { available: true };
      if (a.startsWith("payments/paystack/status"))
        return {
          purpose: "order",
          orderId: wrongTarget ? "two" : "one",
          status: "expired",
        };
      if (a.endsWith("/quote"))
        return {
          id: "new",
          status: "quoted",
          quote: {
            baseKobo: 10000,
            customerFeeKobo: 0,
            grossKobo: 10000,
            gatewayPolicyVersion: 1,
          },
        };
      throw Error(a);
    };
    const t = await mount(m.NativeHostedPayment, {
      api,
      userId: "qa",
      purpose: "order",
      orderId: "one",
      autoReview: true,
    });
    if (wrongTarget) {
      assert.match(text(t), /different purpose/);
      assert.equal(calls.filter((c) => c[0].endsWith("/quote")).length, 0);
    } else {
      assert.notEqual(
        calls.find((c) => c[0].endsWith("/quote"))[1].requestKey,
        "old-quote-key",
      );
      assert.match(text(t), /Accept total/);
    }
    assertTextParents(t.toJSON());
    await act(async () => t.unmount());
  }
});
test("NXT-ROLE-SCREENS: all seven real role snapshots render the shared native home; finance tabs preserve scoped values and navigation", async () => {
  const f = await fixture();
  let t: any;
  try {
    const uid = id();
    await f.db.query(
      "INSERT INTO users(id,name,email,password_hash,role,branch_id) VALUES($1,'Synthetic technician',$2,$3,'technician','lagos')",
      [uid, uid + "@next.test", hashPassword("Fixture-only-123!")],
    );
    f.actors.technician = { id: uid, token: await issueSession(f.db, uid) };
    for (const role of [
      "owner",
      "dispatcher",
      "inventory",
      "customer",
      "commercial",
      "driver",
      "technician",
    ]) {
      const api = async (endpoint: string, input?: any) => {
        const [action, q] = endpoint.split("?");
        return f.call(
          role,
          action,
          input ?? Object.fromEntries(new URLSearchParams(q)),
        );
      };
      const { user } = await api("me");
      const destinations: string[] = [];
      const navigate = (s: string) => destinations.push(s);
      if (["owner", "manager", "finance"].includes(user.role))
        t = await mount(m.StaffNextHome, { api, user, navigate });
      else if (["customer", "commercial"].includes(user.role))
        t = await mount(m.CustomerHome, { api, user, navigate });
      else {
        await api(user.role + ".restrict", {});
        t = await mount(m.FieldNextHome, {
          role: user.role,
          data: await api(user.role + ".snapshot"),
          navigate,
          connected: true,
        });
      }
      assertTextParents(t.toJSON());
      assert.doesNotMatch(text(t), /Something went wrong|NaN/);
      assert.ok(text(t).length > 500);
      await act(async () => t.unmount());
      t = null;
    }
    for (const role of ["owner", "inventory"]) {
      const api = (action: string) => f.call(role, action);
      let destination = "";
      t = await mount(m.FinanceOverview, {
        api,
        navigate: (s: string) => (destination = s),
      });
      assert.match(text(t), /Verified completed revenue/);
      assert.doesNotMatch(text(t), /NaN/);
      await click(t, "Activity");
      await click(t, "Ledger & reconciliation history");
      assert.equal(destination, "workspace:reconciliation");
      assertTextParents(t.toJSON());
      await act(async () => t.unmount());
      t = null;
    }
    await assert.rejects(() => f.call("driver", "technician.snapshot"));
    await assert.rejects(() => f.call("technician", "driver.snapshot"));
  } finally {
    if (t) await act(async () => t.unmount());
    await f.db.close?.();
  }
});
test("NXT-CART-LIMITS: quantity controls use published availability and the API item limit; unavailable legacy quantities cannot proceed", async () => {
  for (const quantity of [1, 21]) {
    function Cart() {
      const [cart, setCart] = React.useState([{ productId: "hose", quantity }]),
        [dock, setDock] = React.useState(null);
      return React.createElement(
        m.NextDockContext.Provider,
        { value: setDock },
        React.createElement(
          React.Fragment,
          null,
          React.createElement(m.NextCart, {
            cart,
            setCart,
            products: [
              { id: "hose", name: "Hose", available: 1, price_kobo: 10000 },
            ],
            art: () => null,
            onCheckout() {},
            onBrowse() {},
          }),
          dock,
        ),
      );
    }
    const t = await mount(Cart, {});
    const increase = t.root
      .findAllByType("Pressable")
      .find((b: any) => b.props.accessibilityLabel === "Increase Hose");
    assert.equal(increase.props.disabled, true);
    const next = t.root
      .findAllByType("Pressable")
      .find((b: any) => b.props.accessibilityLabel === "Delivery details");
    assert.equal(next.props.disabled, quantity === 21);
    if (quantity === 21) assert.match(text(t), /Reduce quantity/);
    assertTextParents(t.toJSON());
    await act(async () => t.unmount());
  }
});
test("NXT-GAS-CHECKOUT: the actual three-step native refill uses current catalogue/quote authority and never treats COD as paid", async () => {
  const f = await fixture();
  let t: any;
  try {
    m.host.files.clear();
    m.host.storage.clear();
    const tasks: Promise<any>[] = [];
    const api = (endpoint: string, input?: any) => {
      const [action, q] = endpoint.split("?");
      const task = f.call(
        "customer",
        action,
        input ?? Object.fromEntries(new URLSearchParams(q)),
      );
      tasks.push(task);
      return task;
    };
    async function drain() {
      for (let n = 0; n < 5; n++) {
        const count = tasks.length;
        await act(async () => {
          await Promise.allSettled(tasks);
        });
        if (count === tasks.length) break;
      }
    }
    const gas = await api("gas.catalogue?branchId=lagos"),
      area = gas.locations.find((a: any) => a.name === "Lekki"),
      user = {
        id: f.actors.customer.id,
        role: "customer",
        name: "Synthetic refill customer",
      };
    await m.saveCheckoutDraft({
      userId: user.id,
      draft: {
        gasEnabled: true,
        step: 0,
        lines: [{ kg: 6, capacityKg: 12.5 }],
        contact: {
          name: user.name,
          phone: "08012345678",
          street: "12 Synthetic Street",
        },
        locationId: area.id,
        date: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
        window: "14:00–18:00",
        method: "cash_on_delivery",
        key: id(),
        includeAppointments: false,
      },
    });
    function Refill() {
      const [dock, setDock] = React.useState(null);
      return React.createElement(
        m.NextDockContext.Provider,
        { value: setDock },
        React.createElement(
          React.Fragment,
          null,
          React.createElement(m.GasOrder, {
            api,
            user,
            catalogue: { gas, products: [] },
            cart: [],
            done() {},
            onPlaced() {},
            viewServices() {},
          }),
          dock,
        ),
      );
    }
    t = await mount(Refill, {});
    await drain();
    assert.match(text(t), /quantity limits must be configured/);
    assert.equal(t.root.findAllByType("Pressable").find((b:any)=>b.props.accessibilityLabel==="Add another cylinder").props.disabled,true);
    assert.equal(
      t.root
        .findAllByType("TextInput")
        .find(
          (i: any) =>
            i.props.accessibilityLabel ===
            "Cylinder 1 gas quantity in kilograms",
        ).props.value,
      "6",
    );
    await act(async () => t.unmount());
    t = null;
    await f.db.query(
      "UPDATE settings SET value=$1 WHERE key='gas.quantity_policy' AND scope='lagos'",
      [
        JSON.stringify({
          minimumKg: 1,
          maximumKg: 50,
          incrementKg: 0.5,
          precision: 1,
          capacitiesKg: [3, 6, 12.5, 25, 50],
        }),
      ],
    );
    t = await mount(Refill, {});
    await drain();
    await click(t, "Delivery details");
    await click(t, "Review order");
    await drain();
    assert.match(text(t), /Insufficient verified gas stock/);
    assert.equal((await f.call("customer", "orders")).length, 0);
    await f.db.query(
      "INSERT INTO gas_stock(branch_id,grams,reserved_grams) VALUES('lagos',100000,0) ON CONFLICT(branch_id) DO UPDATE SET grams=100000,reserved_grams=0",
    );
    await click(t, "Review order");
    await drain();
    await click(t, "Confirm order");
    await drain();
    assert.match(text(t), /You’re all set/);
    assert.doesNotMatch(text(t), /PAYMENT CONFIRMED/);
    const orders = await f.call("customer", "orders");
    assert.equal(orders.length, 1);
    assert.equal(Number(orders[0].total_kobo), 1580000);
    assert.equal(orders[0].payment_method, "cash_on_delivery");
    assert.notEqual(orders[0].payment_status, "verified");
    assert.equal(Number(orders[0].gas_lines[0].grams), 6000);
    assertTextParents(t.toJSON());
  } finally {
    if (t) await act(async () => t.unmount());
    await f.db.close?.();
  }
});
