import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";
import { build } from "esbuild";
const req = createRequire(path.resolve("tests/native-renderer/package.json")),
  React = req("react"),
  { create, act } = req("react-test-renderer");
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "easygas-dj-proof-"));
after(() => fs.rm(tmp, { recursive: true, force: true }));
await fs.writeFile(
  path.join(tmp, "ui.tsx"),
  `import React from 'react';export const api=(...a)=>globalThis.djApi(...a);export const Notice=({message})=><p>{message}</p>;export const Loading=()=>null;export const Modal=({children})=><section>{children}</section>;`,
);
await build({
  stdin: {
    contents: `export {default as Controls} from './apps/web/components/driver-delivery-controls';`,
    resolveDir: process.cwd(),
    loader: "tsx",
  },
  outfile: path.join(tmp, "component.cjs"),
  bundle: true,
  format: "cjs",
  platform: "node",
  jsx: "automatic",
  plugins: [
    {
      name: "transport",
      setup(b) {
        b.onResolve({ filter: /^react(\/.*)?$/ }, (a) => ({
          path: req.resolve(a.path),
          external: true,
        }));
        b.onResolve({ filter: /^\.\/ui$/ }, () => ({
          path: path.join(tmp, "ui.tsx"),
        }));
        b.onLoad({ filter: /\.css$/ }, () => ({
          contents: "export default {}",
          loader: "js",
        }));
      },
    },
  ],
});
const { Controls } = createRequire(import.meta.url)(
  path.join(tmp, "component.cjs"),
);
const props = {
  order: {
    id: "ORDER",
    tracking_version: 7,
    status: "out_for_delivery",
    payment_status: "verified",
    attempt: { id: "ATTEMPT-2", state: "arrived" },
  },
  disabled: false,
  lpg: { pickupReady: true, handoverReady: true },
  async write() {},
  async refresh() {},
};
const handover = (t: any) =>
  t.root
    .findAllByType("fieldset")
    .find((f: any) => f.findAllByProps({ name: "code" }).length > 0);
test("DJ-PROOF-UI: handover stays disabled for missing/unavailable current-attempt proof; retry restores only authoritative proof and late reads cannot undo a confirmed upload", async () => {
  let t: any;
  const pending: any[] = [];
  const originalForm = globalThis.FormData,
    originalFetch = globalThis.fetch;
  (globalThis as any).djApi = (a: string, _: any, o: any) =>
    new Promise((resolve, reject) => pending.push({ a, o, resolve, reject }));
  try {
    await act(async () => {
      t = create(React.createElement(Controls, props));
    });
    assert.equal(handover(t).props.disabled, true);
    assert.match(pending[0].a, /attemptId=ATTEMPT-2/);
    await act(async () => pending[0].reject(Error("Proof read unavailable")));
    assert.equal(handover(t).props.disabled, true);
    const retry = t.root
      .findAllByType("button")
      .find((b: any) => b.children.join("") === "Retry proof check");
    await act(async () => retry.props.onClick());
    await act(async () => pending[1].resolve({ photos: [] }));
    assert.equal(handover(t).props.disabled, true);
    await act(async () => t.unmount());
    await act(async () => {
      t = create(React.createElement(Controls, props));
    });
    const file = new File(["synthetic"], "synthetic.png", {
      type: "image/png",
    });
    (globalThis as any).FormData = class {
      get(k: string) {
        return k === "image" ? file : "Synthetic test proof";
      }
      set() {}
    };
    (globalThis as any).fetch = async () => ({
      ok: true,
      json: async () => ({ id: "NEW-PROOF" }),
    });
    const form = t.root
      .findAllByType("form")
      .find((f: any) => f.findAllByProps({ name: "image" }).length > 0);
    await act(async () =>
      form.props.onSubmit({ preventDefault() {}, currentTarget: {} }),
    );
    assert.equal(pending[2].o.signal.aborted, true);
    assert.equal(handover(t).props.disabled, false);
    await act(async () => pending[2].resolve({ photos: [] }));
    assert.equal(handover(t).props.disabled, false);
    await act(async () => t.unmount());
    await act(async () => {
      t = create(React.createElement(Controls, props));
    });
    await act(async () =>
      pending[3].resolve({ photos: [{ id: "CURRENT-PROOF" }] }),
    );
    assert.equal(handover(t).props.disabled, false);
  } finally {
    if (t) await act(async () => t.unmount());
    globalThis.FormData = originalForm;
    globalThis.fetch = originalFetch;
    delete (globalThis as any).djApi;
  }
});

await fs.writeFile(
  path.join(tmp, "stubs.tsx"),
  `import React from 'react';export default function Probe(p){return React.createElement('JobControls',p)};export const ActionForm=()=>null;export const useTheme=()=>({theme:'light',resolvedTheme:'light',setTheme(){}});export const lpgReadiness=()=>({pickupReady:true,handoverReady:true});`,
);
await build({
  stdin: {
    contents: `export {default as Experience} from './apps/web/components/driver-experience';`,
    resolveDir: process.cwd(),
    loader: "tsx",
  },
  outfile: path.join(tmp, "experience.cjs"),
  bundle: true,
  format: "cjs",
  platform: "node",
  jsx: "automatic",
  plugins: [
    {
      name: "experience-transport",
      setup(b) {
        b.onResolve({ filter: /^react(\/.*)?$/ }, (a) => ({
          path: req.resolve(a.path),
          external: true,
        }));
        b.onResolve({ filter: /^\.\/ui$/ }, () => ({
          path: path.join(tmp, "ui.tsx"),
        }));
        b.onResolve(
          {
            filter:
              /^\.\/(theme-provider|workflows|driver-trip-controls|driver-delivery-controls|driver-lpg-controls)$/,
          },
          () => ({ path: path.join(tmp, "stubs.tsx") }),
        );
        b.onLoad({ filter: /\.css$/ }, () => ({
          contents: "export default {}",
          loader: "js",
        }));
      },
    },
  ],
});
const { Experience } = createRequire(import.meta.url)(
  path.join(tmp, "experience.cjs"),
);
test("DJ-COMPLETION-UI: confirmed driver handover opens completed History and a clear success notice rather than an obsolete active assignment", async () => {
  const saved = {
    window: (globalThis as any).window,
    document: (globalThis as any).document,
    raf: (globalThis as any).requestAnimationFrame,
  };
  let t: any,
    completed = false;
  (globalThis as any).window = {
    addEventListener() {},
    removeEventListener() {},
    scrollY: 0,
    scrollTo() {},
  };
  (globalThis as any).document = { visibilityState: "hidden" };
  (globalThis as any).requestAnimationFrame = (fn: any) => fn();
  (globalThis as any).djApi = async (a: string) => {
    if (a === "driver.restrict") return {};
    if (a === "driver.snapshot")
      return {
        profile: { name: "Synthetic driver" },
        metrics: {
          newAssignments: 0,
          inProgress: completed ? 0 : 1,
          completedToday: completed ? 1 : 0,
        },
        responses: [],
        trip: null,
        gps: { status: "unavailable" },
      };
    if (a.startsWith("orders?"))
      return completed
        ? []
        : [
            {
              ...props.order,
              reference: "SYNTHETIC-JOURNEY",
              customer_name: "Synthetic customer",
              address: { street: "Synthetic road" },
              manifest: { items: [], gas: [] },
            },
          ];
    if (a === "bulk.summary") return { loads: [], meters: [] };
    if (a === "driver.complete") {
      completed = true;
      return { ok: true };
    }
    if (a.startsWith("driver.history"))
      return {
        rows: [
          {
            id: "ATTEMPT-2",
            reference: "SYNTHETIC-JOURNEY",
            order_id: "ORDER",
            outcome: "delivered",
            closed_at: new Date().toISOString(),
            has_proof: false,
          },
        ],
        total: 1,
        delivered: 1,
        page: 1,
        pageSize: 20,
      };
    return {};
  };
  try {
    await act(async () => {
      t = create(React.createElement(Experience, { userId: "DRIVER" }));
    });
    const view = t.root
      .findAllByType("button")
      .find((b: any) => b.children.join("") === "View order");
    assert.ok(view);
    await act(async () => view.props.onClick());
    const job = t.root
      .findAllByType("JobControls")
      .find((c: any) => c.props.write);
    assert.ok(job);
    await act(async () =>
      job.props.write("driver.complete", {
        orderId: "ORDER",
        version: 7,
        code: "123456",
        handover: true,
      }),
    );
    const rendered = JSON.stringify(t.toJSON());
    assert.match(
      rendered,
      /Delivery completed\. The confirmed handover is in History/,
    );
    assert.doesNotMatch(
      rendered,
      /This assignment is no longer in your current orders/,
    );
    assert.match(rendered, /SYNTHETIC-JOURNEY/);
  } finally {
    if (t) await act(async () => t.unmount());
    (globalThis as any).window = saved.window;
    (globalThis as any).document = saved.document;
    (globalThis as any).requestAnimationFrame = saved.raf;
    delete (globalThis as any).djApi;
  }
});
