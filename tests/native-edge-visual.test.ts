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
const temp = await fs.mkdtemp(path.join(os.tmpdir(), "easygas-edge-visual-"));
after(() => fs.rm(temp, { recursive: true, force: true }));
const shim = path.join(temp, "hosts.tsx");
await fs.writeFile(
  shim,
  (await fs.readFile("tests/helpers/native-host-shim.tsx", "utf8")) +
    "\nexport const Keyboard={dismiss:()=>{}};export const AccessibilityInfo={announceForAccessibility:()=>{}}; export default function NativeRiderMap(){return null;}\n",
);
await build({
  entryPoints: ["apps/mobile/FleetLocations.tsx"],
  outfile: path.join(temp, "fleet.cjs"),
  bundle: true,
  platform: "node",
  format: "cjs",
  jsx: "automatic",
  plugins: [
    {
      name: "hosts",
      setup(b) {
        b.onResolve({ filter: /^react(\/.*)?$/ }, (a) => ({
          path: req.resolve(a.path),
          external: true,
        }));
        b.onResolve(
          {
            filter:
              /^(react-native|\.\/(CustomerUI|EasyGasLoader|NativeRiderMap))$/,
          },
          () => ({ path: shim }),
        );
      },
    },
  ],
});
const Fleet = createRequire(import.meta.url)(
  path.join(temp, "fleet.cjs"),
).default;
const text = (t: any) => JSON.stringify(t.toJSON());
const mount = async (api: any, standalone = true) => {
  let t: any;
  await act(async () => {
    t = create(React.createElement(Fleet, { api, standalone }));
  });
  return t;
};
const dialogEntry = path.join(temp, "dialog-entry.ts");
await fs.writeFile(
  dialogEntry,
  `export * from ${JSON.stringify(path.resolve("apps/mobile/ScreenCanvas.tsx"))}; export * from ${JSON.stringify(path.resolve("apps/mobile/NativeDialog.tsx"))};`,
);
await build({
  entryPoints: [dialogEntry],
  outfile: path.join(temp, "dialogs.cjs"),
  bundle: true,
  platform: "node",
  format: "cjs",
  jsx: "automatic",
  plugins: [
    {
      name: "dialog-hosts",
      setup(b) {
        b.onResolve({ filter: /^react(\/.*)?$/ }, (a) => ({
          path: req.resolve(a.path),
          external: true,
        }));
        b.onResolve(
          {
            filter: /^(react-native|react-native-safe-area-context|\.\/theme)$/,
          },
          () => ({ path: shim }),
        );
      },
    },
  ],
});
const Dialog = createRequire(import.meta.url)(path.join(temp, "dialogs.cjs"));
test("EDGE-VISUAL-ACCESS: standalone dispatch shows loading, permission denial and retry without exposing fleet data", async () => {
  let finish: any,
    calls: string[] = [];
  const api = (action: string) => {
    calls.push(action);
    return new Promise((r) => (finish = r));
  };
  const t = await mount(api);
  assert.match(text(t), /Checking dispatch access/);
  assert.equal(calls.length, 1);
  await act(async () => finish({ allowed: [] }));
  assert.match(text(t), /Ask your Admin/);
  assert.doesNotMatch(text(t), /View fleet locations/);
  await act(async () =>
    t.root
      .findAllByType("Pressable")
      .find((x: any) => x.props.accessibilityLabel === "Retry access check")
      .props.onPress(),
  );
  assert.match(text(t), /Checking dispatch access/);
  await act(async () => finish({ allowed: ["deliveries"] }));
  assert.match(text(t), /View fleet locations/);
  assert.deepEqual(calls, ["navigation.access", "navigation.access"]);
  await act(async () => t.unmount());
});
test("EDGE-VISUAL-FAILURE: offline and malformed permission responses fail closed and keep the standalone page actionable", async () => {
  for (const api of [
    async () => {
      throw Error("offline");
    },
    async () => ({ allowed: null }),
  ]) {
    const t = await mount(api);
    assert.match(text(t), /Could not check dispatch access/);
    assert.match(text(t), /Retry access check/);
    assert.doesNotMatch(text(t), /View fleet locations/);
    await act(async () => t.unmount());
  }
  const hidden = await mount(async () => ({ allowed: [] }), false);
  assert.equal(hidden.toJSON(), null);
  await act(async () => hidden.unmount());
});
test("EDGE-VISUAL-NAV: manager tabs have purpose-specific glyphs and only the standalone dispatch route gains access feedback", async () => {
  const source = await fs.readFile("apps/mobile/App.tsx", "utf8");
  const workspace=await fs.readFile("apps/mobile/MobileNextWorkspaces.tsx","utf8");
  const shell=await fs.readFile("apps/mobile/MobileNextUI.tsx","utf8");
  assert.match(source, /<NextTabs/);
  for(const icon of ["home","package","layers","user-round"])assert.ok(shell.includes('"'+icon+'"'));
  assert.match(workspace,/visibleWorkspaces\(user.role, navigation.allowed\)|visibleWorkspaces/);
  assert.match(
    source,
    /<FleetLocations[\s\S]{0,180}standalone/,
  );
});
test("EDGE-VISUAL-PROOF: additive visual changes retain canvas and committed baselines, reject tampering and match current bytes", async () => {
  const { reviewedNativeEdgeVisualSourceHash } = await import(
    "../scripts/lib/reviewed-native-edge-visual-source.mjs"
  );
  const { createHash } = await import("node:crypto");
  const review = JSON.parse(
    await fs.readFile(
      "docs/edge-to-edge/visual-acceptance/reviewed-source-changes.json",
      "utf8",
    ),
  );
  const { reviewedNativeUxSourceHash } = await import('../scripts/lib/reviewed-native-ux-source.mjs');
  for (const [file, incoming] of Object.entries(review.baseline)) {
    assert.equal(
      await reviewedNativeEdgeVisualSourceHash(file, incoming),
      await reviewedNativeUxSourceHash(file, review.files[file]),
    );
    assert.equal(
      createHash("sha256")
        .update(await fs.readFile(file))
        .digest("hex"),
      await reviewedNativeUxSourceHash(file, review.files[file]),
    );
    await assert.rejects(
      () => reviewedNativeEdgeVisualSourceHash(file, "tampered"),
      /historical baseline/,
    );
  }
  assert.deepEqual(Object.keys(review.newFiles), ["apps/mobile/NativeDialog.tsx"]);
  for (const [file, expected] of Object.entries(review.newFiles)) {
    assert.equal(
      createHash("sha256").update(await fs.readFile(file)).digest("hex"),
      expected,
    );
  }
});

test("EDGE-VISUAL-DIALOG: full-screen form confirmations render in the top screen and preserve cancel/confirm exactly once", async () => {
  let closed = 0,
    t: any;
  function Harness() {
    const [open, setOpen] = React.useState(true);
    return React.createElement(
      React.Fragment,
      null,
      React.createElement(Dialog.AppAlertProvider),
      React.createElement(
        Dialog.ScreenModal,
        { visible: open },
        React.createElement(
          "Pressable",
          {
            testID: "close-form",
            onPress: () =>
              Dialog.EasyGasAlert.alert("Close this form?", "Unsaved changes", [
                { text: "Keep editing", style: "cancel" },
                {
                  text: "Close form",
                  onPress: () => {
                    closed++;
                    setOpen(false);
                  },
                },
              ]),
          },
          "Close",
        ),
      ),
    );
  }
  await act(async () => {
    t = create(React.createElement(Harness));
  });
  const open = () =>
    t.root.findByProps({ testID: "close-form" }).props.onPress();
  await act(async () => open());
  assert.equal(
    t.root.findAllByType("Modal").length,
    1,
    "no second root native modal hidden behind the form",
  );
  assert.match(text(t), /Close this form/);
  assert.ok(
    t.root
      .findAllByType("View")
      .some(
        (v: any) =>
          v.props.accessibilityElementsHidden === true &&
          v.props.pointerEvents === "none",
      ),
  );
  const button = (label: string) =>
    t.root
      .findAllByType("Pressable")
      .find((b: any) =>
        b.findAllByType("Text").some((x: any) => x.props.children === label),
      );
  await act(async () => button("Keep editing").props.onPress());
  assert.equal(closed, 0);
  assert.doesNotMatch(text(t), /Close this form/);
  assert.equal(t.root.findByType("Modal").props.visible, true);
  await act(async () => open());
  const confirm = button("Close form").props.onPress;
  await act(async () => {
    confirm();
    confirm();
  });
  assert.equal(closed, 1);
  assert.equal(t.root.findByType("Modal").props.visible, false);
  await act(async () => t.unmount());
});
test("EDGE-VISUAL-DIALOG-BACK: presented-screen back dismisses only the active dialog and root dialogs retain full-window presentation", async () => {
  let parentClosed = 0,
    confirmed = 0,
    t: any;
  await act(async () => {
    t = create(
      React.createElement(
        React.Fragment,
        null,
        React.createElement(Dialog.AppAlertProvider),
        React.createElement(
          Dialog.ScreenModal,
          { visible: true, onRequestClose: () => parentClosed++ },
          React.createElement("Control"),
        ),
      ),
    );
  });
  await act(async () =>
    Dialog.EasyGasAlert.alert("Sensitive confirmation", "", [
      {
        text: "Confirm",
        onPress: () => {
          confirmed++;
        },
      },
    ]),
  );
  await act(async () => t.root.findByType("Modal").props.onRequestClose());
  assert.equal(confirmed, 0);
  assert.equal(parentClosed, 0);
  assert.doesNotMatch(text(t), /Sensitive confirmation/);
  await act(async () => t.root.findByType("Modal").props.onRequestClose());
  assert.equal(parentClosed, 1);
  await act(async () => t.unmount());
  await act(async () => {
    t = create(React.createElement(Dialog.AppAlertProvider));
    Dialog.EasyGasAlert.alert("Root dialog");
  });
  assert.equal(
    t.root.findByType("Modal").props.presentationStyle,
    "overFullScreen",
  );
  assert.equal(t.root.findByType("Modal").props.statusBarTranslucent, true);
  await act(async () => t.unmount());
});

test('EDGE-VISUAL-DIALOG-ABANDON: the deepest modal owns its confirmation and abandoning that screen cancels queued actions', async () => {
  let t:any, confirmed=0;
  const render=(inner:boolean)=>React.createElement(React.Fragment,null,React.createElement(Dialog.AppAlertProvider),React.createElement(Dialog.ScreenModal,{visible:true},React.createElement('Control'),inner&&React.createElement(Dialog.ScreenModal,{visible:true},React.createElement('InnerControl'))));
  await act(async()=>{t=create(render(true));});
  await act(async()=>Dialog.EasyGasAlert.alert('Inner confirmation','',[{text:'Confirm',onPress:()=>{confirmed++;}}]));
  assert.equal(t.root.findAllByType('Modal').length,2);
  assert.ok(t.root.findAllByType('Modal')[1].findAllByType('Text').some((x:any)=>x.props.children==='Inner confirmation'));
  await act(async()=>t.update(render(false)));
  assert.doesNotMatch(text(t),/Inner confirmation/);assert.equal(confirmed,0);assert.equal(t.root.findAllByType('Modal').length,1);
  await act(async()=>t.unmount());
});
