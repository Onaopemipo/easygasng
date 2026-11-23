import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";
import { build } from "esbuild";
const dir = await fs.mkdtemp(path.join(os.tmpdir(), "easygas-ux23-"));
const storage = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => storage.get(k) || null,
  setItem: (k: string, v: string) => storage.set(k, v),
  removeItem: (k: string) => storage.delete(k),
};
(globalThis as any).sessionStorage = {
  setItem() {},
  getItem() {
    return null;
  },
};
(globalThis as any).window = Object.assign(new EventTarget(), {
  scrollTo() {},
});
(globalThis as any).location = {
  href: "http://prototype.invalid/",
  origin: "http://prototype.invalid",
  pathname: "/",
  search: "",
};
await build({
  entryPoints: ["prototypes/easygas-mobile-next/experience.ts"],
  outfile: path.join(dir, "model.cjs"),
  bundle: true,
  platform: "node",
  format: "cjs",
});
const require = createRequire(import.meta.url),
  m = require(path.join(dir, "model.cjs"));
const ready = () => {
  m.reset();
  m.state.role = "customer";
  m.state.scenario = "normal";
};
test("MOBUX23-CHECKOUT: quote total, saved address and duplicate submit stay consistent", () => {
  ready();
  const d = m.freshDraft();
  d.method = "wallet";
  d.street = "24 Prototype Crescent";
  const before = m.state.wallet.balanceKobo;
  const o = m.placeDraft(d);
  const again = m.placeDraft(d);
  assert.equal(o.total_kobo, 1580000);
  assert.equal(o.address.street, d.street);
  assert.equal(o.id, again.id);
  assert.equal(m.state.wallet.balanceKobo, before - 1580000);
  assert.equal(m.state.orders.filter((x: any) => x.id === o.id).length, 1);
});
test("MOBUX23-VALIDATION: invalid contact, date and quantity preserve orders and balances", () => {
  for (const edit of [
    (d: any) => (d.phone = "123"),
    (d: any) => (d.date = "2020-01-01"),
    (d: any) => (d.lines[0].kg = 13),
    (d: any) => (d.street = "x"),
  ]) {
    ready();
    const d = m.freshDraft();
    edit(d);
    const count = m.state.orders.length,
      balance = m.state.wallet.balanceKobo;
    assert.throws(() => m.placeDraft(d));
    assert.equal(m.state.orders.length, count);
    assert.equal(m.state.wallet.balanceKobo, balance);
  }
});
test("MOBUX23-PAYMENT: pending, expired-session and provider failure never mark paid; retry verifies once", () => {
  ready();
  const d = m.freshDraft(),
    o = m.placeDraft(d),
    p = m.startPayment(o, "ux23-card-once");
  m.state.scenario = "pending-payment";
  assert.equal(m.verifyPayment(p.reference).status, "pending");
  assert.equal(
    m.state.orders.find((x: any) => x.id === o.id).payment_status,
    "unpaid",
  );
  m.state.scenario = "expired-session";
  assert.throws(() => m.verifyPayment(p.reference), /session expired/i);
  m.state.scenario = "payment-failed";
  assert.throws(() => m.verifyPayment(p.reference), /rejected/);
  m.state.scenario = "normal";
  assert.equal(m.verifyPayment(p.reference).status, "verified");
  assert.equal(m.verifyPayment(p.reference).status, "verified");
  assert.equal(
    m.state.orders.find((x: any) => x.id === o.id).payment_status,
    "verified",
  );
  assert.equal(
    m.state.domain.payments.filter((x: any) => x.reference === p.reference)
      .length,
    1,
  );
});
test("MOBUX23-COVERAGE: all 36 families and 300 stable feature entries remain mapped across review roles", () => {
  assert.equal(m.workflowFeatures.length, 36);
  assert.equal(
    m.workflowFeatures.reduce((n: number, f: any) => n + f.items.length, 0),
    300,
  );
  const seen = new Set();
  for (const role of [
    "public",
    "customer",
    "commercial",
    "owner",
    "manager",
    "finance",
    "driver",
    "technician",
  ]) {
    ready();
    m.state.role = m.personaRole(role);
    const families = m.families(role);
    assert.ok(families.length);
    for (const f of families) {
      seen.add(f.id);
      const sections = m.featureSections(f.id);
      assert.equal(sections.length, f.items.length);
      for (const a of m.commands[f.id.slice(-2)] || [])
        if (!a.roles || a.roles.includes(m.state.role))
          assert.ok(Array.isArray(m.actionFields(a)));
    }
  }
  assert.equal(seen.size, 36);
  assert.equal(
    m.families("customer").some((x: any) => x.id === "FEATURE-31"),
    false,
  );
  ready();
  assert.throws(
    () => m.execute("approval.owner_apply", { id: m.state.requests[0].id }),
    /owner/i,
  );
  m.state.scenario = "offline";
  assert.throws(
    () => m.execute("account.update", { name: "Sample" }),
    /offline/,
  );
});
const req = createRequire(path.resolve("tests/native-renderer/package.json")),
  React = req("react"),
  { create, act } = req("react-test-renderer");
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const shim = path.join(dir, "hosts.tsx");
let hosts = await fs.readFile("tests/helpers/native-host-shim.tsx", "utf8");
hosts +=
  '\nexport const Ionicons="Icon",Linking={openURL:async()=>{}},money=(n)=>String(n/100);\n';
await fs.writeFile(shim, hosts);
const uiShim = path.join(dir, "web-ui.tsx");
await fs.writeFile(
  uiShim,
  'import React from "react";export const Notice=({message})=>React.createElement("p",null,message);export const money=String;export const api=async()=>({});export const FieldCaption=({children})=>React.createElement("span",null,children);export const ActionLoadingIndicator=()=>null;',
);
await build({
  stdin: {
    contents:
      "export * from './apps/mobile/CustomerUI';export {NativePaymentReturn} from './apps/mobile/HostedPayment';export {PaymentReturn} from './apps/web/components/hosted-payment';",
    resolveDir: process.cwd(),
    loader: "tsx",
  },
  outfile: path.join(dir, "components.cjs"),
  bundle: true,
  platform: "node",
  format: "cjs",
  jsx: "automatic",
  loader:{".png":"dataurl"},
  plugins: [
    {
      name: "ux23-hosts",
      setup(b) {
        b.onResolve({filter:/^react-native-svg$/},()=>({path:path.resolve("tests/helpers/native-svg-host.tsx")}));
        b.onResolve({ filter: /^react(\/.*)?$/ }, (a) => ({
          path: req.resolve(a.path),
          external: true,
        }));
        b.onResolve(
          {
            filter:
              /^(react-native|@expo\/vector-icons|expo-.*|\.\/(theme|typography|EasyGasLoader))$/,
          },
          () => ({ path: shim }),
        );
        b.onResolve(
          { filter: /^\.\/(ui|field-caption|easygas-loader)$/ },
          (a) =>
            a.importer.includes("apps/web/") ? { path: uiShim } : undefined,
        );
      },
    },
  ],
});
const {
  RemoteReadScope,
  useRemote,
  Feedback,
  NativePaymentReturn,
  PaymentReturn,
} = require(path.join(dir, "components.cjs"));
const text = (t: any) => JSON.stringify(t.toJSON());
test("MOBUX23-CACHE: immediate re-entry reuses read data, revalidates and never crosses identity scope", async () => {
  let resolve: any,
    calls = 0;
  const api = async () => {
    calls++;
    if (calls === 1) return { label: "Account A" };
    return new Promise((r) => (resolve = r));
  };
  function Probe() {
    const r = useRemote(api, "customer.dashboard");
    return React.createElement(
      "Text",
      null,
      r.loading ? "loading" : r.data?.label || r.error,
    );
  }
  function Wrapper({ scope, show = true }: any) {
    return React.createElement(
      RemoteReadScope,
      { scope },
      show && React.createElement(Probe),
    );
  }
  let t: any;
  await act(async () => {
    t = create(React.createElement(Wrapper, { scope: "A" }));
  });
  assert.match(text(t), /Account A/);
  await act(async () =>
    t.update(React.createElement(Wrapper, { scope: "A", show: false })),
  );
  await act(async () => t.update(React.createElement(Wrapper, { scope: "A" })));
  assert.match(text(t), /Account A/);
  assert.equal(calls, 2);
  await act(async () => t.update(React.createElement(Wrapper, { scope: "B" })));
  assert.doesNotMatch(text(t), /Account A/);
  assert.match(text(t), /loading/);
  await act(async () => resolve({ label: "Account B" }));
  assert.match(text(t), /Account B/);
  await act(async () => t.unmount());
});
test("MOBUX23-NATIVE-RETURN: payment verifies on entry and overlapping retry starts no second request", async () => {
  let resolve: any,
    calls = 0,
    t: any;
  const api = async () => {
    calls++;
    return new Promise((r) => (resolve = r));
  };
  await act(async () => {
    t = create(
      React.createElement(NativePaymentReturn, {
        api,
        intentId: "11111111-1111-4111-8111-111111111111",
      }),
    );
  });
  assert.equal(calls, 1);
  assert.match(text(t), /Checking payment/);
  const button = t.root
    .findAllByType("Pressable")
    .find((b: any) => b.props.accessibilityRole === "button");
  await act(async () => button.props.onPress());
  assert.equal(calls, 1);
  await act(async () => resolve({ status: "paid" }));
  assert.match(text(t), /payment verified/i);
  await act(async () => t.unmount());
});
test("MOBUX23-WEB-RETURN: native callback never asks browser cookies to verify or shows a sign-in loop", async () => {
  (globalThis as any).location = {
    search: "?intent=11111111-1111-4111-8111-111111111111&client=native",
  };
  let requests = 0;
  (globalThis as any).fetch = async () => {
    requests++;
    throw Error("Browser session must not be used");
  };
  let t: any;
  await act(async () => {
    t = create(React.createElement(PaymentReturn));
  });
  assert.equal(requests, 0);
  assert.match(text(t), /Continue in EasyGas/);
  assert.doesNotMatch(text(t), /Please sign in|Verify payment status/);
  const a = t.root.findAllByType("a");
  assert.equal(a.length, 1);
  assert.equal(
    a[0].props.href,
    "easygas://payment?intentId=11111111-1111-4111-8111-111111111111",
  );
  await act(async () => t.unmount());
});

test("MOBUX23-MONEY: naira entry preserves exact minor units and rejects invalid precision", () => {
  assert.equal(m.nairaInputToKobo("1250.25"), 125025);
  assert.equal(m.nairaInputToKobo("0"), 0);
  for (const invalid of ["", "-1", "1.001", "1e3", "999999999999999999"])
    assert.throws(() => m.nairaInputToKobo(invalid));
});

test("MOBUX23-SKELETON: delayed reads expose one accessible loading target and errors keep recovery", async () => {
  let t: any;
  await act(async () => {
    t = create(React.createElement(Feedback, { loading: true }));
  });
  assert.equal(
    t.root.findAll((n: any) => n.props.accessibilityRole === "progressbar")
      .length,
    0,
  );
  await act(async () => {
    await new Promise((r) => setTimeout(r, 210));
  });
  assert.equal(
    t.root.findAll((n: any) => n.props.accessibilityRole === "progressbar")
      .length,
    1,
  );
  await act(async () =>
    t.update(
      React.createElement(Feedback, {
        loading: true,
        error: "Permission denied",
        retry() {},
      }),
    ),
  );
  assert.equal(
    t.root.findAll((n: any) => n.props.accessibilityRole === "progressbar")
      .length,
    0,
  );
  assert.match(text(t), /Try again/);
  await act(async () => t.unmount());
});

after(() =>
  fs.rm(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 50 }),
);
