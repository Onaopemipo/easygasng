import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { createRequire } from "node:module";
import { build } from "esbuild";
const req = createRequire(path.resolve("tests/native-renderer/package.json"));
const React = req("react"), { create, act } = req("react-test-renderer");
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const temp = await fs.mkdtemp(path.join(os.tmpdir(), "easygas-setup-component-"));
after(() => fs.rm(temp, { recursive: true, force: true }));
await fs.writeFile(path.join(temp, "ui.tsx"), `import React from 'react';export const api=(...args)=>globalThis.setupTestApi(...args);export const Notice=({message})=><p role="alert">{message}</p>;`);
await fs.writeFile(path.join(temp, "link.tsx"), `import React from 'react';export default function Link(props){return <a {...props}/>}`);
await build({ stdin: { contents: `export {default as Setup, DispatchSetupChecklist as Checklist} from './apps/web/components/dispatch-setup';export {DriverAssignmentChoices as Choices} from './apps/web/components/driver-assignment';`, resolveDir: process.cwd(), loader: "tsx" }, outfile: path.join(temp, "test.cjs"), bundle: true, format: "cjs", platform: "node", jsx: "automatic", plugins: [{ name: "transport", setup(b) {
  b.onResolve({ filter: /^react(\/.*)?$/ }, (a) => ({ path: req.resolve(a.path), external: true }));
  b.onResolve({ filter: /^\.\/ui$/ }, () => ({ path: path.join(temp, "ui.tsx") }));
  b.onResolve({ filter: /^\.\/workspace-link$/ }, () => ({ path: path.join(temp, "link.tsx") }));
} }] });
const { Setup, Checklist, Choices } = createRequire(import.meta.url)(path.join(temp, "test.cjs"));
const data = { branches: [{ id: "lagos", name: "Synthetic Lagos", active: true }], branch: { id: "lagos", name: "Synthetic Lagos", active: true }, checkedAt: "2026-11-24T01:00:00Z", canRegisterVehicle: true, canReviewDrivers: true, canReviewRelease: true, counts: { drivers: 2, availableDrivers: 1, driversOnTrips: 0, vehicles: 0, approvedVehicles: 0 }, checks: { branchActive: true, driversAvailable: true, vehiclesApproved: false, activeTrips: false, deliveryEnabled: false, deliveryCapacity: false, deliveryWindows: false, coverageConfigured: false, assignmentEnabled: false } };
const text = (tree: any) => JSON.stringify(tree.toJSON());

test("DS-ACTIONS: actual checklist shows missing prerequisites, scoped links, owner-only registration and direct fleet action", async () => {
  let tree: any, fleet = 0;
  try {
    await act(async () => { tree = create(React.createElement(Checklist, { data, loading: false, error: "", onRefresh() {}, onBranch() {}, onFleet() { fleet++; } })); });
    assert.match(text(tree), /2\/4 setup steps ready/);
    assert.match(text(tree), /Home → Start trip/); assert.match(text(tree), /Setup cannot enable it/);
    assert.ok(tree.root.findAllByType("a").some((a: any) => a.props.href === "/admin/settings?scope=lagos&category=Delivery%20%26%20Dispatch"));
    const register = tree.root.findAllByType("button").find((b: any) => b.children.join("") === "Register / review vehicles");
    await act(async () => register.props.onClick()); assert.equal(fleet, 1);
    await act(async () => tree.update(React.createElement(Checklist, { data: { ...data, canRegisterVehicle: false, canReviewDrivers: false, canReviewRelease: false }, loading: false, error: "", onRefresh() {}, onBranch() {}, onFleet() {} })));
    assert.doesNotMatch(text(tree), /Register \/ review vehicles|Manage drivers & availability|operational release controls/);
    assert.match(text(tree), /Only the business owner can register a vehicle/);
  } finally { if (tree) await act(async () => tree.unmount()); }
});

test("DS-CHOICES: actual assignment puts ready drivers first and keeps false/null drivers in a collapsed disabled group", async () => {
  let tree: any, selected = "";
  const driver = (id: string, ready: boolean | null) => ({ id, name: id, readiness: { ready, reasons: ["Synthetic requirement"] } });
  const candidates = { branch: data.branch, orderId: "A", checkedAt: data.checkedAt, writesEnabled: true, canReviewVehicles: true, canReviewDrivers: true, candidates: [driver("blocked", false), driver("unknown", null), driver("ready", true)] };
  try {
    await act(async () => { tree = create(React.createElement(Choices, { data: candidates, loading: false, selected: "", onSelect: (id: string) => { selected = id; }, onRefresh() {} })); });
    const inputs = tree.root.findAllByType("input");
    assert.deepEqual(inputs.map((i: any) => i.props.value), ["ready", "blocked", "unknown"]);
    assert.equal(tree.root.findByType("details").props.open, undefined);
    assert.deepEqual(inputs.map((i: any) => !!i.props.disabled), [false, true, true]);
    await act(async () => inputs[0].props.onChange()); assert.equal(selected, "ready");
    await act(async () => tree.update(React.createElement(Choices, { data: { ...candidates, writesEnabled: false }, loading: false, selected: "ready", onSelect() {}, onRefresh() {} })));
    assert.ok(tree.root.findAllByType("input").every((i: any) => i.props.disabled));
  } finally { if (tree) await act(async () => tree.unmount()); }
});

test("DS-RECOVERY: scope changes clear old setup; late success is ignored; errors and retry never imply readiness", async () => {
  const pending: any[] = [];
  (globalThis as any).setupTestApi = (...args: any[]) => new Promise((resolve, reject) => pending.push({ args, resolve, reject }));
  let tree: any;
  const props = { user: { id: "owner", role: "owner" }, branch: "lagos", onBranch() {}, onFleet() {} };
  try {
    await act(async () => { tree = create(React.createElement(Setup, props)); });
    await act(async () => pending[0].resolve(data)); assert.match(text(tree), /2\/4 setup steps ready/);
    await act(async () => tree.update(React.createElement(Setup, { ...props, branch: "other" })));
    assert.doesNotMatch(text(tree), /2\/4 setup steps ready/);
    await act(async () => tree.update(React.createElement(Setup, { ...props, user: { id: "manager", role: "manager" }, branch: "third" })));
    assert.equal(pending[1].args[2].signal.aborted, true);
    await act(async () => pending[1].resolve(data)); assert.doesNotMatch(text(tree), /2\/4 setup steps ready/);
    await act(async () => pending[2].reject(Error("Synthetic setup failure"))); assert.match(text(tree), /Synthetic setup failure/);
    assert.doesNotMatch(text(tree), /2\/4 setup steps ready/);
    await act(async () => tree.root.findByType("button").props.onClick()); assert.equal(pending.length, 4);
    await act(async () => pending[3].resolve({ ...data, branch: null, counts: null, checks: null }));
    assert.match(text(tree), /Select one branch/); assert.doesNotMatch(text(tree), /2\/4 setup steps ready/);
  } finally { if (tree) await act(async () => tree.unmount()); delete (globalThis as any).setupTestApi; }
});
