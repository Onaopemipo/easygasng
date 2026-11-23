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
    contents: `export {OperationForm,FleetPanel,OperationsExtensions} from './apps/web/components/operations-completion';export {vehicleRegistrationRequest} from './apps/web/components/fleet-workspace'`,
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
const {
  OperationForm,
  FleetPanel,
  OperationsExtensions,
  vehicleRegistrationRequest,
} = createRequire(import.meta.url)(path.join(temp, "component.cjs"));
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
    assert.equal(tree.root.findAllByType("form").length, 0);
    await act(async () =>
      tree.root
        .findAllByType("button")
        .find((b: any) =>
          React.Children.toArray(b.props.children).some(
            (c: any) => typeof c === "string" && c.includes("Register vehicle"),
          ),
        )
        .props.onClick(),
    );
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

const content = (node: any): string =>
  typeof node === "string"
    ? node
    : Array.isArray(node)
      ? node.map(content).join(" ")
      : node?.children
        ? content(node.children)
        : "";
function fleetData() {
  return {
    branches: [{ id: "lagos", name: "Lagos", active: true }],
    vehicles: [
      {
        id: "v1",
        label: "Synthetic Van",
        branch_id: "lagos",
        active: true,
        lpg_suitable: false,
        capacity_grams: 12500,
      },
    ],
    trips: Array.from({ length: 13 }, (_, i) => ({
      id: `trip-${String(i).padStart(3, "0")}`,
      vehicle_id: `synthetic-vehicle-${i}`,
      label: "Same Synthetic Van",
      branch_id: "lagos",
      driver_id: "driver",
      started_at: "2026-11-23T09:00:00Z",
      ended_at: "2026-11-23T10:00:00Z",
      connectivity: "location_unavailable",
      location: {
        status: "trip_ended",
        lastKnown:
          i === 0
            ? {
                recordedAt: "2026-11-23T09:30:00Z",
                receivedAt: "2026-11-23T09:35:00Z",
                lat: 6.5,
                lng: 3.4,
                accuracy: 12,
                ageSeconds: 1800,
                delayedUpload: true,
              }
            : null,
      },
      metrics: {
        odometerKm: 0,
        gpsObservedKm: 0,
        gaps: 2,
        rejected: 1,
        estimatedLitres: null,
      },
      fuelPurchases: [
        { litres: 4, costKobo: 400000, receipt: "SYNTHETIC-RECEIPT" },
      ],
    })),
  };
}

test("FLEETUI-RECORDS: repeated vehicle labels retain distinct trip IDs, paginate, filter and disclose all honest GPS/fuel evidence", async () => {
  const oldWindow = (globalThis as any).window;
  (globalThis as any).window = {
    location: { hash: "" },
    addEventListener() {},
    removeEventListener() {},
  };
  (globalThis as any).fleetVerifyApi = async () => fleetData();
  let tree: any;
  try {
    await act(async () => {
      tree = create(
        React.createElement(FleetPanel, {
          user: { id: "owner", role: "owner", branch_id: "lagos" },
        }),
      );
    });
    assert.equal(
      tree.root.findAllByType("tbody")[0].findAllByType("tr").length,
      10,
    );
    assert.match(content(tree.toJSON()), /Page\s+1\s+of\s+2/);
    await act(async () =>
      tree.root
        .findByProps({ "aria-label": "Next fleet page" })
        .props.onClick(),
    );
    assert.equal(
      tree.root.findAllByType("tbody")[0].findAllByType("tr").length,
      3,
    );
    await act(async () =>
      tree.root
        .findByProps({ placeholder: "Search vehicle, trip ID or branch" })
        .props.onChange({ target: { value: "trip-000" } }),
    );
    assert.equal(
      tree.root.findAllByType("tbody")[0].findAllByType("tr").length,
      1,
    );
    await act(async () =>
      tree.root
        .findAllByType("button")
        .find((b: any) => b.props["aria-label"]?.startsWith("View trip"))
        .props.onClick(),
    );
    const text = content(tree.toJSON());
    assert.match(text, /Trip ended|trip ended/);
    assert.match(text, /This is not a live position/);
    assert.match(text, /Uploaded after offline delay/);
    assert.match(text, /SYNTHETIC-RECEIPT/);
    assert.match(text, /No approved estimate rate/);
    assert.match(text, /0 km/);
    assert.match(text, /Recorded observations only/);
    await act(async () =>
      tree.root
        .findByProps({ placeholder: "Search vehicle, trip ID or branch" })
        .props.onChange({ target: { value: "no such record" } }),
    );
    assert.match(content(tree.toJSON()), /No matching records/);
    assert.equal(tree.root.findAllByType("tbody").length, 0);
  } finally {
    if (tree) await act(async () => tree.unmount());
    delete (globalThis as any).fleetVerifyApi;
    (globalThis as any).window = oldWindow;
  }
});

test("FLEETUI-ROLES: seven roles retain owner registration, driver-only actions and denied read boundaries; active role changes clear scoped data", async () => {
  const oldWindow = (globalThis as any).window;
  (globalThis as any).window = {
    location: { hash: "" },
    addEventListener() {},
    removeEventListener() {},
  };
  let calls = 0,
    tree: any;
  (globalThis as any).fleetVerifyApi = async () => {
    calls++;
    return fleetData();
  };
  try {
    for (const role of [
      "owner",
      "manager",
      "finance",
      "driver",
      "customer",
      "commercial",
      "technician",
    ]) {
      calls = 0;
      await act(async () => {
        tree = create(
          React.createElement(FleetPanel, {
            user: { id: role, role, branch_id: "lagos" },
          }),
        );
      });
      const text = content(tree.toJSON());
      assert.equal(text.includes("Register vehicle"), role === "owner");
      assert.equal(
        calls,
        ["owner", "manager", "finance", "driver"].includes(role) ? 1 : 0,
      );
      if (["customer", "commercial", "technician"].includes(role))
        assert.doesNotMatch(text, /Same Synthetic Van/);
      if (role === "driver")
        assert.match(text, /No active LPG-suitable vehicle/);
      await act(async () => tree.unmount());
      tree = null;
    }
    await act(async () => {
      tree = create(
        React.createElement(FleetPanel, {
          user: { id: "owner", role: "owner", branch_id: "lagos" },
        }),
      );
    });
    await act(async () =>
      tree.update(
        React.createElement(FleetPanel, {
          user: { id: "customer", role: "customer", branch_id: "other" },
        }),
      ),
    );
    assert.doesNotMatch(content(tree.toJSON()), /Same Synthetic Van/);
  } finally {
    if (tree) await act(async () => tree.unmount());
    delete (globalThis as any).fleetVerifyApi;
    (globalThis as any).window = oldWindow;
  }
});

test("FLEETUI-FAILURE: refresh errors keep labelled snapshot, permission denial clears it and delayed prior scope never overwrites new role", async () => {
  const oldWindow = (globalThis as any).window;
  (globalThis as any).window = {
    location: { hash: "" },
    addEventListener() {},
    removeEventListener() {},
  };
  let tree: any,
    mode = "ok",
    resolveOld: any;
  (globalThis as any).fleetVerifyApi = async () => {
    if (mode === "offline") throw new Error("Synthetic offline");
    if (mode === "denied")
      throw Object.assign(new Error("Denied"), { status: 403 });
    if (mode === "delay") return new Promise((r) => (resolveOld = r));
    return fleetData();
  };
  try {
    await act(async () => {
      tree = create(
        React.createElement(FleetPanel, {
          user: { id: "owner", role: "owner", branch_id: "lagos" },
        }),
      );
    });
    mode = "offline";
    await act(async () =>
      tree.root
        .findByProps({ "aria-label": "Refresh fleet records" })
        .props.onClick(),
    );
    assert.match(content(tree.toJSON()), /last successful snapshot/);
    assert.match(content(tree.toJSON()), /Same Synthetic Van/);
    mode = "denied";
    await act(async () =>
      tree.root
        .findByProps({ "aria-label": "Refresh fleet records" })
        .props.onClick(),
    );
    assert.doesNotMatch(content(tree.toJSON()), /Same Synthetic Van/);
    mode = "delay";
    await act(async () =>
      tree.root
        .findByProps({ "aria-label": "Refresh fleet records" })
        .props.onClick(),
    );
    await act(async () =>
      tree.update(
        React.createElement(FleetPanel, {
          user: { id: "customer", role: "customer", branch_id: "other" },
        }),
      ),
    );
    await act(async () => resolveOld(fleetData()));
    assert.doesNotMatch(content(tree.toJSON()), /Same Synthetic Van/);
  } finally {
    if (tree) await act(async () => tree.unmount());
    delete (globalThis as any).fleetVerifyApi;
    (globalThis as any).window = oldWindow;
  }
});

test("FLEETUI-UNITS: kilogram inputs map exactly to existing gram API and do not silently round sub-gram values", () => {
  assert.deepEqual(
    vehicleRegistrationRequest({
      capacityKg: 12.5,
      physicalCapacityKg: 80.125,
      label: "Synthetic",
      branchId: "lagos",
      lpgSuitable: false,
    }),
    {
      capacityGrams: 12500,
      physicalCapacityGrams: 80125,
      label: "Synthetic",
      branchId: "lagos",
      lpgSuitable: false,
    },
  );
  assert.deepEqual(vehicleRegistrationRequest({ capacityKg: 2 }), {
    capacityGrams: 2000,
  });
  assert.throws(
    () => vehicleRegistrationRequest({ capacityKg: 1.0004 }),
    /three decimal places/,
  );
});

test("FLEETUI-NAV: purpose tabs fetch only selected workspace, retain shortcut target and hide planning from finance/driver", async () => {
  const oldWindow = (globalThis as any).window;
  (globalThis as any).window = {
    location: { hash: "" },
    addEventListener() {},
    removeEventListener() {},
  };
  const calls: string[] = [];
  let tree: any;
  (globalThis as any).fleetVerifyApi = async (action: string) => {
    calls.push(action);
    return {
      ...fleetData(),
      loads: [],
      orders: [],
      products: [],
      meters: [],
      enabled: false,
    };
  };
  const pick = (name: string) =>
    tree.root
      .findAllByType("button")
      .find((b: any) => b.props.children === name);
  try {
    await act(async () => {
      tree = create(
        React.createElement(OperationsExtensions, {
          section: "deliveries",
          user: { id: "owner", role: "owner", branch_id: "lagos" },
          initialView: "manifests",
        }),
      );
    });
    assert.deepEqual(calls, ["manifest.summary"]);
    assert.match(content(tree.toJSON()), /Product manifests/);
    assert.equal(tree.root.findAllByType("form").length, 0);
    await act(async () => pick("Fleet & trips").props.onClick());
    assert.equal(calls.at(-1), "fleet.summary");
    await act(async () => pick("LPG custody").props.onClick());
    assert.equal(calls.at(-1), "bulk.summary");
    await act(async () => pick("Route planning").props.onClick());
    assert.equal(calls.at(-1), "dispatch.board");
    for (const role of ["finance", "driver"]) {
      await act(async () =>
        tree.update(
          React.createElement(OperationsExtensions, {
            section: "deliveries",
            user: { id: role, role, branch_id: "lagos" },
            initialView: "fleet",
          }),
        ),
      );
      assert.equal(pick("Route planning"), undefined);
    }
  } finally {
    if (tree) await act(async () => tree.unmount());
    delete (globalThis as any).fleetVerifyApi;
    (globalThis as any).window = oldWindow;
  }
});

test("FLEETUI-FUEL: driver modal prevents parallel fuel writes, preserves retry operation key and never exposes end-trip action to a manager", async () => {
  const oldWindow = (globalThis as any).window,
    originalFormData = globalThis.FormData;
  (globalThis as any).window = {
    location: { hash: "" },
    addEventListener() {},
    removeEventListener() {},
  };
  const calls: any[] = [];
  let tree: any, rejectSave: any;
  const data = fleetData();
  data.trips[0].ended_at = null as any;
  (globalThis as any).fleetVerifyApi = async (action: string, body: any) => {
    if (action === "fleet.summary") return data;
    calls.push({ action, body });
    return new Promise((_, reject) => (rejectSave = reject));
  };
  (globalThis as any).FormData = class {
    get(name: string) {
      return (
        { litres: "10", cost: "11000", receipt: "SYNTHETIC-RETRY" } as any
      )[name];
    }
  };
  try {
    await act(async () => {
      tree = create(
        React.createElement(FleetPanel, {
          user: { id: "driver", role: "driver", branch_id: "lagos" },
        }),
      );
    });
    await act(async () =>
      tree.root
        .findAllByType("button")
        .find((b: any) => b.props.children === "Manage trip")
        .props.onClick(),
    );
    const form = tree.root.findAllByType("form")[0];
    let first: any, second: any;
    await act(async () => {
      first = form.props.onSubmit({ preventDefault() {}, currentTarget: {} });
      second = form.props.onSubmit({ preventDefault() {}, currentTarget: {} });
    });
    assert.equal(calls.length, 1);
    assert.equal(
      tree.root.findAllByType("form")[0].props["data-submit-pending"],
      "true",
    );
    await act(async () => {
      rejectSave(new Error("Synthetic connection lost"));
      await Promise.all([first, second]);
    });
    let retry: any;
    await act(async () => {
      retry = tree.root
        .findAllByType("form")[0]
        .props.onSubmit({ preventDefault() {}, currentTarget: {} });
    });
    assert.equal(calls.length, 2);
    assert.deepEqual(calls[0].body, calls[1].body);
    await act(async () => {
      rejectSave(new Error("Synthetic retry failed"));
      await retry;
    });
    await act(async () =>
      tree.update(
        React.createElement(FleetPanel, {
          user: { id: "manager", role: "manager", branch_id: "lagos" },
        }),
      ),
    );
    assert.doesNotMatch(content(tree.toJSON()), /End trip/);
  } finally {
    if (tree) await act(async () => tree.unmount());
    delete (globalThis as any).fleetVerifyApi;
    (globalThis as any).window = oldWindow;
    globalThis.FormData = originalFormData;
  }
});
