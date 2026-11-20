import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";
import { build } from "esbuild";
import {
  ownsCustomerOrder,
  canRequestOrderRefund,
  selectedRefundLines,
} from "../packages/business-rules/src/native-order-authority";
const req = createRequire(path.resolve("tests/native-renderer/package.json"));
const React = req("react"),
  { create, act } = req("react-test-renderer");
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const temp = await fs.mkdtemp(
  path.join(os.tmpdir(), "easygas-order-authority-"),
);
after(() => fs.rm(temp, { recursive: true, force: true }));
const shim = path.join(temp, "hosts.tsx");
await fs.writeFile(
  shim,
  `import React from 'react';export const View='View',Text='Text',TextInput='TextInput',Pressable='Pressable',Image='Image';export const useColorScheme=()=> 'light',StyleSheet={create:x=>x},AppState={},Share={};export const randomUUID=()=>globalThis.crypto.randomUUID();export const FieldCaption=({children})=>React.createElement(Text,null,children);export const NativeForm=p=>React.createElement('Form',p,React.createElement(Text,null,p.title));export const Button=NativeForm,Card=View,Copy=Text,Feedback=Text,Title=Text,ContextSheet=View,EasyGasLoader=({label})=>React.createElement(Text,null,label);export const useTheme=()=>({colors:{},dark:false}),Ionicons=Text;`,
);
await build({
  stdin: {
    contents:
      "export {default as Refunds} from './apps/mobile/CustomerOrderRefunds';export {default as Visit} from './apps/mobile/OrderVisit';export {NativePartialRefund as Partial} from './apps/mobile/EasyRewards';",
    resolveDir: process.cwd(),
    loader: "tsx",
  },
  outfile: path.join(temp, "test.cjs"),
  bundle: true,
  format: "cjs",
  platform: "node",
  jsx: "automatic",
  plugins: [
    {
      name: "native-hosts",
      setup(b) {
        b.onResolve({ filter: /^react(\/.*)?$/ }, (a) => ({
          path: req.resolve(a.path),
          external: true,
        }));
        b.onResolve(
          {
            filter:
              /^(react-native|expo-crypto|@expo\/vector-icons|\.\/(typography|surfaces|Workflows|theme|CustomerUI|ContextSheet|EasyGasLoader))$/,
          },
          () => ({ path: shim }),
        );
      },
    },
  ],
});
const { Refunds, Visit, Partial } = createRequire(import.meta.url)(
  path.join(temp, "test.cjs"),
);
const user = { id: "customer-1", role: "customer" },
  order = {
    id: "order-1",
    customer_id: user.id,
    status: "delivered",
    payment_status: "verified",
  };
const mount = async (C: any, p: any) => {
  let tree: any;
  await act(async () => {
    tree = create(React.createElement(C, p));
  });
  return tree;
};
const dispose = async (tree: any) => act(async () => tree.unmount());
const content = (tree: any) => JSON.stringify(tree.toJSON());
const button = (tree: any, label: string) =>
  tree.root
    .findAllByType("Pressable")
    .find((n: any) =>
      n.findAllByType("Text").some((t: any) => t.props.children === label),
    );
const fill = async (tree: any, label: string, value: string) =>
  act(async () =>
    tree.root
      .findAllByType("TextInput")
      .find((n: any) => n.props.accessibilityLabel === label)
      .props.onChangeText(value),
  );
const lines = [
  { source: "product:hose", remaining: 2 },
  { source: "gas:line", remaining: 500 },
];
test("MORD-OWNERSHIP: staff, foreign, unknown and ineligible orders never mount customer refund forms or read refund lines", async () => {
  for (const role of [
    "owner",
    "manager",
    "finance",
    "driver",
    "technician",
    "customer",
    "commercial",
  ]) {
    const actor = { id: user.id, role };
    assert.equal(
      ownsCustomerOrder(actor, order),
      ["customer", "commercial"].includes(role),
    );
    let calls = 0;
    const api = async () => {
      calls++;
      return lines;
    };
    const tree = await mount(Refunds, { api, user: actor, order });
    assert.equal(
      tree.root.findAllByType("Form").length,
      ["customer", "commercial"].includes(role) ? 1 : 0,
    );
    assert.equal(calls, ["customer", "commercial"].includes(role) ? 1 : 0);
    await dispose(tree);
  }
  for (const changed of [
    { ...order, customer_id: "other" },
    { ...order, customer_id: undefined },
    { ...order, status: "placed" },
    { ...order, payment_status: "unpaid" },
  ]) {
    assert.equal(canRequestOrderRefund(user, changed), false);
    const tree = await mount(Refunds, {
      api: async () => {
        throw Error("must not read");
      },
      user,
      order: changed,
    });
    assert.equal(tree.toJSON(), null);
    await dispose(tree);
  }
});
test("MORD-VISIT: staff can read visit and invoice but cannot consent or request customer excess; owning customers retain both", async () => {
  for (const role of [
    "owner",
    "manager",
    "finance",
    "driver",
    "technician",
    "customer",
    "commercial",
  ]) {
    const calls: string[] = [];
    const api = async (a: string) => {
      calls.push(a);
      if (a.startsWith("delivery.photos")) return { photos: [] };
      if (a === "doorstep.list")
        return {
          amendments: [
            {
              id: "a",
              state: "proposed",
              proposal: { lines: [] },
              price_snapshot: { quote: {} },
            },
          ],
          commitEnabled: false,
        };
      if (a === "invoice.order") return { invoice: { overpaidKobo: 100 } };
      throw Error(a);
    };
    const tree = await mount(Visit, {
      api,
      user: { id: user.id, role },
      order,
      driver: role === "driver",
      origin: "https://example.test",
      token: "fixture",
      onDone() {},
    });
    await act(async () =>
      button(tree, "View visit changes, photos and invoice").props.onPress(),
    );
    const actions = tree.root
      .findAllByType("Form")
      .map((n: any) => n.props.action);
    for (const a of ["doorstep.consent", "invoice.excess.request"])
      assert.equal(
        actions.includes(a),
        ["customer", "commercial"].includes(role),
        role + ":" + a,
      );
    assert.equal(calls.includes("invoice.order"), role !== "driver");
    await dispose(tree);
  }
});
test("MORD-QUANTITIES: zero, empty, fraction, negative, foreign, excessive and nonfinite selections are rejected", () => {
  for (const q of [
    {},
    { "product:hose": "0" },
    { "product:hose": "-1" },
    { "product:hose": "1.5" },
    { "product:hose": "3" },
    { "product:hose": "1e2" },
    { foreign: "1" },
    { "gas:line": "Infinity" },
  ])
    assert.equal(selectedRefundLines(lines, q), null);
  assert.deepEqual(
    selectedRefundLines(lines, { "product:hose": "1", "gas:line": "500" }),
    [
      { source: "product:hose", quantity: 1 },
      { source: "gas:line", quantity: 500 },
    ],
  );
});
test("MORD-PARTIAL: loading, failure retry, empty and invalid selection cannot submit; consent is explicit", async () => {
  let fail = true,
    writes = 0;
  const api = async (a: string) => {
    if (a === "refund.request") {
      writes++;
      return { id: "x" };
    }
    if (fail) throw Error("Offline refund lookup");
    return lines;
  };
  const tree = await mount(Partial, { api, orderId: order.id });
  assert.match(content(tree), /Offline refund lookup/);
  let submit = button(tree, "Request selected refund as purchase credit");
  assert.equal(submit.props.disabled, true);
  await act(async () => submit.props.onPress());
  assert.equal(writes, 0);
  fail = false;
  await act(async () =>
    button(tree, "Retry refundable quantities").props.onPress(),
  );
  await fill(
    tree,
    "Refund reason, required",
    "Synthetic refund review request",
  );
  await fill(tree, "Refund quantity product:hose", "3");
  assert.equal(
    button(tree, "Request selected refund as purchase credit").props.disabled,
    true,
  );
  await fill(tree, "Refund quantity product:hose", "1");
  assert.equal(
    button(tree, "Request selected refund as purchase credit").props.disabled,
    true,
  );
  const consent = tree.root
    .findAllByType("Pressable")
    .find((n: any) => n.props.accessibilityRole === "checkbox");
  await act(async () => consent.props.onPress());
  assert.equal(
    button(tree, "Request selected refund as purchase credit").props.disabled,
    false,
  );
  await dispose(tree);
  const empty = await mount(Partial, {
    api: async () => [],
    orderId: order.id,
  });
  assert.match(content(empty), /No quantities are available/);
  assert.equal(
    button(empty, "Request selected refund as purchase credit").props.disabled,
    true,
  );
  await dispose(empty);
});
test("MORD-IDEMPOTENCY: failed submission retries same key, concurrent taps submit once and successful requests stay locked", async () => {
  const calls: any[] = [];
  let fail = true,
    resolve: any;
  const api = async (a: string, d: any) => {
    if (a !== "refund.request") return lines;
    calls.push(d);
    if (fail) throw Error("Uncertain network result");
    return new Promise((r) => (resolve = r));
  };
  const tree = await mount(Partial, { api, orderId: order.id });
  await fill(
    tree,
    "Refund reason, required",
    "Synthetic selected refund request",
  );
  await fill(tree, "Refund quantity product:hose", "1");
  await act(async () =>
    tree.root
      .findAllByType("Pressable")
      .find((n: any) => n.props.accessibilityRole === "checkbox")
      .props.onPress(),
  );
  await act(async () =>
    button(tree, "Request selected refund as purchase credit").props.onPress(),
  );
  assert.match(content(tree), /Uncertain network result/);
  fail = false;
  const submit = button(tree, "Request selected refund as purchase credit");
  let first: any;
  await act(async () => {
    first = submit.props.onPress();
    await submit.props.onPress();
  });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].idempotencyKey, calls[1].idempotencyKey);
  assert.deepEqual(calls[1].lines, [{ source: "product:hose", quantity: 1 }]);
  assert.equal(calls[1].acceptWalletCredit, true);
  await act(async () => {
    resolve({ id: "pending-review" });
    await first;
  });
  assert.match(content(tree), /awaiting independent finance review/);
  assert.equal(
    button(tree, "Request selected refund as purchase credit").props.disabled,
    true,
  );
  await dispose(tree);
});

test("MORD-LIFECYCLE: late reads from a previous order cannot populate a different refund form", async () => {
  let oldResolve: any;
  const api = async (a: string) =>
    a.includes("old-order")
      ? new Promise((r) => (oldResolve = r))
      : [{ source: "product:new", remaining: 1 }];
  const tree = await mount(Partial, { api, orderId: "old-order" });
  assert.match(content(tree), /Loading refundable quantities/);
  assert.equal(
    button(tree, "Request selected refund as purchase credit").props.disabled,
    true,
  );
  await act(async () =>
    tree.update(React.createElement(Partial, { api, orderId: "new-order" })),
  );
  await act(async () =>
    oldResolve([{ source: "product:old", remaining: 100 }]),
  );
  assert.match(content(tree), /product:new/);
  assert.doesNotMatch(content(tree), /product:old/);
  await dispose(tree);
});
