import test, { after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm, readFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";
import { build } from "esbuild";
const req = createRequire(path.resolve("tests/native-renderer/package.json")),
  rootReq = createRequire(path.resolve("package.json")),
  React = req("react"),
  { create, act } = req("react-test-renderer");
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const dir = await mkdtemp(path.join(os.tmpdir(), "price-ui-"));
after(() => rm(dir, { recursive: true, force: true }));
const stub = path.join(dir, "stub.tsx");
await writeFile(
  stub,
  `import React from 'react';export const api=(...args)=>globalThis.priceQA.api(...args);export const Notice=({message})=><p role="alert">{message}</p>;export const Loading=()=> <div role="status">Loading</div>;export const ActionLoadingIndicator=({label})=><span role="status">{label}</span>;export const FieldCaption=({children})=><span>{children}</span>;export const useCheckoutProfile=()=>({profile:null,loading:false});export const deliveryAreaEvent='price-area';export const readDeliveryArea=()=>'';export const writeDeliveryArea=()=>{};export const CheckoutPaymentMethods=()=>null;export const SaveCheckoutDetails=()=>null;export const OrderCardPayment=()=>null;export const RewardCheckoutField=()=>null;export const ArrowRight=()=>null,Cylinder=()=>null,House=()=>null,MapPin=()=>null,ShoppingCart=()=>null,Tag=()=>null,Truck=()=>null;export default ({children,...p})=><a {...p}>{children}</a>;`,
);
const entry = path.join(dir, "entry.tsx");
await writeFile(
  entry,
  `export {default} from '${path.resolve("apps/web/components/gas-order.tsx")}';export{publicGasCache}from'${path.resolve("apps/web/components/public-gas-cache.ts")}';`,
);
async function bundle(name: string, reactReq: any) {
  await build({
    entryPoints: [entry],
    outfile: path.join(dir, name + ".cjs"),
    bundle: true,
    platform: "node",
    format: "cjs",
    jsx: "automatic",
    plugins: [
      {
        name: "hosts",
        setup(b) {
          b.onResolve({ filter: /^react(\/.*)?$/ }, (a) => ({
            path: reactReq.resolve(a.path),
            external: true,
          }));
          b.onResolve(
            {
              filter:
                /^(lucide-react|\.\/(ui|easygas-loader|field-caption|checkout-delivery-fields|delivery-pin-picker|checkout-payment-methods|save-checkout-details|hosted-payment|easyrewards|delivery-area-preference|workspace-link))$/,
            },
            () => ({ path: stub }),
          );
        },
      },
    ],
  });
  return req(path.join(dir, name + ".cjs"));
}
const m = await bundle("component", req),
  ssr = await bundle("server", rootReq),
  empty = await bundle("empty", req);
const gas = (version = 1) => ({
  branchId: "lagos",
  fetchedAt: Date.now(),
  priceKobo: 180000,
  deliveryKobo: 500000,
  priceVersion: version,
  feeVersion: version,
  policyVersion: version,
  policy: {
    minimumKg: 1,
    maximumKg: 50,
    incrementKg: 0.5,
    precision: 1,
    capacitiesKg: [6, 12.5, 50],
  },
  locations: [
    {
      id: "lekki",
      name: "Lekki",
      branch_id: "lagos",
      coverage: "Synthetic approved area",
    },
  ],
  deliveryOnly: true,
});
const catalogue = (g: any) => ({
  gas: g,
  windows: ["14:00–18:00"],
  products: [],
  orderingEnabled: true,
});
const text = (tree: any) => JSON.stringify(tree.toJSON());
test("PRICE-SSR real compact price card contains both canonical figures and no loading state before JavaScript effects", () => {
  const R = rootReq("react"),
    server = rootReq("react-dom/server");
  const html = server.renderToString(
    R.createElement(ssr.default, {
      catalogue: catalogue(gas()),
      user: null,
      compact: true,
    }),
  );
  assert.match(html, /₦1,800\/kg/);
  assert.match(html, /₦5,000/);
  assert.doesNotMatch(html, /Loading gas price|Loading delivery fee/);
  const full = server.renderToString(
    R.createElement(ssr.default, { catalogue: catalogue(gas()), user: null }),
  );
  assert.match(full, /₦1,800/);
  assert.doesNotMatch(full, /Loading gas price/);
});
test("PRICE-UI seeded mount and navigation remount do not fetch or flash; stale refresh keeps figures and applies the latest pair", async () => {
  const previous = (globalThis as any).window;
  const realNow = Date.now;
  let now = realNow(),
    calls = 0,
    finish: (v: any) => void = () => {};
  Date.now = () => now;
  (globalThis as any).window = {
    addEventListener() {},
    removeEventListener() {},
    location: { hash: "" },
  };
  (globalThis as any).priceQA = {
    api: async () => {
      calls++;
      return new Promise((r) => (finish = r));
    },
  };
  let tree: any;
  try {
    const data = catalogue(gas());
    await act(async () => {
      tree = create(
        React.createElement(m.default, {
          catalogue: data,
          user: null,
          compact: true,
        }),
      );
    });
    assert.equal(calls, 0);
    assert.match(text(tree), /₦1,800\/kg/);
    assert.doesNotMatch(text(tree), /Loading gas price/);
    await act(async () => tree.unmount());
    await act(
      async () =>
        (tree = create(
          React.createElement(m.default, {
            catalogue: data,
            user: null,
            compact: true,
          }),
        )),
    );
    assert.equal(calls, 0);
    assert.doesNotMatch(text(tree), /Loading gas price/);
    await act(async () => tree.unmount());
    now += 61000;
    await act(
      async () =>
        (tree = create(
          React.createElement(m.default, {
            catalogue: data,
            user: null,
            compact: true,
          }),
        )),
    );
    assert.equal(calls, 1);
    assert.match(text(tree), /₦1,800\/kg/);
    assert.match(text(tree), /₦5,000/);
    assert.doesNotMatch(text(tree), /Loading gas price/);
    await act(async () =>
      finish({ ...gas(2), priceKobo: 190000, deliveryKobo: 450000 }),
    );
    assert.match(text(tree), /₦1,900\/kg/);
    assert.match(text(tree), /₦4,500/);
  } finally {
    if (tree) await act(async () => tree.unmount());
    Date.now = realNow;
    (globalThis as any).window = previous;
    delete (globalThis as any).priceQA;
  }
});
test("PRICE-LOADER missing initial pricing uses exactly one paired loader and one shared request until both figures arrive", async () => {
  const previous = (globalThis as any).window;
  let calls = 0,
    finish: (v: any) => void = () => {};
  (globalThis as any).window = {
    addEventListener() {},
    removeEventListener() {},
    location: { hash: "" },
  };
  (globalThis as any).priceQA = {
    api: async () => {
      calls++;
      return new Promise((r) => (finish = r));
    },
  };
  let tree: any;
  try {
    const g = { ...gas(3), branchId: undefined };
    await act(
      async () =>
        (tree = create(
          React.createElement(empty.default, {
            catalogue: catalogue(g),
            user: null,
            compact: true,
          }),
        )),
    );
    assert.equal(calls, 1);
    const loading = tree.root
      .findAllByProps({ role: "status" })
      .filter((n: any) =>
        n.children.join("").includes("Loading gas price and delivery fee"),
      );
    assert.equal(loading.length, 1);
    assert.doesNotMatch(text(tree), /Loading delivery fee/);
    await act(async () =>
      finish({ ...gas(3), priceKobo: 175000, deliveryKobo: 400000 }),
    );
    assert.match(text(tree), /₦1,750\/kg/);
    assert.match(text(tree), /₦4,000/);
    assert.doesNotMatch(text(tree), /Loading gas price/);
  } finally {
    if (tree) await act(async () => tree.unmount());
    (globalThis as any).window = previous;
    delete (globalThis as any).priceQA;
  }
});
test("PRICE-HOME server-fed home bypasses cart hydration loader and avoids duplicate homepage catalogue request; testimonials fail independently", async () => {
  const s = await readFile("apps/web/components/site.tsx", "utf8"),
    page = await readFile("apps/web/app/page.tsx", "utf8");
  assert.match(s, /pathname === "\/" && initialCatalogue/);
  assert.match(s, /!ready && !\(pathname === "\/" && catalogue\)/);
  assert.match(
    page,
    /dispatch\("testimonials.public", null\).catch\(\(\) => \[\]\)/,
  );
});

test("PRICE-UI-RETRY a failed background refresh keeps both figures visible and explicit retry replaces them together", async () => {
  const m = await bundle("failure", req),
    previous = (globalThis as any).window;
  let tree: any,
    calls = 0;
  (globalThis as any).window = {
    addEventListener() {},
    removeEventListener() {},
    location: { hash: "" },
  };
  (globalThis as any).priceQA = {
    api: async () => {
      calls++;
      throw Error("Synthetic network unavailable");
    },
  };
  try {
    const g = { ...gas(10), fetchedAt: Date.now() - 61000 };
    await act(async () => {
      tree = create(
        React.createElement(m.default, {
          catalogue: catalogue(g),
          user: null,
          compact: true,
        }),
      );
    });
    assert.equal(calls, 1);
    assert.match(text(tree), /₦1,800\/kg/);
    assert.match(text(tree), /₦5,000/);
    assert.match(text(tree), /Synthetic network unavailable/);
    assert.doesNotMatch(text(tree), /Loading gas price/);
    (globalThis as any).priceQA.api = async () => {
      calls++;
      return { ...gas(11), priceKobo: 195000, deliveryKobo: 475000 };
    };
    const retry = tree.root
      .findAllByType("button")
      .find((n: any) => n.children.join("") === "Retry prices");
    assert.ok(retry);
    await act(async () => retry.props.onClick());
    assert.equal(calls, 2);
    assert.match(text(tree), /₦1,950\/kg/);
    assert.match(text(tree), /₦4,750/);
    assert.doesNotMatch(text(tree), /Synthetic network unavailable/);
  } finally {
    if (tree) await act(async () => tree.unmount());
    (globalThis as any).window = previous;
    delete (globalThis as any).priceQA;
  }
});
