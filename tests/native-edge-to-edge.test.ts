import test, { after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { build } from "esbuild";
const req = createRequire(path.resolve("tests/native-renderer/package.json"));
const React = req("react"),
  { create, act } = req("react-test-renderer");
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
const temp = await fs.mkdtemp(path.join(os.tmpdir(), "easygas-edge-"));
after(() => fs.rm(temp, { recursive: true, force: true }));
const host = path.join(temp, "host.tsx");
await fs.writeFile(
  host,
  `export const View='View',Text='Text',Pressable='Pressable',ScrollView='ScrollView',SafeAreaView='SafeAreaView',Modal='Modal';export const Keyboard={dismiss:()=>{}};export const AccessibilityInfo={announceForAccessibility:()=>{}}; export const StyleSheet={create:x=>x};export const useTheme=()=>({colors:{background:'#121212'}});export const useSafeAreaInsets=()=>globalThis.edgeInsets;`,
);
await build({
  entryPoints: ["apps/mobile/ScreenCanvas.tsx"],
  outfile: path.join(temp, "screen.cjs"),
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
            filter: /^(react-native|react-native-safe-area-context|\.\/theme)$/,
          },
          () => ({ path: host }),
        );
      },
    },
  ],
});
const { ScreenCanvas, ScreenModal, fullWidthScreenContent } = createRequire(
  import.meta.url,
)(path.join(temp, "screen.cjs"));
const flatten = (x: any): any =>
  Array.isArray(x) ? Object.assign({}, ...x.map(flatten)) : x || {};
for (const insets of [
  { top: 0, bottom: 0, left: 0, right: 0 },
  { top: 62, bottom: 34, left: 0, right: 0 },
  { top: 0, bottom: 21, left: 59, right: 59 },
])
  test(`EDGE-CANVAS-${insets.top === 62 ? "NOTCH" : insets.left ? "SIDE" : "ZERO"}: canvas fills window and keeps safe content for ${JSON.stringify(insets)}`, async () => {
    (globalThis as any).edgeInsets = insets;
    let tree: any;
    await act(async () => {
      tree = create(
        React.createElement(
          ScreenCanvas,
          {
            edges: ["left", "right", "bottom"],
            topBackgroundColor: "#070",
            bottomBackgroundColor: "#fff",
            style: { width: 300, maxWidth: 600, backgroundColor: "#050" },
          },
          React.createElement("Control", { testID: "retained" }),
        ),
      );
    });
    const root = tree.root.findAllByType("View")[0];
    assert.deepEqual(flatten(root.props.style), {
      backgroundColor: "#050",
      width: "100%",
      maxWidth: "100%",
      flex: 1,
      alignSelf: "stretch",
    });
    const safe = tree.root.findByType("SafeAreaView");
    assert.deepEqual(safe.props.edges, ["left", "right", "bottom"]);
    assert.equal(flatten(safe.props.style).flex, 1);
    assert.equal(safe.findByType("Control").props.testID, "retained");
    const paint = tree.root
      .findAllByType("View")
      .filter((v: any) => v.props.pointerEvents === "none");
    assert.equal(paint.length, 2);
    assert.equal(flatten(paint[0].props.style).height, insets.top);
    assert.equal(flatten(paint[1].props.style).height, insets.bottom);
    assert.equal(flatten(paint[0].props.style).left, 0);
    assert.equal(flatten(paint[1].props.style).right, 0);
    await act(async () => tree.unmount());
  });
test("EDGE-CANVAS-THEME: default canvas paints themed system areas without extra inset layers", async () => {
  (globalThis as any).edgeInsets = { top: 62, bottom: 34, left: 0, right: 0 };
  let tree: any;
  await act(async () => {
    tree = create(React.createElement(ScreenCanvas, null, "child"));
  });
  assert.equal(
    flatten(tree.root.findAllByType("View")[0].props.style).backgroundColor,
    "#121212",
  );
  assert.equal(tree.root.findAllByType("View").length, 1);
  await act(async () => tree.unmount());
});
for (const transparent of [true, false, undefined])
  test(`modal presentation covers window (transparent=${transparent}) and preserves close handler`, async () => {
    let closed = 0;
    let tree: any;
    await act(async () => {
      tree = create(
        React.createElement(
          ScreenModal,
          {
            transparent,
            presentationStyle: "pageSheet",
            visible: true,
            onRequestClose: () => closed++,
          },
          React.createElement("Control"),
        ),
      );
    });
    const modal = tree.root.findByType("Modal");
    assert.equal(
      modal.props.presentationStyle,
      transparent ? "overFullScreen" : "fullScreen",
    );
    assert.equal(modal.props.statusBarTranslucent, true);
    assert.equal(modal.props.navigationBarTranslucent, true);
    assert.equal(modal.props.visible, true);
    modal.props.onRequestClose();
    assert.equal(closed, 1);
    assert.equal(modal.findAllByType("Control").length, 1);
    await act(async () => tree.unmount());
  });
test("EDGE-ROOTS: shared role shells and auth/onboarding retain full-width content and keyboard safety", async () => {
  assert.deepEqual(fullWidthScreenContent, {
    width: "100%",
    alignSelf: "stretch",
    flexGrow: 1,
  });
  for (const name of [
    "App",
    "DriverWorkspace",
    "TechnicianWorkspace",
    "DriverSignIn",
    "TechnicianSignIn",
    "Onboarding",
  ]) {
    const source = await fs.readFile(`apps/mobile/${name}.tsx`, "utf8");
    assert.match(source, /<ScreenCanvas/);
    assert.match(source, /fullWidthScreenContent/);
    assert.doesNotMatch(source, /maxWidth:\s*(600|640|760|780)/);
  }
  for (const name of [
    "ContextSheet",
    "DriverAssignmentAlerts",
    "Onboarding",
    "TechniciansManagement",
  ]) {
    const source = await fs.readFile(`apps/mobile/${name}.tsx`, "utf8");
    assert.match(source, /<ScreenModal/);
    assert.doesNotMatch(source, /<Modal[\s>]/);
  }
  assert.match(await fs.readFile("apps/mobile/NativeDialog.tsx", "utf8"), /presentationStyle="overFullScreen"/);
  const driver = await fs.readFile("apps/mobile/DriverWorkspace.tsx", "utf8");
  assert.match(driver, /paddingTop:\s*insets.top/);
  assert.match(driver, /edges=\{\["left", "right", "bottom"\]\}/);
  for (const name of ["DriverSignIn", "TechnicianSignIn"])
    assert.match(
      await fs.readFile(`apps/mobile/${name}.tsx`, "utf8"),
      /automaticallyAdjustKeyboardInsets/,
    );
  // CNG output is ignored and absent in a clean checkout. SDK 55+ removed
  // the edgeToEdgeEnabled flag; the pinned SDK targets mandatory edge-to-edge.
  // https://expo.dev/changelog/sdk-55
  const mobilePackage = JSON.parse(
    await fs.readFile("apps/mobile/package.json", "utf8"),
  );
  assert.match(mobilePackage.dependencies.expo, /^~58\./);
  const config = createRequire(import.meta.url)("../apps/mobile/app.config.js");
  assert.ok(config.platforms.includes("android"));
  assert.equal(config.android.package, "com.easygasng.customer");
  assert.equal(Object.hasOwn(config.android, "edgeToEdgeEnabled"), false);
});

test('EDGE-SOURCE-PROOF: reviewed source continuation rejects a mismatched prior hash and retains exact native scope', async () => {
  const {reviewedNativeEdgeSourceHash,nativeEdgeFiles} = await import('../scripts/lib/reviewed-native-edge-source.mjs');
  const {createHash}=await import('node:crypto');
  const review=JSON.parse(await fs.readFile('docs/edge-to-edge/reviewed-source-changes.json','utf8'));
  const visual=JSON.parse(await fs.readFile('docs/edge-to-edge/visual-acceptance/reviewed-source-changes.json','utf8'));
  assert.deepEqual(Object.keys(review.files).sort(),nativeEdgeFiles);
  for(const file of nativeEdgeFiles){assert.equal(await reviewedNativeEdgeSourceHash(file,review.baseline[file]),visual.files[file]??review.files[file]);assert.equal(createHash('sha256').update(await fs.readFile(file)).digest('hex'),visual.files[file]??review.files[file]);}
  await assert.rejects(()=>reviewedNativeEdgeSourceHash(nativeEdgeFiles[0],'tampered'),/historical baseline/);
  assert.equal(await reviewedNativeEdgeSourceHash('apps/web/unchanged.tsx','retained'),'retained');
  assert.equal(createHash('sha256').update(await fs.readFile('apps/mobile/ScreenCanvas.tsx')).digest('hex'),visual.files['apps/mobile/ScreenCanvas.tsx']??review.newFiles['apps/mobile/ScreenCanvas.tsx']);
});
