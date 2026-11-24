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
const temp = await fs.mkdtemp(path.join(os.tmpdir(), "easygas-tc-ui-"));
after(() => fs.rm(temp, { recursive: true, force: true }));
await fs.writeFile(
  path.join(temp, "ui.tsx"),
  `import React from 'react';export const api=(...a)=>globalThis.tcApi(...a);export const Notice=({message})=><p role="alert">{message}</p>;export const Modal=({children,title})=><section role="dialog" aria-label={title}>{children}</section>;export const Loading=()=>null;export const money=String;`,
);
await build({
  stdin: {
    contents: `export {default as Manage} from './apps/web/components/dispatch-trip';`,
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
      name: "transport",
      setup(b) {
        b.onResolve({ filter: /^react(\/.*)?$/ }, (a) => ({
          path: req.resolve(a.path),
          external: true,
        }));
        b.onResolve({ filter: /^\.\/ui$/ }, () => ({
          path: path.join(temp, "ui.tsx"),
        }));
      },
    },
  ],
});
const { Manage } = createRequire(import.meta.url)(path.join(temp, "test.cjs"));
const trip = {
  id: "T",
  branch_id: "lagos",
  driver_name: "Synthetic driver",
  vehicle_label: "Old van",
  start_odometer: 100,
  version: 1,
  ended_at: null,
};
const options = {
  branches: [{ id: "lagos", name: "Synthetic Lagos", active: true }],
  trips: [trip],
  vehicles: [{ id: "V", label: "Replacement van", branch_id: "lagos" }],
  writesEnabled: true,
};
const review = {
  trip,
  reconciliation: { clear: true, blockers: [] },
  writesEnabled: true,
  canChange: true,
};
const props = {
  branch: "lagos",
  initialTripId: "T",
  onClose() {},
  onDone() {},
  onResolve() {},
};
const text = (t: any) => JSON.stringify(t.toJSON());
const button = (t: any, name: string) =>
  t.root.findAllByType("button").find((b: any) => b.children.join("") === name);
async function submit(t: any, values: any) {
  const original = globalThis.FormData;
  (globalThis as any).FormData = class {
    get(n: string) {
      return values[n] ?? null;
    }
  };
  try {
    await act(async () =>
      t.root
        .findByType("form")
        .props.onSubmit({ preventDefault() {}, currentTarget: {} }),
    );
  } finally {
    globalThis.FormData = original;
  }
}

test("TC-UI: real manager dialog exposes separate end/change actions and separate odometers/password; wrong verification and uncertain save preserve exact retry identity", async () => {
  let t: any,
    done = 0,
    first = true;
  const calls: any[] = [];
  (globalThis as any).tcApi = async (a: string, d: any) => {
    calls.push({ a, d });
    if (a === "dispatch.trip.options") return options;
    if (a.startsWith("dispatch.trip.review")) return review;
    if (a === "reauth") {
      if (d.password === "wrong") throw Error("Incorrect password");
      return {};
    }
    if (first) {
      first = false;
      throw Error("Response unavailable");
    }
    return { id: "T", newTripId: "NEW" };
  };
  try {
    await act(async () => {
      t = create(
        React.createElement(Manage, {
          ...props,
          onDone() {
            done++;
          },
        }),
      );
    });
    assert.equal(t.root.findAllByType("form").length, 0);
    await act(async () => button(t, "Change vehicle").props.onClick());
    assert.ok(t.root.findByProps({ name: "endOdometer" }));
    assert.ok(t.root.findByProps({ name: "startOdometer" }));
    assert.ok(t.root.findByProps({ name: "verificationPassword" }));
    const values = {
      tripId: "T",
      version: "1",
      vehicleId: "V",
      endOdometer: "120",
      startOdometer: "9000",
      verificationPassword: "fixture-only",
    };
    await submit(t, { ...values, verificationPassword: "wrong" });
    assert.equal(calls.filter((c) => c.a === "dispatch.trip.change").length, 0);
    const input = t.root.findByProps({ name: "endOdometer" });
    await submit(t, values);
    assert.equal(t.root.findByProps({ name: "endOdometer" }), input);
    assert.match(text(t), /Response unavailable/);
    await submit(t, values);
    const writes = calls.filter((c) => c.a === "dispatch.trip.change");
    assert.equal(writes.length, 2);
    assert.equal(writes[0].d.operationKey, writes[1].d.operationKey);
    assert.deepEqual(writes[1].d, {
      tripId: "T",
      version: 1,
      vehicleId: "V",
      endOdometer: 120,
      startOdometer: 9000,
      operationKey: writes[0].d.operationKey,
    });
    assert.equal(done, 1);
  } finally {
    if (t) await act(async () => t.unmount());
    delete (globalThis as any).tcApi;
  }
});

test("TC-BLOCKERS: canonical reconciliation blocks writes and links to existing workspaces; disabled release and ended trip offer no mutation form", async () => {
  let t: any,
    destination = "";
  let response: any = {
    ...review,
    reconciliation: {
      clear: false,
      blockers: [
        {
          code: "PRODUCT_RECONCILIATION",
          title: "Return and reconcile manifests",
          count: 2,
          destination: "manifests",
        },
      ],
    },
  };
  (globalThis as any).tcApi = async (a: string) =>
    a === "dispatch.trip.options" ? options : response;
  try {
    await act(async () => {
      t = create(
        React.createElement(Manage, {
          ...props,
          onResolve(d: string) {
            destination = d;
          },
        }),
      );
    });
    assert.match(text(t), /Return and reconcile manifests/);
    assert.equal(button(t, "End trip").props.disabled, true);
    assert.equal(button(t, "Change vehicle").props.disabled, true);
    assert.equal(t.root.findAllByType("form").length, 0);
    await act(async () =>
      button(t, "Review product manifests").props.onClick(),
    );
    assert.equal(destination, "manifests");
    await act(async () => t.unmount());
    response = { ...review, writesEnabled: false };
    await act(async () => {
      t = create(React.createElement(Manage, props));
    });
    assert.equal(button(t, "End trip").props.disabled, true);
    assert.match(text(t), /release controls/);
    await act(async () => t.unmount());
    response = {
      ...review,
      trip: { ...trip, ended_at: "2026-11-24T00:00:00Z" },
    };
    await act(async () => {
      t = create(React.createElement(Manage, props));
    });
    assert.match(text(t), /already ended/);
    assert.equal(t.root.findAllByType("form").length, 0);
  } finally {
    if (t) await act(async () => t.unmount());
    delete (globalThis as any).tcApi;
  }
});

test("TC-RECOVERY: trip change clears prior review, ignores late reads and offers explicit recovery without a stale enabled form", async () => {
  let t: any;
  const pending: any[] = [];
  (globalThis as any).tcApi = (a: string, d: any, o: any) =>
    a === "dispatch.trip.options"
      ? Promise.resolve({ ...options, trips: [trip, { ...trip, id: "U" }] })
      : new Promise((resolve, reject) =>
          pending.push({ a, o, resolve, reject }),
        );
  try {
    await act(async () => {
      t = create(React.createElement(Manage, props));
    });
    await act(async () =>
      t.root
        .findAllByType("select")[1]
        .props.onChange({ target: { value: "U" } }),
    );
    assert.equal(pending[0].o.signal.aborted, true);
    await act(async () => pending[0].resolve(review));
    assert.equal(t.root.findAllByType("form").length, 0);
    await act(async () => pending[1].reject(Error("Review unavailable")));
    assert.match(text(t), /Review unavailable/);
    assert.equal(t.root.findAllByType("form").length, 0);
    await act(async () => t.unmount());
  } finally {
    delete (globalThis as any).tcApi;
  }
});
