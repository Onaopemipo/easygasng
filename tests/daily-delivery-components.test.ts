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
  `import React from 'react';export const View=p=><view {...p}/>;export const Switch=p=><switch {...p}/>;export const Pressable=p=><pressable {...p}/>;export const NextIntro=p=><intro {...p}/>;export const NextText=p=><text {...p}/>;export const NextCard=p=><card {...p}/>;export const NextList=p=><list {...p}/>;export const NextRow=p=><row {...p}/>;export const NextButton=p=><button {...p}/>;export const NextIcon=p=><icon {...p}/>;export const ContextSheet=p=><sheet {...p}/>;export const initials=()=>"QA";export const Feedback=p=><feedback {...p}/>;export const NativeForm=p=><legacyform {...p}/>;export const Button=p=><button {...p}/>;export const Card=p=><card {...p}/>;export const Copy=p=><text {...p}/>;export const Title=p=><title {...p}/>;export const TextInput=p=><input {...p}/>;export const FieldCaption=p=><label {...p}/>;export const useTheme=()=>({colors:{}});export const randomUUID=()=>crypto.randomUUID();`,
);
await build({
  stdin: {
    contents: `export {default as Day} from './apps/web/components/daily-delivery';export {default as Refill} from './apps/web/components/daily-refill';export {default as NativeRefill} from './apps/mobile/DailyRefill';export {default as LoadReadiness} from './apps/mobile/DriverLoadReadiness';export {default as Departure} from './apps/mobile/DriverDeparture';export {default as VehicleWork} from './apps/mobile/BulkLPG';export {FieldNextWork,FieldNextHome} from './apps/mobile/MobileNextFieldWork';`,
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
              /^(react-native|expo-crypto|\.\/CustomerUI|\.\/theme|\.\/typography|\.\/Workflows|\.\/MobileNextUI|\.\/ContextSheet)$/,
          },
          () => ({ path: path.join(tmp, "native.tsx") }),
        );
      },
    },
  ],
});
const {
  Day,
  Refill,
  NativeRefill,
  LoadReadiness,
  Departure,
  VehicleWork,
  FieldNextWork,
  FieldNextHome,
} = createRequire(import.meta.url)(path.join(tmp, "test.cjs"));
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
        vehicles: [
          {
            id: "V",
            label: "Daily vehicle",
            branch_id: "lagos",
            capacity_grams: 30000,
          },
        ],
      });
    });
    const selects = t.root.findAllByType("select");
    assert.deepEqual(
      selects.map((x: any) => x.props.value ?? x.props.defaultValue),
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

test("DAY-UI-SETUP capacity is visible and invalid opening weights never reauthenticate; existing order reservation uses the active day", async () => {
  const requests: any[] = [];
  let t: any;
  const props = {
    user: { id: "owner", role: "owner", branchId: "lagos" },
    branch: "lagos",
    onChange() {
      requests.push(["changed"]);
    },
  };
  (globalThis as any).dailyAPI = async (action: string, input: any) => {
    requests.push([action, input]);
    return action.startsWith("daily.summary")
      ? { enabled: true, runs: [] }
      : action.startsWith("dispatch.vehicle.options")
        ? {
            drivers: [{ id: "D", name: "Daily driver", branch_id: "lagos" }],
            vehicles: [
              {
                id: "V",
                label: "Vehicle 30",
                branch_id: "lagos",
                capacity_grams: 30000,
              },
            ],
          }
        : { message: "Gas reserved" };
  };
  const Original = globalThis.FormData;
  try {
    await act(async () => {
      t = create(React.createElement(Day, props));
    });
    assert.match(text(t), /30.*kg/);
    assert.equal(
      t.root.findAllByType("input").find((n: any) => n.props.name === "kg")
        .props.max,
      30,
    );
    (globalThis as any).FormData = class {
      get(k: string) {
        return (
          {
            driver: "D",
            vehicle: "V",
            kg: "100",
            odometer: "1",
            password: "synthetic",
          } as any
        )[k];
      }
    };
    const form = {
      elements: {
        namedItem() {
          return { value: "synthetic" };
        },
      },
    };
    await act(async () =>
      t.root
        .findByType("form")
        .props.onSubmit({ preventDefault() {}, currentTarget: form }),
    );
    assert.match(text(t), /capacity of 30 kg/);
    assert(!requests.some((r) => r[0] === "reauth" || r[0] === "daily.start"));
    await act(async () => t.unmount());
    (globalThis as any).dailyAPI = async (action: string, input: any) => {
      requests.push([action, input]);
      return action.startsWith("daily.summary")
        ? {
            enabled: true,
            runs: [
              {
                id: "RUN",
                state: "active",
                driver_id: "D",
                label: "Vehicle 30",
                opening_grams: 25000,
                added_grams: 0,
                supplied_grams: 0,
                committed_grams: 23000,
                queued_grams: 23000,
                version: 1,
              },
            ],
          }
        : action.startsWith("dispatch.vehicle.options")
          ? { drivers: [], vehicles: [] }
          : { message: "Gas reserved" };
    };
    await act(async () => {
      t = create(
        React.createElement(Day, {
          ...props,
          order: {
            id: "ORDER",
            reference: "EG-test",
            status: "assigned",
            driver_id: "D",
            tracking_version: 7,
            gas_lines: [{ grams: 12500 }],
          },
        }),
      );
    });
    assert.match(text(t), /25 kg is available/);
    assert(
      !t.root.findAllByType("input").some((n: any) => n.props.name === "kg"),
    );
    assert.equal(t.root.findAllByType("form").length, 0);
    assert.equal(t.root.findAllByType("input").filter((n:any)=>n.props.name === "password").length, 0);
    await act(async () => t.root.findAllByType("button").find((b:any)=>b.children.join("") === "Continue with today’s driver").props.onClick());
    const request = requests.find((r) => r[0] === "dispatch.assignToday");
    assert(request);
    assert.deepEqual(Object.keys(request[1]).sort(), ["operationKey", "orderId", "runId", "version"]);
    assert.equal(request[1].runId, "RUN");
    assert.equal(request[1].version, 7);
    assert(requests.some((r) => r[0] === "changed"));
  } finally {
    globalThis.FormData = Original;
    if (t) await act(async () => t.unmount());
    delete (globalThis as any).dailyAPI;
  }
});

test("DAY-IOS-READY a newly reserved daily order reruns readiness at the same order version without requesting old bulk load evidence", async () => {
  let t: any;
  const changes: any[] = [],
    calls: string[] = [];
  const api = async (a: string) => {
      calls.push(a);
      return { enabled: true, loads: [] };
    },
    onChange = (r: any) => changes.push(r),
    base = {
      id: "ORDER",
      driver_id: "D",
      branch_id: "lagos",
      tracking_version: 7,
      gas_lines: [{ id: "G", grams: 6000 }],
      legacy_lpg: false,
    };
  try {
    await act(async () => {
      t = create(
        React.createElement(LoadReadiness, {
          api,
          order: base,
          tripId: "T",
          onChange,
          onReviewLoad() {},
        }),
      );
    });
    assert.doesNotMatch(
      text(t),
      /calibrat|meter reading|measured load confirmation|Open vehicle gas load/,
    );
    await act(async () =>
      t.update(
        React.createElement(LoadReadiness, {
          api,
          order: {
            ...base,
            daily_run: {
              run_id: "RUN",
              state: "active",
              allocation_state: "allocated",
              grams: 6000,
              supplied_grams: 0,
            },
          },
          tripId: "T",
          onChange,
          onReviewLoad() {},
        }),
      ),
    );
    assert.equal(changes.at(-1).ready, true);
    assert(!calls.includes("bulk.summary"));
    assert.equal(t.toJSON(), null);
  } finally {
    if (t) await act(async () => t.unmount());
  }
});

test("DAY-IOS-WORK daily read loading/failure never mounts legacy meter/load forms, retries show daily vehicle and departure is one tap", async () => {
  let t: any;
  const calls: string[] = [];
  let reject: any;
  const api = (a: string) => {
    calls.push(a);
    return new Promise((resolve, no) => {
      reject = no;
    });
  };
  try {
    await act(async () => {
      t = create(React.createElement(VehicleWork, { api }));
    });
    assert.deepEqual(calls, ["daily.summary"]);
    assert.doesNotMatch(text(t), /Bulk LPG custody|measured load|meter/);
    await act(async () => reject(Error("Network down")));
    assert.match(text(t), /Network down|Could not refresh/);
    assert.doesNotMatch(text(t), /Bulk LPG custody|measured load|meter/);
    await act(async () => t.unmount());
    const start: any[] = [];
    await act(async () => {
      t = create(
        React.createElement(Departure, {
          order: {
            id: "ORDER",
            tracking_version: 7,
            daily_run: { state: "active" },
            manifest: { gas: [] },
          },
          disabled: false,
          onStart: (x: any) => start.push(x),
        }),
      );
    });
    assert.equal(t.root.findAllByType("switch").length, 0);
    const button = t.root.findByType("button");
    assert.equal(button.props.disabled, false);
    await act(async () => button.props.onPress());
    assert.equal(start.length, 1);
  } finally {
    if (t) await act(async () => t.unmount());
  }
});

test("DAY-IOS-WORKSPACE daily home and Work overview/actions omit meter, inspected pickup, customer code and driver reconciliation shortcuts", async () => {
  let t: any;
  const props = {
    role: "driver",
    data: {
      profile: { branch_name: "Lagos" },
      metrics: { newAssignments: 1, inProgress: 0 },
    },
    connected: true,
    navigate() {},
    availability: true,
    onAvailability() {},
  };
  try {
    await act(async () => {
      t = create(React.createElement(FieldNextHome, props));
    });
    assert.match(text(t), /office prepares today/);
    assert.doesNotMatch(text(t), /Start a suitable vehicle trip/);
    await act(async () => t.unmount());
    await act(async () => {
      t = create(React.createElement(FieldNextWork, props));
    });
    assert.match(text(t), /Weigh customer refill/);
    assert.doesNotMatch(
      text(t),
      /Inspected pickup|Metered dispensing|Customer code|Start trip|Returns and end trip/,
    );
    const actions = t.root
      .findAllByType("pressable")
      .find((b: any) => b.props.accessibilityLabel === "Actions");
    assert(actions);
    await act(async () => actions.props.onPress());
    assert.match(text(t), /Record scale refill/);
    assert.match(text(t), /Upload photo and complete delivery/);
    assert.doesNotMatch(
      text(t),
      /Acknowledge bulk load|metered|inspected pickup|Declare returned custody|End reconciled trip|Start a trip/,
    );
  } finally {
    if (t) await act(async () => t.unmount());
  }
});

test('DAYASSIGN-UI direct mismatched-driver action has no password/reservation form, prevents double taps, reuses retry key and refreshes the open order',async()=>{
 let t:any,saved=0,finish:any;const requests:any[]=[];let attempt=0;
 (globalThis as any).dailyAPI=async(action:string,input:any)=>{
  requests.push([action,input]);
  if(action.startsWith('daily.summary'))return {enabled:true,runs:[{id:'RUN',state:'active',driver_id:'TODAY',driver_name:'Today driver',label:'Daily vehicle',opening_grams:25000,added_grams:0,supplied_grams:0,committed_grams:12500}]};
  if(action.startsWith('dispatch.vehicle.options'))return {drivers:[],vehicles:[]};
  if(action==='dispatch.assignToday'){attempt++;if(attempt===1)return new Promise((_,reject)=>finish=()=>reject(Error('Synthetic connection lost')));return {message:'Assigned and gas reserved'};}
  throw Error('Unexpected request '+action);
 };
 try{
 await act(async()=>{t=create(React.createElement(Day,{user:{id:'OWNER',role:'owner',branchId:'lagos'},branch:'lagos',order:{id:'ORDER',status:'assigned',driver_id:'OTHER',tracking_version:9,gas_lines:[{grams:12500}]},onChange:()=>saved++}));});
 const button=()=>t.root.findAllByType('button').find((b:any)=>b.children.join('')==='Reassign to today’s driver'||b.children.join('')==='Assigning and reserving gas…');
 assert.equal(button().props.disabled,false);assert.equal(t.root.findAllByType('form').length,0);assert.equal(t.root.findAllByType('input').length,0);
 await act(async()=>{void button().props.onClick();void button().props.onClick();});assert.equal(requests.filter(x=>x[0]==='dispatch.assignToday').length,1);assert.equal(button().props.disabled,true);
 await act(async()=>finish());assert.match(text(t),/Synthetic connection lost/);assert.equal(saved,0);
 await act(async()=>button().props.onClick());const writes=requests.filter(x=>x[0]==='dispatch.assignToday');assert.equal(writes.length,2);assert.equal(writes[0][1].operationKey,writes[1][1].operationKey);assert.deepEqual({...writes[1][1],operationKey:undefined},{orderId:'ORDER',runId:'RUN',version:9,operationKey:undefined});assert.equal(saved,1);assert(!requests.some(x=>x[0]==='reauth'||x[0]==='daily.order.attach'));
 }finally{if(t)await act(async()=>t.unmount());delete (globalThis as any).dailyAPI;}
});
