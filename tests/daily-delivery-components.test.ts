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
const tmp = await fs.mkdtemp(
  path.join(os.tmpdir(), "easygas-daily-components-"),
);
after(() => fs.rm(tmp, { recursive: true, force: true }));
await fs.writeFile(
  path.join(tmp, "ui.tsx"),
  `import React from 'react';export const api=(...a)=>globalThis.dailyAPI(...a);export const Notice=({message})=><p>{message}</p>;`,
);
await fs.writeFile(
  path.join(tmp, "native.tsx"),
  `import React from 'react';export const View=p=><view {...p}/>;export const Button=p=><button {...p}/>;export const Card=p=><card {...p}/>;export const Copy=p=><text {...p}/>;export const Title=p=><title {...p}/>;export const TextInput=p=><input {...p}/>;export const FieldCaption=p=><label {...p}/>;export const useTheme=()=>({colors:{}});export const randomUUID=()=>crypto.randomUUID();`,
);
await build({
  stdin: {
    contents: `export {default as Day} from './apps/web/components/daily-delivery';export {default as Refill} from './apps/web/components/daily-refill';export {default as NativeRefill} from './apps/mobile/DailyRefill';`,
    resolveDir: process.cwd(),
    loader: "tsx",
  },
  outfile: path.join(tmp, "test.cjs"),
  bundle: true,
  format: "cjs",
  platform: "node",
  jsx: "automatic",
  plugins: [
    {
      name: "test-transport",
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
              /^(react-native|expo-crypto|\.\/CustomerUI|\.\/theme|\.\/typography)$/,
          },
          () => ({ path: path.join(tmp, "native.tsx") }),
        );
      },
    },
  ],
});
const { Day, Refill, NativeRefill } = createRequire(import.meta.url)(
  path.join(tmp, "test.cjs"),
);
const text = (t: any) => JSON.stringify(t.toJSON());
const order = {
  id: "ORDER",
  tracking_version: 8,
  attempt: { state: "arrived" },
  daily_run: { grams: 6000, supplied_grams: 0 },
};
test("DAY-UI office defaults, loading, stale branch/actor reads and denied recovery are explicit", async () => {
  const pending: any[] = [];
  (globalThis as any).dailyAPI = (...args: any[]) =>
    new Promise((resolve, reject) => pending.push({ args, resolve, reject }));
  let t: any;
  try {
    const props = {
      user: { id: "owner", role: "owner", branchId: "lagos" },
      branch: "lagos",
      onChange() {},
    };
    await act(async () => {
      t = create(React.createElement(Day, props));
    });
    assert.match(text(t), /Loading/);
    await act(async () => {
      pending[0].resolve({ enabled: true, runs: [] });
      pending[1].resolve({
        drivers: [{ id: "D", name: "Daily driver", branch_id: "lagos" }],
        vehicles: [{ id: "V", label: "Daily vehicle", branch_id: "lagos" }],
      });
    });
    const selects = t.root.findAllByType("select");
    assert.deepEqual(
      selects.map((x: any) => x.props.defaultValue),
      ["D", "V"],
    );
    assert.match(text(t), /gas-only/);
    assert.doesNotMatch(text(t), /meter calibration|Issue LPG/);
    await act(async () =>
      t.update(React.createElement(Day, { ...props, branch: "other" })),
    );
    assert.equal(t.root.findAllByType("form").length, 0);
    await act(async () =>
      t.update(
        React.createElement(Day, {
          ...props,
          user: { ...props.user, id: "new-owner" },
          branch: "third",
        }),
      ),
    );
    await act(async () => {
      pending[2].resolve({
        enabled: true,
        runs: [{ state: "active", label: "STALE VEHICLE" }],
      });
      pending[3].resolve({});
    });
    assert.doesNotMatch(text(t), /STALE VEHICLE/);
    await act(async () => pending[4].reject(Error("Access denied")));
    assert.match(text(t), /Access denied/);
    assert.equal(t.root.findAllByType("form").length, 0);
  } finally {
    if (t) await act(async () => t.unmount());
    delete (globalThis as any).dailyAPI;
  }
});
test("DAY-UI web scale retry preserves readings and operation key, prevents double taps and supports multiple cylinders", async () => {
  let t: any, resolve: any, reject: any;
  const calls: any[] = [];
  const write = (...args: any[]) => {
    calls.push(args);
    return new Promise((a, b) => {
      resolve = a;
      reject = b;
    });
  };
  try {
    await act(async () => {
      t = create(React.createElement(Refill, { order, write }));
    });
    const inputs = t.root.findAllByType("input");
    await act(async () => {
      inputs[0].props.onChange({ target: { value: "8.4" } });
      inputs[1].props.onChange({ target: { value: "14.4" } });
    });
    const submit = t.root.findByType("form").props.onSubmit;
    let request: any;
    await act(async () => {
      request = submit({ preventDefault() {} });
    });
    await act(async () => submit({ preventDefault() {} }));
    assert.equal(calls.length, 1);
    await act(async () => {
      reject(Error("Network unavailable"));
      await request;
    });
    assert.equal(t.root.findAllByType("input")[0].props.value, "8.4");
    assert.match(text(t), /Network unavailable/);
    await act(async () => {
      request = submit({ preventDefault() {} });
    });
    assert.equal(calls[1][1].operationKey, calls[0][1].operationKey);
    await act(async () => {
      resolve({ ok: true });
      await request;
    });
    await act(async () =>
      t.update(
        React.createElement(Refill, {
          order: { ...order, daily_run: { grams: 6000, supplied_grams: 6000 } },
          write,
        }),
      ),
    );
    assert.equal(t.root.findAllByType("form").length, 0);
    assert.match(text(t), /Upload the refill photo/);
  } finally {
    if (t) await act(async () => t.unmount());
  }
});
test("DAY-UI actual native refill submits before/after kg, preserves failure and refreshes proof stage on success", async () => {
  let t: any,
    saved = 0;
  const calls: any[] = [];
  let fail = true;
  const api = async (...a: any[]) => {
    calls.push(a);
    if (fail) throw Error("Connection lost");
    return { message: "Gas supplied recorded" };
  };
  try {
    await act(async () => {
      t = create(
        React.createElement(NativeRefill, {
          order,
          api,
          onSaved() {
            saved++;
          },
        }),
      );
    });
    let inputs = t.root.findAllByType("input");
    await act(async () => {
      inputs[0].props.onChangeText("8.4");
      inputs[1].props.onChangeText("14.4");
    });
    let button = t.root
      .findAllByType("button")
      .find((b: any) => b.props.label === "Save scale readings");
    assert.equal(button.props.disabled, false);
    await act(async () => button.props.onPress());
    assert.match(text(t), /Connection lost/);
    assert.equal(t.root.findAllByType("input")[1].props.value, "14.4");
    fail = false;
    await act(async () => button.props.onPress());
    assert.equal(calls[0][1].operationKey, calls[1][1].operationKey);
    assert.deepEqual(calls[1][1].readings, [{ beforeKg: 8.4, afterKg: 14.4 }]);
    assert.equal(saved, 1);
    await act(async () =>
      t.update(
        React.createElement(NativeRefill, {
          order: { ...order, daily_run: { grams: 6000, supplied_grams: 6000 } },
          api,
        }),
      ),
    );
    assert.match(text(t), /Refill recorded/);
    assert.equal(t.root.findAllByType("input").length, 0);
  } finally {
    if (t) await act(async () => t.unmount());
  }
});

test("DAY-UI live day refresh keeps the same closing form, updates supply totals, freezes writes on read failure and resets only for a different run", async () => {
  const pending: any[] = [];
  (globalThis as any).dailyAPI = (...args: any[]) =>
    new Promise((resolve, reject) => pending.push({ args, resolve, reject }));
  let t: any;
  const run = {
    id: "RUN",
    label: "Daily vehicle",
    driver_name: "Driver",
    state: "active",
    opening_grams: 100000,
    added_grams: 0,
    supplied_grams: 0,
    committed_grams: 6000,
    version: 1,
  };
  const props = {
    user: { id: "owner", role: "owner", branchId: "lagos" },
    branch: "lagos",
    refreshToken: "1",
    onChange() {},
  };
  try {
    await act(async () => {
      t = create(React.createElement(Day, props));
    });
    await act(async () => {
      pending[0].resolve({ enabled: true, runs: [run] });
      pending[1].resolve({ drivers: [], vehicles: [] });
    });
    await act(async () =>
      t.root
        .findAllByType("button")
        .find((b: any) => b.children.join("") === "Close delivery day")
        .props.onClick(),
    );
    const form = t.root.findByType("form");
    await act(async () =>
      t.update(React.createElement(Day, { ...props, refreshToken: "2" })),
    );
    assert.equal(
      pending.length,
      3,
      "Background refresh must not replace vehicle/driver choices",
    );
    assert.equal(t.root.findByType("form"), form);
    await act(async () =>
      pending[2].resolve({
        enabled: true,
        runs: [
          { ...run, version: 2, supplied_grams: 6000, committed_grams: 0 },
        ],
      }),
    );
    assert.equal(t.root.findByType("form"), form);
    assert.match(text(t), /94/);
    await act(async () =>
      t.update(React.createElement(Day, { ...props, refreshToken: "3" })),
    );
    await act(async () => pending[3].reject(Error("Daily read unavailable")));
    assert.equal(t.root.findByType("form"), form);
    assert.equal(t.root.findByType("fieldset").props.disabled, true);
    assert.match(text(t), /Daily read unavailable/);
    await act(async () =>
      t.update(React.createElement(Day, { ...props, refreshToken: "4" })),
    );
    await act(async () =>
      pending[4].resolve({
        enabled: true,
        runs: [{ ...run, id: "OTHER", version: 1 }],
      }),
    );
    assert.notEqual(t.root.findByType("form"), form);
    assert.equal(t.root.findByType("fieldset").props.disabled, false);
  } finally {
    if (t) await act(async () => t.unmount());
    delete (globalThis as any).dailyAPI;
  }
});
