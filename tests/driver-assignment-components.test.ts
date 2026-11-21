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
  path.join(os.tmpdir(), "easygas-assignment-component-"),
);
after(() => fs.rm(temp, { recursive: true, force: true }));
const shim = path.join(temp, "transport.tsx");
await fs.writeFile(
  shim,
  `import React from 'react';export const api=(action,data,options)=>globalThis.assignmentTestApi(action,options);export const Notice=({message})=>React.createElement('p',null,message);`,
);
await build({
  stdin: {
    contents: `import React from 'react';import {useAssignmentCandidates} from './apps/web/components/driver-assignment';export function Probe(p){const state=useAssignmentCandidates(p.orderId,p.version,true);return React.createElement('State',state)}`,
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
      name: "web-transport-only",
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
const { Probe } = createRequire(import.meta.url)(path.join(temp, "test.cjs"));
test("DASSIGN-REFRESH: actual readiness hook clears failed/stale snapshots and ignores late results after order/version changes", async () => {
  const pending: any[] = [];
  (globalThis as any).assignmentTestApi = (action: string, options: any) =>
    new Promise((resolve, reject) =>
      pending.push({ action, options, resolve, reject }),
    );
  let tree: any;
  try {
    await act(async () => {
      tree = create(
        React.createElement(Probe, { orderId: "order-A", version: 1 }),
      );
    });
    const state = () => tree.root.findByType("State").props;
    assert.equal(state().data, null);
    assert.equal(state().loading, true);
    await act(async () =>
      pending[0].resolve({ orderId: "order-A", version: 1 }),
    );
    assert.equal(state().data.orderId, "order-A");
    let refresh: Promise<void>;
    await act(async () => {
      refresh = state().refresh();
    });
    assert.equal(state().data, null);
    assert.equal(state().loading, true);
    await act(async () => {
      pending[1].reject(Error("Synthetic eligibility failure"));
      await refresh!;
    });
    assert.equal(state().data, null);
    assert.match(state().error, /eligibility failure/);
    await act(async () => {
      tree.update(
        React.createElement(Probe, { orderId: "order-A", version: 2 }),
      );
    });
    await act(async () => {
      tree.update(
        React.createElement(Probe, { orderId: "order-B", version: 1 }),
      );
    });
    assert.equal(pending[2].options.signal.aborted, true);
    await act(async () =>
      pending[3].resolve({ orderId: "order-B", version: 1 }),
    );
    await act(async () =>
      pending[2].resolve({ orderId: "order-A", version: 2 }),
    );
    assert.equal(state().data.orderId, "order-B");
    assert.equal(state().error, "");
  } finally {
    if (tree) await act(async () => tree.unmount());
    delete (globalThis as any).assignmentTestApi;
  }
});
