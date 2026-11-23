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
const dir = await fs.mkdtemp(path.join(os.tmpdir(), "easygas-device-fixes-"));
after(() => fs.rm(dir, { recursive: true, force: true }));
const shim = path.join(dir, "hosts.tsx");
let hosts = await fs.readFile("tests/helpers/native-host-shim.tsx", "utf8");
hosts = hosts.replace(
  "export const useTheme=()=>({colors:{button:'#087a36',onButton:'#fff',surface:'#fff',text:'#123',border:'#ddd',overlay:'#0008'},dark:false});",
  "export const useTheme=()=>({colors:{button:'#087a36',onButton:'#fff',surface:globalThis.__deviceTestDark?'#102b22':'#fff',text:globalThis.__deviceTestDark?'#f4faf6':'#10251c',border:'#ddd',overlay:'#0008'},dark:!!globalThis.__deviceTestDark});",
);
hosts +=
  "\nexport const FocusedFormContext=React.createContext(false),ScreenTitleContext=React.createContext(null),usePrivateReadCache=()=>null;export const Feedback=Text,ContextSheet=View;export const Share={},Ionicons='Icon',useColorScheme=()=> 'dark';\n";
await fs.writeFile(shim, hosts);
await build({
  stdin: {
    contents:
      "export {NativeForm} from './apps/mobile/Workflows';export {NativeRecord,NativeContractForm} from './apps/mobile/NativeBusinessWorkspace';export {NativePartialRefund as Partial} from './apps/mobile/EasyRewards';",
    resolveDir: process.cwd(),
    loader: "tsx",
  },
  outfile: path.join(dir, "fixes.cjs"),
  bundle: true,
  platform: "node",
  format: "cjs",
  jsx: "automatic",
  loader:{".png":"dataurl"},
  plugins: [
    {
      name: "native-hosts",
      setup(b) {
        b.onResolve({filter:/^react-native-svg$/},()=>({path:path.resolve("tests/helpers/native-svg-host.tsx")}));
        b.onResolve({ filter: /^react(\/.*)?$/ }, (a) => ({
          path: req.resolve(a.path),
          external: true,
        }));
        b.onResolve(
          {
            filter:
              /^(react-native|react-native-safe-area-context|@expo\/vector-icons|expo-.*|\.\/(theme|surfaces|typography|CustomerUI|EasyGasLoader|ContextSheet))$/,
          },
          () => ({ path: shim }),
        );
      },
    },
  ],
});
const { NativeForm, NativeRecord, NativeContractForm, Partial } = createRequire(
  import.meta.url,
)(path.join(dir, "fixes.cjs"));
const mount = async (C: any, p: any) => {
  let tree: any;
  await act(async () => {
    tree = create(React.createElement(C, p));
  });
  return tree;
};
const end = async (t: any) => act(async () => t.unmount());
const text = (t: any) => JSON.stringify(t.toJSON());
const press = async (t: any, label: string) => {
  const b = t.root
    .findAllByType("Pressable")
    .find(
      (n: any) =>
        n.props.accessibilityLabel === label ||
        n.findAllByType("Text").some((x: any) => x.props.children === label),
    );
  assert.ok(b, label);
  await act(async () => b.props.onPress());
};
const fill = async (t: any, label: string, value: string) =>
  act(async () =>
    t.root
      .findAllByType("TextInput")
      .find((n: any) => n.props.accessibilityLabel === label)
      .props.onChangeText(value),
  );
test("MDEV-THEME: partial refund follows app preference even when system is dark", async () => {
  for (const dark of [false, true]) {
    (globalThis as any).__deviceTestDark = dark;
    const t = await mount(Partial, {
      api: async () => [],
      orderId: "synthetic",
    });
    assert.equal(
      t.toJSON().props.style[1].backgroundColor,
      dark ? "#102b22" : "#fff",
    );
    assert.match(text(t), /No quantities are available/);
    await end(t);
  }
  (globalThis as any).__deviceTestDark = false;
});
test("MDEV-MONEY: naira-formatted native record amounts use naira labels and preserve source values", async () => {
  const source = { amount_kobo: 350000, grossKobo: 125 };
  const t = await mount(NativeRecord, { value: source });
  assert.match(text(t), /Amount \(₦\)/);
  assert.match(text(t), /3,500.00/);
  assert.match(text(t), /Gross \(₦\)/);
  assert.match(text(t), /1.25/);
  assert.doesNotMatch(text(t), /Amount kobo/);
  assert.equal(source.amount_kobo, 350000);
  await end(t);
});
test("MDEV-REQUIRED: missing choices, numbers and consent fail before API while zero and optional false remain valid", async () => {
  const calls: any[] = [];
  const t = await mount(NativeForm, {
    api: async (a: string, d: any) => {
      calls.push(d);
      return {};
    },
    action: "trip.start",
    title: "Trip",
    fields: [
      {
        name: "vehicleId",
        label: "Vehicle",
        options: [{ value: "vehicle-qa", label: "QA Vehicle" }],
      },
      { name: "startOdometer", label: "Odometer", type: "number" },
      { name: "locationConsent", label: "Location consent", type: "checkbox" },
    ],
  });
  await press(t, "Trip");
  await press(t, "Continue");
  assert.match(text(t), /Choose Vehicle\./);
  assert.equal(calls.length, 0);
  await press(t, "Vehicle: Choose");
  await press(t, "QA Vehicle");
  await press(t, "Continue");
  assert.match(text(t), /Enter Odometer\./);
  await fill(t, "Odometer (required)", "not-number");
  await press(t, "Continue");
  assert.match(text(t), /valid number/);
  await fill(t, "Odometer (required)", "0");
  await press(t, "Continue");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].startOdometer, 0);
  assert.equal(calls[0].locationConsent, false);
  await end(t);
  let sent = false;
  const consent = await mount(NativeForm, {
    api: async () => {
      sent = true;
      return {};
    },
    action: "fixture",
    title: "Required consent",
    fields: [
      {
        name: "consent",
        label: "Credit consent",
        type: "checkbox",
        required: true,
      },
    ],
  });
  await press(consent, "Continue");
  assert.match(text(consent), /Confirm Credit consent\./);
  assert.equal(sent, false);
  await end(consent);
});
test("MDEV-FEEDBACK: successful verification clears stale message without losing reviewed values or resubmitting", async () => {
  let calls = 0,
    done = false;
  const props = {
    api: async () => {
      calls++;
      if (calls === 1)
        throw Error("Verify your password again before this sensitive action.");
      return {};
    },
    action: "credit.decide",
    title: "Review refund",
    fields: [{ name: "reason", label: "Reason" }],
    review: (v: any) => React.createElement("Text", null, v.reason),
    reviewLabel: "Review change",
    submitLabel: "Confirm change",
    feedbackResetKey: 0,
    onDone: () => (done = true),
  };
  const t = await mount(NativeForm, props);
  await fill(t, "Reason (required)", "Retained synthetic review reason");
  await press(t, "Review change");
  await press(t, "Confirm change");
  assert.match(text(t), /Verify your password again/);
  await act(async () =>
    t.update(
      React.createElement(NativeForm, { ...props, feedbackResetKey: 1 }),
    ),
  );
  assert.doesNotMatch(text(t), /Verify your password again/);
  assert.match(text(t), /Retained synthetic review reason/);
  assert.equal(calls, 1);
  await press(t, "Confirm change");
  assert.equal(done, true);
  assert.equal(calls, 2);
  await end(t);
});

test("MDEV-PAGED-REVIEW: selected older refund is refreshed by scoped ID and cannot fall back to another page-one record", async () => {
  const older = {
    id: "11111111-1111-4111-8111-111111111111",
    customer_name: "Older QA refund",
    status: "pending",
    can_decide: true,
  };
  const calls: string[] = [];
  let submitted: any;
  const api = async (a: string, d?: any) => {
    calls.push(a);
    if (a.startsWith("credits?"))
      return {
        rows: a.includes("&q=" + older.id)
          ? [older]
          : [
              {
                id: "22222222-2222-4222-8222-222222222222",
                customer_name: "Different page-one refund",
              },
            ],
      };
    if (a === "credit.decide") {
      submitted = d;
      return { id: older.id };
    }
    throw Error(a);
  };
  const t = await mount(NativeContractForm, {
    api,
    user: { id: "owner", role: "owner", branch_id: "lagos" },
    action: "credit.decide",
    record: older,
    rows: [older],
    onDone() {},
    onAuthorityLost() {
      throw Error("Unexpected access loss");
    },
  });
  assert.ok(calls.includes("credits?view=workspace&q=" + older.id));
  assert.doesNotMatch(text(t), /Record: Choose/);
  await press(t, "Decision: Choose");
  await press(t, "rejected");
  await act(async () =>
    t.root
      .findAllByType("TextInput")
      .find((n: any) => n.props.accessibilityLabel?.startsWith("Reason"))
      .props.onChangeText("Synthetic older refund review"),
  );
  await press(t, "Review change");
  assert.match(text(t), /Older QA refund/);
  await press(t, "Confirm change");
  assert.equal(submitted.id, older.id);
  await end(t);
  let wrote = false;
  const missing = await mount(NativeContractForm, {
    api: async (a: string, d?: any) => {
      if (d !== undefined) wrote = true;
      return { rows: [] };
    },
    user: { id: "owner", role: "owner" },
    action: "credit.decide",
    record: older,
    rows: [older],
    onDone() {},
    onAuthorityLost() {},
  });
  assert.match(
    text(missing),
    /Selected credit or refund is no longer available/,
  );
  assert.equal(wrote, false);
  await end(missing);
});
