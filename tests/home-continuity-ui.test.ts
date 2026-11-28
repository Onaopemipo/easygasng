import test, { after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { build } from "esbuild";
const req = createRequire(path.resolve("tests/native-renderer/package.json")),
  React = req("react"),
  { create, act } = req("react-test-renderer");
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const dir = await mkdtemp(path.join(os.tmpdir(), "home-continuity-"));
after(() => rm(dir, { recursive: true, force: true }));
const stub = path.join(dir, "stub.tsx");
await writeFile(
  stub,
  `import React from 'react';export const usePathname=()=>globalThis.homeQA.path;export const useRouter=()=>({});export const api=(...args)=>globalThis.homeQA.api(...args);export const PageLoadingFallback=()=> <section role="status">Loading page</section>;export default function PublicSite({initialCatalogue}){return <main><header>EasyGas public home</header><h1>{initialCatalogue.website.heroHeading}</h1><p>{initialCatalogue.gas.priceKobo} per kg</p><footer>Public footer</footer></main>}`,
);
const site = await readFile("apps/web/components/site.tsx", "utf8");
const start = site.indexOf("  const pathname = usePathname();"),
  end = site.indexOf("  // Hydrate once per mount", start);
assert.ok(start >= 0 && end > start);
const actualCatalogue = site.slice(start, end);
const linkStub = path.join(dir, "link.tsx");
await writeFile(
  linkStub,
  `import React from 'react';export default p=><a {...p}/>;`,
);
const entry = path.join(dir, "entry.tsx");
await writeFile(
  entry,
  `import React,{useEffect,useState}from'react';import{usePathname,useRouter,api}from'${stub}';import{publicHomeCache}from'${path.resolve("apps/web/components/public-home-cache")}';type CartItem=any;export{publicHomeCache};export{default as Fallback}from'${path.resolve("apps/web/components/home-transition-fallback")}';export{default as PublicLink}from'${path.resolve("apps/web/components/workspace-link")}';export function Catalogue({initialCatalogue=null,initialUser=null}){${actualCatalogue};return <output state={{catalogue,error,homeRefreshError}}/>;}`,
);
await build({
  entryPoints: [entry],
  outfile: path.join(dir, "test.cjs"),
  bundle: true,
  platform: "node",
  format: "cjs",
  jsx: "automatic",
  plugins: [
    {
      name: "hosts",
      setup(b) {
        b.onResolve({ filter: /^next\/link$/ }, () => ({ path: linkStub }));
        b.onResolve({ filter: /^react(\/.*)?$/ }, (a) => ({
          path: req.resolve(a.path),
          external: true,
        }));
        b.onResolve(
          { filter: /^next\/navigation$|^\.\/easygas-loader$|^\.\/site$/ },
          () => ({ path: stub }),
        );
      },
    },
  ],
});
const m = req(path.join(dir, "test.cjs"));
const home = {
  products: [],
  windows: ["14:00–18:00"],
  gas: { locations: [], priceKobo: 180000 },
  website: { heroHeading: "Cooking gas delivered to your door" },
  testimonials: [],
};
const body = (tree: any) => JSON.stringify(tree.toJSON());
test("HOME-COLD/WARM actual route fallback shows one cold loader, then the complete saved public Home during navigation without a page loader", async () => {
  (globalThis as any).homeQA = { path: "/", api: async () => home };
  let tree: any;
  await act(async () => (tree = create(React.createElement(m.Fallback))));
  assert.match(body(tree), /Loading page/);
  await act(async () => m.publicHomeCache.remember(home));
  assert.doesNotMatch(body(tree), /Loading page/);
  assert.match(body(tree), /Cooking gas delivered to your door/);
  assert.match(body(tree), /180000/);
  assert.match(body(tree), /Public footer/);
  assert.equal(
    tree.root.findAllByProps({ "data-home-retained": "true" }).length,
    1,
  );
  await act(async () => tree.unmount());
});
test("HOME-ROUTES a warm public snapshot is never substituted for account, auth, order, admin or other routes", async () => {
  for (const path of [
    "/account",
    "/orders",
    "/checkout",
    "/wallet",
    "/login",
    "/admin",
    "/products",
    "/payment-request",
  ]) {
    (globalThis as any).homeQA = { path, api: async () => home };
    let tree: any;
    await act(async () => (tree = create(React.createElement(m.Fallback))));
    assert.match(body(tree), /Loading page/, path);
    assert.doesNotMatch(body(tree), /Cooking gas delivered/, path);
    await act(async () => tree.unmount());
  }
});
test("HOME-REFRESH actual Site catalogue state restores the public Home on mount, retains it on refresh failure and replaces it only when fresh data succeeds", async () => {
  let tree: any,
    finish: (v: any) => void = () => {},
    fail: (e: any) => void = () => {};
  (globalThis as any).homeQA = {
    path: "/",
    api: () =>
      new Promise((resolve, reject) => {
        finish = resolve;
        fail = reject;
      }),
  };
  await act(async () => (tree = create(React.createElement(m.Catalogue))));
  let state = () => tree.root.findByType("output").props.state;
  assert.equal(state().catalogue.website.heroHeading, home.website.heroHeading);
  await act(async () => fail(Error("Synthetic offline")));
  assert.equal(state().catalogue.website.heroHeading, home.website.heroHeading);
  assert.equal(state().error, "");
  assert.match(state().homeRefreshError, /Synthetic offline/);
  const fresh = {
    ...home,
    website: { heroHeading: "Updated public homepage" },
  };
  await act(async () =>
    tree.update(React.createElement(m.Catalogue, { initialCatalogue: fresh })),
  );
  assert.equal(
    state().catalogue.website.heroHeading,
    "Updated public homepage",
  );
  assert.equal(state().homeRefreshError, "");
  await act(async () => tree.unmount());
});
test("HOME-LATE cancelled old catalogue requests cannot overwrite a newer server-fed homepage", async () => {
  let finish: (v: any) => void = () => {},
    tree: any;
  (globalThis as any).homeQA = {
    path: "/",
    api: () => new Promise((resolve) => (finish = resolve)),
  };
  await act(async () => (tree = create(React.createElement(m.Catalogue))));
  const fresh = {
    ...home,
    website: { heroHeading: "Authoritative fresh home" },
  };
  await act(async () =>
    tree.update(React.createElement(m.Catalogue, { initialCatalogue: fresh })),
  );
  await act(async () =>
    finish({ ...home, website: { heroHeading: "Stale response" } }),
  );
  assert.equal(
    tree.root.findByType("output").props.state.catalogue.website.heroHeading,
    "Authoritative fresh home",
  );
  await act(async () => tree.unmount());
});

test("HOME-ANALYTICS actual link preserves public Home SPA continuity but retains hard navigation for private and token/query destinations", async () => {
  const previous = (globalThis as any).window;
  try {
    for (const [href, hard] of [
      ["/", false],
      ["/account", true],
      ["/?token=private", true],
    ]) {
      const navigations: string[] = [];
      let prevented = false;
      (globalThis as any).window = {
        easygasAnalyticsLoaded: true,
        location: {
          href: "https://example.test/products",
          assign: (target: string) => navigations.push(target),
        },
      };
      let tree: any;
      await act(
        async () =>
          (tree = create(React.createElement(m.PublicLink, { href }, "Home"))),
      );
      await act(async () =>
        tree.root.findByType("a").props.onNavigate({
          preventDefault() {
            prevented = true;
          },
        }),
      );
      assert.equal(prevented, hard, href as string);
      assert.equal(navigations.length, hard ? 1 : 0, href as string);
      if (hard)
        assert.equal(
          (globalThis as any).window["ga-disable-G-8Y34NXQMMK"],
          true,
        );
      await act(async () => tree.unmount());
    }
  } finally {
    (globalThis as any).window = previous;
  }
});
