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
const dir = await fs.mkdtemp(path.join(os.tmpdir(), "easygas-proof-feedback-"));
after(() => fs.rm(dir, { recursive: true, force: true }));
const stub = path.join(dir, "host.tsx");
await fs.writeFile(
  stub,
  `import React from 'react';
export default {expoConfig:{extra:{driverCameraEnabled:true}}};
export const View=p=><view {...p}/>;export const Image=p=><image {...p}/>;export const Switch=p=><switch {...p}/>;
export const Text=p=><text {...p}/>;export const TextInput=p=><input {...p}/>;export const FieldCaption=Text;
export const Button=p=><button {...p}/>;export const Card=p=><card {...p}/>;export const Copy=Text;export const Title=Text;
export const useTheme=()=>({colors:{}});
export const requestMediaLibraryPermissionsAsync=async()=>({granted:true});export const requestCameraPermissionsAsync=requestMediaLibraryPermissionsAsync;
export const launchImageLibraryAsync=()=>globalThis.proofPicker();export const launchCameraAsync=launchImageLibraryAsync;
export const captureFieldEvent=(...args)=>globalThis.proofQueue(...args);
export const cacheDirectory='file:///synthetic-cache/';export const deleteAsync=async()=>{};`,
);
await build({
  entryPoints: ["apps/mobile/DriverProof.tsx"],
  outfile: path.join(dir, "proof.cjs"),
  bundle: true,
  platform: "node",
  format: "cjs",
  jsx: "automatic",
  plugins: [
    {
      name: "native-host",
      setup(b) {
        b.onResolve({ filter: /^react(\/.*)?$/ }, (a) => ({
          path: req.resolve(a.path),
          external: true,
        }));
        b.onResolve(
          {
            filter:
              /^(react-native|expo-.+|\.\/(typography|CustomerUI|theme|field-queue))$/,
          },
          () => ({ path: stub }),
        );
      },
    },
  ],
});
const Proof = req(path.join(dir, "proof.cjs")).default;
test("DIO-PROOF-FEEDBACK consented native evidence remains pending until canonical proof and empty queue confirm upload; capture errors stay visible", async () => {
  let tree: any;
  const events: any[] = [];
  let queued = 0;
  (globalThis as any).proofPicker = async () => ({
    canceled: false,
    assets: [
      {
        base64: "c3ludGhldGlj",
        mimeType: "image/png",
        uri: "file:///synthetic-cache/green.png",
      },
    ],
  });
  (globalThis as any).proofQueue = async (...args: any[]) => {
    events.push(args);
    return { id: "synthetic-event" };
  };
  const props = {
    userId: "test-driver",
    order: { id: "test-order", attempt: { id: "current-attempt" } },
    galleryApproved: true,
    proofVerified: false,
    onQueued: () => queued++,
  };
  try {
    await act(async () => {
      tree = create(React.createElement(Proof, props));
    });
    const button = (label: string) =>
      tree.root
        .findAllByType("button")
        .find((x: any) => x.props.label === label);
    await act(async () =>
      button("Choose approved photo from Gallery").props.onPress(),
    );
    assert.equal(events.length, 0);
    assert.match(JSON.stringify(tree.toJSON()), /Confirm consent/);
    await act(async () => {
      tree.root
        .findByType("input")
        .props.onChangeText("SYNTHETIC simulator refill proof");
      tree.root.findByType("switch").props.onValueChange(true);
    });
    await act(async () =>
      button("Choose approved photo from Gallery").props.onPress(),
    );
    assert.equal(queued, 1);
    assert.equal(events[0][0], "test-driver");
    assert.equal(events[0][1], "order:test-order");
    assert.equal(events[0][3], "photo");
    assert.equal(events[0][4].attemptId, "current-attempt");
    assert.equal(events[0][4].consent, true);
    assert.match(JSON.stringify(tree.toJSON()), /Pending Sync/);
    await act(async () =>
      tree.update(
        React.createElement(Proof, { ...props, proofVerified: true }),
      ),
    );
    assert.match(
      JSON.stringify(tree.toJSON()),
      /Proof photo verified by the server/,
    );
    assert.doesNotMatch(JSON.stringify(tree.toJSON()), /Pending Sync/);
    await act(async () => tree.update(React.createElement(Proof, props)));
    assert.match(
      JSON.stringify(tree.toJSON()),
      /Pending Sync/,
      "New pending evidence must not inherit a prior upload confirmation",
    );
    (globalThis as any).proofPicker = async () => {
      throw Error("Synthetic camera unavailable");
    };
    await act(async () =>
      tree.update(
        React.createElement(Proof, { ...props, proofVerified: true }),
      ),
    );
    await act(async () => button("Take another proof photo").props.onPress());
    assert.match(JSON.stringify(tree.toJSON()), /Synthetic camera unavailable/);
    assert.equal(events.length, 1);
  } finally {
    if (tree) await act(async () => tree.unmount());
    delete (globalThis as any).proofPicker;
    delete (globalThis as any).proofQueue;
  }
});
