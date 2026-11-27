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
  path.join(os.tmpdir(), "easygas-manifest-component-"),
);
after(() => fs.rm(temp, { recursive: true, force: true }));
const shim = path.join(temp, "ui.tsx");
await fs.writeFile(
  shim,
  `import React from 'react';export const api=(a,d)=>globalThis.manifestUiApi(a,d);export const Notice=({message})=>React.createElement('p',null,message);export const Loading=({label})=>React.createElement('p',null,label);export const money=String;export const Modal=({children,title})=>React.createElement('section',{'data-dialog':title},children);`,
);
await build({
  stdin: {
    contents: `export {VehicleManifestPanel} from './apps/web/components/vehicle-manifest-panel';export {OperationForm} from './apps/web/components/operations-completion'`,
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
const { VehicleManifestPanel, OperationForm } = createRequire(import.meta.url)(
  path.join(temp, "component.cjs"),
);
const user = (role: string) => ({ id: role, role, branch_id: "lagos" });
const text = (t: any): string =>
  t == null
    ? ""
    : typeof t === "string"
      ? t
      : Array.isArray(t)
        ? t.map(text).join(" ")
        : text(t.children);
const fixture = () => ({
  trips: [
    {
      id: "trip-1",
      vehicle_id: "vehicle-1",
      label: "Synthetic QA van",
      branch_id: "lagos",
      physical_capacity_grams: 50000,
    },
    {
      id: "trip-2",
      vehicle_id: "vehicle-1",
      label: "Synthetic QA van",
      branch_id: "lagos",
    },
  ],
  products: [
    { id: "hose", branch_id: "lagos", name: "Synthetic hose", available: 20 },
  ],
  loads: Array.from({ length: 13 }, (_, i) => ({
    id: `manifest-${i}`,
    version: 3,
    name: "Synthetic hose",
    label: "Synthetic QA van",
    branch_id: "lagos",
    state: i === 0 ? "returning" : "issued",
    driver_active: true,
    available: 1,
    reserved: 0,
    handed: 0,
    returned: 0,
    removed: 0,
    serials: [],
    events: [],
  })),
});
const button = (tree: any, label: string) =>
  tree.root
    .findAllByType("button")
    .find((b: any) => text(b.props.children).trim() === label);
const mockForm = (props: any) =>
  React.createElement("form", { "data-action": props.action });
async function mount(role = "owner", Form = mockForm, options?: any) {
  let t: any;
  await act(async () => {
    t = create(
      React.createElement(VehicleManifestPanel, { user: user(role), Form }),
      options,
    );
  });
  return t;
}

test("MANUI-TASKS: records first, separate dialogs, unique vehicles, password verification and successful refresh", async () => {
  let reads = 0;
  (globalThis as any).manifestUiApi = async () => {
    reads++;
    return fixture();
  };
  const t = await mount();
  try {
    assert.equal(t.root.findAllByType("form").length, 0);
    await act(async () => button(t, "Request payload review").props.onClick());
    let form = t.root.findByType(mockForm);
    assert.equal(form.props.action, "fleet.vehicle.payload.request");
    assert.equal(form.props.requireVerification, true);
    assert.equal(form.props.fields[0].options.length, 1);
    await act(async () =>
      t.root.findAll((n) => n.props["data-dialog"])[0].parent.props.onClose(),
    );
    await act(async () => button(t, "Issue stock").props.onClick());
    form = t.root.findByType(mockForm);
    assert.equal(form.props.action, "manifest.issue");
    assert.equal(form.props.requireVerification, true);
    assert.equal(t.root.findAllByType("form").length, 1);
    assert.deepEqual(
      form.props.fields.map((f: any) => f.name),
      [
        "tripId",
        "productId",
        "quantity",
        "unitWeightGrams",
        "serialIds",
        "evidence",
        "reason",
      ],
    );
    await act(async () => form.props.onDone());
    assert.equal(t.root.findAllByType("form").length, 0);
    assert.equal(reads, 2);
  } finally {
    await act(async () => t.unmount());
  }
});
test("MANUI-RECORDS: latest100 label, ten-row pagination, no-match recovery and preserved hidden version context", async () => {
  (globalThis as any).manifestUiApi = async () => fixture();
  const t = await mount("finance");
  try {
    assert.match(text(t.toJSON()), /Latest 100 manifests/);
    assert.equal(t.root.findAllByType("tr").length, 11);
    await act(async () =>
      t.root
        .findByProps({ "aria-label": "Next manifest page" })
        .props.onClick(),
    );
    assert.equal(t.root.findAllByType("tr").length, 4);
    await act(async () =>
      t.root
        .findByProps({ "aria-label": "Search manifests" })
        .props.onChange({ target: { value: "missing" } }),
    );
    assert.match(text(t.toJSON()), /No matching manifests/);
    await act(async () => button(t, "Clear search").props.onClick());
    await act(async () => button(t, "Receive return").props.onClick());
    const form = t.root.findByType(mockForm);
    assert.equal(form.props.action, "manifest.return.receive");
    assert.equal(form.props.requireVerification, true);
    assert.deepEqual(
      form.props.fields.slice(0, 2).map((f: any) => [f.name, f.type, f.value]),
      [
        ["manifestId", "hidden", "manifest-0"],
        ["version", "hidden", 3],
      ],
    );
    assert.deepEqual(
      form.props.mapRequest({
        manifestId: "manifest-0",
        version: "3",
        foundQuantity: 1,
      }),
      { manifestId: "manifest-0", version: 3, foundQuantity: 1 },
    );
  } finally {
    await act(async () => t.unmount());
  }
});
test("MANUI-ROLES: seven role boundaries, driver receipt/return and missing-trip/product prerequisites", async () => {
  for (const role of [
    "owner",
    "finance",
    "manager",
    "driver",
    "technician",
    "customer",
    "commercial",
  ]) {
    let calls = 0;
    (globalThis as any).manifestUiApi = async () => {
      calls++;
      return fixture();
    };
    const t = await mount(role);
    try {
      assert.equal(
        !!button(t, "Issue stock"),
        ["owner", "finance"].includes(role),
      );
      assert.equal(
        !!button(t, "Request payload review"),
        ["owner", "finance"].includes(role),
      );
      assert.equal(!!button(t, "Acknowledge receipt"), role === "driver");
      assert.equal(!!button(t, "Declare return"), role === "driver");
      assert.equal(!!button(t, "Review discrepancy"), ["owner", "finance"].includes(role));
      assert.equal(
        calls,
        ["owner", "finance", "manager", "driver"].includes(role) ? 1 : 0,
      );
    } finally {
      await act(async () => t.unmount());
    }
  }
  for (const missing of ["trips", "products"]) {
    (globalThis as any).manifestUiApi = async () => ({
      ...fixture(),
      [missing]: [],
    });
    const t = await mount();
    try {
      assert.equal(button(t, "Issue stock").props.disabled, true);
      if (missing === "trips") {
        assert.equal(button(t, "Request payload review").props.disabled, true);
        assert.match(text(t.toJSON()), /No active vehicle trips/);
      }
    } finally {
      await act(async () => t.unmount());
    }
  }
});
test("MANUI-SCOPE: denied and delayed responses remove data/actions on identity change; failed refresh labels last snapshot", async () => {
  let reject = false;
  (globalThis as any).manifestUiApi = async () => {
    if (reject)
      throw Object.assign(new Error("Network unavailable"), { status: 500 });
    return fixture();
  };
  const t = await mount();
  try {
    reject = true;
    await act(async () =>
      t.root
        .findByProps({ "aria-label": "Refresh product manifests" })
        .props.onClick(),
    );
    assert.match(text(t.toJSON()), /last successful snapshot/);
    assert.equal(button(t, "Issue stock").props.disabled, true);
    let resolve: any;
    (globalThis as any).manifestUiApi = () => new Promise((r) => (resolve = r));
    await act(async () =>
      t.update(
        React.createElement(VehicleManifestPanel, {
          user: user("manager"),
          Form: mockForm,
        }),
      ),
    );
    assert.doesNotMatch(text(t.toJSON()), /Synthetic hose/);
    await act(async () =>
      t.update(
        React.createElement(VehicleManifestPanel, {
          user: user("customer"),
          Form: mockForm,
        }),
      ),
    );
    await act(async () => resolve(fixture()));
    assert.match(text(t.toJSON()), /do not have access/);
    assert.doesNotMatch(text(t.toJSON()), /Synthetic hose/);
    (globalThis as any).manifestUiApi = async () => {
      throw Object.assign(new Error("Permission denied"), { status: 403 });
    };
    await act(async () =>
      t.update(
        React.createElement(VehicleManifestPanel, {
          user: user("owner"),
          Form: mockForm,
        }),
      ),
    );
    assert.doesNotMatch(text(t.toJSON()), /Synthetic hose/);
    assert.equal(button(t, "Issue stock").props.disabled, true);
  } finally {
    await act(async () => t.unmount());
  }
});
test("MANUI-VERIFY: actual issue form clears password, retains draft and operation key after failed mutation, and commits once", async () => {
  const calls: any[] = [];
  let first = true;
  (globalThis as any).manifestUiApi = async (action: string, body: any) => {
    if (action === "manifest.summary") return fixture();
    calls.push({ action, body });
    if (action === "reauth") return { ok: true };
    if (first) {
      first = false;
      throw new Error("Synthetic uncertain failure");
    }
    return { id: "synthetic-issued" };
  };
  const passwordNode = { value: "synthetic-current-password", focus() {} };
  const t = await mount("owner", OperationForm, {
      createNodeMock: (e: any) =>
        e.type === "input" && e.props.name === "verificationPassword"
          ? passwordNode
          : null,
    }),
    Original = globalThis.FormData;
  const draft: any = {
    tripId: "trip-1",
    productId: "hose",
    quantity: "1",
    unitWeightGrams: "500",
    serialIds: "",
    evidence: "Synthetic observed stock",
    reason: "Synthetic delivery stock",
    verificationPassword: "synthetic-current-password",
  };
  (globalThis as any).FormData = class {
    get(n: string) {
      return draft[n] ?? null;
    }
  };
  try {
    await act(async () => button(t, "Issue stock").props.onClick());
    assert.equal(
      t.root.findAllByProps({ name: "verificationPassword" }).length > 0,
      true,
    );
    const node = t.root.findByProps({ name: "quantity" });
    const submit = () =>
      t.root
        .findByType("form")
        .props.onSubmit({ preventDefault() {}, currentTarget: {} });
    await act(async () => submit());
    assert.equal(t.root.findByProps({ name: "quantity" }), node);
    assert.match(text(t.toJSON()), /uncertain failure/);
    assert.equal(passwordNode.value, "");
    await act(async () => submit());
    const writes = calls.filter((c) => c.action === "manifest.issue");
    assert.equal(writes.length, 2);
    assert.equal(writes[0].body.operationKey, writes[1].body.operationKey);
    assert.equal("verificationPassword" in writes[0].body, false);
    assert.equal(writes[0].body.quantity, 1);
    assert.equal(t.root.findAllByType("form").length, 0);
  } finally {
    globalThis.FormData = Original;
    await act(async () => t.unmount());
  }
});


test("HAP-MANIFEST-UI: Admin can open the discrepancy review action with the exact current manifest",async()=>{
 (globalThis as any).manifestUiApi=async()=>fixture();const t=await mount('owner');try{const review=button(t,'Review discrepancy');assert.ok(review,'Admin discrepancy review must be visible');await act(async()=>review.props.onClick());const form=t.root.findByType(mockForm);assert.equal(form.props.action,'manifest.return.review');assert.equal(form.props.requireVerification,true);assert.equal(form.props.fields.find((f:any)=>f.name==='manifestId').value,'manifest-0');}finally{await act(async()=>t.unmount());}
});
