import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";
import { build } from "esbuild";
const req = createRequire(path.resolve("tests/native-renderer/package.json"));
const React = req("react"),
  { create, act } = req("react-test-renderer");
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const temp = await fs.mkdtemp(
  path.join(os.tmpdir(), "easygas-fleet-verification-"),
);
after(() => fs.rm(temp, { recursive: true, force: true }));
const shim = path.join(temp, "ui.tsx");
await fs.writeFile(
  shim,
  `import React from 'react';export const api=(a,d)=>globalThis.fleetVerifyApi(a,d);export const Notice=({message})=>React.createElement('p',null,message);export const money=(n)=>String(n);export const Loading=()=>null;export const Modal=({children})=>children;`,
);
await build({
  stdin: {
    contents: `export {OperationForm,FleetPanel} from './apps/web/components/operations-completion'`,
    resolveDir: process.cwd(),
    loader: "tsx",
  },
  outfile: path.join(temp, "component.cjs"),
  bundle: true,
  format: "cjs",
  platform: "node",
  jsx: "automatic",
  plugins: [
    {
      name: "transport-only",
      setup(b) {
        b.onResolve({ filter: /^react(\/.*)?$/ }, (a) => ({
          path: req.resolve(a.path),
          external: true,
        }));
        b.onResolve({ filter: /^\.\/ui$/ }, () => ({ path: shim }));
      },
    },
  ],
});
const { OperationForm, FleetPanel } = createRequire(import.meta.url)(
  path.join(temp, "component.cjs"),
);
const problem = (message: string, code = "REAUTH_REQUIRED") =>
  Object.assign(new Error(message), { code, status: 403 });
const fields = [
  { name: "branchId", label: "Branch", value: "lagos" },
  { name: "label", label: "Vehicle label" },
  { name: "capacityGrams", label: "Capacity", type: "number" },
  { name: "lpgSuitable", label: "LPG suitable", type: "checkbox" },
];
const draft = {
  branchId: "lagos",
  label: "Synthetic fleet vehicle",
  capacityGrams: "2000",
  lpgSuitable: "",
  verificationPassword: "fixture-current-password",
};
async function submit(tree: any, data: any) {
  const Original = globalThis.FormData;
  (globalThis as any).FormData = class {
    get(n: string) {
      return data[n] ?? null;
    }
  };
  try {
    await act(async () =>
      tree.root
        .findByType("form")
        .props.onSubmit({ preventDefault() {}, currentTarget: {} }),
    );
  } finally {
    globalThis.FormData = Original;
  }
}
test("FVERIFY-INITIAL: actual owner vehicle form exposes current password before registration and other roles cannot register", async () => {
  (globalThis as any).fleetVerifyApi = async () => ({
    vehicles: [],
    trips: [],
  });
  const originalWindow = (globalThis as any).window;
  (globalThis as any).window = {
    location: { hash: "" },
    addEventListener() {},
    removeEventListener() {},
  };
  let tree: any;
  try {
    await act(async () => {
      tree = create(
        React.createElement(FleetPanel, {
          user: { role: "owner", branch_id: "lagos" },
        }),
      );
    });
    assert.equal(
      tree.root
        .findAllByType("input")
        .filter((e: any) => e.props.name === "verificationPassword").length,
      1,
    );
    assert.match(JSON.stringify(tree.toJSON()), /Current password/);
    await act(async () =>
      tree.update(
        React.createElement(FleetPanel, {
          user: { role: "manager", branch_id: "lagos" },
        }),
      ),
    );
    assert.equal(tree.root.findAllByType("form").length, 0);
  } finally {
    if (tree) await act(async () => tree.unmount());
    delete (globalThis as any).fleetVerifyApi;
    (globalThis as any).window = originalWindow;
  }
});
test("FVERIFY-RECOVER: actual shared form preserves mounted fields and operation key across expired and incorrect verification, excludes password from mutation and commits once", async () => {
  const calls: any[] = [];
  let first = true,
    done = 0,
    tree: any;
  const passwordNode = { value: "fixture-current-password", focus() {} };
  (globalThis as any).fleetVerifyApi = async (action: string, data: any) => {
    calls.push({ action, data });
    if (action === "reauth") {
      if (data.password === "wrong")
        throw problem("Incorrect password", "INVALID_CREDENTIALS");
      return { ok: true };
    }
    if (first) {
      first = false;
      throw problem("Verify your password again before this sensitive action.");
    }
    return { id: "synthetic-vehicle" };
  };
  try {
    await act(async () => {
      tree = create(
        React.createElement(OperationForm, {
          title: "Register vehicle",
          action: "fleet.vehicle.create",
          fields,
          onDone: () => done++,
        }),
        {
          createNodeMock: (e: any) =>
            e.type === "input" && e.props.name === "verificationPassword"
              ? passwordNode
              : null,
        },
      );
    });
    const oldInput = tree.root.findByProps({ name: "label" });
    await submit(tree, draft);
    assert.equal(tree.root.findByProps({ name: "label" }), oldInput);
    assert.equal(
      tree.root.findAllByProps({ name: "verificationPassword" }).length > 0,
      true,
    );
    await submit(tree, { ...draft, verificationPassword: "wrong" });
    assert.equal(
      calls.filter((c) => c.action === "fleet.vehicle.create").length,
      1,
    );
    assert.equal(done, 0);
    assert.match(JSON.stringify(tree.toJSON()), /Incorrect password/);
    await submit(tree, draft);
    const writes = calls.filter((c) => c.action === "fleet.vehicle.create");
    assert.equal(writes.length, 2);
    assert.equal(writes[0].data.operationKey, writes[1].data.operationKey);
    assert.deepEqual(writes[1].data, {
      branchId: "lagos",
      label: draft.label,
      capacityGrams: 2000,
      lpgSuitable: false,
      operationKey: writes[0].data.operationKey,
    });
    assert.equal(done, 1);
    assert.equal(tree.root.findByProps({ name: "label" }), oldInput);
    assert.equal(passwordNode.value, "");
    assert.equal(
      tree.root.findAllByProps({ name: "verificationPassword" }).length,
      0,
    );
  } finally {
    if (tree) await act(async () => tree.unmount());
    delete (globalThis as any).fleetVerifyApi;
  }
});
test("FVERIFY-EXPIRY: verification rejected again during submission reopens the field, never loops automatically, and excludes verification from request mapping", async () => {
  let tree: any;
  const calls: any[] = [];
  (globalThis as any).fleetVerifyApi = async (a: string, d: any) => {
    calls.push({ a, d });
    if (a === "reauth") return { ok: true };
    throw problem("Verification expired during save");
  };
  try {
    await act(async () => {
      tree = create(
        React.createElement(OperationForm, {
          title: "Sensitive operation",
          action: "sensitive.fixture",
          fields,
          requireVerification: true,
          mapRequest: (d: any) => ({ wrapped: d }),
        }),
      );
    });
    await submit(tree, draft);
    assert.equal(calls.length, 2);
    assert.equal(calls[0].a, "reauth");
    assert.ok(!("verificationPassword" in calls[1].d.wrapped));
    assert.equal(
      tree.root.findAllByProps({ name: "verificationPassword" }).length > 0,
      true,
    );
    assert.match(
      JSON.stringify(tree.toJSON()),
      /Verification expired during save/,
    );
  } finally {
    if (tree) await act(async () => tree.unmount());
    delete (globalThis as any).fleetVerifyApi;
  }
});
test("FVERIFY-SINGLE: rapid repeated submit cannot dispatch a second verification or vehicle mutation", async () => {
  let tree: any, finish: any;
  const calls: string[] = [];
  (globalThis as any).fleetVerifyApi = async (a: string) => {
    calls.push(a);
    return new Promise((resolve) => {
      finish = resolve;
    });
  };
  const Original = globalThis.FormData;
  (globalThis as any).FormData = class {
    get(n: string) {
      return (draft as any)[n] ?? null;
    }
  };
  try {
    await act(async () => {
      tree = create(
        React.createElement(OperationForm, {
          title: "Register vehicle",
          action: "fleet.vehicle.create",
          fields,
        }),
      );
    });
    await act(async () => {
      const e = { preventDefault() {}, currentTarget: {} };
      const one = tree.root.findByType("form").props.onSubmit(e);
      const two = tree.root.findByType("form").props.onSubmit(e);
      assert.deepEqual(calls, ["fleet.vehicle.create"]);
      finish({ id: "synthetic-only" });
      await Promise.all([one, two]);
    });
  } finally {
    globalThis.FormData = Original;
    if (tree) await act(async () => tree.unmount());
    delete (globalThis as any).fleetVerifyApi;
  }
});
